import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Save, Edit2, Clock, Zap, Copy, Building, Trash2, Lock, Target, TrendingUp, Users, Megaphone, HelpCircle } from 'lucide-react';
import { contentService } from '../../api/contentService';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import './GeneratePostPage.css';

const GeneratePostPage = ({ 
  user, 
  businesses, 
  selectedBusiness: selectedBusinessId,
  onBack,
  onNavigate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Модальное окно подтверждения
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });
  
  // Форма
  const [formData, setFormData] = useState({
    businessId: selectedBusinessId || '',
    description: '',
    tone: '',
    goal: ''
  });
  
  // Цели поста с иконками и описаниями
  const postGoals = [
    {
      id: 'increase_sales',
      label: 'Увеличить продажи',
      description: 'Прямые призывы к покупке',
      icon: '💰'
    },
    {
      id: 'increase_engagement',
      label: 'Вовлечение',
      description: 'Лайки, комментарии, репосты',
      icon: '🤝'
    },
    {
      id: 'awareness',
      label: 'Узнаваемость',
      description: 'Бренд и новые продукты',
      icon: '📢'
    },
    {
      id: 'other',
      label: 'Другое',
      description: 'Особые цели',
      icon: '🎯'
    }
  ];
  
  // Сгенерированный пост
  const [generatedPost, setGeneratedPost] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPost, setEditedPost] = useState('');
  
  // История (локальное хранилище для сохраненных постов)
  const [businessPosts, setBusinessPosts] = useState([]);

  // Находим выбранный бизнес
  const selectedBusiness = businesses.find(b => b.id === formData.businessId) || 
                         businesses.find(b => b.id === selectedBusinessId) || 
                         (businesses.length > 0 ? businesses[0] : null);

  // Проверяем, есть ли бизнесы
  const hasBusinesses = businesses.length > 0;

  // Загружаем историю постов для выбранного бизнеса из localStorage
  useEffect(() => {
    loadBusinessPosts();
  }, [formData.businessId]);

  // Очищаем историю, если удален бизнес
  useEffect(() => {
    if (!formData.businessId || !businesses.find(b => b.id === formData.businessId)) {
      setBusinessPosts([]);
      setGeneratedPost('');
      setEditedPost('');
      setIsGenerated(false);
      setIsEditing(false);
    }
  }, [businesses, formData.businessId]);

  const loadBusinessPosts = () => {
    if (formData.businessId) {
      try {
        const saved = localStorage.getItem(`posts_${formData.businessId}`);
        const posts = saved ? JSON.parse(saved) : [];
        setBusinessPosts(posts);
      } catch (err) {
        console.error('Error loading posts:', err);
        setBusinessPosts([]);
      }
    } else {
      setBusinessPosts([]);
    }
  };

  // Обновляем выбранный бизнес в форме
  useEffect(() => {
    if (selectedBusinessId && !formData.businessId) {
      setFormData(prev => ({ ...prev, businessId: selectedBusinessId }));
    }
  }, [selectedBusinessId, formData.businessId]);

  // Обработчики формы
  const handleInputChange = (e) => {
    if (!hasBusinesses) return;
    
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Обработчик выбора цели
  const handleGoalSelect = (goalId) => {
    if (!hasBusinesses) return;
    setFormData(prev => ({ ...prev, goal: goalId }));
  };

  const handleGeneratePost = async () => {
    if (!hasBusinesses) {
      setError('Создайте бизнес для генерации постов');
      return;
    }

    if (!formData.businessId) {
      setError('Выберите бизнес для поста');
      return;
    }

    if (!formData.description.trim()) {
      setError('Введите описание для поста');
      return;
    }

    if (!selectedBusiness) {
      setError('Выберите бизнес для поста');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('📤 [GeneratePostPage] Generating post:', {
        business_id: selectedBusiness.id,
        description: formData.description,
        goal: formData.goal,
        tone: formData.tone
      });

      // Преобразуем goal в числовой формат для API
      let goalNum = 1; // по умолчанию increase_engagement
      switch (formData.goal) {
        case 'increase_sales':
          goalNum = 0;
          break;
        case 'increase_engagement':
          goalNum = 1;
          break;
        case 'awareness':
        case 'other':
          goalNum = 1;
          break;
      }

      // Вызываем API для генерации поста
      const result = await contentService.generateBusinessPost(selectedBusiness.id, {
        description: formData.description.trim(),
        goal: goalNum,
        tone: formData.tone || ''
      });

      if (result.success && result.data.generated_post) {
        console.log('✅ [GeneratePostPage] Post generated successfully');
        // Показываем сгенерированный текст
        setGeneratedPost(result.data.generated_post);
        setEditedPost(result.data.generated_post);
        setIsGenerated(true);
        setIsEditing(false);
      } else {
        throw new Error(result.data?.message || 'Не удалось сгенерировать пост');
      }
    } catch (err) {
      console.error('❌ [GeneratePostPage] Error generating post:', err);
      setError('Ошибка при генерации поста: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (!hasBusinesses) return;
    
    if (isEditing) {
      // Сохраняем редактирование
      setGeneratedPost(editedPost);
    }
    setIsEditing(!isEditing);
  };

  const handleSavePost = () => {
    if (!hasBusinesses) return;
    
    if (!formData.businessId || !generatedPost.trim()) {
      setError('Нельзя сохранить пустой пост');
      return;
    }

    const postData = {
      id: `post_${Date.now()}`,
      businessId: formData.businessId,
      content: generatedPost,
      tone: formData.tone,
      description: formData.description,
      goal: formData.goal,
      communicationStyle: selectedBusiness?.communicationStyle,
      title: `Пост для ${selectedBusiness?.name || 'бизнеса'}`,
      createdAt: new Date().toISOString()
    };

    // Сохраняем пост в localStorage (для истории)
    try {
      const saved = localStorage.getItem(`posts_${formData.businessId}`);
      const posts = saved ? JSON.parse(saved) : [];
      posts.unshift(postData);
      localStorage.setItem(`posts_${formData.businessId}`, JSON.stringify(posts));
      setBusinessPosts(posts);
    } catch (err) {
      console.error('Error saving post:', err);
    }
    
    // Очищаем сгенерированный пост после сохранения
    setGeneratedPost('');
    setEditedPost('');
    setIsGenerated(false);
    setIsEditing(false);
    
    // Очищаем поле описания (но оставляем цель)
    setFormData(prev => ({ ...prev, description: '' }));
  };

  const handleClearForm = () => {
    if (!hasBusinesses) return;
    
    setFormData({
      businessId: selectedBusinessId || '',
      description: '',
      tone: '',
      goal: 'increase_engagement' // Сбрасываем к значению по умолчанию
    });
    setGeneratedPost('');
    setEditedPost('');
    setIsGenerated(false);
    setIsEditing(false);
    setError('');
  };

  const handleCopyToClipboard = () => {
    if (!hasBusinesses) return;
    
    const textToCopy = isEditing ? editedPost : generatedPost;
    navigator.clipboard.writeText(textToCopy);
  };

  // Функция удаления поста из истории
  const handleDeletePost = (postId) => {
    if (!hasBusinesses || !postId || !formData.businessId) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Удалить пост',
      message: 'Вы уверены, что хотите удалить этот пост из истории?',
      type: 'danger',
      onConfirm: () => {
        try {
          const updatedPosts = businessPosts.filter(p => p.id !== postId);
          localStorage.setItem(`posts_${formData.businessId}`, JSON.stringify(updatedPosts));
          setBusinessPosts(updatedPosts);
        } catch (err) {
          console.error('Error deleting post:', err);
        }
      }
    });
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

  const communicationStyles = {
    'formal': { label: 'Официальный', icon: '🎩' },
    'friendly': { label: 'Дружелюбный', icon: '🤝' },
    'professional': { label: 'Профессиональный', icon: '💼' }
  };

  const getCommunicationStyleInfo = (style) => {
    return communicationStyles[style];
  };

  // Получаем информацию о выбранной цели
  const getSelectedGoalInfo = () => {
    return postGoals.find(goal => goal.id === formData.goal) || postGoals[0];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPostPreview = (content) => {
    if (!content) return '';
    return content.length > 80 ? content.substring(0, 80) + '...' : content;
  };

  return (
    <div className="generate-post-page">
      {/* Хедер */}
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          Назад
        </button>
        <h1>Генерация поста</h1>
      </div>

      {/* Уведомления */}
      {error && (
        <div className="notification error">
          <span>{error}</span>
          <button onClick={() => setError('')} className="notification-close">×</button>
        </div>
      )}

      <div className="post-container">
        {/* Левая колонка - форма и история */}
        <div className="post-form-section">
          <div className={`form-card ${!hasBusinesses ? 'form-disabled' : ''}`}>
            <h2>Настройки генерации</h2>
        
            {/* Выбор бизнеса */}
            <div className="form-group">
              <label className="form-label">
                <span>Бизнес для поста</span>
              </label>
              <div className="business-selector">
                {!hasBusinesses ? (
                  <div className="no-businesses">
                    <Building size={24} />
                    <p>У вас нет бизнесов</p>
                    <button 
                      className="btn-primary"
                      onClick={() => onNavigate('add-business')}
                    >
                      Создать бизнес
                    </button>
                  </div>
                ) : (
                  <select
                    name="businessId"
                    value={formData.businessId}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                    disabled={!hasBusinesses}
                  >
                    <option value="">Выберите бизнес</option>
                    {businesses.map(business => (
                      <option key={business.id} value={business.id}>
                        {business.name} {getIndustryIcon(business.industry)} 
                        {business.communicationStyle && ` • ${getCommunicationStyleInfo(business.communicationStyle)?.label}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {selectedBusiness && hasBusinesses && (
                <div className="selected-business-info">
                  <div className="business-avatar-small">
                    <span>{getIndustryIcon(selectedBusiness.industry)}</span>
                  </div>
                  <div>
                    <div className="business-name">{selectedBusiness.name}</div>
                    <div className="business-details">
                      <span>{selectedBusiness.industry}</span>
                      {selectedBusiness.communicationStyle && (
                        <span className="communication-style">
                          Стиль: {getCommunicationStyleInfo(selectedBusiness.communicationStyle)?.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Цель поста */}
            <div className="form-group">
              <label className="form-label">
                <Target size={16} />
                <span>Цель поста</span>
              </label>
              <div className="goals-grid">
                {postGoals.map(goal => (
                  <button
                    key={goal.id}
                    className={`goal-option ${formData.goal === goal.id ? 'selected' : ''} ${!hasBusinesses ? 'disabled' : ''}`}
                    onClick={() => handleGoalSelect(goal.id)}
                    disabled={!hasBusinesses}
                    type="button"
                  >
                    <div className="goal-icon">{goal.icon}</div>
                    <div className="goal-label">{goal.label}</div>
                    <div className="goal-description">{goal.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Описание поста */}
            <div className="form-group">
              <label className="form-label">
                <span>Опишите, о чем пост</span>
                {!hasBusinesses && <Lock size={14} />}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={hasBusinesses ? `Пример для "${getSelectedGoalInfo().label.toLowerCase()}": ${getGoalPlaceholder(formData.goal)}` : "Создайте бизнес для генерации постов"}
                className="form-textarea"
                rows={4}
                required
                disabled={!hasBusinesses}
              />
              <div className="form-hint">
                {hasBusinesses ? `Цель: ${getSelectedGoalInfo().label}. ${getGoalHint(formData.goal)}` : "Для использования функции нужно создать хотя бы один бизнес"}
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="form-actions">
              <button
                className="btn-clear"
                onClick={handleClearForm}
                type="button"
                disabled={!hasBusinesses}
              >
                Очистить форму
              </button>
              
              <button
                className="btn-generate"
                onClick={handleGeneratePost}
                disabled={!hasBusinesses || loading || !formData.businessId || !formData.description.trim()}
                type="button"
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Генерация...
                  </>
                ) : (
                  <>
                    {!hasBusinesses ? <Lock size={16} /> : <Sparkles size={16} />}
                    {hasBusinesses ? "Сгенерировать пост" : "Требуется бизнес"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* История сгенерированных постов */}
          {hasBusinesses && businessPosts.length > 0 && (
            <div className="history-card">
              <h3>
                <Clock size={16} />
                История постов
                <span className="history-count"> ({businessPosts.length})</span>
              </h3>
              <div className="history-list">
                {businessPosts.slice(0, 5).map((post, index) => (
                  <div key={post.id} className="history-item">
                    <div className="history-item-header">
                      <span className="history-number">#{index + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="history-date">{formatDate(post.createdAt)}</span>
                        {post.goal && (
                          <span className="meta-goal" title={getGoalLabel(post.goal)}>
                            {getGoalIcon(post.goal)}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="btn-delete"
                          title="Удалить пост"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="history-content">
                      {formatPostPreview(post.content)}
                    </div>
                    <div className="history-actions">
                      <button
                        className="history-view-btn"
                        onClick={() => {
                          setGeneratedPost(post.content);
                          setEditedPost(post.content);
                          setIsGenerated(true);
                          setIsEditing(false);
                          if (post.goal) {
                            setFormData(prev => ({ ...prev, goal: post.goal }));
                          }
                        }}
                      >
                        Загрузить
                      </button>
                    </div>
                  </div>
                ))}
                {businessPosts.length > 5 && (
                  <div className="history-more">
                    <span>... и еще {businessPosts.length - 5} постов</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Правая колонка - результат */}
        <div className="post-result-section">
          <div className={`result-card ${!hasBusinesses ? 'form-disabled' : ''}`}>
            <div className="result-header">
              <h2>Сгенерированный пост</h2>
              <div className="result-actions">
                {hasBusinesses && isGenerated && (
                  <>
                    <button
                      className="btn-copy-result"
                      onClick={handleCopyToClipboard}
                      disabled={!hasBusinesses}
                    >
                      <Copy size={16} />
                      Копировать
                    </button>
                    <button
                      className={`btn-edit ${isEditing ? 'editing' : ''}`}
                      onClick={handleEditToggle}
                      disabled={!hasBusinesses}
                    >
                      <Edit2 size={16} />
                      {isEditing ? 'Сохранить' : 'Редактировать'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {!isGenerated ? (
              <div className="empty-result">
                {hasBusinesses ? (
                  <>
                    <Zap size={48} />
                    <h3>Пост еще не сгенерирован</h3>
                    <p>Заполните форму слева и нажмите "Сгенерировать пост"</p>
                    <div className="result-hint">
                      <strong>AI учтет:</strong> цель поста, стиль бизнеса и описание
                    </div>
                  </>
                ) : (
                  <>
                    <Lock size={48} />
                    <h3>Функция недоступна</h3>
                    <p>Создайте бизнес для доступа к генерации постов</p>
                    <div className="result-hint">
                      <strong>Сначала создайте бизнес</strong> в левой колонке или в разделе "Мои бизнесы"
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="post-content">
                {/* Информация о цели и стиле */}
                <div className="style-info-banner" style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                }}>
                  <div className="style-icon">
                    {getSelectedGoalInfo().icon}
                  </div>
                  <div>
                    <div className="style-title">
                      Цель: {getSelectedGoalInfo().label}
                    </div>
                    <div className="style-description">
                      {selectedBusiness?.communicationStyle && (
                        `Стиль: ${getCommunicationStyleInfo(selectedBusiness.communicationStyle)?.label}`
                      )}
                    </div>
                  </div>
                </div>

                {/* Превью платформы */}
                <div className="platform-preview">
                  <div className="platform-header">
                    <div>
                      <div className="platform-name">Telegram</div>
                      <div className="platform-subtitle">Превью поста</div>
                    </div>
                  </div>
                  
                  {/* Редактируемое поле */}
                  {isEditing ? (
                    <textarea
                      value={editedPost}
                      onChange={(e) => setEditedPost(e.target.value)}
                      className="post-editor"
                      rows={15}
                      placeholder="Редактируйте текст поста здесь..."
                      disabled={!hasBusinesses}
                    />
                  ) : (
                    <div className="post-text">
                      {generatedPost.split('\n').map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Статистика и действия */}
                <div className="post-footer">
                  <div className="post-stats">
                    <div className="stat">
                      <span className="stat-label">Цель:</span>
                      <span className="gp-stat-value" style={{ color: '#667eea' }}>
                        {getSelectedGoalInfo().label}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Символов:</span>
                      <span className="gp-stat-value">
                        {(isEditing ? editedPost : generatedPost).length}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Слов:</span>
                      <span className="gp-stat-value">
                        {(isEditing ? editedPost : generatedPost).split(/\s+/).filter(w => w).length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="post-final-actions">
                    <button
                      className="btn-save"
                      onClick={handleSavePost}
                      disabled={!hasBusinesses || !generatedPost.trim()}
                    >
                      <Save size={16} />
                      Сохранить пост
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
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

// Вспомогательные функции
const getGoalLabel = (goalId) => {
  const goals = {
    'increase_sales': 'Увеличить продажи',
    'increase_engagement': 'Вовлечение',
    'awareness': 'Узнаваемость',
    'other': 'Другое'
  };
  return goals[goalId] || 'Другое';
};

const getGoalIcon = (goalId) => {
  const icons = {
    'increase_sales': '💰',
    'increase_engagement': '🤝',
    'awareness': '📢',
    'other': '🎯'
  };
  return icons[goalId] || '🎯';
};

const getGoalPlaceholder = (goalId) => {
  const placeholders = {
    'increase_sales': "'Анонсируем новую коллекцию со скидкой 30% для первых покупателей'",
    'increase_engagement': "'Задайте вопрос аудитории: Какие темы вас интересуют больше всего?'",
    'awareness': "'Расскажем историю создания нашего бренда и наши ценности'",
    'other': "'Что бы вы хотели донести до своей аудитории?'"
  };
  return placeholders[goalId] || "'Опишите содержание поста'";
};

const getGoalHint = (goalId) => {
  const hints = {
    'increase_sales': 'Используйте скидки, ограничения по времени, призывы к действию',
    'increase_engagement': 'Задавайте вопросы, проводите опросы, просите мнение',
    'awareness': 'Рассказывайте о ценностях, истории, уникальности бренда',
    'other': 'Опишите конкретную задачу этого поста'
  };
  return hints[goalId] || 'Чем подробнее описание, тем лучше результат';
};

export default GeneratePostPage;