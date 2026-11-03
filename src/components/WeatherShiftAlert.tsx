import React from 'react';
import { CloudRain, Thermometer, X, ArrowRight, Sparkles, Umbrella } from 'lucide-react';
import { WeatherNotificationPayload } from '../services/fcmNotificationService';
import { sound } from '../utils/audioHaptics';

interface WeatherShiftAlertProps {
  notification: WeatherNotificationPayload | null;
  onDismiss: () => void;
  onAdjustOuting: () => void;
}

export const WeatherShiftAlert: React.FC<WeatherShiftAlertProps> = ({
  notification,
  onDismiss,
  onAdjustOuting,
}) => {
  if (!notification) return null;

  return (
    <div className="fixed top-14 left-4 right-4 z-50 max-w-sm mx-auto animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-950 via-[#1b153d] to-indigo-950 border border-blue-400/50 shadow-[0_10px_30px_rgba(30,58,138,0.5)] text-white backdrop-blur-xl relative overflow-hidden">
        {/* Glowing pulse ring */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/25 border border-blue-400/40 text-blue-300 flex items-center justify-center shrink-0 shadow-md">
              {notification.isRaining ? (
                <CloudRain className="w-5 h-5 animate-bounce" />
              ) : (
                <Thermometer className="w-5 h-5 text-amber-300" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-unbounded font-black tracking-wider text-[#D4FF3A] uppercase">
                  Alerta Climático Ativo
                </span>
                {notification.temp && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white/80">
                    {notification.temp}°C
                  </span>
                )}
              </div>

              <h4 className="font-unbounded font-bold text-xs text-white mt-0.5 leading-snug">
                {notification.title}
              </h4>

              <p className="text-[11px] text-white/80 font-sans mt-1 leading-relaxed">
                {notification.body}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.tap();
              onDismiss();
            }}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white shrink-0 transition-colors"
            title="Fechar alerta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action button */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[10px] text-white/60">
            <Umbrella className="w-3 h-3 text-blue-300" />
            <span>Filtro de locais cobertos</span>
          </div>

          <button
            onClick={() => {
              sound.tap();
              onAdjustOuting();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#D4FF3A] hover:bg-[#c6f32e] text-[#14102E] font-unbounded font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <span>Ver novo lugar</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
