/* Kot Nou — canvas effects: loader ribbons, hero embers, confetti. */
window.FX = (() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FLAG = ['#e4002b', '#1b2a8f', '#ffd200', '#00a04a'];

  function fit(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }

  /* Four flag-coloured ribbons that draw themselves across the screen as loading progresses. */
  function loader(canvas) {
    let s = fit(canvas), raf = 0, progress = 0, shown = 0, alive = true;
    const onResize = () => { s = fit(canvas); };
    window.addEventListener('resize', onResize);
    const t0 = performance.now();

    function frame(now) {
      if (!alive) return;
      const { ctx, w, h } = s;
      const t = (now - t0) / 1000;
      shown += (progress - shown) * 0.08;
      ctx.clearRect(0, 0, w, h);
      const thick = Math.max(14, Math.min(w, h) * 0.035);
      const endX = -40 + (w + 80) * shown;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      FLAG.forEach((color, k) => {
        const base = h * 0.5 + (k - 1.5) * thick * 1.25;
        ctx.beginPath();
        for (let x = -40; x <= endX; x += 8) {
          const y = base
            + Math.sin(x * 0.006 + t * 1.6 + k * 0.5) * h * 0.11
            + Math.sin(x * 0.013 - t * 1.1 + k) * h * 0.035
            + (x / w - 0.5) * h * -0.28;
          if (x === -40) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = thick;
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    if (REDUCED) { progress = shown = 1; }
    raf = requestAnimationFrame(frame);

    return {
      set(p) { progress = Math.max(progress, Math.min(1, p)); },
      stop() { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); },
    };
  }

  /* Glowing embers / spice dust drifting up over the hero. Follows the pointer slightly. */
  function embers(canvas) {
    if (REDUCED) return { stop() {} };
    let s = fit(canvas), raf = 0, alive = true, visible = true;
    const COLORS = ['255,210,0', '255,138,0', '228,0,43', '255,236,170'];
    const N = Math.round(Math.min(90, Math.max(36, s.w / 16)));
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const make = (initial) => ({
      x: Math.random() * s.w,
      y: initial ? Math.random() * s.h : s.h + 20,
      r: 0.8 + Math.random() * 2.6,
      vy: 0.25 + Math.random() * 0.9,
      sway: 0.4 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      depth: 0.3 + Math.random() * 0.7,
    });
    let parts = Array.from({ length: N }, () => make(true));

    const onResize = () => { s = fit(canvas); };
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width - 0.5;
      mouse.ty = (e.clientY - r.top) / r.height - 0.5;
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
    io.observe(canvas);

    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const { ctx, w, h } = s;
      const t = now / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.y -= p.vy * p.depth;
        p.x += Math.sin(t * p.sway + p.phase) * 0.35;
        if (p.y < -20) parts[i] = make(false);
        const px = p.x + mouse.x * 60 * p.depth;
        const py = p.y + mouse.y * 30 * p.depth;
        const life = Math.min(1, p.y / (h * 0.9));
        const flicker = 0.55 + Math.sin(t * 6 + p.phase) * 0.25;
        const a = Math.max(0, life * flicker * p.depth);
        const g = ctx.createRadialGradient(px, py, 0, px, py, p.r * 5);
        g.addColorStop(0, `rgba(${p.c},${a})`);
        g.addColorStop(1, `rgba(${p.c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, p.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    raf = requestAnimationFrame(frame);

    return {
      stop() {
        alive = false; cancelAnimationFrame(raf); io.disconnect();
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointermove', onMove);
      },
    };
  }

  /* Flag-coloured confetti burst on the fixed #confetti canvas. */
  function confetti() {
    if (REDUCED) return;
    const canvas = document.getElementById('confetti');
    if (!canvas) return;
    canvas.style.display = 'block';
    const { ctx, w, h } = fit(canvas);
    const parts = Array.from({ length: 160 }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -Math.PI / 3 : (-2 * Math.PI) / 3) + (Math.random() - 0.5) * 0.9;
      const speed = 9 + Math.random() * 12;
      return {
        x: fromLeft ? -10 : w + 10, y: h * 0.75,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 8, h: 4 + Math.random() * 6,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: FLAG[i % 4],
      };
    });
    const t0 = performance.now();
    (function frame(now) {
      const age = now - t0;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += 0.32; p.vx *= 0.99;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - age / 3200);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (age < 3200) requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, w, h); canvas.style.display = 'none'; }
    })(t0);
  }

  return { loader, embers, confetti, FLAG };
})();
