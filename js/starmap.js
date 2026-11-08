// Star Map on Halcyon: every planet at a glance, and the way to the far planets. A far planet is charted once
// (credits) at the map; after that the rocket can fly there like to any other planet.
SF.Map = (function () {
  const C = SF.CFG;

  const has = () => !!(SF.state.worlds[C.home] && SF.state.worlds[C.home].plots.map && SF.state.worlds[C.home].plots.map.built);
  const charted = pi => !SF.PLANETS[pi].far || !!(SF.state.charted && SF.state.charted[pi]);
  // Planets the rocket can fly to from where you are.
  const destinations = () => SF.PLANETS.map((pl, pi) => pi).filter(pi => pi !== SF.state.planet && charted(pi));

  function chart(pi) {
    const pl = SF.PLANETS[pi];
    if (!pl || !pl.far || charted(pi) || !has() || !SF.spend(pl.chart)) { SF.Audio.nope(); return false; }
    SF.state.charted = SF.state.charted || {};
    SF.state.charted[pi] = 1;
    SF.Audio.build();
    const p = SF.World.plot('map');
    if (p) {
      SF.FX.burst(p.x, p.y - 80, [pl.theme.accent, '#fff4e8'], 40, { z: 50, speed: 260, size: 4 });
      SF.FX.pop(p.x, p.y - 170, `Course to ${pl.name} charted`, pl.theme.accent, 22, { life: 2 });
    }
    SF.save(); SF.UI.refresh();
    return true;
  }

  function fly(pi) {
    if (!charted(pi) || pi === SF.state.planet) { SF.Audio.nope(); return false; }
    // Far planets are a long way: the flight burns fuel from the tank.
    if (!SF.Fuel.take(SF.Fuel.tripFuel(SF.state.planet, pi))) {
      SF.Audio.nope();
      SF.FX.pop(SF.player.x, SF.player.y - 110, `Needs ${SF.CFG.fuel.trip} rocket fuel`, '#ff8f5a', 18);
      return false;
    }
    SF.startLaunch(pi);
    return true;
  }

  // What the map shows for a planet: stock waiting, its rocket, crew and machines.
  function overview(pi) {
    const ws = SF.state.worlds[pi], pl = SF.PLANETS[pi];
    if (!ws) return null;
    const crew = SF.state.crew.filter(w => Math.floor(w.job / 10) === pi).length;
    const machines = Object.keys(ws.plots).filter(id => ws.plots[id].built && /^(h\d|m\d[ab])$/.test(id)).length;
    const gates = pl.resources.filter(r => r.tier === 0 || (ws.plots['g' + (r.tier + 1)] && ws.plots['g' + (r.tier + 1)].built)).length;
    return { crew, machines, gates, stock: pi === C.home ? null : SF.Hub.whCount(ws), cap: pi === C.home ? null : SF.Hub.whCap(ws) };
  }

  return { has, charted, destinations, chart, fly, overview };
})();
