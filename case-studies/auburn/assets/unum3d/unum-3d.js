/* ── UNUM · the adaptive guitar case in 3D ─────────────────────────────────────────────
   Built from Garrison's own CAD, in inches:
   · footprint 23 × 50, outer corner radius 4; ring walls 1" (inside 21 × 48, radius 3)
     — "6ft x 12ft CAD outline.dxf", the CNC nesting sheet
   · layer heights 2.5 / 3 / 3 / 1 / 2.5 = 12" — the five solids in "UNUM CNC cut.iges"
   · the floor slab's slider slots are the letters U-N-U-M, 1" deep — "UNUM CAD text.dxf",
     oriented as cut in the IGES; the 3D-printed end caps line them
   · the lid's window slot, 3.5 × 36, centred — the nesting sheet
   Interaction: drag to orbit, click the case (or the button) to open and close the lid,
   Explode pulls the five layers apart, the swatches change the felt lining. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 23, L = 50, R = 4, WALL = 1, Ri = 3;
const H = { floorBase: 1.5, floorTop: 1.0, ring: 3.0, lidRing: 1.0, lidPlate: 2.5 };
const SEAM = 0.16;               // chrome band between layers
const SLOT = { w: 3.5, l: 36.05 };
const LIDMAX = THREE.MathUtils.degToRad(104);

export async function initUnum3D(host, opts = {}) {
  const o = Object.assign({ base: 'assets/unum3d/', autoOpen: true }, opts);
  const fb = host.querySelector('.u3-fallback');
  const fail = () => { host.classList.add('failed'); if (fb) fb.style.display = 'block'; };
  if (!document.createElement('canvas').getContext('webgl2')) { fail(); return null; }

  let letters;
  try { letters = await (await fetch(o.base + 'letters.json')).json(); } catch (e) { console.error(e); fail(); return null; }

  /* renderer + scene ------------------------------------------------------------------ */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.querySelector('.u3-stage').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture; scene.environmentIntensity = 0.9;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(30, 70, 40); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 180 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 0.9); rim.position.set(-40, 30, -50); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(30, 16 / 10, 1, 600);
  camera.position.set(70, 62, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-3, 8, 0); controls.enableDamping = true; controls.dampingFactor = 0.07;
  controls.enableZoom = false; controls.enablePan = false;
  controls.minPolarAngle = 0.12; controls.maxPolarAngle = Math.PI * 0.47;
  // a vertical swipe on the case still scrolls the page; sideways drags turn it
  renderer.domElement.style.touchAction = 'pan-y';
  controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches; controls.autoRotateSpeed = 0.55;

  /* materials ------------------------------------------------------------------------- */
  const black = new THREE.MeshPhysicalMaterial({ color: 0x070709, roughness: 0.26, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe3e6ea, roughness: 0.16, metalness: 1 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xc7cacf, roughness: 0.55, metalness: 0.05 });   // printed end caps
  const pocket = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.42, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false });
  const texLoader = new THREE.TextureLoader();
  const FELTS = {
    charcoal: { file: 'felt-charcoal.webp', sheen: 0x5b5b62 },
    rose: { file: 'felt-rose.webp', sheen: 0xff9cc6 },
    blush: { file: 'felt-blush.webp', sheen: 0xfff0f0 },
    plum: { file: 'felt-plum.webp', sheen: 0xc68ad8 },
  };
  const feltTex = {};
  function loadFelt(name) {
    if (feltTex[name]) return feltTex[name];
    const t = texLoader.load(o.base + FELTS[name].file, () => render());
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 7, 1 / 7);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return (feltTex[name] = t);
  }
  const felt = new THREE.MeshPhysicalMaterial({ map: loadFelt('charcoal'), roughness: 1, metalness: 0, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(FELTS.charcoal.sheen) });

  /* geometry helpers: shapes live in plan (x across, -z along); extrude up the y axis --- */
  function rrPath(p, w, l, r) {
    const x = w / 2, y = l / 2;
    p.moveTo(-x + r, -y); p.lineTo(x - r, -y); p.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
    p.lineTo(x, y - r); p.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
    p.lineTo(-x + r, y); p.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
    p.lineTo(-x, -y + r); p.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
    return p;
  }
  const rrShape = (w, l, r) => rrPath(new THREE.Shape(), w, l, r);
  const rrHole = (w, l, r) => rrPath(new THREE.Path(), w, l, r);
  function stadium(p, w, l) { const r = w / 2; return rrPath(p, w, l, r); }
  function poly(p, pts, flip) {
    const q = flip ? pts.slice().reverse() : pts;
    q.forEach(([x, z], i) => (i ? p.lineTo(x, -z) : p.moveTo(x, -z))); p.closePath(); return p;
  }
  function extrude(shape, h, mat, bevel = 0) {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: h - bevel * 2, curveSegments: 28, steps: 1,
      bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4,
    });
    g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);   // footprint on the floor, extruded upward
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function ring(w, l, r, wi, li, ri, h, mat, bevel = 0) {
    const s = rrShape(w - bevel * 2, l - bevel * 2, r - bevel); s.holes.push(rrHole(wi + bevel * 2, li + bevel * 2, ri + bevel));
    return extrude(s, h, mat, bevel);
  }
  const at = (m, y) => { m.position.y = y; return m; };

  /* the case ---------------------------------------------------------------------------- */
  const root = new THREE.Group(); scene.add(root);
  const layers = [];   // each layer group, bottom to top, for the explode
  const lay = (g) => { root.add(g); layers.push(g); return g; };
  const wi = W - WALL * 2, li = L - WALL * 2;

  // 1 · floor slab: solid base, then a 1" top layer pocketed with the letters, caps lining each slot
  const floor = lay(new THREE.Group()); let y = 0;
  floor.add(at(extrude(rrShape(W - 0.5, L - 0.5, R - 0.25), H.floorBase, black, 0.25), y));
  const top = rrShape(W, L, R);
  letters.forEach((Lt) => top.holes.push(poly(new THREE.Path(), Lt.o, true)));
  const topMesh = extrude(top, H.floorTop, [felt, black]); floor.add(at(topMesh, y + H.floorBase));
  letters.forEach((Lt) => {
    const cap = poly(new THREE.Shape(), Lt.o); cap.holes.push(poly(new THREE.Path(), Lt.i, true));
    floor.add(at(extrude(cap, H.floorTop + 0.04, capMat), y + H.floorBase - 0.02));
    floor.add(at(extrude(poly(new THREE.Shape(), Lt.i), 0.02, pocket), y + H.floorBase));
  });
  y += H.floorBase + H.floorTop;

  // seams + two 3" wall rings, felt-lined inside
  function seam(yy) { const s = ring(W - 0.3, L - 0.3, R - 0.15, wi + 0.3, li + 0.3, Ri + 0.15, SEAM, chrome); return at(s, yy); }
  function wallRing(h) {
    const g = new THREE.Group();
    g.add(seam(0));
    g.add(at(ring(W, L, R, wi, li, Ri, h, black, 0.12), SEAM));
    g.add(at(ring(wi + 0.02, li + 0.02, Ri, wi - 0.1, li - 0.1, Ri - 0.05, h, felt), SEAM));
    return g;
  }
  const ringA = lay(at(wallRing(H.ring), y)); y += SEAM + H.ring;
  const ringB = lay(at(wallRing(H.ring), y)); y += SEAM + H.ring;
  const hingeY = y;

  // lid: a 1" ring and the 2.5" window plate, hinged along the far long edge
  const lidPivot = new THREE.Group(); lidPivot.position.set(-W / 2, hingeY, 0); root.add(lidPivot);
  const lid = new THREE.Group(); lid.position.x = W / 2; lidPivot.add(lid); layers.push(lidPivot);
  lid.add(seam(0));
  lid.add(at(ring(W, L, R, wi, li, Ri, H.lidRing, black, 0.12), SEAM));
  lid.add(at(ring(wi + 0.02, li + 0.02, Ri, wi - 0.1, li - 0.1, Ri - 0.05, H.lidRing, felt), SEAM));
  lid.add(seam(SEAM + H.lidRing));
  const plateY = SEAM * 2 + H.lidRing;
  const plate = rrShape(W - 0.7, L - 0.7, R - 0.35); plate.holes.push(stadium(new THREE.Path(), SLOT.w + 0.7, SLOT.l + 0.7));
  lid.add(at(extrude(plate, H.lidPlate, black, 0.35), plateY));
  const pad = rrShape(wi, li, Ri); pad.holes.push(stadium(new THREE.Path(), SLOT.w, SLOT.l));
  lid.add(at(extrude(pad, 0.06, felt), plateY - 0.03));
  const win = extrude(stadium(new THREE.Shape(), SLOT.w + 0.02, SLOT.l + 0.02), 0.25, glass); win.castShadow = false;
  lid.add(at(win, plateY + H.lidPlate - 0.55));
  const totalH = y + SEAM * 2 + H.lidRing + H.lidPlate;

  // ground that only catches the shadow
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  /* state + animation ------------------------------------------------------------------ */
  let lidT = 0, lidTo = 0, exT = 0, exTo = 0, running = false, visible = false, idleAt = 0;
  const ease = (a, b, k) => a + (b - a) * k;
  function apply() {
    // explode: layers lift apart; the lid lifts with them and opens less
    const gap = 5.5 * exT;
    layers.forEach((g, i) => { g.userData.y0 ??= g.position.y; g.position.y = g.userData.y0 + gap * i; });
    lidPivot.rotation.z = LIDMAX * lidT * (1 - exT);   // exploded, the lid lifts flat
    // follow the stack up as it grows, keeping the same angle on it
    const ty = 8 + 9 * exT, dy = ty - controls.target.y;
    if (Math.abs(dy) > 1e-4) { controls.target.y += dy; camera.position.y += dy; }
  }
  function render() { apply(); renderer.render(scene, camera); }
  function tick() {
    if (!running) return;
    lidT = ease(lidT, lidTo, 0.075); exT = ease(exT, exTo, 0.07);
    controls.update(); render();
    requestAnimationFrame(tick);
  }
  function start() { if (!running && visible) { running = true; requestAnimationFrame(tick); } }

  function resize() {
    const r = host.querySelector('.u3-stage').getBoundingClientRect(); if (!r.width) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height;
    // keep the whole 50" case in frame on narrow screens
    camera.fov = r.width / r.height < 1.2 ? 37 : 30; camera.updateProjectionMatrix(); render();
  }
  new ResizeObserver(resize).observe(host); resize();

  /* UI ------------------------------------------------------------------------------------- */
  const btnLid = host.querySelector('[data-u3="lid"]'), btnEx = host.querySelector('[data-u3="explode"]');
  function setLid(open) { if (open && exTo > 0.5) setExplode(false); lidTo = open ? 1 : 0; btnLid.textContent = open ? 'Close lid' : 'Open lid'; btnLid.setAttribute('aria-pressed', String(open)); start(); }
  function setExplode(on) { exTo = on ? 1 : 0; btnEx.textContent = on ? 'Assemble' : 'Explode layers'; btnEx.setAttribute('aria-pressed', String(on)); start(); }
  btnLid.addEventListener('click', () => setLid(lidTo < 0.5));
  btnEx.addEventListener('click', () => setExplode(exTo < 0.5));
  host.querySelectorAll('[data-felt]').forEach((b) => b.addEventListener('click', () => {
    const n = b.dataset.felt; felt.map = loadFelt(n); felt.sheenColor.set(FELTS[n].sheen); felt.needsUpdate = true;
    host.querySelectorAll('[data-felt]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (lidTo < 0.5 && exTo < 0.5) setLid(true); // show the lining you just picked
    start(); render();
  }));

  // a click on the case (not a drag) toggles the lid
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; controls.autoRotate = false; host.classList.add('touched'); });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; }
    down = null; const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(root, true).length) setLid(lidTo < 0.5);
  });
  controls.addEventListener('start', start);

  // only animate while on screen; open the lid the first time it's seen
  let seen = false;
  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible) { start(); if (!seen && o.autoOpen) { seen = true; setTimeout(() => setLid(true), 1100); } }
    else running = false;
  }, { threshold: 0.25 }).observe(host);

  host.classList.add('ready'); render();
  return { open: () => setLid(true), close: () => setLid(false), explode: setExplode, scene, camera, renderer, controls, totalH };
}
