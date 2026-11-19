// Der Zeitplan läuft seit 19.11.2026 jede Minute (Takt für den KI-Assistenten, siehe index.js › scheduled).
// Die Aufgaben dieses Workers sind auf fünf Minuten ausgelegt und laufen weiter nur zu jeder fünften Minute.
// Ohne Zeitangabe (Test, Aufruf von Hand) laufen sie.
export function istFuenfterTakt(event) {
  const t = event && Number(event.scheduledTime);
  return !Number.isFinite(t) || new Date(t).getUTCMinutes() % 5 === 0;
}
