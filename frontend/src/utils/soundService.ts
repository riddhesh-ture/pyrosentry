/**
 * PYROSENTRY AI - Industrial Sound Synthesis Engine (Web Audio API)
 *
 * Provides synthesized emergency fire alarm sirens and warning beeps
 * without requiring external MP3/WAV assets. Includes global user-gesture
 * unlocking to comply with modern browser autoplay policies.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isSirenActive = false;
  private muted = false;
  private volume = 0.25; // 25% default master volume
  private isUnlocked = false;

  constructor() {
    // Auto-unlock on first user interaction anywhere in the window
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.getAudioContext();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().then(() => {
            this.isUnlocked = true;
          });
        } else {
          this.isUnlocked = true;
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };

      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
      window.addEventListener('touchstart', unlockAudio, { once: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked && this.audioCtx?.state === 'running';
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted && this.sirenGain && this.audioCtx) {
      this.sirenGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    } else if (!muted && this.sirenGain && this.audioCtx && this.isSirenActive) {
      this.sirenGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.sirenGain && this.audioCtx && !this.muted && this.isSirenActive) {
      this.sirenGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Start continuous industrial fire evacuation siren wail (750 Hz to 1350 Hz sweep)
   */
  public startSiren() {
    if (this.isSirenActive) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      // Master gain node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      this.sirenGain = masterGain;

      // Primary carrier oscillator (sawtooth for aggressive horn timbre)
      const carrier = ctx.createOscillator();
      carrier.type = 'sawtooth';
      carrier.frequency.setValueAtTime(1050, ctx.currentTime); // Center frequency: 1050 Hz

      // Low-frequency modulation oscillator (LFO) for the siren wail cycle
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(1.2, ctx.currentTime); // 1.2 Hz wail speed (~0.83s period)

      // LFO modulation depth
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(300, ctx.currentTime); // Swings carrier by ±300 Hz (750 Hz to 1350 Hz)

      // Wire: LFO -> lfoGain -> carrier.frequency
      lfo.connect(lfoGain);
      lfoGain.connect(carrier.frequency);

      // Carrier -> masterGain -> speakers
      carrier.connect(masterGain);

      lfo.start();
      carrier.start();

      this.sirenOsc = carrier;
      this.lfoOsc = lfo;
      this.isSirenActive = true;
    } catch (err) {
      console.warn('Could not start siren audio:', err);
    }
  }

  /**
   * Stop continuous fire siren immediately
   */
  public stopSiren() {
    if (!this.isSirenActive) return;

    try {
      if (this.sirenOsc) {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
        this.sirenOsc = null;
      }
      if (this.lfoOsc) {
        this.lfoOsc.stop();
        this.lfoOsc.disconnect();
        this.lfoOsc = null;
      }
      if (this.sirenGain) {
        this.sirenGain.disconnect();
        this.sirenGain = null;
      }
    } catch (err) {
      // Ignored
    } finally {
      this.isSirenActive = false;
    }
  }

  public isRunning(): boolean {
    return this.isSirenActive;
  }

  /**
   * Play a short 2.5 second demonstration test blast
   */
  public testAlarm(durationSeconds = 2.5): Promise<void> {
    const wasMuted = this.muted;
    this.muted = false;
    this.startSiren();

    return new Promise((resolve) => {
      setTimeout(() => {
        this.stopSiren();
        this.muted = wasMuted;
        resolve();
      }, durationSeconds * 1000);
    });
  }

  /**
   * Play a brief tactical beep for user interaction feedback
   */
  public playBeep(freq = 880, duration = 0.08) {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }
}

export const soundService = new SoundService();
