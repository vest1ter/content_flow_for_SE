export const API_CONFIG = {
  BASE_URL: 'http://localhost:8080',
  API_VERSION: '/api/v1',
  
  getFullUrl(endpoint) {
    return `${this.BASE_URL}${this.API_VERSION}${endpoint}`;
  }
};

export const getAuthHeaders = (token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  const authToken = token || localStorage.getItem('access_token');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
};

export const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }
  return response.json();
};

// Функция для декодирования JWT токена (без верификации, только для чтения)
export const decodeJWT = (token) => {
  try {
    if (!token) return null;
    
    // Убираем префикс "Bearer " если есть
    const cleanToken = token.replace(/^Bearer\s+/, '');
    
    // JWT состоит из 3 частей, разделенных точками: header.payload.signature
    const parts = cleanToken.split('.');
    if (parts.length !== 3) return null;
    
    // Декодируем payload (вторая часть)
    const payload = parts[1];
    
    // Base64 декодирование (добавляем padding если нужно)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    
    try {
      const decoded = JSON.parse(atob(padded));
      return decoded;
    } catch (e) {
      console.error('Error decoding JWT payload:', e);
      return null;
    }
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

export const authStorage = {
  setSession(data) {
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      
      // Декодируем JWT токен для получения username
      const tokenPayload = decodeJWT(data.access_token);
      
      if (tokenPayload) {
        console.log('🔍 [AuthStorage] Decoded JWT token:', {
          id: tokenPayload.id,
          username: tokenPayload.username,
          token_type: tokenPayload.token_type
        });
        
        // Сохраняем данные пользователя из JWT
        const userData = {
          id: data.user?.id || tokenPayload.id || '',
          email: data.user?.email || data.user?.username || '',
          // Приоритет: name из data.user > username из JWT > username из data.user
          name: data.user?.name || tokenPayload.username || data.user?.username || ''
        };
        
        console.log('💾 [AuthStorage] Saving user data from JWT:', userData);
        localStorage.setItem('user_data', JSON.stringify(userData));
      } else if (data.user) {
        // Если JWT не декодировался, используем данные из data.user
        localStorage.setItem('user_data', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || data.user.username
        }));
      }
    }
    
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    localStorage.setItem('is_authenticated', 'true');
  },

  clearSession() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('is_authenticated');
    localStorage.removeItem('user_data');
    localStorage.removeItem('selected_business_id');
  },

  isAuthenticated() {
    return localStorage.getItem('is_authenticated') === 'true';
  },

  getAccessToken() {
    return localStorage.getItem('access_token');
  },

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  },

  getUserData() {
    // Сначала пытаемся получить из localStorage
    let userData = localStorage.getItem('user_data');
    let parsedData = userData ? JSON.parse(userData) : null;
    
    // Если данных нет или нет имени, пытаемся получить из JWT токена
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      const tokenPayload = decodeJWT(accessToken);
      
      if (tokenPayload && tokenPayload.username) {
        if (!parsedData || !parsedData.name || parsedData.name === 'Пользователь') {
          // Обновляем данные пользователя из JWT
          parsedData = {
            id: parsedData?.id || tokenPayload.id || '',
            email: parsedData?.email || '',
            name: tokenPayload.username
          };
          
          console.log('🔄 [AuthStorage] Updated user data from JWT:', parsedData);
          localStorage.setItem('user_data', JSON.stringify(parsedData));
        }
      }
    }
    
    return parsedData;
  }
};