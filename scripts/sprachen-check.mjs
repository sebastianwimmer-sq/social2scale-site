#!/usr/bin/env node
/**
 * Tor: jede deutsche Besucherseite hat eine AKTUELLE englische Schwester
 * (17.10.2026, Sebi: „als fixen Haken für die Zukunft“).
 *
 * Rot, wenn fuer ein Paar aus lib/sprachen.mjs
 *  - die EN-Seite fehlt,
 *  - ihr Stempel (<meta name="s2s-quelle">) nicht zum heutigen DE-Text passt
 *    → DE wurde geaendert, EN nicht nachgezogen,
 *  - lang-Attribut, hreflang-Kopf oder Umschalter nicht stimmen,
 *  - auf der EN-Seite noch deutscher Text steht,
 *  - eine der beiden Adressen in sitemap.xml fehlt.
 *
 * Nachziehen: EN-Seite anpassen, dann `node scripts/sprachen-stempel.mjs <en-pfad>`
 * und `node scripts/build-pages.mjs`.
 *
 * Aufruf: node scripts/sprachen-check.mjs [--wurzel=<dir>] | --selbsttest
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  DOMAIN, PAARE, STEMPEL_MUSTER, datei, kopfZeilen, sichtbarerText, stempelZeile, textHash,
} from '../lib/sprachen.mjs';

// Ab so vielen deutschen Treffern im sichtbaren Text gilt eine EN-Seite als
// nicht fertig uebersetzt. 0 waere zu streng: Eigennamen wie „Sebi & Phil“.
const MAX_DEUTSCH = 2;
const DEUTSCH = /\b(und|der|die|das|nicht|mit|für|dein|deine|wir|du|ist|zum|zur|bei|eine?)\b|[äöüÄÖÜß]/g;

const lies = (wurzel, pfad) => readFileSync(join(wurzel, datei(pfad)), 'utf8');

function pruefePaar(wurzel, { de, en }, sitemap) {
  const befunde = [];
  if (!existsSync(join(wurzel, datei(de)))) return [`${de}: deutsche Seite fehlt (lib/sprachen.mjs zeigt ins Leere)`];
  if (!existsSync(join(wurzel, datei(en)))) return [`${de}: englische Schwester ${en} fehlt`];

  const deHtml = lies(wurzel, de);
  const enHtml = lies(wurzel, en);

  const stempel = enHtml.match(STEMPEL_MUSTER);
  if (!stempel) befunde.push(`${en}: kein Stempel <meta name="s2s-quelle"> — nie gegen ${de} abgeglichen`);
  else if (stempel[1] !== de) befunde.push(`${en}: Stempel zeigt auf ${stempel[1]} statt ${de}`);
  else if (stempel[2] !== textHash(deHtml)) {
    befunde.push(`${en}: veraltet — ${de} wurde nach der Übersetzung geändert (Stempel ${stempel[2]}, heute ${textHash(deHtml)})`);
  }

  if (!/<html lang="de"/.test(deHtml)) befunde.push(`${de}: <html lang="de"> fehlt`);
  if (!/<html lang="en"/.test(enHtml)) befunde.push(`${en}: <html lang="en"> fehlt`);

  for (const [pfad, html] of [[de, deHtml], [en, enHtml]]) {
    const soll = kopfZeilen(pfad, wurzel);
    if (!html.includes(`<!-- SPRACHE:KOPF -->\n${soll}\n<!-- /SPRACHE:KOPF -->`)) {
      befunde.push(`${pfad}: hreflang-Kopf fehlt oder veraltet (node scripts/build-pages.mjs)`);
    }
  }

  const ziel = (von, nach) => new RegExp(`<a class="[^"]*\\bsprache\\b[^"]*" href="${nach}" hreflang=`);
  if (!ziel(de, en).test(deHtml)) befunde.push(`${de}: Umschalter zu ${en} fehlt`);
  if (!ziel(en, de).test(enHtml)) befunde.push(`${en}: Umschalter zu ${de} fehlt`);

  const reste = sichtbarerText(enHtml).match(DEUTSCH) ?? [];
  if (reste.length > MAX_DEUTSCH) {
    befunde.push(`${en}: ${reste.length} deutsche Wörter im sichtbaren Text (${[...new Set(reste)].slice(0, 8).join(', ')})`);
  }

  for (const pfad of [de, en]) {
    if (sitemap !== null && !sitemap.includes(`<loc>${DOMAIN}${pfad}</loc>`)) befunde.push(`${pfad}: fehlt in sitemap.xml`);
  }
  return befunde;
}

export function pruefe(wurzel, paare = PAARE) {
  const sitemapDatei = join(wurzel, 'sitemap.xml');
  const sitemap = existsSync(sitemapDatei) ? readFileSync(sitemapDatei, 'utf8') : null;
  const befunde = paare.flatMap((p) => pruefePaar(wurzel, p, sitemap));
  if (sitemap === null) befunde.push('sitemap.xml fehlt');
  return befunde;
}

// ── Selbsttest: kaputte Faelle muessen rot werden, und zwar aus dem richtigen Grund ──

function baue(wurzel, dateien) {
  for (const [pfad, inhalt] of Object.entries(dateien)) {
    mkdirSync(dirname(join(wurzel, pfad)), { recursive: true });
    writeFileSync(join(wurzel, pfad), inhalt);
  }
}

function sauber(wurzel, paar) {
  const de = `<html lang="de"><head></head><body><p>Wir bauen deinen Auftritt und das bleibt so.</p>`
    + `<a class="sprache" href="${paar.en}" hreflang="en">English</a></body></html>`;
  baue(wurzel, { [datei(paar.de)]: de, [datei(paar.en)]: '<html lang="en"><head></head><body></body></html>' });
  const en = `<html lang="en"><head>${stempelZeile(paar.de, de)}</head><body><p>We build your presence.</p>`
    + `<a class="sprache" href="${paar.de}" hreflang="de">Deutsch</a></body></html>`;
  const mitKopf = (html, pfad) => html.replace('</head>', `<!-- SPRACHE:KOPF -->\n${kopfZeilen(pfad, wurzel)}\n<!-- /SPRACHE:KOPF -->\n</head>`);
  baue(wurzel, {
    [datei(paar.de)]: mitKopf(de, paar.de),
    [datei(paar.en)]: mitKopf(en, paar.en),
    'sitemap.xml': `<urlset><url><loc>${DOMAIN}${paar.de}</loc></url><url><loc>${DOMAIN}${paar.en}</loc></url></urlset>`,
  });
}

function selbsttest() {
  const paar = PAARE.find((p) => p.de === '/preise/');
  const faelle = [
    { name: 'sauber', kaputt: () => {}, erwartet: null },
    { name: 'EN fehlt', kaputt: (w) => rmSync(join(w, datei(paar.en))), erwartet: /englische Schwester .* fehlt/ },
    {
      name: 'DE geändert, EN nicht',
      kaputt: (w) => {
        const f = join(w, datei(paar.de));
        writeFileSync(f, readFileSync(f, 'utf8').replace('das bleibt so', 'das ist neu'));
      },
      erwartet: /veraltet/,
    },
    {
      name: 'hreflang fehlt',
      kaputt: (w) => {
        const f = join(w, datei(paar.en));
        writeFileSync(f, readFileSync(f, 'utf8').replace(/<link rel="alternate" hreflang="de"[^>]*>\n/, ''));
      },
      erwartet: /hreflang-Kopf/,
    },
    {
      name: 'Deutsch übrig',
      kaputt: (w) => {
        const f = join(w, datei(paar.en));
        writeFileSync(f, readFileSync(f, 'utf8').replace('We build your presence.', 'Wir bauen für dich und mit dir die Seite.'));
      },
      erwartet: /deutsche Wörter/,
    },
    {
      name: 'Umschalter fehlt',
      kaputt: (w) => {
        const f = join(w, datei(paar.de));
        writeFileSync(f, readFileSync(f, 'utf8').replace(/<a class="sprache"[^>]*>English<\/a>/, ''));
      },
      erwartet: /Umschalter zu/,
    },
  ];
  let rot = 0;
  for (const fall of faelle) {
    const w = mkdtempSync(join(tmpdir(), 'sprachen-check-'));
    try {
      sauber(w, paar);
      fall.kaputt(w);
      const befunde = pruefe(w, [paar]);
      const ok = fall.erwartet === null ? befunde.length === 0 : befunde.some((b) => fall.erwartet.test(b));
      const bild = befunde.length ? befunde.join(' | ') : 'keine Befunde';
      console.log(`${ok ? '✓' : '✗'} ${fall.name}: ${bild}`);
      if (!ok) rot++;
    } finally {
      rmSync(w, { recursive: true, force: true });
    }
  }
  return rot;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--selbsttest')) {
    const rot = selbsttest();
    console.log(rot ? `✗ Selbsttest sprachen-check: ${rot} Fall/Fälle falsch` : '✓ Selbsttest sprachen-check');
    process.exit(rot ? 1 : 0);
  }
  const arg = process.argv.find((a) => a.startsWith('--wurzel='));
  const wurzel = arg ? arg.slice('--wurzel='.length) : process.cwd();
  const befunde = pruefe(wurzel);
  if (befunde.length) {
    console.log(`✗ sprachen-check: ${befunde.length} Befund(e)`);
    for (const b of befunde) console.log(`  - ${b}`);
    process.exit(1);
  }
  console.log(`✓ sprachen-check: ${PAARE.length} Seitenpaare zweisprachig und aktuell`);
}
