import * as THREE from './vendor/three.module.js';

const canvas = document.getElementById('cube-canvas');
if (canvas) {
  try {
    init();
  } catch (err) {
    console.error('[cube-canvas] failed to initialize:', err);
  }
}

function init() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The scene is light enough (26 small cubes, basic materials, no
  // post-processing) to run fine on phones — only bail out on genuinely
  // unusual viewport widths, not real phone screens.
  if (window.innerWidth < 280) {
    canvas.remove();
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const FOV = 36;
  const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 200);
  // camera pulls back along this same direction as the cube explodes further
  // (see ZOOM_MAX below), so a bigger explosion still stays framed.
  const CAM_DIR = new THREE.Vector3(3, 2.2, 12);
  // 1.3x: screenshotting the assembled cube showed it rendering far larger
  // than intended at rest, overlapping and badly hurting hero text legibility
  const REST_DIST = CAM_DIR.length() * 1.3;
  CAM_DIR.normalize();
  camera.position.set(3, 2.2, 12);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x0b0c10, 1.15);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(5, 7, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-6, -2, -4);
  scene.add(fill);

  // the hemisphere light's "ground" bounce color should match the page
  // background, not stay pinned to dark theme's — otherwise the cube's
  // plastic (inner) faces pick up a dark tint even in light theme
  const root = document.documentElement;
  function syncGroundLight() {
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim() || '#0b0c10';
    hemi.groundColor.set(bg);
  }
  syncGroundLight();
  new MutationObserver(syncGroundLight).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- build the cube: 26 cubies (real Rubik's cubes have no
     visible center piece), each colored on its outward-facing sides only,
     plain dark plastic on the sides that face inward while assembled. */
  const CUBIE_SIZE = 0.92;
  const GAP = 1.0;
  const EXPLODE_SCALE = 3.2; // separation distance; camera zoom-out (ZOOM_MAX) is calibrated to match

  const COLORS = {
    right: 0xc41e3a, left: 0xff8c00,
    top: 0xffffff, bottom: 0xffd500,
    front: 0x0051ba, back: 0x009e60,
    plastic: 0x101014,
  };
  const materialCache = new Map();
  function matFor(hex) {
    if (!materialCache.has(hex)) {
      materialCache.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4, metalness: 0.08 }));
    }
    return materialCache.get(hex);
  }

  const rig = new THREE.Group();
  scene.add(rig);

  const geo = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
  const MAX_JITTER = 0.3;
  const cubies = [];

  for (let gx = -1; gx <= 1; gx++) {
    for (let gy = -1; gy <= 1; gy++) {
      for (let gz = -1; gz <= 1; gz++) {
        if (gx === 0 && gy === 0 && gz === 0) continue; // hidden center — real cubes don't have one
        // BoxGeometry material group order is [+X, -X, +Y, -Y, +Z, -Z]
        const faceMats = [
          matFor(gx === 1 ? COLORS.right : COLORS.plastic),
          matFor(gx === -1 ? COLORS.left : COLORS.plastic),
          matFor(gy === 1 ? COLORS.top : COLORS.plastic),
          matFor(gy === -1 ? COLORS.bottom : COLORS.plastic),
          matFor(gz === 1 ? COLORS.front : COLORS.plastic),
          matFor(gz === -1 ? COLORS.back : COLORS.plastic),
        ];
        const mesh = new THREE.Mesh(geo, faceMats);
        const gridPos = new THREE.Vector3(gx, gy, gz).multiplyScalar(GAP);
        mesh.position.copy(gridPos);
        rig.add(mesh);
        cubies.push({
          mesh,
          gridPos,
          explodedPos: gridPos.clone().multiplyScalar(EXPLODE_SCALE),
          tumbleAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
          tumbleAngle: 0.35 + Math.random() * 0.65, // gentle tumble while separating, not a full spin
          spinPhase: Math.random() * Math.PI * 2,
          spinRate: 0.15 + Math.random() * 0.3, // slow oscillation once free of the pack, not a continuous spin
          jitter: Math.random() * MAX_JITTER,
          // slow positional wander so a settled piece still feels weightless
          // instead of glued in place, once it's actually separated
          driftPhase: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(Math.PI * 2),
          driftFreq: new THREE.Vector3(0.07 + Math.random() * 0.1, 0.07 + Math.random() * 0.1, 0.07 + Math.random() * 0.1),
          driftAmp: 0.1 + Math.random() * 0.14,
        });
      }
    }
  }

  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  /* ---------- scroll-driven deconstruction ----------
     explode progress is measured against a multiple of the hero section's
     own height (EXPLODE_SCROLL_RANGE), so it takes a more gradual scroll
     to fully come apart instead of finishing within one hero-height. It
     stays visible (and interactive) for the rest of the page — it just
     fades in once on load, then holds at full opacity. */
  const hero = document.getElementById('hero');
  const EXPLODE_SCROLL_RANGE = 2.2;

  function explodeFraction() {
    const heroHeight = hero ? hero.offsetHeight : window.innerHeight;
    return clamp(window.scrollY / (heroHeight * EXPLODE_SCROLL_RANGE), 0, 1);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  /* ---------- hover repulsion ----------
     cubies drift away from the cursor as it passes near them on screen,
     then spring back — like nudging floating debris. Works everywhere on
     the page (not just the hero), since it's passive mousemove tracking
     and never blocks clicks or scrolling. */
  let mouseNDCX = 10, mouseNDCY = 10; // start off-screen so nothing reacts before the first real move
  window.addEventListener('mousemove', (e) => {
    mouseNDCX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDCY = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { mouseNDCX = 10; mouseNDCY = 10; });

  const HOVER_RADIUS = 0.24; // in NDC units
  const REPEL_STRENGTH = 16;
  const SPRING_K = 10;
  const OFFSET_DAMPING = 6;
  cubies.forEach((c) => {
    c.offset = new THREE.Vector3();
    c.offsetVel = new THREE.Vector3();
  });
  const _base = new THREE.Vector3();
  const _worldPos = new THREE.Vector3();
  const _proj = new THREE.Vector3();
  const _pushDir = new THREE.Vector3();
  const _wander = new THREE.Vector3();
  // camera always looks at the origin from a fixed direction (only its
  // distance changes, for the explode zoom-out), so its orientation — and
  // therefore these basis vectors — never changes; compute them once.
  const camRight = new THREE.Vector3(), camUp = new THREE.Vector3(), camFwd = new THREE.Vector3();
  camera.updateMatrixWorld(true);
  camera.matrixWorld.extractBasis(camRight, camUp, camFwd);

  /* ---------- drag to spin it, zero-gravity style ----------
     grabbing and dragging spins the whole rig with real momentum: release
     mid-swing and it keeps coasting, gradually losing speed to "friction"
     until a gentle baseline drift takes back over. Mouse-only — on touch
     screens a drag gesture is already claimed by page scrolling, so
     hijacking it here would fight normal scrolling. */
  let rotX = 0, rotY = 0;
  let velX = 0, velY = 0;
  let isDragging = false;
  let lastX = 0, lastY = 0, lastDragT = 0;
  const ROT_PER_PIXEL = 0.0055;
  const FRICTION = 1.0; // lower = coasting spin decays more gradually, feels softer
  const BASE_SPIN = 0.025; // rad/sec, gentle idle tumble once coasting has settled

  if (hero) {
    hero.style.cursor = 'grab';
    hero.addEventListener('mousedown', (e) => {
      if (e.target.closest('a, button')) return; // let real clicks through
      isDragging = true;
      lastX = e.clientX; lastY = e.clientY; lastDragT = performance.now();
      hero.style.cursor = 'grabbing';
      e.preventDefault();
    });
  }
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const now = performance.now();
    const dt = Math.max((now - lastDragT) / 1000, 0.001);
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY; lastDragT = now;
    rotY += dx * ROT_PER_PIXEL;
    rotX += dy * ROT_PER_PIXEL;
    velY = (dx * ROT_PER_PIXEL) / dt;
    velX = (dy * ROT_PER_PIXEL) / dt;
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    if (hero) hero.style.cursor = 'grab';
  });

  let currentT = 0;
  let currentOpacity = 0;
  let lastFrameT = performance.now();
  const startTime = lastFrameT;
  const STAGGER_SPAN = 1 - MAX_JITTER;

  function render(now) {
    const elapsed = now - startTime;
    const dt = Math.min((now - lastFrameT) / 1000, 0.05);
    lastFrameT = now;

    const damp = reducedMotion ? 1 : 0.06; // softer easing between the current and scroll-target explode state
    currentT += (explodeFraction() - currentT) * damp;
    // Assembled-and-at-rest, the cube sits directly behind the hero text —
    // screenshotting confirmed it was solid enough to badly hurt legibility
    // there. Ramping opacity up as it separates keeps it a strong presence
    // once it's actual scattered pieces (which doesn't fight the text) while
    // being much less overpowering in its resting state.
    const opacityTarget = 0.4 + 0.6 * smoothstep(currentT);
    currentOpacity += (opacityTarget - currentOpacity) * (reducedMotion ? 1 : 0.12);

    cubies.forEach((c) => {
      const localT = smoothstep(clamp((currentT - c.jitter) / STAGGER_SPAN, 0, 1));

      // Hover repulsion: check each cubie's on-screen position from the
      // last rendered frame (one frame of lag — imperceptible at 60fps,
      // and avoids a second mid-frame matrix-update pass) against the
      // cursor, and nudge its velocity away if it's close. A spring pulls
      // it back toward its scroll-driven position, damped so it settles
      // instead of oscillating.
      if (!reducedMotion) {
        c.mesh.getWorldPosition(_worldPos);
        _proj.copy(_worldPos).project(camera);
        const dx = _proj.x - mouseNDCX, dy = _proj.y - mouseNDCY;
        const dist = Math.hypot(dx, dy);
        if (dist < HOVER_RADIUS && dist > 1e-4) {
          const push = (1 - dist / HOVER_RADIUS) * REPEL_STRENGTH * localT;
          _pushDir.copy(camRight).multiplyScalar(dx).addScaledVector(camUp, dy).normalize();
          c.offsetVel.addScaledVector(_pushDir, push * dt);
        }
      }
      c.offsetVel.addScaledVector(c.offset, -SPRING_K * dt);
      c.offsetVel.multiplyScalar(Math.exp(-OFFSET_DAMPING * dt));
      c.offset.addScaledVector(c.offsetVel, dt);

      _base.lerpVectors(c.gridPos, c.explodedPos, localT);
      c.mesh.position.copy(_base).add(c.offset);
      if (!reducedMotion) {
        const t = elapsed * 0.001;
        _wander.set(
          Math.sin(t * c.driftFreq.x + c.driftPhase.x),
          Math.sin(t * c.driftFreq.y + c.driftPhase.y),
          Math.sin(t * c.driftFreq.z + c.driftPhase.z)
        ).multiplyScalar(c.driftAmp * localT);
        c.mesh.position.add(_wander);
      }

      // a bounded back-and-forth wobble, not an unbounded continuous spin —
      // it was previously accumulating angle forever, which read as the
      // pieces spinning faster and faster the longer they sat there
      const wobble = reducedMotion ? 0 : Math.sin(elapsed * 0.001 * c.spinRate + c.spinPhase) * 0.3 * localT;
      c.mesh.quaternion.setFromAxisAngle(c.tumbleAxis, c.tumbleAngle * localT + wobble);
    });

    if (!isDragging) {
      const decay = Math.exp(-FRICTION * dt);
      velX *= decay;
      velY *= decay;
    }
    const speed = Math.hypot(velX, velY);
    const idleBlend = reducedMotion ? 0 : clamp(1 - speed / 0.15, 0, 1);
    rotY += (velY + BASE_SPIN * idleBlend) * dt;
    rotX += velX * dt;
    rig.rotation.set(rotX, rotY, 0);

    const zoom = 1 + currentT * 1.7; // calibrated so EXPLODE_SCALE=3.2 stays in frame at full zoom-out
    camera.position.copy(CAM_DIR).multiplyScalar(REST_DIST * zoom);
    camera.lookAt(0, 0, 0);

    canvas.style.opacity = String(currentOpacity);

    renderer.render(scene, camera);
  }

  // Pause the render loop entirely while the tab isn't visible, instead of
  // burning CPU/battery on a hidden canvas — resume on the same rAF cadence
  // once it's visible again.
  function loop(now) {
    render(now);
    if (!document.hidden) requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastFrameT = performance.now();
      requestAnimationFrame(loop);
    }
  });
  requestAnimationFrame(loop);
}
