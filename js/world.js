// The current planet: regions, plots, resource nodes, collision and ground texture.
(function () {
  const C = SF.CFG;
  const TAU = Math.PI * 2;

  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  SF.rng = rng;

  // Smooth minimum: blends two distances so the seam between regions is rounded.
  function smin(a, b, k) {
    if (!isFinite(a)) return b;
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  }

  // Distance from a point to a line segment.
  function segDist(x, y, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, k = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - a.x - dx * k, y - a.y - dy * k);
  }

  const W = SF.World = {
    nodes: [], regions: [], plots: [], planet: null,

    // Rebuild everything for the current planet.
    load(ctx) {
      W.planet = SF.planet();
      SF.Save.ensureWorld(SF.state, SF.state.planet);
      const L = SF.layoutPlanet(W.planet);
      W.regions = L.regions; W.plots = SF.applyLots(L.plots, SF.ws());
      // Halcyon has the big hall; other planets get the portable chest once Halcyon is reached.
      const rocket = W.plot('launch'), H = C.hub.hallAt;
      W.chest = SF.hubActive() ? { x: rocket.x + 120, y: rocket.y + 30, r: 50 } : null;
      W.hall = W.planet.home ? { x: H.x, y: H.y, r: 62, padY: H.y + 70 } : null;
      const S = C.smelter;
      W.smelter = W.planet.home ? { x: S.at.x, y: S.at.y, r: 58, padY: S.at.y + 80 } : null;
      W.pickup = W.planet.home ? { x: S.pickup.x, y: S.pickup.y, r: 46 } : null;
      W._mask = null;
      W.generate();
      W.pattern = W.groundPattern(ctx, W.planet.theme);
      W.biomes = W.makeBiomes();
    },

    // Ground texture and scenery for every outer region, chosen by its resource.
    makeBiomes() {
      const R = rng(777 + SF.state.planet * 131), out = [];
      const avoid = W.nodes.map(n => ({ x: n.x, y: n.y, r: 70 })).concat(W.plots.map(p => ({ x: p.x, y: p.y + 20, r: C.plotR + 70 })));
      for (const t of W.trails || []) for (let k = 0; k <= 1; k += 0.05) avoid.push({ x: t.a.x + (t.b.x - t.a.x) * k, y: t.a.y + (t.b.y - t.a.y) * k, r: C.trailWidth + 30 });
      for (const reg of W.regions) {
        const key = reg.res != null && W.res(reg.res).biome, b = key && SF.Biomes.BIOMES[key];
        if (!b) continue;
        out.push({ reg, b, tex: SF.Biomes.texture(reg, b, 31 + SF.state.planet * 17 + reg.res), decor: SF.Biomes.scatter(reg, b, R, avoid) });
      }
      return out;
    },

    res(i) { return W.planet.resources[i]; },
    plot(id) { return W.plots.find(p => p.id === id); },
    region(id) { return W.regions.find(r => r.id === id); },
    isOpen(reg) { return !reg.unlock || SF.ws().plots[reg.unlock].built; },
    openRegions() { return W.regions.filter(r => W.isOpen(r)); },
    nodeOpen(n) { return W.isOpen(n.region); },

    generate() {
      const R = rng(4242 + SF.state.planet * 977);
      const avoid = [
        { x: C.depot.x, y: C.depot.y, r: 120 },
        { x: C.dropZone.x, y: C.dropZone.y, r: C.dropZone.r + 50 },
        { x: C.upgradePad.x, y: C.upgradePad.y, r: C.upgradePad.r + 50 },
        { x: C.start.x, y: C.start.y, r: 70 },
      ];
      W.plots.forEach(p => avoid.push({ x: p.x, y: p.y + 20, r: C.plotR + 80 }));
      W.nodes = [];
      if (W.chest) avoid.push({ x: W.chest.x, y: W.chest.y, r: 110 });
      if (W.hall) avoid.push({ x: W.hall.x, y: W.hall.y - 60, r: 260 });
      // keep every possible conveyor route clear of nodes
      for (const p of W.plots) if (p.kind === 'producer') {
        const pts = SF.Render.beltRoute(p);
        for (let i = 1; i < pts.length; i++) {
          const q0 = pts[i - 1], q1 = pts[i], n = Math.ceil(Math.hypot(q1.x - q0.x, q1.y - q0.y) / 30);
          for (let k = 0; k <= n; k++) avoid.push({ x: q0.x + (q1.x - q0.x) * k / n, y: q0.y + (q1.y - q0.y) * k / n, r: 46 });
        }
      }
      if (W.smelter) {
        avoid.push({ x: W.smelter.x + 30, y: W.smelter.y - 20, r: 210 }, { x: W.pickup.x, y: W.pickup.y + 30, r: 110 });
        // keep the tractor's track clear
        const [a, b] = C.smelter.road;
        for (let k = 0; k <= 1; k += 0.1) avoid.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, r: 80 });
      }
      if (!W.planet.home) avoid.push({ x: C.hub.pad.x, y: C.hub.pad.y, r: 110 });
      // A clear trail from the landing site to every other region; the quarters between get denser instead.
      W.trails = W.regions.filter(r => r.unlock).map(r => {
        const a = Math.atan2(r.y, r.x), k = C.gateRadius + 300;
        return { a: { x: Math.cos(a) * 150, y: Math.sin(a) * 150 }, b: { x: Math.cos(a) * k, y: Math.sin(a) * k } };
      });
      const onTrail = (x, y) => W.trails.some(t => segDist(x, y, t.a, t.b) < C.trailWidth);
      const field = W.planet.field;
      for (const reg of W.regions) {
        if (reg.res == null) continue;
        const def = W.res(reg.res);
        let placed = 0, tries = 0;
        while (placed < def.count && tries++ < 4000) {
          const a = R() * TAU, d = Math.sqrt(R()) * (reg.r - 70);
          const x = reg.x + Math.cos(a) * d, y = reg.y + Math.sin(a) * d;
          if (avoid.some(o => Math.hypot(o.x - x, o.y - y) < o.r) || onTrail(x, y)) continue;
          if (reg.id === 'r0' && field && !field(x, y)) continue;
          if (W.nodes.some(n => Math.hypot(n.x - x, n.y - y) < (reg.id === 'r0' ? 82 : 92))) continue;
          // Each node must sit in its own region only, never in an overlap.
          const home = W.regions.find(rg => Math.hypot(rg.x - x, rg.y - y) < rg.r - 30);
          if (home !== reg) continue;
          W.nodes.push(makeNode(def, reg, x, y, R));
          placed++;
        }
      }
    },

    // Distance to the edge of the walkable land (negative inside).
    sdf(x, y) {
      let d = Infinity;
      for (const r of W.openRegions()) d = smin(d, Math.hypot(x - r.x, y - r.y) - r.r, 170);
      return d;
    },

    // Keep a point inside the walkable land by pushing it back along the edge normal.
    constrain(p, margin) {
      for (let i = 0; i < 4; i++) {
        const d = W.sdf(p.x, p.y) + margin;
        if (d <= 0) return;
        const gx = W.sdf(p.x + 1, p.y) - W.sdf(p.x - 1, p.y);
        const gy = W.sdf(p.x, p.y + 1) - W.sdf(p.x, p.y - 1);
        const l = Math.hypot(gx, gy) || 1;
        p.x -= gx / l * d; p.y -= gy / l * d;
      }
    },

    // Low-res mask of the walkable land, used to cut the fog. Cached per unlock state.
    fogMask() {
      const key = W.openRegions().map(r => r.id).join();
      if (W._mask && W._mask.key === key) return W._mask;
      const S = 8, pad = 300;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const r of W.regions) { x0 = Math.min(x0, r.x - r.r); y0 = Math.min(y0, r.y - r.r); x1 = Math.max(x1, r.x + r.r); y1 = Math.max(y1, r.y + r.r); }
      x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
      const w = Math.ceil((x1 - x0) / S), h = Math.ceil((y1 - y0) / S);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'), img = g.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const d = W.sdf(x0 + (i + 0.5) * S, y0 + (j + 0.5) * S);
        img.data[(j * w + i) * 4 + 3] = Math.round(Math.max(0, Math.min(1, (10 - d) / 100)) * 255);
      }
      g.putImageData(img, 0, 0);
      W._mask = { key, canvas: c, x: x0, y: y0, w: w * S, h: h * S };
      return W._mask;
    },

    pushOut(p, cx, cy, r) {
      const dx = p.x - cx, dy = (p.y - cy) * 1.4, d = Math.hypot(dx, dy);
      if (d < r && d > 0.001) { p.x = cx + dx / d * r; p.y = cy + dy / d * r / 1.4; }
    },

    groundPattern(ctx, th) {
      const S = 512, c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d'), R = rng(99 + SF.state.planet);
      g.fillStyle = th.ground; g.fillRect(0, 0, S, S);
      // Draw a shape at every wrapped offset so the tile repeats seamlessly.
      const wrap = fn => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
      for (let i = 0; i < 26; i++) {
        const x = R() * S, y = R() * S, rr = 40 + R() * 90, light = R() > 0.5;
        wrap(() => {
          const gr = g.createRadialGradient(x, y, 0, x, y, rr);
          gr.addColorStop(0, light ? th.light : th.dark); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
        });
      }
      if (th.detail === 'craters') {
        for (let i = 0; i < 9; i++) {
          const x = R() * S, y = R() * S, rr = 8 + R() * 22;
          wrap(() => {
            g.fillStyle = th.crater; g.beginPath(); g.ellipse(x, y, rr, rr * 0.55, 0, 0, TAU); g.fill();
            g.strokeStyle = th.rim; g.lineWidth = 2;
            g.beginPath(); g.ellipse(x, y + 1, rr, rr * 0.55, 0, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
          });
        }
      } else if (th.detail === 'grass') {
        for (let i = 0; i < 70; i++) {
          const x = R() * S, y = R() * S, k = 3 + Math.floor(R() * 3);
          wrap(() => {
            g.strokeStyle = th.rim; g.lineWidth = 2; g.lineCap = 'round';
            for (let j = 0; j < k; j++) { const a = -Math.PI / 2 + (j - k / 2) * 0.35; g.beginPath(); g.moveTo(x + j * 2, y); g.lineTo(x + j * 2 + Math.cos(a) * 8, y + Math.sin(a) * 9); g.stroke(); }
          });
        }
        for (let i = 0; i < 6; i++) {
          const x = R() * S, y = R() * S, rr = 14 + R() * 20;
          wrap(() => { g.fillStyle = th.crater; g.beginPath(); g.ellipse(x, y, rr, rr * 0.5, 0, 0, TAU); g.fill(); });
        }
      } else if (th.detail === 'ripples') {
        for (let i = 0; i < 34; i++) {
          const x = R() * S, y = R() * S, w = 40 + R() * 70;
          wrap(() => {
            g.strokeStyle = R() > 0.5 ? th.rim : th.crater; g.lineWidth = 2;
            g.beginPath(); g.moveTo(x, y);
            g.bezierCurveTo(x + w * 0.3, y - 6, x + w * 0.6, y + 6, x + w, y); g.stroke();
          });
        }
      }
      for (let i = 0; i < 260; i++) {
        const x = R() * S, y = R() * S, rr = 0.8 + R() * 2.4, k = R();
        wrap(() => {
          g.fillStyle = th.specks[k < 0.5 ? 0 : k < 0.9 ? 1 : 2];
          g.beginPath(); g.ellipse(x, y, rr, rr * 0.7, 0, 0, TAU); g.fill();
        });
      }
      return ctx.createPattern(c, 'repeat');
    },
  };

  // A lumpy outline around the origin, used by rock-like nodes.
  function blob(R, k, r, j) {
    const pts = [];
    for (let i = 0; i < k; i++) { const a = i / k * TAU; pts.push([Math.cos(a) * r * (1 - j / 2 + R() * j), Math.sin(a) * r * (1 - j / 2 + R() * j)]); }
    return pts;
  }

  // Each node shape gets its own random details, fixed by the seed.
  function makeNode(def, reg, x, y, R) {
    const n = { res: def.tier, code: SF.state.planet * 10 + def.tier, def, region: reg, x, y, r: def.r, hp: def.hp, maxHp: def.hp,
      alive: true, regrowT: 0, flash: 0, shake: 0, grow: 1, claimed: null, phase: R() * TAU };
    switch (def.node) {
      case 'crystal': {
        n.prisms = [];
        const k = 4 + Math.floor(R() * 3);
        for (let i = 0; i < k; i++) n.prisms.push({ ox: (R() - 0.5) * 30, a: (R() - 0.5) * 0.9, w: 9 + R() * 7, h: 22 + R() * 34, oy: R() * 6 });
        n.prisms.sort((a, b) => a.oy - b.oy || a.h - b.h);
        n.prisms.push({ ox: 0, a: (R() - 0.5) * 0.15, w: 15, h: 52 + R() * 14, oy: 3 });
        n.pebbles = [];
        for (let i = 0; i < 5; i++) n.pebbles.push({ x: (R() - 0.5) * 56, y: 2 + R() * 6, s: 2 + R() * 3, a: R() * TAU });
        break;
      }
      case 'magma': {
        n.pts = blob(R, 10, n.r, 0.25);
        n.cracks = [];
        for (let i = 0; i < 3; i++) {
          let x = (R() - 0.5) * n.r, y = -n.r * 0.4 - R() * n.r * 0.6;
          const c = [[x, y]];
          for (let j = 0; j < 3; j++) { x += (R() - 0.5) * 16; y += 6 + R() * 8; c.push([x, y]); }
          n.cracks.push(c);
        }
        break;
      }
      case 'icespire': {
        n.spires = [];
        for (let i = 0; i < 6; i++) n.spires.push({ ox: (i - 2.5) * 9 + (R() - 0.5) * 6, h: 34 + R() * 30 + (i === 2 || i === 3 ? 26 : 0), w: 7 + R() * 5, a: (R() - 0.5) * 0.5 });
        n.spires.sort((a, b) => a.h - b.h);
        n.sparks = [];
        for (let i = 0; i < 4; i++) n.sparks.push({ x: (R() - 0.5) * 40, y: -20 - R() * 60, p: R() * TAU });
        break;
      }
      case 'ironrock':
        n.slabs = [{ w: n.r * 1.1, h: 22, ox: 0 }, { w: n.r * 0.85, h: 20, ox: (R() - 0.5) * 8 }, { w: n.r * 0.55, h: 16, ox: (R() - 0.5) * 10 }];
        n.lumps = [];
        for (let i = 0; i < 6; i++) n.lumps.push({ x: (R() - 0.5) * n.r * 1.4, y: -8 - R() * 50, s: 3 + R() * 4 });
        n.streaks = [];
        for (let i = 0; i < 4; i++) n.streaks.push({ x: (R() - 0.5) * n.r * 1.4, y: -10 - R() * 40, l: 8 + R() * 12 });
        break;
      case 'resin':
        n.w = 24 + R() * 6;
        n.drips = [];
        for (let i = 0; i < 4; i++) n.drips.push({ x: (i < 2 ? -1 : 1) * (n.w - 4) + (R() - 0.5) * 6, y: -10 - R() * 22, s: 4 + R() * 3 });
        break;
      case 'goldvein':
        n.pts = blob(R, 9, n.r, 0.35).map(([x, y]) => [x, y * (y < 0 ? 1.5 : 1)]);
        n.veins = [];
        for (let i = 0; i < 3; i++) {
          let x = (R() - 0.5) * n.r, y = -n.r * 1.4 + R() * 10;
          const c = [[x, y]];
          for (let j = 0; j < 4; j++) { x += (R() - 0.5) * 18; y += 9 + R() * 6; c.push([x, y]); }
          n.veins.push(c);
        }
        n.nuggets = [];
        for (let i = 0; i < 5; i++) n.nuggets.push({ x: (R() - 0.5) * n.r * 1.2, y: -12 - R() * n.r * 1.1, s: 3 + R() * 3, p: R() * TAU });
        break;
      case 'mesa':
        n.w = n.r * 1.05; n.h = 40 + R() * 16;
        n.jag = [];
        for (let i = 0; i < 12; i++) n.jag.push((R() - 0.5) * 6);
        n.pebbles = [];
        for (let i = 0; i < 5; i++) n.pebbles.push({ x: (R() - 0.5) * n.r * 2.4, y: 2 + R() * 6, s: 2 + R() * 4 });
        break;
      case 'malachite':
        n.pts = blob(R, 9, n.r * 0.9, 0.2);
        n.bubbles = [];
        for (let i = 0; i < 7; i++) n.bubbles.push({ x: (R() - 0.5) * n.r * 1.3, y: -n.r * 0.6 - R() * n.r * 0.8, r: 7 + R() * 7 });
        n.bubbles.sort((a, b) => a.y - b.y);
        break;
      case 'geode':
        n.points = [];
        for (let i = 0; i < 14; i++) n.points.push({ a: i / 14 * TAU, l: 5 + R() * 6 });
        n.tilt = (R() - 0.5) * 0.2;
        break;
      case 'palm':
        n.h = 70 + R() * 20; n.lean = (R() - 0.5) * 30;
        n.fronds = [];
        for (let i = 0; i < 7; i++) n.fronds.push({ a: -Math.PI / 2 + (i - 3) * 0.48 + (R() - 0.5) * 0.2, l: 34 + R() * 12 });
        n.fruits = 3 + Math.floor(R() * 2);
        break;
      case 'coral': {
        n.branches = [];
        const grow = (x, y, a, l, d) => {
          const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
          n.branches.push({ x, y, x2, y2, w: 4 + d * 2.2 });
          if (d > 0) for (const s of [-1, 1]) if (R() > 0.15) grow(x2, y2, a + s * (0.35 + R() * 0.3), l * (0.62 + R() * 0.15), d - 1);
        };
        for (let i = 0; i < 3; i++) grow((i - 1) * 12, -2, -Math.PI / 2 + (i - 1) * 0.35, 20 + R() * 6, 2);
        break;
      }
      case 'conch':
        n.flip = R() > 0.5 ? 1 : -1;
        break;
      case 'clam':
        n.spikes = [];
        for (let i = 0; i < 7; i++) n.spikes.push({ a: Math.PI + (i + 0.5) / 7 * Math.PI, l: 10 + R() * 9 });
        break;
      case 'tree':
        n.trunk = 26 + R() * 14;
        n.blobs = [];
        for (let i = 0; i < 6; i++) n.blobs.push({ x: (R() - 0.5) * 34, y: -n.trunk - 10 - R() * 34, r: 16 + R() * 10 });
        n.blobs.sort((a, b) => a.y - b.y);
        n.blobs.reverse();
        break;
      case 'mushroom':
        n.caps = [{ ox: 0, h: 34 + R() * 10, r: 20 }];
        for (let i = 0; i < 2; i++) n.caps.unshift({ ox: (i ? 1 : -1) * (14 + R() * 6), h: 14 + R() * 12, r: 10 + R() * 4 });
        break;
      case 'bush':
        n.blobs = [];
        for (let i = 0; i < 5; i++) n.blobs.push({ x: (R() - 0.5) * 36, y: -14 - R() * 16, r: 13 + R() * 6 });
        n.berries = [];
        for (let i = 0; i < 9; i++) n.berries.push({ x: (R() - 0.5) * 40, y: -10 - R() * 28 });
        break;
      case 'cactus':
        n.h = 54 + R() * 18;
        n.arms = [{ s: -1, y: 0.45 + R() * 0.2, h: 14 + R() * 10 }, { s: 1, y: 0.3 + R() * 0.2, h: 18 + R() * 10 }];
        break;
      case 'bones':
        n.ribs = 4 + Math.floor(R() * 2);
        n.flip = R() > 0.5 ? 1 : -1;
        break;
    }
    return n;
  }
})();
