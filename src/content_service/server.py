from concurrent import futures
import grpc
from grpc import StatusCode
import asyncio
from datetime import datetime, timezone

from database.db_helper import get_session
from database.database_functions import (
    add_generated_post_to_db,
    add_content_plan_to_db,
    get_content_plan_by_id
)
from models.models import PostType, PostGoal
import uuid
from models.models import Post
from utils import JWT
from database import s3_storage
from core.config import settings
from utils.telegram_client import create_channel_analyzer

# ML Core imports
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ML'))
from ml_core.llm_client import OpenRouterClient, MockLLMClient
from ml_core.pipelines.content_generation import generate_single_post, generate_content_plan
from ml_core.pipelines.telegram_analysis import generate_posts_from_selected_telegram_posts
from ml_core.schemas import (
    BusinessProfile, PostGoal as MLPostGoal, Platform as MLPlatform, Tone as MLTone,
    SinglePostGenerationRequest, TelegramPost as MLTelegramPost,
    ContentPlanRequest, ContentPlanResponse
)


from generated_proto.content_pb2_grpc import ContentServiceServicer, add_ContentServiceServicer_to_server
from generated_proto.content_pb2 import (
    AnalyzeTelegramChannelRequest,
    AnalyzeTelegramChannelResponse,
    GeneratePostFromTelegramPostsRequest,
    GeneratePostFromTelegramPostsResponse,
    GenerateBusinessPostRequest,
    GenerateBusinessPostResponse,
    GenerateContentPlanRequest,
    GenerateContentPlanResponse,
    GetContentPlanRequest,
    GetContentPlanResponse,
    TelegramPost,
    SelectedPost,
    PostGoal,
    BusinessInfo,
    ContentPlanItem,
)
from logging import getLogger
import logging
logging.basicConfig(level=logging.DEBUG)
logger = getLogger(__name__)


class Contentervicer(ContentServiceServicer):

    def __init__(self):
        self.session = get_session()
        # Инициализируем LLM клиент
        if settings.ml.mock:
            self.llm_client = MockLLMClient()
            logger.warning("ML_MOCK включён: используется MockLLMClient")
            return
        try:
            self.llm_client = OpenRouterClient(
                api_key=settings.ml.openrouter_api_key,
                model=settings.ml.openrouter_model
            )
            logger.info("LLM клиент успешно инициализирован")
        except Exception as e:
            logger.error(f"Ошибка инициализации LLM клиента: {str(e)}")
            self.llm_client = None

    def AnalyzeTelegramChannel(self, request: AnalyzeTelegramChannelRequest, context):
        try:
            current_user = JWT.verify_token(request.access_token, context)
            logger.debug(f"Анализ канала {request.channel_username} для пользователя {current_user.username}")
        except Exception:
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный или отсутствующий токен")
            return AnalyzeTelegramChannelResponse()

        # Проверяем параметры
        if not request.channel_username:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("Не указано имя канала")
            return AnalyzeTelegramChannelResponse()

        # Проверяем период времени
        if request.start_date >= request.end_date:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("Неверный период времени: start_date должен быть меньше end_date")
            return AnalyzeTelegramChannelResponse()

        try:
            # Конвертируем unix timestamp в datetime
            start_date = datetime.fromtimestamp(request.start_date, tz=timezone.utc)
            end_date = datetime.fromtimestamp(request.end_date, tz=timezone.utc)

            # Убираем @ если есть
            channel_username = request.channel_username.lstrip('@')

            logger.info(f"Анализ канала {channel_username} с {start_date} по {end_date}")

            # Запускаем async функцию для получения постов за указанный период
            analyzer = create_channel_analyzer()
            posts = asyncio.run(analyzer.get_channel_posts(channel_username, start_date, end_date, limit=100))

            if not posts:
                logger.warning(f"Не найдено постов в канале {channel_username} за указанный период")
                context.set_code(StatusCode.NOT_FOUND)
                context.set_details("В канале не найдено постов за указанный период")
                return AnalyzeTelegramChannelResponse()

            # Получаем топ 5 популярных постов
            popular_posts = analyzer.get_popular_posts(posts, limit=5)

            # Конвертируем в proto формат
            telegram_posts = []
            for message_id, text, views, date in popular_posts:
                telegram_posts.append(
                    TelegramPost(
                        message_id=message_id,
                        text=text,
                        views=views,
                        date=int(date.timestamp())
                    )
                )

            logger.info(f"Найдено {len(telegram_posts)} популярных постов из канала {channel_username}")

            return AnalyzeTelegramChannelResponse(
                popular_posts=telegram_posts,
                message=f"Найдено {len(telegram_posts)} популярных постов"
            )

        except Exception as e:
            logger.error(f"Ошибка анализа канала: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Ошибка анализа канала: {str(e)}")
            return AnalyzeTelegramChannelResponse()

    def GeneratePostFromTelegramPosts(self, request: GeneratePostFromTelegramPostsRequest, context):
        try:
            current_user = JWT.verify_token(request.access_token, context)
            logger.debug(f"Генерация поста для пользователя {current_user.username}")
        except Exception:
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный или отсутствующий токен")
            return GeneratePostFromTelegramPostsResponse()

        # Проверяем параметры
        if not request.selected_posts:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("Не выбраны посты для генерации")
            return GeneratePostFromTelegramPostsResponse()

        if not request.business_info:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("Информация о бизнесе обязательна")
            return GeneratePostFromTelegramPostsResponse()

        if not self.llm_client:
            context.set_code(StatusCode.INTERNAL)
            context.set_details("LLM клиент не инициализирован")
            return GeneratePostFromTelegramPostsResponse()

        try:
            logger.info(f"Генерация поста на основе {len(request.selected_posts)} выбранных постов")
            
            # Конвертируем SelectedPost в MLTelegramPost
            ml_telegram_posts = []
            for post in request.selected_posts:
                # Используем текущую дату, так как в SelectedPost нет даты
                ml_telegram_posts.append(
                    MLTelegramPost(
                        id=str(post.message_id),
                        text=post.text,
                        views=post.views,
                        date=datetime.now(timezone.utc),
                        link=None
                    )
                )
            
            # Конвертируем BusinessInfo в BusinessProfile
            business_info = request.business_info
            business_profile = BusinessProfile(
                id=business_info.id,
                name=business_info.name,
                industry=business_info.industry,
                description=business_info.description,
                region=business_info.region if business_info.region else None,
                audience_description=business_info.audience_reach if business_info.audience_reach else None,
                current_reach=None,  # Нет в BusinessInfo
                tone=MLTone.professional  # Используем дефолтный тон
            )
            
            # Генерируем пост через ML модуль
            # Используем дефолтные значения для goal и platform
            logger.info(f"🚀 [Content Service] Starting ML generation: "
                       f"posts_count={len(ml_telegram_posts)}, "
                       f"business={business_profile.name}")
            generated_posts = generate_posts_from_selected_telegram_posts(
                llm=self.llm_client,
                business=business_profile,
                selected_posts=ml_telegram_posts,
                goal=MLPostGoal.increase_engagement,  # Дефолтная цель
                platform=MLPlatform.telegram,
                num_new_posts=1  # Генерируем один пост
            )
            logger.info(f"✅ [Content Service] ML generation completed: posts_count={len(generated_posts)}")
            
            if not generated_posts:
                context.set_code(StatusCode.INTERNAL)
                context.set_details("Не удалось сгенерировать пост")
                return GeneratePostFromTelegramPostsResponse()
            
            generated_post = generated_posts[0]
            post_text = generated_post.body
            if generated_post.title:
                post_text = f"{generated_post.title}\n\n{post_text}"
            
            # Подготавливаем данные о выбранных постах для сохранения
            source_data = {
                "selected_posts": [
                    {
                        "message_id": post.message_id,
                        "text": post.text,
                        "views": post.views
                    }
                    for post in request.selected_posts
                ],
                "total_posts": len(request.selected_posts),
                "total_views": sum(post.views for post in request.selected_posts),
                "generated_post": {
                    "title": generated_post.title,
                    "body": generated_post.body,
                    "suggested_hashtags": generated_post.suggested_hashtags,
                    "suggested_image_prompt": generated_post.suggested_image_prompt
                }
            }
            
            # Конвертируем business_id из строки в UUID
            business_uuid = uuid.UUID(business_info.id) if business_info.id else None
            
            # Сохраняем пост в БД
            post_id = add_generated_post_to_db(
                session=self.session,
                user_id=current_user.id,
                post_text=post_text,
                post_type=PostType.TELEGRAM_GENERATED,
                platform="Telegram",
                business_id=business_uuid,
                goal=PostGoal.INCREASE_ENGAGEMENT,
                tone=None,
                description=None,
                source_data=source_data
            )
            
            logger.info(f"Пост сгенерирован и сохранен в БД (ID: {post_id}) для пользователя {current_user.username}")

            return GeneratePostFromTelegramPostsResponse(
                generated_post=post_text,
                message=f"Пост успешно сгенерирован и сохранен (ID: {post_id})"
            )

        except ValueError as e:
            logger.error(f"Ошибка валидации данных: {str(e)}")
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details(f"Ошибка валидации данных: {str(e)}")
            return GeneratePostFromTelegramPostsResponse()
        except RuntimeError as e:
            logger.error(f"Ошибка API LLM: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Ошибка генерации поста через LLM: {str(e)}")
            return GeneratePostFromTelegramPostsResponse()
        except Exception as e:
            logger.error(f"Ошибка генерации поста: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Ошибка генерации поста: {str(e)}")
            return GeneratePostFromTelegramPostsResponse()

    def GenerateBusinessPost(self, request: GenerateBusinessPostRequest, context):
        try:
            current_user = JWT.verify_token(request.access_token, context)
            logger.debug(f"Генерация поста для бизнеса пользователя {current_user.username}")
        except Exception:
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный или отсутствующий токен")
            return GenerateBusinessPostResponse()

        # Проверяем обязательные параметры
        if not request.description:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("Описание поста обязательно")
            return GenerateBusinessPostResponse()

        if not request.business_info:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("Информация о бизнесе обязательна")
            return GenerateBusinessPostResponse()

        if not self.llm_client:
            context.set_code(StatusCode.INTERNAL)
            context.set_details("LLM клиент не инициализирован")
            return GenerateBusinessPostResponse()

        try:
            business = request.business_info
            
            logger.info(f"Генерация поста для бизнеса: {business.name}")
            logger.debug(f"Параметры генерации: цель={request.goal}, тон={request.tone or 'не указан'}")
            logger.debug(f"Информация о бизнесе: {business.name}, {business.industry}, стиль: {business.communication_style}")
            
            # Конвертируем PostGoal enum из proto в ML PostGoal
            goal_mapping = {
                0: MLPostGoal.increase_sales,
                1: MLPostGoal.increase_engagement,
                2: MLPostGoal.increase_awareness,
                3: MLPostGoal.other
            }
            ml_goal = goal_mapping.get(request.goal, MLPostGoal.increase_engagement)
            
            # Конвертируем tone строку в ML Tone enum (если указан)
            ml_tone_override = None
            if request.tone:
                try:
                    ml_tone_override = MLTone(request.tone.lower())
                except ValueError:
                    logger.warning(f"Неизвестный тон '{request.tone}', используем дефолтный")
            
            # Конвертируем BusinessInfo в BusinessProfile
            # Определяем tone из communication_style или используем дефолтный
            business_tone = MLTone.professional
            if business.communication_style:
                try:
                    business_tone = MLTone(business.communication_style.lower())
                except ValueError:
                    pass
            
            business_profile = BusinessProfile(
                id=business.id,
                name=business.name,
                industry=business.industry,
                description=business.description,
                region=business.region if business.region else None,
                audience_description=business.audience_reach if business.audience_reach else None,
                current_reach=None,  # Нет в BusinessInfo
                tone=business_tone
            )
            
            # Создаем запрос для генерации поста
            generation_request = SinglePostGenerationRequest(
                business=business_profile,
                goal=ml_goal,
                platform=MLPlatform.telegram,
                description=request.description,
                tone_override=ml_tone_override,
                max_length_chars=None
            )
            
            # Генерируем пост через ML модуль
            response = generate_single_post(
                llm=self.llm_client,
                req=generation_request,
                max_tokens=800,
                temperature=0.7
            )
            
            generated_post_obj = response.post
            post_text = generated_post_obj.body
            if generated_post_obj.title:
                post_text = f"{generated_post_obj.title}\n\n{post_text}"
            
            # Конвертируем goal enum для сохранения в БД
            goal_enum = None
            if request.goal == 0:
                goal_enum = PostGoal.INCREASE_SALES
            elif request.goal == 1:
                goal_enum = PostGoal.INCREASE_ENGAGEMENT
            elif request.goal == 2:
                goal_enum = PostGoal.AWARENESS
            elif request.goal == 3:
                goal_enum = PostGoal.OTHER
            
            # Подготавливаем данные о бизнесе для сохранения
            source_data = {
                "business": {
                    "id": business.id,
                    "name": business.name,
                    "industry": business.industry,
                    "description": business.description,
                    "communication_style": business.communication_style,
                    "audience_reach": business.audience_reach if business.audience_reach else None,
                    "region": business.region if business.region else None
                },
                "generated_post": {
                    "title": generated_post_obj.title,
                    "body": generated_post_obj.body,
                    "suggested_hashtags": generated_post_obj.suggested_hashtags,
                    "suggested_image_prompt": generated_post_obj.suggested_image_prompt
                }
            }
            
            # Конвертируем business_id из строки в UUID
            business_uuid = uuid.UUID(business.id) if business.id else None
            
            # Получаем tone (опциональное поле)
            tone_value = request.tone if request.tone else None
            
            # Сохраняем пост в БД
            post_id = add_generated_post_to_db(
                session=self.session,
                user_id=current_user.id,
                post_text=post_text,
                post_type=PostType.BUSINESS_GENERATED,
                platform="Telegram",
                business_id=business_uuid,
                goal=goal_enum,
                tone=tone_value,
                description=request.description,
                source_data=source_data
            )
            
            logger.info(f"Пост сгенерирован и сохранен в БД (ID: {post_id}) для бизнеса {business.name} пользователя {current_user.username}")

            return GenerateBusinessPostResponse(
                generated_post=post_text,
                message=f"Пост успешно сгенерирован и сохранен (ID: {post_id})"
            )

        except ValueError as e:
            logger.error(f"Ошибка валидации данных: {str(e)}")
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details(f"Ошибка валидации данных: {str(e)}")
            return GenerateBusinessPostResponse()
        except RuntimeError as e:
            logger.error(f"Ошибка API LLM: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Ошибка генерации поста через LLM: {str(e)}")
            return GenerateBusinessPostResponse()
        except Exception as e:
            logger.error(f"Ошибка генерации поста для бизнеса: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Ошибка генерации поста: {str(e)}")
            return GenerateBusinessPostResponse()

    def GenerateContentPlan(self, request: GenerateContentPlanRequest, context):
        try:
            current_user = JWT.verify_token(request.access_token, context)
            logger.debug(f"Генерация контент-плана для пользователя {current_user.username}")
        except Exception:
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный или отсутствующий токен")
            return GenerateContentPlanResponse()

        # Проверяем обязательные параметры
        if not request.business_info:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("Информация о бизнесе обязательна")
            return GenerateContentPlanResponse()

        if request.total_posts <= 0:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("Количество постов должно быть больше 0")
            return GenerateContentPlanResponse()

        if request.period_days <= 0:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("Период в днях должен быть больше 0")
            return GenerateContentPlanResponse()

        if not self.llm_client:
            context.set_code(StatusCode.INTERNAL)
            context.set_details("LLM клиент не инициализирован")
            return GenerateContentPlanResponse()

        try:
            business = request.business_info
            
            logger.info(f"Генерация контент-плана для бизнеса: {business.name}")
            logger.debug(f"Параметры генерации: цель={request.goal}, количество постов={request.total_posts}, период={request.period_days} дней")
            
            # Конвертируем PostGoal enum из proto в ML PostGoal
            goal_mapping = {
                0: MLPostGoal.increase_sales,
                1: MLPostGoal.increase_engagement,
                2: MLPostGoal.increase_awareness,
                3: MLPostGoal.other
            }
            ml_goal = goal_mapping.get(request.goal, MLPostGoal.increase_engagement)
            
            # Конвертируем BusinessInfo в BusinessProfile
            business_tone = MLTone.professional
            if business.communication_style:
                try:
                    business_tone = MLTone(business.communication_style.lower())
                except ValueError:
                    pass
            
            business_profile = BusinessProfile(
                id=business.id,
                name=business.name,
                industry=business.industry,
                description=business.description,
                region=business.region if business.region else None,
                audience_description=business.audience_reach if business.audience_reach else None,
                current_reach=None,
                tone=business_tone
            )
            
            # Создаем запрос для генерации контент-плана
            plan_request = ContentPlanRequest(
                business=business_profile,
                goal=ml_goal,
                platform=MLPlatform.telegram,
                total_posts=request.total_posts,
                period_days=request.period_days,
                description=request.description if request.description else None
            )
            
            # Генерируем контент-план через ML модуль
            # max_tokens увеличен для поддержки большого количества постов
            response = generate_content_plan(
                llm=self.llm_client,
                req=plan_request,
                max_tokens=1200,
                temperature=0.6
            )
            
            # Конвертируем ContentPlanItem из ML схемы в proto формат и готовим для БД
            proto_items = []
            db_items = []  # Для сохранения в БД
            for item in response.items:
                # Конвертируем goal обратно в proto enum
                goal_proto = PostGoal.INCREASE_ENGAGEMENT
                if item.goal == MLPostGoal.increase_sales:
                    goal_proto = PostGoal.INCREASE_SALES
                elif item.goal == MLPostGoal.increase_engagement:
                    goal_proto = PostGoal.INCREASE_ENGAGEMENT
                elif item.goal == MLPostGoal.increase_awareness:
                    goal_proto = PostGoal.AWARENESS
                elif item.goal == MLPostGoal.other:
                    goal_proto = PostGoal.OTHER
                
                proto_item = ContentPlanItem(
                    title=item.title,
                    idea=item.idea,
                    format=item.format,
                    goal=goal_proto,
                    planned_date=None  # Бэкенд может заполнить позже
                )
                proto_items.append(proto_item)
                
                # Подготавливаем данные для БД
                # Конвертируем goal_proto в число для сохранения в JSON
                goal_value = int(goal_proto) if hasattr(goal_proto, '__int__') else goal_proto
                db_items.append({
                    "title": item.title,
                    "idea": item.idea,
                    "format": item.format,
                    "goal": goal_value,  # Сохраняем как число
                    "planned_date": None
                })
            
            # Конвертируем business_id из строки в UUID
            business_uuid = uuid.UUID(business.id) if business.id else None
            
            # Конвертируем goal enum для сохранения в БД
            goal_enum = None
            if request.goal == 0:
                goal_enum = PostGoal.INCREASE_SALES
            elif request.goal == 1:
                goal_enum = PostGoal.INCREASE_ENGAGEMENT
            elif request.goal == 2:
                goal_enum = PostGoal.AWARENESS
            elif request.goal == 3:
                goal_enum = PostGoal.OTHER
            
            # Сохраняем контент-план в БД
            plan_id = add_content_plan_to_db(
                session=self.session,
                user_id=current_user.id,
                items=db_items,
                goal=goal_enum,
                total_posts=request.total_posts,
                period_days=request.period_days,
                business_id=business_uuid,
                description=request.description if request.description else None
            )
            
            logger.info(f"Контент-план сгенерирован и сохранен в БД (ID: {plan_id}): {len(proto_items)} идей для бизнеса {business.name}")
            
            return GenerateContentPlanResponse(
                items=proto_items,
                message=f"Контент-план успешно сгенерирован и сохранен (ID: {plan_id}): {len(proto_items)} идей",
                plan_id=str(plan_id)
            )

        except ValueError as e:
            logger.error(f"Ошибка валидации данных: {str(e)}")
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details(f"Ошибка валидации данных: {str(e)}")
            return GenerateContentPlanResponse()
        except RuntimeError as e:
            logger.error(f"Ошибка API LLM: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Ошибка генерации контент-плана через LLM: {str(e)}")
            return GenerateContentPlanResponse()
        except Exception as e:
            logger.error(f"Ошибка генерации контент-плана: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Ошибка генерации контент-плана: {str(e)}")
            return GenerateContentPlanResponse()

    def GetContentPlan(self, request: GetContentPlanRequest, context):
        try:
            current_user = JWT.verify_token(request.access_token, context)
            logger.debug(f"Получение контент-плана {request.plan_id} для пользователя {current_user.username}")
        except Exception:
            context.set_code(StatusCode.UNAUTHENTICATED)
            context.set_details("Неверный или отсутствующий токен")
            return GetContentPlanResponse()

        # Проверяем параметры
        if not request.plan_id:
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details("ID контент-плана обязателен")
            return GetContentPlanResponse()

        try:
            # Конвертируем plan_id из строки в UUID
            plan_uuid = uuid.UUID(request.plan_id)
            
            # Получаем контент-план из БД
            content_plan = get_content_plan_by_id(
                session=self.session,
                plan_id=plan_uuid,
                user_id=current_user.id
            )
            
            if not content_plan:
                context.set_code(StatusCode.NOT_FOUND)
                context.set_details("Контент-план не найден или не принадлежит пользователю")
                return GetContentPlanResponse()
            
            # Конвертируем goal из строки в enum
            goal_enum = PostGoal.INCREASE_ENGAGEMENT
            goal_str = content_plan.goal
            if goal_str == "increase_sales":
                goal_enum = PostGoal.INCREASE_SALES
            elif goal_str == "increase_engagement":
                goal_enum = PostGoal.INCREASE_ENGAGEMENT
            elif goal_str == "awareness":
                goal_enum = PostGoal.AWARENESS
            elif goal_str == "other":
                goal_enum = PostGoal.OTHER
            
            # Конвертируем items из JSON в proto формат
            proto_items = []
            for item in content_plan.items:
                # Конвертируем goal из строки/числа в enum
                item_goal = PostGoal.INCREASE_ENGAGEMENT
                goal_value = item.get("goal")
                
                # Обрабатываем разные типы goal_value
                if goal_value is None:
                    item_goal = PostGoal.INCREASE_ENGAGEMENT
                elif isinstance(goal_value, int):
                    # Если это число, конвертируем в PostGoal enum
                    try:
                        item_goal = PostGoal(goal_value)
                    except (ValueError, TypeError):
                        # Если число не соответствует enum, используем дефолт
                        item_goal = PostGoal.INCREASE_ENGAGEMENT
                elif isinstance(goal_value, str):
                    # Если это строка, конвертируем в PostGoal enum
                    if goal_value == "increase_sales" or goal_value == "0":
                        item_goal = PostGoal.INCREASE_SALES
                    elif goal_value == "increase_engagement" or goal_value == "1":
                        item_goal = PostGoal.INCREASE_ENGAGEMENT
                    elif goal_value == "awareness" or goal_value == "2":
                        item_goal = PostGoal.AWARENESS
                    elif goal_value == "other" or goal_value == "3":
                        item_goal = PostGoal.OTHER
                else:
                    # Если это другой тип (например, PostGoal enum объект), пытаемся конвертировать
                    try:
                        if hasattr(goal_value, '__int__'):
                            item_goal = PostGoal(int(goal_value))
                        else:
                            item_goal = PostGoal.INCREASE_ENGAGEMENT
                    except (ValueError, TypeError, AttributeError):
                        item_goal = PostGoal.INCREASE_ENGAGEMENT
                
                planned_date_value = item.get("planned_date")
                planned_date = None
                if planned_date_value is not None:
                    if isinstance(planned_date_value, (int, float)):
                        planned_date = int(planned_date_value)
                    elif isinstance(planned_date_value, str):
                        try:
                            planned_date = int(planned_date_value)
                        except ValueError:
                            planned_date = None
                
                proto_item = ContentPlanItem(
                    title=item["title"],
                    idea=item["idea"],
                    format=item["format"],
                    goal=item_goal,
                    planned_date=planned_date
                )
                proto_items.append(proto_item)
            
            logger.info(f"Контент-план {request.plan_id} успешно получен для пользователя {current_user.username}")
            
            return GetContentPlanResponse(
                plan_id=str(content_plan.id),
                user_id=str(content_plan.user_id),
                business_id=str(content_plan.business_id) if content_plan.business_id else None,
                goal=goal_enum,
                total_posts=content_plan.total_posts,
                period_days=content_plan.period_days,
                description=content_plan.description if content_plan.description else None,
                items=proto_items,
                created_at=int(content_plan.created_at.timestamp()),
                updated_at=int(content_plan.updated_at.timestamp()) if content_plan.updated_at else None,
                message="Контент-план успешно получен"
            )

        except ValueError as e:
            logger.error(f"Ошибка валидации данных: {str(e)}")
            context.set_code(StatusCode.INVALID_ARGUMENT)
            context.set_details(f"Неверный формат ID контент-плана: {str(e)}")
            return GetContentPlanResponse()
        except Exception as e:
            logger.error(f"Ошибка получения контент-плана: {str(e)}")
            context.set_code(StatusCode.INTERNAL)
            context.set_details(f"Ошибка получения контент-плана: {str(e)}")
            return GetContentPlanResponse()


def serve():
    s3_storage.ensure_bucket("posts-files")

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    add_ContentServiceServicer_to_server(Contentervicer(), server)
    server.add_insecure_port("0.0.0.0:50051")
    print("content service start")
    server.start()
    print("content service start")
    server.wait_for_termination()

if __name__ == '__main__':
    serve()