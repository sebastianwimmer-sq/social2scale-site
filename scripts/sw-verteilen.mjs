#!/usr/bin/env node
// Scale-Week-Hinweis auf alle Seiten bringen, prüfen, wieder ausbauen. Fasst je Seite nur markierte Stellen an und läuft nach jedem Seitenbau neu.
//   node scripts/sw-verteilen.mjs            einsetzen (beliebig oft)
//   node scripts/sw-verteilen.mjs --pruefen  rot, wenn eine Werbeseite ihn nicht trägt (hängt in pruefen.sh)
//   node scripts/sw-verteilen.mjs --aus      alles wieder heraus (nach dem 30.11., Ticket #544)
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const W = join(dirname(fileURLToPath(import.meta.url)), '..');
// Ohne Hinweis: Pflichtseiten, Danke, Kundenseiten, Formulare mitten im Abschicken, Weiterleitungen. Die Aktionsseite ist der Hinweis selbst,
// die Startseite trägt Band und Karte.
const OHNE = /^(404|google|86guj|impressum|datenschutz|danke|onboarding|preise|docs|scripts|gratis|anfrage|en\/(privacy|pricing|free|contact))/;
const START = new Set(['index.html', 'en/index.html']), AKTION = /^(en\/)?scale-week\/index\.html$/;
const AUF = '<!-- SW -->', ZU = '<!-- /SW -->';
const block = (s) => AUF + s + ZU;
const ohne = (t) => t.replace(/<!-- SW -->[\s\S]*?<!-- \/SW -->/g, '');
export function mit(datei, roh) {
  let t = ohne(roh);
  const en = datei.startsWith('en/'), start = START.has(datei);
  const ziel = en ? '/en/scale-week/' : '/scale-week/';
  const ersetze = (muster, wie) => { if (!muster.test(t)) throw new Error(datei + ': Stelle fehlt ' + muster); t = t.replace(muster, wie); };
  ersetze(/<\/head>/, (m) => block('<link rel="stylesheet" href="/sw-hinweis.css"><script src="/sw-hinweis.js"></script>') + m);
  if (!start) {
    const zeile = block(`<a class="sw-zeile" href="${ziel}"><b>Scale <em>Week</em>, <span data-sw-tage>${en ? 'until 30 November' : 'bis 30. November'}</span></b><span class="sw-z-was">${en ? 'Profile build<span class="sw-z-lang"> on us with GROWTH, 300 tokens with BASIS</span><span class="sw-z-kurz"> or 300 tokens on top</span>' : 'Profil-Aufbau<span class="sw-z-lang"> geschenkt mit WACHSTUM, 300 Token mit BASIS</span><span class="sw-z-kurz"> oder 300 Token dazu</span>'}</span><span class="sw-z-los">${en ? 'Take a look' : 'Ansehen'} <span aria-hidden="true">→</span></span></a>`);
    if (datei === 'links/index.html') ersetze(/<body[^>]*>/, (m) => m + zeile);
    else if (/<\/header>/.test(t)) ersetze(/<\/header>/, (m) => m + zeile);
    else ersetze(/<body[^>]*>/, (m) => m + zeile);
  }
  if (/^(leistungen|en\/services)\/index\.html$/.test(datei)) {
    const paket = (titel, satz) => ersetze(new RegExp('(<h3 class="pr-name">' + titel + '</h3>\\s*<p class="pr-what">[\\s\\S]*?</p>)'), (m) => m + block(`<p class="sw-paket">${satz}</p>`));
    if (en) {
      paket('Management BASIS', 'During Scale Week you get 300 tokens for your Smart Studio on top, enough for 12 posts, for example. <a href="/en/scale-week/">First call by 30 November</a>');
      paket('Management GROWTH', 'During Scale Week we build your profile at no extra cost, otherwise €1,297.10. <a href="/en/scale-week/">First call by 30 November</a>');
    } else {
      paket('Betreuung BASIS', 'In der Scale Week bekommst du 300 Token für dein Smart Studio dazu, zum Beispiel für 12 Beiträge. <a href="/scale-week/">Erstgespräch bis 30. November</a>');
      paket('Betreuung WACHSTUM', 'In der Scale Week bauen wir dein Profil ohne Aufpreis mit auf, sonst 1.297,10 €. <a href="/scale-week/">Erstgespräch bis 30. November</a>');
    }
  }
  return t;
}
export const seiten = () => execFileSync('git', ['-C', W, 'ls-files', '--cached', '--others', '--exclude-standard', '*.html'], { encoding: 'utf8' }).split('\n').filter((d) => d && !OHNE.test(d) && !AKTION.test(d));
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const art = process.argv[2] || '', falsch = [];
  for (const d of seiten()) {
    const p = join(W, d), alt = readFileSync(p, 'utf8'), neu = art === '--aus' ? ohne(alt) : mit(d, alt);
    if (alt === neu) continue;
    if (art === '--pruefen') falsch.push(d); else writeFileSync(p, neu);
  }
  if (art === '--pruefen' && Date.now() >= Date.parse('2026-12-01T00:00:00+01:00')) { console.log('Scale Week vorbei: Ausbau mit --aus (Ticket #544)'); process.exit(0); }
  if (falsch.length) { console.error('✗ Scale-Week-Hinweis fehlt oder ist alt: ' + falsch.join(', ') + '\n  node scripts/sw-verteilen.mjs'); process.exit(1); }
  console.log('✓ Scale-Week-Hinweis: ' + seiten().length + ' Seiten' + (art ? ' (' + art + ')' : ''));
}
