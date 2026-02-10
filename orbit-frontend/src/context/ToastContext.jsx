import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem = ({ id, type, message, duration, onDismiss }) => {
  const timeoutRef = useRef(null);

  React.useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [id, duration, onDismiss]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 border-emerald-500 text-white';
      case 'error':
        return 'bg-red-600 border-red-500 text-white';
      case 'warning':
        return 'bg-amber-500 border-amber-400 text-white';
      default:
        return 'bg-slate-800 border-slate-700 text-white';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-100" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-100" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-100" />;
      default:
        return <Info className="w-5 h-5 text-blue-100" />;
    }
  };

  return (
    <div
      className={`
        pointer-events-auto flex w-full max-w-sm rounded-lg border shadow-lg p-4 mb-3 
        transition-all duration-300 ease-in-out transform translate-x-0 opacity-100
        ${getStyles()}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3 w-full">
        <div className="flex-shrink-0 pt-0.5">{getIcon()}</div>
        <div className="flex-1 text-sm font-medium">{message}</div>
        <button
          onClick={() => onDismiss(id)}
          className="flex-shrink-0 ml-2 rounded-md hover:bg-white/20 p-1 transition-colors"
        >
          <X className="w-4 h-4 opacity-80" />
        </button>
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 pointer-events-none p-4">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              {...toast}
              onDismiss={removeToast}
            />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
