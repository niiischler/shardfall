// Shipping network once Halcyon is reached: warehouses and cargo rockets on the other planets,
// the big hall on Halcyon (where rockets land), and the portable material chest.
SF.Hub = (function () {
  const C = SF.CFG, H = C.hub;
  const landings = [];          // rockets touching down at the hall, for drawing only
  let loadT = 0;

  const hold = c => SF.state.hold[c] || 0;
  const chestCount = () => Object.values(SF.state.chest).reduce((a, b) => a + b, 0);
  const chestCap = () => H.chest.base + H.chest.step * SF.state.chestLvl;
  const hallCap = () => H.hall.base + H.hall.step * SF.state.hallLvl;
  const upCost = (u, lvl) => Math.round(u.cost * Math.pow(u.growth, lvl));
  const chestCost = () => upCost(H.chest, SF.state.chestLvl);
  const hallCost = () => upCost(H.hall, SF.state.hallLvl);

  // Sale value when the hall is full: Halcyon's refinery and your perks apply.
  function overflowValue(code) {
    const home = SF.state.worlds[C.home], ref = home && home.plots.ref && home.plots.ref.built;
    return SF.resValue(code) * (ref ? C.refineryMult : 1) * (1 + C.perks.sale * SF.state.stars);
  }

  // Put n items into the hall; whatever does not fit is sold. Returns the credits earned.
  function deliver(code, n) {
    const s = SF.state, room = Math.max(0, hallCap() - hold(code)), keep = Math.min(room, n), sold = n - keep;
    if (keep) s.hold[code] = hold(code) + keep;
    if (!sold) return 0;
    const v = sold * overflowValue(code);
    s.credits += v; s.totalEarned += v; s.lifetime += v;
    return v;
  }

  function deliverAll(items) {
    let credits = 0, n = 0;
    for (const c in items) { credits += deliver(+c, items[c]); n += items[c]; }
    return { credits, n };
  }

  // ---------- planet side: warehouse buffer and cargo rocket ----------
  function rk(ws) {
    if (!ws.rk) ws.rk = { load: {}, n: 0, away: 0 };
    return ws.rk;
  }

  function toWarehouse(code) {
    const ws = SF.ws();
    ws.wh = ws.wh || {};
    ws.wh[code] = (ws.wh[code] || 0) + 1;
  }
  const whCount = ws => Object.values(ws.wh || {}).reduce((a, b) => a + b, 0);

  function launchCargo() {
    const ws = SF.ws(), r = rk(ws);
    if (!r.n || r.away > 0) return false;
    SF.state.inbound.push({ t: H.flight, items: r.load, from: SF.state.planet });
    ws.rk = { load: {}, n: 0, away: H.away };
    SF.Audio.rocket(0.8); SF.FX.shake(0.3);
    SF.FX.pop(H.pad.x, H.pad.y - 170, 'Cargo rocket launched to Halcyon', '#ffd36b', 18, { life: 1.6 });
    SF.save(); SF.UI.refresh();
    return true;
  }

  // ---------- portable chest (other planets) ----------
  function storeChest(code, x, y) {
    if (chestCount() >= chestCap()) return false;
    const c = SF.World.chest;
    SF.state.chest[code] = (SF.state.chest[code] || 0) + 1;
    SF.fly(code, x, y, () => ({ x: c.x, y: c.y - 40 }), { dur: 0.36, arc: 50, onArrive() { SF.Audio.store(chestCount()); } });
    return true;
  }

  // On arrival at Halcyon the chest is emptied into the hall.
  function unpackChest() {
    const r = deliverAll(SF.state.chest);
    SF.state.chest = {};
    return r;
  }

  // ---------- hall (Halcyon) ----------
  function storeHall(code, x, y) {
    const h = SF.World.hall;
    SF.fly(code, x, y, () => ({ x: h.x, y: h.y - 50 }), {
      dur: 0.36, arc: 50,
      onArrive(f) {
        const v = deliver(f.code, 1);
        SF.Audio.store(hold(f.code));
        if (v) { SF.earnFx(v, h.x, h.y - 90); }
        else SF.FX.pop(h.x + (Math.random() - 0.5) * 40, h.y - 110, '+1 ' + SF.res(f.code).name, SF.res(f.code).color, 14, { life: 0.8 });
      },
    });
  }

  function upgradeChest() {
    if (SF.state.chestLvl >= H.chest.max || !SF.spend(chestCost())) return false;
    SF.state.chestLvl++;
    const c = SF.World.chest;
    if (c) { SF.FX.burst(c.x, c.y - 30, ['#ffd36b', '#fff4e8'], 24, { z: 20, speed: 200, size: 4 }); SF.FX.pop(c.x, c.y - 90, 'Chest holds ' + chestCap(), '#ffd36b', 18); }
    SF.save(); SF.UI.refresh();
    return true;
  }

  function upgradeHall() {
    if (SF.state.hallLvl >= H.hall.max || !SF.spend(hallCost())) return false;
    SF.state.hallLvl++;
    const h = SF.World.hall;
    if (h) { SF.FX.burst(h.x, h.y - 40, ['#ffd36b', '#fff4e8'], 30, { z: 30, speed: 240, size: 4 }); SF.FX.pop(h.x, h.y - 140, 'Hall holds ' + hallCap() + ' of each', '#ffd36b', 18); }
    SF.save(); SF.UI.refresh();
    return true;
  }

  // Landing pads behind the hall.
  const pads = () => { const h = SF.World.hall; return [-110, 0, 110].map((dx, i) => ({ x: h.x + dx, y: h.y - 120 - (i === 1 ? 20 : 0) })); };

  // ---------- update ----------
  function update(dt) {
    const s = SF.state;
    // Rockets in flight arrive at Halcyon wherever you are.
    for (let i = s.inbound.length - 1; i >= 0; i--) {
      const f = s.inbound[i];
      f.t -= dt;
      if (s.planet === C.home && f.t <= 2.4 && !f.shown) {
        f.shown = true;
        landings.push({ t: 0, pad: landings.length % 3, items: f.items });
        SF.Audio.land(0.7);
      }
      if (f.t <= 0) {
        s.inbound.splice(i, 1);
        const r = deliverAll(f.items);
        if (s.planet === C.home) {
          const h = SF.World.hall;
          SF.FX.pop(h.x, h.y - 160, `+${r.n} items from ${SF.planetName(f.from)}`, '#fff4e8', 18, { life: 1.8 });
          if (r.credits) SF.earnFx(r.credits, h.x, h.y - 130);
        }
      }
    }
    for (let i = landings.length - 1; i >= 0; i--) { landings[i].t += dt; if (landings[i].t > 5) landings.splice(i, 1); }
    // Every planet's rocket comes back on its own, even while you are elsewhere.
    for (const k in s.worlds) { const w = s.worlds[k]; if (w.rk && w.rk.away > 0) w.rk.away = Math.max(0, w.rk.away - dt); }

    if (!SF.hubActive()) return;
    // Load the warehouse stock into the rocket, then fly when full.
    const ws = SF.ws(), r = rk(ws);
    loadT -= dt;
    if (r.away <= 0 && r.n < H.rocketCap && whCount(ws) > 0 && loadT <= 0) {
      loadT = 0.1;
      const code = +Object.keys(ws.wh).find(c => ws.wh[c] > 0);
      ws.wh[code]--; if (!ws.wh[code]) delete ws.wh[code];
      r.load[code] = (r.load[code] || 0) + 1; r.n++;
      SF.fly(code, C.depot.x + 40, C.depot.y - 30, () => ({ x: H.pad.x, y: H.pad.y - 60 }), { dur: 0.4, arc: 40 });
    }
    if (r.n >= H.rocketCap && r.away <= 0) launchCargo();
  }

  // Height of the cargo rocket above its pad: lifting off, away, coming back.
  function cargoLift() {
    const r = rk(SF.ws());
    if (r.away <= 0) return 0;
    const gone = H.away - r.away;
    if (gone < 2.5) return Math.pow(gone, 2) * 120;
    if (r.away < 2.5) return Math.pow(r.away, 2) * 120;
    return null;               // out of sight
  }

  function enter() { landings.length = 0; }

  return {
    landings, pads, hold, chestCount, chestCap, hallCap, chestCost, hallCost, deliver, deliverAll, overflowValue,
    rk, toWarehouse, whCount, launchCargo, storeChest, unpackChest, storeHall, upgradeChest, upgradeHall, update, cargoLift, enter,
  };
})();
