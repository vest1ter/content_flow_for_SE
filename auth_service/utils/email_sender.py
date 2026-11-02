import json
import pika
from core.config import settings

class EmailQueue:
    def __init__(self):
        self.connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=settings.rabbit.host,
                port=settings.rabbit.port
            )
        )
        self.channel = self.connection.channel()

        self.channel.queue_declare(queue='email_codes', durable=True)

    def send_code(self, email: str, code: str):
        self.channel.basic_publish(
            exchange='',
            routing_key='email_codes',
            body=json.dumps({'email': email, 'code': code})
        )

    def send_password_reset_code(self, email: str, code: str):
        self.channel.basic_publish(
            exchange='',
            routing_key='email_codes',
            body=json.dumps({'email': email, 'code': code, 'type': 'password_reset'})
        )

    def close(self):
        if self.connection and self.connection.is_open:
            self.connection.close()

