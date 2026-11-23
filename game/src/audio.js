// Ember Pact sounds: tiny WebAudio synth, no audio files. A soft pluck when a
// card is played, a low thud on damage, a rising arpeggio on victory and a
// falling one on defeat. Muted by default in screenshot mode.

let audioContext = null;
let muted = false;

export function isMuted() { return muted; }
export function setMuted(value) { muted = value; }

function context() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function tone(freq, at, dur, type = 'sine', gain = 0.12) {
  const ctx = context();
  if (!ctx || muted) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, ctx.currentTime + at);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(ctx.currentTime + at);
  osc.stop(ctx.currentTime + at + dur + 0.05);
}

export function playSelect() { tone(660, 0, 0.08, 'triangle', 0.06); }
export function playCard() { tone(440, 0, 0.12, 'triangle'); tone(660, 0.06, 0.12, 'triangle'); }
export function playWinRound() { tone(523, 0, 0.1, 'sine'); tone(659, 0.08, 0.1, 'sine'); tone(784, 0.16, 0.16, 'sine'); }
export function playLoseRound() { tone(330, 0, 0.14, 'sawtooth', 0.05); tone(262, 0.1, 0.2, 'sawtooth', 0.05); }
export function playVictory() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, 'triangle')); }
export function playDefeat() { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.14, 0.24, 'sawtooth', 0.06)); }
