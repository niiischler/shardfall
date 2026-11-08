// Crew food. Until a canteen stands, crew simply eat raw sunfruit from the hall. Once it stands, the canteen
// cooks sunfruit into meals and cactus water into drinks, and crew need both. Crew on Halcyon walk to the
// canteen (lost work time) unless delivery cars bring the food to them. Crew on other planets eat from that
// planet's warehouse pantry, which their cargo rocket fills on its way back from Halcyon.
SF.Food = (function () {
  const C = SF.CFG, F = C.food;
  const cars = [];

  const on = () => SF.homeHas('canteen');
  const kitchen = () => SF.state.kitchen;
  const pantry = pi => { const ws = SF.state.worlds[pi]; if (!ws) return { meal: 0, drink: 0 }; return ws.pantry || (ws.pantry = { meal: 0, drink: 0 }); };
  const source = pi => (pi === C.home ? kitchen() : pantry(pi));
  const jobPlanet = w => Math.floor(w.job / 10);
  const crewOn = pi => SF.state.crew.filter(w => jobPlanet(w) === pi).length;
  const low = w => w.food < F.low || w.water < F.low;
  const served = pi => pi === C.home && kitchen().drivers > 0;   // delivery cars bring it

  // Something in the larder this crew member needs right now.
  function hasFood(w, pi) {
    const s = source(pi);
    return (w.food < 0.6 && s.meal > 0) || (w.water < 0.6 && s.drink > 0);
  }

  function refill(w, pi) {
    if (!on()) return;
    const s = source(pi);
    if (w.food < 0.6 && s.meal > 0) { s.meal--; w.food = 1; }
    if (w.water < 0.6 && s.drink > 0) { s.drink--; w.water = 1; }
  }

  // Meters drain over time. Crew you cannot see sort themselves out: a walk costs work time.
  function tick(w, dt, visible) {
    if (w.water == null) w.water = 1;
    if (!on()) {
      w.water = 1;
      w.food -= dt / C.crew.eatEvery;
      if (w.food < 0) {
        if ((SF.state.hold[C.crew.food] || 0) > 0) { SF.state.hold[C.crew.food]--; w.food += 1; }
        else w.food = 0;
      }
      return;
    }
    w.food = Math.max(0, w.food - dt / F.eatEvery);
    w.water = Math.max(0, w.water - dt / F.drinkEvery);
    if (w.away > 0) w.away -= dt;
    const pi = jobPlanet(w);
    if (!visible && low(w) && hasFood(w, pi)) {
      refill(w, pi);
      if (!served(pi)) w.away = pi === C.home ? F.walkHome : F.walkAway;
    }
  }

  function canWork(w) {
    if (!on()) return w.food > 0;
    return !(w.away > 0) && w.food > 0 && w.water > 0;
  }

  // A visible worker heads off to eat: low on something, food is there, and no car is coming.
  const wantsWalk = w => on() && low(w) && !served(jobPlanet(w)) && hasFood(w, jobPlanet(w));

  // Where they eat: the canteen on Halcyon, the warehouse pantry elsewhere.
  function eatSpot(pi) {
    if (pi !== C.home) return { x: C.dropZone.x + 60, y: C.dropZone.y };
    const p = SF.World.plots.find(q => q.kind === 'canteen' && SF.ws().plots[q.id].built);
    return p ? { x: p.x, y: p.y + 55 } : null;
  }

  // Short label shown above a worker and on the crew card.
  function status(w) {
    if (!on()) return w.food > 0 ? '' : 'hungry';
    if (w.away > 0) return 'eating';
    if (w.food <= 0 && w.water <= 0) return 'hungry & thirsty';
    if (w.food <= 0) return 'hungry';
    if (w.water <= 0) return 'thirsty';
    return '';
  }

  // ---------- canteen ----------
  function cook(dt) {
    const k = kitchen(), h = SF.state.hold, per = F.per + SF.R('recipes');
    k.t = (k.t || 0) + dt;
    while (k.t >= F.cookEvery) {
      k.t -= F.cookEvery;
      if (k.meal < F.cap && (h[F.meal] || 0) > 0) { h[F.meal]--; if (!h[F.meal]) delete h[F.meal]; k.meal = Math.min(F.cap, k.meal + per); }
      if (k.drink < F.cap && (h[F.drink] || 0) > 0) { h[F.drink]--; if (!h[F.drink]) delete h[F.drink]; k.drink = Math.min(F.cap, k.drink + per); }
    }
  }

  const driverCost = () => Math.round(F.driver * (1 + kitchen().drivers));
  function hireDriver() {
    const k = kitchen();
    if (k.drivers >= F.drivers || !SF.spend(driverCost())) return false;
    k.drivers++;
    const p = canteenPlot();
    if (p) SF.FX.pop(p.x, p.y - 110, 'Delivery driver hired', '#9be36a', 20);
    SF.save(); SF.UI.refresh();
    return true;
  }

  const canteenPlot = () => SF.state.planet === C.home && SF.World.plots.find(q => q.kind === 'canteen' && SF.ws().plots[q.id].built);

  // Delivery cars drive meals and drinks out to hungry crew working on Halcyon.
  function updateCars(dt) {
    const p = canteenPlot();
    if (!p) { cars.length = 0; return; }
    while (cars.length < kitchen().drivers) cars.push({ x: p.x + 70 + cars.length * 50, y: p.y + 70, face: 1, walk: 0, target: null });
    for (const car of cars) {
      if (car.target && (!SF.Home.workers.includes(car.target) || !low(SF.state.crew[car.target.i] || {}))) car.target = null;
      if (!car.target) {
        let best = null, bd = Infinity;
        for (const m of SF.Home.workers) {
          const w = SF.state.crew[m.i];
          if (!w || !low(w) || !hasFood(w, C.home) || cars.some(o => o.target === m)) continue;
          const d = Math.hypot(m.x - car.x, m.y - car.y);
          if (d < bd) { bd = d; best = m; }
        }
        car.target = best;
      }
      const park = { x: p.x + 70 + cars.indexOf(car) * 50, y: p.y + 70 };
      const goal = car.target ? { x: car.target.x - car.face * 40, y: car.target.y + 12 } : park;
      const dx = goal.x - car.x, dy = goal.y - car.y, l = Math.hypot(dx, dy);
      if (car.target && l < 30) {
        refill(SF.state.crew[car.target.i], C.home);
        SF.FX.pop(car.target.x, car.target.y - 70, 'Lunch!', '#9be36a', 14, { life: 0.9 });
        SF.Audio.pick(4, SF.near(car.x, car.y));
        car.target = null;
      } else if (l > 3) {
        const sp = Math.min(F.carSpeed, l * 3 + 20);
        car.x += dx / l * sp * dt; car.y += dy / l * sp * dt; car.walk += sp * dt / 10;
        if (Math.abs(dx) > 2) car.face = dx > 0 ? 1 : -1;
      }
    }
  }

  function update(dt) {
    if (!on()) { cars.length = 0; return; }
    cook(dt);
    updateCars(dt);
  }

  // ---------- supply runs to the other planets ----------
  // A rocket should fly even when its warehouse is nearly empty, if its crew is running out of food.
  function needsSupply(pi) {
    if (!on() || !crewOn(pi)) return false;
    const p = pantry(pi), k = kitchen(), n = crewOn(pi);
    return (p.meal < n && k.meal > 0) || (p.drink < n && k.drink > 0);
  }

  // Food loaded when the rocket leaves Halcyon for home.
  function pack(pi) {
    if (!on()) return null;
    const p = pantry(pi), k = kitchen(), want = F.pantry * crewOn(pi);
    const meal = Math.min(k.meal, Math.max(0, want - p.meal)), drink = Math.min(k.drink, Math.max(0, want - p.drink));
    k.meal -= meal; k.drink -= drink;
    return meal || drink ? { meal, drink } : null;
  }

  function unpack(pi, food) {
    if (!food) return;
    const p = pantry(pi);
    p.meal += food.meal || 0; p.drink += food.drink || 0;
    if (pi === SF.state.planet) SF.FX.pop(C.hub.pad.x, C.hub.pad.y - 120, `+${food.meal} meals, +${food.drink} drinks for the crew`, '#9be36a', 16, { life: 1.6 });
  }

  function enter() { cars.length = 0; }

  return { cars, on, pantry, crewOn, hasFood, refill, tick, canWork, wantsWalk, eatSpot, status, driverCost, hireDriver, needsSupply, pack, unpack, update, enter };
})();
