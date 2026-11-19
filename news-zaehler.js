// (1) neben „News“ im Menue (19.11.2026, Sebi: „so bleibt man immer neugierig“).
// Sichtbar, solange diese Besucherin die neueste Ausgabe nicht geoeffnet hat. Gemerkt wird nur die Kennung der
// zuletzt gelesenen Ausgabe, im eigenen Browser (localStorage), kein Cookie, nichts geht an uns.
(function () {
  var SCHLUESSEL = "s2s-news-gelesen";
  var gelesen = "";
  try { gelesen = localStorage.getItem(SCHLUESSEL) || ""; } catch (e) { /* privat oder gesperrt: dann zeigen */ }
  var main = document.querySelector("main.nw[data-news]");
  if (main) {
    gelesen = main.getAttribute("data-news");
    try { localStorage.setItem(SCHLUESSEL, gelesen); } catch (e) { /* ohne Speicher bleibt es beim Anzeigen */ }
  }
  document.querySelectorAll(".nz[data-news]").forEach(function (el) {
    el.hidden = el.getAttribute("data-news") === gelesen;
  });
})();
