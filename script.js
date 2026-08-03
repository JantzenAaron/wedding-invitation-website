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
