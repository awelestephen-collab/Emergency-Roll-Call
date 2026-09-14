/**
 * AudioAlarm Synthesizer
 * Uses HTML5 Web Audio API to synthesize emergency sirens, attention tones, and check-in confirmation chimes.
 */

const STORAGE_KEY_SOUND_PERM = 'emergency_sound_permission'; // 'granted', 'denied', or null

class SoundSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.audioElement = null;
    // Sound permission state: 'prompt' (not enabled by default), 'granted', or 'denied'
    this.soundPermission = typeof window !== 'undefined'
      ? (localStorage.getItem(STORAGE_KEY_SOUND_PERM) || 'prompt')
      : 'prompt';
    // If not granted, muted is true (do not enable by default)
    this.isMuted = this.soundPermission !== 'granted';
    this.sirenOscillator = null;
    this.sirenInterval = null;
    this.isUnlocked = false;
    this.isAutoplayBlocked = false;
    this.blockedListeners = new Set();
    this.permissionListeners = new Set();
  }

  getSoundPermission() {
    return this.soundPermission;
  }

  isSoundEnabled() {
    return this.soundPermission === 'granted' && !this.isMuted;
  }

  onPermissionChange(callback) {
    this.permissionListeners.add(callback);
    callback(this.soundPermission);
    return () => this.permissionListeners.delete(callback);
  }

  grantSoundPermission() {
    this.soundPermission = 'granted';
    this.isMuted = false;
    try {
      localStorage.setItem(STORAGE_KEY_SOUND_PERM, 'granted');
    } catch {}
    this.unlockAudio();
    this.permissionListeners.forEach(cb => cb('granted'));
  }

  declineSoundPermission() {
    this.soundPermission = 'denied';
    this.isMuted = true;
    this.stopSiren();
    try {
      localStorage.setItem(STORAGE_KEY_SOUND_PERM, 'denied');
    } catch {}
    this.permissionListeners.forEach(cb => cb('denied'));
  }

  resetSoundPermission() {
    this.soundPermission = 'prompt';
    this.isMuted = true;
    this.stopSiren();
    try {
      localStorage.removeItem(STORAGE_KEY_SOUND_PERM);
    } catch {}
    this.permissionListeners.forEach(cb => cb('prompt'));
  }

  onBlockedChange(callback) {
    this.blockedListeners.add(callback);
    callback(this.isAutoplayBlocked);
    return () => this.blockedListeners.delete(callback);
  }

  setAutoplayBlocked(blocked) {
    if (this.isAutoplayBlocked !== blocked) {
      this.isAutoplayBlocked = blocked;
      this.blockedListeners.forEach(cb => cb(blocked));
    }
  }

  unlockAudio() {
    this.initContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().then(() => {
        this.setAutoplayBlocked(false);
      }).catch(() => {});
    } else if (this.audioCtx && this.audioCtx.state === 'running') {
      this.setAutoplayBlocked(false);
    }
    if (!this.audioElement && typeof window !== 'undefined') {
      try {
        const sirenUrl = new URL('siren.wav', window.location.href).href;
        const audio = new Audio(sirenUrl);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 1.0;
        this.audioElement = audio;
      } catch (e) {}
    }
    this.isUnlocked = true;
  }

  initContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  toggleMute() {
    if (this.soundPermission !== 'granted') {
      this.grantSoundPermission();
      return false; // Not muted
    }
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopSiren();
    }
    return this.isMuted;
  }

  // Pleasant double chime for successful check-in
  playSafeChime() {
    if (!this.isSoundEnabled()) return;
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
    if (!this.isSoundEnabled()) return;
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

  // Evacuation siren (dual-layer: loud HTML5 audio + Web Audio oscillator + hardware vibration)
  startSiren() {
    if (!this.isSoundEnabled()) {
      console.info('[AudioAlarm] Sound permission not granted or muted. Siren held until user grants permission.');
      return;
    }
    this.unlockAudio();
    this.triggerVibration();

    // 1. Play native HTML5 audio element (loudest and most reliable on mobile media stream)
    if (this.audioElement) {
      try {
        this.audioElement.volume = 1.0;
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.setAutoplayBlocked(false);
          }).catch((err) => {
            console.warn('[AudioAlarm] Autoplay blocked by browser policy, listening for touch/click to sound alarm:', err);
            this.setAutoplayBlocked(true);
            const retryOnGesture = () => {
              this.unlockAudio();
              if (this.audioElement && !this.isMuted) {
                this.audioElement.play().then(() => {
                  this.setAutoplayBlocked(false);
                }).catch(() => {});
              }
              if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().then(() => {
                  this.setAutoplayBlocked(false);
                }).catch(() => {});
              }
              window.removeEventListener('pointerdown', retryOnGesture);
              window.removeEventListener('touchstart', retryOnGesture);
              window.removeEventListener('click', retryOnGesture);
              window.removeEventListener('keydown', retryOnGesture);
            };
            window.addEventListener('pointerdown', retryOnGesture, { once: true, passive: true });
            window.addEventListener('touchstart', retryOnGesture, { once: true, passive: true });
            window.addEventListener('click', retryOnGesture, { once: true, passive: true });
            window.addEventListener('keydown', retryOnGesture, { once: true, passive: true });
          });
        }
      } catch (err) {
        console.warn('[AudioAlarm] Error playing audioElement:', err);
        this.setAutoplayBlocked(true);
      }
    }

    // 2. Synthesize piercing Web Audio oscillator layer
    if (!this.sirenOscillator) {
      try {
        this.initContext();
        if (this.audioCtx) {
          let isHigh = false;
          this.sirenOscillator = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const compressor = this.audioCtx.createDynamicsCompressor();
          compressor.threshold.setValueAtTime(-24, this.audioCtx.currentTime);
          compressor.knee.setValueAtTime(20, this.audioCtx.currentTime);
          compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
          compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
          compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);
          gain.gain.setValueAtTime(0.85, this.audioCtx.currentTime);

          this.sirenOscillator.type = 'sawtooth';
          this.sirenOscillator.frequency.setValueAtTime(650, this.audioCtx.currentTime);

          this.sirenOscillator.connect(gain);
          gain.connect(compressor);
          compressor.connect(this.audioCtx.destination);
          this.sirenOscillator.start();

          this.sirenInterval = setInterval(() => {
            if (!this.audioCtx || !this.sirenOscillator) return;
            const now = this.audioCtx.currentTime;
            const targetFreq = isHigh ? 650 : 980;
            this.sirenOscillator.frequency.setTargetAtTime(targetFreq, now, 0.12);
            isHigh = !isHigh;
            if (isHigh) {
              this.triggerVibration();
            }
          }, 500);
        }
      } catch (e) {
        console.warn('Siren oscillator start error:', e);
      }
    }

    // 3. Register with OS lock screen media controls
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: '🚨 EMERGENCY EVACUATION SIREN ACTIVE',
          artist: 'Life Safety Roll Call',
          album: 'Muster Alarm System'
        });
        navigator.mediaSession.playbackState = 'playing';
      } catch (mErr) {}
    }
  }

  triggerVibration() {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([600, 200, 600, 200, 600, 200, 1000]);
      }
    } catch {}
  }

  stopSiren() {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(0);
      }
    } catch {}

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {}
    }

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
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch (mErr) {}
    }
  }
}

export const soundSynthesizer = new SoundSynthesizer();

// Global touch & click listener: The very first user touch on a smartphone immediately unlocks audio
if (typeof window !== 'undefined') {
  const unlockListener = () => {
    soundSynthesizer.unlockAudio();
    window.removeEventListener('pointerdown', unlockListener);
    window.removeEventListener('touchstart', unlockListener);
    window.removeEventListener('click', unlockListener);
  };
  window.addEventListener('pointerdown', unlockListener, { passive: true });
  window.addEventListener('touchstart', unlockListener, { passive: true });
  window.addEventListener('click', unlockListener, { passive: true });
}
