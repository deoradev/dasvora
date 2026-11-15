# DASVORA AI — landing page v1
Static site. Open index.html via any static server (python3 -m http.server). `dasvora-preview-single-file.html` is a fully self-contained copy (open directly, even offline).
Rebuild JS after editing src/: `npx esbuild src/app.js --bundle --minify --format=iife --target=safari15 --outfile=js/app.min.js` (needs `npm i three esbuild`).
## Placeholders to replace
- Logo: assets/brand/mark-provisional.svg + inline SVG in index.html nav + 3D shape in src/scene.js are a PROVISIONAL recreation from a text description (real logo file not received yet).
- Brand blue: #1E6BFF (BLUE in src/scene.js, --a1 in css) — not sampled from real logo yet.
- CTA email: devanshudeora077@gmail.com (set)
- Example chat conversation in the showcase is illustrative, not a real client.
