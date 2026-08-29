/* ============================================================
   DyadIQ Labs — Interaktionen
   1. Reveal-on-Scroll (IntersectionObserver)
   2. Nav-Hintergrund verdichtet sich beim Scrollen
   3. Maus-Parallax in der Hero-Section
   4. Magnetische Buttons
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, lo, hi) { return Math.min(Math.max(v, lo), hi); };

  /* ---------- 1. Reveal-on-Scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Shared scroll state ---------- */
  var nav = document.getElementById('nav');
  var heroImages = document.querySelector('[data-parallax-images]');
  var heroBlob = document.querySelector('[data-parallax-blob]');
  var hero = document.getElementById('hero');

  var scrollY = window.scrollY;
  var mx = 0;   // -0.5 .. 0.5
  var my = 0;
  var frame = null;

  function render() {
    frame = null;

    if (nav) {
      nav.style.setProperty('--nav-opacity', clamp(0.6 + scrollY / 400, 0, 0.95));
      nav.style.setProperty('--nav-border', clamp(0.08 + scrollY / 2000, 0, 0.16));
    }

    if (reduceMotion) return;

    if (heroBlob) {
      heroBlob.style.translate = (mx * 60).toFixed(1) + 'px ' + (my * 60).toFixed(1) + 'px';
    }
    if (heroImages) {
      var y = my * -18 + Math.min(scrollY * 0.08, 40);
      heroImages.style.translate = (mx * -18).toFixed(1) + 'px ' + y.toFixed(1) + 'px';
    }
  }

  function schedule() {
    if (frame === null) frame = requestAnimationFrame(render);
  }

  /* ---------- 2. Nav + 3. Parallax ---------- */
  window.addEventListener('scroll', function () {
    scrollY = window.scrollY;
    schedule();
  }, { passive: true });

  if (hero && !reduceMotion) {
    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect();
      mx = (e.clientX - rect.left) / rect.width - 0.5;
      my = (e.clientY - rect.top) / rect.height - 0.5;
      schedule();
    });
    hero.addEventListener('mouseleave', function () {
      mx = 0; my = 0;
      schedule();
    });
  }

  render();

  /* ---------- 4. Magnetische Buttons ---------- */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.magnet').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = (e.clientX - rect.left - rect.width / 2) * 0.35;
        var y = (e.clientY - rect.top - rect.height / 2) * 0.35;
        btn.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = 'translate(0px, 0px)';
      });
    });
  }
})();
