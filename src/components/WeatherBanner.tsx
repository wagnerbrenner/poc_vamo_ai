import React, { useState, useEffect } from 'react';
import { 
  CloudRain, Sun, Cloud, Thermometer, Wind, 
  ArrowRight, ShieldCheck, Sparkles, X, Umbrella 
} from 'lucide-react';
import { weatherService, WeatherData } from '../services/weatherService';
import { useLocation } from '../context/LocationContext';
import { sound } from '../utils/audioHaptics';

interface WeatherBannerProps {
  onApplyWeatherSuggestion: (vibe: string, filterOutdoors: boolean) => void;
  isOutdoorFiltered?: boolean;
}

export const WeatherBanner: React.FC<WeatherBannerProps> = ({
  onApplyWeatherSuggestion,
  isOutdoorFiltered = false,
}) => {
  const { userCoords, currentCity } = useLocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchWeather = async () => {
      try {
        const data = await weatherService.getCurrentWeather(userCoords.lat, userCoords.lng);
        if (!isCancelled) {
          setWeather(data);
        }
      } catch (err) {
        console.warn('Could not fetch weather data:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchWeather();
    return () => {
      isCancelled = true;
    };
  }, [userCoords.lat, userCoords.lng]);

  if (dismissed || loading || !weather) return null;

  const handleAction = () => {
    sound.tap();
    onApplyWeatherSuggestion(weather.suggestedVibe, weather.filterOutdoors);
  };

  return (
    <div
      className={`w-full rounded-2xl p-3 sm:p-3.5 mb-3 transition-all relative overflow-hidden border shadow-lg ${
        weather.isRaining
          ? 'bg-gradient-to-r from-blue-950/80 via-[#1b153d] to-indigo-950/80 border-blue-400/40 text-blue-100 shadow-blue-900/20'
          : weather.isHot
          ? 'bg-gradient-to-r from-amber-950/70 via-[#1b153d] to-orange-950/70 border-amber-400/30 text-amber-100 shadow-amber-900/20'
          : 'bg-gradient-to-r from-[#21164e]/90 via-[#1b153d] to-[#14102E] border-white/15 text-white/95'
      }`}
    >
      {/* Background Glow */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-current opacity-10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              weather.isRaining
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                : weather.isHot
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                : 'bg-[#D4FF3A]/20 text-[#D4FF3A] border border-[#D4FF3A]/30'
            }`}
          >
            {weather.isRaining ? (
              <CloudRain className="w-4 h-4 animate-bounce" />
            ) : weather.isHot ? (
              <Sun className="w-4 h-4 animate-spin-slow" />
            ) : (
              <Cloud className="w-4 h-4" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-unbounded font-black text-xs text-white">
                Previsão do Tempo · {weather.temp}°C
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  weather.isRaining
                    ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40'
                    : 'bg-white/10 text-white/80'
                }`}
              >
                {weather.conditionLabel}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-white/85 mt-1 font-sans">
              {weather.suggestion}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.tap();
            setDismissed(true);
          }}
          className="text-white/40 hover:text-white p-1 rounded-full shrink-0"
          title="Fechar aviso do tempo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Button */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[10px] text-white/60">
          {weather.isRaining ? (
            <>
              <Umbrella className="w-3 h-3 text-blue-300" />
              <span>Locais ao ar livre desaconselhados</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-[#D4FF3A]" />
              <span>Curadoria ajustada ao clima</span>
            </>
          )}
        </div>

        <button
          onClick={handleAction}
          className={`text-[11px] font-unbounded font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer ${
            isOutdoorFiltered
              ? 'bg-emerald-500 text-white'
              : weather.isRaining
              ? 'bg-blue-400 text-[#14102E] hover:bg-blue-300'
              : 'bg-[#D4FF3A] text-[#14102E] hover:bg-[#c6f32e]'
          }`}
        >
          <span>
            {isOutdoorFiltered
              ? '✓ Filtro de chuva ativo'
              : weather.isRaining
              ? 'Filtrar locais cobertos'
              : 'Ver sugestão climática'}
          </span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
