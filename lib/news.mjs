/**
 * Die Wochen-News als Liste, neueste zuerst (data/news/<jahr>-kw<nn>.json, scripts/news-mittwoch.py).
 * Eine Quelle fuer Seiten (build-news.mjs), Sprachpaare (sprachen.mjs) und den Zaehler im Menue (shell.mjs).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const ORDNER = 'data/news';

export function ausgaben() {
  if (!existsSync(ORDNER)) return [];
  return readdirSync(ORDNER)
    .filter((n) => /^\d{4}-kw\d{1,2}\.json$/.test(n))
    .map((n) => ({ id: n.replace(/\.json$/, ''), ...JSON.parse(readFileSync(`${ORDNER}/${n}`, 'utf8')) }))
    .sort((a, b) => (b.jahr - a.jahr) || (b.kw - a.kw));
}

/**
 * Sonderausgaben (data/news/sonder/<name>.json), neueste zuerst. Regel (Sebi 24.11.2026): jede Aktion bekommt eine, die sie
 * so ausfuehrlich erklaert wie das PDF. Die Wochenausgabe bleibt die Seite /news/, die Sonderausgabe haengt oben dran.
 */
export function sonder() {
  const o = `${ORDNER}/sonder`;
  if (!existsSync(o)) return [];
  return readdirSync(o).filter((n) => /^[a-z0-9-]+\.json$/.test(n))
    .map((n) => ({ id: n.replace(/\.json$/, ''), ...JSON.parse(readFileSync(`${o}/${n}`, 'utf8')) }))
    .sort((a, b) => b.datum.localeCompare(a.datum));
}

/** Sprachpaare aller News-Seiten: /news/ und jede Ausgabe. */
export function newsPaare() {
  const alle = ausgaben();
  if (!alle.length) return [];
  return [{ de: '/news/', en: '/en/news/' }, ...[...sonder(), ...alle].map((a) => ({ de: `/news/${a.id}/`, en: `/en/news/${a.id}/` }))];
}

export const neuesteId = () => [...ausgaben(), ...sonder()].sort((a, b) => b.datum.localeCompare(a.datum))[0]?.id ?? '';
