import {
  WebGLRenderer, Scene, PerspectiveCamera, Shape, ExtrudeGeometry, Mesh, MeshPhysicalMaterial,
  MeshBasicMaterial, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, ShaderMaterial,
  AdditiveBlending, Group, Color, SRGBColorSpace, PMREMGenerator, ACESFilmicToneMapping,
  PointLight, DirectionalLight, PlaneGeometry, CanvasTexture, Vector2, Vector3
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export const BLUE = '#2377F4'; // median colour sampled from the logo triangle

/* DASVORA mark, traced from logo-original.png (2172x724 px). Pixel coords; converted below. */
const PX = {
  upper: [[962,77],[1086,77],[1209,203],[1143,253]],
  lower: [[1143,253],[1209,203],[1209,296],[1116,386],[1017,386]],
  tri:   [[955,143],[1054,241],[1054,269],[955,367]],
};
const CX = 1082, CY = 231.5, K = 309 / 1.9; // centre of mark bbox; 309px tall -> 1.9 units
const toXY = ([x, y]) => [(x - CX) / K, -(y - CY) / K];
const POLY = { upper: PX.upper.map(toXY), lower: PX.lower.map(toXY), tri: PX.tri.map(toXY) };
function shapeOf(pts) { const sh = new Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath(); return sh; }
export const TRI_CENTER = toXY([990, 255]);

function inPoly(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
  const [xi, yi] = pts[i], [xj, yj] = pts[j];
  if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }

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
    renderer = new WebGLRenderer({ canvas, antialias: !isMobile, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { canvas.style.display = 'none'; document.body.classList.add('no-gl'); return () => {}; }
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  let dprCap = isMobile ? 1.5 : 2;
  const setDpr = () => renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  setDpr();

  const scene = new Scene(); scene.background = new Color(0x000000);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new PerspectiveCamera(32, 1, 0.1, 100); camera.position.set(0, 0, 8);

  /* ---------- materials ---------- */
  const U = { uSweep: { value: -9 } }; // shared light-sweep position
  const chrome = new MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.16, envMapIntensity: 1.25 });
  const blue = new Color(BLUE);
  const triMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  const sweep = (mat, glsl, key) => { mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSweep = U.uSweep;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vLoc;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position.xy;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vLoc;\nuniform float uSweep;')
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse, opacity );\n{ float x = vLoc.x, y = vLoc.y; diffuseColor.rgb *= ' + glsl + '; }')
        .replace('#include <opaque_fragment>', '{ float d = (vLoc.x + 0.55 * vLoc.y) - uSweep; outgoingLight += vec3(0.85, 0.92, 1.0) * exp(-d * d * 22.0) * 0.85; }\n#include <opaque_fragment>');
    }; mat.customProgramCacheKey = () => key; return mat; };
  const chromeLo = chrome.clone(); chromeLo.roughness = 0.12;
  sweep(chrome, 'mix(1.05, 0.035, smoothstep(0.35, 0.98, (x - y + 1.9) / 2.3))', 'up');
  sweep(chromeLo, 'mix(0.62, 1.1, smoothstep(-0.15, 0.25, x + y)) * mix(1.0, 0.8, smoothstep(0.3, 1.3, x + y))', 'lo');

  const curve = isMobile ? 4 : 8;
  const ext = (pts, depth) => {
    const bs = 0.012; // bevel inset so the front silhouette equals the traced polygon exactly
    const g = new ExtrudeGeometry(shapeOf(pts), { depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: bs, bevelOffset: -bs, bevelSegments: curve, curveSegments: 1 });
    g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g;
  };
  const upper = new Mesh(ext(POLY.upper, 0.22), chrome);
  const lower = new Mesh(ext(POLY.lower, 0.22), chromeLo);
  const cL = new Color('#b4d4ff'), cM = new Color(BLUE), cR = new Color('#0a4fc4');
  const triGeo = ext(POLY.tri, 0.14); { const p = triGeo.attributes.position, c = new Float32Array(p.count * 3), tmp = new Color();
    for (let i = 0; i < p.count; i++) { const t = Math.min(1, Math.max(0, (p.getX(i) - TRI_CENTER[0] + 0.47) / 0.62));
      if (t < 0.12) tmp.copy(cL).lerp(cM, t / 0.12); else tmp.copy(cM).lerp(cR, (t - 0.12) / 0.88);
      c[i*3] = tmp.r; c[i*3+1] = tmp.g; c[i*3+2] = tmp.b; }
    triGeo.setAttribute('color', new Float32BufferAttribute(c, 3)); }
  const tri = new Mesh(triGeo, triMat);
  const glow = new Mesh(new PlaneGeometry(1.5, 2.5), new MeshBasicMaterial({ map: glowTexture(), color: blue, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }));
  const triCenter = new Vector3(TRI_CENTER[0], TRI_CENTER[1], 0);
  glow.position.copy(triCenter);

  const mark = new Group(); mark.add(upper, lower, tri, glow); scene.add(mark);
  const key = new DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 5); scene.add(key);
  const bl = new PointLight(blue, 6, 6); bl.position.set(triCenter.x, triCenter.y, -0.5); scene.add(bl);

  /* ---------- shards: particles sampled on the mark that converge during the intro ---------- */
  const S = isMobile ? 2600 : 5200;
  const tgt = new Float32Array(S * 3), src = new Float32Array(S * 3), col = new Float32Array(S * 3), rnd = new Float32Array(S);
  const keys = ['upper', 'upper', 'lower', 'lower', 'tri'];
  for (let i = 0; i < S; i++) {
    const k = keys[i % keys.length], pts = POLY[k]; let x, y, n = 0;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    do { x = Math.min(...xs) + Math.random() * (Math.max(...xs) - Math.min(...xs)); y = Math.min(...ys) + Math.random() * (Math.max(...ys) - Math.min(...ys)); n++; } while (!inPoly(pts, x, y) && n < 50);
    tgt.set([x, y, 0.12], i * 3);
    const r = 2.5 + Math.random() * 5, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
    src.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph) + 1.5], i * 3);
    const c = k === 'tri' ? [0.25, 0.55, 1.6] : [1.1, 1.15, 1.25]; col.set(c, i * 3); rnd[i] = Math.random();
  }
  const sg = new BufferGeometry();
  sg.setAttribute('position', new Float32BufferAttribute(tgt, 3)); sg.setAttribute('aSrc', new Float32BufferAttribute(src, 3));
  sg.setAttribute('aCol', new Float32BufferAttribute(col, 3)); sg.setAttribute('aRnd', new Float32BufferAttribute(rnd, 1));
  const shardMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uP: { value: 0 }, uFade: { value: 1 }, uSize: { value: isMobile ? 5.0 : 4.0 }, uT: { value: 0 } },
    vertexShader: `attribute vec3 aSrc; attribute vec3 aCol; attribute float aRnd; uniform float uP, uSize, uT; varying vec3 vC; varying float vA;
      void main(){ float k = clamp((uP - aRnd * 0.45) / 0.55, 0., 1.); k = 1. - pow(1. - k, 3.);
        vec3 p = mix(aSrc, position, k); p += (1. - k) * vec3(sin(uT * 1.3 + aRnd * 40.), cos(uT + aRnd * 30.), 0.) * 0.15;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.6 + aRnd) * (8. / -mv.z); vC = aCol; vA = 0.25 + 0.75 * k; }`,
    fragmentShader: `uniform float uFade; varying vec3 vC; varying float vA;
      void main(){ vec2 d = gl_PointCoord - .5; float r = dot(d, d); if (r > .25) discard; gl_FragColor = vec4(vC * (1. - r * 4.), vA * uFade); }`,
  });
  const shards = new Points(sg, shardMat); shards.frustumCulled = false; mark.add(shards);

  /* ---------- orbit ring (Automate chapter) ---------- */
  const R = isMobile ? 500 : 900, rp = new Float32Array(R * 3);
  for (let i = 0; i < R; i++) { const a = (i / R) * 6.283, rr = 1.75 + (Math.random() - .5) * 0.18; rp.set([Math.cos(a) * rr, (Math.random() - .5) * 0.06, Math.sin(a) * rr], i * 3); }
  const rg = new BufferGeometry(); rg.setAttribute('position', new Float32BufferAttribute(rp, 3));
  const ringMat = new PointsMaterial({ color: blue, size: isMobile ? 0.03 : 0.022, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
  const ring = new Points(rg, ringMat); ring.rotation.x = 1.2; scene.add(ring);

  /* ---------- dust ---------- */
  const N = isMobile ? 450 : 1100; const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const r = 3 + Math.random() * 6, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
    pos.set([r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph) - 2], i * 3); }
  const pg = new BufferGeometry(); pg.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const dust = new Points(pg, new PointsMaterial({ color: 0x8fb0ff, size: isMobile ? 0.024 : 0.018, transparent: true, opacity: 0.45, blending: AdditiveBlending, depthWrite: false }));
  scene.add(dust);
  if (state.markOnly) { dust.visible = false; shards.visible = false; }
  if (state.noGlow) glow.visible = false;

  /* ---------- post: selective bloom on the blue triangle only (mobile-safe, auto-disabled on slow devices) ----------
     A tiny second scene (triangle + black occluders) is bloomed at reduced res and added on top. */
  let quality = state.lite ? 0 : state.noGlow ? 1 : 2; // 2 = bloom, 1 = no bloom, 0 = no bloom + dpr 1 + no dust
  const bloomScene = new Scene(); bloomScene.background = new Color(0x000000);
  const occ = new MeshBasicMaterial({ color: 0x000000 });
  const bTriMat = new MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  const bMark = new Group(), bUpper = new Mesh(upper.geometry, occ), bLower = new Mesh(lower.geometry, occ), bTri = new Mesh(tri.geometry, bTriMat);
  bMark.add(bUpper, bLower, bTri); bloomScene.add(bMark);
  const bloomComposer = new EffectComposer(renderer); bloomComposer.renderToScreen = false;
  bloomComposer.addPass(new RenderPass(bloomScene, camera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.9, 0.35, 0.0); bloomComposer.addPass(bloom);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const mix = new ShaderPass({ uniforms: { tDiffuse: { value: null }, tBloom: { value: null }, uAmt: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform sampler2D tDiffuse, tBloom; uniform float uAmt; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv) + uAmt * texture2D(tBloom, vUv); }' });
  mix.uniforms.tBloom.value = bloomComposer.renderTarget2.texture; mix.needsSwap = true;
  composer.addPass(mix); composer.addPass(new OutputPass());
  const syncBloom = () => {
    for (const [d, s] of [[bMark, mark], [bUpper, upper], [bLower, lower], [bTri, tri]]) { d.position.copy(s.position); d.rotation.copy(s.rotation); d.scale.copy(s.scale); }
  };
  const applyQuality = () => {
    if (quality === 0) { dprCap = 1; setDpr(); dust.visible = false; resize(); }
    state.quality = quality; document.documentElement.dataset.quality = quality;
  };

  function resize() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
    const pr = renderer.getPixelRatio();
    composer.setPixelRatio(pr); composer.setSize(w, h);
    bloomComposer.setPixelRatio(pr * (isMobile ? 0.5 : 0.75)); bloomComposer.setSize(w, h); // reduced-res bloom
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize); applyQuality();

  let visible = true; document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  let t = 0, last = performance.now(), frames = 0, acc = 0, sweepT = 0, nextSweep = 0.6;
  const rel = new Vector3();
  const render = (advance = true) => {
    const now = performance.now(); const raw = (now - last) / 1000; const dt = Math.min(raw, 0.05); last = now; if (advance) t += dt;
    // FPS guard: step quality down if we can't hold ~45fps
    if (advance && !state.markOnly && t > 3) { frames++; acc += raw; if (acc > 2) { const fps = frames / acc; frames = 0; acc = 0;
      if (fps < 45 && quality > 0) { quality--; applyQuality(); } state.fps = Math.round(fps); } }

    const a = state.apart, L = state.layer;
    upper.position.set(1.2 * a, 1.3 * a, 1.0 * a + 0.55 * L); upper.rotation.set(0.7 * a, -1.1 * a, 0.4 * a);
    lower.position.set(1.3 * a, -1.2 * a, -0.9 * a - 0.55 * L); lower.rotation.set(-0.6 * a, 1.3 * a, -0.5 * a);
    tri.position.set(-1.4 * a - 0.25 * L, 0, 2.0 * a + 1.1 * L); tri.rotation.set(0, 0, 3.14 * a);
    glow.position.set(triCenter.x - 1.4 * a - 0.25 * L, triCenter.y, 2.0 * a + 1.1 * L - 0.15);
    const pulse = 1 + 0.18 * Math.sin(t * 2.2) * (advance ? 1 : 0);
    // composer path is ACES tone-mapped, so pre-darken the triangle to land on the logo blue
    triMat.color.setScalar((1 + 0.9 * (state.glow - 1)) * pulse * (state.markOnly ? 1 : 1.15) * (quality === 2 ? 0.42 : 1));
    glow.material.opacity = 0.5 * state.glow * pulse;
    bl.intensity = 6 * state.glow; bl.position.copy(tri.position).add(triCenter).setZ(tri.position.z - 0.5);

    // intro shards + periodic light sweep
    shardMat.uniforms.uP.value = state.intro; shardMat.uniforms.uT.value = t;
    shardMat.uniforms.uFade.value = Math.max(0, 1 - Math.max(0, state.intro - 0.85) / 0.15);
    shards.visible = !state.markOnly && shardMat.uniforms.uFade.value > 0.01;
    if (state.sweepTo !== undefined) { U.uSweep.value = state.sweepTo; }
    else if (advance) { sweepT += dt; if (sweepT > nextSweep) { const p = (sweepT - nextSweep) / 1.6; U.uSweep.value = -2 + p * 4.5; if (p > 1) { sweepT = 0; nextSweep = 5 + Math.random() * 3; U.uSweep.value = -9; } } }

    ringMat.opacity = 0.75 * state.orbit; ring.visible = state.orbit > 0.01; ring.rotation.z = t * 0.35; ring.position.copy(mark.position);

    const portrait = innerWidth < innerHeight;
    camera.position.set(state.camX, state.camY, (portrait ? 11.5 : 8) + state.dolly);
    mark.position.set(portrait ? state.x * 0.35 * state.xm : state.x, portrait ? state.ym : state.y, 0);
    mark.scale.setScalar((portrait ? state.sm : state.scale) * (0.6 + 0.4 * Math.min(1, state.intro * 1.2)));
    canvas.style.opacity = state.vis;
    // face the camera even when shifted off-centre, so the rest pose is the exact logo silhouette
    rel.copy(mark.position).sub(camera.position);
    mark.rotation.y = state.spin + Math.atan2(rel.x, -rel.z) * -1 + state.px * 0.22 * state.parallax;
    mark.rotation.x = state.tilt + Math.atan2(rel.y, -rel.z) + state.py * 0.14 * state.parallax;
    mark.rotation.z = state.roll;
    dust.rotation.y = t * 0.02 + state.spin * 0.1; dust.position.y = state.dustY;

    if (quality === 2) { syncBloom(); bTriMat.color.setScalar(0.75 * triMat.color.r); glow.visible = false; mix.uniforms.uAmt.value = 0.5 + 0.35 * Math.min(1.5, state.glow); bloomComposer.render(); composer.render(); }
    else { glow.visible = !state.noGlow; renderer.render(scene, camera); }
  };
  if (reduce) { render(false); addEventListener('resize', () => render(false)); }
  else { const loop = () => { if (visible) render(true); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  return render;
}
