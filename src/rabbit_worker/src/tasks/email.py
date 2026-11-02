import logging
import re
import smtplib
import dns.resolver
from core.config import settings
import random
import time
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def handle_email_task(email, code):
    logger.debug(f"Received email: {email}, code: {code}")

    if settings.smtp.mode == "console":
        logger.info(f"[console email] to={email} verification_code={code}")
        return True

    # SMTP настройки отправителя (используй свои!)
    SMTP_SERVER = settings.smtp.server
    SMTP_PORT = settings.smtp.port
    SMTP_USER = settings.smtp.user
    SMTP_PASSWORD = settings.smtp.password

    # Адрес, от которого отправляется письмо
    fromAddress = SMTP_USER

    domain = email.split('@')[1]
    logger.debug(f'🔍 Domain: {domain}')

    try:
        records = dns.resolver.resolve(domain, 'MX')
        mxRecord = str(records[0].exchange)
        logger.debug(f'📬 MX Record: {mxRecord}')
        #return True
    except Exception as e:
        logger.error(f'❌ MX lookup failed: {e}')
        return False
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)

        subject = "Your Verification Code"
        body = f"Your verification code is: {code}\nPlease enter it to complete verification."
        message = f"Subject: {subject}\n\n{body}"

        server.sendmail(fromAddress, email, message)
        server.quit()
        logger.info("✅ Verification email sent!")
        return True
    except Exception as e:
        logger.debug(f"❌ Failed to send email: {e}")
        return False




