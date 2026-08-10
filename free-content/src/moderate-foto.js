/**
 * Bildmoderation fuers hochgeladene Profilfoto — Schicht gegen den
 * Unterschieb-Vektor (fremde Mail + boeses Bild, Security-Review 07.08.,
 * Entscheid 10.08.: Claude-Vision-Pruefung VOR dem Render).
 *
 * FAIL-OPEN by design: ein API-Blip (529, Timeout, fehlender Key) darf einer
 * legitimen Kundin nicht ihr Foto kosten — der Rueckweg bleibt die
 * Founder-Mail je fertigem Feed plus der Eskalations-Knopf im Reveal.
 * Ein abgelehntes Foto rendert NICHT (Initial-Fallback) und alarmiert die
 * Founder; die Kundin sieht keinen Fehler (ihr Feed kommt, nur ohne Foto).
 *
 * Modell: Haiku (guenstig, Vision-faehig) — bewusst getrennt von env.AI_MODEL
 * (Copy laeuft auf Sonnet), via env.MODERATION_MODEL uebersteuerbar.
 */

const API = 'https://api.anthropic.com/v1/messages';
const MODELL_STANDARD = 'claude-haiku-4-5-20251001';

const FOTO_TOOL = {
  name: 'bewerte_foto',
  description: 'Bewertet, ob ein hochgeladenes Profilfoto fuer eine oeffentliche Instagram-Vorschau unbedenklich ist.',
  input_schema: {
    type: 'object',
    properties: {
      ablehnen: { type: 'boolean', description: 'true NUR bei klaren Verstoessen' },
      grund: { type: 'string', description: 'kurzes Stichwort, z. B. nacktheit/gewalt/hass/belaestigung' },
    },
    required: ['ablehnen'],
  },
};

const ANWEISUNG =
  'Pruefe dieses von einer Nutzerin hochgeladene Profilfoto fuer eine Instagram-Vorschau. ' +
  'ablehnen=true NUR bei klaren Verstoessen: Nacktheit/sexualisierte Darstellung, Gewalt/Blut, ' +
  'Hass-Symbole, offensichtliche Belaestigung/Verhoehnung einer abgebildeten Person, illegale Inhalte. ' +
  'Normale Portraits, Selfies, Logos, Tiere, Landschaften, Produktfotos: ablehnen=false. Im Zweifel: false.';

/**
 * @param {object} env ANTHROPIC_API_KEY (+ optional MODERATION_MODEL)
 * @param {string} fotoDataUrl data:image/...;base64,...
 * @param {typeof fetch} [fetchImpl] injizierbar fuer Tests
 * @returns {Promise<{ok: boolean, grund?: string, ungeprueft?: boolean}>} WIRFT NIE
 */
export async function pruefeFoto(env, fotoDataUrl, fetchImpl = fetch) {
  if (!env?.ANTHROPIC_API_KEY) return { ok: true, ungeprueft: true };
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(String(fotoDataUrl ?? ''));
  if (!m) return { ok: true, ungeprueft: true };

  try {
    const res = await fetchImpl(API, {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.MODERATION_MODEL || MODELL_STANDARD,
        max_tokens: 200,
        tools: [FOTO_TOOL],
        tool_choice: { type: 'tool', name: FOTO_TOOL.name },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
            { type: 'text', text: ANWEISUNG },
          ],
        }],
      }),
    });
    if (!res.ok) {
      console.error('[moderate-foto] Claude antwortete', res.status, '— fail-open');
      return { ok: true, ungeprueft: true };
    }
    const daten = await res.json();
    const tool = (daten.content ?? []).find((c) => c.type === 'tool_use' && c.name === FOTO_TOOL.name);
    if (!tool || typeof tool.input?.ablehnen !== 'boolean') {
      console.error('[moderate-foto] Antwort ohne verwertbares Urteil — fail-open');
      return { ok: true, ungeprueft: true };
    }
    if (tool.input.ablehnen) {
      return { ok: false, grund: String(tool.input.grund || 'verstoss').slice(0, 40) };
    }
    return { ok: true };
  } catch (err) {
    console.error('[moderate-foto] Pruefung fehlgeschlagen — fail-open:', err);
    return { ok: true, ungeprueft: true };
  }
}
