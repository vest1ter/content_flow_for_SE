import { API_CONFIG, getAuthHeaders, handleResponse } from './config';

export const contentService = {
  // Генерация поста из Telegram постов
  async generatePostFromTelegram(businessId, selectedPosts) {
    try {
      console.log('📤 [ContentService] Generating post from Telegram posts:', {
        url: API_CONFIG.getFullUrl(`/content/generate_post_telegram/${businessId}`),
        businessId: businessId,
        postsCount: selectedPosts.length
      });

      const postsForBackend = selectedPosts.map(post => ({
        message_id: post.message_id || parseInt(post.id?.replace('post_', '') || '0') || 0,
        text: post.content || post.text || '',
        views: post.views || 0
      }));

      const requestBody = {
        selected_post: postsForBackend
      };

      console.log('📤 [ContentService] Request body:', JSON.stringify({
        ...requestBody,
        selected_post: requestBody.selected_post.map(p => ({
          ...p,
          text: p.text.substring(0, 50) + '...'
        }))
      }, null, 2));

      const response = await fetch(
        API_CONFIG.getFullUrl(`/content/generate_post_telegram/${businessId}`),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody)
        }
      );
      
      console.log('📥 [ContentService] Response status:', response.status);
      
      const data = await handleResponse(response);
      
      console.log('✅ [ContentService] Post from Telegram generated successfully:', {
        post_length: data.generated_post?.length || 0
      });
      
      return {
        success: true,
        data: {
          generated_post: data.generated_post || '',
          message: data.message || 'Контент успешно сгенерирован'
        }
      };
    } catch (error) {
      console.error('❌ [ContentService] Generate post from Telegram error:', error);
      console.error('❌ [ContentService] Error details:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
      throw new Error(error.data?.error || 'Ошибка генерации поста из Telegram');
    }
  },

  // Генерация бизнес-поста с учетом стиля коммуникации
  async generateBusinessPost(businessId, postData) {
    try {
      console.log('📤 [ContentService] Generating business post:', {
        url: API_CONFIG.getFullUrl(`/content/generate_post/${businessId}`),
        businessId: businessId,
        goal_input: postData.goal,
        description_length: postData.description?.length || 0
      });

      // Преобразуем goal в числовой формат (0 = INCREASE_SALES, 1 = INCREASE_ENGAGEMENT)
      let goal = 1; // по умолчанию
      if (typeof postData.goal === 'number') {
        goal = postData.goal;
      } else if (postData.goal === 0 || postData.goal === '0' || postData.goal === 'increase_sales') {
        goal = 0;
      } else {
        goal = 1; // increase_engagement
      }

      const requestBody = {
        description: postData.description || '',
        goal: goal,
        tone: postData.tone || ''
      };

      console.log('📤 [ContentService] Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(
        API_CONFIG.getFullUrl(`/content/generate_post/${businessId}`),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody)
        }
      );
      
      console.log('📥 [ContentService] Response status:', response.status);
      
      const data = await handleResponse(response);
      
      console.log('✅ [ContentService] Post generated successfully:', {
        post_length: data.generated_post?.length || 0
      });
      
      return {
        success: true,
        data: {
          generated_post: data.generated_post || '',
          message: data.message || 'Пост успешно сгенерирован'
        }
      };
    } catch (error) {
      console.error('❌ [ContentService] Generate business post error:', error);
      console.error('❌ [ContentService] Error details:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
      throw new Error(error.data?.error || 'Ошибка генерации бизнес-поста');
    }
  },

  // Генерация контент-плана
  async generateContentPlan(businessId, planData) {
    console.log('📤 [ContentService] Generating content plan:', {
      url: API_CONFIG.getFullUrl(`/content/generate_content_plan/${businessId}`),
      businessId: businessId,
      goal: planData.goal,
      totalPosts: planData.totalPosts,
      periodDays: planData.periodDays,
      description_length: planData.description?.length || 0
    });
    
    // Определяем goal для бэкенда (0 = INCREASE_SALES, 1 = INCREASE_ENGAGEMENT, 2 = AWARENESS)
    let goal = 1; // по умолчанию increase_engagement
    if (typeof planData.goal === 'number') {
      goal = planData.goal;
    } else if (planData.goal === 0 || planData.goal === '0' || planData.goal === 'increase_sales') {
      goal = 0;
    } else if (planData.goal === 2 || planData.goal === '2' || planData.goal === 'awareness') {
      goal = 2;
    } else {
      goal = 1; // increase_engagement
    }
    
    try {
      const requestBody = {
        goal: goal,
        total_posts: planData.totalPosts || planData.ideasCount || 7,
        period_days: planData.periodDays || planData.durationDays || 7,
        description: planData.description || ''
      };

      console.log('📤 [ContentService] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(
        API_CONFIG.getFullUrl(`/content/generate_content_plan/${businessId}`),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody)
        }
      );
      
      console.log('📥 [ContentService] Response status:', response.status);
      
      const data = await handleResponse(response);
      
      console.log('✅ [ContentService] Content plan generated successfully:', {
        items_count: data.content_plan_item?.length || 0,
        message: data.message
      });
      
      return {
        success: true,
        data: {
          content_plan_item: data.content_plan_item || [],
          message: data.message || 'Контент-план успешно сгенерирован'
        }
      };
    } catch (error) {
      console.error('❌ [ContentService] Generate content plan error:', error);
      console.error('❌ [ContentService] Error details:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
      throw new Error(error.data?.error || 'Ошибка генерации контент-плана');
    }
  },

  // Получение контент-плана
  async getContentPlan(planId) {
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await fetch(
        API_CONFIG.getFullUrl(`/content/plan/${planId}`),
        {
          method: 'POST',
          headers: getAuthHeaders(token)
        }
      );
      
      const data = await handleResponse(response);
      
      return {
        success: true,
        data: {
          plan_id: data.plan_id,
          user_id: data.user_id,
          business_id: data.bussines_id,
          goal: data.goal,
          total_posts: data.total_posts,
          period_days: data.period_days,
          description: data.desctiption,
          content_plan_item: data.content_plan_item || [],
          created_at: data.created_at,
          updated_at: data.updated_at,
          message: data.message
        }
      };
    } catch (error) {
      console.error('Ошибка получения контент-плана:', error);
      throw new Error(error.data?.error || 'Ошибка получения контент-плана');
    }
  }
};