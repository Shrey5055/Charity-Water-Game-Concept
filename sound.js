/* ════════════════════════════════════════════════════
   EVERY DROP COUNTS — sound.js
   Lightweight sound effects using the Web Audio API.
   No external audio files needed, so the game still runs
   as a plain double-clicked HTML file with no server.
   ════════════════════════════════════════════════════ */

const Sound = (() => {
  let ctx;

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Plays a single synthesized tone.
  function tone(freq, dur, type = 'sine', gain = 0.15, delay = 0) {
    try {
      const c = ensureCtx();
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + delay);
      g.gain.setValueAtTime(0, c.currentTime + delay);
      g.gain.linearRampToValueAtTime(gain, c.currentTime + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(c.currentTime + delay);
      osc.stop(c.currentTime + delay + dur + 0.02);
    } catch (e) {
      // Audio not available (blocked, unsupported, etc.) — fail silently.
    }
  }

  return {
    // Unlocks the AudioContext on the first real user gesture (Play button).
    unlock() { ensureCtx(); },

    jump()      { tone(520, 0.12, 'square', 0.12); },
    hit()       { tone(140, 0.35, 'sawtooth', 0.18); tone(90, 0.4, 'sawtooth', 0.14, 0.05); },
    rotate()    { tone(700, 0.06, 'sine', 0.08); },
    drop()      { tone(900, 0.08, 'sine', 0.06); },
    milestone() { tone(660, 0.12, 'triangle', 0.14); tone(880, 0.16, 'triangle', 0.14, 0.1); },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.25, 'triangle', 0.16, i * 0.12));
    }
  };
})();