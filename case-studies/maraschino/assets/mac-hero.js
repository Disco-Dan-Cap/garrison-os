/* ── Maraschino hero · a MacBook Pro 13" (2020) opening onto the board ──
   Model: "Macbook Pro 13 inch 2020" by timblewee, Sketchfab, CC BY 4.0. Extracted from the Codrops
   Threepipe device-mockup scene (Palash Bansal, MIT), iPhone and tabletop removed, wallpaper texture
   dropped, Draco-compressed: 12.4MB → 203KB. Lid pivot is the "Bevels_2" node; closed = identity,
   open = the scene's stored "open" transform. Screen is the "Object_7" quad; we give it UVs and our texture.
   Interaction: lid swings open when the hero scrolls into view, then the cursor tilts the whole machine. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function initMacHero(host, opts) {
  const o = Object.assign({ glb: 'assets/macbook13.glb', screen: 'assets/mac-screen.webp', draco: 'https://cdn.jsdelivr.net/npm/three@0.166.1/examples/jsm/libs/draco/gltf/',
    fit: 3.6, pitch: 0.17, y: 0.16, ampX: 0.10, ampY: 0.26, scale: 1.04, openMs: 1400, openDelay: 250 }, opts || {});
  const fb = host.querySelector('.fallback'), load = host.querySelector('.load');
  const fail = () => { if (fb) { fb.src = o.screen; fb.style.display = 'block'; } if (load) load.remove(); host.classList.add('failed'); };
  const test = document.createElement('canvas'); if (!test.getContext('webgl2')) { fail(); return null; }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 16 / 10, 0.1, 100); camera.position.set(0, 0.35, 7.0); camera.lookAt(0, 0.02, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.7;
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(5, 8, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 1; key.shadow.camera.far = 30;
  key.shadow.camera.left = key.shadow.camera.bottom = -4; key.shadow.camera.right = key.shadow.camera.top = 4;
  key.shadow.bias = -0.0002; key.shadow.radius = 14; key.shadow.blurSamples = 16; scene.add(key);
  const fill = new THREE.DirectionalLight(0xeef2ff, 0.35); fill.position.set(-6, 4, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffeeda, 0.5); rim.position.set(0, 5, -6); scene.add(rim);

  const group = new THREE.Group(); scene.add(group);
  const Q_CLOSED = new THREE.Quaternion(0, 0, 0, 1), Q_OPEN = new THREE.Quaternion(-0.7833269096274834, 0, 0, 0.6216099682706644);
  let lid = null, openAmt = 0, openTarget = 0, openStart = 0, opening = false;

  const tex = new THREE.TextureLoader().load(o.screen, () => render());
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const dl = new DRACOLoader(); dl.setDecoderPath(o.draco);
  const loader = new GLTFLoader(); loader.setDRACOLoader(dl);
  loader.load(o.glb, (gltf) => {
    const model = gltf.scene;
    lid = model.getObjectByName('Bevels_2');
    const screen = model.getObjectByName('Object_7');
    if (screen && screen.isMesh) {
      const g = screen.geometry, P = g.attributes.position; g.computeBoundingBox(); const bb = g.boundingBox; const uv = new Float32Array(P.count * 2);
      for (let i = 0; i < P.count; i++) { uv[i * 2] = (P.getX(i) - bb.min.x) / (bb.max.x - bb.min.x); uv[i * 2 + 1] = (P.getZ(i) - bb.min.z) / (bb.max.z - bb.min.z); }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      screen.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    }
    model.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = false; } });
    // measure with the lid OPEN so the framing fits the final pose, then start closed
    if (lid) lid.quaternion.copy(Q_OPEN);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model); const c = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3());
    const s = o.fit / Math.max(size.x, size.y, size.z);
    model.position.set(-c.x * s, -c.y * s, -c.z * s); model.scale.setScalar(s);
    const wrap = new THREE.Group(); wrap.rotation.y = Math.PI; wrap.add(model); group.add(wrap); // the export faces -Z; centre first, then turn it
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.14 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = (box.min.y - c.y) * s + 0.001; ground.receiveShadow = true; group.add(ground);
    if (lid) lid.quaternion.copy(Q_CLOSED);
    host.classList.add('ready'); render();
    // open when the hero is on screen
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); setTimeout(() => { openTarget = 1; opening = true; openStart = performance.now(); go(); }, o.openDelay); } }, { threshold: 0.45 });
      io.observe(host);
    } else { openTarget = 1; opening = true; openStart = performance.now(); go(); }
  }, undefined, (e) => { console.error(e); fail(); });

  // tilt + lid, lerped; render only while something moves
  let tx = 0, ty = 0, ts = 1, cx = 0, cy = 0, cs = 1, raf = 0;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render(); }
  new ResizeObserver(resize).observe(host); resize();
  function render() {
    group.rotation.x = o.pitch + cx; group.rotation.y = cy; group.scale.setScalar(cs); group.position.y = o.y;
    if (lid) lid.quaternion.slerpQuaternions(Q_CLOSED, Q_OPEN, openAmt);
    renderer.render(scene, camera);
  }
  function tick(now) {
    let busy = false;
    if (opening) { const t = Math.min(1, (now - openStart) / o.openMs); openAmt = easeOut(t) * openTarget; if (t < 1) busy = true; else opening = false; }
    cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12; cs += (ts - cs) * 0.12;
    if (Math.abs(tx - cx) > 0.0005 || Math.abs(ty - cy) > 0.0005 || Math.abs(ts - cs) > 0.0005) busy = true;
    render();
    if (busy) raf = requestAnimationFrame(tick); else { raf = 0; cx = tx; cy = ty; cs = ts; render(); }
  }
  function go() { if (!raf) raf = requestAnimationFrame(tick); }
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    host.addEventListener('pointerenter', () => { ts = o.scale; go(); });
    host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); ty = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * o.ampY; tx = (-(e.clientY - r.top - r.height / 2) / (r.height / 2)) * o.ampX; go(); });
    host.addEventListener('pointerleave', () => { tx = 0; ty = 0; ts = 1; go(); });
  }
  return { renderer, scene, camera, open: () => { openTarget = 1; opening = true; openStart = performance.now(); go(); } };
}
