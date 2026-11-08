// HTML overlay: credit counter, goal line, station panels, menu, intro and arrival cards.
SF.UI = (function () {
  const C = SF.CFG;
  const $ = id => document.getElementById(id);
  let els = {}, shown = 0, refs = [], keyed = [], bumpT = 0, introGone = false, curZone = null, curDef = null;

  // Compact numbers: 12, 2.5, 1.2k, 34k, 1.5M.
  function fmt(n) {
    if (n < 100 && n % 1) return n.toFixed(1).replace(/\.0$/, '');
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  const NOUNS = { crystal: 'crystal', clam: 'clam', tree: 'tree', palm: 'palm', mushroom: 'mushroom', bush: 'bush', cactus: 'cactus', bones: 'fossil',
    magma: 'magma rock', icespire: 'ice spire', ironrock: 'iron boulder', resin: 'resin stump', goldvein: 'gold vein', mesa: 'mesa block', malachite: 'copper lode', geode: 'geode', coral: 'coral', conch: 'shell' };

  const PLURALS = { crystal: 'crystals', clam: 'clams', tree: 'trees', palm: 'palms', mushroom: 'mushrooms', bush: 'bushes', cactus: 'cacti', bones: 'fossils',
    magma: 'magma rocks', icespire: 'ice spires', ironrock: 'iron boulders', resin: 'resin stumps', goldvein: 'gold veins', mesa: 'mesa blocks', malachite: 'copper lodes', geode: 'geodes', coral: 'corals', conch: 'shells' };

  const effects = {
    cap: l => `Carry ${SF.stats().cap - 5 * SF.state.lvl.cap + 5 * l}`,
    drill: l => `${(1 + 0.5 * l).toFixed(1)} dmg · ${(1 / Math.max(0.16, 0.4 - 0.02 * l)).toFixed(1)} hits/s`,
    speed: l => `Speed ${SF.stats().speed - 20 * SF.state.lvl.speed + 20 * l}`,
  };

  // What finishing a campaign planet gives you (shown on arrival).
  function perksFor(stars) {
    const k = C.perks, list = [`+${k.cap} cargo slots`, `+${k.speed} move speed`, `+${Math.round(k.sale * 100)}% on every sale`];
    for (const key in C.tools) {
      const t = C.tools[key];
      if (t.stars === stars) list.push(`New tool: ${t.name} (${t.nodes.filter(n => SF.PLANETS.slice(0, stars + 1).some(p => p.resources.some(r => r.node === n))).map(n => PLURALS[n]).join(', ')} break ${t.mult}x faster)`);
    }
    if (stars === C.home) {
      list.push('Travel: fly between all planets from now on');
      list.push('Warehouses: drop offs on the other planets now fill cargo rockets that fly to the hall on Halcyon');
      list.push('Material chest: comes with you to the other planets');
      list.push('Smelter: turns iron and copper ore into the ingots your buildings need');
      list.push('New Haven: choose for yourself what to build on each lot (habitats, belt factory, research lab, canteen)');
    }
    return list;
  }

  function init() {
    els = {
      credits: $('credits'), creditBox: $('credit-box'), goal: $('goal'), planet: $('planet-chip'),
      panel: $('panel'), panelTitle: $('panel-title'), panelEyebrow: $('panel-eyebrow'), panelBody: $('panel-body'), prompt: $('prompt'), promptTitle: $('prompt-title'),
      sound: $('btn-sound'), menuBtn: $('btn-menu'), menu: $('menu'), intro: $('intro'),
      reset: $('btn-reset'), resetConfirm: $('reset-confirm'), resetYes: $('btn-reset-yes'), resetNo: $('btn-reset-no'),
      closeMenu: $('btn-close-menu'), stats: $('menu-stats'), arrive: $('arrive'),
    };
    els.sound.addEventListener('click', () => {
      SF.Audio.init();
      const m = !SF.Audio.isMuted();
      SF.Audio.setMuted(m); SF.state.muted = m; SF.save(); syncSound();
    });
    els.menuBtn.addEventListener('click', () => openMenu(true));
    els.closeMenu.addEventListener('click', () => openMenu(false));
    els.reset.addEventListener('click', () => { els.resetConfirm.hidden = false; els.reset.hidden = true; });
    els.resetNo.addEventListener('click', () => { els.resetConfirm.hidden = true; els.reset.hidden = false; });
    els.resetYes.addEventListener('click', () => { SF.resetProgress(); openMenu(false); });
    $('btn-start').addEventListener('click', () => { SF.Audio.init(); dismissIntro(); });
    $('btn-arrive').addEventListener('click', () => { els.arrive.hidden = true; });
    els.prompt.addEventListener('click', () => { SF.Audio.init(); openStation(); });
    $('btn-close-panel').addEventListener('click', () => closePanel());
    els.panel.addEventListener('pointerdown', e => { if (e.target === els.panel) closePanel(); });
    window.addEventListener('keydown', e => {
      if (!els.panel.hidden) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= keyed.length) keyed[n - 1].btn.click();
        else if (e.key === 'Escape') closePanel();
      } else if ((e.code === 'KeyE' || e.key === 'Enter') && !els.prompt.hidden && e.target === document.body) { e.preventDefault(); openStation(); }
    });
    const pl = SF.planet(), back = SF.state.totalEarned > 0 || SF.state.stars > 0;
    $('intro-eyebrow').textContent = 'Planet ' + pl.name + ' · ' + pl.tagline;
    $('intro-sub').textContent = back ? 'Welcome back. Your outpost on ' + pl.name + ' is where you left it.' : pl.intro;
    if (back) $('btn-start').textContent = 'Resume';
    syncSound();
    refresh();
  }

  function dismissIntro() {
    if (introGone) return;
    introGone = true;
    els.intro.classList.add('gone');
    setTimeout(() => { els.intro.hidden = true; }, 400);
  }

  function showArrival(perks) {
    const pl = SF.planet();
    $('arrive-eyebrow').textContent = pl.home ? 'Home world found' : `Planet ${SF.state.planet + 1} reached`;
    $('arrive-title').textContent = pl.name;
    $('arrive-tag').textContent = pl.tagline;
    $('arrive-sub').textContent = pl.intro;
    const list = $('arrive-res');
    list.innerHTML = '';
    pl.resources.forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `<i style="background:${r.color}"></i>${r.plural}`;
      list.appendChild(li);
    });
    const ul = $('arrive-perks');
    ul.innerHTML = '';
    for (const p of perks) { const li = document.createElement('li'); li.textContent = p; ul.appendChild(li); }
    els.arrive.hidden = false;
  }

  function openMenu(on) {
    els.menu.hidden = !on;
    els.resetConfirm.hidden = true; els.reset.hidden = false;
    if (!on) return;
    const s = SF.state, ws = SF.ws();
    const built = SF.World.plots.filter(p => ws.plots[p.id].built).length;
    els.stats.innerHTML = `
      <div><dt>Planet</dt><dd>${SF.planetName()}</dd></div>
      <div><dt>Planets finished</dt><dd>${Math.min(s.stars, C.home)}</dd></div>
      <div><dt>Buildings here</dt><dd>${built} / ${SF.World.plots.length}</dd></div>
      <div><dt>Earned in total</dt><dd>${fmt(s.lifetime)}</dd></div>`;
  }

  function syncSound() {
    const m = SF.Audio.isMuted();
    els.sound.setAttribute('aria-pressed', String(!m));
    els.sound.classList.toggle('off', m);
    els.sound.title = m ? 'Sound off' : 'Sound on';
  }

  function bump() { bumpT = 1; }

  function goalText() {
    const s = SF.state, ws = SF.ws(), st = SF.stats(), home = SF.World.res(0);
    if (SF.World.smelter && s.stack.some(c => SF.Smelter.isOre(c))) return 'Carry the iron and copper ore to the SMELTER';
    if (SF.World.hall && s.stack.some(c => Math.floor(c / 10) !== s.planet)) return 'Unload materials from other planets at the HALL';
    if (SF.hubActive() && s.stack.length >= st.cap) return 'Pack full. Unload at the WAREHOUSE (cargo rocket) or the chest';
    if (s.totalEarned === 0 && s.stack.length === 0) return `Stand next to a ${NOUNS[home.node]} to harvest ${home.plural.toLowerCase()}`;
    if (s.totalEarned === 0) return s.stack.length >= st.cap ? 'Pack full. Carry it to the DROP OFF pad' : 'Harvest more, then carry it to the DROP OFF pad';
    if (s.stack.length >= st.cap) return 'Pack full. Head to the DROP OFF pad';
    if (!SF.atHome() && ws.plots.launch.built) return 'The rocket is ready. Stand on the launch pad to fly on';
    const next = SF.World.plots.filter(p => SF.plotVisible(p) && !ws.plots[p.id].built && p.kind !== 'lot').sort((a, b) => a.cost - b.cost)[0];
    if (next) {
      const missing = Object.keys(next.needs || {}).filter(c => (ws.plots[next.id].res[c] || 0) < next.needs[c]).map(c => SF.res(+c).plural);
      const bars = Object.keys(next.needs || {}).some(c => SF.isIngot(+c) && (ws.plots[next.id].res[c] || 0) < next.needs[c] && !(s.hold[c] > 0));
      if (missing.length && next.cost - ws.plots[next.id].paid < 1) return bars && SF.World.smelter ?
        `${next.name} needs ${missing.join(', ')}. Take ore from the ORE PICKUP to the SMELTER` : `${next.name} needs ${missing.join(', ')}. Ship them to the hall from their planet`;
      return `Next: stand on the ${next.name} plot to build it (${fmt(next.cost - ws.plots[next.id].paid)} left)`;
    }
    if (SF.hubActive()) return 'Harvest and unload at the WAREHOUSE. Full cargo rockets fly to the hall on Halcyon';
    if (SF.World.plots.some(p => p.kind === 'lot' && SF.plotVisible(p))) return 'New Haven has empty lots: stand on one to choose a building';
    if (SF.atHome()) return 'Fly to other planets for materials, or hire crew in the habitats';
    return 'Everything is built. Max out your upgrades!';
  }

  // ---------- panels ----------
  const PANELS = {
    drones: p => [droneCard(p)],
    producer: p => [producerCard(p), beltCard(p)],
    launch: () => (SF.atHome() ? travelCards() : [launchCard()]),
    habitat: () => crewCards(),
    lab: () => researchCards(),
    canteen: () => canteenCards(),
  };
  const hasPanel = p => !!PANELS[p.kind];

  // What standing in a zone offers: a title for the "Open" button and the cards of its popup.
  function zoneDef(zone) {
    if (!zone) return null;
    const pl = SF.planetName();
    if (zone === 'upgrade') return { title: 'Upgrade terminal', eyebrow: 'Suit and tools', cards: upgradeCards };
    if (zone === 'chest') return { title: 'Material chest', eyebrow: 'Travels with you', cards: chestCards };
    if (zone === 'hall') return { title: 'Halcyon Hall', eyebrow: 'Home storage', cards: hallCards };
    if (zone === 'smelter') return { title: 'Smelter', eyebrow: 'Ore to ingots', cards: smelterCards };
    if (zone === 'drop' && SF.hubActive()) return { title: pl + ' warehouse', eyebrow: 'Cargo to Halcyon', cards: warehouseCards };
    if (zone.startsWith('plot:') && SF.World.plot(zone.slice(5)).lot) {
      const p = SF.World.plot(zone.slice(5));
      return p.kind === 'lot' ? { title: 'Building lot', eyebrow: 'New Haven', cards: () => buildCards(p) }
        : { title: p.name, eyebrow: 'Under construction', cards: () => [cancelCard(p)] };
    }
    if (zone.startsWith('bld:')) {
      const p = SF.World.plot(zone.slice(4));
      if (p.kind === 'launch') return { title: SF.atHome() ? 'Rocket' : 'Launch pad', eyebrow: SF.atHome() ? 'Choose a planet' : 'Leave ' + pl, cards: () => PANELS.launch(p) };
      return { title: p.name, eyebrow: pl, cards: () => PANELS[p.kind](p) };
    }
    return null;
  }

  // Standing in a zone only shows a small "Open" button; the full popup opens on a tap or E.
  function setZone(zone) {
    const same = zone === curZone && !els.panel.hidden;
    curZone = zone; curDef = zoneDef(zone);
    if (same && curDef) { openStation(); return; }
    closePanel();
  }

  function openStation() {
    if (!curDef) return;
    openPanel(curDef.title, curDef.cards(), curDef.eyebrow);
  }

  function card(id, name, onClick, wide) {
    const btn = document.createElement('button');
    btn.className = 'card' + (wide ? ' wide' : ''); btn.id = id; btn.type = 'button';
    btn.innerHTML = `<span class="card-key"></span><span class="card-name">${name}</span>
      <span class="card-lvl"></span><span class="card-eff"></span><span class="card-cost"><i class="coin"></i><b></b></span>`;
    btn.addEventListener('click', () => { SF.Audio.init(); if (onClick()) flash(btn); else shakeEl(btn); });
    return btn;
  }

  function info(id, html) {
    const div = document.createElement('div');
    div.className = 'card wide info'; div.id = id;
    div.innerHTML = `<span class="card-key"></span>${html}`;
    return div;
  }

  function upgradeCards() {
    return Object.keys(C.upgrades).map(k => ({
      btn: card('up-' + k, C.upgrades[k].name, () => SF.buyUpgrade(k)),
      update(r) {
        const s = SF.state, l = s.lvl[k], maxed = l >= C.upgrades[k].max, cost = SF.upgradeCost(k);
        fill(r.btn, maxed ? 'MAX' : `Lv ${l} → ${l + 1}`,
          maxed ? effects[k](l) : `${effects[k](l)} → ${effects[k](l + 1).replace(/^[A-Za-z]+ /, '')}`, maxed ? null : cost);
      },
    }));
  }

  function droneCard(p) {
    return {
      btn: card('buy-drone', 'Helper ' + p.helper.unit.toLowerCase(), () => SF.buyDrone(), true),
      update(r) {
        const ws = SF.ws(), maxed = ws.drones >= C.drone.max;
        fill(r.btn, `${ws.drones} / ${C.drone.max} ${p.helper.unit.toLowerCase()}s`, 'Harvests the best node nearby and flies the cargo home', maxed ? null : SF.droneCost());
      },
    };
  }

  function producerCard(p) {
    const res = SF.World.res(p.helper.res);
    return {
      btn: card('up-producer', 'Faster ' + p.name.toLowerCase(), () => SF.upgradeProducer(p.id), true),
      update(r) {
        const st = SF.ws().plots[p.id], now = SF.producerStats(p, st), maxed = st.lvl >= C.producer.max;
        const next = maxed ? now : SF.producerStats(p, { lvl: st.lvl + 1 });
        fill(r.btn, maxed ? 'MAX' : `Lv ${st.lvl} → ${st.lvl + 1}`,
          `1 ${res.name.toLowerCase()} every ${now.every.toFixed(1)}s, holds ${now.cap}` + (maxed ? '' : ` → ${next.every.toFixed(1)}s, ${next.cap}`) +
          `. Stock: ${st.pile}.` + (st.belt ? ' The belt sells it for you.' : ' Standing here loads it onto your back.'), maxed ? null : SF.producerCost(st));
      },
    };
  }

  function beltCard(p) {
    const need = C.conveyor.needs, code = +Object.keys(need)[0];
    const btn = card('belt-' + p.id, 'Conveyor belt', () => SF.Home.installBelt(p.id), true);
    btn.querySelector('.card-cost').innerHTML = '<b></b>';
    return {
      btn,
      update(r) {
        const st = SF.ws().plots[p.id], have = SF.Home.available(code);
        r.btn.querySelector('.card-lvl').textContent = st.belt ? 'Installed' : SF.Home.hasFactory() ? `${have} / ${need[code]} ${SF.res(code).name.toLowerCase()} (hall, chest, warehouse)` : 'Needs the Belt Factory on Halcyon';
        r.btn.querySelector('.card-eff').textContent = 'Carries the stock to the drop off by itself, so you never have to fetch it.';
        r.btn.querySelector('.card-cost b').textContent = st.belt ? '' : `${need[code]} ${SF.res(code).name}`;
        r.btn.disabled = st.belt || !SF.Home.hasFactory();
        r.btn.classList.toggle('poor', !st.belt && have < need[code]);
      },
    };
  }

  // ---------- storage overview ----------
  // Every material as a tile: its picture, how many, and a fill bar when there is a limit.
  const icons = {};
  function icon(code) {
    if (icons[code]) return icons[code];
    const cv = document.createElement('canvas'); cv.width = cv.height = 96;
    const g = cv.getContext('2d');
    try { g.scale(2, 2); SF.Render.item(g, code, 24, 30, 1.5); } catch (_) {}
    return (icons[code] = cv.toDataURL());
  }
  const tile = c => { const R = SF.res(c); return `<div class="tile" data-code="${c}" style="--tint:${R.color}"><img alt="" src="${icon(c)}">` +
    `<span class="t-name">${R.plural}</span><span class="t-num"><b>0</b><small></small></span><span class="bar"><i></i></span></div>`; };
  const planetGroups = (filter) => SF.PLANETS.map((pl, pi) => ({ name: pl.name, tint: pl.theme.accent, codes: pl.resources.map(r => pi * 10 + r.tier).filter(filter) }))
    .concat([{ name: 'Smelted', tint: '#dfe5ee', codes: Object.keys(SF.INGOTS).map(Number).filter(filter) }]);

  function storeCard(id, opts) {
    const div = info(id, `<div class="store-top"><span class="card-name">${opts.title}</span><span class="card-lvl"></span></div><span class="card-eff"></span><div class="store"></div>`);
    div.classList.add('storage');
    let key = '';
    return {
      btn: div,
      update() {
        const groups = opts.groups().filter(g => g.codes.length), st = div.querySelector('.store');
        const k = groups.map(g => g.name + ':' + g.codes.join(',')).join('|');
        if (k !== key) {
          key = k;
          st.innerHTML = groups.length ? groups.map(g => `<section class="store-group"><h3 style="--tint:${g.tint}">${g.name}</h3><div class="tiles">${g.codes.map(tile).join('')}</div></section>`).join('')
            : `<p class="store-empty">${opts.empty || 'Nothing here yet.'}</p>`;
        }
        st.querySelectorAll('.tile').forEach(t => {
          const c = +t.dataset.code, n = opts.count(c), cap = opts.cap ? opts.cap(c) : null;
          t.querySelector('b').textContent = n;
          t.querySelector('small').textContent = cap ? '/' + cap : '';
          t.querySelector('.bar').hidden = !cap;
          if (cap) t.querySelector('.bar i').style.width = Math.min(100, n / cap * 100) + '%';
          t.classList.toggle('empty', !n);
          t.classList.toggle('full', !!cap && n >= cap);
        });
        div.querySelector('.card-lvl').textContent = opts.lvl ? opts.lvl() : '';
        div.querySelector('.card-eff').textContent = opts.text ? opts.text() : '';
      },
    };
  }

  // A labelled progress bar.
  const meter = (label, now, max, color, note) => `<div class="meter"><span class="m-label">${label}</span><span class="m-val">${note || now + ' / ' + max}</span>` +
    `<span class="bar"><i style="width:${Math.min(100, max ? now / max * 100 : 0)}%;background:${color}"></i></span></div>`;

  function htmlCard(id, title, get) {
    const div = info(id, `<span class="card-name">${title}</span><div class="meters"></div><span class="card-eff"></span>`);
    return { btn: div, update() { const r = get(); div.querySelector('.meters').innerHTML = r.html; div.querySelector('.card-eff').textContent = r.text || ''; } };
  }

  // Where every cargo rocket is right now.
  function rocketMeters(only) {
    const Hb = SF.Hub;
    return SF.PLANETS.map((pl, pi) => ({ pl, pi })).filter(o => o.pi !== C.home && (only == null || o.pi === only)).map(({ pl, pi }) => {
      const ws = SF.state.worlds[pi];
      if (!ws) return meter(pl.name, 0, 1, pl.theme.accent, 'not visited yet');
      const r = Hb.rk(ws), lab = Hb.padLabel(pi)[1];
      if (r.away > 0) return meter(pl.name, (r.total || r.away) - r.away, r.total || r.away, pl.theme.accent, lab);
      return meter(pl.name, r.n, SF.rocketCap(), pl.theme.accent, lab);
    }).join('');
  }

  function chestCards() {
    const H = C.hub, Hb = SF.Hub;
    return [
      storeCard('chest-info', {
        title: 'In the chest', empty: 'The chest is empty. Unload here to fill it.',
        groups: () => planetGroups(c => (SF.state.chest[c] || 0) > 0),
        count: c => SF.state.chest[c] || 0,
        lvl: () => `${Hb.chestCount()} / ${Hb.chestCap()} items`,
        text: () => 'Unload here; the chest flies home with you and empties into the hall on Halcyon.',
      }),
      {
        btn: card('up-chest', 'Bigger chest', () => Hb.upgradeChest(), true),
        update(r) {
          const l = SF.state.chestLvl, maxed = l >= H.chest.max;
          fill(r.btn, maxed ? 'MAX' : `Lv ${l} → ${l + 1}`, maxed ? `Holds ${Hb.chestCap()}` : `Holds ${Hb.chestCap()} → ${Hb.chestCap() + H.chest.step}`, maxed ? null : Hb.chestCost());
        },
      },
    ];
  }

  function hallCards() {
    const H = C.hub, Hb = SF.Hub;
    return [
      storeCard('hall-info', {
        title: 'Stored in the hall',
        groups: () => planetGroups(c => true),
        count: c => SF.state.hold[c] || 0, cap: () => Hb.hallCap(),
        lvl: () => `${Object.values(SF.state.hold).reduce((a, b) => a + b, 0)} items`,
        text: () => `Each material fills up to ${Hb.hallCap()}; anything over that is sold. Buildings take their materials from here.`,
      }),
      htmlCard('hall-rockets', 'Cargo rockets', () => ({ html: rocketMeters(), text: `Each rocket carries up to ${SF.rocketCap()} items and flies by itself when full.` })),
      {
        btn: card('up-hall', 'Expand the hall', () => Hb.upgradeHall(), true),
        update(r) {
          const l = SF.state.hallLvl, maxed = l >= H.hall.max;
          fill(r.btn, maxed ? 'MAX' : `Lv ${l} → ${l + 1}`, maxed ? `${Hb.hallCap()} of each` : `${Hb.hallCap()} → ${Hb.hallCap() + H.hall.step} of each material`, maxed ? null : Hb.hallCost());
        },
      },
    ];
  }

  // ---------- New Haven build menu ----------
  const matList = needs => Object.keys(needs).map(c => `${needs[c]} ${SF.res(+c).plural.toLowerCase()}`).join(', ');
  const matHave = needs => Object.keys(needs).map(c => {
    const have = SF.state.hold[c] || 0, ok = have >= needs[c];
    return `<li class="${ok ? '' : 'short'}"><i style="background:${SF.res(+c).color}"></i>${Math.min(have, needs[c])}/${needs[c]} ${SF.res(+c).plural}</li>`;
  }).join('');

  function buildCards(p) {
    return Object.keys(SF.BUILDS).map(kind => {
      const b = SF.BUILDS[kind];
      const btn = card('build-' + kind, b.name, () => SF.Home.chooseLot(p.id, kind), false);
      btn.insertAdjacentHTML('beforeend', '<ul class="res-list mats"></ul>');
      return {
        btn,
        update(r) {
          const q = SF.Home.quote(kind), ok = SF.Home.canChoose(kind);
          fill(r.btn, kind === 'habitat' ? `${SF.homeCount('habitat')} built or planned` : ok ? 'One per base' : 'Already built or planned', b.desc, q.cost);
          r.btn.querySelector('.mats').innerHTML = matHave(q.needs);
          r.btn.disabled = !ok;
          r.btn.classList.toggle('poor', false);
        },
      };
    });
  }

  function cancelCard(p) {
    const btn = card('cancel-lot', 'Build something else', () => SF.Home.cancelLot(p.id), true);
    btn.querySelector('.card-cost').innerHTML = '<b></b>';
    return {
      btn,
      update(r) {
        const st = SF.ws().plots[p.id];
        r.btn.querySelector('.card-lvl').textContent = `${SF.UI.fmt(st.paid || 0)} / ${SF.UI.fmt(p.cost)} paid`;
        r.btn.querySelector('.card-eff').textContent = `Still needs ${matList(Object.fromEntries(Object.keys(p.needs).map(c => [c, Math.max(0, p.needs[c] - (st.res[c] || 0))]).filter(e => e[1] > 0))) || 'only credits'}. Cancelling gives back every credit and material paid in so far.`;
      },
    };
  }

  // ---------- research lab ----------
  function researchCards() {
    const cards = [];
    for (const tree of SF.RESEARCH) {
      const head = info('tree-' + tree.id, `<span class="card-name" style="color:${tree.color}">${tree.name}</span>`);
      head.classList.add('tree-head');
      cards.push({ btn: head, update() {} });
      for (const n of tree.nodes) {
        const btn = card('res-' + n.id, n.name, () => SF.Research.research(n.id), false);
        btn.style.setProperty('--tint', tree.color);
        btn.classList.add('research');
        btn.insertAdjacentHTML('beforeend', '<ul class="res-list mats"></ul>');
        cards.push({
          btn,
          update(r) {
            const l = SF.R(n.id), max = SF.Research.maxed(n), lock = SF.Research.locked(n), c = SF.Research.cost(n);
            fill(r.btn, max ? 'MAX' : lock ? `Needs ${SF.Research.node(n.after).name}` : `Lv ${l} → ${l + 1}`, max ? n.eff(l) : `${n.eff(l + 1)}`, max || lock ? null : c.credits);
            r.btn.querySelector('.mats').innerHTML = max || lock ? '' : matHave(c.mats);
            if (!max && !lock) r.btn.classList.toggle('poor', !SF.Research.affordable(n));
          },
        });
      }
    }
    return cards;
  }

  // ---------- canteen ----------
  function canteenCards() {
    const F = C.food;
    return [
      htmlCard('canteen-info', 'Kitchen', () => {
        const k = SF.state.kitchen, h = SF.state.hold, per = F.per + SF.R('recipes'), cap = SF.Hub.hallCap();
        const fed = SF.state.crew.filter(w => SF.Food.canWork(w)).length;
        return {
          html: meter('Meals ready', k.meal, F.cap, '#ffb340') + meter('Drinks ready', k.drink, F.cap, '#7fd8ff') +
            meter(SF.res(F.meal).plural + ' in the hall', h[F.meal] || 0, cap, SF.res(F.meal).color) + meter(SF.res(F.drink).name + ' in the hall', h[F.drink] || 0, cap, SF.res(F.drink).color) +
            meter('Crew fed and working', fed, SF.state.crew.length || 1, '#9be36a', `${fed} / ${SF.state.crew.length}`),
          text: `Cooks 1 ${SF.res(F.meal).name.toLowerCase()} into ${per} meals and 1 ${SF.res(F.drink).name.toLowerCase()} into ${per} drinks. Crew on other planets eat from their warehouse; their cargo rocket brings it.`,
        };
      }),
      {
        btn: card('hire-cook-driver', 'Delivery driver', () => SF.Food.hireDriver(), true),
        update(r) {
          const n = SF.state.kitchen.drivers, full = n >= F.drivers;
          fill(r.btn, `${n} / ${F.drivers} cars`, n ? 'Drives meals and drinks out to the crew on Halcyon, so nobody stops working to walk here.' :
            'Without a car, crew on Halcyon walk all the way here to eat and drink, and stop working meanwhile.', full ? null : SF.Food.driverCost());
        },
      },
    ];
  }

  function smelterCards() {
    const K = C.smelter, Sm = SF.Smelter;
    return [
      storeCard('smelt-info', {
        title: 'Furnace',
        groups: () => [{ name: 'Ore waiting', tint: '#ff8f5a', codes: K.ores }, { name: 'Ingots in the hall', tint: '#dfe5ee', codes: K.ores.map(c => c + 100) }],
        count: c => (c > 100 ? SF.state.hold[c] : SF.state.smelt.q[c]) || 0,
        cap: c => (c > 100 ? SF.Hub.hallCap() : K.queue),
        lvl: () => `${Sm.ready()} / ${K.outCap} on the tray`,
        text: () => `1 ore becomes 1 ingot every ${Sm.every().toFixed(1)}s and lands on the tray. Pick ore up at the ORE PICKUP pad beside the hall and bring it here.`,
      }),
      {
        btn: card('hire-driver', 'Tractor driver', () => Sm.hireDriver(), true),
        update(r) {
          const s = SF.state.smelt, ready = Sm.canHire();
          if (s.driver) { fill(r.btn, 'Hired', 'Drives iron and copper ore from the hall to the furnace on their own, even while you are on other planets.', null); r.btn.querySelector('.card-cost b').textContent = ''; return; }
          fill(r.btn, ready ? 'Ready to hire' : `Bring ore yourself first: ${s.hand} / ${K.byHand}`,
            'Drives a tractor between the hall and the smelter so you never have to carry ore again.', ready ? K.driver : null);
          if (!ready) { r.btn.querySelector('.card-cost b').textContent = SF.UI.fmt(K.driver); r.btn.classList.add('poor'); }
        },
      },
      {
        btn: card('hire-hauler', 'Ingot hauler', () => Sm.hireHauler(), true),
        update(r) {
          const s = SF.state.smelt;
          if (s.hauler) { fill(r.btn, 'Hired', 'Drives the finished ingots from the smelter to the hall on their own, even while you are away.', null); r.btn.querySelector('.card-cost b').textContent = ''; return; }
          fill(r.btn, s.driver ? 'Ready to hire' : 'Hire the tractor driver first',
            `Brings the finished ingots to the hall. Until then they wait here (${Sm.ready()} ready): stand here with room in your pack to take them.`, s.driver ? Sm.haulCost() : null);
          if (!s.driver) { r.btn.querySelector('.card-cost b').textContent = SF.UI.fmt(Sm.haulCost()); r.btn.classList.add('poor'); }
        },
      },
      {
        btn: card('up-heat', 'Hotter furnace', () => Sm.upgradeHeat(), true),
        update(r) {
          const l = SF.state.smelt.heat, maxed = l >= K.heat.max, now = Sm.every(), next = K.every / (1 + K.heat.boost * (l + 1));
          fill(r.btn, maxed ? 'MAX' : `Lv ${l} → ${l + 1}`, maxed ? `1 ingot every ${now.toFixed(1)}s` : `1 ingot every ${now.toFixed(1)}s → ${next.toFixed(1)}s`, maxed ? null : Sm.heatCost());
        },
      },
    ];
  }

  function warehouseCards() {
    const Hb = SF.Hub;
    const btn = card('launch-cargo', 'Launch cargo rocket now', () => Hb.launchCargo(), true);
    btn.querySelector('.card-cost').innerHTML = '<b></b>';
    return [
      storeCard('wh-info', {
        title: 'Waiting in the warehouse', empty: 'Nothing waiting. Drop your haul on the pad to fill the rocket.',
        groups: () => { const wh = SF.ws().wh || {}, pi = SF.state.planet; return planetGroups(c => Math.floor(c / 10) === pi && c < 100 || (wh[c] || 0) > 0); },
        count: c => (SF.ws().wh || {})[c] || 0,
        lvl: () => `${Object.values(SF.ws().wh || {}).reduce((a, b) => a + b, 0)} items`,
        text: () => 'Stock waits here while the rocket is away and loads up again when it lands.',
      }),
      htmlCard('wh-rocket', 'Cargo rocket', () => {
        const pi = SF.state.planet, n = SF.Food.crewOn(pi), pan = SF.Food.pantry(pi);
        return {
          html: rocketMeters(pi) + (n ? meter('Crew meals', pan.meal, Math.max(pan.meal, C.food.pantry * n), '#ffb340') + meter('Crew drinks', pan.drink, Math.max(pan.drink, C.food.pantry * n), '#7fd8ff') : ''),
          text: 'It flies to Halcyon by itself when full' + (n ? ' and brings the crew food from the canteen on the way back.' : '.'),
        };
      }),
      {
        btn,
        update(b) {
          const r = Hb.rk(SF.ws());
          b.btn.querySelector('.card-lvl').textContent = r.away > 0 ? 'Away' : `${r.n} / ${SF.rocketCap()} loaded`;
          b.btn.querySelector('.card-eff').textContent = 'Send what is loaded now instead of waiting for a full rocket.';
          b.btn.querySelector('.card-cost b').textContent = '';
          b.btn.disabled = r.away > 0 || !r.n;
        },
      },
    ];
  }

  function launchCard() {
    const next = SF.planet(SF.state.planet + 1);
    const btn = document.createElement('button');
    btn.className = 'card wide launch'; btn.id = 'btn-launch'; btn.type = 'button';
    btn.innerHTML = `<span class="card-key"></span><span class="card-name">Launch to ${next.name}</span>
      <span class="card-eff">Credits, upgrades and buildings start over on the new world. You keep your cargo and gain: ${perksFor(SF.state.stars + 1).join(', ')}.</span>`;
    btn.addEventListener('click', () => { SF.Audio.init(); SF.startLaunch(); });
    return { btn, update() {} };
  }

  function travelCards() {
    return SF.PLANETS.map((pl, i) => ({ pl, i })).filter(o => o.i !== SF.state.planet).map(({ pl, i }) => {
      const btn = document.createElement('button');
      btn.className = 'card travel'; btn.id = 'fly-' + pl.id; btn.type = 'button';
      btn.innerHTML = `<span class="card-key"></span><span class="card-name">${pl.name}</span>
        <span class="card-eff">${pl.resources.map(r => r.plural).join(', ')}</span>`;
      btn.style.setProperty('--tint', pl.theme.accent);
      btn.addEventListener('click', () => { SF.Audio.init(); SF.startLaunch(i); });
      return { btn, update() {} };
    });
  }

  function crewCards() {
    const cards = [{
      btn: card('hire', 'Hire crew', () => SF.Home.hire(), true),
      update(r) {
        const n = SF.state.crew.length, cap = SF.Home.crewCap(), full = n >= cap;
        fill(r.btn, `${n} / ${cap} beds`, full ? 'All beds are taken. Build another habitat for more crew.' :
          `Crew harvest their job's resource. On the planet you are on you see them at work; elsewhere they fill that planet's warehouse (1 every ${C.crew.workEvery}s, rare ones slower). ` +
          (SF.Food.on() ? 'They eat meals and drink from the canteen.' : `Each eats 1 ${SF.res(C.crew.food).name.toLowerCase()} from the hall every ${C.crew.eatEvery}s until you build a canteen.`), full ? null : SF.hireCost());
      },
    }];
    // Each crew member: a status line and every job at a glance, grouped by planet. One tap picks it.
    SF.state.crew.forEach((w, i) => {
      const rows = SF.PLANETS.map((pl, pi) => `<div class="job-row"><span class="job-planet">${pl.name}</span>` +
        pl.resources.map(r => `<button type="button" class="job-chip${r.tier > 2 ? ' rare' : ''}" data-job="${pi * 10 + r.tier}" title="1 every ${SF.Home.workTime(pi * 10 + r.tier)}s while you are elsewhere"><i style="background:${r.color}"></i>${r.plural}${r.tier > 2 ? ' <small>slow</small>' : ''}</button>`).join('') + '</div>').join('');
      const div = info('crew-' + i, `<span class="card-name">Crew ${i + 1}</span><span class="card-lvl"></span><span class="card-eff"></span><div class="jobs">${rows}</div>`);
      div.querySelectorAll('.job-chip').forEach(b => b.addEventListener('click', () => { SF.Audio.init(); if (SF.Home.setJob(i, +b.dataset.job)) SF.Audio.pick(3); }));
      cards.push({
        btn: div,
        update(r) {
          const R = SF.res(w.job), pl = SF.planet(Math.floor(w.job / 10)), need = SF.Food.status(w);
          r.btn.querySelector('.card-lvl').textContent = `${R.plural} · ${pl.name}`;
          r.btn.querySelector('.card-eff').textContent = need === 'eating' ? 'Gone to eat and drink' : need ? `${need[0].toUpperCase() + need.slice(1)}! ` +
            (SF.Food.on() ? (Math.floor(w.job / 10) === C.home ? 'The canteen needs sunfruit and cactus water in the hall.' : `Their cargo rocket brings food from the canteen to the ${pl.name} warehouse.`) :
              `Bring ${SF.res(C.crew.food).name.toLowerCase()} to the hall.`) : SF.Home.jobOpen(w.job) ? 'Working' : `Waiting: open ${R.region || 'that region'} on ${pl.name} first`;
          r.btn.classList.toggle('poor', !!need && need !== 'eating');
          r.btn.querySelectorAll('.job-chip').forEach(b => { b.classList.toggle('on', +b.dataset.job === w.job); b.classList.toggle('locked', !SF.Home.jobOpen(+b.dataset.job)); });
        },
      });
    });
    return cards;
  }

  function fill(btn, lvl, eff, cost) {
    btn.querySelector('.card-lvl').textContent = lvl;
    btn.querySelector('.card-eff').textContent = eff;
    btn.querySelector('.card-cost b').textContent = cost == null ? '—' : fmt(cost);
    btn.disabled = cost == null;
    btn.classList.toggle('poor', cost != null && SF.state.credits < cost);
  }

  function openPanel(title, cards, eyebrow) {
    refs = cards;
    keyed = cards.filter(c => c.btn.tagName === 'BUTTON');
    els.panelTitle.textContent = title;
    els.panelEyebrow.textContent = eyebrow || '';
    const keepScroll = !els.panel.hidden && els.panelBody.dataset.title === title ? els.panelBody.scrollTop : 0;
    els.panelBody.dataset.title = title;
    els.panelBody.innerHTML = '';
    els.panelBody.classList.toggle('single', cards.length === 1);
    cards.forEach(c => { const k = c.btn.querySelector('.card-key'); if (k) k.textContent = keyed.indexOf(c) + 1 || ''; els.panelBody.appendChild(c.btn); });
    els.prompt.hidden = true;
    els.panel.hidden = false;
    els.panelBody.scrollTop = keepScroll;
    requestAnimationFrame(() => els.panel.classList.add('open'));
    refresh();
  }

  function closePanel() {
    refs = []; keyed = [];
    els.panel.classList.remove('open');
    els.panel.hidden = true;
    els.prompt.hidden = !curDef;
    if (curDef) els.promptTitle.textContent = curDef.title;
  }

  function flash(el) { el.classList.remove('bought'); void el.offsetWidth; el.classList.add('bought'); }
  function shakeEl(el) { el.classList.remove('denied'); void el.offsetWidth; el.classList.add('denied'); }

  function refresh() {
    if (!els.credits) return;
    // A new crew member needs a new card.
    if (SF.player.zone && SF.player.zone.startsWith('bld:') && refs.length && refs[0].btn.id === 'hire' && refs.length !== SF.state.crew.length + 1) setZone(SF.player.zone);
    els.credits.textContent = fmt(SF.state.credits);
    els.goal.textContent = goalText();
    els.planet.textContent = SF.planetName() + (SF.state.stars ? '  ★' + Math.min(SF.state.stars, C.home) : '');
    for (const r of refs) r.update(r);
  }

  function tick(dt) {
    shown += dt;
    if (shown > 0.1) { shown = 0; refresh(); }
    if (bumpT > 0) {
      bumpT = Math.max(0, bumpT - dt * 5);
      els.creditBox.style.transform = `scale(${1 + bumpT * 0.12})`;
    }
  }

  return { init, refresh, tick, bump, setZone, hasPanel, dismissIntro, showArrival, perksFor, fmt };
})();
