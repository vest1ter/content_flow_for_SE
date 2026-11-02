import pika
import json
import logging
from core.config import settings


logger = logging.getLogger(__name__)


class RabbitMQClient:
    def __init__(self, host: str):
        self.host = host
        self.connection = None
        self.channel = None

    def connect(self):
        try:
            self.connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=self.host)
            )
            self.channel = self.connection.channel()

            self.channel.queue_declare(queue='email_codes', durable=True)

            logger.info("✅ Connected to RabbitMQ")

            return True

        except Exception as e:
            logger.error(f"❌ RabbitMQ connection failed: {e}")
            raise

    def publish_task(self, task_type: str, data: dict):
        if not self.connection:
            self.connect()

        task = {
            'type': task_type,
            'data': data
        }

        self.channel.basic_publish(
            exchange='',
            routing_key='tasks',
            body=json.dumps(task),
            properties=pika.BasicProperties(delivery_mode=2)  # Сохранять на диск
        )

        logger.info(f"📤 Published {task_type} task")

    def close(self):
        """Закрытие соединения"""
        if self.connection:
            self.connection.close()
            logger.info("🔌 RabbitMQ connection closed")