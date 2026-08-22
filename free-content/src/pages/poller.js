/**
 * Reine Poller-Entscheidung fuer den Build-Screen (`/r/:token`, Plan 3 Task 5).
 * Eigenes Modul statt Teil von result.js: result.js selbst bleibt <400 Zeilen
 * (Markup + CSS + Client-Skript sind schon gross genug), und `nextAction` ist
 * so isoliert unit-testbar, ganz ohne Browser/DOM.
 *
 * result.js re-exportiert `nextAction` (der Test importiert weiterhin aus
 * result.js, wie im Plan vorgesehen) UND bettet `nextAction.toString()` in das
 * an den Browser ausgelieferte PAGE_SCRIPT ein — der Client fuehrt so exakt
 * dieselbe, hier getestete Funktion aus, keine zweite driftende Kopie.
 */

import { BUILDING_TIMEOUT_MINUTES } from '../constants.js';

export const BUILDING_TIMEOUT_MS = BUILDING_TIMEOUT_MINUTES * 60 * 1000;

/**
 * Konsumiert exakt den Vertrag von buildStatus() (generate.js): `state` ist
 * immer 'pending'|'confirmed'|'building'|'ready'|'failed'|'not_found'; bei
 * 'failed' kommt zusaetzlich `grund` ('moderation'|'render'|'') aus
 * fail_reason (migrate-v14.sql) mit.
 *
 * Moderation vs. Render ist keine Kosmetik: eine Ablehnung ist eine
 * Entscheidung ueber das THEMA — ein naiver Retry reicht dasselbe Thema erneut
 * ein und bekommt denselben Reject (eine Schleife, keine Loesung). Ein
 * Render-Fehler ist transient — hier IST Retry die richtige Handlung.
 *
 * `elapsedMs` (optional, Default 0) ist die seit dem ersten Poll vergangene
 * Zeit — laeuft der Poller ueber BUILDING_TIMEOUT_MS, OHNE dass die Zeile je
 * einen Endzustand erreicht hat, ist das kein Fehler, aber auch kein
 * Endlos-Spinner: sie bekommt das Ergebnis dann per Mail (Spec §9).
 *
 * @param {{state: string, grund?: string}} status
 * @param {number} [elapsedMs]
 * @returns {{kind: 'reveal'}|{kind: 'poll'}|{kind: 'error', reason: string, retry: boolean}}
 */
export function nextAction(status, elapsedMs = 0) {
  const state = status?.state;
  if (state === 'ready') return { kind: 'reveal' };
  if (state === 'failed') {
    const reason = status.grund === 'moderation' ? 'moderation' : 'render';
    return { kind: 'error', reason, retry: reason !== 'moderation' };
  }
  if (state === 'not_found' || state === 'not_confirmed') {
    return { kind: 'error', reason: 'not_found', retry: false };
  }
  if (elapsedMs >= BUILDING_TIMEOUT_MS) {
    return { kind: 'error', reason: 'timeout', retry: false };
  }
  return { kind: 'poll' };
}
