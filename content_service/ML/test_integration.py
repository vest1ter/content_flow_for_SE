import os
import sys
from dotenv import load_dotenv

# Загружаем переменные из .env файла
load_dotenv()

sys.path.append(os.getcwd())

from ml_core.llm_client import OpenRouterClient
from ml_core.schemas import (
    BusinessProfile,
    SinglePostGenerationRequest,
    ContentPlanRequest,
    PostGoal,
    Platform,
    Tone
)
from ml_core.pipelines.content_generation import generate_single_post, generate_content_plan
from ml_core.pipelines.telegram_analysis import generate_posts_from_selected_telegram_posts
from ml_core.schemas import TelegramPost


def init_client():
    """Инициализация клиента OpenRouter"""
    api_key = os.getenv("OPENROUTER_API_KEY")

    if not api_key:
        raise ValueError("ОШИБКА: Не задан OPENROUTER_API_KEY. Установите переменную окружения OPENROUTER_API_KEY.")

    client = OpenRouterClient(
        api_key=api_key,
        model="mistralai/mistral-7b-instruct"
    )
    return client


def print_post_result(response, test_name: str):
    """Красивый вывод результата генерации поста"""
    print(f"\n{'='*60}")
    print(f"=== {test_name} ===")
    print(f"{'='*60}")
    print(f"Заголовок: {response.post.title or '(нет)'}")
    print("-" * 60)
    print(f"Текст поста:\n{response.post.body}")
    print("-" * 60)
    print(f"Хэштеги: {', '.join(response.post.suggested_hashtags) if response.post.suggested_hashtags else 'нет'}")
    print(f"Промпт для картинки: {response.post.suggested_image_prompt or '(нет)'}")
    print(f"{'='*60}\n")


def print_plan_result(response, test_name: str):
    """Красивый вывод результата контент-плана"""
    print(f"\n{'='*60}")
    print(f"=== {test_name} ===")
    print(f"{'='*60}")
    for i, item in enumerate(response.items, 1):
        print(f"\n{i}. {item.title}")
        print(f"   Идея: {item.idea}")
        print(f"   Формат: {item.format}")
        print(f"   Цель: {item.goal.value}")
    print(f"\n{'='*60}\n")


# ==================== ТЕСТОВЫЕ БИЗНЕСЫ ====================

def get_coffee_shop():
    return BusinessProfile(
        id="biz_coffee_001",
        name="Кофейня 'Утро'",
        industry="Общепит / Кофейня",
        region="Москва",
        description="Уютная кофейня с авторскими десертами и спешелти кофе.",
        audience_description="Студенты, фрилансеры, офисные работники 20-35 лет.",
        tone=Tone.friendly,
        current_reach=5000
    )


def get_it_company():
    return BusinessProfile(
        id="biz_it_001",
        name="DevSolutions",
        industry="IT / Разработка ПО",
        region="Санкт-Петербург",
        description="Разработка веб-приложений и мобильных приложений. Специализируемся на e-commerce и fintech.",
        audience_description="Предприниматели, стартапы, средний бизнес 25-45 лет.",
        tone=Tone.professional,
        current_reach=12000
    )


def get_fitness_club():
    return BusinessProfile(
        id="biz_fitness_001",
        name="FitZone",
        industry="Фитнес / Спорт",
        region="Казань",
        description="Современный фитнес-клуб с тренажерным залом, групповыми занятиями и персональными тренерами.",
        audience_description="Активные люди 18-40 лет, заинтересованные в здоровом образе жизни.",
        tone=Tone.playful,
        current_reach=8000
    )


def get_online_school():
    return BusinessProfile(
        id="biz_edu_001",
        name="SkillUp Academy",
        industry="Образование / Онлайн-курсы",
        region="Россия (онлайн)",
        description="Онлайн-школа программирования и дизайна. Интенсивные курсы с менторством и проектами.",
        audience_description="Студенты и молодые специалисты 18-30 лет, желающие сменить профессию или повысить квалификацию.",
        tone=Tone.expert,
        current_reach=25000
    )


def get_beauty_salon():
    return BusinessProfile(
        id="biz_beauty_001",
        name="Студия красоты 'Элегант'",
        industry="Красота / Парикмахерские услуги",
        region="Новосибирск",
        description="Премиальная студия красоты: стрижки, окрашивание, маникюр, педикюр, косметология.",
        audience_description="Женщины 25-50 лет, ценящие качество и индивидуальный подход.",
        tone=Tone.friendly,
        current_reach=3500
    )


# ==================== ТЕСТЫ ОДИНОЧНЫХ ПОСТОВ ====================

def test_post_coffee_engagement(client):
    """Тест: Кофейня, вовлечение, Telegram, игривый тон"""
    business = get_coffee_shop()
    request = SinglePostGenerationRequest(
        business=business,
        goal=PostGoal.increase_engagement,
        platform=Platform.telegram,
        description="Расскажи про наш новый лавандовый раф. Нужно побудить прийти попробовать.",
        tone_override=Tone.playful,
        max_length_chars=500
    )
    
    try:
        response = generate_single_post(client, request)
        print_post_result(response, "Тест 1: Кофейня - Вовлечение (Telegram, игривый тон)")
        return True
    except Exception as e:
        print(f"\n❌ ОШИБКА в тесте 1: {e}\n")
        return False


def test_post_it_sales(client):
    """Тест: IT-компания, продажи, VK, профессиональный тон"""
    business = get_it_company()
    request = SinglePostGenerationRequest(
        business=business,
        goal=PostGoal.increase_sales,
        platform=Platform.vk,
        description="Новая услуга: разработка мобильных приложений под ключ. Нужен пост с призывом к действию.",
        tone_override=None,  # Используем тон бизнеса (professional)
        max_length_chars=800
    )
    
    try:
        response = generate_single_post(client, request)
        print_post_result(response, "Тест 2: IT-компания - Продажи (VK, профессиональный тон)")
        return True
    except Exception as e:
        print(f"\n❌ ОШИБКА в тесте 2: {e}\n")
        return False


def test_post_fitness_awareness(client):
    """Тест: Фитнес-клуб, узнаваемость, Telegram, дружелюбный тон"""
    business = get_fitness_club()
    request = SinglePostGenerationRequest(
        business=business,
        goal=PostGoal.increase_awareness,
        platform=Platform.telegram,
        description="Расскажи о преимуществах нашего фитнес-клуба: новое оборудование, опытные тренеры, удобное расписание.",
        tone_override=Tone.friendly,
        max_length_chars=600
    )
    
    try:
        response = generate_single_post(client, request)
        print_post_result(response, "Тест 3: Фитнес-клуб - Узнаваемость (Telegram, дружелюбный тон)")
        return True
    except Exception as e:
        print(f"\n❌ ОШИБКА в тесте 3: {e}\n")
        return False


def test_post_education_engagement(client):
    """Тест: Онлайн-школа, вовлечение, VK, экспертный тон"""
    business = get_online_school()
    request = SinglePostGenerationRequest(
        business=business,
        goal=PostGoal.increase_engagement,
        platform=Platform.vk,
        description="Новый курс по Python для начинающих. Нужен пост, который заинтересует новичков и покажет ценность обучения.",
        tone_override=None,  # Используем экспертный тон бизнеса
        max_length_chars=1000
    )
    
    try:
        response = generate_single_post(client, request)
        print_post_result(response, "Тест 4: Онлайн-школа - Вовлечение (VK, экспертный тон)")
        return True
    except Exception as e:
        print(f"\n❌ ОШИБКА в тесте 4: {e}\n")
        return False


def test_post_beauty_sales_short(client):
    """Тест: Салон красоты, продажи, Telegram, короткий пост"""
    business = get_beauty_salon()
    request = SinglePostGenerationRequest(
        business=business,
        goal=PostGoal.increase_sales,
        platform=Platform.telegram,
        description="Акция: скидка 20% на окрашивание до конца месяца. Ограниченное предложение!",
        tone_override=Tone.playful,
        max_length_chars=300
    )
    
    try:
        response = generate_single_post(client, request)
        print_post_result(response, "Тест 5: Салон красоты - Продажи (Telegram, короткий пост)")
        return True
    except Exception as e:
        print(f"\n❌ ОШИБКА в тесте 5: {e}\n")
        return False


def test_post_formal_tone(client):
    """Тест: Формальный тон для IT-компании"""
    business = get_it_company()
    request = SinglePostGenerationRequest(
        business=business,
        goal=PostGoal.increase_awareness,
        platform=Platform.vk,
        description="Компания получила сертификацию ISO 27001. Важно подчеркнуть надежность и безопасность.",
        tone_override=Tone.formal,
        max_length_chars=700
    )
    
    try:
        response = generate_single_post(client, request)
        print_post_result(response, "Тест 6: IT-компания - Формальный тон (VK)")
        return True
    except Exception as e:
        print(f"\n❌ ОШИБКА в тесте 6: {e}\n")
        return False


# ==================== ТЕСТЫ КОНТЕНТ-ПЛАНОВ ====================

def test_content_plan_coffee_week(client):
    """Тест: Контент-план для кофейни на неделю"""
    business = get_coffee_shop()
    request = ContentPlanRequest(
        business=business,
        goal=PostGoal.increase_engagement,
        platform=Platform.telegram,
        total_posts=7,
        period_days=7,
        description="Нужны идеи постов на неделю: про новые напитки, атмосферу, события в кофейне."
    )
    
    try:
        response = generate_content_plan(client, request)
        print_plan_result(response, "Контент-план 1: Кофейня - 7 постов на неделю")
        return True
    except Exception as e:
        print(f"\n❌ ОШИБКА в контент-плане 1: {e}\n")
        return False


def test_content_plan_it_month(client):
    """Тест: Контент-план для IT-компании на месяц"""
    business = get_it_company()
    request = ContentPlanRequest(
        business=business,
        goal=PostGoal.increase_sales,
        platform=Platform.vk,
        total_posts=12,
        period_days=30,
        description="Контент-план на месяц: кейсы, технологии, услуги компании."
    )
    
    try:
        response = generate_content_plan(client, request)
        print_plan_result(response, "Контент-план 2: IT-компания - 12 постов на месяц")
        return True
    except Exception as e:
        print(f"\n❌ ОШИБКА в контент-плане 2: {e}\n")
        return False


def test_content_plan_fitness_awareness(client):
    """Тест: Контент-план для фитнес-клуба на узнаваемость"""
    business = get_fitness_club()
    request = ContentPlanRequest(
        business=business,
        goal=PostGoal.increase_awareness,
        platform=Platform.telegram,
        total_posts=5,
        period_days=14,
        description="Идеи постов для повышения узнаваемости: про оборудование, тренеров, результаты клиентов."
    )

    try:
        response = generate_content_plan(client, request)
        print_plan_result(response, "Контент-план 3: Фитнес-клуб - 5 постов на 2 недели")
        return True
    except Exception as e:
        print(f"\n❌ ОШИБКА в контент-плане 3: {e}\n")
        return False


def test_telegram_generation_from_selected(client):
    """Тест: Генерация постов на основе выбранных Telegram постов"""
    business = get_coffee_shop()

    # Имитируем выбранные пользователем посты (как будто бэкенд их уже отобрал)
    selected_posts = [
        TelegramPost(
            id="1",
            text="Вкусный кофе с корицей! Попробуйте наш новый напиток - идеально для осеннего утра ☕🍂 #кофе #кофейня",
            views=1500,
            date=datetime(2024, 10, 1),
            link="https://t.me/coffee/1"
        ),
        TelegramPost(
            id="2",
            text="Сегодня скидка 20% на все десерты! Приходите всей семьей и наслаждайтесь уютной атмосферой 🎂❤️",
            views=1200,
            date=datetime(2024, 10, 2),
            link="https://t.me/coffee/2"
        ),
        TelegramPost(
            id="3",
            text="Завтра открытие новой зоны с книгами! Читайте и пейте кофе в нашем уютном уголке 📚☕",
            views=1800,
            date=datetime(2024, 10, 3),
            link="https://t.me/coffee/3"
        )
    ]

    try:
        new_posts = generate_posts_from_selected_telegram_posts(
            client=client,
            business=business,
            selected_posts=selected_posts,
            goal=PostGoal.increase_engagement,
            platform=Platform.telegram,
            num_new_posts=2
        )

        print(f"\n{'='*60}")
        print("Тест 10: Генерация по выбранным ТГ постам")
        print(f"{'='*60}")
        for i, post in enumerate(new_posts, 1):
            print(f"\n{i}. {post.title or '(без заголовка)'}")
            print(f"Текст: {post.body[:200]}...")
            print(f"Хэштеги: {', '.join(post.suggested_hashtags)}")
        print(f"{'='*60}\n")
        return True
    except Exception as e:
        print(f"\n❌ ОШИБКА в генерации по выбранным ТГ постам: {e}\n")
        return False


# ==================== ГЛАВНАЯ ФУНКЦИЯ ====================

def run_all_tests():
    """Запуск всех тестов"""
    print("🚀 Инициализация клиента OpenRouter...")
    client = init_client()
    print(f"✅ Клиент инициализирован (Model: {client.model})\n")
    
    results = {
        "posts": [],
        "plans": []
    }
    
    # Тесты одиночных постов
    print("\n" + "="*60)
    print("ТЕСТЫ ОДИНОЧНЫХ ПОСТОВ")
    print("="*60)
    
    results["posts"].append(("Тест 1: Кофейня - Вовлечение", test_post_coffee_engagement(client)))
    results["posts"].append(("Тест 2: IT-компания - Продажи", test_post_it_sales(client)))
    results["posts"].append(("Тест 3: Фитнес-клуб - Узнаваемость", test_post_fitness_awareness(client)))
    results["posts"].append(("Тест 4: Онлайн-школа - Вовлечение", test_post_education_engagement(client)))
    results["posts"].append(("Тест 5: Салон красоты - Продажи", test_post_beauty_sales_short(client)))
    results["posts"].append(("Тест 6: IT-компания - Формальный тон", test_post_formal_tone(client)))
    
    # Тесты контент-планов
    print("\n" + "="*60)
    print("ТЕСТЫ КОНТЕНТ-ПЛАНОВ")
    print("="*60)
    
    results["plans"].append(("Контент-план 1: Кофейня", test_content_plan_coffee_week(client)))
    results["plans"].append(("Контент-план 2: IT-компания", test_content_plan_it_month(client)))
    results["plans"].append(("Контент-план 3: Фитнес-клуб", test_content_plan_fitness_awareness(client)))
    
    # Итоговая статистика
    print("\n" + "="*60)
    print("ИТОГОВАЯ СТАТИСТИКА")
    print("="*60)
    
    post_success = sum(1 for _, success in results["posts"] if success)
    plan_success = sum(1 for _, success in results["plans"] if success)
    
    print(f"\n📝 Одиночные посты: {post_success}/{len(results['posts'])} успешно")
    for name, success in results["posts"]:
        status = "✅" if success else "❌"
        print(f"   {status} {name}")
    
    print(f"\n📋 Контент-планы: {plan_success}/{len(results['plans'])} успешно")
    for name, success in results["plans"]:
        status = "✅" if success else "❌"
        print(f"   {status} {name}")
    
    total_success = post_success + plan_success
    total_tests = len(results["posts"]) + len(results["plans"])
    print(f"\n🎯 Общий результат: {total_success}/{total_tests} тестов пройдено успешно")
    print("="*60 + "\n")


def run_single_test(test_number: int):
    """Запуск одного конкретного теста"""
    client = init_client()
    print(f"✅ Клиент инициализирован (Model: {client.model})\n")
    
    tests = {
        1: ("Тест 1: Кофейня - Вовлечение", test_post_coffee_engagement),
        2: ("Тест 2: IT-компания - Продажи", test_post_it_sales),
        3: ("Тест 3: Фитнес-клуб - Узнаваемость", test_post_fitness_awareness),
        4: ("Тест 4: Онлайн-школа - Вовлечение", test_post_education_engagement),
        5: ("Тест 5: Салон красоты - Продажи", test_post_beauty_sales_short),
        6: ("Тест 6: IT-компания - Формальный тон", test_post_formal_tone),
        7: ("Контент-план 1: Кофейня", test_content_plan_coffee_week),
        8: ("Контент-план 2: IT-компания", test_content_plan_it_month),
        9: ("Контент-план 3: Фитнес-клуб", test_content_plan_fitness_awareness),
        10: ("Генерация по выбранным ТГ постам", test_telegram_generation_from_selected),
    }
    
    if test_number not in tests:
        print(f"❌ Неизвестный номер теста. Доступны тесты: {list(tests.keys())}")
        return
    
    name, test_func = tests[test_number]
    print(f"Запуск: {name}\n")
    test_func(client)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Запуск конкретного теста: python test_integration.py 1
        try:
            test_num = int(sys.argv[1])
            run_single_test(test_num)
        except ValueError:
            print("❌ Номер теста должен быть числом")
    else:
        # Запуск всех тестов
        run_all_tests()