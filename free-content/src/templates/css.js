/**
 * Das Look-B-CSS. Portiert aus design/looks.html — dort nachweislich gerendert
 * (Belege: design/s-b.png, b-hell.png, pb-hell.png).
 *
 * NICHT "verbessern". Look B + dezentes Wasserzeichen sind eine getroffene
 * Entscheidung (design/ENTSCHEIDUNG.md, Spec §6). Wer hier umgestaltet, wirft sie weg.
 *
 * Die Farben stehen bewusst NICHT hier: jeder Frame bekommt seine Palette als
 * Inline-Tokens. Look B ist das Typo-/Layout-System, nicht die Farbe.
 *
 * Anpassungen ggue. design/looks.html (Task 5, Step 3 — rein mechanisch):
 * 1. .look-a/.look-b/.look-c/.look-b-hell/.look-b-salbei entfallen — die Tokens
 *    kommen jetzt inline pro Frame (siehe frames.js).
 * 2. .look-b .head / .look-b .head em -> .head / .head em, weil Look B jetzt der
 *    einzige Look ist.
 * 3. .wm-loud (verworfen) und .label (nur Kontaktbogen-Layout) entfallen.
 * 4. body { background: #1a1a1a; } entfaellt — im Render-Kontext gibt es keine Buehne.
 */
export const LOOK_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* Jede Kachel ist exakt das IG-Format. Kein Skalieren, kein Schummeln. */
  .frame { width: 1080px; height: 1350px; position: relative; overflow: hidden; }

  /* Film-Grain: gibt der Flaeche Koerper. Ohne das sieht jedes Rendering nach Screenshot aus. */
  .grain::after {
    content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .055;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* ══ DIE SPERRE ══
     Der Kern der Sache: unser Zeichen und IHR Handle sitzen in EINEM Element,
     das zugleich die Grundlinie der Komposition traegt. Wer uns wegradiert,
     nimmt ihren Namen und die Linie mit — das Loch sieht man sofort. */
  .lock {
    position: absolute; left: 88px; right: 88px; bottom: 76px;
    display: flex; align-items: center; gap: 22px;
    padding-top: 26px; border-top: 2px solid var(--rule);
  }
  .lock .handle {
    font-family: var(--ff-body); font-weight: 600; font-size: 30px;
    letter-spacing: -.01em; color: var(--ink); white-space: nowrap;
  }
  .lock .spacer { flex: 1; height: 2px; background: var(--rule); }
  .lock .mark {
    display: flex; align-items: center; gap: 11px; white-space: nowrap;
    font-family: var(--ff-body); font-size: 21px; font-weight: 500; letter-spacing: .01em;
  }
  .lock .dot {
    width: 13px; height: 13px; border-radius: 50%;
    background: #00B888; box-shadow: 0 0 0 5px rgba(0,184,136,.16);
    flex: none;
  }

  /* dezent: Marke tritt zurueck, Handle fuehrt */
  .wm-soft .mark { color: var(--ink-soft); }
  /* Echtes Logo-Asset (kein CSS-Text-Wordmark) — als Maske in die Ink-Farbe der
     Farbwelt getoent, damit es auf hellen UND dunklen Frames sichtbar bleibt. */
  .lock .wm-logo {
    display: inline-block; width: 132px; height: 20px; vertical-align: middle;
    background: var(--ink);
    -webkit-mask: url(https://social2scale.com/assets/sig-wordmark.png) left center / contain no-repeat;
            mask: url(https://social2scale.com/assets/sig-wordmark.png) left center / contain no-repeat;
  }

  /* ── Post-Slide ──
     Headline unten verankert, nicht oben: sonst klafft die Mitte leer. Spannung
     entsteht aus Kicker oben / Masse unten — Magazin-Cover-Prinzip. */
  .slide { padding: 92px 88px 200px; height: 100%; display: flex; flex-direction: column; }
  .slide-top { display: flex; align-items: baseline; justify-content: space-between; }
  .eyebrow {
    font-family: var(--ff-body); font-size: 19px; font-weight: 600;
    letter-spacing: .22em; text-transform: uppercase; color: var(--accent);
  }
  /* Zaehler macht sofort klar: hier kommt noch was, wisch weiter. */
  .idx {
    font-family: var(--ff-body); font-size: 19px; font-weight: 600;
    letter-spacing: .1em; color: var(--ink-soft);
  }
  .idx b { color: var(--ink); }
  /* Die Regel bindet Kopf und Fuss zur Komposition zusammen. */
  .rule-top { height: 2px; background: var(--rule); margin-top: 26px; }
  .head {
    font-family: var(--ff-display); color: var(--ink);
    font-size: 104px; line-height: .96; letter-spacing: -.035em; font-weight: 600;
  }
  .head { letter-spacing: -.045em; font-weight: 700; }
  .head em { font-style: italic; color: var(--accent); }
  .head em { font-style: normal; color: var(--accent); }
  .sub {
    font-family: var(--ff-body); font-size: 31px; line-height: 1.5;
    color: var(--ink-soft); margin-top: 44px; max-width: 20ch;
  }
  .spacer-fill { flex: 1; }

  /* ── value-Slide (Slide 2) ──
     Nummern-/punktbetont: die grosse Ziffer macht sofort klar, dass hier der Kern
     kommt. Setzt sich bewusst vom Cover ab, damit ein Karussell nicht 3× gleich wirkt. */
  .big-num {
    font-family: var(--ff-display); font-weight: 700; color: var(--accent);
    font-size: 260px; line-height: .78; letter-spacing: -.05em; margin-bottom: 10px;
  }
  .head-value { font-size: 84px; line-height: .98; }
  .head-value em { font-style: normal; color: var(--accent); }

  /* ── cta-Slide (Slide 3) ──
     Ruhiger Abschluss: der Handle fuehrt gross, „Folge fuer mehr" als klare,
     freundliche Handlung. Kein neues Statement-Gewicht mehr, das Karussell laeuft aus. */
  .slide-cta .cta-handle {
    font-family: var(--ff-display); font-weight: 700; color: var(--ink);
    font-size: 72px; letter-spacing: -.03em; line-height: 1; word-break: break-word;
  }
  .head-cta { font-size: 88px; margin-top: 30px; }
  .cta-follow {
    align-self: flex-start; display: inline-flex; align-items: center; gap: 14px;
    margin-top: 46px; padding: 22px 40px; border-radius: 999px;
    font-family: var(--ff-body); font-weight: 600; font-size: 30px; letter-spacing: -.01em;
    color: var(--paper); background: var(--accent);
  }
  .cta-follow .cta-plus { font-family: var(--ff-display); font-weight: 700; font-size: 34px; line-height: 1; }

  /* ── Profil-Vorschau (Phone) ──
     Muss auf den ersten Blick wie IHR Instagram aussehen — sonst faellt der
     "das bin ja ICH"-Moment flach. Deshalb echte Handy-Proportion (~1:2), nicht Tablet. */
  .phone-pad { padding: 66px 66px 168px; height: 100%; display: flex; align-items: center; justify-content: center; }
  /* Double-Bezel: das Geraet sitzt in einer Schale, nicht flach auf der Flaeche */
  .shell { padding: 10px; border-radius: 56px; background: var(--rule); }
  .device {
    width: 536px; border-radius: 47px; overflow: hidden;
    background: var(--paper);
    box-shadow: 0 40px 90px -30px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.22);
  }
  /* Statusleiste + Handle-Kopf: die zwei Details, die es sofort als IG lesbar machen */
  .ios { display: flex; justify-content: space-between; padding: 20px 30px 4px;
    font-family: var(--ff-body); font-size: 17px; font-weight: 600; color: var(--ink); }
  .ios .rechts { letter-spacing: .12em; }
  .ig-top { display: flex; align-items: center; gap: 10px; padding: 10px 26px 14px;
    font-family: var(--ff-body); font-size: 21px; font-weight: 700; color: var(--ink);
    border-bottom: 1px solid var(--rule); }
  .prof { padding: 24px 26px 22px; }
  .prof-top { display: flex; align-items: center; gap: 26px; }
  /* Story-Ring wie bei aktiver IG-Story — in der Akzentfarbe der Welt, nicht
     im IG-Markengradient (Look-alike ja, Marken-Kopie nein). Der Paper-Rand
     zwischen Ring und Bild ist der Spalt, der den Ring als Ring lesbar macht. */
  .pfp-ring {
    flex: none; padding: 4px; border-radius: 50%;
    background: conic-gradient(from 210deg,
      var(--accent),
      color-mix(in oklab, var(--accent) 30%, var(--paper)) 55%,
      var(--accent));
  }
  .avatar {
    width: 104px; height: 104px; border-radius: 50%;
    border: 4px solid var(--paper);
    background: var(--accent); color: var(--paper);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--ff-display); font-size: 42px; font-weight: 700;
    overflow: hidden;
  }
  .pfp-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .stats { display: flex; gap: 34px; }
  .stat { text-align: center; font-family: var(--ff-body); }
  .stat b { display: block; font-size: 23px; font-weight: 700; color: var(--ink); }
  .stat span { font-size: 15px; color: var(--ink-soft); }
  .bio { margin-top: 18px; font-family: var(--ff-body); }
  .bio .n { font-size: 20px; font-weight: 700; color: var(--ink); }
  .bio .l { font-size: 17px; line-height: 1.45; color: var(--ink-soft); margin-top: 3px; }
  .bio .l b { color: var(--accent); font-weight: 600; }
  /* Highlights: echtes IG-Element UND Teil des Pakets (render-brand.cjs baut die Cover).
     Sie zeigen, dass hier ein ganzer Auftritt gedacht ist, nicht nur ein paar Posts. */
  .hl { display: flex; gap: 18px; margin-top: 20px; }
  .hl-i { text-align: center; font-family: var(--ff-body); font-size: 12px; color: var(--ink-soft); }
  .hl-c {
    width: 62px; height: 62px; border-radius: 50%; margin-bottom: 6px;
    border: 2px solid var(--rule);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--ff-display); font-size: 20px; font-weight: 600;
    background: color-mix(in oklab, var(--accent) 12%, var(--paper)); color: var(--accent);
  }
  /* 2px statt 4px: das echte IG-Grid ist nahezu randlos — Detailtreue. */
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; margin-top: 22px; }
  .cell {
    aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
    padding: 10px; text-align: center;
    font-family: var(--ff-display); font-size: 16px; line-height: 1.15; font-weight: 600;
  }
  .c-fill { background: var(--ink); color: var(--paper); }
  .c-accent { background: var(--accent); color: var(--paper); }
  .c-tint { background: color-mix(in oklab, var(--accent) 15%, var(--paper)); color: var(--ink); }
  .c-line { background: var(--paper); color: var(--ink-soft); border: 2px solid var(--rule); }

  /* ── Share-Card (f-share) ── farbwelt-unabhaengig, s2s-Markenlook.
     Eigene Farben inline (nicht die Kunden-Palette): der geteilte Post soll
     als social2scale erkennbar sein. */
  .share { background: #03080D; color: #F2F3F1; }
  .share-grad {
    position: absolute; inset: 0;
    background:
      radial-gradient(90% 68% at 12% 5%, rgba(0,184,136,.42), transparent 55%),
      radial-gradient(96% 74% at 92% 97%, rgba(31,166,224,.36), transparent 56%),
      linear-gradient(150deg, #04140F, #05131C 52%, #03080D);
  }
  .share-inner { position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; padding: 84px 90px 80px; }
  /* Kopf: WESSEN Feed das ist (Handle = der Absender, nicht s2s). */
  .share-top { display: flex; align-items: center; justify-content: space-between; }
  .share-id { display: flex; align-items: center; gap: 22px; }
  .share-pfp {
    width: 96px; height: 96px; border-radius: 50%; object-fit: cover; display: block;
    border: 2.5px solid rgba(255,255,255,.28);
  }
  .share-who { display: flex; flex-direction: column; gap: 8px; }
  .share-at {
    font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 44px;
    letter-spacing: -.02em; color: #F2F3F1;
  }
  .share-plat {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px; font-weight: 500;
    letter-spacing: .04em; color: rgba(242,243,241,.6);
  }
  .share-mark {
    width: 92px; height: 92px; border-radius: 26px; display: block; object-fit: contain;
    background: rgba(255,255,255,.05); padding: 12px; box-shadow: 0 0 0 1px rgba(255,255,255,.1);
  }
  /* Held: der ECHTE beste Hook der Kundin — der Star der Karte. */
  .share-hero { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .share-kicker {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 25px; font-weight: 600;
    letter-spacing: .2em; text-transform: uppercase; color: #1FC998;
    display: inline-flex; align-items: center; gap: 18px;
  }
  .share-kicker::before {
    content: ''; width: 54px; height: 3px; border-radius: 3px;
    background: linear-gradient(90deg, #1FC998, #1FA6E0);
  }
  .share-hook {
    font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 82px;
    line-height: 1.0; letter-spacing: -.035em; margin-top: 30px; text-wrap: balance;
  }
  .share-hook em {
    font-style: normal;
    background: linear-gradient(120deg, #1FC998, #1FA6E0);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  .share-hooksub {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 30px; line-height: 1.4;
    color: rgba(242,243,241,.72); margin-top: 34px; max-width: 26ch;
  }
  /* Signatur: s2s + QR, dezent unter dem Content, getrennt durch feine Linie. */
  .share-foot {
    margin-top: 56px; padding-top: 46px; border-top: 1.5px solid rgba(255,255,255,.13);
    display: flex; align-items: center; justify-content: space-between; gap: 40px;
  }
  .share-foot-l { display: flex; flex-direction: column; gap: 20px; }
  .share-logo { width: 210px; height: auto; display: block; }
  .share-foot-t {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 30px; font-weight: 500;
    line-height: 1.28; color: rgba(242,243,241,.82); max-width: 15ch;
  }
  .share-foot-t em { font-style: normal; font-weight: 700; color: #F2F3F1; }
  .share-qr-wrap { flex: none; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .share-qr {
    width: 210px; height: 210px; background: #fff; border-radius: 28px;
    padding: 20px; box-shadow: 0 34px 70px -22px rgba(0,0,0,.6);
  }
  .share-qr svg { display: block; width: 100%; height: 100%; }
  .share-scan {
    font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 34px;
    letter-spacing: -.01em; color: #F2F3F1;
  }
  .share-scan .share-arrow { color: #1FC998; }
`;
