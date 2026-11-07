// Game rules and the main loop: move, harvest, carry, deliver, build, launch.
(function () {
  const C = SF.CFG, W = SF.World, FX = SF.FX, A = SF.Audio, Rn = SF.Render;
  const TAU = Math.PI * 2;

  const P = SF.player = {
    x: 0, y: 0, vx: 0, vy: 0, face: 1, walk: 0, sway: 0,
    swing: 0, hitT: 0, target: null, incoming: 0, fullT: 0, fullWarned: false,
    deliverT: 0, payT: 0, collectT: 0, stackFx: [], zone: null, hidden: false,
  };
  const flyers = [];
  const drones = SF.drones = [];
  const cam = { x: 0, y: 0 };
  let combo = 0, comboT = 0, depotGlow = 0, smokeT = 0, saveT = 0, time = 0;
  let launch = null; // { t } while the rocket is lifting off
  let canvas, ctx, fog, fctx, dpr = 1, vw = 0, vh = 0, zoom = 1;

  // ---------- state ----------
  function serialize() {
    return Object.assign({}, SF.state, { stack: SF.state.stack.slice(), player: { x: Math.round(P.x), y: Math.round(P.y) } });
  }
  function save() { SF.Save.write(serialize()); }
  SF.save = save;
  SF.serialize = serialize;

  // Put the world, player and camera in place for the current state.
  function enterPlanet() {
    W.load(ctx);
    P.x = SF.state.player.x; P.y = SF.state.player.y; P.vx = P.vy = 0;
    P.incoming = 0; P.stackFx = []; P.zone = null; P.hidden = false;
    flyers.length = 0; drones.length = 0;
    cam.x = P.x; cam.y = P.y - 30;
    document.documentElement.style.setProperty('--accent', W.planet.theme.accent);
  }

  function resetProgress() {
    SF.Save.clear();
    SF.state = SF.Save.fresh({ muted: A.isMuted() });
    launch = null;
    enterPlanet();
    save(); SF.UI.setZone(null); SF.UI.refresh();
  }
  SF.resetProgress = resetProgress;

  // ---------- flyers: items arcing between places ----------
  function fly(res, sx, sy, getTarget, opts) {
    flyers.push(Object.assign({ res, sx, sy, getTarget, t: -(opts.delay || 0), dur: 0.42, arc: 60, coin: false }, opts));
  }

  function earn(res) {
    const v = SF.resValue(W.res(res)) * SF.sellMult();
    SF.state.credits += v; SF.state.totalEarned += v; SF.state.lifetime += v;
    combo++; comboT = 0.6; depotGlow = 1;
    A.coin(combo);
    const d = C.depot;
    FX.pop(d.x + (Math.random() - 0.5) * 40, d.y - 70, '+' + SF.UI.fmt(v, 1), '#ffd36b', 18 + Math.min(10, combo * 0.3));
    FX.burst(d.x, d.y - 28, ['#ffd36b', '#fff1bf'], 3, { z: 6, speed: 90, up: 220, shape: 'coin', size: 4, life: 0.7 });
    SF.UI.bump();
  }

  function toStack(res, sx, sy, delay) {
    P.incoming++;
    fly(res, sx, sy, () => Rn.stackSlot(P, SF.state.stack.length), {
      delay, dur: 0.38, arc: 70,
      onArrive(f) {
        SF.state.stack.push(f.res); P.incoming--;
        P.stackFx[SF.state.stack.length - 1] = 1;
        A.pick(SF.state.stack.length);
      },
    });
  }

  // ---------- harvesting ----------
  function hitNode(n, dmg, who, loud) {
    n.hp -= dmg; n.flash = 1; n.shake = 1;
    const R = n.def;
    FX.sparks(n.x + (who.x - n.x) * 0.3, n.y, 26, [R.color, '#ffffff'], 6);
    FX.burst(n.x, n.y, [R.color, R.dark], 3, { z: 26, speed: 120, size: 3.5 });
    A.hit(loud);
    if (n.hp <= 0) breakNode(n, who, loud);
  }

  function breakNode(n, who, loud) {
    const R = n.def;
    n.alive = false; n.regrowT = R.regrow; n.hp = 0;
    if (n.claimed) { n.claimed.target = null; n.claimed = null; }
    FX.burst(n.x, n.y, [R.color, R.dark, '#ffffff'], 18, { z: 30, speed: 210, size: 5 });
    A.brk(loud);
    if (loud > 0.5) FX.shake(0.22);
    const isPlayer = who === P;
    const free = isPlayer ? SF.stats().cap - SF.state.stack.length - P.incoming : who.cap - who.cargo.length - who.incoming;
    const k = Math.max(0, Math.min(R.drops, free));
    for (let i = 0; i < k; i++) {
      const sx = n.x + (Math.random() - 0.5) * 20, sy = n.y - 30;
      if (isPlayer) toStack(n.res, sx, sy, i * 0.07);
      else {
        who.incoming++;
        fly(n.res, sx, sy, () => ({ x: who.x, y: who.y - 40 }), { delay: i * 0.07, dur: 0.35, arc: 40, onArrive(f) { who.cargo.push(f.res); who.incoming--; } });
      }
    }
    if (isPlayer) FX.pop(n.x, n.y - 70, `+${k} ${k === 1 ? R.name : R.plural}`, R.color, 15, { life: 0.9 });
  }

  // ---------- drones ----------
  function spawnDrone(x, y) {
    drones.push({ x, y, vx: 0, vy: 0, state: 'seek', target: null, cargo: [], incoming: 0, cap: C.drone.cap, hitT: 0, beam: 0, bob: Math.random() * TAU, idle: Math.random() * TAU });
  }

  function droneBay() { return W.plots.find(p => p.kind === 'drones'); }

  function updateDrone(d, dt) {
    d.beam = Math.max(0, d.beam - dt * 5);
    let goal = null;
    if (d.state === 'seek') {
      if (d.cargo.length + d.incoming >= d.cap) d.state = 'return';
      else {
        if (!d.target || !d.target.alive) {
          d.target = null;
          let best = null, bd = Infinity;
          for (const n of W.nodes) {
            if (!n.alive || n.claimed || !W.nodeOpen(n)) continue;
            // Prefer valuable nodes a little, and leave the player's node alone.
            const dd = Math.hypot(n.x - d.x, n.y - d.y) - n.res * 60 + (n === P.target ? 400 : 0);
            if (dd < bd) { bd = dd; best = n; }
          }
          if (best) { d.target = best; best.claimed = d; }
        }
        if (d.target) {
          goal = d.target;
          if (Math.hypot(goal.x - d.x, goal.y - d.y) < goal.r + 26) { d.state = 'harvest'; d.hitT = 0.3; }
        } else if (d.cargo.length) d.state = 'return';
        else {
          const bay = droneBay();
          d.idle += dt;
          goal = { x: bay.x + Math.cos(d.idle) * 60, y: bay.y + 60 + Math.sin(d.idle) * 24 };
        }
      }
    }
    if (d.state === 'harvest') {
      const n = d.target;
      if (!n || !n.alive) {
        if (n && n.claimed === d) n.claimed = null;
        d.target = null;
        d.state = d.cargo.length + d.incoming >= d.cap ? 'return' : 'seek';
      } else {
        d.vx *= 0.9; d.vy *= 0.9;
        d.hitT -= dt;
        if (d.hitT <= 0) {
          d.hitT = C.drone.hitEvery; d.beam = 1;
          hitNode(n, 1 + n.res * 0.5, d, Math.max(0, 1 - Math.hypot(n.x - P.x, n.y - P.y) / 500) * 0.4);
        }
      }
    }
    if (d.state === 'return') {
      goal = { x: C.dropZone.x, y: C.dropZone.y - 20 };
      if (Math.hypot(goal.x - d.x, goal.y - d.y) < 34 && d.incoming === 0) {
        d.cargo.forEach((res, i) => fly(res, d.x, d.y - 40, () => ({ x: C.depot.x, y: C.depot.y - 30 }), { delay: i * 0.08, dur: 0.4, arc: 50, onArrive(f) { earn(f.res); } }));
        d.cargo = [];
        d.state = 'seek';
      }
    }
    if (goal) {
      const dx = goal.x - d.x, dy = goal.y - d.y, l = Math.hypot(dx, dy) || 1;
      const sp = C.drone.speed * Math.min(1, l / 60);
      d.vx += (dx / l * sp - d.vx) * Math.min(1, dt * 4);
      d.vy += (dy / l * sp - d.vy) * Math.min(1, dt * 4);
    }
    d.x += d.vx * dt; d.y += d.vy * dt;
  }

  // ---------- producers (sawmill, mine, excavator) ----------
  SF.producerStats = function (p, st) {
    const h = p.helper;
    return { every: h.every / (1 + 0.35 * st.lvl), cap: h.pile + 4 * st.lvl };
  };

  function updateProducer(p, st, dt) {
    const ps = SF.producerStats(p, st);
    if (st.pile >= ps.cap) { st.t = 0; return; }
    st.t = (st.t || 0) + dt;
    if (st.t >= ps.every) {
      st.t -= ps.every; st.pile++;
      FX.burst(p.x - 20, p.y - 30, [W.res(p.helper.res).color, '#fff4e8'], 4, { z: 40, speed: 80, size: 3, life: 0.5 });
    }
  }

  // ---------- building ----------
  function plotVisible(p) { return !p.requires || SF.state.plots[p.requires].built; }
  SF.plotVisible = plotVisible;

  function build(p) {
    const st = SF.state.plots[p.id];
    st.built = true; st.paid = p.cost;
    FX.burst(p.x, p.y, ['#ffd36b', '#fff4e8', W.planet.theme.accent, '#ffab4a'], 46, { z: 10, speed: 320, up: 420, size: 6, life: 1.3 });
    FX.shake(0.6);
    A.build();
    FX.pop(p.x, p.y - 80, p.name + ' built!', '#fff4e8', 24, { life: 1.8, vy: -30 });
    if (p.kind === 'drones' && SF.state.drones < 1) SF.state.drones = 1;
    if (p.kind === 'gate') {
      const reg = W.regions.find(r => r.unlock === p.id);
      FX.pop(reg.x, reg.y, reg.name + ' is open', '#fff4e8', 26, { life: 2.5, vy: -10 });
      W.nodes.forEach(n => { if (n.region === reg) n.grow = 0; });
    }
    save(); SF.UI.refresh();
  }

  function spend(cost) {
    if (SF.state.credits < cost) { A.nope(); return false; }
    SF.state.credits -= cost; A.buy(); return true;
  }

  SF.buyUpgrade = function (key) {
    const u = C.upgrades[key], s = SF.state;
    if (s.lvl[key] >= u.max || !spend(SF.upgradeCost(key))) return false;
    s.lvl[key]++;
    FX.shake(0.15);
    FX.burst(P.x, P.y, ['#ffd36b', '#fff4e8'], 20, { z: 30, speed: 200, size: 4 });
    FX.pop(P.x, P.y - 100, u.name + ' Lv ' + s.lvl[key], '#ffd36b', 18);
    save(); SF.UI.refresh();
    return true;
  };

  SF.buyDrone = function () {
    const s = SF.state, bay = droneBay();
    if (s.drones >= C.drone.max || !spend(SF.droneCost())) return false;
    s.drones++;
    FX.burst(bay.x, bay.y - 20, [W.planet.theme.accent, '#fff4e8'], 24, { z: 30, speed: 200, size: 4 });
    FX.pop(bay.x, bay.y - 80, bay.helper.unit + ' ' + s.drones + ' launched', W.planet.theme.accent, 18);
    save(); SF.UI.refresh();
    return true;
  };

  SF.upgradeProducer = function (id) {
    const p = W.plot(id), st = SF.state.plots[id];
    if (st.lvl >= C.producer.max || !spend(SF.producerCost(st))) return false;
    st.lvl++;
    FX.burst(p.x, p.y - 20, ['#ffd36b', '#fff4e8'], 24, { z: 30, speed: 200, size: 4 });
    FX.pop(p.x, p.y - 90, p.name + ' Lv ' + st.lvl, '#ffd36b', 18);
    save(); SF.UI.refresh();
    return true;
  };

  // ---------- launch to the next planet ----------
  SF.startLaunch = function () {
    if (launch) return;
    launch = { t: 0 };
    P.hidden = true;
    SF.UI.setZone(null);
    A.build();
    save();
  };

  function travel() {
    const s = SF.state;
    SF.state = SF.Save.fresh({ planet: s.planet + 1, stars: s.stars + 1, lifetime: s.lifetime, muted: s.muted });
    launch = null;
    enterPlanet();
    save();
    SF.UI.refresh();
    SF.UI.showArrival();
  }

  function updateLaunch(dt) {
    launch.t += dt;
    FX.shake(0.04);
    const p = W.plot('launch');
    if (launch.t > 0.4 && Math.random() < 0.8) FX.smoke(p.x + (Math.random() - 0.5) * 30, p.y, 4);
    if (launch.t > 3.2) travel();
  }

  const rocketLift = () => (launch ? Math.pow(Math.max(0, launch.t - 0.6), 2) * 140 : 0);

  // ---------- update ----------
  function update(dt) {
    time += dt;
    const s = SF.state, st = SF.stats();

    if (launch) updateLaunch(dt);

    // movement (frozen during launch)
    const v = launch ? { x: 0, y: 0 } : SF.Input.vector();
    const k = Math.min(1, dt * 12);
    P.vx += (v.x * st.speed - P.vx) * k;
    P.vy += (v.y * st.speed - P.vy) * k;
    P.x += P.vx * dt; P.y += P.vy * dt;
    if (Math.abs(v.x) > 0.15) P.face = v.x > 0 ? 1 : -1;
    P.walk += dt * Math.hypot(P.vx, P.vy) / 16;
    P.sway += (-P.vx / st.speed * 22 - P.sway) * Math.min(1, dt * 6);
    for (const n of W.nodes) if (n.alive && Math.abs(n.x - P.x) < 60 && Math.abs(n.y - P.y) < 60) W.pushOut(P, n.x, n.y, n.r * 0.7 + 8);
    W.pushOut(P, C.depot.x, C.depot.y - 10, 62);
    W.constrain(P, 18);

    // harvest the nearest node in reach
    P.swing = Math.max(0, P.swing - dt * 3.5);
    P.fullT = Math.max(0, P.fullT - dt);
    let tgt = null, td = Infinity;
    if (!launch) for (const n of W.nodes) {
      if (!n.alive || n.grow < 0.6) continue;
      const d = Math.hypot(n.x - P.x, (n.y - P.y) * 1.3);
      if (d < n.r + 46 && d < td) { td = d; tgt = n; }
    }
    P.target = tgt;
    P.hitT -= dt;
    const free = st.cap - s.stack.length - P.incoming;
    if (free > 0) P.fullWarned = false;
    if (tgt) {
      if (free <= 0) {
        P.fullT = 0.5;
        if (!P.fullWarned) { P.fullWarned = true; A.full(); FX.pop(P.x, P.y - 110, 'Pack full! Drop it off', '#ff8f5a', 16, { life: 1.4 }); }
      } else if (P.hitT <= 0) {
        P.hitT = st.hitEvery; P.swing = 1;
        P.face = tgt.x >= P.x ? 1 : -1;
        hitNode(tgt, st.dmg, P, 1);
        FX.shake(0.05);
      }
    } else P.hitT = Math.min(P.hitT, 0.08);
    for (let i = 0; i < P.stackFx.length; i++) if (P.stackFx[i]) P.stackFx[i] = Math.max(0, P.stackFx[i] - dt * 5);

    // zones
    let zone = null;
    if (!launch) {
      const inZone = (x, y, r) => Math.hypot(P.x - x, (P.y - y) * 1.5) < r;
      if (inZone(C.dropZone.x, C.dropZone.y, C.dropZone.r)) zone = 'drop';
      else if (inZone(C.upgradePad.x, C.upgradePad.y, C.upgradePad.r)) zone = 'upgrade';
      else for (const p of W.plots) {
        if (!plotVisible(p)) continue;
        const ps = s.plots[p.id];
        if (!ps.built && inZone(p.x, p.y, C.plotR)) { zone = 'plot:' + p.id; break; }
        if (ps.built && (p.kind === 'drones' || p.kind === 'producer' || p.kind === 'launch') && inZone(p.x, p.y + 40, 54)) { zone = 'bld:' + p.id; break; }
      }
    }
    if (zone !== P.zone) { P.zone = zone; SF.UI.setZone(zone); }

    // deliver cargo, one item at a time
    if (zone === 'drop' && s.stack.length) {
      P.deliverT -= dt;
      while (P.deliverT <= 0 && s.stack.length) {
        const from = Rn.stackSlot(P, s.stack.length - 1), res = s.stack.pop();
        P.stackFx.length = s.stack.length;
        fly(res, from.x, from.y, () => ({ x: C.depot.x, y: C.depot.y - 30 }), { dur: 0.36, arc: 50, onArrive(f) { earn(f.res); } });
        P.deliverT += Math.max(0.03, 0.085 - s.stack.length * 0.0012);
      }
    } else P.deliverT = 0;
    comboT -= dt; if (comboT <= 0) combo = 0;

    // pay into a build plot
    if (zone && zone.startsWith('plot:')) {
      const p = W.plot(zone.slice(5)), ps = s.plots[p.id];
      const left = p.cost - ps.paid;
      if (s.credits >= 0.01 && left > 0) {
        const amt = Math.min(Math.max(p.cost / 1.6, 40) * dt, s.credits, left);
        s.credits -= amt; ps.paid += amt;
        P.payT -= dt;
        if (P.payT <= 0) {
          P.payT = 0.06;
          A.pay();
          flyers.push({ coin: true, sx: P.x, sy: P.y - 40, getTarget: () => ({ x: p.x, y: p.y }), t: 0, dur: 0.35, arc: 60 });
        }
        if (p.cost - ps.paid < 0.01) build(p);
      }
    }

    // collect stock from a producer
    if (zone && zone.startsWith('bld:')) {
      const p = W.plot(zone.slice(4)), ps = s.plots[p.id];
      if (p.kind === 'producer' && ps.pile > 0 && free > 0) {
        P.collectT -= dt;
        if (P.collectT <= 0) { P.collectT = 0.07; ps.pile--; toStack(p.helper.res, p.x - 30, p.y + 20, 0); }
      }
    }

    // nodes
    for (const n of W.nodes) {
      n.flash = Math.max(0, n.flash - dt * 7);
      n.shake = Math.max(0, n.shake - dt * 5);
      if (!n.alive) {
        n.regrowT -= dt;
        if (n.regrowT <= 0 && Math.hypot(n.x - P.x, n.y - P.y) > n.r + 20) { n.alive = true; n.hp = n.maxHp; n.grow = 0; }
      } else n.grow = Math.min(1, n.grow + dt * 2.2);
    }

    for (const p of W.plots) if (p.kind === 'producer' && s.plots[p.id].built) updateProducer(p, s.plots[p.id], dt);
    const bay = droneBay();
    while (bay && drones.length < s.drones) spawnDrone(bay.x, bay.y);
    for (const d of drones) updateDrone(d, dt);

    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i];
      f.t += dt / f.dur;
      if (f.t >= 1) { flyers.splice(i, 1); if (f.onArrive) f.onArrive(f); }
    }

    if (s.plots.ref.built) {
      smokeT -= dt;
      if (smokeT <= 0) { smokeT = 0.35; const p = W.plot('ref'); FX.smoke(p.x + 27, p.y, 108); }
    }

    depotGlow = Math.max(0, depotGlow - dt * 3);
    FX.update(dt);

    // camera leads slightly in the walking direction, or follows the rocket
    let fx = P.x + P.vx * 0.22, fy = P.y - 30 + P.vy * 0.22;
    if (launch) { const p = W.plot('launch'); fx = p.x; fy = p.y - 80 - rocketLift() * 0.6; }
    cam.x += (fx - cam.x) * Math.min(1, dt * 5);
    cam.y += (fy - cam.y) * Math.min(1, dt * 5);

    saveT += dt;
    if (saveT > 3 && !launch) { saveT = 0; save(); }
    SF.UI.tick(dt);
  }

  // ---------- draw ----------
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = canvas.clientWidth; vh = canvas.clientHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    fog.width = canvas.width; fog.height = canvas.height;
    zoom = Math.max(0.6, Math.min(1.25, Math.min(vw, vh) / 720));
    if (vw < 600) zoom = Math.max(0.62, Math.min(0.8, vw / 560));
  }

  function worldTransform(c, sh) {
    c.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (vw / 2 - cam.x * zoom + sh.x), dpr * (vh / 2 - cam.y * zoom + sh.y));
  }

  function draw() {
    const t = time, s = SF.state, sh = FX.offset(t), th = W.planet.theme;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = th.backdrop; ctx.fillRect(0, 0, canvas.width, canvas.height);
    worldTransform(ctx, sh);
    const L = cam.x - vw / 2 / zoom - 60, T = cam.y - vh / 2 / zoom - 60, Wd = vw / zoom + 120, Ht = vh / zoom + 120;
    ctx.fillStyle = W.pattern; ctx.fillRect(L, T, Wd, Ht);

    Rn.dropZone(ctx, t, P.zone === 'drop');
    for (const p of W.plots) if (plotVisible(p) && !s.plots[p.id].built) Rn.plotMarking(ctx, p, s.plots[p.id], t, P.zone === 'plot:' + p.id);

    // y-sorted objects
    const list = [];
    for (const n of W.nodes) if (n.x > L - 80 && n.x < L + Wd + 80 && n.y > T - 40 && n.y < T + Ht + 140) list.push({ y: n.y, fn: () => Rn.node(ctx, n, t) });
    list.push({ y: C.depot.y, fn: () => Rn.lander(ctx, t, depotGlow) });
    list.push({ y: C.upgradePad.y, fn: () => Rn.upgradePad(ctx, t, P.zone === 'upgrade') });
    for (const p of W.plots) if (s.plots[p.id].built) {
      const lift = p.kind === 'launch' && launch ? rocketLift() + 0.001 : 0;
      list.push({ y: p.y, fn: () => Rn.building(ctx, p, s.plots[p.id], t, P.zone === 'bld:' + p.id, lift) });
    }
    if (!P.hidden) list.push({ y: P.y, fn: () => Rn.player(ctx, P, t) });
    list.sort((a, b) => a.y - b.y);
    for (const o of list) o.fn();

    FX.drawParticles(ctx);
    for (const d of drones) Rn.drone(ctx, d, t);

    for (const f of flyers) {
      if (f.t < 0) continue;
      const tg = f.getTarget(), e = f.t < 0.5 ? 2 * f.t * f.t : 1 - Math.pow(-2 * f.t + 2, 2) / 2;
      const x = f.sx + (tg.x - f.sx) * e, y = f.sy + (tg.y - f.sy) * e - Math.sin(f.t * Math.PI) * f.arc;
      if (f.coin) Rn.hexCoin(ctx, x, y, 6);
      else Rn.item(ctx, f.res, x, y, 1 + Math.sin(f.t * Math.PI) * 0.35);
    }

    // fog over locked land
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.globalCompositeOperation = 'source-over';
    fctx.clearRect(0, 0, fog.width, fog.height);
    fctx.fillStyle = th.fog; fctx.fillRect(0, 0, fog.width, fog.height);
    fctx.globalCompositeOperation = 'destination-out';
    worldTransform(fctx, sh);
    const mask = W.fogMask();
    fctx.imageSmoothingEnabled = true;
    fctx.drawImage(mask.canvas, mask.x, mask.y, mask.w, mask.h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fog, 0, 0);
    worldTransform(ctx, sh);
    for (const r of W.regions) if (!W.isOpen(r)) {
      Rn.item(ctx, r.res, r.x, r.y - 56, 2.2);
      Rn.label(ctx, r.name.toUpperCase(), r.x, r.y - 14, 26, 'rgba(255,244,232,0.75)');
      Rn.label(ctx, 'Locked. Build the ' + W.plot(r.unlock).name + ' to enter', r.x, r.y + 18, 14, 'rgba(255,244,232,0.6)', 600);
    }

    FX.drawPops(ctx);
    if (!launch) drawGuide(t);

    // fade to white as the rocket leaves
    if (launch && launch.t > 2.2) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(255,244,232,${Math.min(1, launch.t - 2.2)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const j = SF.Input.joy;
    if (j.active && !launch) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(255,244,232,0.12)'; ctx.strokeStyle = 'rgba(255,244,232,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(j.ox, j.oy, SF.Input.R, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,244,232,0.6)';
      const jdx = j.x - j.ox, jdy = j.y - j.oy, jl = Math.hypot(jdx, jdy), jk = jl > SF.Input.R ? SF.Input.R / jl : 1;
      ctx.beginPath(); ctx.arc(j.ox + jdx * jk, j.oy + jdy * jk, 22, 0, TAU); ctx.fill();
    }
  }

  // A small arrow near the astronaut that points at the next useful place.
  function guideTarget() {
    const s = SF.state, cap = SF.stats().cap;
    if (s.stack.length >= cap * 0.6 && s.stack.length > 0) return C.dropZone;
    for (const p of W.plots) {
      if (!plotVisible(p)) continue;
      const ps = s.plots[p.id];
      if (!ps.built && s.credits >= Math.min(p.cost - ps.paid, p.cost * 0.5)) return p;
      if (ps.built && p.kind === 'launch') return { x: p.x, y: p.y + 40 };
    }
    if (s.totalEarned > 0) for (const key in C.upgrades) if (s.lvl[key] < C.upgrades[key].max && s.credits >= SF.upgradeCost(key)) return C.upgradePad;
    return null;
  }

  function drawGuide(t) {
    const g = guideTarget();
    if (!g) return;
    const dx = g.x - P.x, dy = g.y - P.y;
    if (Math.hypot(dx, dy) < 150) return;
    const a = Math.atan2(dy, dx), r = 62 + Math.sin(t * 6) * 5;
    ctx.save(); ctx.translate(P.x + Math.cos(a) * r, P.y - 26 + Math.sin(a) * r * 0.7); ctx.rotate(a);
    ctx.fillStyle = '#ffd36b'; ctx.strokeStyle = 'rgba(28,10,40,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
  }

  // ---------- boot ----------
  let last = 0, running = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    // Keep the loop alive even if one frame throws.
    try { update(dt); draw(); } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  }

  function start(hotData) {
    SF.state = SF.Save.normalize(hotData && hotData.credits != null ? hotData : SF.Save.load());
    A.setMuted(SF.state.muted);
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    fog = document.createElement('canvas'); fctx = fog.getContext('2d');
    enterPlanet();
    resize();
    window.addEventListener('resize', resize);
    SF.Input.attach(canvas, () => SF.UI.dismissIntro());
    SF.UI.init();
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    window.addEventListener('pagehide', save);
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(serialize);
    if (!running) { running = true; requestAnimationFrame(t => { last = t; frame(t); }); }
  }

  SF.boot = function () {
    const h = window.claude && window.claude.hot;
    if (h && h.ready) h.ready(start); else start(h && h.data ? h.data : null);
  };
})();
