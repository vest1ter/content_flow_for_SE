import { API_CONFIG, getAuthHeaders, handleResponse, authStorage } from './config';

export const authService = {
  async register(userData) {
    try {
      // Генерируем username из переданных данных
      const username = userData.username || userData.name || userData.email.split('@')[0];
      
      console.log('📤 [AuthService] Sending registration request:', {
        url: API_CONFIG.getFullUrl('/auth/register'),
        username: username,
        email: userData.email,
        has_username: !!userData.username,
        has_name: !!userData.name
      });

      const requestBody = {
        username: username,
        email: userData.email,
        password: userData.password
      };

      console.log('📤 [AuthService] Request body:', JSON.stringify({
        ...requestBody,
        password: '[HIDDEN]'
      }));

      const response = await fetch(API_CONFIG.getFullUrl('/auth/register'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });
      
      const data = await handleResponse(response);
      
      if (data.email_confirm_token) {
        localStorage.setItem('email_confirm_token', data.email_confirm_token);
        localStorage.setItem('pending_email', userData.email);
      }
      
      return {
        success: true,
        data: {
          confirmed: data.confirmed,
          email_confirm_token: data.email_confirm_token,
          email_message: data.email_message,
          user_message: data.user_message
        }
      };
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      throw new Error(error.data?.error || 'Ошибка регистрации');
    }
  },

  async confirmVerifyCode(emailToken, code) {
    try {
      // Проверяем и парсим код
      const codeStr = String(code || '').trim();
      console.log('🔍 [AuthService] Parsing code:', {
        original: code,
        type: typeof code,
        string_value: codeStr,
        length: codeStr.length
      });
      
      if (!codeStr || codeStr.length !== 6) {
        console.error('❌ [AuthService] Invalid code format:', codeStr);
        throw new Error('Код подтверждения должен содержать 6 цифр');
      }
      
      const codeNum = parseInt(codeStr, 10);
      if (isNaN(codeNum) || codeNum <= 0 || codeNum > 999999) {
        console.error('❌ [AuthService] Invalid code number:', codeNum);
        throw new Error('Некорректный код подтверждения');
      }
      
      console.log('📤 [AuthService] Sending confirm code request:', {
        url: API_CONFIG.getFullUrl('/auth/confirm'),
        code_string: codeStr,
        code_number: codeNum,
        email_token_prefix: emailToken ? emailToken.substring(0, 20) + '...' : 'missing'
      });

      const requestBody = {
        email_token: emailToken,
        code: codeNum
      };
      
      console.log('📤 [AuthService] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(API_CONFIG.getFullUrl('/auth/confirm'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });
      
      const data = await handleResponse(response);
      
      if (data.confirmed && data.access_token) {
        authStorage.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: {
            email: localStorage.getItem('pending_email') || data.email || '',
            username: data.username
          }
        });
        localStorage.removeItem('pending_email');
        localStorage.removeItem('email_confirm_token');
      }
      
      return {
        success: true,
        data: {
          confirmed: data.confirmed,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          message: data.message || data.user_message
        }
      };
    } catch (error) {
      console.error('Ошибка подтверждения кода:', error);
      throw new Error(error.data?.error || 'Ошибка подтверждения кода');
    }
  },

  async login(username, password) {
    try {
      const response = await fetch(API_CONFIG.getFullUrl('/auth/login'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: username,
          password: password
        })
      });
      
      const data = await handleResponse(response);
      
      if (response.status === 403) {
        if (data.email_confirm_token) {
          localStorage.setItem('email_confirm_token', data.email_confirm_token);
          localStorage.setItem('pending_email', username);
        }
        
        return {
          success: true,
          data: {
            confirmed: false,
            requiresEmailConfirmation: true,
            email_confirm_token: data.email_confirm_token,
            message: data.message || 'Требуется подтверждение email'
          }
        };
      }
      
      if (data.confirmed && data.access_token) {
        authStorage.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: {
            email: username,
            username: username
          }
        });
      }
      
      return {
        success: true,
        data: {
          confirmed: data.confirmed,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          email_confirm_token: data.email_confirm_token,
          message: data.message || data.user_message,
          requiresEmailConfirmation: !data.confirmed
        }
      };
    } catch (error) {
      console.error('Ошибка входа:', error);
      throw new Error(error.data?.error || 'Ошибка входа');
    }
  },

  async refreshToken() {
    const refreshToken = authStorage.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('Refresh token не найден');
    }
    
    try {
      const response = await fetch(API_CONFIG.getFullUrl('/auth/refresh'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });
      
      const data = await handleResponse(response);
      
      authStorage.setSession({
        access_token: data.access_token
      });
      
      return {
        success: true,
        data: {
          access_token: data.access_token,
          message: data.message
        }
      };
    } catch (error) {
      console.error('Ошибка обновления токена:', error);
      authStorage.clearSession();
      throw new Error(error.data?.error || 'Ошибка обновления токена');
    }
  },

  async sendPasswordResetCode(email) {
    try {
      console.log('📤 [AuthService] Отправка запроса на восстановление пароля для email:', email);
      
      // Для восстановления пароля Authorization header не требуется
      const response = await fetch(API_CONFIG.getFullUrl('/auth/send-password-reset'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email
        })
      });
      
      const data = await handleResponse(response);
      
      console.log('📥 [AuthService] Ответ от сервера:', {
        message: data.message,
        hasResetPassToken: !!data.reset_pass_token,
        resetPassTokenPrefix: data.reset_pass_token ? data.reset_pass_token.substring(0, 20) + '...' : 'отсутствует'
      });
      
      if (!data.reset_pass_token) {
        console.error('❌ [AuthService] Токен сброса пароля отсутствует в ответе сервера');
        throw new Error('Токен сброса пароля не получен от сервера');
      }
      
      return {
        success: true,
        data: {
          message: data.message || data.user_message,
          reset_pass_token: data.reset_pass_token
        }
      };
    } catch (error) {
      console.error('❌ [AuthService] Ошибка отправки кода сброса:', error);
      throw new Error(error.data?.error || error.message || 'Ошибка отправки кода сброса');
    }
  },

  async confirmPasswordResetCode(code, resetPassToken) {
    try {
      const codeStr = String(code || '').trim();
      if (!codeStr || codeStr.length !== 6) {
        throw new Error('Код должен состоять из 6 цифр');
      }
      
      const codeNum = parseInt(codeStr, 10);
      if (isNaN(codeNum)) {
        throw new Error('Неверный формат кода');
      }

      // Для подтверждения кода восстановления пароля Authorization header не требуется
      const response = await fetch(API_CONFIG.getFullUrl('/auth/confirm-password-reset'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: codeNum,
          reset_pass_token: resetPassToken
        })
      });
      
      const data = await handleResponse(response);
      
      return {
        success: true,
        data: {
          confirmed: data.confirmed || false,
          message: data.message || data.user_message
        }
      };
    } catch (error) {
      console.error('Ошибка подтверждения кода сброса:', error);
      throw new Error(error.data?.error || 'Ошибка подтверждения кода сброса');
    }
  },

  async resetPassword(resetPassToken, newPassword) {
    try {
      // Для установки нового пароля Authorization header не требуется - используется reset_pass_token
      const response = await fetch(API_CONFIG.getFullUrl('/auth/reset-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reset_pass_token: resetPassToken,
          new_password: newPassword
        })
      });
      
      const data = await handleResponse(response);
      
      return {
        success: true,
        data: {
          message: data.message || data.user_message,
          success: data.success || false
        }
      };
    } catch (error) {
      console.error('Ошибка сброса пароля:', error);
      throw new Error(error.data?.error || 'Ошибка сброса пароля');
    }
  },

  logout() {
    authStorage.clearSession();
    return {
      success: true,
      data: { message: 'Выход выполнен успешно' }
    };
  },

  isAuthenticated() {
    return authStorage.isAuthenticated();
  },

  getCurrentUser() {
    return authStorage.getUserData();
  }
};