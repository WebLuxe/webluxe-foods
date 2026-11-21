/* WebLuxe Foods: the WebGL stage.
   One full-screen canvas does two jobs:
   1. The intro: a wok fire lights up, real 3D ingredients (chillies, coriander, star anise, peppercorns,
      cinnamon, lime) are tossed into the air, time slows at the top of the toss, the camera pushes through
      them and the screen burns away from the middle onto the site.
   2. Tab transitions: the ink burns in from wherever you tapped (with a handful of ingredients thrown from
      your finger), the next page is drawn underneath, then it burns away again.
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

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
        // burn front: a circle whose edge is eaten away by noise
        float n = fbm(p*4.5 + vec2(0.0, -uTime*0.7));
        float e = length(p - o) + (n - 0.5)*0.34 - uR;
        float inside = (1.0 - smoothstep(-0.004, 0.004, e)) * step(0.0005, uR);
        float cover = mix(1.0 - inside, inside, uInv) * uShow;
        // ink: warm charcoal, soft glow, film grain
        vec3 col = vec3(0.071, 0.055, 0.045);
        col += vec3(0.17, 0.075, 0.02) * 0.55 * smoothstep(1.15, 0.0, length(vec2((vUv.x-0.5)*asp, vUv.y-0.3)));
        col += (hash(vUv*uRes + fract(uTime)*91.0) - 0.5) * 0.03;
        // wok fire licking up from the bottom
        if (uFire > 0.001) {
          vec2 fp = vec2(p.x*2.4, vUv.y*1.5 - uTime*1.25);
          float f = fbm(fp*2.0 + vec2(fbm(fp*3.1 + uTime*0.4)*1.1, 0.0));
          float fl = clamp(f*1.55 - vUv.y*(3.4 - uFire*1.0) - 0.12, 0.0, 1.0) * uFire;
          vec3 fc = mix(vec3(0.55, 0.04, 0.02), vec3(1.0, 0.55, 0.08), smoothstep(0.02, 0.4, fl));
          fc = mix(fc, vec3(1.0, 0.93, 0.62), smoothstep(0.45, 0.85, fl));
          col += fc * fl * 1.35;
        }
        // glowing ember at the burn front, charred just behind it
        float glow = uEdge * exp(-abs(e)*30.0);
        col = mix(col, col*0.35, uEdge * smoothstep(0.14, 0.0, abs(e)) * cover);
        col += mix(vec3(0.9, 0.06, 0.08), vec3(1.0, 0.78, 0.2), exp(-abs(e)*70.0)) * glow * 1.5;
        gl_FragColor = vec4(col, clamp(cover + glow*0.95, 0.0, 1.0));
      }`,
  });
  const coverScene = new THREE.Scene();
  coverScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), coverMat));
  const coverCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ------------------------------------------------------------ 3D ingredients */
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  cam.position.set(0, 0, 7);
  scene.add(new THREE.HemisphereLight(0xffe2c0, 0x1a0e08, 0.7));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(-3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9cc8ff, 1.1); rim.position.set(4, 2, -5); scene.add(rim);
  const fireLight = new THREE.PointLight(0xff7a1a, 0, 16, 1.4); fireLight.position.set(0, -3.2, 2.5); scene.add(fireLight);

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

  // Chilli: a tapered capsule with a curled tip and a green cap
  const chilliG = paint(bend(new THREE.CapsuleGeometry(0.11, 0.86, 6, 14), (x, y, z) => {
    const t = Math.min(1, Math.max(0, (y + 0.54) / 1.08)), k = 0.2 + 0.8 * Math.pow(t, 0.5);
    return [x * k + Math.pow(1 - t, 2.2) * 0.32, y, z * k];
  }), (x, y) => (y > 0.45 ? new THREE.Color(0x24601a) : new THREE.Color(0x9e0010)));
  // Coriander leaf: lobed outline, gently cupped
  const leafShape = new THREE.Shape();
  for (let k = 0; k <= 64; k++) {
    const a = (k / 64) * Math.PI * 2, r = 0.26 * (1 + 0.3 * Math.cos(3 * a)) * (1 + 0.09 * Math.cos(11 * a));
    k ? leafShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : leafShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const leafG = bend(new THREE.ShapeGeometry(leafShape, 3), (x, y) => [x, y, (x * x + y * y) * 0.9]);
  // Star anise: eight-pointed star, extruded
  const star = new THREE.Shape();
  for (let k = 0; k <= 16; k++) {
    const a = (k / 16) * Math.PI * 2, r = k % 2 ? 0.08 : 0.27;
    k ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(r, 0);
  }
  const anisG = new THREE.ExtrudeGeometry(star, { depth: 0.05, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.03, bevelSegments: 2 });
  anisG.center();
  // Peppercorn: a wrinkled little sphere
  const pepG = bend(new THREE.IcosahedronGeometry(0.075, 2), (x, y, z) => {
    const s = 1 + 0.12 * Math.sin(x * 90) * Math.sin(y * 80) * Math.sin(z * 70);
    return [x * s, y * s, z * s];
  });
  // Cinnamon: a rolled bark tube
  const cinnG = new THREE.CylinderGeometry(0.07, 0.07, 0.8, 12, 1, true);
  // Lime wheel
  const limeG = paint(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 28), (x, y) => {
    const r = Math.hypot(x, 0);
    return Math.abs(y) > 0.02 && r < 0.2 ? new THREE.Color(0xd9ec6a) : new THREE.Color(0x3f8f1f);
  });

  const std = (o) => new THREE.MeshStandardMaterial(o);
  const TYPES = [
    { g: chilliG, m: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15 }), w: 3.4, s: [0.85, 1.2] },
    { g: leafG, m: std({ color: 0x2b7a1f, roughness: 0.5, side: THREE.DoubleSide }), w: 3, s: [0.5, 0.8] },
    { g: anisG, m: std({ color: 0x6e2c12, roughness: 0.7 }), w: 1.6, s: [0.8, 1.1] },
    { g: pepG, m: std({ color: 0x2a1a12, roughness: 0.85 }), w: 5, s: [0.8, 1.4] },
    { g: cinnG, m: std({ color: 0x8f4b23, roughness: 0.75, side: THREE.DoubleSide }), w: 1.2, s: [0.8, 1.1] },
    { g: limeG, m: std({ vertexColors: true, roughness: 0.4 }), w: 1, s: [0.8, 1.05] },
  ];
  const CAP = LOW ? 150 : 260;
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
  const pickType = () => { let r = Math.random() * wsum; for (const t of TYPES) { if ((r -= t.w) <= 0) return t; } return TYPES[0]; };
  function spawn(at, pos, vel) {
    const t = pickType(), slot = t.next; t.next = (t.next + 1) % t.cap;
    const old = items.find((it) => it.t === t && it.slot === slot);
    if (old) items.splice(items.indexOf(old), 1);
    items.push({
      t, slot, at, age: 0,
      p: pos.clone(), v: vel.clone(),
      q: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6)),
      ax: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      spin: 2 + Math.random() * 7,
      s: t.s[0] + Math.random() * (t.s[1] - t.s[0]),
    });
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function toss(n, from = 0.35, spread = 0.9) {
    for (let i = 0; i < n; i++) {
      const sx = (Math.random() - 0.5) * 2;
      spawn(clock + from + Math.random() * spread,
        V(sx * 0.9, -4.4 - Math.random() * 0.6, (Math.random() - 0.5) * 2.4),
        V(sx * 1.9 + (Math.random() - 0.5) * 1.2, 7.6 + Math.random() * 3.2, (Math.random() - 0.5) * 2 + 0.4));
    }
  }
  function burst(n, x, y) {
    const ndc = V((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1, 0.5).unproject(cam);
    const dir = ndc.sub(cam.position).normalize();
    const at = cam.position.clone().add(dir.multiplyScalar(-cam.position.z / dir.z));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2.5 + Math.random() * 4;
      spawn(clock + Math.random() * 0.08, at, V(Math.cos(a) * sp, Math.sin(a) * sp + 2.5, (Math.random() - 0.2) * 3));
    }
  }

  /* ------------------------------------------------------------ sparks */
  const SN = LOW ? 110 : 220;
  const sparkTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,220,150,.9)'); g.addColorStop(1, 'rgba(255,120,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const sparkGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(SN * 3), sCol = new Float32Array(SN * 3), sp = [];
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3).setUsage(THREE.DynamicDrawUsage));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
    size: 0.09, map: sparkTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
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
    U.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
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
    fireLight.intensity = fire * (26 + Math.sin(clock * 23) * 5 + Math.sin(clock * 9.7) * 4);

    // ingredients
    TYPES.forEach((t) => { t.dirty = false; });
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (clock < it.at) continue;
      it.age += dt;
      it.v.y -= 7.2 * dt;
      it.v.multiplyScalar(1 - 0.12 * dt);
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
        if (fire > 0.15 && Math.random() < 0.18 * fire) {
          s.max = s.life = 0.8 + Math.random() * 1.4;
          s.x = (Math.random() - 0.5) * 5; s.y = -3.6; s.z = (Math.random() - 0.5) * 3;
          s.vx = (Math.random() - 0.5) * 0.8; s.vy = 1.6 + Math.random() * 2.6;
        } else { sPos[i * 3 + 1] = -99; continue; }
      }
      s.life -= real;
      s.x += (s.vx + Math.sin(clock * 3 + s.ph) * 0.5) * real; s.y += s.vy * real;
      const a = Math.max(0, s.life / s.max);
      sPos[i * 3] = s.x; sPos[i * 3 + 1] = s.y; sPos[i * 3 + 2] = s.z;
      sCol[i * 3] = 1 * a; sCol[i * 3 + 1] = 0.55 * a; sCol[i * 3 + 2] = 0.12 * a;
      liveSparks++;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.color.needsUpdate = true;

    renderer.clear();
    if (U.uShow.value > 0 || U.uEdge.value > 0) renderer.render(coverScene, coverCam);
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

  /* ------------------------------------------------------------ public API */
  let introT0 = 0, gen = 0;
  const API = {
    /* Fire up and throw the first toss. The cover is solid until exit(). */
    introStart() {
      U.uInv.value = 0; U.uR.value = 0; U.uEdge.value = 0; U.uShow.value = 1;
      cam.position.z = 7;
      hold = true; start();
      introT0 = clock;
      tween((v) => { fire = v; }, 0, 1, 0.9, 'out');
      if (!REDUCED) { toss(LOW ? 70 : 120, 0.3, 0.8); toss(LOW ? 30 : 60, 1.5, 0.9); }
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
      if (!REDUCED) burst(LOW ? 14 : 22, x, y);
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
