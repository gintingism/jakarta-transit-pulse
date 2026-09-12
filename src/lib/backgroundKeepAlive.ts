/**
 * Background Keep-Alive & Lock Screen Media Session Manager
 * Keeps GPS tracking and voice navigation active when mobile screen is turned off or locked.
 */

export interface MediaSessionDetails {
  instruction: string;
  distanceMeters: number;
  targetName: string;
  lineName?: string;
}

export class BackgroundKeepAliveManager {
  private audioContext: AudioContext | null = null;
  private silentSource: AudioBufferSourceNode | null = null;
  private isRunning = false;

  constructor(customAudioContext?: AudioContext | null) {
    if (customAudioContext) {
      this.audioContext = customAudioContext;
    }
  }

  public start(): void {
    if (this.isRunning) return;

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
        this.isRunning = true;
      }
    } catch {
      // AudioContext creation might fail if user has not interacted with DOM yet
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
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

    this.isRunning = false;

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
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
            src: '/favicon.ico',
            sizes: '96x96',
            type: 'image/x-icon',
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
        icon: '/favicon.ico',
        badge: '/favicon.ico',
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
