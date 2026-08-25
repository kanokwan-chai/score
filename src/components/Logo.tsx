// src/components/Logo.tsx
import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
}

export const LogoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => {
  return (
    <div className={className} style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 4px 6px rgba(79, 70, 229, 0.2))' }}
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Modern Shield representing evaluation & stability */}
        <path 
          d="M 50 15 C 68 15, 82 20, 82 35 C 82 62, 68 82, 50 90 C 32 82, 18 62, 18 35 C 18 20, 32 15, 50 15 Z" 
          fill="none" 
          stroke="url(#shieldGrad)" 
          strokeWidth="6" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Shield Accent */}
        <path 
          d="M 50 23 C 62 23, 74 27, 74 37 C 74 57, 62 74, 50 81 C 38 81, 26 57, 26 37 C 26 27, 38 23, 50 23 Z" 
          fill="url(#shieldGrad)" 
          opacity="0.08"
        />

        {/* Rising Progress Bar Chart showing student growth */}
        <rect x="36" y="52" width="6" height="16" rx="2" fill="url(#shieldGrad)" />
        <rect x="47" y="42" width="6" height="26" rx="2" fill="url(#shieldGrad)" />
        <rect x="58" y="32" width="6" height="36" rx="2" fill="url(#shieldGrad)" />

        {/* Sparkle star of success */}
        <path 
          d="M 68 22 L 70 26 L 74 27 L 71 30 L 72 34 L 68 32 L 64 34 L 65 30 L 62 27 L 66 26 Z" 
          fill="#FBBF24" 
          filter="url(#logoGlow)" 
        />

        {/* Graduation Cap at the top center */}
        <path 
          d="M 50 6 L 75 16 L 50 26 L 25 16 Z" 
          fill="url(#capGrad)" 
          stroke="#ffffff"
          strokeWidth="1.5"
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
        />
        <path 
          d="M 36 20.5 L 36 29 C 36 34.5, 64 34.5, 64 29 L 64 20.5" 
          fill="none" 
          stroke="url(#capGrad)" 
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        
        {/* Tassel */}
        <path 
          d="M 64 16 L 75 22 L 75 30" 
          fill="none" 
          stroke="#FBBF24" 
          strokeWidth="2" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="75" cy="30" r="1.8" fill="#FBBF24" />
      </svg>
    </div>
  );
};

export const Logo: React.FC<LogoProps> = ({ 
  size = 32, 
  showText = true, 
  className = '',
  title = 'Progress Tracker',
  subtitle = 'ระบบจัดการคะแนนนักเรียน'
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className={className}>
      <LogoIcon size={size} />
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, var(--text-main) 0%, var(--primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
            {title}
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-sub)', letterSpacing: '0.02em' }}>
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};
export default Logo;
