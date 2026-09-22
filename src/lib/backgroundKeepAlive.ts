/**
 * Background Keep-Alive & Lock Screen Media Session Manager
 * Keeps GPS tracking, distance checks, and voice navigation active when mobile screen is turned off or locked.
 */

export interface MediaSessionDetails {
  instruction: string;
  distanceMeters: number;
  targetName: string;
  lineName?: string;
}

// 1 second base64-encoded silent 8-bit mono PCM WAV
const SILENT_WAV_BASE64 =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export class BackgroundKeepAliveManager {
  private audioContext: AudioContext | null = null;
  private silentSource: AudioBufferSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isRunning = false;

  constructor(customAudioContext?: AudioContext | null) {
    if (customAudioContext) {
      this.audioContext = customAudioContext;
    }
  }

  public start(): void {
    if (this.isRunning) return;

    // 1. Web Audio API buffer keep-alive (primary for desktop/tablets)
    try {
      if (!this.audioContext) {
        const AudioCtx =
          (typeof window !== 'undefined' && window.AudioContext) ||
          (typeof window !== 'undefined' &&
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext) ||
          (typeof AudioContext !== 'undefined' ? AudioContext : null);

        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }

      if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
          void this.audioContext.resume();
        }

        // Generate 1 second of silence buffer looped continuously
        const buffer = this.audioContext.createBuffer(
          1,
          this.audioContext.sampleRate,
          this.audioContext.sampleRate
        );

        // Near-zero gain node prevents audible hiss while keeping audio pipe active
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.00001, this.audioContext.currentTime);

        this.silentSource = this.audioContext.createBufferSource();
        this.silentSource.buffer = buffer;
        this.silentSource.loop = true;

        this.silentSource.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        this.silentSource.start();
      }
    } catch {
      // AudioContext creation might fail if user has not interacted with DOM yet
    }

    // 2. HTML5 Audio Element silent loop (essential for iOS Safari and Android Chrome background execution)
    try {
      if (typeof document !== 'undefined' && typeof window !== 'undefined') {
        if (!this.audioElement && document.body) {
          const audio = document.createElement('audio');
          audio.src = SILENT_WAV_BASE64;
          audio.loop = true;
          audio.volume = 0.001;
          audio.setAttribute('playsinline', 'true');
          audio.setAttribute('aria-hidden', 'true');
          audio.style.display = 'none';
          document.body.appendChild(audio);
          this.audioElement = audio;
        }

        if (this.audioElement && typeof this.audioElement.play === 'function') {
          const playPromise = this.audioElement.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        }
      }
    } catch {
      // Non-blocking in headless environments
    }

    this.isRunning = true;

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (this.audioElement) {
            void this.audioElement.play();
          }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          // Keep audio session registered to prevent mobile OS from killing background process
        });
      } catch {
        // Safe fallback
      }
    }
  }

  public stop(): void {
    if (this.silentSource) {
      try {
        this.silentSource.stop();
        this.silentSource.disconnect();
      } catch {
        // Ignore disconnection errors
      }
      this.silentSource = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        void this.audioContext.close();
      } catch {
        // Ignore close errors
      }
      this.audioContext = null;
    }

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.removeAttribute('src');
        this.audioElement.load();
        if (this.audioElement.parentNode) {
          this.audioElement.parentNode.removeChild(this.audioElement);
        }
      } catch {
        // Safe cleanup
      }
      this.audioElement = null;
    }

    this.isRunning = false;

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      } catch {
        // Safe cleanup
      }
    }
  }

  public updateLockScreen(details: MediaSessionDetails): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    const { instruction, distanceMeters, targetName, lineName } = details;
    const formattedDistance =
      distanceMeters < 1000
        ? `${Math.round(distanceMeters)} m`
        : `${(distanceMeters / 1000).toFixed(1)} km`;

    const subTitle = lineName
      ? `${formattedDistance} menuju ${targetName} • ${lineName}`
      : `${formattedDistance} menuju ${targetName}`;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: instruction,
        artist: 'Jakarta Transit Pulse',
        album: subTitle,
        artwork: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      });
    } catch {
      // MediaMetadata creation might fail in older browsers
    }
  }

  public triggerHaptic(pattern: number[] = [400, 200, 400, 200, 800]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore vibration restrictions
      }
    }
  }

  public sendNotification(title: string, body: string): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'transit-pulse-navigation',
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch {
      return false;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

// Global shared singleton instance for coordinate keep-alive across hooks and HUD
let globalKeepAliveManager: BackgroundKeepAliveManager | null = null;

export function getBackgroundKeepAliveManager(): BackgroundKeepAliveManager {
  if (!globalKeepAliveManager) {
    globalKeepAliveManager = new BackgroundKeepAliveManager();
  }
  return globalKeepAliveManager;
}
