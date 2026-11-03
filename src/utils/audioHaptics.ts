/**
 * Web Audio synthetic haptic sound generator for mobile-grade tactile feedback
 */
class SoundEngine {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Soft tactile tick for buttons / switches
  tap() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Audio not permitted or muted
    }
  }

  // Crisp chime for decisions / "Decide por mim"
  success() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.06, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.2);
      });
    } catch {
      // Silent fail
    }
  }

  // Pop sound for bookmark / favorite
  pop() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // Silent fail
    }
  }
}

/**
 * Web Vibration API haptic feedback engine for physical tactile touch sensations
 */
class HapticEngine {
  private hasVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  vibrate(pattern: number | number[]) {
    try {
      if (this.hasVibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Vibration not allowed or restricted by iframe/policy
    }
  }

  light() {
    this.vibrate(25);
  }

  medium() {
    this.vibrate(45);
  }

  heavy() {
    this.vibrate([40, 50, 60]);
  }

  success() {
    this.vibrate([40, 60, 40, 90]);
  }

  checkIn() {
    this.vibrate([50, 70, 50, 120]);
  }

  delivery() {
    this.vibrate([60, 40, 80]);
  }

  refresh() {
    this.vibrate([30, 40, 30]);
  }
}

export const sound = new SoundEngine();
export const haptic = new HapticEngine();

