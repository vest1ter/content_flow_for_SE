import React, { useState, useEffect, useCallback } from 'react';
import AuthPage from './pages/Auth/AuthPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import CreateBusinessPage from './pages/Business/CreateBusinessPage';
import BusinessManagementPage from './pages/Business/ManagementBusinessPage';
import RecoveryPasswordPage from './pages/RecoveryPassword/RecoveryPasswordPage';
import EmailConfirmationPage from './pages/Auth/EmailConfirmationPage';
import Header from './components/Header/Header';
import GeneratePostPage from './pages/Posts/GeneratePostPage';
import TelegramAnalysisPage from './pages/TelegramAnalysis/TelegramAnalysisPage';
import GenerateContentPlanPage from './pages/GenerateContentPlanPage/GenerateContentPlanPage';
import { authService } from './api/authService';
import { businessService } from './api/businessService';
import './App.css';

console.log('App starting...'); // убрать позже

export default function App() {
  // Состояния для аутентификации
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  
  // Состояния для навигации
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login');
  const [showRecovery, setShowRecovery] = useState(false);
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);
  
  // Состояния приложения
  const [user, setUser] = useState(authService.getCurrentUser() || null);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  
  // Состояния для UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Загружаем бизнесы пользователя при изменении пользователя
  useEffect(() => {
    // API работает через токен, не нужно проверять user.id
    const accessToken = localStorage.getItem('access_token');
    if (isAuthenticated && accessToken) {
      console.log('🔄 [App] Loading businesses for authenticated user');
      loadUserBusinesses();
    } else {
      setBusinesses([]);
      setSelectedBusiness('');
    }
  }, [isAuthenticated]);

  // Загружаем бизнесы с API
  const loadUserBusinesses = async () => {
    const accessToken = localStorage.getItem('access_token');
    if (!isAuthenticated || !accessToken) {
      console.log('⚠️ [App] Cannot load businesses: not authenticated or no token');
      return;
    }
    
    console.log('📤 [App] Loading businesses from API');
    setLoading(true);
    try {
      const result = await businessService.listBusinesses();
      console.log('📥 [App] Businesses loaded:', {
        success: result.success,
        count: result.data?.businesses?.length || 0
      });
      
      if (result.success) {
        const businessesList = result.data.businesses || [];
        setBusinesses(businessesList);
        
        console.log('✅ [App] Businesses set:', businessesList.length);
        
        // Устанавливаем выбранный бизнес
        if (businessesList.length > 0) {
          const savedBusinessId = localStorage.getItem('selected_business_id');
          const businessToSelect = savedBusinessId 
            ? businessesList.find(b => b.id === savedBusinessId)
            : businessesList[0];
          
          if (businessToSelect) {
            setSelectedBusiness(businessToSelect.id);
            console.log('✅ [App] Selected business:', businessToSelect.id);
          }
        } else {
          console.log('⚠️ [App] No businesses found');
        }
      }
    } catch (err) {
      console.error('❌ [App] Error loading businesses:', err);
      setError('Ошибка загрузки бизнесов: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  // Проверяем аутентификацию при загрузке
  useEffect(() => {
    const initAuth = () => {
      if (authService.isAuthenticated()) {
        const currentUser = authService.getCurrentUser();
        console.log('🔍 [App] Current user from storage:', currentUser);
        
        // Если пользователь получен (включая обновление из JWT)
        if (currentUser) {
          setUser(currentUser);
          console.log('✅ [App] User set:', currentUser);
        }
        setIsAuthenticated(true);
      }
    };
    
    initAuth();
  }, []);

  // ========== ОБРАБОТЧИКИ АУТЕНТИФИКАЦИИ ==========

  // Регистрация через API
  const handleRegister = async (userData) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      // Генерируем username из name или email
      const username = userData.username || userData.name || userData.email.split('@')[0];
      
      console.log('📤 [App] Registering user:', {
        username: username,
        email: userData.email,
        has_name: !!userData.name
      });
      
      const result = await authService.register({
        username: username,
        email: userData.email,
        password: userData.password
      });
      
      if (result.success) {
        // Сохраняем email для подтверждения
        localStorage.setItem('pending_email', userData.email);
        
        setNeedsEmailConfirmation(true);
      }
      
      return result.success;
    } catch (err) {
      setError(err.message || 'Ошибка при регистрации');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const result = await authService.login(email, password);
      
      console.log('Login result:', result); // Для отладки
      
      if (result.success) {
        if (result.data.confirmed) {
          setIsAuthenticated(true);
          setUser(authService.getCurrentUser());
          setSuccessMessage('Вход выполнен успешно!');
          
          // Автоматически скрываем уведомление через 3 секунды
          setTimeout(() => {
            setSuccessMessage('');
          }, 3000);
          
          console.log('✅ [App] Login successful, loading businesses...');
          // Загружаем бизнесы после успешного логина
          await loadUserBusinesses();
        } else {
          localStorage.setItem('pending_email', email);
          
          if (result.data.email_confirm_token) {
            localStorage.setItem('email_confirm_token', result.data.email_confirm_token);
          }
          
          setNeedsEmailConfirmation(true);
          setSuccessMessage('Требуется подтверждение email. Проверьте вашу почту.');
        }
      } else {
        setError('Неверный логин или пароль');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Ошибка при входе');
    } finally {
      setLoading(false);
    }
  };


  // Отправка кода подтверждения
  const handleSendVerificationCode = async (email) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      console.log('Sending verification code to:', email);
      
      localStorage.setItem('pending_email', email);

      return { success: true };
    } catch (err) {
      setError(err.message || 'Ошибка при отправке кода');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Подтверждение кода
  const handleConfirmVerificationCode = async (code, email) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    console.log('=== DEBUG Confirm Verification ===');
    console.log('Code received:', code);
    console.log('Code type:', typeof code);
    console.log('Code value:', String(code));
    console.log('Code length:', String(code).length);
    console.log('Email received:', email);
    
    // Валидация кода
    const codeStr = String(code || '').trim();
    if (!codeStr || codeStr.length !== 6 || !/^\d{6}$/.test(codeStr)) {
      setError('Некорректный код подтверждения');
      setLoading(false);
      return { success: false, confirmed: false };
    }
    
    try {
      const emailToken = localStorage.getItem('email_confirm_token');
      
      console.log('📤 [App] Confirming with:', {
        emailToken_exists: !!emailToken,
        emailToken_length: emailToken ? emailToken.length : 0,
        code: codeStr,
        code_type: typeof codeStr,
        code_parsed: parseInt(codeStr, 10)
      });
      
      if (!emailToken) {
        throw new Error('Токен подтверждения не найден. Пожалуйста, запросите код заново.');
      }
      
      const result = await authService.confirmVerifyCode(emailToken, codeStr);
      
      console.log('Confirm result:', result); // Для отладки
      
      if (result.success && result.data.confirmed) {
        setIsAuthenticated(true);
        setUser(authService.getCurrentUser());
        setNeedsEmailConfirmation(false);
        localStorage.removeItem('pending_email');
        localStorage.removeItem('email_confirm_token');
        
        console.log('✅ [App] Email confirmed, loading businesses...');
        // Загружаем бизнесы после подтверждения email
        await loadUserBusinesses();
        
        return { success: true, confirmed: true };
      } else {
        setError('Неверный код подтверждения или токен истек');
        return { success: false, confirmed: false };
      }
    } catch (err) {
      console.error('Confirm error:', err);
      setError(err.message || 'Ошибка при подтверждении кода');
      return { success: false, confirmed: false };
    } finally {
      setLoading(false);
    }
  };

  // Восстановление пароля
  const handleForgotPassword = async (email) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const result = await authService.sendPasswordResetCode(email);
      
      console.log('📥 [App] Результат отправки кода сброса:', result);
      
      if (result.success) {
        setSuccessMessage('Код для восстановления пароля отправлен на email');
        
        // Проверяем наличие токена в ответе
        if (!result.data?.reset_pass_token) {
          console.error('❌ [App] Токен сброса пароля отсутствует в ответе');
          setError('Токен сброса пароля не получен. Попробуйте еще раз.');
          return { success: false };
        }
        
        console.log('✅ [App] Токен получен, будет передан в RecoveryPasswordPage:', result.data.reset_pass_token.substring(0, 20) + '...');
        
        return { 
          success: true, 
          data: {
            reset_pass_token: result.data.reset_pass_token
          }
        };
      } else {
        setError('Не удалось отправить код. Попробуйте еще раз.');
        return { success: false };
      }
    } catch (err) {
      console.error('❌ [App] Ошибка при восстановлении пароля:', err);
      setError(err.message || 'Ошибка при восстановлении пароля');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Подтверждение кода сброса пароля
  const handleConfirmResetCode = async (code, resetPassToken) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const result = await authService.confirmPasswordResetCode(code, resetPassToken);
      
      if (result.success && result.data.confirmed) {
        setSuccessMessage('Код подтвержден успешно');
        return { success: true };
      } else {
        setError('Неверный код подтверждения');
        return { success: false, error: 'Неверный код подтверждения' };
      }
    } catch (err) {
      setError(err.message || 'Ошибка при подтверждении кода');
      return { success: false, error: err.message || 'Ошибка при подтверждении кода' };
    } finally {
      setLoading(false);
    }
  };

  // Сброс пароля
  const handleResetPassword = async (resetPassToken, newPassword) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const result = await authService.resetPassword(resetPassToken, newPassword);
      
      if (result.success && result.data.success) {
        setSuccessMessage('Пароль успешно изменен');
        // Очищаем токен из localStorage
        localStorage.removeItem('reset_pass_token');
        return { success: true };
      } else {
        setError(result.data?.message || 'Ошибка при сбросе пароля');
        return { success: false, error: result.data?.message || 'Ошибка при сбросе пароля' };
      }
    } catch (err) {
      setError(err.message || 'Ошибка при сбросе пароля');
      return { success: false, error: err.message || 'Ошибка при сбросе пароля' };
    } finally {
      setLoading(false);
    }
  };

  // Создание бизнеса через API
  const handleCreateBusiness = async (businessData) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const result = await businessService.createBusiness(businessData);
      
      if (result.success) {
        // Обновляем список бизнесов
        await loadUserBusinesses();
        
        // Устанавливаем новый бизнес как выбранный
        if (result.data.business) {
          setSelectedBusiness(result.data.business.id);
          localStorage.setItem('selected_business_id', result.data.business.id);
        }
        
        setShowCreateBusiness(false);
        setCurrentPage('dashboard');
        setSuccessMessage('Бизнес успешно создан!');
        
        // Автоматически скрываем уведомление через 3 секунды
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
        
        return { success: true, business: result.data.business };
      }
    } catch (err) {
      setError(err.message || 'Ошибка при создании бизнеса');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Обновление списка бизнесов
  const handleBusinessesUpdate = useCallback(() => {
    if (isAuthenticated) {
      loadUserBusinesses();
    }
  }, [isAuthenticated]);

  // Выход
  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setNeedsEmailConfirmation(false);
    setUser(null);
    setBusinesses([]);
    setSelectedBusiness('');
    setCurrentPage('dashboard');
    setSuccessMessage('Выход выполнен успешно');
    
    setTimeout(() => {
      setSuccessMessage('');
    }, 2000);
  };

  // ========== ОТОБРАЖЕНИЕ СТРАНИЦ ==========

  // Если нужно подтверждение email
  if (needsEmailConfirmation) {
    return (
      <EmailConfirmationPage
        onBack={() => {
          localStorage.removeItem('pending_email');
          setNeedsEmailConfirmation(false);
          setAuthMode('login');
        }}
        onSendCode={handleSendVerificationCode}
        onConfirmCode={handleConfirmVerificationCode}
        loading={loading}
        error={error}
        successMessage={successMessage}
        onClearMessages={() => {
          setError('');
          setSuccessMessage('');
        }}
      />
    );
  }

  // Если не авторизован
  if (!isAuthenticated) {
    if (showRecovery) {
      return (
        <RecoveryPasswordPage
          onBack={() => setShowRecovery(false)}
          onForgotPassword={handleForgotPassword}
          onConfirmResetCode={handleConfirmResetCode}
          onResetPassword={handleResetPassword}
          loading={loading}
          error={error}
          successMessage={successMessage}
          onClearMessages={() => {
            setError('');
            setSuccessMessage('');
          }}
        />
      );
    }
    
    return (
      <AuthPage
        onLogin={handleLogin}
        onRegister={handleRegister}
        onForgotPassword={() => setShowRecovery(true)}
        mode={authMode}
        onModeChange={setAuthMode}
        loading={loading}
        error={error}
        successMessage={successMessage}
        onClearMessages={() => {
          setError('');
          setSuccessMessage('');
        }}
      />
    );
  }

  // Если открыта страница создания бизнеса
  if (showCreateBusiness) {
    return (
      <CreateBusinessPage
        onBack={() => {
          setShowCreateBusiness(false);
          setCurrentPage('dashboard');
        }}
        onCreateBusiness={handleCreateBusiness}
        loading={loading}
        error={error}
        successMessage={successMessage}
        onClearMessages={() => {
          setError('');
          setSuccessMessage('');
        }}
      />
    );
  }

  // Главное приложение (авторизован)
  return (
    <div className="app">
      {/* Глобальные уведомления */}
      {error && (
        <div className="global-notification error">
          <span>{error}</span>
          <button onClick={() => setError('')} className="notification-close">×</button>
        </div>
      )}
      
      {successMessage && (
        <div className="global-notification success">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="notification-close">×</button>
        </div>
      )}
      
      <Header
        currentPage={currentPage}
        onNavigate={(page) => {
          if (page === 'add-business') {
            setShowCreateBusiness(true);
          } else if (page === 'create-post') { 
            setCurrentPage('create-post');
          } else {
            setCurrentPage(page);
          }
        }}
        businesses={businesses}
        selectedBusiness={selectedBusiness}
        onSelectBusiness={(businessId) => {
          setSelectedBusiness(businessId);
          localStorage.setItem('selected_business_id', businessId);
        }}
        onLogout={handleLogout}
        user={user}
      />
      
      <main className="main-content">
        {currentPage === 'dashboard' && (
          <DashboardPage
            onNavigate={setCurrentPage}
            user={user}
            businesses={businesses}
            onBusinessesUpdate={handleBusinessesUpdate}
          />
        )}
        {currentPage === 'business-management' && (
          <BusinessManagementPage
            onBack={() => setCurrentPage('dashboard')}
            onNavigate={(page) => {
              if (page === 'add-business') {
                setShowCreateBusiness(true);
              } else {
                setCurrentPage(page);
              }
            }}
            user={user}
            businesses={businesses}
            onBusinessesUpdate={handleBusinessesUpdate}
          />
        )}
        {currentPage === 'create-post' && (
          <GeneratePostPage
            onBack={() => setCurrentPage('dashboard')}
            onNavigate={(page) => {
              if (page === 'add-business') {
                setShowCreateBusiness(true);
              } else {
                setCurrentPage(page);
              }
            }}
            user={user}
            businesses={businesses}
            selectedBusiness={selectedBusiness}
          />
        )}
        {currentPage === 'telegram-analysis' && (
          <TelegramAnalysisPage
            onBack={() => setCurrentPage('dashboard')}
            onNavigate={setCurrentPage}
            user={user}
            businesses={businesses}
            selectedBusiness={selectedBusiness}
          />
        )}
        {currentPage === 'content-plan' && (
          <GenerateContentPlanPage
            onBack={() => setCurrentPage('dashboard')}
            onNavigate={(page) => {
              if (page === 'add-business') {
                setShowCreateBusiness(true);
              } else {
                setCurrentPage(page);
              }
            }}
            user={user}
            businesses={businesses}
            selectedBusiness={selectedBusiness}
          />
        )}
        {/* Другие страницы будут добавлены позже */}
      </main>
    </div>
  );
}