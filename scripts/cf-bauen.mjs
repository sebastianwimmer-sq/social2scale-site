// Was wirklich ausgeliefert wird, als eigener Ordner für Cloudflare Pages (25.11.2026: Quelltext soll nicht mehr öffentlich liegen).
// Erlaubnisliste: nur Dateitypen und Wurzelordner, die eine Besucherin braucht. Alles andere bleibt draußen, Neues fällt auf.
//   node scripts/cf-bauen.mjs <ausgabe> [--selbsttest]
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
const ORDNER = new Set([".well-known", "ablauf", "about", "anfrage", "assets", "danke", "data", "datenschutz", "en", "fonts", "for-you", "gratis", "impressum", "leistungen", "links", "news", "onboarding", "preise", "results", "scale-week", "szenen", "wissen"]);
const TYP = /\.(?:html|css|js|json|svg|png|jpe?g|webp|avif|ico|woff2?|mp4|webm|mp3|txt|xml|webmanifest|vtt|pdf)$/i;
const NIE_WURZEL = new Set(["package.json", "playwright.config.mjs", "CNAME", "_config.yml", ".gitignore"]);
export function darf(p) {
  const [w, ...rest] = p.split("/");
  if (!rest.length) return w === "_headers" || w === "_redirects" || (!NIE_WURZEL.has(w) && TYP.test(w));
  return ORDNER.has(w) && TYP.test(p) && !/(?:^|\/)(?:HERKUNFT|README|CLAUDE)/i.test(p);
}
if (process.argv.includes("--selbsttest")) {
  const f = [], ok = (n, b) => b || f.push(n);
  for (const p of ["index.html", "en/index.html", ".well-known/security.txt", "assets/a.webp", "_headers", "llms.txt", "s2s.js"]) ok(p + " muss rein", darf(p));
  for (const p of ["docs/PRODUCT.md", "scripts/x.mjs", "lib/shell.mjs", "free-content/src/index.js", "workers/a.js", "package.json", "CNAME", "_config.yml", "tests/a.js", ".github/workflows/x.yml", "start-proxy/public/_worker.js", "film/HERKUNFT.md", "neuerordner/x.html"]) ok(p + " darf nicht rein", !darf(p));
  console.log("cf-bauen Selbsttest:", f.length ? "ROT: " + f.join(", ") : "grün"); process.exit(f.length ? 1 : 0);
}
const ziel = process.argv[2];
if (!ziel) { console.error("Ausgabeordner fehlt"); process.exit(2); }
const aus = resolve(ziel);
if (aus === resolve(".") || !/cf-aus/.test(aus)) { console.error("Ausgabe nur in einen Ordner, der cf-aus heißt"); process.exit(2); }
rmSync(aus, { recursive: true, force: true });
const alle = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean), rein = alle.filter(darf);
for (const p of rein) { mkdirSync(dirname(join(aus, p)), { recursive: true }); cpSync(p, join(aus, p)); }
// Die pages.dev-Adresse ist eine Kopie: nie in Suchmaschinen.
const h = existsSync("_headers") ? readFileSync("_headers", "utf8") : "";
// no-transform: Cloudflare verändert nichts an den Seiten (25.11.2026: Mail-Adressen im Impressum wurden verschleiert, ein Skript kam dazu).
writeFileSync(join(aus, "_headers"), h.replace(/\s*$/, "\n") + "\n/*\n  Cache-Control: public, max-age=0, must-revalidate, no-transform\n" + "\nhttps://:projekt.pages.dev/*\n  X-Robots-Tag: noindex\nhttps://:version.:projekt.pages.dev/*\n  X-Robots-Tag: noindex\n");
console.log("cf-bauen: " + rein.length + " Dateien, " + (alle.length - rein.length) + " bleiben privat");
