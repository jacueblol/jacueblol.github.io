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

  function toggleTheme() {
    const isLight = root.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    applyTheme(next);
    localStorage.setItem('theme', next);
    return next;
  }
  themeBtn.addEventListener('click', () => toggleTheme());

  /* ---------- scroll progress bar ---------- */
  const scrollProgress = document.getElementById('scrollProgress');
  function updateScrollProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const frac = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    scrollProgress.style.transform = `scaleX(${frac})`;
  }
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress);
  updateScrollProgress();

  /* ---------- mobile nav ---------- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
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

  /* ---------- project card tilt ---------- */
  if (!reducedMotion) {
    const TILT_MAX = 6; // degrees
    document.querySelectorAll('.project-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        const rotX = (-py * TILT_MAX).toFixed(2);
        const rotY = (px * TILT_MAX).toFixed(2);
        card.style.transform = `perspective(800px) translateY(-6px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- toast ---------- */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  /* ---------- résumé preview modal ---------- */
  const resumeModal = document.getElementById('resumeModal');
  const resumeModalClose = document.getElementById('resumeModalClose');

  function openResumeModal() {
    // showModal() throws if called while already open, and the command
    // palette shouldn't be sitting open underneath this one
    if (typeof resumeModal.showModal !== 'function' || resumeModal.open) return;
    closeCommandPalette();
    resumeModal.showModal();
  }
  document.querySelectorAll('[data-resume-trigger]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (typeof resumeModal.showModal !== 'function') return; // no <dialog> support: let the link open normally
      e.preventDefault();
      openResumeModal();
    });
  });
  resumeModalClose.addEventListener('click', () => resumeModal.close());
  resumeModal.addEventListener('click', (e) => {
    if (e.target === resumeModal) resumeModal.close(); // click on the backdrop
  });

  /* ---------- command palette (Ctrl/Cmd+K) ---------- */
  const commandPalette = document.getElementById('commandPalette');
  const commandInput = document.getElementById('commandInput');
  const commandList = document.getElementById('commandList');
  const commandPaletteToggle = document.getElementById('commandPaletteToggle');

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function copyEmail() {
    const email = 'jacob_hotz@mines.edu';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email)
        .then(() => showToast('Email copied to clipboard'))
        .catch(() => showToast(email));
    } else {
      showToast(email);
    }
  }

  const COMMANDS = [
    { label: 'Go to About', hint: 'section', action: () => scrollToSection('about') },
    { label: 'Go to Experience', hint: 'section', action: () => scrollToSection('experience') },
    { label: 'Go to Projects', hint: 'section', action: () => scrollToSection('projects') },
    { label: 'Go to Skills', hint: 'section', action: () => scrollToSection('skills') },
    { label: 'Go to Contact', hint: 'section', action: () => scrollToSection('contact') },
    { label: 'Toggle theme', hint: 'dark / light', action: () => showToast(`Theme: ${toggleTheme()}`) },
    { label: 'Copy email address', hint: 'clipboard', action: copyEmail },
    { label: 'View résumé', hint: 'preview', action: openResumeModal },
    { label: 'Open GitHub profile', hint: '↗', action: () => window.open('https://github.com/jacueblol', '_blank', 'noopener') },
    { label: 'Open LinkedIn profile', hint: '↗', action: () => window.open('https://linkedin.com/in/jacob-hotz', '_blank', 'noopener') },
    { label: 'View site source', hint: '↗', action: () => window.open('https://github.com/jacueblol/jacueblol.github.io', '_blank', 'noopener') },
  ];

  let filteredCommands = COMMANDS.slice();
  let selectedIndex = 0;

  function renderCommandList() {
    commandList.innerHTML = '';
    if (filteredCommands.length === 0) {
      const li = document.createElement('li');
      li.className = 'command-empty';
      li.textContent = 'No matching commands';
      commandList.appendChild(li);
      return;
    }
    filteredCommands.forEach((cmd, i) => {
      const li = document.createElement('li');
      li.className = i === selectedIndex ? 'selected' : '';
      const label = document.createElement('span');
      label.textContent = cmd.label;
      const hint = document.createElement('span');
      hint.className = 'cmd-hint';
      hint.textContent = cmd.hint;
      li.append(label, hint);
      li.addEventListener('mouseenter', () => { selectedIndex = i; renderCommandList(); });
      li.addEventListener('click', () => runCommand(cmd));
      commandList.appendChild(li);
    });
    const selectedEl = commandList.children[selectedIndex];
    if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
  }

  function runCommand(cmd) {
    closeCommandPalette();
    cmd.action();
  }

  function filterCommands(query) {
    const q = query.trim().toLowerCase();
    filteredCommands = q ? COMMANDS.filter((c) => c.label.toLowerCase().includes(q)) : COMMANDS.slice();
    selectedIndex = 0;
    renderCommandList();
  }

  function openCommandPalette() {
    if (typeof commandPalette.showModal !== 'function' || commandPalette.open) return;
    if (resumeModal.open) resumeModal.close();
    commandInput.value = '';
    filterCommands('');
    commandPalette.showModal();
    // rAF, not a direct call: some browsers still resolve their own
    // dialog auto-focus after showModal() returns, which can otherwise
    // clobber this and leave focus somewhere arrow keys don't reach it
    requestAnimationFrame(() => commandInput.focus());
  }
  function closeCommandPalette() {
    if (commandPalette.open) commandPalette.close();
  }

  commandPaletteToggle.addEventListener('click', openCommandPalette);
  commandInput.addEventListener('input', () => filterCommands(commandInput.value));
  commandPalette.addEventListener('click', (e) => {
    if (e.target === commandPalette) closeCommandPalette(); // click on the backdrop
  });

  // Handled on window, not the dialog or the input: a keydown listener only
  // ever fires on its target's ancestors, so if focus isn't actually inside
  // the dialog for any reason, a listener on the dialog itself never sees
  // the event at all. window is guaranteed to be an ancestor of wherever
  // focus is, so gating on commandPalette.open here is the only way this
  // works regardless of where focus actually landed.
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (commandPalette.open) closeCommandPalette();
      else openCommandPalette();
      return;
    }
    if (!commandPalette.open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
      renderCommandList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      renderCommandList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) runCommand(filteredCommands[selectedIndex]);
    }
  });

  /* ---------- github stats ---------- */
  // best-effort social proof: fetched client-side (each visitor's own
  // browser hits GitHub's public API from their own IP, so the 60/hr
  // unauthenticated rate limit is per-visitor, not shared). If it fails
  // for any reason — offline, rate-limited, API shape changes — the fact
  // block just stays hidden rather than showing a broken empty state.
  (async () => {
    const fact = document.getElementById('githubStatFact');
    const value = document.getElementById('githubStatValue');
    if (!fact || !value) return;
    try {
      const res = await fetch('https://api.github.com/users/jacueblol/repos?per_page=100');
      if (!res.ok) return;
      const repos = await res.json();
      if (!Array.isArray(repos)) return;
      const original = repos.filter((r) => !r.fork);
      const stars = original.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
      value.textContent = `${original.length} repos · ${stars} star${stars === 1 ? '' : 's'}`;
      fact.hidden = false;
    } catch (e) {
      // offline or rate-limited — leave it hidden
    }
  })();

  /* ---------- project case studies ---------- */
  const CASE_STUDIES = {
    crescendo: {
      title: 'FRC Robot Code — Crescendo',
      year: '2024',
      github: 'https://github.com/jacueblol/AdvantageKit_Swerve_Patribots',
      tags: ['Java', 'WPILib', 'Kinematics', 'Odometry'],
      problem: 'Swerve drive gives a competition robot full omnidirectional movement, but that freedom comes with real kinematic complexity — every wheel module has to be commanded independently and consistently, and the robot needs to always know exactly where it is on the field to run reliable autonomous routines.',
      approach: 'Built the season’s control software around an object-oriented swerve-drive architecture, with odometry-based pose estimation so the robot could track its own field position in both autonomous and driver-controlled modes. Worked directly with the hardware and controls sub-teams to tune the physical response, and mentored junior programmers on code structure along the way.',
      result: 'Fielded competition-ready code across two international events with 3,300+ participating teams — the kind of environment where code either works under pressure or it doesn’t.',
    },
    'arm-sim': {
      title: '2D Robotic Arm Simulation',
      year: 'In Progress',
      github: 'https://github.com/jacueblol/2D-Arm',
      tags: ['Rust', 'PID Control', 'Kinematics'],
      problem: 'Tuning control systems on a real robot arm means real hardware risk and slow iteration — every bad gain gets tested on an actual motor. I wanted a sandbox where I could get the control theory right first.',
      approach: 'Built a 2D robotic arm simulator in Rust, deliberately structured like WPILib’s architecture so the patterns would transfer directly to real robot code. Implemented a custom PID controller from scratch to regulate joint motion and system stability, rather than reaching for an existing control library.',
      result: 'A working, interactive testbed for control-systems experimentation, architected with future expansion in mind — more joints, disturbances, alternate controllers. Still actively developed.',
    },
    signin: {
      title: 'Sign-In Site',
      year: '2023',
      github: 'https://github.com/jacueblol/signin-site',
      tags: ['React', 'Firebase', 'Auth'],
      problem: 'Most of my coursework touched algorithms and systems, not much full-stack web with real user accounts — I wanted hands-on practice with authentication and session handling beyond a toy example.',
      approach: 'Built a React frontend backed by Firebase, implementing user authentication, persistent data storage, and secure session handling end-to-end rather than relying on a pre-built auth widget.',
      result: 'A working full-stack authentication system and a first real look at production-style user/session management — the unglamorous plumbing that most apps actually depend on.',
    },
    othello: {
      title: 'Othello',
      year: '2023',
      github: 'https://github.com/jacueblol/MVC-Othello',
      tags: ['Java', 'MVC', 'Minimax / Alpha-Beta'],
      problem: 'Board-game AI is a classic way to actually implement search algorithms instead of just reading about them — I wanted a project where Minimax and pruning weren’t optional, they were the point.',
      approach: 'Structured the game with an MVC architecture to keep game logic, UI, and control flow cleanly separated, then implemented a Minimax AI opponent with Alpha-Beta pruning to cut down the search space enough to play at a reasonable speed.',
      result: 'A fully playable Othello game with a competent AI opponent, and an architecture clean enough that swapping the UI or adding a new opponent strategy wouldn’t require touching the game logic at all.',
    },
    'physics-engine': {
      title: 'Physics Engine',
      year: '2022',
      github: 'https://github.com/jacueblol/Physics-Engine',
      tags: ['C++', 'Simulation', 'Maven'],
      problem: 'Physics and simulation show up everywhere in robotics and game dev, but it’s easy to treat the math as a black box you just call into. I wanted to actually build the box.',
      approach: 'Implemented motion updates and force application from scratch in C++ — integration, forces, the actual numerical guts — and structured the project with Maven for dependency management and modular design rather than a single monolithic file.',
      result: 'A working foundational physics engine, and concrete intuition for the math that later showed up directly in robot control loops and kinematics work.',
    },
    'charged-up': {
      title: 'FRC Robot Code — Charged Up',
      year: '2023',
      github: 'https://github.com/jacueblol?tab=repositories&q=CSCI210',
      tags: ['Java', 'Computer Vision', 'Kinematics'],
      problem: 'The 2023 game demanded precise arm placement of game pieces and reliable field-relative positioning — not just a drivetrain problem, but a kinematics-and-vision problem, under real competition time pressure.',
      approach: 'Contributed to the season’s object-oriented control software, implementing arm kinematics for accurate game-piece placement and AprilTag-based vision alignment for field positioning, plus hands-on debugging and performance tuning through build season and at competition.',
      result: 'Competition-ready contributions in my first season on the team — where I first learned what writing robot code under real deadline pressure actually feels like.',
    },
  };

  const caseStudyModal = document.getElementById('caseStudyModal');
  const caseStudyClose = document.getElementById('caseStudyClose');

  function openCaseStudy(slug) {
    const data = CASE_STUDIES[slug];
    if (!data || typeof caseStudyModal.showModal !== 'function' || caseStudyModal.open) return;
    document.getElementById('caseStudyYear').textContent = data.year;
    document.getElementById('caseStudyGithub').href = data.github;
    document.getElementById('caseStudyTitle').textContent = data.title;
    document.getElementById('caseStudyProblem').textContent = data.problem;
    document.getElementById('caseStudyApproach').textContent = data.approach;
    document.getElementById('caseStudyResult').textContent = data.result;
    const tagsEl = document.getElementById('caseStudyTags');
    tagsEl.innerHTML = '';
    data.tags.forEach((tag) => {
      const span = document.createElement('span');
      span.textContent = tag;
      tagsEl.appendChild(span);
    });
    caseStudyModal.scrollTop = 0;
    caseStudyModal.showModal();
  }

  document.querySelectorAll('.project-more').forEach((btn) => {
    btn.addEventListener('click', () => openCaseStudy(btn.dataset.case));
  });
  caseStudyClose.addEventListener('click', () => caseStudyModal.close());
  caseStudyModal.addEventListener('click', (e) => {
    if (e.target === caseStudyModal) caseStudyModal.close(); // click on the backdrop
  });

})();
