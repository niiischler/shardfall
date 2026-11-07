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
      { id: 'shard', name: 'Shard', plural: 'Shards', node: 'crystal', item: 'gem', color: '#6ff5e8', dark: '#1e9aa3', edge: '#0d5a66' },
      { id: 'ember', name: 'Ember ore', plural: 'Ember ore', node: 'rock', item: 'chunk', color: '#ffab4a', dark: '#c4521f', edge: '#5a2410', stone: '#4a3040', region: 'Ember Ridge', gate: 'Ridge Pylon' },
      { id: 'glowcap', name: 'Glowcap', plural: 'Glowcaps', node: 'mushroom', item: 'cap', color: '#b6ff6a', dark: '#4f9a2a', edge: '#23461a', stem: '#efe6f5', region: 'Glowcap Hollow', gate: 'Hollow Pylon' },
      { id: 'frost', name: 'Frost spar', plural: 'Frost spars', node: 'crystal', item: 'gem', color: '#d6ecff', dark: '#5d8fd6', edge: '#24406e', region: 'Frost Shelf', gate: 'Shelf Pylon' },
      { id: 'pearl', name: 'Void pearl', plural: 'Void pearls', node: 'clam', item: 'orb', color: '#e0a6ff', dark: '#7a36c0', edge: '#3b1466', region: 'Void Basin', gate: 'Basin Gate' },
    ],
    helpers: [
      { slot: 'h1', kind: 'drones', name: 'Drone Bay', unit: 'Drone', desc: 'Drones harvest for you' },
    ],
  },
  {
    id: 'verdra', name: 'Verdra', mult: 1.5,
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
      { id: 'wood', name: 'Log', plural: 'Logs', node: 'tree', item: 'log', color: '#d39a5c', dark: '#7a4a26', edge: '#3d220f', leaf: '#5fb244', leafDark: '#2e6a2a' },
      { id: 'berry', name: 'Fire berry', plural: 'Fire berries', node: 'bush', item: 'orb', color: '#ff5f7a', dark: '#a3243e', edge: '#4d0f1d', leaf: '#3e8a3a', leafDark: '#1f4f22', region: 'Berry Thicket', gate: 'Thicket Path' },
      { id: 'iron', name: 'Iron ore', plural: 'Iron ore', node: 'rock', item: 'chunk', color: '#dfe5ee', dark: '#6b7280', edge: '#2a2f38', stone: '#4b4a4f', region: 'Iron Gully', gate: 'Gully Bridge' },
      { id: 'amber', name: 'Amber', plural: 'Amber', node: 'crystal', item: 'gem', color: '#ffc23d', dark: '#c06a12', edge: '#5a2c06', region: 'Amber Grove', gate: 'Grove Gate' },
      { id: 'gold', name: 'Gold ore', plural: 'Gold ore', node: 'rock', item: 'chunk', color: '#ffe066', dark: '#c79a14', edge: '#5a4306', stone: '#3a3530', region: 'Gold Ravine', gate: 'Ravine Lift' },
    ],
    helpers: [
      { slot: 'h1', kind: 'producer', style: 'sawmill', res: 0, every: 2.2, pile: 12, name: 'Sawmill', desc: 'Cuts logs on its own' },
      { slot: 'h2', kind: 'producer', style: 'mine', res: 2, every: 3.5, pile: 10, name: 'Iron Mine', desc: 'Digs iron ore on its own' },
    ],
  },
  {
    id: 'duneveil', name: 'Duneveil', mult: 2.2,
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
      { id: 'water', name: 'Cactus water', plural: 'Cactus water', node: 'cactus', item: 'drop', color: '#7fd8ff', dark: '#2a7fb8', edge: '#123f5e', plant: '#5f9a4a', plantDark: '#2f5f2a' },
      { id: 'sandstone', name: 'Sandstone', plural: 'Sandstone', node: 'rock', item: 'chunk', color: '#ffe2b0', dark: '#c88a4a', edge: '#5e3a18', stone: '#a06a3a', region: 'Red Mesa', gate: 'Mesa Ramp' },
      { id: 'copper', name: 'Copper ore', plural: 'Copper ore', node: 'rock', item: 'chunk', color: '#4fe0b0', dark: '#b8662e', edge: '#4a230c', stone: '#6a4a3a', region: 'Copper Flats', gate: 'Flats Gate' },
      { id: 'fossil', name: 'Fossil', plural: 'Fossils', node: 'bones', item: 'bone', color: '#f3ead6', dark: '#b5a383', edge: '#5e4f35', region: 'Bone Dunes', gate: 'Dune Crawler' },
      { id: 'sunstone', name: 'Sunstone', plural: 'Sunstones', node: 'crystal', item: 'gem', color: '#ff7a55', dark: '#b0201e', edge: '#4f0a0a', region: 'Sunstone Rift', gate: 'Rift Bridge' },
    ],
    helpers: [
      { slot: 'h1', kind: 'drones', name: 'Skimmer Bay', unit: 'Skimmer', desc: 'Skimmers harvest for you' },
      { slot: 'h2', kind: 'producer', style: 'excavator', res: 1, every: 3, pile: 12, name: 'Excavator', desc: 'Digs sandstone on its own' },
    ],
  },
];

// Balance shared by every planet, by resource tier (0 = home).
SF.TIERS = [
  { value: 2,  hp: 3,  drops: 3, regrow: 7,  count: 24, r: 26 },
  { value: 6,  hp: 7,  drops: 3, regrow: 10, count: 14, r: 30 },
  { value: 15, hp: 10, drops: 3, regrow: 11, count: 14, r: 28 },
  { value: 35, hp: 16, drops: 2, regrow: 13, count: 13, r: 26 },
  { value: 80, hp: 24, drops: 2, regrow: 15, count: 12, r: 28 },
];

// Fill in tier defaults; a resource can still override any of them.
SF.PLANETS.forEach(p => p.resources.forEach((r, i) => Object.assign(r, Object.assign({ tier: i }, SF.TIERS[i], r))));

// Build the region and plot list for one planet from its data.
SF.layoutPlanet = function (planet) {
  const C = SF.CFG, rad = d => d * Math.PI / 180;
  const regions = [{ id: 'r0', x: C.base.x, y: C.base.y, r: C.base.r, name: 'Landing Site', res: 0 }];
  planet.regions.forEach((g, i) => {
    const a = rad(g.angle);
    regions.push({ id: 'r' + (i + 1), x: Math.cos(a) * g.dist, y: Math.sin(a) * g.dist, r: g.r,
      name: planet.resources[i + 1].region, res: i + 1, unlock: 'g' + (i + 2) });
  });

  const plots = [];
  const plot = (id, kind, name, desc, x, y, extra) => plots.push(Object.assign({
    id, kind, name, desc, x: Math.round(x), y: Math.round(y),
    cost: Math.round(C.plotCosts[id] * SF.mult()), requires: C.plotRequires[id],
  }, extra));

  planet.regions.forEach((g, i) => {
    const a = rad(g.angle), r = planet.resources[i + 1];
    plot('g' + (i + 2), 'gate', r.gate, 'Opens ' + r.region, Math.cos(a) * C.gateRadius, Math.sin(a) * C.gateRadius, { res: i + 1 });
  });

  // Buildings take the spots between the gates, in chain order.
  const spots = planet.regions.map(g => rad(g.angle + 45)).sort((a, b) => Math.sin(b) - Math.sin(a));
  const spot = () => { const a = spots.shift(); return [Math.cos(a) * C.spotRadius, Math.sin(a) * C.spotRadius]; };
  const order = ['h1', 'ref', 'h2', 'launch'];
  for (const id of order) {
    if (id === 'ref') { plot('ref', 'refinery', 'Refinery', 'Everything sells for +50%', ...spot()); continue; }
    if (id === 'launch') { plot('launch', 'launch', 'Launch Pad', 'Fly on to a new planet', ...spot()); continue; }
    const h = planet.helpers.find(x => x.slot === id);
    if (h) plot(id, h.kind, h.name, h.desc, ...spot(), { helper: h });
  }
  return { regions, plots };
};
