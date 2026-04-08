import { getMutePreference, saveMutePreference } from '../../services/storage';

type AudioCue = 'jump' | 'collision' | 'milestone' | 'cta' | 'reveal';

class AudioSystem {
  private context: AudioContext | null = null;

  private muted = getMutePreference();

  unlock(): void {
    if (!this.context) {
      this.context = new window.AudioContext();
    }

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    saveMutePreference(this.muted);
    return this.muted;
  }

  play(cue: AudioCue): void {
    if (this.muted) {
      return;
    }

    this.unlock();

    if (!this.context) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    const now = this.context.currentTime;

    const config = {
      jump: { frequency: 520, duration: 0.08, type: 'square' as OscillatorType, end: 760 },
      collision: { frequency: 220, duration: 0.18, type: 'sawtooth' as OscillatorType, end: 120 },
      milestone: { frequency: 420, duration: 0.12, type: 'triangle' as OscillatorType, end: 640 },
      cta: { frequency: 320, duration: 0.08, type: 'sine' as OscillatorType, end: 420 },
      reveal: { frequency: 560, duration: 0.22, type: 'triangle' as OscillatorType, end: 780 },
    }[cue];

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(config.end, now + config.duration);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + config.duration + 0.02);
  }
}

export const audioSystem = new AudioSystem();
