/* Bewegung, die den Inhalt erzaehlt (01.10.2026) — siehe bewegung.css.
   Laedt auf allen sechs Seiten. Ohne dieses Skript ist jede Seite fertig
   und sichtbar; es fuegt nur Bewegung hinzu. */
(function () {
  'use strict';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Gradient-Flow nur im Bild: spart Arbeit ausserhalb des Fensters */
  var worte = document.querySelectorAll('main :is(h1,h2,h3,blockquote) em, main .s2em');
  if (!still && 'IntersectionObserver' in window && worte.length) {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { e.target.classList.toggle('fliesst', e.isIntersecting); });
    }, { rootMargin: '80px 0px' });
    worte.forEach(function (w) { io.observe(w); });
  }

  /* Ablauf: Weg durch die Phasen. Eine Messung je Frame, nur beim Scrollen. */
  var phasen = [].slice.call(document.querySelectorAll('.fl-phase'));
  if (phasen.length) {
    var geplant = false;
    var weg = function () {
      geplant = false;
      var vh = window.innerHeight;
      phasen.forEach(function (p) {
        var oben = p.getBoundingClientRect().top;
        var v = still ? 1 : Math.max(0, Math.min(1, (vh * 0.85 - oben) / (vh * 0.5)));
        p.style.setProperty('--weg', v.toFixed(3));
        p.classList.toggle('ist-erreicht', v >= 1);
      });
    };
    window.addEventListener('scroll', function () {
      if (!geplant) { geplant = true; window.requestAnimationFrame(weg); }
    }, { passive: true });
    window.addEventListener('resize', weg);
    weg();
  }

  /* Licht folgt der Maus — nur mit feinem Zeiger, nie am Handy */
  if (!still && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('[data-licht]').forEach(function (karte) {
      var licht = document.createElement('span');
      licht.className = 's2-licht';
      licht.setAttribute('aria-hidden', 'true');
      karte.insertBefore(licht, karte.firstChild);
      karte.addEventListener('pointermove', function (e) {
        var r = karte.getBoundingClientRect();
        karte.style.setProperty('--lx', (e.clientX - r.left) + 'px');
        karte.style.setProperty('--ly', (e.clientY - r.top) + 'px');
      });
    });
  }
})();
