/* Leistungsseite: Rad „Vom Glücksspiel zum System“ (Sebi 18.11.2026), DE /preise/ und EN /en/pricing/.
   Liest die Sprache aus <html lang>. Ohne dieses Skript steht die Bilanz offen da (siehe rad.css).
   Belege: Sätze „mit uns“ aus den Paketen (Alles abgeben, BASIS, Profil-Setup); keine Anfrage-Zahlen,
   weil keine gemessenen vorliegen; Zeit = 10 Beiträge × Minuten je Beitrag (Startwert 60, anpassbar),
   Quelle kit-build/leistungen-vergleich-evidenz.json. */
(function () {
  'use strict';
  var wurzel = document.querySelector('.rd');
  if (!wurzel) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var en = (document.documentElement.lang || '').indexOf('en') === 0;
  var $ = function (id) { return document.getElementById(id); };
  var werte = { min: 60, eur: 120 };
  var BEITRAEGE = 10;
  var stunden = function () { return BEITRAEGE * werte.min / 60; };
  var eur = function (n) {
    var z = new Intl.NumberFormat(en ? 'en-GB' : 'de-DE', { maximumFractionDigits: 0 }).format(Math.round(n));
    return en ? '€' + z : z + ' €';
  };
  var std = function (h) { var z = (Math.round(h * 2) / 2).toLocaleString(en ? 'en-GB' : 'de-DE'); return z + (en ? ' hrs' : ' Std.'); };
  var geld = function () { return eur(Math.floor(stunden()) * werte.eur); };

  var FELDER = en ? [
    { id: 'zeit', name: 'Time',
      ohne: { wort: function () { return std(stunden()); }, satz: function () { return 'Around ' + std(stunden()) + ' a month go into ten posts instead of working with your clients.'; } },
      mit: { wort: function () { return 'free'; }, satz: function () { return 'You just approve. The ' + std(stunden()) + ' go back to your clients, that’s ' + geld() + ' a month.'; } } },
    { id: 'anfragen', name: 'Enquiries',
      ohne: { wort: function () { return 'chance'; }, satz: function () { return 'Whether a post turns into an enquiry is left to chance.'; } },
      mit: { wort: function () { return 'planned'; }, satz: function () { return 'One or two posts a month are built to bring enquiries. Whoever gets in touch lands straight with you.'; } } },
    { id: 'zielgruppe', name: 'Audience',
      ohne: { wort: function () { return 'hoped'; }, satz: function () { return 'You post and hope the right people see it.'; } },
      mit: { wort: function () { return 'targeted'; }, satz: function () { return 'A fixed content plan for your audience, hashtags chosen per post and a short report every month on what lands.'; } } },
    { id: 'auftritt', name: 'Look',
      ohne: { wort: function () { return 'so-so'; }, satz: function () { return 'Every post looks a little different, depending on how much time there was.'; } },
      mit: { wort: function () { return 'on brand'; }, satz: function () { return 'Profile, colours and tone from one mould, so people recognise you in the feed.'; } } },
    { id: 'begleitung', name: 'Support',
      ohne: { wort: function () { return 'alone'; }, satz: function () { return 'Just you, with tips from videos and courses.'; } },
      mit: { wort: function () { return 'with you'; }, satz: function () { return 'Sebi and Phil in person, no team in between. You talk directly to the people who build your posts.'; } } }
  ] : [
    { id: 'zeit', name: 'Zeit',
      ohne: { wort: function () { return std(stunden()); }, satz: function () { return 'Rund ' + std(stunden()) + ' im Monat sitzt du an zehn Beiträgen, statt mit deinen Kunden zu arbeiten.'; } },
      mit: { wort: function () { return 'frei'; }, satz: function () { return 'Du gibst nur frei. Die ' + std(stunden()) + ' gehören wieder deinen Kunden, das sind ' + geld() + ' im Monat.'; } } },
    { id: 'anfragen', name: 'Anfragen',
      ohne: { wort: function () { return 'Zufall'; }, satz: function () { return 'Ob aus einem Beitrag eine Anfrage wird, bleibt dem Zufall überlassen.'; } },
      mit: { wort: function () { return 'geplant'; }, satz: function () { return 'Ein bis zwei Beiträge im Monat sind darauf gebaut, Anfragen zu bringen. Wer sich meldet, landet direkt bei dir.'; } } },
    { id: 'zielgruppe', name: 'Zielgruppe',
      ohne: { wort: function () { return 'gehofft'; }, satz: function () { return 'Du postest und hoffst, dass es die Richtigen sehen.'; } },
      mit: { wort: function () { return 'gezielt'; }, satz: function () { return 'Ein fester Redaktionsplan für deine Zielgruppe, Hashtags je Beitrag ausgewählt und jeden Monat ein kurzer Bericht, was ankommt.'; } } },
    { id: 'auftritt', name: 'Auftritt',
      ohne: { wort: function () { return 'mal so'; }, satz: function () { return 'Jeder Beitrag sieht ein bisschen anders aus, je nachdem, wie viel Zeit gerade da war.'; } },
      mit: { wort: function () { return 'erkennbar'; }, satz: function () { return 'Profil, Farben und Ton aus einem Guss, damit man dich im Feed wiedererkennt.'; } } },
    { id: 'begleitung', name: 'Begleitung',
      ohne: { wort: function () { return 'allein'; }, satz: function () { return 'Du allein, mit Tipps aus Videos und Kursen.'; } },
      mit: { wort: function () { return 'zu dritt'; }, satz: function () { return 'Sebi und Phil, persönlich und ohne Team dazwischen. Du sprichst direkt mit den Leuten, die deine Beiträge bauen.'; } } }
  ];
  var T = en
    ? { ohne: 'without us', mit: 'with us', gegenMit: 'With us: ', gegenOhne: 'Without us: ', grund: function () { return 'Based on ' + werte.min + ' min per post and ' + eur(werte.eur) + ' an hour.'; }, minE: ' min', fertig: 'done', anpassen: 'adjust' }
    : { ohne: 'ohne uns', mit: 'mit uns', gegenMit: 'Mit uns: ', gegenOhne: 'Ohne uns: ', grund: function () { return 'Gerechnet mit ' + werte.min + ' Min. je Beitrag und ' + eur(werte.eur) + ' je Stunde.'; }, minE: ' Min.', fertig: 'fertig', anpassen: 'anpassen' };

  // Schiefstand ohne uns: je Feld eigener Versatz, fest, damit es bei jedem Besuch gleich aussieht
  var SCHIEF = [{ r: -9, x: -10, y: 7 }, { r: 6, x: 12, y: -4 }, { r: -4, x: 5, y: 13 }, { r: 11, x: -12, y: -8 }, { r: -7, x: 8, y: -12 }];
  var GERADE = { r: 0, x: 0, y: 0 };
  var RAD_SCHIEF = -17, EINSTIEG_WINKEL = 240, RAUS_GEWAEHLT = 14, RAUS_HOVER = 5, RAUS_VOR = 44;
  var R1 = 88, R2 = 200, SP = 2.2, RING_R = 212;
  var DREH_LOS = 'transform 1.5s cubic-bezier(.16,.8,.24,1)', DREH_RAST = 'transform 1.1s cubic-bezier(.34,1.56,.64,1)';
  var EASE_OUT = 'cubic-bezier(.16,1,.3,1)';

  var modus = 'ohne', wahl = 1, hover = -1, basis = 0, zeigerWinkel = 0, bereit = reduce;
  var buehne = $('rd-buehne'), dreh = $('rd-dreh'), radBox = $('rd-radbox'), ringVoll = $('rd-ring-voll'), zeiger = $('rd-zeiger');
  var schalter = $('rd-schalter'), knauf = schalter.querySelector('.rd-knauf');
  var RING_U = 2 * Math.PI * RING_R;
  wurzel.classList.add('rd-js');
  ringVoll.style.strokeDasharray = RING_U; ringVoll.style.strokeDashoffset = RING_U;

  var pol = function (r, a) { return [r * Math.cos((a - 90) * Math.PI / 180), r * Math.sin((a - 90) * Math.PI / 180)]; };
  var segment = function (a0, a1) {
    var p1 = pol(R2, a0), p2 = pol(R2, a1), p3 = pol(R1, a1), p4 = pol(R1, a0);
    return 'M' + p1 + 'A' + R2 + ' ' + R2 + ' 0 0 1 ' + p2 + 'L' + p3 + 'A' + R1 + ' ' + R1 + ' 0 0 0 ' + p4 + 'Z';
  };
  $('rd-licht').setAttribute('d', segment(-16, 16));

  var NS = 'http://www.w3.org/2000/svg';
  var felder = FELDER.map(function (f, i) {
    var a0 = i * 72 + SP, a1 = (i + 1) * 72 - SP, am = (a0 + a1) / 2, d = segment(a0, a1), t = pol((R1 + R2) / 2, am);
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'rd-feld'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', f.name);
    g.dataset.am = am; g.style.setProperty('--d', (i * 45) + 'ms');
    ['rd-grau', 'rd-farbe', 'rd-glanz', 'rd-kante'].forEach(function (k) { var p = document.createElementNS(NS, 'path'); p.setAttribute('class', k); p.setAttribute('d', d); g.appendChild(p); });
    var tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', t[0]); tx.setAttribute('y', t[1] + 6); tx.setAttribute('text-anchor', 'middle'); tx.textContent = f.name; g.appendChild(tx);
    g.addEventListener('click', function () { waehle(i); });
    g.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hover = i; setzeFelder(); } });
    g.addEventListener('pointerleave', function () { if (hover === i) { hover = -1; setzeFelder(); } });
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); waehle(i); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); waehle((i + 1) % 5, true); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); waehle((i + 4) % 5, true); }
    });
    $('rd-felder').appendChild(g);
    return g;
  });

  var umlegenUhr = 0;
  var umlegen = function () { buehne.classList.add('rd-umlegen'); clearTimeout(umlegenUhr); umlegenUhr = setTimeout(function () { buehne.classList.remove('rd-umlegen'); }, 1500); };

  function setzeFelder() {
    felder.forEach(function (g, i) {
      var raus = !bereit ? RAUS_VOR : i === wahl ? RAUS_GEWAEHLT : i === hover ? RAUS_HOVER : 0;
      var o = pol(raus, +g.dataset.am), s = modus === 'ohne' ? SCHIEF[i] : GERADE;
      g.style.transform = 'translate(' + (s.x + o[0]) + 'px,' + (s.y + o[1]) + 'px) rotate(' + s.r + 'deg)';
      g.style.opacity = bereit ? 1 : 0;
      g.classList.toggle('rd-gewaehlt', i === wahl); g.setAttribute('aria-pressed', String(i === wahl));
    });
  }
  function lage() {
    var winkel = !bereit ? EINSTIEG_WINKEL : modus === 'ohne' ? basis + RAD_SCHIEF : basis;
    dreh.style.transform = 'rotate(' + winkel + 'deg)';
    var ziel = +felder[wahl].dataset.am, delta = ((ziel - zeigerWinkel) % 360 + 540) % 360 - 180;
    zeigerWinkel += delta; zeiger.style.transform = 'rotate(' + zeigerWinkel + 'deg)';
    ringVoll.style.strokeDashoffset = modus === 'mit' ? 0 : RING_U;
    $('rd-schein').setAttribute('opacity', modus === 'mit' ? 1 : 0);
    setzeFelder();
  }

  // Wort in der Mitte gleitet raus und rein; dataset.soll gewinnt bei schnellem Wechsel
  var tausche = function (el, text) {
    el.dataset.soll = text;
    if (reduce || !bereit || !el.animate) { el.textContent = text; return; }
    if (el.textContent === text && !el.getAnimations().length) return;
    el.getAnimations().forEach(function (a) { a.cancel(); });
    var aus = el.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-10px)' }], { duration: 150, easing: 'ease-in', fill: 'forwards' });
    aus.onfinish = function () {
      el.textContent = el.dataset.soll; aus.cancel();
      el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, easing: EASE_OUT });
    };
  };
  var neuAnimieren = function (el) { el.classList.remove('rd-wechsel'); void el.offsetWidth; el.classList.add('rd-wechsel'); };

  function antworte(anim) {
    var f = FELDER[wahl], z = f[modus], anders = f[modus === 'ohne' ? 'mit' : 'ohne'];
    $('rd-name').textContent = f.name;
    $('rd-satz').textContent = z.satz();
    $('rd-gegen').textContent = (modus === 'ohne' ? T.gegenMit : T.gegenOhne) + anders.satz();
    if (anim && !reduce) { neuAnimieren($('rd-name')); neuAnimieren($('rd-satz')); neuAnimieren($('rd-gegen')); }
    tausche($('rd-wort'), z.wort());
    tausche($('rd-klein'), modus === 'ohne' ? T.ohne : T.mit);
    $('rd-grundlage').hidden = f.id !== 'zeit';
    $('rd-grund').textContent = T.grund();
  }
  function waehle(i, fokus) { var neu = i !== wahl; wahl = i; lage(); antworte(neu); if (fokus) felder[i].focus(); }

  // ===== Bilanz S·C·A·L·E: Text steht im HTML (auch für Suchmaschinen und ohne JS), hier nur Zeit-Zeile und Auftritt =====
  var bilanz = $('rd-bilanz');
  var zeilen = [].slice.call(bilanz.querySelectorAll('.rd-zeile'));
  zeilen.forEach(function (z) { z.addEventListener('click', function () { waehle(+z.dataset.feld); }); });
  var setzeBilanz = function () {
    var zahl = bilanz.querySelector('.rd-zahl'), g = bilanz.querySelector('.rd-geld');
    if (zahl) zahl.textContent = std(stunden());
    if (g) g.textContent = geld();
  };
  var zaehle = function (el, ziel, verzug) {
    if (!el) return;
    if (reduce) { el.textContent = std(ziel); return; }
    var t0 = performance.now() + verzug, dauer = 850;
    var tick = function (t) {
      var p = Math.min(1, Math.max(0, (t - t0) / dauer)), e = 1 - Math.pow(1 - p, 3);
      el.textContent = std(ziel * e); if (p < 1) requestAnimationFrame(tick); else el.textContent = std(ziel);
    };
    requestAnimationFrame(tick);
  };
  var teile = [$('rd-b-kopf')].concat(zeilen, [$('rd-finale'), $('rd-finale-satz'), $('rd-schluss')]);
  teile.forEach(function (el) { el.classList.add('rd-r'); });
  var zeigen = function (el) {
    if (el.classList.contains('rd-da')) return; el.classList.add('rd-da');
    if (el === zeilen[0]) zaehle(el.querySelector('.rd-zahl'), stunden(), 150);
  };
  // Die Bilanz steht immer im Fluss (kein Springen); ihre Teile erscheinen beim Hineinscrollen.
  var selbstGescrollt = false, geschaltet = false;
  ['wheel', 'touchmove'].forEach(function (ev) { addEventListener(ev, function () { selbstGescrollt = true; }, { passive: true }); });
  if (reduce || !('IntersectionObserver' in window)) teile.forEach(zeigen);
  else {
    var beobachter = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { zeigen(e.target); beobachter.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    teile.forEach(function (el) { beobachter.observe(el); });
    // Wer ohne Tippen weiterscrollt, dem schaltet das Rad von selbst auf „Mit uns“, wenn die Bilanz kommt
    var wache = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; wache.disconnect();
      if (!geschaltet && modus === 'ohne') setzeModus('mit', true);
    }, { rootMargin: '0px 0px -45% 0px' });
    wache.observe($('rd-b-kopf'));
  }
  // Nach „Mit uns“ sanft zur Bilanz gleiten, wenn sie noch unter dem Bild liegt und niemand selbst scrollt
  var gleiten = function () {
    selbstGescrollt = false;
    setTimeout(function () {
      var oben = bilanz.getBoundingClientRect().top;
      if (!selbstGescrollt && oben > innerHeight * 0.7) scrollBy({ top: oben - innerHeight * 0.14, behavior: reduce ? 'auto' : 'smooth' });
    }, 700);
  };

  var licht = function () {
    if (!$('rd-licht').animate) return;
    $('rd-licht').animate([{ transform: 'rotate(0deg)', opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { transform: 'rotate(360deg)', opacity: 0 }],
      { duration: 1300, delay: 560, easing: 'cubic-bezier(.45,0,.2,1)' });
    $('rd-welle').animate([{ transform: 'scale(1)', opacity: 0.85 }, { transform: 'scale(1.55)', opacity: 0 }], { duration: 900, delay: 620, easing: EASE_OUT });
  };

  var setzeModus = function (m, vonSelbst) {
    if (!vonSelbst) geschaltet = true;
    if (m === modus) return; modus = m;
    buehne.classList.toggle('rd-mit', m === 'mit');
    schalter.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.m === m)); });
    umlegen();
    if (m === 'ohne') { basis -= 360; dreh.style.transition = DREH_LOS; } else { dreh.style.transition = DREH_RAST; }
    lage(); antworte(true);
    if (m === 'mit' && !reduce) { licht(); if (navigator.vibrate) navigator.vibrate(12); }
    if (m === 'mit' && !vonSelbst) gleiten();
    setzeBilanz();
  };

  // Schalter: tippen oder ziehen wie in iOS
  var zug = null, klickSperre = false;
  var dehnen = function () { if (!reduce && knauf.animate) knauf.animate([{ scale: '1 1' }, { scale: '1.1 .95', offset: 0.35 }, { scale: '1 1' }], { duration: 520, easing: 'ease-out' }); };
  schalter.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () { if (klickSperre) return; if (b.dataset.m !== modus) dehnen(); setzeModus(b.dataset.m); });
  });
  schalter.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    zug = { x0: e.clientX, start: modus === 'mit' ? 1 : 0, breite: knauf.getBoundingClientRect().width, bewegt: false, id: e.pointerId };
    knauf.classList.add('rd-drueck');
  });
  schalter.addEventListener('pointermove', function (e) {
    if (!zug) return; var dx = e.clientX - zug.x0;
    if (!zug.bewegt && Math.abs(dx) > 6) { zug.bewegt = true; schalter.classList.add('rd-zieht'); if (schalter.setPointerCapture) schalter.setPointerCapture(zug.id); }
    if (zug.bewegt) knauf.style.setProperty('--x', Math.max(-0.06, Math.min(1.06, zug.start + dx / zug.breite)).toFixed(3));
  });
  var loslassen = function () {
    if (!zug) return; knauf.classList.remove('rd-drueck'); schalter.classList.remove('rd-zieht');
    if (zug.bewegt) {
      var v = parseFloat(knauf.style.getPropertyValue('--x')) || 0; knauf.style.removeProperty('--x');
      klickSperre = true; setTimeout(function () { klickSperre = false; }, 60);
      setzeModus(v > 0.5 ? 'mit' : 'ohne');
    }
    zug = null;
  };
  schalter.addEventListener('pointerup', loslassen); schalter.addEventListener('pointercancel', loslassen);

  // Zeit anpassen
  var auf = $('rd-auf'), regler = $('rd-regler');
  auf.addEventListener('click', function () { var offen = regler.hidden; regler.hidden = !offen; auf.setAttribute('aria-expanded', String(offen)); auf.textContent = offen ? T.fertig : T.anpassen; });
  wurzel.querySelectorAll('.rd-stufe').forEach(function (f) {
    var id = f.dataset.id, min = +f.dataset.min, max = +f.dataset.max, st = +f.dataset.step, out = f.querySelector('output'), kn = f.querySelectorAll('button');
    var zeige = function () { out.textContent = id === 'min' ? werte.min + T.minE : eur(werte.eur); kn[0].disabled = werte[id] <= min; kn[1].disabled = werte[id] >= max; };
    [kn[0], kn[1]].forEach(function (b) {
      b.addEventListener('click', function () { werte[id] = Math.max(min, Math.min(max, werte[id] + (+b.dataset.d) * st)); zeige(); antworte(false); setzeBilanz(); });
    });
    zeige();
  });

  // Kippen mit der Maus: läuft nur, solange sich etwas bewegt
  var rad = $('rd-rad'), zx = 0, zy = 0, ix = 0, iy = 0, lauf = 0;
  var schritt = function () {
    ix += (zx - ix) * 0.12; iy += (zy - iy) * 0.12;
    rad.style.transform = 'perspective(1100px) rotateX(' + ix.toFixed(2) + 'deg) rotateY(' + iy.toFixed(2) + 'deg)';
    lauf = Math.abs(zx - ix) + Math.abs(zy - iy) > 0.02 ? requestAnimationFrame(schritt) : 0;
  };
  var kippen = function () { if (!lauf) lauf = requestAnimationFrame(schritt); };
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    radBox.addEventListener('pointermove', function (e) { var r = radBox.getBoundingClientRect(); zx = ((e.clientY - r.top) / r.height - 0.5) * -9; zy = ((e.clientX - r.left) / r.width - 0.5) * 9; kippen(); });
    radBox.addEventListener('pointerleave', function () { zx = zy = 0; kippen(); });
  }

  // Einstieg: beim Hineinscrollen dreht das Rad wie ein Glücksrad und bleibt schief stehen
  var einstieg = function () { bereit = true; radBox.classList.remove('rd-vor'); umlegen(); dreh.style.transition = DREH_LOS; lage(); antworte(false); };
  if (bereit || !('IntersectionObserver' in window)) { bereit = true; lage(); antworte(false); }
  else {
    radBox.classList.add('rd-vor'); dreh.style.transition = 'none'; lage(); antworte(false);
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); requestAnimationFrame(function () { requestAnimationFrame(einstieg); }); }
    }, { threshold: 0.35 });
    io.observe(radBox);
  }
})();
