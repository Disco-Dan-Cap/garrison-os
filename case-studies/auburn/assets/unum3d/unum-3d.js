/* ── UNUM · the adaptive guitar case, in 3D ──────────────────────────────────────────────
   Modelled from Garrison's final renders (not the CNC mold CAD): a vacuum-formed shell in a
   fine pebbled satin black, a domed lid with a window running its length, three polished metal
   bands standing just off the body (two on the base, one on the lid), the middle band stepping
   out into a carry handle on both long sides, a barrel hinge along the back, and UNUM pressed
   into the bottom of the shell — as in the photo of the shell coming off the vacuum former.
   The guitar inside is modelled here from scratch. Everything is procedural: no model files,
   no image textures to download. Units are inches; y is up, z runs along the case. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ── dimensions ─────────────────────────────────────────────────────────────────────── */
const BODY = { w: 18.4, l: 45.2, r: 2.9 };
const TOP = 6.4, SEAM = 4.5;                 // overall height; base / lid split
const FB = 0.85, FT = 0.7;                   // bottom and lid-top fillets
const WALL = 0.3, FELT = 0.1, FLOOR = 0.8;   // shell wall, felt lining, floor height inside
const BAND = { t: 0.16, h: 1.05, gap: 0.28, r: 1.3 };
BAND.w = BODY.w + 2 * (BAND.gap + BAND.t / 2); BAND.l = BODY.l + 2 * (BAND.gap + BAND.t / 2);
const BAND_Y = [1.2, 3.05], LID_BAND_Y = 5.07;
const HANDLE = { depth: 0.8, flat: 9.4, ramp: 1.2 };
const SLOT = { w: 2.0, l: 42 };
const HINGE = { r: 0.2, len: 6, knuckles: 5, z: [-13, 13] };
HINGE.x = -(BAND.w / 2 + BAND.t / 2 + HINGE.r);
const LIDMAX = THREE.MathUtils.degToRad(104);
const LETTER_SCALE = 0.72, POCKET = 0.55;

const FELTS = {
  emerald: { base: '#08452e', sheen: '#1f7a55' },
  black: { base: '#141416', sheen: '#55565c' },
  cream: { base: '#d6c3a0', sheen: '#fff3dc' },
};

export async function initUnum3D(host, opts = {}) {
  const o = Object.assign({ base: 'assets/unum3d/', autoOpen: true, felt: 'emerald' }, opts);
  const fb = host.querySelector('.u3-fallback');
  const fail = () => { host.classList.add('failed'); if (fb) fb.style.display = 'block'; };
  if (!document.createElement('canvas').getContext('webgl2')) { fail(); return null; }
  let letters;
  try { letters = await (await fetch(o.base + 'letters.json')).json(); } catch (e) { console.error(e); fail(); return null; }

  /* ── renderer, light, camera ──────────────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const stage = host.querySelector('.u3-stage'); stage.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'pan-y';      // vertical swipes still scroll the page
  const ANISO = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture; scene.environmentIntensity = 1.05;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8188, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(24, 60, 30); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.03; key.shadow.radius = 5;
  Object.assign(key.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 10, far: 140 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe6edff, 0.8); rim.position.set(-34, 26, -40); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xfff4ea, 0.35); fill.position.set(-30, 10, 34); scene.add(fill);

  const camera = new THREE.PerspectiveCamera(30, 16 / 10, 1, 500);
  camera.position.set(58, 50, 66);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-1.5, 3.4, 0); controls.enableDamping = true; controls.dampingFactor = 0.07;
  controls.enableZoom = false; controls.enablePan = false;
  controls.minPolarAngle = 0.12; controls.maxPolarAngle = Math.PI * 0.47;
  controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches; controls.autoRotateSpeed = 0.5;

  /* ── procedural textures ──────────────────────────────────────────────────────────── */
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function tex(c, inches, srgb = false) {
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / inches, 1 / inches); t.anisotropy = ANISO; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  // draw f at (x,y) and its wrapped copies near the edges, so the tile repeats seamlessly
  function tiled(N, x, y, m, f) { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) if (x + dx > -m && x + dx < N + m && y + dy > -m && y + dy < N + m) f(x + dx, y + dy); }

  // pebbled satin plastic: soft blobs → bump + roughness
  const [pc, pg] = canvas(512); pg.fillStyle = '#808080'; pg.fillRect(0, 0, 512, 512);
  { const r = rng(7); for (let i = 0; i < 11000; i++) {
      const x = r() * 512, y = r() * 512, rad = 2.2 + r() * 3.6, v = Math.round(90 + r() * 120);
      tiled(512, x, y, rad, (X, Y) => { const g = pg.createRadialGradient(X, Y, 0, X, Y, rad);
        g.addColorStop(0, `rgba(${v},${v},${v},.55)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`); pg.fillStyle = g; pg.fillRect(X - rad, Y - rad, rad * 2, rad * 2); });
  } }
  const pebble = tex(pc, 5);

  // felt: fine fibres, the same pattern for colour and for bump
  function feltCanvas(fillHex) {
    const [c, g] = canvas(512); g.fillStyle = fillHex; g.fillRect(0, 0, 512, 512);
    const r = rng(21);
    for (let i = 0; i < 16000; i++) {
      const x = r() * 512, y = r() * 512, a = r() * Math.PI * 2, len = 3 + r() * 9, light = r() < 0.5, al = 0.05 + r() * 0.12;
      g.strokeStyle = light ? `rgba(255,255,255,${al})` : `rgba(0,0,0,${al * 1.2})`; g.lineWidth = 0.5 + r() * 0.7;
      tiled(512, x, y, len, (X, Y) => { g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(X + Math.cos(a + 0.9) * len * 0.5, Y + Math.sin(a + 0.9) * len * 0.5, X + Math.cos(a) * len, Y + Math.sin(a) * len); g.stroke(); });
    }
    return c;
  }
  const feltBump = tex(feltCanvas('#808080'), 4);
  const feltMaps = {};
  const feltMap = (n) => feltMaps[n] || (feltMaps[n] = tex(feltCanvas(FELTS[n].base), 4, true));

  // wood: long grain lines over a base colour
  function woodCanvas(w, h, base, line, n, wav, seed) {
    const [c, g] = canvas(w, h); g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x0 = r() * w, al = 0.06 + r() * 0.22, ph = r() * 6;
      g.strokeStyle = line.replace('A', al.toFixed(3)); g.lineWidth = 0.6 + r() * 1.8; g.beginPath();
      for (let y = 0; y <= h; y += 8) { const x = x0 + Math.sin(y / h * wav + ph) * 3 + Math.sin(y / 37 + ph) * 0.8; y ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    return [c, g];
  }

  /* ── materials ────────────────────────────────────────────────────────────────────── */
  const shell = new THREE.MeshPhysicalMaterial({ color: 0x060607, roughness: 0.5, roughnessMap: pebble, bumpMap: pebble, bumpScale: 0.32,
    clearcoat: 0.45, clearcoatRoughness: 0.3, envMapIntensity: 0.85, side: THREE.DoubleSide });
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xa9adb3, metalness: 1, roughness: 0.12, anisotropy: 0.3, envMapIntensity: 0.75, side: THREE.DoubleSide });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8eaed, metalness: 1, roughness: 0.1 });
  const felt = new THREE.MeshPhysicalMaterial({ map: feltMap(o.felt), bumpMap: feltBump, bumpScale: 1.2, roughness: 1, metalness: 0,
    sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(FELTS[o.felt].sheen), side: THREE.DoubleSide });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.12, ior: 1.49,
    transparent: true, opacity: 1, side: THREE.DoubleSide });

  /* ── geometry helpers ─────────────────────────────────────────────────────────────── */
  // outline: closed loop in the (x,z) plane, counter-clockwise, each point with an outward miter normal
  function withNormals(pts, sharpDeg = 26) {
    const n = pts.length;
    return pts.map((p, i) => {
      if (p.nx !== undefined) return p;
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      let t1x = p.x - a.x, t1z = p.z - a.z; const l1 = Math.hypot(t1x, t1z) || 1; t1x /= l1; t1z /= l1;
      let t2x = b.x - p.x, t2z = b.z - p.z; const l2 = Math.hypot(t2x, t2z) || 1; t2x /= l2; t2z /= l2;
      const n1x = t1z, n1z = -t1x, n2x = t2z, n2z = -t2x, dot = n1x * n2x + n1z * n2z, k = 1 / Math.max(0.35, 1 + dot);
      return { x: p.x, z: p.z, nx: (n1x + n2x) * k, nz: (n1z + n2z) * k, sharp: dot < Math.cos(sharpDeg * Math.PI / 180) };
    });
  }
  function rrOutline(w, l, r, seg = 12, handle = null) {
    const hx = w / 2 - r, hz = l / 2 - r, pts = [];
    const corner = (cx, cz, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (i / seg) * Math.PI / 2; pts.push({ x: cx + r * Math.cos(a), z: cz + r * Math.sin(a), nx: Math.cos(a), nz: Math.sin(a) }); } };
    const side = (x0, dir) => { // the handle: the band steps out on a long side, with angled ramps
      const s = Math.sign(x0), f = handle.flat / 2, e = f + handle.ramp;
      [[-e, 0], [-f, 1], [f, 1], [e, 0]].forEach(([z, out]) => pts.push({ x: x0 + s * out * handle.depth, z: z * dir }));
    };
    corner(hx, hz, 0); corner(-hx, hz, Math.PI / 2);
    if (handle) side(-w / 2, -1);
    corner(-hx, -hz, Math.PI); corner(hx, -hz, Math.PI * 1.5);
    if (handle) side(w / 2, 1);
    return withNormals(pts);
  }
  const stadium = (w, l) => rrOutline(w, l, w / 2 - 0.002, 14);
  const off = (p, d) => [p.x + d * p.nx, p.z + d * p.nz];
  // sweep a (d, y) profile around an outline: d offsets along the outline normal
  function sweep(outline, profile, mat, closed = false) {
    const prof = closed ? [...profile, profile[0]] : profile, K = prof.length;
    const tv = [0]; for (let k = 1; k < K; k++) tv.push(tv[k - 1] + Math.hypot(prof[k][0] - prof[k - 1][0], prof[k][1] - prof[k - 1][1]));
    const cols = [], N = outline.length; let s = 0;
    for (let i = 0; i <= N; i++) {
      const p = outline[i % N]; if (i) { const q = outline[i - 1]; s += Math.hypot(p.x - q.x, p.z - q.z); }
      cols.push({ p, s, join: i > 0 }); if (p.sharp && i < N) cols.push({ p, s, join: false });
    }
    const pos = [], uv = [], idx = [];
    cols.forEach((c) => prof.forEach(([d, y], k) => { const [x, z] = off(c.p, d); pos.push(x, y, z); uv.push(c.s, tv[k]); }));
    for (let c = 1; c < cols.length; c++) if (cols[c].join) for (let k = 0; k < K - 1; k++) {
      const a = (c - 1) * K + k, b = c * K + k; idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    if (!outline[0].sharp) { // weld the shading seam where the loop closes
      const nA = g.attributes.normal, last = (cols.length - 1) * K;
      for (let k = 0; k < K; k++) { const v = new THREE.Vector3().fromBufferAttribute(nA, k).add(new THREE.Vector3().fromBufferAttribute(nA, last + k)).normalize(); nA.setXYZ(k, v.x, v.y, v.z); nA.setXYZ(last + k, v.x, v.y, v.z); }
    }
    return mesh(g, mat);
  }
  const toPath = (P, outline, d) => { outline.forEach((p, i) => { const [x, z] = off(p, d); i ? P.lineTo(x, -z) : P.moveTo(x, -z); }); P.closePath(); return P; };
  function cap(outline, d, y, mat, holes = []) {
    const sh = toPath(new THREE.Shape(), outline, d); holes.forEach(([ol, hd]) => sh.holes.push(toPath(new THREE.Path(), ol, hd)));
    const g = new THREE.ShapeGeometry(sh, 1); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return mesh(g, mat);
  }
  function mesh(g, mat) { const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; }
  const arc = (cx, cy, r, a0, a1, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  function rrProfile(t, h, rho = 0.03) { // a flat bar's cross-section, start mid outer face
    return [[t / 2, h / 2], ...arc(t / 2 - rho, h - rho, rho, 0, 90, 3), ...arc(-t / 2 + rho, h - rho, rho, 90, 180, 3),
      ...arc(-t / 2 + rho, rho, rho, 180, 270, 3), ...arc(t / 2 - rho, rho, rho, 270, 360, 3)];
  }
  const add = (parent, ...kids) => { kids.forEach((k) => parent.add(k)); return parent; };

  /* ── the case ─────────────────────────────────────────────────────────────────────── */
  const flipper = new THREE.Group(); scene.add(flipper);
  const root = new THREE.Group(); flipper.add(root);
  const OB = rrOutline(BODY.w, BODY.l, BODY.r);

  // UNUM, pressed into the bottom of the shell (letters from Garrison's logo file)
  const letterOutlines = letters.map((Lt) => {
    let pts = Lt.o.map(([x, z]) => ({ x: x * LETTER_SCALE, z: -z * LETTER_SCALE }));   // mirrored along the case so it reads UNUM once flipped (checked top-down)
    let area = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; area += p.x * q.z - q.x * p.z; });
    if (area < 0) pts.reverse();
    return withNormals(pts, 32);
  });

  // base shell: big soft bottom edge, a crisp lip at the seam, inner wall
  const base = new THREE.Group(); root.add(base);
  add(base,
    sweep(OB, [...arc(-FB, FB, FB, 270, 360, 10), [0, SEAM - 0.06], ...arc(-0.06, SEAM - 0.06, 0.06, 0, 90, 3),
      ...arc(-WALL + 0.06, SEAM - 0.06, 0.06, 90, 180, 3), [-WALL, FLOOR]], shell),
    cap(OB, -FB, 0, shell, letterOutlines.map((L) => [L, 0.1])),
    sweep(OB, [[-WALL, SEAM - 0.12], [-WALL - FELT, SEAM - 0.12]], felt),
    sweep(OB, [[-WALL - FELT, SEAM - 0.12], [-WALL - FELT, FLOOR]], felt),
    cap(OB, -WALL - FELT, FLOOR, felt));
  letterOutlines.forEach((L) => add(base,
    sweep(L, [...arc(0.1, 0.1, 0.1, 270, 180, 4), [0, POCKET]], shell),
    cap(L, 0, POCKET, shell)));

  // bands: flat polished bars on small posts; the middle one carries the handle
  function band(outline, y, posts) {
    const g = new THREE.Group(); g.position.y = y;
    g.add(sweep(outline, rrProfile(BAND.t, BAND.h), metal, true));
    const post = new THREE.CylinderGeometry(0.16, 0.16, BAND.gap + 0.12, 16);
    posts.forEach(([x, z, alongZ]) => { const m = mesh(post, shell); m.rotation[alongZ ? 'x' : 'z'] = Math.PI / 2; m.position.set(x, BAND.h / 2, z); g.add(m); });
    return g;
  }
  const px = BODY.w / 2 + BAND.gap / 2, pz = BODY.l / 2 + BAND.gap / 2;
  const postsAt = (zs) => [[0, pz, true], [0, -pz, true], ...zs.flatMap((z) => [[px, z], [-px, z]])];
  const OBand = rrOutline(BAND.w, BAND.l, BAND.r), OHandle = rrOutline(BAND.w, BAND.l, BAND.r, 12, HANDLE);
  const band0 = band(OBand, BAND_Y[0], postsAt([-15, 0, 15]));
  const band1 = band(OHandle, BAND_Y[1], postsAt([-16, 16]));
  root.add(band0, band1);

  // lid: domed top with the window slot, felt underside, its own band, hinged at the back
  const lidPivot = new THREE.Group(); lidPivot.position.set(HINGE.x, SEAM, 0); root.add(lidPivot);
  const lid = new THREE.Group(); lid.position.set(-HINGE.x, -SEAM, 0); lidPivot.add(lid);
  const UNDER = TOP - 0.3, OS = stadium(SLOT.w, SLOT.l);
  add(lid,
    sweep(OB, [[-WALL, UNDER], [-WALL, SEAM + 0.06], ...arc(-WALL + 0.06, SEAM + 0.06, 0.06, 180, 270, 3),
      ...arc(-0.06, SEAM + 0.06, 0.06, 270, 360, 3), [0, TOP - FT], ...arc(-FT, TOP - FT, FT, 0, 90, 10)], shell),
    cap(OB, -FT, TOP, shell, [[OS, 0.08]]),
    sweep(OS, [...arc(0.08, TOP - 0.08, 0.08, 90, 180, 4), [0, UNDER]], shell),
    cap(OB, -WALL - FELT, UNDER - 0.01, felt, [[OS, 0]]),
    sweep(OB, [[-WALL, SEAM + 0.12], [-WALL - FELT, SEAM + 0.12]], felt),
    sweep(OB, [[-WALL - FELT, SEAM + 0.12], [-WALL - FELT, UNDER]], felt),
    cap(OS, 0, TOP - 0.16, glass), cap(OS, 0, TOP - 0.24, glass));
  const lidBand = band(OBand, LID_BAND_Y, postsAt([-15, 0, 15])); lid.add(lidBand);

  // barrel hinges on the back: alternating knuckles, each on a short leaf into its shell
  const knLen = HINGE.len / HINGE.knuckles, kn = new THREE.CylinderGeometry(HINGE.r, HINGE.r, knLen - 0.05, 24);
  const leafW = -HINGE.x - BODY.w / 2 + 0.1, leaf = new THREE.BoxGeometry(leafW, 0.28, knLen - 0.05);
  HINGE.z.forEach((zc) => {
    for (let i = 0; i < HINGE.knuckles; i++) {
      const z = zc - HINGE.len / 2 + knLen * (i + 0.5), onLid = i % 2 === 1;
      const k = mesh(kn, chrome); k.rotation.x = Math.PI / 2;
      const lf = mesh(leaf, chrome); lf.position.x = HINGE.x + leafW / 2;
      if (onLid) { k.position.set(HINGE.x, SEAM, z); lf.position.set(HINGE.x + leafW / 2, SEAM + 0.2, z); lid.add(k, lf); }
      else { k.position.set(HINGE.x, SEAM, z); lf.position.set(HINGE.x + leafW / 2, SEAM - 0.2, z); base.add(k, lf); }
    }
    const pin = mesh(new THREE.CylinderGeometry(0.06, 0.06, HINGE.len + 0.2, 12), chrome); pin.rotation.x = Math.PI / 2; pin.position.set(HINGE.x, SEAM, zc); base.add(pin);
  });

  /* ── the guitar (modelled here: spruce top, rosewood back & sides, mahogany neck) ──── */
  const guitar = buildGuitar(); guitar.position.set(0, FLOOR + 0.02, 19.0); base.add(guitar);

  function buildGuitar() {
    const g = new THREE.Group();
    const BL = 18.5, DEPTH = 3.1, Y0 = DEPTH;            // body length and depth; Y0 = top of the soundboard
    // body outline: a smooth spline through half-widths, mirrored
    const half = [[0, 0], [3.4, 0.25], [5.7, 1.3], [6.75, 3.2], [7.0, 5.2], [6.6, 7.4], [5.2, 9.3], [4.35, 10.6], [4.6, 11.9],
      [5.25, 13.7], [5.3, 15.4], [4.6, 17.2], [2.6, 18.3], [1.15, 18.5]];
    const right = new THREE.SplineCurve(half.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(80);
    const outline = [...right, ...right.slice().reverse().map((p) => new THREE.Vector2(-p.x, p.y))];
    const bodyShape = new THREE.Shape(outline);

    // spruce top, painted with soundhole, rosette and pickguard
    const [tc, tg] = woodCanvas(512, 640, '#e4c38c', 'rgba(150,95,40,A)', 260, 2.5, 3);
    const P = (x, y) => [(x + 7.5) / 15 * 512, (1 - y / 18.5) * 640], R = (r) => r / 15 * 512;
    const [sx, sy] = P(0, 11.4);
    tg.fillStyle = 'rgba(60,30,15,.85)'; tg.beginPath(); // pickguard, treble side
    tg.moveTo(...P(1.6, 9.2)); tg.bezierCurveTo(...P(4.6, 8.4), ...P(5.3, 11.8), ...P(3.4, 13.4)); tg.bezierCurveTo(...P(2.6, 14.1), ...P(2.2, 13.8), ...P(2.3, 13.3)); tg.closePath(); tg.fill();
    [[2.45, '#2a1810'], [2.3, '#e9dcc4'], [2.18, '#2a1810'], [2.08, '#6b4a2a'], [1.98, '#2a1810'], [1.9, '#0d0805']].forEach(([r, c]) => { tg.fillStyle = c; tg.beginPath(); tg.arc(sx, sy, R(r), 0, Math.PI * 2); tg.fill(); });
    const topTex = new THREE.CanvasTexture(tc); topTex.colorSpace = THREE.SRGBColorSpace; topTex.anisotropy = ANISO;
    topTex.repeat.set(1 / 15, 1 / 18.5); topTex.offset.set(0.5, 0);
    const [rc] = woodCanvas(512, 512, '#4a2416', 'rgba(20,8,4,A)', 220, 4, 9);
    const rosewood = new THREE.MeshPhysicalMaterial({ map: tex(rc, 9, true), roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.12 });
    const spruce = new THREE.MeshPhysicalMaterial({ map: topTex, roughness: 0.38, clearcoat: 0.9, clearcoatRoughness: 0.1 });
    const [mc] = woodCanvas(256, 512, '#7a4526', 'rgba(40,18,8,A)', 90, 3, 5);
    const mahogany = new THREE.MeshPhysicalMaterial({ map: tex(mc, 6, true), roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.15 });
    const ivory = new THREE.MeshStandardMaterial({ color: 0xefe7d6, roughness: 0.35 });
    const bronze = new THREE.MeshStandardMaterial({ color: 0xc9a46a, metalness: 1, roughness: 0.28 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xdfe2e6, metalness: 1, roughness: 0.22 });

    const ext = (shape, depth, mats, bevel = 0) => {
      const geo = new THREE.ExtrudeGeometry(shape, { depth, curveSegments: 32, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3 });
      geo.rotateX(-Math.PI / 2); return mesh(geo, mats);
    };
    const body = ext(bodyShape, DEPTH - 0.12, [spruce, rosewood], 0.06); body.position.y = 0.06; g.add(body);

    // neck, fretboard (frets + dots painted), headstock
    const NUT = 33, BODYJOIN = 18.2, FBEND = 13.9;
    const trap = (y0, w0, y1, w1) => new THREE.Shape([new THREE.Vector2(-w0 / 2, y0), new THREE.Vector2(w0 / 2, y0), new THREE.Vector2(w1 / 2, y1), new THREE.Vector2(-w1 / 2, y1)]);
    const neck = ext(trap(BODYJOIN - 0.6, 2.2, NUT, 1.8), 0.85, mahogany, 0.05); neck.position.y = Y0 - 0.8; g.add(neck);
    const [fc, fg] = woodCanvas(128, 1024, '#24150e', 'rgba(0,0,0,A)', 40, 2, 11);
    const fy = (y) => (1 - (y - FBEND) / (NUT - FBEND)) * 1024, SCALE = 25.4;
    fg.fillStyle = '#d7dade'; for (let n = 1; n <= 20; n++) { const d = SCALE - SCALE / Math.pow(2, n / 12), y = fy(NUT - d); fg.fillRect(0, y - 1.5, 128, 3); }
    const dots = [3, 5, 7, 9, 15, 17]; fg.fillStyle = '#efe6d2';
    const mid = (n) => NUT - (SCALE - SCALE / Math.pow(2, (n - 0.5) / 12));
    dots.forEach((n) => { fg.beginPath(); fg.arc(64, fy(mid(n)), 7, 0, Math.PI * 2); fg.fill(); });
    [44, 84].forEach((x) => { fg.beginPath(); fg.arc(x, fy(mid(12)), 7, 0, Math.PI * 2); fg.fill(); });
    const fbTex = new THREE.CanvasTexture(fc); fbTex.colorSpace = THREE.SRGBColorSpace; fbTex.anisotropy = ANISO;
    fbTex.repeat.set(1 / 2.4, 1 / (NUT - FBEND)); fbTex.offset.set(0.5, -FBEND / (NUT - FBEND));
    const fretboard = ext(trap(FBEND, 2.3, NUT, 1.75), 0.24, [new THREE.MeshStandardMaterial({ map: fbTex, roughness: 0.6 }), mahogany]);
    fretboard.position.y = Y0 + 0.02; g.add(fretboard);
    const head = new THREE.Shape(); head.moveTo(-0.95, NUT); head.lineTo(0.95, NUT); head.lineTo(1.55, NUT + 1.2); head.lineTo(1.55, NUT + 6.2);
    head.quadraticCurveTo(0, NUT + 6.8, -1.55, NUT + 6.2); head.lineTo(-1.55, NUT + 1.2); head.closePath();
    const hs = ext(head, 0.55, [rosewood, mahogany], 0.04); hs.position.y = Y0 - 0.45; g.add(hs);
    const nut = mesh(new THREE.BoxGeometry(1.8, 0.14, 0.22), ivory); nut.position.set(0, Y0 + 0.33, -NUT); g.add(nut);

    // bridge, saddle, pins
    const bridge = mesh(new THREE.BoxGeometry(5.6, 0.32, 1.25), rosewood); bridge.position.set(0, Y0 + 0.16, -4.6); g.add(bridge);
    const saddle = mesh(new THREE.BoxGeometry(2.9, 0.16, 0.12), ivory); saddle.position.set(0, Y0 + 0.4, -4.95); g.add(saddle);
    const pinGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12);
    for (let i = 0; i < 6; i++) { const p = mesh(pinGeo, ivory); p.position.set(-1.05 + i * 0.42, Y0 + 0.36, -4.3); g.add(p); }

    // tuners: posts on the face, buttons out the sides
    const post = new THREE.CylinderGeometry(0.11, 0.11, 0.35, 12), btn = new THREE.CylinderGeometry(0.3, 0.3, 0.16, 20), shaft = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8);
    const posts = [];
    for (let i = 0; i < 6; i++) {
      const sdir = i < 3 ? -1 : 1, z = -(NUT + 1.9 + (i % 3) * 1.55), x = sdir * 1.0;
      const p = mesh(post, steel); p.position.set(x, Y0 + 0.25, z); g.add(p); posts.push(new THREE.Vector3(x, Y0 + 0.36, z));
      const s = mesh(shaft, steel); s.rotation.z = Math.PI / 2; s.position.set(sdir * 1.8, Y0 - 0.18, z); g.add(s);
      const b = mesh(btn, ivory); b.rotation.z = Math.PI / 2; b.position.set(sdir * 2.15, Y0 - 0.18, z); g.add(b);
    }
    // strings: saddle → nut → tuner post; four wound, two plain
    const between = (a, b, r, mat) => { const d = b.clone().sub(a), m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), mat);
      m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = false; return m; };
    for (let i = 0; i < 6; i++) {
      const sx = -1.05 + i * 0.42, nx = -0.68 + i * 0.272, r = 0.034 - i * 0.004, mat = i < 4 ? bronze : steel;
      const a = new THREE.Vector3(sx, Y0 + 0.5, -4.95), b = new THREE.Vector3(nx, Y0 + 0.42, -NUT);
      g.add(between(a, b, r, mat), between(b, posts[i], r, mat));
    }
    return g;
  }

  /* ── ground: soft contact shadow + the key light's shadow ─────────────────────────── */
  const [sc, sg] = canvas(256, 512); sg.filter = 'blur(16px)'; sg.fillStyle = 'rgba(0,0,0,.62)';
  { const u = 256 / (BAND.w + 14), v = 512 / (BAND.l + 14), w = BAND.w * u, h = BAND.l * v; sg.beginPath(); sg.roundRect((256 - w) / 2, (512 - h) / 2, w, h, 26); sg.fill(); }
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(BAND.w + 14, BAND.l + 14), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), color: 0x000000, transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.01; scene.add(contact);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.14 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  /* ── state + animation ────────────────────────────────────────────────────────────── */
  let lidT = 0, lidTo = 0, exT = 0, exTo = 0, flT = 0, flTo = 0, running = false, visible = false;
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (t) => t * t * (3 - 2 * t);
  const EXPLODE = [[band0, 3.4], [band1, 6.6], [lidPivot, 10.8], [lidBand, 2.6]];
  EXPLODE.forEach(([g]) => (g.userData.y0 = g.position.y));
  function apply() {
    EXPLODE.forEach(([g, dy]) => (g.position.y = g.userData.y0 + dy * smooth(exT)));
    lidPivot.rotation.z = LIDMAX * smooth(lidT) * (1 - exT);
    const f = smooth(flT);                       // roll over the long axis to show the bottom
    flipper.rotation.z = Math.PI * f; flipper.position.y = TOP / 2 + Math.sin(Math.PI * flT) * 10.5; root.position.y = -TOP / 2;
    contact.material.opacity = 1 - Math.sin(Math.PI * flT) * 0.75;
    const ty = 3.4 + 8 * smooth(exT) + 4 * Math.sin(Math.PI * flT), dy = ty - controls.target.y;  // keep the camera on it
    if (Math.abs(dy) > 1e-4) { controls.target.y += dy; camera.position.y += dy; }
  }
  function render() { apply(); renderer.render(scene, camera); }
  function tick() {
    if (!running) return;
    lidT = lerp(lidT, lidTo, 0.07); exT = lerp(exT, exTo, 0.065); flT = lerp(flT, flTo, 0.05);
    controls.update(); render(); requestAnimationFrame(tick);
  }
  function start() { if (!running && visible) { running = true; requestAnimationFrame(tick); } }
  function resize() {
    const r = stage.getBoundingClientRect(); if (!r.width) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height;
    camera.fov = r.width / r.height < 1.2 ? 36 : 30; camera.updateProjectionMatrix(); render();
  }
  new ResizeObserver(resize).observe(host); resize();

  /* ── controls ─────────────────────────────────────────────────────────────────────── */
  const $ = (s) => host.querySelector(s);
  const btnLid = $('[data-u3="lid"]'), btnEx = $('[data-u3="explode"]'), btnFlip = $('[data-u3="flip"]');
  const press = (b, on, a, z) => { if (!b) return; b.textContent = on ? a : z; b.setAttribute('aria-pressed', String(on)); };
  function setLid(open) { if (open) { setExplode(false); setFlip(false); } lidTo = open ? 1 : 0; press(btnLid, open, 'Close lid', 'Open lid'); start(); }
  function setExplode(on) { if (on) setFlip(false); exTo = on ? 1 : 0; press(btnEx, on, 'Assemble', 'Explode'); start(); }
  function setFlip(on) { if (on) { lidTo = 0; press(btnLid, false, 'Close lid', 'Open lid'); exTo = 0; press(btnEx, false, 'Assemble', 'Explode'); } flTo = on ? 1 : 0; press(btnFlip, on, 'Flip back', 'Flip over'); start(); }
  btnLid && btnLid.addEventListener('click', () => setLid(lidTo < 0.5));
  btnEx && btnEx.addEventListener('click', () => setExplode(exTo < 0.5));
  btnFlip && btnFlip.addEventListener('click', () => setFlip(flTo < 0.5));
  host.querySelectorAll('[data-felt]').forEach((b) => b.addEventListener('click', () => {
    const n = b.dataset.felt; if (!FELTS[n]) return;
    felt.map = feltMap(n); felt.sheenColor.set(FELTS[n].sheen); felt.needsUpdate = true;
    host.querySelectorAll('[data-felt]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (lidTo < 0.5) setLid(true);   // show the lining you just picked
    start(); render();
  }));

  // a click on the case (not a drag) opens or closes it
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; controls.autoRotate = false; host.classList.add('touched'); });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; }
    down = null; const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(flipper, true).length) { if (flTo > 0.5) setFlip(false); else setLid(lidTo < 0.5); }
  });
  controls.addEventListener('start', start);

  let seen = false;
  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible) { start(); if (!seen && o.autoOpen) { seen = true; setTimeout(() => setLid(true), 1100); } }
    else running = false;
  }, { threshold: 0.25 }).observe(host);

  host.classList.add('ready'); render();
  const settle = () => { lidT = lidTo; exT = exTo; flT = flTo; controls.update(); render(); };   // jump to the end state (tests)
  return { settle, open: () => setLid(true), close: () => setLid(false), explode: setExplode, flip: setFlip, scene, camera, renderer, controls };
}
