// Each outer region has a biome that fits its resource: its own ground and scenery.
// ground: base colour and blotches; marks: ground details painted once into a texture;
// decor: standing scenery placed around the region (drawn y-sorted, no collision).
SF.Biomes = (function () {
  const TAU = Math.PI * 2;

  const BIOMES = {
    volcanic: { ground: '#3a2630', light: 'rgba(120,60,50,0.35)', dark: 'rgba(15,5,12,0.45)', marks: ['glowcracks', 'gravel'], glow: '#ff7a2a', decor: ['vent', 'basalt', 'basalt'] },
    enchanted: { ground: '#2e2448', light: 'rgba(90,200,140,0.22)', dark: 'rgba(10,6,24,0.45)', marks: ['moss', 'flowers'], glow: '#b6ff6a', flower: ['#b6ff6a', '#e0a6ff', '#7fd8ff'], decor: ['glowtree', 'glowtree', 'stone'], fireflies: '#d8ff9a' },
    ice: { ground: '#bcd2ea', light: 'rgba(255,255,255,0.5)', dark: 'rgba(90,130,190,0.3)', marks: ['icecracks', 'snow'], decor: ['drift', 'iceblock', 'drift'] },
    void: { ground: '#24163a', light: 'rgba(160,90,220,0.3)', dark: 'rgba(5,2,15,0.5)', marks: ['rings', 'stars'], glow: '#e0a6ff', decor: ['floatrock', 'floatrock', 'obelisk'] },
    thicket: { ground: '#2f5a30', light: 'rgba(110,190,90,0.35)', dark: 'rgba(10,30,12,0.4)', marks: ['grass', 'flowers'], flower: ['#ff5f7a', '#ffd36b', '#ffffff'], decor: ['shrub', 'shrub', 'fern'] },
    quarry: { ground: '#7a7470', light: 'rgba(200,195,185,0.35)', dark: 'rgba(40,36,34,0.4)', marks: ['terraces', 'gravel'], decor: ['boulder', 'scaffold', 'cart', 'boulder'] },
    grove: { ground: '#6a5a2a', light: 'rgba(240,180,70,0.3)', dark: 'rgba(40,25,8,0.4)', marks: ['leaves', 'grass'], leaves: ['#ffb340', '#d0601a', '#ffd36b'], decor: ['oldtree', 'oldtree', 'shrub'] },
    ravine: { ground: '#4a4040', light: 'rgba(140,120,110,0.3)', dark: 'rgba(15,10,10,0.5)', marks: ['canyon', 'chasms', 'chasms', 'gravel'], decor: ['spire', 'spire', 'spire', 'boulder', 'lantern'] },
    mesa: { ground: '#b8603a', light: 'rgba(240,150,90,0.35)', dark: 'rgba(90,30,15,0.35)', marks: ['strata', 'gravel'], decor: ['butte', 'butte', 'deadbush'] },
    flats: { ground: '#9a7a5a', light: 'rgba(210,180,140,0.35)', dark: 'rgba(60,40,25,0.35)', marks: ['mud', 'patina'], decor: ['boulder', 'deadbush'] },
    dunes: { ground: '#e2c38e', light: 'rgba(255,240,200,0.45)', dark: 'rgba(170,120,70,0.3)', marks: ['dunes'], decor: ['skull', 'ribs', 'deadbush'] },
    rift: { ground: '#5a2420', light: 'rgba(200,80,50,0.3)', dark: 'rgba(25,5,5,0.5)', marks: ['glowcracks', 'gravel'], glow: '#ffb347', decor: ['spire', 'vent', 'basalt'] },
    shallows: { ground: '#7fd6c8', light: 'rgba(220,255,250,0.45)', dark: 'rgba(30,140,150,0.3)', marks: ['water', 'sand'], decor: ['rockpool', 'seaweed', 'starfish'] },
    reef: { ground: '#3fa0b8', light: 'rgba(160,240,255,0.4)', dark: 'rgba(10,60,90,0.4)', marks: ['water', 'sand'], decor: ['seaweed', 'seaweed', 'rockpool'] },
  };

  // ---------- ground texture ----------
  const MARKS = {
    gravel(g, R, S, b) { for (let i = 0; i < 260; i++) { g.fillStyle = R() > 0.5 ? b.light : b.dark; g.beginPath(); g.ellipse(R() * S, R() * S, 1 + R() * 3, 0.8 + R() * 2, R() * TAU, 0, TAU); g.fill(); } },
    glowcracks(g, R, S, b) {
      for (let i = 0; i < 16; i++) {
        let x = R() * S, y = R() * S; const pts = [[x, y]];
        for (let j = 0; j < 6; j++) { x += (R() - 0.5) * 50; y += (R() - 0.5) * 50; pts.push([x, y]); }
        const path = () => { g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); };
        g.lineCap = 'round'; g.lineJoin = 'round';
        path(); g.strokeStyle = 'rgba(10,2,5,0.8)'; g.lineWidth = 7; g.stroke();
        path(); g.strokeStyle = b.glow; g.lineWidth = 2.5; g.stroke();
        path(); g.strokeStyle = 'rgba(255,240,180,0.8)'; g.lineWidth = 1; g.stroke();
      }
      for (let i = 0; i < 5; i++) {
        const x = R() * S, y = R() * S, r = 14 + R() * 18;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, '#fff1a0'); gr.addColorStop(0.4, b.glow); gr.addColorStop(1, 'rgba(60,10,0,0.9)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, 0, TAU); g.fill();
      }
    },
    moss(g, R, S) { for (let i = 0; i < 70; i++) { const x = R() * S, y = R() * S, r = 10 + R() * 30; g.fillStyle = `rgba(${40 + R() * 40 | 0},${90 + R() * 60 | 0},${70 + R() * 50 | 0},0.25)`; g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, TAU); g.fill(); } },
    flowers(g, R, S, b) {
      const cols = b.flower || ['#ffffff'];
      for (let i = 0; i < 90; i++) {
        const x = R() * S, y = R() * S, c = cols[i % cols.length];
        if (b.glow) { const gr = g.createRadialGradient(x, y, 0, x, y, 9); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 0.5; g.fillStyle = gr; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); g.globalAlpha = 1; }
        g.fillStyle = c; for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 1.6, 1.8, 0, TAU); g.fill(); }
        g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(x, y, 1, 0, TAU); g.fill();
      }
    },
    icecracks(g, R, S) {
      g.strokeStyle = 'rgba(80,120,180,0.5)'; g.lineWidth = 1.5;
      for (let i = 0; i < 30; i++) { let x = R() * S, y = R() * S; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (R() - 0.5) * 60; y += (R() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1;
      for (let i = 0; i < 40; i++) { const x = R() * S, y = R() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 + R() * 10, y + (R() - 0.5) * 4); g.stroke(); }
    },
    snow(g, R, S) { for (let i = 0; i < 40; i++) { const x = R() * S, y = R() * S, r = 12 + R() * 30; g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(x, y, r, r * 0.45, 0, 0, TAU); g.fill(); } },
    rings(g, R, S, b) { for (let i = 0; i < 14; i++) { const x = R() * S, y = R() * S, r = 20 + R() * 50; g.strokeStyle = 'rgba(224,166,255,0.22)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(x, y, r * 0.6, r * 0.33, 0, 0, TAU); g.stroke(); } },
    stars(g, R, S) { for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,${200 + R() * 55 | 0},255,${0.3 + R() * 0.6})`; g.fillRect(R() * S, R() * S, 1.5, 1.5); } },
    grass(g, R, S, b) {
      g.lineCap = 'round';
      for (let i = 0; i < 160; i++) {
        const x = R() * S, y = R() * S; g.strokeStyle = R() > 0.5 ? b.light : 'rgba(20,50,20,0.5)'; g.lineWidth = 2;
        for (let j = 0; j < 3; j++) { const a = -Math.PI / 2 + (j - 1) * 0.4; g.beginPath(); g.moveTo(x + j * 2, y); g.lineTo(x + j * 2 + Math.cos(a) * 9, y + Math.sin(a) * 10); g.stroke(); }
      }
    },
    terraces(g, R, S) {
      // stepped quarry ledges: light top edge, dark face below
      for (let i = 0; i < 9; i++) {
        const y = (i + 0.5) * S / 9 + (R() - 0.5) * 20, x0 = R() * S * 0.3, x1 = S - R() * S * 0.3;
        g.fillStyle = 'rgba(40,36,34,0.35)'; g.beginPath(); g.moveTo(x0, y);
        for (let x = x0; x <= x1; x += 20) g.lineTo(x, y + (R() - 0.5) * 6);
        g.lineTo(x1, y + 16); g.lineTo(x0, y + 16); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(230,225,215,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
        for (let k = 0; k < 6; k++) { const dx = x0 + R() * (x1 - x0); g.strokeStyle = 'rgba(30,26,24,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(dx, y + 2); g.lineTo(dx + 2, y + 14); g.stroke(); }
      }
      // rust-coloured ore stains
      for (let i = 0; i < 18; i++) { const x = R() * S, y = R() * S; g.fillStyle = 'rgba(181,89,42,0.25)'; g.beginPath(); g.ellipse(x, y, 10 + R() * 14, 4 + R() * 5, 0, 0, TAU); g.fill(); }
    },
    leaves(g, R, S, b) {
      for (let i = 0; i < 260; i++) {
        const x = R() * S, y = R() * S, a = R() * TAU; g.fillStyle = b.leaves[i % b.leaves.length]; g.globalAlpha = 0.55 + R() * 0.4;
        g.beginPath(); g.ellipse(x, y, 4, 2, a, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    },
    chasms(g, R, S) {
      // deep dark crevices with lit rims
      for (let i = 0; i < 7; i++) {
        let x = R() * S, y = R() * S; const L = [], Rr = [];
        for (let j = 0; j < 8; j++) { const w = 4 + Math.sin(j / 7 * Math.PI) * (8 + R() * 8); L.push([x - w, y]); Rr.push([x + w, y]); x += (R() - 0.5) * 40; y += 14 + R() * 10; }
        const pts = L.concat(Rr.reverse());
        g.fillStyle = '#120c0c'; g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(200,180,160,0.45)'; g.lineWidth = 2; g.beginPath(); L.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
        g.fillStyle = 'rgba(255,224,102,0.7)'; for (let k = 0; k < 4; k++) { const p = L[1 + (R() * 6 | 0)]; g.fillRect(p[0] + 1, p[1] + 2, 2, 2); }
      }
    },
    canyon(g, R, S) {
      // steep layered walls around the edge, so the region reads as a gorge you walk down into
      const c = S / 2;
      for (let i = 0; i < 9; i++) {
        const r = c * (0.62 + i * 0.045);
        g.strokeStyle = i % 2 ? 'rgba(30,20,20,0.55)' : 'rgba(110,85,70,0.55)'; g.lineWidth = c * 0.05;
        g.beginPath(); for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU, rr = r + Math.sin(a * 7 + i) * 8; k ? g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr) : g.moveTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); } g.stroke();
      }
      g.strokeStyle = 'rgba(220,200,180,0.5)'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const r = c * (0.6 + i * 0.09); g.beginPath(); g.arc(c, c, r, R() * TAU, R() * TAU + 1.5); g.stroke(); }
    },
    strata(g, R, S) {
      for (let i = 0; i < 26; i++) { const y = R() * S, x = R() * S, w = 60 + R() * 120; g.strokeStyle = R() > 0.5 ? 'rgba(255,200,150,0.35)' : 'rgba(110,40,20,0.35)'; g.lineWidth = 3 + R() * 3; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + w * 0.3, y - 4, x + w * 0.6, y + 4, x + w, y); g.stroke(); }
    },
    mud(g, R, S) {
      // dried mud polygons
      g.strokeStyle = 'rgba(60,40,25,0.55)'; g.lineWidth = 2;
      for (let i = 0; i < 60; i++) {
        const cx = R() * S, cy = R() * S, r = 18 + R() * 14; g.beginPath();
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + R() * 0.4; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.6; k ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.closePath(); g.stroke();
      }
    },
    patina(g, R, S) { for (let i = 0; i < 30; i++) { const x = R() * S, y = R() * S; g.fillStyle = 'rgba(79,224,176,0.22)'; g.beginPath(); g.ellipse(x, y, 10 + R() * 22, 4 + R() * 8, R(), 0, TAU); g.fill(); } },
    dunes(g, R, S) {
      for (let i = 0; i < 40; i++) {
        const x = R() * S, y = R() * S, w = 80 + R() * 120;
        g.fillStyle = 'rgba(170,120,70,0.18)'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 18, x + w, y); g.quadraticCurveTo(x + w / 2, y + 8, x, y); g.fill();
        g.strokeStyle = 'rgba(255,245,215,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 18, x + w, y); g.stroke();
      }
    },
    water(g, R, S) {
      for (let i = 0; i < 50; i++) { const x = R() * S, y = R() * S, w = 20 + R() * 40; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 4, y - 4, x + w / 2, y); g.quadraticCurveTo(x + w * 0.75, y + 4, x + w, y); g.stroke(); }
      for (let i = 0; i < 20; i++) { const x = R() * S, y = R() * S, r = 20 + R() * 40; g.fillStyle = 'rgba(20,120,140,0.18)'; g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, TAU); g.fill(); }
    },
    sand(g, R, S) { for (let i = 0; i < 18; i++) { const x = R() * S, y = R() * S, r = 20 + R() * 30; g.fillStyle = 'rgba(255,235,190,0.3)'; g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, TAU); g.fill(); } },
  };

  const K = 0.75; // texture resolution relative to world units

  // Paint a region's ground once into a canvas that fades out at the region's edge.
  function texture(reg, b, seed) {
    const r = reg.r + 40, S = Math.ceil(r * 2 * K);
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), R = SF.rng(seed);
    g.fillStyle = b.ground; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 30; i++) {
      const x = R() * S, y = R() * S, rr = 40 + R() * 90, gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, R() > 0.5 ? b.light : b.dark); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    }
    for (const m of b.marks) MARKS[m](g, R, S, b);
    // soft edge so the biome blends into the land around it
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createRadialGradient(S / 2, S / 2, (reg.r - 150) * K, S / 2, S / 2, r * K);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade; g.fillRect(0, 0, S, S);
    return { canvas: c, x: reg.x - r, y: reg.y - r, size: r * 2 };
  }

  // ---------- standing scenery ----------
  const shadow = (ctx, x, y, rx, ry) => { ctx.fillStyle = 'rgba(28,10,38,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); };
  const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };

  const DECOR = {
    vent(ctx, d, t, b) {
      shadow(ctx, 0, 2, 26, 9);
      ctx.fillStyle = '#2a1a22'; poly(ctx, [[-24, 0], [-12, -22], [12, -24], [24, 0]]); ctx.fill();
      ctx.fillStyle = b.glow || '#ff7a2a'; ctx.beginPath(); ctx.ellipse(0, -22, 10, 4, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 3; i++) { const k = (t * 0.4 + i / 3 + d.p) % 1; ctx.globalAlpha = (1 - k) * 0.45; ctx.fillStyle = '#b8a8a8'; ctx.beginPath(); ctx.arc(Math.sin(k * 4 + i) * 8, -26 - k * 70, 6 + k * 14, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    basalt(ctx, d) {
      shadow(ctx, 0, 2, 24, 8);
      for (let i = 0; i < 4; i++) { const x = -18 + i * 11, h = 20 + d.h * 30 - Math.abs(i - 1.5) * 8; ctx.fillStyle = i % 2 ? '#2e1e28' : '#3e2a36'; poly(ctx, [[x - 5, 0], [x - 5, -h], [x, -h - 4], [x + 5, -h], [x + 5, 0]]); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x - 5, -h, 2, h); }
    },
    glowtree(ctx, d, t, b) {
      shadow(ctx, 0, 2, 30, 10);
      ctx.strokeStyle = '#1e1430'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-8, -40, 4, -80 - d.h * 30); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -40); ctx.quadraticCurveTo(18, -50, 24, -66); ctx.moveTo(2, -56); ctx.quadraticCurveTo(-16, -64, -22, -78); ctx.stroke();
      ctx.lineCap = 'butt';
      const top = -80 - d.h * 30, cols = b.flower;
      for (let i = 0; i < 5; i++) {
        const x = [4, 24, -22, 14, -8][i], y = [top, -66, -78, top + 14, top + 10][i], c = cols[i % cols.length], p = 1 + Math.sin(t * 2 + i + d.p) * 0.08;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, 26); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.45; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, 10 * p, 7 * p, 0, Math.PI, TAU); ctx.fill();
      }
    },
    stone(ctx, d, t, b) {
      shadow(ctx, 0, 2, 16, 6);
      ctx.fillStyle = '#4a4060'; poly(ctx, [[-10, 0], [-8, -34], [0, -40], [8, -34], [10, 0]]); ctx.fill();
      ctx.strokeStyle = b.glow; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + Math.sin(t * 2 + d.p) * 0.3;
      ctx.beginPath(); ctx.moveTo(-3, -28); ctx.lineTo(3, -22); ctx.lineTo(-3, -14); ctx.moveTo(0, -10); ctx.lineTo(0, -6); ctx.stroke(); ctx.globalAlpha = 1;
    },
    drift(ctx, d) {
      ctx.fillStyle = '#f4f9ff'; ctx.beginPath(); ctx.ellipse(0, 0, 40 + d.h * 20, 14, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(150,180,220,0.4)'; ctx.beginPath(); ctx.ellipse(8, -2, 28, 6, 0, Math.PI, TAU); ctx.fill();
    },
    iceblock(ctx, d) {
      shadow(ctx, 0, 2, 22, 7);
      const g = ctx.createLinearGradient(0, -40, 0, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#7fa8de');
      ctx.fillStyle = g; poly(ctx, [[-18, 0], [-14, -28 - d.h * 14], [6, -36 - d.h * 14], [18, -20], [16, 0]]); ctx.fill();
      ctx.strokeStyle = 'rgba(40,70,120,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-11, -4); ctx.lineTo(-9, -24); ctx.stroke();
    },
    floatrock(ctx, d, t, b) {
      const z = 40 + Math.sin(t * 1.2 + d.p) * 8;
      shadow(ctx, 0, 2, 18, 6);
      ctx.fillStyle = '#3a2458'; poly(ctx, [[-20, -z], [-12, -z - 10], [10, -z - 12], [20, -z - 2], [6, -z + 18], [-6, -z + 14]]); ctx.fill();
      ctx.fillStyle = 'rgba(224,166,255,0.5)'; ctx.fillRect(-12, -z - 9, 20, 3);
      ctx.fillStyle = b.glow; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, -z + 22 + Math.sin(t * 3) * 2, 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    },
    obelisk(ctx, d, t, b) {
      shadow(ctx, 0, 2, 16, 6);
      ctx.fillStyle = '#1e1230'; poly(ctx, [[-10, 0], [-7, -70], [0, -80], [7, -70], [10, 0]]); ctx.fill();
      ctx.fillStyle = b.glow; ctx.globalAlpha = 0.5 + Math.sin(t * 2 + d.p) * 0.4;
      for (let i = 0; i < 4; i++) ctx.fillRect(-2, -64 + i * 14, 4, 6);
      ctx.globalAlpha = 1;
    },
    shrub(ctx, d, t, b) {
      shadow(ctx, 0, 2, 22, 7);
      const dark = b.leaves ? '#a0501a' : '#1f4f22', light = b.leaves ? '#e08a30' : '#3e8a3a';
      for (const [x, y, r] of [[-12, -10, 12], [10, -10, 13], [0, -20, 14]]) { ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = light; ctx.beginPath(); ctx.arc(x - 3, y - 3, r * 0.65, 0, TAU); ctx.fill(); }
    },
    fern(ctx, d) {
      ctx.strokeStyle = '#2e7a34'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { const a = -Math.PI / 2 + i * 0.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a) * 14, Math.sin(a) * 22, Math.cos(a) * 26, Math.sin(a) * 26 + 8); ctx.stroke(); }
      ctx.lineCap = 'butt';
    },
    boulder(ctx, d) {
      shadow(ctx, 0, 2, 26, 8);
      ctx.fillStyle = '#5e5856'; poly(ctx, [[-24, 0], [-20, -18], [-4, -28 - d.h * 10], [16, -22], [24, 0]]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; poly(ctx, [[-20, -18], [-4, -28 - d.h * 10], [2, -16], [-12, -10]]); ctx.fill();
      ctx.strokeStyle = 'rgba(20,16,16,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4, -20); ctx.lineTo(8, -6); ctx.stroke();
    },
    scaffold(ctx) {
      shadow(ctx, 0, 2, 30, 8);
      ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-24, -70); ctx.moveTo(24, 0); ctx.lineTo(24, -70); ctx.moveTo(-28, -70); ctx.lineTo(28, -70); ctx.moveTo(-24, -35); ctx.lineTo(24, -35); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(24, -35); ctx.moveTo(-24, -35); ctx.lineTo(24, -70); ctx.stroke();
      // pulley with a hanging bucket
      ctx.strokeStyle = '#3a3030'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, -70); ctx.lineTo(10, -46); ctx.stroke();
      ctx.fillStyle = '#6b7280'; ctx.fillRect(4, -46, 12, 9);
    },
    cart(ctx) {
      shadow(ctx, 0, 2, 26, 7);
      ctx.strokeStyle = '#8a8f99'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-40, 4); ctx.lineTo(40, 4); ctx.moveTo(-40, 9); ctx.lineTo(40, 9); ctx.stroke();
      ctx.fillStyle = '#6b4a2a'; for (let x = -36; x <= 36; x += 12) ctx.fillRect(x, 2, 4, 9);
      ctx.fillStyle = '#5a5258'; poly(ctx, [[-18, -2], [-22, -20], [22, -20], [18, -2]]); ctx.fill();
      ctx.fillStyle = '#9a9aa2'; ctx.beginPath(); ctx.ellipse(0, -20, 18, 6, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#b5592a'; ctx.fillRect(-8, -24, 6, 4);
      ctx.fillStyle = '#26222a'; ctx.beginPath(); ctx.arc(-12, 2, 4, 0, TAU); ctx.arc(12, 2, 4, 0, TAU); ctx.fill();
    },
    spire(ctx, d) {
      shadow(ctx, 0, 2, 22, 7);
      const h = 70 + d.h * 60;
      ctx.fillStyle = '#3a3030'; poly(ctx, [[-20, 0], [-10, -h * 0.6], [-4, -h], [6, -h * 0.7], [20, 0]]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; poly(ctx, [[-20, 0], [-10, -h * 0.6], [-4, -h], [-6, 0]]); ctx.fill();
      ctx.strokeStyle = 'rgba(15,10,10,0.6)'; ctx.lineWidth = 1.5;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-16 + i * 2, -h * i / 5); ctx.lineTo(14 - i * 3, -h * i / 5 + 4); ctx.stroke(); }
    },
    lantern(ctx, d, t) {
      ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -50); ctx.lineTo(10, -50); ctx.stroke();
      const fl = 0.7 + Math.sin(t * 9 + d.p) * 0.2;
      const gr = ctx.createRadialGradient(10, -40, 0, 10, -40, 30); gr.addColorStop(0, `rgba(255,200,100,${fl})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(10, -40, 30, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd27a'; ctx.fillRect(7, -46, 6, 9);
    },
    oldtree(ctx, d, t) {
      shadow(ctx, 0, 2, 34, 11);
      ctx.fillStyle = '#5a3a20'; poly(ctx, [[-14, 0], [-8, -60], [8, -60], [14, 0]]); ctx.fill();
      ctx.fillStyle = '#7a5030'; ctx.fillRect(-7, -58, 4, 56);
      ctx.fillStyle = '#ffc23d'; ctx.beginPath(); ctx.ellipse(5, -30, 3, 5, 0, 0, TAU); ctx.fill();
      const s = Math.sin(t * 1.2 + d.p) * 2;
      for (const [x, y, r, c] of [[-20, -66, 22, '#c0601a'], [18, -70, 22, '#d0801a'], [0, -88, 26, '#e09a30'], [-6, -72, 18, '#ffb340']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + s, y, r, 0, TAU); ctx.fill(); }
    },
    butte(ctx, d) {
      // eroded rock tower: jagged sides, wavy strata, a sunlit flank and scree at its foot
      const w = 26 + d.h * 18, h = 46 + d.h * 36, R = SF.rng((d.p * 1e6) | 0);
      const left = [], right = [];
      for (let i = 0; i <= 6; i++) {
        const k = i / 6, y = -h * k, flare = (1 - k) * (1 - k) * 14;
        left.push([-w - flare + (R() - 0.5) * 7, y]); right.push([w + flare + (R() - 0.5) * 7, y]);
      }
      const top = [[-w * 0.7, -h - 4 - R() * 4], [-w * 0.1, -h - 6 - R() * 5], [w * 0.5, -h - 3 - R() * 4]];
      const outline = left.concat(top, right.reverse());
      ctx.fillStyle = 'rgba(90,30,15,0.28)'; ctx.beginPath(); ctx.ellipse(6, 1, w + 22, 9, 0, 0, TAU); ctx.fill();
      ctx.save(); poly(ctx, outline);
      const g = ctx.createLinearGradient(-w, 0, w, 0);
      g.addColorStop(0, '#e08a58'); g.addColorStop(0.45, '#c4683c'); g.addColorStop(1, '#8a3c22');
      ctx.fillStyle = g; ctx.fill(); ctx.clip();
      // wavy rock layers
      for (let i = 1; i < 6; i++) {
        const y = -h * i / 6;
        ctx.strokeStyle = i % 2 ? 'rgba(255,215,170,0.45)' : 'rgba(90,30,15,0.45)'; ctx.lineWidth = 3 + (i % 3);
        ctx.beginPath(); ctx.moveTo(-w - 20, y); for (let x = -w - 20; x <= w + 20; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.12 + i + d.p) * 2.5); ctx.stroke();
      }
      // vertical erosion grooves
      ctx.strokeStyle = 'rgba(70,22,10,0.35)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) { const x = -w * 0.8 + i * w * 0.4 + (R() - 0.5) * 6; ctx.beginPath(); ctx.moveTo(x, -h * (0.5 + R() * 0.4)); ctx.quadraticCurveTo(x + 3, -h * 0.3, x - 1, 2); ctx.stroke(); }
      // the base fades into the ground colour so it sits in the sand
      const base = ctx.createLinearGradient(0, -14, 0, 2); base.addColorStop(0, 'rgba(184,96,58,0)'); base.addColorStop(1, 'rgba(184,96,58,0.9)');
      ctx.fillStyle = base; ctx.fillRect(-w - 30, -14, w * 2 + 60, 18);
      ctx.restore();
      ctx.strokeStyle = 'rgba(70,22,10,0.55)'; ctx.lineWidth = 1.5; poly(ctx, outline); ctx.stroke();
      // sunlit cap
      ctx.fillStyle = 'rgba(255,215,170,0.55)'; poly(ctx, [top[0], top[1], top[2], [w * 0.4, -h + 3], [-w * 0.6, -h + 4]]); ctx.fill();
      // scree around the foot
      for (let i = 0; i < 7; i++) { const x = (R() - 0.5) * (w * 2 + 30), y = R() * 6; ctx.fillStyle = R() > 0.5 ? '#a04a28' : '#d88a5a'; ctx.beginPath(); ctx.ellipse(x, y, 2 + R() * 4, 1.5 + R() * 2, 0, 0, TAU); ctx.fill(); }
    },
    deadbush(ctx) {
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.6;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(i * 8, -14 - Math.abs(i) * 2); ctx.lineTo(i * 11, -20); ctx.stroke(); }
    },
    skull(ctx, d) {
      ctx.fillStyle = 'rgba(170,120,70,0.4)'; ctx.beginPath(); ctx.ellipse(0, 2, 30, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f3ead6'; ctx.beginPath(); ctx.ellipse(0, -10, 24, 16, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#5e4f35'; ctx.beginPath(); ctx.ellipse(-8, -12, 5, 4, 0, 0, TAU); ctx.ellipse(8, -12, 5, 4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#b5a383'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(20, -14); ctx.quadraticCurveTo(40, -30, 34, -46); ctx.stroke();
    },
    ribs(ctx) {
      ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) { const x = -18 + i * 12; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 6, -26, x + 14, -20); ctx.stroke(); }
      ctx.lineCap = 'butt';
    },
    rockpool(ctx, d, t) {
      ctx.fillStyle = '#8a8a7a'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 14, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a9fb8'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; const k = (t * 0.5 + d.p) % 1;
      ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(-4, 0, 6 + k * 14, 2 + k * 5, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    },
    seaweed(ctx, d, t) {
      ctx.strokeStyle = '#2a8a5a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) { const s = Math.sin(t * 1.5 + d.p + i) * 6; ctx.beginPath(); ctx.moveTo(i * 8, 0); ctx.quadraticCurveTo(i * 8 + s, -20, i * 10 - s, -40 - Math.abs(i) * -8); ctx.stroke(); }
      ctx.lineCap = 'butt';
    },
    starfish(ctx, d) {
      ctx.save(); ctx.rotate(d.p); ctx.fillStyle = '#ff8f5a';
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 4 : 11; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6); } ctx.closePath(); ctx.fill();
      ctx.restore();
    },
  };

  // Place scenery in a region, away from resource nodes and buildings.
  function scatter(reg, b, R, avoid) {
    const list = [];
    for (let tries = 0; list.length < 12 && tries < 600; tries++) {
      const kind = b.decor[list.length % b.decor.length], edge = kind === 'spire' || kind === 'butte';
      const a = R() * TAU, d = (edge ? 0.72 + R() * 0.2 : 0.3 + R() * 0.6) * (reg.r - 40), x = reg.x + Math.cos(a) * d, y = reg.y + Math.sin(a) * d;
      if (avoid.some(o => Math.hypot(o.x - x, o.y - y) < o.r)) continue;
      if (list.some(o => Math.hypot(o.x - x, o.y - y) < 90)) continue;
      list.push({ kind, x, y, h: R(), p: R() * TAU, biome: b });
    }
    return list;
  }

  function draw(ctx, d, t) { ctx.save(); ctx.translate(d.x, d.y); DECOR[d.kind](ctx, d, t, d.biome); ctx.restore(); }

  // Fireflies and similar small lights drawn over an open biome.
  function ambient(ctx, reg, b, t) {
    if (!b.fireflies) return;
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4 + t * 0.15 * (i % 2 ? 1 : -1), d = (0.3 + (i * 0.37) % 0.6) * reg.r;
      const x = reg.x + Math.cos(a) * d, y = reg.y + Math.sin(a * 1.3) * d * 0.7 - 30, k = 0.5 + Math.sin(t * 3 + i) * 0.5;
      ctx.globalAlpha = k; ctx.fillStyle = b.fireflies; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
      ctx.globalAlpha = k * 0.3; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return { BIOMES, texture, scatter, draw, ambient };
})();
