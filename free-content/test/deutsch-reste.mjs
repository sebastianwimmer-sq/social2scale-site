// Tor-Helfer: findet deutschen Text auf einer englischen Flaeche (Funnel /en/, Ergebnisseite, Mails,
// Bilder). Sebi 23.10.2026: „immer beides 1/1“ — eine vergessene Stelle bleibt sonst still deutsch.
const DEUTSCH = /[äöüßÄÖÜ]|\b(der|die|das|und|nicht|ist|du|dein|deine|deinen|deiner|bitte|noch|mit|für|von|zu|wird|kurz|nochmal|Frage|Schritt|Gespräch|Vorschau|Ziel|Danke|Schön|Weiter|Zurück|wir|uns|ihr|euch|Datenschutz|Startseite|Impressum|Fertig|Farbwelt|Beiträge|Gefolgt|Folgen|Nachricht|Teilen|Kopiert|gerade|entsteht|Einblick|Zitat|erstellt)\b/;

/** Sichtbare Texte (Markup + Attribute) und Text-Literale im Skript, ohne Kommentare und console-Meldungen. */
export function deutscheReste(html, intern = new Set()) {
  const ohneStil = html.replace(/<style>[\s\S]*?<\/style>/g, '');
  const skript = [...ohneStil.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n')
    .replace(/\/\/[^\n]*/g, '').replace(/console\.error\([^)]*\)/g, '');
  const markup = ohneStil.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const texte = [...markup.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim());
  const attrs = [...markup.matchAll(/(?:aria-label|placeholder|alt|title|content)="([^"]*)"/g)].map((m) => m[1]);
  const lits = [...skript.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  return [...new Set([...texte, ...attrs, ...lits])].filter((s) => s && !intern.has(s) && DEUTSCH.test(s));
}
