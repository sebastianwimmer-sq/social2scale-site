#!/usr/bin/env node
/**
 * Baut die Wochen-News aus data/news/<jahr>-kw<nn>.json (geschrieben von scripts/news-mittwoch.py):
 *   /news/                 neueste Ausgabe           /en/news/
 *   /news/<jahr>-kw<nn>/   jede Ausgabe, bleibt      /en/news/<jahr>-kw<nn>/
 *   /news/<aktion>/        Sonderausgabe je Aktion (data/news/sonder/), ausfuehrlich, oben auf /news/ verlinkt, solange sie laeuft
 * und traegt sie in sitemap.xml ein (die englischen Bloecke setzt danach sitemap-sprachen.mjs).
 *
 * Form (Sebi 19.11.2026, „macht noch kein bock zu lesen, viel text, struktur wirr“): je Neuerung ein grosser Satz,
 * Details und Quelle erst auf Antippen, unten eine Frage, auf die man Sebi direkt antwortet (CRM-Eingang, Typ feedback).
 *
 * Rahmen (Kopf, Menue, Fuss) kommt aus der Ablauf-Seite derselben Sprache, damit die News nie eine eigene Welt sind.
 * Danach: build-pages.mjs (Menue, hreflang) → sitemap-sprachen.mjs → csp-haerten.mjs.
 *
 * Aufruf: node scripts/build-news.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DOMAIN } from '../lib/sprachen.mjs';
import { ausgaben, neuesteId, sonder } from '../lib/news.mjs';

const T = {
  de: {
    vorlage: 'ablauf/index.html', wurzel: '/news/', lang: 'de-DE', datenschutz: '/datenschutz/',
    titel: (a) => `Social-Media-News KW ${a.kw}: ${a.kurz} | social2scale`,
    beschreibung: (a) => `Was sich diese Woche auf Social Media geändert hat und was es für dich heißt: ${a.kurz}. Jeden Mittwoch neu, in zwei Minuten gelesen.`,
    meta: (a, min) => `KW ${a.kw} · ${datumLang(a.datum, 'de')} · ${min} Min. · jeden Mittwoch neu`,
    h1: 'Diese Woche auf <em>Social Media</em>.',
    h1Alt: (a) => `KW ${a.kw} auf <em>Social Media</em>.`,
    quelle: 'Quelle', du: 'Und du?',
    feld: 'Deine Antwort, oder frag Sebi etwas zu dieser Woche', mail: 'Deine E-Mail (freiwillig)',
    knopf: 'An Sebi schicken', hinweis: (ds) => `Deine Antwort geht direkt an Sebi. Die E-Mail ist freiwillig und nur für seine Antwort, mehr im <a href="${ds}">Datenschutz</a>.`,
    frueher: 'Weitere Ausgaben', sonder: 'Sonderausgabe', sonderLesen: 'Ganz lesen', neueste: 'Zur neuesten Ausgabe', skip: 'Zum Inhalt',
  },
  en: {
    vorlage: 'en/process/index.html', wurzel: '/en/news/', lang: 'en-US', datenschutz: '/en/privacy/',
    titel: (a) => `Social media news, week ${a.kw}: ${a.kurz} | social2scale`,
    beschreibung: (a) => `What changed on social media this week and what it means for you: ${a.kurz}. New every Wednesday, a two-minute read.`,
    meta: (a, min) => `Week ${a.kw} · ${datumLang(a.datum, 'en')} · ${min} min · new every Wednesday`,
    h1: 'This week on <em>social media</em>.',
    h1Alt: (a) => `Week ${a.kw} on <em>social media</em>.`,
    quelle: 'Source', du: 'And you?',
    feld: 'Your answer, or ask Sebi something about this week', mail: 'Your email (optional)',
    knopf: 'Send to Sebi', hinweis: (ds) => `Your answer goes straight to Sebi. The email is optional and only used for his reply, see our <a href="${ds}">privacy policy</a>.`,
    frueher: 'More issues', sonder: 'Special issue', sonderLesen: 'Read it all', neueste: 'Go to the latest issue', skip: 'Skip to content',
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONATE = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
function datumLang(iso, sp) {
  if (!iso) return '';
  const [j, m, t] = iso.split('-').map(Number);
  return sp === 'de' ? `${t}. ${MONATE.de[m - 1]} ${j}` : `${MONATE.en[m - 1]} ${t}, ${j}`;
}

function ersetzeEinmal(html, muster, neu, was) {
  const treffer = html.match(muster);
  if (!treffer) throw new Error(`Vorlage: ${was} nicht gefunden`);
  return html.replace(muster, neu);
}

/** Kopf bis <main> und Fuss ab </main> aus der Vorlage, mit eigenen Metadaten. */
function rahmen(sp, { titel, beschreibung, url, ldJson }) {
  const html = readFileSync(T[sp].vorlage, 'utf8');
  const a = html.indexOf('  <main '), b = html.indexOf('  </main>');
  if (a < 0 || b < 0) throw new Error(`Vorlage ${T[sp].vorlage}: <main> fehlt`);
  let kopf = html.slice(0, a), fuss = html.slice(b + '  </main>'.length);
  const e = esc;
  kopf = ersetzeEinmal(kopf, /<title>[^<]*<\/title>/, `<title>${e(titel)}</title>`, 'title');
  kopf = ersetzeEinmal(kopf, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${e(beschreibung)}">`, 'description');
  kopf = ersetzeEinmal(kopf, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`, 'canonical');
  kopf = ersetzeEinmal(kopf, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${e(titel)}">`, 'og:title');
  kopf = ersetzeEinmal(kopf, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${e(beschreibung)}">`, 'og:description');
  kopf = ersetzeEinmal(kopf, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`, 'og:url');
  kopf = ersetzeEinmal(kopf, /<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="article">', 'og:type');
  kopf = ersetzeEinmal(kopf, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${e(titel)}">`, 'twitter:title');
  kopf = ersetzeEinmal(kopf, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${e(beschreibung)}">`, 'twitter:description');
  // Seiteneigene Teile der Vorlage raus: HowTo-Daten, Szenen der Ablauf-Seite, Sprach-Kopf (setzt build-pages neu)
  kopf = ersetzeEinmal(kopf, /<script type="application\/ld\+json">\s*\{"@context":"https:\/\/schema\.org","@type":"HowTo"[\s\S]*?<\/script>\n/, `<script type="application/ld+json">${ldJson}</script>\n`, 'HowTo');
  kopf = ersetzeEinmal(kopf, /<script src="\/szenen\/szenen\.js"[^>]*><\/script>\n/, '', 'szenen.js');
  kopf = kopf.replace(/\n?<!-- SPRACHE:KOPF -->[\s\S]*?<!-- \/SPRACHE:KOPF -->/, '');
  kopf = ersetzeEinmal(kopf, '</head>', '<link rel="stylesheet" href="/news.css">\n</head>', 'head');
  fuss = fuss.replace(/<!-- RAUM-LICHT[\s\S]*?<!-- \/RAUM-LICHT -->/, '');
  fuss = ersetzeEinmal(fuss, '</body>', '<script src="/news.js" defer></script>\n</body>', 'body');
  return { kopf, fuss };
}

const minuten = (a) => Math.max(1, Math.round(
  [a.frage, ...a.punkte.flatMap((p) => [p.satz, p.detail])].join(' ').split(/\s+/).length / 200));

function punktHtml(p, sp) {
  const L = T[sp];
  const quelle = p.quelle
    ? `${L.quelle}: <a href="${esc(p.quelle)}" target="_blank" rel="noopener">${esc(p.quelle_name)}</a>${p.datum ? `, ${datumLang(p.datum, sp)}` : ''}`
    : `${L.quelle}: ${esc(p.quelle_name)}`;
  return `      <details class="nw-punkt reveal">
        <summary><span class="nw-wo">${esc(p.wo)}</span><span class="nw-satz">${esc(p.satz)}</span><span class="nw-mehr" aria-hidden="true"></span></summary>
        <div class="nw-detail"><p>${esc(p.detail)}</p><p class="nw-quelle">${quelle}</p></div>
      </details>`;
}

function fragenBlock(sp, frage, ausgabe) {
  const L = T[sp];
  return `      <section class="nw-du" aria-labelledby="nw-du-h">
        <p class="nw-wo">${L.du}</p>
        <h2 id="nw-du-h">${esc(frage)}</h2>
        <form id="nw-form" novalidate data-ausgabe="${ausgabe}" data-frage="${esc(frage)}">
          <textarea id="nw-text" name="antwort" required maxlength="3000" aria-label="${L.feld}" placeholder="${L.feld}"></textarea>
          <input id="nw-mail" aria-label="${L.mail}" name="email" type="email" autocomplete="email" maxlength="160" placeholder="${L.mail}">
          <div class="nw-falle" aria-hidden="true"><label for="nw-website">Website</label><input id="nw-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
          <div class="nw-zeile"><p class="nw-hinweis">${L.hinweis(L.datenschutz)}</p><button class="nw-knopf" type="submit">${L.knopf} <span aria-hidden="true">→</span></button></div>
          <p class="nw-status" id="nw-status" role="status" aria-live="polite"></p>
        </form>
      </section>`;
}

function hauptHtml(a, sp, alle, istNeueste) {
  const L = T[sp];
  const id = `${a.jahr}-kw${a.kw}`;
  const frueher = alle.filter((x) => x.id !== id).slice(0, 8);
  const sonderListe = sonder().map((s) => `          <li><a href="${L.wurzel}${s.id}/"><span>${L.sonder}</span> ${esc(s[sp].kurz)}</a></li>\n`).join('');
  const frueherHtml = frueher.length || sonderListe ? `
      <nav class="nw-frueher" aria-label="${L.frueher}">
        <h2>${L.frueher}</h2>
        <ul>
${sonderListe}${frueher.map((x) => `          <li><a href="${L.wurzel}${x.id}/"><span>KW ${x.kw}</span> ${esc(x[sp].kurz)}</a></li>`).join('\n')}
        </ul>
      </nav>` : '';
  const zurNeuesten = istNeueste ? '' : `\n      <p class="nw-neueste"><a href="${L.wurzel}">${L.neueste} <span aria-hidden="true">→</span></a></p>`;
  return `  <main id="main" tabindex="-1" class="nw" data-news="${neuesteId()}">
    <article class="nw-blatt wrap">
${sonderHinweis(sp)}      <header class="nw-kopf">
        <p class="nw-meta">${esc(L.meta({ ...a[sp], kw: a.kw, datum: a.datum }, minuten(a[sp])))}</p>
        <h1>${istNeueste ? L.h1 : L.h1Alt(a)}</h1>
      </header>
${a[sp].punkte.map((p) => punktHtml(p, sp)).join('\n')}
${fragenBlock(sp, a[sp].frage, `KW ${a.kw}/${a.jahr}`)}${frueherHtml}${zurNeuesten}
    </article>
  </main>`;
}

/** Laufende Sonderausgabe oben auf jeder News-Seite. Steht im HTML versteckt, news.js zeigt sie von start bis ende. */
function sonderHinweis(sp) {
  const L = T[sp];
  return sonder().map((s) => `      <a class="nw-s-hinweis" href="${L.wurzel}${s.id}/" data-ab="${s.start}" data-bis="${s.ende}" hidden><span class="nw-wo">${L.sonder}</span><span class="nw-s-was">${esc(s[sp].kurz)}</span><span class="nw-s-los">${L.sonderLesen} <span aria-hidden="true">→</span></span></a>\n`).join('');
}

function sonderHtml(s, sp, alle) {
  const L = T[sp], t = s[sp], anfrage = sp === 'de' ? '/anfrage/' : '/en/contact/';
  const knopf = `<a class="nw-knopf nw-s-knopf" href="${anfrage}">${esc(t.knopf)} <span aria-hidden="true">→</span></a>`;
  const teil = (x) => `      <section class="nw-s-teil">
        <h2>${esc(x.h)}</h2>${x.p ? `\n        <p>${esc(x.p)}</p>` : ''}${x.liste ? `
        <dl class="nw-s-liste">${x.liste.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>` : ''}${x.schritte ? `
        <ol class="nw-s-schritte">${x.schritte.map(([a, b]) => `<li><h3>${esc(a)}</h3><p>${esc(b)}</p></li>`).join('')}</ol>` : ''}
      </section>`;
  return `  <main id="main" tabindex="-1" class="nw nw-s" data-news="${neuesteId()}" data-bis="${s.ende}">
    <article class="nw-blatt wrap">
      <p class="nw-s-vorbei" hidden>${esc(t.vorbei)} <a href="${anfrage}">${esc(t.knopf)}</a></p>
      <header class="nw-kopf nw-s-kopf">
        <div>
          <p class="nw-meta">${esc(t.meta)}</p>
          <h1>${t.titel}</h1>
          <p class="nw-s-lead">${esc(t.lead)}</p>
          ${knopf}
        </div>
        <figure class="nw-s-handy"><div class="nw-s-schirm">${s.bilder.map((b) => { const [w, h] = b.endsWith('360') ? [360, 450] : [400, 500]; return `<img src="/assets/feed/beitrag-${b}.webp" alt="" width="${w}" height="${h}" decoding="async">`; }).join('')}</div><figcaption>${esc(t.bild)}</figcaption></figure>
      </header>
${t.teile.map(teil).join('\n')}
      <section class="nw-s-teil">
        <h2>${esc(t.fragen_h)}</h2>
${t.fragen.map(([f, a]) => `        <details class="nw-punkt"><summary><span class="nw-satz nw-s-frage">${esc(f)}</span><span class="nw-mehr" aria-hidden="true"></span></summary><div class="nw-detail"><p>${esc(a)}</p></div></details>`).join('\n')}
      </section>
      <section class="nw-s-teil nw-s-regeln"><h2>${esc(t.regeln_h)}</h2><p>${esc(t.regeln)}</p>${knopf}</section>
${fragenBlock(sp, t.frage, `${L.sonder} ${s.id}`)}
      <nav class="nw-frueher" aria-label="${L.frueher}">
        <h2>${L.frueher}</h2>
        <ul>
${alle.slice(0, 8).map((x) => `          <li><a href="${L.wurzel}${x.id}/"><span>KW ${x.kw}</span> ${esc(x[sp].kurz)}</a></li>`).join('\n')}
        </ul>
      </nav>
    </article>
  </main>`;
}

function ldJson(a, sp, url) {
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: T[sp].titel(a[sp] && { ...a[sp], kw: a.kw }).replace(/ \| social2scale$/, ''),
    datePublished: a.datum, dateModified: a.datum, inLanguage: T[sp].lang, url, mainEntityOfPage: url,
    image: `${DOMAIN}/assets/og-image.png`,
    author: { '@id': `${DOMAIN}/#org` }, publisher: { '@id': `${DOMAIN}/#org` },
  });
}

function schreibe(pfad, html) {
  const ziel = `${pfad.slice(1)}index.html`;
  mkdirSync(ziel.replace(/index\.html$/, ''), { recursive: true });
  writeFileSync(ziel, html, 'utf8');
  console.log(`geschrieben: ${ziel}`);
}

function seite(a, sp, alle, pfad, istNeueste) {
  const kurz = { ...a[sp], kw: a.kw };
  const url = DOMAIN + pfad;
  const { kopf, fuss } = rahmen(sp, { titel: T[sp].titel(kurz), beschreibung: T[sp].beschreibung(kurz), url, ldJson: ldJson(a, sp, url) });
  schreibe(pfad, kopf + hauptHtml(a, sp, alle, istNeueste) + fuss);
}

function sitemap(alle) {
  let xml = readFileSync('sitemap.xml', 'utf8');
  for (const pfad of ['/news/', ...[...sonder(), ...alle].map((a) => `/news/${a.id}/`)]) {
    const loc = `<loc>${DOMAIN}${pfad}</loc>`;
    if (xml.includes(loc)) continue;
    const block = `  <url>\n    ${loc}\n    <changefreq>weekly</changefreq>\n    <priority>${pfad === '/news/' ? '0.7' : '0.5'}</priority>\n  </url>\n`;
    xml = ersetzeEinmal(xml, '</urlset>', `${block}</urlset>`, 'sitemap');
  }
  writeFileSync('sitemap.xml', xml, 'utf8');
}

const alle = ausgaben();
if (!alle.length) throw new Error('data/news ist leer, keine Ausgabe zum Bauen');
for (const sp of ['de', 'en']) {
  const wurzel = T[sp].wurzel;
  seite(alle[0], sp, alle, wurzel, true);
  for (const a of alle) seite(a, sp, alle, `${wurzel}${a.id}/`, false);
  for (const s of sonder()) {
    const pfad = `${wurzel}${s.id}/`, url = DOMAIN + pfad, titel = `${s[sp].kurz} | social2scale`;
    const daten = JSON.stringify({ '@context': 'https://schema.org', '@type': 'NewsArticle', headline: s[sp].kurz, datePublished: s.datum, dateModified: s.datum, expires: s.ende, inLanguage: T[sp].lang, url, mainEntityOfPage: url, image: `${DOMAIN}/assets/og-image.png`, author: { '@id': `${DOMAIN}/#org` }, publisher: { '@id': `${DOMAIN}/#org` } });
    const { kopf, fuss } = rahmen(sp, { titel, beschreibung: s[sp].lead.slice(0, 155).replace(/\s+\S*$/, ' …'), url, ldJson: daten });
    schreibe(pfad, kopf + sonderHtml(s, sp, alle) + fuss);
  }
}
sitemap(alle);
console.log(`fertig: ${alle.length} Ausgabe(n), neueste ${alle[0].id}`);
