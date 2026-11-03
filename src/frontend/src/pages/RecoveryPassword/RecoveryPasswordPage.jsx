import React, { useState } from 'react';
import './RecoveryPasswordPage.css';
import { ArrowLeft, Mail, CheckCircle, Loader } from 'lucide-react';

const RecoveryPasswordPage = ({ 
  onBack, 
  onForgotPassword,
  onConfirmResetCode,
  onResetPassword,
  loading, 
  error, 
  successMessage,
  onClearMessages 
}) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const handleSendCode = async (e) => {
    e.preventDefault();
    onClearMessages?.();
    setLocalError('');
    
    if (!email) {
      setLocalError('Введите email');
      return;
    }
    
    try {
      const result = await onForgotPassword(email);
      if (result?.success) {
        setResetEmail(email); // Сохраняем email для которого делаем сброс
        // Сохраняем reset_pass_token в localStorage
        if (result.data?.reset_pass_token) {
          localStorage.setItem('reset_pass_token', result.data.reset_pass_token);
          console.log('✅ [RecoveryPassword] Токен сохранен в localStorage:', result.data.reset_pass_token.substring(0, 20) + '...');
        } else {
          console.error('❌ [RecoveryPassword] Токен не получен в ответе:', result);
          setLocalError('Токен сброса пароля не получен. Попробуйте еще раз.');
          return;
        }
        setStep(2);
      } else {
        setLocalError('Не удалось отправить код. Попробуйте еще раз.');
      }
    } catch (err) {
      console.error('❌ [RecoveryPassword] Ошибка отправки кода:', err);
      setLocalError(err.message || 'Ошибка отправки кода');
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    onClearMessages?.();
    setLocalError('');
    
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setLocalError('Введите полный 6-значный код');
      return;
    }
    
    try {
      // Получаем reset_pass_token из localStorage (сохраняется при отправке кода)
      const resetPassToken = localStorage.getItem('reset_pass_token');
      if (!resetPassToken) {
        console.error('❌ [RecoveryPassword] Токен не найден в localStorage');
        setLocalError('Токен сброса пароля не найден. Пожалуйста, запросите код заново.');
        setStep(1);
        return;
      }
      
      console.log('✅ [RecoveryPassword] Токен найден в localStorage:', resetPassToken.substring(0, 20) + '...');
      console.log('📤 [RecoveryPassword] Отправка кода подтверждения:', fullCode);
      
      // Вызываем API для подтверждения кода через App.jsx
      // Для этого нужно передать функцию из App.jsx
      if (onConfirmResetCode) {
        const result = await onConfirmResetCode(fullCode, resetPassToken);
        if (result?.success) {
          console.log('✅ [RecoveryPassword] Код подтвержден успешно');
          setStep(3);
        } else {
          console.error('❌ [RecoveryPassword] Код не подтвержден:', result?.error);
          setLocalError(result?.error || 'Неверный код подтверждения');
        }
      } else {
        // Fallback: если функция не передана, используем прямую проверку через authService
        const { authService } = await import('../../api/authService');
        const result = await authService.confirmPasswordResetCode(fullCode, resetPassToken);
        if (result.success && result.data.confirmed) {
          console.log('✅ [RecoveryPassword] Код подтвержден успешно (fallback)');
          setStep(3);
        } else {
          console.error('❌ [RecoveryPassword] Код не подтвержден (fallback)');
          setLocalError('Неверный код подтверждения');
        }
      }
    } catch (err) {
      console.error('❌ [RecoveryPassword] Ошибка при проверке кода:', err);
      setLocalError(err.message || 'Ошибка при проверке кода');
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    onClearMessages?.();
    setLocalError('');
    
    if (!newPassword || !confirmPassword) {
      setLocalError('Заполните все поля');
      return;
    }
    
    if (newPassword.length < 5) {
      setLocalError('Пароль должен содержать минимум 5 символов');
      return;
    }
    
    // Проверяем требования к паролю
    if (!/\d/.test(newPassword)) {
      setLocalError('Пароль должен содержать хотя бы одну цифру');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setLocalError('Пароли не совпадают');
      return;
    }
    
    try {
      // Получаем reset_pass_token из localStorage
      const resetPassToken = localStorage.getItem('reset_pass_token');
      if (!resetPassToken) {
        setLocalError('Токен сброса пароля не найден. Пожалуйста, начните процедуру заново.');
        setStep(1);
        return;
      }
      
      // Вызываем API для сброса пароля через App.jsx или напрямую
      if (onResetPassword) {
        const result = await onResetPassword(resetPassToken, newPassword);
        if (result?.success) {
          // Очищаем токен из localStorage
          localStorage.removeItem('reset_pass_token');
          setStep(4);
        } else {
          setLocalError(result?.error || 'Ошибка при сбросе пароля');
        }
      } else {
        // Fallback: если функция не передана, используем прямую проверку через authService
        const { authService } = await import('../../api/authService');
        const result = await authService.resetPassword(resetPassToken, newPassword);
        if (result.success && result.data.success) {
          localStorage.removeItem('reset_pass_token');
          setStep(4);
        } else {
          setLocalError(result.data?.message || 'Ошибка при сбросе пароля');
        }
      }
    } catch (err) {
      setLocalError(err.message || 'Ошибка при сбросе пароля');
    }
  };

  const handleCodeInput = (index, value) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    
    // Разрешаем только цифры
    if (value && !/^\d+$/.test(value)) {
      return;
    }
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    // Автопереход к следующему полю
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  // Функция для получения сохраненных пользователей (для отладки)
  const getRegisteredUsers = () => {
    try {
      return JSON.parse(localStorage.getItem('registered_users') || '[]');
    } catch {
      return [];
    }
  };

  return (
    <div className="recovery-page">
      <div className="recovery-container">
        <button 
          onClick={onBack} 
          className="back-button"
          disabled={loading}
        >
          <ArrowLeft size={20} />
          Назад ко входу
        </button>

        <div className="recovery-card">
          <div className="recovery-header">
            <div className="recovery-icon">
              <Mail size={32} />
            </div>
            <h1>Восстановление пароля</h1>
            <p className="recovery-subtitle">
              {step === 1 && "Введите ваш email, чтобы получить код подтверждения"}
              {step === 2 && "Введите 6-значный код, отправленный на ваш email"}
              {step === 3 && "Создайте ваш новый пароль"}
              {step === 4 && "Пароль успешно сброшен!"}
            </p>
          </div>

          {/* Сообщения */}
          {(error || localError) && (
            <div className="recovery-error">
              <span>{error || localError}</span>
              <button onClick={() => { setLocalError(''); onClearMessages?.(); }} className="error-close">×</button>
            </div>
          )}

          {successMessage && (
            <div className="recovery-success">
              <CheckCircle size={16} />
              <span>{successMessage}</span>
              <button onClick={onClearMessages} className="success-close">×</button>
            </div>
          )}

          <div className="recovery-progress">
            <div className="progress-steps">
              <div className={`step ${step >= 1 ? 'active' : ''}`}>
                <div className="step-number">1</div>
                <span className="step-label">Email</span>
              </div>
              <div className="progress-line"></div>
              <div className={`step ${step >= 2 ? 'active' : ''}`}>
                <div className="step-number">2</div>
                <span className="step-label">Код</span>
              </div>
              <div className="progress-line"></div>
              <div className={`step ${step >= 3 ? 'active' : ''}`}>
                <div className="step-number">3</div>
                <span className="step-label">Пароль</span>
              </div>
              <div className="progress-line"></div>
              <div className={`step ${step >= 4 ? 'active' : ''}`}>
                <div className="step-number">4</div>
                <span className="step-label">Готово</span>
              </div>
            </div>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendCode} className="recovery-form">
              <div className="form-group">
                <label className="form-label">Адрес электронной почты</label>
                <input
                  type="email"
                  placeholder="ваш@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  required
                  disabled={loading}
                />
              </div>
              <button 
                type="submit" 
                className="recovery-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader className="spinner" size={20} />
                    Отправка...
                  </>
                ) : (
                  'Отправить код подтверждения'
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="recovery-form">
              <div className="form-group">
                <label className="form-label">Код подтверждения</label>
                <div className="code-inputs">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleCodeInput(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`code-input ${digit ? 'filled' : ''}`}
                      disabled={loading}
                    />
                  ))}
                </div>
                <p className="code-hint">
                  Код отправлен на: <strong>{resetEmail}</strong>
                </p>
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="resend-btn"
                  onClick={handleSendCode}
                  disabled={loading}
                >
                  Отправить код повторно
                </button>
                <button 
                  type="submit" 
                  className="recovery-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader className="spinner" size={20} />
                      Проверка...
                    </>
                  ) : (
                    'Подтвердить код'
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleReset} className="recovery-form">
              <div className="form-group">
                <label className="form-label">Новый пароль</label>
                <input
                  type="password"
                  placeholder="Введите новый пароль"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  required
                  disabled={loading}
                />
                <div className="password-strength">
                  <div 
                    className={`strength-bar ${
                      newPassword.length === 0 ? 'empty' :
                      newPassword.length < 5 ? 'weak' :
                      newPassword.length < 8 ? 'medium' : 'strong'
                    }`}
                  />
                  <span className="strength-text">
                    {newPassword.length === 0 ? 'Введите пароль' :
                     newPassword.length < 5 ? 'Слабый' :
                     newPassword.length < 8 ? 'Средний' : 'Сильный'}
                  </span>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Подтвердите новый пароль</label>
                <input
                  type="password"
                  placeholder="Повторите новый пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`input-field ${
                    confirmPassword && newPassword !== confirmPassword ? 'error' : ''
                  }`}
                  required
                  disabled={loading}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <div className="password-error">Пароли не совпадают</div>
                )}
              </div>
              
              <div className="password-requirements">
                <p className="requirements-title">Требования к паролю:</p>
                <ul className="requirements-list">
                  <li className={`requirement ${newPassword.length >= 5 ? 'met' : ''}`}>
                    Минимум 5 символов
                  </li>
                  <li className={`requirement ${/\d/.test(newPassword) ? 'met' : ''}`}>
                    Хотя бы одна цифра
                  </li>
                </ul>
              </div>
              
              <button 
                type="submit" 
                className="recovery-submit-btn"
                disabled={loading || newPassword !== confirmPassword || newPassword.length < 5 || !/\d/.test(newPassword)}
              >
                {loading ? (
                  <>
                    <Loader className="spinner" size={20} />
                    Сохранение...
                  </>
                ) : (
                  'Установить новый пароль'
                )}
              </button>
            </form>
          )}

          {step === 4 && (
            <div className="success-screen">
              <div className="success-icon">
                <CheckCircle size={50} />
              </div>
              <h2 className="success-title">Пароль успешно изменен!</h2>
              <p className="success-message">
                Ваш пароль был успешно сброшен. Теперь вы можете войти в систему с новым паролем.
              </p>
              <div className="success-actions">
                <button 
                  onClick={onBack} 
                  className="success-btn primary"
                >
                  Войти в систему
                </button>
              </div>
            </div>
          )}

          <div className="recovery-footer">
            <p className="footer-text">
              Возникли проблемы?{' '}
              <button 
                className="support-link" 
                onClick={() => window.open('mailto:support@contentai.com')}
              >
                Свяжитесь с поддержкой
              </button>
            </p>
            
            {/* Отладочная информация (можно удалить в продакшене) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="debug-info" style={{marginTop: '10px', fontSize: '12px', color: '#666'}}>
                <p>Зарегистрированные пользователи: {getRegisteredUsers().length}</p>
                <p>Email для сброса: {resetEmail}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoveryPasswordPage;