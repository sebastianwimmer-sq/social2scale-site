/* raum.js — der Raum antwortet (27.10.2026, Richtung E „Lichtstudio mit Verlaufslicht“).
 *
 * 0. Abzüge laden nach dem load-Ereignis (data-src), nie im Wettlauf mit dem ersten Bild.
 * S. Seitenlicht: der ruhige Kegel über der Seite steht über dem Abschnitt, den man gerade liest,
 *    und ruht, solange der Kopf-Raum zu sehen ist (nie zwei Kegel zugleich).
 * 1. Licht an: sobald der Raum zur Hälfte im Bild ist, EINMAL (.an). Bei „weniger Bewegung“
 *    sofort und ohne Übergang — das Standbild zeigt die Arbeiten im Licht.
 * 2. Der Raum folgt: Maus (nur feiner Zeiger), Neigen am Handy, Scrollen. Werte laufen weich
 *    nach (ein rAF je Frame, ein Maß je Frame), geschrieben werden nur --mx/--my/--sp.
 *    iOS fragt den Neigungssensor erst nach einem Tippen in den Raum-Abschnitt.
 * 3. Staub im Lichtkegel: Teilchen mit Tiefe (fern klein/blass, nah groß/weich), nur solange der
 *    Raum sichtbar ist und der Tab vorn liegt. Das ist das einzig Endlose → Halte-Knopf (WCAG 2.2.2),
 *    gemerkt in localStorage.
 */
(function () {
  'use strict';
  var raeume = [].slice.call(document.querySelectorAll('[data-raum]'));
  var ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  seitenlicht();
  if (!raeume.length) return;

  // 0. Die Abzüge laden erst nach dem ersten Bild: auf langsamem Netz nahmen sie Schrift und Logo
  //    die Leitung weg (Besucher-Sim „langsam“: LCP 2,2 s → 2,5–2,9 s, 27.10.2026).
  //    Gezeichnet wird auf eine Leinwand statt als <img>: sonst wird am Desktop ein später Abzug zum
  //    „größten Element“ und verschiebt LCP hinter das Logo (raum-check, 27.10.2026). Zuschnitt 4:5 wie object-fit:cover.
  var ladeAbzuege = function () {
    raeume.forEach(function (r) {
      [].forEach.call(r.querySelectorAll('img[data-src]'), function (i) {
        var bild = new Image();
        bild.decoding = 'async';
        bild.onload = function () {
          var c = document.createElement('canvas');
          c.width = 360; c.height = 450;
          var q = bild.naturalWidth / bild.naturalHeight, sw = bild.naturalWidth, sh = bild.naturalHeight, sx = 0, sy = 0;
          if (q > 0.8) { sw = sh * 0.8; sx = (bild.naturalWidth - sw) / 2; } else { sh = sw / 0.8; sy = (bild.naturalHeight - sh) / 2; }
          c.getContext('2d').drawImage(bild, sx, sy, sw, sh, 0, 0, 360, 450);
          i.replaceWith(c);
        };
        bild.src = i.getAttribute('data-src');
      });
    });
  };
  if (document.readyState === 'complete') ladeAbzuege(); else addEventListener('load', ladeAbzuege);
  var feinerZeiger = matchMedia('(pointer: fine)').matches;

  // 1. Licht an
  if (ruhig || !('IntersectionObserver' in window)) {
    raeume.forEach(function (r) { r.classList.add('an'); });
    return;
  }
  var lichtIo = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      lichtIo.unobserve(e.target);
      setTimeout(function () { e.target.classList.add('an'); }, e.target.hasAttribute('data-spaet') ? 1600 : 350);
    });
  }, { threshold: 0.4 });
  raeume.forEach(function (r) { lichtIo.observe(r); });

  // 2. Antwort
  var GESPEICHERT = 'raum-pause';
  var gehalten = false;
  try { gehalten = localStorage.getItem(GESPEICHERT) === '1'; } catch (e) { /* privat */ }
  var sichtbar = new Set();
  var ziel = { x: 0, y: 0 };
  var neigung = null;

  raeume.forEach(function (r) {
    r._ist = { x: 0, y: 0 };
    r._staub = r.querySelector('.raum-staub');
    if (r._staub) baueStaub(r);
  });
  var sichtIo = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { sichtbar.add(e.target); e.target.classList.add('lebt'); }
      else { sichtbar.delete(e.target); e.target.classList.remove('lebt'); }
    });
    starte();
  });
  raeume.forEach(function (r) { sichtIo.observe(r); });

  if (feinerZeiger) {
    addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      ziel.x = (e.clientX / innerWidth - 0.5) * 2;
      ziel.y = (e.clientY / innerHeight - 0.5) * 2;
      starte();
    }, { passive: true });
  } else {
    var neigen = function (e) {
      if (e.gamma == null) return;
      neigung = true;
      ziel.x = Math.max(-1, Math.min(1, e.gamma / 30));
      ziel.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      starte();
    };
    var DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      // iOS: erst nach einer Geste fragen, und nur im Raum-Abschnitt
      raeume.forEach(function (r) {
        var abschnitt = r.parentElement;
        abschnitt.addEventListener('click', function frage() {
          abschnitt.removeEventListener('click', frage);
          DOE.requestPermission().then(function (s) { if (s === 'granted') addEventListener('deviceorientation', neigen, { passive: true }); }).catch(function () {});
        });
      });
    } else if (DOE) addEventListener('deviceorientation', neigen, { passive: true });
  }
  addEventListener('scroll', starte, { passive: true });
  document.addEventListener('visibilitychange', starte);

  // Halten
  raeume.forEach(function (r) {
    if (!r._staub) return;
    var k = document.createElement('button');
    k.type = 'button';
    k.className = 'raum-halt';
    var schreibe = function () {
      k.textContent = gehalten ? 'Bewegung fortsetzen' : 'Bewegung anhalten';
      k.setAttribute('aria-pressed', String(gehalten));
    };
    schreibe();
    k.addEventListener('click', function () {
      gehalten = !gehalten;
      try { localStorage.setItem(GESPEICHERT, gehalten ? '1' : '0'); } catch (e) { /* privat */ }
      schreibe();
      starte();
    });
    r.parentElement.appendChild(k);
  });

  var laeuft = false;
  function starte() {
    if (laeuft || !sichtbar.size || document.hidden || gehalten) return;
    laeuft = true;
    requestAnimationFrame(bild);
  }
  function bild() {
    laeuft = false;
    if (!sichtbar.size || document.hidden || gehalten) return;
    var weiter = false;
    sichtbar.forEach(function (r) {
      var ist = r._ist;
      ist.x += (ziel.x - ist.x) * 0.07;
      ist.y += (ziel.y - ist.y) * 0.07;
      var box = r.getBoundingClientRect();
      var sp = Math.max(0, Math.min(1, -box.top / Math.max(1, box.height)));
      r.style.setProperty('--mx', ist.x.toFixed(3));
      r.style.setProperty('--my', ist.y.toFixed(3));
      r.style.setProperty('--sp', sp.toFixed(3));
      if (Math.abs(ziel.x - ist.x) > 0.002 || Math.abs(ziel.y - ist.y) > 0.002) weiter = true;
      if (r._staub) { zeichneStaub(r, box); weiter = true; }
    });
    if (weiter) { laeuft = true; requestAnimationFrame(bild); }
  }

  // 3. Staub
  function baueStaub(r) {
    var anzahl = innerWidth < 760 ? 26 : 54;
    r._teile = [];
    for (var i = 0; i < anzahl; i++) r._teile.push({ x: Math.random(), y: Math.random(), z: Math.random(), v: 0.0002 + Math.random() * 0.0005 });
    r._ctx = r._staub.getContext('2d');
    r._mitte = (parseFloat(getComputedStyle(r).getPropertyValue('--kegel-x')) || 50) / 100;
  }
  function zeichneStaub(r, box) {
    var c = r._staub, w = c.clientWidth, h = c.clientHeight, d = Math.min(1.5, devicePixelRatio || 1);
    if (!w || !h) return;
    if (c.width !== Math.round(w * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
    var x = r._ctx;
    x.setTransform(d, 0, 0, d, 0, 0);
    x.clearRect(0, 0, w, h);
    var kx = (r._mitte + r._ist.x * 0.08) * w;
    for (var i = 0; i < r._teile.length; i++) {
      var p = r._teile[i];
      p.y -= p.v * (0.5 + p.z);
      if (p.y < 0) { p.y = 1; p.x = Math.random(); }
      var px = kx + (p.x - 0.5) * w * (0.08 + p.y * 0.42), py = p.y * h * 0.82;
      var rad = (0.6 + p.z * 2.2) * 2.2, a = 0.07 + p.z * 0.3;
      var g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, 'rgba(190,255,230,' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(190,255,230,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, rad, 0, 6.283); x.fill();
    }
  }

  // S. Seitenlicht
  function seitenlicht() {
    var licht = document.querySelector('[data-raum-licht]');
    if (!licht || !('IntersectionObserver' in window)) return;
    var kopfZuSehen = false;
    var setze = function () { licht.classList.toggle('an', !kopfZuSehen); };
    raeume.forEach(function (r) {
      new IntersectionObserver(function (es) { kopfZuSehen = es[0].intersectionRatio > 0.2; setze(); }, { threshold: [0, 0.2, 0.5] }).observe(r);
    });
    setze();
    if (ruhig) return;
    var folge = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var ziel = e.target.querySelector('h1, h2, h3') || e.target;
        var box = ziel.getBoundingClientRect();
        var x = Math.max(15, Math.min(85, (box.left + Math.min(box.width, 520) / 2) / innerWidth * 100));
        licht.style.setProperty('--licht-x', x.toFixed(1) + '%');
      });
    }, { rootMargin: '-35% 0px -45% 0px' });
    [].forEach.call(document.querySelectorAll('main section, main > article, main > .wrap, main.card, main.blatt'), function (s) { folge.observe(s); });
  }
})();
