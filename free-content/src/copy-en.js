/**
 * Englische Post-Texte fuer den Free-Content (Funnel /en/, Sebi 23.10.2026: „immer beides 1/1“,
 * englischsprachige Kundinnen bekommen alles nativ auf Englisch). Gleicher Aufbau wie copy.js —
 * gleiche Felder, gleiche Laengen, gleiche Rechtsregeln (keine Heil-, Wirk-, Erfolgs- oder
 * Einkommensversprechen); nur die Sprache und die Beispiele sind englisch.
 */

export const SYSTEM_EN =
  'You are the senior content strategist of the premium agency social2scale. You write Instagram content ' +
  'IN THE CLIENT’S OWN VOICE — natural English, speaking to the reader as “you”, concrete, no filler, no marketing speak.\n\n' +
  'QUALITY BAR (premium, no filler):\n' +
  '- Refer CONCRETELY to her topic and goal — use her terms and her world, never generic placeholders.\n' +
  '- Each post = ONE real, ready-to-post thought that exactly SHE would put out — no listicle padding.\n' +
  '- Tension before resolution. Specific beats general. Her voice, never agency speak.\n\n' +
  'HOOK for the first slide (kind "hook") of each post (pick the best-fitting pattern):\n' +
  '- Counter-intuitive: “Your problem isn’t too little discipline. It’s too much of it.”\n' +
  '- Concrete number: “3 sentences that turn any difficult conversation.”\n' +
  '- Open question: “Why are you more tired after your holiday than before it?”\n' +
  'NOT: “5 tips for more self-love” — generic listicle hooks without a tension gap are forbidden.\n\n' +
  'CLAIMS & LEGAL SAFETY (mandatory, no exceptions — applies to EVERY slide AND every caption):\n' +
  '- No promises of effects, healing, results or income. No diagnoses, no substitute for therapy.\n' +
  '- Forbidden: “helps against …”, “relieves …”, “heals …”, “makes you pain-free”, “you’ll earn … with this”.\n' +
  '- Rephrase instead of promising: NOT “helps with sleep problems” → BUT “this is what my evening ritual looks like”. ' +
  'NOT “reduces stress” → BUT “what helps me on stressful days”.\n' +
  '- For wellness and health topics: only personal experience and an invitation to try — never objective claims of effect.\n\n' +
  'If the topic cannot be promoted responsibly, set ablehnen=true in the tool.\n\n' +
  'CONTENT of the fields (the tool schema sets the STRUCTURE — you fill it with quality):\n' +
  '- eyebrow: 2-3 word kicker. head + headAccent: headline in TWO parts, headAccent = the coloured punchline. sub: one sentence, max 90 characters.\n' +
  '- bio: her Instagram bio line, max 40 characters. cells: 9 short feed-grid titles (max 18 characters each).\n' +
  '- nameLine: the optimised IG display name — “First name | positioning” (e.g. “Anna | Yoga for busy women”), max 30 characters. The name is searchable on Instagram: the positioning MUST be a search term for her topic.\n' +
  '- bioLines: the complete bio makeover, EXACTLY 3 short lines (max 36 characters each): line 1 = who she helps and how (positioning), line 2 = what makes her special (substance, no promise of results), line 3 = a gentle call to action with ↓ or →.\n' +
  '- highlights: EXACTLY 4 story highlight names for her profile (max 11 characters each, Instagram cuts hard): specific to her topic instead of generic (e.g. yoga: My story / Classes / Results / FAQ).\n' +
  '- posts (EXACTLY 3 carousels): 3 slides each, in the order hook → value → cta.\n' +
  '  hook: tension/curiosity. value: THE concrete core, ONE big key message. cta: calm close, gentle action (“Save this” / “Follow for more”).\n' +
  '  Every slide: eyebrow, head, headAccent, sub — all filled, never empty.\n' +
  '- caption per post: a finished, ready-to-post IG caption matching the 3 slides. Structure: strong first line → 2-4 short value lines (I/you tone) → gentle call to action → 4-6 relevant hashtags. 400-700 characters.';

/** Taetigkeit fuer den Prompt (Schluessel wie TAETIGKEITEN in constants.js). */
export const TAETIGKEITEN_EN = Object.freeze({
  coach: 'Coach or consultant',
  direktvertrieb: 'Direct sales or network marketing',
  dienstleistung: 'Studio or service business',
  creator: 'Creator',
  anders: 'Something else',
});

/** Ziel- und Stimmungswerte bleiben im Formular deutsch (Server-Werte); fuer den Prompt englisch. */
export const ZIEL_EN = Object.freeze({
  'Mehr Anfragen': 'More inquiries',
  'Mehr Sichtbarkeit': 'More visibility',
  'Mehr Umsatz': 'More revenue',
  'Weniger Zeit für Content': 'Less time spent on content',
  'Meine Marke stärken': 'Build my brand',
});
export const STIMMUNG_EN = Object.freeze({ ruhig: 'calm & natural', klar: 'clear & professional', warm: 'warm & approachable', mutig: 'strong & bold' });

export const WINKEL_EN = [
  'Post 1 of 3 — the OPENER: the central belief or the biggest misconception in her topic. Counter-intuitive hook.',
  'Post 2 of 3 — the HOW: a concrete approach, method or step from her topic. Clearly a different angle from post 1.',
  'Post 3 of 3 — PERSONAL: an insight or small story from her everyday life about the topic. Clearly a different angle from posts 1 and 2.',
];

export const AUFGABE_EN = {
  profil: 'Task: Only the profile core (reveal headline eyebrow/head/headAccent/sub, bio, nameLine, bioLines, 4 highlights, 9 short feed-grid titles). NO posts.',
  post: 'Task: Exactly ONE carousel (3 slides hook→value→cta) + a finished caption.',
};

/** Prompt-Kopf mit ihren Angaben; Feldnamen wie im deutschen Pfad, Werte auf Englisch. */
export function basisEn(clean, clip) {
  const t = TAETIGKEITEN_EN[clean?.taetigkeit];
  return (
    `Client: ${clip(clean?.name, 60)} (@${clip(clean?.handle, 40)})\n` +
    `Topic: ${clip(clean?.branche, 200)}\n` +
    `Goal: ${clip(ZIEL_EN[clean?.ziel] || clean?.ziel, 400)}\n` +
    (t && Object.prototype.hasOwnProperty.call(TAETIGKEITEN_EN, clean.taetigkeit) ? `Occupation: ${t}\n` : '') +
    `Mood: ${clip(STIMMUNG_EN[clean?.stimmung] || clean?.stimmung, 40)}`
  );
}

/**
 * Englischer Fallback (kommt nur, wenn Claude ausfaellt). Wie im Deutschen: branche und ziel
 * nie verbatim (Freitext ist claim-traechtig), nur der Name.
 */
export function buildFallbackEn(name) {
  const gruss = name ? `, ${name}` : '';
  return {
    eyebrow: 'A first taste',
    head: 'This is how your feed',
    headAccent: 'could look.',
    sub: `Your topic, your style — ready to post${gruss}.`.slice(0, 90),
    bio: 'Your feed — visible, consistent.'.slice(0, 40),
    nameLine: (name || 'Your name').slice(0, 34),
    bioLines: [
      'Your topic, clearly positioned',
      'Content with substance, not noise',
      'Start with your preview ↓',
    ],
    highlights: ['About me', 'Offer', 'Voices', 'Questions'],
    cells: [
      'Your topic', 'Why now?', '3 steps',
      'Quote', 'Before / after', 'Your question?',
      'Insight', 'About you', 'Next step',
    ],
    posts: [
      {
        slides: [
          { kind: 'hook', eyebrow: 'Small start', head: 'The first step', headAccent: 'is the hardest.', sub: 'And still the most important one.' },
          { kind: 'value', eyebrow: 'Why it matters', head: 'Small steps', headAccent: 'that stick.', sub: 'Not perfect — just honest and consistent.' },
          { kind: 'cta', eyebrow: 'Keep going', head: 'Save this', headAccent: 'for later.', sub: 'So you can start right away next time.' },
        ],
        caption: 'Sometimes the first step is simple: begin.\n\nThat’s what this is about — small, honest steps that stick.\n\nSave this if you want to keep going. 💚\n\n#content #socialmedia #instagram #keepgoing',
      },
      {
        slides: [
          { kind: 'hook', eyebrow: 'Real, not polished', head: 'No gloss —', headAccent: 'real insights.', sub: 'This is what it really looks like.' },
          { kind: 'value', eyebrow: 'What’s behind it', head: 'Things I try', headAccent: 'myself.', sub: 'In my words, from my everyday life.' },
          { kind: 'cta', eyebrow: 'Your turn', head: 'How do', headAccent: 'you do it?', sub: 'Tell me in the comments.' },
        ],
        caption: 'No gloss — real insights.\n\nThings I try myself, in my own words.\n\nHow do you do it? Tell me in the comments. 👇\n\n#behindthescenes #community #instagram #honest',
      },
      {
        slides: [
          { kind: 'hook', eyebrow: 'More to come', head: 'The next post', headAccent: 'is already in the works.', sub: 'There’s more coming.' },
          { kind: 'value', eyebrow: 'For you', head: 'Fresh ideas,', headAccent: 'regularly.', sub: 'No pressure, at your own pace.' },
          { kind: 'cta', eyebrow: 'Stay with me', head: 'Follow me', headAccent: 'for more.', sub: 'So you don’t miss a thing.' },
        ],
        caption: 'The next post is already in the works.\n\nIf you like this, follow me — so you don’t miss a thing.\n\nSee you soon. ✨\n\n#content #instagram #morecoming #follow',
      },
    ],
  };
}
