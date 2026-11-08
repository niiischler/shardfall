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
    cap:   { name: 'Cargo Pack',     base: 200, growth: 1.55, max: 15 },
    drill: { name: 'Tool Power',     base: 300, growth: 1.6,  max: 15 },
    speed: { name: 'Thruster Boots', base: 250, growth: 1.6,  max: 10 },
  },

  // Campaign planets: base costs before the planet multiplier, and the order plots appear in.
  plotCosts: { g2: 1200, h1: 3200, ref: 7500, g3: 15000, h2: 26000, g4: 40000, g5: 90000, launch: 200000 },
  plotRequires: { g2: null, h1: 'g2', ref: 'g2', g3: 'g2', h2: 'g3', g4: 'g3', g5: 'g4', launch: 'g5' },

  drone: { cap: 5, speed: 170, hitEvery: 0.6, max: 6, base: 1800, growth: 1.75, awayEvery: 3 },  // awayEvery: s per item while you are elsewhere
  producer: { base: 2200, growth: 1.7, max: 8 },
  refineryMult: 1.5,

  // What every finished campaign planet gives you for good.
  perks: { sale: 0.25, cap: 10, speed: 15 },
  tools: {
    pick:  { name: 'Plasma Pick', mult: 1 },
    axe:   { name: 'Ion Axe',     mult: 2,   stars: 1, nodes: ['tree', 'palm', 'resin', 'bush', 'mushroom', 'cactus'] },
    drill: { name: 'Sonic Drill', mult: 1.8, stars: 2, nodes: ['crystal', 'magma', 'icespire', 'ironrock', 'goldvein', 'mesa', 'malachite', 'geode', 'bones', 'clam', 'coral', 'conch'] },
  },

  home: 3,                             // index of the home planet; travel opens there
  conveyor: { needs: { 112: 10 } },    // 10 iron ingots per producer
  crew: { perHabitat: 2, hire: 6000, growth: 1.6, workEvery: 8, eatEvery: 40, food: 30, speed: 95, cap: 6, hitEvery: 0.7 },

  // Once Halcyon is reached, other planets ship by cargo rocket instead of selling.
  hub: {
    rocketCap: 50, flight: 11, unload: 3,       // seconds each way, seconds on the hall pad
    away: 25,                                   // whole round trip: flight + unload + flight
    pad: { x: 205, y: 55 },                     // cargo rocket pad beside the warehouse, clear of the belts
    chest: { base: 40, step: 40, cost: 3000, growth: 1.7, max: 8 },   // portable chest, total items
    hall:  { base: 150, step: 150, cost: 6000, growth: 1.7, max: 8 },  // Halcyon hall, per resource
    hallAt: { x: 300, y: -290 },
  },

  // Smelter on Halcyon: iron and copper ore from the hall become ingots for building.
  smelter: {
    at: { x: -300, y: -270 }, pickup: { x: 110, y: -205 },  // smelter, and the ore pickup pad beside the hall
    road: [{ x: -130, y: -238 }, { x: 25, y: -238 }],        // where the tractor stops: smelter hopper, ore pickup
    ores: [12, 22], queue: 60, every: 1.4,                  // ore waiting in the furnace, seconds per ingot
    byHand: 20,                                            // ore you bring yourself before you can hire a driver
    driver: 15000, tractor: { cap: 16, speed: 150, load: 0.12 },
    heat: { base: 8000, growth: 1.8, max: 5, boost: 0.4 },  // furnace upgrades
  },
};

// Ingots are made from ore at the smelter; their code is the ore's code + 100.
SF.INGOTS = {
  112: { id: 'ironbar', name: 'Iron ingot', plural: 'Iron ingots', item: 'ingot', color: '#dfe5ee', dark: '#7d8696', edge: '#2a2f38', ore: 12 },
  122: { id: 'copperbar', name: 'Copper ingot', plural: 'Copper ingots', item: 'ingot', color: '#f0a060', dark: '#a8552a', edge: '#4a1f0c', ore: 22 },
};

// Resources are identified everywhere by a code: planet index * 10 + tier.
SF.res = code => SF.INGOTS[code] || SF.PLANETS[Math.floor(code / 10)].resources[code % 10];
SF.isIngot = code => !!SF.INGOTS[code];

SF.planet = i => SF.PLANETS[i == null ? SF.state.planet : i];
SF.planetName = i => SF.planet(i).name;
SF.mult = i => SF.planet(i).mult;
SF.atHome = () => SF.state.planet >= SF.CFG.home || SF.state.homeReached;

// The current planet's buildings and drones (each planet keeps its own once you can travel).
SF.ws = () => SF.state.worlds[SF.state.planet];

// True on a campaign planet once Halcyon is reached: the drop off becomes a warehouse.
SF.hubActive = () => SF.state.homeReached && SF.state.planet !== SF.CFG.home;

SF.stats = function () {
  const l = SF.state.lvl, s = Math.min(SF.state.stars, 3), k = SF.CFG.perks;
  return {
    cap: 10 + k.cap * s + 5 * l.cap,
    dmg: 1 + 0.5 * l.drill,
    hitEvery: Math.max(0.16, 0.4 - 0.02 * l.drill),
    speed: 210 + k.speed * s + 20 * l.speed,
  };
};

// The best tool you own for a node shape.
SF.toolFor = function (shape) {
  const T = SF.CFG.tools;
  for (const key of ['axe', 'drill']) if (SF.state.stars >= T[key].stars && T[key].nodes.includes(shape)) return key;
  return 'pick';
};

// Prices follow the planet you are on; once you can travel, they follow the home planet.
const priced = (base, growth, lvl) => Math.round(base * SF.mult(SF.atHome() ? SF.CFG.home : SF.state.planet) * Math.pow(growth, lvl));

SF.upgradeCost = key => { const u = SF.CFG.upgrades[key]; return priced(u.base, u.growth, SF.state.lvl[key]); };
SF.droneCost = () => { const d = SF.CFG.drone; return priced(d.base, d.growth, Math.max(0, SF.ws().drones - 1)); };
SF.producerCost = st => priced(SF.CFG.producer.base, SF.CFG.producer.growth, st.lvl);
SF.hireCost = () => { const c = SF.CFG.crew; return Math.round(c.hire * Math.pow(c.growth, SF.state.crew.length)); };
SF.resValue = code => SF.INGOTS[code] ? SF.resValue(SF.INGOTS[code].ore) * 1.6 : SF.res(code).value * SF.mult(Math.floor(code / 10));
SF.sellMult = () => (SF.ws().plots.ref && SF.ws().plots.ref.built ? SF.CFG.refineryMult : 1) * (1 + SF.CFG.perks.sale * SF.state.stars);
