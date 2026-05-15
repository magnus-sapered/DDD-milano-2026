/* DDD Milano 2026 — interactions */

(function () {
  'use strict';

  // ===========================================================
  // Language switcher
  // ===========================================================
  const STORAGE_KEY = 'ddd-lang';
  const savedLang = (() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  })();
  const initialLang = (savedLang === 'de' || savedLang === 'en') ? savedLang : 'en';
  function setLang(lang) {
    document.documentElement.setAttribute('lang', lang);
    // Swap dot-nav labels
    document.querySelectorAll('.dot-nav a[data-label-de]').forEach((a) => {
      const en = a.getAttribute('data-label-en') || a.getAttribute('data-label');
      const de = a.getAttribute('data-label-de');
      if (lang === 'de' && de) a.setAttribute('data-label', de);
      else if (en) a.setAttribute('data-label', en);
    });
    // Swap document title
    if (window.__pageTitles) {
      document.title = window.__pageTitles[lang] || document.title;
    }
    // Active button
    document.querySelectorAll('.lang-switcher button').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    // Re-measure horizontal scroll (DE strings can be longer)
    if (window.__recalcH) window.__recalcH();
  }
  document.querySelectorAll('.lang-switcher button').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });
  // Stash language-aware titles
  window.__pageTitles = {
    en: 'DDD Milano 2026 · SAPERED Field Report',
    de: 'DDD Mailand 2026 · SAPERED Feldbericht',
  };
  setLang(initialLang);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const el = e.target;
        const d = parseInt(el.dataset.delay || '0', 10);
        setTimeout(() => el.classList.add('is-in'), d);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.10, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.r').forEach((el) => io.observe(el));

  // ===========================================================
  // Video player
  // ===========================================================
  const videoEl = document.getElementById('field-report-video');
  const playBtn = document.getElementById('video-play-btn');
  const videoWrap = videoEl && videoEl.closest('.video-wrap');

  if (videoEl && playBtn && videoWrap) {
    const videoCursor = document.getElementById('video-cursor');
    const mainEl = document.querySelector('main');
    let placeholder = null;
    let savedScrollY = 0;

    function expand() {
      const rect = videoWrap.getBoundingClientRect();

      // Hold layout space while wrap is fixed
      placeholder = document.createElement('div');
      placeholder.style.cssText = `width:${rect.width}px;height:${rect.height}px;flex-shrink:0;`;
      videoWrap.insertAdjacentElement('afterend', placeholder);

      // Snap to fixed at exact current position — no transition yet
      videoWrap.classList.add('is-expanded');
      videoWrap.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;z-index:200;margin:0;border-radius:16px;`;

      // Force reflow so the browser registers the start state
      videoWrap.offsetHeight;

      // Animate to fullscreen
      const ease = 'cubic-bezier(.4,0,.2,1)';
      videoWrap.style.transition = `top 520ms ${ease},left 520ms ${ease},width 520ms ${ease},height 520ms ${ease},border-radius 520ms ease`;
      videoWrap.style.top = '0';
      videoWrap.style.left = '0';
      videoWrap.style.width = '100vw';
      videoWrap.style.height = '100vh';
      videoWrap.style.borderRadius = '0';

      document.documentElement.style.overflow = 'hidden';
      // Raise main above the fixed header/nav (which live in the root stacking context)
      if (mainEl) mainEl.style.zIndex = '300';
    }

    function collapse() {
      if (!placeholder) return;
      const targetRect = placeholder.getBoundingClientRect();

      const ease = 'cubic-bezier(.4,0,.2,1)';
      videoWrap.style.transition = `top 480ms ${ease},left 480ms ${ease},width 480ms ${ease},height 480ms ${ease},border-radius 480ms ease`;
      videoWrap.style.top = targetRect.top + 'px';
      videoWrap.style.left = targetRect.left + 'px';
      videoWrap.style.width = targetRect.width + 'px';
      videoWrap.style.height = targetRect.height + 'px';
      videoWrap.style.borderRadius = '16px';

      videoWrap.classList.remove('is-expanded');
      if (videoCursor) videoCursor.classList.remove('is-visible');

      videoWrap.addEventListener('transitionend', () => {
        document.documentElement.style.overflow = '';
        if (mainEl) mainEl.style.zIndex = '';
        videoWrap.removeAttribute('style');
        if (placeholder) { placeholder.remove(); placeholder = null; }
      }, { once: true });
    }

    function setPlaying(playing) {
      if (playing) {
        expand();
        videoEl.play();
        videoWrap.classList.add('is-playing');
      } else {
        videoEl.pause();
        videoWrap.classList.remove('is-playing');
        collapse();
      }
    }

    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setPlaying(true);
    });

    videoWrap.addEventListener('click', () => {
      if (videoWrap.classList.contains('is-playing')) setPlaying(false);
    });

    videoEl.addEventListener('ended', () => {
      videoWrap.classList.remove('is-playing');
      collapse();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && videoWrap.classList.contains('is-playing')) setPlaying(false);
    });

    // Custom cursor — play icon on hover, pause icon in fullscreen
    if (videoCursor) {
      videoWrap.addEventListener('mousemove', (e) => {
        videoCursor.style.left = e.clientX + 'px';
        videoCursor.style.top = e.clientY + 'px';
        videoCursor.classList.add('is-visible');
        videoCursor.classList.toggle('show-pause', videoWrap.classList.contains('is-expanded'));
      });
      videoWrap.addEventListener('mouseleave', () => {
        videoCursor.classList.remove('is-visible');
      });
    }
  }

  // ===========================================================
  // Floating glass shapes — masked SVG silhouettes with parallax
  // ===========================================================
  const shapesLayer = document.getElementById('shapes-layer');
  const SHAPES = [1, 2, 3, 4, 5, 6, 7].map((n) => `assets/shapes/vector-shape${n}.svg`);

  // Generate a dense field of placements: small steps in vh,
  // alternating sides, varied sizes and parallax speeds.
  const VARIANTS = ['', 'tinted', 'cool'];
  function buildShapePlacements() {
    const placements = [];
    // Manually-tuned seed positions — keep their look.
    const seeds = [
      { vh:  82, x:  -5, size: 240, src: 4, speed:  0.28, rot:   0 },
      { vh: 130, x:  82, size: 320, src: 1, speed: -0.18, rot:  12 },
      { vh: 230, x:  78, size: 380, src: 2, speed:  0.32, rot:   0 },
      { vh: 540, x:   4, size: 300, src: 7, speed: -0.30, rot:  35 },
      { vh: 580, x:  75, size: 280, src: 6, speed:  0.18, rot: -15 },
      { vh: 820, x:  80, size: 250, src: 4, speed: -0.16, rot:   0 },
    ];
    seeds.forEach((s, i) => placements.push({ ...s, variant: VARIANTS[i % 3] }));

    // Then a procedural rolling field every ~45vh, alternating sides.
    let side = 1;
    for (let vh = 80; vh <= 2700; vh += 40 + Math.floor(Math.random() * 30)) {
      const x = side > 0
        ? 62 + Math.random() * 24   // right cluster
        : -10 + Math.random() * 22; // left cluster
      const size = 160 + Math.floor(Math.random() * 280);
      const src = Math.floor(Math.random() * SHAPES.length);
      const speed = (Math.random() < 0.5 ? -1 : 1) * (0.10 + Math.random() * 0.34);
      const rot = Math.floor(Math.random() * 360);
      const variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
      placements.push({ vh, x, size, src, speed, rot, variant });
      side *= -1;

      // Drop a second shape on the opposite side at almost the same vh (70% chance)
      if (Math.random() < 0.7) {
        const x2 = -side > 0
          ? 60 + Math.random() * 28
          : -12 + Math.random() * 24;
        placements.push({
          vh: vh + 15 + Math.floor(Math.random() * 20),
          x: x2,
          size: 130 + Math.floor(Math.random() * 200),
          src: Math.floor(Math.random() * SHAPES.length),
          speed: (Math.random() < 0.5 ? -1 : 1) * (0.10 + Math.random() * 0.32),
          rot: Math.floor(Math.random() * 360),
          variant: VARIANTS[Math.floor(Math.random() * VARIANTS.length)],
        });
      }

      // Occasionally inject a smaller mid-column accent (35% chance)
      if (Math.random() < 0.35) {
        placements.push({
          vh: vh + Math.floor(Math.random() * 30),
          x: 30 + Math.random() * 40,
          size: 110 + Math.floor(Math.random() * 140),
          src: Math.floor(Math.random() * SHAPES.length),
          speed: (Math.random() < 0.5 ? -1 : 1) * (0.18 + Math.random() * 0.30),
          rot: Math.floor(Math.random() * 360),
          variant: VARIANTS[Math.floor(Math.random() * VARIANTS.length)],
        });
      }
    }
    return placements;
  }

  const SHAPE_PLACEMENTS = buildShapePlacements();

  const shapeEls = [];
  if (shapesLayer) {
    SHAPE_PLACEMENTS.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'glass-shape' + (p.variant ? ' ' + p.variant : '');
      const url = `url("${SHAPES[p.src % SHAPES.length]}")`;
      div.style.webkitMaskImage = url;
      div.style.maskImage = url;
      div.style.width = p.size + 'px';
      div.style.height = p.size + 'px';
      div.style.left = `calc(${p.x}vw)`;
      div.style.top = `calc(${p.vh}vh)`;
      div.dataset.baseRot = String(p.rot);
      div.dataset.speed = String(p.speed);
      shapesLayer.appendChild(div);
      shapeEls.push(div);
    });
  }

  // ===========================================================
  // Parallax (data-parallax="speed") for images + manual elements
  // ===========================================================
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]')).map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax || '0.15'),
  }));

  // ===========================================================
  // Purple-mood ambient orbs (fixed atmosphere layer)
  // ===========================================================
  const ambients = [];
  const purpleImgs = [
    'assets/purple/IMG_0379.JPG',
    'assets/purple/IMG_0627.JPG',
    'assets/purple/IMG_0633.JPG',
    'assets/purple/IMG_0716.JPG',
    'assets/purple/IMG_0725.JPG',
    'assets/purple/IMG_0743.JPG',
    'assets/purple/IMG_0793.JPG',
    'assets/purple/IMG_0643.JPG',
  ];
  const atmos = document.querySelector('.atmosphere');
  if (atmos) {
    const positions = [
      { x:   8, y:  12, size: 520, src: 0, op: 0.55, speed: 0.05 },
      { x:  72, y:  40, size: 620, src: 1, op: 0.50, speed: 0.12 },
      { x:  -8, y:  85, size: 700, src: 2, op: 0.45, speed: 0.18 },
      { x:  68, y: 130, size: 600, src: 3, op: 0.50, speed: 0.09 },
      { x:  10, y: 175, size: 660, src: 4, op: 0.45, speed: 0.15 },
      { x:  72, y: 220, size: 620, src: 5, op: 0.48, speed: 0.20 },
      { x:  -5, y: 265, size: 700, src: 6, op: 0.42, speed: 0.11 },
    ];
    positions.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'ambient';
      div.style.left = p.x + 'vw';
      div.style.top = p.y + 'vh';
      div.style.width = p.size + 'px';
      div.style.height = p.size + 'px';
      div.style.opacity = String(p.op);
      div.style.backgroundImage = `url(${purpleImgs[p.src % purpleImgs.length]})`;
      div.style.backgroundSize = 'cover';
      div.style.backgroundPosition = 'center';
      atmos.appendChild(div);
      ambients.push({ el: div, speed: p.speed });
    });
  }

  // ===========================================================
  // Horizontal sticky scroll (venue slideshow)
  // ===========================================================
  const hScrollSections = Array.from(document.querySelectorAll('.h-scroll'));

  // Re-compute the h-scroll height so total horizontal travel × 1.1
  // happens during the sticky window. This guarantees images finish
  // scrolling before vertical scrolling resumes.
  const MOBILE_BP = 780;

  function isMobile() { return window.innerWidth <= MOBILE_BP; }

  function resetHScrollForMobile(section) {
    section.style.height = '';
    section.style.minHeight = '';
    const pin = section.querySelector('.h-scroll__pin');
    if (pin) pin.style.cssText = '';
    const track = section.querySelector('.h-scroll__track');
    if (track) track.style.transform = '';
  }

  function recalcHScrollHeights() {
    hScrollSections.forEach((section) => {
      if (isMobile()) {
        resetHScrollForMobile(section);
        return;
      }
      const track = section.querySelector('.h-scroll__track');
      if (!track) return;
      const max = Math.max(0, track.scrollWidth - window.innerWidth);
      const desiredScroll = max + window.innerHeight * 0.5;
      section.style.height = (window.innerHeight + desiredScroll) + 'px';
    });
  }
  // expose for lang switch
  window.__recalcH = recalcHScrollHeights;

  function updateHScroll(section) {
    if (isMobile()) {
      const track = section.querySelector('.h-scroll__track');
      if (track) track.style.transform = '';
      return;
    }
    const rect = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    const scrolled = Math.max(0, Math.min(total, -rect.top));
    const t = total > 0 ? scrolled / total : 0;
    const track = section.querySelector('.h-scroll__track');
    if (!track) return;
    const max = Math.max(0, track.scrollWidth - window.innerWidth);
    track.style.transform = `translate3d(${-t * max}px, 0, 0)`;
    const prog = section.querySelector('.h-scroll__progress > span');
    if (prog) prog.style.width = (t * 100).toFixed(2) + '%';
    const countEl = section.querySelector('.h-scroll__count b');
    if (countEl) {
      const cards = section.querySelectorAll('.h-scroll__card').length;
      const n = Math.max(1, Math.min(cards, Math.floor(t * cards) + 1));
      countEl.textContent = String(n).padStart(2, '0');
    }
  }

  // ===========================================================
  // Dot nav active state
  // ===========================================================
  const dotLinks = Array.from(document.querySelectorAll('.dot-nav a'));
  const sectionsForDots = dotLinks
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  function updateDotNav() {
    const sy = window.scrollY + window.innerHeight * 0.4;
    let activeIdx = 0;
    sectionsForDots.forEach((s, i) => {
      if (s.offsetTop <= sy) activeIdx = i;
    });
    dotLinks.forEach((a, i) => a.classList.toggle('active', i === activeIdx));
  }

  // ===========================================================
  // Smooth scroll on dot nav click
  // ===========================================================
  dotLinks.forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
      }
    });
  });

  // ===========================================================
  // Scroll/resize loop
  // ===========================================================
  const heroBg = document.querySelector('.hero__bg');
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = window.innerHeight;
      const sy = window.scrollY;

      // Generic parallax items
      parallaxEls.forEach(({ el, speed }) => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const delta = (center - vh / 2) * speed;
        el.style.transform = `translate3d(0, ${-delta}px, 0)`;
      });

      // Glass shapes: parallax + slight rotation drift
      shapeEls.forEach((el) => {
        const speed = parseFloat(el.dataset.speed);
        const baseRot = parseFloat(el.dataset.baseRot);
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const delta = (center - vh / 2) * speed;
        const r = baseRot + (sy * 0.01 * Math.sign(speed));
        el.style.transform = `translate3d(0, ${-delta}px, 0) rotate(${r}deg)`;
      });

      // Ambient orbs drift (fixed layer)
      ambients.forEach(({ el, speed }) => {
        el.style.transform = `translate3d(0, ${-sy * speed}px, 0)`;
      });

      // Hero subtle drift
      if (heroBg) {
        const heroVis = Math.max(0, Math.min(1, 1 - sy / vh));
        heroBg.style.transform = `translate3d(0, ${sy * 0.25}px, 0) scale(${1 + sy / 6000})`;
        heroBg.style.opacity = String(0.4 + heroVis * 0.6);
      }

      // Horizontal sticky scroll
      hScrollSections.forEach(updateHScroll);

      // Dot nav
      updateDotNav();

      ticking = false;
    });
  }

  function onResize() {
    recalcHScrollHeights();
    onScroll();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  // Recompute after images / fonts load
  window.addEventListener('load', onResize);
  // Initial paint
  recalcHScrollHeights();
  onScroll();
})();
