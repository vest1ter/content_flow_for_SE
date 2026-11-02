# server.py
from concurrent import futures
import grpc
from grpc import StatusCode
import uuid
import logging
import base64
from urllib.parse import urlparse

from core.config import settings
from database.db_helper import get_session
from database import s3_storage
from utils import JWT

# Функции работы с БД
from database.database_functions import (
    create_business,
    get_business_by_id,
    get_businesses_by_user_id,
    update_business,
    delete_business,
    set_active_business,
    get_active_business_by_user_id,
)

# gRPC proto
from generated_proto.business_pb2_grpc import BusinessServiceServicer, add_BusinessServiceServicer_to_server
from generated_proto.business_pb2 import (
    CreateBusinessRequest,
    CreateBusinessResponse,
    GetBusinessRequest,
    GetBusinessResponse,
    UpdateBusinessRequest,
    UpdateBusinessResponse,
    DeleteBusinessRequest,
    DeleteBusinessResponse,
    ListBusinessesRequest,
    ListBusinessesResponse,
    SetActiveBusinessRequest,
    SetActiveBusinessResponse,
    GetActiveBusinessRequest,
    GetActiveBusinessResponse,
    Business,
)

# Логгер
import logging

# Настраиваем логирование
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Отключаем DEBUG логи от boto3 и botocore
logging.getLogger('boto3').setLevel(logging.WARNING)
logging.getLogger('botocore').setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)
logging.getLogger('s3transfer').setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


class BusinessServicer(BusinessServiceServicer):

    def _upload_logo(self, logo_bytes: bytes) -> str:
        """Загружает логотип в MinIO/S3 и возвращает публичный URL."""
        if not logo_bytes:
            return ""

        bucket_name = "business-logos"
        s3_storage.ensure_bucket(bucket_name)

        filename = f"logo_{uuid.uuid4()}.png"
        object_name = f"{uuid.uuid4()}_{filename}"

        try:
            s3_storage.s3.put_object(
                Bucket=bucket_name,
                Key=object_name,
                Body=logo_bytes,
                ContentType="image/png"
            )
            return f"{settings.minio.public_url}/{bucket_name}/{object_name}"
        except Exception as e:
            logger.error(f"Ошибка загрузки логотипа: {e}")
            raise

    def _get_logo_base64(self, logo_url: str | None) -> str:
        """Получает логотип из MinIO по URL и конвертирует в base64."""
        if not logo_url:
            return ""

        try:
            # Парсим URL: http://minio:9000/business-logos/{object_name}
            parsed_url = urlparse(logo_url)
            path_parts = parsed_url.path.strip('/').split('/', 1)
            
            if len(path_parts) != 2:
                logger.error(f"Неверный формат URL логотипа: {logo_url}")
                return ""

            bucket_name = path_parts[0]
            object_name = path_parts[1]

            # Получаем файл из MinIO
            response = s3_storage.s3.get_object(Bucket=bucket_name, Key=object_name)
            file_bytes = response['Body'].read()

            # Конвертируем в base64
            base64_string = base64.b64encode(file_bytes).decode('utf-8')
            return base64_string

        except Exception as e:
            logger.error(f"Ошибка получения логотипа из MinIO: {e}")
            return ""

    def _business_to_proto(self, business) -> Business:
        # Получаем base64 строку логотипа из MinIO
        logo_base64 = self._get_logo_base64(business.logo_url)
        
        return Business(
            id=str(business.id),
            user_id=str(business.user_id),
            name=business.name,
            industry=business.industry,
            audience_reach=business.audience_reach or "",
            region=business.region or "",
            description=business.description or "",
            logo_url=business.logo_url or "",  # оставляем для обратной совместимости
            logo_base64=logo_base64,
            communication_style=business.communication_style,
            is_active=business.is_active,
            created_at=int(business.created_at.timestamp()) if business.created_at else 0,
            updated_at=int(business.updated_at.timestamp()) if business.updated_at else 0,
        )

    def CreateBusiness(self, request: CreateBusinessRequest, context):
        logger.debug("CreateBusiness вызван")
        try:
            current_user = JWT.verify_token(request.access_token, context)
        except Exception:
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный или отсутствующий токен")
            return CreateBusinessResponse()

        with get_session() as session:
            # Проверяем количество бизнесов пользователя
            existing_businesses = get_businesses_by_user_id(session, current_user.id)
            if len(existing_businesses) >= 2:
                logger.error(f"Пользователь {current_user.id} уже имеет максимальное количество бизнесов (2)")
                context.set_code(StatusCode.RESOURCE_EXHAUSTED)
                context.set_details("Максимальное количество бизнесов (2) уже достигнуто")
                return CreateBusinessResponse()

        logo_url = ""
        if request.logo_bytes:
            try:
                logo_url = self._upload_logo(request.logo_bytes)
            except Exception as e:
                context.set_code(StatusCode.INTERNAL)
                context.set_details(f"Ошибка загрузки логотипа: {str(e)}")
                return CreateBusinessResponse()

        with get_session() as session:
            try:
                business = create_business(
                    session=session,
                    user_id=current_user.id,
                    name=request.name,
                    industry=request.industry,
                    audience_reach=request.audience_reach or None,
                    region=request.region or None,
                    description=request.description or None,
                    logo_url=logo_url,
                    communication_style=request.communication_style,
                )
            except Exception as e:
                logger.error(f"Ошибка создания бизнеса: {e}")
                context.set_code(StatusCode.INTERNAL)
                context.set_details("Ошибка при создании бизнеса")
                return CreateBusinessResponse()

        return CreateBusinessResponse(business=self._business_to_proto(business))

    def GetBusiness(self, request: GetBusinessRequest, context):
        try:
            current_user = JWT.verify_token(request.access_token, context)
        except Exception:
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный или отсутствующий токен")
            return CreateBusinessResponse()

        with get_session() as session:
            business = get_business_by_id(session, request.business_id)
            if not business:
                context.set_code(StatusCode.NOT_FOUND)
                context.set_details("Бизнес не найден")
                return GetBusinessResponse()

        return GetBusinessResponse(business=self._business_to_proto(business))

    def UpdateBusiness(self, request: UpdateBusinessRequest, context):
        logger.info(f"🔄 [Business Service] UpdateBusiness called for business_id: {request.business_id}")
        try:
            current_user = JWT.verify_token(request.access_token, context)
            logger.info(f"✅ [Business Service] User authenticated: {current_user.username} (id: {current_user.id})")
        except Exception as e:
            logger.error(f"❌ [Business Service] Authentication failed: {str(e)}")
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный или отсутствующий токен")
            return UpdateBusinessResponse()

        # Логируем входящие данные
        logger.info(f"📥 [Business Service] Update data received: "
                   f"business_id={request.business_id}, "
                   f"name={request.name if request.name else 'None'}, "
                   f"industry={request.industry if request.industry else 'None'}, "
                   f"audience_reach={request.audience_reach if request.audience_reach else 'None'}, "
                   f"region={request.region if request.region else 'None'}, "
                   f"description_length={len(request.description) if request.description else 0}, "
                   f"communication_style={request.communication_style if request.communication_style else 'None'}, "
                   f"has_logo={request.HasField('logo_bytes') and bool(request.logo_bytes)}")

        logo_url = None
        if request.HasField("logo_bytes") and request.logo_bytes:
            try:
                logger.info(f"📤 [Business Service] Uploading logo for business_id: {request.business_id}, logo_size: {len(request.logo_bytes)} bytes")
                logo_url = self._upload_logo(request.logo_bytes)
                logger.info(f"✅ [Business Service] Logo uploaded successfully: {logo_url}")
            except Exception as e:
                logger.error(f"❌ [Business Service] Logo upload failed: {str(e)}")
                context.set_code(StatusCode.INTERNAL)
                context.set_details(f"Ошибка загрузки логотипа: {str(e)}")
                return UpdateBusinessResponse()

        with get_session() as session:
            logger.info(f"🔄 [Business Service] Updating business in database: business_id={request.business_id}")
            business = update_business(
                session=session,
                business_id=request.business_id,
                name=request.name or None,
                industry=request.industry or None,
                audience_reach=request.audience_reach or None,
                region=request.region or None,
                description=request.description or None,
                logo_url=logo_url,
                communication_style=request.communication_style if request.communication_style else None,
            )
            if not business:
                logger.error(f"❌ [Business Service] Business not found: business_id={request.business_id}")
                context.set_code(StatusCode.NOT_FOUND)
                context.set_details("Бизнес не найден")
                return UpdateBusinessResponse()

            logger.info(f"✅ [Business Service] Business updated successfully: "
                       f"business_id={business.id}, "
                       f"name={business.name}, "
                       f"industry={business.industry}, "
                       f"logo_url={business.logo_url or 'None'}")

        return UpdateBusinessResponse(business=self._business_to_proto(business))

    def DeleteBusiness(self, request: DeleteBusinessRequest, context):
        try:
            current_user = JWT.verify_token(request.access_token, context)
        except Exception:
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный или отсутствующий токен")
            return CreateBusinessResponse()

        with get_session() as session:
            success = delete_business(session, request.business_id)
            if not success:
                context.set_code(StatusCode.NOT_FOUND)
                context.set_details("Бизнес не найден")
                return DeleteBusinessResponse()

        return DeleteBusinessResponse(success=True)

    def ListBusinesses(self, request: ListBusinessesRequest, context):
        try:
            current_user = JWT.verify_token(request.access_token, context)
        except Exception:
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный токен")
            return ListBusinessesResponse()

        with get_session() as session:
            businesses = get_businesses_by_user_id(session, current_user.id)

        business_list = [self._business_to_proto(b) for b in businesses]
        return ListBusinessesResponse(businesses=business_list)

    def SetActiveBusiness(self, request: SetActiveBusinessRequest, context):
        try:
            current_user = JWT.verify_token(request.access_token, context)
        except Exception:
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный или отсутствующий токен")
            return SetActiveBusinessResponse()

        with get_session() as session:
            business = set_active_business(
                session=session,
                user_id=current_user.id,
                business_id=request.business_id
            )
            if not business:
                context.set_code(StatusCode.NOT_FOUND)
                context.set_details("Бизнес не найден или не принадлежит пользователю")
                return SetActiveBusinessResponse()

        return SetActiveBusinessResponse(
            success=True,
            business=self._business_to_proto(business)
        )

    def GetActiveBusiness(self, request: GetActiveBusinessRequest, context):
        try:
            current_user = JWT.verify_token(request.access_token, context)
        except Exception:
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный или отсутствующий токен")
            return GetActiveBusinessResponse()

        with get_session() as session:
            business = get_active_business_by_user_id(session, current_user.id)
            if not business:
                context.set_code(StatusCode.NOT_FOUND)
                context.set_details("Активный бизнес не найден")
                return GetActiveBusinessResponse()

        return GetActiveBusinessResponse(business=self._business_to_proto(business))


def serve():
    s3_storage.ensure_bucket("business-logos")
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    add_BusinessServiceServicer_to_server(BusinessServicer(), server)
    server.add_insecure_port("0.0.0.0:50051")
    logger.info("Business service запущен на порту 50051")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()