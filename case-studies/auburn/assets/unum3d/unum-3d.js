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

  /* ── the guitars (modelled here) and the adjustable interior ─────────────────────────
     Both guitars lie with the butt toward +z; shape y ("sy", inches from the butt) maps to world z = ZB - sy. */
  const ZB = 19.6;
  const between = (a, b, r, mat) => { const d = b.clone().sub(a), m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = false; return m; };
  const extrude = (shape, depth, mats, bevel = 0, curve = 32) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, curveSegments: curve, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4 });
    geo.rotateX(-Math.PI / 2); return mesh(geo, mats);
  };
  const GUITARS = { acoustic: buildAcoustic(), electric: buildElectric() };
  Object.values(GUITARS).forEach((g) => { g.position.set(0, FLOOR + 0.02, ZB); base.add(g); });
  GUITARS.electric.visible = false;
  // how far the body reaches to each side at a given distance from the butt
  function reach(outline, sy) {
    let L = 0, R = 0; const n = outline.length;
    for (let i = 0; i < n; i++) { const a = outline[i], b = outline[(i + 1) % n];
      if ((a.y - sy) * (b.y - sy) <= 0 && a.y !== b.y) { const x = a.x + (sy - a.y) / (b.y - a.y) * (b.x - a.x); R = Math.max(R, x); L = Math.max(L, -x); } }
    return [L, R];
  }

  /* the adjustable interior: full-width slots with white U end caps, a lengthwise slot at the
     headstock end, and felt-sleeved rods that slide in and lock against whatever guitar is in it */
  const ROD_R = 0.62, SLOT_W = 0.42, SLOT_X = 8.35, CAP_L = 4.0, HEAD_SLOT = [-21.95, -15.4];
  const ROWS = [-0.75, 6.0, 10.6, 13.4, 16.6];             // sy of each cross slot (the first sits below the butt)
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf3f3f0, roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.2 });
  const slotDark = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.8 });
  const interior = new THREE.Group(); base.add(interior);
  function uCap(len) { // U-shaped liner: rounded closed end at local -x (the wall), open at 0 toward the middle
    const w = 1.3, sw = SLOT_W, r = w / 2, ri = sw / 2, sh = new THREE.Shape();
    sh.moveTo(0, r); sh.lineTo(-len + r, r); sh.absarc(-len + r, 0, r, Math.PI / 2, Math.PI * 1.5, false); sh.lineTo(0, -r);
    sh.lineTo(0, -ri); sh.lineTo(-len + r, -ri); sh.absarc(-len + r, 0, ri, Math.PI * 1.5, Math.PI / 2, true); sh.lineTo(0, ri); sh.closePath();
    const m = extrude(sh, 0.05, white, 0.025, 16); return m;
  }
  function slotStrip(w, l) { const ol = rrOutline(w, l, Math.min(w, l) / 2 - 0.002, 8); return cap(ol, 0, FLOOR + 0.004, slotDark); }
  ROWS.forEach((sy) => {
    const z = ZB - sy, strip = slotStrip(SLOT_X * 2, SLOT_W); strip.position.z = z; interior.add(strip);
    [-1, 1].forEach((side) => { const c = uCap(CAP_L); c.rotation.y = side < 0 ? 0 : Math.PI; c.position.set(side * (SLOT_X - CAP_L), FLOOR + 0.006, z); interior.add(c); });
  });
  { const len = HEAD_SLOT[1] - HEAD_SLOT[0], strip = slotStrip(SLOT_W, len); strip.position.z = (HEAD_SLOT[0] + HEAD_SLOT[1]) / 2; interior.add(strip);
    const c = uCap(3.4); c.rotation.y = -Math.PI / 2; c.position.set(0, FLOOR + 0.006, HEAD_SLOT[0] + 3.4); interior.add(c); }

  // the rods: a felt sleeve over a post, soft crown on top, white washer at the base
  const sleeve = new THREE.LatheGeometry([[0, 0], [0.58, 0], [0.62, 0.25], [0.63, 3.2], [0.6, 3.55], [0.5, 3.8], [0.3, 3.95], [0.08, 4.0], [0, 4.0]].map(([x, y]) => new THREE.Vector2(x, y)), 40);
  const washer = new THREE.CylinderGeometry(0.84, 0.86, 0.1, 40);
  const rods = [];
  function rod(axis, rest, fixed, clampOf) {   // axis 'x' (cross slot) or 'z' (head slot)
    const g = new THREE.Group(); const sl = mesh(sleeve, felt); const w = mesh(washer, white); w.position.y = 0.05;
    g.add(w, sl); g.position.y = FLOOR + 0.01; interior.add(g);
    const r = { g, axis, rest, fixed, clampOf, v: rest }; rods.push(r); return r;
  }
  const clampSide = (sy, side) => (name) => {
    if (sy < 0) return side * 1.7;                                   // below the butt: pinch it from either side
    const u = GUITARS[name].userData, [L, R] = reach(u.outline, sy);
    let ext = side < 0 ? L : R;
    const [y0, w0, y1, w1] = u.neck;   // past the body on this side, the rod comes in to the neck instead
    if (sy >= y0 && sy <= y1) ext = Math.max(ext, (w0 + (w1 - w0) * (sy - y0) / (y1 - y0)) / 2);
    return side * Math.min(SLOT_X - ROD_R - 0.1, ext + ROD_R + 0.04);
  };
  ROWS.forEach((sy) => [-1, 1].forEach((side) => rod('x', side * (SLOT_X - ROD_R - 0.1), ZB - sy, clampSide(sy, side))));
  rod('z', HEAD_SLOT[0] + ROD_R + 0.08, 0, (name) => ZB - GUITARS[name].userData.tip - ROD_R - 0.05);

  function buildAcoustic() {
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
    for (let i = 0; i < 6; i++) {
      const sx = -1.05 + i * 0.42, nx = -0.68 + i * 0.272, r = 0.034 - i * 0.004, mat = i < 4 ? bronze : steel;
      const a = new THREE.Vector3(sx, Y0 + 0.5, -4.95), b = new THREE.Vector3(nx, Y0 + 0.42, -NUT);
      g.add(between(a, b, r, mat), between(b, posts[i], r, mat));
    }
    g.userData = { outline, tip: NUT + 6.8, neck: [BODYJOIN - 0.6, 2.3, NUT, 1.75] };
    return g;
  }


  function buildElectric() {   // a road-worn 3-tone sunburst Stratocaster: mint guard, aged plastics, rosewood board
    const g = new THREE.Group();
    const D = 1.75, Y0 = D, SADDLE = 5.5, SCALE = 25.5, NUT = SADDLE + SCALE, FB0 = 13.05;
    const P = (pts, n) => new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal').getPoints(n).map((v) => new THREE.Vector2(v.x, v.y));
    // body outline traced from the reference photo; x+ is the treble side, sy from the butt
    // body outline traced from Garrison's reference photo (lower bout scaled to 12.75 in)
    const outline = P([[-4.59, 17.61], [-4.80, 17.47], [-4.97, 17.28], [-5.12, 17.06], [-5.27, 16.74], [-5.36, 16.45], [-5.43, 16.04], [-5.47, 15.59], [-5.47, 15.18], [-5.40, 14.57], [-5.24, 13.84], [-4.64, 11.81], [-4.51, 11.27], [-4.46, 10.86], [-4.46, 10.29], [-4.53, 9.80], [-4.65, 9.36], [-5.08, 8.26], [-5.65, 6.92], [-5.88, 6.46], [-6.28, 4.95], [-6.37, 4.26], [-6.37, 3.37], [-6.26, 2.70], [-6.04, 2.14], [-5.83, 1.80], [-5.50, 1.40], [-5.23, 1.13], [-4.69, 0.71], [-4.62, 0.58], [-4.60, 0.32], [-4.52, 0.19], [-4.37, 0.07], [-4.19, 0.01], [-4.03, 0.03], [-3.83, 0.18], [-3.72, 0.22], [-2.88, 0.03], [-2.59, 0.00], [3.09, 0.00], [3.31, 0.02], [3.94, 0.18], [4.04, 0.16], [4.28, 0.01], [4.54, 0.00], [4.64, 0.02], [4.71, 0.12], [4.67, 0.41], [4.71, 0.52], [5.21, 0.92], [5.44, 1.15], [5.74, 1.52], [6.00, 1.95], [6.17, 2.38], [6.27, 2.70], [6.34, 3.11], [6.38, 3.50], [6.32, 3.85], [6.22, 5.06], [6.01, 5.84], [5.76, 6.51], [5.53, 7.05], [4.64, 8.87], [4.51, 9.24], [4.44, 9.58], [4.44, 10.19], [4.53, 10.68], [4.80, 11.42], [4.91, 11.86], [5.04, 12.19], [5.21, 12.52], [5.34, 13.12], [5.38, 13.62], [5.34, 14.06], [5.26, 14.45], [5.15, 14.75], [4.96, 15.04], [4.71, 15.22], [4.41, 15.27], [4.24, 15.24], [4.13, 15.18], [4.01, 15.06], [3.93, 14.90], [3.73, 14.08], [3.55, 13.65], [3.37, 13.41], [3.20, 13.25], [3.01, 13.13], [2.81, 13.04], [2.49, 12.96], [2.03, 12.94], [1.24, 13.07], [1.15, 12.99], [1.10, 12.73], [0.97, 12.67], [-1.02, 12.66], [-1.11, 12.72], [-1.15, 12.84], [-1.15, 14.70], [-1.18, 14.80], [-1.23, 14.84], [-1.29, 14.85], [-1.79, 14.71], [-2.25, 14.71], [-2.70, 14.83], [-3.09, 15.05], [-3.29, 15.25], [-3.44, 15.46], [-3.65, 15.96], [-3.72, 16.28], [-3.77, 17.02], [-3.84, 17.63], [-3.95, 17.69], [-4.22, 17.69], [-4.43, 17.67]], 320);

    // 3-tone burst + road wear, painted on a canvas that maps 1:1 onto the top
    const BX = 6.6, BY = 18.4, CW = 512, CH = 720, cx = (x) => (x + BX) / (2 * BX) * CW, cy = (y) => (1 - y / BY) * CH, ci = (v) => v / (2 * BX) * CW;
    const [bc, bg] = canvas(CW, CH);
    const path = () => { bg.beginPath(); outline.forEach((p, k) => (k ? bg.lineTo(cx(p.x), cy(p.y)) : bg.moveTo(cx(p.x), cy(p.y)))); bg.closePath(); };
    let gr = bg.createRadialGradient(cx(0), cy(7.5), 10, cx(0), cy(7.5), ci(7)); gr.addColorStop(0, '#c98a2e'); gr.addColorStop(0.55, '#a65a1c'); gr.addColorStop(1, '#7a2a12');
    bg.fillStyle = gr; bg.fillRect(0, 0, CW, CH);
    bg.save(); path(); bg.clip();
    bg.filter = 'blur(30px)'; bg.lineJoin = 'round'; path(); bg.strokeStyle = 'rgba(96,22,10,1)'; bg.lineWidth = ci(7.2); bg.stroke();
    bg.filter = 'blur(20px)'; path(); bg.strokeStyle = 'rgba(10,7,6,1)'; bg.lineWidth = ci(4.4); bg.stroke();
    bg.filter = 'blur(6px)'; path(); bg.strokeStyle = 'rgba(8,6,5,1)'; bg.lineWidth = ci(1.9); bg.stroke();
    bg.filter = 'none'; path(); bg.strokeStyle = '#0d0907'; bg.lineWidth = ci(0.5); bg.stroke();
    // wear: raw alder showing through, edged with yellowed lacquer
    const rnd = rng(31);
    const blob = (x, y, r, wood = true) => {
      const n = 40, ph = [rnd() * 6, rnd() * 6, rnd() * 6], am = [0.22 + rnd() * 0.2, 0.12 + rnd() * 0.12, 0.06 + rnd() * 0.06], sq = 0.6 + rnd() * 0.6, rot = rnd() * Math.PI;
      const pts = Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2, rr = r * (1 + am[0] * Math.sin(2 * a + ph[0]) + am[1] * Math.sin(3 * a + ph[1]) + am[2] * Math.sin(7 * a + ph[2]));
        const ux = Math.cos(a) * rr, uy = Math.sin(a) * rr * sq; return [cx(x) + ci(ux * Math.cos(rot) - uy * Math.sin(rot)), cy(y) - ci(ux * Math.sin(rot) + uy * Math.cos(rot))]; });
      const draw = (grow) => { bg.beginPath(); pts.forEach(([px, py], k) => { const qx = cx(x) + (px - cx(x)) * grow, qy = cy(y) + (py - cy(y)) * grow; k ? bg.lineTo(qx, qy) : bg.moveTo(qx, qy); }); bg.closePath(); bg.fill(); };
      bg.fillStyle = 'rgba(214,140,40,.55)'; draw(1.12);
      if (wood) { bg.fillStyle = '#c79b63'; draw(1); bg.strokeStyle = 'rgba(150,105,60,.35)'; bg.lineWidth = 1; for (let t = 0; t < 4; t++) { const yy = cy(y) + (rnd() - 0.5) * ci(r); bg.beginPath(); bg.moveTo(cx(x) - ci(r), yy); bg.lineTo(cx(x) + ci(r), yy + (rnd() - 0.5) * 6); bg.stroke(); } }
    };
    // edge wear clusters where a player's body and arm rub: bass side, butt, lower treble bout
    const near = (a, b) => outline.filter((p) => p.y >= a && p.y <= b);
    [[0, 3, 4, -1], [0, 6, 3, 1], [6, 13, 3, -1], [13, 18.5, 2, -1], [9, 14, 1, 1]].forEach(([a, b, n, sideSign]) => {
      const pts = near(a, b).filter((p) => Math.sign(p.x) === sideSign || sideSign === 0);
      for (let k = 0; k < n; k++) { const p = pts[Math.floor(rnd() * pts.length)]; if (!p) continue; const inx = -p.x, iny = 7.5 - p.y, l = Math.hypot(inx, iny) || 1, d = 0.15 + rnd() * 0.35;
        blob(p.x + inx / l * d, p.y + iny / l * d, 0.18 + rnd() * 0.42); } });
    [[-3.3, 12.0, 0.95], [-3.4, 10.4, 0.6], [-1.3, 0.8, 0.5], [1.6, 0.7, 0.55]].forEach(([x, y, r]) => blob(x, y, r));
    for (let k = 0; k < 36; k++) { bg.fillStyle = rnd() < 0.6 ? 'rgba(199,155,99,.85)' : 'rgba(230,160,50,.8)'; bg.beginPath(); bg.arc(cx((rnd() - 0.5) * 12.4), cy(rnd() * 18), 0.6 + rnd() * 2.2, 0, Math.PI * 2); bg.fill(); }
    bg.restore();
    const burst = new THREE.CanvasTexture(bc); burst.colorSpace = THREE.SRGBColorSpace; burst.anisotropy = ANISO; burst.repeat.set(1 / (2 * BX), 1 / BY); burst.offset.set(0.5, 0);
    const [ec, eg] = canvas(512, 64); eg.fillStyle = '#0d0907'; eg.fillRect(0, 0, 512, 64);
    for (let k = 0; k < 28; k++) { const x = rnd() * 512, y = rnd() * 64, w = 3 + rnd() * 26, h = 2 + rnd() * 14; eg.fillStyle = 'rgba(226,156,48,.9)'; eg.fillRect(x - 1, y - 1, w + 2, h + 2); eg.fillStyle = '#c79b63'; eg.fillRect(x, y, w, h); }
    const edgeTex = tex(ec, 1); edgeTex.repeat.set(1 / 10, 1 / 1.9);
    const top = new THREE.MeshPhysicalMaterial({ map: burst, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.45 });
    const edge = new THREE.MeshPhysicalMaterial({ map: edgeTex, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.45 });
    const mint = new THREE.MeshPhysicalMaterial({ color: 0xdbe7cd, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.18 });
    const aged = new THREE.MeshStandardMaterial({ color: 0xefe3c4, roughness: 0.42 });
    const nickel = new THREE.MeshStandardMaterial({ color: 0xe1e4e8, metalness: 1, roughness: 0.18 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 0.6, roughness: 0.35 });

    const body = extrude(new THREE.Shape(outline), D - 0.44, [top, edge], 0.22, 64); body.position.y = 0.22; g.add(body);
    // mint 3-ply guard; the neck sits over its top edge
    const guard = extrude(new THREE.Shape(P([[4.54, 14.87], [4.49, 14.89], [4.43, 14.87], [4.37, 14.79], [4.32, 14.63], [4.25, 14.14], [3.96, 13.40], [3.88, 13.27], [3.44, 12.92], [3.29, 12.83], [3.09, 12.74], [2.49, 12.56], [2.22, 12.58], [1.14, 12.85], [1.01, 12.82], [0.71, 12.65], [0.09, 12.56], [-0.34, 12.57], [-0.87, 12.64], [-1.07, 12.73], [-1.18, 12.86], [-1.20, 13.28], [-1.17, 13.36], [-1.07, 13.43], [-1.18, 13.55], [-1.20, 13.76], [-1.25, 13.84], [-1.36, 13.91], [-1.79, 14.05], [-1.93, 14.02], [-2.10, 13.90], [-2.15, 13.82], [-2.17, 13.69], [-2.13, 13.53], [-2.00, 13.21], [-1.97, 12.86], [-1.90, 12.56], [-1.91, 12.35], [-1.84, 11.85], [-1.85, 11.46], [-2.04, 10.40], [-2.43, 9.34], [-2.65, 8.83], [-2.86, 8.19], [-2.97, 7.15], [-2.87, 6.52], [-2.83, 6.41], [-2.53, 5.96], [-2.32, 5.76], [-2.03, 5.62], [-1.84, 5.58], [-1.68, 5.59], [-1.60, 5.67], [-1.57, 5.90], [-1.51, 5.99], [-1.40, 6.04], [-1.25, 6.00], [-1.15, 6.09], [-1.06, 6.12], [-0.47, 6.11], [-0.27, 5.97], [-0.16, 6.08], [-0.07, 6.12], [0.01, 6.10], [0.11, 6.04], [0.28, 6.12], [1.28, 6.11], [1.43, 6.02], [1.48, 5.84], [1.44, 5.71], [1.32, 5.66], [1.47, 5.62], [1.53, 5.58], [1.60, 5.39], [1.64, 5.53], [1.77, 5.58], [2.14, 5.57], [2.45, 5.51], [2.77, 5.48], [3.26, 5.31], [3.54, 5.15], [4.30, 4.54], [4.82, 4.04], [5.04, 3.90], [5.24, 3.83], [5.41, 3.83], [5.52, 3.87], [5.66, 4.00], [5.76, 4.20], [5.79, 4.39], [5.71, 5.08], [5.36, 6.06], [5.02, 6.88], [4.57, 7.85], [4.52, 8.04], [4.55, 8.19], [4.37, 8.29], [4.27, 8.48], [4.14, 8.95], [3.99, 9.32], [3.97, 9.69], [3.91, 9.95], [3.93, 10.25], [4.02, 10.68], [4.15, 11.05], [4.22, 11.40], [4.38, 11.81], [4.55, 12.15], [4.72, 12.76], [4.86, 13.07], [4.88, 13.60], [4.84, 13.84], [4.84, 14.20], [4.64, 14.71]], 260)), 0.06, [mint, aged], 0.025);
    guard.position.y = Y0 + 0.01; g.add(guard);
    // single-coil pickups with pole pieces; the bridge pickup slants
    [[12.0, 0], [9.66, 0], [7.4, -0.17]].forEach(([sy, ang]) => {
      const pu = new THREE.Group(); pu.position.set(0, Y0 + 0.1, -sy); pu.rotation.y = ang; g.add(pu);
      const cover = extrude(rrShape2(2.75, 0.7, 0.33), 0.28, aged, 0.04); pu.add(cover);
      for (let k = 0; k < 6; k++) { const pole = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 12), dark); pole.position.set(-0.98 + k * 0.392, 0.36, 0); pu.add(pole); }
    });
    // vintage trem bridge: plate, six bent-steel saddles, strings anchored behind
    const plate = mesh(new THREE.BoxGeometry(3.0, 0.08, 1.55), nickel); plate.position.set(0.05, Y0 + 0.06, -(SADDLE - 0.35)); g.add(plate);
    for (let k = 0; k < 6; k++) { const sd = mesh(new THREE.BoxGeometry(0.4, 0.22, 0.62), nickel); sd.position.set(-1.0 + k * 0.4, Y0 + 0.2, -SADDLE); g.add(sd); }
    // knobs, switch tip, jack plate, strap buttons
    [[2.14, 7.03], [3.73, 6.19], [5.1, 4.97]].forEach(([x, sy]) => { const k = mesh(new THREE.CylinderGeometry(0.33, 0.4, 0.5, 32), aged); k.position.set(x, Y0 + 0.3, -sy); g.add(k); });
    const sw = mesh(new THREE.CapsuleGeometry ? new THREE.SphereGeometry(0.12, 12, 10) : new THREE.SphereGeometry(0.12, 12, 10), aged); sw.position.set(3.41, Y0 + 0.4, -8.53); g.add(sw);
    const jack = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 32), nickel); jack.scale.set(1, 1, 0.55); jack.rotation.y = 0.55; jack.position.set(3.75, Y0 + 0.02, -3.35); g.add(jack);
    [[-3.85, 18.12, 0.1], [0, -0.05, 0.9]].forEach(([x, sy, yy]) => { const b = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 14), nickel); b.rotation.x = Math.PI / 2; b.position.set(x, yy, -sy); g.add(b); });

    // maple neck, rosewood board with clay dots, small vintage headstock, six in-line tuners on the bass side
    const [mc] = woodCanvas(256, 1024, '#dca35a', 'rgba(150,95,40,A)', 70, 2, 13);
    const maple = new THREE.MeshPhysicalMaterial({ map: tex(mc, 8, true), roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.2 });
    const [fc, fg] = woodCanvas(128, 1024, '#3a2116', 'rgba(10,4,2,A)', 50, 2, 17);
    const fy = (y) => (1 - (y - FB0) / (NUT - FB0)) * 1024;
    fg.fillStyle = '#cfd2d6'; for (let n = 1; n <= 21; n++) { const y = fy(NUT - (SCALE - SCALE / Math.pow(2, n / 12))); fg.fillRect(0, y - 1.5, 128, 3); }
    fg.fillStyle = '#d6b089'; const mid = (n) => NUT - (SCALE - SCALE / Math.pow(2, (n - 0.5) / 12));
    [3, 5, 7, 9, 15, 17, 19, 21].forEach((n) => { fg.beginPath(); fg.arc(64, fy(mid(n)), 7.5, 0, Math.PI * 2); fg.fill(); });
    [42, 86].forEach((x) => { fg.beginPath(); fg.arc(x, fy(mid(12)), 7.5, 0, Math.PI * 2); fg.fill(); });
    const fbTex = new THREE.CanvasTexture(fc); fbTex.colorSpace = THREE.SRGBColorSpace; fbTex.anisotropy = ANISO;
    fbTex.repeat.set(1 / 2.4, 1 / (NUT - FB0)); fbTex.offset.set(0.5, -FB0 / (NUT - FB0));
    const rose = new THREE.MeshStandardMaterial({ color: 0x3a2116, roughness: 0.6 });
    const trap = (y0, w0, y1, w1) => new THREE.Shape([new THREE.Vector2(-w0 / 2, y0), new THREE.Vector2(w0 / 2, y0), new THREE.Vector2(w1 / 2, y1), new THREE.Vector2(-w1 / 2, y1)]);
    const neck = extrude(trap(FB0, 2.2, NUT, 1.65), 0.62, maple, 0.06); neck.position.y = Y0 - 0.42; g.add(neck);
    const board = extrude(trap(FB0, 2.2, NUT, 1.65), 0.2, [new THREE.MeshStandardMaterial({ map: fbTex, roughness: 0.55 }), rose], 0.02); board.position.y = Y0 + 0.2; g.add(board);
    const head = new THREE.Shape(P([[-0.8, NUT - 0.05], [0.8, NUT - 0.05], [0.95, NUT + 1.2], [1.0, NUT + 2.8], [1.15, NUT + 4.2], [1.5, NUT + 5.4], [1.55, NUT + 6.3], [1.2, NUT + 6.95],
      [0.4, NUT + 7.15], [-0.45, NUT + 6.95], [-0.85, NUT + 6.3], [-0.9, NUT + 3.0]], 90));
    const hs = extrude(head, 0.48, maple, 0.04); hs.position.y = Y0 - 0.2; g.add(hs);
    const nut = mesh(new THREE.BoxGeometry(1.7, 0.12, 0.2), aged); nut.position.set(0, Y0 + 0.47, -NUT); g.add(nut);
    const posts = [];
    for (let k = 0; k < 6; k++) {
      const sy = NUT + 0.9 + k * 0.95, x = -0.45;
      const pst = mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.4, 14), nickel); pst.position.set(x, Y0 + 0.48, -sy); g.add(pst); posts.push(new THREE.Vector3(x, Y0 + 0.6, -sy));
      const sh = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), nickel); sh.rotation.z = Math.PI / 2; sh.position.set(-1.25, Y0 + 0.04, -sy); g.add(sh);
      const bt = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 18), nickel); bt.rotation.z = Math.PI / 2; bt.position.set(-1.65, Y0 + 0.04, -sy); g.add(bt);
    }
    for (let k = 0; k < 6; k++) {   // k=0 is the low E (bass side, x-), wound to the post nearest the nut
      const a = new THREE.Vector3(-1.0 + k * 0.4, Y0 + 0.33, -SADDLE), b = new THREE.Vector3(-0.68 + k * 0.272, Y0 + 0.54, -NUT), r = 0.03 - k * 0.0035;
      g.add(between(a, b, r, nickel), between(b, posts[k], r, nickel));
    }
    g.userData = { outline, tip: NUT + 7.15, neck: [FB0, 2.2, NUT, 1.65] };
    return g;
  }
  function rrShape2(w, h, r) { const s = new THREE.Shape(), x = w / 2, y = h / 2; s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.absarc(x - r, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-x + r, y); s.absarc(-x + r, 0, r, Math.PI / 2, Math.PI * 1.5, false); return s; }

  /* ── ground: soft contact shadow + the key light's shadow ─────────────────────────── */
  const [sc, sg] = canvas(256, 512); sg.filter = 'blur(16px)'; sg.fillStyle = 'rgba(0,0,0,.62)';
  { const u = 256 / (BAND.w + 14), v = 512 / (BAND.l + 14), w = BAND.w * u, h = BAND.l * v; sg.beginPath(); sg.roundRect((256 - w) / 2, (512 - h) / 2, w, h, 26); sg.fill(); }
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(BAND.w + 14, BAND.l + 14), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), color: 0x000000, transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = 0.01; scene.add(contact);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.14 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  /* ── state + animation ────────────────────────────────────────────────────────────── */
  let lidT = 0, lidTo = 0, exT = 0, exTo = 0, flT = 0, flTo = 0, running = false, visible = false;
  let gtr = 'acoustic', pending = null, held = false;   // held: rods locked against the guitar
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (t) => t * t * (3 - 2 * t);
  const EXPLODE = [[band0, 3.4], [band1, 6.6], [lidPivot, 10.8], [lidBand, 2.6]];
  EXPLODE.forEach(([g]) => (g.userData.y0 = g.position.y));
  function apply() {
    EXPLODE.forEach(([g, dy]) => (g.position.y = g.userData.y0 + dy * smooth(exT)));
    lidPivot.rotation.z = LIDMAX * smooth(lidT) * (1 - exT);
    rods.forEach((r) => { if (r.axis === 'x') r.g.position.set(r.v, FLOOR + 0.01, r.fixed); else r.g.position.set(r.fixed, FLOOR + 0.01, r.v); });
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
    stepRods(0.075);
    controls.update(); render(); requestAnimationFrame(tick);
  }
  // rods: slide out to the walls when released; once out, a pending guitar swap happens; then they slide in and lock
  function rodTarget(r) { return held && !pending ? r.clampOf(gtr) : r.rest; }
  function stepRods(k) {
    let out = true;
    rods.forEach((r) => { const t = rodTarget(r); r.v = lerp(r.v, t, k); if (Math.abs(r.v - r.rest) > 0.06) out = false; });
    if (pending && out) { GUITARS[gtr].visible = false; gtr = pending; pending = null; GUITARS[gtr].visible = true; }
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
  function setLid(open) { if (open) { setExplode(false); setFlip(false); held = true; } lidTo = open ? 1 : 0; press(btnLid, open, 'Close lid', 'Open lid'); start(); }
  function setExplode(on) { if (on) setFlip(false); exTo = on ? 1 : 0; press(btnEx, on, 'Assemble', 'Explode'); start(); }
  function setFlip(on) { if (on) { lidTo = 0; press(btnLid, false, 'Close lid', 'Open lid'); exTo = 0; press(btnEx, false, 'Assemble', 'Explode'); } flTo = on ? 1 : 0; press(btnFlip, on, 'Flip back', 'Flip over'); start(); }
  btnLid && btnLid.addEventListener('click', () => setLid(lidTo < 0.5));
  btnEx && btnEx.addEventListener('click', () => setExplode(exTo < 0.5));
  btnFlip && btnFlip.addEventListener('click', () => setFlip(flTo < 0.5));
  function setGuitar(n) {
    if (!GUITARS[n]) return;
    host.querySelectorAll('[data-guitar]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.guitar === n)));
    if (lidTo < 0.5) setLid(true);
    if (n !== (pending || gtr)) pending = n === gtr ? null : n;
    held = true; start();
  }
  host.querySelectorAll('[data-guitar]').forEach((b) => b.addEventListener('click', () => setGuitar(b.dataset.guitar)));
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
  const settle = () => { lidT = lidTo; exT = exTo; flT = flTo; for (let i = 0; i < 400; i++) stepRods(0.5); controls.update(); render(); };   // jump to the end state (tests)
  return { settle, guitar: setGuitar, open: () => setLid(true), close: () => setLid(false), explode: setExplode, flip: setFlip, scene, camera, renderer, controls };
}
