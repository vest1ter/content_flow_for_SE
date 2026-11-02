from __future__ import annotations
import os
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