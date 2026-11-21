/* WebLuxe Foods: the WebGL stage.
   One full-screen canvas does two jobs:
   1. The intro: warm candle smoke rises with drifting gold dust, refined 3D ingredients (bay leaves, star
      anise, peppercorns, cinnamon, lemon, sea salt and gold leaf) are tossed into the air, time slows at the
      top, the camera pushes through and a liquid, brass-rimmed edge opens from the middle onto the site.
   2. Tab transitions: the ink pours in from wherever you tapped (a few gold-leaf flakes flutter off your
      finger) behind a fine brass rim, the next page is drawn underneath, then the ink rolls away again.
   It only renders while something is moving; when idle the canvas is hidden and the loop is stopped. */
import * as THREE from './vendor/three.module.min.js';

const canvas = document.getElementById('stage');
const SMALL = matchMedia('(max-width: 820px)').matches;
const LOW = SMALL || (navigator.hardwareConcurrency || 8) <= 4;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

function boot() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !LOW, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW ? 1.25 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  /* ------------------------------------------------------------ cover / burn shader */
  const coverMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
      uR: { value: 0 }, uO: { value: new THREE.Vector2(0.5, 0.5) }, uInv: { value: 0 },
      uFire: { value: 0 }, uEdge: { value: 0 }, uShow: { value: 1 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */`
      precision highp float;
      varying vec2 vUv;
      uniform vec2 uRes, uO; uniform float uTime, uR, uInv, uFire, uEdge, uShow;
      float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*noise(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
      void main(){
        float asp = uRes.x / uRes.y;
        vec2 p = vec2(vUv.x*asp, vUv.y), o = vec2(uO.x*asp, uO.y);
        vec2 d = p - o; float ang = atan(d.y, d.x);
        // liquid front: a circle whose edge rolls in slow, smooth waves (round while small, fluid once it grows)
        float n = fbm(p*1.7 + vec2(uTime*0.16, -uTime*0.24));
        float wob = ((n - 0.5)*0.24 + sin(ang*3.0 + uTime*1.4)*0.022) * smoothstep(0.0, 0.3, uR);
        float e = length(d) + wob - uR;
        float inside = (1.0 - smoothstep(-0.003, 0.003, e)) * step(0.0005, uR);
        float cover = mix(1.0 - inside, inside, uInv) * uShow;
        // ink: warm black under a soft spotlight, with slow silk folds and film grain
        vec3 col = vec3(0.078, 0.066, 0.056);
        col += vec3(0.15, 0.115, 0.07) * 0.5 * smoothstep(1.1, 0.0, length(vec2((vUv.x-0.5)*asp, vUv.y-0.62)));
        float fold = fbm(vec2(p.x*1.1 + p.y*0.7, p.y*2.0) + uTime*0.04);
        col += vec3(0.055, 0.046, 0.032) * smoothstep(0.42, 0.78, fold);
        // intro: candle-warm smoke curling up from a pool of light at the bottom
        if (uFire > 0.001) {
          vec2 sp = vec2(p.x*1.3, vUv.y*1.05 - uTime*0.16);
          float s = fbm(sp*2.1 + vec2(fbm(sp*2.6 + uTime*0.09)*1.6, 0.0));
          float sm = smoothstep(0.4, 0.86, s) * smoothstep(1.05, 0.05, vUv.y) * uFire;
          col += vec3(0.78, 0.63, 0.42) * sm * 0.2;
          col += vec3(0.6, 0.42, 0.2) * uFire * 0.4 * exp(-vUv.y*3.0) * (0.9 + 0.1*sin(uTime*1.7));
        }
        col += (hash(vUv*uRes + fract(uTime)*91.0) - 0.5) * 0.035;
        // a fine brushed-brass rim rides the front, with a sheen that travels round it
        float rim = uEdge * exp(-abs(e)*150.0) * (0.7 + 0.3*sin(ang*2.0 + uTime*2.4));
        float halo = uEdge * exp(-abs(e)*26.0) * 0.3;
        col = mix(col, col*0.55, uEdge * smoothstep(0.07, 0.0, abs(e)) * cover);
        col += mix(vec3(0.76, 0.62, 0.4), vec3(1.0, 0.94, 0.8), exp(-abs(e)*320.0)) * (rim*1.15 + halo*0.45);
        gl_FragColor = vec4(col, clamp(cover + rim*0.9 + halo*0.35, 0.0, 1.0));
      }`,
  });
  const coverScene = new THREE.Scene();
  coverScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), coverMat));
  const coverCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /* The fire/ink/burn layer is all soft noise, so it is drawn into a smaller buffer and stretched up: on a
     mid-range phone that is the difference between ~40 fps and a steady 60. The 3D food stays full sharpness. */
  const COVER_SCALE = (LOW ? 0.6 : 1);
  const coverRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const blitScene = new THREE.Scene();
  blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { t: { value: coverRT.texture } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'precision mediump float; varying vec2 vUv; uniform sampler2D t; void main(){ gl_FragColor = texture2D(t, vUv); }',
    // the buffer already holds premultiplied colour
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  })));

  /* ------------------------------------------------------------ 3D ingredients */
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  cam.position.set(0, 0, 7);
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x1a140e, 0.75));
  const key = new THREE.DirectionalLight(0xfff4e4, 2.3); key.position.set(-3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe0b0, 1.2); rim.position.set(4, 2, -5); scene.add(rim);
  const fireLight = new THREE.PointLight(0xffc27a, 0, 16, 1.4); fireLight.position.set(0, -3.2, 2.5); scene.add(fireLight);

  const bend = (g, fn) => {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = fn(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, v[0], v[1], v[2]); }
    g.computeVertexNormals();
    return g;
  };
  const paint = (g, fn) => {
    const p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) fn(p.getX(i), p.getY(i), p.getZ(i)).toArray(c, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  };

  // Bay leaf: a long pointed leaf, cupped along the midrib
  const bayShape = new THREE.Shape();
  for (let k = 0; k <= 48; k++) {
    const a = (k / 48) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    const x = 0.12 * c * (1 - 0.55 * Math.pow(Math.abs(sn), 3)), y = 0.38 * sn;
    k ? bayShape.lineTo(x, y) : bayShape.moveTo(x, y);
  }
  const bayG = bend(new THREE.ShapeGeometry(bayShape, 6), (x, y) => [x, y, -x * x * 3.2 + y * y * 0.35]);
  // Star anise: eight-pointed star, extruded
  const star = new THREE.Shape();
  for (let k = 0; k <= 16; k++) {
    const a = (k / 16) * Math.PI * 2, r = k % 2 ? 0.08 : 0.27;
    k ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(r, 0);
  }
  const anisG = new THREE.ExtrudeGeometry(star, { depth: 0.05, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.03, bevelSegments: 2 });
  anisG.center();
  // Peppercorn: a wrinkled little sphere
  const pepG = bend(new THREE.IcosahedronGeometry(0.07, 2), (x, y, z) => {
    const s = 1 + 0.12 * Math.sin(x * 90) * Math.sin(y * 80) * Math.sin(z * 70);
    return [x * s, y * s, z * s];
  });
  // Cinnamon: a rolled bark tube
  const cinnG = new THREE.CylinderGeometry(0.06, 0.06, 0.72, 12, 1, true);
  // Lemon wheel: pale flesh, golden rind
  const limeG = paint(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 28), (x, y) => {
    const r = Math.hypot(x, 0);
    return Math.abs(y) > 0.02 && r < 0.2 ? new THREE.Color(0xf0e2a4) : new THREE.Color(0xd8b23c);
  });
  // Sea-salt flake: a flat, faceted crystal
  const saltG = new THREE.IcosahedronGeometry(0.075, 0); saltG.scale(1, 0.32, 1.25);
  // Gold leaf: a thin, crumpled square that flutters as it falls
  const goldG = bend(new THREE.PlaneGeometry(0.26, 0.21, 5, 4), (x, y) => [x, y, Math.sin(x * 21 + y * 5) * 0.016 + Math.cos(y * 18) * 0.014]);

  const std = (o) => new THREE.MeshStandardMaterial(o);
  // g = gravity scale, drag = air drag, flutter = sideways drift (leaf-like)
  const TYPES = [
    { g: bayG, m: std({ color: 0x5e6b3e, roughness: 0.55, side: THREE.DoubleSide }), w: 2.2, s: [0.75, 1.05], gr: 0.8, drag: 0.35, flutter: 0.6 },
    { g: anisG, m: std({ color: 0x5a2b18, roughness: 0.7 }), w: 1.3, s: [0.8, 1.05], gr: 1, drag: 0.12 },
    { g: pepG, m: std({ color: 0x1f1813, roughness: 0.8 }), w: 4, s: [0.8, 1.3], gr: 1, drag: 0.12 },
    { g: cinnG, m: std({ color: 0x8a4a26, roughness: 0.75, side: THREE.DoubleSide }), w: 0.9, s: [0.8, 1.05], gr: 1, drag: 0.12 },
    { g: limeG, m: std({ vertexColors: true, roughness: 0.4 }), w: 0.8, s: [0.75, 0.95], gr: 1, drag: 0.12 },
    { g: saltG, m: std({ color: 0xf4efe4, roughness: 0.18 }), w: 2.6, s: [0.7, 1.2], gr: 1, drag: 0.15 },
    { g: goldG, m: new THREE.MeshPhongMaterial({ color: 0xb98a3e, specular: 0xffefc4, shininess: 90, emissive: 0x2c1d08, side: THREE.DoubleSide }), w: 3.2, s: [0.7, 1.15], gr: 0.22, drag: 1.5, flutter: 2.2, gold: true },
  ];  const CAP = LOW ? 110 : 220;
  const wsum = TYPES.reduce((s, t) => s + t.w, 0);
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  TYPES.forEach((t) => {
    t.cap = Math.ceil((CAP * t.w) / wsum);
    t.mesh = new THREE.InstancedMesh(t.g, t.m, t.cap);
    t.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    t.mesh.frustumCulled = false;
    for (let i = 0; i < t.cap; i++) t.mesh.setMatrixAt(i, ZERO);
    t.next = 0;
    scene.add(t.mesh);
  });

  const items = [];
  const pickType = (list = TYPES) => { let r = Math.random() * list.reduce((s, t) => s + t.w, 0); for (const t of list) { if ((r -= t.w) <= 0) return t; } return list[0]; };
  const TAP = TYPES.filter((t) => t.gold || t.g === saltG);   // what flies off your finger on a tab change
  function spawn(at, pos, vel, list) {
    const t = pickType(list), slot = t.next; t.next = (t.next + 1) % t.cap;
    const old = items.find((it) => it.t === t && it.slot === slot);
    if (old) items.splice(items.indexOf(old), 1);
    items.push({
      t, slot, at, age: 0,
      p: pos.clone(), v: vel.clone(),
      q: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6)),
      ax: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      spin: (t.flutter ? 1.5 : 2) + Math.random() * (t.flutter ? 4 : 6), ph: Math.random() * 9,
      s: t.s[0] + Math.random() * (t.s[1] - t.s[0]),
    });
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function toss(n, from = 0.35, spread = 0.9) {
    for (let i = 0; i < n; i++) {
      const sx = (Math.random() - 0.5) * 2;
      spawn(clock + from + Math.random() * spread,
        V(sx * 0.9, -4.4 - Math.random() * 0.6, (Math.random() - 0.5) * 2.4),
        V(sx * 1.7 + (Math.random() - 0.5) * 1.1, 7.2 + Math.random() * 3, (Math.random() - 0.5) * 2 + 0.4));
    }
  }
  function burst(n, x, y) {
    const ndc = V((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1, 0.5).unproject(cam);
    const dir = ndc.sub(cam.position).normalize();
    const at = cam.position.clone().add(dir.multiplyScalar(-cam.position.z / dir.z));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3.2;
      spawn(clock + Math.random() * 0.1, at, V(Math.cos(a) * sp, Math.sin(a) * sp + 2.2, (Math.random() - 0.2) * 2.6), TAP);
    }
  }

  /* ------------------------------------------------------------ sparks */
  const SN = LOW ? 110 : 220;
  const sparkTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,250,235,1)'); g.addColorStop(0.25, 'rgba(240,214,160,.7)'); g.addColorStop(1, 'rgba(194,160,107,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const sparkGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(SN * 3), sCol = new Float32Array(SN * 3), sp = [];
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3).setUsage(THREE.DynamicDrawUsage));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
    size: 0.06, map: sparkTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  sparks.frustumCulled = false;
  scene.add(sparks);
  for (let i = 0; i < SN; i++) sp.push({ life: 0, max: 1, x: 0, y: -9, z: 0, vx: 0, vy: 0, ph: Math.random() * 9 });

  /* ------------------------------------------------------------ loop */
  let clock = 0, last = 0, raf = 0, running = false, timeScale = 1, fire = 0;
  const tw = [];   // active tweens: { from, to, t0, dur, ease, set, done }
  const ease = {
    io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    in: (t) => t * t * t,
    out: (t) => 1 - Math.pow(1 - t, 3),
  };
  function tween(set, from, to, dur, e = 'io') {
    return new Promise((done) => { tw.push({ set, from, to, t0: clock, dur, e: ease[e], done }); set(from); start(); });
  }
  const U = coverMat.uniforms;
  const maxR = () => Math.hypot(innerWidth / innerHeight, 1) + 0.4;

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    // keep the toss framed on tall phones: widen the vertical field a little
    cam.fov = w / h < 0.7 ? 52 : 40;
    cam.updateProjectionMatrix();
    const cw = Math.max(1, Math.round(w * COVER_SCALE)), ch = Math.max(1, Math.round(h * COVER_SCALE));
    coverRT.setSize(cw, ch);
    U.uRes.value.set(cw, ch);
  }
  addEventListener('resize', resize);
  resize();

  const m4 = new THREE.Matrix4(), dq = new THREE.Quaternion(), sc = new THREE.Vector3();
  function step(now) {
    raf = 0;
    const real = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    clock += real;
    const dt = real * timeScale;
    for (let i = tw.length - 1; i >= 0; i--) {
      const k = tw[i], p = Math.min(1, (clock - k.t0) / k.dur);
      k.set(k.from + (k.to - k.from) * k.e(p));
      if (p >= 1) { tw.splice(i, 1); k.done(); }
    }
    U.uTime.value = clock; U.uFire.value = fire;
    fireLight.intensity = fire * (15 + Math.sin(clock * 3.1) * 1.5);

    // ingredients
    TYPES.forEach((t) => { t.dirty = false; });
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (clock < it.at) continue;
      it.age += dt;
      it.v.y -= 7.2 * it.t.gr * dt;
      it.v.multiplyScalar(1 - it.t.drag * dt);
      if (it.t.flutter) it.v.x += Math.sin(clock * 2.6 + it.ph) * it.t.flutter * dt;
      it.p.addScaledVector(it.v, dt);
      it.q.multiply(dq.setFromAxisAngle(it.ax, it.spin * dt));
      const grow = Math.min(1, it.age * 6);
      m4.compose(it.p, it.q, sc.setScalar(it.s * grow));
      it.t.mesh.setMatrixAt(it.slot, m4);
      it.t.dirty = true;
      if (it.p.y < -7 || it.age > 7 || it.p.z > cam.position.z - 0.2) {
        it.t.mesh.setMatrixAt(it.slot, ZERO);
        items.splice(i, 1);
      }
    }
    TYPES.forEach((t) => { if (t.dirty || t.wasDirty) t.mesh.instanceMatrix.needsUpdate = true; t.wasDirty = t.dirty; });

    // sparks ride up out of the fire
    let liveSparks = 0;
    for (let i = 0; i < SN; i++) {
      const s = sp[i];
      if (s.life <= 0) {
        if (fire > 0.15 && Math.random() < 0.12 * fire) {
          s.max = s.life = 1.8 + Math.random() * 2.2;
          s.x = (Math.random() - 0.5) * 6; s.y = -3.8 + Math.random() * 3; s.z = (Math.random() - 0.5) * 3;
          s.vx = (Math.random() - 0.5) * 0.3; s.vy = 0.25 + Math.random() * 0.6;
        } else { sPos[i * 3 + 1] = -99; continue; }
      }
      s.life -= real;
      s.x += (s.vx + Math.sin(clock * 1.2 + s.ph) * 0.25) * real; s.y += s.vy * real;
      const a = Math.sin(Math.PI * Math.max(0, s.life / s.max)) * 0.8;
      sPos[i * 3] = s.x; sPos[i * 3 + 1] = s.y; sPos[i * 3 + 2] = s.z;
      sCol[i * 3] = 1 * a; sCol[i * 3 + 1] = 0.86 * a; sCol[i * 3 + 2] = 0.6 * a;
      liveSparks++;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.color.needsUpdate = true;

    renderer.clear();
    if (U.uShow.value > 0 || U.uEdge.value > 0) {
      renderer.setRenderTarget(coverRT); renderer.clear(); renderer.render(coverScene, coverCam);
      renderer.setRenderTarget(null); renderer.render(blitScene, coverCam);
    }
    renderer.clearDepth();
    renderer.render(scene, cam);

    const busy = tw.length || items.length || liveSparks || fire > 0 || hold;
    if (busy) raf = requestAnimationFrame(step);
    else stop();
  }
  let hold = false;   // keep drawing (e.g. while the page is fully covered)
  function start() {
    if (running) return;
    running = true;
    canvas.classList.add('is-on');
    last = performance.now();
    raf = requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf); raf = 0;
    renderer.clear();
    canvas.classList.remove('is-on');
  }

  /* Compile every shader up front (in parallel where the GPU driver allows it), so the first frame of fire
     doesn't freeze the page while programs build. */
  const warm = (async () => {
    try {
      if (renderer.compileAsync) { await renderer.compileAsync(coverScene, coverCam); await renderer.compileAsync(blitScene, coverCam); await renderer.compileAsync(scene, cam); }
      else { renderer.compile(coverScene, coverCam); renderer.compile(blitScene, coverCam); renderer.compile(scene, cam); }
      // one throwaway draw uploads the geometry and textures too
      renderer.setRenderTarget(coverRT); renderer.render(coverScene, coverCam); renderer.setRenderTarget(null);
      renderer.clear(); renderer.render(blitScene, coverCam); renderer.render(scene, cam); renderer.clear();
    } catch (e) { /* fine: it will compile on first use */ }
  })();

  /* ------------------------------------------------------------ public API */
  let introT0 = 0, gen = 0;
  const API = {
    warm,
    /* Fire up and throw the first toss. The cover is solid until exit(). */
    async introStart() {
      await warm;
      U.uInv.value = 0; U.uR.value = 0; U.uEdge.value = 0; U.uShow.value = 1;
      cam.position.z = 7;
      hold = true; start();
      introT0 = clock;
      tween((v) => { fire = v; }, 0, 1, 0.9, 'out');
      if (!REDUCED) { toss(LOW ? 46 : 90, 0.35, 0.9); toss(LOW ? 20 : 44, 1.5, 1); }
      // a first frame is on screen after one rAF: the CSS veil can go
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    },
    elapsed: () => clock - introT0,
    /* Bullet time at the top of the toss, push the camera through, burn the cover away from the middle. */
    async introExit() {
      if (!REDUCED) {
        await tween((v) => { timeScale = v; }, 1, 0.12, 0.35, 'out');
        // anything not thrown yet stays in the wok; everything in the air is blown toward the lens and out
        // of frame, so nothing is left lying over the hero
        for (let i = items.length - 1; i >= 0; i--) {
          if (items[i].at > clock) { items[i].t.mesh.setMatrixAt(items[i].slot, ZERO); items[i].t.mesh.instanceMatrix.needsUpdate = true; items.splice(i, 1); }
        }
        for (const it of items) {
          it.v.z += 5 + Math.random() * 9;
          it.v.x += Math.sign(it.p.x || 1) * (1.5 + Math.random() * 3);
          it.v.y += 1 + Math.random() * 2;
          it.spin *= 1.6;
        }
        tween((v) => { timeScale = v; }, 0.12, 1.5, 0.7, 'in');
        tween((v) => { cam.position.z = v; }, 7, 3.2, 1.2, 'in');
      }
      U.uO.value.set(0.5, 0.42);
      tween((v) => { U.uEdge.value = v; }, 0, 1, 0.2, 'out');
      tween((v) => { fire = v; }, 1, 0, 0.9, 'in');
      const burn = tween((v) => { U.uR.value = v; }, 0, maxR(), REDUCED ? 0.4 : 1.15, 'in');
      const g = gen;
      burn.then(() => { if (g !== gen) return; hold = false; U.uShow.value = 0; U.uEdge.value = 0; timeScale = 1; });
      return new Promise((r) => setTimeout(r, 120));
    },
    /* Ink burns in from (x, y) in CSS px. Resolves once the screen is fully covered. */
    async cover(x = innerWidth / 2, y = innerHeight / 2) {
      const g = ++gen;
      tw.splice(0).forEach((k) => k.done());   // a new tap wins over a transition still running
      hold = true; timeScale = 1; cam.position.z = 7; fire = 0;
      U.uInv.value = 1; U.uShow.value = 1;
      U.uO.value.set(x / innerWidth, 1 - y / innerHeight);
      if (!REDUCED) burst(LOW ? 12 : 18, x, y);
      tween((v) => { U.uEdge.value = v; }, 0, 1, 0.15, 'out');
      await tween((v) => { U.uR.value = v; }, 0, maxR(), 0.62, 'io');
      if (g !== gen) return;
      U.uInv.value = 0; U.uR.value = 0; U.uEdge.value = 0;   // now fully covered: switch to "reveal" mode
    },
    /* The cover burns away from the lower middle, onto the new page. */
    async reveal() {
      const g = gen;
      U.uInv.value = 0; U.uShow.value = 1;
      U.uO.value.set(0.5, 0.35);
      // fling what's left toward the lens so nothing is lying over the new page once it's readable
      for (const it of items) { it.v.z += 7 + Math.random() * 6; it.v.y += 2; it.spin *= 1.5; }
      tween((v) => { U.uEdge.value = v; }, 0, 1, 0.12, 'out');
      await tween((v) => { U.uR.value = v; }, 0, maxR(), 0.72, 'in');
      if (g !== gen) return;
      hold = false; U.uShow.value = 0; U.uEdge.value = 0;
    },
  };
  return API;
}

window.STAGE = (!canvas || REDUCED) ? null : boot();
window.dispatchEvent(new Event('stage:ready'));
