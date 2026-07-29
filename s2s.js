/**
 * social2scale — geteiltes Verhalten.
 *
 * Das Gegenstueck zu s2s.css: bis zum 29.07.2026 gab es nur geteiltes CSS,
 * jede Seite hatte ihr eigenes Skript. Bewegung, die auf Scrollen reagiert,
 * gehoert hierher — dann bekommt sie jede Seite, statt nur die Startseite.
 *
 * Regeln:
 * - Nur transform und opacity anfassen, nie Layout-Eigenschaften.
 * - Ein einziger Scroll-Zuhoerer, gedrosselt ueber requestAnimationFrame.
 * - prefers-reduced-motion schaltet alles Bewegte ab.
 */
(function () {
  'use strict';

  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 1) Leiste verdichtet sich beim Scrollen ----------
  var bar = document.querySelector('.bar');

  // ---------- 2) Parallax: Hintergruende scrollen langsamer als der Text ----------
  // Elemente mit data-parallax="0.4" bewegen sich mit 40 Prozent der
  // Scrollgeschwindigkeit. Nur was gerade sichtbar ist, wird gerechnet.
  var lagen = [].slice.call(document.querySelectorAll('[data-parallax]'));
  var sichtbar = [];

  if (lagen.length && !ruhig && 'IntersectionObserver' in window) {
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        var i = sichtbar.indexOf(e.target);
        if (e.isIntersecting && i === -1) sichtbar.push(e.target);
        else if (!e.isIntersecting && i > -1) sichtbar.splice(i, 1);
      });
    }, { rootMargin: '120px 0px' });
    lagen.forEach(function (el) {
      el.style.willChange = 'transform';
      beobachter.observe(el);
    });
  }

  function zeichne() {
    var y = window.pageYOffset;

    if (bar) {
      if (y > 24) bar.classList.add('is-scrolled');
      else bar.classList.remove('is-scrolled');
    }

    for (var i = 0; i < sichtbar.length; i++) {
      var el = sichtbar[i];
      var tempo = parseFloat(el.getAttribute('data-parallax')) || 0.4;
      var oben = el.parentElement.getBoundingClientRect().top + y;
      var versatz = (y - oben) * tempo;
      el.style.transform = 'translate3d(0,' + versatz.toFixed(1) + 'px,0)';
    }
    laeuft = false;
  }

  var laeuft = false;
  function anstossen() {
    if (laeuft) return;
    laeuft = true;
    requestAnimationFrame(zeichne);
  }

  window.addEventListener('scroll', anstossen, { passive: true });
  window.addEventListener('resize', anstossen, { passive: true });
  zeichne();

  // ---------- 3) Ueberschriften wischen auf ----------
  // Kein Aufsplitten in Zeilen: die Ueberschriften enthalten <em> mit
  // Verlaufsfuellung, und ein Zerlegen in Woerter wuerde die zerstoeren.
  // Stattdessen ein clip-path von unten nach oben ueber die ganze Zeile.
  var wische = [].slice.call(document.querySelectorAll('.wipe'));
  if (wische.length && 'IntersectionObserver' in window) {
    var wb = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('on');
          wb.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    wische.forEach(function (el) { wb.observe(el); });
  } else {
    wische.forEach(function (el) { el.classList.add('on'); });
  }
})();
