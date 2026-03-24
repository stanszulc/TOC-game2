const createAudio = () => {
  let ctx = null;
  const ac = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; };
  const play = (freq, type = 'sine', vol = 0.1, dur = 0.1, t0 = 0) => {
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = type; o.frequency.value = freq;
      const s = c.currentTime + t0;
      g.gain.setValueAtTime(vol, s);
      g.gain.exponentialRampToValueAtTime(0.001, s + dur);
      o.start(s); o.stop(s + dur);
    } catch {}
  };
  return {
    tap:    () => play(900, 'sine', 0.06, 0.05),
    pizza:  () => { [523, 659, 784].forEach((f, i) => play(f, 'sine', 0.1, 0.15, i * 0.07)); },
    baked:  () => { [440, 554, 659, 880].forEach((f, i) => play(f, 'sine', 0.08, 0.12, i * 0.055)); },
    whoosh: () => { play(180, 'sine', 0.07, 0.12); play(520, 'sine', 0.04, 0.1, 0.04); },
    ching:  () => { play(1046, 'triangle', 0.15, 0.35); play(1568, 'triangle', 0.12, 0.45, 0.06); play(2093, 'triangle', 0.08, 0.55, 0.12); },
    plop:   () => play(280, 'sine', 0.08, 0.08),
    cash:   () => { play(120, 'sine', 0.22, 0.2); play(1400, 'triangle', 0.08, 0.1, 0.05); play(900, 'triangle', 0.05, 0.12, 0.12); },
    outage: () => {
      try {
        const c = ac(), o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(380, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(55, c.currentTime + 0.9);
        g.gain.setValueAtTime(0.28, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
        o.start(); o.stop(c.currentTime + 0.9);
      } catch {}
      setTimeout(() => play(70, 'square', 0.18, 0.5), 220);
    },
  };
};

export const audio = createAudio();
