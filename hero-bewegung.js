/* hero-bewegung.js — der Hero lebt (16.10.2026, Sebi: „kann sich der Hintergrund noch im
 * Endlos-Loop bewegen“ → „Mischung“ aus Video und live gezeichnet).
 *
 * Hinten: Higgsfield-Licht-Video (weiches Emerald/Teal, ohne Details — wird nie „unscharf“).
 * Vorne: die Wachstumslinie und das Punkte-Feld, live im Browser gezeichnet, auf jedem
 * Bildschirm gestochen scharf. Das scharfe Standbild (hero-linie) bleibt der erste Eindruck
 * und der Rueckfall: ohne JS, bei „weniger Bewegung“ und bis die Zeichnung steht.
 *
 * WCAG 2.2.2: Endlos-Bewegung neben Text braucht eine Pause — der Knopf unten rechts haelt
 * Video und Zeichnung an (und merkt sich das). Ausserhalb des Bildschirms und im
 * Hintergrund-Tab steht beides still (Akku, Rechenzeit).
 */
(function () {
  'use strict';
  var hero = document.getElementById('hero');
  var bg = hero && hero.querySelector('.hero-bg');
  if (!bg || !window.HTMLCanvasElement) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var GESPEICHERT = 'hero-bewegung-pause';
  var pausiert = false;
  try { pausiert = localStorage.getItem(GESPEICHERT) === '1'; } catch (e) { /* privat */ }

  // ---- Video (hinten) ----
  var video = document.createElement('video');
  video.className = 'hero-video';
  video.muted = true; video.loop = true; video.playsInline = true;
  video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('aria-hidden', 'true');
  video.preload = 'none';
  var sparen = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));

  // ---- Zeichnung (vorne) ----
  var cv = document.createElement('canvas');
  cv.className = 'hero-zeichnung';
  cv.setAttribute('aria-hidden', 'true');
  var cx = cv.getContext('2d');
  bg.appendChild(video); bg.appendChild(cv);

  var W = 0, H = 0, dpr = 1, schmal = false;
  function masse() {
    var r = bg.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    schmal = W < 700;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    knoten = linie();
  }

  // Die Linie: von unten links nach oben rechts, mit leichten Stufen wie im Standbild.
  var knoten = [];
  function linie() {
    var n = schmal ? 9 : 16, pts = [];
    var x0 = schmal ? 0.30 : 0.04, x1 = 1.02, y0 = schmal ? 0.98 : 0.97, y1 = schmal ? 0.62 : 0.10;
    for (var i = 0; i < n; i++) {
      var f = i / (n - 1);
      var stufe = Math.sin(i * 1.7) * 0.018 + (i % 3 === 1 ? -0.012 : 0.008);
      pts.push({ x: (x0 + (x1 - x0) * f) * W, y: (y0 + (y1 - y0) * Math.pow(f, 1.35) + stufe) * H, p: Math.random() * 6.28 });
    }
    return pts;
  }

  var EMERALD = [0, 184, 136], TEAL = [31, 166, 224];
  function mix(a, b, f) { return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * f); }); }

  function feld(t) {
    // Wogende Punkte-Flaeche unten rechts (wie im Standbild): Reihen werden zum Horizont dichter,
    // zwei Wellen laufen gegeneinander, vorne groesser und heller.
    var reihen = schmal ? 22 : 42, spalten = schmal ? 70 : 170;
    var links = schmal ? 0.05 : 0.26, horizont = schmal ? 0.66 : 0.44;
    for (var r = 0; r < reihen; r++) {
      var tiefe = r / (reihen - 1);                          // 0 Horizont … 1 vorne
      var yBasis = (horizont + (1.02 - horizont) * Math.pow(tiefe, 1.9)) * H;
      var groesse = (0.8 + tiefe * 1.8) * dpr;
      for (var s = 0; s < spalten; s++) {
        var u = s / (spalten - 1);
        var x = (links + (1.08 - links) * u) * W + (u - 0.5) * tiefe * W * 0.18;
        var welle = Math.sin(u * 5.2 + t * 0.42 + tiefe * 2.4) * (8 + 46 * tiefe)
                  + Math.sin(u * 11 - t * 0.31 + tiefe * 1.3) * (3 + 14 * tiefe);
        var y = yBasis + welle - Math.pow(u, 1.4) * H * 0.16 * (1 - tiefe * 0.4);
        var kamm = 0.55 + 0.45 * Math.sin(u * 5.2 + t * 0.42 + tiefe * 2.4 + 1.2);   // Wellenkaemme heller
        var a = Math.min(1, (0.18 + 0.9 * tiefe) * kamm * Math.min(1, u * 2.4));
        var c = mix(TEAL, EMERALD, Math.min(1, u * 0.9 + tiefe * 0.2));
        cx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
        cx.fillRect(x * dpr, y * dpr, groesse, groesse);
      }
    }
  }

  function zeichneLinie(t) {
    // Lichtpuls wandert alle ~7 s die Linie hinauf.
    var puls = (t / 7) % 1;
    cx.lineWidth = 2 * dpr; cx.lineJoin = 'round';
    cx.shadowColor = 'rgba(0,184,136,0.55)'; cx.shadowBlur = 10 * dpr;
    cx.strokeStyle = 'rgba(31,201,152,0.95)';
    cx.beginPath();
    knoten.forEach(function (k, i) { var y = (k.y + Math.sin(t * 0.6 + k.p) * 2.5) * dpr; if (i) cx.lineTo(k.x * dpr, y); else cx.moveTo(k.x * dpr, y); });
    cx.stroke();
    cx.shadowBlur = 0;
    knoten.forEach(function (k, i) {
      var f = i / (knoten.length - 1), naehe = Math.max(0, 1 - Math.abs(f - puls) * 7);
      var y = (k.y + Math.sin(t * 0.6 + k.p) * 2.5) * dpr;
      if (naehe > 0) {
        var g = cx.createRadialGradient(k.x * dpr, y, 0, k.x * dpr, y, 18 * dpr);
        g.addColorStop(0, 'rgba(63,214,166,' + (0.5 * naehe).toFixed(3) + ')'); g.addColorStop(1, 'rgba(63,214,166,0)');
        cx.fillStyle = g; cx.beginPath(); cx.arc(k.x * dpr, y, 18 * dpr, 0, 6.283); cx.fill();
      }
      cx.fillStyle = 'rgba(63,214,166,' + (0.7 + 0.3 * naehe).toFixed(3) + ')';
      cx.beginPath(); cx.arc(k.x * dpr, y, (2.6 + naehe * 1.4) * dpr, 0, 6.283); cx.fill();
    });
  }

  var laeuft = false, sichtbar = true, start = performance.now(), letztes = 0, rafId = 0;
  function bild(jetzt) {
    rafId = 0;
    if (!laeuft) return;
    rafId = requestAnimationFrame(bild);
    if (jetzt - letztes < 33) return;                       // ~30 Bilder/s reichen fuer ruhige Bewegung
    letztes = jetzt;
    var t = (jetzt - start) / 1000;
    cx.clearRect(0, 0, cv.width, cv.height);
    feld(t); zeichneLinie(t);
  }

  function steuern() {
    var soll = !pausiert && sichtbar && !document.hidden;
    if (soll && !laeuft) { laeuft = true; rafId = requestAnimationFrame(bild); if (video.src) video.play().catch(function () {}); }
    if (!soll && laeuft) { laeuft = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; video.pause(); }
    knopf.setAttribute('aria-pressed', pausiert ? 'true' : 'false');
    knopf.textContent = pausiert ? 'Bewegung fortsetzen' : 'Bewegung anhalten';
  }

  // ---- Pause-Knopf (WCAG 2.2.2) ----
  var knopf = document.createElement('button');
  knopf.type = 'button'; knopf.className = 'hero-pause';
  knopf.addEventListener('click', function () {
    pausiert = !pausiert;
    try { localStorage.setItem(GESPEICHERT, pausiert ? '1' : '0'); } catch (e) { /* privat */ }
    steuern();
  });
  hero.appendChild(knopf);

  new IntersectionObserver(function (es) { sichtbar = es[0].isIntersecting; steuern(); }, { threshold: 0 }).observe(hero);
  document.addEventListener('visibilitychange', steuern);
  window.addEventListener('resize', function () { masse(); }, { passive: true });

  // Erst nach dem Laden: der erste Eindruck (LCP) bleibt das scharfe Standbild.
  function los() {
    masse();
    if (!sparen) {
      video.src = '/assets/hero-licht-loop.mp4';
      video.addEventListener('playing', function () { bg.classList.add('mit-video'); }, { once: true });
    }
    bg.classList.add('lebt');
    steuern();
  }
  if (document.readyState === 'complete') los(); else window.addEventListener('load', los, { once: true });
})();
