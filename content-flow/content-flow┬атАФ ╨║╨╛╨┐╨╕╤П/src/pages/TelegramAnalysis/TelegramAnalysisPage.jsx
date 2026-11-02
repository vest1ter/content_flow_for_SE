import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, Eye, Copy, Edit2, Save, Link, RefreshCw, Zap, Clock, ChevronRight, X, History, ExternalLink } from 'lucide-react';
import { telegramService } from '../../api/telegramService';
import { contentService } from '../../api/contentService';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import './TelegramAnalysisPage.css';

const TelegramAnalysisPage = ({ 
  onBack,
  user,
  businesses = [],
  selectedBusiness: selectedBusinessId
}) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  
  // Состояния для ввода
  const [channelUrl, setChannelUrl] = useState('');
  const [channelInfo, setChannelInfo] = useState(null);
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Состояния для периода анализа
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0]; // Формат YYYY-MM-DD
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Формат YYYY-MM-DD
  });
  
  // Состояния для данных
  const [popularPosts, setPopularPosts] = useState([]);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [analysisHistory, setAnalysisHistory] = useState([]);
  
  // Модальное окно подтверждения
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });
  
  // Новые состояния для модального окна
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPostForModal, setSelectedPostForModal] = useState(null);
  const [modalType, setModalType] = useState('post');
  
  // Выбранный бизнес
  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId) || 
                           (businesses.length > 0 ? businesses[0] : null);

  // Загрузка истории при монтировании
  useEffect(() => {
    loadAnalysisHistory();
  }, []);

  // Загрузка истории анализов из localStorage
  const loadAnalysisHistory = () => {
    try {
      const allHistory = JSON.parse(localStorage.getItem('telegram_analysis_history')) || [];
      setAnalysisHistory(allHistory.slice(0, 10));
    } catch (err) {
      console.error('Error loading analysis history:', err);
    }
  };

  // Сохранение в историю
  const saveToHistory = (channelUrl, postsSelected, generatedPost) => {
    const historyItem = {
      id: Date.now().toString(),
      channelName: channelInfo?.name || extractChannelName(channelUrl) || 'Неизвестный канал',
      postsSelected: postsSelected.length,
      generatedPost: generatedPost.substring(0, 100) + '...',
      fullGeneratedPost: generatedPost,
      createdAt: new Date().toISOString(),
      selectedPostsDetails: postsSelected.map(post => ({
        id: post.id,
        content: post.content || post.text || '',
        views: post.views || 0
      }))
    };
    
    try {
      const allHistory = JSON.parse(localStorage.getItem('telegram_analysis_history')) || [];
      const updatedHistory = [historyItem, ...allHistory];
      localStorage.setItem('telegram_analysis_history', JSON.stringify(updatedHistory));
      
      // Обновляем отображаемую историю
      loadAnalysisHistory();
    } catch (err) {
      console.error('Error saving history:', err);
    }

    return historyItem;
  };
  
  // Проверка URL Telegram канала или имени канала
  const isValidTelegramUrl = (input) => {
    // Проверяем URL формат
    const telegramUrlPattern = /^(https?:\/\/)?(www\.)?(t\.me|telegram\.(me|dog))\/([a-zA-Z0-9_]{5,32})$/;
    if (telegramUrlPattern.test(input)) {
      return true;
    }
    
    // Проверяем формат имени канала: durov или @durov
    const channelNamePattern = /^@?[a-zA-Z0-9_]{5,32}$/;
    return channelNamePattern.test(input.trim());
  };
  
  // Извлечение имени канала из URL или возврат самого имени
  const extractChannelName = (input) => {
    // Если это URL, извлекаем имя
    const urlMatch = input.match(/(?:t\.me\/|telegram\.me\/)([a-zA-Z0-9_]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Если это имя канала с @, убираем @
    const trimmed = input.trim();
    if (trimmed.startsWith('@')) {
      return trimmed.substring(1);
    }
    
    // Иначе возвращаем как есть
    return trimmed;
  };
  
  // Анализ канала через API
  const handleAnalyzeChannel = async () => {
    if (!channelUrl.trim()) {
      setError('Введите ссылку на Telegram канал');
      return;
    }
    
    const trimmedChannelUrl = channelUrl.trim();
    if (!isValidTelegramUrl(trimmedChannelUrl)) {
      setError('Введите корректное имя Telegram канала (например: durov или @durov)');
      return;
    }

    if (!selectedBusiness) {
      setError('Выберите бизнес для анализа. Перейдите в управление бизнесами и создайте бизнес.');
      return;
    }
    
    setLoading(true);
    setError('');
    setChannelInfo(null);
    setPopularPosts([]);
    setSelectedPosts([]);
    setGeneratedContent('');
    setIsGenerated(false);
    setIsEditing(false);
    
    try {
      const channelName = extractChannelName(channelUrl);
      
      console.log('📤 [TelegramAnalysisPage] Analyzing channel:', {
        channel_name: channelName,
        business_id: selectedBusiness.id
      });

      // Преобразуем даты из формата YYYY-MM-DD в Date объекты, затем в Unix timestamp
      const startDateObj = new Date(startDate + 'T00:00:00');
      const endDateObj = new Date(endDate + 'T23:59:59');
      
      // Проверяем, что даты корректны
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        setError('Неверный формат дат');
        return;
      }
      
      // Проверяем, что начальная дата не позже конечной
      if (startDateObj > endDateObj) {
        setError('Дата начала не может быть позже даты окончания');
        return;
      }

      // Вызываем API для анализа канала
      const result = await telegramService.analyzeTelegramChannel(
        channelName,
        startDateObj.toISOString(),
        endDateObj.toISOString()
      );

      if (result.success && result.data.telegram_post) {
        console.log('✅ [TelegramAnalysisPage] Channel analyzed:', {
          posts_count: result.data.telegram_post.length
        });

        // Преобразуем данные для отображения
        const posts = result.data.telegram_post.map(post => ({
          id: post.id || `post_${post.message_id}`,
          content: post.text || post.content || '',
          views: post.views || 0,
          date: post.date ? new Date(post.date * 1000).toISOString() : new Date().toISOString(),
          topic: 'анализ',
          tone: 'информативный',
          tags: ['telegram']
        }));

        const sortedPosts = posts.sort((a, b) => b.views - a.views);
        const topPosts = sortedPosts.slice(0, 10);

        setChannelInfo({
          name: channelName,
          title: `Канал "${channelName}"`,
          description: `Проанализировано ${posts.length} постов`,
          subscribers: 0,
          posts: posts.length,
          avatar: `https://ui-avatars.com/api/?name=${channelName}&background=0088cc&color=fff`
        });

        setPopularPosts(topPosts);
      } else {
        throw new Error('Не удалось проанализировать канал');
      }
      
    } catch (err) {
      console.error('❌ [TelegramAnalysisPage] Error analyzing channel:', err);
      setError('Ошибка при анализе канала: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };
  
  // Генерация mock постов
  const generateMockPosts = (channelName) => {
    const posts = [];
    const topics = [
      'новости', 'советы', 'анонсы', 'интервью', 'обзор', 
      'промоакция', 'опрос', 'конкурс', 'аналитика', 'кейс'
    ];
    
    const tones = ['нейтральный', 'позитивный', 'информативный', 'вдохновляющий', 'продающий'];
    
    for (let i = 0; i < 50; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const tone = tones[Math.floor(Math.random() * tones.length)];
      const views = Math.floor(Math.random() * 10000) + 100;
      
      const content = `📢 Пример поста #${i + 1} в канале ${channelName}\n\n` +
        `Это ${tone} пост на тему "${topic}".\n\n` +
        `Здесь содержится интересная информация, которая может быть полезна подписчикам канала. ` +
        `Такой формат контента часто получает хороший отклик аудитории.\n\n` +
        `Основные идеи этого поста включают в себя:\n` +
        `• Практические советы по теме "${topic}"\n` +
        `• Реальные примеры из опыта\n` +
        `• Инсайты для целевой аудитории\n` +
        `• Ключевые выводы и рекомендации\n\n` +
        `Такой подход позволяет максимально эффективно доносить информацию до подписчиков и ` +
        `увеличивать вовлеченность в канале. Анализ показывает, что подобный контент получает ` +
        `в среднем на 30% больше просмотров и взаимодействий.`;
      
      posts.push({
        id: `post_${i}`,
        content,
        date: date.toISOString(),
        views,
        topic,
        tone,
        tags: [topic, tone]
      });
    }
    
    return posts;
  };
  
  // Выбор/отмена выбора поста
  const handleSelectPost = (post) => {
    if (selectedPosts.some(p => p.id === post.id)) {
      setSelectedPosts(selectedPosts.filter(p => p.id !== post.id));
    } else {
      setSelectedPosts([...selectedPosts, post]);
    }
  };
  
  // Выбрать все посты
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts([...popularPosts]);
    }
    setSelectAll(!selectAll);
  };
  
  // Открыть модальное окно с полным текстом поста
  const handleOpenPostModal = (post) => {
    setSelectedPostForModal(post);
    setModalType('post');
    setModalOpen(true);
  };
  
  // Открыть модальное окно с записью истории
  const handleOpenHistoryItem = (item) => {
    setSelectedPostForModal(item);
    setModalType('history');
    setModalOpen(true);
  };
  
  // Закрыть модальное окно
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedPostForModal(null);
    setModalType('post');
  };
  
  // Генерация контента на основе выбранных постов через API
  const handleGenerateContent = async () => {
    if (selectedPosts.length === 0) {
      setError('Выберите хотя бы один пост для анализа');
      return;
    }

    if (!selectedBusiness) {
      setError('Выберите бизнес для генерации поста');
      return;
    }
    
    setGenerating(true);
    setError('');
    
    try {
      console.log('📤 [TelegramAnalysisPage] Generating post from Telegram posts:', {
        business_id: selectedBusiness.id,
        posts_count: selectedPosts.length
      });

      // Преобразуем выбранные посты в формат API
      const postsForAPI = selectedPosts.map(post => ({
        message_id: post.message_id || parseInt(post.id?.replace('post_', '') || '0') || 0,
        text: post.content || post.text || '',
        views: post.views || 0
      }));

      // Вызываем API для генерации поста из Telegram постов
      const result = await contentService.generatePostFromTelegram(
        selectedBusiness.id,
        postsForAPI
      );

      if (result.success && result.data.generated_post) {
        console.log('✅ [TelegramAnalysisPage] Post generated successfully');
        setGeneratedContent(result.data.generated_post);
        setEditedContent(result.data.generated_post);
        setIsGenerated(true);
        setIsEditing(false);
        
        // Сохраняем в историю
        saveToHistory(channelUrl, selectedPosts, result.data.generated_post);
      } else {
        throw new Error(result.data?.message || 'Не удалось сгенерировать пост');
      }
      
    } catch (err) {
      console.error('❌ [TelegramAnalysisPage] Error generating content:', err);
      setError('Ошибка при генерации контента: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setGenerating(false);
    }
  };
  
  // Очистка формы
  const handleClearForm = () => {
    setChannelUrl('');
    setChannelInfo(null);
    setPopularPosts([]);
    setSelectedPosts([]);
    setGeneratedContent('');
    setIsGenerated(false);
    setIsEditing(false);
    setError('');
    setSelectAll(false);
  };
  
  // Копирование в буфер обмена
  const handleCopyToClipboard = () => {
    const textToCopy = isEditing ? editedContent : generatedContent;
    navigator.clipboard.writeText(textToCopy);
  };
  
  // Переключение режима редактирования
  const handleEditToggle = () => {
    if (isEditing) {
      setGeneratedContent(editedContent);
    }
    setIsEditing(!isEditing);
  };
  
  // Сохранение поста (С ОЧИСТКОЙ ВСЕХ ПОЛЕЙ)
  const handleSavePost = () => {
    if (!generatedContent.trim()) {
      setError('Нельзя сохранить пустой пост');
      return;
    }

    saveToHistory(channelUrl, selectedPosts, generatedContent);
    
    // Сохранение в локальное хранилище
    const postData = {
      id: Date.now().toString(),
      content: generatedContent,
      source: 'telegram-analysis',
      channelUrl,
      channelName: channelInfo?.name || 'Неизвестный канал',
      selectedPostsCount: selectedPosts.length,
      createdAt: new Date().toISOString()
    };
    
    try {
      const userPosts = JSON.parse(localStorage.getItem(`user_posts_${user?.id}`)) || [];
      userPosts.unshift(postData);
      localStorage.setItem(`user_posts_${user?.id}`, JSON.stringify(userPosts));
      
      handleClearForm();
      
    } catch (err) {
      setError('Ошибка при сохранении поста');
    }
  };
  
  // Удаление записи из истории
  const handleDeleteHistoryItem = (itemId) => {
    if (!user?.id) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Удалить генерацию',
      message: 'Вы уверены, что хотите удалить эту генерацию из истории?',
      type: 'danger',
      onConfirm: () => {
        try {
          const allHistory = JSON.parse(localStorage.getItem(`telegram_analysis_history_${user.id}`)) || [];
          const updatedHistory = allHistory.filter(item => item.id !== itemId);
          localStorage.setItem(`telegram_analysis_history_${user.id}`, JSON.stringify(updatedHistory));
          
          // Обновляем отображаемую историю
          loadAnalysisHistory();
        } catch (err) {
          setError('Ошибка при удалении записи');
        }
      }
    });
  };
  
  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Компонент модального окна
  const PostModal = () => {
    if (!modalOpen || !selectedPostForModal) return null;
    
    return (
      <div className="ta-modal-overlay" onClick={handleCloseModal}>
        <div className="ta-modal" onClick={(e) => e.stopPropagation()}>
          <div className="ta-modal-header">
            <h3 className="ta-modal-title">
              {modalType === 'post' ? 'Полный текст поста' : 'Детали анализа'}
            </h3>
            <button className="ta-modal-close" onClick={handleCloseModal}>
              <X size={20} />
            </button>
          </div>
          
          <div className="ta-modal-content">
            {modalType === 'post' ? (
              // Контент для просмотра поста из канала
              <div className="ta-modal-post-content">
                {selectedPostForModal.content.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            ) : (
              // Контент для просмотра записи истории
              <div className="ta-modal-history-content">
                <div className="ta-modal-history-header">
                  <div className="ta-modal-history-channel">
                    <h4>Анализ канала: {selectedPostForModal.channelName}</h4>
                    <p className="ta-modal-history-meta">
                      <span>{formatDate(selectedPostForModal.createdAt)}</span>
                      <span>•</span>
                      <span>Проанализировано постов: {selectedPostForModal.postsSelected}</span>
                    </p>
                  </div>
                </div>
                
                <div className="ta-modal-history-generated">
                  <h5>Сгенерированный контент:</h5>
                  <div className="ta-modal-generated-text">
                    {selectedPostForModal.fullGeneratedPost ? 
                      selectedPostForModal.fullGeneratedPost.split('\n').map((line, index) => (
                        <p key={index}>{line}</p>
                      )) :
                      selectedPostForModal.generatedPost
                    }
                  </div>
                </div>
                
                {selectedPostForModal.selectedPostsDetails && selectedPostForModal.selectedPostsDetails.length > 0 && (
                  <div className="ta-modal-history-posts">
                    <h5>Проанализированные посты:</h5>
                    <div className="ta-modal-posts-list">
                      {selectedPostForModal.selectedPostsDetails.map((post, idx) => (
                        <div key={idx} className="ta-modal-post-item">
                          <div className="ta-modal-post-header">
                            <span className="ta-modal-post-number">#{idx + 1}</span>
                            <span className="ta-modal-post-views">
                              <Eye size={12} />
                              {post.views?.toLocaleString() || 'N/A'} просмотров
                            </span>
                          </div>
                          <div className="ta-modal-post-content">
                            {post.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="ta-modal-footer">
            {modalType === 'post' ? (
              // Футер для поста из канала
              <>
                <div className="ta-modal-stat">
                  <span className="ta-modal-stat-label">Дата публикации:</span>
                  <span className="ta-modal-stat-value">
                    {formatDate(selectedPostForModal.date)}
                  </span>
                </div>
                <div className="ta-modal-stat">
                  <span className="ta-modal-stat-label">Просмотры:</span>
                  <span className="ta-modal-stat-value">
                    {selectedPostForModal.views?.toLocaleString() || 'N/A'}
                  </span>
                </div>
              </>
            ) : (
              // Футер для истории
              <div className="ta-modal-history-footer">
                <div className="ta-modal-stat">
                  <span className="ta-modal-stat-label">Дата анализа:</span>
                  <span className="ta-modal-stat-value">
                    {formatDate(selectedPostForModal.createdAt)}
                  </span>
                </div>
                <div className="ta-modal-stat">
                  <span className="ta-modal-stat-label">Источник:</span>
                  <span className="ta-modal-stat-value">
                    {selectedPostForModal.channelName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="ta-page">
      {/* Хедер */}
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          Назад
        </button>
        <h1>Анализ Telegram канала</h1>
      </div>

      {/* Основной контейнер */}
      <div className="ta-container">
        <div className="ta-input-section">
          <div className="ta-form-card">
            <h2>
              <Link size={18} />
              Анализ канала
            </h2>
            
            <div className="ta-form-group">
              <label className="ta-form-label">
                <span>Ссылка на Telegram канал</span>
              </label>
              <input
                type="text"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder='durov или @durov'
                className="ta-form-input"
              />
              <div className="ta-form-hint">
                Введите имя канала (например: durov или @durov)
              </div>
            </div>
            
            {/* Поля для периода анализа */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <div className="ta-form-group" style={{ flex: 1 }}>
                <label className="ta-form-label">
                  <span>Начало периода</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="ta-form-input"
                  max={endDate}
                />
              </div>
              
              <div className="ta-form-group" style={{ flex: 1 }}>
                <label className="ta-form-label">
                  <span>Конец периода</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="ta-form-input"
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            {channelInfo && (
              <div className="ta-channel-info">
                <div className="ta-channel-avatar">
                  {channelInfo.avatar ? (
                    <img 
                      src={channelInfo.avatar} 
                      alt={channelInfo.name}
                      style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                    />
                  ) : (
                    <span>📢</span>
                  )}
                </div>
                <div className="ta-channel-details">
                  <div className="ta-channel-name">{channelInfo.title}</div>
                  <div className="ta-channel-stats">
                    <span className="ta-channel-stat">
                      <Eye size={12} />
                      {channelInfo.subscribers.toLocaleString()} подписчиков
                    </span>
                    <span className="ta-channel-stat">
                      📝 {channelInfo.posts} постов
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <button
              className="ta-btn-primary"
              onClick={handleAnalyzeChannel}
              disabled={loading || !channelUrl.trim()}
            >
              {loading ? (
                <>
                  <div className="ta-spinner-small"></div>
                  Анализируем...
                </>
              ) : (
                <>
                  <BarChart3 size={16} />
                  Проанализировать канал
                </>
              )}
            </button>
          </div>

          {/* Популярные посты */}
          {popularPosts.length > 0 && (
            <div className="ta-form-card">
              <h3 className='popular-posts'>
                Самые популярные посты
                <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#718096', marginLeft: '8px' }}>
                  ({popularPosts.length})
                </span>
              </h3>
              
              {selectedPosts.length > 0 && (
                <div className="ta-multi-select">
                  <span className="ta-selected-count">
                    Выбрано: {selectedPosts.length} из {popularPosts.length}
                  </span>
                  <button
                    className="ta-select-all-btn"
                    onClick={handleSelectAll}
                  >
                    {selectAll ? 'Снять выделение' : 'Выбрать все'}
                  </button>
                </div>
              )}
              
              <div className="ta-posts-list">
                {popularPosts.map((post, index) => (
                  <div 
                    key={post.id}
                    className={`ta-post-item ${selectedPosts.some(p => p.id === post.id) ? 'selected' : ''}`}
                    onClick={(e) => {
                      if (!e.target.closest('.ta-post-checkbox')) {
                        handleOpenPostModal(post);
                      }
                    }}
                  >
                    <div 
                      className="ta-post-checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPost(post);
                      }}
                    ></div>
                    <div className="ta-post-header">
                      <span className="ta-post-date">{formatDate(post.date)}</span>
                      <span className="ta-post-views">
                        <Eye size={12} />
                        {post.views.toLocaleString()}
                      </span>
                    </div>
                    
                    <button 
                      className="ta-post-expand-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPostModal(post);
                      }}
                    >
                      <ChevronRight size={12} />
                      Читать полностью
                    </button>
                    
                    <div className="ta-post-tags">
                      {post.tags.map((tag, idx) => (
                        <span key={idx} className="ta-post-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedPosts.length > 0 && (
                <button
                  className="ta-btn-primary"
                  onClick={handleGenerateContent}
                  disabled={generating}
                  style={{ marginTop: '16px' }}
                >
                  {generating ? (
                    <>
                      <div className="ta-spinner-small"></div>
                      Генерируем контент...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Сгенерировать на основе выбранных ({selectedPosts.length})
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* История анализов */}
          {analysisHistory.length > 0 && (
            <div className="ta-history-card">
              <h3>
                <Clock size={16} />
                История анализов
                <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#718096', marginLeft: '8px' }}>
                  ({analysisHistory.length})
                </span>
              </h3>
              
              <div className="ta-history-list">
                {analysisHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className="ta-history-item"
                    onClick={() => handleOpenHistoryItem(item)}
                  >
                    <div className="ta-history-header">
                      <span className="ta-history-date">
                        {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistoryItem(item.id);
                        }}
                        className="ta-history-delete-btn"
                        title="Удалить запись"
                      >
                        ×
                      </button>
                    </div>
                    <div className="ta-history-content">
                      {item.generatedPost}
                    </div>
                    <div className="ta-history-tags">
                      <span className="ta-history-tag ta-history-tag-channel">
                        {item.channelName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {analysisHistory.length > 10 && (
                <div className="ta-history-hint">
                  Показано {Math.min(analysisHistory.length, 10)} из {analysisHistory.length} записей
                </div>
              )}
            </div>
          )}

          {/* Информация */}
          <div className="ta-info-card">
            <h3>💡 Как это работает</h3>
            <ul className="ta-info-list">
              <li>Вставьте ссылку на публичный Telegram-канал</li>
              <li>Система проанализирует популярные посты канала</li>
              <li>Выберите посты для анализа</li>
              <li>AI создаст новый контент на основе выбранных постов</li>
              <li>Редактируйте, копируйте и сохраняйте результат</li>
            </ul>
          </div>
        </div>

        {/* Правая колонка - результат */}
        <div className="ta-result-section">
          <div className="ta-result-card">
            <div className="ta-result-header">
              <h2>Сгенерированный контент</h2>
              <div className="ta-result-actions">
                {isGenerated && (
                  <>
                    <button
                      className="ta-btn-copy"
                      onClick={handleCopyToClipboard}
                    >
                      <Copy size={16} />
                      Копировать
                    </button>
                    <button
                      className={`ta-btn-edit ${isEditing ? 'editing' : ''}`}
                      onClick={handleEditToggle}
                    >
                      <Edit2 size={16} />
                      {isEditing ? 'Сохранить' : 'Редактировать'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {!isGenerated ? (
              <div className="ta-empty-result">
                <BarChart3 size={48} />
                <h3>Контент еще не сгенерирован</h3>
                <p>Введите канал слева, нажмите кнопку анализа и выберите популярные посты</p>
              </div>
            ) : (
              <div className="post-content">                
                {/* Редактируемое поле */}
                {isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="ta-post-editor"
                    rows={15}
                    placeholder="Редактируйте текст здесь..."
                  />
                ) : (
                  <div className="ta-post-text">
                    {generatedContent.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                )}

                {/* Статистика и действия */}
                <div className="ta-post-footer">
                  <div className="ta-post-stats">
                    <div className="ta-stat">
                      <span className="ta-stat-label">Символов:</span>
                      <span className="ta-stat-value">
                        {(isEditing ? editedContent : generatedContent).length}
                      </span>
                    </div>
                    <div className="ta-stat">
                      <span className="ta-stat-label">Слов:</span>
                      <span className="ta-stat-value">
                        {(isEditing ? editedContent : generatedContent).split(/\s+/).filter(w => w).length}
                      </span>
                    </div>
                    <div className="ta-stat">
                      <span className="ta-stat-label">Источник:</span>
                      <span className="ta-stat-value">
                        {channelInfo?.name || 'Telegram'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="ta-post-final-actions">
                    <button
                      className="ta-btn-save"
                      onClick={handleSavePost}
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

      {/* Модальное окно */}
      <PostModal />
      
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

export default TelegramAnalysisPage;