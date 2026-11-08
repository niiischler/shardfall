// Contract board beside the hall on Halcyon: three orders for materials from the hall. Handing one over pays
// several times the normal sale price, then a new order takes its place. An order you do not want can be swapped
// for a new one now and then.
SF.Contracts = (function () {
  const C = SF.CFG, K = C.contracts;

  const st = () => SF.state.contracts || (SF.state.contracts = { list: [], done: 0, swap: 0 });
  const on = () => SF.state.homeReached;

  // What may be ordered: the common resources of every planet you have been to, and ingots once you made some.
  function candidates() {
    const out = [];
    for (const k in SF.state.worlds) {
      const pi = +k, pl = SF.PLANETS[pi];
      pl.resources.forEach((r, t) => { if (t <= 2 && !r.liquid) out.push(pi * 10 + t); });
    }
    for (const c in SF.INGOTS) if ((SF.state.hold[c] || 0) > 0 || SF.state.smelt.hand > 0) out.push(+c);
    return out;
  }

  function make(taken) {
    const s = st(), pool = candidates().filter(c => !taken.includes(c)), fresh = pool.filter(c => c !== s.last), all = fresh.length ? fresh : pool;
    if (!all.length) return null;
    const code = all[Math.floor(Math.random() * all.length)];
    const grow = 1 + K.growth * Math.min(s.done, K.growMax);
    const n = Math.min(SF.Hub.hallCap(), Math.round((K.min + Math.random() * (K.max - K.min)) * grow / 5) * 5);
    const pay = Math.round(n * SF.Hub.overflowValue(code, true) * K.pay * (1 + 0.02 * Math.min(s.done, K.growMax)));
    return { code, n, pay };
  }

  function fill() {
    const s = st();
    s.list = s.list.filter(o => o && SF.res(o.code));
    while (s.list.length < K.slots) {
      const o = make(s.list.map(q => q.code));
      if (!o) break;
      s.list.push(o);
    }
    return s.list;
  }

  const list = () => (on() ? fill() : []);
  const ready = o => (SF.state.hold[o.code] || 0) >= o.n;

  function hand(i) {
    const s = st(), o = s.list[i];
    if (!o || !ready(o)) { SF.Audio.nope(); return false; }
    SF.state.hold[o.code] -= o.n; if (!SF.state.hold[o.code]) delete SF.state.hold[o.code];
    SF.state.credits += o.pay; SF.state.totalEarned += o.pay; SF.state.lifetime += o.pay;
    s.done++; s.last = o.code;
    s.list.splice(i, 1);
    fill();
    const b = SF.World.board;
    SF.Audio.build();
    if (b) {
      SF.FX.burst(b.x, b.y - 60, ['#ffd36b', '#fff1bf'], 30, { z: 30, speed: 220, shape: 'coin', size: 4 });
      SF.FX.pop(b.x, b.y - 130, 'Contract done +' + SF.UI.fmt(o.pay), '#ffd36b', 20, { life: 1.6 });
    }
    SF.save(); SF.UI.refresh();
    return true;
  }

  // Swap one order for a new one. After a swap the board needs a while before the next.
  function swap(i) {
    const s = st(), o = s.list[i];
    if (!o || s.swap > 0) { SF.Audio.nope(); return false; }
    const n = make(s.list.map(q => q.code).concat(o.code));
    if (!n) return false;
    s.last = o.code; s.list[i] = n; s.swap = K.swap;
    SF.Audio.store(2);
    SF.save(); SF.UI.refresh();
    return true;
  }

  function update(dt) { const s = st(); if (s.swap > 0) s.swap = Math.max(0, s.swap - dt); }

  return { list, ready, hand, swap, update, swapIn: () => st().swap, done: () => st().done };
})();
