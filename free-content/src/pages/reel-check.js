/**
 * Reel-Check: Annahme-Seite (/reel-check/ und /en/reel-check/) und Stand-Seite (/rc/<token>).
 *
 * Welt: der Prüfstand. Das Reel steht als Gerät im Licht des Studios (dieselbe Szene wie der Funnel), daneben
 * der Annahmezettel mit drei Fragen. Kontrolllampen und Messstreifen sind dieselben wie im Befund
 * (kit-build/reel-check/seite.py): wer hochlädt, erkennt die Seite wieder, auf der sein Ergebnis steht.
 * Eine Vorlage für beide Sprachen: Gestaltung 1:1, Texte je Sprache eigen geschrieben (TEXTE).
 */

import { htmlDoc, SICHERHEITS_HEADER } from './shell.js';
import { MAX_BYTES, LOESCH_FRIST_TAGE } from '../reel-check.js';

const DEFAULT_TURNSTILE_SITE_KEY = '0x4AAAAAAD5FwCxWtZhzGlpX';
const MAX_MB = Math.round(MAX_BYTES / 1024 / 1024);

export const TEXTE = {
  de: {
    pfad: '/reel-check/', andere: ['/en/reel-check/', 'English', 'en'], start: 'https://social2scale.com/',
    titel: 'Reel-Check · social2scale',
    beschreibung: 'Lad ein Reel hoch und bekomm den Befund per Mail: 50 Prüfpunkte, eine Zahl von 0 bis 100. Kostenlos.',
    marke: 'social2scale · Reel-Check',
    h1: 'Dein Reel auf dem <em>Prüfstand</em>',
    lead: 'Lad ein Reel hoch. Wir prüfen es an 50 Punkten und schicken dir den Befund per Mail: eine Zahl von 0 bis 100 und die drei Stellen, an denen du anfängst. Kostenlos.',
    waehlen: 'Reel auswählen', ziehen: 'oder hierher ziehen', format: `MP4 oder MOV, bis ${MAX_MB} MB`, anderes: 'Anderes Reel wählen',
    liegt: 'Liegt auf dem Prüfstand', ohneBild: 'Dein Browser zeigt dieses Video nicht an. Ausgewählt ist es trotzdem.',
    zettel: 'Drei Fragen, dann geht es los',
    f1: 'Wen willst du erreichen?', f1h: 'In deinen Worten. Zum Beispiel: Frauen ab 40, die wieder mit Sport anfangen.',
    f2: 'Sprichst du im Reel selbst?', f2a: 'Ja, ich spreche', f2b: 'Nein, Musik oder Text',
    f3: 'Wo stehst du gerade?', f3a: 'Ich poste schon und will besser werden', f3b: 'Ich fange gerade an', f3c: 'Mir fehlt die Zeit dafür',
    mail: 'Wohin soll der Befund?', mailh: 'Deine E-Mail-Adresse',
    haken: `Ich bin einverstanden, dass social2scale mein Reel prüft, dabei die gesprochenen Worte und den Text im Bild von einer KI (Claude von Anthropic) auswerten lässt und mir den Befund per E-Mail schickt. Das Reel ist mein eigenes. Video und Befund werden nach ${LOESCH_FRIST_TAGE} Tagen gelöscht. Was wir daraus über Reels lernen, behalten wir ohne meinen Namen.`,
    mehr: 'Mehr dazu in der', ds: 'Datenschutzerklärung', dsFuss: 'Datenschutz', dsUrl: 'https://social2scale.com/datenschutz/',
    senden: 'Reel prüfen lassen',
    impressum: 'Impressum', impressumUrl: 'https://social2scale.com/impressum/',
    js: {
      kommt: 'Dein Reel kommt an', offen: 'Lass die Seite offen, bis der Streifen voll ist.', weiter: 'Weiter hochladen',
      da: 'Angekommen.', post: 'Schau in dein Postfach und bestätige deine Adresse. Danach prüfen wir dein Reel und schicken dir den Befund.',
      spam: 'Nichts angekommen? Sieh im Spam-Ordner nach oder lass dir die Mail nochmal schicken.', nochmal: 'Mail nochmal schicken', raus: 'Die Mail ist nochmal raus.',
      gleich: 'Die letzte Mail ist erst ein paar Minuten alt. Warte kurz und versuch es dann nochmal.',
      fehler: {
        datei: 'Wähl zuerst dein Reel aus.',
        video_art: 'Das ist kein MP4 oder MOV. Speichere das Reel als Video auf deinem Gerät und wähl es nochmal aus.',
        video_gross: `Das Video ist größer als ${MAX_MB} MB. Exportier es in 1080p, dann passt es.`,
        video_klein: 'Die Datei ist zu klein für ein Reel. Wähl das fertige Video aus.',
        email: 'Bitte prüf deine E-Mail-Adresse.', email_domain: 'An diese Adresse können wir nichts schicken. Bitte prüf sie.', disposable: 'Bitte nimm eine Adresse, die du dauerhaft nutzt.',
        zielgruppe: 'Schreib in ein paar Worten, wen du erreichen willst.', spricht: 'Bitte wähl eine Antwort aus.', lage: 'Bitte wähl eine Antwort aus.',
        einwilligung: 'Ohne dein Einverständnis dürfen wir das Reel nicht prüfen. Setz den Haken, wenn du einverstanden bist.',
        captcha: 'Die Sicherheitsprüfung läuft noch oder hat nicht geklappt. Warte einen Moment und tipp nochmal.',
        rate_limited: 'Das waren viele Versuche. Bitte versuch es in einer Stunde nochmal.',
        lesen: 'Dein Gerät gibt die Datei gerade nicht her. Tipp auf „Weiter hochladen“. Klappt es nicht, lad die Seite neu und wähl das Reel nochmal aus.',
        netz: 'Die Verbindung ist abgerissen. Dein Reel ist nicht verloren, tipp auf „Weiter hochladen“.',
        mail: 'Dein Reel liegt bei uns, aber die Mail ging nicht raus. Tipp auf „Mail nochmal schicken“.',
        sonst: 'Das hat gerade nicht geklappt. Bitte versuch es gleich nochmal.',
      },
    },
    stand: {
      wartet: ['Bestätige deine <em>Adresse</em>', 'Wir haben dir eine Mail geschickt. Ein Klick darin, dann prüfen wir dein Reel.'],
      prueft: ['Wir prüfen dein <em>Reel</em>', 'Der Befund kommt per Mail, sobald er fertig ist. Du kannst diese Seite schließen.'],
      fehler: ['Das hat nicht <em>geklappt</em>', 'Wir konnten dieses Reel nicht prüfen. Lad es bitte nochmal hoch.'],
      weg: ['Diesen Befund gibt es <em>nicht mehr</em>', `Befunde löschen wir nach ${LOESCH_FRIST_TAGE} Tagen. Du kannst jederzeit ein neues Reel prüfen lassen.`],
      neu: 'Reel hochladen',
    },
  },
  en: {
    pfad: '/en/reel-check/', andere: ['/reel-check/', 'Deutsch', 'de'], start: 'https://social2scale.com/en/',
    titel: 'Reel Check · social2scale',
    beschreibung: 'Upload a reel and get the report by email: 50 checkpoints, one score from 0 to 100. Free.',
    marke: 'social2scale · Reel Check',
    h1: 'Put your reel on the <em>test bench</em>',
    lead: 'Upload a reel. We check it against 50 points and email you the report: one score from 0 to 100 and the three things to fix first. Free.',
    waehlen: 'Choose a reel', ziehen: 'or drop it here', format: `MP4 or MOV, up to ${MAX_MB} MB`, anderes: 'Choose a different reel',
    liegt: 'On the test bench', ohneBild: 'Your browser can’t show this video. It’s still selected.',
    zettel: 'Three questions and you’re set',
    f1: 'Who do you want to reach?', f1h: 'In your own words. For example: women over 40 getting back into exercise.',
    f2: 'Do you speak in the reel yourself?', f2a: 'Yes, I’m talking', f2b: 'No, music or text',
    f3: 'Where are you right now?', f3a: 'I post already and want to get better', f3b: 'I’m just starting out', f3c: 'I don’t have the time for it',
    mail: 'Where should the report go?', mailh: 'Your email address',
    haken: `I agree that social2scale checks my reel, has an AI (Claude by Anthropic) evaluate the spoken words and on-screen text, and emails me the report. The reel is my own. Video and report are deleted after ${LOESCH_FRIST_TAGE} days. What we learn about reels from it, we keep without my name.`,
    mehr: 'More in our', ds: 'privacy policy', dsFuss: 'Privacy', dsUrl: 'https://social2scale.com/en/privacy/',
    senden: 'Check my reel',
    impressum: 'Legal notice', impressumUrl: 'https://social2scale.com/impressum/',
    js: {
      kommt: 'Your reel is on its way', offen: 'Keep this page open until the strip is full.', weiter: 'Continue upload',
      da: 'Got it.', post: 'Check your inbox and confirm your address. Then we check your reel and send you the report.',
      spam: 'Nothing there? Look in your spam folder or have the email sent again.', nochmal: 'Send the email again', raus: 'The email is on its way again.',
      gleich: 'The last email is only a few minutes old. Give it a moment, then try again.',
      fehler: {
        datei: 'Choose your reel first.',
        video_art: 'That’s not an MP4 or MOV. Save the reel as a video on your device and choose it again.',
        video_gross: `The video is larger than ${MAX_MB} MB. Export it in 1080p and it will fit.`,
        video_klein: 'The file is too small to be a reel. Choose the finished video.',
        email: 'Please check your email address.', email_domain: 'We can’t send anything to this address. Please check it.', disposable: 'Please use an address you keep.',
        zielgruppe: 'Tell us in a few words who you want to reach.', spricht: 'Please pick an answer.', lage: 'Please pick an answer.',
        einwilligung: 'We can’t check the reel without your consent. Tick the box if you agree.',
        captcha: 'The security check is still running or didn’t work. Wait a moment and tap again.',
        rate_limited: 'That was a lot of attempts. Please try again in an hour.',
        lesen: 'Your device isn’t handing over the file right now. Tap “Continue upload”. If that doesn’t help, reload the page and choose the reel again.',
        netz: 'The connection dropped. Your reel isn’t lost, tap “Continue upload”.',
        mail: 'We have your reel, but the email didn’t go out. Tap “Send the email again”.',
        sonst: 'That didn’t work just now. Please try again in a moment.',
      },
    },
    stand: {
      wartet: ['Confirm your <em>address</em>', 'We’ve sent you an email. One click in it and we check your reel.'],
      prueft: ['We’re checking your <em>reel</em>', 'The report arrives by email as soon as it’s done. You can close this page.'],
      fehler: ['That didn’t <em>work</em>', 'We couldn’t check this reel. Please upload it again.'],
      weg: ['This report is <em>gone</em>', `We delete reports after ${LOESCH_FRIST_TAGE} days. You can have a new reel checked any time.`],
      neu: 'Upload a reel',
    },
  },
};

const STIL = `
  body{font-size:17px;line-height:1.55}
  .rc{position:relative;z-index:1;max-width:1080px;margin:0 auto;padding-block:clamp(18px,3vw,34px) 72px;
    padding-left:max(18px,env(safe-area-inset-left,0px));padding-right:max(18px,env(safe-area-inset-right,0px))}
  .leiste{display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:44px}
  .wm-logo{height:26px;width:auto;display:block}
  .sprache{color:var(--muted);font-size:15px;text-decoration:none;min-height:44px;display:inline-flex;align-items:center;padding:0 4px}
  .sprache:hover{color:var(--ink)}
  .buehne{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,340px);grid-template-areas:"kopf stand" "zettel stand";
    column-gap:clamp(28px,6vw,88px);row-gap:clamp(22px,3vw,36px);margin-top:clamp(18px,4vw,52px);align-items:start}
  .kopf{grid-area:kopf}.standort{grid-area:stand;position:sticky;top:28px}.zettel{grid-area:zettel}
  .marke{color:var(--emerald-soft);font-weight:600;font-size:15px;margin-bottom:16px}
  h1{font-family:var(--ff-serif);font-weight:450;font-size:clamp(2.2rem,1.3rem + 3.4vw,3.9rem);line-height:1.03;letter-spacing:-.022em;text-wrap:balance;margin-bottom:16px}
  h1 em,.st-kopf em{font-style:italic;background:linear-gradient(135deg,#1FC998,#46BEEA);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:var(--emerald-soft)}
  .lead{color:#B4B9B6;font-size:1.12rem;max-width:44ch}

  /* ── Prüfstand: das Gerät im Licht, links die Messleiste ── */
  .stand-rahmen{position:relative;display:grid;grid-template-columns:18px minmax(0,1fr);gap:12px;perspective:1100px}
  .leiste-mess{position:relative;border-right:1px solid rgba(242,243,241,.26);
    background:repeating-linear-gradient(180deg,rgba(242,243,241,.30) 0 1px,transparent 1px 5%) right/9px 100% no-repeat,
      repeating-linear-gradient(180deg,rgba(242,243,241,.34) 0 1px,transparent 1px 25%) right/18px 100% no-repeat}
  .leiste-mess i{position:absolute;inset:0;background:
      repeating-linear-gradient(180deg,#1FC998 0 1px,transparent 1px 5%) right/9px 100% no-repeat,
      repeating-linear-gradient(180deg,#46BEEA 0 1px,transparent 1px 25%) right/18px 100% no-repeat;
    filter:drop-shadow(0 0 5px rgba(31,201,152,.9));clip-path:inset(0 0 100% 0)}
  .liegt .leiste-mess i{clip-path:inset(0 0 0 0);transition:clip-path 1.3s var(--e-out)}
  .geraet{position:relative;aspect-ratio:9/16;border-radius:30px;overflow:hidden;cursor:pointer;display:block;
    background:linear-gradient(160deg,#101D21,#070D10 60%);transform:rotateX(var(--kx,0deg)) rotateY(var(--ky,0deg));transition:transform .5s var(--e-out);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.13),inset 0 1px 0 rgba(255,255,255,.22),0 1px 1px rgba(0,0,0,.5),0 12px 22px -8px rgba(0,0,0,.6),0 50px 80px -30px rgba(0,0,0,.9),0 0 90px -30px rgba(31,201,152,.35)}
  .geraet::before{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:inherit;
    background:radial-gradient(70% 45% at var(--gx,30%) var(--gy,0%),rgba(255,255,255,.16),transparent 70%)}
  .geraet:focus-within{outline:2px solid var(--emerald-soft);outline-offset:4px}
  .geraet input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:4}
  .geraet video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .6s var(--e-out)}
  .liegt .geraet video.zeigt{opacity:1}
  .leer,.voll{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:22px;text-align:center}
  .leer::before{content:"";position:absolute;inset:14px;border-radius:20px;border:1px dashed rgba(242,243,241,.24)}
  .ziehen .leer::before{border-color:var(--emerald-soft);background:rgba(31,201,152,.08)}
  .knopf{position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 24px;border-radius:12px;border:0;cursor:pointer;
    font:600 17px var(--ff-body);color:#04201A;background:linear-gradient(135deg,#1FC998,#46BEEA);box-shadow:0 14px 30px -14px rgba(31,201,152,.8);transition:transform var(--dur-2) var(--e-out)}
  .knopf:hover{transform:translateY(-2px)}
  .knopf:focus-visible,.zeile:focus-within,.feld:focus-visible,.haken input:focus-visible,a:focus-visible{outline:2px solid var(--emerald-soft);outline-offset:3px}
  .klein{color:var(--muted);font-size:15px}
  .voll{justify-content:flex-end;padding-bottom:20px;background:linear-gradient(180deg,transparent 38%,rgba(3,8,13,.82) 62%,rgba(3,8,13,.96));opacity:0;pointer-events:none}
  .liegt .voll{opacity:1;transition:opacity .5s .5s}.liegt .leer{opacity:0;transition:opacity .3s}
  .voll b{font-family:var(--ff-serif);font-weight:450;font-size:1.3rem}.voll .klein{color:#DDE1DE}
  .voll u{text-decoration:underline;text-underline-offset:3px;color:var(--ink);font-size:15px}
  .lampe{width:11px;height:11px;border-radius:50%;flex:none;background:rgba(242,243,241,.28)}
  .voll .lampe{background:#1FC998;box-shadow:0 0 10px #1FC998}
  .voll p{display:flex;align-items:center;gap:9px}
  /* der eine Moment: beim Auflegen fährt einmal das Messlicht über das Reel */
  .licht{position:absolute;left:0;right:0;top:0;height:26%;z-index:3;pointer-events:none;opacity:0;
    background:linear-gradient(180deg,transparent,rgba(31,201,152,.26) 70%,rgba(70,190,234,.75) 98%,transparent)}
  .liegt .licht{animation:fahrt 1.3s var(--e-out) both}
  @keyframes fahrt{0%{opacity:0;transform:translateY(-100%)}15%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translateY(385%)}}
  .standort .boden-schein{height:26px;margin:14px 30px 0;border-radius:50%;background:radial-gradient(50% 100% at 50% 0%,rgba(31,201,152,.34),transparent 72%);filter:blur(2px)}

  /* ── Annahmezettel ── */
  .zettel{border-radius:20px;padding:clamp(20px,3vw,32px);background:linear-gradient(180deg,rgba(16,27,32,.92),rgba(10,18,22,.92));
    box-shadow:inset 0 0 0 1px var(--hair),inset 0 1px 0 rgba(255,255,255,.07),0 40px 80px -40px #000}
  .zettel h2{font-family:var(--ff-serif);font-weight:450;font-size:1.5rem;line-height:1.15;margin-bottom:22px}
  fieldset{border:0;min-width:0}
  .frage{margin-bottom:26px}
  .frage > label,legend{display:block;font-weight:600;font-size:17px;margin-bottom:8px;padding:0}
  .hilfe{color:var(--muted);font-size:15px;margin:-2px 0 10px}
  .feld{width:100%;min-height:52px;padding:12px 14px;border-radius:12px;border:1px solid var(--hair-2);background:rgba(3,8,13,.6);color:var(--ink);font:17px var(--ff-body)}
  .feld:hover{border-color:rgba(242,243,241,.3)}
  .wahl{display:grid;gap:8px}
  .zeile{position:relative;display:flex;align-items:center;gap:13px;min-height:52px;padding:10px 14px;border-radius:12px;border:1px solid var(--hair-2);cursor:pointer;
    transition:border-color var(--dur-2),background var(--dur-2)}
  .zeile:hover{border-color:rgba(242,243,241,.3)}
  .zeile input{position:absolute;opacity:0;inset:0;width:100%;height:100%;cursor:pointer;margin:0}
  .zeile:has(input:checked){border-color:rgba(31,201,152,.7);background:rgba(31,201,152,.09)}
  .zeile:has(input:checked) .lampe{background:#1FC998;box-shadow:0 0 10px #1FC998}
  .haken{display:grid;grid-template-columns:26px minmax(0,1fr);gap:13px;align-items:start;margin:4px 0 20px;color:#B4B9B6;font-size:15.5px;line-height:1.5}
  .haken input{width:26px;height:26px;margin:0;accent-color:#1FC998;cursor:pointer}
  .haken label{cursor:pointer}
  .haken a,.fuss a{color:var(--ink);text-underline-offset:3px}
  .honig{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
  .turnstile-wrap{min-height:65px;margin-bottom:16px}
  .zettel .knopf{width:100%}
  .melde{margin-top:14px;padding:12px 14px;border-radius:12px;background:rgba(240,121,107,.10);box-shadow:inset 0 0 0 1px rgba(240,121,107,.45);color:#FFD9D3;font-size:16px}
  .melde.gut{background:rgba(31,201,152,.10);box-shadow:inset 0 0 0 1px rgba(31,201,152,.45);color:#D6FFF2}
  /* Messstreifen wie im Befund */
  .streifen{position:relative;height:22px;margin:18px 0 10px;border-right:1px solid rgba(242,243,241,.28);background:repeating-linear-gradient(90deg,rgba(242,243,241,.28) 0 1px,transparent 1px 10%)}
  .streifen::before{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(242,243,241,.14)}
  .streifen u{position:absolute;left:0;top:50%;height:6px;margin-top:-3px;width:100%;border-radius:0 6px 6px 0;background:linear-gradient(90deg,#1FC998,#46BEEA);box-shadow:0 0 14px rgba(31,201,152,.6);
    transform-origin:0 50%;transform:scaleX(var(--w,0));transition:transform .4s linear}
  .lauf-zahl{font-family:var(--ff-serif);font-size:2.6rem;line-height:1;font-variant-numeric:tabular-nums}
  .lauf h2,.quittung h2{margin-bottom:10px}
  .quittung p,.lauf p{color:#B4B9B6;margin-bottom:14px;max-width:46ch}
  .knopf.leer-k{background:none;color:var(--ink);box-shadow:inset 0 0 0 1px rgba(242,243,241,.32)}
  .fuss{margin-top:56px;color:var(--faint);font-size:15px;display:flex;gap:18px;flex-wrap:wrap}
  .fuss a{display:inline-flex;align-items:center;min-height:44px;color:var(--muted)}
  /* Stand-Seite */
  .st-kopf{max-width:36rem;margin-top:clamp(40px,10vh,120px)}
  .st-kopf h1{font-size:clamp(2rem,1.3rem + 2.6vw,3.2rem)}
  .st-kopf p{color:#B4B9B6;font-size:1.12rem;margin-bottom:26px;max-width:44ch}
  .st-kopf .streifen u{transform:none;width:38%;animation:pendel 2.2s var(--e-out) 3 both}
  @keyframes pendel{0%{transform:translateX(0)}50%{transform:translateX(163%)}100%{transform:translateX(0)}}

  @media (max-width:820px){
    .buehne{grid-template-columns:minmax(0,1fr);grid-template-areas:"kopf" "stand" "zettel"}
    .standort{position:static;max-width:300px;width:100%;margin:0 auto}
    .geraet{aspect-ratio:auto;height:clamp(210px,36vh,300px)}
    .liegt .geraet{height:clamp(300px,52vh,420px)}
    .lead{font-size:1.05rem}
    .standort .boden-schein{display:none}
  }
  @media (prefers-reduced-motion:reduce){.geraet{transform:none}.liegt .licht{animation:none;opacity:0}.st-kopf .streifen u{animation:none;width:100%}}
`;

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function kopfleiste(T) {
  return `<header class="leiste"><a href="${T.start}"><img class="wm-logo" src="https://social2scale.com/assets/sig-wordmark.png" alt="social2scale" width="178" height="26"></a>
    <a class="sprache" href="${T.andere[0]}" hreflang="${T.andere[2]}" lang="${T.andere[2]}">${T.andere[1]}</a></header>`;
}

function markup(T, siteKey) {
  return `<div class="rc">${kopfleiste(T)}
  <main class="buehne" id="buehne">
    <div class="kopf"><p class="marke">${T.marke}</p><h1>${T.h1}</h1><p class="lead">${T.lead}</p></div>
    <div class="standort" id="standort">
      <div class="stand-rahmen">
        <div class="leiste-mess" aria-hidden="true"><i></i></div>
        <label class="geraet" id="geraet">
          <input type="file" id="datei" accept="video/mp4,video/quicktime,.mp4,.mov" aria-label="${T.waehlen}">
          <video id="vorschau" muted playsinline loop aria-hidden="true"></video>
          <span class="licht" aria-hidden="true"></span>
          <span class="leer"><span class="knopf" aria-hidden="true">${T.waehlen}</span><span class="klein">${T.format}<span class="nur-maus"><br>${T.ziehen}</span></span></span>
          <span class="voll"><p><span class="lampe" aria-hidden="true"></span><b>${T.liegt}</b></p><span class="klein" id="masse"></span><u>${T.anderes}</u></span>
        </label>
      </div>
      <div class="boden-schein" aria-hidden="true"></div>
    </div>
    <section class="zettel" id="zettel" aria-live="polite">
      <form id="form" novalidate>
        <h2>${T.zettel}</h2>
        <div class="frage"><label for="zielgruppe">${T.f1}</label><p class="hilfe" id="f1h">${T.f1h}</p>
          <input class="feld" id="zielgruppe" name="zielgruppe" type="text" maxlength="200" autocomplete="off" aria-describedby="f1h"></div>
        <fieldset class="frage"><legend>${T.f2}</legend><div class="wahl">
          <label class="zeile"><input type="radio" name="spricht" value="ja"><span class="lampe" aria-hidden="true"></span><span>${T.f2a}</span></label>
          <label class="zeile"><input type="radio" name="spricht" value="nein"><span class="lampe" aria-hidden="true"></span><span>${T.f2b}</span></label></div></fieldset>
        <fieldset class="frage"><legend>${T.f3}</legend><div class="wahl">
          <label class="zeile"><input type="radio" name="lage" value="besser"><span class="lampe" aria-hidden="true"></span><span>${T.f3a}</span></label>
          <label class="zeile"><input type="radio" name="lage" value="anfang"><span class="lampe" aria-hidden="true"></span><span>${T.f3b}</span></label>
          <label class="zeile"><input type="radio" name="lage" value="keine_zeit"><span class="lampe" aria-hidden="true"></span><span>${T.f3c}</span></label></div></fieldset>
        <div class="frage"><label for="email">${T.mail}</label>
          <input class="feld" id="email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="160" placeholder="${T.mailh}"></div>
        <div class="honig" aria-hidden="true"><label>Website<input type="text" name="website" id="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="haken"><input type="checkbox" id="einwilligung"><label for="einwilligung">${T.haken} ${T.mehr} <a href="${T.dsUrl}" target="_blank" rel="noopener">${T.ds}</a>.</label></div>
        <div class="turnstile-wrap"><div class="cf-turnstile" id="ts" data-sitekey="${esc(siteKey)}" data-theme="dark"></div></div>
        <button class="knopf" type="submit">${T.senden}</button>
        <p class="melde" id="melde" role="alert" hidden></p>
      </form>
    </section>
  </main>
  <footer class="fuss"><a href="${T.impressumUrl}">${T.impressum}</a><a href="${T.dsUrl}">${T.dsFuss}</a></footer>
</div>`;
}

/* Skript der Annahme-Seite. Bewusst ohne Template-Zeichen, damit es unverändert in die Seite passt. */
function seitenSkript() {
  var T = window.RC_T, LANG = document.documentElement.lang, MAX = window.RC_MAX, START = Date.now();
  var $ = function (id) { return document.getElementById(id); };
  var datei = null, lauf = null, ruhig = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var form = $('form'), melde = $('melde'), zettel = $('zettel'), standort = $('standort'), geraet = $('geraet'), video = $('vorschau');

  function sag(schluessel, gut) {
    melde.textContent = T.fehler[schluessel] || T[schluessel] || T.fehler.sonst;
    melde.className = 'melde' + (gut ? ' gut' : ''); melde.hidden = false;
  }
  function mb(n) { return (n / 1048576).toLocaleString(LANG, { maximumFractionDigits: 1 }) + ' MB'; }
  function dauer(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  function nimm(f) {
    if (!f) return;
    var art = (f.type || '').toLowerCase(), name = (f.name || '').toLowerCase();
    if (!art) art = /\.mov$/.test(name) ? 'video/quicktime' : /\.mp4$/.test(name) ? 'video/mp4' : '';
    if (art !== 'video/mp4' && art !== 'video/quicktime') return sag('video_art');
    if (f.size > MAX) return sag('video_gross');
    if (f.size < 204800) return sag('video_klein');
    datei = { f: f, art: art }; melde.hidden = true;
    $('masse').textContent = mb(f.size);
    standort.classList.remove('liegt'); video.classList.remove('zeigt');
    if (video.src) URL.revokeObjectURL(video.src);
    video.src = URL.createObjectURL(f);
    video.onloadedmetadata = function () { if (isFinite(video.duration)) $('masse').textContent = dauer(video.duration) + ' · ' + mb(f.size); };
    video.onloadeddata = function () { video.classList.add('zeigt'); if (!ruhig) video.play().catch(function () {}); };
    video.onerror = function () { $('masse').textContent = mb(f.size) + ' · ' + T.ohneBild; };
    requestAnimationFrame(function () { standort.classList.add('liegt'); });
    // am Handy steht der Zettel unter dem Prüfstand: nach dem Auflegen dorthin, an den Kopf
    if (matchMedia('(max-width:820px)').matches) setTimeout(function () { zettel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' }); }, ruhig ? 0 : 1300);
  }
  $('datei').addEventListener('change', function (e) { nimm(e.target.files[0]); });
  // eine Meldung gilt, bis sie etwas ändert: dann verschwindet sie
  form.addEventListener('input', function () { melde.hidden = true; });
  ['dragenter', 'dragover'].forEach(function (n) { geraet.addEventListener(n, function (e) { e.preventDefault(); geraet.classList.add('ziehen'); }); });
  ['dragleave', 'drop'].forEach(function (n) { geraet.addEventListener(n, function (e) { e.preventDefault(); geraet.classList.remove('ziehen'); }); });
  geraet.addEventListener('drop', function (e) { nimm(e.dataTransfer.files[0]); });

  // das Gerät kippt leicht zur Maus, der Glanz wandert mit (nur mit Maus, nie bei ruhiger Darstellung)
  if (!ruhig && matchMedia('(pointer:fine)').matches) {
    var wartet = false;
    document.addEventListener('pointermove', function (e) {
      if (wartet) return; wartet = true;
      requestAnimationFrame(function () {
        wartet = false;
        var r = geraet.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / innerWidth, y = (e.clientY - r.top - r.height / 2) / innerHeight;
        geraet.style.setProperty('--ky', (x * 9).toFixed(2) + 'deg'); geraet.style.setProperty('--kx', (-y * 7).toFixed(2) + 'deg');
        geraet.style.setProperty('--gx', (50 + x * 90).toFixed(0) + '%'); geraet.style.setProperty('--gy', (30 + y * 90).toFixed(0) + '%');
      });
    }, { passive: true });
  } else {
    var nm = document.querySelector('.nur-maus'); if (nm && !matchMedia('(pointer:fine)').matches) nm.hidden = true;
  }

  function token() {
    try { return window.turnstile ? (turnstile.getResponse($('ts')) || '') : ''; } catch (e) { return ''; }
  }
  function wert(name) { var el = form.querySelector('input[name=' + name + ']:checked'); return el ? el.value : ''; }

  function zeigeLauf() {
    zettel.innerHTML = '<div class="lauf"><h2 id="lauf-kopf" tabindex="-1"></h2><p class="lauf-zahl" id="lauf-zahl">0 %</p>' +
      '<div class="streifen" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="lauf-s"><u></u></div><p id="lauf-text"></p>' +
      '<p class="melde" id="melde2" role="alert" hidden></p><button class="knopf" id="weiter" type="button" hidden></button></div>';
    $('lauf-kopf').textContent = T.kommt; $('lauf-text').textContent = T.offen; $('weiter').textContent = T.weiter;
    $('weiter').addEventListener('click', function () { $('weiter').hidden = true; $('melde2').hidden = true; laden(); });
    zettel.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' }); $('lauf-kopf').focus({ preventScroll: true });
  }
  function stand(anteil) {
    var p = Math.min(100, Math.floor(anteil * 100));
    $('lauf-zahl').textContent = p + ' %'; $('lauf-s').setAttribute('aria-valuenow', p); $('lauf-s').firstChild.style.setProperty('--w', anteil.toFixed(4));
  }
  // Erst lesen, dann senden: Safari schickt sonst gelegentlich einen leeren Teil, wenn es die Datei gerade nicht lesen kann
  // (gemessen 15.11.2026: 2 von 8 Läufen in WebKit, Länge 0). Ein kurz gelesener Teil wird gar nicht erst geschickt.
  async function teilSenden(nr) {
    var von = (nr - 1) * lauf.teil, bis = Math.min(datei.f.size, nr * lauf.teil), stueck;
    try { stueck = await datei.f.slice(von, bis).arrayBuffer(); } catch (e) { throw 'lesen'; }
    if (stueck.byteLength !== bis - von) throw 'lesen';
    return new Promise(function (ok, nein) {
      var x = new XMLHttpRequest();
      x.open('PUT', '/api/reel-check/teil/' + lauf.token + '/' + nr);
      x.responseType = 'json';
      x.upload.onprogress = function (e) { stand((von + e.loaded) / datei.f.size); };
      x.onload = function () { if (x.status === 200 && x.response && x.response.etag) ok(x.response.etag); else nein((x.response && x.response.error) || 'netz'); };
      x.onerror = x.ontimeout = function () { nein('netz'); };
      x.send(stueck);
    });
  }
  function stolper(schluessel) {
    var m = $('melde2'); m.textContent = T.fehler[schluessel] || T.fehler.sonst; m.hidden = false; $('weiter').hidden = false;
  }
  async function laden() {
    try {
      while (lauf.etags.length < lauf.teile) {
        var nr = lauf.etags.length + 1, etag = null, letzter = 'netz';
        for (var v = 0; v < 3 && !etag; v++) {
          try { etag = await teilSenden(nr); } catch (e) { letzter = e; if (e !== 'netz' && e !== 'backend' && e !== 'lesen' && e !== 'teil') break; await new Promise(function (r) { setTimeout(r, 1200 * (v + 1)); }); }
        }
        if (!etag) return stolper(letzter === 'backend' ? 'netz' : letzter === 'teil' ? 'lesen' : letzter);
        lauf.etags.push({ nr: nr, etag: etag });
      }
      stand(1);
      var r = await fetch('/api/reel-check/fertig/' + lauf.token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teile: lauf.etags }) });
      var d = await r.json().catch(function () { return {}; });
      if (r.ok && d.ok) return quittung(false);
      if (d.error === 'mail') return quittung(true);
      stolper(d.error === 'backend' ? 'netz' : d.error);
    } catch (e) { stolper('netz'); }
  }
  // Quittung erst, wenn der Server das Video bestätigt hat
  function quittung(mailFehlt) {
    zettel.innerHTML = '<div class="quittung"><h2 id="q-kopf" tabindex="-1"></h2><p id="q-text"></p><p class="klein" id="q-spam"></p>' +
      '<button class="knopf leer-k" id="nochmal" type="button"></button><p class="melde" id="melde3" role="alert" hidden></p></div>';
    $('q-kopf').textContent = T.da; $('q-text').textContent = T.post; $('q-spam').textContent = T.spam; $('nochmal').textContent = T.nochmal;
    var m = $('melde3');
    if (mailFehlt) { m.textContent = T.fehler.mail; m.hidden = false; }
    $('nochmal').addEventListener('click', async function () {
      try {
        var r = await fetch('/api/reel-check/nochmal/' + lauf.token, { method: 'POST' });
        m.textContent = r.ok ? T.raus : r.status === 429 ? T.gleich : T.fehler.mail; m.className = 'melde' + (r.ok ? ' gut' : ''); m.hidden = false;
      } catch (e) { m.textContent = T.fehler.sonst; m.className = 'melde'; m.hidden = false; }
    });
    $('q-kopf').focus({ preventScroll: true });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!datei) { sag('datei'); geraet.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'center' }); return; }
    var daten = { email: $('email').value.trim(), zielgruppe: $('zielgruppe').value.trim(), spricht: wert('spricht'), lage: wert('lage'),
      einwilligung: $('einwilligung').checked, website: $('website').value, elapsed: Date.now() - START,
      bytes: datei.f.size, mime: datei.art, sprache: LANG === 'en' ? 'en' : 'de', turnstile: token() };
    // dieselbe Reihenfolge wie auf dem Zettel: die erste offene Stelle wird genannt und angesprungen
    var luecke = daten.zielgruppe.length < 3 ? ['zielgruppe', $('zielgruppe')] : !daten.spricht ? ['spricht', form.querySelector('input[name=spricht]')] :
      !daten.lage ? ['lage', form.querySelector('input[name=lage]')] : !/^\S+@\S+\.\S+$/.test(daten.email) ? ['email', $('email')] :
      !daten.einwilligung ? ['einwilligung', $('einwilligung')] : (window.turnstile && !daten.turnstile) ? ['captcha', null] : null;
    if (luecke) { sag(luecke[0]); if (luecke[1]) luecke[1].focus(); return; }
    var knopf = form.querySelector('button[type=submit]'); knopf.disabled = true;
    try {
      var r = await fetch('/api/reel-check/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(daten) });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok || !d.ok) { knopf.disabled = false; try { if (window.turnstile) turnstile.reset($('ts')); } catch (x) {} return sag(d.error || 'sonst'); }
      lauf = { token: d.token, teil: d.teil, teile: d.teile, etags: [] };
      zeigeLauf(); laden();
    } catch (x) { knopf.disabled = false; sag('sonst'); }
  });

  // Seitenaufruf zählen wie im Funnel: ohne Cookie, ohne Kennung (closing /api/pv)
  try {
    if (navigator.doNotTrack !== '1' && localStorage.getItem('s2s-zaehlen') !== 'aus') {
      var pv = JSON.stringify({ p: location.pathname, r: document.referrer || '', d: matchMedia('(max-width:759px)').matches ? 'mobil' : 'desktop' });
      if (navigator.sendBeacon) navigator.sendBeacon('https://closing.social2scale.com/api/pv', new Blob([pv], { type: 'text/plain;charset=UTF-8' }));
    }
  } catch (e) {}
}

/** Annahme-Seite. */
export function reelCheckSeite(env, lang = 'de') {
  const T = TEXTE[lang === 'en' ? 'en' : 'de'];
  const siteKey = env?.TURNSTILE_SITE_KEY || DEFAULT_TURNSTILE_SITE_KEY;
  const basis = 'https://start.social2scale.com';
  const head =
    `<meta name="description" content="${esc(T.beschreibung)}">` +
    `<meta property="og:title" content="${esc(T.titel)}"><meta property="og:description" content="${esc(T.beschreibung)}">` +
    `<meta property="og:type" content="website"><meta property="og:url" content="${basis}${T.pfad}">` +
    '<meta property="og:image" content="https://social2scale.com/assets/og-image.png">' +
    `<link rel="canonical" href="${basis}${T.pfad}">` +
    `<link rel="alternate" hreflang="de" href="${basis}/reel-check/"><link rel="alternate" hreflang="en" href="${basis}/en/reel-check/"><link rel="alternate" hreflang="x-default" href="${basis}/reel-check/">` +
    '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' +
    `<style>${STIL}</style>`;
  const daten = JSON.stringify(T.js).replace(/</g, '\\u003c');
  const body = `${markup(T, siteKey)}<script>window.RC_T=${daten};window.RC_MAX=${MAX_BYTES};(${seitenSkript.toString()})();</script>`;
  return htmlDoc({ title: T.titel, head, body, lang });
}

/** Stand-Seite /rc/<token>: wartet auf Bestätigung · wird geprüft · Befund · Fehler · gelöscht. */
export function reelCheckStandSeite({ status, sprache = 'de', befund = '', token = '' }) {
  const lang = sprache === 'en' ? 'en' : 'de';
  const T = TEXTE[lang];
  if (status === 'fertig' && befund) {
    // Der Befund kommt fertig vom Mac (seite.py maskiert jeden Satz, kein Skript). Die strenge CSP gilt auch hier.
    return new Response(befund, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...SICHERHEITS_HEADER, 'X-Robots-Tag': 'noindex' } });
  }
  const art = status === 'wartet' ? 'wartet' : status === 'da' || status === 'in_arbeit' || status === 'fertig' ? 'prueft' : status === 'fehler' ? 'fehler' : 'weg';
  const [kopf, text] = T.stand[art];
  const laeuft = art === 'wartet' || art === 'prueft';
  const body = `<div class="rc">${kopfleiste(T)}<main class="st-kopf"><p class="marke">${T.marke}</p><h1>${kopf}</h1><p>${text}</p>` +
    (laeuft ? '<div class="streifen" aria-hidden="true"><u></u></div>' : `<a class="knopf" href="${T.pfad}">${T.stand.neu}</a>`) +
    `</main><footer class="fuss"><a href="${T.impressumUrl}">${T.impressum}</a><a href="${T.dsUrl}">${T.dsFuss}</a></footer></div>` +
    // Ändert sich der Stand, lädt die Seite neu. Fragt nur, solange sie sichtbar ist.
    (laeuft && /^[a-f0-9]{48}$/.test(token)
      ? `<script>(function(){var alt=${JSON.stringify(status)};setInterval(function(){if(document.hidden)return;fetch('/api/reel-check/status/${token}').then(function(r){return r.json()}).then(function(d){if(d.status&&d.status!==alt)location.reload()}).catch(function(){})},20000)})();</script>`
      : '');
  const antwort = htmlDoc({ title: T.titel, head: `<meta name="robots" content="noindex"><style>${STIL}</style>`, body, lang });
  antwort.headers.set('X-Robots-Tag', 'noindex');
  return antwort;
}
