export interface WeatherData {
  temp: number;
  weatherCode: number;
  precipitation: number;
  isDay: boolean;
  isRaining: boolean;
  isCold: boolean;
  isHot: boolean;
  conditionLabel: string;
  badge: string;
  suggestion: string;
  suggestedVibe: 'gastronomia' | 'drinques' | 'agito' | 'relax' | 'estilo' | 'arlivre';
  filterOutdoors: boolean;
}

class WeatherService {
  private cachedData: WeatherData | null = null;
  private cacheTimestamp = 0;
  private cacheTtlMs = 1000 * 60 * 15; // 15 min cache

  async getCurrentWeather(lat = -23.5651, lng = -46.6672): Promise<WeatherData> {
    if (this.cachedData && Date.now() - this.cacheTimestamp < this.cacheTtlMs) {
      return this.cachedData;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,precipitation,relative_humidity_2m,is_day&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather API returned ${res.status}`);

      const data = await res.json();
      const current = data.current || {};
      const temp = Math.round(current.temperature_2m ?? 22);
      const code = current.weather_code ?? 1;
      const precipitation = current.precipitation ?? 0;
      const isDay = current.is_day === 1;

      // Rain WMO codes: 51-67 (drizzle/rain), 80-82 (showers), 95-99 (thunderstorms)
      const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
      const isRaining = precipitation > 0.1 || rainCodes.includes(code);
      const isCold = temp < 19;
      const isHot = temp >= 28;

      let conditionLabel = 'Agradável';
      let badge = '🌤️ Tempo agradável';
      let suggestion = 'Clima ótimo para qualquer rolê, de bistrôs a bares!';
      let suggestedVibe: WeatherData['suggestedVibe'] = 'gastronomia';
      let filterOutdoors = false;

      if (isRaining) {
        conditionLabel = 'Chuvoso';
        badge = `🌧️ Chuva detectada · ${temp}°C`;
        suggestion = 'Chuva na cidade! Sugerimos locais fechados e acolhedores (evite ar livre).';
        suggestedVibe = 'gastronomia';
        filterOutdoors = true;
      } else if (isHot) {
        conditionLabel = 'Calor';
        badge = `🔥 Calor · ${temp}°C`;
        suggestion = 'Calor em alta! Ideal para drinques gelados, chopp artesanal ou rooftops ventilados.';
        suggestedVibe = 'drinques';
        filterOutdoors = false;
      } else if (isCold) {
        conditionLabel = 'Fresco/Frio';
        badge = `🧣 Clima fresco · ${temp}°C`;
        suggestion = 'Noite fresca! Que tal um bistrô com lareira, carta de vinhos ou café quentinho?';
        suggestedVibe = 'gastronomia';
        filterOutdoors = true;
      } else if (isDay && !isRaining) {
        conditionLabel = 'Ensolarado';
        badge = `☀️ Céu aberto · ${temp}°C`;
        suggestion = 'Dia lindo! Perfeito para mesas externas, rooftops com vista e rolês ao ar livre.';
        suggestedVibe = 'arlivre';
        filterOutdoors = false;
      }

      const weatherResult: WeatherData = {
        temp,
        weatherCode: code,
        precipitation,
        isDay,
        isRaining,
        isCold,
        isHot,
        conditionLabel,
        badge,
        suggestion,
        suggestedVibe,
        filterOutdoors,
      };

      this.cachedData = weatherResult;
      this.cacheTimestamp = Date.now();
      return weatherResult;
    } catch (err) {
      console.warn('Weather service fetch fallback:', err);
      // Fallback pleasant weather
      return {
        temp: 22,
        weatherCode: 1,
        precipitation: 0,
        isDay: true,
        isRaining: false,
        isCold: false,
        isHot: false,
        conditionLabel: 'Agradável',
        badge: '🌤️ 22°C · São Paulo',
        suggestion: 'Clima propício para explorar novos lugares agora!',
        suggestedVibe: 'gastronomia',
        filterOutdoors: false,
      };
    }
  }
}

export const weatherService = new WeatherService();
