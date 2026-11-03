import React, { useEffect, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Подтверждение',
  message = 'Вы уверены?',
  confirmText = 'Да',
  cancelText = 'Отмена',
  type = 'warning' // 'warning', 'danger', 'info'
}) => {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="confirm-modal-overlay" onClick={handleBackdropClick}>
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <button 
          className="confirm-modal-close" 
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>
        
        <div className={`confirm-modal-icon ${type}`}>
          <AlertTriangle size={32} />
        </div>
        
        <h3 id="confirm-title" className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        
        <div className="confirm-modal-actions">
          <button 
            className="confirm-modal-btn cancel" 
            onClick={onClose}
            tabIndex={0}
          >
            {cancelText}
          </button>
          <button 
            className={`confirm-modal-btn confirm ${type}`}
            onClick={handleConfirm}
            tabIndex={0}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
