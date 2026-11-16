/* Scale Week 22.-30.11.2026: ab 01.12. 00:00 (Berlin) blendet die Seite den Bonus aus
   und zeigt „vorbei“; das Band auf der Startseite verschwindet. Die Dateien werden
   am 01.12. ausgebaut (Ticket), dieses Skript ist nur die Sicherung bis dahin. */
(function () {
  var ENDE = Date.parse('2026-12-01T00:00:00+01:00');
  if (Date.now() >= ENDE) document.documentElement.classList.add('sw-vorbei');
})();
