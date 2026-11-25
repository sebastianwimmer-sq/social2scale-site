// Kein eigener Preis auf der Website (Sebi 25.11.2026: „steht gar nix auf der website hoffe ich“, „soll alles individuell bleiben“).
// Geprüft wird das Ausgelieferte (HTML samt Quelltext-Daten, llms.txt), nicht der Generator. Scale Week darf den Wert des Geschenks
// nennen, bis sie am 01.12.2026 ausgebaut wird (Ticket 544). Fremde Vergleichspreise und der eigene Zeitrechner sind erlaubt.
//   node scripts/preise-check.mjs [--selbsttest]
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const EIGENE = /(?:446[.,]25|1[.,]?297[.,]10|749[.,]70)/g;                 // unsere Paketpreise in jeder Schreibweise
const BEI_UNS = /(?:bei (?:uns|social2scale)|at social2scale|with us)[^.<]{0,90}?(?:\d[\d.,]*\s?(?:€|Euro)|€\s?\d)/gi;
const ERLAUBT = [/^(?:en\/)?scale-week\//, /^(?:en\/)?news\/scale-week\//];
const SW = /[^<]{0,0}<(?:p|span|div|li)[^>]*class="[^"]*\bsw-[^"]*"[\s\S]{0,700}?<\/(?:p|div|li)>|Scale Week[\s\S]{0,240}/g; // Scale-Week-Hinweis auf anderen Seiten
export function funde(pfad, t) {
  if (ERLAUBT.some((r) => r.test(pfad))) return [];
  const ohne = /^(?:en\/)?(?:leistungen|services)\//.test(pfad) ? t.replace(SW, " ") : t;
  return [...ohne.matchAll(EIGENE), ...ohne.matchAll(BEI_UNS)].map((m) => ohne.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20).replace(/\s+/g, " "));
}
if (process.argv.includes("--selbsttest")) {
  const f = [], ok = (n, b) => b || f.push(n);
  ok("Preis rot", funde("index.html", "ab 446,25 € einmalig").length === 1);
  ok("englisch rot", funde("en/index.html", "from €1,297.10").length === 1);
  ok("bei uns rot", funde("wissen/x/index.html", "Bei social2scale kostet das 900 Euro").length === 1);
  ok("Vergleich grün", funde("wissen/x/index.html", "Freelancer 150 bis 3.000 €, Agenturen 500 bis 5.000 €").length === 0);
  ok("Rechner grün", funde("leistungen/index.html", "deine Stunde 120 € … 1.200 € im Monat").length === 0);
  ok("Scale Week grün", funde("scale-week/index.html", "sonst 1.297,10 €").length === 0);
  ok("Scale-Week-Hinweis auf Leistungen grün", funde("leistungen/index.html", "<p class=\"sw-x\">In der Scale Week ohne Aufpreis, sonst 1.297,10 €.</p>").length === 0);
  ok("nackter Preis auf Leistungen rot", funde("leistungen/index.html", "<p>Paket 06 kostet 1.297,10 €</p>").length === 1);
  console.log("preise-check Selbsttest:", f.length ? "ROT: " + f.join(", ") : "grün"); process.exit(f.length ? 1 : 0);
}
const liste = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.html", "llms*.txt"], { encoding: "utf8" }).split("\n").filter(Boolean);
let n = 0;
for (const p of liste) for (const x of funde(p, readFileSync(p, "utf8"))) { n++; console.log("🔴 " + p + ": …" + x + "…"); }
console.log(n ? n + " Preisangabe(n)" : "preise-check: " + liste.length + " Dateien, kein eigener Preis");
process.exit(n || !liste.length ? 1 : 0);
