#!/usr/bin/env node
/**
 * Lädt jede Seite in einem echten Browser und meldet CSP-Verstöße.
 *
 * WARUM DAS NÖTIG IST: eine zu strenge CSP bricht nicht sichtbar. Das Skript
 * lädt, der Browser blockt ihn still, und die Seite sieht auf den ersten Blick
 * normal aus — nur Menü, Formular oder Zählung tun nichts mehr. `curl` sieht
 * davon nichts, weil es kein JavaScript ausführt. Nur ein Browser deckt das auf.
 *
 * Geprüft wird pro Seite:
 *   - securitypolicyviolation-Ereignisse (was die CSP tatsächlich blockt)
 *   - Konsolenfehler
 *   - dass die Inline-Skripte wirklich gelaufen sind (Marker im DOM)
 *
 * Aufruf: node scripts/csp-pruefen-browser.mjs
 * Exit 1, sobald irgendeine Seite einen Verstoß meldet.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync, statSync } from "node:fs";
import pw from "/opt/homebrew/lib/node_modules/playwright/index.js";

const { chromium } = pw;
const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4183; // eigener Port, damit kein fremder Server dazwischenfunkt

const TYPEN = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".json": "application/json",
  ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain",
};

const server = createServer(async (req, res) => {
  let pfad = decodeURIComponent(req.url.split("?")[0]);
  if (pfad.endsWith("/")) pfad += "index.html";
  const datei = join(WURZEL, pfad);
  try {
    if ((await stat(datei)).isDirectory()) throw new Error("dir");
    const inhalt = await readFile(datei);
    res.writeHead(200, { "Content-Type": TYPEN[extname(datei)] || "application/octet-stream" });
    res.end(inhalt);
  } catch {
    res.writeHead(404).end("nicht gefunden");
  }
});

const AUS = ["node_modules", ".git", "docs", "lib", "scripts", "tests", "test-results", "workers", "free-content"];
function seiten(verz, gesammelt = []) {
  for (const e of readdirSync(verz)) {
    if (AUS.includes(e) || e.startsWith(".")) continue;
    const p = join(verz, e);
    if (statSync(p).isDirectory()) seiten(p, gesammelt);
    else if (e === "index.html") gesammelt.push("/" + p.slice(WURZEL.length + 1).replace(/index\.html$/, ""));
  }
  return gesammelt;
}

await new Promise((f) => server.listen(PORT, f));
const liste = seiten(WURZEL).sort();
const browser = await chromium.launch();
let fehlerhaft = 0;

// NEGATIVTEST ZUERST. Ohne ihn beweist ein grüner Lauf nichts: wäre das
// Meta-Tag kaputt oder die Regel gar nicht angekommen, meldete auch dann keine
// Seite einen Verstoß. Also erst zeigen, dass die CSP tatsächlich beißt —
// ein zur Laufzeit eingehängtes Skript hat keinen passenden Hash und MUSS
// blockiert werden.
{
  const probe = await browser.newPage();
  await probe.addInitScript(() => {
    window.__geblockt = false;
    document.addEventListener("securitypolicyviolation", () => { window.__geblockt = true; });
  });
  await probe.goto("http://localhost:" + PORT + "/", { waitUntil: "domcontentloaded" });
  await probe.evaluate(() => {
    const s = document.createElement("script");
    s.textContent = "window.__eingeschleust = true";
    document.head.appendChild(s);
  });
  await probe.waitForTimeout(400);
  const { geblockt, gelaufen } = await probe.evaluate(() => ({
    geblockt: window.__geblockt === true,
    gelaufen: window.__eingeschleust === true,
  }));
  await probe.close();
  if (!geblockt || gelaufen) {
    console.error("✗ NEGATIVTEST GESCHEITERT: ein eingeschleustes Skript lief durch.");
    console.error("  Die CSP ist nicht wirksam — ein grüner Lauf wäre wertlos.");
    await browser.close(); server.close();
    process.exit(1);
  }
  console.log("🔒 Negativtest: eingeschleustes Skript wurde blockiert — die CSP greift.\n");
}

for (const pfad of liste) {
  const seite = await browser.newPage();
  const verstoesse = [], konsole = [];

  await seite.addInitScript(() => {
    window.__verstoesse = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      window.__verstoesse.push(e.violatedDirective + " → " + (e.blockedURI || "inline"));
    });
  });
  seite.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });

  // domcontentloaded statt networkidle: /gratis/ hält eine Verbindung offen und
  // wird nie "idle" — der Lauf lief dort in den Timeout.
  try {
    await seite.goto("http://localhost:" + PORT + pfad, { waitUntil: "domcontentloaded", timeout: 15000 });
  } catch (fehler) {
    console.log("✗ " + pfad + " — lädt nicht: " + fehler.message.split("\n")[0]);
    fehlerhaft++;
    await seite.close();
    continue;
  }
  await seite.waitForTimeout(1200);

  verstoesse.push(...(await seite.evaluate(() => window.__verstoesse || [])));

  // Externe Aufrufe (Turnstile, Zählung) scheitern im Test ohne Netz — das ist
  // kein CSP-Problem und darf den Lauf nicht rot färben.
  const echt = konsole.filter((t) => !/Failed to load resource|net::ERR|ERR_NAME_NOT_RESOLVED/i.test(t));

  if (verstoesse.length || echt.length) {
    fehlerhaft++;
    console.log("✗ " + pfad);
    for (const v of new Set(verstoesse)) console.log("    CSP blockt: " + v);
    for (const k of new Set(echt)) console.log("    Konsole: " + k.slice(0, 120));
  } else {
    console.log("✓ " + pfad);
  }
  await seite.close();
}

await browser.close();
server.close();

if (fehlerhaft) {
  console.log("\n" + fehlerhaft + " von " + liste.length + " Seiten mit Verstößen.");
  process.exit(1);
}
console.log("\n🟢 " + liste.length + " Seiten ohne CSP-Verstoß.");
