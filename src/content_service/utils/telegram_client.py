from telethon import TelegramClient
from telethon.tl.types import Message
from datetime import datetime, timedelta, timezone
from typing import List, Tuple
import logging
from core.config import settings

logger = logging.getLogger(__name__)


class TelegramChannelAnalyzer:
    """Утилита для работы с Telegram API и анализа каналов"""

    def __init__(self):
        self.client = TelegramClient(
            'telegram_session',
            settings.telegram.api_id,
            settings.telegram.api_hash
        )

    async def get_channel_posts(
        self,
        channel_username: str,
        start_date: datetime,
        end_date: datetime,
        limit: int = 100
    ) -> List[Tuple[int, str, int, datetime]]:
        """
        Получает посты из канала за указанный период.
        
        Args:
            channel_username: Имя канала
            start_date: Начало периода
            end_date: Конец периода
            limit: Максимальное количество постов для получения (по умолчанию 100)
        
        Returns:
            List[Tuple[message_id, text, views, date]]
        """
        try:
            # Запускаем клиент (авторизуется автоматически если сессия существует)
            await self.client.start()
            
            # Проверяем, авторизован ли клиент
            if not await self.client.is_user_authorized():
                logger.error("Telegram клиент не авторизован. Необходимо выполнить авторизацию.")
                await self.client.disconnect()
                raise Exception("Telegram клиент не авторизован. Необходимо выполнить авторизацию. Запустите скрипт авторизации или войдите через Telegram.")
            
            logger.debug(f"Telegram клиент запущен и авторизован для канала {channel_username}")
            
            # Получаем канал
            try:
                entity = await self.client.get_entity(channel_username)
                logger.debug(f"Канал {channel_username} найден: {entity}")
            except ValueError as e:
                logger.error(f"Канал {channel_username} не найден: {e}")
                await self.client.disconnect()
                raise Exception(f"Канал '{channel_username}' не найден или недоступен. Проверьте правильность имени канала.")
            except Exception as e:
                logger.error(f"Ошибка получения канала {channel_username}: {e}")
                await self.client.disconnect()
                raise Exception(f"Ошибка доступа к каналу '{channel_username}': {str(e)}")
            
            posts = []
            try:
                async for message in self.client.iter_messages(
                    entity,
                    offset_date=end_date,
                    reverse=False,
                    limit=limit
                ):
                    # Проверяем, что сообщение в нужном диапазоне дат
                    if message.date < start_date:
                        break
                    
                    if message.date > end_date:
                        continue
                    
                    # Пропускаем сообщения без текста
                    if not message.message:
                        continue
                    
                    # Получаем текст сообщения
                    text = message.message
                    
                    # Получаем количество просмотров
                    views = message.views or 0
                    
                    posts.append((
                        message.id,
                        text,
                        views,
                        message.date
                    ))
                
                logger.debug(f"Получено {len(posts)} постов из канала {channel_username}")
            except Exception as e:
                logger.error(f"Ошибка при итерации сообщений из канала {channel_username}: {e}")
                await self.client.disconnect()
                raise Exception(f"Ошибка чтения сообщений из канала: {str(e)}")
            
            await self.client.disconnect()
            return posts
            
        except Exception as e:
            logger.error(f"Ошибка получения постов из канала {channel_username}: {e}")
            try:
                await self.client.disconnect()
            except:
                pass
            raise

    def get_popular_posts(
        self,
        posts: List[Tuple[int, str, int, datetime]],
        limit: int = 10
    ) -> List[Tuple[int, str, int, datetime]]:
        """
        Сортирует посты по количеству просмотров и возвращает топ N.
        
        Args:
            posts: Список постов (message_id, text, views, date)
            limit: Количество топ постов для возврата
            
        Returns:
            Отсортированный список топ постов
        """
        # Сортируем по количеству просмотров (по убыванию)
        sorted_posts = sorted(posts, key=lambda x: x[2], reverse=True)
        
        # Возвращаем топ N
        return sorted_posts[:limit]


class MockTelegramChannelAnalyzer(TelegramChannelAnalyzer):
    """Заглушка Telegram API для демо-режима (TELEGRAM_MOCK=true): возвращает тестовые посты без сети"""

    def __init__(self):
        self.client = None

    async def get_channel_posts(
        self,
        channel_username: str,
        start_date: datetime,
        end_date: datetime,
        limit: int = 100
    ) -> List[Tuple[int, str, int, datetime]]:
        total_seconds = max((end_date - start_date).total_seconds(), 1)
        count = min(limit, 10)
        return [
            (
                i + 1,
                f"Демо-пост №{i + 1} из канала @{channel_username}",
                (i * 37 % 10 + 1) * 100,
                start_date + timedelta(seconds=total_seconds * (i + 0.5) / count),
            )
            for i in range(count)
        ]


def create_channel_analyzer() -> TelegramChannelAnalyzer:
    if settings.telegram.mock:
        logger.warning("TELEGRAM_MOCK включён: используются тестовые посты")
        return MockTelegramChannelAnalyzer()
    return TelegramChannelAnalyzer()
