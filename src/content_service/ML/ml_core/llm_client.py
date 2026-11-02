from __future__ import annotations
import json
import os
import re
import requests
from dataclasses import dataclass
from typing import List, Protocol, Any
from dotenv import load_dotenv

# Загружаем переменные из .env файла
load_dotenv()


@dataclass
class ChatMessage:
    role: str  
    content: str


class LLMClient(Protocol):

    def generate(
            self,
            messages: List[ChatMessage],
            max_tokens: int = 1024,
            temperature: float = 0.7,
    ) -> str:
        ...


class OpenRouterClient:

    def __init__(
            self,
            api_key: str | None = None,
            model: str = "mistralai/mistral-7b-instruct"
    ):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("API Key for OpenRouter is missing. Set OPENROUTER_API_KEY env var.")

        self.model = model
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/ContentFlowAI",  # Идентификация приложения
            "X-Title": "ContentFlowAI",  # Название приложения
        }

    def generate(
            self,
            messages: List[ChatMessage],
            max_tokens: int = 1024,
            temperature: float = 0.7,
    ) -> str:
        # Преобразуем dataclass в dict формат API
        payload_messages = [{"role": m.role, "content": m.content} for m in messages]

        payload = {
            "model": self.model,
            "messages": payload_messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }

        try:
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=60
            )

            if not response.ok:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get("error", {}).get("message", error_detail)
                except:
                    pass
                raise RuntimeError(
                    f"OpenRouter API Request failed: {response.status_code} {response.reason}\n"
                    f"Details: {error_detail}\n"
                    f"Model: {self.model}"
                )

            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return content

        except requests.exceptions.HTTPError as e:
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_json = e.response.json()
                    error_detail = error_json.get("error", {}).get("message", e.response.text)
                except:
                    error_detail = e.response.text
                raise RuntimeError(
                    f"OpenRouter API Request failed: {e.response.status_code} {e.response.reason}\n"
                    f"Response details: {error_detail}\n"
                    f"Model: {self.model}"
                )
            raise RuntimeError(f"OpenRouter API Request failed: {e}")
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"OpenRouter API Request failed: {e}")
        except (KeyError, IndexError) as e:
            raise RuntimeError(f"Unexpected response format from OpenRouter: {e}")


class MockLLMClient:
    """
    Детерминированная заглушка LLM для демо-режима и тестов (ML_MOCK=true).
    Не ходит в сеть; формат ответа повторяет то, что промпты требуют от модели.
    """

    model = "mock"

    def generate(
            self,
            messages: List[ChatMessage],
            max_tokens: int = 1024,
            temperature: float = 0.7,
    ) -> str:
        prompt = "\n".join(m.content for m in messages)

        # Генерация по популярным постам Telegram
        match = re.search(r"Количество новых постов:\s*(\d+)", prompt)
        if match:
            count = int(match.group(1))
            return json.dumps([
                {
                    "title": f"Демо-пост {i + 1}",
                    "body": f"Демо-текст поста {i + 1}, созданный по мотивам популярных публикаций.",
                    "suggested_hashtags": ["#demo", "#contentflow"],
                }
                for i in range(count)
            ], ensure_ascii=False)

        # Контент-план
        match = re.search(r"Количество постов:\s*(\d+)", prompt)
        if match:
            count = int(match.group(1))
            goal_match = re.search(r"Цель контент-плана:\s*(\w+)", prompt)
            goal = goal_match.group(1) if goal_match else "other"
            return json.dumps([
                {
                    "title": f"Идея {i + 1}",
                    "idea": f"Демо-описание идеи поста {i + 1}.",
                    "format": "пост",
                    "goal": goal,
                }
                for i in range(count)
            ], ensure_ascii=False)

        # Один пост
        return json.dumps({
            "title": "Демо-пост",
            "body": "Это демо-текст поста, сгенерированный без обращения к LLM (ML_MOCK=true).",
            "suggested_hashtags": ["#demo", "#contentflow"],
            "suggested_image_prompt": None,
        }, ensure_ascii=False)
