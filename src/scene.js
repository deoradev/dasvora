import {
  WebGLRenderer, Scene, PerspectiveCamera, Shape, ExtrudeGeometry, Mesh, MeshPhysicalMaterial,
  MeshStandardMaterial, MeshBasicMaterial, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial,
  AdditiveBlending, Group, Color, SRGBColorSpace, PMREMGenerator, ACESFilmicToneMapping,
  PointLight, DirectionalLight, PlaneGeometry, CanvasTexture, Vector3
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const BLUE = '#1E6BFF'; // TODO: replace with exact blue sampled from the logo

/* Provisional recreation of the DASVORA mark: a vertical bar + chevron forming a "D",
   with a glowing triangle inside. Units ~ 0..100, centred later. */
function shapes() {
  const bar = new Shape(); bar.moveTo(0, 0); bar.lineTo(18, 0); bar.lineTo(18, 100); bar.lineTo(0, 100); bar.closePath();
  const chev = new Shape();
  chev.moveTo(26, 100); chev.lineTo(48, 100); chev.lineTo(100, 50); chev.lineTo(48, 0); chev.lineTo(26, 0);
  chev.lineTo(78, 50); chev.closePath();
  const tri = new Shape(); tri.moveTo(30, 30); tri.lineTo(30, 70); tri.lineTo(56, 50); tri.closePath();
  return { bar, chev, tri };
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new CanvasTexture(c);
}

export function initGL(state, { isMobile, reduce }) {
  const canvas = document.getElementById('gl');
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { canvas.style.display = 'none'; document.body.classList.add('no-gl'); return () => {}; }
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new PerspectiveCamera(32, 1, 0.1, 100); camera.position.set(0, 0, 8);

  const chrome = new MeshPhysicalMaterial({ color: 0xd9dde3, metalness: 1, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.35 });
  const blue = new Color(BLUE);
  const triMat = new MeshStandardMaterial({ color: blue, emissive: blue, emissiveIntensity: 1, metalness: 0.3, roughness: 0.25 });
  triMat.toneMapped = false; // keep the electric blue saturated

  const s = shapes(); const curve = isMobile ? 6 : 10;
  const ext = (shape, depth) => {
    const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.4, bevelSegments: curve, curveSegments: 4 });
    g.translate(-50, -50, -depth / 2); g.scale(0.018, 0.018, 0.018); g.computeVertexNormals(); return g;
  };
  const bar = new Mesh(ext(s.bar, 16), chrome);
  const chev = new Mesh(ext(s.chev, 16), chrome);
  const tri = new Mesh(ext(s.tri, 10), triMat);

  const glow = new Mesh(new PlaneGeometry(2.6, 2.6), new MeshBasicMaterial({ map: glowTexture(), color: blue, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }));
  const triCenter = new Vector3((38.7 - 50) * 0.018, 0, 0);
  glow.position.copy(triCenter);

  const parts = new Group(); parts.add(bar, chev, tri, glow);
  const mark = new Group(); mark.add(parts); scene.add(mark);

  const key = new DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 5); scene.add(key);
  const bl = new PointLight(blue, 18, 6); bl.position.set(triCenter.x, 0, 0.9); scene.add(bl);

  // dust
  const N = isMobile ? 500 : 1200; const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3 + Math.random() * 6, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
    pos[i*3] = r*Math.sin(ph)*Math.cos(th); pos[i*3+1] = r*Math.sin(ph)*Math.sin(th); pos[i*3+2] = r*Math.cos(ph) - 2;
  }
  const pg = new BufferGeometry(); pg.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const dust = new Points(pg, new PointsMaterial({ color: 0x8fb0ff, size: isMobile ? 0.024 : 0.018, transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false }));
  scene.add(dust);

  function resize() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.position.z = w < h ? 11.5 : 8; camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  let px = 0, py = 0;
  addEventListener('pointermove', (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });
  let visible = true; document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  let t = 0, last = performance.now();
  const render = (advance = true) => {
    const now = performance.now(); const dt = Math.min((now - last) / 1000, 0.05); last = now; if (advance) t += dt;
    const a = state.apart; // 0 = assembled, 1 = exploded
    bar.position.set(-1.6 * a, 0.5 * a, 1.2 * a); bar.rotation.set(0.6 * a, -1.2 * a, 0.3 * a);
    chev.position.set(1.7 * a, -0.4 * a, -1.0 * a); chev.rotation.set(-0.5 * a, 1.4 * a, -0.4 * a);
    tri.position.set(0, 0, 2.2 * a); tri.rotation.set(0, 0, 3.14 * a);
    glow.position.set(triCenter.x, 0, 2.2 * a - 0.12); glow.material.opacity = 0.85 * state.glow;
    triMat.emissiveIntensity = 0.55 + 0.3 * state.glow + Math.sin(t * 2) * 0.08 * (advance ? 1 : 0);
    bl.intensity = 14 * state.glow; bl.position.z = 0.9 + 2.2 * a;
    const portrait = innerWidth < innerHeight;
    mark.position.set(portrait ? state.x * 0.35 * state.xm : state.x, portrait ? state.ym : state.y, 0);
    mark.scale.setScalar(portrait ? state.sm : state.scale);
    canvas.style.opacity = state.vis;
    mark.rotation.y = state.spin + Math.sin(t * 0.5) * 0.12 + px * 0.35;
    mark.rotation.x = state.tilt + Math.sin(t * 0.4) * 0.05 + py * 0.2;
    dust.rotation.y = t * 0.02 + state.spin * 0.15;
    renderer.render(scene, camera);
  };
  if (reduce) { render(false); addEventListener('resize', () => render(false)); }
  else { const loop = () => { if (visible) render(true); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  return render;
}
