// Progress lives in localStorage. Every access is guarded: storage can be blocked.
SF.Save = {
  KEY: 'shardfall-outpost-v1',
  VERSION: 2,

  // State for a fresh start on a planet. Planet-independent fields are passed in.
  fresh(keep) {
    const plots = {};
    Object.keys(SF.CFG.plotCosts).forEach(id => { plots[id] = { paid: 0, built: false, lvl: 0, pile: 0 }; });
    return Object.assign({
      v: this.VERSION, planet: 0, stars: 0, lifetime: 0, muted: false,
      credits: 0, totalEarned: 0,
      lvl: { cap: 0, drill: 0, speed: 0 },
      plots, drones: 0,
      stack: [], player: { x: SF.CFG.start.x, y: SF.CFG.start.y },
    }, keep || {});
  },

  normalize(data) {
    if (!data || typeof data !== 'object') return this.fresh();
    if (!data.v) data = this.migrateV1(data);
    const s = this.fresh();
    const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
    s.planet = Math.max(0, num(data.planet, 0) | 0);
    s.stars = Math.max(0, num(data.stars, 0) | 0);
    s.lifetime = num(data.lifetime, 0);
    s.muted = !!data.muted;
    s.credits = Math.max(0, num(data.credits, 0));
    s.totalEarned = num(data.totalEarned, 0);
    if (data.lvl) for (const k in s.lvl) s.lvl[k] = Math.max(0, num(data.lvl[k], 0) | 0);
    if (data.plots) for (const k in s.plots) {
      const p = data.plots[k];
      if (p) Object.assign(s.plots[k], { paid: num(p.paid, 0), built: !!p.built, lvl: num(p.lvl, 0) | 0, pile: num(p.pile, 0) | 0 });
    }
    s.drones = Math.max(0, num(data.drones, 0) | 0);
    if (Array.isArray(data.stack)) s.stack = data.stack.filter(t => t >= 0 && t <= 4).map(t => t | 0);
    if (data.player && isFinite(data.player.x) && isFinite(data.player.y)) s.player = { x: data.player.x, y: data.player.y };
    return s;
  },

  // First release saved resource names and four fixed plots.
  migrateV1(d) {
    const ids = ['shard', 'ember', 'glowcap', 'frost', 'pearl'];
    const p = d.plots || {};
    const out = { v: 2, planet: 0, stars: 0, credits: (d.credits || 0) + (p.void && p.void.built ? 1800 : 0),
      totalEarned: d.totalEarned || 0, lifetime: d.totalEarned || 0, lvl: d.lvl, drones: d.drones, muted: d.muted,
      plots: { g2: p.ember, h1: p.drones, ref: p.refinery },
      stack: (d.stack || []).map(t => ids.indexOf(t)).filter(i => i >= 0) };
    return out;
  },

  // Keep the save small: round money, drop default fields.
  compact(s) {
    const plots = {};
    for (const k in s.plots) {
      const p = s.plots[k];
      if (p.paid || p.built || p.lvl || p.pile) plots[k] = { paid: Math.round(p.paid), built: p.built || undefined, lvl: p.lvl || undefined, pile: p.pile || undefined };
    }
    return Object.assign({}, s, {
      credits: Math.round(s.credits * 100) / 100, totalEarned: Math.round(s.totalEarned), lifetime: Math.round(s.lifetime), plots,
    });
  },

  load() {
    try { const raw = localStorage.getItem(this.KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  },
  write(data) { try { localStorage.setItem(this.KEY, JSON.stringify(this.compact(data))); } catch (e) {} },
  clear() { try { localStorage.removeItem(this.KEY); } catch (e) {} },
};
