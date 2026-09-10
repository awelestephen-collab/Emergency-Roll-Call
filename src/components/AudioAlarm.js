/**
 * AudioAlarm Synthesizer
 * Uses HTML5 Web Audio API to synthesize emergency sirens, attention tones, and check-in confirmation chimes.
 */

class SoundSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.sirenOscillator = null;
    this.sirenInterval = null;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopSiren();
    }
    return this.isMuted;
  }

  // Pleasant double chime for successful check-in
  playSafeChime() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.12); // A5

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio chime playback error:', e);
    }
  }

  // Attention alert tone (two quick beeps)
  playWarningBeep() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.setValueAtTime(950, now + 0.15);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Warning beep playback error:', e);
    }
  }

  // Evacuation siren (pulsing high-low tone for active emergency)
  startSiren() {
    if (this.isMuted || this.sirenOscillator) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      let isHigh = false;
      this.sirenOscillator = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);

      this.sirenOscillator.type = 'sawtooth';
      this.sirenOscillator.frequency.setValueAtTime(600, this.audioCtx.currentTime);

      this.sirenOscillator.connect(gain);
      gain.connect(this.audioCtx.destination);
      this.sirenOscillator.start();

      this.sirenInterval = setInterval(() => {
        if (!this.audioCtx || !this.sirenOscillator) return;
        const now = this.audioCtx.currentTime;
        const targetFreq = isHigh ? 600 : 900;
        this.sirenOscillator.frequency.setTargetAtTime(targetFreq, now, 0.15);
        isHigh = !isHigh;
      }, 500);
    } catch (e) {
      console.warn('Siren start error:', e);
    }
  }

  stopSiren() {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.sirenOscillator) {
      try {
        this.sirenOscillator.stop();
        this.sirenOscillator.disconnect();
      } catch (e) {}
      this.sirenOscillator = null;
    }
  }
}

export const soundSynthesizer = new SoundSynthesizer();
