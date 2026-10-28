#!/usr/bin/env node
/**
 * Setzt jedem Abschnitt sein eigenes Motiv (28.10.2026) — aus EINER Quelle, DE und EN gleich.
 *
 *   node scripts/szenen-bauen.mjs            schreibt Motive, Teile, CSS- und JS-Verweise
 *   node scripts/szenen-bauen.mjs --pruefen  schreibt nichts; Exit 1, wenn eine Seite vom Soll abweicht
 *
 * Je Abschnitt: data-sz="<motiv>" am <section>, optional data-zeiger/data-schwung, eine Deko-Ebene
 * direkt hinter dem öffnenden Tag (zwischen <!-- SZENE --> … <!-- /SZENE -->) und data-sz-teil an Teilen,
 * die einzeln aufleuchten. Die Gestaltung steht in szenen/<seite>.css, die Steuerung in szenen/szenen.js.
 * Inhalt (Text, Links, Bilder) wird nie verändert — Tor: scripts/szenen-check.mjs vergleicht den Text.
 * Plan: docs/superpowers/specs/2026-10-28-szenen-je-abschnitt.md
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SEITEN } from './szenen-quelle.mjs';

const WURZEL = resolve(import.meta.dirname, '..');
const PRUEFEN = process.argv.includes('--pruefen');
// Ohne Kopf-CSS lädt szenen.js die Gestaltung selbst nach (per Skript eingehängte Stylesheets blockieren das erste Bild nicht)
const js = (nachladen) => `<script src="/szenen/szenen.js"${nachladen ? ` data-css="${nachladen}"` : ''} defer></script>`;
const css = (name) => `<link rel="stylesheet" href="/szenen/${name}.css">`;

// Alles, was dieses Skript je geschrieben hat, wieder entfernen → Ergebnis hängt nur von der Quelle ab
function abraeumen(t) {
  return t
    .replace(/<!-- SZENE [a-z0-9-]+ -->[\s\S]*?<!-- \/SZENE -->/g, '')
    .replace(/ data-sz="[a-z0-9-]+"/g, '')
    .replace(/ data-sz-teil(="[a-z0-9-]*")?/g, '')
    .replace(/ data-zeiger(?=[\s>])/g, '')
    .replace(/ data-schwung(?=[\s>])/g, '');
}

function einsetzen(t, a, datei) {
  const m = t.match(a.anker);
  if (!m) throw new Error(`Anker fehlt für ${a.sz} (${a.anker})`);
  const attrs = ` data-sz="${a.sz}"${a.zeiger ? ' data-zeiger' : ''}${a.schwung ? ' data-schwung' : ''}`;
  const tag = m[0].replace(/>$/, () => attrs + '>');
  const deko = a.deko ? `<!-- SZENE ${a.sz} -->${typeof a.deko === 'function' ? a.deko(datei) : a.deko}<!-- /SZENE -->` : '';
  const start = m.index;
  let ende = t.indexOf('</section>', start);
  if (ende < 0) throw new Error(`</section> fehlt nach ${a.sz}`);
  let abschnitt = tag + deko + t.slice(start + m[0].length, ende);
  // innen: [vor, nach, n] — setzt nach dem n-ten Vorkommen (ab 0) von vor ein
  for (const [vor, nach, n = 0] of a.innen || []) {
    let i = -1;
    for (let k = 0; k <= n; k++) { i = abschnitt.indexOf(vor, i + 1); if (i < 0) break; }
    if (i < 0) throw new Error(`Einsatzstelle ${n} fehlt in ${a.sz}: ${vor.slice(0, 60)}`);
    const j = i + vor.length;
    abschnitt = `${abschnitt.slice(0, j)}<!-- SZENE ${a.sz} -->${nach}<!-- /SZENE -->${abschnitt.slice(j)}`;
  }
  // Teile: öffnende Tags im Abschnitt, die einzeln aufleuchten
  for (const teil of a.teile || []) {
    let n = 0;
    abschnitt = abschnitt.replace(teil, (tg) => { n++; return tg.replace(/^(<[a-z0-9]+)/i, '$1 data-sz-teil'); });
    if (!n) throw new Error(`Teil fehlt in ${a.sz} (${teil})`);
  }
  return t.slice(0, start) + abschnitt + t.slice(ende);
}

function soll(html, seite, datei) {
  let t = abraeumen(html);
  for (const a of seite.abschnitte) t = einsetzen(t, a, datei);
  // Gestaltung: auf Seiten, deren erstes Motiv oben liegt (Wissen), als <link> im Kopf; sonst lädt szenen.js sie nach
  // (Besucher-Sim 28.10.: als <link> im Kopf LCP 3,1 s, am Ende von <body> schwankend 2,3–2,8 s, vorher 2,26 s).
  if (!t.includes('</head>')) throw new Error('</head> fehlt');
  const soll = seite.cssImKopf ? [css('basis'), css(seite.css), js('')] : [js(`basis,${seite.css}`)];
  const alle = /(<link rel="stylesheet" href="\/szenen\/[a-z0-9-]+\.css">|<script src="\/szenen\/szenen\.js"( data-css="[a-z0-9,-]+")? defer><\/script>)\n?/g;
  const da = (t.match(alle) || []).map((s) => s.trim());
  // Stimmen die Verweise schon, bleiben sie, wo sie stehen (andere Generatoren ordnen den Kopf); sonst neu vor </head>
  if (da.length !== soll.length || !soll.every((s) => da.includes(s))) {
    t = t.replace(alle, '').replace('</head>', () => soll.join('\n') + '\n</head>');
  }
  return t;
}

let abweichend = 0;
for (const seite of SEITEN) {
  for (const datei of seite.dateien) {
    const pfad = resolve(WURZEL, datei);
    const alt = await readFile(pfad, 'utf8');
    let neu;
    try { neu = soll(alt, seite, datei); } catch (e) { console.log(`🔴 ${datei}: ${e.message}`); abweichend++; continue; }
    if (neu === alt) continue;
    abweichend++;
    if (PRUEFEN) console.log(`🔴 ${datei}: Motive fehlen oder veraltet (node scripts/szenen-bauen.mjs)`);
    else { await writeFile(pfad, neu); console.log(`✎ ${datei} (${seite.abschnitte.length} Motive)`); }
  }
}
if (PRUEFEN) {
  console.log(abweichend ? `\n✗ szenen-bauen --pruefen: ${abweichend} Seite(n) weichen ab` : '✓ szenen-bauen: jeder Abschnitt trägt sein Motiv');
  process.exit(abweichend ? 1 : 0);
}
console.log(`✓ szenen-bauen: ${abweichend} Seite(n) geschrieben`);
