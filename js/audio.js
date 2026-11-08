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

  // Filtered noise burst. kind: bandpass (default), lowpass or highpass; q sharpens a bandpass.
  function noise(dur, vol, freq, delay, kind, q) {
    if (!ctx || muted || !(vol > 0.001)) return;
    const t = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = kind || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1.2;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  const semis = (base, s) => base * Math.pow(2, s / 12);
  const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const rnd = (a, b) => a + Math.random() * (b - a);

  // How each material sounds when struck (hit) and when it breaks (brk). k = loudness 0..1.
  const MAT = {
    glass: {
      hit(k) { const f = rnd(1700, 2100); tone(f, 0.16, 'sine', 0.08 * k); tone(f * 1.5, 0.1, 'sine', 0.04 * k); noise(0.03, 0.08 * k, 6500, 0, 'highpass'); },
      brk(k) { [0, 4, 7, 12].forEach((s, i) => tone(semis(1400, s), 0.3, 'sine', 0.08 * k, 1, i * 0.04)); noise(0.25, 0.12 * k, 7000, 0, 'highpass'); },
    },
    sun: {
      hit(k) { const f = rnd(900, 1050); tone(f, 0.2, 'sine', 0.07 * k); tone(f * 2.01, 0.14, 'sine', 0.04 * k); tone(110, 0.15, 'sine', 0.05 * k); },
      brk(k) { [0, 7, 12, 16, 19].forEach((s, i) => tone(semis(660, s), 0.45, 'triangle', 0.06 * k, 1, i * 0.05)); tone(80, 0.4, 'sine', 0.1 * k, 0.7); noise(0.3, 0.08 * k, 8000, 0.1, 'highpass'); },
    },
    stone: {
      hit(k) { noise(0.09, 0.3 * k, 900, 0, 'lowpass'); tone(rnd(130, 160), 0.08, 'triangle', 0.12 * k, 0.6); noise(0.02, 0.1 * k, 3000, 0, 'bandpass', 4); },
      brk(k) { noise(0.35, 0.32 * k, 500, 0, 'lowpass'); tone(90, 0.28, 'sine', 0.16 * k, 0.5); for (let i = 0; i < 4; i++) noise(0.04, 0.12 * k, rnd(1200, 2600), 0.08 + i * 0.06, 'bandpass', 3); },
    },
    metal: {
      hit(k) { const f = rnd(520, 640); tone(f, 0.22, 'sine', 0.05 * k); tone(f * 2.76, 0.16, 'sine', 0.05 * k); tone(f * 5.4, 0.08, 'sine', 0.025 * k); noise(0.02, 0.15 * k, 3500, 0, 'bandpass', 3); },
      brk(k) { const f = 330; [1, 2.76, 5.4, 8.9].forEach((m, i) => tone(f * m, 0.5 - i * 0.08, 'sine', 0.06 * k / (i + 1))); noise(0.25, 0.25 * k, 400, 0, 'lowpass'); tone(70, 0.2, 'sine', 0.12 * k, 0.6); },
    },
    gold: {
      hit(k) { const f = rnd(820, 900); tone(f, 0.2, 'sine', 0.05 * k); tone(f * 2.4, 0.15, 'sine', 0.045 * k); noise(0.02, 0.12 * k, 4500, 0, 'bandpass', 3); },
      brk(k) { noise(0.2, 0.2 * k, 600, 0, 'lowpass'); [0, 4, 7, 12, 16].forEach((s, i) => tone(semis(1046, s), 0.12, 'square', 0.022 * k, 1, 0.05 + i * 0.045)); },
    },
    magma: {
      hit(k) { noise(0.22, 0.12 * k, 5200, 0, 'highpass'); tone(rnd(100, 120), 0.12, 'sawtooth', 0.05 * k, 0.7); noise(0.06, 0.18 * k, 700, 0, 'lowpass'); },
      brk(k) { tone(55, 0.5, 'sawtooth', 0.09 * k, 0.6); noise(0.6, 0.12 * k, 6000, 0.05, 'highpass'); noise(0.3, 0.25 * k, 300, 0, 'lowpass'); },
    },
    ice: {
      hit(k) { noise(0.04, 0.28 * k, 7500, 0, 'highpass'); tone(rnd(2300, 2700), 0.07, 'triangle', 0.05 * k, 0.85); },
      brk(k) { for (let i = 0; i < 6; i++) { noise(0.05, 0.16 * k, rnd(5000, 9000), i * 0.035, 'highpass'); tone(rnd(1800, 3200), 0.12, 'sine', 0.035 * k, 1, i * 0.035); } },
    },
    wood: {
      hit(k) { tone(rnd(200, 240), 0.08, 'triangle', 0.16 * k, 0.7); noise(0.06, 0.24 * k, 1100, 0, 'bandpass', 3); },
      brk(k) { tone(170, 0.45, 'sawtooth', 0.035 * k, 0.55); noise(0.35, 0.3 * k, 300, 0.25, 'lowpass'); noise(0.35, 0.08 * k, 4000, 0.3, 'bandpass', 0.8); },
    },
    palm: {
      hit(k) { tone(rnd(240, 280), 0.07, 'triangle', 0.13 * k, 0.75); noise(0.12, 0.1 * k, 3800, 0.02, 'bandpass', 0.8); },
      brk(k) { noise(0.4, 0.12 * k, 3500, 0, 'bandpass', 0.7); [0, 1, 2].forEach(i => tone(rnd(320, 380), 0.08, 'sine', 0.1 * k, 0.6, 0.15 + i * 0.09)); },
    },
    resin: {
      hit(k) { tone(rnd(230, 270), 0.12, 'sine', 0.1 * k, 0.6); noise(0.07, 0.16 * k, 700, 0, 'lowpass'); tone(rnd(1000, 1200), 0.1, 'sine', 0.03 * k); },
      brk(k) { tone(880, 0.35, 'sine', 0.07 * k); tone(1320, 0.3, 'sine', 0.04 * k, 1, 0.05); noise(0.3, 0.2 * k, 400, 0, 'lowpass'); },
    },
    squish: {
      hit(k) { tone(rnd(260, 320), 0.11, 'sine', 0.12 * k, 1.8); noise(0.08, 0.12 * k, 1400, 0, 'lowpass'); },
      brk(k) { tone(420, 0.14, 'sine', 0.14 * k, 2.1); tone(300, 0.18, 'sine', 0.1 * k, 1.6, 0.06); noise(0.18, 0.16 * k, 1800, 0.02, 'lowpass'); },
    },
    water: {
      hit(k) { tone(rnd(380, 460), 0.09, 'sine', 0.12 * k, 2.2); },
      brk(k) { for (let i = 0; i < 4; i++) tone(rnd(350, 700), 0.08, 'sine', 0.09 * k, 2.4, i * 0.06); noise(0.3, 0.14 * k, 2500, 0.05, 'bandpass', 0.6); },
    },
    shell: {
      hit(k) { const f = rnd(650, 750); tone(f, 0.07, 'triangle', 0.1 * k); tone(f * 1.52, 0.05, 'sine', 0.06 * k); noise(0.025, 0.14 * k, 2500, 0, 'bandpass', 5); },
      brk(k) { for (let i = 0; i < 5; i++) noise(0.03, 0.14 * k, rnd(1800, 3200), i * 0.05, 'bandpass', 5); tone(1200, 0.4, 'sine', 0.06 * k, 1, 0.05); tone(1800, 0.3, 'sine', 0.035 * k, 1, 0.09); },
    },
    bone: {
      hit(k) { noise(0.03, 0.3 * k, 2000, 0, 'bandpass', 8); tone(rnd(850, 950), 0.03, 'square', 0.03 * k); },
      brk(k) { for (let i = 0; i < 5; i++) noise(0.03, 0.22 * k, rnd(1500, 2600), i * 0.055, 'bandpass', 8); noise(0.3, 0.12 * k, 900, 0.1, 'lowpass'); },
    },
    coral: {
      hit(k) { noise(0.05, 0.2 * k, 3500, 0, 'bandpass', 4); tone(rnd(1200, 1400), 0.06, 'triangle', 0.05 * k); },
      brk(k) { for (let i = 0; i < 4; i++) noise(0.03, 0.14 * k, rnd(3000, 5000), i * 0.04, 'bandpass', 4); for (let i = 0; i < 3; i++) tone(rnd(500, 800), 0.07, 'sine', 0.07 * k, 2.2, 0.15 + i * 0.07); },
    },
  };

  return {
    init,
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
    isMuted: () => muted,
    hit(mat, v) { (MAT[mat] || MAT.stone).hit(v == null ? 1 : v); },
    brk(mat, v) { (MAT[mat] || MAT.stone).brk(v == null ? 1 : v); },
    pick(n, v) { v = v == null ? 1 : v; tone(semis(660, scale[n % scale.length]), 0.06, 'sine', 0.07 * v, 1.15); },
    coin(c, v) { v = v == null ? 1 : v; const f = semis(523, scale[c % scale.length]); tone(f, 0.08, 'square', 0.035 * v); tone(f * 2, 0.1, 'sine', 0.06 * v); },
    full() { tone(150, 0.16, 'sawtooth', 0.07, 0.75); tone(120, 0.18, 'sawtooth', 0.06, 0.75, 0.1); },
    pay() { tone(760 + Math.random() * 120, 0.045, 'sine', 0.04, 1.3); },
    buy() { [0, 4, 7, 12].forEach((s, i) => tone(semis(440, s), 0.13, 'triangle', 0.11, 1, i * 0.055)); },
    nope() { tone(220, 0.1, 'square', 0.04, 0.8); },
    store(n, v) { v = v == null ? 1 : v; tone(semis(392, scale[n % scale.length]), 0.07, 'triangle', 0.06 * v, 0.9); noise(0.04, 0.06 * v, 900, 0, 'lowpass'); },
    rocket(k) { const v = k == null ? 1 : k; noise(1.6, 0.22 * v, 220, 0, 'lowpass'); tone(70, 1.4, 'sawtooth', 0.05 * v, 1.8); },
    land(k) { const v = k == null ? 1 : k; noise(0.9, 0.16 * v, 300, 0, 'lowpass'); tone(160, 0.8, 'sawtooth', 0.04 * v, 0.4); },
    // Molten metal poured into the mould: a hiss and a low clank.
    smelt(v) { v = v == null ? 1 : v; noise(0.35, 0.07 * v, 2600, 0, 'highpass'); tone(190, 0.12, 'triangle', 0.05 * v, 0.8); tone(95, 0.18, 'sine', 0.06 * v, 0.9, 0.04); },
    build() {
      [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(semis(330, s), 0.24, 'triangle', 0.12, 1, i * 0.07));
      noise(0.6, 0.14, 700);
    },
  };
})();
