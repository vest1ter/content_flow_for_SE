import { API_CONFIG, getAuthHeaders, handleResponse } from './config';

export const businessService = {
  async createBusiness(businessData) {
    try {
      console.log('📤 [BusinessService] Creating business:', {
        url: API_CONFIG.getFullUrl('/business/create'),
        name: businessData.name,
        industry: businessData.industry,
        has_logo: !!businessData.logo
      });

      // Бэкенд ожидает JSON, а не FormData
      // Logo должен быть base64 строкой или пустой строкой
      const requestBody = {
        name: businessData.name,
        industry: businessData.industry,
        audience_reach: businessData.reach || businessData.audienceReach || '',
        region: businessData.region || '',
        description: businessData.description || '',
        logo: businessData.logo && businessData.logo.startsWith('data:image') 
          ? businessData.logo.split(',')[1] // Убираем префикс data:image/...
          : businessData.logo || '',
        communication_style: businessData.communicationStyle || 'professional'
      };

      console.log('📤 [BusinessService] Request body:', JSON.stringify({
        ...requestBody,
        logo: requestBody.logo ? `[base64 length: ${requestBody.logo.length}]` : ''
      }));

      const response = await fetch(
        API_CONFIG.getFullUrl('/business/create'),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody)
        }
      );
      
      console.log('📥 [BusinessService] Response status:', response.status);
      
      const data = await handleResponse(response);
      
      console.log('✅ [BusinessService] Business created successfully:', {
        business_id: data.business?.id,
        business_name: data.business?.name
      });
      
      return {
        success: true,
        data: {
          business: this.transformBusinessFromBackend(data.business)
        }
      };
    } catch (error) {
      console.error('❌ [BusinessService] Error creating business:', error);
      console.error('❌ [BusinessService] Error details:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
      throw new Error(error.data?.error || 'Ошибка создания бизнеса');
    }
  },

  async getBusinessById(businessId) {
    try {
      const response = await fetch(
        API_CONFIG.getFullUrl(`/business/get/${businessId}`),
        {
          method: 'GET',
          headers: getAuthHeaders()
        }
      );
      
      const data = await handleResponse(response);
      
      return {
        success: true,
        data: {
          business: this.transformBusinessFromBackend(data.business)
        }
      };
    } catch (error) {
      console.error('Ошибка получения бизнеса:', error);
      throw new Error(error.data?.error || 'Ошибка получения бизнеса');
    }
  },

  async updateBusiness(businessId, updates) {
    try {
      const updateData = {};
      
      // Преобразуем фронтендные названия полей в бэкендные
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.industry !== undefined) updateData.industry = updates.industry;
      if (updates.reach !== undefined) updateData.audience_reach = updates.reach;
      if (updates.region !== undefined) updateData.region = updates.region;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.communicationStyle !== undefined) updateData.communication_style = updates.communicationStyle;
      
      // Обрабатываем logo: если есть и начинается с data:image, убираем префикс
      if (updates.logo !== undefined) {
        if (updates.logo === '') {
          // Если пустая строка, не отправляем logo
          updateData.logo = '';
        } else if (updates.logo && updates.logo.startsWith('data:image')) {
          // Убираем префикс data:image/...;base64,
          const base64Part = updates.logo.split(',')[1] || updates.logo;
          updateData.logo = base64Part;
        } else if (updates.logo) {
          // Если уже чистый base64 без префикса
          updateData.logo = updates.logo;
        }
      }
      
      const response = await fetch(
        API_CONFIG.getFullUrl(`/business/update/${businessId}`),
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updateData)
        }
      );
      
      const data = await handleResponse(response);
      
      return {
        success: true,
        data: {
          business: this.transformBusinessFromBackend(data.business)
        }
      };
    } catch (error) {
      console.error('Ошибка обновления бизнеса:', error);
      throw new Error(error.data?.error || 'Ошибка обновления бизнеса');
    }
  },

  async deleteBusiness(businessId) {
    try {
      const response = await fetch(
        API_CONFIG.getFullUrl(`/business/delete/${businessId}`),
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );
      
      const data = await handleResponse(response);
      
      return {
        success: true,
        data: {
          success: data.success
        }
      };
    } catch (error) {
      console.error('Ошибка удаления бизнеса:', error);
      throw new Error(error.data?.error || 'Ошибка удаления бизнеса');
    }
  },

  async listBusinesses() {
    try {
      console.log('📤 [BusinessService] Loading businesses from API:', {
        url: API_CONFIG.getFullUrl('/business')
      });

      const response = await fetch(
        API_CONFIG.getFullUrl('/business'),
        {
          method: 'GET',
          headers: getAuthHeaders()
        }
      );
      
      console.log('📥 [BusinessService] Response status:', response.status);
      
      const data = await handleResponse(response);
      
      console.log('✅ [BusinessService] Businesses loaded successfully:', {
        count: data.businesses?.length || 0
      });
      
      const transformedBusinesses = (data.businesses || []).map(business => {
        const transformed = this.transformBusinessFromBackend(business);
        console.log('📋 [BusinessService] Transformed business:', {
          id: transformed?.id,
          name: transformed?.name,
          has_logo: !!transformed?.logo,
          logo_type: transformed?.logo?.startsWith('data:') ? 'base64' : transformed?.logo?.startsWith('http') ? 'url' : 'null',
          logo_preview: transformed?.logo ? transformed.logo.substring(0, 50) + '...' : 'none'
        });
        return transformed;
      });
      
      return {
        success: true,
        data: {
          businesses: transformedBusinesses
        }
      };
    } catch (error) {
      console.error('Ошибка получения списка бизнесов:', error);
      throw new Error(error.data?.error || 'Ошибка получения списка бизнесов');
    }
  },

  async setActiveBusiness(businessId) {
    try {
      const response = await fetch(
        API_CONFIG.getFullUrl(`/business/set/${businessId}`),
        {
          method: 'PUT',
          headers: getAuthHeaders()
        }
      );
      
      const data = await handleResponse(response);
      
      if (data.success && data.business) {
        localStorage.setItem('selected_business_id', businessId);
      }
      
      return {
        success: true,
        data: {
          success: data.success,
          business: data.business ? this.transformBusinessFromBackend(data.business) : null
        }
      };
    } catch (error) {
      console.error('Ошибка установки активного бизнеса:', error);
      throw new Error(error.data?.error || 'Ошибка установки активного бизнеса');
    }
  },

  async getActiveBusiness() {
    try {
      const response = await fetch(
        API_CONFIG.getFullUrl('/business/active'),
        {
          method: 'GET',
          headers: getAuthHeaders()
        }
      );
      
      const data = await handleResponse(response);
      
      if (data.business) {
        localStorage.setItem('selected_business_id', data.business.id);
      }
      
      return {
        success: true,
        data: {
          business: data.business ? this.transformBusinessFromBackend(data.business) : null
        }
      };
    } catch (error) {
      console.error('Ошибка получения активного бизнеса:', error);
      throw new Error(error.data?.error || 'Ошибка получения активного бизнеса');
    }
  },


  
  transformBusinessFromBackend(business) {
    if (!business) return null;
    
    // Приводим данные к формату фронтенда
    return {
      id: business.id,
      userId: business.user_id || business.UserID,
      name: business.name,
      industry: business.industry,
      audienceReach: business.audience_reach,
      reach: business.audience_reach,
      region: business.region,
      description: business.description,
      logoUrl: business.logo_url,
      logoBase64: business.logo_base64,
      // Формируем правильный logo: приоритет у base64, если его нет - используем URL
      logo: (() => {
        // ПРИОРИТЕТ 1: Если есть base64, используем его (это актуальные данные)
        if (business.logo_base64) {
          const base64Str = business.logo_base64.trim();
          
          // Проверяем, что base64 не пустой
          if (!base64Str) {
            console.warn('⚠️ [BusinessService] logo_base64 is empty string for business:', business.name);
            // Продолжаем проверку URL ниже
          } else {
            // Если base64 уже имеет префикс data:image, используем как есть
            if (base64Str.startsWith('data:image')) {
              console.log('📸 [BusinessService] Logo already has data: prefix, length:', base64Str.length);
              console.log('📸 [BusinessService] Logo preview (first 100 chars):', base64Str.substring(0, 100));
              return base64Str;
            }
            
            // Иначе добавляем префикс, определяя тип по сигнатуре base64
            let mimeType = 'image/png'; // По умолчанию PNG
            
            // Определяем тип по сигнатуре base64 (первые символы после декодирования)
            if (base64Str.startsWith('/9j/') || base64Str.startsWith('/9j')) {
              mimeType = 'image/jpeg';
            } else if (base64Str.startsWith('iVBORw0KGgo') || base64Str.startsWith('iVBOR')) {
              mimeType = 'image/png';
            } else if (base64Str.startsWith('R0lGODlh') || base64Str.startsWith('R0lGODdh')) {
              mimeType = 'image/gif';
            } else if (base64Str.startsWith('UklGR')) {
              mimeType = 'image/webp';
            }
            
            // Проверяем валидность base64 (только допустимые символы)
            // Base64 может содержать переносы строк, которые нужно удалить
            const cleanBase64 = base64Str.replace(/\s/g, ''); // Удаляем все пробелы и переносы строк
            
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            if (!base64Regex.test(cleanBase64)) {
              console.error('❌ [BusinessService] Invalid base64 string for business:', business.name);
              console.error('❌ [BusinessService] Base64 preview:', cleanBase64.substring(0, 50));
              console.error('❌ [BusinessService] Base64 length:', cleanBase64.length);
              // Продолжаем проверку URL ниже
            } else {
              // Проверяем, что base64 строка не слишком короткая (минимум должна быть длиной больше 10)
              if (cleanBase64.length < 10) {
                console.error('❌ [BusinessService] Base64 string too short for business:', business.name);
                // Продолжаем проверку URL ниже
              } else {
                const logoUrl = `data:${mimeType};base64,${cleanBase64}`;
                console.log('📸 [BusinessService] Formatted logo:', {
                  business_name: business.name,
                  original_length: base64Str.length,
                  cleaned_length: cleanBase64.length,
                  mime_type: mimeType,
                  prefix: cleanBase64.substring(0, 30),
                  full_url_prefix: logoUrl.substring(0, 50),
                  full_url_length: logoUrl.length,
                  // Проверяем первые байты декодированного base64 для PNG
                  decoded_preview: (() => {
                    try {
                      const decoded = atob(cleanBase64.substring(0, 8));
                      return Array.from(decoded).map(c => c.charCodeAt(0).toString(16)).join(' ');
                    } catch (e) {
                      return 'decode_error';
                    }
                  })()
                });
                
                // Тестируем, что base64 можно декодировать
                try {
                  const testDecode = atob(cleanBase64.substring(0, 16));
                  console.log('✅ [BusinessService] Base64 can be decoded, test decode OK');
                } catch (e) {
                  console.error('❌ [BusinessService] Cannot decode base64:', e);
                  // Если не можем декодировать, используем URL
                  if (business.logo_url) {
                    console.log('📸 [BusinessService] Using logo_url due to decode error');
                    return business.logo_url;
                  }
                }
                
                return logoUrl;
              }
            }
          }
        }
        
        // ПРИОРИТЕТ 2: Если нет base64 или он невалидный, но есть URL, используем его
        if (business.logo_url) {
          console.log('📸 [BusinessService] No base64 or invalid, using logo_url for business:', business.name);
          console.log('📸 [BusinessService] Logo URL:', business.logo_url);
          return business.logo_url;
        }
        
        console.log('📸 [BusinessService] No logo available for business:', business.name);
        return null;
      })(),
      communicationStyle: business.communication_style,
      isActive: business.is_active || business.IsActive,
      createdAt: business.created_at || business.CreatedAt,
      updatedAt: business.updated_at || business.UpdatedAt
    };
  }
};