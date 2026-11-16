/* Scale Week 22.-30.11.2026 (Leitidee Maßstab). Rechnet den Tag in Berliner Zeit:
   füllt den Maßstab bis heute, stellt die Beiträge der vergangenen Tage auf, schreibt
   „Noch X Tage, um durchzustarten“ ins Band und die Seite, zeigt auf der Startseite einmal
   je Besuch eine nicht blockierende Hinweis-Karte. Ab 01.12. 00:00: Klasse sw-vorbei,
   Bonus, Band und Karte sind weg (Ausbau Ticket #544). */
(function () {
  var START = Date.parse('2026-11-22T00:00:00+01:00');
  var ENDE = Date.parse('2026-12-01T00:00:00+01:00');
  var root = document.documentElement;
  var jetzt = Date.now();
  if (jetzt >= ENDE) { root.classList.add('sw-vorbei'); return; }
  var en = (root.lang || '').indexOf('en') === 0;
  var tag = jetzt < START ? 0 : Math.min(9, Math.floor((jetzt - START) / 864e5) + 1);
  var rest = tag === 0 ? 9 : 10 - tag;
  var satz = tag === 0
    ? (en ? 'From Sunday: nine days to get going.' : 'Ab Sonntag: neun Tage, um durchzustarten.')
    : rest === 1
      ? (en ? 'Today is the last day to get going.' : 'Heute ist der letzte Tag, um durchzustarten.')
      : (en ? rest + ' days left to get going.' : 'Noch ' + rest + ' Tage, um durchzustarten.');

  function bereit(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  bereit(function () {
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Seite: Maßstab und Satz
    var skala = document.getElementById('sw-skala');
    if (skala) {
      var tage = skala.querySelectorAll('.sw-tag');
      for (var i = 0; i < tage.length; i++) {
        var n = i + 1, li = tage[i];
        li.classList.remove('heute', 'zu', 'vorbei');
        li.classList.add(tag === 0 ? 'zu' : n < tag ? 'vorbei' : n === tag ? 'heute' : 'zu');
      }
      var f = skala.querySelector('.sw-fuell');
      if (f) f.style.setProperty('--bis', (tag <= 1 ? 0 : (tag - 1) * 12.5) + '%');
      var noch = document.getElementById('sw-noch');
      if (noch) noch.textContent = satz;
      var frist = document.getElementById('sw-frist');
      if (frist) {
        var r = ENDE - 1000 - jetzt, t = Math.floor(r / 864e5), h = Math.floor(r % 864e5 / 36e5), m = Math.floor(r % 36e5 / 6e4);
        frist.textContent = en ? t + ' days, ' + h + ' hours, ' + m + ' minutes left' : 'Noch ' + t + ' Tage, ' + h + ' Stunden, ' + m + ' Minuten';
      }
    }
    // Band: zweiter Satz = Tage-Satz, anhaltbar
    var band = document.getElementById('sw-band');
    if (band) {
      var sp = band.querySelectorAll('.sw-spur span');
      for (var j = 1; j < sp.length; j += 4) sp[j].textContent = satz.replace(/\.$/, '');
      var b = band.querySelector('[data-halt]');
      if (still) band.classList.add('halt');
      if (b) b.addEventListener('click', function () {
        var h = band.classList.toggle('halt');
        b.textContent = h ? '▶' : 'II';
        b.setAttribute('aria-label', h ? (en ? 'Play ticker' : 'Laufband starten') : (en ? 'Pause ticker' : 'Laufband anhalten'));
      });
      // Hinweis-Karte: nur Startseite, einmal je Besuch, blockiert nichts
      var weg = false; try { weg = sessionStorage.getItem('sw-karte') === 'zu'; } catch (e) {}
      if (!weg) setTimeout(function () {
        var k = document.createElement('aside');
        k.className = 'sw-karte'; k.setAttribute('aria-label', 'Scale Week');
        k.innerHTML = '<button class="sw-karte-zu" type="button" aria-label="' + (en ? 'Close' : 'Schließen') + '">×</button>' +
          '<p class="sw-karte-h">Scale <em>Week</em></p><p class="sw-karte-t"></p>' +
          '<a class="btn btn-primary" href="' + (en ? '/en/scale-week/' : '/scale-week/') + '">' + (en ? 'Take a look →' : 'Ansehen →') + '</a>';
        k.querySelector('.sw-karte-t').textContent = satz;
        document.body.appendChild(k);
        requestAnimationFrame(function () { requestAnimationFrame(function () { k.classList.add('da'); }); });
        k.querySelector('.sw-karte-zu').addEventListener('click', function () {
          k.classList.remove('da'); try { sessionStorage.setItem('sw-karte', 'zu'); } catch (e) {}
          setTimeout(function () { k.remove(); }, 900);
        });
      }, 6000);
    }
  });
})();
