// Smelter on Halcyon: iron and copper ore from the hall become ingots, which the home buildings and belts need.
// It is docked to the hall by two belts: one takes ore out of the hall into the hopper, the other carries the
// finished ingots back. It runs on its own, also while you are on other planets. Ore you carry can still be
// dropped straight into the furnace.
SF.Smelter = (function () {
  const C = SF.CFG, K = C.smelter;
  let smokeT = 0;
  const riding = [];   // ore and ingots on the belts right now (put back into the hall if you leave)

  const sm = () => SF.state.smelt;
  const isOre = c => K.ores.includes(+c);
  const queued = () => Object.values(sm().q).reduce((a, b) => a + b, 0);
  const room = () => Math.max(0, K.queue - queued() - riding.filter(isOre).length);
  const every = () => K.every / (1 + K.heat.boost * sm().heat);
  const heatCost = () => Math.round(K.heat.base * Math.pow(K.heat.growth, sm().heat));
  const oreInHall = () => K.ores.reduce((a, c) => a + (SF.state.hold[c] || 0), 0);
  const visible = () => SF.state.planet === C.home && SF.World.smelter;
  const beltLen = pts => pts.reduce((a, q, i) => (i ? a + Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y) : 0), 0);

  // Ore into the furnace (from the belt, or from your pack).
  function feed(code, byHand) {
    if (!isOre(code) || room() <= 0) return false;
    const s = sm();
    s.q[code] = (s.q[code] || 0) + 1;
    if (byHand) s.hand = (s.hand || 0) + 1;
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

  // Put an ingot into the hall, with the little pop.
  function toHall(code) {
    const h = SF.World.hall, v = SF.Hub.deliver(code, 1);
    if (!h || SF.state.planet !== C.home) return;
    SF.Audio.store(SF.state.hold[code] || 1, SF.near(h.x, h.y));
    if (v) SF.earnFx(v, h.x, h.y - 90);
    else SF.FX.pop(h.x - 70 + (Math.random() - 0.5) * 30, h.y - 100, '+1 ' + SF.res(code).name, SF.res(code).color, 14, { life: 0.8 });
  }

  // One ore becomes one ingot, which rides the belt back into the hall.
  function smeltOne() {
    const s = sm(), codes = Object.keys(s.q).filter(c => s.q[c] > 0);
    if (!codes.length) return false;
    s.pick = ((s.pick || 0) + 1) % codes.length;
    const ore = +codes[s.pick];
    s.q[ore]--; if (!s.q[ore]) delete s.q[ore];
    const bar = ore + 100;
    if (visible()) {
      const m = SF.World.smelter, path = K.barBelt;
      SF.Audio.smelt(SF.near(m.x, m.y));
      SF.FX.burst(path[0].x, path[0].y - 20, ['#ffd36b', '#ff8f5a', '#fff1a0'], 6, { z: 10, speed: 90, up: 160, size: 3, life: 0.6 });
      riding.push(bar);
      SF.fly(bar, path[0].x, path[0].y, () => path[path.length - 1], { dur: beltLen(path) / SF.Render.BELT_SPEED, arc: 0, path, onArrive(f) { off(f.code); toHall(f.code); } });
    } else SF.Hub.deliver(bar, 1);
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

  // The ore belt: takes ore out of the hall whenever the furnace has room.
  function feedBelt(dt) {
    const s = sm();
    s.feedT = (s.feedT || 0) + dt;
    const step = Math.min(K.feedEvery, every() * 0.8);
    while (s.feedT >= step) {
      s.feedT -= step;
      if (room() <= 0) { s.feedT = 0; break; }
      const c = takeOre();
      if (c == null) { s.feedT = 0; break; }
      if (visible()) {
        const path = K.oreBelt;
        riding.push(c);
        SF.fly(c, path[0].x, path[0].y, () => path[path.length - 1], { dur: beltLen(path) / SF.Render.BELT_SPEED, arc: 0, path, onArrive(f) { off(f.code); if (!feed(f.code, false)) SF.Hub.deliver(f.code, 1); } });
      } else feed(c, false);
    }
  }

  function update(dt) {
    const s = SF.state;
    if (!s.homeReached) return;
    const m = sm();
    feedBelt(dt);
    if (queued() > 0) {
      m.t = Math.min(m.t + dt, every() * 3);
      while (m.t >= every() && smeltOne()) m.t -= every();
    } else m.t = 0;
    if (visible() && queued() > 0) {
      smokeT -= dt;
      if (smokeT <= 0) { smokeT = 0.3; const w = SF.World.smelter; SF.FX.smoke(w.x + 33, w.y, 176); }
    }
  }

  const off = c => { const i = riding.indexOf(c); if (i >= 0) riding.splice(i, 1); };
  // Leaving or entering a planet: whatever was on the belts goes back into the hall.
  function enter() { for (const c of riding.splice(0)) SF.state.hold[c] = (SF.state.hold[c] || 0) + 1; }

  return { isOre, feed, takeOre, queued, room, every, heatCost, oreInHall, upgradeHeat, update, enter };
})();
