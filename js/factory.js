// New Haven's free build area, Factorio style: a round grid where you place buildings, belts and machines
// yourself. Belts carry items cell by cell; a Hall output puts a material from the hall onto a belt, a Fabricator
// turns its recipe's inputs into its outputs, and a Hall input takes whatever arrives back into the hall.
// Build mode (the hammer button on Halcyon) places things with the mouse or a finger; see pointer() below.
SF.Fab = (function () {
  const C = SF.CFG, F = C.fab, G = F.G, K = F.kinds;
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  const TAU = Math.PI * 2;
  const key = (c, r) => c + ',' + r;
  const opp = d => (d + 2) & 3;

  let center = null;
  let belts = new Map();   // "c,r" -> { c, r, d, from, items: [{ code, p }] }, front item first
  let occ = new Map();     // "c,r" -> { t: 'belt' } | { t: 'm', m } | { t: 'lot', id } | { t: 'fixed' }
  let clock = 0;

  const st = () => SF.state.fab;
  const homeWs = () => SF.state.worlds[C.home];
  function origin() {
    if (!center) { const reg = SF.layoutPlanet(SF.PLANETS[C.home]).regions.find(r => r.settlement); center = { x: reg.x, y: reg.y }; }
    return center;
  }
  const cx = c => origin().x + c * G, cy = r => origin().y + r * G;          // top-left corner of a cell
  const toCell = (x, y) => [Math.floor((x - origin().x) / G), Math.floor((y - origin().y) / G)];
  const inArea = (c, r) => Math.hypot((c + 0.5) * G, (r + 0.5) * G) <= F.r;
  const unlocked = () => !!(SF.state.homeReached && homeWs() && homeWs().plots.g4 && homeWs().plots.g4.built);
  const beltsOk = () => SF.homeHas('factory');
  const size = k => (K[k] ? K[k] : F.bld);
  const recipe = m => SF.RECIPES.find(q => q.id === m.rec) || null;

  // ---------- New Haven's buildings ----------
  // Each one stands on the grid cell its plot state remembers (st.at), like any other plot otherwise.
  function lotPlot(id, ps) {
    const [c, r] = ps.at, B = F.bld;
    return { id, kind: ps.kind, lot: true, requires: 'g4', x: Math.round(cx(c) + B.w * G / 2), y: Math.round(cy(r) + B.h * G - 20) };
  }
  function lotPlots() {
    const ws = homeWs(), out = [];
    if (ws) for (const id in ws.plots) if (ws.plots[id].at && ws.plots[id].kind) out.push(lotPlot(id, ws.plots[id]));
    return out;
  }
  // After a building was placed, moved or removed: refresh the plots of the world you stand in.
  function syncLots() {
    if (SF.state.planet === C.home) {
      SF.World.plots = SF.applyLots(SF.World.plots.filter(p => !p.lot).concat(lotPlots()), SF.ws());
    }
    rebuild();
  }

  // ---------- grid occupancy and belt shapes ----------
  function cellsOf(c, r, w, h) { const out = []; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push([c + i, r + j]); return out; }
  function rebuild() {
    const s = st(), old = belts;
    belts = new Map(); occ = new Map();
    // Fixed plots that stand in the area (the Haven Bridge, for one) keep their ground.
    for (const p of SF.layoutPlanet(SF.PLANETS[C.home]).plots) {
      const [c, r] = toCell(p.x, p.y);
      for (const [i, j] of cellsOf(c - 2, r - 2, 5, 3)) if (inArea(i, j)) occ.set(key(i, j), { t: 'fixed' });
    }
    const ws = homeWs();
    if (ws) for (const id in ws.plots) {
      const ps = ws.plots[id];
      if (!ps.at || !ps.kind) continue;
      for (const [i, j] of cellsOf(ps.at[0], ps.at[1], F.bld.w, F.bld.h)) occ.set(key(i, j), { t: 'lot', id });
    }
    for (const m of s.m) { const z = size(m.k); for (const [i, j] of cellsOf(m.c, m.r, z.w, z.h)) occ.set(key(i, j), { t: 'm', m }); }
    for (const k in s.belts) {
      const [c, r] = k.split(',').map(Number), o = old.get(k);
      belts.set(k, { c, r, d: s.belts[k], from: opp(s.belts[k]), items: o ? o.items : [] });
      occ.set(k, { t: 'belt' });
    }
    for (const [k, o] of old) if (!belts.has(k)) for (const it of o.items) SF.Hub.deliver(it.code, 1);
    // A belt fed only from one side bends: items come in from that side.
    for (const b of belts.values()) {
      if (feeds(b, opp(b.d)) || !feeds(b, (b.d + 1) & 3) === !feeds(b, (b.d + 3) & 3)) continue;
      b.from = feeds(b, (b.d + 1) & 3) ? (b.d + 1) & 3 : (b.d + 3) & 3;
    }
  }
  // Does something on side `s` of belt b push into it?
  function feeds(b, s) {
    const c = b.c + DX[s], r = b.r + DY[s], n = belts.get(key(c, r));
    if (n) return n.d === opp(s);
    const o = occ.get(key(c, r));
    if (o && o.t === 'm') { const [oc, or] = outCell(o.m); return oc === b.c && or === b.r; }
    return false;
  }

  // ---------- belts ----------
  function room(b, at) { return b.items.every(it => Math.abs(it.p - at) >= F.gap - 1e-6); }
  function insert(b, it) {
    let i = 0;
    while (i < b.items.length && b.items[i].p > it.p) i++;
    b.items.splice(i, 0, it);
  }
  // Hand an item from the end of belt b to whatever its arrow points at.
  function handoff(b, code, over) {
    const c = b.c + DX[b.d], r = b.r + DY[b.d], t = belts.get(key(c, r));
    if (t) {
      if (t.d === opp(b.d)) return false;
      const at = t.d === b.d ? 0 : 0.5;
      if (!room(t, at)) return false;
      insert(t, { code, p: at + (at ? 0 : Math.min(over, 0.2)) });
      return true;
    }
    const o = occ.get(key(c, r));
    return !!(o && o.t === 'm' && accept(o.m, code));
  }
  function moveBelt(b, v) {
    const it = b.items;
    if (it.length && it[0].p + v >= 1 && handoff(b, it[0].code, it[0].p + v - 1)) it.shift();
    for (let i = 0; i < it.length; i++) {
      const np = Math.min(it[i].p + v, i ? it[i - 1].p - F.gap : 1);
      if (np > it[i].p) it[i].p = np;
    }
  }
  // Where an item at progress p sits on belt b (world coordinates).
  function onBelt(b, p) {
    const x = cx(b.c) + G / 2, y = cy(b.r) + G / 2;
    if (p < 0.5) { const k = (0.5 - p) * G; return { x: x + DX[b.from] * k, y: y + DY[b.from] * k }; }
    const k = (p - 0.5) * G;
    return { x: x + DX[b.d] * k, y: y + DY[b.d] * k };
  }

  // ---------- machines ----------
  function outCell(m) {
    const z = size(m.k), mx = Math.floor(z.w / 2), my = Math.floor(z.h / 2);
    return [[m.c + z.w, m.r + my], [m.c + mx, m.r + z.h], [m.c - 1, m.r + my], [m.c + mx, m.r - 1]][m.rot];
  }
  function stamp(m) { (m.hist || (m.hist = [])).push(clock); while (m.hist.length && m.hist[0] < clock - 60) m.hist.shift(); }
  const perMin = m => (m.hist || []).filter(x => x >= clock - 60).length;
  function accept(m, code) {
    if (m.k === 'sink') { SF.Hub.deliver(code, 1); stamp(m); return true; }
    if (m.k !== 'fab') return false;
    const r = recipe(m);
    if (!r || !r.in[code] || (m.in[code] || 0) >= r.in[code] * 2) return false;
    m.in[code] = (m.in[code] || 0) + 1;
    return true;
  }
  function push(m, code) {
    const [c, r] = outCell(m), b = belts.get(key(c, r));
    if (b) {
      if (b.d === opp(m.rot)) return false;
      const at = b.d === m.rot ? 0 : 0.5;
      if (!room(b, at)) return false;
      insert(b, { code, p: at });
      return true;
    }
    const o = occ.get(key(c, r));
    return !!(o && o.t === 'm' && o.m !== m && accept(o.m, code));
  }
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  function tickMachine(m, dt) {
    if (m.k === 'feed') {
      m.t = (m.t || 0) + dt;
      const h = SF.state.hold;
      if (m.t >= K.feed.every && m.sel != null && (h[m.sel] || 0) > 0) {
        if (push(m, m.sel)) { h[m.sel]--; if (!h[m.sel]) delete h[m.sel]; m.t = 0; stamp(m); }
        else m.t = K.feed.every;
      }
      return;
    }
    if (m.k !== 'fab') return;
    for (const c in m.out) if (m.out[c] > 0 && push(m, +c)) { m.out[c]--; if (!m.out[c]) delete m.out[c]; break; }
    const r = recipe(m);
    if (!r) return;
    if (!m.busy && sum(m.out) < sum(r.out) * 2 && Object.keys(r.in).every(c => (m.in[c] || 0) >= r.in[c])) {
      for (const c in r.in) { m.in[c] -= r.in[c]; if (!m.in[c]) delete m.in[c]; }
      m.busy = true; m.t = 0;
    }
    if (m.busy) {
      m.t += dt;
      if (m.t >= r.time) { m.busy = false; for (const c in r.out) m.out[c] = (m.out[c] || 0) + r.out[c]; stamp(m); }
    }
  }
  // What a machine is doing, in a few words.
  function status(m) {
    if (m.k === 'sink') return perMin(m) ? `${perMin(m)} items / min into the hall` : 'Waiting for a belt to bring something';
    if (m.k === 'feed') {
      if (m.sel == null) return 'Choose a material';
      if (!(SF.state.hold[m.sel] > 0)) return `The hall has no ${SF.res(m.sel).plural.toLowerCase()}`;
      return perMin(m) ? `${perMin(m)} / min onto the belt` : 'Waiting: no free belt at its arrow';
    }
    const r = recipe(m);
    if (!r) return 'Choose a recipe';
    if (m.busy) return `Working · ${perMin(m)} / min`;
    if (sum(m.out) >= sum(r.out) * 2) return 'Output blocked: put a belt at its arrow';
    const miss = Object.keys(r.in).filter(c => (m.in[c] || 0) < r.in[c]).map(c => SF.res(+c).plural.toLowerCase());
    return 'Waiting for ' + miss.join(' and ');
  }
  function setRecipe(m, id) {
    if (m.rec === id) return false;
    for (const c in m.in) SF.Hub.deliver(+c, m.in[c]);
    m.in = {}; m.busy = false; m.t = 0; m.rec = id;
    SF.Audio.buy(); SF.save(); SF.UI.refresh();
    return true;
  }
  function setSel(m, code) { m.sel = m.sel === code ? null : code; m.t = 0; SF.Audio.buy(); SF.save(); SF.UI.refresh(); return true; }
  const byId = id => st().m.find(m => m.id === +id);

  function update(dt) {
    clock += dt;
    if (!unlocked() || !SF.state.fab) return;
    const v = F.speed * dt;
    for (const b of belts.values()) moveBelt(b, v);
    for (const m of st().m) tickMachine(m, dt);
    if (mode.on) moveCam(dt);
  }

  // ---------- placing, paying, removing ----------
  const priceOf = kind => (kind === 'belt' ? { cost: 0, needs: F.belt } : K[kind] ? { cost: K[kind].cost, needs: K[kind].needs } : SF.Home.quote(kind));
  function afford(q) {
    if (SF.state.credits < q.cost) return 'Not enough credits';
    const miss = Object.keys(q.needs).filter(c => SF.Home.available(+c) < q.needs[c]);
    return miss.length ? 'The hall needs ' + miss.map(c => `${q.needs[c]} ${SF.res(+c).plural.toLowerCase()}`).join(' and ') : null;
  }
  function pay(q) { SF.state.credits -= q.cost; for (const c in q.needs) SF.Home.spendMaterial(+c, q.needs[c]); }
  function refund(q) { SF.state.credits += q.cost; for (const c in q.needs) SF.state.hold[c] = (SF.state.hold[c] || 0) + q.needs[c]; }
  // Why something of size w x h cannot stand at (c, r), or null. `self` is what is being moved.
  function blocked(c, r, w, h, self) {
    for (const [i, j] of cellsOf(c, r, w, h)) {
      if (!inArea(i, j)) return 'Outside the build area';
      const o = occ.get(key(i, j));
      if (o && !(self && ((o.t === 'm' && o.m === self) || (o.t === 'lot' && o.id === self)))) return 'Something is in the way';
    }
    return null;
  }

  function placeBelt(c, r, d) {
    const k = key(c, r);
    if (belts.has(k)) { if (st().belts[k] !== d) { st().belts[k] = d; rebuild(); } return true; }
    if (!beltsOk()) return fail('Belts need the Belt Factory');
    const why = blocked(c, r, 1, 1) || afford(priceOf('belt'));
    if (why) return fail(why);
    pay(priceOf('belt'));
    st().belts[k] = d; rebuild();
    SF.Audio.pick(1, 0.5);
    return true;
  }
  function placeMachine(kind, c, r, rot) {
    if (!beltsOk()) return fail('Machines need the Belt Factory');
    const z = size(kind), why = blocked(c, r, z.w, z.h) || afford(priceOf(kind));
    if (why) return fail(why);
    pay(priceOf(kind));
    const s = st();
    s.m.push({ id: ++s.n, k: kind, c, r, rot, rec: null, sel: null, in: {}, out: {}, t: 0 });
    rebuild(); built(cx(c) + z.w * G / 2, cy(r) + z.h * G / 2, K[kind].name);
    return true;
  }
  function placeBuilding(kind, c, r) {
    if (!SF.Home.canChoose(kind)) return fail('Only one per base');
    const why = blocked(c, r, F.bld.w, F.bld.h);
    if (why) return fail(why);
    const ws = homeWs(), q = SF.Home.quote(kind);
    let n = 1;
    while (ws.plots['L' + n]) n++;
    ws.plots['L' + n] = { paid: 0, built: false, lvl: 0, pile: 0, res: {}, kind, cost: q.cost, needs: q.needs, at: [c, r] };
    syncLots();
    built(cx(c) + F.bld.w * G / 2, cy(r) + F.bld.h * G / 2, SF.BUILDS[kind].name + ' planned: walk there to pay for it');
    return true;
  }
  function built(x, y, text) {
    SF.Audio.build(); SF.FX.burst(x, y, ['#ffd36b', '#fff4e8'], 18, { z: 10, speed: 200, size: 4 });
    SF.FX.pop(x, y - 60, text, '#fff4e8', 16, { life: 1.4 });
    SF.save(); SF.UI.refresh();
  }
  function fail(why) { mode.msg = why; mode.msgT = 2.5; SF.Audio.nope(); SF.UI.buildBar(); return false; }

  function removeAt(c, r) {
    const k = key(c, r), o = occ.get(k);
    if (!o || o.t === 'fixed') return false;
    if (o.t === 'belt') { delete st().belts[k]; refund(priceOf('belt')); rebuild(); SF.Audio.store(2); return true; }
    if (o.t === 'm') {
      const m = o.m;
      for (const c2 in m.in) SF.Hub.deliver(+c2, m.in[c2]);
      for (const c2 in m.out) SF.Hub.deliver(+c2, m.out[c2]);
      st().m.splice(st().m.indexOf(m), 1);
      refund(priceOf(m.k)); rebuild(); SF.Audio.store(4); SF.save(); SF.UI.refresh();
      return true;
    }
    const ps = homeWs().plots[o.id];
    if (ps.built) return fail('Buildings can be moved, not torn down');
    return SF.Home.cancelLot(o.id);
  }
  // Move a machine or a building to (c, r); belts are simply laid again.
  function moveTo(sel, c, r) {
    if (sel.t === 'm') {
      const z = size(sel.m.k), why = blocked(c, r, z.w, z.h, sel.m);
      if (why) return fail(why);
      sel.m.c = c; sel.m.r = r; rebuild();
    } else {
      const why = blocked(c, r, F.bld.w, F.bld.h, sel.id);
      if (why) return fail(why);
      homeWs().plots[sel.id].at = [c, r]; syncLots();
    }
    SF.Audio.build(); SF.save();
    return true;
  }

  // ---------- build mode ----------
  // tool: null (look around, tap a machine to set it up), 'belt', 'fab', 'feed', 'sink', 'b:<building>', 'move', 'remove'
  const mode = { on: false, tool: null, rot: 0, hover: null, cam: { x: 0, y: 0 }, msg: '', msgT: 0, sel: null };
  const pts = new Map();
  let drag = null;

  function enter() {
    if (!unlocked() || SF.state.planet !== C.home) return;
    mode.on = true; mode.tool = null; mode.sel = null; mode.msg = '';
    const P = SF.player, o = origin();
    mode.cam = Math.hypot(P.x - o.x, P.y - o.y) < F.r + 200 ? { x: P.x, y: P.y } : { x: o.x, y: o.y };
    SF.UI.closePanel && SF.UI.closePanel();
    SF.UI.buildBar();
  }
  function exit() { mode.on = false; mode.hover = null; drag = null; pts.clear(); SF.UI.buildBar(); SF.save(); }
  function setTool(t) { mode.tool = mode.tool === t ? null : t; mode.sel = null; mode.msg = ''; SF.UI.buildBar(); }
  function rotate() { mode.rot = (mode.rot + 1) & 3; SF.Audio.pick(0, 0.4); SF.UI.buildBar(); }
  function moveCam(dt) {
    const v = SF.Input.vector(), o = origin();
    mode.cam.x += v.x * 700 * dt; mode.cam.y += v.y * 700 * dt;
    const dx = mode.cam.x - o.x, dy = mode.cam.y - o.y, l = Math.hypot(dx, dy), lim = F.r + 300;
    if (l > lim) { mode.cam.x = o.x + dx / l * lim; mode.cam.y = o.y + dy / l * lim; }
    if (mode.msgT > 0 && (mode.msgT -= dt) <= 0) { mode.msg = ''; SF.UI.buildBar(); }
  }

  // Size and top-left cell of what the current tool would place with its centre under (wx, wy).
  function ghostAt(wx, wy) {
    const t = mode.tool;
    let w = 1, h = 1;
    if (t && K[t]) ({ w, h } = K[t]);
    else if (t && t.startsWith('b:')) ({ w, h } = F.bld);
    else if (t === 'move' && mode.sel) ({ w, h } = mode.sel.t === 'm' ? size(mode.sel.m.k) : F.bld);
    const [c, r] = toCell(wx - (w - 1) * G / 2, wy - (h - 1) * G / 2);
    return { c, r, w, h };
  }

  function act(g, wx, wy) {
    const t = mode.tool, [c0, r0] = toCell(wx, wy);
    if (!t) { const o = occ.get(key(c0, r0)); if (o && o.t === 'm') SF.UI.openFab(o.m.id); return; }
    if (t === 'remove') { removeAt(c0, r0); return; }
    if (t === 'belt') { placeBelt(c0, r0, mode.rot); return; }
    if (K[t]) { placeMachine(t, g.c, g.r, mode.rot); return; }
    if (t.startsWith('b:')) { placeBuilding(t.slice(2), g.c, g.r); return; }
    if (t === 'move') {
      if (!mode.sel) {
        const o = occ.get(key(c0, r0));
        if (o && (o.t === 'm' || o.t === 'lot')) { mode.sel = o; mode.msg = 'Now tap where it should stand'; SF.Audio.pick(2, 0.5); SF.UI.buildBar(); }
        return;
      }
      if (moveTo(mode.sel, g.c, g.r)) { mode.sel = null; mode.msg = ''; SF.UI.buildBar(); }
    }
  }

  // Pointer events while build mode is on. Returns true when build mode used the event.
  function pointer(type, e) {
    if (!mode.on) return false;
    const w = SF.toWorld(e.clientX, e.clientY);
    if (type === 'down') {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { drag = { pan: true, two: true }; return true; }
      mode.hover = ghostAt(w.x, w.y);
      const [c, r] = toCell(w.x, w.y);
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, last: [c, r], first: true, cam: { x: mode.cam.x, y: mode.cam.y } };
      if (mode.tool === 'belt') { placeBelt(c, r, mode.rot); drag.laid = true; }
      return true;
    }
    if (type === 'move') {
      const prev = pts.get(e.pointerId);
      if (prev) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      mode.hover = ghostAt(w.x, w.y);
      if (!drag) return true;
      if (drag.two) {
        if (prev) { const z = SF.viewZoom(); mode.cam.x -= (e.clientX - prev.x) / z / 2; mode.cam.y -= (e.clientY - prev.y) / z / 2; }
        return true;
      }
      if (e.pointerId !== drag.id) return true;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.moved = true;
      const [c, r] = toCell(w.x, w.y);
      if (mode.tool === 'belt') {
        // Lay belt cell by cell toward the pointer; each step also turns the previous belt toward the new one.
        let [lc, lr] = drag.last, ok = true;
        while (ok && (lc !== c || lr !== r)) {
          const d = lc !== c ? (c > lc ? 0 : 2) : (r > lr ? 1 : 3);
          if (belts.has(key(lc, lr))) placeBelt(lc, lr, d);
          mode.rot = d;
          ok = placeBelt(lc + DX[d], lr + DY[d], d);
          if (ok) { lc += DX[d]; lr += DY[d]; }
        }
        drag.last = ok ? [lc, lr] : [c, r];
      } else if (mode.tool === 'remove') {
        if (drag.last[0] !== c || drag.last[1] !== r) { removeAt(c, r); drag.last = [c, r]; }
      } else if (!mode.tool && drag.moved) {
        const z = SF.viewZoom();
        mode.cam.x = drag.cam.x - (e.clientX - drag.sx) / z; mode.cam.y = drag.cam.y - (e.clientY - drag.sy) / z;
      }
      return true;
    }
    if (type === 'up') {
      pts.delete(e.pointerId);
      if (e.pointerType && e.pointerType !== 'mouse') mode.hover = null;   // no finger, no ghost
      if (drag && drag.two) { if (!pts.size) drag = null; return true; }
      if (drag && e.pointerId === drag.id) {
        if (!drag.moved && mode.tool !== 'belt') act(ghostAt(w.x, w.y), w.x, w.y);
        else if (drag.moved && mode.tool && mode.tool !== 'belt' && mode.tool !== 'remove') act(ghostAt(w.x, w.y), w.x, w.y);
        if (mode.tool === 'remove' && !drag.moved) { /* the tap above already removed it */ }
        drag = null;
        SF.save(); SF.UI.refresh();
      }
      return true;
    }
    return true;
  }
  function key2(e) {
    if (!mode.on) return false;
    if (e.code === 'KeyR') { rotate(); return true; }
    if (e.code === 'Escape' || e.code === 'KeyB') { if (mode.tool) setTool(null); else exit(); return true; }
    return false;
  }

  // ---------- drawing ----------
  const BW = 24;
  function drawGround(ctx, t, view) {
    if (SF.state.planet !== C.home || !unlocked()) return;
    const o = origin();
    if (mode.on) {
      ctx.save();
      ctx.beginPath(); ctx.arc(o.x, o.y, F.r, 0, TAU); ctx.fillStyle = 'rgba(20,30,40,0.18)'; ctx.fill();
      ctx.setLineDash([12, 10]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,211,107,0.7)'; ctx.stroke(); ctx.setLineDash([]);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,244,232,0.12)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = o.x - Math.ceil(F.r / G) * G; x <= o.x + F.r; x += G) { ctx.moveTo(x, o.y - F.r); ctx.lineTo(x, o.y + F.r); }
      for (let y = o.y - Math.ceil(F.r / G) * G; y <= o.y + F.r; y += G) { ctx.moveTo(o.x - F.r, y); ctx.lineTo(o.x + F.r, y); }
      ctx.stroke();
      ctx.restore();
    }
    // concrete pads under the machines
    for (const m of st().m) {
      const z = size(m.k);
      if (!view(cx(m.c) + z.w * G / 2, cy(m.r) + z.h * G / 2, 160)) continue;
      ctx.fillStyle = 'rgba(60,66,78,0.35)'; SF.Render.roundRect(ctx, cx(m.c) + 2, cy(m.r) + 2, z.w * G - 4, z.h * G - 4, 8); ctx.fill();
      const [oc, or] = outCell(m), ax = cx(oc) + G / 2 - DX[m.rot] * G * 0.5, ay = cy(or) + G / 2 - DY[m.rot] * G * 0.5;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(m.rot * Math.PI / 2);
      ctx.fillStyle = '#ffd36b'; ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(8, 0); ctx.lineTo(-4, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    for (const b of belts.values()) if (view(cx(b.c) + G / 2, cy(b.r) + G / 2, 60)) drawBelt(ctx, b, t);
    for (const b of belts.values()) for (const it of b.items) {
      const q = onBelt(b, it.p);
      if (view(q.x, q.y, 30)) SF.Render.item(ctx, it.code, q.x, q.y - 4, 0.95);
    }
  }
  function half(ctx, x, y, s, w) {
    // a strip from the cell centre to side s, `w` wide
    const l = G / 2 + 0.5;
    if (DX[s]) ctx.fillRect(DX[s] > 0 ? x : x - l, y - w / 2, l, w);
    else ctx.fillRect(x - w / 2, DY[s] > 0 ? y : y - l, w, l);
  }
  function drawBelt(ctx, b, t) {
    const x = cx(b.c) + G / 2, y = cy(b.r) + G / 2;
    ctx.fillStyle = 'rgba(28,10,38,0.25)'; half(ctx, x, y + 5, b.from, BW + 6); half(ctx, x, y + 5, b.d, BW + 6);
    ctx.fillStyle = '#596170'; half(ctx, x, y, b.from, BW + 6); half(ctx, x, y, b.d, BW + 6); ctx.fillRect(x - BW / 2 - 3, y - BW / 2 - 3, BW + 6, BW + 6);
    ctx.fillStyle = '#2b2d33'; half(ctx, x, y, b.from, BW); half(ctx, x, y, b.d, BW); ctx.fillRect(x - BW / 2, y - BW / 2, BW, BW);
    // moving chevrons
    ctx.strokeStyle = 'rgba(255,211,107,0.45)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const p = ((t * F.speed) + k * 0.5) % 1, q = onBelt(b, p), d = p < 0.5 ? opp(b.from) : b.d, ux = DX[d], uy = DY[d];
      ctx.beginPath();
      ctx.moveTo(q.x - ux * 4 - uy * 6, q.y - uy * 4 + ux * 6); ctx.lineTo(q.x + ux * 3, q.y + uy * 3); ctx.lineTo(q.x - ux * 4 + uy * 6, q.y - uy * 4 - ux * 6);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // A machine: a block on the ground with its own top. Drawn in the y-sorted pass.
  function block(ctx, x0, y0, w, h, H, top, front, edge) {
    ctx.fillStyle = 'rgba(28,10,38,0.3)'; ctx.fillRect(x0 + 6, y0 + 8, w - 6, h - 6);
    ctx.lineWidth = 2; ctx.strokeStyle = edge;
    ctx.fillStyle = front; SF.Render.roundRect(ctx, x0 + 4, y0 + h - 4 - H, w - 8, H, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = top; SF.Render.roundRect(ctx, x0 + 4, y0 + 4 - H * 0.6, w - 8, h - 8 - H * 0.4, 8); ctx.fill(); ctx.stroke();
  }
  function drawMachine(ctx, m, t, near) {
    const z = size(m.k), x0 = cx(m.c), y0 = cy(m.r), w = z.w * G, h = z.h * G, mx = x0 + w / 2;
    if (m.k === 'fab') {
      block(ctx, x0, y0, w, h, 40, '#b8c0cc', '#7d8696', '#2a2f38');
      // gear window on top, turning while it works
      const gx = mx, gy = y0 + h / 2 - 30, a = m.busy ? t * 3 : 0;
      ctx.fillStyle = '#2b2d33'; ctx.beginPath(); ctx.arc(gx, gy, 22, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(a); ctx.fillStyle = '#ffd36b';
      for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.fillRect(-3, -17, 6, 6); }
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); ctx.fillStyle = '#2b2d33'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      ctx.restore();
      const r = recipe(m);
      if (r) SF.Render.item(ctx, +Object.keys(r.out)[0], mx, y0 + h - 26, 1.4);
      ctx.fillStyle = m.busy ? '#9be36a' : r ? '#ffb340' : '#ff6b6b'; ctx.beginPath(); ctx.arc(x0 + w - 20, y0 + h - 22, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2a2f38'; ctx.lineWidth = 1.5; ctx.stroke();
    } else if (m.k === 'feed') {
      block(ctx, x0, y0, w, h, 30, '#7fa6cf', '#4d6f96', '#1c2a3d');
      // the tube that brings stock over from the hall
      ctx.fillStyle = '#9aa3ad'; ctx.fillRect(mx - 6, y0 - 46, 12, 40); ctx.strokeStyle = '#2a2f38'; ctx.lineWidth = 2; ctx.strokeRect(mx - 6, y0 - 46, 12, 40);
      ctx.fillStyle = '#596170'; ctx.fillRect(mx - 9, y0 - 50, 18, 6);
      if (m.sel != null) SF.Render.item(ctx, m.sel, mx, y0 + h / 2 - 14, 1.3);
    } else {
      block(ctx, x0, y0, w, h, 22, '#8fbf7a', '#5f8a4c', '#1f3318');
      ctx.fillStyle = '#1f2a1a'; SF.Render.roundRect(ctx, x0 + 18, y0 + 6, w - 36, h - 34, 6); ctx.fill();
      ctx.fillStyle = '#9aa3ad'; ctx.fillRect(mx - 6, y0 - 40, 12, 40); ctx.strokeStyle = '#2a2f38'; ctx.lineWidth = 2; ctx.strokeRect(mx - 6, y0 - 40, 12, 40);
      ctx.fillStyle = '#596170'; ctx.fillRect(mx - 9, y0 - 44, 18, 6);
    }
    if (mode.on || near) {
      SF.Render.label(ctx, K[m.k].name.toUpperCase(), mx, y0 + h + 14, 12, '#fff4e8');
      SF.Render.label(ctx, status(m), mx, y0 + h + 30, 11, 'rgba(255,244,232,0.8)', 220);
    }
  }
  function drawList(list, ctx, t, near) {
    if (SF.state.planet !== C.home || !unlocked()) return;
    for (const m of st().m) list.push({ y: cy(m.r) + size(m.k).h * G, fn: () => drawMachine(ctx, m, t, near === m.id) });
  }
  function drawOverlay(ctx, t) {
    if (!mode.on || !mode.hover) return;
    const g = mode.hover, tool = mode.tool;
    if (!tool) return;
    let bad = null;
    if (tool === 'belt') bad = belts.has(key(g.c, g.r)) ? null : blocked(g.c, g.r, 1, 1);
    else if (tool === 'remove') bad = null;
    else if (tool === 'move') bad = mode.sel ? blocked(g.c, g.r, g.w, g.h, mode.sel.t === 'm' ? mode.sel.m : mode.sel.id) : null;
    else bad = blocked(g.c, g.r, g.w, g.h);
    const x0 = cx(g.c), y0 = cy(g.r);
    ctx.fillStyle = tool === 'remove' ? 'rgba(255,107,107,0.35)' : bad ? 'rgba(255,107,107,0.35)' : 'rgba(155,227,106,0.35)';
    ctx.strokeStyle = tool === 'remove' || bad ? '#ff6b6b' : '#9be36a'; ctx.lineWidth = 2;
    ctx.fillRect(x0, y0, g.w * G, g.h * G); ctx.strokeRect(x0, y0, g.w * G, g.h * G);
    if (tool === 'belt' || K[tool]) {
      // arrow: belt direction or the machine's output side
      const ax = x0 + g.w * G / 2 + DX[mode.rot] * g.w * G / 2, ay = y0 + g.h * G / 2 + DY[mode.rot] * g.h * G / 2;
      ctx.save(); ctx.translate(tool === 'belt' ? x0 + G / 2 : ax, tool === 'belt' ? y0 + G / 2 : ay); ctx.rotate(mode.rot * Math.PI / 2);
      ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(10, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (bad && tool !== 'belt') SF.Render.label(ctx, bad, x0 + g.w * G / 2, y0 - 12, 12, '#ffb3b3', 240);
    if (mode.sel && mode.sel.t === 'm') { const m = mode.sel.m, z = size(m.k); ctx.strokeStyle = '#ffd36b'; ctx.setLineDash([6, 5]); ctx.strokeRect(cx(m.c), cy(m.r), z.w * G, z.h * G); ctx.setLineDash([]); }
  }

  // The machine the player stands at, for the walk-up popup.
  function machineAt(x, y) {
    if (SF.state.planet !== C.home || !unlocked()) return null;
    for (const m of st().m) {
      const z = size(m.k), x0 = cx(m.c), y0 = cy(m.r);
      if (x > x0 - 20 && x < x0 + z.w * G + 20 && y > y0 - 10 && y < y0 + z.h * G + 40) return m;
    }
    return null;
  }

  function enterWorld() { center = null; belts = new Map(); rebuild(); if (mode.on && SF.state.planet !== C.home) exit(); }

  return {
    mode, lotPlots, syncLots, rebuild, update, enter, exit, setTool, rotate, pointer, key: key2, drawGround, drawList, drawOverlay,
    machineAt, byId, status, setRecipe, setSel, recipe, perMin, priceOf, afford, unlocked, beltsOk, enterWorld, origin, belts: () => belts,
    placeBelt, placeMachine, placeBuilding, removeAt, moveTo, toCell,
  };
})();
