// Progress lives in localStorage. Every access is guarded: storage can be blocked.
SF.Save = {
  KEY: 'shardfall-outpost-v1',
  VERSION: 3,

  // Buildings and drones of one planet. A finished campaign planet comes fully built.
  freshWorld(pi, finished) {
    const plots = {};
    for (const p of SF.layoutPlanet(SF.PLANETS[pi]).plots) {
      plots[p.id] = { paid: 0, built: !!(finished || p.prebuilt), lvl: 0, pile: 0, res: {} };
    }
    const hasDrones = SF.PLANETS[pi].helpers.some(h => h.kind === 'drones');
    return { plots, drones: finished && hasDrones ? 2 : 0 };
  },

  // State for a fresh start on a planet. Fields that survive travel are passed in `keep`.
  fresh(keep) {
    const s = Object.assign({
      v: this.VERSION, planet: 0, stars: 0, homeReached: false, lifetime: 0, muted: false,
      credits: 0, totalEarned: 0, lvl: { cap: 0, drill: 0, speed: 0 },
      stack: [], player: { x: SF.CFG.start.x, y: SF.CFG.start.y },
      worlds: {}, hold: {}, crew: [], chest: {}, chestLvl: 0, hallLvl: 0, inbound: [],
    }, keep || {});
    if (!s.worlds[s.planet]) s.worlds[s.planet] = this.freshWorld(s.planet, false);
    return s;
  },

  // Create a planet's buildings the first time you visit it, and fill in plots added later.
  ensureWorld(s, pi) {
    const fresh = this.freshWorld(pi, pi < SF.CFG.home && s.homeReached);
    if (!s.worlds[pi]) { s.worlds[pi] = fresh; return; }
    for (const id in fresh.plots) if (!s.worlds[pi].plots[id]) s.worlds[pi].plots[id] = fresh.plots[id];
  },

  normalize(data) {
    if (!data || typeof data !== 'object') return this.fresh();
    if (!data.v) data = this.migrateV1(data);
    if (data.v === 2) data = this.migrateV2(data);
    const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
    const s = this.fresh({ planet: Math.min(SF.PLANETS.length - 1, Math.max(0, num(data.planet, 0) | 0)) });
    s.stars = Math.max(0, num(data.stars, 0) | 0);
    s.homeReached = !!data.homeReached || s.planet >= SF.CFG.home;
    s.lifetime = num(data.lifetime, 0);
    s.muted = !!data.muted;
    s.credits = Math.max(0, num(data.credits, 0));
    s.totalEarned = num(data.totalEarned, 0);
    if (data.lvl) for (const k in s.lvl) s.lvl[k] = Math.max(0, num(data.lvl[k], 0) | 0);
    const valid = c => typeof c === 'number' && c >= 0 && SF.PLANETS[Math.floor(c / 10)] && SF.PLANETS[Math.floor(c / 10)].resources[c % 10];
    if (Array.isArray(data.stack)) s.stack = data.stack.filter(valid);
    if (data.player && isFinite(data.player.x) && isFinite(data.player.y)) s.player = { x: data.player.x, y: data.player.y };
    if (data.hold) for (const c in data.hold) if (valid(+c) && data.hold[c] > 0) s.hold[c] = data.hold[c] | 0;
    const counts = (o) => { const r = {}; if (o) for (const c in o) if (valid(+c) && o[c] > 0) r[c] = o[c] | 0; return r; };
    s.chest = counts(data.chest);
    s.chestLvl = Math.max(0, num(data.chestLvl, 0) | 0);
    s.hallLvl = Math.max(0, num(data.hallLvl, 0) | 0);
    if (Array.isArray(data.inbound)) s.inbound = data.inbound.filter(f => f && f.items).map(f => ({ t: num(f.t, 0), items: counts(f.items), from: num(f.from, 0) | 0 }));
    if (Array.isArray(data.crew)) s.crew = data.crew.filter(w => w && valid(w.job)).map(w => ({ job: w.job, food: num(w.food, 0) }));
    s.worlds = {};
    if (data.worlds) for (const k in data.worlds) {
      const pi = +k, w = data.worlds[k];
      if (!SF.PLANETS[pi] || !w) continue;
      this.ensureWorld(s, pi);
      const into = s.worlds[pi];
      into.drones = Math.max(0, num(w.drones, 0) | 0);
      into.wh = counts(w.wh);
      if (w.rk) { const load = counts(w.rk.load); into.rk = { load, n: Object.values(load).reduce((a, b) => a + b, 0), away: Math.max(0, num(w.rk.away, 0)) }; }
      for (const id in into.plots) {
        const p = w.plots && w.plots[id];
        if (p) Object.assign(into.plots[id], { paid: num(p.paid, 0), built: !!p.built || into.plots[id].built, lvl: num(p.lvl, 0) | 0, pile: num(p.pile, 0) | 0, belt: !!p.belt, res: p.res || {} });
      }
    }
    this.ensureWorld(s, s.planet);
    return s;
  },

  // First release saved resource names and four fixed plots.
  migrateV1(d) {
    const ids = ['shard', 'ember', 'glowcap', 'frost', 'pearl'];
    const p = d.plots || {};
    return { v: 2, planet: 0, stars: 0, credits: (d.credits || 0) + (p.void && p.void.built ? 1800 : 0),
      totalEarned: d.totalEarned || 0, lifetime: d.totalEarned || 0, lvl: d.lvl, drones: d.drones, muted: d.muted,
      plots: { g2: p.ember, h1: p.drones, ref: p.refinery },
      stack: (d.stack || []).map(t => ids.indexOf(t)).filter(i => i >= 0) };
  },

  // v2 had one set of plots, tier numbers in the stack and prices ten times lower.
  migrateV2(d) {
    if ((d.planet | 0) >= SF.CFG.home) {
      return { v: 3, planet: SF.CFG.home, stars: 3, homeReached: true, lifetime: (d.lifetime || 0) * 10, muted: d.muted };
    }
    const plots = {};
    for (const k in d.plots || {}) if (d.plots[k]) plots[k] = Object.assign({}, d.plots[k], { paid: (d.plots[k].paid || 0) * 10 });
    return { v: 3, planet: d.planet | 0, stars: d.stars | 0, lifetime: (d.lifetime || 0) * 10, muted: d.muted,
      credits: (d.credits || 0) * 10, totalEarned: (d.totalEarned || 0) * 10, lvl: d.lvl, player: d.player,
      stack: (d.stack || []).map(t => (d.planet | 0) * 10 + t),
      worlds: { [d.planet | 0]: { plots, drones: d.drones } } };
  },

  // Keep the save small: round money, drop default fields.
  compact(s) {
    const worlds = {};
    for (const k in s.worlds) {
      const plots = {}, w = s.worlds[k];
      for (const id in w.plots) {
        const p = w.plots[id], res = Object.keys(p.res || {}).length ? p.res : undefined;
        if (p.paid || p.built || p.lvl || p.pile || res) plots[id] = { paid: Math.floor(p.paid) || undefined, built: p.built || undefined, lvl: p.lvl || undefined, pile: p.pile || undefined, belt: p.belt || undefined, res };
      }
      const wh = w.wh && Object.keys(w.wh).length ? w.wh : undefined;
      const rk = w.rk && (w.rk.n || w.rk.away) ? { load: w.rk.load, away: Math.round(w.rk.away * 10) / 10 || undefined } : undefined;
      worlds[k] = { plots, drones: w.drones || undefined, wh, rk };
    }
    return Object.assign({}, s, {
      credits: Math.round(s.credits * 100) / 100, totalEarned: Math.round(s.totalEarned), lifetime: Math.round(s.lifetime),
      worlds, crew: s.crew.map(w => ({ job: w.job, food: Math.round(w.food * 10) / 10 })),
      inbound: s.inbound.map(f => ({ t: Math.round(f.t * 10) / 10, items: f.items, from: f.from })),
    });
  },

  load() {
    try { const raw = localStorage.getItem(this.KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  },
  write(data) { try { localStorage.setItem(this.KEY, JSON.stringify(this.compact(data))); } catch (e) {} },
  clear() { try { localStorage.removeItem(this.KEY); } catch (e) {} },
};
