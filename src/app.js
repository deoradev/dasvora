import { initGL } from './scene.js';

const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 820px)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent);
document.getElementById('yr').textContent = new Date().getFullYear();

// apart: 0 assembled / 1 exploded. Starts exploded and assembles on load + scroll.
// y/scale = landscape, ym/sm = portrait (phones); vis = canvas opacity so text stays readable
const state = { apart: reduce ? 0 : 1, spin: reduce ? -0.35 : -1.2, tilt: 0.1, x: 1.75, xm: 0, y: 0.05, ym: 1.75, scale: 1.0, sm: 0.62, glow: 1, vis: 1 };
initGL(state, { isMobile, reduce });

/* ---------------- Scroll ---------------- */
// split statement into words
document.querySelectorAll('[data-split]').forEach((el) => {
  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
});

if (reduce || !gsap || !ScrollTrigger) {
  document.documentElement.classList.add('no-anim');
} else {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Lenis smooth scroll (desktop wheel; native momentum on touch)
  if (window.Lenis) {
    const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href'); const target = id === '#top' ? 0 : document.querySelector(id);
      if (target !== null) { e.preventDefault(); lenis.scrollTo(target, { offset: 0, duration: 1.4 }); }
    }));
  }

  // Hero intro
  gsap.from('.reveal-hero', { yPercent: 110, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09, delay: 0.15 });
  gsap.to('.hero-inner', {
    yPercent: -30, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  // Intro: mark assembles
  const intro = gsap.to(state, { apart: 0.35, spin: -0.35, duration: 2.2, ease: 'expo.out', delay: 0.1 });
  addEventListener('scroll', () => { if (scrollY > 40 && intro.isActive()) intro.progress(1); }, { passive: true });
  // Global 3D choreography across the page (scrubbed)
  const g = gsap.timeline({ scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.2 } });
  g.fromTo(state, { apart: 0.35, spin: -0.35 }, { apart: 0, spin: 0.6, x: 0, xm: 1, y: 0, ym: 0, scale: 1.05, sm: 0.85, glow: 1.3, vis: 0.32, duration: 1, ease: 'none', immediateRender: false })  // statement: snaps together, dims behind text
   .to(state, { x: 0.3, spin: 3.14 + 0.5, tilt: -0.15, scale: 0.5, sm: 0.7, glow: 0.8, vis: 1, duration: 1.4, ease: 'none' })   // showcase: turns, sits behind
   .to(state, { x: -1.6, spin: 6.28 - 0.4, tilt: 0.12, apart: 0.55, scale: 0.9, sm: 0.75, glow: 1.4, vis: 0.85, duration: 1, ease: 'none' })   // pillars: opens up
   .to(state, { x: 0, y: 0.3, ym: 0.3, spin: 6.28 + 0.4, apart: 0.2, scale: 0.6, sm: 0.5, glow: 1, vis: 0.6, duration: 1, ease: 'none' })   // features
   .to(state, { y: 1.15, ym: 1.85, spin: 6.28 * 2, tilt: 0, apart: 0, scale: 0.62, sm: 0.55, glow: 1.8, vis: 1, duration: 0.8, ease: 'none' });   // CTA: reassembled above headline

  // Pinned statement: words light up
  const words = gsap.utils.toArray('.statement-text .w');
  gsap.to(words, {
    color: '#f5f5f7', stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.statement', start: 'top top', end: '+=180%', pin: '.statement-pin', scrub: true, anticipatePin: 1 }
  });

  // Scroll-scrubbed showcase
  const steps = gsap.utils.toArray('.step');
  const st = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.showcase', start: 'top top', end: '+=300%', pin: '.showcase-pin', scrub: 0.6, anticipatePin: 1 }
  });
  st.to('.progress span', { scaleX: 1, duration: 1 }, 0);
  steps.forEach((s, i) => {
    if (i > 0) st.fromTo(s, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.08 }, i / 3);
    if (i < steps.length - 1) st.to(s, { opacity: 0, y: -30, duration: 0.08 }, (i + 1) / 3 - 0.06);
  });
  document.querySelectorAll('.chat [data-at]').forEach((m) => {
    st.to(m, { opacity: 1, y: 0, scale: 1, duration: 0.06, ease: 'power2.out' }, parseFloat(m.dataset.at));
  });
  st.fromTo('.device', { rotateY: -18, rotateX: 8, scale: 0.92 }, { rotateY: 8, rotateX: -4, scale: 1, duration: 1 }, 0);
  gsap.set('.showcase-pin', { perspective: 1200 });

  // Generic reveals
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.from(el, { y: 80, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  ScrollTrigger.batch('.reveal-card', {
    start: 'top 90%',
    onEnter: (els) => gsap.from(els, { y: 70, opacity: 0, scale: 0.96, duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true })
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
}
