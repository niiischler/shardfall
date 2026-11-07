// HTML overlay: credit counter, goal line, station panels, menu, intro and arrival cards.
SF.UI = (function () {
  const C = SF.CFG;
  const $ = id => document.getElementById(id);
  let els = {}, shown = 0, refs = [], bumpT = 0, introGone = false;

  // Compact numbers: 12, 2.5, 1.2k, 34k, 1.5M.
  function fmt(n) {
    if (n < 100 && n % 1) return n.toFixed(1).replace(/\.0$/, '');
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  const NOUNS = { crystal: 'crystal', rock: 'rock', clam: 'clam', tree: 'tree', mushroom: 'mushroom', bush: 'bush', cactus: 'cactus', bones: 'fossil' };

  const PLURALS = { crystal: 'crystals', rock: 'rocks', clam: 'clams', tree: 'trees', mushroom: 'mushrooms', bush: 'bushes', cactus: 'cacti', bones: 'fossils' };

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
      if (t.stars === stars) list.push(`New tool: ${t.name} (${t.nodes.map(n => PLURALS[n]).join(', ')} break ${t.mult}x faster)`);
    }
    if (stars === C.home) list.push('Travel: fly between all planets from now on');
    return list;
  }

  function init() {
    els = {
      credits: $('credits'), creditBox: $('credit-box'), goal: $('goal'), planet: $('planet-chip'),
      panel: $('panel'), panelTitle: $('panel-title'), panelBody: $('panel-body'),
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
    window.addEventListener('keydown', e => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= refs.length && refs[n - 1].btn.tagName === 'BUTTON' && !els.panel.hidden) refs[n - 1].btn.click();
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
    if (SF.World.chest && s.stack.some(c => Math.floor(c / 10) !== s.planet)) return 'Put materials from other planets into the chest by the rocket';
    if (s.totalEarned === 0 && s.stack.length === 0) return `Stand next to a ${NOUNS[home.node]} to harvest ${home.plural.toLowerCase()}`;
    if (s.totalEarned === 0) return s.stack.length >= st.cap ? 'Pack full. Carry it to the DROP OFF pad' : 'Harvest more, then carry it to the DROP OFF pad';
    if (s.stack.length >= st.cap) return 'Pack full. Head to the DROP OFF pad';
    if (!SF.atHome() && ws.plots.launch.built) return 'The rocket is ready. Stand on the launch pad to fly on';
    const next = SF.World.plots.filter(p => SF.plotVisible(p) && !ws.plots[p.id].built).sort((a, b) => a.cost - b.cost)[0];
    if (next) {
      const missing = Object.keys(next.needs || {}).filter(c => (ws.plots[next.id].res[c] || 0) < next.needs[c]).map(c => SF.res(+c).plural);
      if (missing.length && next.cost - ws.plots[next.id].paid < 1) return `${next.name} needs ${missing.join(', ')}. Fetch them by rocket and fill the chest`;
      return `Next: stand on the ${next.name} plot to build it (${fmt(next.cost - ws.plots[next.id].paid)} left)`;
    }
    if (SF.atHome()) return 'Fly to other planets for materials, or hire crew in the habitats';
    return 'Everything is built. Max out your upgrades!';
  }

  // ---------- panels ----------
  const PANELS = {
    drones: p => [droneCard(p)],
    producer: p => [producerCard(p), beltCard(p)],
    launch: () => (SF.atHome() ? travelCards() : [launchCard()]),
    habitat: () => crewCards(),
  };
  const hasPanel = p => !!PANELS[p.kind];

  function setZone(zone) {
    if (zone === 'upgrade') openPanel('Upgrade terminal', upgradeCards());
    else if (zone === 'chest') openPanel('Material chest', [chestCard()]);
    else if (zone && zone.startsWith('bld:')) {
      const p = SF.World.plot(zone.slice(4));
      openPanel(p.kind === 'launch' ? (SF.atHome() ? 'Rocket: choose a planet' : 'Launch pad') : p.name, PANELS[p.kind](p));
    } else closePanel();
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
        const st = SF.ws().plots[p.id], have = SF.Home.hold(code);
        r.btn.querySelector('.card-lvl').textContent = st.belt ? 'Installed' : SF.Home.hasFactory() ? `${have} / ${need[code]} ${SF.res(code).name.toLowerCase()} in chest` : 'Needs the Belt Factory on Halcyon';
        r.btn.querySelector('.card-eff').textContent = 'Carries the stock to the drop off by itself, so you never have to fetch it.';
        r.btn.querySelector('.card-cost b').textContent = st.belt ? '' : `${need[code]} ${SF.res(code).name}`;
        r.btn.disabled = st.belt || !SF.Home.hasFactory();
        r.btn.classList.toggle('poor', !st.belt && have < need[code]);
      },
    };
  }

  function chestCard() {
    const div = info('chest-info', '<span class="card-name">Stored materials</span><ul class="res-list" id="chest-list"></ul><span class="card-eff">Stand here to unload your pack into the chest. Buildings take their materials from it.</span>');
    return {
      btn: div,
      update() {
        const ul = div.querySelector('#chest-list'), hold = SF.state.hold;
        const codes = Object.keys(hold).filter(c => hold[c] > 0).sort((a, b) => a - b);
        ul.innerHTML = codes.length ? codes.map(c => `<li><i style="background:${SF.res(+c).color}"></i>${hold[c]} ${SF.res(+c).plural}</li>`).join('') : '<li>Empty</li>';
      },
    };
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
          `Crew work on their own on any planet and ship 1 resource to the chest every ${C.crew.workEvery}s. Each eats 1 ${SF.res(C.crew.food).name.toLowerCase()} from the chest every ${C.crew.eatEvery}s.`, full ? null : SF.hireCost());
      },
    }];
    SF.state.crew.forEach((w, i) => {
      const btn = card('crew-' + i, 'Crew ' + (i + 1), () => SF.Home.nextJob(i));
      btn.querySelector('.card-cost').innerHTML = '<b>Change job</b>';
      cards.push({
        btn,
        update(r) {
          const R = SF.res(w.job), pl = SF.planet(Math.floor(w.job / 10));
          r.btn.querySelector('.card-lvl').textContent = `${R.plural} · ${pl.name}`;
          r.btn.querySelector('.card-eff').textContent = w.hungry ? `Hungry! Put ${SF.res(C.crew.food).name.toLowerCase()} in the chest.` : 'Working';
          r.btn.classList.toggle('poor', !!w.hungry);
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

  function openPanel(title, cards) {
    refs = cards;
    els.panelTitle.textContent = title;
    els.panelBody.innerHTML = '';
    els.panelBody.classList.toggle('single', cards.length === 1);
    cards.forEach((c, i) => { c.btn.querySelector('.card-key').textContent = i + 1; els.panelBody.appendChild(c.btn); });
    els.panel.hidden = false;
    requestAnimationFrame(() => els.panel.classList.add('open'));
    refresh();
  }

  function closePanel() {
    refs = [];
    els.panel.classList.remove('open');
    els.panel.hidden = true;
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
