import React, { useState, useEffect, useRef } from 'react';
import './EmailConfirmationPage.css';
import { Mail, CheckCircle, ArrowLeft, Loader, AlertCircle } from 'lucide-react';

const EmailConfirmationPage = ({ 
  onBack, 
  onSendCode, 
  onConfirmCode, 
  loading, 
  error,
  successMessage,
  onClearMessages
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const [localError, setLocalError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isRegistrationMode, setIsRegistrationMode] = useState(false);

  const inputRefs = useRef([]);

  // Проверяем при монтировании - если есть email_confirm_token и pending_email,
  // значит это регистрация и код уже отправлен
  useEffect(() => {
    const emailToken = localStorage.getItem('email_confirm_token');
    const pendingEmail = localStorage.getItem('pending_email');
    
    if (emailToken && pendingEmail) {
      console.log('✅ [EmailConfirmationPage] Registration mode detected - code already sent');
      setIsRegistrationMode(true);
      setEmailSent(true);
      setSavedEmail(pendingEmail);
      setEmailInput(pendingEmail);
      setCanResend(false);
      setResendTimer(60); // Таймер для повторной отправки
    }
  }, []);

  useEffect(() => {
    // Таймер для повторной отправки
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Сброс ошибки при изменении email
  useEffect(() => {
    if (emailError && emailInput) {
      setEmailError('');
    }
  }, [emailInput, emailError]);

  // Обработка глобальной ошибки от родителя
  useEffect(() => {
    if (error) {
      if (emailSent) {
        setLocalError(error);
      } else {
        setEmailError(error);
      }
    }
  }, [error, emailSent]);

  const handleSendCode = async () => {
    onClearMessages?.();
    setLocalError('');
    setEmailError('');
    
    if (!emailInput || !emailInput.includes('@')) {
      setEmailError('Введите корректный email адрес');
      return;
    }
    
    setCanResend(false);
    setResendTimer(60);
    
    try {
      const result = await onSendCode(emailInput);
      
      if (result && result.success) {
        setEmailSent(true);
        setSavedEmail(emailInput);
        setEmailError('');
      } else {
        setEmailError('Пользователь с таким email не найден');
        setCanResend(true);
        setResendTimer(0);
        clearForm();
      }
    } catch (err) {
      setEmailError(err.message || 'Ошибка отправки кода');
      setCanResend(true);
      setResendTimer(0);
      clearForm();
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    onClearMessages?.();
    setLocalError('');
    
    // При регистрации emailSent всегда true, но проверяем savedEmail
    if ((!emailSent && !isRegistrationMode) || !savedEmail) {
      setLocalError('Сначала отправьте код подтверждения');
      return;
    }
    
    const fullCode = code.join('');
    console.log('🔍 [EmailConfirmationPage] Code input:', {
      code_array: code,
      full_code: fullCode,
      length: fullCode.length,
      is_valid: /^\d{6}$/.test(fullCode)
    });
    
    if (fullCode.length !== 6) {
      setLocalError('Введите полный 6-значный код');
      return;
    }
    
    if (!/^\d{6}$/.test(fullCode)) {
      setLocalError('Код должен содержать только цифры');
      return;
    }
    
    try {
      console.log('📤 [EmailConfirmationPage] Confirming code:', {
        code: fullCode,
        code_type: typeof fullCode,
        email: savedEmail
      });
      
      // Получаем email_token из localStorage
      const emailToken = localStorage.getItem('email_confirm_token');
      console.log('📤 [EmailConfirmationPage] Email token from localStorage:', {
        has_token: !!emailToken,
        token_prefix: emailToken ? emailToken.substring(0, 20) + '...' : 'missing'
      });
      
      if (!emailToken) {
        throw new Error('Токен подтверждения не найден. Пожалуйста, запросите код заново.');
      }
      
      console.log('📤 [EmailConfirmationPage] Calling onConfirmCode with:', {
        emailToken_length: emailToken.length,
        code: fullCode,
        code_type: typeof fullCode
      });
      
      // ВАЖНО: onConfirmCode ожидает (code, email), поэтому передаем (fullCode, savedEmail)
      const result = await onConfirmCode(fullCode, savedEmail);
      console.log('Confirm result from parent:', result);
      
      if (result && result.success) {
      } else {
        setLocalError('Неверный код подтверждения');
      }
    } catch (err) {
      console.error('Confirm error:', err);
      setLocalError(err.message || 'Ошибка при подтверждении кода');
    }
  };

  const handleCodeInput = (index, value) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    
    if (value && !/^\d+$/.test(value)) {
      return;
    }
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const clearForm = () => {
    setEmailSent(false);
    setSavedEmail('');
    setCode(['', '', '', '', '', '']);
  };

  const resetForm = () => {
    setEmailInput('');
    clearForm();
    setCanResend(true);
    setResendTimer(0);
    setLocalError('');
    setEmailError('');
    onClearMessages?.();
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmailInput(value);
    
    if (emailError || localError) {
      setEmailError('');
      setLocalError('');
      onClearMessages?.();
    }
    
    if (emailSent && value !== savedEmail) {
      clearForm();
    }
  };

  const handleResendCode = async () => {
    onClearMessages?.();
    setLocalError('');
    
    if (!savedEmail) {
      await handleSendCode();
    } else {
      try {
        const result = await onSendCode(savedEmail);
        
        if (result && result.success) {
          setCanResend(false);
          setResendTimer(60);
          setLocalError('');
        } else {
          setLocalError('Ошибка при повторной отправке кода');
          setCanResend(true);
        }
      } catch (err) {
        setLocalError(err.message || 'Ошибка при повторной отправке кода');
        setCanResend(true);
      }
    }
  };

  return (
    <div className="email-confirmation-page">
      <div className="confirmation-container">
        <button 
          onClick={() => {
            resetForm();
            onBack();
          }} 
          className="back-button"
          disabled={loading}
        >
          <ArrowLeft size={20} />
          Назад
        </button>

        <div className="confirmation-card">
          <div className="confirmation-header">
            <div className="confirmation-icon">
              <Mail size={40} />
            </div>
            <h1>Подтверждение Email</h1>
            
            {isRegistrationMode ? (
              <>
                <p className="confirmation-subtitle">
                  Код подтверждения отправлен на ваш email:
                </p>
                <div className="confirmation-email" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  {savedEmail}
                </div>
                <p className="confirmation-hint" style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                  Введите 6-значный код из письма ниже
                </p>
              </>
            ) : (
              <>
                <p className="confirmation-subtitle">
                  Введите email для отправки кода подтверждения:
                </p>
                
                <input
                  type="email"
                  value={emailInput}
                  onChange={handleEmailChange}
                  placeholder="ваш@email.com"
                  className="email-input-field"
                  disabled={loading}
                  style={{
                    borderColor: emailError ? '#dc2626' : '#e2e8f0',
                    background: emailError ? '#fef2f2' : 'white'
                  }}
                />
                
                {/* Ошибка валидации email */}
                {emailError && (
                  <div className="email-error-message">
                    <AlertCircle size={16} />
                    <span>{emailError}</span>
                  </div>
                )}
                
                {!emailSent ? (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    className="send-code-btn"
                    disabled={loading || !emailInput || !!emailError}
                  >
                    {loading ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        <span style={{ marginLeft: '8px' }}>Отправка...</span>
                      </>
                    ) : (
                      'Отправить код подтверждения'
                    )}
                  </button>
                ) : (
                  <div style={{ marginTop: '1rem' }}>
                    <p className="confirmation-hint">
                      <strong>Код отправлен</strong>
                    </p>
                    <div className="confirmation-email">{savedEmail}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Сообщения об ошибках */}
          {localError && (
            <div className="confirmation-error">
              <AlertCircle size={16} />
              <span>{localError}</span>
              <button 
                onClick={() => setLocalError('')} 
                className="error-close"
              >
                ×
              </button>
            </div>
          )}

          {/* Сообщения об успехе */}
          {successMessage && (
            <div className="confirmation-success">
              <CheckCircle size={16} />
              <span>{successMessage}</span>
              <button onClick={onClearMessages} className="success-close">
                ×
              </button>
            </div>
          )}

          {/* Поля для кода показываем сразу при регистрации или после отправки email */}
          {(emailSent || isRegistrationMode) && !emailError && (
            <form onSubmit={handleConfirm} className="confirmation-form">
              <div className="form-group">
                <label className="form-label">6-значный код подтверждения</label>
                <div className="code-inputs">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => inputRefs.current[index] = el}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleCodeInput(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`code-input ${digit ? 'filled' : ''}`}
                      disabled={loading}
                      autoFocus={index === 0 && !code[0]}
                    />
                  ))}
                </div>
                
                <div className="code-actions">
                  <button
                    type="button"
                    className="resend-btn"
                    onClick={handleResendCode}
                    disabled={!canResend || loading}
                  >
                    {canResend ? 'Отправить код повторно' : `Повторно через ${resendTimer}с`}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="confirmation-submit-btn"
                disabled={loading || code.join('').length !== 6}
              >
                {loading ? (
                  <>
                    <Loader className="spinner" size={20} />
                    Проверка...
                  </>
                ) : (
                  'Подтвердить Email'
                )}
              </button>
            </form>
          )}

          <div className="confirmation-info">
            <div className="info-card">
              <h3>Не получили код?</h3>
              <ul>
                <li>Проверьте папку "Спам" или "Рассылки"</li>
                <li>Убедитесь, что ввели правильный email</li>
                <li>Подождите несколько минут, письмо может идти с задержкой</li>
                <li>Если проблема сохраняется, попробуйте другой email</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationPage;