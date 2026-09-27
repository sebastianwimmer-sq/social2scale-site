#!/usr/bin/env node
/**
 * Rendert data/bewertungen.json in results/index.html — zwischen den Markern
 * <!-- BEWERTUNGEN --> und <!-- /BEWERTUNGEN -->.
 *
 * Aufruf: node scripts/bewertungen-bauen.mjs
 *
 * DREI REGELN, DIE HIER FEST VERDRAHTET SIND
 * ──────────────────────────────────────────
 * 1) KEINE BEWERTUNGEN → KEIN ABSCHNITT.
 *    Ein leerer Kasten auf einer Seite, die "Prüf uns" heisst, ist schlimmer
 *    als gar nichts — und er faellt niemandem auf, weil die Seite weiter mit
 *    200 antwortet. Bei null Bewertungen bleibt zwischen den Markern nichts
 *    als ein Kommentar.
 *
 * 2) KEIN SCHEMA-MARKUP.
 *    Kein aggregateRating, kein review. Google schliesst Bewertungen ueber das
 *    eigene Unternehmen auf der eigenen Seite aus ("self-serving") — egal ob
 *    per eigenem Markup oder per eingebettetem Fremd-Widget. Ein Verstoss kann
 *    eine manuelle Massnahme ausloesen, die Rich Snippets der GANZEN Domain
 *    entfernt. Wer das hier spaeter "nachruestet", macht es kaputt.
 *    Beleg: ~/kit-build/bewertungen-evidenz.json (Regel google-self-serving)
 *
 * 3) ALLES WIRD MASKIERT.
 *    Bewertungstexte sind Fremdtext. Sie gehen ungeprueft in eine HTML-Datei,
 *    die danach ausgeliefert wird — ohne Maskierung waere das eine offene
 *    XSS-Tuer, und die CSP faengt injiziertes Markup nicht vollstaendig ab.
 *
 * NACHLAUF: Dieses Skript aendert results/index.html. Danach MUSS
 * `node scripts/csp-haerten.mjs` laufen — sonst passt der sha256-Hash der
 * Inline-Skripte der Seite nicht mehr und die Seite blockiert sich selbst.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const QUELLE = resolve(WURZEL, 'data/bewertungen.json');
const SEITE = resolve(WURZEL, 'results/index.html');

/** Googles Bedingungen begrenzen das Zwischenspeichern auf 30 Tage. */
const MAX_ALTER_TAGE = 30;

const MARKER = 'BEWERTUNGEN';

export function maskieren(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Ganze Sterne fuer die Anzeige, der Rest als aria-Text fuer Screenreader. */
function sterne(n) {
  const voll = Math.round(Number(n) || 0);
  const glyphen = Array.from({ length: 5 }, (_, i) =>
    `<span class="bw-st${i < voll ? ' on' : ''}" aria-hidden="true"></span>`
  ).join('');
  return `<span class="bw-sterne" role="img" aria-label="${voll} von 5 Sternen">${glyphen}</span>`;
}

function karte(b) {
  return `        <figure class="bw-karte">
          ${sterne(b.sterne)}
          <blockquote>${maskieren(b.text)}</blockquote>
          <figcaption>
            <span class="bw-av" aria-hidden="true">${maskieren(b.initialen)}</span>
            <span class="bw-wer"><b>${maskieren(b.autor)}</b>${b.wann ? `<span>${maskieren(b.wann)}</span>` : ''}</span>
          </figcaption>
        </figure>`;
}

/**
 * Baut den Abschnitt. Gibt bei null Bewertungen bewusst nur einen Kommentar
 * zurueck — der Marker bleibt stehen, damit der naechste Lauf ihn wiederfindet.
 */
export function abschnittBauen(daten) {
  const liste = Array.isArray(daten?.bewertungen) ? daten.bewertungen : [];
  if (liste.length === 0) {
    return `    <!-- Noch keine Bewertungen. Abschnitt bleibt bewusst leer:
         ein leerer Kasten ist schlechter als keiner. -->`;
  }

  const profil = daten.profil_url
    ? `<a class="bw-quelle" href="${maskieren(daten.profil_url)}" rel="noopener noreferrer nofollow" target="_blank">Alle Bewertungen auf Google ansehen →</a>`
    : '';

  // Attribution ist Pflicht, nicht Deko: die Bewertungen stammen von Google
  // und muessen als solche erkennbar sein, mit Weg zur Quelle.
  // Kurz halten: die Kopfspalte ist auf 32ch begrenzt, "… Bewertungen auf
  // Google · Schnitt 4,8" brach dort mitten im Wert um. "auf Google" traegt
  // ohnehin der Link darunter — die Attribution geht dadurch nicht verloren.
  const zaehler = daten.anzahl_gesamt
    ? `<p class="bw-zahl">${maskieren(daten.anzahl_gesamt)} Google-Bewertung${daten.anzahl_gesamt === 1 ? '' : 'en'}${daten.schnitt ? ` · Schnitt ${maskieren(String(daten.schnitt).replace('.', ','))}` : ''}</p>`
    : '';

  return `    <!-- Erzeugt von scripts/bewertungen-bauen.mjs — nicht von Hand aendern.
         KEIN aggregateRating/review-Markup: self-serving, siehe Skriptkopf. -->
    <section class="rs-blk" id="stimmen" aria-labelledby="bw-h"><div class="wrap reveal">
      <div class="rs-blk-head">
        <p class="rs-rh"><b>№ 06</b> — Nicht von uns</p>
        <h2 id="bw-h">Was <em>Kundinnen</em> schreiben, wenn wir nicht mitlesen.</h2>
        ${zaehler}
      </div>
      <div class="bw-gitter">
${liste.map(karte).join('\n')}
      </div>
      ${profil}
    </div></section>`;
}

/** Wirft, wenn der Stand aelter ist als Googles Cache-Grenze. */
export function alterPruefen(geholtAm, jetzt = new Date()) {
  if (!geholtAm) throw new Error('data/bewertungen.json hat kein Feld "geholt_am".');
  const dann = new Date(geholtAm);
  if (Number.isNaN(dann.getTime())) throw new Error(`"geholt_am" ist kein Datum: ${geholtAm}`);
  const tage = Math.floor((jetzt - dann) / 86_400_000);
  if (tage > MAX_ALTER_TAGE) {
    throw new Error(
      `Der Bewertungsstand ist ${tage} Tage alt. Googles Bedingungen erlauben ` +
      `hoechstens ${MAX_ALTER_TAGE} Tage Zwischenspeicherung.\n` +
      `    → erst "node scripts/bewertungen-holen.mjs", dann erneut bauen.`
    );
  }
  return tage;
}

export function einsetzen(html, abschnitt) {
  const muster = new RegExp(`(<!-- ${MARKER} -->)[\\s\\S]*?(<!-- /${MARKER} -->)`);
  if (!muster.test(html)) {
    throw new Error(
      `Marker <!-- ${MARKER} --> … <!-- /${MARKER} --> fehlt in results/index.html.`
    );
  }
  return html.replace(muster, `$1\n${abschnitt}\n    $2`);
}

/**
 * Zaehlt die Rubriken (№ 01, № 02 …) in Dokumentreihenfolge neu durch.
 * Der Bewertungs-Abschnitt ist mal da und mal nicht — mit fester Nummer
 * sprang die Seite ohne Bewertungen von № 05 auf № 07 (gefunden 27.09.2026).
 */
export function nummerieren(html) {
  let n = 0;
  return html.replace(/(class="rs-rh"><b>№ )\d+(<\/b>)/g, (_, vor, nach) =>
    `${vor}${String(++n).padStart(2, '0')}${nach}`
  );
}

// ── Ausfuehrung ──────────────────────────────────────────────────────────────
// Nur wenn direkt aufgerufen — beim Import aus dem Test passiert nichts.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(QUELLE)) {
    console.error(
      `\n  ✗ data/bewertungen.json fehlt.\n` +
      `    → GOOGLE_PLACES_KEY=… GOOGLE_PLACE_ID=… node scripts/bewertungen-holen.mjs\n`
    );
    process.exit(1);
  }

  const daten = JSON.parse(readFileSync(QUELLE, 'utf8'));
  const anzahl = daten.bewertungen?.length ?? 0;

  // Das Alter zaehlt nur, wenn ueberhaupt etwas angezeigt wird.
  if (anzahl > 0) {
    try {
      alterPruefen(daten.geholt_am);
    } catch (fehler) {
      console.error(`\n  ✗ ${fehler.message}\n`);
      process.exit(1);
    }
  }

  const neu = nummerieren(einsetzen(readFileSync(SEITE, 'utf8'), abschnittBauen(daten)));
  writeFileSync(SEITE, neu);

  console.log(
    anzahl === 0
      ? `\n  ○ Keine Bewertungen — Abschnitt bleibt weg (so gewollt).\n`
      : `\n  ✓ ${anzahl} Bewertung(en) in results/index.html gesetzt.\n` +
        `\n  PFLICHT danach: node scripts/csp-haerten.mjs\n`
  );
}
