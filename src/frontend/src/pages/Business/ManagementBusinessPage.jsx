import React, { useState, useEffect } from 'react';
import './ManagementPage.css';
import { businessService } from '../../api/businessService';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Building, 
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Calendar,
  Users,
  Sparkles,
  Target,
  Upload,
  Globe,
  MessageCircle
} from 'lucide-react';

const ManagementBusinessPage = ({ 
  onBack,
  onNavigate,
  user = null,
  businesses: propBusinesses = [],
  onBusinessesUpdate
}) => {
  const [businesses, setBusinesses] = useState(propBusinesses); 
  const [loading, setLoading] = useState(true);
  
  // Модальное окно подтверждения
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    industry: '',
    reach: '',
    region: '',
    description: '',
    communicationStyle: 'professional'
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [needsRefresh, setNeedsRefresh] = useState(false); // Добавлено для принудительного обновления

  // Загружаем бизнесы пользователя
  useEffect(() => {
      setBusinesses(propBusinesses);
  }, [propBusinesses]);

  const loadUserBusinesses = () => {
    setBusinesses(propBusinesses);
  };

  // Обработчик открытия профиля бизнеса
  const handleBusinessClick = (business) => {
    setSelectedBusiness(business);
    setEditForm({
      name: business.name,
      industry: business.industry,
      reach: business.reach || '',
      region: business.region || '',
      description: business.description || '',
      communicationStyle: business.communicationStyle || 'professional'
    });
    setLogoPreview(business.logo || null);
    setShowBusinessModal(true);
    setEditMode(false);
  };

  // Обработчик загрузки логотипа
  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Размер файла не должен превышать 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result); // Сохраняем base64 строку
      };
      reader.onerror = () => {
        alert('Ошибка при чтении файла');
      };
      reader.readAsDataURL(file);
    }
  };

  // Сохранение изменений бизнеса
  const handleSaveBusiness = async () => {
    if (!selectedBusiness) return;

    setLoading(true);
    try {
      // Используем API-сервис для обновления
      const result = await businessService.updateBusiness(
        selectedBusiness.id,
        {
          name: editForm.name,
          industry: editForm.industry,
          reach: editForm.reach,
          region: editForm.region,
          description: editForm.description,
          communicationStyle: editForm.communicationStyle,
          logo: logoPreview || selectedBusiness.logo,
        }
      );

      if (result.success && result.data.business) {
        const updatedBusiness = result.data.business;
        
        // Обновляем список бизнесов
        const updatedBusinesses = businesses.map(b => 
          b.id === selectedBusiness.id ? updatedBusiness : b
        );
        setBusinesses(updatedBusinesses);

        if (onBusinessesUpdate) {
          onBusinessesUpdate();
        }

        setEditMode(false);
        setSelectedBusiness(updatedBusiness);
        setLogoPreview(updatedBusiness.logo || null);
        setShowBusinessModal(false);
        
        alert('Изменения сохранены успешно!');
      } else {
        alert('Ошибка при сохранении изменений');
      }
    } catch (err) {
      console.error('Ошибка обновления бизнеса:', err);
      alert(err.message || 'Ошибка при сохранении изменений');
    } finally {
      setLoading(false);
    }
  };

  // Удаление бизнеса
  const confirmDelete = async () => {
    if (!businessToDelete) return;

    setLoading(true);
    try {
      // Удаляем бизнес через API-сервис
      const result = await businessService.deleteBusiness(businessToDelete);
      
      if (result.success) {
        // Обновляем локальное состояние
        const updatedBusinesses = businesses.filter(b => b.id !== businessToDelete);
        setBusinesses(updatedBusinesses);

        if (onBusinessesUpdate) {
          onBusinessesUpdate();
        }

        setShowDeleteConfirm(false);
        setShowBusinessModal(false);
        setBusinessToDelete(null);
        setSelectedBusiness(null);
        
        alert('Бизнес успешно удален!');
      } else {
        alert('Ошибка при удалении бизнеса');
      }
    } catch (err) {
      console.error('Ошибка удаления бизнеса:', err);
      alert(err.message || 'Ошибка при удалении бизнеса');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик удаления логотипа
  const handleRemoveLogo = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Удалить логотип',
      message: 'Вы уверены, что хотите удалить логотип?',
      type: 'warning',
      onConfirm: async () => {
        setLogoPreview(null);
        
        // Если уже в режиме редактирования и есть выбранный бизнес, сохраняем сразу
        if (editMode && selectedBusiness) {
          setLoading(true);
          try {
            const result = await businessService.updateBusiness(
              selectedBusiness.id,
              {
                ...editForm,
                logo: '' // Удаляем логотип (пустая строка)
              }
            );
            
            if (result.success && result.data.business) {
              const updatedBusiness = result.data.business;
              const updatedBusinesses = businesses.map(b => 
                b.id === selectedBusiness.id ? updatedBusiness : b
              );
              setBusinesses(updatedBusinesses);
              setSelectedBusiness(updatedBusiness);
            }
          } catch (err) {
            console.error('Ошибка удаления логотипа:', err);
          } finally {
            setLoading(false);
          }
        }
      }
    });
  };

  const handleDeleteBusiness = (businessId) => {
    setBusinessToDelete(businessId);
    setShowDeleteConfirm(true);
  };

  const handleCreateContent = (businessId) => {
    // Сохраняем выбранный бизнес
    localStorage.setItem('selected_business_id', businessId);
    // Переходим на создание поста
    onNavigate('create-post');
  };

  const getIndustryIcon = (industry) => {
    const icons = {
      'Технологии': '💻',
      'Еда и рестораны': '🍽️',
      'Розничная торговля': '🛍️',
      'Образование': '🎓',
      'Здоровье и красота': '💄',
      'Недвижимость': '🏠',
      'Финансы': '💰',
      'Маркетинг и реклама': '📈',
      'Развлечения': '🎬',
      'Спорт и фитнес': '🏋️',
      'Мода и стиль': '👗',
      'Автомобили': '🚗',
      'Строительство': '🏗️',
      'Туризм и путешествия': '✈️',
      'Другое': '🏢'
    };
    return icons[industry] || '🏢';
  };

  const getIndustryColor = (industry) => {
    const colors = {
      'Технологии': '#6ca3fb',
      'Еда и рестораны': '#fc7676',
      'Розничная торговля': '#45fbbf',
      'Образование': '#fdc057',
      'Здоровье и красота': '#fd68b2',
      'Недвижимость': '#a985fb',
      'Финансы': '#69ffd0',
      'Маркетинг и реклама': '#54c9ff',
      'Развлечения': '#fc8a39',
      'Спорт и фитнес': '#b8fd51',
      'Мода и стиль': '#b798ff',
      'Автомобили': '#a1bee5',
      'Строительство': '#bd7345',
      'Туризм и путешествия': '#6cc4d3',
      'Другое': '#b3c0dc'
    };
    return colors[industry] || '#6b7280';
  };

  const getCommunicationStyleLabel = (style) => {
    const styles = {
      'formal': 'Формальный',
      'friendly': 'Дружелюбный',
      'professional': 'Профессиональный',
      'casual': 'Неформальный'
    };
    return styles[style] || style;
  };

  return (
    <div className="business-management-page">
      <div className="management-header">
        {onBack && (
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Назад
          </button>
        )}
        
        <div className="header-content">
          <h1>Управление бизнесами</h1>
          <p>Редактируйте, удаляйте или создавайте контент для ваших бизнесов</p>
        </div>

        <button 
          onClick={() => onNavigate('add-business')}
          className="add-business-btn"
        >
          <Plus size={20} />
          Добавить бизнес
        </button>
      </div>

      {businesses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Building size={48} />
          </div>
          <h3>У вас пока нет бизнесов</h3>
          <p>Создайте первый бизнес, чтобы начать работать с ContentAI</p>
          <button 
            onClick={() => onNavigate('add-business')}
            className="create-first-btn"
          >
            <Plus size={20} />
            Создать первый бизнес
          </button>
        </div>
      ) : (
        <>
          {/* Список бизнесов */}
          <div className="businesses-list-section">
            <h2>Ваши бизнесы</h2>
            <p>Нажмите на карточку бизнеса для просмотра профиля</p>

            <div className="businesses-grid">
              {businesses.map(business => {
                return (
                  <div 
                    key={business.id} 
                    className="business-card"
                    onClick={() => handleBusinessClick(business)}
                  >
                    <div className="business-header">
                      {business.logo ? (
                        <img 
                          src={business.logo} 
                          alt={business.name}
                          className="business-logo-img"
                          style={{ objectFit: 'cover' }}
                          onError={(e) => {
                            console.error('❌ [ManagementBusinessPage] Failed to load logo for business:', business.name);
                            console.error('❌ [ManagementBusinessPage] Logo value:', business.logo?.substring(0, 100));
                            e.target.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log('✅ [ManagementBusinessPage] Logo loaded successfully for business:', business.name);
                          }}
                        />
                      ) : (
                        <div 
                          className="business-logo"
                          style={{ 
                            background: `${getIndustryColor(business.industry)}20`,
                            color: getIndustryColor(business.industry)
                          }}
                        >
                          {getIndustryIcon(business.industry)}
                        </div>
                      )}
                      
                      <div className="business-info">
                        <h3>{business.name}</h3>
                        <span 
                          className="business-industry"
                          style={{ backgroundColor: getIndustryColor(business.industry) }}
                        >
                          {business.industry}
                        </span>
                      </div>
                    </div>

                    <div className="business-description">
                      <p>{business.description || 'Нет описания'}</p>
                    </div>

                    <div className="business-stats">
                      <div className="stat-item">
                        <MessageCircle size={14} />
                        <span>Стиль: {getCommunicationStyleLabel(business.communicationStyle)}</span>
                      </div>
                      
                      {business.region && (
                        <div className="stat-item">
                          <Globe size={14} />
                          <span>{business.region}</span>
                        </div>
                      )}
                      
                      {business.reach && (
                        <div className="stat-item">
                          <Users size={14} />
                          <span>Охват: {business.reach}</span>
                        </div>
                      )}
                    </div>

                    <div className="business-footer">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateContent(business.id);
                        }}
                        className="create-content-btn"
                      >
                        <Sparkles size={16} />
                        Создать контент
                      </button>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          localStorage.setItem('selected_business_id', business.id);
                          onNavigate('dashboard');
                        }}
                        className="view-dashboard-btn"
                      >
                        <Eye size={16} />
                        Дашборд
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Модальное окно профиля бизнеса */}
      {showBusinessModal && selectedBusiness && (
        <div className="modal-overlay">
          <div className="business-profile-modal">
            <div className="modal-header">
              <h2>{editMode ? 'Редактировать бизнес' : 'Профиль бизнеса'}</h2>
              <button onClick={() => setShowBusinessModal(false)} className="modal-close">×</button>
            </div>
            
            <div className="modal-content">
              {/* Логотип */}
              <div className="logo-section">
                {logoPreview ? (
                  <img src={logoPreview} alt="Логотип" className="logo-preview" style={{ objectFit: 'cover' }} />
                ) : (
                  <div 
                    className="logo-placeholder"
                    style={{ 
                      background: `${getIndustryColor(selectedBusiness.industry)}20`,
                      color: getIndustryColor(selectedBusiness.industry)
                    }}
                  >
                    {getIndustryIcon(selectedBusiness.industry)}
                  </div>
                )}
                
                {editMode && (
                  <div className="logo-upload">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="logo-input"
                    />
                    <label htmlFor="logo-upload" className="upload-btn">
                      <Upload size={16} />
                      {logoPreview ? 'Изменить логотип' : 'Загрузить логотип'}
                    </label>
                    {logoPreview && (
                      <button 
                        onClick={handleRemoveLogo}
                        className="remove-logo-btn"
                      >
                        Удалить логотип
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Форма редактирования/просмотра */}
              <div className="business-details">
                {editMode ? (
                  <>
                    <div className="form-group">
                      <label>Название бизнеса *</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="input-field"
                        placeholder="Введите название бизнеса"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Сфера деятельности *</label>
                      <select
                        value={editForm.industry}
                        onChange={(e) => setEditForm({...editForm, industry: e.target.value})}
                        className="input-field"
                      >
                        <option value="">Выберите сферу</option>
                        {[
                          'Технологии', 'Еда и рестораны', 'Розничная торговля', 'Образование',
                          'Здоровье и красота', 'Недвижимость', 'Финансы', 'Маркетинг и реклама',
                          'Развлечения', 'Спорт и фитнес', 'Мода и стиль', 'Автомобили',
                          'Строительство', 'Туризм и путешествия', 'Другое'
                        ].map(industry => (
                          <option key={industry} value={industry}>{industry}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Охват аудитории</label>
                      <input
                        type="text"
                        value={editForm.reach}
                        onChange={(e) => setEditForm({...editForm, reach: e.target.value})}
                        className="input-field"
                        placeholder="Например: 10К подписчиков"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Регион</label>
                      <input
                        type="text"
                        value={editForm.region}
                        onChange={(e) => setEditForm({...editForm, region: e.target.value})}
                        className="input-field"
                        placeholder="Например: Москва"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Описание</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        className="textarea-field"
                        rows="4"
                        placeholder="Расскажите о вашем бизнесе..."
                        maxLength="500"
                      />
                      <div className="char-count">{editForm.description.length}/500</div>
                    </div>
                    
                    <div className="form-group">
                      <label>Стиль коммуникации</label>
                      <div className="style-options">
                        {[
                          { value: 'formal', label: 'Формальный', icon: '📋' },
                          { value: 'professional', label: 'Профессиональный', icon: '💼' },
                          { value: 'friendly', label: 'Дружелюбный', icon: '😊' },
                        ].map(style => (
                          <label key={style.value} className="style-option">
                            <input
                              type="radio"
                              name="communicationStyle"
                              value={style.value}
                              checked={editForm.communicationStyle === style.value}
                              onChange={(e) => setEditForm({...editForm, communicationStyle: e.target.value})}
                            />
                            <span className="style-icon">{style.icon}</span>
                            <span className="style-label">{style.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="detail-item">
                      <label>Название бизнеса</label>
                      <p className="detail-value">{selectedBusiness.name}</p>
                    </div>
                    
                    <div className="detail-item">
                      <label>Сфера деятельности</label>
                      <p className="detail-value">
                        <span 
                          className="industry-badge"
                          style={{ backgroundColor: getIndustryColor(selectedBusiness.industry) }}
                        >
                          {selectedBusiness.industry}
                        </span>
                      </p>
                    </div>
                    
                    {selectedBusiness.reach && (
                      <div className="detail-item">
                        <label>Охват аудитории</label>
                        <p className="detail-value">{selectedBusiness.reach}</p>
                      </div>
                    )}
                    
                    {selectedBusiness.region && (
                      <div className="detail-item">
                        <label>Регион</label>
                        <p className="detail-value">{selectedBusiness.region}</p>
                      </div>
                    )}
                    
                    <div className="detail-item">
                      <label>Стиль коммуникации</label>
                      <p className="detail-value">
                        <span className="communication-style">
                          {getCommunicationStyleLabel(selectedBusiness.communicationStyle)}
                        </span>
                      </p>
                    </div>
                    
                    {selectedBusiness.description && (
                      <div className="detail-item">
                        <label>Описание</label>
                        <p className="detail-value description-text">{selectedBusiness.description}</p>
                      </div>
                    )}
                    
                    <div className="detail-item">
                      <label>Дата создания</label>
                      <p className="detail-value">
                        {new Date(selectedBusiness.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="modal-actions">
              {editMode ? (
                <>
                  <button 
                    onClick={() => {
                      setEditMode(false);
                      setEditForm({
                        name: selectedBusiness.name,
                        industry: selectedBusiness.industry,
                        reach: selectedBusiness.reach || '',
                        region: selectedBusiness.region || '',
                        description: selectedBusiness.description || '',
                        communicationStyle: selectedBusiness.communicationStyle || 'professional'
                      });
                      setLogoPreview(selectedBusiness.logo || null);
                    }}
                    className="secondary-btn"
                  >
                    Отмена
                  </button>
                  <button onClick={handleSaveBusiness} className="primary-btn">
                    Сохранить изменения
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      handleDeleteBusiness(selectedBusiness.id);
                    }}
                    className="danger-btn"
                  >
                    <Trash2 size={16} />
                    Удалить бизнес
                  </button>
                  <button 
                    onClick={() => setEditMode(true)}
                    className="primary-btn"
                  >
                    <Edit size={16} />
                    Редактировать
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <h2>Подтверждение удаления</h2>
            </div>
            
            <div className="modal-content">
              <p>Вы уверены, что хотите удалить бизнес "{selectedBusiness?.name}"?</p>
              <p className="warning-text">
                Все данные, связанные с этим бизнесом, будут удалены без возможности восстановления.
              </p>
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="secondary-btn"
              >
                Отмена
              </button>
              <button 
                onClick={confirmDelete}
                className="danger-btn"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно подтверждения */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Удалить"
        cancelText="Отмена"
      />
    </div>
  );
};

export default ManagementBusinessPage;