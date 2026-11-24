/* Scale Week auf jeder Seite, siehe sw-hinweis.css. Steht im Kopf ohne defer: die Klasse sitzt vor dem ersten Bild, nichts springt.
   Vor 22.11. 00:00 und ab 01.12. 00:00 (Berlin) passiert nichts; wer die Seite über Mitternacht offen hat, verliert sie mit dem Ende. */
(function () {
  var START = Date.parse('2026-11-22T00:00:00+01:00'), ENDE = Date.parse('2026-12-01T00:00:00+01:00');
  var root = document.documentElement, jetzt = Date.now();
  if (jetzt < START || jetzt >= ENDE) return;
  root.classList.add('sw-an');
  var en = (root.lang || '').indexOf('en') === 0, rest = Math.ceil((ENDE - jetzt) / 864e5);
  if (ENDE - jetzt < 864e5 * 2) setTimeout(function () { root.classList.remove('sw-an'); root.classList.add('sw-vorbei'); }, ENDE - jetzt);
  document.addEventListener('DOMContentLoaded', function () {
    var tage = rest === 1 ? (en ? 'last day' : 'letzter Tag') : en ? rest + ' days left' : 'noch ' + rest + ' Tage';
    var f = document.querySelectorAll('[data-sw-tage]');
    for (var i = 0; i < f.length; i++) f[i].textContent = tage;
    // Terminleiste (termin.js läuft mit defer vor DOMContentLoaded): der Grund, jetzt zu buchen
    var klein = document.querySelector('.tl-satz small');
    if (klein) klein.textContent = en ? 'Free call, Scale Week bonus until 30 Nov' : 'Erstgespräch kostenlos, bis 30.11. mit Bonus';
  });
})();
