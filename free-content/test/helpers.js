/**
 * Test-Helfer. Bewusst eine eigene Datei: splitSchema wurde sonst in jeder
 * Test-Datei kopiert.
 */

/**
 * Zerlegt das Schema in einzeln ausfuehrbare Statements.
 * Kommentarzeilen MUESSEN vor dem Whitespace-Collapse raus — sonst frisst ein
 * einzeiliger `--`-Kommentar das gesamte folgende Statement und D1 lehnt es ab.
 * (Und: KEIN node:fs — der Test laeuft in workerd, readFileSync ist dort gestubbt.)
 */
export function splitSchema(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Setzt die genannten Tabellen frisch aus dem Schema auf. */
export async function resetTables(db, schemaSql, tables) {
  for (const t of tables) await db.exec(`DROP TABLE IF EXISTS ${t}`);
  for (const stmt of splitSchema(schemaSql)) await db.exec(stmt);
}
