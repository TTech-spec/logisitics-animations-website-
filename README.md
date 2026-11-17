# Northlane Freight — scroll-animation practice site

A fictional logistics site built to practise scroll-driven animation: loader, smooth scroll, a pinned
"journey" film (yard → road → ship → clouds), counters, a plane fly-over, hover previews and an accordion.

No build step. Serve the folder and open it:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000 (add `?noloader` to skip the intro).

- `index.html` — page structure and the inline SVG artwork
- `css/style.css` — layout and styling
- `js/main.js` — all animation (GSAP, ScrollTrigger, Lenis in `vendor/`)
