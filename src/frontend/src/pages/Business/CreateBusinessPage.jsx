import React, { useState, useEffect } from 'react';
import './CreateBusinessPage.css';
import { ArrowLeft, Upload, CheckCircle, Loader } from 'lucide-react';

const CreateBusinessPage = ({ 
  onBack, 
  onCreateBusiness, 
  loading, 
  error, 
  successMessage,
  onClearMessages 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    audienceReach: '',
    region: '',
    description: '',
    communicationStyle: '',
    logo: null,
    logoPreview: null
  });

  const [localError, setLocalError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Получаем текущего пользователя при загрузке
  useEffect(() => {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  const industries = [
    'Технологии',
    'Еда и рестораны',
    'Розничная торговля',
    'Образование',
    'Здоровье и красота',
    'Недвижимость',
    'Финансы',
    'Маркетинг и реклама',
    'Развлечения',
    'Спорт и фитнес',
    'Мода и стиль',
    'Автомобили',
    'Строительство',
    'Туризм и путешествия',
    'Другое'
  ];

  const communicationStyles = [
    { id: 'formal', label: 'Формальный', description: 'Строгий, официальный стиль' },
    { id: 'friendly', label: 'Дружелюбный', description: 'Неформальный, разговорный стиль' },
    { id: 'professional', label: 'Профессиональный', description: 'Сбалансированный деловой стиль' }
  ];

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setLocalError('Размер файла не должен превышать 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          logo: file,
          logoPreview: reader.result // Сохраняем base64 строку
        }));
      };
      reader.onerror = () => {
        setLocalError('Ошибка при чтении файла');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    onClearMessages?.();
    setLocalError('');

    console.log('🔍 [CreateBusinessPage] Form submit started');
    console.log('🔍 [CreateBusinessPage] Current user:', currentUser);
    console.log('🔍 [CreateBusinessPage] Form data:', formData);

    // Валидация
    if (!formData.name.trim()) {
      setLocalError('Введите название бизнеса');
      return;
    }

    if (!formData.industry) {
      setLocalError('Выберите сферу деятельности');
      return;
    }

    if (!formData.description.trim()) {
      setLocalError('Введите описание бизнеса');
      return;
    }

    if (formData.description.length > 500) {
      setLocalError('Описание не должно превышать 500 символов');
      return;
    }

    if (!formData.communicationStyle) {
      setLocalError('Выберите стиль коммуникации');
      return;
    }

    // Проверяем токен авторизации (API работает через токен, а не через user.id)
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      console.error('❌ [CreateBusinessPage] No access token found');
      setLocalError('Пользователь не авторизован. Пожалуйста, войдите заново.');
      return;
    }

    console.log('✅ [CreateBusinessPage] Validation passed, preparing business data');

    // Создаем объект бизнеса
    const businessData = {
      name: formData.name.trim(),
      industry: formData.industry,
      reach: formData.audienceReach || '',
      audienceReach: formData.audienceReach || '',
      region: formData.region || '',
      description: formData.description.trim(),
      communicationStyle: formData.communicationStyle,
      logo: formData.logoPreview || null, // Сохраняем base64 логотипа
    };

    console.log('📤 [CreateBusinessPage] Calling onCreateBusiness with data:', {
      ...businessData,
      logo: businessData.logo ? `[base64 length: ${businessData.logo.length}]` : null
    });

    try {
      const result = await onCreateBusiness(businessData);
      console.log('✅ [CreateBusinessPage] onCreateBusiness result:', result);
    } catch (err) {
      console.error('❌ [CreateBusinessPage] Error creating business:', err);
      setLocalError(err.message || 'Ошибка при создании бизнеса');
    }
  };

  // Функция для генерации уникального ID бизнеса
  const generateBusinessId = () => {
    return `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Ограничение длины для description
    if (name === 'description' && value.length > 500) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (localError) setLocalError('');
  };

  // Функция для получения бизнесов пользователя
  const getUserBusinesses = () => {
    if (!currentUser?.id) return [];
    
    const businesses = localStorage.getItem(`businesses_${currentUser.id}`);
    return businesses ? JSON.parse(businesses) : [];
  };

  return (
    <div className="create-business-page">
      <div className="create-business-container">
        <button 
          onClick={onBack} 
          className="back-button"
          disabled={loading}
        >
          <ArrowLeft size={20} />
          Назад к дашборду
        </button>

        <div className="create-business-card">
          <div className="create-business-header">
            <div className="create-business-icon">
              <CheckCircle size={32} />
            </div>
            <h1>Создание нового бизнеса</h1>
            <p className="create-business-subtitle">
              Заполните информацию о вашем бизнесе для персонализации контента
            </p>
          </div>

          {/* Сообщения */}
          {(error || localError) && (
            <div className="create-business-error">
              <span>{error || localError}</span>
              <button onClick={() => { setLocalError(''); onClearMessages?.(); }} className="error-close">×</button>
            </div>
          )}

          {successMessage && (
            <div className="create-business-success">
              <CheckCircle size={16} />
              <span>{successMessage}</span>
              <button onClick={onClearMessages} className="success-close">×</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="create-business-form">
            {/* Логотип */}
            <div className="form-group">
              <label className="form-label">Логотип компании (опционально)</label>
              <div className="logo-upload">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="logo-input"
                  disabled={loading}
                />
                <label htmlFor="logo-upload" className="logo-upload-label">
                  {formData.logoPreview ? (
                    <div className="logo-preview">
                      <img src={formData.logoPreview} alt="Превью логотипа" />
                      <div className="logo-overlay">
                        <Upload size={24} />
                        <span>Изменить</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} />
                      <span className='download'>Загрузите логотип</span>
                      <span className="upload-hint">PNG, JPG, SVG до 5MB</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Основная информация */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Название бизнеса <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Введите название вашего бизнеса"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                  disabled={loading}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Сфера деятельности <span className="required">*</span>
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                  disabled={loading}
                >
                  <option value="">Выберите сферу деятельности</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Дополнительная информация */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Охват аудитории (опционально)
                </label>
                <input
                  type="text"
                  name="audienceReach"
                  placeholder="Например: 10,000 подписчиков"
                  value={formData.audienceReach}
                  onChange={handleInputChange}
                  className="input-field"
                  disabled={loading}
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Регион (опционально)
                </label>
                <input
                  type="text"
                  name="region"
                  placeholder="Например: Москва, Россия"
                  value={formData.region}
                  onChange={handleInputChange}
                  className="input-field"
                  disabled={loading}
                  maxLength={100}
                />
              </div>
            </div>

            {/* Описание */}
            <div className="form-group">
              <label className="form-label">
                Описание бизнеса <span className="required">*</span>
              </label>
              <textarea
                name="description"
                placeholder="Опишите ваш бизнес, продукты или услуги, целевую аудиторию..."
                value={formData.description}
                onChange={handleInputChange}
                className="textarea-field"
                rows="4"
                required
                disabled={loading}
                maxLength={500}
              />
              <div className="character-count">
                {formData.description.length}/500 символов
              </div>
            </div>

            {/* Стиль коммуникации */}
            <div className="form-group">
              <label className="form-label">
                Стиль коммуникации <span className="required">*</span>
              </label>
              <div className="communication-styles">
                {communicationStyles.map((style) => (
                  <label key={style.id} className="style-option">
                    <input
                      type="radio"
                      name="communicationStyle"
                      value={style.id}
                      checked={formData.communicationStyle === style.id}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                    <div className="style-card">
                      <div className="style-header">
                        <div className="style-radio"></div>
                        <span className="style-label">{style.label}</span>
                      </div>
                      <p className="style-description">{style.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Кнопки */}
            <div className="form-actions">
              <button 
                type="button" 
                className="secondary-btn"
                onClick={onBack}
                disabled={loading}
              >
                Отмена
              </button>
              <button 
                type="submit" 
                className="primary-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader className="spinner" size={20} />
                    Создание...
                  </>
                ) : (
                  'Создать бизнес'
                )}
              </button>
            </div>
          </form>

          <div className="create-business-footer">        
            {/* Отладочная информация */}
            {process.env.NODE_ENV === 'development' && currentUser && (
              <div className="debug-info">
                <p><strong>Текущий пользователь:</strong> {currentUser.name} (ID: {currentUser.id})</p>
                <p><strong>Бизнесов пользователя:</strong> {getUserBusinesses().length}</p>
                <p><strong>Email пользователя:</strong> {currentUser.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBusinessPage;