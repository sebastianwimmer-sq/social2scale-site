/** Alle Schwellen/Grenzen zentral — keine Magic Numbers im Code verteilt. */

export const TOKEN_TTL_HOURS = 24;
export const PENDING_TTL_DAYS = 30;
export const RESEND_MAX_PER_HOUR = 3;
export const MIN_ELAPSED_MS = 1500;
export const RATE_LIMIT_PER_IP_PER_HOUR = 5;
export const RATE_LIMIT_GLOBAL_PER_HOUR = 300;
/** Aufbewahrung von free_intake_log — nur fuers Aufraeumen, nicht fuers Zaehlen. */
export const RATE_LIMIT_LOG_RETENTION_HOURS = 24;

/**
 * Mindest-Kontrast ihrer Wunschfarbe gegen den Grund der jeweiligen Welt.
 * 3:1 = WCAG AA fuer grosse Schrift/Grafik — der Akzent traegt nur die
 * Headline-Pointe und den Kicker, beide gross. Reicht die Farbe nicht,
 * behaelt die Welt ihren eigenen Akzent.
 */
export const ACCENT_MIN_CONTRAST = 3;

export const FIELD_LIMITS = {
  name: 120,
  email: 160,
  handle: 60,
  branche: 200,
  ziel: 2000,
  stimmung: 40,
  farbe: 40,
  stand: 60,
  source: 40,
};

/**
 * Browser Rendering hat eine Grenze fuer gleichzeitige Sessions. Bei Andrang
 * scheitert der erste Versuch und der zweite klappt — ohne Retry verliert sie
 * ihre Bilder, weil zufaellig jemand anders gleichzeitig da war (Spec §9, §11).
 */
export const RENDER_VERSUCHE = 3;
export const RENDER_BACKOFF_MS = 1500;

/**
 * Dasselbe Argument fuer die Copy: ein einzelner Blip (Netz weg, 529 overloaded)
 * hat sie bisher ihren kompletten personalisierten Text gekostet — sie bekam
 * still generische Fallback-Copy bei ihrem einen Versuch. Zwei Versuche, kurzer
 * Backoff: sie wartet auf dem Build-Screen, die Wall-Zeit zaehlt.
 */
export const COPY_VERSUCHE = 2;
export const COPY_BACKOFF_MS = 600;

/**
 * Wiedervorlage nach einem fertigen Free-Content-Lead. Zwei Tage, weil sie ihre
 * Vorschau meist nicht sofort ansieht (die erste echte Interessentin bestaetigte
 * ihre Mail erst nach 15 Stunden). Frueher nachfassen heisst nachfassen, bevor
 * sie ueberhaupt geschaut hat.
 */
export const FOLLOWUP_TAGE = 2;

/**
 * Spec §9 Sackgasse: ein hart gekillter Worker (CPU-Limit/OOM) zwischen dem
 * atomaren Claim (status='building') und markiereFehler laesst eine Zeile fuer
 * immer bei 'building' haengen — nie retried, kein Alarm. Claude + 8 Renders
 * dauern 20-40s; 15 Minuten liegen weit jenseits jedes legitimen Baus, eine
 * 'building'-Zeile aelter als das ist mit an Sicherheit grenzender
 * Wahrscheinlichkeit tot (leads.js sweepStaleBuilding).
 */
export const BUILDING_TIMEOUT_MINUTES = 15;

/**
 * Foto-Upload (Wizard-Step "Zeig dich"): Gates gegen "Ressource da,
 * Auslieferung leer". Min-Groesse sortiert kaputte Winzbilder aus, Max-Groesse
 * haelt die data-URL der Render-Seite im Rahmen. FOTO_MAX_CHARS deckelt das
 * Payload-Feld in validate.js VOR dem Dekodieren (Base64 ~ 4/3 der Bytes).
 */
export const AVATAR_MIN_BYTES = 2048;
export const AVATAR_MAX_BYTES = 2_000_000;
export const FOTO_MAX_CHARS = 2_800_000;

/**
 * Kuratierte Markenfarben fuer den Wizard-Step "Markenfarbe". JEDE muss auf
 * ALLEN Welten-Papieren >= ACCENT_MIN_CONTRAST tragen (palette.test.js
 * erzwingt das) — eine Wahl, die ihr Bild zerstoeren koennte, bieten wir gar
 * nicht erst an. Hex klein, wie derivePalettes sie zurueckgibt.
 */
export const FARB_CHIPS = [
  { hex: '#c2410c', name: 'Terracotta' },
  { hex: '#b45309', name: 'Ocker' },
  { hex: '#2f6f5e', name: 'Tannengrün' },
  { hex: '#2563eb', name: 'Ozeanblau' },
  { hex: '#7c3aed', name: 'Violett' },
  { hex: '#be185d', name: 'Beere' },
];

/**
 * Groesster sinnvoller Request-Body von /api/free-content: Textfelder (~4 KB)
 * + foto-data-URL (FOTO_MAX_CHARS ~2.8 MB) + JSON-Overhead. Alles darueber
 * wird VOR request.json() abgewiesen — sonst parsen wir Megabytes, nur um sie
 * danach in validate.js abzulehnen (Security-Review 07.08., MEDIUM).
 */
export const BODY_MAX_BYTES = 3_500_000;

/**
 * Watchdog um renderAll: ein haengender CDP-Call (Screenshot/Fonts) WIRFT nie —
 * der Retry kann dann nie feuern und der Lead steht ewig auf 'building'
 * (live passiert 10.08., Bucket hing nach 1 Frame). Normaler 21-Frame-Lauf
 * ~10-40s; 120s ist grosszuegig, aber endlich.
 */
export const RENDER_TIMEOUT_MS = 120_000;
