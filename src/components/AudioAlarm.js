/**
 * AudioAlarm Synthesizer & Sound Engine
 * Uses HTML5 Audio + Web Audio API to synthesize emergency evacuation sirens,
 * attention tones, and check-in confirmation chimes with rock-solid mobile PWA support.
 */

import sirenSoundUrl from '../assets/siren.wav';

const STORAGE_KEY_SOUND_PERM = 'emergency_sound_permission'; // 'granted', 'denied', or 'prompt'

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
    this.sirenGain = null;
    this.sirenInterval = null;
    this.vibrateInterval = null;
    this.isUnlocked = false;
    this.isAutoplayBlocked = false;
    this.isSirenPlaying = false;
    this.hasActiveGestureListener = false;
    this.keepAliveInterval = null;
    this.blockedListeners = new Set();
    this.permissionListeners = new Set();

    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
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
    this.playTestSound();
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

  initAudioElement() {
    if (this.audioElement || typeof window === 'undefined') return;
    try {
      const audio = new Audio();
      // Primary hashed asset with fallback to absolute root /siren.wav
      audio.src = sirenSoundUrl || './siren.wav';
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 1.0;
      audio.crossOrigin = 'anonymous';
      this.audioElement = audio;
    } catch (e) {
      console.warn('[AudioAlarm] Could not initialize audio element:', e);
    }
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

  /**
   * Hardware & Mobile PWA audio unlock routine.
   * MUST be executed inside or during user gestures (click/touch) to unlock iOS Safari
   * and Android Chrome media pipelines permanently for subsequent async triggers.
   */
  unlockAudio() {
    this.initContext();
    this.initAudioElement();

    // 1. Physically unlock Web Audio API using a tiny 1-sample silent buffer
    if (this.audioCtx) {
      try {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().then(() => {
            this.setAutoplayBlocked(false);
          }).catch(() => {});
        } else if (this.audioCtx.state === 'running') {
          this.setAutoplayBlocked(false);
        }

        const silentBuffer = this.audioCtx.createBuffer(1, 1, 22050);
        const source = this.audioCtx.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(this.audioCtx.destination);
        source.start(0);
      } catch (e) {
        console.warn('[AudioAlarm] Web Audio silent buffer unlock warning:', e);
      }
    }

    // 2. Prime HTML5 Audio element inside user gesture so future programmatic play() calls are permitted
    if (this.audioElement) {
      try {
        this.audioElement.load();
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.setAutoplayBlocked(false);
            // If the siren is not actively sounding, pause immediately to preserve silence
            if (!this.isSirenPlaying) {
              this.audioElement.pause();
              this.audioElement.currentTime = 0;
            }
          }).catch(() => {
            // Handled gracefully; Web Audio oscillator remains ready
          });
        }
      } catch (e) {}
    }

    this.isUnlocked = true;
    this.startKeepAlive();
  }

  /**
   * Periodic inaudible pulse to prevent iOS Safari and Android Chrome from putting
   * the AudioContext into power-saving suspended mode while the app is running.
   */
  startKeepAlive() {
    if (this.keepAliveInterval || typeof window === 'undefined') return;
    this.keepAliveInterval = setInterval(() => {
      if (this.audioCtx && this.audioCtx.state === 'running' && !this.isSirenPlaying) {
        try {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          gain.gain.setValueAtTime(0.00001, this.audioCtx.currentTime); // Inaudible to human ear
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.05);
        } catch {}
      }
    }, 15000);
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

  // Test sound played when granting permission (validates speaker works immediately)
  playTestSound() {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(880.00, now + 0.14); // A5

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {}
  }

  /**
   * Global screen touch listener attached when an evacuation is active but browser
   * autoplay policy prevented sound from starting without a direct interaction.
   * One tap anywhere on the screen immediately unleashes the siren.
   */
  attachGlobalGestureListener() {
    if (typeof window === 'undefined' || this.hasActiveGestureListener) return;
    this.hasActiveGestureListener = true;

    const onScreenGesture = () => {
      this.hasActiveGestureListener = false;
      window.removeEventListener('pointerdown', onScreenGesture);
      window.removeEventListener('touchstart', onScreenGesture);
      window.removeEventListener('touchend', onScreenGesture);
      window.removeEventListener('click', onScreenGesture);
      window.removeEventListener('keydown', onScreenGesture);

      this.unlockAudio();
      if (this.isSirenPlaying && !this.isMuted) {
        this.startSiren();
      }
    };

    window.addEventListener('pointerdown', onScreenGesture, { passive: true });
    window.addEventListener('touchstart', onScreenGesture, { passive: true });
    window.addEventListener('touchend', onScreenGesture, { passive: true });
    window.addEventListener('click', onScreenGesture, { passive: true });
    window.addEventListener('keydown', onScreenGesture, { passive: true });
  }

  /**
   * Dual-Layer Emergency Evacuation Siren:
   * Layer 1: High-amplitude HTML5 Audio siren loop (loudest on mobile audio pipeline).
   * Layer 2: Web Audio API synthesized warble oscillator with dynamic compressor (100% offline & immune to network issues).
   * Layer 3: Synchronized mobile hardware vibration.
   * Layer 4: OS lock-screen MediaSession registration.
   */
  startSiren() {
    this.isSirenPlaying = true;

    if (!this.isSoundEnabled()) {
      console.info('[AudioAlarm] Sound permission not granted or muted. Armed for immediate playback once permitted.');
      this.setAutoplayBlocked(true);
      this.attachGlobalGestureListener();
      return;
    }

    this.unlockAudio();
    this.triggerVibration();

    // 1. Play native HTML5 audio element
    if (this.audioElement) {
      try {
        this.audioElement.volume = 1.0;
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.setAutoplayBlocked(false);
          }).catch((err) => {
            console.warn('[AudioAlarm] Audio element autoplay held by browser policy:', err.message);
            this.setAutoplayBlocked(true);
            this.attachGlobalGestureListener();
          });
        }
      } catch (err) {
        this.setAutoplayBlocked(true);
        this.attachGlobalGestureListener();
      }
    }

    // 2. Synthesize piercing Web Audio oscillator layer (sweeps 650Hz <-> 980Hz)
    try {
      this.initContext();
      if (this.audioCtx) {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().then(() => {
            this.setAutoplayBlocked(false);
          }).catch(() => {
            this.setAutoplayBlocked(true);
            this.attachGlobalGestureListener();
          });
        }

        if (!this.sirenOscillator) {
          let isHigh = false;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const compressor = this.audioCtx.createDynamicsCompressor();

          compressor.threshold.setValueAtTime(-24, this.audioCtx.currentTime);
          compressor.knee.setValueAtTime(20, this.audioCtx.currentTime);
          compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
          compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
          compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

          gain.gain.setValueAtTime(0.85, this.audioCtx.currentTime);

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(650, this.audioCtx.currentTime);

          osc.connect(gain);
          gain.connect(compressor);
          compressor.connect(this.audioCtx.destination);
          osc.start();

          this.sirenOscillator = osc;
          this.sirenGain = gain;

          this.sirenInterval = setInterval(() => {
            if (!this.audioCtx || !this.sirenOscillator) return;
            const now = this.audioCtx.currentTime;
            const targetFreq = isHigh ? 650 : 980;
            try {
              this.sirenOscillator.frequency.setTargetAtTime(targetFreq, now, 0.12);
            } catch {}
            isHigh = !isHigh;
            if (isHigh) {
              this.triggerVibration();
            }
          }, 450);
        }
      }
    } catch (e) {
      console.warn('[AudioAlarm] Siren oscillator error:', e);
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
        navigator.vibrate([800, 200, 800, 200, 800, 200, 1200]);
      }
    } catch {}
  }

  stopSiren() {
    this.isSirenPlaying = false;
    this.setAutoplayBlocked(false);

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
      this.sirenGain = null;
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch (mErr) {}
    }
  }
}

export const soundSynthesizer = new SoundSynthesizer();

// Global touch & click listener: The very first user touch on a smartphone immediately primes audio
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

  // When app is unminimized or brought to foreground, awaken audio pipeline
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        soundSynthesizer.unlockAudio();
        if (soundSynthesizer.isSirenPlaying && !soundSynthesizer.isMuted) {
          soundSynthesizer.startSiren();
        }
      }
    });
  }
}
