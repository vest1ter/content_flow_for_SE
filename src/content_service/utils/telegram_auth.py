"""
Скрипт для авторизации Telegram клиента.
Запустите этот скрипт один раз для создания сессии.

Использование:
    python -m content_service.utils.telegram_auth
"""
import asyncio
from telethon import TelegramClient
from core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def authorize_telegram():
    """Авторизует Telegram клиент"""
    client = TelegramClient(
        'telegram_session',
        settings.telegram.api_id,
        settings.telegram.api_hash
    )
    
    await client.start()
    
    # Проверяем авторизацию
    if await client.is_user_authorized():
        me = await client.get_me()
        logger.info(f"✅ Успешно авторизован как: {me.first_name} {me.last_name or ''} (@{me.username or 'без username'})")
    else:
        logger.error("❌ Авторизация не удалась")
    
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(authorize_telegram())
