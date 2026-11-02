import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Save, 
  Edit2, 
  Clock, 
  Zap, 
  Copy, 
  Building, 
  Trash2, 
  Lock, 
  Target, 
  Calendar, 
  Plus, 
  X,
  BookOpen,
  Hash,
  Globe,
  MessageSquare,
  Youtube,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Loader
} from 'lucide-react';
import { contentService } from '../../api/contentService';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import './GenerateContentPlanPage.css';

const GenerateContentPlanPage = ({ 
  user, 
  businesses, 
  selectedBusiness: selectedBusinessId,
  onBack,
  onNavigate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
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
    goal: 'increase_engagement',
    platform: 'telegram',
    ideasCount: 5,
    durationDays: 7
  });
  
  // Цели контент-плана
  const contentPlanGoals = [
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
  
  // Платформы
  const platforms = [
    { id: 'telegram', name: 'Telegram', icon: '💬', color: '#0088cc' },
    { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E1306C' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877F2' },
    { id: 'twitter', name: 'Twitter', icon: '🐦', color: '#1DA1F2' },
    { id: 'youtube', name: 'YouTube', icon: '🎥', color: '#FF0000' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0077B5' }
  ];
  
  // Сгенерированный контент-план
  const [contentPlan, setContentPlan] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [editedPosts, setEditedPosts] = useState({});
  
  // История
  const [businessContentPlans, setBusinessContentPlans] = useState([]);

  // Находим выбранный бизнес
  const selectedBusiness = businesses.find(b => b.id === formData.businessId) || 
                         businesses.find(b => b.id === selectedBusinessId) || 
                         (businesses.length > 0 ? businesses[0] : null);

  // Проверяем, есть ли бизнесы
  const hasBusinesses = businesses.length > 0;

  // Загружаем историю контент-планов для выбранного бизнеса
  useEffect(() => {
    loadBusinessContentPlans();
  }, [user, formData.businessId]);

  // Очищаем историю, если удален бизнес
  useEffect(() => {
    if (!formData.businessId || !businesses.find(b => b.id === formData.businessId)) {
      setBusinessContentPlans([]);
      setContentPlan(null);
      setEditedPosts({});
      setIsEditing(false);
    }
  }, [businesses, formData.businessId]);

  const loadBusinessContentPlans = () => {
    if (user?.id && formData.businessId) {
      // В реальном приложении здесь будет запрос к API
      const plans = JSON.parse(localStorage.getItem(`contentPlans_${user.id}_${formData.businessId}`)) || [];
      setBusinessContentPlans(plans);
    } else {
      setBusinessContentPlans([]);
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

  const handleNumberChange = (name, value) => {
    if (!hasBusinesses) return;
    const numValue = parseInt(value) || (name === 'durationDays' ? 7 : 1);
    let minVal, maxVal;
    if (name === 'ideasCount') {
      minVal = 1;
      maxVal = 30;
    } else if (name === 'durationDays') {
      minVal = 1;
      maxVal = 365;
    } else {
      minVal = 1;
      maxVal = 100;
    }
    const clampedValue = Math.min(Math.max(numValue, minVal), maxVal);
    setFormData(prev => ({ 
      ...prev, 
      [name]: clampedValue
    }));
  };

  // Обработчик выбора цели
  const handleGoalSelect = (goalId) => {
    if (!hasBusinesses) return;
    setFormData(prev => ({ ...prev, goal: goalId }));
  };

  // Обработчик выбора платформы
  const handlePlatformSelect = (platformId) => {
    if (!hasBusinesses) return;
    setFormData(prev => ({ ...prev, platform: platformId }));
  };

  const generateContentPlan = async () => {
    if (!hasBusinesses) {
      setError('Создайте бизнес для генерации контент-плана');
      return;
    }

    if (!formData.businessId) {
      setError('Выберите бизнес для контент-плана');
      return;
    }

    if (!formData.description.trim()) {
      setError('Введите описание для контент-плана');
      return;
    }

    if (formData.ideasCount < 1 || formData.ideasCount > 30) {
      setError('Количество идей должно быть от 1 до 30');
      return;
    }

    if (formData.durationDays < 1 || formData.durationDays > 365) {
      setError('Срок должен быть от 1 до 365 дней');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      // Преобразуем goal из строки в число для API
      let goalValue = 1; // по умолчанию increase_engagement
      switch (formData.goal) {
        case 'increase_sales':
          goalValue = 0;
          break;
        case 'increase_engagement':
          goalValue = 1;
          break;
        case 'awareness':
          goalValue = 2;
          break;
        default:
          goalValue = 1;
      }

      // Вызываем API для генерации контент-плана
      const result = await contentService.generateContentPlan(formData.businessId, {
        goal: goalValue,
        totalPosts: formData.ideasCount,
        periodDays: formData.durationDays,
        description: formData.description
      });

      if (result.success && result.data?.content_plan_item) {
        // Преобразуем данные из API в формат, используемый на странице
        const items = result.data.content_plan_item || [];
        const posts = items.map((item, index) => {
          // Обрабатываем planned_date (может быть Unix timestamp в секундах или миллисекундах)
          let postDate;
          if (item.planned_date) {
            const timestamp = item.planned_date * (item.planned_date > 1000000000000 ? 1 : 1000); // Проверяем, секунды или миллисекунды
            postDate = new Date(timestamp);
          } else {
            // Если дата не задана, распределяем посты равномерно по периоду
            const daysPerPost = formData.durationDays / items.length;
            postDate = new Date(Date.now() + index * daysPerPost * 24 * 60 * 60 * 1000);
          }

          return {
            id: `post-${Date.now()}-${index}`,
            date: postDate.toISOString(),
            topic: item.title || `Идея ${index + 1}`,
            content: item.idea || '',
            goal: formData.goal,
            platform: formData.platform,
            format: item.format || 'post'
          };
        });

        const generatedPlan = {
          id: `plan-${Date.now()}`,
          businessId: formData.businessId,
          description: formData.description,
          goal: formData.goal,
          platform: formData.platform,
          ideasCount: posts.length,
          durationDays: formData.durationDays,
          createdAt: new Date().toISOString(),
          posts,
          generatedByAI: true
        };

        // Сохраняем сгенерированный план
        setContentPlan(generatedPlan);
        setIsEditing(false);
        setEditedPosts({});
        setEditingPostId(null);
        setNewPostText('');
        
        setSuccess('Контент-план успешно сгенерирован!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Не удалось сгенерировать контент-план');
      }
    } catch (err) {
      console.error('❌ [GenerateContentPlan] Error generating content plan:', err);
      setError('Ошибка при генерации контент-плана: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Моковая генерация контент-плана (в реальном приложении будет API запрос)
  const generateMockContentPlan = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const posts = [];
        const startDate = new Date();
        const postsPerWeek = Math.ceil(formData.ideasCount / (formData.durationDays / 7));
        
        for (let i = 0; i < formData.ideasCount; i++) {
          const postDate = new Date(startDate);
          postDate.setDate(startDate.getDate() + Math.floor(i / postsPerWeek) * 7);
          
          const goalInfo = contentPlanGoals.find(g => g.id === formData.goal) || contentPlanGoals[0];
          const platformInfo = platforms.find(p => p.id === formData.platform) || platforms[0];
          
          const topic = generateTopicByGoal(formData.goal, selectedBusiness?.industry);
          const content = generatePostContentByGoal(formData.goal, topic, selectedBusiness);
          
          posts.push({
            id: `post-${Date.now()}-${i}`,
            date: postDate.toISOString(),
            topic,
            content,
            goal: formData.goal,
            platform: formData.platform
          });
        }

        resolve({
          id: `plan-${Date.now()}`,
          businessId: formData.businessId,
          description: formData.description,
          goal: formData.goal,
          platform: formData.platform,
          ideasCount: formData.ideasCount,
          durationDays: formData.durationDays,
          createdAt: new Date().toISOString(),
          posts,
          generatedByAI: true
        });
      }, 1500);
    });
  };

  const handleEditToggle = () => {
    if (!hasBusinesses) return;
    
    if (isEditing) {
      // Сохраняем все изменения
      const updatedPosts = contentPlan.posts.map(post => ({
        ...post,
        content: editedPosts[post.id] || post.content
      }));
      setContentPlan(prev => ({ ...prev, posts: updatedPosts }));
      setEditedPosts({});
    }
    setIsEditing(!isEditing);
  };

  const handleEditPost = (postId, content) => {
    setEditedPosts(prev => ({ ...prev, [postId]: content }));
  };

  const handleSavePostEdit = (postId) => {
    if (editedPosts[postId]) {
      const updatedPosts = contentPlan.posts.map(post => 
        post.id === postId 
          ? { ...post, content: editedPosts[postId] }
          : post
      );
      setContentPlan(prev => ({ ...prev, posts: updatedPosts }));
    }
    setEditingPostId(null);
    setEditedPosts(prev => {
      const newEdited = { ...prev };
      delete newEdited[postId];
      return newEdited;
    });
  };

  const handleAddPost = () => {
    if (!newPostText.trim()) {
      setError('Введите текст для нового поста');
      return;
    }

    const lastPostDate = contentPlan.posts.length > 0 
      ? new Date(contentPlan.posts[contentPlan.posts.length - 1].date)
      : new Date();
    
    const nextDate = new Date(lastPostDate);
    nextDate.setDate(nextDate.getDate() + 7);

    const newPost = {
      id: `new-post-${Date.now()}`,
      date: nextDate.toISOString(),
      topic: 'Дополнительная тема',
      content: newPostText,
      goal: formData.goal,
      platform: formData.platform,
      isNew: true
    };

    setContentPlan(prev => ({
      ...prev,
      posts: [...prev.posts, newPost],
      ideasCount: prev.ideasCount + 1
    }));

    setNewPostText('');
    setSuccess('Новый пост добавлен в контент-план');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleDeletePost = (postId) => {
    if (!contentPlan) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Удалить пост',
      message: 'Вы уверены, что хотите удалить этот пост из плана?',
      type: 'danger',
      onConfirm: () => {
        const updatedPosts = contentPlan.posts.filter(post => post.id !== postId);
        setContentPlan(prev => ({
          ...prev,
          posts: updatedPosts,
          ideasCount: updatedPosts.length
        }));
      }
    });
  };

  const handleSaveContentPlan = () => {
    if (!hasBusinesses || !contentPlan) return;
    
    if (!user?.id || !formData.businessId) {
      setError('Нельзя сохранить контент-план');
      return;
    }

    // Сохраняем контент-план
    const plans = JSON.parse(localStorage.getItem(`contentPlans_${user.id}_${formData.businessId}`)) || [];
    const updatedPlans = [contentPlan, ...plans];
    localStorage.setItem(`contentPlans_${user.id}_${formData.businessId}`, JSON.stringify(updatedPlans));
    
    setBusinessContentPlans(updatedPlans);
    
    // Очищаем сгенерированный план после сохранения
    setContentPlan(null);
    setIsEditing(false);
    setEditedPosts({});
    
    setSuccess('Контент-план успешно сохранен!');
    setTimeout(() => setSuccess(''), 3000);
    
    // Очищаем поле описания
    setFormData(prev => ({ ...prev, description: '' }));
  };

  const handleClearForm = () => {
    if (!hasBusinesses) return;
    
    setFormData({
      businessId: selectedBusinessId || '',
      description: '',
      goal: 'increase_engagement',
      platform: 'telegram',
      ideasCount: 5,
      durationDays: 7
    });
    setContentPlan(null);
    setEditedPosts({});
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handleCopyToClipboard = () => {
    if (!hasBusinesses || !contentPlan) return;
    
    const planText = formatContentPlanForClipboard(contentPlan);
    navigator.clipboard.writeText(planText);
    setSuccess('Контент-план скопирован в буфер обмена');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleDeleteContentPlan = (planId) => {
    if (!hasBusinesses || !user?.id) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Удалить контент-план',
      message: 'Вы уверены, что хотите удалить этот контент-план? Это действие нельзя отменить.',
      type: 'danger',
      onConfirm: () => {
        const updatedPlans = businessContentPlans.filter(plan => plan.id !== planId);
        localStorage.setItem(`contentPlans_${user.id}_${formData.businessId}`, JSON.stringify(updatedPlans));
        setBusinessContentPlans(updatedPlans);
      }
    });
  };

  const handleLoadContentPlan = (plan) => {
    setContentPlan(plan);
    setFormData(prev => ({
      ...prev,
      description: plan.description,
      goal: plan.goal,
      platform: plan.platform,
      ideasCount: plan.ideasCount,
      durationDays: plan.durationDays
    }));
    setIsEditing(false);
    setEditedPosts({});
    setEditingPostId(null);
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
    return contentPlanGoals.find(goal => goal.id === formData.goal) || contentPlanGoals[0];
  };

  // Получаем информацию о выбранной платформе
  const getSelectedPlatformInfo = () => {
    return platforms.find(platform => platform.id === formData.platform) || platforms[0];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };

  const formatContentPlanPreview = (plan) => {
    if (!plan) return '';
    return `${plan.description.substring(0, 60)}...`;
  };

  // Вспомогательные функции для генерации контента
  const generateTopicByGoal = (goal, industry) => {
    const topics = {
      'increase_sales': [
        `Специальное предложение для ${industry || 'клиентов'}`,
        'Акция недели',
        'Новинки в ассортименте',
        'Скидка для первых покупателей'
      ],
      'increase_engagement': [
        'Опрос: Что вас интересует больше всего?',
        'Конкурс с призами',
        'Вопрос дня',
        'Обсуждение новостей отрасли'
      ],
      'awareness': [
        'История нашего бренда',
        'Наши ценности и принципы',
        'Экскурсия по производству',
        'Интервью с основателем'
      ],
      'other': [
        'Новая идея для контента',
        'Специальный проект',
        'Обновления и нововведения'
      ]
    };
    
    const goalTopics = topics[goal] || topics['other'];
    return goalTopics[Math.floor(Math.random() * goalTopics.length)];
  };

  const generatePostContentByGoal = (goal, topic, business) => {
    const templates = {
      'increase_sales': `🔥 ${topic}!\n\nТолько этой недели специальные условия для наших клиентов. Успейте приобрести по выгодной цене!\n\n👉 Свяжитесь с нами, чтобы узнать подробности.`,
      'increase_engagement': `❓ ${topic}\n\nДрузья, давайте обсудим! Напишите в комментариях ваше мнение или ответ на вопрос.\n\nЛучший комментарий получит небольшой подарок от нас!`,
      'awareness': `✨ ${topic}\n\nСегодня хотим рассказать вам больше о ${business?.name || 'нашем бренде'}. Мы гордимся тем, что делаем и как это влияет на наших клиентов.`,
      'other': `📌 ${topic}\n\nУ нас есть интересная идея, которой хотим поделиться с вами. Будем рады услышать ваше мнение!`
    };
    
    return templates[goal] || templates['other'];
  };

  const formatContentPlanForClipboard = (plan) => {
    let text = `Контент-план для ${selectedBusiness?.name || 'бизнеса'}\n`;
    text += `Цель: ${getSelectedGoalInfo().label}\n`;
    text += `Платформа: ${getSelectedPlatformInfo().name}\n`;
    text += `Количество постов: ${plan.ideasCount}\n`;
    text += `Срок: ${plan.durationDays} дней\n\n`;
    
    plan.posts.forEach((post, index) => {
      text += `${index + 1}. ${formatDateTime(post.date)} - ${post.topic}\n`;
      text += `${post.content}\n\n`;
    });
    
    return text;
  };

  const getPlatformIcon = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform ? platform.icon : '💬';
  };

  return (
    <div className="generate-content-plan-page">
      {/* Хедер */}
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          Назад
        </button>
        <h1>Генерация контент-плана</h1>
      </div>

      {/* Уведомления */}
      {error && (
        <div className="notification error">
          <span>{error}</span>
          <button onClick={() => setError('')} className="notification-close">×</button>
        </div>
      )}

      {success && (
        <div className="notification success">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="notification-close">×</button>
        </div>
      )}

      <div className="content-plan-container">
        {/* Левая колонка - форма и история */}
        <div className="content-plan-form-section">
          <div className={`form-card ${!hasBusinesses ? 'form-disabled' : ''}`}>
            <h2>Настройки генерации</h2>
        
            {/* Выбор бизнеса */}
            <div className="form-group">
              <label className="form-label">
                <Building size={16} />
                <span className='goal'>Бизнес для контент-плана</span>
              </label>
              <div className="business-selector">
                {!hasBusinesses ? (
                  <div className="no-businesses">
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
                    disabled={!hasBusinesses || isGenerating}
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

            {/* Цель контент-плана */}
            <div className="form-group">
              <label className="form-label">
                <Target size={16} />
                <span className='goal'>Цель контент-плана</span>
              </label>
              <div className="goals-grid">
                {contentPlanGoals.map(goal => (
                  <button
                    key={goal.id}
                    className={`goal-option ${formData.goal === goal.id ? 'selected' : ''} ${!hasBusinesses || isGenerating ? 'disabled' : ''}`}
                    onClick={() => handleGoalSelect(goal.id)}
                    disabled={!hasBusinesses || isGenerating}
                    type="button"
                  >
                    <div className="goal-icon">{goal.icon}</div>
                    <div className="goal-label">{goal.label}</div>
                    <div className="goal-description">{goal.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Количество постов */}
            <div className="form-group">
              <div className="input-group">
                <div style={{ flex: 1 }}>
                  <label className="form-label">
                    <Target size={16} />
                    <span className='goal'>Количество постов</span>
                  </label>
                  <div className="input-with-hint">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.ideasCount}
                      onChange={(e) => handleNumberChange('ideasCount', e.target.value)}
                      className="form-input form-input-sm"
                      disabled={!hasBusinesses || isGenerating}
                    />
                    <span className="input-hint">от 1 до 30</span>
                  </div>
                </div>
              </div>
              <div className="form-hint">
                Количество идей постов для контент-плана
              </div>
            </div>

            {/* Период в днях */}
            <div className="form-group">
              <div className="input-group">
                <div style={{ flex: 1 }}>
                  <label className="form-label">
                    <Calendar size={16} />
                    <span className='goal'>Период публикаций (дней)</span>
                  </label>
                  <div className="input-with-hint">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.durationDays}
                      onChange={(e) => handleNumberChange('durationDays', e.target.value)}
                      className="form-input form-input-sm"
                      disabled={!hasBusinesses || isGenerating}
                    />
                    <span className="input-hint">от 1 до 365</span>
                  </div>
                </div>
              </div>
              <div className="form-hint">
                За сколько дней распределить посты (система автоматически распределит их равномерно)
              </div>
            </div>

            {/* Описание контент-плана */}
            <div className="form-group">
              <label className="form-label">
                <BookOpen size={16} />
                <span className='goal'>Опишите тему контент-плана</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={hasBusinesses ? "Пример: 'Контент-план для продвижения новой коллекции весна-лето 2024'" : "Создайте бизнес для генерации контент-планов"}
                className="form-textarea"
                rows={4}
                required
                disabled={!hasBusinesses || isGenerating}
              />
              <div className="form-hint">
                {hasBusinesses ? `Цель: ${getSelectedGoalInfo().label}. Опишите основную тему или кампанию` : "Для использования функции нужно создать хотя бы один бизнес"}
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="form-actions">
              <button
                className="btn-clear"
                onClick={handleClearForm}
                type="button"
                disabled={!hasBusinesses || isGenerating}
              >
                Очистить форму
              </button>
              
              <button
                className="btn-generate"
                onClick={generateContentPlan}
                disabled={!hasBusinesses || isGenerating || !formData.businessId || !formData.description.trim()}
                type="button"
              >
                {isGenerating ? (
                  <>
                    <div className="spinner-small"></div>
                    Генерация...
                  </>
                ) : (
                  <>
                    {!hasBusinesses ? <Lock size={16} /> : <Sparkles size={16} />}
                    {hasBusinesses ? "Сгенерировать план" : "Требуется бизнес"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* История контент-планов */}
          {hasBusinesses && businessContentPlans.length > 0 && (
            <div className="history-card">
              <h3>
                <Clock size={16} />
                История планов
                <span className="history-count"> ({businessContentPlans.length})</span>
              </h3>
              <div className="history-list">
                {businessContentPlans.slice(0, 5).map((plan, index) => (
                  <div key={plan.id} className="history-item">
                    <div className="history-item-header">
                      <span className="history-number">#{index + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="history-date">{formatDate(plan.createdAt)}</span>
                        <span className="meta-platform" title={getSelectedPlatformInfo().name}>
                          {getPlatformIcon(plan.platform)}
                        </span>
                        <button
                          onClick={() => handleDeleteContentPlan(plan.id)}
                          className="btn-delete"
                          title="Удалить план"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="history-meta">
                      <span className="meta-goal">{getSelectedGoalInfo().label}</span>
                      <span className="meta-duration">{plan.ideasCount} идей</span>
                    </div>
                    
                    <div className="history-content">
                      {formatContentPlanPreview(plan)}
                    </div>
                    
                    <div className="history-actions-row">
                      <button
                        className="history-view-btn"
                        onClick={() => handleLoadContentPlan(plan)}
                      >
                        Загрузить план
                      </button>
                      <button
                        className="history-delete-btn"
                        onClick={() => handleDeleteContentPlan(plan.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
                
                {businessContentPlans.length > 5 && (
                  <div className="history-more">
                    <span>... и еще {businessContentPlans.length - 5} планов</span>
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
              <h2>Сгенерированный контент-план</h2>
              <div className="result-actions">
                {hasBusinesses && contentPlan && (
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
                      {isEditing ? 'Сохранить правки' : 'Редактировать'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {isGenerating ? (
              <div className="generating-overlay">
                <div className="generating-content">
                  <div className="generating-spinner">
                    <Loader size={48} className="spin-animation" />
                  </div>
                  <h3>Генерируем контент-план...</h3>
                  <p>AI анализирует ваш бизнес и создаёт идеи для постов</p>
                  <div className="generating-progress">
                    <div className="progress-bar">
                      <div className="progress-fill"></div>
                    </div>
                  </div>
                  <div className="generating-tips">
                    <Sparkles size={16} />
                    <span>Учитываем цель: {getSelectedGoalInfo().label}</span>
                  </div>
                </div>
              </div>
            ) : !contentPlan ? (
              <div className="empty-result">
                {hasBusinesses ? (
                  <>
                    <Zap size={48} />
                    <h3>Контент-план еще не сгенерирован</h3>
                    <p>Заполните форму слева и нажмите "Сгенерировать план"</p>
                    <div className="result-hint">
                      <strong>AI учтет:</strong> цель, платформу, количество идей и срок публикаций
                    </div>
                  </>
                ) : (
                  <>
                    <Lock size={48} />
                    <h3>Функция недоступна</h3>
                    <p>Создайте бизнес для доступа к генерации контент-планов</p>
                    <div className="result-hint">
                      <strong>Сначала создайте бизнес</strong> в левой колонке или в разделе "Мои бизнесы"
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="post-content">
                {/* Информация о цели и платформе */}
                <div className="style-info-banner">
                  <div className="style-icon">
                    {getSelectedGoalInfo().icon}
                  </div>
                  <div>
                    <div className="style-title">
                      Цель: {getSelectedGoalInfo().label}
                    </div>
                    <div className="style-description">
                      Платформа: {getSelectedPlatformInfo().name} • {contentPlan.ideasCount} идей • {contentPlan.durationDays} дней
                    </div>
                  </div>
                </div>

                {/* Список постов контент-плана */}
                <div className="content-plan-posts">
                  <div className="content-plan-header">
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#2d3748' }}>
                        План публикаций
                      </h3>
                      <div style={{ fontSize: '13px', color: '#718096' }}>
                        {selectedBusiness?.name} • {formatDate(contentPlan.createdAt)}
                      </div>
                    </div>
                    <div className="plan-stats">
                      <div className="stat-item">
                        <div className="stat-label">Постов</div>
                        <div className="stat-value">{contentPlan.ideasCount}</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-label">Дней</div>
                        <div className="stat-value">{contentPlan.durationDays}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="posts-list">
                    {contentPlan.posts.map((post, index) => (
                      <div 
                        key={post.id} 
                        className={`post-item ${editingPostId === post.id ? 'editing' : ''}`}
                      >
                        <div className="post-item-header">
                          <div className="post-date">
                            {formatDateTime(post.date)}
                          </div>
                          <div className="post-actions">
                            {isEditing && editingPostId !== post.id && (
                              <button
                                className="btn-post-action edit"
                                onClick={() => setEditingPostId(post.id)}
                                title="Редактировать"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {isEditing && (
                              <button
                                className="btn-post-action delete"
                                onClick={() => handleDeletePost(post.id)}
                                title="Удалить"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="post-content">
                          <div style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#4a5568',
                            marginBottom: '8px'
                          }}>
                            {post.topic}
                          </div>
                          
                          {editingPostId === post.id ? (
                            <textarea
                              value={editedPosts[post.id] || post.content}
                              onChange={(e) => handleEditPost(post.id, e.target.value)}
                              className="post-textarea"
                              rows={4}
                            />
                          ) : (
                            <div className="post-text">
                              {post.content.split('\n').map((line, i) => (
                                <div key={i} style={{ marginBottom: '4px' }}>{line}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="post-footer">
                          <span className="post-goal">
                            {getSelectedGoalInfo().label}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {getPlatformIcon(post.platform)}
                            <span>{getSelectedPlatformInfo().name}</span>
                          </span>
                        </div>
                        
                        {editingPostId === post.id && (
                          <div style={{ 
                            display: 'flex', 
                            gap: '8px', 
                            marginTop: '12px',
                            justifyContent: 'flex-end'
                          }}>
                            <button
                              className="btn-post-action"
                              onClick={() => {
                                setEditingPostId(null);
                                setEditedPosts(prev => {
                                  const newEdited = { ...prev };
                                  delete newEdited[post.id];
                                  return newEdited;
                                });
                              }}
                              style={{ fontSize: '12px' }}
                            >
                              Отмена
                            </button>
                            <button
                              className="btn-save"
                              onClick={() => handleSavePostEdit(post.id)}
                              style={{ fontSize: '12px', padding: '4px 12px' }}
                            >
                              Сохранить
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Добавление нового поста */}
                {isEditing && (
                  <div className="add-post-section">
                    <div className="add-post-header">
                      <Plus size={16} />
                      <span>Добавить новый пост</span>
                    </div>
                    <div className="add-post-form">
                      <textarea
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        placeholder="Введите текст нового поста..."
                        className="add-post-input"
                        rows={3}
                      />
                      <button
                        className="btn-add-post-small"
                        onClick={handleAddPost}
                      >
                        Добавить
                      </button>
                    </div>
                  </div>
                )}

                {/* Статистика и действия */}
                <div className="plan-footer">
                  <div className="plan-stats-footer">
                    <div className="stat-footer">
                      <span className="stat-footer-label">Постов:</span>
                      <span className="stat-footer-value">{contentPlan.ideasCount}</span>
                    </div>
                    <div className="stat-footer">
                      <span className="stat-footer-label">Символов всего:</span>
                      <span className="stat-footer-value">
                        {contentPlan.posts.reduce((total, post) => total + post.content.length, 0)}
                      </span>
                    </div>
                    <div className="stat-footer">
                      <span className="stat-footer-label">Период:</span>
                      <span className="stat-footer-value">{contentPlan.durationDays} дней</span>
                    </div>
                  </div>
                  
                  <div className="plan-final-actions">
                    <button
                      className="btn-generate-again"
                      onClick={generateContentPlan}
                      disabled={!hasBusinesses || isGenerating}
                    >
                      <Sparkles size={16} />
                      Сгенерировать снова
                    </button>
                    
                    <button
                      className="btn-save"
                      onClick={handleSaveContentPlan}
                      disabled={!hasBusinesses || !contentPlan}
                    >
                      <Save size={16} />
                      Сохранить план
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

export default GenerateContentPlanPage;