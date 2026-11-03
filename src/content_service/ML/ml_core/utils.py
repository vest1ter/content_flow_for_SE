import re
import json
from typing import Any


def extract_json_from_text(text: str) -> str:
    """
    Пытается найти JSON-блок внутри текста (например, в тройных кавычках ```json ... ```)
    и возвращает только его содержимое. Если блок не найден, возвращает исходный текст.
    Также удаляет токены формата Mistral (<s>, [B_INST], [/B_INST]).
    Исправляет невалидные управляющие символы в строках JSON.
    """
    # Сначала удаляем токены Mistral
    text = re.sub(r'<s>\s*', '', text)  # Удаляем <s> в начале
    text = re.sub(r'\s*\[B_INST\]\s*', '', text)  # Удаляем [B_INST]
    text = re.sub(r'\s*\[/B_INST\]\s*', '', text)  # Удаляем [/B_INST]
    
    # Регулярка ищет контент внутри ```json ... ``` или просто ``` ... ```
    pattern = r"```(?:json)?\s*(.*?)```"
    match = re.search(pattern, text, re.DOTALL)

    if match:
        json_text = match.group(1).strip()
    else:
        # Если блоков кода нет, пытаемся найти JSON объект/массив
        # Ищем первый { или [ и последний } или ]
        first_brace = text.find('{')
        first_bracket = text.find('[')
        
        if first_brace != -1 or first_bracket != -1:
            # Определяем, что ищем - объект или массив
            if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
                # Ищем JSON объект
                start = first_brace
                # Находим последнюю закрывающую скобку
                brace_count = 0
                for i in range(start, len(text)):
                    if text[i] == '{':
                        brace_count += 1
                    elif text[i] == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            json_text = text[start:i+1].strip()
                            break
                else:
                    json_text = text.strip()
            else:
                # Ищем JSON массив
                start = first_bracket
                bracket_count = 0
                for i in range(start, len(text)):
                    if text[i] == '[':
                        bracket_count += 1
                    elif text[i] == ']':
                        bracket_count -= 1
                        if bracket_count == 0:
                            json_text = text[start:i+1].strip()
                            break
                else:
                    json_text = text.strip()
        else:
            # Если ничего не найдено, возвращаем как есть (обрезая пробелы)
            json_text = text.strip()
    
    # Исправляем невалидные управляющие символы в строках JSON
    # Ищем строки в кавычках и заменяем неэкранированные переносы строк на \n
    def fix_string_control_chars(match):
        string_content = match.group(1)
        # Заменяем неэкранированные переносы строк на \n
        string_content = re.sub(r'(?<!\\)\n', '\\n', string_content)
        # Заменяем другие неэкранированные управляющие символы
        string_content = re.sub(r'(?<!\\)\r', '\\r', string_content)
        string_content = re.sub(r'(?<!\\)\t', '\\t', string_content)
        return f'"{string_content}"'
    
    # Ищем строки в двойных кавычках и исправляем их
    json_text = re.sub(r'"([^"\\]*(\\.[^"\\]*)*)"', fix_string_control_chars, json_text, flags=re.DOTALL)
    
    return json_text


def try_fix_truncated_json_array(text: str) -> str:
    """
    Пытается восстановить обрезанный JSON массив.
    Если JSON обрезан посередине, пытаемся закрыть его корректно.
    """
    text = text.strip()
    
    if not text.startswith('['):
        return text
    
    # Считаем открытые скобки
    bracket_count = 0
    brace_count = 0
    in_string = False
    escape_next = False
    last_complete_item_end = -1
    
    for i, char in enumerate(text):
        if escape_next:
            escape_next = False
            continue
        
        if char == '\\':
            escape_next = True
            continue
        
        if char == '"' and not escape_next:
            in_string = not in_string
            continue
        
        if in_string:
            continue
        
        if char == '[':
            bracket_count += 1
        elif char == ']':
            bracket_count -= 1
        elif char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            # Если закрыли объект на уровне массива, запоминаем позицию
            if brace_count == 0 and bracket_count == 1:
                last_complete_item_end = i
    
    # Если массив уже валидный, возвращаем как есть
    if bracket_count == 0 and brace_count == 0:
        return text
    
    # Пытаемся восстановить: обрезаем до последнего полного элемента
    if last_complete_item_end > 0:
        # Берём всё до последнего закрытого объекта и закрываем массив
        truncated = text[:last_complete_item_end + 1]
        # Убираем trailing запятую если есть
        truncated = truncated.rstrip().rstrip(',')
        return truncated + ']'
    
    return text


def safe_json_parse(text: str) -> Any:
    """
    Комбинирует очистку и парсинг.
    Пытается исправить распространенные ошибки в JSON перед парсингом.
    """
    clean_text = extract_json_from_text(text)
    
    try:
        return json.loads(clean_text)
    except json.JSONDecodeError as e:
        # Попытка 1: исправить управляющие символы
        try:
            pattern = r'"((?:[^"\\]|\\.)*)"'
            
            def fix_string_content(match):
                content = match.group(1)
                result = []
                i = 0
                while i < len(content):
                    if content[i] == '\\' and i + 1 < len(content):
                        result.append(content[i])
                        result.append(content[i + 1])
                        i += 2
                    elif content[i] in ['\n', '\r', '\t']:
                        if content[i] == '\n':
                            result.append('\\n')
                        elif content[i] == '\r':
                            result.append('\\r')
                        elif content[i] == '\t':
                            result.append('\\t')
                        i += 1
                    else:
                        result.append(content[i])
                        i += 1
                return f'"{"".join(result)}"'
            
            fixed_text = re.sub(pattern, fix_string_content, clean_text)
            return json.loads(fixed_text)
        except json.JSONDecodeError:
            pass
        
        # Попытка 2: восстановить обрезанный JSON массив
        try:
            fixed_array = try_fix_truncated_json_array(clean_text)
            return json.loads(fixed_array)
        except json.JSONDecodeError:
            pass
        
        # Попытка 3: комбинация - сначала fix string, потом fix truncated
        try:
            pattern = r'"((?:[^"\\]|\\.)*)"'
            
            def fix_string_content(match):
                content = match.group(1)
                result = []
                i = 0
                while i < len(content):
                    if content[i] == '\\' and i + 1 < len(content):
                        result.append(content[i])
                        result.append(content[i + 1])
                        i += 2
                    elif content[i] in ['\n', '\r', '\t']:
                        if content[i] == '\n':
                            result.append('\\n')
                        elif content[i] == '\r':
                            result.append('\\r')
                        elif content[i] == '\t':
                            result.append('\\t')
                        i += 1
                    else:
                        result.append(content[i])
                        i += 1
                return f'"{"".join(result)}"'
            
            fixed_text = re.sub(pattern, fix_string_content, clean_text)
            fixed_array = try_fix_truncated_json_array(fixed_text)
            return json.loads(fixed_array)
        except json.JSONDecodeError:
            pass
        
        # Если ничего не помогло, пробрасываем исходную ошибку
        raise e