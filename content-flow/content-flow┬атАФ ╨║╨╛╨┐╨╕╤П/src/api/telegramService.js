import { API_CONFIG, getAuthHeaders, handleResponse } from './config';

export const telegramService = {
  // Анализ Telegram канала
  async analyzeTelegramChannel(channelUsername, startDate, endDate) {
    try {
      // Преобразуем даты в Unix timestamp
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

      console.log('📤 [TelegramService] Analyzing Telegram channel:', {
        url: API_CONFIG.getFullUrl('/content/telegram_channel'),
        channelUsername: channelUsername,
        startDate: startTimestamp,
        endDate: endTimestamp,
        startDateISO: startDate,
        endDateISO: endDate
      });

      const url = `${API_CONFIG.getFullUrl('/content/telegram_channel')}?channel_username=${encodeURIComponent(channelUsername)}&start_date=${startTimestamp}&end_date=${endTimestamp}`;

      console.log('📤 [TelegramService] Full URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      console.log('📥 [TelegramService] Response status:', response.status);
      
      const data = await handleResponse(response);
      
      console.log('✅ [TelegramService] Channel analyzed successfully:', {
        posts_count: data.telegram_post?.length || 0
      });
      
      return {
        success: true,
        data: {
          telegram_post: (data.telegram_post || []).map(post => ({
            message_id: post.message_id,
            text: post.text,
            views: post.views,
            date: post.date,
            // Дополнительные поля для удобства
            id: `post_${post.message_id}`,
            content: post.text
          }))
        }
      };
    } catch (error) {
      console.error('❌ [TelegramService] Analyze Telegram channel error:', error);
      console.error('❌ [TelegramService] Error details:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
      throw new Error(error.data?.error || 'Ошибка анализа Telegram канала');
    }
  }
};
