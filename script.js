/* =============================================
   Wedding Invitation — Interaction Logic
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  const envelopeOverlay = document.getElementById('envelope-overlay');
  const envelope = document.getElementById('envelope');
  const revealEls = document.querySelectorAll('.reveal-el');
  const music = document.getElementById('bg-music');

  let isOpened = false;

  // ---------------------------
  // 1. Countdown timer + moon phase
  // ---------------------------
  const WEDDING_DATE = new Date('2027-01-29T00:00:00');
  const START_DATE = new Date();

  initCountdown();

  function initCountdown() {
    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');
    const secsEl = document.getElementById('cd-secs');
    const moonShadow = document.getElementById('moon-shadow');
    const moonCaption = document.getElementById('moon-caption');
    if (!daysEl) return;

    const totalSpan = WEDDING_DATE.getTime() - START_DATE.getTime();
    let hasAnnouncedArrival = false;

    function setValue(el, value) {
      const padded = String(value).padStart(2, '0');
      if (el.textContent !== padded) {
        el.textContent = padded;
        el.classList.remove('tick');
        void el.offsetWidth;
        el.classList.add('tick');
      }
    }

    function tick() {
      const now = new Date();
      const diff = Math.max(0, WEDDING_DATE.getTime() - now.getTime());

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor(diff / 3600000) % 24;
      const mins = Math.floor(diff / 60000) % 60;
      const secs = Math.floor(diff / 1000) % 60;

      setValue(daysEl, days);
      setValue(hoursEl, hours);
      setValue(minsEl, mins);
      setValue(secsEl, secs);

      const elapsed = Math.min(totalSpan, Math.max(0, now.getTime() - START_DATE.getTime()));
      const fraction = totalSpan > 0 ? elapsed / totalSpan : 1;
      const shadowCx = 50 + 32 * (1 - fraction);
      if (moonShadow) moonShadow.setAttribute('cx', shadowCx.toFixed(2));

      if (diff <= 0 && !hasAnnouncedArrival) {
        hasAnnouncedArrival = true;
        if (moonCaption) moonCaption.textContent = 'married, under a full moon';
      }
    }

    tick();
    setInterval(tick, 1000);
  }

  // Lock all scrolling until envelope is opened
  function preventScroll(e) {
    if (!isOpened) {
      e.preventDefault();
    }
  }
  window.addEventListener('touchmove', preventScroll, { passive: false });
  window.addEventListener('wheel', preventScroll, { passive: false });

  // ---------------------------
  // 2. Click → Open flap, play music, then fade out
  // ---------------------------
  if (envelopeOverlay) {
    envelopeOverlay.addEventListener('click', handleOpen);
  }

  function handleOpen() {
    if (isOpened) return;
    isOpened = true;

    // Step 1: Trigger envelope opening
    envelope.classList.add('opened');

    // Play music with fade-in after 1.4s
    if (music) {
      music.volume = 0;
      setTimeout(() => {
        music.play().then(() => fadeInMusic(0.35, 1800)).catch(() => { });
      }, 1400);
    }

    // Step 2: Fade out overlay after flap opens
    setTimeout(() => {
      envelopeOverlay.classList.add('fade-out');
    }, 1400);

    // Step 3: Unlock body scroll, hide overlay, and trigger initial section reveals
    setTimeout(() => {
      document.documentElement.classList.add('unlocked');
      document.body.classList.add('unlocked');
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('wheel', preventScroll);
      envelopeOverlay.style.display = 'none';
      triggerReveals();
    }, 3000);
  }

  function fadeInMusic(target = 0.35, duration = 1800) {
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const fade = setInterval(() => {
      current += increment;
      music.volume = Math.min(current, target);
      if (current >= target) clearInterval(fade);
    }, duration / steps);
  }

  function triggerReveals() {
    revealEls.forEach(el => {
      const delay = parseInt(el.dataset.delay) || 0;
      setTimeout(() => el.classList.add('revealed'), delay);
    });
  }

  // ---------------------------
  // 3. Smooth Scroll Observer for Sections & Elements
  // ---------------------------
  const scrollElements = document.querySelectorAll('.reveal-on-scroll, .details-card, .entourage-card, .rsvp-card, .countdown-content, .gallery-content');

  if (scrollElements.length) {
    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

    scrollElements.forEach((el) => {
      el.classList.add('reveal-on-scroll');
      scrollObserver.observe(el);
    });
  }

  // ---------------------------
  // 4. Polaroid Scroll Reveal
  // ---------------------------
  const polaroids = document.querySelectorAll('.polaroid-item');
  if (polaroids.length) {
    const polaroidObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          polaroidObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    polaroids.forEach((el) => polaroidObserver.observe(el));
  }
});

/* ============================
   OUR STORY — SCROLL SECTION JS
   Drives the spine draw-on-scroll and the
   fade-in of each step's image/text.
   ============================ */
(function () {
  const story = document.getElementById('story');
  const svg = document.getElementById('spine');
  const track = document.getElementById('track');
  const drawn = document.getElementById('drawn');
  const steps = Array.from(document.querySelectorAll('.step'));

  if (!story || !svg) return; // section not on this page, skip safely

  // ---- 1. Build a wiggly "spiral-ish" path down the center ----
  // Generates a sine-like wave using cubic beziers so it feels hand-drawn.
  // amp = how wide the wiggle swings, step = vertical distance per wiggle.
  // IMPORTANT: width here must match the spine's real rendered width
  // (not a fixed number) or the viewBox scales X and Y differently,
  // which stretches the round dots into ovals.
  function buildPath(width, height) {
    const midX = width / 2;
    const amp = Math.min(width * 0.32, 34); // scales with width, capped
    const step = 140;
    let d = `M ${midX} 0`;
    let y = 0;
    let dir = 1;
    while (y < height) {
      const nextY = y + step;
      const cx = midX + amp * dir;
      d += ` C ${cx} ${y + step * 0.25}, ${cx} ${y + step * 0.75}, ${midX} ${nextY}`;
      dir *= -1;
      y = nextY;
    }
    return d;
  }

  // node dots, one centered on each .step, added to the svg.
  // Placed using the path's actual geometry (getPointAtLength) so the
  // dot always sits exactly on the wavy line, not at a fixed x that
  // the curve might be swinging away from at that height.
  function placeDots(width, height) {
    svg.querySelectorAll('circle').forEach((c) => c.remove());
    const r = Math.min(width * 0.3, 7); // stays a true circle, just smaller on narrow spines
    const totalLen = track.getTotalLength();

    // path.y increases monotonically top to bottom, so binary search
    // along the path's length for the point whose y matches the target.
    function pointAtY(targetY) {
      let lo = 0;
      let hi = totalLen;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const pt = track.getPointAtLength(mid);
        if (pt.y < targetY) lo = mid;
        else hi = mid;
      }
      return track.getPointAtLength((lo + hi) / 2);
    }

    steps.forEach((step) => {
      const stepTop = step.offsetTop;
      const stepMid = stepTop + step.offsetHeight / 2;
      const yInSvg = (stepMid / story.offsetHeight) * height;
      const pt = pointAtY(yInSvg);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pt.x);
      circle.setAttribute('cy', pt.y);
      circle.setAttribute('r', r);
      svg.appendChild(circle);
      step._dot = circle;
      step._dotY = pt.y;
    });
  }

  let pathLength = 0;
  function layout() {
    const width = svg.clientWidth;   // actual rendered spine width at this breakpoint
    const height = story.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`); // 1:1 with real pixels, so X and Y scale equally
    const d = buildPath(width, height);
    track.setAttribute('d', d);
    drawn.setAttribute('d', d);
    pathLength = drawn.getTotalLength();
    drawn.style.strokeDasharray = pathLength;
    drawn.style.strokeDashoffset = pathLength; // start fully hidden
    placeDots(width, height); // must run after track's "d" is set
  }

  // ---- 2. On scroll: reveal the line up to how far the user has scrolled
  //         through .story, and light up dots / fade in image+text ----
  function onScroll() {
    const rect = story.getBoundingClientRect();
    const viewportMid = window.innerHeight * 0.55; // "reveal point" on screen
    const scrolled = viewportMid - rect.top;
    const progress = Math.min(Math.max(scrolled / story.offsetHeight, 0), 1);

    drawn.style.strokeDashoffset = pathLength * (1 - progress);

    steps.forEach((step) => {
      const stepRect = step.getBoundingClientRect();
      const isVisible =
        stepRect.top < window.innerHeight * 0.7 && stepRect.bottom > window.innerHeight * 0.2;
      step.classList.toggle('is-visible', isVisible);
      if (step._dot) {
        const dotScreenY = svg.getBoundingClientRect().top + step._dotY;
        step._dot.classList.toggle('lit', dotScreenY < viewportMid);
      }
    });
  }

  window.addEventListener('resize', () => {
    layout();
    onScroll();
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', () => {
    layout();
    onScroll();
  });
  layout();
  onScroll();
})();