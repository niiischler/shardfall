// HTML overlay: credit counter, goal line, station panels, menu, intro and arrival cards.
SF.UI = (function () {
  const C = SF.CFG;
  const $ = id => document.getElementById(id);
  let els = {}, shown = 0, refs = [], bumpT = 0, introGone = false;

  // Compact numbers: 12, 2.5, 1.2k, 34k, 1.5M. `dec` allows one decimal under 100.
  function fmt(n, dec) {
    if (dec && n < 100 && n % 1) return n.toFixed(1).replace(/\.0$/, '');
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  const NOUNS = { crystal: 'crystal', rock: 'rock', clam: 'clam', tree: 'tree', mushroom: 'mushroom', bush: 'bush', cactus: 'cactus', bones: 'fossil' };

  const effects = {
    cap: l => `Carry ${10 + 5 * l}`,
    drill: l => `${(1 + 0.5 * l).toFixed(1)} dmg · ${(1 / Math.max(0.16, 0.4 - 0.02 * l)).toFixed(1)} hits/s`,
    speed: l => `Speed ${210 + 20 * l}`,
  };

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
      if (n >= 1 && n <= refs.length && refs[n - 1].btn && !els.panel.hidden) refs[n - 1].btn.click();
    });
    const pl = SF.planet();
    $('intro-eyebrow').textContent = 'Planet ' + SF.planetName() + ' · ' + pl.tagline;
    $('intro-sub').textContent = SF.state.totalEarned > 0 || SF.state.stars > 0 ? 'Welcome back. Your outpost on ' + SF.planetName() + ' is where you left it.' : pl.intro;
    if (SF.state.totalEarned > 0 || SF.state.stars > 0) $('btn-start').textContent = 'Resume';
    syncSound();
    refresh();
  }

  function dismissIntro() {
    if (introGone) return;
    introGone = true;
    els.intro.classList.add('gone');
    setTimeout(() => { els.intro.hidden = true; }, 400);
  }

  function showArrival() {
    const pl = SF.planet();
    $('arrive-eyebrow').textContent = `Planet ${SF.state.planet + 1} reached`;
    $('arrive-title').textContent = SF.planetName();
    $('arrive-tag').textContent = pl.tagline;
    $('arrive-sub').textContent = pl.intro;
    $('arrive-bonus').textContent = `Star charts: +${Math.round(C.starBonus * SF.state.stars * 100)}% on every sale, forever.`;
    const list = $('arrive-res');
    list.innerHTML = '';
    pl.resources.forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `<i style="background:${r.color}"></i>${r.plural}`;
      list.appendChild(li);
    });
    els.arrive.hidden = false;
  }

  function openMenu(on) {
    els.menu.hidden = !on;
    els.resetConfirm.hidden = true; els.reset.hidden = false;
    if (!on) return;
    const s = SF.state;
    const built = SF.World.plots.filter(p => s.plots[p.id].built).length;
    els.stats.innerHTML = `
      <div><dt>Planet</dt><dd>${SF.planetName()}</dd></div>
      <div><dt>Planets finished</dt><dd>${s.stars}</dd></div>
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
    const s = SF.state, st = SF.stats(), home = SF.World.res(0);
    if (s.totalEarned === 0 && s.stack.length === 0) return `Stand next to a ${NOUNS[home.node]} to harvest ${home.plural.toLowerCase()}`;
    if (s.totalEarned === 0) return s.stack.length >= st.cap ? 'Pack full. Carry it to the DROP OFF pad' : 'Harvest more, then carry it to the DROP OFF pad';
    if (s.stack.length >= st.cap) return 'Pack full. Head to the DROP OFF pad';
    if (s.plots.launch.built) return 'The rocket is ready. Stand on the launch pad to fly on';
    const next = SF.World.plots.filter(p => SF.plotVisible(p) && !s.plots[p.id].built).sort((a, b) => a.cost - b.cost)[0];
    if (next) return `Next: stand on the ${next.name} plot to build it (${fmt(next.cost - s.plots[next.id].paid)} left)`;
    return 'Everything is built. Max out your upgrades!';
  }

  // ---------- panels ----------
  function setZone(zone) {
    if (zone === 'upgrade') openPanel('Upgrade terminal', upgradeCards());
    else if (zone && zone.startsWith('bld:')) {
      const p = SF.World.plot(zone.slice(4));
      if (p.kind === 'drones') openPanel(p.name, [droneCard(p)]);
      else if (p.kind === 'producer') openPanel(p.name, [producerCard(p)]);
      else if (p.kind === 'launch') openPanel('Launch pad', [launchCard()]);
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
        const s = SF.state, maxed = s.drones >= C.drone.max;
        fill(r.btn, `${s.drones} / ${C.drone.max} ${p.helper.unit.toLowerCase()}s`, 'Harvests the best node nearby and flies the cargo home', maxed ? null : SF.droneCost());
      },
    };
  }

  function producerCard(p) {
    const res = SF.World.res(p.helper.res);
    return {
      btn: card('up-producer', 'Faster ' + p.name.toLowerCase(), () => SF.upgradeProducer(p.id), true),
      update(r) {
        const st = SF.state.plots[p.id], now = SF.producerStats(p, st), maxed = st.lvl >= C.producer.max;
        const next = maxed ? now : SF.producerStats(p, { lvl: st.lvl + 1 });
        fill(r.btn, maxed ? 'MAX' : `Lv ${st.lvl} → ${st.lvl + 1}`,
          `1 ${res.name.toLowerCase()} every ${now.every.toFixed(1)}s, holds ${now.cap}` + (maxed ? '' : ` → ${next.every.toFixed(1)}s, ${next.cap}`) +
          `. Stock: ${st.pile}. Standing here loads it onto your back.`, maxed ? null : SF.producerCost(st));
      },
    };
  }

  function launchCard() {
    const next = SF.planetName(SF.state.planet + 1);
    const btn = document.createElement('button');
    btn.className = 'card wide launch'; btn.id = 'btn-launch'; btn.type = 'button';
    btn.innerHTML = `<span class="card-key"></span><span class="card-name">Launch to ${next}</span>
      <span class="card-eff">You start fresh on a new world: credits, upgrades and buildings reset. You keep a permanent +${Math.round(C.starBonus * 100)}% on every sale.</span>`;
    btn.addEventListener('click', () => { SF.Audio.init(); SF.startLaunch(); });
    return { btn, update() {} };
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
    els.credits.textContent = fmt(SF.state.credits);
    els.goal.textContent = goalText();
    els.planet.textContent = SF.planetName() + (SF.state.stars ? '  ★' + SF.state.stars : '');
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

  return { init, refresh, tick, bump, setZone, dismissIntro, showArrival, fmt };
})();
