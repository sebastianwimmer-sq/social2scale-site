/**
 * Post-Texte fuer den Free-Content.
 *
 * Der Fallback ist NICHT optional (Spec §9): sie hat gerade ihre Mail bestaetigt.
 * Faellt Claude aus, bekommt sie Texte aus ihren eigenen Angaben — generischer,
 * aber da. Eine kaputte Seite ist keine Option.
 *
 * Die HWG-Regeln sind aus dem erprobten STUDIO_SYSTEM portiert
 * (~/social2scale-clients/_portal/_worker.js:1919-1949) — der laeuft seit Wochen
 * fuer echte Kundinnen in HWG-Nischen. Bei Recht wird kopiert, nicht erfunden.
 */

const API = 'https://api.anthropic.com/v1/messages';
const MAX_TOKENS = 1200;

const SYSTEM =
  'Du bist Senior-Content-Stratege der Premium-Agentur social2scale. Du schreibst Instagram-Content ' +
  'in DER STIMME DER KUNDIN — deutsch, Du-Form, konkret, ohne Floskeln, ohne Marketing-Sprech.\n\n' +
  'HOOK fuers Cover (waehle das passendste Muster):\n' +
  '- Kontra-Intuition: „Dein Problem ist nicht zu wenig Disziplin. Es ist zu viel davon."\n' +
  '- Konkrete Zahl: „3 Saetze, die jedes schwierige Gespraech drehen."\n' +
  '- Offene Frage: „Warum bist du nach dem Urlaub mueder als davor?"\n' +
  'NICHT: „5 Tipps fuer mehr Selbstliebe" — generische Listicle-Hooks ohne Spannungsluecke sind verboten.\n\n' +
  'HWG & RECHTSSICHERHEIT (Pflicht, keine Ausnahmen):\n' +
  '- Keine Wirk-, Heil-, Erfolgs- oder Einkommensversprechen. Keine Diagnosen, kein Therapie-Ersatz.\n' +
  '- Verboten: „hilft gegen/bei …", „lindert …", „heilt …", „macht schmerzfrei", „damit verdienst du … EUR".\n' +
  '- Umformulieren statt versprechen: NICHT „hilft gegen Schlafprobleme" → SONDERN „mein Abendritual sieht so aus". ' +
  'NICHT „reduziert Stress" → SONDERN „was mir an stressigen Tagen guttut".\n' +
  '- Bei Wellness-/Gesundheits-Themen: ausschliesslich Ich-Erleben und Einladung zum Ausprobieren — nie objektive Wirkaussagen.\n\n' +
  'Wenn das Thema nicht seriös bewerbbar ist, antworte mit {"ablehnen":true}.\n\n' +
  'Antworte IMMER NUR mit validem JSON — ohne Markdown-Zaeune, ohne Erklaerung:\n' +
  '{"eyebrow":"…","head":"…","headAccent":"…","sub":"…","bio":"…","cells":["…" ×9]}\n' +
  '- eyebrow: 2-3 Woerter, Kicker ueber der Headline.\n' +
  '- head + headAccent: die Headline in ZWEI Teilen. headAccent wird farbig gesetzt und ist die Pointe.\n' +
  '- sub: ein Satz, max 90 Zeichen.\n' +
  '- bio: ihre Instagram-Bio-Zeile, max 40 Zeichen.\n' +
  '- cells: 9 kurze Post-Titel (je max 18 Zeichen) fuer ihr Feed-Raster.';

function clip(v, n) {
  return String(v ?? '').trim().slice(0, n);
}

/** Rein, kein Netz. Baut Texte aus IHREN Angaben. */
export function buildFallback(clean) {
  const branche = clip(clean?.branche, 60) || 'dein Thema';
  const ziel = clip(clean?.ziel, 80) || 'sichtbar werden';

  return {
    eyebrow: 'Dein Vorgeschmack',
    head: 'So könnte dein Feed',
    headAccent: 'aussehen.',
    sub: `${branche} — sichtbar, konsistent, nach dir.`.slice(0, 90),
    bio: branche.slice(0, 40),
    cells: [
      'Dein Thema', 'Warum jetzt?', '3 Schritte',
      'Zitat', 'Vorher / Nachher', 'Deine Frage?',
      'Einblick', 'Über dich', ziel.slice(0, 18),
    ],
  };
}

/** true, wenn Claudes Antwort die Form hat, auf die die Templates bauen. */
function formStimmt(c) {
  if (!c || typeof c !== 'object') return false;
  for (const k of ['eyebrow', 'head', 'headAccent', 'sub', 'bio']) {
    if (typeof c[k] !== 'string' || !c[k].trim()) return false;
  }
  // Genau 9 Zellen UND jede gefuellt: neun leere Strings passieren sonst die Pruefung
  // und rendern ein blankes 3x3-Grid — dann lieber der Fallback aus ihren Angaben.
  return Array.isArray(c.cells) && c.cells.length === 9 && c.cells.every((z) => typeof z === 'string' && z.trim());
}

/**
 * Versucht Claude, faellt sonst auf buildFallback zurueck. WIRFT NIE.
 * @returns {Promise<object>} Copy
 */
export async function generateCopy(env, clean) {
  if (!env?.ANTHROPIC_API_KEY) {
    console.error('[copy] ANTHROPIC_API_KEY fehlt — nutze Fallback-Texte');
    return buildFallback(clean);
  }

  const user =
    `Kundin: ${clip(clean?.name, 60)} (@${clip(clean?.handle, 40)})\n` +
    `Thema: ${clip(clean?.branche, 200)}\n` +
    `Ziel: ${clip(clean?.ziel, 400)}\n` +
    `Stimmung: ${clip(clean?.stimmung, 40)}`;

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!res.ok) {
      console.error('[copy] Claude antwortete mit', res.status, await res.text());
      return buildFallback(clean);
    }

    const data = await res.json();
    const text = (data?.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed = JSON.parse(text);

    if (parsed?.ablehnen) {
      console.error('[copy] Claude hat das Thema abgelehnt — nutze neutrale Fallback-Texte');
      return buildFallback(clean);
    }
    if (!formStimmt(parsed)) {
      console.error('[copy] Claudes Antwort hat die falsche Form — nutze Fallback-Texte');
      return buildFallback(clean);
    }
    return parsed;
  } catch (err) {
    console.error('[copy] Texte konnten nicht generiert werden:', err);
    return buildFallback(clean);
  }
}
