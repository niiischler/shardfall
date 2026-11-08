// Procedural drawing for everything in the world. All shapes, no image files.
// Node drawers take an optional override colour `ov`: drawing a node again with a
// translucent white override is how hit flashes work for every shape.
SF.Render = (function () {
  const C = SF.CFG, FX = SF.FX;
  const TAU = Math.PI * 2;
  const FONT = '"Chakra Petch", "Trebuchet MS", sans-serif';
  const INK = '#463757';

  const easeOutBack = t => { const c = 1.9; t = Math.min(1, Math.max(0, t)); return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  // ---------- helpers ----------
  function shadow(ctx, x, y, rx, ry, a) {
    ctx.fillStyle = `rgba(28,10,38,${a == null ? 0.32 : a})`;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  }

  function glow(ctx, x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // "#rrggbb" -> "rgba(r,g,b,a)" for glows.
  const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function label(ctx, text, x, y, size, color, weight) {
    ctx.font = `${weight || 700} ${size}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(28,10,40,0.8)'; ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color || '#fff4e8'; ctx.fillText(text, x, y);
  }

  function hexCoin(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
    ctx.fillStyle = '#ffd36b'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#8a4d12'; ctx.stroke();
    ctx.fillStyle = '#fff1bf'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.28, 0, TAU); ctx.fill();
  }

  function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }

  // ---------- carried items ----------
  const ITEMS = {
    gem(ctx, R) {
      poly(ctx, [[0, -8], [7, -2], [5, 6], [-5, 6], [-7, -2]]); ctx.fillStyle = R.dark; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      poly(ctx, [[0, -8], [-7, -2], [-5, 6], [0, 6]]); ctx.fillStyle = R.color; ctx.fill();
    },
    chunk(ctx, R) {
      poly(ctx, [[-8, -1], [-4, -6], [4, -7], [8, -1], [5, 6], [-5, 6]]);
      ctx.fillStyle = R.stone || '#4e3343'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      poly(ctx, [[-3, -3], [2, -5], [4, 0], [-1, 2]]); ctx.fillStyle = R.color; ctx.fill();
      ctx.fillStyle = '#fff8e0'; ctx.fillRect(-1, -3, 2, 2);
    },
    orb(ctx, R) {
      ctx.fillStyle = R.edge; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7);
      g.addColorStop(0, '#fff'); g.addColorStop(0.35, R.color); g.addColorStop(1, R.dark);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 6.2, 0, TAU); ctx.fill();
    },
    log(ctx, R) {
      roundRect(ctx, -9, -4, 18, 9, 4); ctx.fillStyle = R.dark; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      ctx.fillStyle = R.color; ctx.beginPath(); ctx.ellipse(7, 0.5, 3, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = R.edge; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(7, 0.5, 1.5, 0, TAU); ctx.stroke();
    },
    cap(ctx, R) {
      ctx.fillStyle = R.stem || '#eee'; ctx.fillRect(-2.5, -1, 5, 7);
      ctx.beginPath(); ctx.ellipse(0, -1, 8, 6, 0, Math.PI, TAU); ctx.closePath();
      ctx.fillStyle = R.color; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-3, -4, 1.4, 0, TAU); ctx.arc(2, -5, 1.1, 0, TAU); ctx.fill();
    },
    drop(ctx, R) {
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.bezierCurveTo(6, -2, 7, 2, 7, 3); ctx.arc(0, 3, 7, 0, Math.PI); ctx.bezierCurveTo(-7, 2, -6, -2, 0, -9);
      ctx.fillStyle = R.color; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(-2.5, 2, 1.6, 2.6, 0.3, 0, TAU); ctx.fill();
    },
    fruit(ctx, R) {
      ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(0, 1, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(-1, 0, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-3, -2, 1.8, 0, TAU); ctx.fill();
      ctx.fillStyle = R.leafDark || '#2e6a2a'; ctx.beginPath(); ctx.ellipse(3, -6, 4, 2, -0.5, 0, TAU); ctx.fill();
    },
    bone(ctx, R) {
      ctx.fillStyle = R.color; ctx.strokeStyle = R.edge; ctx.lineWidth = 1.2;
      roundRect(ctx, -6, -2, 12, 4, 2); ctx.fill(); ctx.stroke();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 7, sy * 2.5, 2.6, 0, TAU); ctx.fill(); ctx.stroke(); }
      roundRect(ctx, -6, -2, 12, 4, 2); ctx.fill();
    },
    ember(ctx, R) {
      poly(ctx, [[-7, 2], [-5, -5], [2, -7], [7, -2], [5, 5], [-3, 6]]);
      ctx.fillStyle = R.stone || '#3a2634'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      ctx.strokeStyle = R.color; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(0, 0); ctx.lineTo(-1, 4); ctx.moveTo(0, 0); ctx.lineTo(4, -3); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#fff1a0'; ctx.fillRect(-0.8, -0.8, 1.6, 1.6);
    },
    icicle(ctx, R) {
      poly(ctx, [[-3, 7], [-4, -2], [0, -10], [4, -3], [3, 7]]); ctx.fillStyle = R.dark; ctx.fill();
      ctx.lineWidth = 1.1; ctx.strokeStyle = R.edge; ctx.stroke();
      poly(ctx, [[-3, 7], [-4, -2], [0, -10], [0, 7]]); ctx.fillStyle = R.color; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, 5); ctx.lineTo(-2.5, -2); ctx.stroke();
    },
    ironore(ctx, R) {
      poly(ctx, [[-8, 0], [-5, -6], [3, -7], [8, -2], [6, 5], [-4, 6]]);
      ctx.fillStyle = R.stone; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      ctx.fillStyle = R.rust || '#b5592a'; ctx.fillRect(-6, 1, 4, 3);
      const g = ctx.createLinearGradient(-3, -5, 4, 2); g.addColorStop(0, '#ffffff'); g.addColorStop(1, R.dark);
      ctx.fillStyle = g; poly(ctx, [[-3, -2], [0, -5], [5, -3], [3, 1], [-1, 1]]); ctx.fill();
    },
    amber(ctx, R) {
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.bezierCurveTo(7, -3, 7, 6, 0, 7); ctx.bezierCurveTo(-7, 6, -7, -3, 0, -9);
      const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8); g.addColorStop(0, '#fff3c0'); g.addColorStop(0.5, R.color); g.addColorStop(1, R.dark);
      ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      ctx.fillStyle = 'rgba(60,30,8,0.7)'; ctx.beginPath(); ctx.ellipse(1, 1, 2, 1.1, 0.5, 0, TAU); ctx.fill();
    },
    nugget(ctx, R) {
      ctx.fillStyle = R.edge; ctx.beginPath(); ctx.arc(-2, 1, 5.5, 0, TAU); ctx.arc(3, -1, 5, 0, TAU); ctx.arc(0, -3, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(-2, 1, 4.6, 0, TAU); ctx.arc(3, -1, 4.2, 0, TAU); ctx.arc(0, -3, 3.8, 0, TAU); ctx.fill();
      ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(-2.5, 0, 3, 0, TAU); ctx.arc(1, -3.5, 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -1.5, 1.6, 1.6);
    },
    brick(ctx, R) {
      ctx.fillStyle = R.dark; poly(ctx, [[-8, -3], [-4, -7], [8, -7], [8, 4], [4, 7], [-8, 7]]); ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge; ctx.stroke();
      ctx.fillStyle = R.color; poly(ctx, [[-8, -3], [-4, -7], [8, -7], [4, -3]]); ctx.fill();
      ctx.fillStyle = R.stone; ctx.fillRect(-8, 0, 12, 2); ctx.fillRect(-8, 4, 12, 1.5);
    },
    malachite(ctx, R) {
      ctx.fillStyle = R.stone; ctx.beginPath(); ctx.ellipse(0, 3, 8, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(-3, -1, 5, 0, TAU); ctx.arc(3, -2, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(-3.5, -1.5, 3.8, 0, TAU); ctx.arc(2.5, -2.5, 3.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(R.edge, 0.6); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(-3.5, -1.5, 2, 0.3, 4); ctx.stroke();
      ctx.fillStyle = R.copper || '#d98a4e'; ctx.fillRect(4, 2, 3, 2);
    },
    sungem(ctx, R) {
      ctx.strokeStyle = rgba('#ffe0a0', 0.8); ctx.lineWidth = 1.2;
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.stroke(); }
      poly(ctx, [[0, -6], [5, -3], [5, 3], [0, 6], [-5, 3], [-5, -3]]); ctx.fillStyle = R.dark; ctx.fill(); ctx.strokeStyle = R.edge; ctx.stroke();
      poly(ctx, [[0, -6], [5, -3], [0, 0], [-5, -3]]); ctx.fillStyle = R.color; ctx.fill();
      ctx.fillStyle = '#fff3c0'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill();
    },
    coralbit(ctx, R) {
      ctx.lineCap = 'round'; ctx.strokeStyle = R.dark; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(0, -1); ctx.lineTo(-5, -6); ctx.moveTo(0, -1); ctx.lineTo(5, -7); ctx.stroke();
      ctx.strokeStyle = R.color; ctx.lineWidth = 2.5; ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#ffd6e6'; ctx.beginPath(); ctx.arc(-5, -6, 2, 0, TAU); ctx.arc(5, -7, 2, 0, TAU); ctx.fill();
    },
    shell(ctx, R) {
      const col = R.shell || ['#123f4a', '#1f6170', '#2a8193'];
      ctx.fillStyle = col[1]; ctx.beginPath(); ctx.ellipse(-2, 0, 8, 6, -0.4, 0, TAU); ctx.fill();
      ctx.lineWidth = 1.1; ctx.strokeStyle = col[0]; ctx.stroke();
      ctx.fillStyle = col[2]; ctx.beginPath(); ctx.ellipse(-5, -2, 4, 3, -0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd9e6'; ctx.beginPath(); ctx.ellipse(4, 1, 3.5, 4.5, 0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(4, 1, 2, 0, TAU); ctx.fill();
    },
    ingot(ctx, R) {
      ctx.lineWidth = 1.2; ctx.strokeStyle = R.edge;
      poly(ctx, [[-8, 5], [-6, -1], [6, -1], [8, 5]]); ctx.fillStyle = R.dark; ctx.fill(); ctx.stroke();
      poly(ctx, [[-6, -1], [-4, -5], [4, -5], [6, -1]]); ctx.fillStyle = R.color; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-3, -4, 5, 1.2);
      ctx.fillStyle = rgba(R.edge, 0.4); ctx.fillRect(-5, 2, 10, 1);
    },
    berries(ctx, R) {
      ctx.fillStyle = R.leafDark || '#1f4f22'; ctx.beginPath(); ctx.ellipse(0, -6, 5, 2.2, -0.3, 0, TAU); ctx.fill();
      for (const [x, y] of [[-3.5, 1], [3.5, 1], [0, -2.5]]) {
        ctx.fillStyle = R.edge; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, TAU); ctx.fill();
        ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(x - 0.4, y - 0.4, 3.4, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x - 1.8, y - 2, 1.3, 1.3);
      }
    },
  };

  // Resource code of a tier on the current planet.
  const here = tier => SF.state.planet * 10 + tier;

  function item(ctx, code, x, y, s) {
    const R = SF.res(code);
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    ITEMS[R.item](ctx, R);
    ctx.restore();
  }

  // ---------- resource nodes ----------
  function prism(ctx, p, light, dark, edge) {
    const w = p.w, h = p.h;
    ctx.save(); ctx.translate(p.ox, p.oy); ctx.rotate(p.a);
    poly(ctx, [[-w / 2, 0], [-w / 2, -h], [0, -h - w * 0.9], [w / 2, -h], [w / 2, 0]]);
    ctx.fillStyle = dark; ctx.fill();
    if (light) { poly(ctx, [[-w / 2, 0], [-w / 2, -h], [0, -h - w * 0.9], [0, 0]]); ctx.fillStyle = light; ctx.fill(); }
    if (edge) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = edge;
      ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h); ctx.lineTo(0, -h - w * 0.9); ctx.lineTo(w / 2, -h); ctx.lineTo(w / 2, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2.5, -4); ctx.lineTo(-w / 2 + 2.5, -h + 2); ctx.stroke();
    }
    ctx.restore();
  }

  // Each shape: base (always drawn, under the node), alive(ctx, n, R, t, ov), dead(ctx, n, R), top = hp bar height.
  const NODES = {
    crystal: {
      top: 92,
      base(ctx, n) { ctx.fillStyle = 'rgba(30,16,40,0.45)'; ctx.beginPath(); ctx.ellipse(0, 0, n.r * 0.95, n.r * 0.36, 0, 0, TAU); ctx.fill(); },
      glow(ctx, n, R, t) { glow(ctx, 0, -10, 70, rgba(R.color, 0.55), 0.35 + Math.sin(t * 2 + n.phase) * 0.08); },
      alive(ctx, n, R, t, ov) {
        if (!ov) for (const p of n.pebbles) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = R.dark; poly(ctx, [[-p.s, 0], [0, -p.s * 1.4], [p.s, 0], [0, p.s * 0.6]]); ctx.fill(); ctx.restore(); }
        for (const p of n.prisms) prism(ctx, p, ov ? null : R.color, ov || R.dark, ov ? null : R.edge);
        if (ov) return;
        // a light glint slides up the tallest crystal
        const top = n.prisms[n.prisms.length - 1], k = (t * 0.35 + n.phase) % 1;
        if (k < 0.5) { ctx.save(); ctx.translate(top.ox, top.oy); ctx.rotate(top.a); ctx.fillStyle = `rgba(255,255,255,${Math.sin(k * 2 * Math.PI) * 0.7})`; ctx.fillRect(-top.w / 2 + 1, -top.h * k * 2, top.w - 2, 4); ctx.restore(); }
      },
      dead(ctx, n, R) { for (const p of n.prisms) prism(ctx, { ox: p.ox * 0.8, oy: p.oy, a: p.a, w: p.w * 0.8, h: 6 }, R.color, R.dark, R.edge); },
    },
    magma: {
      top: 72,
      glow(ctx, n, R, t) { glow(ctx, 0, -n.r * 0.8, 70, rgba(R.color, 0.8), 0.3 + Math.sin(t * 2.2 + n.phase) * 0.1); },
      alive(ctx, n, R, t, ov) {
        const pts = n.pts.map(([px, py]) => [px, py * 0.85 - n.r * 0.75]);
        poly(ctx, pts); ctx.fillStyle = ov || R.stone; ctx.fill();
        if (ov) return;
        // darker lower half and a cooled crust on top
        ctx.save(); poly(ctx, pts); ctx.clip();
        ctx.fillStyle = 'rgba(10,4,12,0.35)'; ctx.fillRect(-n.r * 1.3, -n.r * 0.55, n.r * 2.6, n.r);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.ellipse(-6, -n.r * 1.25, n.r * 0.7, n.r * 0.3, -0.2, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(10,4,12,0.7)'; poly(ctx, pts); ctx.stroke();
        // glowing cracks
        const pulse = 0.7 + Math.sin(t * 3 + n.phase) * 0.3;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const c of n.cracks) {
          ctx.strokeStyle = R.edge; ctx.lineWidth = 5; ctx.beginPath(); c.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          ctx.strokeStyle = rgba(R.color, pulse); ctx.lineWidth = 2.5; ctx.stroke();
          ctx.strokeStyle = rgba('#fff4c0', pulse * 0.8); ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.lineCap = 'butt';
        // lava pool on top
        ctx.fillStyle = R.dark; ctx.beginPath(); ctx.ellipse(2, -n.r * 1.38, 11, 4.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba(R.color, 0.6 + pulse * 0.4); ctx.beginPath(); ctx.ellipse(2, -n.r * 1.4, 8, 3, 0, 0, TAU); ctx.fill();
        // rising embers
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.6 + i / 3 + n.phase) % 1;
          ctx.globalAlpha = 1 - k; ctx.fillStyle = i % 2 ? R.color : '#fff1a0';
          ctx.beginPath(); ctx.arc(2 + Math.sin(k * 6 + i) * 8, -n.r * 1.4 - k * 46, 2 - k, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
      dead(ctx, n, R) {
        ctx.fillStyle = R.stone; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(-14 + i * 9, -2 + (i % 2) * 3, 7, 4, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = rgba(R.color, 0.6); ctx.beginPath(); ctx.ellipse(0, -1, 6, 2, 0, 0, TAU); ctx.fill();
      },
    },
    icespire: {
      top: 110,
      base(ctx, n) { ctx.fillStyle = 'rgba(240,248,255,0.55)'; ctx.beginPath(); ctx.ellipse(0, -1, n.r * 1.1, n.r * 0.38, 0, 0, TAU); ctx.fill(); },
      glow(ctx, n, R, t) { glow(ctx, 0, -40, 70, rgba(R.color, 0.6), 0.25 + Math.sin(t * 1.6 + n.phase) * 0.06); },
      alive(ctx, n, R, t, ov) {
        for (const s of n.spires) {
          ctx.save(); ctx.translate(s.ox, 0); ctx.rotate(s.a * 0.4);
          poly(ctx, [[-s.w / 2, 0], [-s.w * 0.3, -s.h * 0.8], [0, -s.h], [s.w * 0.35, -s.h * 0.75], [s.w / 2, 0]]);
          if (ov) { ctx.fillStyle = ov; ctx.fill(); ctx.restore(); continue; }
          const g = ctx.createLinearGradient(0, -s.h, 0, 0);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, R.color); g.addColorStop(1, R.dark);
          ctx.fillStyle = g; ctx.fill();
          ctx.lineWidth = 1.4; ctx.strokeStyle = R.edge; ctx.stroke();
          // inner fracture lines and a bright edge
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(-s.w * 0.3, -3); ctx.lineTo(-s.w * 0.2, -s.h * 0.75); ctx.stroke();
          ctx.strokeStyle = rgba(R.dark, 0.6); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(s.w * 0.1, -s.h * 0.3); ctx.lineTo(s.w * 0.3, -s.h * 0.45); ctx.lineTo(0, -s.h * 0.6); ctx.stroke();
          ctx.restore();
        }
        if (ov) return;
        // snow caps the base
        ctx.fillStyle = '#f6fbff';
        ctx.beginPath(); ctx.ellipse(-12, -2, 16, 6, 0, Math.PI, TAU); ctx.ellipse(10, -1, 18, 7, 0, Math.PI, TAU); ctx.fill();
        // twinkles
        for (const p of n.sparks) {
          const a = Math.max(0, Math.sin(t * 2.5 + p.p));
          if (a < 0.2) continue;
          ctx.fillStyle = `rgba(255,255,255,${a})`; const s = 4 * a;
          poly(ctx, [[p.x, p.y - s], [p.x + s * 0.25, p.y - s * 0.25], [p.x + s, p.y], [p.x + s * 0.25, p.y + s * 0.25], [p.x, p.y + s], [p.x - s * 0.25, p.y + s * 0.25], [p.x - s, p.y], [p.x - s * 0.25, p.y - s * 0.25]]);
          ctx.fill();
        }
      },
      dead(ctx, n, R) {
        ctx.fillStyle = '#f6fbff'; ctx.beginPath(); ctx.ellipse(0, -2, 20, 7, 0, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = R.dark; for (const s of n.spires.slice(0, 3)) poly(ctx, [[s.ox - 3, -2], [s.ox, -9], [s.ox + 3, -2]]), ctx.fill();
      },
    },
    ironrock: {
      top: 78,
      alive(ctx, n, R, t, ov) {
        let y = 0;
        for (let i = 0; i < n.slabs.length; i++) {
          const s = n.slabs[i];
          roundRect(ctx, s.ox - s.w, y - s.h, s.w * 2, s.h + 2, 8);
          ctx.fillStyle = ov || (i % 2 ? '#6a6670' : R.stone); ctx.fill();
          if (!ov) {
            ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(20,16,26,0.7)'; ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(s.ox - s.w + 6, y - s.h + 3, s.w * 2 - 12, 3);
          }
          y -= s.h - 2;
        }
        if (ov) return;
        // rust streaks running down
        ctx.strokeStyle = rgba(R.rust, 0.7); ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (const s of n.streaks) { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 1, s.y + s.l); ctx.stroke(); }
        ctx.lineCap = 'butt';
        // metallic ore lumps
        for (const l of n.lumps) {
          const g = ctx.createLinearGradient(l.x - l.s, l.y - l.s, l.x + l.s, l.y + l.s);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, R.color); g.addColorStop(1, R.dark);
          ctx.fillStyle = g; poly(ctx, [[l.x - l.s, l.y], [l.x - l.s * 0.3, l.y - l.s], [l.x + l.s, l.y - l.s * 0.4], [l.x + l.s * 0.6, l.y + l.s * 0.7], [l.x - l.s * 0.5, l.y + l.s * 0.6]]); ctx.fill();
          ctx.strokeStyle = R.edge; ctx.lineWidth = 1; ctx.stroke();
        }
      },
      dead(ctx, n, R) { ctx.fillStyle = R.stone; roundRect(ctx, -n.r, -10, n.r * 2, 12, 5); ctx.fill(); ctx.fillStyle = rgba(R.rust, 0.6); ctx.fillRect(-6, -8, 10, 3); },
    },
    resin: {
      top: 80,
      glow(ctx, n, R, t) { glow(ctx, 0, -48, 46, rgba(R.color, 0.8), 0.3 + Math.sin(t * 2 + n.phase) * 0.08); },
      alive(ctx, n, R, t, ov) {
        const w = n.w;
        // stump with roots
        ctx.fillStyle = ov || '#6a4426';
        poly(ctx, [[-w - 8, 0], [-w, -8], [-w + 2, -38], [w - 2, -38], [w, -8], [w + 8, 0]]); ctx.fill();
        if (!ov) {
          ctx.strokeStyle = 'rgba(40,22,10,0.6)'; ctx.lineWidth = 2;
          for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * w * 0.38, -36); ctx.quadraticCurveTo(i * w * 0.42 + 3, -18, i * w * 0.4, -2); ctx.stroke(); }
          ctx.fillStyle = '#c69a62'; ctx.beginPath(); ctx.ellipse(0, -38, w - 2, 7, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#8a6038'; ctx.lineWidth = 1.2;
          for (const k of [0.75, 0.5, 0.25]) { ctx.beginPath(); ctx.ellipse(0, -38, (w - 2) * k, 7 * k, 0, 0, TAU); ctx.stroke(); }
        }
        // amber drips down the sides and a big lump on top
        for (const d of n.drips) {
          ctx.fillStyle = ov || R.dark; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.s * 0.8, d.s * 1.3, 0, 0, TAU); ctx.fill();
          if (!ov) { ctx.fillStyle = rgba(R.color, 0.9); ctx.beginPath(); ctx.ellipse(d.x - 0.5, d.y - 1, d.s * 0.5, d.s, 0, 0, TAU); ctx.fill(); }
        }
        const b = 1 + Math.sin(t * 2 + n.phase) * 0.03;
        ctx.beginPath(); ctx.moveTo(-14 * b, -40); ctx.bezierCurveTo(-16 * b, -62, 16 * b, -66, 15 * b, -40); ctx.closePath();
        if (ov) { ctx.fillStyle = ov; ctx.fill(); return; }
        const g = ctx.createRadialGradient(-4, -54, 2, 0, -48, 18);
        g.addColorStop(0, '#fff3c0'); g.addColorStop(0.4, R.color); g.addColorStop(1, R.dark);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = R.edge; ctx.lineWidth = 1.5; ctx.stroke();
        // a tiny insect caught inside
        ctx.fillStyle = 'rgba(60,30,8,0.75)'; ctx.beginPath(); ctx.ellipse(3, -48, 3, 1.6, 0.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(60,30,8,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(1, -50); ctx.lineTo(-2, -53); ctx.moveTo(4, -50); ctx.lineTo(6, -54); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(-6, -55, 3, 1.6, -0.6, 0, TAU); ctx.fill();
      },
      dead(ctx, n) { ctx.fillStyle = '#6a4426'; roundRect(ctx, -n.w, -12, n.w * 2, 12, 4); ctx.fill(); ctx.fillStyle = '#c69a62'; ctx.beginPath(); ctx.ellipse(0, -12, n.w, 5, 0, 0, TAU); ctx.fill(); },
    },
    goldvein: {
      top: 92,
      alive(ctx, n, R, t, ov) {
        const pts = n.pts.map(([px, py]) => [px, py * 0.85 - n.r * 0.7]);
        poly(ctx, pts); ctx.fillStyle = ov || R.stone; ctx.fill();
        if (ov) return;
        ctx.save(); poly(ctx, pts); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; poly(ctx, [[-n.r, -n.r * 2.2], [n.r * 0.1, -n.r * 2.2], [-n.r * 0.2, 0], [-n.r, 0]]); ctx.fill();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const c of n.veins) {
          ctx.beginPath(); c.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.strokeStyle = R.edge; ctx.lineWidth = 5; ctx.stroke();
          ctx.strokeStyle = R.dark; ctx.lineWidth = 3.2; ctx.stroke();
          ctx.strokeStyle = R.color; ctx.lineWidth = 1.5; ctx.stroke();
        }
        ctx.lineCap = 'butt';
        for (const g of n.nuggets) {
          ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(g.x, g.y, g.s, 0, TAU); ctx.fill();
          ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(g.x - g.s * 0.25, g.y - g.s * 0.25, g.s * 0.7, 0, TAU); ctx.fill();
          const a = Math.max(0, Math.sin(t * 3 + g.p) - 0.6) * 2.5;
          if (a > 0) { ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(g.x - 6, g.y - 1); ctx.lineTo(g.x + 4, g.y - 1); ctx.moveTo(g.x - 1, g.y - 6); ctx.lineTo(g.x - 1, g.y + 4); ctx.stroke(); }
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(10,8,14,0.8)'; ctx.lineWidth = 2; poly(ctx, pts); ctx.stroke();
      },
      dead(ctx, n, R) { ctx.fillStyle = R.stone; for (let i = 0; i < 3; i++) { poly(ctx, [[-16 + i * 12, 0], [-12 + i * 12, -8 - i * 2], [-6 + i * 12, 0]]); ctx.fill(); } ctx.fillStyle = R.color; ctx.fillRect(-2, -4, 3, 3); },
    },
    mesa: {
      top: 80,
      alive(ctx, n, R, t, ov) {
        const w = n.w, h = n.h, J = n.jag;
        const left = [], right = [];
        for (let i = 0; i < 6; i++) { const y = -h * i / 5; left.push([-w - 4 + i * 2 + J[i], y]); right.push([w + 4 - i * 2 + J[i + 6], y]); }
        const outline = left.concat(right.reverse());
        poly(ctx, outline); ctx.fillStyle = ov || R.dark; ctx.fill();
        if (ov) return;
        // rock strata in alternating bands
        ctx.save(); poly(ctx, outline); ctx.clip();
        const bands = [R.dark, R.stone, R.color, R.dark, '#e8b27a', R.stone];
        for (let i = 0; i < 6; i++) { ctx.fillStyle = bands[i]; ctx.fillRect(-w - 10, -h * (i + 1) / 6 + 0.5, w * 2 + 20, h / 6 + 0.5); }
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(w * 0.35, -h - 4, w, h + 8);
        ctx.strokeStyle = 'rgba(90,50,20,0.35)'; ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-w + i * w * 0.45, -h * 0.9); ctx.lineTo(-w + i * w * 0.45 + 4, -h * 0.5); ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = R.edge; ctx.lineWidth = 2; poly(ctx, outline); ctx.stroke();
        // flat sunlit top
        ctx.fillStyle = R.color; ctx.beginPath(); ctx.ellipse(J[5] / 2, -h, w * 0.78, 5, 0, 0, TAU); ctx.fill();
        for (const p of n.pebbles) { ctx.fillStyle = R.stone; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s, p.s * 0.6, 0, 0, TAU); ctx.fill(); }
      },
      dead(ctx, n, R) { ctx.fillStyle = R.dark; roundRect(ctx, -n.w * 0.8, -10, n.w * 1.6, 10, 3); ctx.fill(); ctx.fillStyle = R.color; ctx.fillRect(-n.w * 0.7, -10, n.w * 1.4, 3); },
    },
    malachite: {
      top: 76,
      glow(ctx, n, R, t) { glow(ctx, 0, -n.r, 50, rgba(R.color, 0.5), 0.2 + Math.sin(t * 2 + n.phase) * 0.06); },
      alive(ctx, n, R, t, ov) {
        const pts = n.pts.map(([px, py]) => [px, py * 0.6 - n.r * 0.45]);
        poly(ctx, pts); ctx.fillStyle = ov || R.stone; ctx.fill();
        if (!ov) {
          ctx.strokeStyle = 'rgba(30,12,4,0.7)'; ctx.lineWidth = 2; ctx.stroke();
          // copper sheen on the host rock
          ctx.fillStyle = rgba(R.copper, 0.55); ctx.beginPath(); ctx.ellipse(-n.r * 0.3, -n.r * 0.5, n.r * 0.4, 5, -0.2, 0, TAU); ctx.fill();
        }
        // grape-like malachite bubbles with banding
        for (const b of n.bubbles) {
          ctx.fillStyle = ov || R.dark; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
          if (ov) continue;
          ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(b.x - b.r * 0.15, b.y - b.r * 0.15, b.r * 0.8, 0, TAU); ctx.fill();
          ctx.strokeStyle = rgba(R.edge, 0.55); ctx.lineWidth = 1.2;
          for (const k of [0.55, 0.3]) { ctx.beginPath(); ctx.arc(b.x - b.r * 0.15, b.y - b.r * 0.15, b.r * k, 0.2, Math.PI + 1); ctx.stroke(); }
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.4, b.y - b.r * 0.45, b.r * 0.18, 0, TAU); ctx.fill();
        }
      },
      dead(ctx, n, R) { ctx.fillStyle = R.stone; ctx.beginPath(); ctx.ellipse(0, -4, n.r * 0.8, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(-4, -6, 4, 0, TAU); ctx.fill(); },
    },
    geode: {
      top: 80,
      glow(ctx, n, R, t) { glow(ctx, 0, -30, 80, rgba(R.color, 0.9), 0.4 + Math.sin(t * 2.6 + n.phase) * 0.12); },
      alive(ctx, n, R, t, ov) {
        ctx.save(); ctx.rotate(n.tilt);
        // rough outer shell
        ctx.beginPath(); ctx.ellipse(0, -28, 30, 30, 0, 0, TAU);
        ctx.fillStyle = ov || '#7a5a4a'; ctx.fill();
        if (ov) { ctx.restore(); return; }
        ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(8, -22, 22, 24, 0, 0, TAU); ctx.fill();
        // the cracked-open face with crystals pointing inwards
        ctx.fillStyle = '#f2e6d8'; ctx.beginPath(); ctx.ellipse(-2, -30, 23, 21, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = R.edge; ctx.beginPath(); ctx.ellipse(-2, -30, 20, 18, 0, 0, TAU); ctx.fill();
        for (const p of n.points) {
          const x = -2 + Math.cos(p.a) * 20, y = -30 + Math.sin(p.a) * 18;
          ctx.fillStyle = p.l > 8 ? R.color : R.dark;
          poly(ctx, [[x + Math.cos(p.a + 1.6) * 3, y + Math.sin(p.a + 1.6) * 3], [x - Math.cos(p.a) * p.l, y - Math.sin(p.a) * p.l], [x + Math.cos(p.a - 1.6) * 3, y + Math.sin(p.a - 1.6) * 3]]); ctx.fill();
        }
        const pulse = 1 + Math.sin(t * 3 + n.phase) * 0.12;
        const g = ctx.createRadialGradient(-2, -30, 0, -2, -30, 11 * pulse);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#ffe0a0'); g.addColorStop(1, rgba(R.color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-2, -30, 11 * pulse, 0, TAU); ctx.fill();
        // sun rays
        ctx.strokeStyle = rgba('#ffe0a0', 0.5); ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) { const a = t * 0.5 + i / 6 * TAU; ctx.beginPath(); ctx.moveTo(-2 + Math.cos(a) * 5, -30 + Math.sin(a) * 5); ctx.lineTo(-2 + Math.cos(a) * 12, -30 + Math.sin(a) * 12); ctx.stroke(); }
        ctx.restore();
      },
      dead(ctx, n, R) { ctx.fillStyle = '#7a5a4a'; ctx.beginPath(); ctx.ellipse(-8, -5, 10, 6, 0, 0, TAU); ctx.ellipse(10, -4, 9, 5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = R.dark; ctx.fillRect(-10, -8, 4, 3); },
    },
    palm: {
      top: 120,
      alive(ctx, n, R, t, ov) {
        const sway = Math.sin(t * 1.1 + n.phase) * 3, top = { x: n.lean + sway, y: -n.h };
        // segmented, curved trunk
        const seg = 7;
        for (let i = 0; i < seg; i++) {
          const k = i / seg, k2 = (i + 1) / seg;
          const x1 = top.x * k * k, y1 = -n.h * k, x2 = top.x * k2 * k2, y2 = -n.h * k2;
          ctx.strokeStyle = ov || (i % 2 ? (R.trunk || R.dark) : (R.trunkLight || R.color)); ctx.lineWidth = 11 - i * 0.6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.lineCap = 'butt';
        // fronds
        for (const f of n.fronds) {
          const a = f.a + Math.sin(t * 1.4 + n.phase + f.a) * 0.06, ex = top.x + Math.cos(a) * f.l, ey = top.y + Math.sin(a) * f.l * 0.6 + f.l * 0.35;
          const mx = top.x + Math.cos(a) * f.l * 0.5, my = top.y + Math.sin(a) * f.l * 0.5 - 8;
          ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.quadraticCurveTo(mx - 6, my - 6, ex, ey); ctx.quadraticCurveTo(mx + 6, my + 6, top.x, top.y + 4);
          ctx.fillStyle = ov || R.leafDark; ctx.fill();
          if (ov) continue;
          ctx.strokeStyle = R.leaf; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
          ctx.strokeStyle = rgba(R.leaf, 0.7); ctx.lineWidth = 1;
          for (let j = 1; j < 5; j++) { const k = j / 5, px = top.x + (ex - top.x) * k, py = top.y + (ey - top.y) * k - Math.sin(k * Math.PI) * 6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 3, py + 6); ctx.stroke(); }
        }
        if (ov) return;
        for (let i = 0; i < n.fruits; i++) {
          const fx = top.x - 8 + i * 6, fy = top.y + 6 + (i % 2) * 4;
          ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(fx, fy, 5.5, 0, TAU); ctx.fill();
          ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(fx - 1, fy - 1, 4.2, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(fx - 2, fy - 2.5, 1.3, 0, TAU); ctx.fill();
        }
      },
      dead(ctx, n, R) { ctx.fillStyle = R.trunk || R.dark; roundRect(ctx, -6, -10, 12, 10, 3); ctx.fill(); ctx.fillStyle = R.trunkLight || R.color; ctx.beginPath(); ctx.ellipse(0, -10, 6, 2.5, 0, 0, TAU); ctx.fill(); },
    },
    coral: {
      top: 84,
      base(ctx, n) { ctx.fillStyle = 'rgba(255,240,200,0.4)'; ctx.beginPath(); ctx.ellipse(0, 0, n.r * 1.1, n.r * 0.36, 0, 0, TAU); ctx.fill(); },
      alive(ctx, n, R, t, ov) {
        ctx.lineCap = 'round';
        const sw = Math.sin(t * 1.5 + n.phase) * 0.8;
        for (const b of n.branches) {
          ctx.strokeStyle = ov || R.dark; ctx.lineWidth = b.w + 2;
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x2 + sw * (-b.y2 / 60), b.y2); ctx.stroke();
        }
        if (!ov) for (const b of n.branches) {
          ctx.strokeStyle = R.color; ctx.lineWidth = b.w * 0.6;
          ctx.beginPath(); ctx.moveTo(b.x - 0.5, b.y - 0.5); ctx.lineTo(b.x2 + sw * (-b.y2 / 60) - 0.5, b.y2 - 0.5); ctx.stroke();
        }
        ctx.lineCap = 'butt';
        // round polyp tips
        for (const b of n.branches) if (b.w < 6) {
          const x = b.x2 + sw * (-b.y2 / 60);
          ctx.fillStyle = ov || '#ffd6e6'; ctx.beginPath(); ctx.arc(x, b.y2, 3.2, 0, TAU); ctx.fill();
          if (!ov) { ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(x, b.y2, 1.2, 0, TAU); ctx.fill(); }
        }
        if (ov) return;
        // bubbles drift up
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.4 + i / 3 + n.phase) % 1;
          ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(-10 + i * 10 + Math.sin(k * 8) * 3, -30 - k * 60, 2 + i * 0.6, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      },
      dead(ctx, n, R) { ctx.strokeStyle = R.dark; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (const b of n.branches.slice(0, 3)) { ctx.beginPath(); ctx.moveTo(b.x, 0); ctx.lineTo(b.x + 2, -7); ctx.stroke(); } ctx.lineCap = 'butt'; },
    },
    conch: {
      top: 70,
      glow(ctx, n, R, t) { glow(ctx, n.flip * 14, -16, 50, rgba(R.color, 0.8), 0.35 + Math.sin(t * 2.4 + n.phase) * 0.1); },
      alive(ctx, n, R, t, ov) {
        ctx.save(); ctx.scale(n.flip, 1);
        const col = R.shell || ['#123f4a', '#1f6170', '#2a8193'];
        // spiral body: shrinking whorls toward the tip
        for (let i = 4; i >= 0; i--) {
          const k = i / 4, x = -26 + k * 30, y = -18 - (1 - k) * 18, r = 9 + k * 15;
          ctx.fillStyle = ov || (i % 2 ? col[1] : col[2]); ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, -0.4, 0, TAU); ctx.fill();
          if (!ov) { ctx.strokeStyle = col[0]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, -0.4, Math.PI * 0.8, Math.PI * 1.9); ctx.stroke(); }
        }
        if (ov) { ctx.restore(); return; }
        // pearly ridges
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-6 + i * 3, -14, 10 + i * 4, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke(); }
        // opening with a glowing pearl inside
        ctx.fillStyle = '#ffd9e6'; ctx.beginPath(); ctx.ellipse(10, -14, 11, 13, 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0b2a33'; ctx.beginPath(); ctx.ellipse(11, -14, 7, 9, 0.3, 0, TAU); ctx.fill();
        const b = Math.sin(t * 2.4 + n.phase) * 1.5;
        const g = ctx.createRadialGradient(9, -17 + b, 1, 11, -14 + b, 6);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, R.color); g.addColorStop(1, R.dark);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(11, -14 + b, 5.5, 0, TAU); ctx.fill();
        ctx.restore();
      },
      dead(ctx, n) { const col = n.def.shell || ['#123f4a', '#1f6170']; ctx.fillStyle = col[1]; ctx.beginPath(); ctx.ellipse(0, -5, 14, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = col[0]; ctx.beginPath(); ctx.ellipse(4, -5, 4, 3, 0, 0, TAU); ctx.fill(); },
    },
    clam: {
      top: 60,
      alive(ctx, n, R, t, ov) {
        const bob = Math.sin(t * 2.4 + n.phase) * 3;
        if (!ov) {
          shell(ctx, n, true, R);
          glow(ctx, 0, -20 + bob, 60, rgba(R.color, 0.8), 0.45 + Math.sin(t * 3 + n.phase) * 0.12);
          const gr = ctx.createRadialGradient(-4, -26 + bob, 2, 0, -20 + bob, 13);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, R.color); gr.addColorStop(1, R.dark);
          ctx.fillStyle = gr;
        } else ctx.fillStyle = ov;
        ctx.beginPath(); ctx.arc(0, -20 + bob, 13, 0, TAU); ctx.fill();
        if (ov) return;
        ctx.strokeStyle = rgba(R.color, 0.6); ctx.lineWidth = 1.2;
        const k = (t * 0.8 + n.phase) % 1;
        ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(0, -20 + bob, 13 + k * 14, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      },
      dead(ctx, n, R) { ctx.scale(0.9, 0.9); shell(ctx, n, false, R); },
    },
    tree: {
      top: 112,
      alive(ctx, n, R, t, ov) {
        const sway = Math.sin(t * 1.3 + n.phase) * 2;
        ctx.fillStyle = ov || R.trunk || R.dark; roundRect(ctx, -6, -n.trunk - 4, 12, n.trunk + 4, 4); ctx.fill();
        if (!ov) {
          ctx.fillStyle = R.trunkLight || R.color; ctx.fillRect(-6, -n.trunk, 4, n.trunk - 2);
          ctx.strokeStyle = rgba(R.edge, 0.55); ctx.lineWidth = 1.2;
          for (let i = 0; i < 4; i++) { const y = -n.trunk * (0.2 + i * 0.2); ctx.beginPath(); ctx.moveTo(-3, y); ctx.quadraticCurveTo(1, y - 3, 5, y + 1); ctx.stroke(); }
          ctx.fillStyle = R.edge; ctx.beginPath(); ctx.ellipse(2, -n.trunk * 0.55, 1.8, 2.6, 0, 0, TAU); ctx.fill();
          // roots
          ctx.fillStyle = R.trunk || R.dark; poly(ctx, [[-12, 1], [-5, -8], [-3, 1]]); ctx.fill(); poly(ctx, [[12, 1], [5, -7], [3, 1]]); ctx.fill();
        }
        for (const b of n.blobs) {
          ctx.fillStyle = ov || R.leafDark; ctx.beginPath(); ctx.arc(b.x + sway, b.y, b.r, 0, TAU); ctx.fill();
        }
        if (ov) return;
        for (const b of n.blobs) { ctx.fillStyle = R.leaf; ctx.beginPath(); ctx.arc(b.x + sway - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.72, 0, TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        for (const b of n.blobs.slice(-2)) { ctx.beginPath(); ctx.arc(b.x + sway - b.r * 0.4, b.y - b.r * 0.45, b.r * 0.3, 0, TAU); ctx.fill(); }
        if (R.fruit) for (const b of n.blobs) {
          ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(b.x + sway + b.r * 0.35, b.y + b.r * 0.3, 5, 0, TAU); ctx.fill();
          ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(b.x + sway + b.r * 0.3, b.y + b.r * 0.25, 4, 0, TAU); ctx.fill();
        }
      },
      dead(ctx, n, R) {
        ctx.fillStyle = R.dark; roundRect(ctx, -7, -9, 14, 10, 3); ctx.fill();
        ctx.fillStyle = R.color; ctx.beginPath(); ctx.ellipse(0, -9, 7, 3, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = R.dark; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -9, 3.5, 1.5, 0, 0, TAU); ctx.stroke();
      },
    },
    mushroom: {
      top: 74,
      glow(ctx, n, R, t) { glow(ctx, 0, -30, 60, rgba(R.color, 0.7), 0.35 + Math.sin(t * 2.5 + n.phase) * 0.1); },
      alive(ctx, n, R, t, ov) {
        for (const c of n.caps) {
          const pulse = 1 + Math.sin(t * 2 + n.phase + c.ox) * 0.03;
          ctx.fillStyle = ov || R.stem; roundRect(ctx, c.ox - c.r * 0.22, -c.h, c.r * 0.44, c.h, 3); ctx.fill();
          ctx.beginPath(); ctx.ellipse(c.ox, -c.h, c.r * pulse, c.r * 0.7 * pulse, 0, Math.PI, TAU); ctx.closePath();
          ctx.fillStyle = ov || R.dark; ctx.fill();
          if (ov) continue;
          ctx.beginPath(); ctx.ellipse(c.ox - c.r * 0.15, -c.h - 1, c.r * 0.8, c.r * 0.55, 0, Math.PI, TAU); ctx.closePath();
          ctx.fillStyle = R.color; ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath(); ctx.arc(c.ox - c.r * 0.35, -c.h - c.r * 0.35, c.r * 0.12, 0, TAU); ctx.arc(c.ox + c.r * 0.25, -c.h - c.r * 0.45, c.r * 0.1, 0, TAU); ctx.arc(c.ox + c.r * 0.55, -c.h - c.r * 0.15, c.r * 0.08, 0, TAU); ctx.fill();
          // gills under the cap
          ctx.strokeStyle = rgba(R.edge, 0.5); ctx.lineWidth = 1;
          for (let g = -2; g <= 2; g++) { ctx.beginPath(); ctx.moveTo(c.ox + g * c.r * 0.18, -c.h); ctx.lineTo(c.ox + g * c.r * 0.3, -c.h + 2); ctx.stroke(); }
        }
        if (ov) return;
        // glowing spores float off
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.3 + i / 3 + n.phase) % 1;
          ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9; ctx.fillStyle = R.color;
          ctx.beginPath(); ctx.arc(Math.sin(k * 5 + i * 2) * 16, -40 - k * 50, 1.8, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
      dead(ctx, n, R) { ctx.fillStyle = R.stem; for (const c of n.caps) { roundRect(ctx, c.ox - 3, -5, 6, 5, 2); ctx.fill(); } },
    },
    bush: {
      top: 62,
      alive(ctx, n, R, t, ov) {
        for (const b of n.blobs) { ctx.fillStyle = ov || R.leafDark; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
        if (ov) return;
        for (const b of n.blobs) { ctx.fillStyle = R.leaf; ctx.beginPath(); ctx.arc(b.x - b.r * 0.2, b.y - b.r * 0.25, b.r * 0.7, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = rgba(R.leafDark, 0.8); ctx.lineWidth = 1;
        for (const b of n.blobs) { ctx.beginPath(); ctx.moveTo(b.x - b.r * 0.4, b.y); ctx.quadraticCurveTo(b.x, b.y - b.r * 0.3, b.x + b.r * 0.4, b.y - b.r * 0.1); ctx.stroke(); }
        for (const b of n.berries) {
          ctx.fillStyle = R.dark; ctx.beginPath(); ctx.arc(b.x, b.y, 4.2, 0, TAU); ctx.fill();
          ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(b.x - 0.6, b.y - 0.6, 3.2, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(b.x - 1.8, b.y - 2, 1.4, 1.4);
        }
      },
      dead(ctx, n, R) { for (const b of n.blobs) { ctx.fillStyle = R.leafDark; ctx.beginPath(); ctx.arc(b.x * 0.7, -5, b.r * 0.45, 0, TAU); ctx.fill(); } },
    },
    cactus: {
      top: 96,
      alive(ctx, n, R, t, ov) {
        const col = ov || R.plantDark, hi = ov || R.plant;
        for (const a of n.arms) {
          const y = -n.h * a.y, x = a.s * 18;
          ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(x, y); ctx.lineTo(x, y - a.h); ctx.stroke();
          if (!ov) { ctx.strokeStyle = hi; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x - 2, y - a.h); ctx.stroke(); }
        }
        ctx.lineCap = 'butt';
        ctx.fillStyle = col; roundRect(ctx, -10, -n.h, 20, n.h, 10); ctx.fill();
        if (ov) return;
        ctx.fillStyle = hi; roundRect(ctx, -7, -n.h + 4, 7, n.h - 8, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,230,0.8)';
        for (let i = 1; i < 6; i++) { ctx.fillRect(7, -n.h + i * n.h / 6, 3, 1); ctx.fillRect(-10, -n.h + i * n.h / 6 + 4, 3, 1); }
        // the water bulb on top is the harvestable part
        const b = Math.sin(t * 2 + n.phase) * 0.06 + 1;
        ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(0, -n.h - 4, 7 * b, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-2, -n.h - 6, 2, 0, TAU); ctx.fill();
        // a small pink flower on the right arm, and ribs on the trunk
        const arm = n.arms[1], fx = 18, fy = -n.h * arm.y - arm.h - 4;
        ctx.fillStyle = '#ff8fb8'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + t * 0.2; ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 3.5, fy + Math.sin(a) * 2.5, 3, 2, a, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(fx, fy, 2, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(20,50,20,0.35)'; ctx.lineWidth = 1.5;
        for (const dx of [-4, 4]) { ctx.beginPath(); ctx.moveTo(dx, -n.h + 6); ctx.lineTo(dx, -4); ctx.stroke(); }
      },
      dead(ctx, n, R) { ctx.fillStyle = R.plantDark; roundRect(ctx, -9, -10, 18, 10, 5); ctx.fill(); },
    },
    bones: {
      top: 66,
      alive(ctx, n, R, t, ov) {
        ctx.save(); ctx.scale(n.flip, 1);
        // half-buried ribcage
        ctx.strokeStyle = ov || R.dark; ctx.lineWidth = 7; ctx.lineCap = 'round';
        for (let i = 0; i < n.ribs; i++) {
          const x = -22 + i * 11, h = 34 - Math.abs(i - n.ribs / 2) * 5;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 8, -h, x + 16, -h * 0.55); ctx.stroke();
        }
        if (!ov) {
          ctx.strokeStyle = R.color; ctx.lineWidth = 4;
          for (let i = 0; i < n.ribs; i++) {
            const x = -22 + i * 11, h = 34 - Math.abs(i - n.ribs / 2) * 5;
            ctx.beginPath(); ctx.moveTo(x - 1, -2); ctx.quadraticCurveTo(x + 7, -h - 1, x + 15, -h * 0.55 - 1); ctx.stroke();
          }
        }
        // skull
        ctx.fillStyle = ov || R.color; ctx.beginPath(); ctx.ellipse(-30, -10, 13, 10, -0.3, 0, TAU); ctx.fill();
        if (!ov) {
          ctx.strokeStyle = R.edge; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = R.edge; ctx.beginPath(); ctx.arc(-33, -12, 3, 0, TAU); ctx.fill();
        }
        ctx.lineCap = 'butt';
        ctx.restore();
      },
      dead(ctx, n, R) { ctx.fillStyle = R.dark; ctx.beginPath(); ctx.ellipse(0, -2, 20, 5, 0, 0, TAU); ctx.fill(); },
    },
  };

  function shell(ctx, n, open, R) {
    const col = R.shell || ['#2d1640', '#4b2468', '#5c2c80'];
    ctx.fillStyle = col[0];
    ctx.beginPath(); ctx.ellipse(0, -6, n.r, n.r * 0.5, 0, 0, TAU); ctx.fill();
    for (const s of n.spikes) {
      const bx = Math.cos(s.a) * n.r * 0.9, by = Math.sin(s.a) * n.r * 0.45 - 8;
      ctx.fillStyle = col[1];
      poly(ctx, [[bx - 5, by], [bx + Math.cos(s.a) * s.l * 0.5, by + Math.sin(s.a) * s.l], [bx + 5, by]]); ctx.fill();
    }
    ctx.fillStyle = col[2]; ctx.beginPath(); ctx.ellipse(0, -10, n.r * 0.8, n.r * 0.34, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#170a22'; ctx.beginPath(); ctx.ellipse(0, -9, n.r * 0.62, n.r * (open ? 0.2 : 0.08), 0, 0, TAU); ctx.fill();
  }

  function hpBar(ctx, n, y, R) {
    if (!n.alive || n.hp >= n.maxHp) return;
    const w = 42, k = Math.max(0, n.hp / n.maxHp);
    ctx.fillStyle = 'rgba(28,10,40,0.75)'; roundRect(ctx, n.x - w / 2 - 2, y - 2, w + 4, 8, 4); ctx.fill();
    ctx.fillStyle = R.color; roundRect(ctx, n.x - w / 2, y, Math.max(2, w * k), 4, 2); ctx.fill();
  }

  function node(ctx, n, t) {
    const R = n.def, S = NODES[R.node];
    const g = n.alive ? easeOutBack(n.grow) : 0;
    ctx.save(); ctx.translate(n.x + Math.sin(t * 55) * n.shake * 5, n.y);
    shadow(ctx, 0, 3, n.r * 1.3, n.r * 0.46);
    if (S.base) S.base(ctx, n, R);
    if (g > 0) {
      if (S.glow) S.glow(ctx, n, R, t);
      ctx.save(); ctx.scale(1 + (1 - g) * 0.2, g);
      S.alive(ctx, n, R, t, null);
      if (n.flash > 0) S.alive(ctx, n, R, t, `rgba(255,255,255,${(n.flash * 0.85).toFixed(3)})`);
      ctx.restore();
    } else S.dead(ctx, n, R);
    ctx.restore();
    hpBar(ctx, n, n.y - S.top, R);
  }

  // ---------- tools, drawn in the hand (x along the arm) ----------
  const TOOLS = {
    pick(ctx, sw) {
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(26, 0); ctx.stroke();
      ctx.fillStyle = '#6ff5e8'; poly(ctx, [[24, -9], [31, 0], [24, 9], [27, 0]]); ctx.fill();
      if (sw > 0.5) glow(ctx, 30, 0, 18, 'rgba(111,245,232,1)', (sw - 0.5) * 1.8);
    },
    axe(ctx, sw) {
      ctx.strokeStyle = '#7a4a26'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(32, 0); ctx.stroke();
      ctx.fillStyle = '#dfe5ee'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(26, -2); ctx.lineTo(24, -13); ctx.quadraticCurveTo(34, -10, 34, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffab4a'; ctx.fillRect(25, -4, 8, 3);
      if (sw > 0.5) glow(ctx, 30, -8, 18, 'rgba(255,171,74,1)', (sw - 0.5) * 1.8);
    },
    drill(ctx, sw) {
      ctx.fillStyle = '#ffcf6a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      roundRect(ctx, 10, -5, 14, 10, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9ced8'; poly(ctx, [[24, -5], [37, 0], [24, 5]]); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
      const k = (Date.now() / 40) % 4;
      for (let i = 0; i < 3; i++) { const x = 25 + ((i * 4 + k) % 11); ctx.beginPath(); ctx.moveTo(x, -4 + (x - 24) * 0.3); ctx.lineTo(x + 2, 4 - (x - 24) * 0.3); ctx.stroke(); }
      if (sw > 0.3) glow(ctx, 37, 0, 20, 'rgba(255,207,106,1)', sw);
    },
  };

  // ---------- astronaut ----------
  const PER_COL = 16;
  function stackSlot(P, i) {
    const col = Math.floor(i / PER_COL), row = i % PER_COL, r = row / (PER_COL - 1);
    return { x: P.x - P.face * (20 + col * 15) + P.sway * r * r, y: P.y - 34 - row * 8.5 - col * 3 };
  }

  function player(ctx, P, t) {
    const moving = Math.hypot(P.vx, P.vy) > 25;
    const bob = moving ? Math.abs(Math.sin(P.walk)) * 3 : Math.sin(t * 2) * 0.8;
    const f = P.face;
    shadow(ctx, P.x, P.y, 20, 7);
    if (moving) glow(ctx, P.x, P.y - 2, 22, 'rgba(111,245,232,0.7)', 0.25 + Math.sin(t * 30) * 0.05);

    ctx.save(); ctx.translate(P.x, P.y - bob);
    const step = moving ? Math.sin(P.walk) * 5 : 0;
    ctx.fillStyle = '#d9d6e6'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    roundRect(ctx, -10 + step * 0.4, -14 + bob, 8, 14 - Math.max(0, step) * 0.3, 3); ctx.fill(); ctx.stroke();
    roundRect(ctx, 2 - step * 0.4, -14 + bob, 8, 14 - Math.max(0, -step) * 0.3, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff8f5a';
    ctx.fillRect(-10 + step * 0.4, -3 + bob, 8, 3); ctx.fillRect(2 - step * 0.4, -3 + bob, 8, 3);

    ctx.fillStyle = '#9a90b0'; roundRect(ctx, -f * 20 - 7, -40, 14, 24, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6ff5e8'; ctx.fillRect(-f * 20 - 2, -34, 4, 4);

    ctx.fillStyle = '#f2f0f8'; roundRect(ctx, -13, -40, 26, 28, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff8f5a'; ctx.fillRect(-13, -24, 26, 4);
    ctx.fillStyle = '#c9c4da'; roundRect(ctx, f * 2 - 5, -36, 10, 8, 2); ctx.fill();

    // arm + plasma pick
    const sw = P.swing;
    const ang = (P.target ? -0.2 : 0.9) + (sw > 0 ? -1.6 * Math.sin(sw * Math.PI) : 0);
    ctx.save(); ctx.translate(f * 9, -32); ctx.scale(f, 1); ctx.rotate(ang);
    ctx.fillStyle = '#f2f0f8'; roundRect(ctx, -3, -3, 16, 7, 3.5); ctx.fill(); ctx.stroke();
    TOOLS[P.tool || 'pick'](ctx, sw);
    ctx.restore();

    const hx = f * 2, hy = -52;
    ctx.fillStyle = '#f7f6fc'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, 15, 0, TAU); ctx.fill(); ctx.stroke();
    const vg = ctx.createLinearGradient(hx + f * 2, hy - 9, hx + f * 10, hy + 7);
    vg.addColorStop(0, '#ffd27a'); vg.addColorStop(0.55, '#ff9a4a'); vg.addColorStop(1, '#a8452c');
    ctx.fillStyle = vg; ctx.beginPath(); ctx.ellipse(hx + f * 5, hy + 1, 9, 8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(hx + f * 2, hy - 3, 3, 2, -0.5 * f, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx - f * 8, hy - 11); ctx.lineTo(hx - f * 12, hy - 22); ctx.stroke();
    ctx.fillStyle = Math.sin(t * 5) > 0 ? '#ff6b6b' : '#7a2a3a'; ctx.beginPath(); ctx.arc(hx - f * 12, hy - 23, 2.6, 0, TAU); ctx.fill();
    ctx.restore();

    const S = SF.state.stack;
    for (let i = 0; i < S.length; i++) {
      const p = stackSlot(P, i);
      item(ctx, S[i], p.x, p.y - bob, 1.15 + (P.stackFx[i] || 0) * 0.6);
    }

    const cap = SF.stats().cap;
    if (S.length > 0 || P.fullT > 0) {
      const full = S.length >= cap;
      const rows = Math.min(S.length, PER_COL);
      const ly = Math.min(P.y - 82, P.y - 48 - rows * 8.5) - (full ? Math.abs(Math.sin(t * 8)) * 3 : 0);
      label(ctx, full ? 'FULL' : `${S.length}/${cap}`, P.x + f * 4, ly, full ? 15 : 13, full ? '#ff8f5a' : '#fff4e8');
    }
  }

  // ---------- drones ----------
  function drone(ctx, d, t) {
    const z = 46 + Math.sin(t * 3 + d.bob) * 5, acc = SF.World.planet.theme.accent;
    shadow(ctx, d.x, d.y, 16, 6, 0.22);
    const y = d.y - z;
    for (let i = 0; i < d.cargo.length; i++) item(ctx, d.cargo[i], d.x + (i % 2 ? 4 : -4), y + 16 + i * 7, 0.8);
    ctx.save(); ctx.translate(d.x, y); ctx.rotate(Math.max(-0.3, Math.min(0.3, d.vx * 0.002)));
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.fillStyle = 'rgba(220,240,255,0.35)';
      ctx.beginPath(); ctx.ellipse(s * 17, -4, 11 * Math.abs(Math.sin(t * 40 + s)) + 3, 3, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 7, 0); ctx.lineTo(s * 17, -4); ctx.stroke();
    }
    ctx.fillStyle = '#ece8f6'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = d.state === 'harvest' ? '#ffab4a' : acc;
    ctx.beginPath(); ctx.arc(0, 1, 4, 0, TAU); ctx.fill();
    ctx.restore();
    if (d.beam > 0 && d.target) {
      ctx.globalAlpha = d.beam; ctx.strokeStyle = acc; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(d.x, y + 6); ctx.lineTo(d.target.x, d.target.y - 22); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ---------- ground markings ----------
  function pad(ctx, x, y, r, color, t, active) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.55);
    ctx.fillStyle = color.replace('A', active ? '0.28' : '0.14');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = color.replace('A', '0.9'); ctx.lineWidth = 4;
    ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.arc(0, 0, r - 4, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function dropZone(ctx, t, active, hub) {
    const z = C.dropZone;
    pad(ctx, z.x, z.y, z.r, 'rgba(111,245,232,A)', t, active);
    for (let i = 0; i < 3; i++) {
      const k = ((t * 1.2 + i / 3) % 1);
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8;
      ctx.strokeStyle = '#6ff5e8'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const yy = z.y + 14 - k * 30;
      ctx.beginPath(); ctx.moveTo(z.x - 14, yy + 6); ctx.lineTo(z.x, yy - 2); ctx.lineTo(z.x + 14, yy + 6); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    label(ctx, hub ? 'TO WAREHOUSE' : 'DROP OFF', z.x, z.y + z.r * 0.55 + 16, 14, '#6ff5e8');
  }

  function plotMarking(ctx, p, st, t, active) {
    if (p.kind === 'lot') { lotMarking(ctx, p, t, active); return; }
    const s = C.plotR * 1.6, k = st.paid / p.cost;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.6); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = active ? 'rgba(255,244,232,0.16)' : 'rgba(255,244,232,0.08)';
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.fillStyle = 'rgba(255,211,107,0.45)';
    ctx.fillRect(-s / 2, s / 2 - s * k, s, s * k);
    ctx.strokeStyle = active ? '#fff4e8' : 'rgba(255,244,232,0.7)'; ctx.lineWidth = 4;
    ctx.setLineDash([14, 9]); ctx.lineDashOffset = -t * 20;
    ctx.strokeRect(-s / 2, -s / 2, s, s); ctx.setLineDash([]);
    ctx.restore();
    const left = SF.UI.fmt(Math.ceil(p.cost - st.paid));
    if (p.kind === 'gate' && p.res != null) item(ctx, here(p.res), p.x, p.y - 56, 1.4);
    // materials still owed, from the chest
    if (p.needs) {
      const codes = Object.keys(p.needs);
      codes.forEach((c, i) => {
        const x = p.x + (i - (codes.length - 1) / 2) * 62, y = p.y + 52;
        const got = (st.res && st.res[c]) || 0, done = got >= p.needs[c];
        item(ctx, +c, x - 16, y, 1.1);
        label(ctx, `${got}/${p.needs[c]}`, x + 10, y, 12, done ? '#9be36a' : '#fff4e8');
      });
    }
    label(ctx, p.name, p.x, p.y - 34, 15, '#fff4e8');
    hexCoin(ctx, p.x - 6 - left.length * 5.5, p.y - 2, 8);
    label(ctx, left, p.x + 6, p.y - 1, 20, '#ffd36b');
    label(ctx, p.desc, p.x, p.y + 30, 12, 'rgba(255,244,232,0.85)', 600);
  }

  // A worn footpath from the landing site out to a region: it winds a little, has soft grassy edges,
  // a lighter trodden middle and a few flat stones. Drawn once per trail into its own canvas.
  function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mixRGB(c1, c2, k) { return c1.map((v, i) => Math.round(v + (c2[i] - v) * k)); }
  const css = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  function trail(ctx, tr) {
    if (!tr.cv) tr.cv = bakeTrail(tr);
    const c = tr.cv;
    ctx.drawImage(c.canvas, c.x, c.y);
  }
  function bakeTrail(tr) {
    const { a, b } = tr, l = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / l, uy = (b.y - a.y) / l;
    let seed = Math.abs(Math.round(a.x * 7 + a.y * 13 + l)) % 233280 + 1;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const ph1 = rnd() * TAU, ph2 = rnd() * TAU, W0 = C.trailWidth * 0.42;
    // points along a gently winding centre line, with the width tapering in at both ends
    const pts = [];
    for (let s = 0; s <= l; s += 6) {
      const k = s / l, ease = Math.min(1, s / 120, (l - s) / 160);
      const off = (Math.sin(s * 0.007 + ph1) * 24 + Math.sin(s * 0.019 + ph2) * 9) * Math.min(1, s / 200);
      const w = W0 * (0.55 + 0.45 * ease) * (1 + Math.sin(s * 0.031 + ph2) * 0.12);
      pts.push({ x: a.x + ux * s - uy * off, y: a.y + uy * s + ux * off, w, fade: Math.max(0, ease), k });
    }
    const pad = W0 * 2 + 30;
    const minX = Math.min(...pts.map(p => p.x)) - pad, minY = Math.min(...pts.map(p => p.y)) - pad;
    const maxX = Math.max(...pts.map(p => p.x)) + pad, maxY = Math.max(...pts.map(p => p.y)) + pad;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(maxX - minX); cv.height = Math.ceil(maxY - minY);
    const g = cv.getContext('2d');
    g.translate(-minX, -minY); g.lineCap = 'round'; g.lineJoin = 'round';
    const ground = hexRGB(SF.World.planet.theme.ground);
    const dirt = mixRGB(ground, [196, 160, 112], 0.42), edge = mixRGB(ground, [40, 28, 20], 0.35), worn = mixRGB(dirt, [255, 236, 200], 0.22);
    const layer = (col, wk, alpha) => {
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i];
        g.strokeStyle = css(col, alpha * q.fade); g.lineWidth = q.w * 2 * wk;
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke();
      }
    };
    layer(edge, 1.25, 0.28);   // darker soft rim where the grass is pressed down
    layer(dirt, 1.0, 0.85);    // packed earth
    layer(worn, 0.45, 0.45);   // lighter trodden middle
    // flat stepping stones and pebbles
    for (let i = 4; i < pts.length - 4; i += 5 + Math.floor(rnd() * 5)) {
      const p = pts[i], side = (rnd() - 0.5) * p.w * 1.3, r = 3 + rnd() * 5, f = p.fade;
      const x = p.x - uy * side, y = p.y + ux * side;
      g.fillStyle = css(edge, 0.35 * f); g.beginPath(); g.ellipse(x + 1, y + 2, r * 1.5, r, 0, 0, TAU); g.fill();
      g.fillStyle = css(mixRGB(dirt, [255, 250, 240], 0.35), 0.9 * f); g.beginPath(); g.ellipse(x, y, r * 1.4, r * 0.9, 0, 0, TAU); g.fill();
    }
    // grass tufts nibbling at the edges so the path sits in the ground instead of on it
    const tuft = mixRGB(ground, [255, 255, 230], 0.18);
    g.lineWidth = 2;
    for (let i = 2; i < pts.length - 2; i += 2 + Math.floor(rnd() * 3)) {
      const p = pts[i], sd = rnd() > 0.5 ? 1 : -1, d = p.w * (0.85 + rnd() * 0.3) * sd;
      const x = p.x - uy * d, y = p.y + ux * d;
      g.strokeStyle = css(tuft, 0.75 * p.fade);
      for (let j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(x + j * 3, y); g.quadraticCurveTo(x + j * 4, y - 5, x + j * 6, y - 9 - rnd() * 4); g.stroke(); }
    }
    return { canvas: cv, x: minX, y: minY };
  }
  // An empty lot in New Haven: a fenced square with a plus, waiting for you to pick a building.
  function lotMarking(ctx, p, t, active) {
    const s = C.plotR * 1.7;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.6); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = active ? 'rgba(155,227,106,0.2)' : 'rgba(255,244,232,0.07)';
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeStyle = active ? '#9be36a' : 'rgba(255,244,232,0.55)'; ctx.lineWidth = 3;
    ctx.setLineDash([6, 10]); ctx.lineDashOffset = -t * 12; ctx.strokeRect(-s / 2, -s / 2, s, s); ctx.setLineDash([]);
    ctx.restore();
    // corner stakes
    for (const [dx, dy] of [[-s * 0.7, 0], [s * 0.7, 0], [0, -s * 0.42], [0, s * 0.42]]) {
      ctx.fillStyle = '#a8703f'; ctx.fillRect(p.x + dx - 2, p.y + dy - 14, 4, 14);
      ctx.fillStyle = '#ff8f5a'; ctx.fillRect(p.x + dx - 3, p.y + dy - 16, 6, 4);
    }
    const b = 1 + Math.sin(t * 3) * 0.06;
    ctx.save(); ctx.translate(p.x, p.y - 4); ctx.scale(b, b);
    ctx.fillStyle = active ? '#9be36a' : 'rgba(255,244,232,0.75)';
    ctx.fillRect(-14, -3.5, 28, 7); ctx.fillRect(-3.5, -14, 7, 28);
    ctx.restore();
    label(ctx, 'EMPTY LOT', p.x, p.y - 34, 13, '#fff4e8');
    label(ctx, 'Stand here to choose a building', p.x, p.y + 30, 11, 'rgba(255,244,232,0.8)', 600);
  }

  // ---------- buildings ----------
  function lander(ctx, t, glowK) {
    const d = C.depot;
    ctx.save(); ctx.translate(d.x, d.y);
    shadow(ctx, 0, 8, 92, 30);
    ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 40, -30); ctx.lineTo(s * 74, 6); ctx.stroke(); }
    ctx.lineCap = 'butt';
    for (const s of [-1, 1]) { ctx.fillStyle = '#7d7290'; ctx.beginPath(); ctx.ellipse(s * 74, 6, 12, 5, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#d8d2e6'; ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-58, -20); ctx.lineTo(-44, -88); ctx.lineTo(44, -88); ctx.lineTo(58, -20); ctx.quadraticCurveTo(0, 6, -58, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b6aec9'; ctx.beginPath(); ctx.moveTo(10, -88); ctx.lineTo(44, -88); ctx.lineTo(58, -20); ctx.quadraticCurveTo(34, -8, 18, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff8f5a'; ctx.fillRect(-52, -46, 104, 7);
    ctx.fillStyle = '#efeaf8'; ctx.beginPath(); ctx.ellipse(0, -88, 44, 26, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
    const wg = ctx.createLinearGradient(-20, -110, 20, -90);
    wg.addColorStop(0, '#ffe09a'); wg.addColorStop(1, '#ff8f4a');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(-6, -98, 18, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2a4a'; ctx.beginPath(); ctx.ellipse(0, -28, 26, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(111,245,232,${0.35 + glowK * 0.6})`; ctx.beginPath(); ctx.ellipse(0, -28, 20, 6, 0, 0, TAU); ctx.fill();
    ctx.restore();
    glow(ctx, d.x, d.y - 28, 60 + glowK * 40, 'rgba(111,245,232,0.9)', 0.15 + glowK * 0.5);
    ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(d.x + 26, d.y - 108); ctx.lineTo(d.x + 34, d.y - 136); ctx.stroke();
    ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ff6b6b' : '#ffd36b';
    ctx.beginPath(); ctx.arc(d.x + 34, d.y - 138, 4, 0, TAU); ctx.fill();
  }

  function upgradePad(ctx, t, active) {
    const u = C.upgradePad;
    pad(ctx, u.x, u.y, u.r, 'rgba(255,211,107,A)', t, active);
    shadow(ctx, u.x, u.y - 2, 18, 6);
    ctx.fillStyle = '#4c3a5e'; roundRect(ctx, u.x - 8, u.y - 40, 16, 40, 4); ctx.fill();
    ctx.fillStyle = '#2a1c36'; roundRect(ctx, u.x - 20, u.y - 64, 40, 28, 6); ctx.fill();
    ctx.fillStyle = '#ffd36b';
    for (let i = 0; i < 2; i++) {
      const yy = u.y - 46 - i * 7 - (Math.sin(t * 4) * 1.5);
      poly(ctx, [[u.x - 8, yy + 4], [u.x, yy - 2], [u.x + 8, yy + 4], [u.x + 8, yy + 7], [u.x, yy + 1], [u.x - 8, yy + 7]]); ctx.fill();
    }
    label(ctx, 'UPGRADES', u.x, u.y + u.r * 0.55 + 16, 14, '#ffd36b');
  }

  // Stock waiting at a producer, stacked in a little pyramid.
  function pile(ctx, res, n, x, y) {
    // Widen the base so any count fits; the old fixed width of 4 looped forever above 10 items.
    let w = 4;
    while (w * (w + 1) / 2 < n) w++;
    const ox = x - (w - 4) * 7.5;
    let i = 0;
    for (let row = 0; row < w && i < n; row++) for (let c = 0; c < w - row && i < n; c++, i++) item(ctx, res, ox + c * 15 + row * 7.5, y - row * 11, 1.1);
  }

  const BUILDINGS = {
    gate(ctx, p, t) {
      const x = p.x, y = p.y, R = p.res == null ? { color: SF.World.planet.theme.accent } : SF.World.res(p.res);
      shadow(ctx, x, y + 4, 30, 10);
      ctx.fillStyle = '#4c3a5e'; poly(ctx, [[x - 18, y], [x - 6, y - 90], [x + 6, y - 90], [x + 18, y]]); ctx.fill();
      ctx.fillStyle = '#6a5680'; poly(ctx, [[x, y], [x - 2, y - 90], [x + 6, y - 90], [x + 18, y]]); ctx.fill();
      ctx.fillStyle = '#3a2a4a'; roundRect(ctx, x - 26, y - 6, 52, 10, 4); ctx.fill();
      ctx.fillStyle = rgba(R.color, 0.8); for (const dy of [-30, -55, -78]) ctx.fillRect(x - 3, y + dy, 6, 3);
      const b = Math.sin(t * 3) * 3;
      glow(ctx, x, y - 102 + b, 50, rgba(R.color, 0.9), 0.6);
      ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(x, y - 102 + b, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x - 3, y - 105 + b, 3, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(R.color, 0.8); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y - 102 + b, 18, 6, t * 0.8, 0, TAU); ctx.stroke();
      label(ctx, p.name, x, y + 22, 12, 'rgba(255,244,232,0.8)', 600);
    },
    drones(ctx, p, t, active, st) {
      const x = p.x, y = p.y, acc = SF.World.planet.theme.accent;
      pad(ctx, x, y + 40, 54, rgba(acc, 'A'), t, active);
      shadow(ctx, x, y + 6, 66, 20);
      ctx.fillStyle = '#c9c2da'; ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y, 62, 46, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a1c36'; ctx.beginPath(); ctx.ellipse(x, y, 30, 28, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba(acc, 0.5 + Math.sin(t * 4) * 0.3);
      for (let i = 0; i < 3; i++) ctx.fillRect(x - 24 + i * 20, y - 6, 8, 3);
      ctx.strokeStyle = 'rgba(58,42,74,0.35)'; ctx.lineWidth = 2;
      for (const k of [0.6, 0.85]) { ctx.beginPath(); ctx.ellipse(x, y, 62 * k, 46 * k, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
      // rotating radar dish on top
      ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 20, y - 40); ctx.lineTo(x + 24, y - 58); ctx.stroke();
      const w = Math.cos(t * 1.5) * 12;
      ctx.fillStyle = '#ece8f6'; ctx.beginPath(); ctx.ellipse(x + 24, y - 62, Math.abs(w) + 2, 8, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = Math.sin(t * 5) > 0 ? acc : '#3a2a4a'; ctx.beginPath(); ctx.arc(x - 30, y - 30, 3, 0, TAU); ctx.fill();
      label(ctx, p.name.toUpperCase(), x, y + 82, 14, acc);
    },
    producer(ctx, p, t, active, st) {
      const x = p.x, y = p.y, h = p.helper, acc = SF.World.planet.theme.accent;
      pad(ctx, x, y + 40, 54, rgba(acc, 'A'), t, active);
      shadow(ctx, x, y + 6, 64, 20);
      if (h.style === 'sawmill') {
        ctx.fillStyle = '#8a5a34'; ctx.strokeStyle = '#3d220f'; ctx.lineWidth = 3;
        roundRect(ctx, x - 52, y - 50, 74, 52, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#a8703f'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 50, y - 46 + i * 12, 70, 5);
        ctx.fillStyle = '#5a3a22'; poly(ctx, [[x - 58, y - 48], [x - 15, y - 76], [x + 28, y - 48]]); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd27a'; roundRect(ctx, x - 24, y - 40, 16, 12, 2); ctx.fill(); ctx.strokeStyle = '#3d220f'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 16, y - 40); ctx.lineTo(x - 16, y - 28); ctx.stroke();
        // chimney with a puff of smoke
        ctx.fillStyle = '#4a3a30'; ctx.fillRect(x - 46, y - 74, 9, 18);
        for (let i = 0; i < 2; i++) { const k = (t * 0.5 + i / 2) % 1; ctx.globalAlpha = (1 - k) * 0.5; ctx.fillStyle = '#e8e0d8'; ctx.beginPath(); ctx.arc(x - 42 + k * 10, y - 78 - k * 30, 4 + k * 6, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
        // sawdust spray
        for (let i = 0; i < 4; i++) { const k = (t * 2 + i / 4) % 1; ctx.fillStyle = `rgba(230,190,130,${1 - k})`; ctx.fillRect(x + 34 + k * 22, y - 22 + k * 18 - Math.sin(k * 3) * 8, 2, 2); }
        // spinning blade
        ctx.save(); ctx.translate(x + 34, y - 26); ctx.rotate(t * 8);
        ctx.fillStyle = '#d7dbe2'; ctx.beginPath();
        for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? 14 : 18; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#3a3f48'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#3a3f48'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (h.style === 'mine') {
        ctx.fillStyle = '#5a5258'; ctx.strokeStyle = '#26222a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(x - 10, y - 4, 58, 52, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#17131a'; ctx.beginPath(); ctx.ellipse(x - 10, y - 2, 22, 30, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x - 34, y); ctx.lineTo(x - 34, y - 30); ctx.lineTo(x + 14, y - 30); ctx.lineTo(x + 14, y); ctx.stroke();
        const cx = x - 10 + Math.sin(t * 1.5) * 20;
        ctx.fillStyle = '#6b7280'; roundRect(ctx, cx - 10, y - 12, 20, 11, 2); ctx.fill();
        ctx.fillStyle = '#26222a'; ctx.beginPath(); ctx.arc(cx - 6, y, 3, 0, TAU); ctx.arc(cx + 6, y, 3, 0, TAU); ctx.fill();
        glow(ctx, x - 10, y - 20, 30, 'rgba(255,200,120,0.8)', 0.35 + Math.sin(t * 7) * 0.1);
        ctx.strokeStyle = '#8a8f99'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 40, y + 2); ctx.lineTo(x + 30, y + 2); ctx.moveTo(x - 40, y + 6); ctx.lineTo(x + 30, y + 6); ctx.stroke();
        for (const lx of [-38, 18]) {
          ctx.strokeStyle = '#26222a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + lx, y - 30); ctx.lineTo(x + lx, y - 24); ctx.stroke();
          const fl = 0.7 + Math.sin(t * 11 + lx) * 0.2;
          ctx.fillStyle = `rgba(255,200,100,${fl})`; roundRect(ctx, x + lx - 3, y - 24, 6, 8, 2); ctx.fill();
          glow(ctx, x + lx, y - 20, 18, 'rgba(255,200,100,0.9)', fl * 0.5);
        }
        // ore heap
        ctx.fillStyle = '#4b4a4f'; ctx.beginPath(); ctx.ellipse(x + 40, y - 2, 16, 8, 0, Math.PI, TAU); ctx.fill();
      } else {
        // excavator: drilling rig
        ctx.strokeStyle = '#5e3a18'; ctx.lineWidth = 5;
        poly(ctx, [[x - 30, y], [x - 6, y - 96], [x + 18, y]]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 22, y - 32); ctx.lineTo(x + 10, y - 32); ctx.moveTo(x - 15, y - 62); ctx.lineTo(x + 3, y - 62); ctx.stroke();
        const dz = Math.abs(Math.sin(t * 3)) * 14;
        ctx.fillStyle = '#ffcf6a'; roundRect(ctx, x - 13, y - 90 + dz, 14, 30, 3); ctx.fill();
        ctx.fillStyle = '#9aa3ad'; poly(ctx, [[x - 11, y - 60 + dz], [x - 6, y - 40 + dz], [x - 1, y - 60 + dz]]); ctx.fill();
        ctx.fillStyle = '#c88a4a'; roundRect(ctx, x + 14, y - 28, 34, 26, 4); ctx.fill();
        ctx.fillStyle = '#3a2414'; ctx.fillRect(x + 20, y - 22, 10, 8);
        ctx.fillStyle = '#ffd36b'; ctx.fillRect(x + 34, y - 22, 10, 6);
        ctx.strokeStyle = '#5e3a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, y - 96); ctx.lineTo(x + 30, y - 28); ctx.stroke();
        for (let i = 0; i < 3; i++) { const k = (t * 1.2 + i / 3) % 1; ctx.globalAlpha = (1 - k) * 0.6; ctx.fillStyle = '#e8c8a0'; ctx.beginPath(); ctx.arc(x - 6 + (i - 1) * k * 30, y - 4 - k * 14, 3 + k * 7, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      pile(ctx, here(h.res), st.pile, x - 52, y + 30);
      const cap = h.pile + 4 * st.lvl;
      label(ctx, `${p.name.toUpperCase()}  ${st.pile}/${cap}`, x, y + 84, 13, acc);
    },
    refinery(ctx, p, t) {
      const x = p.x, y = p.y;
      shadow(ctx, x, y + 6, 70, 22);
      ctx.fillStyle = '#5e4a72'; ctx.fillRect(x + 18, y - 104, 18, 80);
      ctx.fillStyle = '#ff8f5a'; ctx.fillRect(x + 18, y - 104, 18, 6);
      ctx.fillStyle = '#cfc8de'; ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 3;
      roundRect(ctx, x - 56, y - 56, 84, 58, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#b3abc6'; roundRect(ctx, x - 56, y - 64, 84, 14, 6); ctx.fill(); ctx.stroke();
      const fl = 0.6 + Math.sin(t * 9) * 0.15 + Math.sin(t * 23) * 0.1;
      ctx.fillStyle = `rgba(255,171,74,${fl})`; roundRect(ctx, x - 44, y - 40, 22, 24, 4); ctx.fill();
      ctx.fillStyle = `rgba(111,245,232,${fl})`; roundRect(ctx, x - 14, y - 40, 22, 24, 4); ctx.fill();
      // tank with a level gauge and a pipe into the hall
      ctx.fillStyle = '#9a90b0'; ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 2.5;
      roundRect(ctx, x + 36, y - 52, 26, 52, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a1c36'; ctx.fillRect(x + 45, y - 44, 8, 34);
      const lv = 0.5 + Math.sin(t * 0.7) * 0.3; ctx.fillStyle = '#ffab4a'; ctx.fillRect(x + 46, y - 11 - 32 * lv, 6, 32 * lv);
      ctx.strokeStyle = '#6a5680'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 28, y - 30); ctx.lineTo(x + 36, y - 30); ctx.stroke();
      for (let i = 0; i < 3; i++) { const k = (t * 0.9 + i / 3) % 1; ctx.fillStyle = `rgba(255,171,74,${1 - k})`; ctx.beginPath(); ctx.arc(x - 33 + Math.sin(k * 7) * 3, y - 18 - k * 20, 2, 0, TAU); ctx.fill(); }
      label(ctx, 'REFINERY  +50%', x - 10, y + 22, 13, '#ffab4a');
    },
    launch(ctx, p, t, active, st, lift) {
      const x = p.x, y = p.y;
      pad(ctx, x, y + 40, 54, 'rgba(255,211,107,A)', t, active);
      ctx.fillStyle = '#4c3a5e'; ctx.beginPath(); ctx.ellipse(x, y, 52, 18, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#6a5680'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x - 44, y + 4); ctx.lineTo(x - 44, y - 140); ctx.moveTo(x - 44, y - 100); ctx.lineTo(x - 18, y - 100); ctx.moveTo(x - 44, y - 50); ctx.lineTo(x - 18, y - 50); ctx.stroke();
      ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x - 49, y - i * 24); ctx.lineTo(x - 39, y - i * 24 - 12); ctx.stroke(); }
      ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ff6b6b' : '#7a2a3a'; ctx.beginPath(); ctx.arc(x - 44, y - 144, 4, 0, TAU); ctx.fill();
      rocket(ctx, x, y - lift, t, lift > 0);
      if (!lift) label(ctx, SF.atHome() ? 'ROCKET' : 'LAUNCH PAD', x, y + 82, 14, '#ffd36b');
    },
    factory(ctx, p, t) {
      const x = p.x, y = p.y;
      shadow(ctx, x, y + 6, 76, 22);
      ctx.fillStyle = '#9aa3ad'; ctx.strokeStyle = '#2a2f38'; ctx.lineWidth = 3;
      // saw-tooth roof hall
      ctx.beginPath(); ctx.moveTo(x - 66, y); ctx.lineTo(x - 66, y - 50);
      for (let i = 0; i < 4; i++) { ctx.lineTo(x - 66 + i * 33 + 22, y - 76); ctx.lineTo(x - 66 + i * 33 + 33, y - 50); }
      ctx.lineTo(x + 66, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6ff5e8';
      for (let i = 0; i < 4; i++) ctx.fillRect(x - 60 + i * 33, y - 44, 18, 8);
      // a belt rolling out of the door
      ctx.fillStyle = '#6b7280'; ctx.fillRect(x + 40, y - 96, 14, 46); ctx.fillStyle = '#ff8f5a'; ctx.fillRect(x + 40, y - 96, 14, 5);
      for (let i = 0; i < 2; i++) { const k = (t * 0.45 + i / 2) % 1; ctx.globalAlpha = (1 - k) * 0.55; ctx.fillStyle = '#dfe5ee'; ctx.beginPath(); ctx.arc(x + 47 + k * 14, y - 102 - k * 34, 5 + k * 8, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(x - 44, y - 20); ctx.rotate(t * 1.5);
      ctx.fillStyle = '#ffd36b'; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? 9 : 12; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a3f48'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#3a3f48'; ctx.fillRect(x - 20, y - 28, 40, 28);
      beltRun(ctx, { x: x - 20, y: y + 4 }, { x: x + 70, y: y + 4 }, t, 0);
      label(ctx, 'BELT FACTORY', x, y + 28, 13, '#dfe5ee');
    },
    // A proper little home: two stacked modules, a greenhouse dome, solar wings, a water tank and lit windows.
    habitat(ctx, p, t, active) {
      const x = p.x, y = p.y, ink = '#3a2a4a';
      pad(ctx, x, y + 40, 54, 'rgba(255,210,122,A)', t, active);
      shadow(ctx, x, y + 6, 92, 24);
      ctx.strokeStyle = ink; ctx.lineWidth = 3;
      // foundation deck
      ctx.fillStyle = '#7d7290'; roundRect(ctx, x - 86, y - 12, 172, 16, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9a90b0'; ctx.fillRect(x - 82, y - 10, 164, 4);
      // solar wing on a mast, left
      ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 78, y - 12); ctx.lineTo(x - 78, y - 70); ctx.stroke();
      ctx.save(); ctx.translate(x - 78, y - 74); ctx.rotate(-0.18 + Math.sin(t * 0.4) * 0.05);
      ctx.fillStyle = '#1f3c78'; roundRect(ctx, -24, -10, 48, 20, 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(150,200,255,0.55)'; ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 9, -9); ctx.lineTo(i * 9, 9); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-23, 0); ctx.lineTo(23, 0); ctx.stroke();
      ctx.restore();
      // lower module: a wide capsule with portholes
      ctx.strokeStyle = ink; ctx.lineWidth = 3;
      const g = ctx.createLinearGradient(0, y - 64, 0, y - 12); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d9d4e8');
      ctx.fillStyle = g; roundRect(ctx, x - 64, y - 64, 112, 54, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffab4a'; ctx.fillRect(x - 60, y - 34, 104, 5);
      const lit = SF.state.crew.length;
      [-40, -14, 12].forEach((dx, i) => {
        ctx.fillStyle = '#2a1c36'; ctx.beginPath(); ctx.arc(x + dx, y - 48, 8, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = i < lit ? `rgba(255,210,122,${0.75 + Math.sin(t * 2 + i) * 0.15})` : 'rgba(111,245,232,0.35)';
        ctx.beginPath(); ctx.arc(x + dx, y - 48, 5.5, 0, TAU); ctx.fill();
      });
      // airlock door with a light
      ctx.fillStyle = '#4c3a5e'; roundRect(ctx, x + 22, y - 40, 20, 30, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6ff5e8'; ctx.fillRect(x + 30, y - 32, 4, 10);
      ctx.fillStyle = Math.sin(t * 3) > 0 ? '#9be36a' : '#4f7a3a'; ctx.beginPath(); ctx.arc(x + 32, y - 45, 3, 0, TAU); ctx.fill();
      // upper module, offset, with a round window and a railing
      ctx.fillStyle = '#f2f0f8'; roundRect(ctx, x - 50, y - 102, 70, 40, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a1c36'; ctx.beginPath(); ctx.arc(x - 15, y - 82, 11, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = lit > 3 ? 'rgba(255,210,122,0.85)' : 'rgba(111,245,232,0.4)'; ctx.beginPath(); ctx.arc(x - 15, y - 82, 7.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x - 18, y - 85, 2.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#9a90b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 50, y - 106); ctx.lineTo(x + 20, y - 106); ctx.stroke();
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 46 + i * 16, y - 106); ctx.lineTo(x - 46 + i * 16, y - 100); ctx.stroke(); }
      // antenna with blinking tip
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 8, y - 102); ctx.lineTo(x + 14, y - 130); ctx.stroke();
      ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ff6b6b' : '#ffd36b'; ctx.beginPath(); ctx.arc(x + 14, y - 132, 3.5, 0, TAU); ctx.fill();
      // greenhouse dome on the right with sunfruit plants
      ctx.strokeStyle = ink; ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(111,245,232,0.28)'; ctx.beginPath(); ctx.ellipse(x + 66, y - 12, 26, 34, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#24835a'; for (const [dx, h] of [[-12, 14], [0, 20], [12, 12]]) { ctx.beginPath(); ctx.ellipse(x + 66 + dx, y - 14 - h / 2, 6, h / 2, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffb340'; for (const [dx, dy] of [[-10, -22], [2, -30], [12, -20]]) { ctx.beginPath(); ctx.arc(x + 66 + dx, y + dy, 2.5, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + 66, y - 12, 18, 26, 0, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
      ctx.strokeStyle = 'rgba(58,42,74,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 66, y - 46); ctx.lineTo(x + 66, y - 12); ctx.stroke();
      // water tank
      ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
      ctx.fillStyle = '#8fd3ff'; roundRect(ctx, x - 98, y - 40, 18, 30, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - 95, y - 36, 3, 20);
      glow(ctx, x - 14, y - 48, 70, 'rgba(255,210,122,0.9)', lit ? 0.18 + Math.sin(t * 2) * 0.04 : 0.06);
      label(ctx, 'HABITAT', x, y + 22, 13, '#fff4e8');
      label(ctx, `${C.crew.perHabitat} beds · hire crew here`, x, y + 37, 10, 'rgba(255,244,232,0.8)', 600);
    },
    // Research lab: a white block with a big glass observatory dome and a rotating telescope.
    lab(ctx, p, t, active) {
      const x = p.x, y = p.y, ink = '#2a3a4a';
      pad(ctx, x, y + 40, 54, 'rgba(111,245,232,A)', t, active);
      shadow(ctx, x, y + 6, 92, 24);
      ctx.strokeStyle = ink; ctx.lineWidth = 3;
      ctx.fillStyle = '#e8eef4'; roundRect(ctx, x - 80, y - 60, 160, 62, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9d4e0'; ctx.fillRect(x - 78, y - 58, 156, 10);
      ctx.fillStyle = '#6ff5e8'; ctx.fillRect(x - 78, y - 22, 156, 4);
      // windows with screens
      for (let i = 0; i < 4; i++) {
        const wx = x - 70 + i * 38;
        if (i === 2) continue;
        ctx.fillStyle = '#1c2a3a'; roundRect(ctx, wx, y - 44, 26, 18, 3); ctx.fill();
        ctx.strokeStyle = SF.RESEARCH[i % 3].color; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let k = 0; k < 6; k++) ctx.lineTo(wx + 3 + k * 4, y - 35 + Math.sin(t * 3 + k + i) * 5);
        ctx.stroke();
      }
      ctx.strokeStyle = ink; ctx.lineWidth = 3;
      ctx.fillStyle = '#4c5a6e'; roundRect(ctx, x + 6, y - 40, 24, 40, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6ff5e8'; ctx.fillRect(x + 10, y - 36, 16, 3);
      // observatory dome
      ctx.fillStyle = '#c9d4e0'; ctx.beginPath(); ctx.ellipse(x - 30, y - 60, 40, 44, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
      const open = (Math.sin(t * 0.5) + 1) / 2;
      ctx.fillStyle = '#1c2a3a'; ctx.beginPath(); ctx.moveTo(x - 36, y - 60); ctx.lineTo(x - 36, y - 102); ctx.lineTo(x - 24, y - 102); ctx.lineTo(x - 24, y - 60); ctx.fill();
      ctx.save(); ctx.translate(x - 30, y - 74); ctx.rotate(-0.9 + open * 0.5);
      ctx.fillStyle = '#ffd36b'; roundRect(ctx, -4, -40, 8, 40, 3); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x - 30, y - 60, 32, 36, 0, Math.PI * 1.1, Math.PI * 1.35); ctx.stroke();
      // antenna mast with a spinning ring
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 56, y - 60); ctx.lineTo(x + 56, y - 118); ctx.stroke();
      ctx.strokeStyle = '#6ff5e8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x + 56, y - 108, 14, 5, t * 1.4, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#6ff5e8'; ctx.beginPath(); ctx.arc(x + 56, y - 122, 4, 0, TAU); ctx.fill();
      glow(ctx, x + 56, y - 122, 26, 'rgba(111,245,232,0.9)', 0.4 + Math.sin(t * 3) * 0.15);
      label(ctx, 'RESEARCH LAB', x, y + 22, 13, '#6ff5e8');
    },
    // Canteen: a diner with a striped awning, a chimney, crates of sunfruit and a water tank.
    canteen(ctx, p, t, active) {
      const x = p.x, y = p.y, ink = '#3a2a2a', k = SF.state.kitchen;
      pad(ctx, x, y + 40, 54, 'rgba(155,227,106,A)', t, active);
      shadow(ctx, x, y + 6, 92, 24);
      ctx.strokeStyle = ink; ctx.lineWidth = 3;
      // chimney with steam
      ctx.fillStyle = '#7a5a4a'; ctx.fillRect(x + 34, y - 104, 16, 40); ctx.strokeRect(x + 34, y - 104, 16, 40);
      for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3) % 1; ctx.globalAlpha = (1 - q) * 0.5; ctx.fillStyle = '#fff4e8'; ctx.beginPath(); ctx.arc(x + 42 + Math.sin(q * 6 + i) * 4, y - 110 - q * 40, 5 + q * 8, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      // building
      ctx.fillStyle = '#fff1d6'; roundRect(ctx, x - 76, y - 70, 152, 72, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(x - 84, y - 66); ctx.lineTo(x, y - 96); ctx.lineTo(x + 84, y - 66); ctx.closePath(); ctx.fill(); ctx.stroke();
      // striped awning
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? '#fff4e8' : '#62d08a';
        ctx.beginPath(); ctx.moveTo(x - 72 + i * 18, y - 46); ctx.lineTo(x - 54 + i * 18, y - 46); ctx.lineTo(x - 54 + i * 18, y - 36); ctx.quadraticCurveTo(x - 63 + i * 18, y - 30, x - 72 + i * 18, y - 36); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(x - 72, y - 46, 144, 10);
      // serving window and door
      ctx.fillStyle = '#2a1c1c'; roundRect(ctx, x - 62, y - 30, 56, 22, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,210,122,0.85)'; ctx.fillRect(x - 58, y - 27, 48, 16);
      ctx.fillStyle = '#ffb340'; for (let i = 0; i < Math.min(5, Math.ceil(k.meal / 12)); i++) { ctx.beginPath(); ctx.arc(x - 52 + i * 9, y - 14, 3.5, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#7a5a4a'; roundRect(ctx, x + 10, y - 30, 22, 30, 4); ctx.fill(); ctx.stroke();
      // sign
      ctx.fillStyle = '#62d08a'; roundRect(ctx, x - 30, y - 66, 60, 16, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff4e8'; ctx.font = `700 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('CANTEEN', x, y - 58);
      // water tank and crates
      ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
      ctx.fillStyle = '#7fd8ff'; roundRect(ctx, x + 50, y - 44, 22, 42, 7); ctx.fill(); ctx.stroke();
      const lvl = Math.min(1, k.drink / C.food.cap);
      ctx.fillStyle = '#2a7fb8'; ctx.fillRect(x + 54, y - 6 - 32 * lvl, 14, 32 * lvl);
      for (const [cx, cy] of [[-92, 0], [-84, -14]]) { ctx.fillStyle = '#a8703f'; ctx.fillRect(x + cx, y + cy - 12, 18, 12); ctx.strokeRect(x + cx, y + cy - 12, 18, 12); ctx.fillStyle = '#ffb340'; ctx.beginPath(); ctx.arc(x + cx + 6, y + cy - 13, 3, 0, TAU); ctx.arc(x + cx + 12, y + cy - 13, 3, 0, TAU); ctx.fill(); }
      label(ctx, 'CANTEEN', x, y + 22, 13, '#9be36a');
      label(ctx, `${k.meal} meals · ${k.drink} drinks`, x, y + 37, 10, 'rgba(255,244,232,0.85)', 600);
    },
  };

  // A conveyor belt with moving slats.
  // ---------- conveyor belts ----------
  // A belt runs from the producer's outlet along straight runs and corner drums into a side port of the warehouse.
  const BELT_W = 18, BELT_SPEED = 70;
  function beltRoute(p) {
    const s = p.x > 0 ? 1 : -1, Y = C.depot.y - 12, o = { x: p.x, y: p.y + 40 }, pts = [o];
    if (Math.abs(o.x) < 170) { pts.push({ x: s * 170, y: o.y }); pts.push({ x: s * 170, y: Y }); }
    else pts.push({ x: o.x, y: Y });
    pts.push({ x: s * 92, y: Y });
    return pts;
  }
  const routeLen = pts => pts.reduce((a, q, i) => (i ? a + Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y) : 0), 0);
  // Point at distance d along a route.
  function along(pts, d) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.y - a.y);
      if (d <= l || i === pts.length - 1) { const k = l ? Math.min(1, d / l) : 0; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
      d -= l;
    }
    return pts[pts.length - 1];
  }

  function beltRun(ctx, a, b, t, cum) {
    const w = BELT_W, h = Math.abs(b.y - a.y) < 1, l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l < 1) return;
    const dir = h ? Math.sign(b.x - a.x) : Math.sign(b.y - a.y);
    const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
    if (h) {
      // shadow, legs, front face of the frame
      ctx.fillStyle = 'rgba(28,10,38,0.28)'; ctx.fillRect(x0, a.y + w / 2 + 6, l, 6);
      ctx.fillStyle = '#3a3f4a';
      for (let x = x0 + 10; x < x0 + l - 4; x += 38) { ctx.fillRect(x - 2, a.y + w / 2, 4, 11); ctx.fillRect(x - 4, a.y + w / 2 + 9, 8, 3); }
      ctx.fillStyle = '#596170'; ctx.fillRect(x0, a.y + w / 2, l, 5);
      ctx.fillStyle = '#2a2f38'; ctx.fillRect(x0, a.y + w / 2 + 5, l, 1.5);
      // rubber belt with moving cleats
      ctx.fillStyle = '#2b2d33'; ctx.fillRect(x0, a.y - w / 2, l, w);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x0, a.y - w / 2 + 2, l, w / 2 - 2);
      ctx.strokeStyle = '#4a4e58'; ctx.lineWidth = 2.5;
      const off = (((t * BELT_SPEED - cum) % 12) + 12) % 12;
      for (let d = off; d < l; d += 12) { const x = dir > 0 ? a.x + d : a.x - d; ctx.beginPath(); ctx.moveTo(x, a.y - w / 2 + 2); ctx.lineTo(x - dir * 3, a.y); ctx.lineTo(x, a.y + w / 2 - 2); ctx.stroke(); }
      // side rails with bolts
      ctx.fillStyle = '#9aa3ad'; ctx.fillRect(x0, a.y - w / 2 - 3, l, 3);
      ctx.fillStyle = '#c9ced8'; ctx.fillRect(x0, a.y + w / 2 - 1, l, 3);
      ctx.fillStyle = '#6b7280'; for (let x = x0 + 6; x < x0 + l; x += 19) { ctx.fillRect(x, a.y - w / 2 - 2.5, 2, 2); ctx.fillRect(x, a.y + w / 2 - 0.5, 2, 2); }
    } else {
      ctx.fillStyle = 'rgba(28,10,38,0.28)'; ctx.fillRect(a.x + w / 2 + 3, y0 + 6, 6, l);
      ctx.fillStyle = '#3a3f4a';
      for (let y = y0 + 14; y < y0 + l - 6; y += 38) for (const sx of [-1, 1]) { ctx.fillRect(a.x + sx * (w / 2 + 3) - 2, y, 4, 9); }
      ctx.fillStyle = '#2b2d33'; ctx.fillRect(a.x - w / 2, y0, w, l);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(a.x - w / 2 + 2, y0, w / 2 - 2, l);
      ctx.strokeStyle = '#4a4e58'; ctx.lineWidth = 2.5;
      const off = (((t * BELT_SPEED - cum) % 12) + 12) % 12;
      for (let d = off; d < l; d += 12) { const y = dir > 0 ? a.y + d : a.y - d; ctx.beginPath(); ctx.moveTo(a.x - w / 2 + 2, y); ctx.lineTo(a.x, y - dir * 3); ctx.lineTo(a.x + w / 2 - 2, y); ctx.stroke(); }
      ctx.fillStyle = '#9aa3ad'; ctx.fillRect(a.x - w / 2 - 3, y0, 3, l);
      ctx.fillStyle = '#c9ced8'; ctx.fillRect(a.x + w / 2, y0, 3, l);
      ctx.fillStyle = '#6b7280'; for (let y = y0 + 6; y < y0 + l; y += 19) { ctx.fillRect(a.x - w / 2 - 2.5, y, 2, 2); ctx.fillRect(a.x + w / 2 + 0.5, y, 2, 2); }
    }
  }

  // Corner drum where a belt turns.
  function beltDrum(ctx, q, t) {
    const r = BELT_W / 2 + 4;
    ctx.fillStyle = 'rgba(28,10,38,0.28)'; ctx.beginPath(); ctx.ellipse(q.x + 3, q.y + 8, r, r * 0.7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#596170'; ctx.beginPath(); ctx.arc(q.x, q.y + 3, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a2f38'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2b2d33'; ctx.beginPath(); ctx.arc(q.x, q.y, r - 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const a = t * 3 + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + Math.cos(a) * (r - 5), q.y + Math.sin(a) * (r - 5)); ctx.stroke(); }
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(q.x, q.y, 2.5, 0, TAU); ctx.fill();
  }

  // The hopper at the producer end, where stock drops onto the belt.
  function beltFeeder(ctx, q, t) {
    ctx.fillStyle = 'rgba(28,10,38,0.3)'; ctx.beginPath(); ctx.ellipse(q.x + 2, q.y + 12, 18, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a2f38'; ctx.lineWidth = 2;
    ctx.fillStyle = '#ffab4a'; poly(ctx, [[q.x - 16, q.y - 22], [q.x + 16, q.y - 22], [q.x + 9, q.y - 6], [q.x - 9, q.y - 6]]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#596170'; roundRect(ctx, q.x - 11, q.y - 7, 22, 15, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2f38'; ctx.fillRect(q.x - 16, q.y - 24, 32, 3);
    ctx.fillStyle = Math.sin(t * 5) > 0 ? '#9be36a' : '#4f7a3a'; ctx.beginPath(); ctx.arc(q.x + 7, q.y + 1, 2.5, 0, TAU); ctx.fill();
  }

  // Ground part of every belt: runs, drums and feeder. Drawn before the y-sorted objects.
  function belts(ctx, plots, t) {
    for (const p of plots) {
      const pts = beltRoute(p);
      let cum = 0;
      for (let i = 1; i < pts.length; i++) { beltRun(ctx, pts[i - 1], pts[i], t, cum); cum += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); }
      for (let i = 1; i < pts.length - 1; i++) beltDrum(ctx, pts[i], t);
      beltFeeder(ctx, pts[0], t);
    }
  }

  // ---------- smelter (Halcyon) ----------
  // Dirt track the tractor drives between the ore pickup and the smelter.
  function road(ctx, a, b) {
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(70,45,30,0.28)'; ctx.lineWidth = 78; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(50,30,20,0.25)'; ctx.lineWidth = 5; ctx.setLineDash([14, 8]);
    for (const o of [-26, -4, 4, 26]) { ctx.beginPath(); ctx.moveTo(a.x, a.y + o); ctx.lineTo(b.x, b.y + o); ctx.stroke(); }
    ctx.restore();
  }

  function pickupPad(ctx, q, t, active, ore) {
    pad(ctx, q.x, q.y, q.r, 'rgba(255,171,74,A)', t, active);
    ctx.fillStyle = '#2a2f38'; roundRect(ctx, q.x - 26, q.y - 36, 52, 22, 5); ctx.fill();
    ctx.fillStyle = '#ffab4a'; ctx.font = `700 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ORE OUT', q.x, q.y - 25);
    label(ctx, 'ORE PICKUP', q.x, q.y + 34, 12, '#ffab4a');
    label(ctx, ore ? `${ore} ore in the hall` : 'hall has no ore', q.x, q.y + 49, 10, 'rgba(255,244,232,0.85)', 600);
  }

  function smelter(ctx, m, t, active, q, hot) {
    const x = m.x, y = m.y, fl = 0.75 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.3) * 0.1;
    pad(ctx, x, m.padY, m.r, 'rgba(255,143,90,A)', t, active);
    shadow(ctx, x, y + 6, 120, 26);
    ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 3;
    // stone plinth
    ctx.fillStyle = '#6b6470'; roundRect(ctx, x - 104, y - 16, 208, 20, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#857d8a'; ctx.fillRect(x - 100, y - 14, 200, 5);
    // chimney behind the furnace
    ctx.fillStyle = '#5a3a30'; roundRect(ctx, x + 18, y - 170, 30, 100, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2620'; ctx.fillRect(x + 14, y - 176, 38, 10); ctx.strokeRect(x + 14, y - 176, 38, 10);
    ctx.strokeStyle = 'rgba(42,26,20,0.5)'; ctx.lineWidth = 1.5;
    for (let r = 0; r < 9; r++) { const yy = y - 162 + r * 10; ctx.beginPath(); ctx.moveTo(x + 18, yy); ctx.lineTo(x + 48, yy); ctx.stroke(); }
    // furnace dome of bricks
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - 62, y - 14); ctx.lineTo(x - 62, y - 70); ctx.quadraticCurveTo(x - 60, y - 128, x, y - 130); ctx.quadraticCurveTo(x + 60, y - 128, x + 62, y - 70); ctx.lineTo(x + 62, y - 14); ctx.closePath();
    const g = ctx.createLinearGradient(x - 62, 0, x + 62, 0); g.addColorStop(0, '#a45a3c'); g.addColorStop(0.5, '#c06a44'); g.addColorStop(1, '#7e4430');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 3; ctx.stroke(); ctx.clip();
    ctx.strokeStyle = 'rgba(60,30,20,0.55)'; ctx.lineWidth = 1.5;
    for (let r = 0; r < 12; r++) {
      const yy = y - 18 - r * 10; ctx.beginPath(); ctx.moveTo(x - 64, yy); ctx.lineTo(x + 64, yy); ctx.stroke();
      for (let c = -4; c <= 4; c++) { const xx = x + c * 16 + (r % 2) * 8; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy - 10); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(255,240,220,0.12)'; ctx.fillRect(x - 60, y - 130, 34, 120);
    ctx.restore();
    // iron bands
    ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x - 62, y - 70); ctx.quadraticCurveTo(x, y - 82, x + 62, y - 70); ctx.stroke();
    // glowing mouth
    ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.moveTo(x - 26, y - 14); ctx.lineTo(x - 26, y - 44); ctx.arc(x, y - 44, 26, Math.PI, 0); ctx.lineTo(x + 26, y - 14); ctx.closePath(); ctx.fill();
    const mg = ctx.createRadialGradient(x, y - 26, 2, x, y - 30, 30);
    mg.addColorStop(0, hot ? '#fff1a0' : '#7a3a22'); mg.addColorStop(0.5, hot ? '#ffab4a' : '#4a2216'); mg.addColorStop(1, hot ? '#d0441a' : '#2a1a14');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.moveTo(x - 21, y - 14); ctx.lineTo(x - 21, y - 44); ctx.arc(x, y - 44, 21, Math.PI, 0); ctx.lineTo(x + 21, y - 14); ctx.closePath(); ctx.fill();
    if (hot) {
      for (let i = 0; i < 3; i++) { const fx = x - 10 + i * 10, fh = 14 + Math.sin(t * 9 + i * 2) * 5; ctx.fillStyle = i === 1 ? '#fff1a0' : '#ffd36b'; ctx.beginPath(); ctx.moveTo(fx - 6, y - 16); ctx.quadraticCurveTo(fx, y - 16 - fh * 1.6, fx + 6, y - 16); ctx.fill(); }
      glow(ctx, x, y - 30, 90, 'rgba(255,150,60,0.9)', 0.45 * fl);
    }
    // ore hopper on the right, where the tractor stops, filled with what is waiting
    ctx.strokeStyle = '#2a2f38'; ctx.lineWidth = 2.5;
    ctx.fillStyle = '#596170'; ctx.fillRect(x + 78, y - 56, 18, 40); ctx.strokeRect(x + 78, y - 56, 18, 40);
    ctx.fillStyle = '#9aa3ad'; poly(ctx, [[x + 62, y - 92], [x + 112, y - 92], [x + 102, y - 56], [x + 72, y - 56]]); ctx.fill(); ctx.stroke();
    const ores = [12, 22].flatMap(c => Array(Math.min(6, q[c] || 0)).fill(c));
    ores.forEach((c, i) => item(ctx, c, x + 71 + (i % 4) * 11, y - 94 - Math.floor(i / 4) * 7, 0.75));
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(x + 62, y - 94, 50, 3);
    // casting tray with ingots on the left
    ctx.fillStyle = '#3a3f4a'; roundRect(ctx, x - 102, y - 34, 40, 22, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hot ? `rgba(255,${150 + Math.sin(t * 6) * 40 | 0},60,0.95)` : '#596170'; ctx.fillRect(x - 98, y - 30, 32, 6);
    const out = SF.state.smelt.out || {}, bars = [112, 122].flatMap(c => Array(Math.min(8, out[c] || 0)).fill(c));
    bars.forEach((c, i) => item(ctx, c, x - 94 + (i % 4) * 9, y - 18 - Math.floor(i / 4) * 6, 0.8));
    const nOut = SF.Smelter.ready();
    if (nOut) label(ctx, `${nOut} ingot${nOut > 1 ? 's' : ''} ready`, x - 82, y - 52, 11, '#ffd36b', 700);
    const n = (q[12] || 0) + (q[22] || 0);
    label(ctx, 'SMELTER', x, y + 52, 15, '#ff8f5a');
    label(ctx, n ? `${q[12] || 0} iron · ${q[22] || 0} copper ore in the furnace` : 'Bring iron or copper ore', x, y + 69, 11, 'rgba(255,244,232,0.85)', 600);
  }

  // The hired driver's tractor with an ore trailer.
  function tractor(ctx, tr, t) {
    const f = tr.face, bump = Math.abs(Math.sin(tr.walk * 0.8)) * 1.2, x = tr.x, y = tr.y;
    shadow(ctx, x - f * 18, y + 2, 52, 9);
    ctx.save(); ctx.translate(x, y - bump); ctx.scale(f, 1);
    ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 2.5;
    // trailer
    ctx.fillStyle = '#3a3f4a'; ctx.fillRect(-46, -12, 14, 3);
    ctx.fillStyle = '#9aa3ad'; poly(ctx, [[-82, -30], [-40, -30], [-44, -10], [-78, -10]]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#596170'; ctx.fillRect(-80, -22, 38, 3);
    wheel(ctx, -61, -6, 8, tr.walk);
    ctx.restore();
    tr.cargo.slice(0, 10).forEach((c, i) => item(ctx, c, x + f * (-74 + (i % 5) * 8), y - bump - 34 - Math.floor(i / 5) * 6, 0.8));
    ctx.save(); ctx.translate(x, y - bump); ctx.scale(f, 1);
    ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 2.5;
    // body, hood and exhaust
    ctx.fillStyle = tr.hauler ? '#62a8ff' : '#ff8f5a'; roundRect(ctx, -30, -30, 52, 18, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tr.hauler ? '#8fd3ff' : '#ffab4a'; roundRect(ctx, 0, -38, 24, 12, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2f38'; for (let i = 0; i < 3; i++) ctx.fillRect(6 + i * 6, -34, 3, 6);
    ctx.fillStyle = '#3a3f4a'; ctx.fillRect(4, -52, 4, 15);
    // cab with the driver
    ctx.fillStyle = '#ffd36b'; roundRect(ctx, -30, -62, 28, 34, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9af5ff'; roundRect(ctx, -26, -58, 20, 14, 3); ctx.fill();
    ctx.fillStyle = '#f7f6fc'; ctx.beginPath(); ctx.arc(-15, -50, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb35a'; ctx.beginPath(); ctx.ellipse(-13, -50, 4, 3.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff8f5a'; ctx.fillRect(-32, -64, 32, 4);
    // wheels: big rear, small front
    wheel(ctx, -18, -10, 14, tr.walk);
    wheel(ctx, 14, -6, 8, tr.walk * 1.7);
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(23, -26, 2.5, 0, TAU); ctx.fill();
    ctx.restore();
    if (tr.wait) label(ctx, tr.wait, x, y - 82, 11, '#ffab4a', 600);
  }

  // Canteen delivery car: a little green van with a food crate on the back.
  function foodCar(ctx, car, t) {
    const f = car.face, x = car.x, y = car.y, bump = Math.abs(Math.sin(car.walk)) * 1;
    shadow(ctx, x, y + 2, 40, 8);
    ctx.save(); ctx.translate(x, y - bump); ctx.scale(f, 1);
    ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 2.5;
    ctx.fillStyle = '#62d08a'; roundRect(ctx, -34, -34, 52, 26, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9be36a'; roundRect(ctx, 14, -28, 22, 20, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9af5ff'; roundRect(ctx, 20, -25, 12, 9, 2); ctx.fill();
    ctx.fillStyle = '#f7f6fc'; ctx.beginPath(); ctx.arc(26, -20, 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff4e8'; ctx.fillRect(-30, -26, 40, 7);
    ctx.fillStyle = '#ffb340'; ctx.beginPath(); ctx.arc(-22, -22.5, 2.5, 0, TAU); ctx.arc(-14, -22.5, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7fd8ff'; ctx.beginPath(); ctx.arc(-4, -22.5, 2.5, 0, TAU); ctx.arc(4, -22.5, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(35, -14, 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff8f5a' : '#ffd36b'; ctx.fillRect(-6, -38, 10, 4);
    wheel(ctx, -20, -6, 7, car.walk); wheel(ctx, 20, -6, 7, car.walk);
    ctx.restore();
  }

  function wheel(ctx, x, y, r, a) {
    ctx.fillStyle = '#2a2f38'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#596170'; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1a1c22'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const b = a + i * TAU / 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(b) * r * 0.6, y + Math.sin(b) * r * 0.6); ctx.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r); ctx.stroke(); }
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, TAU); ctx.fill();
  }

  // ---------- shipping: warehouse, cargo rocket, hall ----------
  // Replaces the lander on other planets once Halcyon is reached.
  function warehouse(ctx, t, glowK, stock) {
    const d = C.depot, x = d.x, y = d.y;
    shadow(ctx, x, y + 6, 100, 28);
    ctx.strokeStyle = '#2a2f38'; ctx.lineWidth = 3;
    // main hall with a curved roof
    ctx.fillStyle = '#b9b2c8'; roundRect(ctx, x - 86, y - 70, 172, 72, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d8d2e6'; ctx.beginPath(); ctx.moveTo(x - 92, y - 68); ctx.quadraticCurveTo(x, y - 120, x + 92, y - 68); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(58,42,74,0.35)'; ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 24, y - 70); ctx.lineTo(x + i * 22, y - 70 - (1 - Math.abs(i) / 4) * 40); ctx.stroke(); }
    // wall panels and a stripe
    ctx.fillStyle = '#ff8f5a'; ctx.fillRect(x - 86, y - 62, 172, 6);
    ctx.fillStyle = '#9a92ae'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 80 + i * 28, y - 50, 20, 44);
    // big rolling door with light
    ctx.fillStyle = '#3a2a4a'; roundRect(ctx, x - 34, y - 46, 68, 46, 4); ctx.fill();
    ctx.fillStyle = `rgba(255,211,107,${0.25 + glowK * 0.6})`; ctx.fillRect(x - 30, y - 42, 60, 40);
    ctx.strokeStyle = 'rgba(28,10,40,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 30, y - 38 + i * 8); ctx.lineTo(x + 30, y - 38 + i * 8); ctx.stroke(); }
    // belt input ports on the sides
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#2a2f38'; roundRect(ctx, x + s * 86 - (s > 0 ? 0 : 18), y - 22, 18, 20, 3); ctx.fill();
      ctx.fillStyle = Math.sin(t * 4 + s) > 0 ? '#9be36a' : '#4f7a3a'; ctx.beginPath(); ctx.arc(x + s * 95, y - 28, 3, 0, TAU); ctx.fill();
    }
    // crates by the door
    for (const [cx, cy, c] of [[-60, 0, '#a8703f'], [-48, -14, '#8a5a34'], [56, 0, '#a8703f']]) {
      ctx.fillStyle = c; ctx.strokeStyle = '#3d220f'; ctx.lineWidth = 1.5; ctx.fillRect(x + cx - 9, y + cy - 14, 18, 14); ctx.strokeRect(x + cx - 9, y + cy - 14, 18, 14);
      ctx.beginPath(); ctx.moveTo(x + cx - 9, y + cy - 14); ctx.lineTo(x + cx + 9, y + cy); ctx.stroke();
    }
    // antenna with blinking light
    ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 50, y - 96); ctx.lineTo(x + 56, y - 126); ctx.stroke();
    ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ff6b6b' : '#ffd36b'; ctx.beginPath(); ctx.arc(x + 56, y - 128, 4, 0, TAU); ctx.fill();
    glow(ctx, x, y - 24, 60 + glowK * 30, 'rgba(255,211,107,0.9)', 0.1 + glowK * 0.4);
    label(ctx, stock ? `WAREHOUSE  ${stock} waiting` : 'WAREHOUSE', x, y - 136, 13, '#ffd36b');
  }

  function cargoRocket(ctx, x, y, t, firing, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rocket(ctx, 0, 0, t, firing);
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(-16, -62, 32, 5);
    ctx.fillStyle = '#3a2a4a'; ctx.font = `700 9px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('CARGO', 0, -40);
    ctx.restore();
  }

  function cargoPad(ctx, t, r, lift) {
    const p = C.hub.pad, x = p.x, y = p.y;
    ctx.fillStyle = '#4c3a5e'; ctx.beginPath(); ctx.ellipse(x, y, 46, 16, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -t * 20; ctx.stroke(); ctx.setLineDash([]);
    // fuel gantry
    ctx.strokeStyle = '#6a5680'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 40, y); ctx.lineTo(x + 40, y - 110); ctx.moveTo(x + 40, y - 80); ctx.lineTo(x + 16, y - 80); ctx.stroke();
    ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + 36, y - i * 22); ctx.lineTo(x + 44, y - i * 22 - 11); ctx.stroke(); }
    if (lift !== null) {
      const flying = r.away > 0;
      if (flying) FX.smoke(x + (Math.random() - 0.5) * 20, y - lift * 0.1, 3);
      cargoRocket(ctx, x, y - lift, t, flying, 0.85);
    }
    const k = Math.min(1, r.n / SF.rocketCap());
    ctx.fillStyle = 'rgba(28,10,40,0.75)'; roundRect(ctx, x - 32, y + 22, 64, 9, 4); ctx.fill();
    ctx.fillStyle = '#ffd36b'; roundRect(ctx, x - 30, y + 24, Math.max(3, 60 * k), 5, 2.5); ctx.fill();
    label(ctx, r.away > 0 ? `ROCKET BACK IN ${Math.ceil(r.away)}s` : `CARGO ${r.n}/${SF.rocketCap()}`, x, y + 44, 12, '#ffd36b');
  }

  // Halcyon's hall: rockets land behind it, you unload in front of it.
  function hallPads(ctx, h, pads, t) {
    for (const p of pads) {
      ctx.fillStyle = '#4c3a5e'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 42, 15, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,211,107,0.8)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, 34, 11, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ffd36b'; ctx.font = `700 14px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', p.x, p.y + 1);
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; ctx.fillStyle = Math.sin(t * 3 + i) > 0 ? '#9be36a' : '#3a5a2a'; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 42, p.y + Math.sin(a) * 15, 2.5, 0, TAU); ctx.fill(); }
    }
    pads.forEach((p, i) => {
      if (!SF.state.homeReached || i === C.home) return;
      const [a, b] = SF.Hub.padLabel(i);
      label(ctx, a, p.x, p.y + 26, 11, '#ffd36b'); label(ctx, b, p.x, p.y + 40, 10, 'rgba(255,244,232,0.9)', 600);
    });
    pad(ctx, h.x, h.padY, h.r, 'rgba(255,211,107,A)', t, SF.player.zone === 'hall');
  }

  function hall(ctx, h, t, active) {
    const x = h.x, y = h.y;
    shadow(ctx, x, y + 6, 130, 30);
    ctx.strokeStyle = '#2a3a3a'; ctx.lineWidth = 3;
    // two wings and a tall centre with glass roof
    ctx.fillStyle = '#e8f2ec';
    roundRect(ctx, x - 120, y - 60, 240, 62, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#cfe2d8'; roundRect(ctx, x - 120, y - 60, 240, 14, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6fbf8'; ctx.beginPath(); ctx.moveTo(x - 60, y - 58); ctx.lineTo(x - 60, y - 100); ctx.quadraticCurveTo(x, y - 140, x + 60, y - 100); ctx.lineTo(x + 60, y - 58); ctx.closePath(); ctx.fill(); ctx.stroke();
    const gg = ctx.createLinearGradient(x, y - 132, x, y - 96);
    gg.addColorStop(0, '#9af5ff'); gg.addColorStop(1, '#2a9fb8');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(x - 50, y - 100); ctx.quadraticCurveTo(x, y - 132, x + 50, y - 100); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 18, y - 100); ctx.lineTo(x + i * 14, y - 118 + Math.abs(i) * 4); ctx.stroke(); }
    // green stripe, windows, plants
    ctx.fillStyle = '#62d08a'; ctx.fillRect(x - 118, y - 40, 236, 5);
    ctx.fillStyle = '#9af5ff'; for (const dx of [-100, -78, 62, 84]) roundRect(ctx, x + dx, y - 30, 16, 14, 3), ctx.fill();
    ctx.fillStyle = '#2a3a3a'; roundRect(ctx, x - 36, y - 52, 72, 52, 5); ctx.fill();
    ctx.fillStyle = active ? 'rgba(255,211,107,0.85)' : 'rgba(255,211,107,0.45)'; ctx.fillRect(x - 31, y - 47, 62, 47);
    ctx.strokeStyle = 'rgba(42,58,58,0.5)'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 31, y - 40 + i * 9); ctx.lineTo(x + 31, y - 40 + i * 9); ctx.stroke(); }
    for (const dx of [-112, 104]) { ctx.fillStyle = '#24835a'; ctx.beginPath(); ctx.arc(x + dx, y - 6, 10, 0, TAU); ctx.fill(); ctx.fillStyle = '#62d08a'; ctx.beginPath(); ctx.arc(x + dx - 3, y - 9, 6, 0, TAU); ctx.fill(); }
    // little gauges showing how full the hall is
    const cap = SF.Hub.hallCap(), codes = Object.keys(SF.state.hold).filter(c => SF.state.hold[c] > 0).slice(0, 6);
    codes.forEach((c, i) => {
      const gx = x - 50 + i * 20, k = Math.min(1, SF.state.hold[c] / cap);
      ctx.fillStyle = 'rgba(28,10,40,0.6)'; ctx.fillRect(gx - 4, y - 92, 8, 26);
      ctx.fillStyle = SF.res(+c).color; ctx.fillRect(gx - 3, y - 67 - 24 * k, 6, 24 * k);
    });
    label(ctx, 'HALCYON HALL', x, y + 120, 15, '#ffd36b');
    label(ctx, 'Rockets land here · unload your pack', x, y + 138, 11, 'rgba(255,244,232,0.85)', 600);
  }

  // A cargo rocket coming down onto its hall pad, unloading, then lifting off again.
  function landing(ctx, p, a, t) {
    if (a.fire && Math.random() < 0.6) FX.smoke(p.x + (Math.random() - 0.5) * 30, p.y, 3);
    cargoRocket(ctx, p.x, p.y - a.h, t, a.fire, 0.8);
  }

  // The portable material chest, standing next to the rocket on other planets.
  function chest(ctx, c, t, active) {
    const n = SF.Hub.chestCount(), cap = SF.Hub.chestCap(), lvl = SF.state.chestLvl, w = 28 + Math.min(lvl, 8) * 2;
    pad(ctx, c.x, c.y + 6, c.r, 'rgba(255,211,107,A)', t, active);
    shadow(ctx, c.x, c.y + 2, w + 6, 10);
    ctx.fillStyle = '#8a5a34'; ctx.strokeStyle = '#3d220f'; ctx.lineWidth = 3;
    roundRect(ctx, c.x - w, c.y - 34, w * 2, 34, 4); ctx.fill(); ctx.stroke();
    // planks and metal corners
    ctx.strokeStyle = 'rgba(61,34,15,0.5)'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(c.x - w + 3, c.y - 34 + i * 11); ctx.lineTo(c.x + w - 3, c.y - 34 + i * 11); ctx.stroke(); }
    const open = active ? 0.35 : 0;
    ctx.save(); ctx.translate(c.x, c.y - 34); ctx.rotate(-open * 0.4);
    ctx.fillStyle = '#a8703f'; ctx.strokeStyle = '#3d220f'; ctx.lineWidth = 3; roundRect(ctx, -w - 2, -12, w * 2 + 4, 14, 5); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (active) glow(ctx, c.x, c.y - 40, 40, 'rgba(255,211,107,0.9)', 0.5);
    ctx.fillStyle = '#c9ced8';
    for (const s of [-1, 1]) { ctx.fillRect(c.x + s * w - (s > 0 ? 6 : 0), c.y - 34, 6, 34); }
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(c.x - 5, c.y - 36, 10, 10);
    ctx.fillStyle = '#3d220f'; ctx.fillRect(c.x - 1, c.y - 33, 2, 4);
    // fill gauge
    const k = Math.min(1, n / cap);
    ctx.fillStyle = 'rgba(28,10,40,0.75)'; roundRect(ctx, c.x - 26, c.y + 12, 52, 7, 3); ctx.fill();
    ctx.fillStyle = k >= 1 ? '#ff8f5a' : '#ffd36b'; roundRect(ctx, c.x - 25, c.y + 13, Math.max(2, 50 * k), 5, 2.5); ctx.fill();
    label(ctx, `CHEST ${n}/${cap}`, c.x, c.y + 32, 12, '#ffd36b');
  }

  // Hired crew at work: walks, swings a tool at its node, carries the haul on its back.
  function crewmate(ctx, m, t) {
    const bob = Math.abs(Math.sin(m.walk)) * 2, f = m.face;
    shadow(ctx, m.x, m.y, 12, 4);
    ctx.save(); ctx.translate(m.x, m.y - bob); ctx.scale(0.7, 0.7);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    const step = Math.sin(m.walk) * 4;
    ctx.fillStyle = '#d9d6e6'; roundRect(ctx, -9 + step * 0.4, -12, 7, 12, 3); ctx.fill(); ctx.stroke(); roundRect(ctx, 2 - step * 0.4, -12, 7, 12, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9a90b0'; roundRect(ctx, -f * 16 - 6, -38, 12, 20, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = m.suit; roundRect(ctx, -12, -38, 24, 28, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-12, -24, 24, 3);
    // arm and tool
    const sw = m.swing || 0, ang = (m.state === 'work' ? -0.2 : 0.9) + (sw > 0 ? -1.6 * Math.sin(sw * Math.PI) : 0);
    ctx.save(); ctx.translate(f * 8, -30); ctx.scale(f, 1); ctx.rotate(ang);
    ctx.fillStyle = m.suit; roundRect(ctx, -3, -3, 14, 6, 3); ctx.fill(); ctx.stroke();
    TOOLS[SF.toolFor(SF.res(m.job).node)](ctx, sw);
    ctx.restore();
    ctx.fillStyle = '#f7f6fc'; ctx.beginPath(); ctx.arc(0, -48, 13, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = m.need && m.need !== 'eating' ? '#8a8f99' : '#ffb35a'; ctx.beginPath(); ctx.ellipse(f * 4, -47, 8, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(f * 2, -50, 2.5, 1.5, -0.5 * f, 0, TAU); ctx.fill();
    ctx.restore();
    for (let i = 0; i < m.cargo.length; i++) item(ctx, m.cargo[i], m.x - f * 14, m.y - 24 - i * 7 - bob, 0.85);
    if (m.need) label(ctx, m.need, m.x, m.y - 50, 11, '#ff8f5a', 600);
    else if (m.state === 'eat') label(ctx, 'off to eat', m.x, m.y - 50, 11, '#9be36a', 600);
  }

  function rocket(ctx, x, y, t, firing) {
    if (firing) {
      const f = 30 + Math.random() * 30;
      glow(ctx, x, y + 10, 90, 'rgba(255,160,60,0.9)', 0.9);
      ctx.fillStyle = '#ffd36b'; poly(ctx, [[x - 12, y - 4], [x, y + f], [x + 12, y - 4]]); ctx.fill();
      ctx.fillStyle = '#fff4e8'; poly(ctx, [[x - 6, y - 4], [x, y + f * 0.5], [x + 6, y - 4]]); ctx.fill();
    }
    ctx.strokeStyle = '#3a2a4a'; ctx.lineWidth = 3;
    ctx.fillStyle = '#ff8f5a';
    for (const s of [-1, 1]) { poly(ctx, [[x + s * 16, y - 40], [x + s * 32, y - 4], [x + s * 16, y - 12]]); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#f2f0f8';
    ctx.beginPath(); ctx.moveTo(x - 17, y - 8); ctx.lineTo(x - 17, y - 90); ctx.quadraticCurveTo(x, y - 150, x + 17, y - 90); ctx.lineTo(x + 17, y - 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff8f5a'; ctx.fillRect(x - 16, y - 30, 32, 6);
    ctx.fillStyle = '#6ff5e8'; ctx.beginPath(); ctx.arc(x, y - 82, 8, 0, TAU); ctx.fill(); ctx.stroke();
  }

  function building(ctx, p, st, t, active, lift) { BUILDINGS[p.kind](ctx, p, t, active, st, lift || 0); }

  return { item, here, trail, foodCar, chest, warehouse, cargoPad, hall, hallPads, landing, belts, beltRoute, routeLen, along, BELT_SPEED, road, pickupPad, smelter, tractor, crewmate, node, player, drone, stackSlot, dropZone, lander, upgradePad, plotMarking, building, label, hexCoin, glow, shadow, roundRect, rgba, FONT };
})();
