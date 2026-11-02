import React, { useState } from 'react';
import './AuthPage.css';
import { Loader } from 'lucide-react';

const AuthPage = ({ 
  onLogin, 
  onRegister, 
  onForgotPassword, 
  mode, 
  onModeChange, 
  loading,
  error,
  successMessage,
  onClearMessages
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [localError, setLocalError] = useState('');

  // Функция для получения сохраненных пользователей (для отладки)
  const getRegisteredUsers = () => {
    try {
      return JSON.parse(localStorage.getItem('registered_users') || '[]');
    } catch {
      return [];
    }
  };

  // Очистка сообщений при переключении режима
  const handleModeChange = (newMode) => {
    onClearMessages?.();
    setLocalError('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    onModeChange(newMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    onClearMessages?.();
    setLocalError('');
    
    // Валидация
    if (!formData.email || !formData.password) {
      setLocalError('Заполните все обязательные поля');
      return;
    }
    
    if (mode === 'signup') {
      if (!formData.name) {
        setLocalError('Введите ваше полное имя');
        return;
      }
      if (formData.password.length < 5) {
        setLocalError('Пароль должен содержать минимум 5 символов');
        return;
      }
      
      // Проверка требований к паролю
      if (!/\d/.test(formData.password)) {
        setLocalError('Пароль должен содержать хотя бы одну цифру');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setLocalError('Пароли не совпадают');
        return;
      }
    }

    try {
      if (mode === 'login') {
        await onLogin(formData.email, formData.password);
      } else {
        await onRegister({
          name: formData.name,
          username: formData.name || formData.email.split('@')[0], // Используем name или часть email до @
          email: formData.email,
          password: formData.password,
        });
      }
    } catch (err) {
      setLocalError(err.message || 'Произошла ошибка');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (localError) setLocalError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {(error || localError) && (
            <div className="auth-error">
              <span>{error || localError}</span>
              <button onClick={() => { setLocalError(''); onClearMessages?.(); }} className="error-close">×</button>
            </div>
          )}

          {successMessage && (
            <div className="auth-success">
              <span>{successMessage}</span>
              <button onClick={onClearMessages} className="success-close">×</button>
            </div>
          )}

          <div className="auth-header">
            <h1 className="auth-logo">ContentAI</h1>
            <p className="auth-subtitle">Платформа генерации контента на основе ИИ</p>
          </div>

          <div className="auth-tabs">
            <button
              onClick={() => handleModeChange('login')}
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              disabled={loading}
            >
              Вход
            </button>
            <button
              onClick={() => handleModeChange('signup')}
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              disabled={loading}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <> 
                <div className="form-group">
                  <label className="form-label">Полное имя *</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Иван Иванов"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                    disabled={loading}
                  />
                </div>
              </>
            )}
            
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                type="email"
                name="email"
                placeholder="ваш@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className="input-field"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Пароль *</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                className="input-field"
                required
                disabled={loading}
              />
              {mode === 'signup' && (
                <div className="password-hint">
                  Минимум 5 символов, хотя бы одна цифра
                </div>
              )}
            </div>

            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Подтверждение пароля *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                  disabled={loading}
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="form-options">
                <button 
                  type="button"
                  className="forgot-password"
                  onClick={onForgotPassword}
                  disabled={loading}
                >
                  Забыли пароль?
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="spinner" size={20} />
                  {mode === 'login' ? 'Вход...' : 'Регистрация...'}
                </>
              ) : (
                mode === 'login' ? 'Войти' : 'Создать аккаунт'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;