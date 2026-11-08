// Home-base systems: hired crew, conveyor belts. Storage and shipping live in hub.js.
SF.Home = (function () {
  const C = SF.CFG;
  const SUITS = ['#ffd27a', '#9be36a', '#8fd3ff', '#ff9cc2', '#c9a6ff', '#ffab4a'];
  const workers = [];           // crew working on the planet you are on, drawn and simulated

  const homeWorld = () => SF.state.worlds[C.home];
  const built = id => !!(homeWorld() && homeWorld().plots[id] && homeWorld().plots[id].built);

  // Jobs a crew member can take: the three cheapest resources of every planet.
  const jobs = () => SF.PLANETS.flatMap((p, pi) => p.resources.slice(0, 3).map(r => pi * 10 + r.tier));

  function crewCap() {
    if (!homeWorld()) return 0;
    return SF.PLANETS[C.home].homePlots.filter(h => h.kind === 'habitat' && built(h.id)).length * C.crew.perHabitat;
  }

  function hasFactory() { return built('fac'); }

  function hold(code) { return SF.state.hold[code] || 0; }

  function hire() {
    if (SF.state.crew.length >= crewCap() || !SF.spend(SF.hireCost())) return false;
    SF.state.crew.push({ job: C.crew.food, food: 1 });
    SF.FX.pop(SF.player.x, SF.player.y - 100, 'Crew member hired', '#fff4e8', 18);
    SF.save(); SF.UI.refresh();
    return true;
  }

  function nextJob(i) {
    const list = jobs(), w = SF.state.crew[i];
    w.job = list[(list.indexOf(w.job) + 1) % list.length];
    SF.save(); SF.UI.refresh();
    return true;
  }

  function installBelt(id) {
    const st = SF.ws().plots[id];
    const need = C.conveyor.needs;
    if (st.belt || !hasFactory() || Object.keys(need).some(c => hold(c) < need[c])) { SF.Audio.nope(); return false; }
    for (const c in need) SF.state.hold[c] -= need[c];
    st.belt = true;
    const p = SF.World.plot(id);
    SF.Audio.build(); SF.FX.shake(0.3);
    SF.FX.burst(p.x, p.y + 40, ['#9aa3ad', '#fff4e8'], 30, { z: 10, speed: 240, size: 5 });
    SF.FX.pop(p.x, p.y - 90, 'Conveyor installed', '#dfe5ee', 20);
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
  function updateWorker(m, dt) {
    const w = SF.state.crew[m.i], k = C.crew;
    m.swing = Math.max(0, m.swing - dt * 3.5);
    m.hungry = w.hungry;
    if (w.hungry) { m.state = 'idle'; return; }
    let goal = null;
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
          m.hitT = k.hitEvery; m.swing = 1;
          const near = Math.max(0, 1 - Math.hypot(n.x - SF.player.x, n.y - SF.player.y) / 600) * 0.5;
          SF.hitNode(n, 1 + n.res * 0.5, m, near);
        }
      }
    }
    if (m.state === 'return') {
      goal = dropPoint();
      if (Math.hypot(goal.x - m.x, goal.y - m.y) < 20 && m.incoming === 0) { unload(m); m.state = 'seek'; }
    }
    if (goal) {
      const dx = goal.x - m.x, dy = goal.y - m.y, l = Math.hypot(dx, dy);
      if (l > 2) {
        const sp = Math.min(k.speed, l * 4);
        m.x += dx / l * sp * dt; m.y += dy / l * sp * dt; m.walk += dt * sp / 14;
        if (Math.abs(dx) > 1) m.face = dx > 0 ? 1 : -1;
      }
      SF.World.constrain(m, 14);
    }
  }

  // Crew work everywhere, all the time. Each eats sunfruit from the hall. Crew whose job is on
  // the planet you are on work there for real; the others ship their haul straight to the hall.
  function update(dt) {
    const s = SF.state, k = C.crew, here = s.planet;
    s.crew.forEach((w, i) => {
      w.food -= dt / k.eatEvery;
      if (w.food < 0) {
        if (hold(k.food) > 0) { s.hold[k.food]--; w.food += 1; }
        else { w.food = 0; w.hungry = true; return; }
      }
      w.hungry = false;
      if (Math.floor(w.job / 10) === here) return;
      w.work = (w.work || 0) + dt;
      if (w.work >= k.workEvery) { w.work -= k.workEvery; SF.Hub.deliver(w.job, 1); }
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
      if (Math.floor(w.job / 10) !== here || workers.some(m => m.i === i)) return;
      const p = dropPoint(), a = Math.random() * Math.PI * 2;
      workers.push({ i, job: w.job, x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 20, home: { x: p.x + Math.cos(a) * 70, y: p.y + 40 + Math.sin(a) * 20 },
        state: 'seek', target: null, cargo: [], incoming: 0, cap: k.cap, hitT: 0, swing: 0, walk: 0, face: 1, suit: SUITS[i % SUITS.length] });
    });
    for (const m of workers) updateWorker(m, dt);
  }

  function enter() { workers.length = 0; }

  return { workers, jobs, crewCap, hasFactory, hold, hire, nextJob, installBelt, update, enter };
})();
