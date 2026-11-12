// The sky behind the page: stars in three depths that twinkle and drift with the mouse and the scroll,
// faint nebula glows, a shooting star every few seconds, now and then a slow tumbling asteroid, and light rain.
(() => {
  const c = document.getElementById('sky');
  if (!c) return;
  const ctx = c.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  let W = 0, H = 0, stars = [], drops = [];

  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // stars live on a band taller than the screen, so scrolling can move them by depth
    const n = Math.min(650, Math.round((W * H) / 2300));
    stars = Array.from({ length: n }, () => {
      const z = Math.random() ** 2.2; // most are far away and faint
      return { x: Math.random(), y: Math.random(), z, r: 0.35 + z * 1.5, a: 0.25 + z * 0.75, tw: rnd(0.6, 2.4), ph: rnd(0, 6.3) };
    });
    drops = Array.from({ length: Math.round(W / 16) }, () => ({ x: rnd(-0.1, 1.1) * W, y: rnd(0, H), v: rnd(650, 1050), len: rnd(10, 24), a: rnd(0.05, 0.13) }));
  };
  size();
  addEventListener('resize', size);

  // faint glows that drift very slowly, a little of the old fog
  const glows = [[0.22, 0.3, 0.55, 0.05], [0.78, 0.62, 0.5, 0.04], [0.5, 0.95, 0.7, 0.035]];
  const drawGlows = (t) => {
    for (const [gx, gy, gr, ga] of glows) {
      const x = (gx + Math.sin(t * 0.00004 + gx * 9) * 0.04) * W, y = (gy + Math.cos(t * 0.00003 + gy * 7) * 0.03) * H, r = gr * Math.max(W, H);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${ga})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  };

  let px = 0, py = 0; // smoothed mouse parallax
  const drawStars = (t) => {
    const m = window.mouse;
    const on = m && m.x > -1e3;
    px += ((on ? m.x / W - 0.5 : 0) - px) * 0.03;
    py += ((on ? m.y / H - 0.5 : 0) - py) * 0.03;
    const band = H * 1.6, sc = scrollY;
    for (const s of stars) {
      const x = s.x * W - px * 30 * s.z;
      let y = (s.y * band - sc * (0.05 + s.z * 0.18) - py * 20 * s.z) % band;
      if (y < 0) y += band;
      if (y > H + 4) continue;
      const a = s.a * (still ? 0.85 : 0.6 + 0.4 * Math.sin(t * 0.001 * s.tw + s.ph));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, 6.283);
      ctx.fill();
      if (s.z > 0.8) { // the brightest get a small cross flare
        ctx.globalAlpha = a * 0.35;
        ctx.fillRect(x - s.r * 4, y - 0.4, s.r * 8, 0.8);
        ctx.fillRect(x - 0.4, y - s.r * 4, 0.8, s.r * 8);
      }
    }
    ctx.globalAlpha = 1;
  };

  // shooting stars: a bright head and a tail that fades behind it
  const meteors = [];
  let nextMeteor = 2500;
  const drawMeteors = (t, dt) => {
    if (t > nextMeteor) {
      const left = Math.random() < 0.5, ang = (left ? rnd(20, 40) : rnd(140, 160)) * Math.PI / 180;
      meteors.push({ x: rnd(0.15, 0.85) * W, y: rnd(-0.05, 0.35) * H, vx: Math.cos(ang), vy: Math.sin(ang), sp: rnd(900, 1500), len: rnd(110, 240), life: 0, max: rnd(650, 1000) });
      nextMeteor = t + rnd(3500, 9000);
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.life += dt;
      m.x += m.vx * m.sp * dt / 1000;
      m.y += m.vy * m.sp * dt / 1000;
      const k = m.life / m.max;
      if (k >= 1) { meteors.splice(i, 1); continue; }
      const fade = Math.sin(k * Math.PI); // in and out
      const tx = m.x - m.vx * m.len, ty = m.y - m.vy * m.len;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      const h = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 9);
      h.addColorStop(0, `rgba(255,255,255,${0.8 * fade})`);
      h.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = h;
      ctx.fillRect(m.x - 9, m.y - 9, 18, 18);
    }
  };

  // now and then an asteroid: a lumpy, lit rock that tumbles slowly across with a faint dust trail
  let rock = null, nextRock = 9000;
  const makeRock = () => {
    const r = rnd(12, 30), pts = Array.from({ length: 11 }, (_, i) => { const a = (i / 11) * Math.PI * 2; return [Math.cos(a) * r * rnd(0.72, 1.12), Math.sin(a) * r * rnd(0.72, 1.12)]; });
    const craters = Array.from({ length: 3 }, () => [rnd(-0.45, 0.45) * r, rnd(-0.45, 0.45) * r, rnd(0.12, 0.22) * r]);
    const fromLeft = Math.random() < 0.5, dur = rnd(16000, 26000);
    return { r, pts, craters, x0: fromLeft ? -60 : W + 60, x1: fromLeft ? W + 60 : -60, y0: rnd(0.12, 0.55) * H, y1: rnd(0.3, 0.85) * H, t0: performance.now(), dur, spin: rnd(-0.0004, 0.0004), trail: [] };
  };
  const drawRock = (t) => {
    if (!rock && t > nextRock) rock = makeRock();
    if (!rock) return;
    const k = (t - rock.t0) / rock.dur;
    if (k >= 1) { rock = null; nextRock = t + rnd(12000, 24000); return; }
    const x = rock.x0 + (rock.x1 - rock.x0) * k, y = rock.y0 + (rock.y1 - rock.y0) * k;
    rock.trail.push([x, y]);
    if (rock.trail.length > 70) rock.trail.shift();
    rock.trail.forEach(([tx, ty], i) => {
      ctx.globalAlpha = (i / rock.trail.length) * 0.12;
      ctx.fillStyle = '#fff';
      ctx.fillRect(tx + rnd(-3, 3), ty + rnd(-3, 3), 1.2, 1.2);
    });
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((t - rock.t0) * rock.spin);
    ctx.beginPath();
    rock.pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.closePath();
    const g = ctx.createRadialGradient(-rock.r * 0.45, -rock.r * 0.45, 1, 0, 0, rock.r * 1.2);
    g.addColorStop(0, '#7a7a7a');
    g.addColorStop(0.55, '#2c2c2c');
    g.addColorStop(1, '#0b0b0b');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (const [cx, cy, cr] of rock.craters) { ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 6.283); ctx.fill(); }
    ctx.restore();
  };

  // light rain: thin slanted streaks, barely there
  const drawRain = (dt) => {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    for (const d of drops) {
      d.y += d.v * dt / 1000;
      d.x -= d.v * 0.2 * dt / 1000;
      if (d.y > H + 30) { d.y = rnd(-40, -10); d.x = rnd(-0.05, 1.2) * W; }
      ctx.globalAlpha = d.a;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.len * 0.2, d.y - d.len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const frame = (t, dt) => {
    ctx.clearRect(0, 0, W, H);
    drawGlows(t);
    drawStars(t);
    if (still) return;
    drawRock(t);
    drawMeteors(t, dt);
    drawRain(dt);
  };
  if (still) { frame(performance.now(), 0); addEventListener('resize', () => frame(performance.now(), 0)); return; }
  let last = performance.now();
  const loop = (t) => { const dt = Math.min(50, t - last); last = t; frame(t, dt); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();
