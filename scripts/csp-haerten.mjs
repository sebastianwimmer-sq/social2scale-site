#!/usr/bin/env node
/**
 * Härtet die Auslieferungs-Regeln jeder Seite — so weit, wie es auf GitHub
 * Pages überhaupt geht.
 *
 * WARUM ES DIESEN SCHRITT GIBT
 * ────────────────────────────
 * social2scale.com liegt auf GitHub Pages. Die Plattform kann prinzipiell keine
 * eigenen Antwort-Header setzen (nachgeprüft am 20.08.2026: die Antwort enthält
 * nicht einen einzigen Sicherheits-Header, nicht einmal HSTS). Alles, was hier
 * an Schutz möglich ist, muss deshalb IN der Seite stehen.
 *
 * Die CSP stand vorher an drei Stellen von Hand: in den Hauptseiten direkt im
 * HTML, in build-wissen.mjs und in build-danke-studio.mjs. Drei Quellen driften
 * auseinander — die Wissens-Seiten hatten am 20.08. deshalb gar keine. Ab jetzt
 * ist DIESES Skript die einzige Quelle: es läuft nach jedem Bau und schreibt
 * die Regel überall neu.
 *
 * WAS ES BESSER MACHT ALS DIE ALTE REGEL
 * ──────────────────────────────────────
 *   default-src  'self' https:  →  'self'      kein Blankoscheck mehr auf jeden
 *                                              HTTPS-Host
 *   script-src   'unsafe-inline' →  sha256-…   jedes Inline-Skript einzeln
 *                                              freigegeben. Eingeschleustes
 *                                              Skript hat keinen passenden Hash
 *                                              und läuft nicht.
 *   object-src   (fehlte)        →  'none'     keine Flash-/Plugin-Einbettung
 *   frame-src    (fehlte)        →  eng        nur Turnstile, sonst nichts
 *   form-action  'self' https:   →  eng        Formulardaten können nicht auf
 *                                              einen fremden Server umgeleitet
 *                                              werden
 *
 * `style-src` behält 'unsafe-inline': die Seiten nutzen 57 style="…"-Attribute,
 * und die sind per Hash nicht abbildbar. Style-Injektion ist deutlich weniger
 * gefährlich als Skript-Injektion — der große Hebel ist script-src.
 *
 * WAS AUF GITHUB PAGES NICHT GEHT (ehrlich benannt)
 * ────────────────────────────────────────────────
 *   X-Content-Type-Options, HSTS, Permissions-Policy — es gibt kein
 *   Meta-Äquivalent. Nur per echtem Header, also nur hinter Cloudflare.
 *   frame-ancestors — Browser ignorieren die Direktive in einem Meta-Tag
 *   grundsätzlich. Ersatz: der Rahmenschutz unten, ein winziges Skript, das die
 *   Seite aus einem fremden Rahmen heraussetzt. Kein vollwertiger Ersatz (ein
 *   Angreifer mit sandbox-Attribut kann es unterbinden), aber deutlich besser
 *   als nichts.
 *   Referrer-Policy — geht als <meta name="referrer">, wird hier gesetzt.
 *
 * Aufruf: node scripts/csp-haerten.mjs [--pruefen]
 *   --pruefen  ändert nichts, meldet nur Abweichungen (Exit 1) — für das Gate
 *              vor dem Deploy.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const NUR_PRUEFEN = process.argv.includes("--pruefen");

// Was Jekyll nicht ausliefert, braucht auch keine Regel (siehe _config.yml).
// free-content/ enthält Test-Artefakte und node_modules und ist nicht erreichbar.
const AUSGESCHLOSSEN = [
  "node_modules", ".git", "docs", "lib", "scripts", "tests",
  "test-results", "workers", "free-content",
];

// Turnstile lädt sein Skript von challenges.cloudflare.com, holt die eigentliche
// Prüfung aber von einer WECHSELNDEN Subdomain (beobachtet: hagen.challenges…).
// Nur den exakten Host freizugeben lässt das Widget still leer bleiben — genau
// das war am 20.08. kurzzeitig live. Beide Formen nötig.
const TURNSTILE = "https://challenges.cloudflare.com";
const TURNSTILE_SUB = "https://*.challenges.cloudflare.com";
const FORMULAR_ZIEL = "https://api.web3forms.com";
const ZAEHLUNG = "https://closing.social2scale.com";

// Der Rahmenschutz. Ersetzt frame-ancestors, das im Meta-Tag wirkungslos ist.
// Bewusst als erstes Skript im Kopf, damit er greift, bevor etwas sichtbar wird.
const RAHMENSCHUTZ =
  "if(self!==top){document.documentElement.style.display='none';" +
  "top.location=self.location.href}";

function htmlDateien(verzeichnis, gesammelt = []) {
  for (const eintrag of readdirSync(verzeichnis)) {
    if (AUSGESCHLOSSEN.includes(eintrag) || eintrag.startsWith(".")) continue;
    const pfad = join(verzeichnis, eintrag);
    if (statSync(pfad).isDirectory()) htmlDateien(pfad, gesammelt);
    else if (eintrag.endsWith(".html")) gesammelt.push(pfad);
  }
  return gesammelt;
}

function hash(inhalt) {
  return "'sha256-" + createHash("sha256").update(inhalt, "utf8").digest("base64") + "'";
}

// Alle Inline-Skripte einer Seite. Skripte mit src= sind keine Inline-Skripte
// und brauchen keinen Hash — die deckt 'self' bzw. der Turnstile-Host ab.
function inlineSkripte(html) {
  const treffer = [];
  const muster = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = muster.exec(html)) !== null) {
    const typ = /\stype="([^"]*)"/i.exec(m[1]);
    // JSON-LD ist kein ausführbares Skript — der Browser prüft dafür keinen Hash.
    if (typ && !/javascript|module/i.test(typ[1])) continue;
    treffer.push(m[2]);
  }
  return treffer;
}

function cspFuer(html) {
  const brauchtTurnstile = html.includes(TURNSTILE);
  const brauchtFormular = html.includes(FORMULAR_ZIEL);

  const hashes = inlineSkripte(html).map(hash);
  // Der Rahmenschutz wird gleich eingesetzt und muss selbst freigegeben sein.
  hashes.push(hash(RAHMENSCHUTZ));

  const skript = ["'self'", ...new Set(hashes)];
  if (brauchtTurnstile) skript.push(TURNSTILE, TURNSTILE_SUB);

  const verbinden = ["'self'", ZAEHLUNG];
  if (brauchtTurnstile) verbinden.push(TURNSTILE, TURNSTILE_SUB);

  const formular = ["'self'"];
  if (brauchtFormular) formular.push(FORMULAR_ZIEL);

  return [
    "default-src 'self'",
    "script-src " + skript.join(" "),
    // 57 style="…"-Attribute in den Seiten — per Hash nicht abbildbar.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src " + verbinden.join(" "),
    // Turnstile rendert sich in einen eigenen Rahmen; sonst nichts einbetten.
    "frame-src " + (brauchtTurnstile ? TURNSTILE + " " + TURNSTILE_SUB : "'none'"),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action " + formular.join(" "),
    "upgrade-insecure-requests",
  ].join("; ");
}

const ANFANG = "<!-- SICHERHEIT:AUTO -->";
const ENDE = "<!-- /SICHERHEIT:AUTO -->";

function block(csp) {
  return [
    ANFANG,
    '<meta http-equiv="Content-Security-Policy" content="' + csp + '">',
    '<meta name="referrer" content="strict-origin-when-cross-origin">',
    "<script>" + RAHMENSCHUTZ + "</script>",
    ENDE,
  ].join("\n");
}

function haerte(html) {
  // Die alte, von Hand gepflegte CSP entfernen — sonst gilt die strengere von
  // beiden und die Seite bricht auf schwer auffindbare Weise.
  let neu = html.replace(
    /[ \t]*<meta http-equiv="Content-Security-Policy"[^>]*>\n?/gi, ""
  );
  neu = neu.replace(/[ \t]*<meta name="referrer"[^>]*>\n?/gi, "");
  neu = neu.replace(new RegExp(ANFANG + "[\\s\\S]*?" + ENDE + "\\n?", "g"), "");

  // Hashes NACH dem Entfernen berechnen, sonst zählt der alte Block mit.
  const csp = cspFuer(neu);

  // Hinter <meta charset> einsetzen, nicht davor: die Zeichensatz-Angabe muss
  // in den ersten 1024 Bytes stehen, und der Block ist mit allen Hashes
  // mehrere hundert Zeichen lang. Er würde das Charset sonst hinausschieben.
  // Der Rahmenschutz läuft trotzdem vor allem Sichtbaren — er steht im Kopf.
  const charset = /<meta charset="[^"]*">/i;
  if (charset.test(neu)) return neu.replace(charset, (m) => m + "\n" + block(csp));

  const kopf = /<head>/i;
  if (!kopf.test(neu)) throw new Error("weder <meta charset> noch <head> gefunden");
  return neu.replace(kopf, "<head>\n" + block(csp));
}

const dateien = htmlDateien(WURZEL);
let geaendert = 0, abweichungen = [];

for (const datei of dateien) {
  const alt = readFileSync(datei, "utf8");
  let neu;
  try {
    neu = haerte(alt);
  } catch (fehler) {
    console.error("✗ " + relative(WURZEL, datei) + ": " + fehler.message);
    process.exitCode = 1;
    continue;
  }
  if (neu === alt) continue;
  abweichungen.push(relative(WURZEL, datei));
  if (!NUR_PRUEFEN) {
    writeFileSync(datei, neu, "utf8");
    geaendert++;
  }
}

if (NUR_PRUEFEN) {
  if (abweichungen.length) {
    console.error("✗ Sicherheits-Block fehlt oder ist veraltet in:");
    for (const d of abweichungen) console.error("    " + d);
    console.error("  → node scripts/csp-haerten.mjs");
    process.exit(1);
  }
  console.log("🟢 " + dateien.length + " Seiten: Sicherheits-Block aktuell.");
} else {
  console.log(geaendert + " von " + dateien.length + " Seiten gehärtet.");
}
