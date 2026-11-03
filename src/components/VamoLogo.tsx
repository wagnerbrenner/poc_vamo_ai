import React from 'react';

interface VamoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const VamoLogo: React.FC<VamoLogoProps> = ({ 
  size = 'md', 
  showSubtitle = false,
  className = '' 
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Pino + Play Symbol (Page 07 do Manual de Identidade Visual) */}
      <div className={`relative ${iconSizes[size]} shrink-0 drop-shadow-[0_4px_12px_rgba(255,61,127,0.35)]`}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="vamoPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6A4CFF" />
              <stop offset="50%" stopColor="#A238FF" />
              <stop offset="100%" stopColor="#FF3D7F" />
            </linearGradient>
            <filter id="glowPin" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#FF3D7F" floodOpacity="0.4" />
            </filter>
          </defs>
          
          {/* Base Pin Shape */}
          <path
            d="M50 94C50 94 84 62 84 40C84 21.2223 68.7777 6 50 6C31.2223 6 16 21.2223 16 40C16 62 50 94 50 94Z"
            fill="url(#vamoPinGrad)"
          />
          
          {/* Inner Play Triangle in Lima Agora (#D4FF3A) */}
          <path
            d="M42 26L68 40L42 54V26Z"
            fill="#D4FF3A"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className={`font-unbounded font-black tracking-tight leading-none text-white ${textSizes[size]}`}>
          vamo<span className="text-[#FF3D7F]">.</span><span className="text-[#D4FF3A]">AI</span>
        </div>
        {showSubtitle && (
          <span className="text-[11px] font-sans font-medium text-white/70 tracking-wide mt-1">
            O melhor da cidade, pra agora.
          </span>
        )}
      </div>
    </div>
  );
};
