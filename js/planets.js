// Every planet: look, layout and its five resources. Index 0 grows around the lander;
// 1-4 each get their own region, opened by a gate plot. Add a planet by adding an entry.
//
// Resource fields: node = how it looks in the world, item = how it looks when carried.
// color/dark/edge colour the item and particles; leaf/plant/stone/stem colour the node.
SF.PLANETS = [
  {
    id: 'kelvos', name: 'Kelvos', mult: 1,
    tagline: 'Crystal moorland under a violet sky',
    intro: 'Your lander touched down in a crystal grove. Mine it, haul it home, and build a launch pad to reach the next world.',
    theme: {
      ground: '#5b3f66', light: 'rgba(122,88,128,0.35)', dark: 'rgba(62,40,74,0.35)',
      crater: 'rgba(48,30,58,0.55)', rim: 'rgba(140,104,146,0.45)',
      specks: ['rgba(40,24,50,0.5)', 'rgba(150,116,150,0.45)', 'rgba(111,245,232,0.35)'],
      detail: 'craters', backdrop: '#2a1834', fog: 'rgba(18,8,30,0.74)', accent: '#6ff5e8',
    },
    regions: [{ angle: 0, dist: 1150, r: 540 }, { angle: 180, dist: 1150, r: 520 }, { angle: 270, dist: 1120, r: 520 }, { angle: 90, dist: 1180, r: 560 }],
    resources: [
      { id: 'shard', name: 'Shard', plural: 'Shards', node: 'crystal', item: 'gem', snd: 'glass', color: '#6ff5e8', dark: '#1e9aa3', edge: '#0d5a66' },
      { id: 'ember', name: 'Ember ore', plural: 'Ember ore', node: 'magma', item: 'ember', snd: 'magma', color: '#ffab4a', dark: '#c4521f', edge: '#5a2410', stone: '#3a2634', region: 'Ember Ridge', biome: 'volcanic', gate: 'Ridge Pylon' },
      { id: 'glowcap', name: 'Glowcap', plural: 'Glowcaps', node: 'mushroom', item: 'cap', snd: 'squish', color: '#b6ff6a', dark: '#4f9a2a', edge: '#23461a', stem: '#efe6f5', region: 'Glowcap Hollow', biome: 'enchanted', gate: 'Hollow Pylon' },
      { id: 'frost', name: 'Frost spar', plural: 'Frost spars', node: 'icespire', item: 'icicle', snd: 'ice', color: '#d6ecff', dark: '#5d8fd6', edge: '#24406e', region: 'Frost Shelf', biome: 'ice', gate: 'Shelf Pylon' },
      { id: 'pearl', name: 'Void pearl', plural: 'Void pearls', node: 'clam', item: 'orb', snd: 'shell', color: '#e0a6ff', dark: '#7a36c0', edge: '#3b1466', region: 'Void Basin', biome: 'void', gate: 'Basin Gate' },
    ],
    helpers: [
      { slot: 'h1', kind: 'drones', name: 'Drone Bay', unit: 'Drone', desc: 'Drones harvest for you' },
    ],
    machines: [
      { res: 0, style: 'excavator', name: 'Crystal Drill', desc: 'Drills shards on its own', research: 'autoKelvos' },
      { res: 1, style: 'excavator', name: 'Magma Pump', desc: 'Pumps ember ore on its own', research: 'autoKelvos' },
      { res: 2, style: 'sawmill', name: 'Glowcap Farm', desc: 'Grows glowcaps on its own', research: 'autoKelvos' },
    ],
  },
  {
    id: 'verdra', name: 'Verdra', mult: 1.5, hard: 0.25,
    tagline: 'A warm forest moon full of timber and ore',
    intro: 'Tall woods, berry thickets and iron in the gullies. Build a sawmill and a mine to keep the logs and ore coming.',
    theme: {
      ground: '#45603c', light: 'rgba(120,160,95,0.35)', dark: 'rgba(28,48,28,0.35)',
      crater: 'rgba(52,44,30,0.5)', rim: 'rgba(150,180,115,0.35)',
      specks: ['rgba(25,40,22,0.5)', 'rgba(165,195,125,0.4)', 'rgba(255,225,130,0.35)'],
      detail: 'grass', backdrop: '#16241a', fog: 'rgba(8,20,12,0.74)', accent: '#9be36a',
    },
    regions: [{ angle: 45, dist: 1150, r: 540 }, { angle: 225, dist: 1180, r: 540 }, { angle: 315, dist: 1150, r: 520 }, { angle: 135, dist: 1150, r: 560 }],
    resources: [
      { id: 'wood', name: 'Log', plural: 'Logs', node: 'tree', item: 'log', snd: 'wood', color: '#d39a5c', dark: '#7a4a26', edge: '#3d220f', leaf: '#5fb244', leafDark: '#2e6a2a' },
      { id: 'berry', name: 'Fire berry', plural: 'Fire berries', node: 'bush', item: 'berries', snd: 'squish', color: '#ff5f7a', dark: '#a3243e', edge: '#4d0f1d', leaf: '#3e8a3a', leafDark: '#1f4f22', region: 'Berry Thicket', biome: 'thicket', gate: 'Thicket Path' },
      { id: 'iron', name: 'Iron ore', plural: 'Iron ore', node: 'ironrock', item: 'ironore', snd: 'metal', color: '#dfe5ee', dark: '#6b7280', edge: '#2a2f38', stone: '#5a5660', rust: '#b5592a', region: 'Iron Gully', biome: 'quarry', gate: 'Gully Bridge' },
      { id: 'amber', name: 'Amber', plural: 'Amber', node: 'resin', item: 'amber', snd: 'resin', color: '#ffc23d', dark: '#c06a12', edge: '#5a2c06', region: 'Amber Grove', biome: 'grove', gate: 'Grove Gate' },
      { id: 'gold', name: 'Gold ore', plural: 'Gold ore', node: 'goldvein', item: 'nugget', snd: 'gold', color: '#ffe066', dark: '#c79a14', edge: '#5a4306', stone: '#34303a', region: 'Gold Ravine', biome: 'ravine', gate: 'Ravine Lift' },
    ],
    helpers: [
      { slot: 'h1', kind: 'producer', style: 'sawmill', res: 0, every: 2.2, pile: 12, name: 'Sawmill', desc: 'Cuts logs on its own' },
      { slot: 'h2', kind: 'producer', style: 'mine', res: 2, every: 3.5, pile: 10, name: 'Iron Mine', desc: 'Digs iron ore on its own' },
    ],
    machines: [
      { res: 1, style: 'sawmill', name: 'Berry Picker', desc: 'Picks fire berries on its own', research: 'autoVerdra' },
    ],
  },
  {
    id: 'duneveil', name: 'Duneveil', mult: 2.2, hard: 0.6, pace: 1.7,
    tagline: 'Copper dunes and buried giants',
    intro: 'Hot sand, hidden water in the cacti and fossils of things that once walked here. Skimmers and an excavator will help.',
    theme: {
      ground: '#c18f58', light: 'rgba(240,200,140,0.4)', dark: 'rgba(150,95,50,0.3)',
      crater: 'rgba(140,90,50,0.45)', rim: 'rgba(250,215,160,0.5)',
      specks: ['rgba(120,70,35,0.45)', 'rgba(255,230,180,0.5)', 'rgba(255,120,80,0.35)'],
      detail: 'ripples', backdrop: '#3a2414', fog: 'rgba(40,20,10,0.72)', accent: '#ffcf6a',
    },
    regions: [{ angle: 270, dist: 1150, r: 540 }, { angle: 90, dist: 1150, r: 540 }, { angle: 0, dist: 1170, r: 540 }, { angle: 180, dist: 1150, r: 560 }],
    resources: [
      { id: 'water', name: 'Cactus water', plural: 'Cactus water', node: 'cactus', item: 'drop', snd: 'water', color: '#7fd8ff', dark: '#2a7fb8', edge: '#123f5e', plant: '#5f9a4a', plantDark: '#2f5f2a' },
      { id: 'sandstone', name: 'Sandstone', plural: 'Sandstone', node: 'mesa', item: 'brick', snd: 'stone', color: '#ffe2b0', dark: '#c88a4a', edge: '#5e3a18', stone: '#a06a3a', region: 'Red Mesa', biome: 'mesa', gate: 'Mesa Ramp' },
      { id: 'copper', name: 'Copper ore', plural: 'Copper ore', node: 'malachite', item: 'malachite', snd: 'metal', color: '#4fe0b0', dark: '#1f8a66', edge: '#0c3a2a', stone: '#8a4a26', copper: '#d98a4e', region: 'Copper Flats', biome: 'flats', gate: 'Flats Gate' },
      { id: 'fossil', name: 'Fossil', plural: 'Fossils', node: 'bones', item: 'bone', snd: 'bone', color: '#f3ead6', dark: '#b5a383', edge: '#5e4f35', region: 'Bone Dunes', biome: 'dunes', gate: 'Dune Crawler' },
      { id: 'sunstone', name: 'Sunstone', plural: 'Sunstones', node: 'geode', item: 'sungem', snd: 'sun', color: '#ff7a55', dark: '#b0201e', edge: '#4f0a0a', region: 'Sunstone Rift', biome: 'rift', gate: 'Rift Bridge' },
    ],
    helpers: [
      { slot: 'h1', kind: 'drones', name: 'Skimmer Bay', unit: 'Skimmer', desc: 'Skimmers harvest for you' },
      { slot: 'h2', kind: 'producer', style: 'excavator', res: 1, every: 3, pile: 12, name: 'Excavator', desc: 'Digs sandstone on its own' },
    ],
    machines: [
      { res: 0, style: 'excavator', name: 'Cactus Condenser', desc: 'Draws cactus water on its own', research: 'autoDune' },
      { res: 2, style: 'mine', name: 'Copper Mine', desc: 'Digs copper ore on its own', research: 'autoDune' },
    ],
  },
  {
    id: 'halcyon', name: 'Halcyon', mult: 2.5, home: true, hard: 0.3,
    field: (x, y) => x < -150 && y > -200,     // sunfruit grows in the west field only, clear of the paths and buildings
    tagline: 'A warm lagoon world, gentle enough to call home',
    intro: 'Clear water, sweet fruit and no storms. Build your home base here. The rocket can now fly you back to every planet you know, to fetch materials for new buildings.',
    theme: {
      ground: '#69b984', light: 'rgba(175,235,175,0.4)', dark: 'rgba(30,110,85,0.3)',
      crater: 'rgba(60,160,180,0.5)', rim: 'rgba(205,250,215,0.5)',
      specks: ['rgba(35,100,70,0.45)', 'rgba(240,255,220,0.5)', 'rgba(255,150,200,0.45)'],
      detail: 'grass', backdrop: '#0f3b44', fog: 'rgba(10,40,50,0.7)', accent: '#7ff0c8',
    },
    regions: [{ angle: 0, dist: 1150, r: 540 }, { angle: 270, dist: 1150, r: 540 }],
    settlement: { angle: 90, dist: 1260, r: 640, name: 'New Haven' },
    resources: [
      { id: 'sunfruit', name: 'Sunfruit', plural: 'Sunfruit', node: 'palm', item: 'fruit', snd: 'palm', color: '#ffb340', dark: '#d0601a', edge: '#5a2a0a', leaf: '#62d08a', leafDark: '#24835a', trunk: '#7a4a26', trunkLight: '#a8703f', fruit: true },
      { id: 'coral', name: 'Lagoon coral', plural: 'Lagoon coral', node: 'coral', item: 'coralbit', snd: 'coral', color: '#ff9cc2', dark: '#d0457a', edge: '#5e1533', region: 'Coral Shallows', biome: 'shallows', gate: 'Shallows Pier' },
      { id: 'skyshell', name: 'Skyshell pearl', plural: 'Skyshell pearls', node: 'conch', item: 'shell', snd: 'shell', color: '#9af5ff', dark: '#2a9fb8', edge: '#0e4552', shell: ['#123f4a', '#1f6170', '#2a8193'], region: 'Skyshell Reef', biome: 'reef', gate: 'Reef Bridge' },
    ],
    helpers: [],
    machines: [
      { res: 0, style: 'sawmill', name: 'Sunfruit Orchard', desc: 'Picks sunfruit into the hall', research: 'autoHalcyon' },
      { res: 1, style: 'excavator', name: 'Coral Farm', desc: 'Grows coral into the hall', research: 'autoHalcyon' },
      { res: 2, style: 'mine', name: 'Pearl Diver', desc: 'Dives for skyshell pearls into the hall', research: 'autoHalcyon' },
    ],
    // Where the machines stand on Halcyon: [first, second] per resource tier.
    machineSpots: [[[-560, 120], [-520, 380]], [[520, 250], [470, 460]], [[-170, -590], [-430, -500]]],
    // Buildings of the home base. needs = materials from the hall, by resource code (ingots: 112 iron, 122 copper).
    homePlots: [
      { id: 'g4', kind: 'gate', name: 'Haven Bridge', desc: 'Opens New Haven', cost: 25000, needs: { 10: 200 }, requires: 'g3' },
    ],
  },
];

// Balance shared by every planet, by resource tier (0 = home).
SF.TIERS = [
  { value: 20,  hp: 3,  drops: 3, regrow: 7,  count: 24, r: 26 },
  { value: 60,  hp: 7,  drops: 3, regrow: 10, count: 14, r: 30 },
  { value: 150, hp: 10, drops: 3, regrow: 11, count: 14, r: 28 },
  { value: 350, hp: 16, drops: 2, regrow: 13, count: 13, r: 26 },
  { value: 800, hp: 24, drops: 2, regrow: 15, count: 12, r: 28 },
];

// Fill in tier defaults; a resource can still override any of them.
// `hard` makes the higher tiers of a planet tougher, so ores feel different to mine.
SF.PLANETS.forEach(p => p.resources.forEach((r, i) => {
  const own = r.hp;
  Object.assign(r, Object.assign({ tier: i }, SF.TIERS[i], r));
  if (own == null) r.hp = Math.round(r.hp * (1 + (p.hard || 0) * i));
}));

// Build the region and plot list for one planet from its data.
SF.layoutPlanet = function (planet) {
  const C = SF.CFG, rad = d => d * Math.PI / 180, m = planet.mult;
  const regions = [{ id: 'r0', x: C.base.x, y: C.base.y, r: C.base.r, name: 'Landing Site', res: 0 }];
  const at = (g, k) => [Math.cos(rad(g.angle)) * k, Math.sin(rad(g.angle)) * k];
  planet.regions.forEach((g, i) => {
    const [x, y] = at(g, g.dist);
    regions.push({ id: 'r' + (i + 1), x, y, r: g.r, name: planet.resources[i + 1].region, res: i + 1, unlock: 'g' + (i + 2) });
  });
  const sett = planet.settlement;
  if (sett) {
    const [x, y] = at(sett, sett.dist);
    regions.push({ id: 'rs', x, y, r: sett.r, name: sett.name, res: null, unlock: 'g' + (planet.regions.length + 2), settlement: true });
  }

  const plots = [];
  const plot = (id, kind, name, desc, x, y, extra) => plots.push(Object.assign({
    id, kind, name, desc, x: Math.round(x), y: Math.round(y),
    cost: Math.round(C.plotCosts[id] * m * (planet.pace || 1)), requires: C.plotRequires[id],
  }, extra));

  planet.regions.forEach((g, i) => {
    const r = planet.resources[i + 1];
    plot('g' + (i + 2), 'gate', r.gate, 'Opens ' + r.region, ...at(g, C.gateRadius), { res: i + 1 });
  });

  // Buildings take the spots between the gates, nearest the start first.
  const angles = planet.regions.concat(sett ? [sett] : []).map(g => g.angle);
  const spots = angles.map(a => rad(a + 45)).sort((a, b) => Math.sin(b) - Math.sin(a));
  const spot = () => { const a = spots.shift(); return [Math.cos(a) * C.spotRadius, Math.sin(a) * C.spotRadius]; };

  if (planet.home) {
    plot('ref', 'refinery', 'Refinery', 'Everything sells for +50%', ...spot(), { requires: 'g2' });
    plot('launch', 'launch', 'Rocket', 'Travel to other planets', ...spot(), { prebuilt: true, requires: null });
    Object.assign(plots.find(p => p.id === 'g3'), { requires: 'g2', cost: Math.round(5000 * m) });
    const reg = regions.find(r => r.settlement);
    for (const h of planet.homePlots) {
      const [x, y] = h.at ? [reg.x + h.at[0], reg.y + h.at[1]] : at(sett, C.gateRadius);
      plots.push(Object.assign({}, h, { x: Math.round(x), y: Math.round(y) }));
    }
    // Empty building lots in New Haven: you choose what goes where (see SF.BUILDS).
    C.haven.lots.forEach(([dx, dy], i) => plots.push({
      id: 'L' + (i + 1), kind: 'lot', lot: true, name: 'Building lot', desc: 'Stand here to choose a building', cost: 0,
      requires: 'g4', x: Math.round(reg.x + dx), y: Math.round(reg.y + dy),
    }));
  } else {
    for (const id of ['h1', 'ref', 'h2', 'launch']) {
      if (id === 'ref') { plot('ref', 'refinery', 'Refinery', 'Everything sells for +50%', ...spot()); continue; }
      if (id === 'launch') { plot('launch', 'launch', 'Launch Pad', 'Fly on to a new planet', ...spot()); continue; }
      const h = planet.helpers.find(x => x.slot === id);
      if (h) plot(id, h.kind, h.name, h.desc, ...spot(), { helper: h });
    }
  }
  // Machines for the three common resources: one per resource (the planet's own producer, or one unlocked by
  // research), plus a second copy once 'twin' is researched. They stand beside the gates, clear of the trails.
  const MACH = [{ every: 2.4, pile: 12 }, { every: 3.2, pile: 10 }, { every: 4, pile: 10 }];
  for (let t = 0; t < 3; t++) {
    let place;
    if (planet.machineSpots) place = k => planet.machineSpots[t][k];
    else {
      const a = planet.regions[(t + 3) % planet.regions.length].angle;
      place = k => at({ angle: a + (k ? -28 : 28) }, 580);
    }
    const own = plots.find(p => p.kind === 'producer' && p.helper.res === t);
    const mc = (planet.machines || []).find(x => x.res === t);
    let first = own;
    if (!own && mc) {
      const [x, y] = place(0);
      first = { id: 'm' + t + 'a', kind: 'producer', name: mc.name, desc: mc.desc, x: Math.round(x), y: Math.round(y), research: mc.research,
        cost: Math.round(30000 * (1 + 0.6 * t) * m), requires: t ? 'g' + (t + 1) : null, helper: Object.assign({ res: t, style: mc.style }, MACH[t]) };
      plots.push(first);
    }
    if (!first) continue;
    const [x, y] = place(own ? 0 : 1);
    plots.push({ id: 'm' + t + 'b', kind: 'producer', name: first.name + ' II', desc: first.desc, x: Math.round(x), y: Math.round(y), research: 'twin',
      cost: Math.round(Math.max(first.cost * 2, 60000 * m)), requires: first.id, helper: Object.assign({}, first.helper) });
  }
  return { regions, plots };
};

// What a lot in New Haven shows once you chose a building for it (its kind, price and materials live in the save).
SF.applyLots = function (plots, ws) {
  for (const p of plots) {
    if (!p.lot) continue;
    const st = ws && ws.plots[p.id], b = st && st.kind && SF.BUILDS[st.kind];
    if (b) Object.assign(p, { kind: st.kind, name: b.name, desc: b.desc, cost: st.cost, needs: st.needs });
    else Object.assign(p, { kind: 'lot', name: 'Building lot', desc: 'Stand here to choose a building', cost: 0, needs: null });
  }
  return plots;
};

// How many buildings of a kind stand (or are planned) on Halcyon.
SF.homeCount = function (kind, builtOnly) {
  const ws = SF.state.worlds[SF.CFG.home];
  if (!ws) return 0;
  return Object.values(ws.plots).filter(st => st.kind === kind && (!builtOnly || st.built)).length;
};
SF.homeHas = kind => SF.homeCount(kind, true) > 0;
