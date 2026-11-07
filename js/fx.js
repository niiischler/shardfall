// Particles, floating numbers, screen shake. Particles live in pseudo-3D (z = height).
SF.FX = (function () {
  const parts = [], pops = [];
  let trauma = 0;
  const TAU = Math.PI * 2;

  function burst(x, y, color, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (o.speed || 160) * (0.4 + Math.random() * 0.8);
      const life = (o.life || 0.8) * (0.6 + Math.random() * 0.6);
      parts.push({
        x, y, z: o.z == null ? 24 : o.z,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: (o.up || 260) * (0.5 + Math.random()),
        life, max: life, color: Array.isArray(color) ? color[i % color.length] : color,
        size: (o.size || 4) * (0.6 + Math.random() * 0.8),
        rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 18,
        shape: o.shape || 'shard', grav: o.grav == null ? 700 : o.grav,
      });
    }
  }

  function sparks(x, y, z, color, n) {
    burst(x, y, color, n, { z, speed: 260, up: 160, life: 0.35, size: 3, shape: 'spark', grav: 300 });
  }

  function smoke(x, y, z) {
    parts.push({ x, y, z, vx: (Math.random() - 0.5) * 12, vy: 0, vz: 30 + Math.random() * 15,
      life: 2.4, max: 2.4, color: 'rgba(230,215,240,', size: 7 + Math.random() * 5, rot: 0, vr: 0, shape: 'smoke', grav: -6 });
  }

  function pop(x, y, text, color, size, o) {
    o = o || {};
    pops.push({ x, y, text, color: color || '#fff', size: size || 18, life: o.life || 1, max: o.life || 1,
      vy: o.vy == null ? -46 : o.vy, dx: (Math.random() - 0.5) * 14 });
  }

  function shake(a) { trauma = Math.min(1, trauma + a); }

  function offset(t) {
    const k = trauma * trauma * 14;
    return { x: (Math.sin(t * 73) + Math.sin(t * 31)) * 0.5 * k, y: (Math.cos(t * 67) + Math.sin(t * 43)) * 0.5 * k };
  }

  function update(dt) {
    trauma = Math.max(0, trauma - dt * 1.8);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vz -= p.grav * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
      if (p.z < 0 && p.shape !== 'smoke') { p.z = 0; p.vz *= -0.35; p.vx *= 0.55; p.vy *= 0.55; p.vr *= 0.5; }
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.life -= dt;
      if (p.life <= 0) { pops.splice(i, 1); continue; }
      p.y += p.vy * dt; p.vy *= 0.97; p.x += p.dx * dt;
    }
  }

  function drawParticles(ctx) {
    for (const p of parts) {
      const a = Math.min(1, p.life / p.max * 2);
      const px = p.x, py = p.y - p.z;
      if (p.shape === 'smoke') {
        const k = 1 - p.life / p.max;
        ctx.fillStyle = p.color + (0.35 * (1 - k)).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(px, py, p.size * (1 + k * 1.8), 0, TAU); ctx.fill();
        continue;
      }
      ctx.globalAlpha = a;
      if (p.shape === 'spark') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - p.vx * 0.03, py - p.vy * 0.03 + p.vz * 0.03); ctx.stroke();
      } else if (p.shape === 'coin') {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(px, py, p.size * Math.abs(Math.cos(p.rot)) + 0.5, p.size, 0, 0, TAU); ctx.fill();
      } else {
        ctx.save(); ctx.translate(px, py); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(p.size * 0.6, 0); ctx.lineTo(0, p.size); ctx.lineTo(-p.size * 0.6, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawPops(ctx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of pops) {
      const age = 1 - p.life / p.max;
      const s = age < 0.15 ? 0.6 + age / 0.15 * 0.6 : 1.2 - Math.min(0.2, (age - 0.15));
      ctx.globalAlpha = Math.min(1, p.life / p.max * 3);
      ctx.font = `700 ${Math.round(p.size * s)}px "Chakra Petch", "Trebuchet MS", sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(28,10,40,0.85)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  return { burst, sparks, smoke, pop, shake, offset, update, drawParticles, drawPops, parts };
})();
