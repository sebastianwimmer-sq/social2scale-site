/* uebergang.js — der Klick auf „Erstgespräch" wird zur Anfrage (28.09.2026).
 *
 * Die Anfrage-Seite traegt dieselbe Ueberschrift wie der Abschluss jeder Seite.
 * Wer unten klickt, sieht den Satz in den Kopf der Anfrage wandern und den
 * Knopf zur Formularkarte aufgehen. Aus Nav oder Hero geht nur der Knopf auf.
 *
 * Die Namen setzt dieses Skript erst beim Wechsel und nur auf dem Element, das
 * WIRKLICH geklickt wurde — auf jeder Seite stehen mehrere Anfrage-Knoepfe, und
 * zwei gleiche Namen brechen den ganzen Uebergang still ab.
 *
 * Firefox kennt Seitenuebergaenge noch nicht; dort passiert hier nichts.
 */
(function () {
  'use strict';
  if (!('onpageswap' in window)) return;

  var geklickt = null;
  document.addEventListener('click', function (e) {
    geklickt = e.target.closest ? e.target.closest('a') : null;
  }, true);

  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition || !e.activation || !e.activation.entry) return;
    var ziel = new URL(e.activation.entry.url).pathname.replace(/index\.html$/, '');
    if (ziel !== '/anfrage/' || !geklickt) return;
    if (new URL(geklickt.href, location.href).pathname.replace(/index\.html$/, '') !== '/anfrage/') return;
    geklickt.style.viewTransitionName = 'anfrage-karte';
    var abschluss = geklickt.closest('section.abschluss');
    var titel = abschluss && abschluss.querySelector('h2');
    if (titel) titel.style.viewTransitionName = 'anfrage-titel';
  });
})();
