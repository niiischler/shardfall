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
    magma: 'magma rock', icespire: 'ice spire', ironrock: 'iron boulder', resin: 'resin stump', goldvein: 'gold vein', mesa: 'mesa block', malachite: 'copper lode', geode: 'geode', coral: 'coral', conch: 'shell',
    oilseep: 'oil seep', gasvent: 'gas vent', fumarole: 'sulfur vent', obsidian: 'obsidian outcrop', opalnest: 'opal nest', melon: 'melon vine', bloom: 'nectar bloom', spicebush: 'spice shrub', hive: 'honeycomb', truffle: 'truffle mound' };

  const PLURALS = { crystal: 'crystals', clam: 'clams', tree: 'trees', palm: 'palms', mushroom: 'mushrooms', bush: 'bushes', cactus: 'cacti', bones: 'fossils',
    magma: 'magma rocks', icespire: 'ice spires', ironrock: 'iron boulders', resin: 'resin stumps', goldvein: 'gold veins', mesa: 'mesa blocks', malachite: 'copper lodes', geode: 'geodes', coral: 'corals', conch: 'shells',
    oilseep: 'oil seeps', gasvent: 'gas vents', fumarole: 'sulfur vents', obsidian: 'obsidian outcrops', opalnest: 'opal nests', melon: 'melon vines', bloom: 'nectar blooms', spicebush: 'spice shrubs', hive: 'honeycombs', truffle: 'truffle mounds' };

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
    if (s.stack.length >= st.cap) return SF.World.hall ? 'Pack full. Sell at the SELL pad or store it in the HALL' : 'Pack full. Head to the DROP OFF pad';
    if (SF.World.board && SF.Contracts.list().some(SF.Contracts.ready)) return 'A contract is ready: hand it in at the CONTRACTS board beside the hall';
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
    producer: p => [producerCard(p), driverCard(p), SF.World.hall ? null : beltCard(p), mk2Card(p)].filter(Boolean),
    factory: () => beltOverview(),
    launch: () => (SF.atHome() ? travelCards() : [launchCard()]),
    habitat: () => crewCards(),
    lab: () => researchCards(),
    canteen: () => canteenCards(),
    workshop: () => workshopCards(),
    starmap: () => starmapCards(),
    fuelplant: () => fuelCards(),
  };
  const hasPanel = p => !!PANELS[p.kind];

  // What standing in a zone offers: a title for the "Open" button and the cards of its popup.
  function zoneDef(zone) {
    if (!zone) return null;
    const pl = SF.planetName();
    if (zone === 'upgrade') return { title: 'Upgrade terminal', eyebrow: 'Suit and tools', cards: upgradeCards };
    if (zone === 'chest') return { title: 'Material chest', eyebrow: 'Travels with you', cards: chestCards };
    if (zone === 'hall') return { title: 'Halcyon Hall', eyebrow: 'Home storage', cards: hallCards };
    if (zone === 'board') return { title: 'Contract board', eyebrow: 'Orders from the colony', cards: contractCards };
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
        const st = SF.ws().plots[p.id], now = SF.producerStats(p, st), maxed = st.lvl >= SF.producerMax(st);
        const next = maxed ? now : SF.producerStats(p, { lvl: st.lvl + 1, mk: st.mk });
        fill(r.btn, maxed ? 'MAX' : `Lv ${st.lvl} → ${st.lvl + 1}`,
          `1 ${res.name.toLowerCase()} every ${now.every.toFixed(1)}s, holds ${now.cap}` + (maxed ? '' : ` → ${next.every.toFixed(1)}s, ${next.cap}`) +
          `. Stock: ${st.pile}.` + (SF.World.hall ? ' It goes straight into the hall.' : st.belt ? ' The belt sells it for you.' : ' Standing here loads it onto your back.'), maxed ? null : SF.producerCost(st));
        r.btn.querySelector('.card-name').textContent = 'Faster ' + p.name.toLowerCase() + (st.mk ? ' Mk2' : '');
      },
    };
  }

  // A driver with this planet's vehicle brings the stock to the warehouse (the hall on Halcyon).
  function driverCard(p) {
    const veh = SF.Haul.vehicleName();
    return {
      btn: card('driver-' + p.id, veh + ' driver', () => SF.Haul.hire(p.id), true),
      update(r) {
        const st = SF.ws().plots[p.id], to = SF.World.hall ? 'the hall' : 'the warehouse';
        if (st.driver) {
          const need = SF.Food.driverStatus('m' + SF.state.planet + ':' + p.id);
          fill(r.btn, 'Hired', `Drives the stock to ${to} by ${veh.toLowerCase()}, also while you are away. ` + (need ? `Right now: ${need}.` : 'Needs meals and drinks like the crew.'), null);
          r.btn.querySelector('.card-cost b').textContent = '';
          return;
        }
        fill(r.btn, 'Not hired', `Brings the stock to ${to} by ${veh.toLowerCase()}. Eats and drinks like the crew; a hungry driver parks.`, SF.Haul.cost());
      },
    };
  }

  // Belt Factory on Halcyon: every belt on every planet, each upgradable up to the researched level.
  const layoutCache = {};
  function beltOverview() {
    const cards = [], tech = SF.R('beltTech');
    cards.push({
      btn: info('belts-info', `<span class="card-name">Belts on every planet</span><span class="card-eff"></span>`),
      update(r) {
        r.btn.querySelector('.card-eff').textContent = tech ? `Faster belts move more stock per second. Research allows level ${tech} of 3. Materials come from the hall.` :
          'Research "Faster belts" in the lab to upgrade belts here.';
      },
    });
    SF.PLANETS.forEach((pl, pi) => {
      const ws = SF.state.worlds[pi];
      if (!ws || pi === C.home) return;
      const L = layoutCache[pi] || (layoutCache[pi] = SF.layoutPlanet(pl));
      for (const p of L.plots) {
        const st = ws.plots[p.id];
        if (p.kind !== 'producer' || !st || !st.built || !st.belt) continue;
        const btn = card('belt-up-' + pi + p.id, `${p.name} ${p.helper && p.helper.pipe ? 'pipeline' : 'belt'}`, () => SF.upgradeBelt(pi, p.id), false);
        btn.style.setProperty('--tint', pl.theme.accent); btn.classList.add('research');
        btn.insertAdjacentHTML('beforeend', '<ul class="res-list mats"></ul>');
        cards.push({
          btn,
          update(r) {
            const l = st.beltLvl || 0, max = l >= 3, locked = l >= tech, c = SF.beltCost(st, pi);
            const now = 1 / SF.beltEvery(st), next = 1 / SF.beltEvery({ beltLvl: l + 1 });
            fill(r.btn, `${pl.name} · level ${l}` + (max ? ' (max)' : locked ? ' · research needed' : ` → ${l + 1}`),
              max ? `${now.toFixed(1)} items/s` : `${now.toFixed(1)} → ${next.toFixed(1)} items/s`, max || locked ? null : c.credits);
            r.btn.querySelector('.mats').innerHTML = max || locked ? '' : matHave(c.mats);
          },
        });
      }
    });
    if (cards.length === 1) cards.push({ btn: info('belts-none', '<span class="card-name">No belts yet</span><span class="card-eff">Install belts at the sawmills, mines and excavators on the other planets.</span>'), update() {} });
    return cards;
  }

  // Research 'mk2': a maxed machine can be rebuilt for more levels.
  function mk2Card(p) {
    if (!SF.R('mk2')) return null;
    const K = C.producer.mk2;
    const btn = card('mk2-' + p.id, p.name + ' Mk2', () => SF.upgradeMk2(p.id), true);
    btn.insertAdjacentHTML('beforeend', '<ul class="res-list mats"></ul>');
    return {
      btn,
      update(r) {
        const st = SF.ws().plots[p.id], ready = st.lvl >= C.producer.max;
        if (st.mk) { fill(r.btn, 'Built', `Mk2 works ${K.boost}× as fast and goes up to level ${SF.producerMax(st)}.`, null); r.btn.querySelector('.card-cost b').textContent = ''; r.btn.querySelector('.mats').innerHTML = ''; return; }
        fill(r.btn, ready ? 'Ready' : `Max out first: Lv ${st.lvl} / ${C.producer.max}`, `Rebuild it as Mk2: ${K.boost}× as fast and ${K.levels} more levels.`, ready ? K.credits : null);
        if (!ready) { r.btn.querySelector('.card-cost b').textContent = SF.UI.fmt(K.credits); r.btn.classList.add('poor'); }
        r.btn.querySelector('.mats').innerHTML = Object.keys(K.needs).map(c => { const have = SF.Home.available(+c), ok = have >= K.needs[c];
          return `<li class="${ok ? '' : 'short'}"><i style="background:${SF.res(+c).color}"></i>${have}/${K.needs[c]} ${SF.res(+c).plural}</li>`; }).join('');
      },
    };
  }

  function beltCard(p) {
    const pipe = !!(p.helper && p.helper.pipe), need = SF.Home.beltNeeds(p.id), code = +Object.keys(need)[0];
    const btn = card('belt-' + p.id, pipe ? 'Copper pipeline' : 'Conveyor belt', () => SF.Home.installBelt(p.id), true);
    btn.querySelector('.card-cost').innerHTML = '<b></b>';
    return {
      btn,
      update(r) {
        const st = SF.ws().plots[p.id], have = SF.Home.available(code);
        if (p.research) {
          r.btn.querySelector('.card-lvl').textContent = 'Too far out for a belt';
          r.btn.querySelector('.card-eff').textContent = 'This machine stands where no belt reaches. Hire a driver to bring its stock in.';
          r.btn.querySelector('.card-cost b').textContent = ''; r.btn.disabled = true;
          return;
        }
        r.btn.querySelector('.card-lvl').textContent = st.belt ? `Installed · level ${st.beltLvl || 0}` : SF.Home.hasFactory() ? `${have} / ${need[code]} ${SF.res(code).name.toLowerCase()} (hall, chest, warehouse)` : 'Needs the Belt Factory on Halcyon';
        r.btn.querySelector('.card-eff').textContent = pipe ? 'Pumps the liquid to the warehouse by itself, so you never have to fetch it.' : 'Carries the stock to the drop off by itself, so you never have to fetch it.';
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
    `<span class="t-name">${R.plural}</span><span class="t-num"><b>0</b><small></small></span><span class="bar"><i></i></span><span class="t-tag"></span></div>`; };
  const known = pi => !SF.PLANETS[pi].far || !!SF.state.worlds[pi];
  const planetGroups = (filter) => SF.PLANETS.map((pl, pi) => ({ name: pl.name, tint: pl.theme.accent, codes: known(pi) ? pl.resources.map(r => pi * 10 + r.tier).filter(filter) : [] }))
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
          if (opts.tap) st.querySelectorAll('.tile').forEach(t => { t.classList.add('tap'); t.addEventListener('click', () => { SF.Audio.init(); opts.tap(+t.dataset.code); }); });
        }
        st.querySelectorAll('.tile').forEach(t => {
          const c = +t.dataset.code, n = opts.count(c), cap = opts.cap ? opts.cap(c) : null;
          t.querySelector('b').textContent = n;
          t.querySelector('small').textContent = cap ? '/' + cap : '';
          t.querySelector('.bar').hidden = !cap;
          if (cap) t.querySelector('.bar i').style.width = Math.min(100, n / cap * 100) + '%';
          t.classList.toggle('empty', !n);
          t.classList.toggle('full', !!cap && n >= cap);
          if (opts.tag) t.querySelector('.t-tag').textContent = opts.tag(c);
          if (opts.warn) t.classList.toggle('selling', opts.warn(c));
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
    return SF.PLANETS.map((pl, pi) => ({ pl, pi })).filter(o => o.pi !== C.home && known(o.pi) && (only == null || o.pi === only)).map(({ pl, pi }) => {
      const ws = SF.state.worlds[pi];
      if (!ws) return meter(pl.name, 0, 1, pl.theme.accent, 'not visited yet');
      const all = Hb.rockets(ws);
      return all.map((r, i) => {
        const name = pl.name + (all.length > 1 ? ` · rocket ${i + 1}` : ''), lab = Hb.padLabel(pi, r)[1];
        if (r.away > 0) return meter(name, (r.total || r.away) - r.away, r.total || r.away, pl.theme.accent, lab);
        return meter(name, r.n, SF.rocketCap(pi, r), pl.theme.accent, lab);
      }).join('');
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
        groups: () => planetGroups(c => (SF.state.hold[c] || 0) > 0 || Hb.sellStep(c) > 0),
        empty: 'The hall is empty. Rockets and your pack fill it.',
        count: c => SF.state.hold[c] || 0, cap: c => Hb.keepCap(c),
        tap: c => Hb.cycleSell(c),
        tag: c => { const d = Math.round((1 - SF.demandMult(c)) * 100), k = Hb.sellStep(c); return [Hb.isSelling(c) ? 'selling' : '', k ? 'keeps ' + Math.round(C.hub.sellAt[k] * 100) + '%' : '', d >= 5 ? 'price −' + d + '%' : ''].filter(Boolean).join(' · '); },
        warn: c => Hb.isSelling(c),
        lvl: () => `${Object.values(SF.state.hold).reduce((a, b) => a + b, 0)} items`,
        text: () => `Each material fills up to ${Hb.hallCap()}; anything over that is sold, and selling the same thing a lot lowers its price for a while. Tap a material to keep less of it and sell the rest earlier. Buildings take their materials from here.` +
          (Object.keys(SF.state.hold).some(c => Hb.isSelling(+c) && Hb.wanted(+c)) ? ' Careful: a building under construction still needs something that is being sold.' : ''),
      }),
      htmlCard('hall-rockets', 'Cargo rockets', () => ({ html: (SF.Fuel.has() ? meter('Rocket fuel', Math.floor(SF.Fuel.tank()), SF.Fuel.cap(), '#ffcf4a') : '') + rocketMeters(), text: 'Each rocket flies by itself when full. Bigger and faster models come from the Rocket Workshop in New Haven.' })),
      {
        btn: card('up-hall', 'Expand the hall', () => Hb.upgradeHall(), true),
        update(r) {
          const l = SF.state.hallLvl, maxed = l >= H.hall.max;
          fill(r.btn, maxed ? 'MAX' : `Lv ${l} → ${l + 1}`, maxed ? `${Hb.hallCap()} of each` : `${Hb.hallCap()} → ${Hb.hallCap() + H.hall.step} of each material`, maxed ? null : Hb.hallCost());
        },
      },
    ];
  }

  // ---------- contract board (Halcyon) ----------
  function contractCards() {
    const Ct = SF.Contracts, K = C.contracts, cards = [];
    cards.push({ btn: info('ct-info', `<span class="card-name">Orders</span><span class="card-eff">Hand in materials from the hall and get ${K.pay}× their sale price. A new order takes the place of every one you finish.</span>`), update() {} });
    for (let i = 0; i < K.slots; i++) {
      const div = info('ct-' + i, `<div class="contract"><img alt=""><span class="card-name"></span><span class="card-eff"></span>` +
        `<div class="c-row"><button type="button" class="job-chip c-swap">Swap</button><button type="button" class="job-chip on c-hand">Hand in <span class="c-pay"></span></button></div></div>`);
      div.querySelector('.c-hand').addEventListener('click', () => { SF.Audio.init(); if (Ct.hand(i)) flash(div); else shakeEl(div); });
      div.querySelector('.c-swap').addEventListener('click', () => { SF.Audio.init(); if (!Ct.swap(i)) shakeEl(div); });
      let shown = -1;
      cards.push({
        btn: div,
        update() {
          const o = Ct.list()[i];
          div.hidden = !o;
          if (!o) return;
          const R = SF.res(o.code), have = SF.state.hold[o.code] || 0, ok = Ct.ready(o), sw = Ct.swapIn();
          if (shown !== o.code) { shown = o.code; div.querySelector('img').src = icon(o.code); div.style.setProperty('--tint', R.color); }
          div.querySelector('.card-name').textContent = `${o.n} ${R.plural}`;
          div.querySelector('.card-eff').textContent = ok ? `Ready: the hall has ${have}.` : `The hall has ${have} of ${o.n}.`;
          div.querySelector('.c-pay').textContent = fmt(o.pay);
          const h = div.querySelector('.c-hand'); h.disabled = !ok;
          const s = div.querySelector('.c-swap'); s.disabled = sw > 0; s.textContent = sw > 0 ? `Swap in ${Math.ceil(sw)}s` : 'Swap';
        },
      });
    }
    cards.push({ btn: info('ct-done', `<span class="card-name">Finished</span><span class="card-eff"></span>`), update(r) { r.btn.querySelector('.card-eff').textContent = `${Ct.done()} contracts handed in so far. Orders grow a little with every one.`; } });
    return cards;
  }

  // ---------- New Haven build menu ----------
  const matList = needs => Object.keys(needs).map(c => `${needs[c]} ${SF.res(+c).plural.toLowerCase()}`).join(', ');
  const matHave = needs => Object.keys(needs).map(c => {
    const have = SF.state.hold[c] || 0, ok = have >= needs[c];
    return `<li class="${ok ? '' : 'short'}"><i style="background:${SF.res(+c).color}"></i>${have}/${needs[c]} ${SF.res(+c).plural}</li>`;
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

  // ---------- fuel plant ----------
  function fuelCards() {
    const F = C.fuel, cards = [];
    const box = info('fuel-info', `<span class="card-name">Fuel tank</span><div class="meters"></div><span class="card-eff"></span><div class="jobs"><div class="job-row"><span class="job-planet">Refine</span>${F.inputs.map(i =>
      `<button type="button" class="job-chip" data-code="${i.code}"><i style="background:${SF.res(i.code).color}"></i>${SF.res(i.code).plural} <small>${i.fuel >= 1 ? i.fuel + ' fuel each' : Math.round(1 / i.fuel) + ' per fuel'}</small></button>`).join('')}</div></div>`);
    box.querySelectorAll('.job-chip').forEach(b => b.addEventListener('click', () => { SF.Audio.init(); SF.Fuel.toggle(+b.dataset.code); }));
    cards.push({
      btn: box,
      update(r) {
        const h = SF.state.hold;
        r.btn.querySelector('.meters').innerHTML = meter('Rocket fuel', Math.floor(SF.Fuel.tank()), SF.Fuel.cap(), '#ffcf4a') +
          F.inputs.filter(i => SF.state.worlds[Math.floor(i.code / 10)] || i.code === 10).map(i => meter(SF.res(i.code).plural + ' in the hall', h[i.code] || 0, SF.Hub.hallCap(), SF.res(i.code).color)).join('');
        r.btn.querySelector('.card-eff').textContent = `Refines one item from the hall every ${F.every}s, oil first, then gas, then logs. Tap an input to switch it on or off. ` +
          `Couriers burn ${C.rockets.models.courier.fuel}, Heavy Haulers ${C.rockets.models.heavy.fuel} and Tankers ${C.rockets.models.tanker.fuel} fuel a trip; freighters fly free. A flight out to a far planet takes ${F.trip}.`;
        r.btn.querySelectorAll('.job-chip').forEach(b => b.classList.toggle('on', SF.Fuel.allowed(+b.dataset.code)));
      },
    });
    return cards;
  }

  // ---------- star map ----------
  // Every planet as a card: a little globe, its resources, what is going on there, and a way to fly or chart it.
  function starmapCards() {
    const cards = [], Mp = SF.Map;
    SF.PLANETS.forEach((pl, pi) => {
      const th = pl.theme;
      const div = info('map-' + pl.id, `<div class="globe" style="background:radial-gradient(circle at 35% 30%, ${th.accent} 0 6%, ${th.ground} 34%, ${th.backdrop} 100%)"></div>
        <div class="map-text"><span class="card-name"></span><span class="card-lvl"></span><span class="card-eff">${pl.tagline}</span>
        <ul class="res-list map-res">${pl.resources.map(r => `<li><i style="background:${r.color}"></i>${r.plural}${r.liquid ? ' <small>liquid</small>' : ''}</li>`).join('')}</ul>
        <div class="meters"></div><button type="button" class="btn primary map-go"></button></div>`);
      div.classList.add('map-card'); div.style.setProperty('--tint', th.accent);
      const go = div.querySelector('.map-go');
      go.addEventListener('click', () => { SF.Audio.init(); if (pi === SF.state.planet) return; if (Mp.charted(pi)) Mp.fly(pi); else if (Mp.chart(pi)) flash(div); else shakeEl(div); });
      cards.push({
        btn: div,
        update(r) {
          const here = pi === SF.state.planet, ch = Mp.charted(pi), o = Mp.overview(pi);
          r.btn.querySelector('.card-name').textContent = pl.name + (pi === C.home ? ' · home' : '');
          r.btn.querySelector('.card-lvl').textContent = here ? 'You are here' : !ch ? 'Uncharted' : o ? `${o.gates} of 5 regions open` : 'Not visited yet';
          r.btn.querySelector('.meters').innerHTML = !o ? '' : (o.stock != null ? meter('Warehouse', o.stock, o.cap, th.accent) : '') +
            (pi !== C.home ? meter('Cargo rocket', SF.Hub.rk(SF.state.worlds[pi]).n, SF.rocketCap(pi, SF.Hub.rk(SF.state.worlds[pi])), th.accent, SF.Hub.padLabel(pi)[1] + ' · ' + SF.Hub.rockets(SF.state.worlds[pi]).map(q => SF.Fleet.model(SF.Fleet.kindOf(q, SF.state.worlds[pi])).name).join(' + ')) : '') +
            `<div class="map-stats"><span>${o.crew} crew</span><span>${o.machines} machines</span></div>`;
          go.hidden = here;
          go.textContent = ch ? `Fly to ${pl.name}` + (pl.far ? ` · ${C.fuel.trip} fuel` : '') : `Chart a course · ${fmt(pl.chart)}`;
          go.classList.toggle('poor', !ch && SF.state.credits < pl.chart);
        },
      });
    });
    return cards;
  }

  // ---------- rocket workshop ----------
  function workshopCards() {
    const Fl = SF.Fleet, M = C.rockets.models, cards = [];
    // Which model each rocket flies: one row per rocket, a chip per model you own. The route's first row also
    // offers one more rocket.
    const routes = info('ws-routes', `<span class="card-name">Cargo routes</span><span class="card-eff"></span><div class="jobs"></div>`);
    let key = '';
    cards.push({
      btn: routes,
      update(r) {
        const list = Fl.routes(), own = Object.keys(M).filter(Fl.owned);
        r.btn.querySelector('.card-eff').textContent = list.length ? `Each rocket flies its own model: tap one per row. Tankers carry only liquids and gases, the others only solid goods. A rocket in the air switches when it is back. Fuel in the tank: ${Math.floor(SF.Fuel.tank())} / ${SF.Fuel.cap()}${SF.Fuel.has() ? '' : ' (build a Fuel Plant in New Haven)'}.` : 'Visit another planet first: each one gets its own cargo route.';
        const k = list.map(pi => pi + ':' + Fl.extra(pi)).join(',') + '|' + own.join(',') + '|' + own.map(Fl.cap).join(',');
        if (k !== key) {
          key = k;
          const box = r.btn.querySelector('.jobs');
          box.innerHTML = list.map(pi => SF.Hub.rockets(SF.state.worlds[pi]).map((q, i, all) => `<div class="job-row"><span class="job-planet">${SF.planetName(pi)}${all.length > 1 ? ' ' + (i + 1) : ''}</span>` +
            own.map(id => `<button type="button" class="job-chip" data-pi="${pi}" data-i="${i}" data-m="${id}"><i style="background:${M[id].trim}"></i>${M[id].name} <small>${Fl.cap(id)} · ${Math.round(C.hub.flight * (1 - 0.15 * SF.R('engines')) * M[id].flight)}s</small></button>`).join('') +
            (i === 0 ? `<button type="button" class="job-chip add-rk" data-add="${pi}"></button>` : '') + '</div>').join('')).join('');
          box.querySelectorAll('.job-chip[data-m]').forEach(b => b.addEventListener('click', () => { SF.Audio.init(); Fl.assign(+b.dataset.pi, +b.dataset.i, b.dataset.m); }));
          box.querySelectorAll('.add-rk').forEach(b => b.addEventListener('click', () => { SF.Audio.init(); if (Fl.addRocket(+b.dataset.add)) flash(b); else shakeEl(b); }));
        }
        r.btn.querySelectorAll('.job-chip[data-m]').forEach(b => { const ws = SF.state.worlds[+b.dataset.pi]; b.classList.toggle('on', Fl.kindOf(SF.Hub.rockets(ws)[+b.dataset.i], ws) === b.dataset.m); });
        // One more rocket on this route: shows how many fly now and what the next one costs.
        r.btn.querySelectorAll('.add-rk').forEach(b => {
          const pi = +b.dataset.add, n = Fl.extra(pi) + 1, max = n > C.rockets.extra.max, c = Fl.extraCost(pi);
          const short = SF.state.credits < c.credits || Object.keys(c.mats).some(k => (SF.state.hold[k] || 0) < c.mats[k]);
          b.innerHTML = max ? `${n} rockets <small>max</small>` : `+ Rocket <small>${n} → ${n + 1} · ${fmt(c.credits)} · ${Object.keys(c.mats).map(k => c.mats[k] + ' ' + SF.res(+k).name.toLowerCase()).join(', ')}</small>`;
          b.disabled = max; b.classList.toggle('short', !max && short);
        });
      },
    });
    for (const id in M) {
      const m = M[id];
      const btn = card('rk-' + id, m.name, () => (Fl.owned(id) ? Fl.upgradeFrame(id) : Fl.build(id)), false);
      btn.style.setProperty('--tint', m.trim); btn.classList.add('research');
      btn.insertAdjacentHTML('beforeend', '<ul class="res-list mats"></ul>');
      cards.push({
        btn,
        update(r) {
          const own = Fl.owned(id), lock = Fl.locked(id), l = Fl.frameLvl(id), max = l >= C.rockets.frame.max;
          const secs = Math.round(C.hub.flight * (1 - 0.15 * SF.R('engines')) * m.flight);
          if (!own) {
            fill(r.btn, lock ? 'Locked' : 'Build this model', lock ? m.locked : `${m.desc} Carries ${Fl.cap(id)}, ${secs}s each way` + (m.fuel ? `, ${m.fuel} fuel a trip.` : '.'), lock ? null : m.cost);
            r.btn.querySelector('.mats').innerHTML = lock ? '' : matHave(m.needs);
            if (!lock) r.btn.classList.toggle('poor', SF.state.credits < m.cost || Object.keys(m.needs).some(c => (SF.state.hold[c] || 0) < m.needs[c]));
            return;
          }
          const c = Fl.frameCost(id), next = Math.round(SF.rocketBase() * m.cap * (1 + C.rockets.frame.step * (l + 1)));
          fill(r.btn, max ? 'Cargo frame MAX' : `Cargo frame ${l} → ${l + 1}`, (max ? `Carries ${Fl.cap(id)}, ${secs}s each way` : `Carries ${Fl.cap(id)} → ${next}, ${secs}s each way`) + (m.fuel ? `, ${m.fuel} fuel a trip.` : ', no fuel.'), max ? null : c.credits);
          r.btn.querySelector('.mats').innerHTML = max ? '' : matHave(c.mats);
          if (!max) r.btn.classList.toggle('poor', SF.state.credits < c.credits || Object.keys(c.mats).some(k => (SF.state.hold[k] || 0) < c.mats[k]));
        },
      });
    }
    return cards;
  }

  // ---------- canteen ----------
  function canteenCards() {
    const F = C.food;
    return [
      htmlCard('canteen-info', 'Kitchen', () => {
        const k = SF.state.kitchen, h = SF.state.hold, per = SF.foodPer(), cap = SF.Hub.hallCap();
        const fed = SF.state.crew.filter(w => SF.Food.canWork(w)).length;
        return {
          html: meter('Meals ready', SF.Food.meals(k), F.cap, '#ffb340', k.feast ? `${k.meal} + ${k.feast} feasts` : null) + meter('Drinks ready', SF.Food.drinks(k), F.cap, '#7fd8ff', k.elixir ? `${k.drink} + ${k.elixir} elixirs` : null) +
            meter(SF.res(F.meal).plural + ' in the hall', h[F.meal] || 0, cap, SF.res(F.meal).color) + meter(SF.res(F.drink).name + ' in the hall', h[F.drink] || 0, cap, SF.res(F.drink).color) +
            (SF.state.worlds[5] ? meter(SF.res(F.feast).plural + ' in the hall', h[F.feast] || 0, cap, SF.res(F.feast).color) + meter(SF.res(F.elixir).name + ' in the hall', h[F.elixir] || 0, cap, SF.res(F.elixir).color) : '') +
            meter('Crew fed and working', fed, SF.state.crew.length || 1, '#9be36a', `${fed} / ${SF.state.crew.length}`),
          text: `Cooks ${per} ${SF.res(F.meal).plural.toLowerCase()} into 1 meal and ${per} ${SF.res(F.drink).plural.toLowerCase()} into 1 drink. Moonmelons and dew nectar from Edenia become feasts and elixirs that keep crew full twice as long. Crew on other planets eat from their warehouse; their cargo rocket brings it.`,
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
        lvl: () => `${Object.values(SF.ws().wh || {}).reduce((a, b) => a + b, 0)} / ${SF.Hub.whCap()} items`,
        text: () => {
          const wh = SF.ws().wh || {}, ws = SF.ws(), wet = Object.keys(wh).some(c => wh[c] > 0 && SF.res(+c).liquid) && !SF.Hub.rockets(ws).some(q => SF.Fleet.model(SF.Fleet.kindOf(q, ws)).liquid),
            dry = Object.keys(wh).some(c => wh[c] > 0 && !SF.res(+c).liquid) && SF.Hub.rockets(ws).every(q => SF.Fleet.model(SF.Fleet.kindOf(q, ws)).liquid);
          return (SF.Hub.whFull() ? 'Full! Crew, drones, belts and you all wait until the rocket takes a load. Expand it below.' : 'Stock waits here while the rocket is away and loads up again when it lands.') +
            (wet ? ' Liquids and gases wait for a Tanker: build one in the Rocket Workshop and pick it for a rocket on this route.' : '') +
            (dry ? ' Tankers carry only liquids and gases: give a rocket on this route another model for the solid goods.' : '');
        },
      }),
      {
        btn: card('up-wh', 'Expand the warehouse', () => SF.Hub.upgradeWarehouse(), true),
        update(r) {
          const W = C.hub.wh, l = SF.ws().whLvl || 0, maxed = l >= W.max, cap = SF.Hub.whCap();
          fill(r.btn, maxed ? 'MAX' : `Lv ${l} → ${l + 1}`, maxed ? `Holds ${cap}` : `Holds ${cap} → ${cap + W.step} items`, maxed ? null : SF.Hub.whCost());
        },
      },
      htmlCard('wh-rocket', 'Cargo rocket', () => {
        const pi = SF.state.planet, n = SF.Food.crewOn(pi), pan = SF.Food.pantry(pi);
        return {
          html: rocketMeters(pi) + (n ? meter('Crew meals', SF.Food.meals(pan), Math.max(SF.Food.meals(pan), C.food.pantry * n), '#ffb340') + meter('Crew drinks', SF.Food.drinks(pan), Math.max(SF.Food.drinks(pan), C.food.pantry * n), '#7fd8ff') : ''),
          text: 'It flies to Halcyon by itself when full' + (n ? ' and brings the crew food from the canteen on the way back.' : '.'),
        };
      }),
      {
        btn,
        update(b) {
          const r = Hb.rk(SF.ws());
          b.btn.querySelector('.card-lvl').textContent = r.away > 0 ? 'Away' : `${r.n} / ${SF.rocketCap(SF.state.planet, r)} loaded`;
          const need = SF.Fuel.perTrip(SF.state.planet, r);
          b.btn.querySelector('.card-eff').textContent = 'Send what is loaded now instead of waiting for a full rocket.' + (need ? ` Burns ${need} fuel (${Math.floor(SF.Fuel.tank())} in the tank).` : '');
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
    return SF.Map.destinations().map(i => ({ pl: SF.PLANETS[i], i })).map(({ pl, i }) => {
      const btn = document.createElement('button');
      btn.className = 'card travel'; btn.id = 'fly-' + pl.id; btn.type = 'button';
      btn.innerHTML = `<span class="card-key"></span><span class="card-name">${pl.name}</span>
        <span class="card-eff">${pl.resources.map(r => r.plural).join(', ')}${pl.far ? ` · ${C.fuel.trip} fuel` : ''}</span>`;
      btn.style.setProperty('--tint', pl.theme.accent);
      btn.addEventListener('click', () => { SF.Audio.init(); SF.Map.fly(i); });
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
      const rows = SF.PLANETS.map((pl, pi) => !known(pi) ? '' : `<div class="job-row"><span class="job-planet">${pl.name}</span>` +
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
