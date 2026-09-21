(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const themeBtn = document.getElementById('themeToggle');
  const storedTheme = localStorage.getItem('theme');
  const systemLight = window.matchMedia('(prefers-color-scheme: light)').matches;

  function applyTheme(theme) {
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
  }

  applyTheme(storedTheme || (systemLight ? 'light' : 'dark'));

  themeBtn.addEventListener('click', () => {
    const isLight = root.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });

  /* ---------- mobile nav ---------- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- active nav link on scroll ---------- */
  const navAnchors = document.querySelectorAll('[data-nav]');
  const sections = Array.from(navAnchors)
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = '#' + entry.target.id;
        const link = document.querySelector(`[data-nav][href="${id}"]`);
        if (!link) return;
        if (entry.isIntersecting) {
          navAnchors.forEach((a) => a.classList.remove('active'));
          link.classList.add('active');
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  sections.forEach((s) => navObserver.observe(s));

  /* ---------- reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  revealEls.forEach((el, i) => el.style.setProperty('--i', i % 8));

  if (reducedMotion) {
    revealEls.forEach((el) => el.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- role rotator (typewriter) ---------- */
  const roleEl = document.getElementById('roleRotator');
  const phrases = ['robots.', 'control systems.', 'full-stack apps.', 'clean code, mostly.'];

  if (reducedMotion) {
    roleEl.textContent = phrases[0];
  } else {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function tick() {
      const current = phrases[phraseIndex];
      if (!deleting) {
        charIndex++;
        roleEl.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, 1400);
          return;
        }
        setTimeout(tick, 65 + Math.random() * 40);
      } else {
        charIndex--;
        roleEl.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          setTimeout(tick, 300);
          return;
        }
        setTimeout(tick, 30);
      }
    }
    tick();
  }

  /* ---------- smoke cursor effect ---------- */
  const canvas = document.getElementById('smoke-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  let width, height, dpr;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  if (reducedMotion) {
    // Leave the canvas blank; skip particle simulation entirely.
    return;
  }

  /* --- classic 2D Perlin-style noise (compact) --- */
  const perm = new Uint8Array(512);
  (function seedPerm() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }
  function noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    const x1 = lerp(grad(aa, x, y), grad(ba, x - 1, y), u);
    const x2 = lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u);
    return lerp(x1, x2, v);
  }

  const EPS = 0.08;
  function curl(x, y) {
    const n1 = noise2D(x, y + EPS);
    const n2 = noise2D(x, y - EPS);
    const dx = (n1 - n2) / (2 * EPS);
    const n3 = noise2D(x + EPS, y);
    const n4 = noise2D(x - EPS, y);
    const dy = (n3 - n4) / (2 * EPS);
    return { x: dy, y: -dx };
  }

  /* --- particle system --- */
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const MAX_PARTICLES = isCoarsePointer ? 90 : 220;
  const NOISE_SCALE = 0.0035;
  const NOISE_SPEED = 0.00015;
  const TURBULENCE = 38;

  const cssAccent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#8ecae6';
  const cssAccent2 = getComputedStyle(root).getPropertyValue('--accent-2').trim() || '#b794f6';

  function hexToRgb(hex) {
    const m = hex.replace('#', '');
    const bigint = parseInt(m.length === 3
      ? m.split('').map((c) => c + c).join('')
      : m, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }
  const colorA = hexToRgb(cssAccent);
  const colorB = hexToRgb(cssAccent2);

  /** @type {Array<Object>} */
  let particles = [];

  let mouseX = width / 2;
  let mouseY = height / 2;
  let lastMouseX = mouseX;
  let lastMouseY = mouseY;
  let hasMouse = false;

  function spawnParticle(x, y, vx, vy) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    const mix = Math.random();
    particles.push({
      x, y,
      vx: vx + (Math.random() - 0.5) * 12,
      vy: vy + (Math.random() - 0.5) * 12,
      life: 0,
      maxLife: 1400 + Math.random() * 900,
      size: 4 + Math.random() * 6,
      maxSize: 26 + Math.random() * 40,
      r: lerp(colorA.r, colorB.r, mix),
      g: lerp(colorA.g, colorB.g, mix),
      b: lerp(colorA.b, colorB.b, mix),
    });
  }

  function handlePointerMove(x, y) {
    const dx = x - lastMouseX;
    const dy = y - lastMouseY;
    const dist = Math.hypot(dx, dy);
    mouseX = x;
    mouseY = y;
    hasMouse = true;

    const spawnCount = Math.min(Math.round(dist / 6), 6);
    for (let i = 0; i < spawnCount; i++) {
      const t = i / spawnCount;
      const px = lastMouseX + dx * t + (Math.random() - 0.5) * 8;
      const py = lastMouseY + dy * t + (Math.random() - 0.5) * 8;
      spawnParticle(px, py, dx * 0.4, dy * 0.4);
    }
    lastMouseX = x;
    lastMouseY = y;
  }

  window.addEventListener('mousemove', (e) => handlePointerMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  let lastTime = performance.now();
  function animate(now) {
    const dt = Math.min(now - lastTime, 48);
    lastTime = now;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      const c = curl(p.x * NOISE_SCALE, p.y * NOISE_SCALE + now * NOISE_SPEED);
      p.vx += c.x * TURBULENCE * (dt / 1000);
      p.vy += c.y * TURBULENCE * (dt / 1000) - 6 * (dt / 1000); // slight buoyancy
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx * (dt / 1000) * 16;
      p.y += p.vy * (dt / 1000) * 16;

      const progress = p.life / p.maxLife;
      const alpha = progress < 0.15
        ? progress / 0.15
        : 1 - (progress - 0.15) / 0.85;
      const size = lerp(p.size, p.maxSize, progress);

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
      gradient.addColorStop(0, `rgba(${p.r | 0}, ${p.g | 0}, ${p.b | 0}, ${Math.max(alpha * 0.22, 0)})`);
      gradient.addColorStop(1, `rgba(${p.r | 0}, ${p.g | 0}, ${p.b | 0}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
