// Research lab on Halcyon: three trees whose levels cost credits plus materials from the hall.
SF.Research = (function () {
  const hold = c => SF.state.hold[c] || 0;

  const node = id => SF.RESEARCH_NODES.find(n => n.id === id);
  const locked = n => n.after && SF.R(n.after) < 1;
  const maxed = n => SF.R(n.id) >= n.max;
  const cost = n => SF.researchCost(n, SF.R(n.id));
  const affordable = n => { const c = cost(n); return SF.state.credits >= c.credits && Object.keys(c.mats).every(k => hold(k) >= c.mats[k]); };

  function research(id) {
    const n = node(id);
    if (!n || locked(n) || maxed(n) || !SF.homeHas('lab') || !affordable(n)) { SF.Audio.nope(); return false; }
    const c = cost(n);
    SF.state.credits -= c.credits;
    for (const k in c.mats) { SF.state.hold[k] -= c.mats[k]; if (!SF.state.hold[k]) delete SF.state.hold[k]; }
    SF.state.research[id] = SF.R(id) + 1;
    SF.Audio.build();
    const p = SF.World.plots.find(q => q.kind === 'lab');
    if (p) {
      SF.FX.burst(p.x, p.y - 60, [n.tree.color, '#fff4e8'], 34, { z: 40, speed: 240, size: 4 });
      SF.FX.pop(p.x, p.y - 150, `${n.name} ${SF.R(id)}`, n.tree.color, 20, { life: 1.6 });
    }
    SF.save(); SF.UI.refresh();
    return true;
  }

  return { node, locked, maxed, cost, affordable, research };
})();

// Research effects, read wherever the numbers are used.
// Each route flies the rocket model chosen in the Rocket Workshop (js/fleet.js); pi defaults to the planet you are on.
SF.rocketBase = () => SF.CFG.hub.rocketCap + 25 * SF.R('bay');
// r picks one rocket of the route; without it, the route's first rocket.
SF.rocketCap = (pi, r) => SF.Fleet.cap(SF.Fleet.modelOf(pi == null ? SF.state.planet : pi, r));
SF.rocketFlight = (pi, r) => SF.CFG.hub.flight * (1 - 0.15 * SF.R('engines')) * SF.Fleet.model(SF.Fleet.modelOf(pi == null ? SF.state.planet : pi, r)).flight;
SF.droneSpeed = () => SF.CFG.drone.speed * (1 + 0.2 * SF.R('motors'));
SF.droneCap = () => SF.CFG.drone.cap + 2 * SF.R('pods');
SF.dronePower = () => 1 + 0.5 * SF.R('beams');
SF.producerBoost = () => 1 + 0.2 * SF.R('presses');
