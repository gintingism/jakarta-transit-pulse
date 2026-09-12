export type VoiceInstructionParams =
  | { type: 'START_WALK'; distanceMeters: number; targetName: string }
  | { type: 'APPROACH_GATE'; distanceMeters: number }
  | { type: 'TRANSIT_BOARD'; stationName: string; mode: string; destinationName: string }
  | { type: 'ANTI_BABLAS_WARNING'; stationName: string }
  | { type: 'ARRIVED' }
  | { type: 'OFF_ROUTE' };

/**
 * Generates spoken navigation instructions in Indonesian
 */
export function generateVoiceInstruction(params: VoiceInstructionParams): string {
  switch (params.type) {
    case 'START_WALK':
      return `Mulai perjalanan. Jalan kaki ${Math.round(params.distanceMeters)} meter menuju ${params.targetName}.`;
    case 'APPROACH_GATE':
      return `Dalam ${Math.round(params.distanceMeters)} meter, bersiap tap in di gerbang masuk.`;
    case 'TRANSIT_BOARD':
      return `Kamu sudah berada di ${params.stationName}. Naik ${params.mode} arah ${params.destinationName}.`;
    case 'ANTI_BABLAS_WARNING':
      return `Peringatan, satu stasiun lagi tiba di stasiun tujuanmu, ${params.stationName}. Bersiap di dekat pintu.`;
    case 'ARRIVED':
      return 'Kamu telah sampai di tujuan. Navigasi selesai.';
    case 'OFF_ROUTE':
      return 'Perhatian, kamu berada di luar jalur rute. Silakan kembali ke rute yang diarahkan.';
  }
}

/**
 * Text-to-speech voice guidance using Web Speech API
 */
export class VoiceNavigator {
  private synth: SpeechSynthesis | null = null;
  private spokenKeys: Set<string> = new Set<string>();
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isMuted = false;
  private onSpeakingChange?: (isSpeaking: boolean) => void;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor(
    customSynth?: SpeechSynthesis | null,
    onSpeakingChange?: (isSpeaking: boolean) => void
  ) {
    this.onSpeakingChange = onSpeakingChange;

    if (customSynth !== undefined) {
      this.synth = customSynth;
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }

    if (typeof window !== 'undefined') {
      try {
        const savedMute = localStorage.getItem('jtp_voice_muted');
        if (savedMute !== null) {
          this.isMuted = savedMute === 'true';
        }
      } catch {
        // Ignore localStorage restrictions
      }
    }

    this.initVoices();
  }

  public setOnSpeakingChange(cb?: (isSpeaking: boolean) => void): void {
    this.onSpeakingChange = cb;
  }

  private initVoices(): void {
    if (!this.synth) return;

    const findVoice = () => {
      this.selectBestVoice();
    };

    findVoice();

    if ('onvoiceschanged' in this.synth) {
      this.synth.onvoiceschanged = findVoice;
    }
  }

  private selectBestVoice(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // 1. Indonesian language tag matching
    let match = voices.find(
      (v) =>
        v.lang === 'id-ID' ||
        v.lang === 'id' ||
        v.lang.toLowerCase().startsWith('id-') ||
        v.lang.toLowerCase().startsWith('id_') ||
        v.lang.toLowerCase() === 'id'
    );

    // 2. Indonesian voice name matching
    if (!match) {
      match = voices.find(
        (v) =>
          v.name.toLowerCase().includes('indonesia') ||
          v.lang.toLowerCase().includes('indonesia')
      );
    }

    // 3. Prefer Indonesian voice if found
    if (match) {
      this.selectedVoice = match;
      return;
    }

    // 4. Fallback to default or first available voice so browser never fails silently
    if (!this.selectedVoice) {
      this.selectedVoice = voices.find((v) => v.default) || voices[0] || null;
    }
  }

  /**
   * Unlocks Web Speech API audio on initial user touch/click gesture
   */
  public unlockAudio(): void {
    if (!this.synth || typeof window === 'undefined') return;
    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch {
      // Ignore initial gesture unlock errors
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
      this.onSpeakingChange?.(false);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jtp_voice_muted', muted ? 'true' : 'false');
      } catch {
        // Ignore localStorage restrictions
      }
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Returns current selected voice (for debugging/testing)
   */
  public getSelectedVoice(): SpeechSynthesisVoice | null {
    this.selectBestVoice();
    return this.selectedVoice;
  }

  /**
   * Speaks text immediately. If priority = true, cancels pending utterances.
   */
  public speak(text: string, priority = false): void {
    if (!this.synth || this.isMuted || !text.trim()) return;

    try {
      if (priority) {
        this.synth.cancel();
      }

      if (this.synth.paused) {
        this.synth.resume();
      }

      if (typeof SpeechSynthesisUtterance === 'undefined') return;

      this.selectBestVoice();

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
        utterance.lang = this.selectedVoice.lang || 'id-ID';
      } else {
        utterance.lang = 'id-ID';
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Retain utterance reference to protect from garbage collection halts in Chromium
      this.currentUtterance = utterance;

      utterance.onstart = () => {
        this.onSpeakingChange?.(true);
      };

      utterance.onend = () => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        this.onSpeakingChange?.(false);
      };

      utterance.onerror = (e) => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        console.warn('[VoiceNavigator] Speech synthesis error:', e.error);
        this.onSpeakingChange?.(false);
      };

      this.synth.speak(utterance);

      // Workaround for Chrome bug where synthesis pauses right after speaking
      if (this.synth.paused) {
        this.synth.resume();
      }

      setTimeout(() => {
        if (this.synth?.paused) {
          this.synth.resume();
        }
      }, 50);
    } catch (err) {
      console.warn('[VoiceNavigator] Failed to speak:', err);
      this.onSpeakingChange?.(false);
    }
  }

  /**
   * Anti-spam deduplication: Speaks instruction only once per unique key
   */
  public speakOnce(key: string, text: string): void {
    if (this.spokenKeys.has(key)) return;
    this.spokenKeys.add(key);
    this.speak(text);
  }

  /**
   * Speaks latest instruction, cancelling prior utterances to prevent queued pile-ups
   */
  public speakLatest(key: string, text: string): void {
    if (this.spokenKeys.has(key)) return;
    this.spokenKeys.add(key);
    if (this.synth) {
      this.synth.cancel();
    }
    this.speak(text, false);
  }

  /**
   * Marks key as spoken so skipped steps are never spoken
   */
  public markAsSpoken(key: string): void {
    this.spokenKeys.add(key);
  }

  /**
   * Checks if key has already been spoken
   */
  public hasSpoken(key: string): boolean {
    return this.spokenKeys.has(key);
  }

  /**
   * Interrupts current speech with priority alert (e.g. Anti-Bablas)
   */
  public speakPriority(text: string): void {
    this.speak(text, true);
  }

  /**
   * Clears spoken history (e.g. when resetting or restarting navigation)
   */
  public resetHistory(): void {
    this.spokenKeys.clear();
    this.currentUtterance = null;
    if (this.synth) {
      this.synth.cancel();
    }
    this.onSpeakingChange?.(false);
  }
}

let sharedVoiceNavigator: VoiceNavigator | null = null;

/**
 * Returns singleton instance of VoiceNavigator for app-wide turn-by-turn speech
 */
export function getVoiceNavigator(
  customSynth?: SpeechSynthesis | null,
  onSpeakingChange?: (isSpeaking: boolean) => void
): VoiceNavigator {
  if (customSynth !== undefined) {
    return new VoiceNavigator(customSynth, onSpeakingChange);
  }
  if (!sharedVoiceNavigator) {
    sharedVoiceNavigator = new VoiceNavigator(undefined, onSpeakingChange);
  } else if (onSpeakingChange) {
    sharedVoiceNavigator.setOnSpeakingChange(onSpeakingChange);
  }
  return sharedVoiceNavigator;
}

/**
 * Resets the singleton instance (useful in testing)
 */
export function resetSharedVoiceNavigator(): void {
  if (sharedVoiceNavigator) {
    sharedVoiceNavigator.resetHistory();
    sharedVoiceNavigator = null;
  }
}
