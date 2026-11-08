// Rocket fuel. The Fuel Plant (New Haven) refines logs, and later Petra's crude oil and natural gas, into fuel
// in one shared tank. The workshop rocket models burn fuel on every cargo trip (the old freighter flies on its
// solar sail for free), and every flight out to a far planet needs fuel too.
SF.Fuel = (function () {
  const C = SF.CFG, F = C.fuel;

  const has = () => SF.homeHas('fuelplant');
  const tank = () => SF.state.fuel || 0;
  const cap = () => F.cap;
  const uses = () => SF.state.fuelUse || (SF.state.fuelUse = {});
  const allowed = code => uses()[code] !== false;            // every input is on until you switch it off
  const perTrip = pi => SF.Fleet.model(SF.Fleet.modelOf(pi)).fuel || 0;
  // Flying out to a far planet burns fuel; the way back is always free, so you never get stuck out there.
  const tripFuel = (from, to) => (SF.PLANETS[to].far ? F.trip : 0);

  function take(n) {
    if (!n) return true;
    if (tank() < n) return false;
    SF.state.fuel = tank() - n;
    return true;
  }

  function toggle(code) {
    uses()[code] = !allowed(code);
    SF.Audio.store(2);
    SF.save(); SF.UI.refresh();
    return true;
  }

  // One input item per step, best fuel first: crude oil, then gas, then logs.
  function update(dt) {
    if (!has()) return;
    const s = SF.state, h = s.hold;
    s.fuelT = (s.fuelT || 0) + dt;
    while (s.fuelT >= F.every) {
      s.fuelT -= F.every;
      if (tank() >= cap()) { s.fuelT = 0; break; }
      const code = F.inputs.map(i => i.code).find(c => allowed(c) && (h[c] || 0) > 0);
      if (code == null) { s.fuelT = 0; break; }
      h[code]--; if (!h[code]) delete h[code];
      s.fuel = Math.min(cap(), tank() + F.inputs.find(i => i.code === code).fuel);
    }
  }

  return { has, tank, cap, allowed, perTrip, tripFuel, take, toggle, update };
})();
