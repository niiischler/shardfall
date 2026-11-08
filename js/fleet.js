// Rocket Workshop: rocket models for the cargo routes. A model is built once in the workshop; after that every
// route (one per planet) can fly it. Each model's cargo frame is upgraded on its own. The model a route flies is
// stored on that planet's world (ws.model); a rocket already in the air finishes its trip with the old one.
SF.Fleet = (function () {
  const C = SF.CFG, R = C.rockets;

  const fleet = () => SF.state.fleet || (SF.state.fleet = { own: {}, frame: {} });
  const model = id => R.models[id] || R.models.std;
  const owned = id => id === 'std' || !!fleet().own[id];
  const frameLvl = id => fleet().frame[id] || 0;
  const modelOf = pi => { const ws = SF.state.worlds[pi]; return ws && ws.model && owned(ws.model) ? ws.model : 'std'; };
  const cap = id => Math.round(SF.rocketBase() * model(id).cap * (1 + R.frame.step * frameLvl(id)));
  // Routes: every planet except Halcyon that you have been to.
  const routes = () => Object.keys(SF.state.worlds).map(Number).filter(pi => pi !== C.home).sort((a, b) => a - b);
  const locked = id => !!model(id).locked && !SF.PLANETS.some((p, pi) => p.liquid && SF.Map.charted(pi));
  const has = () => SF.homeHas('workshop');

  function spendHall(credits, mats) {
    const h = SF.state.hold;
    if (SF.state.credits < credits || Object.keys(mats).some(c => (h[c] || 0) < mats[c])) return false;
    SF.state.credits -= credits;
    for (const c in mats) { h[c] -= mats[c]; if (!h[c]) delete h[c]; }
    return true;
  }

  function celebrate(text, color) {
    const p = SF.World.plots.find(q => q.kind === 'workshop');
    SF.Audio.build(); SF.FX.shake(0.3);
    if (p) {
      SF.FX.burst(p.x, p.y - 60, [color, '#fff4e8'], 34, { z: 40, speed: 240, size: 4 });
      SF.FX.pop(p.x, p.y - 150, text, color, 20, { life: 1.6 });
    }
    SF.save(); SF.UI.refresh();
  }

  function build(id) {
    const m = model(id);
    if (!has() || owned(id) || locked(id) || !spendHall(m.cost, m.needs)) { SF.Audio.nope(); return false; }
    fleet().own[id] = 1;
    celebrate(m.name + ' built', m.trim);
    return true;
  }

  const frameCost = id => {
    const l = frameLvl(id), f = R.frame, k = model(id).cap;
    return { credits: Math.round(f.cost * Math.pow(f.growth, l) * Math.max(1, k)), mats: Object.fromEntries(Object.entries(f.mats).map(([c, n]) => [c, Math.round(n * (l + 1) * Math.max(1, k))])) };
  };
  function upgradeFrame(id) {
    if (!has() || !owned(id) || frameLvl(id) >= R.frame.max) { SF.Audio.nope(); return false; }
    const c = frameCost(id);
    if (!spendHall(c.credits, c.mats)) { SF.Audio.nope(); return false; }
    fleet().frame[id] = frameLvl(id) + 1;
    celebrate(`${model(id).name} carries ${cap(id)}`, model(id).trim);
    return true;
  }

  function assign(pi, id) {
    const ws = SF.state.worlds[pi];
    if (!ws || !owned(id) || modelOf(pi) === id) return false;
    ws.model = id;
    SF.Audio.store(3);
    SF.save(); SF.UI.refresh();
    return true;
  }

  return { model, owned, frameLvl, modelOf, cap, routes, locked, has, build, frameCost, upgradeFrame, assign };
})();
