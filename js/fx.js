/* WebLuxe Foods — canvas effects: hero embers, confetti.
   Everything here is tuned to stay smooth on phones: capped DPR, sprite-based glow, fewer particles on small screens. */
window.FX = (() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = matchMedia('(max-width: 820px)').matches;
  const LOW = SMALL || (navigator.hardwareConcurrency || 8) <= 4;
  const PAL = ['#ffb81c', '#ff8a00', '#e4002b', '#fff3d6'];

  function fit(canvas, maxDpr = 2) {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }

  /* Pre-rendered soft glow so each ember is one cheap drawImage instead of a new gradient per frame. */
  const glowCache = {};
  function glow(rgb) {
    if (glowCache[rgb]) return glowCache[rgb];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.25, `rgba(${rgb},.55)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return (glowCache[rgb] = c);
  }

  /* Glowing embers drifting up over the hero. Pauses when off screen. */
  function embers(canvas) {
    if (REDUCED) return { stop() {} };
    let s = fit(canvas, 1.5), raf = 0, alive = true, visible = true;
    const COLORS = ['255,184,28', '255,138,0', '228,0,43', '255,236,170'].map(glow);
    const N = LOW ? 26 : 64;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const make = (initial) => ({
      x: Math.random() * s.w, y: initial ? Math.random() * s.h : s.h + 20,
      r: 5 + Math.random() * 13, vy: 0.25 + Math.random() * 0.9,
      sway: 0.4 + Math.random() * 1.2, phase: Math.random() * Math.PI * 2,
      img: COLORS[(Math.random() * COLORS.length) | 0], depth: 0.3 + Math.random() * 0.7,
    });
    const parts = Array.from({ length: N }, () => make(true));

    const onResize = () => { s = fit(canvas, 1.5); };
    const onMove = (e) => {
      mouse.tx = e.clientX / window.innerWidth - 0.5;
      mouse.ty = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('resize', onResize);
    if (!SMALL) window.addEventListener('pointermove', onMove, { passive: true });
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
        if (p.y < -30) parts[i] = make(false);
        const life = Math.min(1, p.y / (h * 0.9));
        ctx.globalAlpha = Math.max(0, life * (0.55 + Math.sin(t * 6 + p.phase) * 0.25) * p.depth);
        ctx.drawImage(p.img, p.x + mouse.x * 60 * p.depth - p.r, p.y + mouse.y * 30 * p.depth - p.r, p.r * 2, p.r * 2);
      }
      ctx.globalAlpha = 1;
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

  /* Gold and chilli confetti on the fixed #confetti canvas. */
  function confetti() {
    if (REDUCED) return;
    const canvas = document.getElementById('confetti');
    if (!canvas) return;
    canvas.style.display = 'block';
    const { ctx, w, h } = fit(canvas, 1.5);
    const parts = Array.from({ length: LOW ? 90 : 160 }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -Math.PI / 3 : (-2 * Math.PI) / 3) + (Math.random() - 0.5) * 0.9;
      const speed = (SMALL ? 7 : 9) + Math.random() * 12;
      return {
        x: fromLeft ? -10 : w + 10, y: h * 0.75,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 8, h: 4 + Math.random() * 6,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: PAL[i % 4],
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
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - age / 3000);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (age < 3000) requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, w, h); canvas.style.display = 'none'; }
    })(t0);
  }

  return { embers, confetti, PAL, SMALL };
})();
