#!/usr/bin/env node
// Prüft spende.js ohne Browser: DE zeigt den CRM-Wortlaut, EN die englische Umschreibung, ein Eigenname bleibt,
// eine unbekannte deutsche Umschreibung erscheint auf EN gar nicht. Exit 1 bei Abweichung. (11.11.2026)
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUELLE = fs.readFileSync(path.join(WURZEL, "spende.js"), "utf8");

async function lauf(lang, empfaenger) {
  const felder = ["empfaenger", "empfaengersatz", "naechste", "stand"].map((k) => ({ k, textContent: "", getAttribute: () => k }));
  const sec = { querySelector: () => null, addEventListener() {} };
  let eingesetzt = false;
  const vorlage = {
    getAttribute: () => "/api/spenden-zaehler",
    content: { cloneNode: () => ({ querySelector: () => sec, querySelectorAll: () => felder, firstElementChild: sec }) },
    parentNode: { insertBefore: () => { eingesetzt = true; } },
  };
  const daten = { success: true, data: { betrag_eur: 10, karten: 2, empfaenger, stand: "2026-11-11" } };
  const ctx = {
    document: { documentElement: { lang }, getElementById: (id) => (id === "karte-vorlage" ? vorlage : null) },
    location: { hostname: "localhost" }, window: {}, Date, String, isFinite, isNaN,
    fetch: async () => ({ ok: true, json: async () => daten }),
  };
  ctx.window.fetch = ctx.fetch;
  vm.runInNewContext(QUELLE, ctx);
  await new Promise((r) => setTimeout(r, 20));
  return { eingesetzt, text: Object.fromEntries(felder.map((f) => [f.k, f.textContent])) };
}

const faelle = [
  ["de", "ein Sorgentelefon für Kinder und Jugendliche", true, "ein Sorgentelefon für Kinder und Jugendliche"],
  ["en", "ein Sorgentelefon für Kinder und Jugendliche", true, "a helpline for children and teenagers"],
  ["en", "Nummer gegen Kummer e.V.", true, "Nummer gegen Kummer e.V."],
  ["en", "eine Tafel in Burghausen", false, ""],
];
let rot = 0;
for (const [lang, ein, soll, wort] of faelle) {
  const r = await lauf(lang, ein);
  const ok = r.eingesetzt === soll && (!soll || r.text.empfaenger === wort);
  if (!ok) rot++;
  console.log(`${ok ? "ok " : "ROT"} ${lang} · „${ein}“ → ${r.eingesetzt ? `„${r.text.empfaenger}“` : "nicht gezeigt"}`);
}
console.log(rot ? `SPENDE ROT · ${rot} Fälle` : "SPENDE GRÜN");
process.exit(rot ? 1 : 0);
