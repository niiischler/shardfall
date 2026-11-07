// Tiny WebAudio synth. Every sound is generated, no files needed.
SF.Audio = (function () {
  let ctx = null, master = null, muted = false, noiseBuf = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, type, vol, slide, delay) {
    if (!ctx || muted || !(vol > 0.001)) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide && slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(dur, vol, freq, delay) {
    if (!ctx || muted || !(vol > 0.001)) return;
    const t = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  const semis = (base, s) => base * Math.pow(2, s / 12);
  const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

  return {
    init,
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
    isMuted: () => muted,
    hit(v) { const k = v == null ? 1 : v; noise(0.07, 0.22 * k, 2600); tone(520 + Math.random() * 180, 0.07, 'triangle', 0.1 * k, 0.55); },
    brk(v) { const k = v == null ? 1 : v; tone(1250, 0.22, 'sine', 0.16 * k, 0.45); tone(1900, 0.14, 'triangle', 0.08 * k, 0.5, 0.03); noise(0.18, 0.18 * k, 4200); },
    pick(n) { tone(semis(660, scale[n % scale.length]), 0.06, 'sine', 0.07, 1.15); },
    coin(c) { const f = semis(523, scale[c % scale.length]); tone(f, 0.08, 'square', 0.035); tone(f * 2, 0.1, 'sine', 0.06); },
    full() { tone(150, 0.16, 'sawtooth', 0.07, 0.75); tone(120, 0.18, 'sawtooth', 0.06, 0.75, 0.1); },
    pay() { tone(760 + Math.random() * 120, 0.045, 'sine', 0.04, 1.3); },
    buy() { [0, 4, 7, 12].forEach((s, i) => tone(semis(440, s), 0.13, 'triangle', 0.11, 1, i * 0.055)); },
    nope() { tone(220, 0.1, 'square', 0.04, 0.8); },
    build() {
      [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(semis(330, s), 0.24, 'triangle', 0.12, 1, i * 0.07));
      noise(0.6, 0.14, 700);
    },
  };
})();
