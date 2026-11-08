// Keyboard (WASD / arrows) plus a floating touch/mouse joystick.
SF.Input = (function () {
  const keys = {};
  const joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const R = 56;
  let onFirst = null;

  function first() { SF.Audio.init(); if (onFirst) { const f = onFirst; onFirst = null; f(); } }

  // Build mode (js/factory.js) can take pointer events for itself: hook(type, event) returns true when it did.
  let hook = null;
  function setHook(fn) { hook = fn; }

  function attach(canvas, firstInteraction) {
    onFirst = firstInteraction;
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      first();
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; joy.active = false; });

    canvas.addEventListener('pointerdown', e => {
      first();
      if (hook && hook('down', e)) { try { canvas.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); return; }
      if (joy.active) return;
      joy.active = true; joy.id = e.pointerId;
      joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', e => {
      if (hook && !joy.active && hook('move', e)) return;
      if (!joy.active || e.pointerId !== joy.id) return;
      // The base stays where the finger first landed; only the knob moves.
      joy.x = e.clientX; joy.y = e.clientY;
    });
    const end = e => { if (hook && !joy.active && hook('up', e)) return; if (e.pointerId === joy.id) { joy.active = false; joy.id = null; } };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  function vector() {
    let x = 0, y = 0;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (keys.KeyW || keys.ArrowUp) y -= 1;
    if (keys.KeyS || keys.ArrowDown) y += 1;
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    if (joy.active) {
      const dx = joy.x - joy.ox, dy = joy.y - joy.oy, l = Math.hypot(dx, dy);
      if (l < 6) return { x: 0, y: 0 };
      const m = Math.min(1, l / R);
      return { x: dx / l * m, y: dy / l * m };
    }
    return { x: 0, y: 0 };
  }

  return { attach, vector, joy, R, keys, setHook };
})();
