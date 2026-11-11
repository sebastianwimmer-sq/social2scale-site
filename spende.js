/* Karte je Bestellung (DE + EN). Auf /about/ liegt der Abschnitt als <template id="karte-vorlage">, auf /preise/ eine
   Zeile am empfohlenen Paket als <template id="karte-zeile"> (Link auf /about/#karte). Beide werden erst eingesetzt,
   wenn der Zähler im Portal freigegeben ist und die Antwort zum Text passt. Gezeigt wird die
   Nummer der nächsten Karte, keine Summe. Bei jedem Zweifel bleibt die Seite, wie sie ohne den Abschnitt ist. */
(function () {
  var vorlage = document.getElementById("karte-vorlage") || document.getElementById("karte-zeile");
  if (!vorlage || !vorlage.content || !window.fetch) return;
  // Abruf nur von der echten Website (oder vom selben Ursprung, für die lokale Vorschau): von jedem anderen Ursprung
  // würde der Browser ihn wegen CORS abweisen und einen Fehler in die Konsole schreiben.
  var ziel = vorlage.getAttribute("data-spende") || "";
  var echt = /^(www\.)?social2scale\.com$/.test(location.hostname);
  if (!ziel || (!echt && /^https?:/.test(ziel))) return;
  var en = document.documentElement.lang === "en";
  function tag(iso) {
    var d = new Date(String(iso).slice(0, 10) + "T12:00:00Z");
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(en ? "en-GB" : "de-DE", en ? { day: "numeric", month: "short", year: "numeric" } : { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  function einsetzen(wert) {
    var stueck = vorlage.content.cloneNode(true);
    var sec = stueck.querySelector("section") || stueck.firstElementChild;
    if (!sec) return;
    var felder = stueck.querySelectorAll("[data-sp]");
    for (var i = 0; i < felder.length; i++) {
      var k = felder[i].getAttribute("data-sp");
      if (!(k in wert)) return;
      felder[i].textContent = wert[k];
    }
    var karte = sec.querySelector(".sk");
    if (karte) karte.addEventListener("click", function () { karte.setAttribute("aria-pressed", karte.getAttribute("aria-pressed") === "true" ? "false" : "true"); });
    if (karte && window.matchMedia && matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sec.addEventListener("pointermove", function (e) {
        var b = sec.getBoundingClientRect();
        sec.style.setProperty("--sx", (((e.clientX - b.left) / b.width) * 2 - 1).toFixed(3));
        sec.style.setProperty("--sy", (((e.clientY - b.top) / b.height) * 2 - 1).toFixed(3));
      });
      sec.addEventListener("pointerleave", function () { sec.style.setProperty("--sx", "0"); sec.style.setProperty("--sy", "0"); });
    }
    vorlage.parentNode.insertBefore(stueck, vorlage);
  }
  fetch(ziel, { credentials: "omit" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      var d = j && j.success === true && j.data;
      if (!d || d.betrag_eur !== 10 || !d.empfaenger || typeof d.karten !== "number" || !isFinite(d.karten) || d.karten < 0 || d.karten % 1) return;
      var name = String(d.empfaenger);
      var wert = { empfaenger: name, empfaengersatz: name.replace(/\.$/, "") + ".", naechste: ("00" + (d.karten + 1)).slice(-3), stand: tag(d.stand) };
      if (wert.stand) einsetzen(wert);
    })
    .catch(function () { /* nicht erreichbar: die Seite bleibt ohne den Abschnitt */ });
})();
