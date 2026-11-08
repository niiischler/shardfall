// Smelter on Halcyon: iron and copper ore from the hall become ingots, which the home buildings and belts need.
// First you carry the ore over yourself; after that a hired driver runs a tractor between the hall and the smelter.
SF.Smelter = (function () {
  const C = SF.CFG, K = C.smelter;
  let tractor = null, smokeT = 0;

  const sm = () => SF.state.smelt;
  const isOre = c => K.ores.includes(+c);
  const queued = () => Object.values(sm().q).reduce((a, b) => a + b, 0);
  const room = () => Math.max(0, K.queue - queued());
  const every = () => K.every / (1 + K.heat.boost * sm().heat);
  const heatCost = () => Math.round(K.heat.base * Math.pow(K.heat.growth, sm().heat));
  const canHire = () => sm().hand >= K.byHand;
  const oreInHall = () => K.ores.reduce((a, c) => a + (SF.state.hold[c] || 0), 0);
  const visible = () => SF.state.planet === C.home && SF.World.smelter;

  // Ore into the furnace. Ore you bring yourself counts toward hiring a driver.
  function feed(code, byHand) {
    if (!isOre(code) || room() <= 0) return false;
    const s = sm();
    s.q[code] = (s.q[code] || 0) + 1;
    if (byHand) s.hand++;
    return true;
  }

  // Take one ore out of the hall, taking turns between iron and copper.
  function takeOre() {
    const h = SF.state.hold, s = sm();
    for (let i = 0; i < K.ores.length; i++) {
      s.turn = ((s.turn || 0) + 1) % K.ores.length;
      const c = K.ores[s.turn];
      if ((h[c] || 0) > 0) { h[c]--; if (!h[c]) delete h[c]; return c; }
    }
    return null;
  }

  // One ore becomes one ingot, which goes into the hall.
  function smeltOne() {
    const s = sm(), codes = Object.keys(s.q).filter(c => s.q[c] > 0);
    if (!codes.length) return false;
    s.pick = ((s.pick || 0) + 1) % codes.length;
    const ore = +codes[s.pick];
    s.q[ore]--; if (!s.q[ore]) delete s.q[ore];
    const bar = ore + 100;
    if (visible()) {
      const W = SF.World, m = W.smelter, h = W.hall;
      SF.Audio.smelt();
      SF.FX.burst(m.x - 82, m.y - 30, ['#ffd36b', '#ff8f5a', '#fff1a0'], 6, { z: 10, speed: 90, up: 160, size: 3, life: 0.6 });
      SF.fly(bar, m.x - 82, m.y - 30, () => ({ x: h.x, y: h.y - 50 }), {
        dur: 1.2, arc: 170,
        onArrive(f) {
          const v = SF.Hub.deliver(f.code, 1);
          SF.Audio.store(SF.state.hold[f.code] || 1);
          if (v) SF.earnFx(v, h.x, h.y - 90);
          else SF.FX.pop(h.x + (Math.random() - 0.5) * 40, h.y - 110, '+1 ' + SF.res(f.code).name, SF.res(f.code).color, 14, { life: 0.8 });
        },
      });
    } else SF.Hub.deliver(bar, 1);
    return true;
  }

  function hireDriver() {
    const s = sm();
    if (s.driver || !canHire() || !SF.spend(K.driver)) return false;
    s.driver = true;
    if (visible()) { const p = dock('pickup'); SF.FX.pop(p.x, p.y - 100, 'Tractor driver hired', '#ffab4a', 20); SF.Audio.build(); }
    SF.save(); SF.UI.refresh();
    return true;
  }

  function upgradeHeat() {
    const s = sm();
    if (s.heat >= K.heat.max || !SF.spend(heatCost())) return false;
    s.heat++;
    const m = SF.World.smelter;
    if (m) { SF.FX.burst(m.x, m.y - 60, ['#ff8f5a', '#ffd36b'], 30, { z: 30, speed: 220, size: 4 }); SF.FX.pop(m.x, m.y - 150, 'Hotter furnace', '#ff8f5a', 18); }
    SF.save(); SF.UI.refresh();
    return true;
  }

  // Where the tractor stops: beside the ore pickup, and beside the smelter's hopper.
  function dock(which) {
    return K.road[which === 'pickup' ? 1 : 0];
  }
  // Seconds for one round trip, used while you are on another planet.
  const tripTime = () => 2 * Math.hypot(K.road[1].x - K.road[0].x, K.road[1].y - K.road[0].y) / K.tractor.speed + 2 * K.tractor.cap * K.tractor.load;

  function updateTractor(dt) {
    if (!tractor) { const p = dock('pickup'); tractor = { x: p.x, y: p.y, face: -1, walk: 0, cargo: [], n: 0, state: 'load', t: 0, idle: 0, wait: '' }; }
    const tr = tractor, k = K.tractor, W = SF.World;
    tr.wait = '';
    let goal = null;
    if (tr.state === 'load') {
      tr.t -= dt;
      if (tr.n < k.cap && tr.t <= 0) {
        const c = room() > tr.n ? takeOre() : null;
        if (c != null) {
          tr.t = k.load; tr.idle = 0; tr.n++;
          SF.fly(c, W.hall.x - 100, W.hall.y - 30, () => ({ x: tr.x - tr.face * 62, y: tr.y - 34 }), { dur: 0.35, arc: 40, onArrive() { tr.cargo.push(c); SF.Audio.pick(tr.cargo.length); } });
        } else tr.idle += dt;
      }
      // Drive off once everything is on the trailer and it is full, or no more ore is coming.
      if (tr.n > 0 && tr.cargo.length === tr.n && (tr.n >= k.cap || tr.idle > 1.2)) tr.state = 'go';
      else if (!tr.n && tr.idle > 0.5) tr.wait = room() <= 0 ? 'furnace full' : 'waiting for ore';
    }
    if (tr.state === 'go') { goal = dock('smelter'); if (Math.hypot(goal.x - tr.x, goal.y - tr.y) < 6) { tr.state = 'unload'; tr.t = 0.3; goal = null; } }
    if (tr.state === 'unload') {
      tr.t -= dt;
      if (tr.t <= 0 && tr.cargo.length) {
        if (room() > 0) {
          const c = tr.cargo.pop(), m = W.smelter;
          tr.n = tr.cargo.length;
          tr.t = k.load;
          SF.fly(c, tr.x - tr.face * 62, tr.y - 34, () => ({ x: m.x + 87, y: m.y - 96 }), { dur: 0.4, arc: 50, onArrive(f) { feed(f.code, false); SF.Audio.store(queued()); } });
        } else tr.wait = 'furnace full';
      }
      if (!tr.cargo.length && tr.t <= 0) tr.state = 'back';
    }
    if (tr.state === 'back') { goal = dock('pickup'); if (Math.hypot(goal.x - tr.x, goal.y - tr.y) < 6) { tr.state = 'load'; tr.t = 0.2; tr.idle = 0; tr.n = 0; goal = null; } }
    if (goal) {
      const dx = goal.x - tr.x, dy = goal.y - tr.y, l = Math.hypot(dx, dy), sp = Math.min(k.speed, l * 3 + 20);
      tr.x += dx / l * sp * dt; tr.y += dy / l * sp * dt; tr.walk += sp * dt / 12;
      if (Math.abs(dx) > 2) tr.face = dx > 0 ? 1 : -1;
      if (Math.random() < dt * 4) SF.FX.smoke(tr.x + tr.face * 6, tr.y, 52);
    }
  }

  // While you are elsewhere the driver still makes the trip: a full load every round trip.
  function updateAway(dt) {
    const s = sm();
    s.drive = (s.drive || 0) + dt;
    if (s.drive < tripTime()) return;
    s.drive = 0;
    for (let i = 0; i < K.tractor.cap && room() > 0; i++) { const c = takeOre(); if (c == null) break; feed(c, false); }
  }

  function update(dt) {
    const s = SF.state;
    if (!s.homeReached) return;
    const m = sm();
    if (queued() > 0) {
      m.t = Math.min(m.t + dt, every() * 3);
      while (m.t >= every() && smeltOne()) m.t -= every();
    } else m.t = 0;
    if (m.driver) { if (visible()) updateTractor(dt); else updateAway(dt); }
    if (visible() && queued() > 0) {
      smokeT -= dt;
      if (smokeT <= 0) { smokeT = 0.3; const w = SF.World.smelter; SF.FX.smoke(w.x + 33, w.y, 176); }
    }
  }

  // Leaving or entering a planet: whatever sat on the trailer goes back to the hall.
  function enter() {
    if (tractor) for (const c of tractor.cargo) SF.state.hold[c] = (SF.state.hold[c] || 0) + 1;
    tractor = null;
  }

  return {
    get tractor() { return tractor; },
    isOre, feed, takeOre, queued, room, every, heatCost, canHire, oreInHall, hireDriver, upgradeHeat, update, enter,
  };
})();
