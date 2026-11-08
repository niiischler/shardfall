// Shipping network once Halcyon is reached: warehouses and cargo rockets on the other planets,
// the big hall on Halcyon (where rockets land), and the portable material chest.
SF.Hub = (function () {
  const C = SF.CFG, H = C.hub;
  let loadT = 0;

  const hold = c => SF.state.hold[c] || 0;
  const chestCount = () => Object.values(SF.state.chest).reduce((a, b) => a + b, 0);
  const chestCap = () => H.chest.base + H.chest.step * SF.state.chestLvl;
  const hallCap = () => H.hall.base + H.hall.step * SF.state.hallLvl;
  const upCost = (u, lvl) => Math.round(u.cost * Math.pow(u.growth, lvl));
  const chestCost = () => upCost(H.chest, SF.state.chestLvl);
  const hallCost = () => upCost(H.hall, SF.state.hallLvl);
  // Warehouses on the other planets hold a limited number of items in total. When one is full, drones, belts,
  // drivers and crew wait (and you cannot unload) until the cargo rocket takes a load away.
  const whCap = ws => H.wh.base + H.wh.step * ((ws || SF.ws()).whLvl || 0);
  const whFull = ws => { ws = ws || SF.ws(); return SF.hubActive() || ws !== SF.ws() ? whCount(ws) >= whCap(ws) : false; };
  const whCost = () => Math.round(upCost(H.wh, SF.ws().whLvl || 0) * SF.mult());
  function upgradeWarehouse() {
    const ws = SF.ws();
    if (!SF.hubActive() || (ws.whLvl || 0) >= H.wh.max || !SF.spend(whCost())) return false;
    ws.whLvl = (ws.whLvl || 0) + 1;
    SF.FX.burst(C.depot.x, C.depot.y - 40, ['#ffd36b', '#fff4e8'], 30, { z: 30, speed: 240, size: 4 });
    SF.FX.pop(C.depot.x, C.depot.y - 140, 'Warehouse holds ' + whCap(ws), '#ffd36b', 18);
    SF.save(); SF.UI.refresh();
    return true;
  }

  // Sale value when the hall is full: Halcyon's refinery and your perks apply.
  function overflowValue(code) {
    const home = SF.state.worlds[C.home], ref = home && home.plots.ref && home.plots.ref.built;
    return SF.resValue(code) * (ref ? C.refineryMult : 1) * (1 + C.perks.sale * SF.state.stars);
  }

  // Put n items into the hall; whatever does not fit is sold. Returns the credits earned.
  function deliver(code, n) {
    const s = SF.state, room = Math.max(0, hallCap() - hold(code)), keep = Math.min(room, n), sold = n - keep;
    if (keep) s.hold[code] = hold(code) + keep;
    if (!sold) return 0;
    const v = sold * overflowValue(code);
    s.credits += v; s.totalEarned += v; s.lifetime += v;
    return v;
  }

  function deliverAll(items) {
    let credits = 0, n = 0;
    for (const c in items) { credits += deliver(+c, items[c]); n += items[c]; }
    return { credits, n };
  }

  // ---------- planet side: warehouse buffer and cargo rocket ----------
  // Every campaign planet has one cargo rocket. Its whole trip runs on the `away` timer, so it keeps
  // flying wherever you are: lift off, fly to Halcyon, land on its pad, unload, fly back, land.
  function rk(ws) {
    if (!ws.rk) ws.rk = { load: {}, n: 0, away: 0, out: 0 };
    return ws.rk;
  }

  function toWarehouse(code, ws) {
    ws = ws || SF.ws();
    ws.wh = ws.wh || {};
    ws.wh[code] = (ws.wh[code] || 0) + 1;
  }
  const whCount = ws => Object.values(ws.wh || {}).reduce((a, b) => a + b, 0);

  function launchCargo(pi, supply) {
    pi = pi == null ? SF.state.planet : pi;
    const ws = SF.state.worlds[pi], r = rk(ws);
    if ((!r.n && !supply) || r.away > 0) return false;
    // The trip length is fixed at lift-off, so research during a flight never makes a rocket jump.
    r.fl = SF.rocketFlight(); r.total = 2 * r.fl + H.unload;
    r.away = r.total; r.out = 0; r.food = null; r.packed = false;
    if (pi === SF.state.planet) {
      SF.Audio.rocket(0.8); SF.FX.shake(0.3);
      SF.FX.pop(H.pad.x, H.pad.y - 170, 'Cargo rocket launched to Halcyon', '#ffd36b', 18, { life: 1.6 });
      SF.save(); SF.UI.refresh();
    }
    return true;
  }

  // Seconds since lift-off, and where in its trip a rocket is.
  const fl = r => r.fl || H.flight;
  const total = r => r.total || H.away;
  const elapsed = r => total(r) - r.away;
  function phase(r) {
    if (r.away <= 0) return 'home';
    const e = elapsed(r), F = fl(r);
    if (e < F) return 'out';
    if (e < F + H.unload) return 'unload';
    return 'back';
  }

  // Unload into the hall bit by bit while the rocket stands on its pad.
  function unloadStep(pi, r) {
    const want = Math.min(r.n, Math.ceil(r.n * Math.min(1, (elapsed(r) - fl(r)) / H.unload)));
    let credits = 0, moved = 0;
    while (r.out < want) {
      const code = +Object.keys(r.load).find(c => r.load[c] > 0);
      if (isNaN(code)) { r.out = want; break; }
      r.load[code]--; if (!r.load[code]) delete r.load[code];
      credits += deliver(code, 1); r.out++; moved++;
      if (SF.state.planet === C.home) {
        const p = pads()[pi % 3], h = SF.World.hall;
        SF.fly(code, p.x, p.y - 50, () => ({ x: h.x, y: h.y - 40 }), { dur: 0.45, arc: 40, delay: moved * 0.03 });
      }
    }
    if (moved && SF.state.planet === C.home) {
      // Only as loud as the hall is close: across the map you hardly hear it.
      const h = SF.World.hall, v = SF.near(h.x, h.y);
      if (v > 0.02) SF.Audio.store(SF.state.hold[C.crew.food] || moved, v);
      if (credits) SF.earnFx(credits, h.x, h.y - 130);
    }
  }

  // While you are on another planet, belted producers and drones keep filling the warehouse.
  const layouts = {};
  function offlineWork(pi, ws, dt) {
    const L = layouts[pi] || (layouts[pi] = SF.layoutPlanet(SF.PLANETS[pi]));
    if (ws.drones > 0) {
      // Drones take turns between the resources of every open region.
      const tiers = L.regions.filter(r => r.res != null && r.res <= 2 && (!r.unlock || (ws.plots[r.unlock] && ws.plots[r.unlock].built))).map(r => r.res);
      ws.droneT = (ws.droneT || 0) + dt * ws.drones * (SF.droneSpeed() / C.drone.speed) * (0.5 + 0.5 * SF.dronePower()) * (SF.droneCap() / C.drone.cap);
      while (ws.droneT >= C.drone.awayEvery) {
        ws.droneT -= C.drone.awayEvery;
        ws.droneTurn = ((ws.droneTurn || 0) + 1) % tiers.length;
        if (!whFull(ws)) toWarehouse(pi * 10 + tiers[ws.droneTurn], ws);
      }
    }
    for (const p of L.plots) {
      const st = ws.plots[p.id];
      if (p.kind !== 'producer' || !st || !st.built) continue;
      const ps = SF.producerStats(p, st);
      st.t = (st.t || 0) + dt;
      while (st.t >= ps.every) { st.t -= ps.every; if (st.pile < ps.cap) st.pile++; }
      // A belt moves one item per belt step (faster with belt upgrades); a driver brings full loads.
      if (st.belt && !whFull(ws)) {
        const be = SF.beltEvery(st);
        st.beltT = (st.beltT || 0) + dt;
        while (st.beltT >= be && st.pile > 0 && !whFull(ws)) { st.beltT -= be; st.pile--; toWarehouse(pi * 10 + p.helper.res, ws); }
        if (!st.pile) st.beltT = Math.min(st.beltT, be);
      }
      if (st.driver && !whFull(ws)) SF.Haul.away(pi, p, st, dt, c => toWarehouse(c, ws));
    }
  }

  // ---------- portable chest (other planets) ----------
  function storeChest(code, x, y) {
    if (chestCount() >= chestCap()) return false;
    const c = SF.World.chest;
    SF.state.chest[code] = (SF.state.chest[code] || 0) + 1;
    SF.fly(code, x, y, () => ({ x: c.x, y: c.y - 40 }), { dur: 0.36, arc: 50, onArrive() { SF.Audio.store(chestCount()); } });
    return true;
  }

  // On arrival at Halcyon the chest is emptied into the hall.
  function unpackChest() {
    const r = deliverAll(SF.state.chest);
    SF.state.chest = {};
    return r;
  }

  // ---------- hall (Halcyon) ----------
  function storeHall(code, x, y) {
    const h = SF.World.hall;
    SF.fly(code, x, y, () => ({ x: h.x, y: h.y - 50 }), {
      dur: 0.36, arc: 50,
      onArrive(f) {
        const v = deliver(f.code, 1);
        SF.Audio.store(hold(f.code));
        if (v) { SF.earnFx(v, h.x, h.y - 90); }
        else SF.FX.pop(h.x + (Math.random() - 0.5) * 40, h.y - 110, '+1 ' + SF.res(f.code).name, SF.res(f.code).color, 14, { life: 0.8 });
      },
    });
  }

  function upgradeChest() {
    if (SF.state.chestLvl >= H.chest.max || !SF.spend(chestCost())) return false;
    SF.state.chestLvl++;
    const c = SF.World.chest;
    if (c) { SF.FX.burst(c.x, c.y - 30, ['#ffd36b', '#fff4e8'], 24, { z: 20, speed: 200, size: 4 }); SF.FX.pop(c.x, c.y - 90, 'Chest holds ' + chestCap(), '#ffd36b', 18); }
    SF.save(); SF.UI.refresh();
    return true;
  }

  function upgradeHall() {
    if (SF.state.hallLvl >= H.hall.max || !SF.spend(hallCost())) return false;
    SF.state.hallLvl++;
    const h = SF.World.hall;
    if (h) { SF.FX.burst(h.x, h.y - 40, ['#ffd36b', '#fff4e8'], 30, { z: 30, speed: 240, size: 4 }); SF.FX.pop(h.x, h.y - 140, 'Hall holds ' + hallCap() + ' of each', '#ffd36b', 18); }
    SF.save(); SF.UI.refresh();
    return true;
  }

  // Landing pads behind the hall.
  const pads = () => { const h = SF.World.hall; return [-150, 0, 150].map((dx, i) => ({ x: h.x + dx, y: h.y - 125 - (i === 1 ? 45 : 0) })); };

  // ---------- update ----------
  function update(dt) {
    const s = SF.state;
    // Rockets from an older save that were already in the air simply arrive.
    if (s.inbound.length) { for (const f of s.inbound) deliverAll(f.items); s.inbound.length = 0; }
    if (!s.homeReached) return;
    loadT -= dt;
    // Machines on Halcyon keep working while you are away; their drivers bring the stock to the hall.
    const hw = s.worlds[C.home];
    if (hw && s.planet !== C.home) {
      const L = layouts[C.home] || (layouts[C.home] = SF.layoutPlanet(SF.PLANETS[C.home]));
      for (const p of L.plots) {
        const st = hw.plots[p.id];
        if (p.kind !== 'producer' || !st || !st.built) continue;
        const ps = SF.producerStats(p, st);
        st.t = (st.t || 0) + dt;
        while (st.t >= ps.every) { st.t -= ps.every; if (st.pile < ps.cap) st.pile++; }
        if (st.driver) SF.Haul.away(C.home, p, st, dt, c => deliver(c, 1));
      }
    }
    for (const k in s.worlds) {
      const pi = +k, ws = s.worlds[k];
      if (pi === C.home) continue;
      const r = rk(ws), here = pi === s.planet;
      if (!here) offlineWork(pi, ws, dt);
      if (r.away > 0) {
        const before = phase(r);
        r.away = Math.max(0, r.away - dt);
        const now = phase(r);
        // Even after a long frame (or a tab in the background) the cargo always arrives.
        if (elapsed(r) >= fl(r) && r.out < r.n) unloadStep(pi, r);
        // Leaving Halcyon: take food out to the crew working on that planet.
        if (elapsed(r) >= fl(r) + H.unload && !r.packed) { r.packed = true; r.food = SF.Food.pack(pi); }
        if (r.away <= 0) { SF.Food.unpack(pi, r.food); r.load = {}; r.n = 0; r.out = 0; r.food = null; r.packed = false; }
        if (s.planet === C.home && before === 'out' && fl(r) - elapsed(r) < 2.4 && !r.heard) { r.heard = true; const h = SF.World.hall; SF.Audio.land(0.6 * SF.near(h.x, h.y)); }
        if (now !== 'out') r.heard = false;
        continue;
      }
      // Load the warehouse stock into the rocket: animated where you are, instantly elsewhere.
      while (r.n < SF.rocketCap() && whCount(ws) > 0 && (!here || loadT <= 0)) {
        // Take turns between the resources in stock, so a fast one never starves the others.
        const keys = Object.keys(ws.wh).filter(c => ws.wh[c] > 0).sort((a, b) => a - b);
        r.turn = ((r.turn || 0) + 1) % keys.length;
        const code = +keys[r.turn];
        ws.wh[code]--; if (!ws.wh[code]) delete ws.wh[code];
        r.load[code] = (r.load[code] || 0) + 1; r.n++;
        if (here) { loadT = 0.1; SF.fly(code, C.depot.x + 40, C.depot.y - 30, () => ({ x: H.pad.x, y: H.pad.y - 60 }), { dur: 0.4, arc: 40 }); break; }
      }
      if (r.n >= SF.rocketCap()) launchCargo(pi);
      // Its crew is running out of food: fly now with whatever is loaded.
      else if (SF.Food.needsSupply(pi)) launchCargo(pi, true);
    }
  }

  // Cargo rockets visible at the hall on Halcyon: one pad per planet.
  function arrivals() {
    const out = [];
    for (const k in SF.state.worlds) {
      const pi = +k, r = SF.state.worlds[k].rk;
      if (pi === C.home || !r || r.away <= 0) continue;
      const e = elapsed(r), F = fl(r), U = H.unload;
      let h = null, fire = false;
      if (e >= F - 2.4 && e < F) { h = Math.pow(F - e, 2) * 90; fire = true; }
      else if (e >= F && e < F + U) h = 0;
      else if (e >= F + U && e < F + U + 2.4) { h = Math.pow(e - F - U, 2) * 120; fire = true; }
      out.push({ pi, pad: pi % 3, h, fire, e, r });
    }
    return out;
  }

  // What each hall pad shows above it.
  function padLabel(pi) {
    const ws = SF.state.worlds[pi], name = SF.planetName(pi);
    if (!ws) return [name.toUpperCase(), 'not visited yet'];
    const r = rk(ws), p = phase(r), e = elapsed(r);
    if (p === 'out') return [name.toUpperCase(), `lands in ${Math.ceil(fl(r) - e)}s`];
    if (p === 'unload') return [name.toUpperCase(), 'unloading'];
    if (p === 'back') return [name.toUpperCase(), `back on ${name} in ${Math.ceil(r.away)}s`];
    return [name.toUpperCase(), `loading ${r.n}/${SF.rocketCap()}`];
  }

  const inFlight = () => Object.keys(SF.state.worlds).filter(k => +k !== C.home && SF.state.worlds[k].rk && SF.state.worlds[k].rk.away > 0).length;

  // Height of the cargo rocket above its pad: lifting off, away, coming back.
  function cargoLift() {
    const r = rk(SF.ws());
    if (r.away <= 0) return 0;
    const gone = total(r) - r.away;
    if (gone < 2.5) return Math.pow(gone, 2) * 120;
    if (r.away < 2.5) return Math.pow(r.away, 2) * 120;
    return null;               // out of sight
  }

  function enter() {}

  return {
    arrivals, padLabel, inFlight, phase, pads, hold, chestCount, chestCap, hallCap, chestCost, hallCost, deliver, deliverAll, overflowValue,
    rk, toWarehouse, whCount, whCap, whFull, whCost, upgradeWarehouse, launchCargo, storeChest, unpackChest, storeHall, upgradeChest, upgradeHall, update, cargoLift, enter,
  };
})();
