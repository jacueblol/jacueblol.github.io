# jacueblol.github.io

Personal portfolio for **Jacob Hotz** — CS student at Colorado School of Mines, focused on robotics.

**Live at [jacueblol.github.io](https://jacueblol.github.io/)**

## What's here

A single-page portfolio built without a framework — plain HTML/CSS/JS, plus Three.js for the 3D piece. The centerpiece is a Rubik's cube (26 real cubies, no hidden center) that comes apart as you scroll, spins with real momentum when you drag it, and drifts away from your cursor when you hover near a separated piece.

Other things worth knowing about:

- **Ctrl/Cmd+K command palette** — jump to any section, toggle theme, copy email, open the résumé, jump to GitHub/LinkedIn
- **Inline résumé preview** — opens in a modal instead of a raw PDF tab
- **Expandable project case studies** — a problem/approach/result writeup per project, not just a card and a GitHub link
- **Light and dark themes**, tuned separately rather than one being a dimmed copy of the other (the neon hero treatment needs a dark background to glow against, so light mode gets its own look)
- Live GitHub stats (repo count, stars) fetched client-side
- Open Graph / Twitter Card metadata with a generated preview image, plus JSON-LD structured data
- Respects `prefers-reduced-motion` throughout, and the 3D scene degrades gracefully off on very small screens

## Stack

Vanilla HTML/CSS/JS. [Three.js](https://threejs.org/) (loaded from a CDN as an ES module) for the cube. No build step, no framework, no bundler — just files GitHub Pages serves directly.

## Structure

```
index.html      the page
css/style.css    theme tokens, layout, components
js/main.js       nav, theme toggle, command palette, résumé modal, reveal-on-scroll
js/scene.js      the Three.js cube — explosion, drag, hover-repel, lighting
assets/          résumé PDF, favicon, OG image
404.html         custom not-found page
```

## Running locally

It's static files — serve the directory with anything:

```bash
python3 -m http.server 8000
```
