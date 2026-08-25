// src/context/AppContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'danger' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface AppContextType {
  showToast: (message: string, type: ToastType) => void;
  showConfirm: (options: ConfirmOptions) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load theme from localStorage on client mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    showToast(`สลับใช้งานโหมด${nextTheme === 'dark' ? 'กลางคืน' : 'กลางวัน'}สำเร็จ`, 'info');
  };

  const showToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showConfirm = (options: ConfirmOptions) => {
    setConfirm(options);
  };

  const handleConfirmClose = (agreed: boolean) => {
    if (agreed && confirm) {
      confirm.onConfirm();
    }
    setConfirm(null);
  };

  return (
    <AppContext.Provider value={{ showToast, showConfirm, theme, toggleTheme }}>
      {children}
      
      {/* Toast Container */}
      <div style={toastContainerStyle}>
        {toasts.map(toast => (
          <div key={toast.id} className="glass-container animate-scale-in" style={{
            ...toastStyle,
            borderColor: getToastColor(toast.type),
            borderLeft: `5px solid ${getToastColor(toast.type)}`
          }}>
            <span style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
              {getToastIcon(toast.type)}
            </span>
            <span style={toastTextStyle}>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} style={closeButtonStyle}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirm && (
        <div style={modalOverlayStyle} className="animate-fade-in">
          <div className="glass-card animate-scale-in" style={confirmCardStyle}>
            <h3 style={confirmTitleStyle}>{confirm.title}</h3>
            <p style={confirmMessageStyle}>{confirm.message}</p>
            <div style={confirmActionsStyle}>
              <button 
                onClick={() => handleConfirmClose(false)} 
                style={cancelButtonStyle}
              >
                {confirm.cancelText || 'ยกเลิก'}
              </button>
              <button 
                onClick={() => handleConfirmClose(true)} 
                style={confirmButtonStyle}
              >
                {confirm.confirmText || 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Helpers
function getToastColor(type: ToastType): string {
  switch (type) {
    case 'success': return 'var(--success)';
    case 'warning': return 'var(--warning)';
    case 'danger': return 'var(--danger)';
    case 'info': return 'var(--info)';
  }
}

function getToastIcon(type: ToastType) {
  const size = 20;
  switch (type) {
    case 'success': return <CheckCircle size={size} color="var(--success)" />;
    case 'warning': return <AlertTriangle size={size} color="var(--warning)" />;
    case 'danger': return <XCircle size={size} color="var(--danger)" />;
    case 'info': return <Info size={size} color="var(--info)" />;
  }
}

// Inline Styles (to avoid CSS modules coupling during context imports)
const toastContainerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  zIndex: 9999,
  maxWidth: '400px',
  width: 'calc(100% - 48px)'
};

const toastStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '16px',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--glass-shadow)',
  color: 'var(--text-main)',
  position: 'relative'
};

const toastTextStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  marginRight: '24px',
  fontWeight: 400
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-sub)',
  position: 'absolute',
  right: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9998,
  padding: '16px'
};

const confirmCardStyle: React.CSSProperties = {
  maxWidth: '420px',
  width: '100%',
  textAlign: 'center',
  padding: '30px'
};

const confirmTitleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  marginBottom: '12px',
  color: 'var(--text-main)'
};

const confirmMessageStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'var(--text-sub)',
  marginBottom: '24px',
  lineHeight: 1.5
};

const confirmActionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '12px'
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--glass-border)',
  background: 'rgba(255, 255, 255, 0.1)',
  color: 'var(--text-main)',
  fontSize: '0.9rem',
  fontWeight: 500
};

const confirmButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  background: 'var(--primary)',
  color: '#FFFFFF',
  fontSize: '0.9rem',
  fontWeight: 500,
  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
};
