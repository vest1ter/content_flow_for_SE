import json
import logging
from core.rabbit_set import RabbitMQClient
from tasks.email import handle_email_task
from core.config import settings


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

TASK_HANDLERS = {
    'email': handle_email_task,
}


class WorkerService:
    def __init__(self):
        self.rabbitmq = RabbitMQClient(
            host=settings.rabbit.host,
            #username='admin',
            #password='secure_password'
        )

    def start(self):
        if not self.rabbitmq.connect():
            raise RuntimeError("Failed to connect to RabbitMQ")

        #потребители
        self.rabbitmq.channel.basic_consume(
            queue='email_codes',
            on_message_callback=self.process_email_task,
            auto_ack=False
        )

        logger.info("Worker service started. Waiting for tasks...")
        self.rabbitmq.channel.start_consuming()

    def process_email_task(self, ch, method, properties, body):
        try:
            task_data = json.loads(body)
            success = handle_email_task(email = str(task_data['email']), code = str(task_data['code']))

            if success:
                ch.basic_ack(delivery_tag=method.delivery_tag)
                logger.info("code sent")
            else:
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

        except Exception as e:
            logger.error(f"Failed to process email task: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


if __name__ == '__main__':
    worker = WorkerService()
    worker.start()