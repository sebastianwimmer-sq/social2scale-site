// Reiner Durchreicher: alles (Pfad, Methode, Body, Header) geht 1:1 an den
// Funnel-Worker. Der ist host-agnostisch geroutet (pathname-basiert) — die
// Antworten kommen unveraendert zurueck.
export default {
  async fetch(request, env) {
    return env.FUNNEL.fetch(request);
  },
};
