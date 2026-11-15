import { initGL } from './scene.js';

const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
const qs = new URLSearchParams(location.search);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 820px)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
document.getElementById('yr').textContent = new Date().getFullYear();

const markOnly = qs.has('mark'); // ?mark = static front-on render for logo comparison
if (markOnly) document.documentElement.classList.add('mark-only');

// 3D state. y/scale = landscape, ym/sm = portrait. vis = canvas opacity.
const state = {
  markOnly, noGlow: qs.has('noglow'), lite: qs.has('lite'), parallax: markOnly ? 0 : 1,
  intro: (reduce || markOnly) ? 1 : 0, apart: (reduce || markOnly) ? 0 : 0.9, spin: (reduce || markOnly) ? 0 : -0.9,
  tilt: 0, roll: 0, layer: 0, orbit: 0, dolly: 0, camX: 0, camY: 0, dustY: 0,
  x: 1.75, xm: 0, y: 0.05, ym: 1.75, scale: 1.0, sm: 0.62, glow: 1, vis: 1, px: 0, py: 0, sweepTo: -9,
};
if (markOnly) Object.assign(state, { x: 0, y: 0, ym: 0, scale: 1, sm: 1, sweepTo: -9 });
window.__dasvora = state; // debug / perf readout
initGL(state, { isMobile, reduce: reduce || markOnly });

/* ---------- film grain tile (generated once) ---------- */
(() => { const c = document.createElement('canvas'); c.width = c.height = 180; const g = c.getContext('2d'); const d = g.createImageData(180, 180);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() < 0.5 ? 0 : 255; d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = Math.random() * 11; }
  g.putImageData(d, 0, 0); document.querySelector('.grain').style.backgroundImage = `url(${c.toDataURL()})`; })();

/* ---------- parallax input: cursor (desktop) / gyro (iOS after a tap) ---------- */
let tx = 0, ty = 0;
if (finePointer) addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
const onOrient = (e) => { if (e.gamma == null) return; tx = Math.max(-1, Math.min(1, e.gamma / 35)) * 0.5; ty = Math.max(-1, Math.min(1, (e.beta - 45) / 35)) * 0.5; };
if (!finePointer && 'DeviceOrientationEvent' in window && !reduce) {
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    const ask = () => { DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onOrient); }).catch(() => {}); };
    addEventListener('touchend', ask, { once: true, passive: true });
  } else addEventListener('deviceorientation', onOrient);
}
(function smooth() { state.px += (tx - state.px) * 0.06; state.py += (ty - state.py) * 0.06; requestAnimationFrame(smooth); })();

/* ---------- split statement into words ---------- */
document.querySelectorAll('[data-split]').forEach((el) => {
  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
});

if (markOnly) {
  /* static comparison view */
} else if (reduce || !gsap || !ScrollTrigger) {
  document.documentElement.classList.add('no-anim');
} else {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Lenis smooth scroll (wheel on desktop; native momentum on touch)
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
  }
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href'); const target = id === '#top' ? 0 : document.querySelector(id);
    if (target === null) return; e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 }); else if (target === 0) scrollTo({ top: 0, behavior: 'smooth' }); else target.scrollIntoView({ behavior: 'smooth' });
  }));

  /* ---------- cinematic intro: shards converge -> pieces lock -> light sweep -> type ---------- */
  const intro = gsap.timeline({ paused: true });
  // start after the first frames have rendered (shader compile), so the intro never skips
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => intro.play(), 120)));
  intro.to(state, { intro: 1, duration: 2.4, ease: 'power3.inOut' }, 0)
       .to(state, { apart: 0, spin: 0, duration: 2.0, ease: 'expo.out' }, 0.9)
       .fromTo(state, { sweepTo: -2.2 }, { sweepTo: 2.6, duration: 1.3, ease: 'power2.inOut' }, 2.0)
       .add(() => { delete state.sweepTo; }, 3.4)
       .to(state, { glow: 1.6, duration: 0.35, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 2.2)
       .to('.intro-line', { y: 0, yPercent: 0, rotate: 0, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: 0.1 }, 1.5)
       .to('.intro-in', { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, 1.8);
  addEventListener('scroll', () => { if (scrollY > 40 && intro.isActive()) intro.progress(1); }, { passive: true });

  // hero parallax-out
  gsap.to('.hero-inner', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // scroll progress + chapter rail
  gsap.to('.scroll-progress span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 } });
  const rail = document.querySelector('.chapters');
  ScrollTrigger.create({ trigger: '#build', start: 'top 60%', endTrigger: '.footer', end: 'top bottom', onToggle: (s) => rail.classList.toggle('show', s.isActive) });
  ['build', 'automate', 'evolve', 'contact'].forEach((ch) => {
    const els = document.querySelectorAll(`[data-ch="${ch}"]`); const first = els[0], lastEl = els[els.length - 1];
    ScrollTrigger.create({ trigger: first, start: 'top 55%', endTrigger: lastEl, end: 'bottom 55%',
      onToggle: (s) => { if (s.isActive) rail.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.ch === ch)); } });
  });

  /* ---------- 3D choreography: one scrubbed timeline across 4 chapters ---------- */
  const at = (sel) => document.querySelector(sel);
  const total = () => document.documentElement.scrollHeight - innerHeight;
  const pos = (sel, edge = 'top') => { const r = at(sel).getBoundingClientRect(); return (r[edge] + scrollY) / total(); };
  let g;
  const build3D = () => {
    if (g) g.kill();
    const p = { build: pos('#build'), automate: pos('#automate'), evolve: pos('#evolve'), cta: pos('#contact'), feat: pos('.features') };
    g = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.1 } });
    // timeline length 1 == whole page; place keyframes at chapter positions
    g.set(state, {}, 0)
     // 01 BUILD: centre, dim behind type, explode into its parts, then lock back together
     .to(state, { x: 0, xm: 1, y: 0, ym: 0, scale: 1.15, sm: 0.95, vis: 0.42, spin: 0.35, tilt: 0.12, duration: p.build }, 0)
     .to(state, { apart: 0.85, spin: 1.2, roll: -0.25, dolly: -1.2, duration: (p.automate - p.build) * 0.5 }, p.build)
     .to(state, { apart: 0, spin: 3.14 * 2, roll: 0, dolly: 0, tilt: 0, duration: (p.automate - p.build) * 0.5 }, p.build + (p.automate - p.build) * 0.5)
     // 02 AUTOMATE: turbine spin + orbit ring, camera pushes in, then slides aside for the flow demo
     .to(state, { spin: 3.14 * 6, orbit: 1, glow: 1.5, dolly: -2.4, vis: 0.55, tilt: -0.35, duration: (p.evolve - p.automate) * 0.55 }, p.automate)
     .to(state, { x: 1.9, scale: 0.6, sm: 0.6, orbit: 0.3, dolly: 0, vis: 1, tilt: -0.1, duration: (p.evolve - p.automate) * 0.45 }, p.automate + (p.evolve - p.automate) * 0.55)
     // 03 EVOLVE: layers separate in depth, three-quarter view, slow drift
     .to(state, { x: 0, y: 0.1, ym: 0.2, scale: 1.0, sm: 0.85, orbit: 0, layer: 1, spin: 3.14 * 6 + 0.75, tilt: 0.3, roll: 0.12, camY: 0.4, vis: 0.6, glow: 1.2, duration: (p.feat - p.evolve) }, p.evolve)
     .to(state, { x: -1.3, layer: 0.6, spin: 3.14 * 6 - 0.6, tilt: -0.2, roll: -0.1, scale: 0.8, sm: 0.6, vis: 0.45, dustY: 1.2, duration: (p.cta - p.feat) }, p.feat)
     // 04 BOOK A CALL: reassembled, front-on, above the headline, blazing
     .to(state, { x: 0, y: 1.64, ym: 2.25, layer: 0, spin: 3.14 * 8, tilt: 0, roll: 0, camY: 0, scale: 0.44, sm: 0.46, vis: 1, glow: 1.9, duration: 1 - p.cta }, p.cta);
  };

  /* ---------- chapter typography: masked line reveals, scrubbed ---------- */
  const makeChapter = (ch) => {
    const word = ch.querySelector('.ch-word .line > span'), num = ch.querySelector('.ch-num .line > span');
    const words = ch.querySelectorAll('.statement-text .w'), copy = ch.querySelector('.fade-copy');
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: ch, start: 'top top', end: words.length ? '+=220%' : '+=150%', pin: ch.querySelector('.ch-pin'), scrub: 0.8, anticipatePin: 1 } });
    tl.fromTo(num, { yPercent: 110 }, { yPercent: 0, duration: 0.12 }, 0)
      .fromTo(word, { yPercent: 105, rotate: 3, scale: 1.08, letterSpacing: '0.02em' }, { yPercent: 0, rotate: 0, scale: 1, letterSpacing: '-0.06em', duration: 0.3, ease: 'power3.out' }, 0);
    if (words.length) tl.to(words, { color: '#f5f5f7', stagger: 0.02, duration: 0.05 }, 0.3);
    if (copy) tl.fromTo(copy, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.25 }, 0.3);
    tl.to([word, num], { yPercent: -105, duration: 0.2, ease: 'power2.in' }, 0.85);
    tl.to(words.length ? ch.querySelector('.statement-text') : copy, { opacity: 0, y: -40, duration: 0.15 }, 0.85);
  };
  makeChapter(document.querySelector('#build')); makeChapter(document.querySelector('#automate'));

  /* ---------- scroll-scrubbed showcase ---------- */
  const steps = gsap.utils.toArray('.step');
  const st = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.showcase', start: 'top top', end: '+=300%', pin: '.showcase-pin', scrub: 0.6, anticipatePin: 1 } });
  st.to('.progress span', { scaleX: 1, duration: 1 }, 0);
  steps.forEach((s, i) => {
    if (i > 0) st.fromTo(s, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.08 }, i / 3);
    if (i < steps.length - 1) st.to(s, { opacity: 0, y: -30, duration: 0.08 }, (i + 1) / 3 - 0.06);
  });
  document.querySelectorAll('.chat [data-at]').forEach((m) => st.to(m, { opacity: 1, y: 0, scale: 1, duration: 0.06, ease: 'power2.out' }, parseFloat(m.dataset.at)));
  st.fromTo('.device', { rotateY: -22, rotateX: 10, scale: 0.9 }, { rotateY: 8, rotateX: -4, scale: 1, duration: 1 }, 0);
  gsap.set('.showcase-pin', { perspective: 1200 });
  makeChapter(document.querySelector('#evolve')); // created in DOM order so pin spacing stacks correctly

  /* ---------- kinetic titles + reveals ---------- */
  gsap.utils.toArray('.section-title, .cta-title').forEach((t) => {
    gsap.fromTo(t.querySelectorAll('.kinetic'), { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: t, start: 'top 85%' } });
  });
  gsap.utils.toArray('.cta .ch-num .line > span').forEach((n) => gsap.fromTo(n, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: n, start: 'top 90%' } }));
  gsap.fromTo('.kinetic-fade', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.cta-sub', start: 'top 92%' } });
  gsap.utils.toArray('.reveal').forEach((el) => gsap.from(el, { y: 80, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } }));
  ScrollTrigger.batch('.reveal-card', { start: 'top 90%', onEnter: (els) => gsap.from(els, { y: 70, opacity: 0, scale: 0.96, duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true }) });

  /* ---------- micro-interactions (desktop pointer only) ---------- */
  if (finePointer) {
    document.querySelectorAll('.magnetic').forEach((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' }), yTo = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.3); yTo((e.clientY - r.top - r.height / 2) * 0.4); });
      b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
    document.querySelectorAll('.tilt-card').forEach((c) => {
      c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
        gsap.to(c, { rotateY: (x - 0.5) * 8, rotateX: (0.5 - y) * 8, transformPerspective: 900, duration: 0.5, ease: 'power3' }); });
      c.addEventListener('pointerleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1,0.5)' }));
    });
  }

  // build the 3D timeline last, once every pin has added its spacing
  ScrollTrigger.refresh(); build3D();
  let rt; window.addEventListener('load', () => { ScrollTrigger.refresh(); build3D(); });
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!isMobile) { ScrollTrigger.refresh(); build3D(); } }, 300); });
}
