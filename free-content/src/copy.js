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
// Deutlich hoeher als frueher (1200): die Antwort traegt jetzt 3 Posts × 3 Slides
// PLUS 3 fertige Captions — sonst schneidet Claude das JSON mittendrin ab und der
// Parse scheitert (→ unnoetiger Fallback fuer eine eigentlich gute Antwort).
const MAX_TOKENS = 4000;

const SYSTEM =
  'Du bist Senior-Content-Stratege der Premium-Agentur social2scale. Du schreibst Instagram-Content ' +
  'in DER STIMME DER KUNDIN — deutsch, Du-Form, konkret, ohne Floskeln, ohne Marketing-Sprech.\n\n' +
  'HOOK fuer die erste Slide jedes Posts (waehle das passendste Muster):\n' +
  '- Kontra-Intuition: „Dein Problem ist nicht zu wenig Disziplin. Es ist zu viel davon."\n' +
  '- Konkrete Zahl: „3 Saetze, die jedes schwierige Gespraech drehen."\n' +
  '- Offene Frage: „Warum bist du nach dem Urlaub mueder als davor?"\n' +
  'NICHT: „5 Tipps fuer mehr Selbstliebe" — generische Listicle-Hooks ohne Spannungsluecke sind verboten.\n\n' +
  'HWG & RECHTSSICHERHEIT (Pflicht, keine Ausnahmen — gilt fuer JEDE Slide UND jede Caption):\n' +
  '- Keine Wirk-, Heil-, Erfolgs- oder Einkommensversprechen. Keine Diagnosen, kein Therapie-Ersatz.\n' +
  '- Verboten: „hilft gegen/bei …", „lindert …", „heilt …", „macht schmerzfrei", „damit verdienst du … EUR".\n' +
  '- Umformulieren statt versprechen: NICHT „hilft gegen Schlafprobleme" → SONDERN „mein Abendritual sieht so aus". ' +
  'NICHT „reduziert Stress" → SONDERN „was mir an stressigen Tagen guttut".\n' +
  '- Bei Wellness-/Gesundheits-Themen: ausschliesslich Ich-Erleben und Einladung zum Ausprobieren — nie objektive Wirkaussagen.\n\n' +
  'Wenn das Thema nicht seriös bewerbbar ist, antworte mit {"ablehnen":true}.\n\n' +
  'Antworte IMMER NUR mit validem JSON — ohne Markdown-Zaeune, ohne Erklaerung:\n' +
  '{"eyebrow":"…","head":"…","headAccent":"…","sub":"…","bio":"…","cells":["…" ×9],' +
  '"posts":[{"slides":[{"kind":"hook","eyebrow":"…","head":"…","headAccent":"…","sub":"…"},' +
  '{"kind":"value","eyebrow":"…","head":"…","headAccent":"…","sub":"…"},' +
  '{"kind":"cta","eyebrow":"…","head":"…","headAccent":"…","sub":"…"}],"caption":"…"} ×3]}\n' +
  '- eyebrow: 2-3 Woerter, Kicker ueber der Headline.\n' +
  '- head + headAccent: die Headline in ZWEI Teilen. headAccent wird farbig gesetzt und ist die Pointe.\n' +
  '- sub: ein Satz, max 90 Zeichen.\n' +
  '- bio: ihre Instagram-Bio-Zeile, max 40 Zeichen.\n' +
  '- cells: 9 kurze Post-Titel (je max 18 Zeichen) fuer ihr Feed-Raster.\n' +
  '- posts: GENAU 3 Karussell-Posts. Jeder Post hat GENAU 3 Slides in DIESER Reihenfolge:\n' +
  '  1) kind "hook": Spannung/Neugier (grosses Statement wie beim Cover, s. HOOK oben).\n' +
  '  2) kind "value": DER konkrete Nutzen/Kern — knapp, punktbetont (eine grosse Kernaussage).\n' +
  '  3) kind "cta": ruhiger Abschluss, sanfte Handlung (z. B. „Folge @' + '{handle} fuer mehr" / „Speicher dir das").\n' +
  '  Jede Slide traegt eyebrow (2-3 Woerter), head + headAccent (Headline in zwei Teilen, ' +
  'headAccent = farbige Pointe) und sub (ein Satz, max 90 Zeichen). Alle Felder gefuellt, nie leer.\n' +
  '- caption: pro Post EINE fertige, sofort postbare Instagram-Bildunterschrift (inhaltlich zu den 3 Slides ' +
  'des Posts passend). Aufbau: starke erste Zeile (Hook) → 2-4 kurze Zeilen Mehrwert im Ich-/Du-Ton → eine ' +
  'sanfte Handlungsaufforderung → am Ende 4-6 relevante Hashtags. 400-700 Zeichen. Echte Umbrueche mit \\n.';

function clip(v, n) {
  return String(v ?? '').trim().slice(0, n);
}

/**
 * Tool-Schema fuer strukturierte Ausgabe. Statt Claude freies JSON schreiben zu
 * lassen (das bei der grossen Multi-Slide-Struktur regelmaessig ungueltig wird —
 * Markdown-Zaeune, rohe Zeilenumbrueche in Caption-Strings → JSON.parse scheitert →
 * generischer Fallback), zwingt tool_use Claude in dieses Schema; die API liefert
 * ein bereits valides Objekt.
 */
const CONTENT_TOOL = {
  name: 'deliver_content',
  description: 'Liefert den fertigen, HWG-konformen Instagram-Content im geforderten Schema.',
  input_schema: {
    type: 'object',
    properties: {
      ablehnen: { type: 'boolean', description: 'true, wenn das Thema nicht seriös bewerbbar ist' },
      eyebrow: { type: 'string' },
      head: { type: 'string' },
      headAccent: { type: 'string' },
      sub: { type: 'string' },
      bio: { type: 'string' },
      cells: { type: 'array', items: { type: 'string' }, minItems: 9, maxItems: 9 },
      posts: {
        type: 'array', minItems: 3, maxItems: 3,
        items: {
          type: 'object',
          properties: {
            slides: {
              type: 'array', minItems: 3, maxItems: 3,
              items: {
                type: 'object',
                properties: {
                  kind: { type: 'string', enum: ['hook', 'value', 'cta'] },
                  eyebrow: { type: 'string' },
                  head: { type: 'string' },
                  headAccent: { type: 'string' },
                  sub: { type: 'string' },
                },
                required: ['kind', 'eyebrow', 'head', 'headAccent', 'sub'],
              },
            },
            caption: { type: 'string' },
          },
          required: ['slides', 'caption'],
        },
      },
    },
    required: ['eyebrow', 'head', 'headAccent', 'sub', 'bio', 'cells', 'posts'],
  },
};

/**
 * Rein, kein Netz. Baut Texte OHNE ihre freien Angaben (§5a HWG).
 *
 * Claudes zweistufige HWG-Absicherung ist moderate.js (Schicht 1, grob) PLUS der
 * Compliance-System-Prompt (Schicht 2, fein) — aber Schicht 2 existiert nur im
 * Claude-Pfad. Faellt Claude aus, hat nur noch die grobe Wortliste geprueft, und
 * die faengt bewusst nur Offensichtliches ("der Prompt faengt den Rest"). branche
 * und ziel sind Freitext und damit claim-traechtig ("Ernährung, die deinen
 * Reizdarm beruhigt" hat kein Trigger-Wort). Sie duerfen deshalb NIE verbatim in
 * sichtbare Fallback-Copy — nur name/handle sind personenbezogen, nicht
 * claim-foermig, und bleiben sicher.
 */
export function buildFallback(clean) {
  const name = clip(clean?.name, 40);
  const gruss = name ? `, ${name}` : '';

  return {
    eyebrow: 'Dein Vorgeschmack',
    head: 'So könnte dein Feed',
    headAccent: 'aussehen.',
    sub: `Dein Thema, dein Stil — bereit zum Posten${gruss}.`.slice(0, 90),
    bio: 'Dein Feed — sichtbar, konsistent.'.slice(0, 40),
    cells: [
      'Dein Thema', 'Warum jetzt?', '3 Schritte',
      'Zitat', 'Vorher / Nachher', 'Deine Frage?',
      'Einblick', 'Über dich', 'Nächster Schritt',
    ],
    // Generisch + HWG-sicher (keine claim-traechtige branche verbatim). Kommt nur
    // zum Zug, wenn Claude ausfaellt — echte, personalisierte Posts macht der
    // Content-Stratege-Prompt oben. Jeder Post: 3 Slides (hook→value→cta) + Caption.
    posts: [
      {
        slides: [
          { kind: 'hook', eyebrow: 'Kleiner Anfang', head: 'Der erste Schritt', headAccent: 'ist der schwerste.', sub: 'Und trotzdem der wichtigste.' },
          { kind: 'value', eyebrow: 'Warum das zählt', head: 'Kleine Schritte,', headAccent: 'die bleiben.', sub: 'Nicht perfekt — nur ehrlich und dran.' },
          { kind: 'cta', eyebrow: 'Bleib dran', head: 'Speicher dir das', headAccent: 'für später.', sub: 'Damit du beim nächsten Mal direkt loslegst.' },
        ],
        caption: 'Manchmal ist der erste Schritt einfach: anfangen.\n\nGenau darum geht es hier — kleine, ehrliche Schritte, die bleiben.\n\nSpeicher dir das, wenn du dranbleiben willst. 💚\n\n#content #socialmedia #instagram #dranbleiben',
      },
      {
        slides: [
          { kind: 'hook', eyebrow: 'Echt statt glatt', head: 'Kein Hochglanz —', headAccent: 'echte Einblicke.', sub: 'So sieht es wirklich aus.' },
          { kind: 'value', eyebrow: 'Was dahintersteckt', head: 'Dinge, die ich', headAccent: 'selbst ausprobiere.', sub: 'In meinen Worten, aus meinem Alltag.' },
          { kind: 'cta', eyebrow: 'Deine Runde', head: 'Wie machst', headAccent: 'du das?', sub: 'Schreib es mir in die Kommentare.' },
        ],
        caption: 'Kein Hochglanz — echte Einblicke.\n\nDinge, die ich selbst ausprobiere, in meinen Worten.\n\nWie machst du das? Schreib es in die Kommentare. 👇\n\n#einblick #community #instagram #ehrlich',
      },
      {
        slides: [
          { kind: 'hook', eyebrow: 'Weiter geht es', head: 'Der nächste Post', headAccent: 'ist schon in Arbeit.', sub: 'Es kommt noch mehr.' },
          { kind: 'value', eyebrow: 'Für dich', head: 'Regelmäßig neue', headAccent: 'Impulse.', sub: 'Ohne Druck, in deinem Tempo.' },
          { kind: 'cta', eyebrow: 'Bleib dabei', head: 'Folg mir', headAccent: 'für mehr.', sub: 'Dann verpasst du nichts.' },
        ],
        caption: 'Der nächste Post ist schon in Arbeit.\n\nWenn dir das hier gefällt, folg mir — dann verpasst du nichts.\n\nBis gleich. ✨\n\n#content #instagram #mehrdavon #folgen',
      },
    ],
  };
}

/**
 * Genau 3 wohlgeformte Posts? Sonst backfillen wir NUR die Posts aus dem Fallback
 * (Kern-Copy bleibt), analog zur frueheren Captions-Logik. Jeder Post braucht 3
 * Slides mit gefuellten head/headAccent/sub und eine nicht-leere Caption.
 */
function postsOk(posts) {
  return (
    Array.isArray(posts) &&
    posts.length === 3 &&
    posts.every(
      (post) =>
        post &&
        typeof post === 'object' &&
        typeof post.caption === 'string' &&
        post.caption.trim() &&
        Array.isArray(post.slides) &&
        post.slides.length === 3 &&
        post.slides.every(
          (s) =>
            s &&
            typeof s === 'object' &&
            ['head', 'headAccent', 'sub'].every((k) => typeof s[k] === 'string' && s[k].trim())
        )
    )
  );
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
  // Fallback mit Grund-Marker: nur API-/Konfig-Probleme (no_key/claude_error) sollen
  // die Founder alarmieren (z. B. Guthaben leer -> alle Kundinnen bekaemen still
  // generische Copy). ablehnen/falsche Form sind Content-Entscheidungen, kein Alarm.
  const fb = (grund) => (grund ? { ...buildFallback(clean), _fallback: grund } : buildFallback(clean));

  if (!env?.ANTHROPIC_API_KEY) {
    console.error('[copy] ANTHROPIC_API_KEY fehlt — nutze Fallback-Texte');
    return fb('no_key');
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
        tools: [CONTENT_TOOL],
        tool_choice: { type: 'tool', name: 'deliver_content' },
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!res.ok) {
      console.error('[copy] Claude antwortete mit', res.status, await res.text());
      return fb('claude_error');
    }

    const data = await res.json();
    const toolUse = (data?.content ?? []).find((b) => b.type === 'tool_use' && b.name === 'deliver_content');
    if (!toolUse || !toolUse.input || typeof toolUse.input !== 'object') {
      console.error('[copy] Kein tool_use in der Antwort — Fallback. stop_reason:', data?.stop_reason);
      return fb('claude_error');
    }
    const parsed = toolUse.input; // API-garantiert valides Objekt gemaess Schema

    if (parsed?.ablehnen) {
      console.error('[copy] Claude hat das Thema abgelehnt — nutze neutrale Fallback-Texte');
      return buildFallback(clean);
    }
    if (!formStimmt(parsed)) {
      console.error('[copy] Claudes Antwort hat die falsche Form — Fallback. Keys:', Object.keys(parsed || {}).join(','), 'cells:', Array.isArray(parsed?.cells) ? parsed.cells.length : 'n/a');
      return buildFallback(clean);
    }
    // Kern-Copy ist gut — aber falls die Posts patzen (fehlende Slides, leere
    // Felder, keine Caption), nur DIE backfillen, statt die ganze gute Antwort
    // wegzuwerfen.
    if (postsOk(parsed.posts)) return parsed;
    console.error('[copy] posts fehlen/ungueltig — backfill. posts-Typ:', Array.isArray(parsed?.posts) ? `len ${parsed.posts.length}` : typeof parsed?.posts, 'erster-Post-Keys:', Object.keys(parsed?.posts?.[0] || {}).join(','));
    return { ...parsed, posts: buildFallback(clean).posts };
  } catch (err) {
    console.error('[copy] Texte konnten nicht generiert werden:', err);
    return fb('claude_error');
  }
}
