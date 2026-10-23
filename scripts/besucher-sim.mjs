#!/usr/bin/env node
// besucher-sim.mjs — zehn Besucherinnen gehen über social2scale.com, jede mit einem Ziel.
//
// WARUM (10.10.2026)
// Die Einzeltore (kundenweg-loop: Links kommen an, s2s-flaechen-check: eine Seite in
// zwei Engines) prüfen Seiten. Eine Besucherin erlebt einen WEG: Instagram-Bio →
// Startseite → Gratis-Vorschau → Mail. Die Lücken liegen zwischen den Seiten — ein
// Knopf unter dem Falz am iPhone SE, ein Funnel-Schritt, dessen „Weiter" erst nach
// dem Scrollen auftaucht, eine Seite ohne Weg zur Vorschau (Website-Ziel = Freebie).
//
// Gemessen am ERGEBNIS im echten Browser (WebKit/Chromium/Firefox), live:
//   je Seite  Status, Skriptfehler, kaputte Anfragen, Querscrollen, Weg zur Vorschau,
//             erste Handlung über dem Falz, Trefferflächen (WCAG 2.2 · 2.5.8: 24 px,
//             kern: 44 px), Lesetext ≥ 15 px, Bilder/alt, Titel/Beschreibung/lang/h1,
//             nach dem Durchscrollen unsichtbarer Text, CLS
//   je Weg    Klicks bis zur Vorschau, Funnel-Schritte passen auf einen Schirm,
//             Zwischenstand überlebt Neuladen, Tastatur erreicht den Knopf mit
//             sichtbarem, unverdecktem Fokus (2.4.7/2.4.11), LCP am gedrosselten Netz
//
// FUSSABDRUCK NULL: jede Anfrage außer GET/HEAD wird im Browser abgebrochen (Formulare,
// sendBeacon), dazu jeder Zählaufruf (/api/pv). Kein Lead, keine Mail, kein Eintrag
// im Trichter des Controllings.
//
// Aufruf:  node scripts/besucher-sim.mjs [basis-url] [--nur=<persona>] [--bilder]
//          node scripts/besucher-sim.mjs --wurzel=. [--funnel=http://127.0.0.1:<port>/]   lokaler Stand
//          node scripts/besucher-sim.mjs --selbsttest
// Hängt in scripts/pruefen.sh (Selbsttest + lokaler Stand) — läuft vor jedem Commit.
// Exit 1 bei rot. Ergebnis zusätzlich als JSON (+ Bildschirmfotos mit --bilder)
// unter ${TMPDIR}/besucher-sim/.

import { chromium, firefox, webkit, devices } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import os from 'node:os';

const ARGS = process.argv.slice(2);
const SELBSTTEST = ARGS.includes('--selbsttest');
const BILDER = ARGS.includes('--bilder');
const NUR = (ARGS.find((a) => a.startsWith('--nur=')) || '').slice(6);
// --wurzel=<ordner>: den lokalen Stand prüfen (vor dem Commit, scripts/pruefen.sh der Website).
const WURZEL = (ARGS.find((a) => a.startsWith('--wurzel=')) || '').slice(9);
let BASIS = (ARGS.find((a) => !a.startsWith('--')) || 'https://social2scale.com').replace(/\/$/, '');
// Funnel direkt prüfen (z. B. lokaler `wrangler dev` vor einem Deploy von free-content).
const FUNNEL = (ARGS.find((a) => a.startsWith('--funnel=')) || '').slice(9) || 'https://start.social2scale.com/';
const AUS = join(process.env.TMPDIR || os.tmpdir(), 'besucher-sim');

// Schwellen mit Quelle — jede hat einen roten und einen grünen Fixture im Selbsttest.
const MIN_ZIEL = 24;        // WCAG 2.2 AA 2.5.8 Target Size (Minimum)
const GUT_ZIEL = 44;        // kern.md: Trefferflächen ab 44 px
const FRAGEN_BIS_MAIL = 10;  // Funnel: Frage 10 ist das Mail-Feld (data-step="10" in form.js)
const MIN_SCHRIFT = 15;     // kern.md: Lesetext nie unter 15 px
const LESETEXT = 40;        // kern.md: Lesetext ab ~40 Zeichen, darunter Etikett
const CLS_MAX = 0.1;        // Core Web Vitals 2026, unverändert
const LCP_MAX = 2500;       // Core Web Vitals 2026, unverändert (ms)
// „Erste Handlung über dem Falz" gilt für Einstiege über Instagram (Startseite, Bio-Link-Seite).
// Ein Artikel aus der Suche beantwortet zuerst die Frage — dort zählt nur, DASS es einen Weg gibt.
// Website-Ziel ist die Vorschau (feedback_s2s_website_ziel_freebie): wer am Handy
// mehr als zwei Bildschirme Text liest, bevor die Vorschau angeboten wird, wird erschlagen.
const WORTE_VOR_VORSCHAU = 150;

// Was zur Gratis-Vorschau führt.
const VORSCHAU = /start\.social2scale\.com|\/(gratis|en\/free)\/?(\?|#|$)/i;
// Seiten, die bewusst nicht zur Vorschau führen müssen: Recht, nach dem Kauf, Kundinnen —
// und /anfrage/, das Erstgespräch-Formular ist selbst schon der Abschluss (ein Vorschau-Knopf
// dort würde aus dem Formular herausführen).
const OHNE_VORSCHAU = /^\/(impressum|datenschutz|danke|onboarding|anfrage|en\/contact)(\/|$)/;
// Englische Seiten (lib/sprachen.mjs): seit 23.10.2026 1:1 wie Deutsch — derselbe Funnel auf
// Englisch (/en/free/ → start.social2scale.com/en/), also dieselbe Regel; geprueft wird die Sprache.
const ENGLISCH = /^\/en(\/|$)/;

const BEFUNDE = [];
const WEGE = [];
function befund(persona, wo, stufe, text, beleg = '') {
  BEFUNDE.push({ persona, wo, stufe, text, beleg: String(beleg).slice(0, 300) });
}

// ── Messung im Browser (eine Funktion, damit der Selbsttest dieselbe prüft) ──────────
// Läuft als page.evaluate — darf nichts von außen benutzen.
function messeImBrowser(cfg) {
  const { VORSCHAU_QUELLE, MIN_ZIEL, GUT_ZIEL, MIN_SCHRIFT, LESETEXT } = cfg;
  const vorschau = new RegExp(VORSCHAU_QUELLE, 'i');
  const sichtbar = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || e.hidden || e.getAttribute('aria-hidden') === 'true') return false;
      if (e.tagName === 'DETAILS' && !e.open && e !== el && !el.closest('summary')) return false;
    }
    return true;
  };
  const deckend = (el) => {
    let o = 1;
    for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
    return o;
  };
  const vh = innerHeight, sy = scrollY;
  const aus = { querscrollen: document.documentElement.scrollWidth - innerWidth };
  aus.titel = document.title.trim();
  aus.beschreibung = (document.querySelector('meta[name="description"]') || {}).content || '';
  aus.lang = document.documentElement.lang || '';
  aus.h1 = [...document.querySelectorAll('h1')].filter(sichtbar).length;
  aus.viewport = !!document.querySelector('meta[name="viewport"]');

  const klickbar = [...document.querySelectorAll('a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, summary')].filter(sichtbar);
  const vorschauLinks = klickbar.filter((a) => a.tagName === 'A' && vorschau.test(a.getAttribute('href') || ''));
  aus.vorschauLinks = vorschauLinks.length;
  // Erste Handlung = erster sichtbare, knopfartige Link/Knopf in Lesereihenfolge (Seite oben).
  const knopfartig = (el) => {
    const s = getComputedStyle(el);
    const flaeche = s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.backgroundImage !== 'none' || parseFloat(s.borderTopWidth) > 0;
    return (el.tagName === 'BUTTON' || el.tagName === 'A') && flaeche && !el.closest('nav, header');
  };
  const ersteHandlung = klickbar.find(knopfartig);
  const ersteVorschau = vorschauLinks.find((a) => !a.closest('nav, header')) || vorschauLinks[0];
  const lage = (el) => (el ? Math.round(el.getBoundingClientRect().top + sy) : null);
  aus.ersteHandlung = ersteHandlung ? { text: ersteHandlung.textContent.trim().slice(0, 40), oben: lage(ersteHandlung), unten: Math.round(ersteHandlung.getBoundingClientRect().bottom + sy) } : null;
  aus.ersteVorschau = ersteVorschau ? { text: ersteVorschau.textContent.trim().slice(0, 40), oben: lage(ersteVorschau), unten: Math.round(ersteVorschau.getBoundingClientRect().bottom + sy) } : null;
  aus.vh = vh;

  // Worte vor der ersten Vorschau-Handlung (sichtbarer Text in Dokumentreihenfolge, ohne Navigation).
  if (ersteVorschau) {
    let worte = 0;
    const gang = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = gang.nextNode(); n; n = gang.nextNode()) {
      if (ersteVorschau.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) break;
      if (ersteVorschau.contains(n)) break;
      const el = n.parentElement;
      if (!el || el.closest('nav, header, script, style, noscript, [aria-hidden="true"]') || !sichtbar(el)) continue;
      worte += n.textContent.trim().split(/\s+/).filter(Boolean).length;
    }
    aus.worteVorVorschau = worte;
  }

  // Trefferflächen: WCAG nimmt Links im Fließtext aus (Inline-Ausnahme).
  const imText = (el) => el.tagName === 'A' && el.parentElement && /^(P|LI|SPAN|SMALL|DD|TD|FIGCAPTION|LABEL)$/.test(el.parentElement.tagName) &&
    el.parentElement.textContent.trim().length > el.textContent.trim().length + 3;
  aus.zuKlein = []; aus.knapp = 0; aus.knappListe = [];
  // 2.5.8 Abstands-Ausnahme: ein zu kleines Ziel besteht, wenn ein Kreis mit 24 px Durchmesser
  // um seine Mitte kein anderes Ziel schneidet und keinen solchen Kreis eines anderen kleinen Ziels.
  // Wer pointer-events:none trägt, ist gerade nicht antippbar (z. B. „Nach oben“ vor dem Scrollen,
  // dann auch auf 92 % verkleinert) — gemessen wird die Fläche, die man treffen kann.
  const ziele = klickbar.filter((el) => !imText(el) && el.type !== 'radio' && el.type !== 'checkbox' && getComputedStyle(el).pointerEvents !== 'none').map((el) => ({ el, r: el.getBoundingClientRect() }));
  const mitte = (r) => [r.left + r.width / 2, r.top + r.height / 2];
  const abstand = ([x, y], r) => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
  const klein = (r) => Math.min(r.width, r.height) < MIN_ZIEL;
  const freiGenug = (z) => ziele.every((o) => o === z || o.el.contains(z.el) || z.el.contains(o.el) ||
    (abstand(mitte(z.r), o.r) >= MIN_ZIEL / 2 && (!klein(o.r) || Math.hypot(mitte(z.r)[0] - mitte(o.r)[0], mitte(z.r)[1] - mitte(o.r)[1]) >= MIN_ZIEL)));
  for (const z of ziele) {
    const el = z.el, r = z.r;
    const k = Math.min(r.width, r.height);
    if (k < MIN_ZIEL && freiGenug(z)) continue;
    if (k < MIN_ZIEL) aus.zuKlein.push((el.textContent.trim() || el.getAttribute('aria-label') || el.tagName).slice(0, 30) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    else if (k < GUT_ZIEL) { aus.knapp++; aus.knappListe.push((el.textContent.trim() || el.getAttribute('aria-label') || el.tagName).replace(/\s+/g, ' ').slice(0, 30) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
  }

  // Lesetext unter MIN_SCHRIFT und Text, der nach dem Durchscrollen unsichtbar bleibt.
  aus.kleineSchrift = []; aus.unsichtbar = [];
  for (const el of document.querySelectorAll('p, li, h1, h2, h3, blockquote, dd, figcaption, a.btn, button')) {
    const t = el.textContent.trim();
    if (!t || !sichtbar(el)) continue;
    const eigen = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (eigen.length >= LESETEXT && parseFloat(getComputedStyle(el).fontSize) < MIN_SCHRIFT) aus.kleineSchrift.push(t.slice(0, 40) + ' · ' + getComputedStyle(el).fontSize);
    // Scroll-gebundene Wechsel (eine Bildunterschrift leuchtet, die anderen ruhen) sind
    // gewollt: zählt, ob der Text beim Durchscrollen JE sichtbar war (__maxO).
    if (Math.max(el.__maxO || 0, deckend(el)) < 0.05) aus.unsichtbar.push(t.slice(0, 40));
  }
  aus.bilderKaputt = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.getAttribute('src').slice(0, 60));
  aus.ohneAlt = [...document.images].filter((i) => !i.hasAttribute('alt') && sichtbar(i)).map((i) => (i.getAttribute('src') || '').slice(0, 60));
  aus.cls = window.__sim ? Math.round(window.__sim.cls * 1000) / 1000 : null;
  aus.lcp = window.__sim ? Math.round(window.__sim.lcp) : null;
  aus.lcpEl = window.__sim ? window.__sim.lcpEl || '' : '';
  return aus;
}

const CFG = { VORSCHAU_QUELLE: VORSCHAU.source, MIN_ZIEL, GUT_ZIEL, MIN_SCHRIFT, LESETEXT };

// LCP und CLS von Anfang an mitschreiben (vor jedem Skript der Seite).
const BEOBACHTER = `
  window.__sim = { cls: 0, lcp: 0 };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__sim.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { const e = l.getEntries(); if (e.length) { const x = e[e.length - 1]; window.__sim.lcp = x.startTime; window.__sim.lcpEl = x.element ? x.element.tagName.toLowerCase() + '.' + String(x.element.className).split(' ')[0] + (x.url ? ' ' + x.url.split('/').pop() : '') : x.url || ''; } }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}`;

// Befunde aus einer Seitenmessung ableiten — reine Funktion, im Selbsttest geprüft.
export function bewerte(pfad, m, { handy, einstieg }) {
  const b = [];
  const rot = (t, x = '') => b.push({ stufe: 'rot', text: t, beleg: x });
  const gelb = (t, x = '') => b.push({ stufe: 'gelb', text: t, beleg: x });
  if (m.querscrollen > 1) rot('Seite scrollt quer', m.querscrollen + ' px zu breit');
  const englisch = ENGLISCH.test(pfad);
  if (!OHNE_VORSCHAU.test(pfad) && !m.vorschauLinks) rot('Kein Weg zur Gratis-Vorschau auf dieser Seite');
  if (einstieg && handy && m.ersteHandlung && m.ersteHandlung.unten > m.vh) rot('Erste Handlung liegt unter dem Falz', m.ersteHandlung.text + ' endet bei ' + m.ersteHandlung.unten + ' px, Schirm ' + m.vh + ' px');
  if (einstieg && handy && !m.ersteHandlung) rot('Auf dem ersten Schirm gibt es keinen Knopf');
  if (einstieg && handy && m.worteVorVorschau > WORTE_VOR_VORSCHAU) gelb('Viel Text vor dem ersten Vorschau-Knopf', m.worteVorVorschau + ' Wörter');
  if (m.zuKlein.length) rot('Trefferfläche unter ' + MIN_ZIEL + ' px (WCAG 2.2 · 2.5.8)', m.zuKlein.slice(0, 4).join(' | '));
  if (handy && m.knapp) gelb(m.knapp + ' Trefferflächen zwischen ' + MIN_ZIEL + ' und ' + GUT_ZIEL + ' px', (m.knappListe || []).slice(0, 3).join(' | '));
  if (m.kleineSchrift.length) rot('Lesetext unter ' + MIN_SCHRIFT + ' px', m.kleineSchrift.slice(0, 3).join(' | '));
  if (m.unsichtbar.length) rot('Text bleibt nach dem Durchscrollen unsichtbar', m.unsichtbar.slice(0, 3).join(' | '));
  if (m.bilderKaputt.length) rot('Bild lädt nicht', m.bilderKaputt.join(' | '));
  if (m.ohneAlt.length) rot('Bild ohne alt-Attribut', m.ohneAlt.slice(0, 3).join(' | '));
  if (!m.titel) rot('Seite ohne Titel');
  if (!m.beschreibung) gelb('Keine Meta-Beschreibung (Suchergebnis zeigt Zufallstext)');
  if (englisch && !/^en/i.test(m.lang)) rot('Sprache nicht als Englisch ausgezeichnet', 'lang="' + m.lang + '"');
  if (!englisch && !/^de/i.test(m.lang)) rot('Sprache nicht als Deutsch ausgezeichnet', 'lang="' + m.lang + '"');
  if (m.h1 !== 1) gelb('Nicht genau eine Hauptüberschrift', m.h1 + '× h1');
  if (!m.viewport) rot('Kein viewport-Meta — Handy zeigt die Desktopseite verkleinert');
  if (m.cls != null && m.cls > CLS_MAX) rot('Layout springt (CLS ' + m.cls + ' > ' + CLS_MAX + ')');
  return b;
}

// ── Browser-Werkzeuge ────────────────────────────────────────────────────────────────
const ENGINES = { webkit, chromium, firefox };
async function oeffne(engine, geraet) {
  const browser = await ENGINES[engine].launch();
  const ctx = await browser.newContext({ ...geraet, locale: 'de-DE' });
  await ctx.addInitScript(BEOBACHTER);
  const abgebrochen = new Set();
  // Zählmeldungen im Browser ablesen: WebKit gibt den Inhalt eines sendBeacon nicht an die
  // Route weiter (postData null, geprüft 12.10.2026). Die Hülle merkt sich die Blob-Teile und
  // meldet synchron über eine Bindung — das überlebt auch eine sofortige Weiterleitung.
  const gezaehlt = [];
  await ctx.exposeBinding('__zaehlerMeldung', (_q, pfad) => { gezaehlt.push(pfad); });
  await ctx.addInitScript(() => {
    const B = window.Blob;
    window.Blob = class extends B { constructor(teile, o) { super(teile, o); this.__teile = teile; } };
    const senden = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
    if (!senden) return;
    navigator.sendBeacon = (url, daten) => {
      try {
        if (/\/api\/pv\b/.test(String(url))) {
          const text = typeof daten === 'string' ? daten : (daten && daten.__teile ? daten.__teile.join('') : '');
          window.__zaehlerMeldung(JSON.parse(text).p);
        }
      } catch { /* kein JSON — dann fehlt die Meldung im Tor */ }
      return senden(url, daten);
    };
  });
  await ctx.route('**/*', (r) => {
    const q = r.request();
    if (/\/api\/pv\b/.test(q.url())) gezaehlt.anfragen = (gezaehlt.anfragen || 0) + 1;
    if (!['GET', 'HEAD'].includes(q.method()) || /\/api\/pv\b/.test(q.url())) { abgebrochen.add(q.url()); return r.abort(); }
    return r.continue();
  });
  const page = await ctx.newPage();
  page.__fehler = [];
  page.__gezaehlt = gezaehlt;
  // Turnstile (challenges.cloudflare.com) meldet in WebKit eigene Rahmen-Fehler — fremder Code,
  // nicht die Seite. Abbrüche beim Seitenwechsel (Lazy-Bilder) sind kein Fehler.
  const FREMD = /challenges\.cloudflare\.com|WebKitBlobResource/;
  page.on('pageerror', (e) => { if (!FREMD.test(e.message)) page.__fehler.push({ art: 'skript', text: e.message }); });
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource|blocked/i.test(m.text())) page.__fehler.push({ art: 'konsole', text: m.text() }); });
  page.on('requestfailed', (q) => { const f = (q.failure() || {}).errorText || ''; if (!abgebrochen.has(q.url()) && !FREMD.test(q.url() + f) && !/ERR_ABORTED|cancelled|NS_BINDING_ABORTED/i.test(f)) page.__fehler.push({ art: 'anfrage', text: q.url().slice(0, 100) + ' ' + ((q.failure() || {}).errorText || '') }); });
  return { browser, ctx, page };
}

// Bis zur Ruhe warten: Schriften geladen, zwei Frames ohne Arbeit.
async function ruhe(page) {
  await page.waitForLoadState('load').catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// Einmal durchscrollen (Einblendungen, Lazy-Bilder), endliche Animationen beenden, nach oben.
async function durchscrollen(page) {
  await page.evaluate(async () => {
    const schritt = Math.max(150, innerHeight * 0.5);
    const merke = () => {
      for (const a of document.getAnimations()) {
        const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {};
        if (t.iterations !== Infinity && !a.timeline?.axis && !a.timeline?.source) try { a.finish(); } catch (_) {}
      }
      for (const el of document.querySelectorAll('p, li, h1, h2, h3, blockquote, dd, figcaption, a.btn, button')) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight || r.height < 1) continue;
        let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
        el.__maxO = Math.max(el.__maxO || 0, o);
      }
    };
    for (let y = 0; y < document.documentElement.scrollHeight; y += schritt) {
      scrollTo(0, y);
      // Eine Leserin verweilt; ohne Pause verpasst ein IntersectionObserver auf langsamen
      // Geräten den Moment (gedrosselt nachgestellt: langsam gescrollt erscheint alles).
      await new Promise((r) => setTimeout(r, 120));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      merke();
      await new Promise((r) => requestAnimationFrame(r));
      merke();
    }
    scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
    for (const a of document.getAnimations()) {
      const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {};
      if (t.iterations === Infinity) a.pause(); else try { a.finish(); } catch (_) {}
    }
    scrollTo(0, 0);
    // Langsame Geräte: Einblendungen, die spät ausgelöst wurden, laufen noch — abwarten und beenden.
    await new Promise((r) => setTimeout(r, 600));
    for (const a of document.getAnimations()) {
      const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {};
      if (t.iterations !== Infinity && !a.timeline?.source) try { a.finish(); } catch (_) {}
    }
  });
  await ruhe(page);
}

async function besuche(page, persona, pfad, opts) {
  page.__fehler.length = 0;
  const antwort = await page.goto(BASIS + pfad, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => ({ status: () => 0, fehler: e.message }));
  const status = antwort.status();
  await ruhe(page);
  // LCP ist erst endgültig, wenn kein größeres Element mehr nachkommt — zu früh abgelesen
  // meldete der Lauf mal 1,0 s, mal 3,2 s (die Hero-Collage kam später). Warten, bis der Wert
  // eine Sekunde steht, höchstens 8 s.
  if (opts && opts.lcpWarten) {
    let alt = -1;
    for (let i = 0; i < 8; i++) {
      const jetzt = await page.evaluate(() => (window.__sim ? window.__sim.lcp : 0));
      if (jetzt === alt) break;
      alt = jetzt; await page.waitForTimeout(1000);
    }
  }
  const oben = await page.evaluate(messeImBrowser, CFG); // erster Schirm, wie sie ankommt
  await durchscrollen(page);
  if (BILDER) await page.screenshot({ path: join(AUS, (persona + pfad).replace(/[^a-z0-9]+/gi, '_') + '.png') }).catch(() => {});
  const ganz = await page.evaluate(messeImBrowser, CFG);
  const m = { ...ganz, ersteHandlung: oben.ersteHandlung, worteVorVorschau: ganz.worteVorVorschau, vh: oben.vh, lcp: oben.lcp, lcpEl: oben.lcpEl };
  const erwartet404 = opts && opts.erwartet404;
  // Leitet die Seite in den Funnel weiter (/gratis/), IST sie die Vorschau.
  if (VORSCHAU.test(page.url())) m.vorschauLinks = Math.max(m.vorschauLinks, 1);
  if (!erwartet404 && (status === 0 || status >= 400)) befund(persona, pfad, 'rot', 'Seite lädt nicht', 'HTTP ' + status + (antwort.fehler ? ' ' + antwort.fehler : ''));
  for (const x of bewerte(pfad, m, opts || {})) befund(persona, pfad, x.stufe, x.text, x.beleg);
  for (const f of page.__fehler) befund(persona, pfad, f.art === 'skript' ? 'rot' : 'gelb', f.art === 'skript' ? 'Skriptfehler' : f.art === 'anfrage' ? 'Anfrage scheitert' : 'Konsolenfehler', f.text);
  return { status, m };
}

// ── Die zehn Besucherinnen ─────────────────────────────────────────────────────────
// Jede: Gerät, Einstieg, Ziel. Ein Weg zählt Klicks bis zur Vorschau.

// Ein Klick auf den ersten Vorschau-Knopf; zurück kommt die Adresse, auf der sie landet.
async function klickeVorschau(page) {
  const ziel = page.locator('a[href]').filter({ hasNot: page.locator('nav a, header a') });
  const n = await ziel.count();
  for (let i = 0; i < n; i++) {
    const a = ziel.nth(i);
    const h = (await a.getAttribute('href')) || '';
    if (VORSCHAU.test(h) && (await a.isVisible())) {
      await a.scrollIntoViewIfNeeded();
      await Promise.all([page.waitForLoadState('domcontentloaded').catch(() => {}), a.click({ timeout: 8000 })]);
      await ruhe(page);
      return page.url();
    }
  }
  return null;
}

// Endliche Übergänge abwarten (höchstens 2 s), endlose ignorieren.
async function uebergaengeFertig(page) {
  await page.evaluate(() => Promise.race([
    Promise.all(document.getAnimations().filter((a) => (a.effect?.getComputedTiming?.().iterations ?? 1) !== Infinity).map((a) => a.finished.catch(() => {}))),
    new Promise((r) => setTimeout(r, 2000)),
  ]));
}

// Zählt der Weg zur Vorschau? Ohne Zähler ist das Ziel der Website unsichtbar (bis 12.10.2026
// meldeten /gratis/ und die Vorschau nichts). `erwartet` sind Pfade, die gemeldet sein müssen;
// bis zur Frage `bisFrage` muss jede Frage einmal gezählt sein.
export function zaehlLuecken(gezaehlt, erwartet, bisFrage) {
  const soll = [...erwartet];
  for (let i = 1; i <= bisFrage; i++) soll.push('/vorschau/frage/' + i + '/');
  return soll.filter((p) => !gezaehlt.includes(p));
}
function pruefeZaehler(page, persona, erwartet, f) {
  const fehlt = zaehlLuecken(page.__gezaehlt, erwartet, f.amZiel ? FRAGEN_BIS_MAIL : 0);
  // Gemeldet ist nicht gesendet: eine CSP ohne den Zähler-Host blockt still. Jede Meldung
  // muss als Anfrage aus dem Browser gehen.
  const raus = page.__gezaehlt.anfragen || 0;
  if (raus < page.__gezaehlt.length) befund(persona, 'Zähler', 'rot', 'Zählaufrufe gehen nicht raus (CSP connect-src?)', page.__gezaehlt.length + ' gemeldet, ' + raus + ' gesendet');
  if (fehlt.length) befund(persona, 'Zähler', 'rot', 'Der Weg zur Vorschau wird nicht gezählt', 'fehlt: ' + fehlt.join(' ') + ' · gesehen: ' + (page.__gezaehlt.join(' ') || 'nichts'));
}

// Seit 16.10.2026 beginnt der Funnel mit „Passt du zu uns?“: erst der Check (Frage 1–6 + Zeit),
// dann das Ergebnis mit der Wahl. Die Besucherin nimmt Weg A (Vorschau); der empfohlene Weg muss
// nach dem Ergebnis ueber dem Falz liegen (16.10.: lag am Handy darunter).
async function wegA(page, persona) {
  // Auf dem Ergebnis-Schirm laufen erst die Pruefpunkte ein; die Wahl erscheint danach.
  if (await page.evaluate(() => document.querySelector('.q.on')?.dataset.step === '17')) {
    await page.waitForFunction(() => !document.querySelector('#passt-ergebnis')?.hidden, null, { timeout: 6000 }).catch(() => {});
    await page.evaluate(async () => { let alt = -1; for (let i = 0; i < 60 && alt !== scrollY; i++) { alt = scrollY; await new Promise((r) => setTimeout(r, 50)); } });
  }
  const wege = page.locator('button.weg:visible');
  if (!(await wege.count())) return false;
  const unten = await page.evaluate(() => { const e = document.querySelector('#passt-wege .ist-empf') || document.querySelector('button.weg'); return e ? e.getBoundingClientRect().bottom - innerHeight : 0; });
  if (persona && unten > 0) befund(persona, 'Funnel Ergebnis', 'rot', 'Der empfohlene Weg liegt nach dem Ergebnis unter dem Falz', Math.round(unten) + ' px darunter');
  await page.locator('button.weg[data-weg="a"]').click().catch(() => {});
  await uebergaengeFertig(page);
  return true;
}

// Funnel bis zum Mail-Feld, nie abschicken. Misst jeden Schritt am Schirm.
async function funnel(page, persona) {
  const schritte = [];
  for (let i = 0; i < 22; i++) {
    if (await page.locator('#f-mail').isVisible().catch(() => false)) break;
    await uebergaengeFertig(page);
    if (await wegA(page, persona)) continue;
    const stand = await page.evaluate(() => {
      const weiter = [...document.querySelectorAll('button.next')].find((b) => b.offsetParent && b.id !== 'btnSubmit');
      if (!weiter) return null;
      const schirm = weiter.closest('section, fieldset, .step, [data-step]') || document.body;
      const r = weiter.getBoundingClientRect();
      return { weiterUnten: Math.round(r.bottom), vh: innerHeight, frage: (schirm.querySelector('h1, h2, legend, label') || {}).textContent?.trim().slice(0, 50) || '' };
    });
    if (!stand) break;
    // Antworten wie eine echte Besucherin: Textfelder füllen, erste Wahl antippen.
    for (const [sel, wert] of [['#f-name', 'Simone Sim'], ['#f-handle', '@simone.sim'], ['#f-thema', 'Yoga für Einsteigerinnen']]) {
      const f = page.locator(sel);
      if (await f.isVisible().catch(() => false) && !(await f.inputValue())) await f.fill(wert);
    }
    const chip = page.locator('button.chip:visible').first();
    if (await chip.count()) await chip.click().catch(() => {});
    await uebergaengeFertig(page);
    // Der Funnel scrollt nach einer Antwort selbst weiter — erst messen, wenn er steht.
    await page.evaluate(async () => {
      let alt = -1;
      for (let i = 0; i < 90 && alt !== scrollY; i++) { alt = scrollY; await new Promise((r) => setTimeout(r, 50)); }
    });
    const nach = await page.evaluate(() => {
      const w = [...document.querySelectorAll('button.next')].find((b) => b.offsetParent && b.id !== 'btnSubmit');
      return w ? Math.round(w.getBoundingClientRect().bottom) : null;
    });
    schritte.push({ ...stand, nachWahl: nach });
    if (BILDER) await page.screenshot({ path: join(AUS, persona + '_funnel_' + (i + 1) + '.png') }).catch(() => {});
    // Textschritt: führt die Weiter-Taste der Handy-Tastatur weiter, muss niemand den Knopf suchen.
    const textFeld = page.locator('.q.on input[type=text]:visible').first();
    let perEnter = false;
    if (nach != null && nach > stand.vh && await textFeld.count()) {
      const vorher = await page.evaluate(() => document.querySelector('.q.on')?.dataset.step);
      await textFeld.press('Enter');
      await uebergaengeFertig(page);
      perEnter = vorher !== await page.evaluate(() => document.querySelector('.q.on')?.dataset.step);
      if (perEnter) { schritte.push({ ...stand, perEnter: true }); continue; }
    }
    if (nach != null && nach > stand.vh && !perEnter) befund(persona, 'Funnel ' + (i + 1), 'rot', '„Weiter" liegt nach der Antwort unter dem Falz' + (await textFeld.count() ? ', und die Eingabetaste führt nicht weiter' : ''), stand.frage + ' · Knopf endet bei ' + nach + ' px, Schirm ' + stand.vh);
    if (i === 2) {
      // Abbruch nie Verlust: Neuladen mitten im Funnel.
      const vorher = await page.locator('#f-name').inputValue().catch(() => '');
      await page.reload(); await ruhe(page);
      const nachher = await page.locator('#f-name').inputValue().catch(() => '');
      const weiterHinten = await page.evaluate(() => ![...document.querySelectorAll('#f-name')].some((f) => f.offsetParent));
      if (vorher && !nachher && !weiterHinten) befund(persona, 'Funnel ' + (i + 1), 'gelb', 'Neuladen mitten im Funnel löscht ihre Antworten', 'Name vorher „' + vorher + '", danach leer');
      // Nach dem Neuladen wieder vorne beginnen: Weg waehlen, dann durch die beantworteten Schritte.
      await wegA(page, null);
      const vorne = page.locator('button.next:visible').first();
      for (let j = 0; j < 4 && !(await page.locator('#f-mail').isVisible().catch(() => false)); j++) {
        if (await page.locator('#f-name').isVisible().catch(() => false) && !(await page.locator('#f-name').inputValue())) break;
        await vorne.click().catch(() => {});
      }
    }
    const weiter = page.locator('button.next:visible').filter({ hasNot: page.locator('#btnSubmit') }).first();
    if (!(await weiter.count())) break;
    const deaktiviert = await weiter.isDisabled().catch(() => false);
    if (deaktiviert) { befund(persona, 'Funnel ' + (i + 1), 'rot', '„Weiter" bleibt nach einer Antwort gesperrt', stand.frage); break; }
    await weiter.click({ timeout: 5000 }).catch(() => {});
    await ruhe(page);
  }
  const amZiel = await page.locator('#f-mail').isVisible().catch(() => false);
  if (!amZiel) befund(persona, 'Funnel', 'rot', 'Mail-Feld nie erreicht — Funnel hängt', schritte.map((s) => s.frage).join(' → '));
  return { schritte: schritte.length, amZiel };
}

const PERSONAS = [
  { id: 'insta-se', wer: 'Insta-Bio-Klick · iPhone SE (WebKit)', engine: 'webkit', geraet: devices['iPhone SE'],
    async lauf(p, w) {
      await besuche(p, w.id, '/links/', { handy: true, einstieg: true });
      const ziel = await klickeVorschau(p);
      if (!ziel) return befund(w.id, '/links/', 'rot', 'Kein Vorschau-Knopf auf der Bio-Link-Seite');
      if (FUNNEL !== 'https://start.social2scale.com/') { await p.goto(FUNNEL, { waitUntil: 'load' }); await ruhe(p); }
      const f = await funnel(p, w.id);
      pruefeZaehler(p, w.id, ['/links/', '/links/klick/gratis/', '/gratis/', '/vorschau/'], f);
      WEGE.push({ persona: w.id, klicks: 1, ...f });
    } },
  { id: 'funnel-mini', wer: 'Funnel direkt · iPhone 12 mini (WebKit)', engine: 'webkit', geraet: devices['iPhone 12 Mini'],
    async lauf(p, w) {
      await p.goto(FUNNEL, { waitUntil: 'load' }); await ruhe(p);
      const f = await funnel(p, w.id);
      pruefeZaehler(p, w.id, ['/vorschau/'], f);
      WEGE.push({ persona: w.id, ...f });
    } },
  { id: 'neugierig-15pro', wer: 'Startseite · iPhone 15 Pro (WebKit)', engine: 'webkit', geraet: devices['iPhone 15 Pro'],
    async lauf(p, w) {
      await besuche(p, w.id, '/', { handy: true, einstieg: true });
      const ziel = await klickeVorschau(p);
      WEGE.push({ persona: w.id, klicks: ziel ? 1 : null, landet: ziel });
      if (!ziel) befund(w.id, '/', 'rot', 'Vom Startseiten-Schirm kein Klick zur Vorschau');
    } },
  { id: 'google-kosten', wer: 'Google „was kostet" · Desktop (Chromium)', engine: 'chromium', geraet: { viewport: { width: 1440, height: 900 } },
    async lauf(p, w) {
      await besuche(p, w.id, '/wissen/was-kostet-social-media-betreuung/', { einstieg: true });
      const preis = await p.evaluate(() => /\d[\d.]*\s?(€|EUR|Euro)/.test(document.body.innerText));
      if (!preis) befund(w.id, '/wissen/was-kostet-…', 'gelb', 'Die Kosten-Seite nennt keinen Betrag in Euro');
      const ziel = await klickeVorschau(p);
      WEGE.push({ persona: w.id, klicks: ziel ? 1 : null });
    } },
  { id: 'preise', wer: 'Preisvergleich · Desktop 1024 (Firefox)', engine: 'firefox', geraet: { viewport: { width: 1024, height: 768 } },
    async lauf(p, w) {
      await besuche(p, w.id, '/', { einstieg: true });
      const nav = p.locator('a[href*="preise"]:visible').first();
      if (!(await nav.count())) return befund(w.id, '/', 'rot', 'Preise von der Startseite aus nicht erreichbar');
      await nav.click(); await ruhe(p);
      await besuche(p, w.id, '/preise/', { einstieg: true });
    } },
  // Seit 16.10.2026 lebt das Erstgespraech im Funnel (Weg B); /anfrage/ leitet nur noch weiter.
  { id: 'skeptisch', wer: 'Skeptikerin: Ergebnisse → Über uns → Ablauf → Knopf · iPhone 15 Pro', engine: 'webkit', geraet: devices['iPhone 15 Pro'],
    async lauf(p, w) {
      for (const s of ['/results/', '/about/', '/ablauf/']) await besuche(p, w.id, s, { handy: true });
      const knopf = p.locator('a[href="/gratis/"]:visible').first();
      if (!(await knopf.count())) return befund(w.id, '/ablauf/', 'rot', 'Kein sichtbarer Knopf in den Funnel');
      const n = await p.locator('a[href^="/anfrage/"]:visible').count();
      if (n) befund(w.id, '/ablauf/', 'rot', `${n} Knopf/Knöpfe führen noch an den Funnel vorbei zu /anfrage/`);
    } },
  { id: 'tastatur', wer: 'Nur Tastatur · Desktop (Chromium)', engine: 'chromium', geraet: { viewport: { width: 1280, height: 800 } },
    async lauf(p, w) {
      await p.goto(BASIS + '/', { waitUntil: 'load' }); await ruhe(p);
      let tabs = 0, erreicht = false;
      for (; tabs < 40 && !erreicht; tabs++) {
        await p.keyboard.press('Tab');
        const f = await p.evaluate((q) => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const s = getComputedStyle(el);
          const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
          const r = el.getBoundingClientRect();
          const mitte = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
          const verdeckt = r.bottom > 0 && r.top < innerHeight && mitte && !el.contains(mitte) && !mitte.contains(el);
          return { text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), ring, verdeckt, vorschau: new RegExp(q, 'i').test(el.getAttribute('href') || '') };
        }, VORSCHAU.source);
        if (!f) continue;
        if (!f.ring) befund(w.id, '/ Tab ' + (tabs + 1), 'rot', 'Fokus unsichtbar (WCAG 2.4.7)', f.text);
        if (f.verdeckt) befund(w.id, '/ Tab ' + (tabs + 1), 'rot', 'Fokus von etwas anderem verdeckt (WCAG 2.4.11)', f.text);
        if (f.vorschau) erreicht = true;
      }
      WEGE.push({ persona: w.id, tabsBisVorschau: erreicht ? tabs : null });
      if (!erreicht) befund(w.id, '/', 'rot', 'Vorschau-Knopf in 40 Tab-Schritten nicht erreicht');
    } },
  { id: 'langsam', wer: 'Altes Android, langsames Netz (Chromium, gedrosselt)', engine: 'chromium', geraet: devices['Moto G4'],
    async lauf(p, w) {
      const cdp = await p.context().newCDPSession(p);
      // „Slow 4G" wie Lighthouse: 150 ms RTT, 1,6 Mbit/s runter, CPU 4× langsamer.
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      for (const s of ['/', '/links/']) {
        const { m } = await besuche(p, w.id, s, { handy: true, einstieg: true, lcpWarten: true });
        WEGE.push({ persona: w.id, seite: s, lcp: m.lcp, lcpEl: m.lcpEl });
        if (m.lcp > LCP_MAX) befund(w.id, s, 'rot', 'Größtes Element erscheint zu spät (LCP ' + (m.lcp / 1000).toFixed(1) + ' s > 2,5 s, gedrosselt)', m.lcpEl);
      }
    } },
  { id: 'dunkel-ruhig', wer: 'Dunkelmodus + reduzierte Bewegung · iPhone 15 Pro', engine: 'webkit', geraet: { ...devices['iPhone 15 Pro'], colorScheme: 'dark', reducedMotion: 'reduce' },
    async lauf(p, w) {
      for (const s of ['/', '/preise/', '/gratis/']) {
        await p.goto(BASIS + s, { waitUntil: 'load' }); await ruhe(p);
        // Ohne Scrollen: bei reduzierter Bewegung muss sofort alles da sein.
        const leer = await p.evaluate(() => [...document.querySelectorAll('h1, h2, p, a.btn')].filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.top > innerHeight || r.height < 1) return false;
          let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
          return o < 0.5;
        }).map((el) => el.textContent.trim().slice(0, 30)));
        if (leer.length) befund(w.id, s, 'rot', 'Bei reduzierter Bewegung bleibt Text auf dem ersten Schirm ausgeblendet', leer.slice(0, 3).join(' | '));
        if (BILDER) await p.screenshot({ path: join(AUS, (w.id + s).replace(/[^a-z0-9]+/gi, '_') + '.png') });
      }
    } },
  { id: 'verirrt', wer: 'Alter Link ins Leere · iPhone SE', engine: 'webkit', geraet: devices['iPhone SE'],
    async lauf(p, w) {
      const { status, m } = await besuche(p, w.id, '/gibt-es-nicht-sim/', { handy: true, erwartet404: true });
      if (status !== 404) befund(w.id, '/gibt-es-nicht-sim/', 'gelb', 'Unbekannte Adresse antwortet nicht mit 404', 'HTTP ' + status);
      if (!m.vorschauLinks) befund(w.id, '404', 'rot', '404-Seite ohne Weg zur Vorschau');
    } },
  { id: 'alle-seiten', wer: 'Rundgang alle Seiten · iPhone SE + Desktop', engine: 'webkit', geraet: devices['iPhone SE'],
    async lauf(p, w) {
      const links = () => p.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map((a) => new URL(a.href, location.href))
        .filter((u) => u.host === location.host && !/\.(pdf|png|jpe?g|svg|xml|txt)$/i.test(u.pathname)).map((u) => u.pathname))]);
      // Zwei Ebenen: Startseite und alles, was von dort verlinkt ist (so kommen die /wissen/-Artikel dazu).
      const gesehen = new Set(['/', '/wissen/']);
      await p.goto(BASIS + '/', { waitUntil: 'load' });
      for (const s of await links()) gesehen.add(s);
      for (const s of [...gesehen]) { await p.goto(BASIS + s, { waitUntil: 'load' }).catch(() => {}); if (new URL(p.url()).host === new URL(BASIS).host) for (const x of await links()) gesehen.add(x); }
      const seiten = [...new Set([...gesehen, '/wissen/', '/impressum/', '/datenschutz/', '/for-you/', '/gratis/'])].sort();
      for (const s of seiten) await besuche(p, w.id, s, { handy: true, einstieg: /^\/(|links\/)$/.test(s) });
      WEGE.push({ persona: w.id, seiten: seiten.length });
    } },
];

// ── Selbsttest: jede Schwelle trifft, rot wird rot, sauber bleibt grün ──────────────
const ROT = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>t</title></head><body style="margin:0;font-size:13px">
  <div style="width:500px">zu breit</div><h1>A</h1><h1>B</h1>
  <p style="height:900px">${'Viel Text, der vor dem Knopf steht und die Besucherin erschlägt. '.repeat(30)}</p>
  <a href="https://start.social2scale.com/" style="display:inline-block;background:#0a7;padding:2px">x</a><a href="/y/" style="display:inline-block;padding:2px">y</a>
  <p style="opacity:0">Dieser Absatz ist lang genug, um als Lesetext zu gelten, aber unsichtbar.</p>
  <button style="position:fixed;right:0;top:300px;width:40px;height:40px">^</button>
  <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="10" height="10"></body></html>`;
// Ohne viewport-Meta (eigener Fixture: sonst rechnet der Browser mit 980 px und Falz/Quer messen Unsinn).
const ROT_OHNE_VIEWPORT = `<!doctype html><html lang="de"><head><title>t</title></head><body><h1>x</h1><a href="https://start.social2scale.com/">x</a></body></html>`;
const GRUEN = `<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width"><meta name="description" content="d"><title>t</title></head>
  <body style="margin:0;font-size:17px"><h1>Eine Überschrift</h1>
  <a href="https://start.social2scale.com/" style="display:inline-block;background:#0a7;padding:14px 20px;min-height:44px">Gratis-Vorschau starten</a>
  <p>Kurzer Lesetext, gut lesbar und vollständig sichtbar, mit einem <a href="/x/">Link im Text</a>.</p>
  <div style="margin-top:40px"><a href="/impressum/" style="font-size:14px;display:inline-block;min-height:44px;min-width:44px">Impressum</a></div>
  <button style="position:fixed;right:0;top:300px;width:40px;height:40px;opacity:0;pointer-events:none" aria-label="Nach oben"></button>
  <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" width="10" height="10"></body></html>`;

async function selbsttest() {
  const browser = await webkit.launch();
  const page = await browser.newPage({ ...devices['iPhone SE'] });
  const lauf = async (html) => { await page.setContent(html); return bewerte('/', await page.evaluate(messeImBrowser, CFG), { handy: true, einstieg: true }); };
  const r = [...(await lauf(ROT)), ...(await lauf(ROT_OHNE_VIEWPORT))], g = await lauf(GRUEN);
  const erwartet = ['quer', 'unter dem Falz', 'Viel Text', 'Trefferfläche unter', 'Lesetext unter', 'unsichtbar', 'alt-Attribut', 'Bild lädt nicht', 'Sprache', 'viewport', 'Hauptüberschrift', 'Trefferflächen zwischen'];
  let ok = true;
  for (const e of erwartet) {
    const da = r.some((x) => x.text.includes(e));
    console.log((da ? '🟢' : '🔴') + ' rot-Fixture meldet: ' + e);
    ok = ok && da;
  }
  // Zähler-Tor: Weiterleitung ohne Meldung muss rot werden, der volle Weg grün.
  const fragen = Array.from({ length: FRAGEN_BIS_MAIL }, (_, i) => '/vorschau/frage/' + (i + 1) + '/');
  const zRot = zaehlLuecken(['/links/', '/links/klick/gratis/', '/vorschau/', ...fragen], ['/links/', '/links/klick/gratis/', '/gratis/', '/vorschau/'], FRAGEN_BIS_MAIL);
  const zRot2 = zaehlLuecken(['/vorschau/', ...fragen.slice(0, -1)], ['/vorschau/'], FRAGEN_BIS_MAIL);
  const zGruen = zaehlLuecken(['/links/', '/links/klick/gratis/', '/gratis/', '/vorschau/', ...fragen], ['/links/', '/links/klick/gratis/', '/gratis/', '/vorschau/'], FRAGEN_BIS_MAIL);
  const zOk = zRot.join() === '/gratis/' && zRot2.length === 1 && !zGruen.length;
  console.log((zOk ? '🟢' : '🔴') + ' Zähler-Tor: fehlende Weiterleitung und fehlende letzte Frage rot, voller Weg grün');
  ok = ok && zOk;
  const versteckt = g.filter((x) => x.text.includes('Trefferflächen zwischen'));
  console.log((versteckt.length ? '🔴' : '🟢') + ' grün-Fixture: versteckter Knopf (pointer-events:none) zählt nicht als knapp' + (versteckt.length ? ': ' + versteckt[0].beleg : ''));
  ok = ok && !versteckt.length;
  // Englisch (1:1 seit 23.10.2026): EN-Seite ohne Weg in den Funnel und mit lang="de" rot, sauber gruen.
  const enLauf = async (html) => { await page.setContent(html); return bewerte('/en/', await page.evaluate(messeImBrowser, CFG), { handy: false, einstieg: false }); };
  const enRot = await enLauf(GRUEN.replace(/https:\/\/start\.social2scale\.com\//g, '/en/about/'));
  const enGruen = await enLauf(GRUEN.replace('lang="de"', 'lang="en"').replace('https://start.social2scale.com/', '/en/free/'));
  const enOk = enRot.some((x) => x.text.includes('Kein Weg zur Gratis-Vorschau')) && enRot.some((x) => x.text.includes('als Englisch'))
    && !enGruen.some((x) => x.stufe === 'rot');
  console.log((enOk ? '🟢' : '🔴') + ' Englisch: ohne Funnel-Weg und mit lang="de" rot, sauber grün' + (enOk ? '' : ': ' + [...enRot, ...enGruen].map((x) => x.text).join(' | ')));
  ok = ok && enOk;
  const sauber = g.filter((x) => x.stufe === 'rot');
  console.log((sauber.length ? '🔴' : '🟢') + ' grün-Fixture ohne Rot' + (sauber.length ? ': ' + sauber.map((x) => x.text).join(' | ') : ''));
  await browser.close();
  return ok && !sauber.length;
}

// ── Lauf ────────────────────────────────────────────────────────────────────────────
// Eigener Server für den lokalen Stand: nur 127.0.0.1, freier Port, endet mit dem Lauf.
// upgrade-insecure-requests fliegt in der Test-Route raus — WebKit hebt http sonst auf https
// und lädt kein CSS (kern.md); unbekannte Pfade bekommen die echte 404.html mit Status 404.
const TYPEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif',
  '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };
async function lokalerServer(wurzel) {
  const basis = resolve(wurzel);
  const s = createServer(async (anf, ant) => {
    let pfad = resolve(basis, '.' + decodeURIComponent(anf.url.split('?')[0]));
    if (!pfad.startsWith(basis)) { ant.writeHead(403); return ant.end(); }
    if (anf.url.split('?')[0].endsWith('/')) pfad = join(pfad, 'index.html');
    let status = 200, inhalt;
    try { inhalt = await readFile(pfad); } catch {
      try { inhalt = await readFile(join(pfad, 'index.html')); pfad = join(pfad, 'index.html'); } catch { status = 404; pfad = join(basis, '404.html'); inhalt = await readFile(pfad).catch(() => Buffer.from('weg')); }
    }
    if (pfad.endsWith('.html')) inhalt = Buffer.from(inhalt.toString().replace(/;?\s*upgrade-insecure-requests/g, ''));
    ant.writeHead(status, { 'Content-Type': TYPEN[extname(pfad)] || 'application/octet-stream' });
    ant.end(inhalt);
  });
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  return s;
}

async function main() {
  if (SELBSTTEST) process.exit((await selbsttest()) ? 0 : 1);
  let server = null;
  if (WURZEL) { server = await lokalerServer(WURZEL); BASIS = 'http://127.0.0.1:' + server.address().port; }
  mkdirSync(AUS, { recursive: true });
  // --nur=a,b: eine Liste. Ein unbekannter Name ist ein Abbruch, kein „0 Befunde" —
  // vorher lief bei --nur=a,b keine einzige Besucherin, und das Ergebnis war grün.
  const nur = NUR ? NUR.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const unbekannt = nur.filter((id) => !PERSONAS.some((x) => x.id === id));
  if (unbekannt.length) { console.error('🔴 Unbekannte Besucherin: ' + unbekannt.join(', ') + ' · bekannt: ' + PERSONAS.map((x) => x.id).join(', ')); process.exit(1); }
  for (const w of PERSONAS.filter((x) => !nur.length || nur.includes(x.id))) {
    const t0 = Date.now();
    // Navigiert die Seite mitten in einer Messung (Seitenwechsel, Weiterleitung), stirbt der
    // Messkontext — einmal neu, mit frischem Browser. Bricht er wieder ab, bleibt es rot.
    for (let versuch = 1; versuch <= 2; versuch++) {
      const vorher = BEFUNDE.length, wege = WEGE.length;
      const { browser, page } = await oeffne(w.engine, w.geraet);
      let fehler = null;
      try { await w.lauf(page, w); } catch (e) { fehler = e; }
      await browser.close();
      if (fehler && versuch === 1 && /Execution context was destroyed/.test(fehler.message)) { BEFUNDE.length = vorher; WEGE.length = wege; continue; }
      if (fehler) befund(w.id, '—', 'rot', 'Lauf abgebrochen', fehler.message.split('\n')[0]);
      break;
    }
    const meine = BEFUNDE.filter((b) => b.persona === w.id);
    const z = (s) => meine.filter((b) => b.stufe === s).length;
    console.log(`${z('rot') ? '🔴' : z('gelb') ? '🟡' : '🟢'} ${w.wer} — ${z('rot')} rot · ${z('gelb')} gelb · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  // Gleiche Befunde über Seiten hinweg zusammenfassen, damit 20 Seiten mit demselben Fehler EINE Zeile sind.
  const gruppen = new Map();
  for (const b of BEFUNDE) {
    const k = b.stufe + '|' + b.text;
    if (!gruppen.has(k)) gruppen.set(k, { ...b, wo: [] });
    gruppen.get(k).wo.push(b.persona + ' ' + b.wo + (b.beleg ? ' — ' + b.beleg : ''));
  }
  for (const stufe of ['rot', 'gelb']) {
    const liste = [...gruppen.values()].filter((g) => g.stufe === stufe);
    if (!liste.length) continue;
    console.log('\n' + (stufe === 'rot' ? '🔴 ROT' : '🟡 GELB'));
    for (const g of liste) {
      console.log(`  · ${g.text} (${g.wo.length}×)`);
      for (const x of g.wo.slice(0, 4)) console.log('      ' + x);
      if (g.wo.length > 4) console.log('      … und ' + (g.wo.length - 4) + ' weitere');
    }
  }
  console.log('\nWege:', JSON.stringify(WEGE));
  const datei = join(AUS, 'lauf-' + new Date().toISOString().slice(0, 16).replace(/:/g, '') + '.json');
  writeFileSync(datei, JSON.stringify({ basis: BASIS, befunde: BEFUNDE, wege: WEGE }, null, 1));
  const rot = BEFUNDE.filter((b) => b.stufe === 'rot').length;
  console.log(`\n${rot ? '🔴' : '🟢'} ${BEFUNDE.length} Befunde (${rot} rot) · ${datei}`);
  if (server) server.close();
  process.exit(rot ? 1 : 0);
}
main();
