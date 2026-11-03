import React, { useState, useEffect, useRef } from 'react';
import './Header.css';
import { 
  ChevronDown, 
  LogOut, 
  Plus, 
  Building,
  Home,
  FileText,
  Calendar,
  BarChart3,
} from 'lucide-react';

const Header = ({
  currentPage,
  onNavigate,
  user = null,
  onLogout,
  businesses = [],
  selectedBusiness: selectedBusinessId,
  onSelectBusiness
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBusinessMenu, setShowBusinessMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const businessDropdownRef = useRef(null);
  const businessSwitcherRef = useRef(null);
  const userDropdownRef = useRef(null);
  const userAvatarRef = useRef(null);

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId) || null;

  const INDUSTRY_ICONS_CONFIG = {
    'Технологии': { emoji: '💻' },
    'Еда и рестораны': { emoji: '🍽️' },
    'Розничная торговля': { emoji: '🛍️' },
    'Образование': { emoji: '🎓' },
    'Здоровье и красота': { emoji: '💄' },
    'Недвижимость': { emoji: '🏠' },
    'Финансы': { emoji: '💰' },
    'Маркетинг и реклама': { emoji: '📈' },
    'Развлечения': { emoji: '🎬' },
    'Спорт и фитнес': { emoji: '🏋️' },
    'Мода и стиль': { emoji: '👗' },
    'Автомобили': { emoji: '🚗' },
    'Строительство': { emoji: '🏗️' },
    'Туризм и путешествия': { emoji: '✈️' },
    'Другое': { emoji: '🏢' }
  };

  const getIndustryIcon = (industry) => {
    const config = INDUSTRY_ICONS_CONFIG[industry] || INDUSTRY_ICONS_CONFIG['Другое'];
    return config.emoji;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showBusinessMenu && 
        businessDropdownRef.current && 
        businessSwitcherRef.current &&
        !businessDropdownRef.current.contains(event.target) &&
        !businessSwitcherRef.current.contains(event.target)
      ) {
        setShowBusinessMenu(false);
      }

      if (
        showUserMenu && 
        userDropdownRef.current && 
        userAvatarRef.current &&
        !userDropdownRef.current.contains(event.target) &&
        !userAvatarRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showBusinessMenu, showUserMenu]);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (showBusinessMenu) setShowBusinessMenu(false);
        if (showUserMenu) setShowUserMenu(false);
        if (showLogoutConfirm) setShowLogoutConfirm(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showBusinessMenu, showUserMenu, showLogoutConfirm]);

  const handleSelectBusiness = (business) => {
    if (onSelectBusiness) {
      onSelectBusiness(business.id);
    }
    setShowBusinessMenu(false);
  };

  const handleAddBusiness = () => {
    setShowBusinessMenu(false);
    onNavigate('add-business');
  };

  const handleLogoClick = () => {
    onNavigate('dashboard');
  };

  const getIndustryColor = (industry) => {
    const colors = {
      'Технологии': '#3b82f6',
      'Еда и рестораны': '#ef4444',
      'Розничная торговля': '#10b981',
      'Образование': '#f59e0b',
      'Здоровье и красота': '#ec4899',
      'Недвижимость': '#8b5cf6',
      'Финансы': '#059669',
      'Маркетинг и реклама': '#0ea5e9',
      'Развлечения': '#f97316',
      'Спорт и фитнес': '#84cc16',
      'Мода и стиль': '#8b5cf6',
      'Автомобили': '#64748b',
      'Строительство': '#92400e',
      'Туризм и путешествия': '#06b6d4',
      'Другое': '#6b7280'
    };
    return colors[industry] || '#6b7280';
  };

  const formatBusinessName = (name) => {
    if (name.length > 20) {
      return name.substring(0, 20) + '...';
    }
    return name;
  };

  const navItems = [
    { id: 'dashboard', label: 'Дашборд', icon: Home },
    { id: 'create-post', label: 'Создать пост', icon: FileText },
    { id: 'content-plan', label: 'Контент-план', icon: Calendar },
    { id: 'telegram-analysis', label: 'Анализ TG', icon: BarChart3 },
  ];

  const renderBusinessAvatar = (business, className = 'business-avatar') => {
    if (!business) return null;
    
    // Если есть логотип, показываем его
    if (business.logo) {
      const handleImageError = (e) => {
        console.error('❌ [Header] Failed to load logo for business:', business.name);
        console.error('❌ [Header] Logo value (first 200 chars):', business.logo?.substring(0, 200));
        console.error('❌ [Header] Logo length:', business.logo?.length);
        console.error('❌ [Header] Has base64:', !!business.logoBase64);
        console.error('❌ [Header] Has URL:', !!business.logoUrl);
        
        // Если base64 не работает, пробуем URL
        if (business.logo?.startsWith('data:image') && business.logoUrl) {
          console.log('🔄 [Header] Retrying with logo_url instead of base64');
          e.target.src = business.logoUrl;
          return;
        }
        
        e.target.style.display = 'none';
      };

      const handleImageLoad = () => {
        console.log('✅ [Header] Logo loaded successfully for business:', business.name);
      };

      return (
        <div 
          className={className}
          style={{ 
            background: 'white',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={business.industry}
        >
          <img 
            src={business.logo} 
            alt={business.name}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              borderRadius: 'inherit'
            }}
          />
        </div>
      );
    }
    
    // Если логотипа нет, показываем иконку индустрии
    const industryColor = getIndustryColor(business.industry);
    const icon = getIndustryIcon(business.industry);
    
    return (
      <div 
        className={className}
        style={{ 
          background: `${industryColor}15`,
          color: industryColor,
          border: `1px solid ${industryColor}30`
        }}
        title={business.industry}
      >
        <span style={{ fontSize: '1.2em' }}>{icon}</span>
      </div>
    );
  };

  const handleLogoutClick = () => {
    setShowUserMenu(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout?.();
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Лого и переключатель бизнеса */}
        <div className="header-left">
          <h1 
            className="header-logo" 
            onClick={handleLogoClick}
            style={{ cursor: 'pointer', userSelect: 'none' }}
            title="Перейти на главную страницу"
          >
            ContentFlow
          </h1>
          
          {user && (
            <div className="business-switcher" ref={businessSwitcherRef}>
              <button
                className="business-switcher-btn"
                onClick={() => setShowBusinessMenu(!showBusinessMenu)}
              >
                {selectedBusiness ? (
                  <>
                    {renderBusinessAvatar(selectedBusiness, 'business-avatar')}
                    <div className="business-info">
                      <span className="business-name">
                        {formatBusinessName(selectedBusiness.name)}
                      </span>
                      <span className="business-industry">
                        {selectedBusiness.industry || 'Без категории'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="business-avatar empty">
                      <Building size={20} />
                    </div>
                    <div className="business-info">
                      <span className="business-name">
                        {businesses.length === 0 ? 'Добавить бизнес' : 'Выбрать бизнес'}
                      </span>
                      <span className="business-industry">
                        {businesses.length === 0 ? 'Начать работу' : 'Кликните для выбора'}
                      </span>
                    </div>
                  </>
                )}
                <ChevronDown className="chevron-icon" size={16} />
              </button>
              
              {showBusinessMenu && (
                <div className="business-dropdown" ref={businessDropdownRef}>
                  <div className="dropdown-header">
                    <h3>Ваши бизнесы</h3>
                    <span className="businesses-count">{businesses.length}</span>
                  </div>
                  
                  {businesses.length === 0 ? (
                    <div className="empty-businesses">
                      <Building size={24} />
                      <p>У вас пока нет бизнесов</p>
                      <button 
                        className="add-business-btn-primary"
                        onClick={handleAddBusiness}
                      >
                        <Plus size={16} />
                        Создать первый бизнес
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="businesses-list">
                        {businesses.map(business => (
                          <button
                            key={business.id}
                            className={`business-option ${selectedBusiness?.id === business.id ? 'selected' : ''}`}
                            onClick={() => handleSelectBusiness(business)}
                            title={`${business.name} - ${business.industry || 'Без категории'}`}
                          >
                            {renderBusinessAvatar(business, 'business-option-avatar')}
                            <div className="business-option-info">
                              <div className="business-option-name">
                                {formatBusinessName(business.name)}
                              </div>
                              <div className="business-option-industry">
                                {business.industry || 'Без категории'}
                                <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                                  {getIndustryIcon(business.industry)}
                                </span>
                              </div>
                            </div>
                            {selectedBusiness?.id === business.id && (
                              <div className="business-selected-indicator" />
                            )}
                          </button>
                        ))}
                      </div>
                      
                      <div className="dropdown-divider" />
                      
                      <div className="dropdown-footer">
                        <button 
                          className="add-business-btn"
                          onClick={handleAddBusiness}
                        >
                          <Plus size={16} />
                          Добавить новый бизнес
                        </button>
                        <button 
                          className="manage-businesses-btn"
                          onClick={() => {
                            setShowBusinessMenu(false);
                            onNavigate('business-management');
                          }}
                        >
                          Управление бизнесами
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {user && (
          <nav className="header-nav desktop">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`nav-btn ${currentPage === item.id ? 'active' : ''}`}
                title={item.label}
              >
                {item.icon && <item.icon size={18} />}
                {item.label}
              </button>
            ))}
          </nav>
        )}

        {/* Меню пользователя */}
        <div className="header-right">
            <div className="user-menu">
              <button
                ref={userAvatarRef}
                className="user-avatar"
                onClick={() => setShowUserMenu(!showUserMenu)}
                title={user.name || 'Пользователь'}
              >
                <span className="avatar-initials">
                  {user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
                </span>
              </button>
              
              {showUserMenu && (
                <div className="user-dropdown" ref={userDropdownRef}>
                  <div className="user-info">
                    <div className="user-avatar-small">
                      <span className="avatar-initials">
                        {user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
                      </span>
                    </div>
                    <div>
                      <div className="user-name">{user.name || 'Пользователь'}</div>
                      <div className="user-email">{user.email || 'email@example.com'}</div>
                    </div>
                  </div>
                  
                  <div className="user-businesses-summary">
                    <div className="summary-item">
                      <span className="summary-label">Бизнесы:</span>
                      <span className="summary-value">{businesses.length}</span>
                    </div>
                    {selectedBusiness && (
                      <div className="summary-item">
                        <span className="summary-label">Текущий:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="summary-value business-name">
                            {formatBusinessName(selectedBusiness.name)}
                          </span>
                          <span style={{ opacity: 0.7 }}>
                            {getIndustryIcon(selectedBusiness.industry)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="dropdown-divider" />
                  
                  <button
                    className="dropdown-item logout"
                    onClick={handleLogoutClick}
                  >
                    <LogOut className="item-icon" size={16} />
                    Выйти
                  </button>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Модальное окно подтверждения выхода */}
      {showLogoutConfirm && (
        <div className="confirmation-modal-overlay" onClick={handleCancelLogout}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Подтверждение выхода</h3>
            <p>Вы уверены, что хотите выйти из аккаунта?</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={handleCancelLogout}>
                Отмена
              </button>
              <button className="confirm-btn" onClick={handleConfirmLogout}>
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;