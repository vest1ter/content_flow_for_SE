import React, { useState, useEffect, useCallback } from 'react';
import './DashboardPage.css';
import { 
  FileText, 
  Calendar,
  BarChart3,
  Plus,
  Zap,
  Users,
  Sparkles,
  Target
} from 'lucide-react';

const ACTIONS = {
  CREATE_POST: 'create-post',
  CONTENT_PLAN: 'content-plan',
  TELEGRAM_ANALYSIS: 'telegram-analysis',
  PRICING: 'pricing'
};

const INDUSTRY_ICONS = {
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

const CAPABILITIES = [
  {
    id: ACTIONS.CREATE_POST,
    title: 'Создать пост',
    description: 'Сгенерируйте уникальный контент для выбранного бизнеса с помощью ИИ',
    icon: FileText,
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
  },
  {
    id: ACTIONS.CONTENT_PLAN,
    title: 'Контент-план',
    description: 'Создайте план публикаций на неделю или месяц вперед',
    icon: Calendar,
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
  },
  {
    id: ACTIONS.TELEGRAM_ANALYSIS,
    title: 'Анализ Telegram',
    description: 'Проанализируйте канал и получите идеи для контента',
    icon: BarChart3,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  },
  // {
  //   id: ACTIONS.PRICING,
  //   title: 'Тарифы и возможности',
  //   description: 'Узнайте о доступных функциях и тарифных планах',
  //   icon: Zap,
  //   gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
  // }
];

const DashboardHero = ({ userName }) => (
  <div className="dashboard-hero">
    <div className="hero-content">
      <h1>Привет, {userName || 'Пользователь'}! 👋</h1>
      <p className="hero-subtitle">
        Управляйте контентом для ваших бизнесов с помощью искусственного интеллекта
      </p>
    </div>
  </div>
);

const BusinessPreviewCard = ({ business }) => {
  // Если есть логотип, показываем его
  if (business.logo) {
    console.log('🖼️ [Dashboard] BusinessPreviewCard rendering logo for:', business.name, {
      logo_type: business.logo.startsWith('data:image') ? 'base64' : business.logo.startsWith('http') ? 'url' : 'unknown',
      logo_preview: business.logo.substring(0, 80) + '...',
      logo_length: business.logo.length,
      has_base64: !!business.logoBase64,
      has_url: !!business.logoUrl
    });

    const handleImageError = (e) => {
      console.error('❌ [Dashboard] Failed to load logo for business:', business.name);
      console.error('❌ [Dashboard] Logo src (first 200 chars):', business.logo?.substring(0, 200));
      console.error('❌ [Dashboard] Logo type:', business.logo?.startsWith('data:image') ? 'base64' : 'url');
      console.error('❌ [Dashboard] Logo length:', business.logo?.length);
      console.error('❌ [Dashboard] Has base64:', !!business.logoBase64);
      console.error('❌ [Dashboard] Has URL:', !!business.logoUrl);
      
      // Если base64 не работает, пробуем URL
      if (business.logo?.startsWith('data:image') && business.logoUrl) {
        console.log('🔄 [Dashboard] Retrying with logo_url instead of base64');
        e.target.src = business.logoUrl;
        return;
      }
      
      console.error('❌ [Dashboard] Image error event:', e);
      e.target.style.display = 'none';
    };

    const handleImageLoad = () => {
      console.log('✅ [Dashboard] Logo loaded successfully for business:', business.name);
      console.log('✅ [Dashboard] Logo type:', business.logo?.startsWith('data:image') ? 'base64' : 'url');
    };

    return (
      <div className="business-preview-card">
        <div className="preview-logo" style={{ 
          background: 'white', 
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <img 
            src={business.logo} 
            alt={business.name}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{ 
              width: '48px', 
              height: '48px', 
              objectFit: 'cover',
              borderRadius: '8px'
            }}
          />
        </div>
        <div className="preview-info">
          <h4>{business.name}</h4>
          <span className="preview-industry">{business.industry}</span>
        </div>
      </div>
    );
  }
  
  // Если логотипа нет, показываем иконку
  const icon = INDUSTRY_ICONS[business.industry] || '🏢';
  
  return (
    <div className="business-preview-card">
      <div className="preview-logo">{icon}</div>
      <div className="preview-info">
        <h4>{business.name}</h4>
        <span className="preview-industry">{business.industry}</span>
      </div>
    </div>
  );
};

const BusinessesSection = ({ businesses, onCreateContent }) => {
  if (businesses.length === 0) {
    return (
      <div className="empty-state">
        <h3>У вас пока нет бизнесов</h3>
        <p>
          Добавьте ваш первый бизнес через меню в верхней части страницы, 
          чтобы начать создавать контент с помощью ИИ
        </p>
        <div className="empty-steps">
          <div className="step">
            <div className="step-number">1</div>
            <p>Нажмите на переключатель бизнесов в хедере</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <p>Выберите "Добавить новый бизнес"</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <p>Заполните информацию о вашем бизнесе</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="current-business-info">
      <h3>Ваши бизнесы готовы к работе</h3>
      <p>Вы можете начать создавать контент для любого из ваших бизнесов</p>
      
      <div className="businesses-preview">
        {businesses.slice(0, 3).map((business) => (
          <BusinessPreviewCard key={business.id} business={business} />
        ))}
        {businesses.length > 3 && (
          <div className="more-businesses">
            +{businesses.length - 3} еще
          </div>
        )}
      </div>
      
      <button 
        className="start-creating-btn"
        onClick={onCreateContent}
      >
        <FileText size={20} />
        Начать создавать контент
      </button>
    </div>
  );
};

const CapabilityCard = ({ capability, onClick }) => {
  const IconComponent = capability.icon;
  
  return (
    <button 
      onClick={() => onClick(capability.id)} 
      className="capability-card"
    >
      <div className="capability-icon" style={{ background: capability.gradient }}>
        <IconComponent size={28} />
      </div>
      <h3>{capability.title}</h3>
      <p>{capability.description}</p>
    </button>
  );
};

const CapabilitiesSection = ({ onCapabilityClick }) => (
  <div className="capabilities-section">
    <h2>Что вы можете сделать</h2>
    <p className="section-description">
      Выберите действие для вашего бизнеса или начните с создания нового контента
    </p>
    
    <div className="capabilities-grid">
      {CAPABILITIES.map((capability) => (
        <CapabilityCard 
          key={capability.id}
          capability={capability}
          onClick={onCapabilityClick}
        />
      ))}
    </div>
  </div>
);

// Основной компонент
const DashboardPage = ({ 
  onNavigate,
  user = null,
  businesses = [],
  onBusinessesUpdate
}) => {
  const userBusinesses = businesses;
  const [error, setError] = useState(null);

  const handleQuickAction = useCallback((action) => {
    const actionHandlers = {
      [ACTIONS.CREATE_POST]: () => onNavigate('create-post'),
      [ACTIONS.CONTENT_PLAN]: () => onNavigate('content-plan'),
      [ACTIONS.TELEGRAM_ANALYSIS]: () => onNavigate('telegram-analysis'),
      [ACTIONS.PRICING]: () => onNavigate('pricing'),
    };

    const handler = actionHandlers[action];
    if (handler) {
      handler();
    } else {
      console.warn(`Неизвестное действие: ${action}`);
    }
  }, [onNavigate]);

  const handleCreateContent = useCallback(() => {
    handleQuickAction(ACTIONS.CREATE_POST);
  }, [handleQuickAction]);

  if (error) {
    return (
      <div className="dashboard-page">
        <DashboardHero userName={user?.name} />
        <div className="empty-state">
          <h3>Произошла ошибка</h3>
          <p>{error}</p>
          <button 
            className="start-creating-btn"
            onClick={() => window.location.reload()}
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <DashboardHero userName={user?.name} />
      
      <BusinessesSection 
        businesses={userBusinesses}
        onCreateContent={handleCreateContent}
      />
            
      <CapabilitiesSection onCapabilityClick={handleQuickAction} />
    </div>
  );
};

export default DashboardPage;