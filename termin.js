/* Terminleiste (Sebi 18.11.2026): füllt #stickyCta mit Phil, den nächsten fünf Werktagen und „Buchen“.
   Ein Tag antippen setzt den Link auf Phils Calendly an genau diesem Tag (?month=&date=); Calendly
   zeigt dort die freien Zeiten. Daten gehen erst beim Klick an Calendly (Datenschutz Nr. 09).
   Ein- und Ausblenden bleibt bei leiste.js bzw. dem Startseiten-Skript. Ohne JS bleibt der alte
   Knopf im HTML stehen. Die URL steht auch in free-content/src/constants.js (ERSTGESPRAECH_URL). */
(function () {
  var URL = 'https://calendly.com/philipplibowicz/neues-meeting';
  var bar = document.getElementById('stickyCta');
  if (!bar) {
    // Seiten ohne eigene Leiste (Wissensartikel): selbst anlegen, erscheint nach dem ersten
    // Bildschirm und geht vor dem Fuß weg, damit sie nichts doppelt oder verdeckt.
    bar = document.createElement('aside');
    bar.className = 'sticky-cta';
    bar.id = 'stickyCta';
    bar.setAttribute('aria-hidden', 'true');
    bar.inert = true;
    document.body.appendChild(bar);
    var fuss = document.querySelector('footer');
    var lauf = false;
    var stellen = function () {
      lauf = false;
      var zeigen = window.scrollY > window.innerHeight * 0.6 &&
        !(fuss && fuss.getBoundingClientRect().top < window.innerHeight);
      bar.classList.toggle('on', zeigen);
      bar.setAttribute('aria-hidden', zeigen ? 'false' : 'true');
      bar.inert = !zeigen;
    };
    window.addEventListener('scroll', function () { if (!lauf) { lauf = true; requestAnimationFrame(stellen); } }, { passive: true });
    stellen();
  }
  var en = (document.documentElement.lang || '').indexOf('en') === 0;
  var WT = en ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  // Heute in Berliner Zeit, dann die nächsten fünf Werktage ab morgen
  var teile = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(Date.now())).split('-');
  var d = new Date(Date.UTC(+teile[0], +teile[1] - 1, +teile[2], 12));
  var tage = [];
  while (tage.length < 5) {
    d = new Date(d.getTime() + 864e5);
    var w = d.getUTCDay();
    if (w !== 0 && w !== 6) tage.push(new Date(d.getTime()));
  }
  function iso(x) { return x.toISOString().slice(0, 10); }
  function link(x) { return URL + '?month=' + iso(x).slice(0, 7) + '&date=' + iso(x); }

  var inner = document.createElement('div');
  inner.className = 'inner';
  inner.innerHTML =
    '<p class="tl-satz">' + (en ? 'Let’s build your profile.' : 'Lass uns dein Profil bauen.') +
    '<small>' + (en ? 'First call with Phil, 30 min, free' : 'Erstgespräch mit Phil, 30 Min., kostenlos') + '</small></p>' +
    '<div class="tl-tage" role="group" aria-label="' + (en ? 'Choose a day' : 'Tag wählen') + '"></div>' +
    '<a class="tl-knopf" href="' + link(tage[0]) + '" rel="noopener">' + (en ? 'Let’s go' : 'Loslegen') + ' →</a>';
  var reihe = inner.querySelector('.tl-tage');
  var knopf = inner.querySelector('.tl-knopf');
  tage.forEach(function (x, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tl-tag';
    b.style.setProperty('--i', i);
    b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    b.setAttribute('aria-label', WT[x.getUTCDay()] + ' ' + x.getUTCDate() + '.' + (x.getUTCMonth() + 1) + '.');
    b.innerHTML = WT[x.getUTCDay()] + '<b>' + x.getUTCDate() + '</b>';
    b.addEventListener('click', function () {
      reihe.querySelectorAll('.tl-tag').forEach(function (y) { y.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      knopf.href = link(x);
    });
    reihe.appendChild(b);
  });
  var alt = bar.querySelector('.inner');
  if (alt) bar.replaceChild(inner, alt); else bar.appendChild(inner);
})();
