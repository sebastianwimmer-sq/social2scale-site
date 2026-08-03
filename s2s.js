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

  // ---------- 4) Angepinnte Szenen ----------
  // Dieselbe Technik wie die Phasen-Buehne der Startseite: ein hoher Track gibt
  // die Scrollstrecke, ein sticky Fenster darin bleibt stehen, und der
  // Fortschritt 0..1 schaltet die Schritte. Hier generisch, damit jede Seite
  // eine Szene bauen kann:
  //   <section data-scene>
  //     <div class="…-track"><div class="…-pin">
  //       <x data-scene-step="0"> … <x data-scene-panel="0">
  // Der Treiber setzt --p auf die Szene und .is-active auf Schritt und Tafel.
  var szenen = [].slice.call(document.querySelectorAll('[data-scene]')).map(function (el) {
    return {
      el: el,
      track: el.querySelector('[data-scene-track]') || el,
      schritte: [].slice.call(el.querySelectorAll('[data-scene-step]')),
      tafeln: [].slice.call(el.querySelectorAll('[data-scene-panel]')),
      letzter: -1,
    };
  });

  function szeneZeichnen(s) {
    var box = s.track.getBoundingClientRect();
    var strecke = box.height - window.innerHeight;
    if (strecke <= 0) return;
    var p = Math.min(1, Math.max(0, -box.top / strecke));
    s.el.style.setProperty('--p', p.toFixed(4));

    var anzahl = s.schritte.length || 1;
    // Etwas Vorlauf, damit der letzte Schritt nicht erst am allerletzten Pixel
    // aktiv wird: der Fortschritt wird auf 0..anzahl gestreckt und gedeckelt.
    var idx = Math.min(anzahl - 1, Math.floor(p * anzahl * 1.04));
    if (idx === s.letzter) return;
    s.letzter = idx;
    s.schritte.forEach(function (e, i) { e.classList.toggle('is-active', i === idx); });
    s.tafeln.forEach(function (e, i) { e.classList.toggle('is-active', i === idx); });
  }

  function zeichne() {
    var y = window.pageYOffset;

    if (bar) {
      if (y > 24) bar.classList.add('is-scrolled');
      else bar.classList.remove('is-scrolled');
    }

    for (var s = 0; s < szenen.length; s++) szeneZeichnen(szenen[s]);

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
