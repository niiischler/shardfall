// Own looks for the far planets, Petra and Edenia: carried items, resource nodes, machines, ground and scenery,
// the bee drone and the drivers' vehicles. Everything plugs into the tables of SF.Render and SF.Biomes.
SF.Art = (function () {
  const Rn = SF.Render, B = SF.Biomes, TAU = Math.PI * 2;
  const { poly, rgba, glow, shadow, roundRect } = Rn;
  const hex = (ctx, x, y, r) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); };

  // ---------- carried items ----------
  Object.assign(Rn.ITEMS, {
    // Edenia
    melonslice(ctx, R) {
      ctx.beginPath(); ctx.moveTo(-9, -2); ctx.arc(0, -2, 9, 0, Math.PI); ctx.closePath();
      ctx.fillStyle = R.leafDark; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7.5, -2); ctx.arc(0, -2, 7.5, 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#f4ffe6'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6.5, -2); ctx.arc(0, -2, 6.5, 0, Math.PI); ctx.closePath(); ctx.fillStyle = R.color; ctx.fill();
      ctx.fillStyle = '#3a5a2a'; for (const [x, y] of [[-3, 0], [0, 2], [3, 0]]) { ctx.beginPath(); ctx.ellipse(x, y, 0.9, 1.4, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(5, -6, 2.6, 0, TAU); ctx.fill(); ctx.fillStyle = R.leafDark; ctx.beginPath(); ctx.arc(6.2, -6.8, 2.2, 0, TAU); ctx.fill();
    },
    vial(ctx, R) {
      ctx.fillStyle = 'rgba(230,250,255,0.5)'; ctx.strokeStyle = R.edge; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-2.5, -7); ctx.lineTo(-2.5, -3); ctx.quadraticCurveTo(-7, 0, -7, 3); ctx.arc(0, 3, 7, Math.PI, 0, true); ctx.quadraticCurveTo(7, 0, 2.5, -3); ctx.lineTo(2.5, -7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = R.color; ctx.beginPath(); ctx.moveTo(-6.6, 3); ctx.arc(0, 3, 6.6, Math.PI, 0, true); ctx.closePath(); ctx.fill();
      ctx.fillStyle = R.dark; ctx.fillRect(-6.5, 2.5, 13, 1.2);
      ctx.fillStyle = '#a8703f'; ctx.fillRect(-3, -10, 6, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(-4.5, 0, 1.4, 5);
    },
    pod(ctx, R) {
      ctx.save(); ctx.rotate(-0.5);
      ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 10, 0, 0, TAU); ctx.fillStyle = R.dark; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-1, -0.5, 3, 8.5, 0, 0, TAU); ctx.fillStyle = R.color; ctx.fill();
      ctx.strokeStyle = rgba(R.edge, 0.6); ctx.lineWidth = 0.9; for (const y of [-5, -1.5, 2, 5.5]) { ctx.beginPath(); ctx.moveTo(-3.5, y); ctx.quadraticCurveTo(0, y + 1.5, 3.5, y); ctx.stroke(); }
      ctx.strokeStyle = R.leafDark; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(2, -13, 4, -12); ctx.stroke();
      ctx.restore();
    },
    comb(ctx, R) {
      for (const [x, y] of [[-4, 2], [4, 2], [0, -5]]) {
        hex(ctx, x, y, 5); ctx.fillStyle = R.dark; ctx.fill(); ctx.lineWidth = 1.1; ctx.strokeStyle = R.edge; ctx.stroke();
        hex(ctx, x, y, 3.2); ctx.fillStyle = R.color; ctx.fill();
      }
      ctx.fillStyle = R.color; ctx.beginPath(); ctx.moveTo(2, 6); ctx.quadraticCurveTo(3.5, 10, 2, 11); ctx.quadraticCurveTo(0.5, 10, 2, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-1.5, -7, 1.5, 1.5);
    },
    truffle(ctx, R) {
      ctx.fillStyle = R.edge; ctx.beginPath(); ctx.arc(-2, 1, 6.5, 0, TAU); ctx.arc(3, -1, 5.5, 0, TAU); ctx.fill();
      ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(-2, 1, 5.6, 0, TAU); ctx.arc(3, -1, 4.7, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(R.color, 0.8); for (const [x, y] of [[-4, -1], [-1, 3], [2, -3], [4, 1], [-3, 4]]) { ctx.beginPath(); ctx.arc(x, y, 0.9, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#fff8d0'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? 1.2 : 3.6; ctx.lineTo(5 + Math.cos(a) * r, -6 + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
    },
    // Petra
    sulfurlump(ctx, R) {
      poly(ctx, [[-8, 4], [-7, -2], [-2, -5], [4, -4], [8, 1], [6, 6], [-4, 7]]); ctx.fillStyle = R.dark; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      ctx.fillStyle = R.color;
      for (const [x, y, s] of [[-4, -1, 3], [1, -2, 3.5], [4, 2, 2.5], [-1, 3, 2.5]]) { ctx.fillRect(x - s / 2, y - s / 2, s, s); }
      ctx.fillStyle = '#fffbd0'; ctx.fillRect(0, -3, 1.5, 1.5);
    },
    blade(ctx, R) {
      poly(ctx, [[-5, 8], [-6, 0], [1, -10], [6, -3], [4, 8]]); ctx.fillStyle = R.edge; ctx.fill(); ctx.lineWidth = 1.1; ctx.strokeStyle = '#000'; ctx.stroke();
      poly(ctx, [[-5, 8], [-6, 0], [1, -10], [0, 8]]); ctx.fillStyle = R.dark; ctx.fill();
      ctx.strokeStyle = rgba(R.color, 0.9); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(0, -7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(2, -5); ctx.lineTo(4, -1); ctx.stroke();
    },
    opal(ctx, R) {
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, TAU); ctx.fillStyle = R.edge; ctx.fill();
      const g = ctx.createLinearGradient(-7, -5, 7, 5);
      g.addColorStop(0, '#7fd8ff'); g.addColorStop(0.35, R.color); g.addColorStop(0.65, '#ffcf4a'); g.addColorStop(1, '#9be36a');
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, TAU); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(-3, -2, 2.4, 1.2, -0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.5); ctx.fillRect(2, 1, 1.4, 1.4);
    },
  });

  // ---------- resource nodes ----------
  const between = (R, a, b) => a + R() * (b - a);
  Object.assign(Rn.NODES, {
    // Moonmelons lying on a spread of vines, each with a pale crescent.
    melon: {
      top: 56,
      init(n, R) {
        n.melons = [{ x: -16, y: -6, r: 14 }, { x: 14, y: -4, r: 12 }, { x: 0, y: 6, r: 15 }].map(m => ({ x: m.x + between(R, -3, 3), y: m.y, r: m.r * between(R, 0.9, 1.1), a: between(R, -0.4, 0.4) }));
        n.leaves = Array.from({ length: 7 }, () => ({ x: between(R, -32, 32), y: between(R, -10, 12), a: R() * TAU }));
      },
      base(ctx, n, R) {
        ctx.strokeStyle = R.leafDark; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        for (const l of n.leaves) { ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(l.x * 0.5, l.y - 10, l.x, l.y); ctx.stroke(); }
        ctx.lineCap = 'butt';
        for (const l of n.leaves) { ctx.fillStyle = R.leaf; ctx.beginPath(); ctx.ellipse(l.x, l.y, 8, 4.5, l.a, 0, TAU); ctx.fill(); }
      },
      alive(ctx, n, R, t, ov) {
        for (const m of n.melons) {
          ctx.save(); ctx.translate(m.x, m.y - m.r * 0.7); ctx.rotate(m.a);
          ctx.beginPath(); ctx.ellipse(0, 0, m.r * 1.15, m.r * 0.85, 0, 0, TAU); ctx.fillStyle = ov || R.dark; ctx.fill();
          if (!ov) {
            ctx.lineWidth = 1.5; ctx.strokeStyle = R.edge; ctx.stroke();
            ctx.save(); ctx.clip();
            ctx.strokeStyle = rgba(R.color, 0.8); ctx.lineWidth = 3;
            for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(k * m.r * 0.38, 0, m.r * 0.25, m.r, 0, 0, TAU); ctx.stroke(); }
            ctx.restore();
            // the moon mark
            ctx.fillStyle = '#fbffe8'; ctx.beginPath(); ctx.arc(-m.r * 0.35, -m.r * 0.25, m.r * 0.3, 0, TAU); ctx.fill();
            ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(-m.r * 0.25, -m.r * 0.32, m.r * 0.26, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(m.r * 0.3, -m.r * 0.45, m.r * 0.35, m.r * 0.15, -0.3, 0, TAU); ctx.fill();
          }
          ctx.restore();
        }
        if (!ov) for (let i = 0; i < 2; i++) { const k = (t * 0.4 + i * 0.5 + n.phase) % 1; ctx.fillStyle = `rgba(251,255,232,${Math.sin(k * Math.PI) * 0.8})`; ctx.beginPath(); ctx.arc(-14 + i * 26, -26 - k * 14, 1.6, 0, TAU); ctx.fill(); }
      },
      dead(ctx, n, R) { ctx.fillStyle = R.leafDark; ctx.beginPath(); ctx.ellipse(0, -2, 14, 4, 0, 0, TAU); ctx.fill(); },
    },
    // Tall chalice blooms with a drop of dew in every cup.
    bloom: {
      top: 84,
      init(n, R) { n.stems = [{ x: -16, h: between(R, 34, 44), s: 0.8 }, { x: 14, h: between(R, 40, 50), s: 0.85 }, { x: 0, h: between(R, 56, 66), s: 1 }]; },
      glow(ctx, n, R, t) { glow(ctx, 0, -50, 50, rgba(R.color, 0.7), 0.2 + Math.sin(t * 2 + n.phase) * 0.06); },
      alive(ctx, n, R, t, ov) {
        for (const st of n.stems) {
          const sw = Math.sin(t * 1.3 + n.phase + st.x) * 3, tx = st.x + sw, ty = -st.h;
          ctx.strokeStyle = ov || '#3a8a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(st.x * 0.4, 0); ctx.quadraticCurveTo(st.x, -st.h * 0.5, tx, ty); ctx.stroke();
          if (!ov) { ctx.fillStyle = '#4fae5a'; ctx.beginPath(); ctx.ellipse(st.x * 0.7 - 5, -st.h * 0.35, 8, 3, -0.6, 0, TAU); ctx.fill(); }
          ctx.save(); ctx.translate(tx, ty); ctx.scale(st.s, st.s);
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i - 2) * 0.42;
            ctx.fillStyle = ov || (i % 2 ? R.color : R.dark);
            ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(Math.cos(a) * 22 - 4, Math.sin(a) * 12 - 2, Math.cos(a) * 16, Math.sin(a) * 20); ctx.quadraticCurveTo(Math.cos(a) * 8 + 4, Math.sin(a) * 6, 0, 4); ctx.fill();
          }
          if (!ov) {
            ctx.fillStyle = rgba(R.edge, 0.5); ctx.beginPath(); ctx.ellipse(0, -6, 9, 3, 0, 0, TAU); ctx.fill();
            const k = 0.6 + Math.sin(t * 3 + st.x) * 0.4;
            ctx.fillStyle = `rgba(220,250,255,${0.6 + k * 0.3})`; ctx.beginPath(); ctx.arc(0, -8, 3.6, 0, TAU); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.fillRect(-1.5, -10, 1.4, 1.4);
          }
          ctx.restore();
        }
      },
      dead(ctx, n, R) { ctx.strokeStyle = '#3a8a4a'; ctx.lineWidth = 3; for (const st of n.stems) { ctx.beginPath(); ctx.moveTo(st.x * 0.4, 0); ctx.lineTo(st.x * 0.6, -8); ctx.stroke(); } },
    },
    // A low spice shrub on cinnamon-bark stems, hung with orange pods.
    spicebush: {
      top: 70,
      init(n, R) { n.pods = Array.from({ length: 8 }, () => ({ x: between(R, -30, 30), y: between(R, -46, -18), a: between(R, -0.4, 0.4) })); },
      alive(ctx, n, R, t, ov) {
        ctx.strokeStyle = ov || '#7a3a1a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (const dx of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(dx * 0.3, 0); ctx.quadraticCurveTo(dx * 0.8, -18, dx * 1.4, -32); ctx.stroke(); }
        ctx.lineCap = 'butt';
        for (const [x, y, r] of [[-20, -32, 16], [18, -34, 15], [0, -44, 18], [-6, -26, 14], [10, -24, 13]]) {
          ctx.fillStyle = ov || R.leafDark; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, TAU); ctx.fill();
          if (!ov) { ctx.fillStyle = R.leaf; ctx.beginPath(); ctx.ellipse(x - 3, y - 4, r * 0.65, r * 0.4, 0, 0, TAU); ctx.fill(); }
        }
        if (ov) return;
        for (const p of n.pods) {
          const sw = Math.sin(t * 2 + p.x) * 0.1;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a + sw);
          ctx.strokeStyle = '#5a2a10'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 0); ctx.stroke();
          ctx.fillStyle = R.edge; ctx.beginPath(); ctx.ellipse(0, 6, 3.4, 7, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = R.color; ctx.beginPath(); ctx.ellipse(-0.6, 5.5, 2.4, 6, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
      },
      dead(ctx, n, R) { ctx.strokeStyle = '#7a3a1a'; ctx.lineWidth = 4; for (const dx of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(dx * 0.3, 0); ctx.lineTo(dx, -10); ctx.stroke(); } },
    },
    // A slab of rock with a big honeycomb hanging off it; bees circle around.
    hive: {
      top: 86,
      init(n, R) { n.cells = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 4 - (r === 3 ? 1 : 0); c++) n.cells.push({ x: -15 + c * 10 + (r % 2) * 5, y: -58 + r * 9, full: R() > 0.25 }); },
      alive(ctx, n, R, t, ov) {
        ctx.fillStyle = ov || '#7a6a58'; poly(ctx, [[-30, 0], [-26, -50], [-14, -76], [12, -80], [28, -60], [30, 0]]); ctx.fill();
        if (!ov) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; poly(ctx, [[8, 0], [12, -80], [28, -60], [30, 0]]); ctx.fill();
          ctx.strokeStyle = 'rgba(255,240,210,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-24, -40); ctx.lineTo(20, -46); ctx.moveTo(-26, -20); ctx.lineTo(22, -24); ctx.stroke();
        }
        // the comb
        ctx.fillStyle = ov || R.dark; ctx.beginPath(); ctx.ellipse(0, -44, 24, 26, 0, 0, TAU); ctx.fill();
        if (ov) return;
        ctx.strokeStyle = R.edge; ctx.lineWidth = 1.5; ctx.stroke();
        for (const c of n.cells) { hex(ctx, c.x, c.y, 4.6); ctx.fillStyle = c.full ? R.color : rgba(R.edge, 0.7); ctx.fill(); ctx.strokeStyle = R.edge; ctx.lineWidth = 0.8; ctx.stroke(); }
        // honey drip
        const d = (t * 0.3 + n.phase) % 1;
        ctx.fillStyle = R.color; ctx.beginPath(); ctx.moveTo(-4, -20); ctx.quadraticCurveTo(-2, -16 + d * 10, -4, -14 + d * 12); ctx.quadraticCurveTo(-6, -16 + d * 10, -4, -20); ctx.fill();
        // bees
        for (let i = 0; i < 4; i++) {
          const a = t * (1.6 + i * 0.3) + i * 1.7 + n.phase, x = Math.cos(a) * (30 + i * 4), y = -50 + Math.sin(a * 1.4) * 18;
          ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.ellipse(x, y, 3.2, 2.2, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#2a1a08'; ctx.fillRect(x - 0.6, y - 2, 1.2, 4);
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - 1, y - 3, 2, 1.2, -0.5, 0, TAU); ctx.fill();
        }
      },
      dead(ctx, n, R) { ctx.fillStyle = '#7a6a58'; poly(ctx, [[-26, 0], [-22, -30], [10, -34], [26, 0]]); ctx.fill(); },
    },
    // Knobbly truffles half buried in a mound, twinkling like stars.
    truffle: {
      top: 44,
      init(n, R) { n.knobs = [{ x: -12, y: -10, r: 9 }, { x: 8, y: -12, r: 11 }, { x: -1, y: -4, r: 8 }, { x: 18, y: -4, r: 6 }].map(k => ({ x: k.x + between(R, -2, 2), y: k.y, r: k.r * between(R, 0.85, 1.15) })); },
      base(ctx, n) { ctx.fillStyle = '#4a3a2e'; ctx.beginPath(); ctx.ellipse(0, -2, n.r * 1.2, n.r * 0.45, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#5e4a3a'; ctx.beginPath(); ctx.ellipse(-4, -4, n.r * 0.9, n.r * 0.3, 0, 0, TAU); ctx.fill(); },
      alive(ctx, n, R, t, ov) {
        for (const k of n.knobs) {
          ctx.fillStyle = ov || R.edge; ctx.beginPath(); ctx.arc(k.x, k.y, k.r, Math.PI, TAU); ctx.closePath(); ctx.fill();
          if (ov) continue;
          ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(k.x - 1, k.y - 1, k.r * 0.85, Math.PI, TAU); ctx.closePath(); ctx.fill();
          ctx.fillStyle = rgba(R.color, 0.7); for (let i = 0; i < 4; i++) { const a = Math.PI + (i + 0.5) / 4 * Math.PI; ctx.beginPath(); ctx.arc(k.x + Math.cos(a) * k.r * 0.6, k.y + Math.sin(a) * k.r * 0.6, 1.1, 0, TAU); ctx.fill(); }
        }
        if (ov) return;
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.6 + i / 3 + n.phase) % 1, s = Math.sin(k * Math.PI) * 4, x = -14 + i * 14, y = -22 - i % 2 * 8;
          ctx.fillStyle = '#fff8d0'; ctx.beginPath(); for (let j = 0; j < 8; j++) { const a = j / 8 * TAU, r = j % 2 ? s * 0.3 : s; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill();
        }
      },
      dead(ctx, n) { ctx.fillStyle = '#3a2c22'; ctx.beginPath(); ctx.ellipse(0, -2, 12, 4, 0, 0, TAU); ctx.fill(); },
    },
    // Petra: a yellow-crusted vent ringed with sulfur crystals, steaming.
    fumarole: {
      top: 66,
      init(n, R) { n.xtals = Array.from({ length: 9 }, (_, i) => { const a = Math.PI + (i + 0.5) / 9 * Math.PI; return { x: Math.cos(a) * 24, y: Math.sin(a) * 10 - 16, s: between(R, 4, 7) }; }); },
      alive(ctx, n, R, t, ov) {
        ctx.fillStyle = ov || '#6a5a3a'; poly(ctx, [[-32, 0], [-24, -18], [-10, -26], [10, -26], [24, -18], [32, 0]]); ctx.fill();
        if (!ov) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; poly(ctx, [[6, 0], [10, -26], [24, -18], [32, 0]]); ctx.fill(); }
        ctx.fillStyle = ov || R.dark; ctx.beginPath(); ctx.ellipse(0, -24, 20, 7, 0, 0, TAU); ctx.fill();
        if (!ov) { ctx.fillStyle = '#2a2010'; ctx.beginPath(); ctx.ellipse(0, -24, 9, 3.4, 0, 0, TAU); ctx.fill(); }
        for (const x of n.xtals) {
          ctx.fillStyle = ov || R.color; poly(ctx, [[x.x - x.s * 0.6, x.y], [x.x - x.s * 0.4, x.y - x.s * 1.4], [x.x + x.s * 0.4, x.y - x.s * 1.6], [x.x + x.s * 0.6, x.y]]); ctx.fill();
          if (!ov) { ctx.fillStyle = '#fffbd0'; ctx.fillRect(x.x - x.s * 0.35, x.y - x.s * 1.2, 1.4, x.s * 0.8); }
        }
        if (ov) return;
        for (let i = 0; i < 4; i++) {
          const k = (t * 0.5 + i / 4 + n.phase) % 1;
          ctx.globalAlpha = (1 - k) * 0.5; ctx.fillStyle = i % 2 ? '#fff6c0' : '#e8e4d0';
          ctx.beginPath(); ctx.arc(Math.sin(k * 5 + i) * 7 * k, -30 - k * 50, 5 + k * 11, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
      dead(ctx, n, R) { ctx.fillStyle = '#6a5a3a'; ctx.beginPath(); ctx.ellipse(0, -3, 26, 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = R.dark; ctx.beginPath(); ctx.ellipse(0, -4, 10, 3, 0, 0, TAU); ctx.fill(); },
    },
    // Black volcanic glass breaking out of the ground in sharp, shiny blades.
    obsidian: {
      top: 88,
      init(n, R) {
        n.blades = Array.from({ length: 5 }, (_, i) => ({ x: -24 + i * 12 + between(R, -3, 3), h: (i === 2 ? 64 : between(R, 28, 48)), w: between(R, 9, 14), a: (i - 2) * 0.16 + between(R, -0.08, 0.08) }));
        n.blades.sort((a, b) => a.h - b.h);
      },
      glow(ctx, n, R, t) { glow(ctx, 0, -30, 50, rgba(R.color, 0.6), 0.18 + Math.sin(t * 1.5 + n.phase) * 0.06); },
      alive(ctx, n, R, t, ov) {
        for (const b of n.blades) {
          ctx.save(); ctx.translate(b.x, 0); ctx.rotate(b.a);
          poly(ctx, [[-b.w / 2, 0], [-b.w * 0.3, -b.h * 0.7], [b.w * 0.1, -b.h], [b.w / 2, -b.h * 0.55], [b.w / 2, 0]]);
          ctx.fillStyle = ov || R.edge; ctx.fill();
          if (!ov) {
            ctx.lineWidth = 1.4; ctx.strokeStyle = '#000'; ctx.stroke();
            poly(ctx, [[-b.w / 2, 0], [-b.w * 0.3, -b.h * 0.7], [b.w * 0.1, -b.h], [0, 0]]); ctx.fillStyle = R.dark; ctx.fill();
            ctx.strokeStyle = rgba(R.color, 0.9); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-b.w * 0.35, -4); ctx.lineTo(-b.w * 0.2, -b.h * 0.65); ctx.stroke();
          }
          ctx.restore();
        }
        if (ov) return;
        const top = n.blades[n.blades.length - 1], k = (t * 0.3 + n.phase) % 1;
        if (k < 0.4) { ctx.fillStyle = `rgba(255,255,255,${Math.sin(k / 0.4 * Math.PI) * 0.9})`; ctx.save(); ctx.translate(top.x, 0); ctx.rotate(top.a); ctx.fillRect(-2, -top.h * (0.2 + k * 1.5), 3, 6); ctx.restore(); }
      },
      dead(ctx, n, R) { for (const b of n.blades) { ctx.fillStyle = R.edge; poly(ctx, [[b.x - b.w / 2, 0], [b.x, -7], [b.x + b.w / 2, 0]]); ctx.fill(); } },
    },
    // A grey rock split open, with fire opals shimmering inside.
    opalnest: {
      top: 66,
      init(n, R) { n.stones = Array.from({ length: 5 }, (_, i) => ({ x: -14 + i * 7 + between(R, -2, 2), y: -24 + Math.abs(i - 2) * 4 + between(R, -2, 2), r: between(R, 4, 6.5), c: i })); },
      alive(ctx, n, R, t, ov) {
        ctx.fillStyle = ov || '#6a5e66'; ctx.beginPath(); ctx.ellipse(0, -20, 32, 22, 0, 0, TAU); ctx.fill();
        if (ov) return;
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(8, -14, 24, 16, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.ellipse(-12, -34, 14, 6, -0.3, 0, TAU); ctx.fill();
        // the open cavity
        ctx.fillStyle = '#2a1824'; ctx.beginPath(); ctx.ellipse(0, -22, 22, 12, 0, 0, TAU); ctx.fill();
        const cols = ['#7fd8ff', R.color, '#ffcf4a', '#9be36a', R.color];
        for (const s of n.stones) {
          const sh = (Math.sin(t * 2.5 + s.c * 1.3 + n.phase) + 1) / 2;
          const g = ctx.createLinearGradient(s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r);
          g.addColorStop(0, cols[s.c]); g.addColorStop(sh, '#ffffff'); g.addColorStop(1, cols[(s.c + 2) % 5]);
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.75, 0, 0, TAU); ctx.fill();
        }
        glow(ctx, 0, -22, 34, rgba(R.color, 0.8), 0.25 + Math.sin(t * 2 + n.phase) * 0.1);
        ctx.strokeStyle = '#4a3e46'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -22, 22, 12, 0, 0, TAU); ctx.stroke();
      },
      dead(ctx) { ctx.fillStyle = '#6a5e66'; ctx.beginPath(); ctx.ellipse(-8, -4, 12, 6, 0, 0, TAU); ctx.ellipse(10, -4, 10, 5, 0, 0, TAU); ctx.fill(); },
    },
  });

  // ---------- machines ----------
  Object.assign(Rn.MACHINE_ART, {
    // Melon farm: a glass greenhouse over a melon bed, with a sprinkler arm sweeping the vines.
    melonfarm(ctx, x, y, t) {
      ctx.fillStyle = '#5a8a3a'; roundRect(ctx, x - 58, y - 12, 116, 14, 4); ctx.fill();
      for (const [dx, dy, r] of [[-38, -14, 11], [-14, -18, 13], [10, -14, 12], [34, -18, 11]]) {
        ctx.fillStyle = '#5a9a2a'; ctx.beginPath(); ctx.ellipse(x + dx, y + dy, r * 1.15, r * 0.8, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(201,242,138,0.8)'; ctx.lineWidth = 2; for (const k of [-0.4, 0, 0.4]) { ctx.beginPath(); ctx.ellipse(x + dx + k * r, y + dy, r * 0.25, r * 0.75, 0, 0, TAU); ctx.stroke(); }
        ctx.fillStyle = '#fbffe8'; ctx.beginPath(); ctx.arc(x + dx - r * 0.35, y + dy - r * 0.25, r * 0.25, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(210,255,230,0.16)'; ctx.strokeStyle = 'rgba(230,255,240,0.85)'; ctx.lineWidth = 2.5;
      poly(ctx, [[x - 60, y], [x - 60, y - 50], [x - 30, y - 78], [x + 30, y - 78], [x + 60, y - 50], [x + 60, y]]); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(230,255,240,0.45)';
      for (const dx of [-30, 0, 30]) { ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.lineTo(x + dx, y - 78); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x - 60, y - 50); ctx.lineTo(x + 60, y - 50); ctx.stroke();
      const a = Math.sin(t * 1.2) * 0.9;
      ctx.save(); ctx.translate(x, y - 62); ctx.rotate(a);
      ctx.strokeStyle = '#dfe5ee'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.stroke();
      for (let i = 0; i < 5; i++) { const k = (t * 2 + i / 5) % 1; ctx.fillStyle = `rgba(160,220,255,${1 - k})`; ctx.beginPath(); ctx.arc(-36 + i * 18, k * 30, 1.8, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; poly(ctx, [[x - 54, y - 48], [x - 30, y - 72], [x - 22, y - 72], [x - 46, y - 48]]); ctx.fill();
    },
    // Nectar garden: a bed of tall blooms, a pipe to a glass tank slowly filling with pink nectar.
    nectargarden(ctx, x, y, t) {
      ctx.fillStyle = '#4a7a3a'; roundRect(ctx, x - 58, y - 10, 80, 12, 4); ctx.fill();
      for (const [dx, h] of [[-46, 40], [-28, 54], [-10, 44], [8, 50]]) {
        const sw = Math.sin(t * 1.4 + dx) * 2;
        ctx.strokeStyle = '#3a8a4a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + dx, y - 8); ctx.quadraticCurveTo(x + dx, y - h / 2, x + dx + sw, y - h); ctx.stroke();
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; ctx.fillStyle = i % 2 ? '#ffc4ec' : '#d05aa8'; ctx.beginPath(); ctx.ellipse(x + dx + sw + Math.cos(a) * 7, y - h + Math.sin(a) * 7, 6, 3, a, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.arc(x + dx + sw, y - h - 2, 2.2, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 10, y - 4); ctx.lineTo(x + 30, y - 4); ctx.stroke();
      ctx.fillStyle = 'rgba(220,245,255,0.3)'; ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 2.5; roundRect(ctx, x + 28, y - 66, 30, 66, 8); ctx.fill(); ctx.stroke();
      const lvl = 0.35 + (Math.sin(t * 0.5) * 0.5 + 0.5) * 0.5;
      ctx.fillStyle = '#ffc4ec'; roundRect(ctx, x + 31, y - 3 - 58 * lvl, 24, 58 * lvl, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x + 34, y - 60, 3, 50);
      ctx.fillStyle = '#d05aa8'; roundRect(ctx, x + 26, y - 72, 34, 8, 3); ctx.fill();
      for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; ctx.fillStyle = `rgba(255,255,255,${1 - k})`; ctx.beginPath(); ctx.arc(x + 38 + i * 4, y - 6 - k * 50 * lvl, 1.5, 0, TAU); ctx.fill(); }
    },
    // Spice picker: stepped terraces of pod shrubs and a drying rack with pods hanging in rows.
    spicepicker(ctx, x, y, t) {
      for (let r = 0; r < 3; r++) {
        const yy = y - r * 16, w = 110 - r * 26;
        ctx.fillStyle = r % 2 ? '#8a5a30' : '#a06a38'; roundRect(ctx, x - w / 2 - 10, yy - 10, w, 12, 3); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x - w / 2 - 10, yy, w, 2);
        for (let i = 0; i < 3 - r; i++) {
          const bx = x - w / 2 + 8 + i * (w / (3 - r)), by = yy - 10;
          ctx.fillStyle = '#7a2e14'; ctx.beginPath(); ctx.ellipse(bx, by - 6, 10, 8, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#d0602a'; ctx.beginPath(); ctx.ellipse(bx - 2, by - 8, 7, 5, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ff8a3a'; for (const dx of [-5, 3]) { ctx.beginPath(); ctx.ellipse(bx + dx, by - 1, 2, 4, 0, 0, TAU); ctx.fill(); }
        }
      }
      // drying rack
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + 40, y + 2); ctx.lineTo(x + 40, y - 64); ctx.moveTo(x + 64, y + 2); ctx.lineTo(x + 64, y - 64); ctx.stroke();
      ctx.lineWidth = 1.5; for (const yy of [-58, -40, -22]) { ctx.beginPath(); ctx.moveTo(x + 40, y + yy); ctx.lineTo(x + 64, y + yy); ctx.stroke(); for (let i = 0; i < 4; i++) { const sw = Math.sin(t * 2 + i + yy) * 1.5; ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.ellipse(x + 44 + i * 6 + sw, y + yy + 6, 2, 5, 0, 0, TAU); ctx.fill(); } }
      // a picking arm bobbing over the top terrace
      const px = x - 14 + Math.sin(t * 0.8) * 22;
      ctx.strokeStyle = '#dfe5ee'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 50, y - 70); ctx.lineTo(x + 30, y - 70); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, y - 70); ctx.lineTo(px, y - 56 + Math.sin(t * 4) * 4); ctx.stroke();
      ctx.fillStyle = '#ffa8d8'; ctx.beginPath(); ctx.arc(px, y - 54 + Math.sin(t * 4) * 4, 3.5, 0, TAU); ctx.fill();
    },
    // Sulfur drill: a dark rig over a steaming yellow vent, with a hopper of yellow crystals.
    sulfurdrill(ctx, x, y, t) {
      ctx.fillStyle = '#6a5a3a'; poly(ctx, [[x - 56, y], [x - 46, y - 18], [x - 8, y - 24], [x + 6, y]]); ctx.fill();
      ctx.fillStyle = '#b59a10'; ctx.beginPath(); ctx.ellipse(x - 26, y - 20, 16, 5, 0, 0, TAU); ctx.fill();
      for (const [dx, s] of [[-44, 6], [-34, 8], [-14, 7], [-4, 5]]) { ctx.fillStyle = '#ffe14a'; poly(ctx, [[x + dx - s * 0.6, y - 10], [x + dx - s * 0.3, y - 10 - s * 1.6], [x + dx + s * 0.4, y - 10 - s * 1.4], [x + dx + s * 0.6, y - 10]]); ctx.fill(); }
      for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; ctx.globalAlpha = (1 - k) * 0.45; ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(x - 26 + Math.sin(k * 5 + i) * 6, y - 26 - k * 50, 5 + k * 10, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      // tower
      ctx.strokeStyle = '#3a3036'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 44, y - 8); ctx.lineTo(x - 26, y - 96); ctx.lineTo(x - 8, y - 8); ctx.stroke();
      ctx.lineWidth = 2; for (let i = 1; i < 4; i++) { const yy = y - 8 - i * 22, w = 18 * (1 - i / 4.4); ctx.beginPath(); ctx.moveTo(x - 26 - w, yy); ctx.lineTo(x - 26 + w, yy); ctx.stroke(); }
      const b = Math.sin(t * 5) * 3;
      ctx.fillStyle = '#ffcf4a'; ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 2; roundRect(ctx, x - 34, y - 82 + b, 16, 22, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 26, y - 60 + b); ctx.lineTo(x - 26, y - 26); ctx.stroke();
      // hopper
      ctx.fillStyle = '#4a4440'; ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 2.5; poly(ctx, [[x + 14, y - 50], [x + 58, y - 50], [x + 48, y - 14], [x + 24, y - 14]]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe14a'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 20 + i * 6, y - 56 + (i % 2) * 3, 5, 5);
      ctx.fillStyle = '#3a3036'; ctx.fillRect(x + 30, y - 14, 4, 14); ctx.fillRect(x + 40, y - 14, 4, 14);
    },
  });

  // ---------- ground and scenery ----------
  Object.assign(B.BIOMES, {
    gasfield: { ground: '#45463a', light: 'rgba(190,230,255,0.18)', dark: 'rgba(10,10,8,0.45)', marks: ['mud', 'tarpools'], decor: ['flarestack', 'pipeline', 'flarestack'] },
    sulfur: { ground: '#7a6a2a', light: 'rgba(255,225,74,0.3)', dark: 'rgba(40,30,5,0.45)', marks: ['sulfurcrust', 'gravel'], decor: ['sulfurpool', 'basalt', 'sulfurpool'] },
    glassplain: { ground: '#24202e', light: 'rgba(160,140,220,0.25)', dark: 'rgba(5,3,10,0.5)', marks: ['glassplates', 'gravel'], decor: ['glassarch', 'glassrock', 'glassrock'] },
    caldera: { ground: '#4a3040', light: 'rgba(255,95,162,0.22)', dark: 'rgba(15,5,12,0.45)', marks: ['calderarings', 'glowcracks'], glow: '#ff5fa2', decor: ['opalrock', 'steamvent', 'basalt'] },
    meadow: { ground: '#6aa860', light: 'rgba(255,220,240,0.35)', dark: 'rgba(30,70,30,0.35)', marks: ['grass', 'flowers', 'dew'], flower: ['#ffc4ec', '#ffffff', '#ffd23a'], decor: ['dewflower', 'fern', 'dewflower'], fireflies: '#ffe8f6' },
    terraces: { ground: '#8a5a30', light: 'rgba(255,170,90,0.3)', dark: 'rgba(60,25,8,0.4)', marks: ['rows', 'leaves'], leaves: ['#ff8a3a', '#d0602a', '#ffd36b'], decor: ['terracewall', 'podshrub', 'spicelamp'] },
    hive: { ground: '#9a7030', light: 'rgba(255,210,58,0.3)', dark: 'rgba(60,35,5,0.4)', marks: ['hexes', 'leaves'], leaves: ['#ffd23a', '#c08a10', '#ffe58a'], decor: ['skep', 'butte', 'skep'] },
    rootwood: { ground: '#4e3e5a', light: 'rgba(224,200,255,0.25)', dark: 'rgba(20,10,30,0.35)', marks: ['roots', 'stars'], decor: ['roottree', 'rootarch', 'roottree'], fireflies: '#e0c8ff' },
  });

  Object.assign(B.MARKS, {
    tarpools(g, R, S) { for (let i = 0; i < 16; i++) { const x = R() * S, y = R() * S, r = 14 + R() * 26; g.fillStyle = '#16121a'; g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(180,140,255,0.22)'; g.beginPath(); g.ellipse(x - r * 0.2, y - 2, r * 0.5, r * 0.12, 0.2, 0, TAU); g.fill(); } },
    sulfurcrust(g, R, S) {
      for (let i = 0; i < 40; i++) {
        const x = R() * S, y = R() * S, r = 8 + R() * 22;
        g.fillStyle = 'rgba(255,225,74,0.35)'; g.beginPath(); g.ellipse(x, y, r, r * 0.55, R(), 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,250,200,0.6)'; for (let k = 0; k < 5; k++) g.fillRect(x + (R() - 0.5) * r, y + (R() - 0.5) * r * 0.5, 2.5, 2.5);
      }
    },
    glassplates(g, R, S) {
      for (let i = 0; i < 26; i++) {
        const x = R() * S, y = R() * S, w = 20 + R() * 40;
        g.fillStyle = 'rgba(8,5,14,0.7)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y - 6); g.lineTo(x + w * 0.8, y + 12); g.lineTo(x - 6, y + 10); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(160,140,220,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y - 6); g.stroke();
      }
    },
    calderarings(g, R, S) {
      const c = S / 2;
      for (let i = 0; i < 6; i++) { const r = c * (0.3 + i * 0.1); g.strokeStyle = i % 2 ? 'rgba(20,8,16,0.4)' : 'rgba(255,140,190,0.18)'; g.lineWidth = 10; g.beginPath(); g.ellipse(c, c, r, r * 0.8, 0, 0, TAU); g.stroke(); }
    },
    dew(g, R, S) { for (let i = 0; i < 120; i++) { const x = R() * S, y = R() * S; g.fillStyle = 'rgba(230,250,255,0.75)'; g.beginPath(); g.arc(x, y, 1 + R() * 1.4, 0, TAU); g.fill(); } },
    rows(g, R, S) {
      for (let i = 0; i < 12; i++) {
        const y = (i + 0.5) * S / 12;
        g.strokeStyle = 'rgba(60,25,8,0.35)'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= S; x += 30) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6); g.stroke();
        g.strokeStyle = 'rgba(255,190,120,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y - 5); for (let x = 0; x <= S; x += 30) g.lineTo(x, y - 5 + Math.sin(x * 0.01 + i) * 6); g.stroke();
      }
    },
    hexes(g, R, S) {
      for (let i = 0; i < 22; i++) {
        const cx = R() * S, cy = R() * S;
        for (let k = 0; k < 7; k++) {
          const x = cx + (k % 3) * 13 + (Math.floor(k / 3) % 2) * 6, y = cy + Math.floor(k / 3) * 11;
          hex(g, x, y, 6); g.strokeStyle = 'rgba(255,220,100,0.35)'; g.lineWidth = 1.5; g.stroke();
          if (R() > 0.6) { g.fillStyle = 'rgba(255,210,58,0.3)'; g.fill(); }
        }
      }
    },
    roots(g, R, S) {
      g.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        let x = R() * S, y = R() * S; g.strokeStyle = 'rgba(40,24,40,0.45)'; g.lineWidth = 5 + R() * 5; g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 5; j++) { x += (R() - 0.5) * 70; y += (R() - 0.5) * 40; g.lineTo(x, y); }
        g.stroke(); g.strokeStyle = 'rgba(120,90,110,0.35)'; g.lineWidth = 2; g.stroke();
      }
    },
  });

  Object.assign(B.DECOR, {
    flarestack(ctx, d, t) {
      shadow(ctx, 0, 2, 14, 5);
      ctx.fillStyle = '#5a5250'; ctx.fillRect(-4, -80, 8, 80);
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 1.5; ctx.strokeRect(-4, -80, 8, 80);
      ctx.fillStyle = '#c95a3a'; ctx.fillRect(-4, -60, 8, 5); ctx.fillRect(-4, -30, 8, 5);
      const f = 12 + Math.sin(t * 9 + d.p) * 4;
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#ff9a40'; ctx.beginPath(); ctx.arc(0, -86, 16, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffcf4a'; poly(ctx, [[-5, -80], [Math.sin(t * 5 + d.p) * 3, -80 - f * 1.6], [5, -80]]); ctx.fill();
    },
    pipeline(ctx, d) {
      ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 3; for (const dx of [-26, 26]) { ctx.beginPath(); ctx.moveTo(dx, 0); ctx.lineTo(dx, -14); ctx.stroke(); }
      ctx.strokeStyle = '#d98a4e'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-40, -16); ctx.lineTo(40, -16); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-38, -18); ctx.lineTo(38, -18); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#c95a3a'; ctx.beginPath(); ctx.arc(0, -16, 5, 0, TAU); ctx.fill();
    },
    fumcone(ctx, d, t) {
      shadow(ctx, 0, 2, 24, 8);
      ctx.fillStyle = '#8a7a3a'; poly(ctx, [[-22, 0], [-8, -26 - d.h * 10], [8, -26 - d.h * 10], [22, 0]]); ctx.fill();
      ctx.fillStyle = '#ffe14a'; poly(ctx, [[-10, -22 - d.h * 10], [-8, -26 - d.h * 10], [8, -26 - d.h * 10], [10, -22 - d.h * 10], [4, -14], [-4, -14]]); ctx.fill();
      for (let i = 0; i < 3; i++) { const k = (t * 0.4 + i / 3 + d.p) % 1; ctx.globalAlpha = (1 - k) * 0.4; ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(Math.sin(k * 4 + i) * 6, -30 - d.h * 10 - k * 60, 5 + k * 12, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    sulfurpool(ctx, d, t) {
      ctx.fillStyle = '#b59a10'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d8e85a'; ctx.beginPath(); ctx.ellipse(0, -1, 28, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(t * 2 + d.p) * 0.1})`; ctx.beginPath(); ctx.ellipse(-8, -3, 10, 2.5, 0, 0, TAU); ctx.fill();
      const k = (t * 0.7 + d.p) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(8, -1, 3 + k * 8, (3 + k * 8) * 0.35, 0, 0, TAU); ctx.stroke();
    },
    glassblade(ctx, d) {
      shadow(ctx, 0, 2, 18, 6);
      for (const [dx, h, a] of [[-8, 34 + d.h * 20, -0.2], [6, 50 + d.h * 24, 0.1], [14, 24, 0.4]]) {
        ctx.save(); ctx.translate(dx, 0); ctx.rotate(a);
        ctx.fillStyle = '#0e0a18'; poly(ctx, [[-5, 0], [-3, -h * 0.7], [1, -h], [5, -h * 0.5], [5, 0]]); ctx.fill();
        ctx.fillStyle = '#2a2040'; poly(ctx, [[-5, 0], [-3, -h * 0.7], [1, -h], [0, 0]]); ctx.fill();
        ctx.strokeStyle = 'rgba(160,140,220,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-2, -h * 0.65); ctx.stroke();
        ctx.restore();
      }
    },
    glassrock(ctx, d) {
      shadow(ctx, 0, 2, 22, 7);
      ctx.fillStyle = '#120e1c'; ctx.beginPath(); ctx.ellipse(0, -10 - d.h * 4, 20, 12 + d.h * 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(160,140,220,0.35)'; ctx.beginPath(); ctx.ellipse(-6, -16 - d.h * 6, 8, 3, -0.3, 0, TAU); ctx.fill();
    },
    glassarch(ctx, d) {
      shadow(ctx, 0, 2, 34, 8);
      ctx.strokeStyle = '#0e0a18'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-28, 0); ctx.quadraticCurveTo(-26, -56 - d.h * 16, 4, -50 - d.h * 16); ctx.quadraticCurveTo(26, -44, 30, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,140,220,0.55)'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineCap = 'butt';
    },
    opalrock(ctx, d, t) {
      shadow(ctx, 0, 2, 24, 8);
      ctx.fillStyle = '#5a4e56'; poly(ctx, [[-22, 0], [-18, -20], [-2, -30 - d.h * 8], [16, -22], [22, 0]]); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; poly(ctx, [[-18, -20], [-2, -30 - d.h * 8], [0, -16], [-12, -10]]); ctx.fill();
      const cols = ['#7fd8ff', '#ff5fa2', '#ffcf4a'];
      cols.forEach((c, i) => { ctx.globalAlpha = 0.6 + Math.sin(t * 2.5 + i + d.p) * 0.4; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(-8 + i * 7, -14 + (i % 2) * 4, 3, 2, 0, 0, TAU); ctx.fill(); });
      ctx.globalAlpha = 1;
    },
    steamvent(ctx, d, t) {
      ctx.fillStyle = '#2a1824'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff5fa2'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(0, -1, 7, 2.5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) { const k = (t * 0.5 + i / 4 + d.p) % 1; ctx.globalAlpha = (1 - k) * 0.4; ctx.fillStyle = '#f0d8e8'; ctx.beginPath(); ctx.arc(Math.sin(k * 4 + i) * 6, -6 - k * 70, 4 + k * 12, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    bigbloom(ctx, d, t) {
      const h = 50 + d.h * 30, sw = Math.sin(t * 1.2 + d.p) * 3;
      ctx.strokeStyle = '#3a8a4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-4, -h / 2, sw, -h); ctx.stroke();
      ctx.fillStyle = '#4fae5a'; ctx.beginPath(); ctx.ellipse(-8, -h * 0.3, 12, 4, -0.5, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + d.p; ctx.fillStyle = i % 2 ? '#ffc4ec' : '#ff9ad8'; ctx.beginPath(); ctx.ellipse(sw + Math.cos(a) * 10, -h + Math.sin(a) * 6, 10, 5, a, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(sw, -h, 4, 0, TAU); ctx.fill();
    },
    dewflower(ctx, d, t) {
      for (const dx of [-10, 0, 10]) {
        const h = 16 + Math.abs(dx) * -0.4 + d.h * 10;
        ctx.strokeStyle = '#3a8a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dx * 0.5, 0); ctx.lineTo(dx, -h); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(dx, -h, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(200,240,255,${0.6 + Math.sin(t * 3 + dx) * 0.3})`; ctx.beginPath(); ctx.arc(dx + 2, -h - 3, 1.6, 0, TAU); ctx.fill();
      }
    },
    terracewall(ctx, d) {
      shadow(ctx, 0, 2, 40, 8);
      for (let r = 0; r < 3; r++) { const w = 70 - r * 18; ctx.fillStyle = r % 2 ? '#a07a50' : '#8a6440'; roundRect(ctx, -w / 2, -10 - r * 10, w, 10, 3); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-w / 2, -2 - r * 10, w, 2); }
      ctx.fillStyle = '#d0602a'; for (const dx of [-14, 0, 14]) { ctx.beginPath(); ctx.ellipse(dx, -36, 6, 5, 0, 0, TAU); ctx.fill(); }
    },
    podshrub(ctx, d, t) {
      shadow(ctx, 0, 2, 20, 6);
      for (const [x, y, r] of [[-10, -12, 11], [9, -12, 11], [0, -22, 12]]) { ctx.fillStyle = '#7a2e14'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = '#d0602a'; ctx.beginPath(); ctx.arc(x - 2, y - 3, r * 0.6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ff8a3a'; for (const [x, y] of [[-12, -4], [6, -2], [-2, -12], [12, -14]]) { ctx.beginPath(); ctx.ellipse(x, y + Math.sin(t * 2 + x) * 0.8, 2, 4.5, 0, 0, TAU); ctx.fill(); }
    },
    spicelamp(ctx, d, t) {
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -46); ctx.lineTo(10, -46); ctx.stroke();
      ctx.globalAlpha = 0.4 + Math.sin(t * 3 + d.p) * 0.15; ctx.fillStyle = '#ffb340'; ctx.beginPath(); ctx.arc(10, -38, 12, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff6a2a'; roundRect(ctx, 5, -44, 10, 12, 4); ctx.fill();
    },
    combrock(ctx, d, t) {
      shadow(ctx, 0, 2, 28, 8);
      ctx.fillStyle = '#7a6a58'; poly(ctx, [[-26, 0], [-20, -34 - d.h * 14], [4, -44 - d.h * 14], [24, -26], [26, 0]]); ctx.fill();
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { hex(ctx, -10 + c * 9 + r * 4.5, -26 + r * 8, 4.4); ctx.fillStyle = (r + c) % 2 ? '#ffd23a' : '#c08a10'; ctx.fill(); }
      const k = (t * 1.5 + d.p) % TAU; ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(Math.cos(k) * 30, -30 + Math.sin(k * 2) * 8, 2.4, 0, TAU); ctx.fill();
    },
    skep(ctx, d, t) {
      shadow(ctx, 0, 2, 20, 6);
      ctx.fillStyle = '#c99a4a'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 30, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8a6020'; ctx.lineWidth = 2; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.ellipse(0, -i * 6, 18 * Math.sqrt(1 - (i * 6 / 30) ** 2), 2.5, 0, 0, Math.PI); ctx.stroke(); }
      ctx.fillStyle = '#2a1a08'; ctx.beginPath(); ctx.ellipse(0, -4, 4, 3, 0, Math.PI, TAU); ctx.fill();
      for (let i = 0; i < 2; i++) { const a = t * 2.5 + i * 3 + d.p; ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(Math.cos(a) * 22, -18 + Math.sin(a * 1.3) * 10, 2.2, 0, TAU); ctx.fill(); }
    },
    roottree(ctx, d, t) {
      shadow(ctx, 0, 2, 34, 10);
      ctx.strokeStyle = '#2a1e2c'; ctx.lineCap = 'round';
      for (const dx of [-26, -12, 12, 26]) { ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(dx, 2); ctx.quadraticCurveTo(dx * 0.4, -20, 0, -36); ctx.stroke(); }
      ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(4, -60, -2, -84 - d.h * 24); ctx.stroke();
      ctx.lineCap = 'butt';
      const top = -84 - d.h * 24;
      for (const [x, y, r] of [[-16, top + 6, 16], [14, top + 4, 18], [0, top - 10, 18]]) { ctx.fillStyle = '#3a2a4a'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(224,200,255,0.25)'; ctx.beginPath(); ctx.arc(x - 4, y - 4, r * 0.5, 0, TAU); ctx.fill(); }
      for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.5 + Math.sin(t * 2 + i + d.p) * 0.4; ctx.fillStyle = '#fff8d0'; ctx.beginPath(); ctx.arc(-12 + i * 12, top + 2 - i % 2 * 10, 1.8, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    },
    rootarch(ctx, d) {
      shadow(ctx, 0, 2, 34, 8);
      ctx.strokeStyle = '#2a1e2c'; ctx.lineCap = 'round'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(-30, 2); ctx.bezierCurveTo(-30, -50 - d.h * 16, 30, -50 - d.h * 16, 30, 2); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-18, 2); ctx.bezierCurveTo(-16, -30, 10, -36, 14, 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,90,110,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.bezierCurveTo(-30, -48 - d.h * 16, 30, -48 - d.h * 16, 30, 0); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#e0c8ff'; ctx.beginPath(); ctx.arc(-22, -4, 4, Math.PI, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(20, -3, 3, Math.PI, TAU); ctx.fill();
    },
  });

  // ---------- Edenia's bee drones and their hive ----------
  function bee(ctx, d, t) {
    const z = 40 + Math.sin(t * 4 + d.bob) * 6, y = d.y - z;
    shadow(ctx, d.x, d.y, 12, 5, 0.22);
    for (let i = 0; i < d.cargo.length; i++) Rn.item(ctx, d.cargo[i], d.x + (i % 2 ? 4 : -4), y + 14 + i * 7, 0.75);
    ctx.save(); ctx.translate(d.x, y); ctx.rotate(Math.max(-0.3, Math.min(0.3, d.vx * 0.002)));
    const f = d.vx < 0 ? -1 : 1; ctx.scale(f, 1);
    const flap = Math.abs(Math.sin(t * 45));
    ctx.fillStyle = 'rgba(230,245,255,0.55)'; ctx.strokeStyle = 'rgba(70,55,87,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(-2, -9 - flap * 3, 8, 4 + flap * 3, -0.4, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(5, -8 - flap * 2, 6, 3 + flap * 2, 0.3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#2a1a08'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#2a1a08'; for (const x of [-7, -1, 5]) ctx.fillRect(x - 1.5, -9, 3, 18);
    ctx.restore();
    ctx.fillStyle = '#2a1a08'; poly(ctx, [[-13, -1], [-18, 0], [-13, 2]]); ctx.fill();
    ctx.fillStyle = '#f7f6fc'; ctx.beginPath(); ctx.arc(12, -2, 5.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = d.state === 'harvest' ? '#ffab4a' : '#7fd8ff'; ctx.beginPath(); ctx.ellipse(14, -2, 3, 2.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a1a08'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(11, -7); ctx.quadraticCurveTo(12, -13, 16, -14); ctx.moveTo(13, -7); ctx.quadraticCurveTo(16, -11, 19, -11); ctx.stroke();
    ctx.restore();
    if (d.beam > 0 && d.target) { ctx.globalAlpha = d.beam; ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(d.x, y + 6); ctx.lineTo(d.target.x, d.target.y - 22); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  function beeBay(ctx, p, t) {
    const x = p.x, y = p.y;
    ctx.fillStyle = '#7a5a34'; roundRect(ctx, x - 58, y - 8, 116, 12, 4); ctx.fill();
    for (const [dx, s] of [[-30, 0.8], [26, 1]]) {
      ctx.save(); ctx.translate(x + dx, y - 6); ctx.scale(s, s);
      ctx.fillStyle = '#e8b84a'; ctx.strokeStyle = '#7a5016'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 52, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2; for (let i = 1; i < 6; i++) { const yy = -i * 8.5; ctx.beginPath(); ctx.ellipse(0, yy, 30 * Math.sqrt(Math.max(0, 1 - (yy / 52) ** 2)), 3, 0, 0, Math.PI); ctx.stroke(); }
      ctx.fillStyle = '#2a1a08'; ctx.beginPath(); ctx.ellipse(0, -6, 7, 6, 0, Math.PI, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#c08a10'; ctx.lineWidth = 1.5;
    for (const [dx, dy] of [[-4, -30], [4, -22], [-4, -14]]) { hex(ctx, x + dx, y + dy, 6); ctx.fill(); ctx.stroke(); }
    for (let i = 0; i < 5; i++) { const a = t * (1.8 + i * 0.2) + i * 1.3; ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 60, y - 50 + Math.sin(a * 1.5) * 18, 2.4, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a1a08'; ctx.fillRect(x + Math.cos(a) * 60 - 0.5, y - 52 + Math.sin(a * 1.5) * 18, 1, 4); }
  }

  // ---------- drivers' vehicles on the far planets ----------
  const VEHICLES = {
    // Petra: a tracked crawler with a round tank on its back.
    crawler(ctx, tr, t) {
      const f = tr.face, x = tr.x, y = tr.y;
      shadow(ctx, x, y + 2, 46, 8);
      ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
      ctx.fillStyle = '#2a2420'; roundRect(ctx, -42, -16, 82, 16, 8); ctx.fill();
      ctx.fillStyle = '#4a4440'; for (let i = 0; i < 9; i++) { const k = ((i * 9 + tr.walk * 6) % 80) - 40; ctx.fillRect(k, -16, 3, 3); ctx.fillRect(-k - 3, -3, 3, 3); }
      for (const dx of [-30, -10, 10, 28]) { ctx.fillStyle = '#5a5250'; ctx.beginPath(); ctx.arc(dx, -8, 5, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 2.5;
      ctx.fillStyle = '#ffcf4a'; roundRect(ctx, 10, -42, 28, 26, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(154,245,255,0.75)'; roundRect(ctx, 22, -38, 12, 10, 3); ctx.fill();
      ctx.fillStyle = '#5a4a6e'; roundRect(ctx, -40, -40, 46, 24, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-34, -36, 34, 3);
      ctx.fillStyle = '#ffcf4a'; ctx.fillRect(-20, -46, 6, 6);
      ctx.restore();
      Rn.driverHead(ctx, x + f * 22, y - 48);
      Rn.cargoOn(ctx, tr, x, y - 44, -36);
    },
    // Edenia: a hovering flower pod with petal fins.
    petal(ctx, tr, t) {
      const f = tr.face, x = tr.x, h = 16 + Math.sin(t * 3 + x * 0.01) * 3, y = tr.y - h;
      shadow(ctx, x, tr.y + 2, 36, 8);
      glow(ctx, x, tr.y - 4, 26, 'rgba(255,168,216,0.9)', 0.45);
      ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
      for (let i = 0; i < 5; i++) { const a = Math.PI + (i + 0.5) / 5 * Math.PI, w = Math.sin(t * 4 + i) * 0.1; ctx.fillStyle = i % 2 ? '#ffc4ec' : '#ffa8d8'; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 30, Math.sin(a) * 8 + 4, 16, 6, a + w, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#3a6a3a'; ctx.lineWidth = 2.5;
      ctx.fillStyle = '#7cc860'; roundRect(ctx, -40, -14, 80, 16, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd23a'; for (const dx of [-26, -12, 2]) { ctx.beginPath(); ctx.arc(dx, -6, 3, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#fff4e8'; ctx.beginPath(); ctx.ellipse(20, -14, 16, 16, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(154,245,255,0.75)'; ctx.beginPath(); ctx.ellipse(23, -17, 9, 8, 0, Math.PI, TAU); ctx.fill();
      ctx.restore();
      Rn.driverHead(ctx, x + f * 20, y - 20);
      Rn.cargoOn(ctx, tr, x, y - 18, -34);
    },
  };

  return { bee, beeBay, VEHICLES };
})();
