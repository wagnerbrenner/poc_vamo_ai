import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';
import { sound } from '../utils/audioHaptics';

export interface WeatherNotificationPayload {
  title: string;
  body: string;
  weatherCondition?: string;
  temp?: number;
  isRaining?: boolean;
  suggestedAction?: string;
  suggestedVibe?: string;
  timestamp: string;
}

type NotificationListener = (payload: WeatherNotificationPayload) => void;

class FCMNotificationService {
  private messaging: any = null;
  private token: string | null = null;
  private listeners: Set<NotificationListener> = new Set();
  private supported: boolean = false;
  private hasInitialized: boolean = false;

  async init(): Promise<boolean> {
    if (this.hasInitialized) return this.supported;
    this.hasInitialized = true;

    try {
      const supported = await isSupported();
      this.supported = supported;

      if (supported) {
        const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
        this.messaging = getMessaging(app);

        // Listen for foreground push messages
        onMessage(this.messaging, (remoteMessage) => {
          const payload: WeatherNotificationPayload = {
            title: remoteMessage.notification?.title || 'O clima mudou, que tal um novo lugar?',
            body: remoteMessage.notification?.body || 'A chuva começou! Que tal escolher um ambiente coberto agora?',
            weatherCondition: remoteMessage.data?.weatherCondition,
            temp: remoteMessage.data?.temp ? Number(remoteMessage.data.temp) : undefined,
            isRaining: remoteMessage.data?.isRaining === 'true',
            suggestedAction: remoteMessage.data?.suggestedAction || 'ajustar_role',
            timestamp: new Date().toISOString(),
          };

          this.dispatchNotification(payload);
        });
      }
    } catch (err) {
      console.warn('[FCM] Push messaging initialization fallback:', err);
      this.supported = false;
    }

    return this.supported;
  }

  async requestPermission(): Promise<string | null> {
    try {
      await this.init();

      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted' && this.messaging) {
          try {
            const token = await getToken(this.messaging, {
              vapidKey: 'BKagOny0KF_2pCJQ3Z_8jV-dummy-web-push-key', // Standard Web Push VAPID key
            });
            this.token = token;
            return token;
          } catch (e) {
            console.warn('[FCM] Token retrieval fallback:', e);
          }
        }
      }
    } catch (err) {
      console.warn('[FCM] Request permission fallback:', err);
    }
    return null;
  }

  /**
   * Broadcasts a weather change alert via native Notification API + in-app subscribers
   */
  notifyWeatherShift(options: {
    title?: string;
    body?: string;
    isRaining?: boolean;
    temp?: number;
    condition?: string;
    suggestedVibe?: string;
    previousWeather?: any;
    currentWeather?: any;
    reason?: string;
  }): WeatherNotificationPayload {
    const payload: WeatherNotificationPayload = {
      title: options.title || 'O clima mudou, que tal um novo lugar?',
      body: options.reason || options.body || (options.isRaining 
        ? 'A chuva começou durante o seu rolê! Que tal alternar para um local protegido e aconchegante?' 
        : 'A temperatura mudou significativamente! Veja opções mais adequadas para o momento.'),
      isRaining: options.isRaining !== undefined ? options.isRaining : options.currentWeather?.isRaining,
      temp: options.temp !== undefined ? options.temp : options.currentWeather?.temp,
      weatherCondition: options.condition || options.currentWeather?.conditionLabel,
      suggestedAction: 'ajustar_role',
      suggestedVibe: options.suggestedVibe || options.currentWeather?.suggestedVibe || 'gastronomia',
      timestamp: new Date().toISOString(),
    };

    // 1. Trigger audio feedback
    sound.pop();

    // 2. Native browser Notification if permitted
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.title, {
          body: payload.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'weather-shift',
        });
      }
    } catch (e) {
      // Ignore iframe restrictions
    }

    // 3. Dispatch to all active in-app listeners (interactive toast banner)
    this.dispatchNotification(payload);

    return payload;
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private dispatchNotification(payload: WeatherNotificationPayload) {
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('Error executing notification listener:', err);
      }
    });
  }
}

export const fcmNotificationService = new FCMNotificationService();
