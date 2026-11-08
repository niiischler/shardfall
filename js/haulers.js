// Machine drivers: every machine can get a driver who brings its stock to the warehouse (or the hall on
// Halcyon). Each planet has its own vehicle. Drivers eat and drink like crew (see SF.Food.tickDriver).
SF.Haul = (function () {
  const C = SF.CFG, K = C.smelter.tractor;
  const VEH = ['hover', 'tractor', 'buggy', 'cart'];
  const NAMES = { hover: 'Hover sled', tractor: 'Tractor', buggy: 'Dune buggy', cart: 'Beach cart' };
  const live = {};

  const vehicle = pi => VEH[pi == null ? SF.state.planet : pi] || 'tractor';
  const vehicleName = pi => NAMES[vehicle(pi)];
  const key = (pi, id) => 'm' + pi + ':' + id;
  const cost = () => Math.round(C.producer.driver * SF.mult());

  function hire(id) {
    const p = SF.World.plot(id), st = SF.ws().plots[id];
    if (!st || !st.built || st.driver || !SF.spend(cost())) { SF.Audio.nope(); return false; }
    st.driver = true;
    SF.Audio.build();
    SF.FX.pop(p.x, p.y - 110, vehicleName() + ' driver hired', '#ffab4a', 20);
    SF.save(); SF.UI.refresh();
    return true;
  }

  // Where the vehicles unload: beside the hall on Halcyon, beside the drop off elsewhere.
  const dest = (i) => (SF.World.hall ? { x: SF.World.hall.x + 170 + i * 20, y: SF.World.hall.padY + 30 } : { x: C.dropZone.x - 130 - i * 20, y: C.dropZone.y + 60 });
  const dock = p => ({ x: p.x + 84, y: p.y + 74 });

  function unloadOne(code, tr) {
    if (SF.World.hall) SF.Hub.storeHall(code, tr.x, tr.y - 30);
    else SF.fly(code, tr.x, tr.y - 30, () => ({ x: C.depot.x, y: C.depot.y - 30 }), { dur: 0.45, arc: 50, onArrive(f) { SF.deposit(f.code); } });
  }

  function drive(tr, goal, dt) {
    const dx = goal.x - tr.x, dy = goal.y - tr.y, l = Math.hypot(dx, dy);
    if (l < 1) return;
    const sp = Math.min(K.speed * (tr.kind === 'hover' ? 1.2 : 1), l * 3 + 20);
    tr.x += dx / l * sp * dt; tr.y += dy / l * sp * dt; tr.walk += sp * dt / 12;
    if (Math.abs(dx) > 2) tr.face = dx > 0 ? 1 : -1;
    if ((tr.kind === 'tractor' || tr.kind === 'buggy') && Math.random() < dt * 4) SF.FX.smoke(tr.x - tr.face * 20, tr.y, tr.kind === 'buggy' ? 8 : 52);
  }

  function update(dt) {
    const W = SF.World, ws = SF.ws(), pi = SF.state.planet;
    let n = 0;
    for (const p of W.plots) {
      if (p.kind !== 'producer') continue;
      const st = ws.plots[p.id];
      if (!st || !st.built || !st.driver) { delete live[p.id]; continue; }
      const d = dock(p), code = SF.Render.here(p.helper.res), k = key(pi, p.id), i = n++;
      const tr = live[p.id] || (live[p.id] = { x: d.x, y: d.y, face: -1, walk: 0, cargo: [], state: 'load', t: 0, idle: 0, wait: '', kind: vehicle(), st });
      const fed = SF.Food.tickDriver(k, pi, dt);
      tr.wait = fed ? '' : SF.Food.driverStatus(k) || 'eating';
      if (!fed) continue;
      let goal = null;
      if (tr.state === 'load') {
        if (Math.hypot(d.x - tr.x, d.y - tr.y) > 6) goal = d;
        else {
          tr.t -= dt;
          if (tr.t <= 0 && st.pile > 0 && tr.cargo.length < K.cap) {
            st.pile--; tr.t = K.load; tr.idle = 0;
            SF.fly(code, p.x - 30, p.y + 10, () => ({ x: tr.x - tr.face * 40, y: tr.y - 30 }), { dur: 0.3, arc: 40, onArrive() { tr.cargo.push(code); } });
          } else if (!st.pile) tr.idle += dt;
          if (tr.cargo.length >= K.cap || (tr.cargo.length && tr.idle > 2)) tr.state = 'go';
          else if (!tr.cargo.length && tr.idle > 1) tr.wait = 'waiting for stock';
        }
      }
      if (tr.state === 'go') { goal = dest(i); if (Math.hypot(goal.x - tr.x, goal.y - tr.y) < 6) { tr.state = 'unload'; tr.t = 0.2; goal = null; } }
      if (tr.state === 'unload') {
        tr.t -= dt;
        if (tr.t <= 0 && tr.cargo.length) { unloadOne(tr.cargo.pop(), tr); tr.t = K.load; }
        if (!tr.cargo.length && tr.t <= 0) tr.state = 'load';
      }
      if (goal) drive(tr, goal, dt);
    }
  }

  // While you are elsewhere a fed driver brings a full load every round trip; on Halcyon into the hall.
  function away(pi, p, st, dt, deliver) {
    if (!SF.Food.tickDriver(key(pi, p.id), pi, dt)) return;
    st.haulT = (st.haulT || 0) + dt;
    const trip = 2 * 500 / K.speed + 2 * K.cap * K.load;
    if (st.haulT < trip) return;
    st.haulT = 0;
    const n = Math.min(st.pile, K.cap);
    st.pile -= n;
    for (let i = 0; i < n; i++) deliver(pi * 10 + p.helper.res);
  }

  // Leaving a planet: whatever sat on a vehicle goes back onto its machine's pile.
  function enter() {
    for (const id in live) { const tr = live[id]; tr.st.pile += tr.cargo.length; delete live[id]; }
  }

  return { live, vehicle, vehicleName, cost, hire, update, away, enter };
})();
