import React from 'react';
import { motion } from 'motion/react';
import { VamoLogo } from './VamoLogo';

export const SplashScreen: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] bg-[#14102E] flex flex-col items-center justify-center p-6 select-none overflow-hidden"
    >
      {/* Ambient background glows */}
      <div className="absolute w-80 h-80 rounded-full bg-[#6A4CFF]/20 blur-3xl pointer-events-none -top-10 -left-10 animate-pulse" />
      <div className="absolute w-80 h-80 rounded-full bg-[#FF3D7F]/20 blur-3xl pointer-events-none -bottom-10 -right-10 animate-pulse" />

      {/* Centered Logo with Entrance and Float Animation */}
      <div className="relative flex flex-col items-center z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Subtle glowing ring behind the logo */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#6A4CFF]/30 via-[#FF3D7F]/30 to-[#D4FF3A]/30 blur-xl opacity-75 animate-pulse" />
          
          <VamoLogo size="xl" showSubtitle={true} className="relative z-10" />
        </motion.div>

        {/* Loading Indicator & Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          {/* Fluid Lime Agora progress line */}
          <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden relative">
            <motion.div
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                ease: 'easeInOut',
              }}
              className="w-1/2 h-full bg-gradient-to-r from-[#6A4CFF] via-[#D4FF3A] to-[#FF3D7F] rounded-full"
            />
          </div>

          <span className="text-[11px] font-sans font-medium text-white/50 tracking-wider uppercase">
            Carregando a vibe da cidade...
          </span>
        </motion.div>
      </div>

      {/* Footer Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute bottom-8 text-center text-xs text-white/40 font-sans"
      >
        <span>vamo.AI © 2026 · O melhor da cidade, pra agora.</span>
      </motion.div>
    </motion.div>
  );
};
