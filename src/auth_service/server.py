import logging
from concurrent import futures
import grpc
from grpc import StatusCode
import random


from generated_proto.auth_pb2_grpc import AuthServiceServicer, add_AuthServiceServicer_to_server
from generated_proto.auth_pb2 import (RegisterUserResponse,
                                      TokenResponse,
                                      LoginUserResponse,
                                      SendVerifyCodeResponse,
                                      ConfirmVerifyCodeResponse,
                                      RefreshUserTokenResponse,
                                      SendPasswordResetCodeRequest,
                                      SendPasswordResetCodeResponse,
                                      ConfirmPasswordResetCodeRequest,
                                      ConfirmPasswordResetCodeResponse,
                                      ResetPasswordRequest,
                                      ResetPasswordResponse)
from utils.email_sender import EmailQueue
from database.db_helper import get_session
from database import database_functions
from random import randint
from utils import hashing, JWT
from utils.JWT import create_reset_password_token, verify_token_reset_password
from core.config import settings
from core.config import redis_client
from models.models import create_tables

from logging import getLogger
import logging

logging.basicConfig(level=logging.DEBUG)
logger = getLogger(__name__)

create_tables()

class AuthServicer(AuthServiceServicer):

    def __init__(self):
        self.session = get_session()

    def RegisterUser(self, request, context):
        try:
            logger.info(f"🟢 [Auth Service] RegisterUser called - email: {request.email}, username: {request.username}")
            logger.info(f"🔍 [Auth Service] RegisterUser request details - email: '{request.email}', username: '{request.username}', username_type: {type(request.username)}, username_len: {len(request.username) if request.username else 0}")
            
            # Дополнительная проверка username перед использованием
            if not request.username or not request.username.strip():
                logger.error(f"❌ [Auth Service] Empty username received")
                context.set_code(StatusCode.INVALID_ARGUMENT)
                context.set_details("Username cannot be empty")
                return RegisterUserResponse()
            
            username_to_use = request.username.strip()
            logger.info(f"📝 [Auth Service] Using username: '{username_to_use}' (trimmed)")
            
            if request.password != request.repeat_password:

                logger.error(f"пароли не совпадают: {request.password} | {request.repeat_password}")

                context.set_code(StatusCode.INVALID_ARGUMENT)
                context.set_details("Passwords do not match")

                return RegisterUserResponse()

            ifuser = database_functions.get_user_by_email(request.email, session=self.session)
            if ifuser:
                logger.error(f"email зарегистрирован: {request.email} {ifuser}")

                context.set_code(StatusCode.ALREADY_EXISTS)
                context.set_details("User already exists")

                return RegisterUserResponse()

            hashed_password = hashing.hash_password(request.password)

            logger.info(f"📤 [Auth Service] Before calling add_user_to_db - username: '{username_to_use}', email: '{request.email}'")
            user_id = database_functions.add_user_to_db(username = username_to_use, email = request.email, hashed_password = hashed_password, session = self.session)
            logger.info(f"✅ [Auth Service] After add_user_to_db - user_id: {user_id}")

            logger.info(f"✅ [Auth Service] User registered successfully - user_id: {user_id}, email: {request.email}")

            email_confirm_token = JWT.create_email_token(user_id=user_id, username=username_to_use, context=context)

            logger.info(f"✅ [Auth Service] Email confirm token created - token_prefix: {email_confirm_token[:10]}")

            return RegisterUserResponse(message=f"success register {username_to_use} user with email {request.email} please confirm email",
                                        confirmed=False,
                                        email_confirm_token=email_confirm_token)

        except Exception as e:
            logger.error(f"Ошибка регистрации: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Internal server error: {str(e)}")
            return RegisterUserResponse()

    def LoginUser(self, request, context):
        try:
            logger.info(f"🟢 [Auth Service] LoginUser called - username/email: {request.username}")
            if (request.username).count("@") == 0:
                logger.debug(f"🔍 [Auth Service] Searching user by username: {request.username}")
                user = database_functions.get_user_by_username(request.username, session=self.session)
            else:
                logger.debug(f"🔍 [Auth Service] Searching user by email: {request.username}")
                user = database_functions.get_user_by_email(request.username, session=self.session)

            if user is None:
                logger.error(f"❌ [Auth Service] User not found - username/email: {request.username}")
                context.set_code(StatusCode.INVALID_ARGUMENT)
                context.set_details("Username or email uncorrect or not found")
                return LoginUserResponse()

            logger.info(f"✅ [Auth Service] User found - user_id: {user.id}, email: {user.email}, confirmed: {user.confirmed}")

            if not hashing.verify_password(request.password, user.hashed_password):
                logger.error(f"❌ [Auth Service] Invalid password for user: {request.username}")
                context.set_code(StatusCode.INVALID_ARGUMENT)
                context.set_details("Uncorrect password")
                return LoginUserResponse()


            if user.confirmed:
                logger.info(f"✅ [Auth Service] User confirmed - creating tokens for: {user.username}")

                access_token = JWT.create_access_token(user_id = user.id, username=user.username, context=context)
                refresh_token = JWT.create_refresh_token(user_id = user.id, username=user.username, context=context)

                logger.info(f"✅ [Auth Service] Login successful - access_token_prefix: {access_token[:10]}, user: {user.username}")

                return LoginUserResponse(confirmed=user.confirmed,
                                         access_token=access_token,
                                         refresh_token=refresh_token,
                                         message=f"confirmed login success {user.username}")
            else:
                logger.warn(f"⚠️ [Auth Service] User not confirmed - username: {user.username}, email: {user.email}")

                email_confirm_token = JWT.create_email_token(user_id = user.id, username=user.username, context=context)

                logger.info(f"✅ [Auth Service] Email confirm token created - token_prefix: {email_confirm_token[:10]}")

                return LoginUserResponse(confirmed=user.confirmed,
                                         email_confirm_token=email_confirm_token,
                                         message=f"you need to confirm login {user.username}")




        except Exception as e:
            logger.error(f"Ошибка логина: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Internal server error: {str(e)}")
            return LoginUserResponse()

    def SendVerifyCode(self, request, context):
        logger.info(f"🟢 [Auth Service] SendVerifyCode called - email from request: {request.email}")
        current_user = JWT.verify_token_email(request.email_token, context)
        logger.info(f"📧 [Auth Service] JWT decoded - user_id: {current_user.id}, username: {current_user.username}")

        user = database_functions.get_user_by_id(current_user.id, session=self.session)
        logger.info(f"📧 [Auth Service] User from database - email: {user.email}, user_id: {user.id}")

        if request.email != user.email:
            logger.error(f"❌ [Auth Service] Emails don't match - request.email: {request.email}, user.email: {user.email}")
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details(f"emails dont match: {request.email} and {user.email}")
            return SendVerifyCodeResponse()

        code = random.randint(100000, 999999)
        logger.info(f"📧 [Auth Service] Generated verification code: {code}")

        # Проверяем, есть ли уже код в Redis
        existing_code = redis_client.get(f"code {user.id}")
        if existing_code:
            logger.warn(f"⚠️ [Auth Service] Existing code found in Redis for user_id: {user.id}, old_code: {existing_code.decode() if isinstance(existing_code, bytes) else existing_code}. Will be overwritten with new code: {code}")
        else:
            logger.info(f"📝 [Auth Service] No existing code in Redis for user_id: {user.id}")

        redis_client.setex(f"code {user.id}", 300, code)
        logger.info(f"✅ [Auth Service] Code saved to Redis for user_id: {user.id}, code: {code}, TTL: 300 seconds")

        try:
            logger.info(f"📧 [Auth Service] Sending email to RabbitMQ - email: {request.email}, code: {code}")
            queue = EmailQueue()
            queue.send_code(email=request.email, code=code)
            queue.close()
            logger.info(f"✅ [Auth Service] Email task sent to RabbitMQ successfully - email: {request.email}, code: {code}")

        except Exception as e:
            logger.error(f"в rabbit не отправились данные {e}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"rabbit dont work {str(e)}")
            return SendVerifyCodeResponse()


        return SendVerifyCodeResponse(message="success send code") #str(data.decode())

    def ConfirmVerifyCode(self, request, context):
        current_user = JWT.verify_token_email(request.email_token, context)
        logger.debug(f"jwt decoded {current_user.username}")

        user = database_functions.get_user_by_id(current_user.id, session=self.session)

        code = redis_client.get(f"code {user.id}")

        logger.info(f"redis code {code}")

        if code is None:
            logger.error(f"пустое поле кода")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"empty code {code}")
            return ConfirmVerifyCodeResponse()

        if int(code) != request.code:
            logger.error(f"коды не совпадают")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"codes dont match {code}")
            return ConfirmVerifyCodeResponse()

        logger.info(f"right code {code}")

        database_functions.confirm_user_by_id(user.id, session=self.session)
        logger.info(f"user confirmed {user.username}")

        access_token = JWT.create_access_token(user_id=user.id, username=user.username, context=context)
        refresh_token = JWT.create_refresh_token(user_id=user.id, username=user.username, context=context)

        logger.info(f"user confirm your email, login success{access_token[:7]}")
        redis_client.delete(f"code {user.id}")
        return ConfirmVerifyCodeResponse(confirmed=True,
                                 access_token=access_token,
                                 refresh_token=refresh_token,
                                 message=f"user confirm your email, login success {user.username}")

    def RefreshUserToken(self, request, context):

        current_user = JWT.verify_token(request.refresh_token, context)

        access_token = JWT.create_access_token(user_id=current_user.id, username=current_user.username, context=context)

        logger.debug(f"token ready {access_token[:7]}")

        return RefreshUserTokenResponse(message="success refresh token", access_token=access_token)

    def SendPasswordResetCode(self, request, context):
        try:
            logger.debug(f"запрос на восстановление пароля для email: {request.email}")

            user = database_functions.get_user_by_email(request.email, session=self.session)

            if user is None:
                logger.error(f"пользователя с email {request.email} не существует")
                context.set_code(StatusCode.NOT_FOUND)
                context.set_details("User with this email not found")
                return SendPasswordResetCodeResponse()

            code = random.randint(100000, 999999)

            # Проверяем, есть ли уже код в Redis
            existing_code = redis_client.get(f"reset_code {user.id}")
            if existing_code:
                logger.warn(f"⚠️ [Auth Service] Existing reset code found in Redis for user_id: {user.id}, old_code: {existing_code.decode() if isinstance(existing_code, bytes) else existing_code}. Will be overwritten with new code: {code}")
            else:
                logger.info(f"📝 [Auth Service] No existing reset code in Redis for user_id: {user.id}")

            redis_client.setex(f"reset_code {user.id}", 300, code)
            logger.info(f"✅ [Auth Service] Reset code saved to Redis for user_id: {user.id}, code: {code}, TTL: 300 seconds")

            try:
                queue = EmailQueue()
                queue.send_password_reset_code(email=request.email, code=code)
                queue.close()
                logger.info("в rabbit отправились данные для восстановления пароля")

            except Exception as e:
                logger.error(f"в rabbit не отправились данные {e}")
                context.set_code(StatusCode.INTERNAL)
                context.set_details(f"rabbit dont work {str(e)}")
                return SendPasswordResetCodeResponse()

            reset_pass_token = create_reset_password_token(user_id=str(user.id), username=user.username, context=context)
            logger.info(f"reset_pass_token создан {reset_pass_token[:7]}")

            return SendPasswordResetCodeResponse(
                message="success send password reset code",
                reset_pass_token=reset_pass_token
            )

        except Exception as e:
            logger.error(f"Ошибка отправки кода восстановления пароля: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Internal server error: {str(e)}")
            return SendPasswordResetCodeResponse()

    def ConfirmPasswordResetCode(self, request, context):
        try:
            logger.info(f"🔵 [Auth Service] ConfirmPasswordResetCode called")
            logger.info(f"📥 [Auth Service] Request: code={request.code}, reset_pass_token_prefix={request.reset_pass_token[:10] if request.reset_pass_token else 'None'}")
            
            # Проверяем наличие токена
            if not request.reset_pass_token:
                logger.error(f"❌ [Auth Service] Reset pass token is empty")
                context.set_code(StatusCode.INVALID_ARGUMENT)
                context.set_details("Токен сброса пароля не найден. Пожалуйста, запросите код заново.")
                return ConfirmPasswordResetCodeResponse()
            
            # Верификация токена может выбросить gRPC исключение через context.abort()
            try:
                current_user = verify_token_reset_password(request.reset_pass_token, context)
                logger.info(f"✅ [Auth Service] JWT decoded successfully: user_id={current_user.id}, username={current_user.username}")
            except grpc.RpcError as rpc_err:
                # context.abort() выбрасывает RpcError, который нужно пробросить дальше
                logger.error(f"❌ [Auth Service] Token verification failed (RpcError): {rpc_err.code()}, {rpc_err.details()}")
                raise
            except Exception as token_err:
                # Другие ошибки токена
                logger.error(f"❌ [Auth Service] Token verification failed: {str(token_err)}")
                context.set_code(StatusCode.UNAUTHENTICATED)
                context.set_details("Токен сброса пароля не найден или истек. Пожалуйста, запросите код заново.")
                return ConfirmPasswordResetCodeResponse()

            user = database_functions.get_user_by_id(current_user.id, session=self.session)
            
            if user is None:
                logger.error(f"❌ [Auth Service] User not found: user_id={current_user.id}")
                context.set_code(StatusCode.NOT_FOUND)
                context.set_details("Пользователь не найден")
                return ConfirmPasswordResetCodeResponse()

            code = redis_client.get(f"reset_code {user.id}")

            # Декодируем bytes в строку если нужно
            if code is not None and isinstance(code, bytes):
                code = code.decode('utf-8')

            logger.info(f"📥 [Auth Service] Redis code retrieved: code={code}, user_id={user.id}")

            if code is None:
                logger.error(f"❌ [Auth Service] Code is None or expired for user_id: {user.id}")
                context.set_code(StatusCode.INVALID_ARGUMENT)
                context.set_details("Код подтверждения истек. Пожалуйста, запросите код заново.")
                return ConfirmPasswordResetCodeResponse()

            if int(code) != request.code:
                logger.error(f"❌ [Auth Service] Codes don't match: expected={code}, received={request.code}")
                context.set_code(StatusCode.INVALID_ARGUMENT)
                context.set_details("Неверный код подтверждения")
                return ConfirmPasswordResetCodeResponse()

            logger.info(f"✅ [Auth Service] Code confirmed successfully: code={code}")

            redis_client.delete(f"reset_code {user.id}")
            logger.info(f"✅ [Auth Service] Code confirmed for password reset: username={user.username}")

            return ConfirmPasswordResetCodeResponse(
                confirmed=True,
                message=f"code confirmed, you can reset password {user.username}"
            )

        except grpc.RpcError as rpc_err:
            # Пробрасываем gRPC ошибки дальше (включая Unauthenticated от verify_token_reset_password)
            logger.error(f"❌ [Auth Service] gRPC error in ConfirmPasswordResetCode: {rpc_err.code()}, {rpc_err.details()}")
            raise
        except Exception as e:
            logger.error(f"❌ [Auth Service] Ошибка подтверждения кода восстановления пароля: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Internal server error: {str(e)}")
            return ConfirmPasswordResetCodeResponse()

    def ResetPassword(self, request, context):
        try:
            logger.info(f"🔵 [Auth Service] ResetPassword called")
            logger.info(f"📥 [Auth Service] Request: reset_pass_token_prefix={request.reset_pass_token[:10] if request.reset_pass_token else 'None'}, new_password_length={len(request.new_password) if request.new_password else 0}")
            
            # Проверяем наличие токена
            if not request.reset_pass_token:
                logger.error(f"❌ [Auth Service] Reset pass token is empty")
                context.set_code(StatusCode.INVALID_ARGUMENT)
                context.set_details("Токен сброса пароля не найден. Пожалуйста, запросите код заново.")
                return ResetPasswordResponse()
            
            # Проверяем совпадение паролей (если repeat_password передается)
            if hasattr(request, 'repeat_password') and request.repeat_password:
                if request.new_password != request.repeat_password:
                    logger.error(f"❌ [Auth Service] Passwords don't match")
                    context.set_code(StatusCode.INVALID_ARGUMENT)
                    context.set_details("Пароли не совпадают")
                    return ResetPasswordResponse()
            
            # Верификация токена может выбросить gRPC исключение через context.abort()
            try:
                current_user = verify_token_reset_password(request.reset_pass_token, context)
                logger.info(f"✅ [Auth Service] JWT decoded successfully: user_id={current_user.id}, username={current_user.username}")
            except grpc.RpcError as rpc_err:
                # context.abort() выбрасывает RpcError, который нужно пробросить дальше
                logger.error(f"❌ [Auth Service] Token verification failed (RpcError): {rpc_err.code()}, {rpc_err.details()}")
                raise
            except Exception as token_err:
                # Другие ошибки токена
                logger.error(f"❌ [Auth Service] Token verification failed: {str(token_err)}")
                context.set_code(StatusCode.UNAUTHENTICATED)
                context.set_details("Токен сброса пароля не найден или истек. Пожалуйста, запросите код заново.")
                return ResetPasswordResponse()

            user = database_functions.get_user_by_id(current_user.id, session=self.session)

            if user is None:
                logger.error(f"❌ [Auth Service] User not found: user_id={current_user.id}")
                context.set_code(StatusCode.NOT_FOUND)
                context.set_details("Пользователь не найден")
                return ResetPasswordResponse()

            hashed_password = hashing.hash_password(request.new_password)

            success = database_functions.update_user_password(user.id, hashed_password, session=self.session)

            if not success:
                logger.error(f"❌ [Auth Service] Failed to update password for user_id: {user.id}")
                context.set_code(StatusCode.INTERNAL)
                context.set_details("Не удалось обновить пароль")
                return ResetPasswordResponse()

            logger.info(f"✅ [Auth Service] Password successfully reset for username: {user.username}")

            return ResetPasswordResponse(
                success=True,
                message=f"password successfully reset for {user.username}"
            )

        except grpc.RpcError as rpc_err:
            # Пробрасываем gRPC ошибки дальше (включая Unauthenticated от verify_token_reset_password)
            logger.error(f"❌ [Auth Service] gRPC error in ResetPassword: {rpc_err.code()}, {rpc_err.details()}")
            raise
        except Exception as e:
            logger.error(f"❌ [Auth Service] Ошибка сброса пароля: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Internal server error: {str(e)}")
            return ResetPasswordResponse()







def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    add_AuthServiceServicer_to_server(AuthServicer(), server)
    server.add_insecure_port("0.0.0.0:50051")
    print("сервис стартанул")
    server.start()
    print("сервис стартанул")
    server.wait_for_termination()

if __name__ == '__main__':
    serve()