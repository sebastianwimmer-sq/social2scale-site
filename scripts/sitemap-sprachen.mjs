#!/usr/bin/env node
/**
 * Traegt die englischen Seiten in sitemap.xml ein und verbindet jedes Paar
 * mit <xhtml:link rel="alternate" hreflang> (17.10.2026, lib/sprachen.mjs).
 *
 * Idempotent: ein zweiter Lauf aendert nichts. Ein EN-Block wird direkt hinter
 * seinem DE-Block angelegt und uebernimmt dessen changefreq/priority; das
 * lastmod setzt danach scripts/sitemap-lastmod.sh aus der Git-Historie.
 *
 * Aufruf: node scripts/sitemap-sprachen.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { DOMAIN, PAARE, datei } from '../lib/sprachen.mjs';

// Englische Seiten ohne deutsche Schwester (siehe lib/sprachen.mjs). Seit 23.10.2026 keine:
// /en/contact/ und /en/free/ sind Weiterleitungen (noindex) wie /anfrage/ und /gratis/.
const EINZELN_EN = [];
const NS = 'xmlns:xhtml="http://www.w3.org/1999/xhtml"';

let xml = readFileSync('sitemap.xml', 'utf8');
if (!xml.includes(NS)) {
  const alt = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  if (!xml.includes(alt)) throw new Error('sitemap.xml: <urlset> in unerwarteter Form');
  xml = xml.replace(alt, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ${NS}>`);
}

const block = (pfad) => {
  const m = xml.match(new RegExp(`  <url>\\n    <loc>${DOMAIN}${pfad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>[\\s\\S]*?  </url>\\n`));
  return m ? m[0] : null;
};

const alternativen = ({ de, en }) => [
  `    <xhtml:link rel="alternate" hreflang="de" href="${DOMAIN}${de}"/>`,
  `    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}${en}"/>`,
  `    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}${de}"/>`,
].join('\n');

function mitAlternativen(b, paar) {
  const ohne = b.replace(/    <xhtml:link [^\n]*\n/g, '');
  return ohne.replace('  </url>\n', `${alternativen(paar)}\n  </url>\n`);
}

for (const paar of PAARE) {
  if (!existsSync(datei(paar.en))) continue;
  const deBlock = block(paar.de);
  if (!deBlock) throw new Error(`sitemap.xml: ${paar.de} fehlt — erst den deutschen Block anlegen`);
  if (!block(paar.en)) {
    const enBlock = deBlock.replace(`<loc>${DOMAIN}${paar.de}</loc>`, `<loc>${DOMAIN}${paar.en}</loc>`);
    xml = xml.replace(deBlock, deBlock + enBlock);
  }
  for (const pfad of [paar.de, paar.en]) xml = xml.replace(block(pfad), mitAlternativen(block(pfad), paar));
}

for (const pfad of EINZELN_EN) {
  if (existsSync(datei(pfad)) && !block(pfad)) {
    xml = xml.replace('</urlset>', `  <url>\n    <loc>${DOMAIN}${pfad}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n</urlset>`);
  }
}

writeFileSync('sitemap.xml', xml);
console.log(`sitemap.xml: ${(xml.match(/<url>/g) || []).length} Adressen, ${(xml.match(/<xhtml:link /g) || []).length} Sprachverweise`);
