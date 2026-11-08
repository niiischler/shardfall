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
  trailWidth: 85,                      // half width of the clear trail from the landing site to each region

  upgrades: {
    cap:   { name: 'Cargo Pack',     base: 200, growth: 1.55, max: 15 },
    drill: { name: 'Tool Power',     base: 300, growth: 1.6,  max: 15 },
    speed: { name: 'Thruster Boots', base: 250, growth: 1.6,  max: 10 },
  },

  // Campaign planets: base costs before the planet multiplier, and the order plots appear in.
  plotCosts: { g2: 1200, h1: 3200, ref: 7500, g3: 15000, h2: 26000, g4: 40000, g5: 90000, launch: 200000 },
  plotRequires: { g2: null, h1: 'g2', ref: 'g2', g3: 'g2', h2: 'g3', g4: 'g3', g5: 'g4', launch: 'g5' },

  drone: { cap: 5, speed: 170, hitEvery: 0.6, max: 6, base: 1800, growth: 1.75, awayEvery: 3 },  // awayEvery: s per item while you are elsewhere
  producer: { base: 5000, growth: 1.85, max: 8, driver: 9000,   // driver: hire cost before the planet multiplier
    mk2: { levels: 5, boost: 1.6, credits: 90000, needs: { 112: 60, 122: 30 } },   // research 'mk2': rebuild a maxed producer for 5 more levels
  },
  refineryMult: 1.5,

  // What every finished campaign planet gives you for good.
  perks: { sale: 0.25, cap: 10, speed: 15 },
  tools: {
    pick:  { name: 'Plasma Pick', mult: 1 },
    axe:   { name: 'Ion Axe',     mult: 2,   stars: 1, nodes: ['tree', 'palm', 'resin', 'bush', 'mushroom', 'cactus'] },
    drill: { name: 'Sonic Drill', mult: 1.8, stars: 2, nodes: ['crystal', 'magma', 'icespire', 'ironrock', 'goldvein', 'mesa', 'malachite', 'geode', 'bones', 'clam', 'coral', 'conch', 'oilseep', 'gasvent'] },
  },

  home: 3,                             // index of the home planet; travel opens there
  // Fuel Plant (New Haven): inputs from the hall become rocket fuel in one shared tank (js/fuel.js).
  fuel: { cap: 600, every: 1.2, trip: 25,     // tank size, seconds per input item, fuel for a flight to or from a far planet
    inputs: [{ code: 40, fuel: 4 }, { code: 41, fuel: 3 }, { code: 10, fuel: 0.5 }] },   // crude oil, natural gas, logs
  pipe: { needs: { 122: 30 } },        // copper pipeline for liquids (Petra), instead of a belt
  conveyor: { needs: { 112: 30 }, every: 0.8, speedUp: 0.6,   // 30 iron ingots per belt; 1 item every 0.8s, +60% per belt level
    up: { credits: 20000, growth: 1.8, mats: { 112: 20, 122: 10 } } },   // belt upgrades at the Belt Factory (research 'beltTech')

  // New Haven on Halcyon: empty lots, relative to the settlement centre. You pick the building for each.
  haven: { lots: [[-270, -230], [0, -230], [270, -230], [-270, 70], [0, 70], [270, 70], [-270, 370], [0, 370], [270, 370]] },

  // Crew food once a canteen stands: sunfruit becomes meals, cactus water becomes drinks.
  food: {
    meal: 30, drink: 20, per: 3, cookEvery: 2, cap: 60,     // input codes, items per serving, seconds per item cooked, stock cap
    eatEvery: 70, drinkEvery: 55, low: 0.25,                // a full meter lasts this long; below `low` they go for more
    walkHome: 30, walkAway: 8,                              // work lost walking to the canteen / warehouse while you are elsewhere
    driver: 12000, drivers: 2, carSpeed: 230,               // delivery car drivers at the canteen
    pantry: 3,                                              // servings per crew member each supply run brings out
    feast: 50, elixir: 51, fine: 2,                         // Edenia food: moonmelon feasts and nectar elixirs keep crew full twice as long
  },
  crew: { perHabitat: 2, hire: 6000, growth: 1.6, workEvery: 8, rareSlow: [1, 1, 1, 2.5, 4], eatEvery: 40, food: 30, speed: 95, cap: 6, hitEvery: 0.7 },

  // Once Halcyon is reached, other planets ship by cargo rocket instead of selling.
  hub: {
    rocketCap: 50, flight: 11, unload: 3,       // seconds each way, seconds on the hall pad
    away: 25,                                   // whole round trip: flight + unload + flight
    pad: { x: 205, y: 55 },                     // cargo rocket pad beside the warehouse, clear of the belts
    chest: { base: 40, step: 40, cost: 8000, growth: 1.85, max: 8 },   // portable chest, total items
    hall:  { base: 150, step: 150, cost: 20000, growth: 1.9, max: 8 },  // Halcyon hall, per resource
    wh:    { base: 200, step: 150, cost: 15000, growth: 1.9, max: 8 },  // warehouse on each other planet, total items (cost x planet multiplier)
    hallAt: { x: 300, y: -290 },
  },

  // Rocket Workshop (New Haven): rocket models for the cargo routes. cap and flight multiply the normal rocket.
  // A model is built once; then any route can fly it. Its cargo frame upgrades add `frame.step` capacity per level.
  rockets: {
    models: {
      std:     { name: 'Freighter', desc: 'The rocket every route starts with. Its solar sail needs no fuel.', fuel: 0, cap: 1, flight: 1, body: '#f2f0f8', trim: '#ff8f5a' },
      courier: { name: 'Swift Courier', fuel: 2, desc: 'Small bay, but there and back in half the time.', cap: 0.6, flight: 0.45, body: '#e8fbff', trim: '#6ff5e8',
        cost: 150000, needs: { 112: 150, 122: 100, 4: 20 } },
      heavy:   { name: 'Heavy Hauler', fuel: 6, desc: 'Three times the cargo of a freighter, but slow.', cap: 3, flight: 1.7, body: '#ffe9b8', trim: '#c88a4a', wide: true,
        cost: 300000, needs: { 112: 400, 122: 250, 23: 80 } },
      tanker:  { name: 'Tanker', fuel: 4, desc: 'Pressure tanks for liquids and gases. Only a tanker can carry them.', cap: 2, flight: 1.2, body: '#dfe5ee', trim: '#7fd8ff', liquid: true,
        cost: 400000, needs: { 112: 300, 122: 400, 24: 60 }, locked: 'Needs a planet with liquids or gases. Find one on the star map.' },
    },
    frame: { cost: 40000, growth: 1.8, max: 10, step: 0.25, mats: { 112: 40, 122: 20 } },
  },

  // Smelter on Halcyon: iron and copper ore from the hall become ingots for building.
  smelter: {
    at: { x: -300, y: -270 }, pickup: { x: 110, y: -205 },  // smelter, and the ore pickup pad beside the hall
    road: [{ x: -130, y: -238 }, { x: 25, y: -238 }],        // where the tractor stops: smelter hopper, ore pickup
    ores: [12, 22], queue: 60, every: 1.4,                  // ore waiting in the furnace, seconds per ingot
    byHand: 20,                                            // ore you bring yourself before you can hire a driver
    driver: 15000, tractor: { cap: 16, speed: 150, load: 0.12 },
    hauler: 40000, haulLane: 30, outCap: 40,                // second driver: ingots from the tray to the hall
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
SF.producerCost = st => priced(SF.CFG.producer.base, SF.CFG.producer.growth, st.lvl) * (st.mk ? 2 : 1);
SF.beltEvery = st => SF.CFG.conveyor.every / (1 + SF.CFG.conveyor.speedUp * (st.beltLvl || 0));
SF.beltCost = (st, pi) => {
  const u = SF.CFG.conveyor.up, l = st.beltLvl || 0;
  return { credits: Math.round(u.credits * Math.pow(u.growth, l) * SF.mult(pi)), mats: Object.fromEntries(Object.entries(u.mats).map(([c, n]) => [c, n * (l + 1)])) };
};
// Belt Factory on Halcyon: upgrade any belt on any planet, up to the researched level. Materials come from the hall.
SF.upgradeBelt = (pi, id) => {
  const st = SF.state.worlds[pi] && SF.state.worlds[pi].plots[id];
  if (!st || !st.belt || (st.beltLvl || 0) >= SF.R('beltTech')) { SF.Audio.nope(); return false; }
  const c = SF.beltCost(st, pi), h = SF.state.hold;
  if (SF.state.credits < c.credits || Object.keys(c.mats).some(k => (h[k] || 0) < c.mats[k])) { SF.Audio.nope(); return false; }
  SF.state.credits -= c.credits;
  for (const k in c.mats) { h[k] -= c.mats[k]; if (!h[k]) delete h[k]; }
  st.beltLvl = (st.beltLvl || 0) + 1;
  SF.Audio.build();
  SF.save(); SF.UI.refresh();
  return true;
};
SF.producerMax = st => SF.CFG.producer.max + (st.mk ? SF.CFG.producer.mk2.levels : 0);
SF.hireCost = () => { const c = SF.CFG.crew; return Math.round(c.hire * Math.pow(c.growth, SF.state.crew.length)); };
SF.resValue = code => SF.INGOTS[code] ? SF.resValue(SF.INGOTS[code].ore) * 1.6 : SF.res(code).value * SF.mult(Math.floor(code / 10));
SF.sellMult = () => (SF.ws().plots.ref && SF.ws().plots.ref.built ? SF.CFG.refineryMult : 1) * (1 + SF.CFG.perks.sale * SF.state.stars);

// Buildings you can put on a New Haven lot. n = how many of that kind you already have (or planned).
SF.BUILDS = {
  habitat: {
    name: 'Habitat', desc: 'Beds for 2 crew', icon: 'bed',
    cost: n => Math.round(20000 * Math.pow(1.9, n)),
    needs: n => Object.assign({ 10: 250 + 150 * n, 21: 150 + 120 * n }, n >= 1 ? { 0: 200 * n } : {}, n >= 2 ? { 3: 60 * n } : {}),
  },
  factory: { name: 'Belt Factory', desc: 'Conveyor belts for producers', unique: true, cost: () => 60000, needs: () => ({ 112: 200, 122: 100 }) },
  lab: { name: 'Research Lab', desc: 'Research rockets, drones and industry', unique: true, cost: () => 80000, needs: () => ({ 112: 150, 0: 400, 31: 200 }) },
  workshop: { name: 'Rocket Workshop', desc: 'New rocket models for the cargo routes', unique: true, cost: () => 250000, needs: () => ({ 112: 300, 122: 200, 10: 400 }) },
  fuelplant: { name: 'Fuel Plant', desc: 'Refines logs, oil and gas into rocket fuel', unique: true, cost: () => 120000, needs: () => ({ 112: 200, 122: 120, 10: 300 }) },
  canteen: { name: 'Canteen', desc: 'Cooks meals and drinks for the crew', unique: true, cost: () => 50000, needs: () => ({ 10: 300, 21: 200, 122: 50 }) },
};

// Research trees in the lab. Each level costs credits plus materials from the hall; `after` must be researched first.
SF.RESEARCH = [
  { id: 'rocket', name: 'Rocket technology', color: '#ff8f5a', nodes: [
    { id: 'engines', name: 'Faster engines', max: 3, eff: l => `Cargo rockets fly ${Math.round(15 * l)}% faster`, mats: { 112: 60, 24: 40 } },
    { id: 'bay', name: 'Bigger cargo bay', max: 3, after: 'engines', eff: l => `Rockets carry ${SF.CFG.hub.rocketCap + 25 * l}`, mats: { 122: 60, 10: 160 } },
  ] },
  { id: 'auto', name: 'Autonomous harvesting', color: '#6ff5e8', nodes: [
    { id: 'motors', name: 'Drone motors', max: 3, eff: l => `Drones fly ${Math.round(20 * l)}% faster`, mats: { 1: 120, 122: 40 } },
    { id: 'pods', name: 'Drone cargo pods', max: 3, after: 'motors', eff: l => `Drones carry ${SF.CFG.drone.cap + 2 * l}`, mats: { 13: 80, 21: 120 } },
    { id: 'beams', name: 'Drone tool power', max: 3, after: 'pods', eff: l => `Drone beams hit ${Math.round(50 * l)}% harder`, mats: { 3: 80, 112: 60 } },
  ] },
  { id: 'industry', name: 'Industry', color: '#ffd36b', nodes: [
    { id: 'presses', name: 'Faster producers', max: 3, eff: l => `Sawmills, mines and excavators work ${Math.round(20 * l)}% faster`, mats: { 112: 80, 23: 60 } },
    { id: 'training', name: 'Crew training', max: 3, after: 'presses', eff: l => `Crew work ${Math.round(25 * l)}% faster`, mats: { 11: 120, 31: 80 } },
    { id: 'recipes', name: 'Better recipes', max: 3, after: 'training', eff: l => `${SF.foodPer(l)} sunfruit or cactus water per serving`, mats: { 2: 100, 32: 40 } },
  ] },
  // Machines only ever work the three common resources of a planet; the rare ones stay crew work.
  { id: 'machines', name: 'Machines', color: '#9be36a', nodes: [
    { id: 'autoKelvos', name: 'Kelvos machines', max: 1, credits: 60000, eff: () => 'Crystal drill, magma pump and glowcap farm on Kelvos', mats: { 112: 80, 3: 40 } },
    { id: 'autoVerdra', name: 'Verdra machines', max: 1, credits: 60000, eff: () => 'Berry picker on Verdra', mats: { 112: 80, 13: 40 } },
    { id: 'autoDune', name: 'Duneveil machines', max: 1, credits: 80000, eff: () => 'Cactus condenser and copper mine on Duneveil', mats: { 122: 80, 23: 40 } },
    { id: 'autoPetra', name: 'Petra machines', max: 1, credits: 250000, eff: () => 'Sulfur drill on Petra', mats: { 122: 150, 42: 60 } },
    { id: 'autoEdenia', name: 'Edenia machines', max: 1, credits: 300000, eff: () => 'Melon farm and spice picker on Edenia', mats: { 112: 150, 52: 60 } },
    { id: 'autoHalcyon', name: 'Halcyon machines', max: 1, credits: 100000, eff: () => 'Sunfruit orchard, coral farm and pearl diver on Halcyon, straight into the hall', mats: { 122: 80, 24: 40 } },
    { id: 'twin', name: 'Second plant', max: 1, credits: 150000, after: 'presses', eff: () => 'Build a second copy of every machine', mats: { 112: 200, 122: 100, 14: 40 } },
    { id: 'beltTech', name: 'Faster belts', max: 3, credits: 50000, after: 'presses', eff: l => `Belts can be upgraded to level ${l} at the Belt Factory`, mats: { 112: 100, 122: 60, 21: 200 } },
    { id: 'mk2', name: 'Mk2 machines', max: 1, credits: 200000, after: 'presses', eff: () => `Rebuild a maxed machine as Mk2: ${SF.CFG.producer.mk2.levels} more levels, faster`, mats: { 112: 250, 122: 150, 4: 30 } },
  ] },
];
SF.RESEARCH_NODES = SF.RESEARCH.flatMap(t => t.nodes.map(n => Object.assign({ tree: t }, n)));
// Current level of a research node.
SF.R = id => (SF.state && SF.state.research && SF.state.research[id]) || 0;
// Items the canteen needs for one meal or drink; better recipes need less.
SF.foodPer = l => [3, 2.5, 2, 1.5][Math.min(3, l == null ? SF.R('recipes') : l)];
SF.researchCost = (node, l) => ({
  credits: Math.round((node.credits || 25000) * Math.pow(1.8, l)),
  mats: Object.fromEntries(Object.entries(node.mats).map(([c, n]) => [c, n * (l + 1)])),
});
