import React from 'react';

interface PhoneFrameProps {
  children: React.ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-[#0b0818] flex justify-center items-stretch transition-colors duration-700">
      {/* Mobile-First Responsive App Container: 100% full width and screen on mobile, centered max-w-md on desktop */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[100dvh] bg-[#14102E] flex flex-col overflow-hidden relative sm:border-x sm:border-white/10 sm:shadow-[0_0_50px_rgba(106,76,255,0.25)]">
        {children}
      </div>
    </div>
  );
};
