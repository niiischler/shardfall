// Home-base systems on Halcyon: the material chest, hired crew, conveyor belts.
SF.Home = (function () {
  const C = SF.CFG;
  const SUITS = ['#ffd27a', '#9be36a', '#8fd3ff', '#ff9cc2', '#c9a6ff', '#ffab4a'];
  const walkers = [];

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
  function take(needs) {
    for (const c in needs) if (hold(c) < needs[c]) return false;
    for (const c in needs) SF.state.hold[c] -= needs[c];
    return true;
  }

  // Put a carried item into the chest.
  function store(code, x, y) {
    const c = SF.World.chest;
    SF.fly(code, x, y, () => ({ x: c.x, y: c.y - 40 }), {
      dur: 0.36, arc: 50,
      onArrive(f) {
        SF.state.hold[f.code] = hold(f.code) + 1;
        SF.Audio.pick(hold(f.code) % 11);
        SF.FX.pop(c.x + (Math.random() - 0.5) * 30, c.y - 80, '+1 ' + SF.res(f.code).name, SF.res(f.code).color, 14, { life: 0.8 });
      },
    });
  }

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
    if (st.belt || !hasFactory() || !take(C.conveyor.needs)) { SF.Audio.nope(); return false; }
    st.belt = true;
    const p = SF.World.plot(id);
    SF.Audio.build(); SF.FX.shake(0.3);
    SF.FX.burst(p.x, p.y + 40, ['#9aa3ad', '#fff4e8'], 30, { z: 10, speed: 240, size: 5 });
    SF.FX.pop(p.x, p.y - 90, 'Conveyor installed', '#dfe5ee', 20);
    SF.save(); SF.UI.refresh();
    return true;
  }

  // Crew work everywhere, all the time: each eats sunfruit from the chest and ships their job's resource home.
  function update(dt) {
    const s = SF.state, k = C.crew;
    for (const w of s.crew) {
      w.food -= dt / k.eatEvery;
      if (w.food < 0) {
        if (hold(k.food) > 0) { s.hold[k.food]--; w.food += 1; }
        else { w.food = 0; w.hungry = true; continue; }
      }
      w.hungry = false;
      w.work = (w.work || 0) + dt;
      if (w.work >= k.workEvery) { w.work -= k.workEvery; s.hold[w.job] = hold(w.job) + 1; }
    }
    // Wandering crew on the home planet.
    const reg = SF.World.regions.find(r => r.settlement);
    const show = SF.state.planet === C.home && reg && SF.World.isOpen(reg) ? s.crew.length : 0;
    while (walkers.length < show) {
      const i = walkers.length;
      walkers.push({ x: reg.x + (Math.random() - 0.5) * 200, y: reg.y + (Math.random() - 0.5) * 120, tx: reg.x, ty: reg.y, walk: 0, face: 1, wait: 0, suit: SUITS[i % SUITS.length], i });
    }
    walkers.length = show;
    for (const m of walkers) {
      const w = s.crew[m.i];
      m.hungry = w && w.hungry;
      if (m.wait > 0) { m.wait -= dt; continue; }
      const dx = m.tx - m.x, dy = m.ty - m.y, l = Math.hypot(dx, dy);
      if (l < 6) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * (reg.r - 120);
        m.tx = reg.x + Math.cos(a) * d; m.ty = reg.y + Math.sin(a) * d * 0.7; m.wait = 1 + Math.random() * 3;
        continue;
      }
      const sp = m.hungry ? 30 : 70;
      m.x += dx / l * sp * dt; m.y += dy / l * sp * dt; m.walk += dt * sp / 14;
      if (Math.abs(dx) > 1) m.face = dx > 0 ? 1 : -1;
    }
  }

  function enter() { walkers.length = 0; }

  return { walkers, jobs, crewCap, hasFactory, hold, store, hire, nextJob, installBelt, update, enter };
})();
