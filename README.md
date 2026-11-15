# DASVORA AI — landing site (v3)
Static site, no build step needed to host. `dasvora-preview-single-file.html` is a self-contained copy (opens offline).
Rebuild JS after editing src/: `npx esbuild src/app.js --bundle --minify --format=iife --target=safari15 --outfile=js/app.min.js` (needs `npm i three@0.187.0 esbuild`).

## What's in it
- Cinematic intro: ~5k particles sampled on the real logo polygons converge, the three chrome/blue pieces lock together, a light sweep crosses the metal, then the headline reveals.
- Selective bloom on the blue triangle only (tiny second scene, reduced-res; pulses). Automatic quality fallback: if the device can't hold ~45fps it drops bloom, then pixel ratio/dust.
- Four scroll chapters (Build / Automate / Evolve / Book a call), each with its own 3D move: explode→reassemble, turbine spin + orbit ring + camera push, depth-layered three-quarter view, front-on hero lock-up.
- Masked kinetic type, chrome/blue text with a travelling specular highlight, film grain + vignette, scroll progress, chapter rail (desktop), magnetic + shine buttons, 3D tilt cards.
- Parallax: cursor on desktop; gyro on iPhone/iPad after the first tap (iOS permission prompt).
- prefers-reduced-motion: no intro / scrubbing, static render.

## Brand
- assets/brand/logo-original.png — logo supplied by Devanshu (not modified; kept local, not in the repo).
- assets/brand/mark.svg — mark rebuilt from polygons traced from the logo pixels (nav + favicon).
- assets/brand/*-cutout.svg — alpha cut-outs of the logo/wordmark (webp embedded so they can be committed as text).
- src/scene.js — 3D mark extrudes the same traced polygons (PX). Brand blue #2377F4 (median of the logo triangle).
- `?mark` = static front-on render of the 3D mark (logo comparison); `?lite` = force low-quality mode.

## Placeholders
- Example chat conversation in the showcase is illustrative, not a real client.
