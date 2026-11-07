// Procedural drawing for everything in the world. All shapes, no image files.
// Node drawers take an optional override colour `ov`: drawing a node again with a
// translucent white override is how hit flashes work for every shape.
SF.Render = (function () {
  const C = SF.CFG;
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
    bone(ctx, R) {
      ctx.fillStyle = R.color; ctx.strokeStyle = R.edge; ctx.lineWidth = 1.2;
      roundRect(ctx, -6, -2, 12, 4, 2); ctx.fill(); ctx.stroke();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 7, sy * 2.5, 2.6, 0, TAU); ctx.fill(); ctx.stroke(); }
      roundRect(ctx, -6, -2, 12, 4, 2); ctx.fill();
    },
  };

  function item(ctx, res, x, y, s) {
    const R = SF.World.res(res);
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
      alive(ctx, n, R, t, ov) { for (const p of n.prisms) prism(ctx, p, ov ? null : R.color, ov || R.dark, ov ? null : R.edge); },
      dead(ctx, n, R) { for (const p of n.prisms) prism(ctx, { ox: p.ox * 0.8, oy: p.oy, a: p.a, w: p.w * 0.8, h: 6 }, R.color, R.dark, R.edge); },
    },
    rock: {
      top: 70,
      glow(ctx, n, R, t) { glow(ctx, 0, -n.r * 0.7, 60, rgba(R.color, 0.6), 0.25 + Math.sin(t * 3 + n.phase) * 0.08); },
      alive(ctx, n, R, t, ov) {
        poly(ctx, n.pts.map(([px, py]) => [px, py * 0.8 - n.r * 0.7]));
        ctx.fillStyle = ov || R.stone; ctx.fill();
        if (ov) return;
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(20,10,20,0.6)'; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.ellipse(-4, -n.r * 1.05, n.r * 0.6, n.r * 0.28, -0.2, 0, TAU); ctx.fill();
        for (const v of n.veins) {
          ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.a);
          poly(ctx, [[-v.s, 0], [0, -v.s * 0.8], [v.s, 0], [0, v.s * 0.7]]); ctx.fillStyle = R.color; ctx.fill();
          ctx.fillStyle = '#fff8e0'; ctx.fillRect(-1, -1.5, 2.5, 2.5);
          ctx.restore();
        }
      },
      dead(ctx, n, R) { ctx.fillStyle = R.stone; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(-14 + i * 9, -2 + (i % 2) * 3, 6, 4, 0, 0, TAU); ctx.fill(); } },
    },
    clam: {
      top: 60,
      alive(ctx, n, R, t, ov) {
        const bob = Math.sin(t * 2.4 + n.phase) * 3;
        if (!ov) {
          shell(ctx, n, true);
          glow(ctx, 0, -20 + bob, 60, rgba(R.color, 0.8), 0.45 + Math.sin(t * 3 + n.phase) * 0.12);
          const gr = ctx.createRadialGradient(-4, -26 + bob, 2, 0, -20 + bob, 13);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, R.color); gr.addColorStop(1, R.dark);
          ctx.fillStyle = gr;
        } else ctx.fillStyle = ov;
        ctx.beginPath(); ctx.arc(0, -20 + bob, 13, 0, TAU); ctx.fill();
      },
      dead(ctx, n) { ctx.scale(0.9, 0.9); shell(ctx, n, false); },
    },
    tree: {
      top: 112,
      alive(ctx, n, R, t, ov) {
        const sway = Math.sin(t * 1.3 + n.phase) * 2;
        ctx.fillStyle = ov || R.dark; roundRect(ctx, -6, -n.trunk - 4, 12, n.trunk + 4, 4); ctx.fill();
        if (!ov) { ctx.fillStyle = R.color; ctx.fillRect(-6, -n.trunk, 4, n.trunk - 2); }
        for (const b of n.blobs) {
          ctx.fillStyle = ov || R.leafDark; ctx.beginPath(); ctx.arc(b.x + sway, b.y, b.r, 0, TAU); ctx.fill();
        }
        if (ov) return;
        for (const b of n.blobs) { ctx.fillStyle = R.leaf; ctx.beginPath(); ctx.arc(b.x + sway - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.72, 0, TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        for (const b of n.blobs.slice(-2)) { ctx.beginPath(); ctx.arc(b.x + sway - b.r * 0.4, b.y - b.r * 0.45, b.r * 0.3, 0, TAU); ctx.fill(); }
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
          ctx.beginPath(); ctx.arc(c.ox - c.r * 0.35, -c.h - c.r * 0.35, c.r * 0.12, 0, TAU); ctx.arc(c.ox + c.r * 0.25, -c.h - c.r * 0.45, c.r * 0.1, 0, TAU); ctx.fill();
        }
      },
      dead(ctx, n, R) { ctx.fillStyle = R.stem; for (const c of n.caps) { roundRect(ctx, c.ox - 3, -5, 6, 5, 2); ctx.fill(); } },
    },
    bush: {
      top: 62,
      alive(ctx, n, R, t, ov) {
        for (const b of n.blobs) { ctx.fillStyle = ov || R.leafDark; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
        if (ov) return;
        for (const b of n.blobs) { ctx.fillStyle = R.leaf; ctx.beginPath(); ctx.arc(b.x - b.r * 0.2, b.y - b.r * 0.25, b.r * 0.7, 0, TAU); ctx.fill(); }
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

  function shell(ctx, n, open) {
    ctx.fillStyle = '#2d1640';
    ctx.beginPath(); ctx.ellipse(0, -6, n.r, n.r * 0.5, 0, 0, TAU); ctx.fill();
    for (const s of n.spikes) {
      const bx = Math.cos(s.a) * n.r * 0.9, by = Math.sin(s.a) * n.r * 0.45 - 8;
      ctx.fillStyle = '#4b2468';
      poly(ctx, [[bx - 5, by], [bx + Math.cos(s.a) * s.l * 0.5, by + Math.sin(s.a) * s.l], [bx + 5, by]]); ctx.fill();
    }
    ctx.fillStyle = '#5c2c80'; ctx.beginPath(); ctx.ellipse(0, -10, n.r * 0.8, n.r * 0.34, 0, Math.PI, TAU); ctx.fill();
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
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(26, 0); ctx.stroke();
    ctx.fillStyle = '#6ff5e8'; poly(ctx, [[24, -9], [31, 0], [24, 9], [27, 0]]); ctx.fill();
    if (sw > 0.5) glow(ctx, 30, 0, 18, 'rgba(111,245,232,1)', (sw - 0.5) * 1.8);
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

  function dropZone(ctx, t, active) {
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
    label(ctx, 'DROP OFF', z.x, z.y + z.r * 0.55 + 16, 14, '#6ff5e8');
  }

  function plotMarking(ctx, p, st, t, active) {
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
    if (p.kind === 'gate') item(ctx, p.res, p.x, p.y - 56, 1.4);
    label(ctx, p.name, p.x, p.y - 34, 15, '#fff4e8');
    hexCoin(ctx, p.x - 6 - left.length * 5.5, p.y - 2, 8);
    label(ctx, left, p.x + 6, p.y - 1, 20, '#ffd36b');
    label(ctx, p.desc, p.x, p.y + 30, 12, 'rgba(255,244,232,0.85)', 600);
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
    let i = 0;
    for (let row = 0; i < n; row++) for (let c = 0; c < 4 - row && i < n; c++, i++) item(ctx, res, x + c * 15 + row * 7.5, y - row * 11, 1.1);
  }

  const BUILDINGS = {
    gate(ctx, p, t) {
      const x = p.x, y = p.y, R = SF.World.res(p.res);
      shadow(ctx, x, y + 4, 30, 10);
      ctx.fillStyle = '#4c3a5e'; poly(ctx, [[x - 18, y], [x - 6, y - 90], [x + 6, y - 90], [x + 18, y]]); ctx.fill();
      ctx.fillStyle = '#6a5680'; poly(ctx, [[x, y], [x - 2, y - 90], [x + 6, y - 90], [x + 18, y]]); ctx.fill();
      const b = Math.sin(t * 3) * 3;
      glow(ctx, x, y - 102 + b, 50, rgba(R.color, 0.9), 0.6);
      ctx.fillStyle = R.color; ctx.beginPath(); ctx.arc(x, y - 102 + b, 9, 0, TAU); ctx.fill();
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
      }
      pile(ctx, h.res, st.pile, x - 52, y + 30);
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
      label(ctx, 'REFINERY  +50%', x - 10, y + 22, 13, '#ffab4a');
    },
    launch(ctx, p, t, active, st, lift) {
      const x = p.x, y = p.y;
      pad(ctx, x, y + 40, 54, 'rgba(255,211,107,A)', t, active);
      ctx.fillStyle = '#4c3a5e'; ctx.beginPath(); ctx.ellipse(x, y, 52, 18, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
      rocket(ctx, x, y - lift, t, lift > 0);
      if (!lift) label(ctx, 'LAUNCH PAD', x, y + 82, 14, '#ffd36b');
    },
  };

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

  return { item, node, player, drone, stackSlot, dropZone, lander, upgradePad, plotMarking, building, label, hexCoin, glow, shadow, roundRect, rgba, FONT };
})();
