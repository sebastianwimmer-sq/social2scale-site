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

import { COPY_VERSUCHE, COPY_BACKOFF_MS } from './constants.js';

const API = 'https://api.anthropic.com/v1/messages';
// Die Copy war der wahre Flaschenhals der Wartezeit (~37s): EIN Call musste Profil
// + 3 Posts × 3 Slides + 3 Captions am Stueck ausgeben. Jetzt wird sie auf 4
// PARALLELE Calls gesplittet (Profil + je 1 Post) — jeder Call ist ~1/4 so gross,
// die Wall-Zeit ist der langsamste statt der Summe. Darum reicht pro Call ein
// kleineres Token-Budget.
// 1500 waren auf Sonnet 4.6 knapp ausreichend. Sonnet 5 bringt einen neuen Tokenizer,
// der denselben deutschen Text in spuerbar mehr Tokens zerlegt — bei gleichem Deckel
// risse derselbe Post ploetzlich ab. Aufschlag mit Reserve; ungenutzte Tokens kosten
// nichts, nur tatsaechlich erzeugte werden berechnet.
const PER_CALL_TOKENS = 2200;

const SYSTEM =
  'Du bist Senior-Content-Stratege der Premium-Agentur social2scale. Du schreibst Instagram-Content ' +
  'in DER STIMME DER KUNDIN — deutsch, Du-Form, konkret, ohne Floskeln, ohne Marketing-Sprech.\n\n' +
  'QUALITAETS-MESSLATTE (Premium, kein Fuelltext):\n' +
  '- Beziehe dich KONKRET auf ihr Thema und ihr Ziel — nutze ihre Begriffe/ihre Welt, nie generische Platzhalter.\n' +
  '- Jeder Post = EIN echter, sofort postbarer Gedanke, den genau SIE raushauen wuerde — keine Listicle-Fuellung.\n' +
  '- Spannungsluecke vor Aufloesung. Spezifisch schlaegt allgemein. Ihre Stimme, nie Agentur-Sprech.\n\n' +
  'HOOK fuer die erste Slide (kind "hook") jedes Posts (waehle das passendste Muster):\n' +
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
  'Wenn das Thema nicht seriös bewerbbar ist, setze im Tool ablehnen=true.\n\n' +
  'INHALT der Felder (die STRUKTUR gibt das Tool-Schema vor — du fuellst sie hochwertig):\n' +
  '- eyebrow: 2-3 Woerter Kicker. head + headAccent: Headline in ZWEI Teilen, headAccent = farbige Pointe. sub: ein Satz, max 90 Zeichen.\n' +
  '- bio: ihre Instagram-Bio-Zeile, max 40 Zeichen. cells: 9 kurze Feed-Raster-Titel (je max 18 Zeichen).\n' +
  '- posts (GENAU 3 Karussells): je 3 Slides in der Reihenfolge hook → value → cta.\n' +
  '  hook: Spannung/Neugier. value: DER konkrete Kern, EINE grosse Kernaussage. cta: ruhiger Abschluss, sanfte Handlung („Speicher dir das" / „Folge fuer mehr").\n' +
  '  Jede Slide: eyebrow, head, headAccent, sub — alle gefuellt, nie leer.\n' +
  '- caption pro Post: fertige, sofort postbare IG-Bildunterschrift, inhaltlich zu den 3 Slides. Aufbau: starke erste Zeile → 2-4 kurze Mehrwert-Zeilen (Ich-/Du-Ton) → sanfte Handlungsaufforderung → 4-6 relevante Hashtags. 400-700 Zeichen.';

function clip(v, n) {
  return String(v ?? '').trim().slice(0, n);
}

/**
 * Tool-Schemata fuer strukturierte Ausgabe. Statt Claude freies JSON schreiben zu
 * lassen (das bei Multi-Slide-Struktur regelmaessig ungueltig wird — Markdown-
 * Zaeune, rohe Zeilenumbrueche in Caption-Strings → JSON.parse scheitert →
 * generischer Fallback), zwingt tool_use Claude ins Schema; die API liefert ein
 * bereits valides Objekt. Fuer die Parallelisierung ZWEI Tools statt einem:
 * Profil-Kern in einem Call, jeder Post in einem eigenen Call.
 */
const SLIDE_SCHEMA = {
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
};

const PROFILE_TOOL = {
  name: 'deliver_profile',
  description: 'Liefert den Profil-Kern (Reveal-Headline, Bio, 9 Feed-Raster-Titel), HWG-konform.',
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
    },
    required: ['eyebrow', 'head', 'headAccent', 'sub', 'bio', 'cells'],
  },
};

const POST_TOOL = {
  name: 'deliver_post',
  description: 'Liefert EIN Instagram-Karussell (3 Slides hook→value→cta) + fertige Caption, HWG-konform.',
  input_schema: {
    type: 'object',
    properties: {
      slides: SLIDE_SCHEMA,
      caption: { type: 'string' },
    },
    required: ['slides', 'caption'],
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
function postOk(post) {
  return (
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
  );
}

function postsOk(posts) {
  return Array.isArray(posts) && posts.length === 3 && posts.every(postOk);
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
 * EIN Claude-Call mit tool_use. Gibt das validierte Tool-Objekt zurueck oder null
 * (jeder Fehler → null, damit der Aufrufer pro Teil entscheiden kann: Kern-Fallback
 * vs. nur diesen Post backfillen). WIRFT NIE. System + Tool tragen cache_control:
 * der grosse statische Prefix wird EINMAL gecacht und von allen 4 parallelen Calls
 * (und allen Folge-Kundinnen) fuer ~10% der Input-Kosten wiederverwendet.
 */
/**
 * Transient = nochmal schicken hat echte Aussicht auf Erfolg: Auslastung (429/529),
 * Serverfehler (5xx). Ein 4xx ist unser eigener kaputter Request — der kommt beim
 * zweiten Mal genauso zurueck und kostet nur Wartezeit auf dem Build-Screen.
 */
function transient(status) {
  return status === 429 || status >= 500;
}

/** Ein einzelner Claude-Call. Wirft bei transienten Fehlern, damit callClaude erneut darf. */
async function einVersuch(env, tool, user, label) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      max_tokens: PER_CALL_TOKENS,
      // Explizit AUS: auf Sonnet 5 denkt das Modell adaptiv, sobald dieses Feld fehlt.
      // max_tokens deckelt Denken + Antwort gemeinsam -> der Tool-Call risse mitten im
      // Post ab, aufgefangen vom Fallback, also unsichtbar. Wir wollen hier reine
      // Ausgabe: die Struktur gibt das Tool-Schema vor, es gibt nichts zu ergruebeln.
      thinking: { type: 'disabled' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [{ ...tool, cache_control: { type: 'ephemeral' } }],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[copy] ${label}: Claude ${res.status}`, text);
    if (transient(res.status)) throw new Error(`Claude ${res.status}`);
    return null;
  }
  const data = await res.json();
  const u = data?.usage;
  if (u) console.error(`[copy] ${label} usage in=${u.input_tokens} cache_read=${u.cache_read_input_tokens ?? 0} out=${u.output_tokens}`);
  const tu = (data?.content ?? []).find((b) => b.type === 'tool_use' && b.name === tool.name);
  if (!tu || !tu.input || typeof tu.input !== 'object') {
    console.error(`[copy] ${label}: kein tool_use. stop_reason:`, data?.stop_reason);
    return null;
  }
  return tu.input;
}

/**
 * Wie mitRetry() fuer den Render (generate.js): ein Blip darf sie nicht ihren Text
 * kosten. Gibt bei endgueltigem Scheitern null zurueck — WIRFT NIE, der Aufrufer
 * entscheidet dann ueber Fallback bzw. Backfill.
 */
async function callClaude(env, tool, user, label) {
  for (let versuch = 1; versuch <= COPY_VERSUCHE; versuch++) {
    try {
      return await einVersuch(env, tool, user, label);
    } catch (err) {
      console.error(`[copy] ${label}: Versuch ${versuch}/${COPY_VERSUCHE} fehlgeschlagen:`, err);
      if (versuch < COPY_VERSUCHE) {
        await new Promise((r) => setTimeout(r, COPY_BACKOFF_MS * versuch));
      }
    }
  }
  return null;
}

/**
 * Versucht Claude (4 PARALLELE Calls: Profil + 3 Posts), faellt sonst auf
 * buildFallback zurueck. WIRFT NIE.
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

  const basis =
    `Kundin: ${clip(clean?.name, 60)} (@${clip(clean?.handle, 40)})\n` +
    `Thema: ${clip(clean?.branche, 200)}\n` +
    `Ziel: ${clip(clean?.ziel, 400)}\n` +
    `Stimmung: ${clip(clean?.stimmung, 40)}`;

  // Drei feste Blickwinkel, damit die 3 unabhaengigen (parallelen) Post-Calls sich
  // NICHT wiederholen — die Coherenz, die frueher der eine gemeinsame Call sicherte,
  // steckt jetzt in diesen Vorgaben.
  const winkel = [
    'Post 1 von 3 — der AUFMACHER: die zentrale Ueberzeugung oder der groesste Irrtum in ihrem Thema. Kontra-intuitiver Hook.',
    'Post 2 von 3 — das WIE: ein konkreter Weg, eine Methode oder ein Schritt aus ihrem Thema. Klar anderer Blickwinkel als Post 1.',
    'Post 3 von 3 — PERSOENLICH: eine Erkenntnis oder kleine Geschichte aus ihrem Alltag zum Thema. Klar anderer Blickwinkel als Post 1 und 2.',
  ];

  // Alle 4 Calls gleichzeitig — Wall-Zeit = langsamster Call, nicht Summe.
  const [prof, ...rohPosts] = await Promise.all([
    callClaude(env, PROFILE_TOOL, basis + '\n\nAufgabe: Nur der Profil-Kern (Reveal-Headline eyebrow/head/headAccent/sub, Bio, 9 kurze Feed-Raster-Titel). KEINE Posts.', 'profil'),
    ...winkel.map((w, i) => callClaude(env, POST_TOOL, basis + '\n\nAufgabe: Genau EIN Karussell (3 Slides hook→value→cta) + fertige Caption.\n' + w, `post${i + 1}`)),
  ]);

  // Das Profil ist der Kern (Bio, Feed-Raster, Headline). Faellt es aus (API/Guthaben),
  // ist das ein echtes Problem -> Founder-Alarm ueber den Marker.
  if (!prof) {
    console.error('[copy] Profil-Call ohne Ergebnis — Fallback.');
    return fb('claude_error');
  }
  if (prof.ablehnen) {
    console.error('[copy] Claude hat das Thema abgelehnt — nutze neutrale Fallback-Texte');
    return buildFallback(clean);
  }
  if (!formStimmt(prof)) {
    console.error('[copy] Profil hat die falsche Form — Fallback. Keys:', Object.keys(prof || {}).join(','), 'cells:', Array.isArray(prof?.cells) ? prof.cells.length : 'n/a');
    return buildFallback(clean);
  }

  // Posts einzeln bewerten: gute uebernehmen, nur die patzenden aus dem Fallback
  // backfillen (statt die ganze Antwort wegzuwerfen).
  const fbPosts = buildFallback(clean).posts;
  const posts = rohPosts.map((p, i) => {
    if (postOk(p)) return p;
    console.error(`[copy] post${i + 1} ungueltig — backfill. Keys:`, Object.keys(p || {}).join(','));
    return fbPosts[i];
  });

  return { ...prof, posts };
}
