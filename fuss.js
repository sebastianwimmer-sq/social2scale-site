// Footer aller Seiten (lib/shell.mjs › fuss()): Karte kommt beim Hineinscrollen an, Mail kopieren mit Haken.
(function () {
  var f = document.querySelector(".site-footer.s2f");
  if (!f) return;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    var oben = f.getBoundingClientRect().top;
    if (oben > innerHeight) {   // nur wenn der Footer noch nicht im Bild ist, sonst stünde er kurz leer da
      f.classList.add("s2f-js");
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { f.classList.add("s2f-da"); io.disconnect(); }
      }, { threshold: 0.2 });
      io.observe(f);
    }
  }
  var k = f.querySelector(".s2f-kopie"), h = f.querySelector(".s2f-sr[role=status]");
  if (!k || !navigator.clipboard) return;
  k.hidden = false;
  k.addEventListener("click", function () {
    var mail = k.getAttribute("data-mail");
    navigator.clipboard.writeText(mail).then(function () {
      k.classList.add("ok"); if (h) h.textContent = k.getAttribute("data-ok");
      setTimeout(function () { k.classList.remove("ok"); if (h) h.textContent = ""; }, 1800);
    }, function () { if (h) h.textContent = mail; });
  });
})();
