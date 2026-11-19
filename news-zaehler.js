// (1) neben „News“ im Menue (19.11.2026, Sebi: „so bleibt man immer neugierig“).
// Sebi 19.11.: „einfach so bei jedem neuen besuch, nicht dauerhaft“: die (1) steht bei jedem neuen Besuch und
// verschwindet, sobald in diesem Besuch die News geoeffnet wurden. Gemerkt wird das nur fuer die laufende Sitzung
// des Tabs (sessionStorage), kein Cookie, nichts geht an uns.
(function () {
  var SCHLUESSEL = "s2s-news-gelesen";
  var gelesen = "";
  try { gelesen = sessionStorage.getItem(SCHLUESSEL) || ""; } catch (e) { /* privat oder gesperrt: dann zeigen */ }
  var main = document.querySelector("main.nw[data-news]");
  if (main) {
    gelesen = main.getAttribute("data-news");
    try { sessionStorage.setItem(SCHLUESSEL, gelesen); } catch (e) { /* ohne Speicher bleibt es beim Anzeigen */ }
  }
  document.querySelectorAll(".nz[data-news]").forEach(function (el) {
    el.hidden = el.getAttribute("data-news") === gelesen;
  });
})();
