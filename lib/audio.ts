/**
 * Transit chimes and disembark alarm generated with the Web Audio API.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Arrival chime (E5 -> G5 -> C6)
 */
export function playTransitArrivalChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [659.25, 783.99, 1046.5]; // E5, G5, C6
    const startTime = ctx.currentTime + 0.05;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.22);

      // Smooth attack and decay envelope
      gain.gain.setValueAtTime(0, startTime + idx * 0.22);
      gain.gain.linearRampToValueAtTime(0.3, startTime + idx * 0.22 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.22 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + idx * 0.22);
      osc.stop(startTime + idx * 0.22 + 0.5);
    });
  } catch (err) {
    console.warn('[WebAudio] Transit arrival chime failed to play:', err);
  }
}

/**
 * Pulsing disembark alarm chime
 */
export function playDisembarkAlarmChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseTime = ctx.currentTime + 0.05;
    // 3 rhythmic double-beeps
    const beeps = [
      { time: 0.0, freq: 880 },   // A5
      { time: 0.12, freq: 1174.6 }, // D6
      { time: 0.35, freq: 880 },
      { time: 0.47, freq: 1174.6 },
      { time: 0.70, freq: 880 },
      { time: 0.82, freq: 1318.5 }, // E6
    ];

    beeps.forEach(({ time, freq }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, baseTime + time);

      gain.gain.setValueAtTime(0.001, baseTime + time);
      gain.gain.linearRampToValueAtTime(0.45, baseTime + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, baseTime + time + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(baseTime + time);
      osc.stop(baseTime + time + 0.15);
    });
  } catch (err) {
    console.warn('[WebAudio] Disembark alarm chime failed to play:', err);
  }
}

/**
 * Pre-warms AudioContext on user gesture to comply with browser autoplay policies
 */
export function initAudioContext(): void {
  getAudioContext();
}
