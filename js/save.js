// Progress lives in localStorage. Every access is guarded: storage can be blocked.
SF.Save = {
  KEY: 'shardfall-outpost-v1',
  VERSION: 3,

  // Buildings and drones of one planet. A finished campaign planet comes fully built.
  freshWorld(pi, finished) {
    const plots = {};
    for (const p of SF.layoutPlanet(SF.PLANETS[pi]).plots) {
      // Machines unlocked by research are never part of a finished planet: you build them yourself.
      plots[p.id] = { paid: 0, built: !!((finished && !p.research) || p.prebuilt), lvl: 0, pile: 0, res: {} };
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
      smelt: { q: {}, out: {}, hauler: false, hand: 0, driver: false, heat: 0, t: 0 },
      research: {}, charted: {}, fuel: 0, fuelUse: {}, fleet: { own: {}, frame: {} }, kitchen: { meal: 0, drink: 0, drivers: 0, t: 0 },
    }, keep || {});
    if (!s.worlds[s.planet]) s.worlds[s.planet] = this.freshWorld(s.planet, false);
    return s;
  },

  // Create a planet's buildings the first time you visit it, and fill in plots added later.
  ensureWorld(s, pi) {
    const fresh = this.freshWorld(pi, pi < SF.CFG.home && s.homeReached);
    if (!s.worlds[pi]) { s.worlds[pi] = fresh; return; }
    for (const id in fresh.plots) if (!s.worlds[pi].plots[id]) s.worlds[pi].plots[id] = fresh.plots[id];
    // Older saves got research machines on finished planets for free, without the research; take those back.
    for (const p of SF.layoutPlanet(SF.PLANETS[pi]).plots) {
      const st = s.worlds[pi].plots[p.id];
      if (p.research && st && st.built && !(st.paid > 0)) Object.assign(st, { built: false, lvl: 0, pile: 0, driver: false, belt: false, mk: 0 });
      // Research machines stand too far out for belts: a belt one got before that rule is refunded.
      if (p.research && st && st.belt) { st.belt = false; const n = SF.CFG.conveyor.needs; for (const c in n) s.hold[c] = (s.hold[c] || 0) + n[c]; }
    }
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
    const valid = c => typeof c === 'number' && c >= 0 && !!(SF.INGOTS[c] || (SF.PLANETS[Math.floor(c / 10)] && SF.PLANETS[Math.floor(c / 10)].resources[c % 10]));
    if (Array.isArray(data.stack)) s.stack = data.stack.filter(valid);
    if (data.player && isFinite(data.player.x) && isFinite(data.player.y)) s.player = { x: data.player.x, y: data.player.y };
    if (data.hold) for (const c in data.hold) if (valid(+c) && data.hold[c] > 0) s.hold[c] = data.hold[c] | 0;
    const counts = (o) => { const r = {}; if (o) for (const c in o) if (valid(+c) && o[c] > 0) r[c] = o[c] | 0; return r; };
    s.chest = counts(data.chest);
    s.chestLvl = Math.max(0, num(data.chestLvl, 0) | 0);
    s.hallLvl = Math.max(0, num(data.hallLvl, 0) | 0);
    const sm = data.smelt || {};
    s.smelt = { q: counts(sm.q), out: counts(sm.out), hauler: !!sm.hauler, hand: Math.max(0, num(sm.hand, 0) | 0), driver: !!sm.driver, heat: Math.max(0, num(sm.heat, 0) | 0), t: 0 };
    if (data.research) for (const n of SF.RESEARCH_NODES) { const l = num(data.research[n.id], 0) | 0; if (l > 0) s.research[n.id] = Math.min(n.max, l); }
    if (data.charted) for (const k in data.charted) if (SF.PLANETS[+k] && SF.PLANETS[+k].far && data.charted[k]) s.charted[+k] = 1;
    s.fuel = Math.max(0, Math.min(SF.CFG.fuel.cap, num(data.fuel, 0)));
    if (data.fuelUse) for (const i of SF.CFG.fuel.inputs) if (data.fuelUse[i.code] === false) s.fuelUse[i.code] = false;
    const fl = data.fleet || {};
    for (const id in SF.CFG.rockets.models) {
      if (fl.own && fl.own[id] && id !== 'std') s.fleet.own[id] = 1;
      const f = fl.frame ? num(fl.frame[id], 0) | 0 : 0;
      if (f > 0) s.fleet.frame[id] = Math.min(SF.CFG.rockets.frame.max, f);
    }
    const kt = data.kitchen || {};
    s.kitchen = { meal: Math.max(0, num(kt.meal, 0) | 0), drink: Math.max(0, num(kt.drink, 0) | 0), feast: Math.max(0, num(kt.feast, 0) | 0), elixir: Math.max(0, num(kt.elixir, 0) | 0), drivers: Math.max(0, num(kt.drivers, 0) | 0), t: 0 };
    if (Array.isArray(data.inbound)) s.inbound = data.inbound.filter(f => f && f.items).map(f => ({ t: num(f.t, 0), items: counts(f.items), from: num(f.from, 0) | 0 }));
    if (Array.isArray(data.crew)) s.crew = data.crew.filter(w => w && valid(w.job)).map(w => ({ job: w.job, food: Math.min(SF.CFG.food.fine, num(w.food, 1)), water: Math.min(SF.CFG.food.fine, num(w.water, 1)) }));
    s.worlds = {};
    if (data.worlds) for (const k in data.worlds) {
      const pi = +k, w = data.worlds[k];
      if (!SF.PLANETS[pi] || !w) continue;
      this.ensureWorld(s, pi);
      const into = s.worlds[pi];
      into.drones = Math.max(0, num(w.drones, 0) | 0);
      into.wh = counts(w.wh);
      into.whLvl = Math.max(0, Math.min(SF.CFG.hub.wh.max, w.whLvl | 0));
      if (SF.CFG.rockets.models[w.model] && w.model !== 'std') into.model = w.model;
      if (w.pantry) into.pantry = { meal: Math.max(0, num(w.pantry.meal, 0) | 0), drink: Math.max(0, num(w.pantry.drink, 0) | 0), feast: Math.max(0, num(w.pantry.feast, 0) | 0), elixir: Math.max(0, num(w.pantry.elixir, 0) | 0) };
      // The old fixed home buildings move onto the new New Haven lots.
      if (pi === SF.CFG.home && w.plots) {
        const MOVE = { fac: ['L1', 'factory', 30000, { 112: 40, 122: 20 }], hab1: ['L3', 'habitat', 15000, { 10: 50, 21: 30 }],
          hab2: ['L4', 'habitat', 30000, { 10: 80, 21: 60, 0: 40 }], hab3: ['L6', 'habitat', 60000, { 10: 120, 21: 90, 3: 30 }] };
        for (const id in MOVE) {
          const o = w.plots[id];
          if (!o || w.plots[MOVE[id][0]] || (!o.built && !o.paid && !(o.res && Object.keys(o.res).length))) continue;
          const [lot, kind, cost, needs] = MOVE[id];
          w.plots[lot] = Object.assign({}, o, { kind, cost, needs });
        }
      }
      const rocket = q => { const load = counts(q.load), r = { load, model: SF.CFG.rockets.models[q.model] ? q.model : undefined, kind: SF.CFG.rockets.models[q.kind] ? q.kind : undefined, n: num(q.n, 0) | 0, away: Math.max(0, num(q.away, 0)), out: num(q.out, 0) | 0, fl: num(q.fl, 0) || undefined, total: num(q.total, 0) || undefined, food: q.food && { meal: num(q.food.meal, 0) | 0, drink: num(q.food.drink, 0) | 0, feast: num(q.food.feast, 0) | 0, elixir: num(q.food.elixir, 0) | 0 } }; if (!r.n) r.n = Object.values(load).reduce((a, b) => a + b, 0); return r; };
      if (w.rk) into.rk = rocket(w.rk);
      into.extra = Math.max(0, Math.min(SF.CFG.rockets.extra.max, num(w.extra, 0) | 0));
      if (into.extra) into.more = Array.from({ length: into.extra }, (_, i) => (Array.isArray(w.more) && w.more[i] ? rocket(w.more[i]) : { load: {}, n: 0, away: 0, out: 0 }));
      for (const id in into.plots) {
        const p = w.plots && w.plots[id];
        if (p) Object.assign(into.plots[id], { paid: num(p.paid, 0), built: !!p.built || into.plots[id].built, lvl: num(p.lvl, 0) | 0, pile: num(p.pile, 0) | 0, belt: !!p.belt, mk: p.mk ? 1 : 0, driver: !!p.driver, beltLvl: Math.max(0, Math.min(3, num(p.beltLvl, 0) | 0)), res: p.res || {} });
        if (p && SF.BUILDS[p.kind] && p.needs) Object.assign(into.plots[id], { kind: p.kind, cost: num(p.cost, 0), needs: counts(p.needs) });
        // Home buildings used to take raw ore; what was already paid in counts as ingots.
        const res = into.plots[id].res;
        for (const ore of [12, 22]) if (pi === SF.CFG.home && res[ore]) { res[ore + 100] = (res[ore + 100] || 0) + res[ore]; delete res[ore]; }
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
        if (p.paid || p.built || p.lvl || p.pile || res || p.kind) plots[id] = { paid: Math.floor(p.paid) || undefined, built: p.built || undefined, lvl: p.lvl || undefined, pile: p.pile || undefined, belt: p.belt || undefined, mk: p.mk || undefined, driver: p.driver || undefined, beltLvl: p.beltLvl || undefined, res, kind: p.kind, cost: p.kind ? p.cost : undefined, needs: p.kind ? p.needs : undefined };
      }
      const wh = w.wh && Object.keys(w.wh).length ? w.wh : undefined;
      const pack = q => (q && (q.n || q.away || q.kind) ? { load: q.load, kind: q.kind || undefined, n: q.n, out: q.out || undefined, away: Math.round(q.away * 10) / 10 || undefined, fl: q.fl, total: q.total, model: q.away ? q.model : undefined, food: q.food || undefined } : undefined);
      const rk = pack(w.rk), more = w.extra ? (w.more || []).map(q => pack(q) || {}) : undefined;
      const pantry = w.pantry && (w.pantry.meal || w.pantry.drink || w.pantry.feast || w.pantry.elixir) ? w.pantry : undefined;
      worlds[k] = { plots, drones: w.drones || undefined, wh, whLvl: w.whLvl || undefined, model: w.model && w.model !== 'std' ? w.model : undefined, rk, extra: w.extra || undefined, more, pantry };
    }
    return Object.assign({}, s, {
      credits: Math.round(s.credits * 100) / 100, totalEarned: Math.round(s.totalEarned), lifetime: Math.round(s.lifetime),
      worlds, smelt: { q: s.smelt.q, out: s.smelt.out, hauler: s.smelt.hauler || undefined, hand: s.smelt.hand || undefined, driver: s.smelt.driver || undefined, heat: s.smelt.heat || undefined },
      crew: s.crew.map(w => ({ job: w.job, food: Math.round(w.food * 100) / 100, water: Math.round((w.water == null ? 1 : w.water) * 100) / 100 })),
      kitchen: { meal: s.kitchen.meal, drink: s.kitchen.drink, feast: s.kitchen.feast || undefined, elixir: s.kitchen.elixir || undefined, drivers: s.kitchen.drivers || undefined },
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
