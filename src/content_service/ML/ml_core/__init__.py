# ML Core - основная точка входа для генерации контента

from .llm_client import OpenRouterClient, MockLLMClient, ChatMessage
from .pipelines.content_generation import generate_single_post, generate_content_plan
from .pipelines.telegram_analysis import generate_posts_from_selected_telegram_posts

__all__ = [
    # Клиенты
    "OpenRouterClient",
    "MockLLMClient",
    "ChatMessage",

    # Основные функции генерации
    "generate_single_post",
    "generate_content_plan",
    "generate_posts_from_selected_telegram_posts",
]