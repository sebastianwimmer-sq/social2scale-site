/* Startseite im Lichtstudio (30.10.2026): einmal Licht je Set, Leuchttisch-Punkte, Ringlicht-Phasen.
   Ohne Skript stehen alle Inhalte da (Phasen als Liste), nur das Licht bleibt aus. */
(function () {
  var sets = [].slice.call(document.querySelectorAll('[data-st-set]'));
  var ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function an(el) { el.classList.add('an'); }

  if (ruhig || !('IntersectionObserver' in window)) {
    sets.forEach(an);
  } else {
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { an(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.3 });
    var los = function () { setTimeout(function () { sets.forEach(function (s) { io.observe(s); }); }, 350); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(los); else los();
  }

  var blaetter = document.querySelector('[data-st-blaetter]');
  var punkte = [].slice.call(document.querySelectorAll('[data-st-punkte] i'));
  if (blaetter && punkte.length) {
    blaetter.addEventListener('scroll', function () {
      var erstes = blaetter.firstElementChild;
      var schritt = erstes.getBoundingClientRect().width + 14;
      var i = Math.min(punkte.length - 1, Math.round(blaetter.scrollLeft / schritt));
      punkte.forEach(function (p, n) { p.classList.toggle('jetzt', n === i); });
    }, { passive: true });
  }

  var knoepfe = [].slice.call(document.querySelectorAll('[data-st-phase]'));
  var karten = [].slice.call(document.querySelectorAll('[data-st-karte]'));
  var segs = [].slice.call(document.querySelectorAll('.st-seg'));
  var kacheln = [].slice.call(document.querySelectorAll('.st-gitter i'));
  var VOLL = [0, 2, 4, 6];
  function zeige(n) {
    segs.forEach(function (s, i) { s.classList.toggle('an', i <= n); });
    kacheln.forEach(function (k, i) { k.classList.toggle('voll', i < VOLL[n]); });
    knoepfe.forEach(function (k, i) { k.setAttribute('aria-selected', String(i === n)); k.tabIndex = i === n ? 0 : -1; });
    karten.forEach(function (k, i) { k.hidden = i !== n; });
  }
  if (knoepfe.length) {
    knoepfe.forEach(function (k, i) {
      k.hidden = false;
      k.addEventListener('click', function () { zeige(i); });
      k.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        var n = (i + d + knoepfe.length) % knoepfe.length;
        zeige(n); knoepfe[n].focus(); e.preventDefault();
      });
    });
    var leiste = document.querySelector('[data-st-phasen]');
    if (leiste) leiste.hidden = false;
    zeige(0);
  }
})();
