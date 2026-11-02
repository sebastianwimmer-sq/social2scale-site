// Feste Leiste „Passt du zu uns?“ auf den Unterseiten (02.11.2026): am Handy kam der
// erste Knopf dort erst nach 3 bis 9 Bildschirmen. Gleiches Verhalten wie auf der
// Startseite: erscheint, wenn der Kopfbereich aus dem Blick ist, und verschwindet
// vor dem Abschluss-Knopf, damit sie ihn nicht doppelt und den Fuss nicht verdeckt.
(function () {
  var bar = document.getElementById("stickyCta");
  var hero = document.getElementById("hero") || document.querySelector("main section");
  var ende = document.getElementById("cta-bottom");
  if (!bar || !hero) return;
  var heroWeg = false, endeDa = false;
  function stellen() {
    var zeigen = heroWeg && !endeDa;
    bar.classList.toggle("on", zeigen);
    bar.setAttribute("aria-hidden", zeigen ? "false" : "true");
    bar.inert = !zeigen;   /* ausgeblendet = nicht per Tastatur erreichbar */
  }
  new IntersectionObserver(function (es) {
    heroWeg = !es[0].isIntersecting; stellen();
  }, { threshold: 0 }).observe(hero);
  if (ende) {
    /* Lage des Abschluss-Knopfs beim Scrollen direkt lesen: ein Beobachter meldet
       sich nicht, wenn man in einem Sprung ueber ihn hinweg springt. */
    var t = false;
    var pruefen = function () {
      t = false;
      endeDa = ende.getBoundingClientRect().top < window.innerHeight + 120;
      stellen();
    };
    window.addEventListener("scroll", function () { if (!t) { t = true; requestAnimationFrame(pruefen); } }, { passive: true });
    pruefen();
  }
})();
