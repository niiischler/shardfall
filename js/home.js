// Home-base systems: New Haven lots, hired crew, conveyor belts. Storage and shipping live in hub.js,
// crew food in food.js, research in research.js.
SF.Home = (function () {
  const C = SF.CFG;
  const SUITS = ['#ffd27a', '#9be36a', '#8fd3ff', '#ff9cc2', '#c9a6ff', '#ffab4a'];
  const workers = [];           // crew working on the planet you are on, drawn and simulated

  // Jobs a crew member can take: the three cheapest resources of every planet.
  // Every resource can be a job; the two rarest of each planet take longer to gather away from you.
  const jobs = () => SF.PLANETS.flatMap((p, pi) => p.resources.map(r => pi * 10 + r.tier));
  // A job needs its region open on that planet (the gate built), like the nodes do for you.
  function jobOpen(code) {
    const t = code % 10, ws = SF.state.worlds[Math.floor(code / 10)];
    if (!ws) return Math.floor(code / 10) <= C.home && t === 0;     // far planets: only once you have landed there
    return t === 0 || !!(ws.plots && ws.plots['g' + (t + 1)] && ws.plots['g' + (t + 1)].built);
  }
  const workTime = code => C.crew.workEvery * (C.crew.rareSlow[code % 10] || 1);
  const jobPlanet = w => Math.floor(w.job / 10);

  function crewCap() { return SF.homeCount('habitat', true) * C.crew.perHabitat; }
  function hasFactory() { return SF.homeHas('factory'); }
  function hold(code) { return SF.state.hold[code] || 0; }

  // ---------- New Haven lots ----------
  // What a lot would cost if you chose `kind` for it now.
  function quote(kind) {
    const b = SF.BUILDS[kind], n = SF.homeCount(kind);
    return { cost: b.cost(n), needs: b.needs(n) };
  }
  const canChoose = kind => !SF.BUILDS[kind].unique || SF.homeCount(kind) === 0;

  function chooseLot(id, kind) {
    const st = SF.ws().plots[id];
    if (!st || st.kind || st.built || !canChoose(kind)) { SF.Audio.nope(); return false; }
    const q = quote(kind);
    Object.assign(st, { kind, cost: q.cost, needs: q.needs, paid: 0, res: {} });
    SF.applyLots(SF.World.plots, SF.ws());
    const p = SF.World.plot(id);
    SF.Audio.buy(); SF.FX.pop(p.x, p.y - 90, SF.BUILDS[kind].name + ' planned', '#fff4e8', 20);
    SF.save(); SF.UI.setZone(SF.player.zone); SF.UI.refresh();
    return true;
  }

  // Changing your mind: everything paid so far comes back.
  function cancelLot(id) {
    const st = SF.ws().plots[id];
    if (!st || !st.kind || st.built) return false;
    SF.state.credits += st.paid || 0;
    for (const c in st.res || {}) SF.state.hold[c] = hold(c) + st.res[c];
    Object.assign(st, { kind: undefined, cost: undefined, needs: undefined, paid: 0, res: {} });
    SF.applyLots(SF.World.plots, SF.ws());
    SF.Audio.store(3);
    SF.save(); SF.UI.setZone(SF.player.zone); SF.UI.refresh();
    return true;
  }

  // ---------- crew ----------
  function hire() {
    if (SF.state.crew.length >= crewCap() || !SF.spend(SF.hireCost())) return false;
    SF.state.crew.push({ job: C.crew.food, food: 1, water: 1 });
    SF.FX.pop(SF.player.x, SF.player.y - 100, 'Crew member hired', '#fff4e8', 18);
    SF.save(); SF.UI.refresh();
    return true;
  }

  function setJob(i, code) {
    const w = SF.state.crew[i];
    if (!w || !jobs().includes(code) || !jobOpen(code)) { SF.Audio.nope(); return false; }
    w.job = code; w.away = 0;
    SF.save(); SF.UI.refresh();
    return true;
  }

  // Belt materials can come from the hall on Halcyon or this planet's warehouse.
  const stores = () => [SF.state.hold, SF.ws().wh || {}];
  function available(code) { return stores().reduce((a, o) => a + (o[code] || 0), 0); }
  function spendMaterial(code, n) {
    for (const o of stores()) { const k = Math.min(n, o[code] || 0); o[code] = (o[code] || 0) - k; if (!o[code]) delete o[code]; n -= k; }
  }

  // Liquids (Petra) run through a copper pipeline instead of a belt.
  const beltNeeds = id => (SF.World.plot(id).helper && SF.World.plot(id).helper.pipe ? C.pipe.needs : C.conveyor.needs);
  function installBelt(id) {
    const st = SF.ws().plots[id];
    const need = beltNeeds(id);
    if (st.belt || SF.World.plot(id).research || !hasFactory() || Object.keys(need).some(c => available(c) < need[c])) { SF.Audio.nope(); return false; }
    for (const c in need) spendMaterial(c, need[c]);
    st.belt = true;
    const p = SF.World.plot(id);
    SF.Audio.build(); SF.FX.shake(0.3);
    SF.FX.burst(p.x, p.y + 40, ['#9aa3ad', '#fff4e8'], 30, { z: 10, speed: 240, size: 5 });
    SF.FX.pop(p.x, p.y - 90, p.helper && p.helper.pipe ? 'Pipeline installed' : 'Conveyor installed', '#dfe5ee', 20);
    SF.save(); SF.UI.refresh();
    return true;
  }

  // Where a worker brings what they gathered: the hall on Halcyon, the warehouse elsewhere.
  function dropPoint() {
    const h = SF.World.hall;
    return h ? { x: h.x, y: h.padY } : { x: C.dropZone.x, y: C.dropZone.y };
  }

  function unload(m) {
    const h = SF.World.hall;
    m.cargo.forEach((code, i) => {
      if (h) SF.Hub.storeHall(code, m.x, m.y - 40);
      else SF.fly(code, m.x, m.y - 40, () => ({ x: C.depot.x, y: C.depot.y - 30 }), { delay: i * 0.08, dur: 0.4, arc: 40, onArrive(f) { SF.deposit(f.code); } });
    });
    m.cargo = [];
  }

  // Walks to the nearest node of its job, chops it like a drone would, and carries the haul back.
  // When hungry or thirsty it walks to the canteen (or the warehouse pantry) unless a delivery car comes.
  function updateWorker(m, dt) {
    const w = SF.state.crew[m.i], k = C.crew;
    m.swing = Math.max(0, m.swing - dt * 3.5);
    m.need = SF.Food.status(w);
    if (m.state !== 'eat' && SF.Food.wantsWalk(w)) {
      if (m.target && m.target.claimed === m) m.target.claimed = null;
      m.target = null; m.state = 'eat'; m.eatT = 1.2;
    }
    if (!SF.Food.canWork(w) && m.state !== 'eat') { m.state = 'idle'; return; }
    if (m.state === 'idle') m.state = 'seek';
    let goal = null;
    if (m.state === 'eat') {
      const spot = SF.Food.eatSpot(jobPlanet(w));
      goal = spot;
      if (!spot || Math.hypot(spot.x - m.x, spot.y - m.y) < 24) {
        goal = null;
        m.eatT -= dt;
        if (m.eatT <= 0) { SF.Food.refill(w, jobPlanet(w)); m.state = SF.Food.canWork(w) ? 'seek' : 'eat'; m.eatT = 1.5; }
      }
    }
    if (m.state === 'seek') {
      if (m.cargo.length + m.incoming >= m.cap) m.state = 'return';
      else {
        if (!m.target || !m.target.alive) {
          m.target = null;
          let best = null, bd = Infinity;
          for (const n of SF.World.nodes) {
            if (n.code !== w.job || !n.alive || n.claimed || !SF.World.nodeOpen(n) || n === SF.player.target) continue;
            const d = Math.hypot(n.x - m.x, n.y - m.y);
            if (d < bd) { bd = d; best = n; }
          }
          if (best) { m.target = best; best.claimed = m; }
        }
        if (m.target) {
          goal = { x: m.target.x + (m.x < m.target.x ? -1 : 1) * (m.target.r + 14), y: m.target.y + 6 };
          if (Math.hypot(goal.x - m.x, goal.y - m.y) < 10) { m.state = 'work'; m.hitT = 0.4; }
        } else if (m.cargo.length) m.state = 'return';
        else goal = m.home;
      }
    }
    if (m.state === 'work') {
      const n = m.target;
      if (!n || !n.alive) {
        if (n && n.claimed === m) n.claimed = null;
        m.target = null;
        m.state = m.cargo.length + m.incoming >= m.cap ? 'return' : 'seek';
      } else {
        m.face = n.x >= m.x ? 1 : -1;
        m.hitT -= dt;
        if (m.hitT <= 0) {
          m.hitT = k.hitEvery / (1 + 0.25 * SF.R('training')); m.swing = 1;
          SF.hitNode(n, (1 + n.res * 0.5) * (1 + 0.25 * SF.R('training')), m, SF.near(n.x, n.y) * 0.5);
        }
      }
    }
    if (m.state === 'return') {
      goal = dropPoint();
      if (Math.hypot(goal.x - m.x, goal.y - m.y) < 20 && m.incoming === 0 && (SF.World.hall || !SF.Hub.whFull())) { unload(m); m.state = 'seek'; }
    }
    if (goal) {
      const dx = goal.x - m.x, dy = goal.y - m.y, l = Math.hypot(dx, dy);
      if (l > 2) {
        const sp = Math.min(k.speed * (m.state === 'eat' ? 1.3 : 1), l * 4);
        m.x += dx / l * sp * dt; m.y += dy / l * sp * dt; m.walk += dt * sp / 14;
        if (Math.abs(dx) > 1) m.face = dx > 0 ? 1 : -1;
      }
      SF.World.constrain(m, 14);
    }
  }

  // Crew work everywhere, all the time, as long as they are fed. Crew whose job is on the planet you
  // are on work there for real; the others fill their planet's warehouse (or the hall on Halcyon).
  function update(dt) {
    const s = SF.state, k = C.crew, here = s.planet;
    s.crew.forEach((w, i) => {
      SF.Food.tick(w, dt, jobPlanet(w) === here);
      if (jobPlanet(w) === here || !SF.Food.canWork(w) || !jobOpen(w.job)) return;
      w.work = (w.work || 0) + dt * (1 + 0.25 * SF.R('training'));
      if (w.work >= workTime(w.job)) {
        w.work -= workTime(w.job);
        const pi = jobPlanet(w), ws = s.worlds[pi];
        if (pi !== C.home && ws) { if (!SF.Hub.whFull(ws)) SF.Hub.toWarehouse(w.job, ws); } else SF.Hub.deliver(w.job, 1);
      }
    });

    // Keep one worker per crew member whose job is here; drop the rest.
    for (let j = workers.length - 1; j >= 0; j--) {
      const m = workers[j], w = s.crew[m.i];
      if (!w || w.job !== m.job) {
        if (m.target && m.target.claimed === m) m.target.claimed = null;
        workers.splice(j, 1);
      }
    }
    s.crew.forEach((w, i) => {
      if (jobPlanet(w) !== here || workers.some(m => m.i === i)) return;
      const p = dropPoint(), a = Math.random() * Math.PI * 2;
      workers.push({ i, job: w.job, x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 20, home: { x: p.x + Math.cos(a) * 70, y: p.y + 40 + Math.sin(a) * 20 },
        state: 'seek', target: null, cargo: [], incoming: 0, cap: k.cap, hitT: 0, swing: 0, walk: 0, face: 1, suit: SUITS[i % SUITS.length] });
    });
    for (const m of workers) updateWorker(m, dt);
  }

  function enter() { workers.length = 0; }

  return { workers, beltNeeds, jobs, jobOpen, spendMaterial, workTime, jobPlanet, crewCap, hasFactory, hold, available, hire, setJob, installBelt, quote, canChoose, chooseLot, cancelLot, update, enter };
})();
