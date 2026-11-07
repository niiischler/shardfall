// Shardfall Outpost: rules shared by every planet. Planet content lives in planets.js.
window.SF = window.SF || {};

SF.CFG = {
  base: { x: 0, y: 0, r: 720 },        // home region, same on every planet
  depot: { x: 0, y: -40 },
  dropZone: { x: 0, y: 75, r: 74 },
  upgradePad: { x: -250, y: 120, r: 64 },
  start: { x: 0, y: 190 },
  plotR: 62,
  gateRadius: 590,                     // gates sit on the home edge, facing their region
  spotRadius: 400,                     // other buildings sit between the gates

  upgrades: {
    cap:   { name: 'Cargo Pack',     base: 20, growth: 1.55, max: 15 },
    drill: { name: 'Plasma Pick',    base: 30, growth: 1.6,  max: 15 },
    speed: { name: 'Thruster Boots', base: 25, growth: 1.6,  max: 10 },
  },

  // Base costs before the planet multiplier. The chain is the order plots appear in.
  plotCosts: { g2: 120, h1: 320, ref: 750, g3: 1500, h2: 2600, g4: 4000, g5: 9000, launch: 20000 },
  plotRequires: { g2: null, h1: 'g2', ref: 'g2', g3: 'h1', h2: 'g3', g4: 'g3', g5: 'g4', launch: 'g5' },

  drone: { cap: 5, speed: 170, hitEvery: 0.6, max: 6, base: 180, growth: 1.75 },
  producer: { base: 220, growth: 1.7, max: 8 },
  refineryMult: 1.5,
  starBonus: 0.25,                     // permanent +25% sale value per planet completed
};

// Planet-wide multiplier for values and prices. Grows every full tour of the planets.
SF.mult = function () {
  const n = SF.PLANETS.length, i = SF.state.planet;
  return SF.PLANETS[i % n].mult * (1 + Math.floor(i / n));
};

SF.planet = function () { return SF.PLANETS[SF.state.planet % SF.PLANETS.length]; };

SF.planetName = function (i) {
  if (i == null) i = SF.state.planet;
  const n = SF.PLANETS.length, tour = Math.floor(i / n);
  return SF.PLANETS[i % n].name + (tour ? ' ' + ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(tour - 1, 8)] : '');
};

SF.stats = function () {
  const l = SF.state.lvl;
  return {
    cap: 10 + 5 * l.cap,
    dmg: 1 + 0.5 * l.drill,
    hitEvery: Math.max(0.16, 0.4 - 0.02 * l.drill),
    speed: 210 + 20 * l.speed,
  };
};

const priced = (base, growth, lvl) => Math.round(base * SF.mult() * Math.pow(growth, lvl));

SF.upgradeCost = key => { const u = SF.CFG.upgrades[key]; return priced(u.base, u.growth, SF.state.lvl[key]); };
SF.droneCost = () => { const d = SF.CFG.drone; return priced(d.base, d.growth, Math.max(0, SF.state.drones - 1)); };
SF.producerCost = st => priced(SF.CFG.producer.base, SF.CFG.producer.growth, st.lvl);
SF.resValue = r => r.value * SF.mult();
SF.sellMult = () => (SF.state.plots.ref && SF.state.plots.ref.built ? SF.CFG.refineryMult : 1) * (1 + SF.CFG.starBonus * SF.state.stars);
