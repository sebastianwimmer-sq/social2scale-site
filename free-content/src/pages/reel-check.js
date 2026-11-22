/**
 * Reel-Check: Annahme-Seite (/reel-check/ und /en/reel-check/) und Stand-Seite (/rc/<token>).
 *
 * Strecke (Sebi 21.11.2026): Einstieg (der Befund liegt verhüllt da) → EIN Schirm mit Fragen (Video, Plattform, Vorname,
 * Adresse, Haken) → Ladescreen (ihr eigenes Bild wird mit dem Fortschritt scharf, darauf nur die Zahl; sie hält bei 96,
 * bis der Server das Video bestätigt hat) → Quittung. Auf der Stand-Seite laufen beim Prüfen Hinweise durch.
 * Zielgruppe, „spricht selbst“ und Lage fragt die Seite nicht mehr, der Check erkennt Sprache selbst.
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
    h1: 'Was sehen andere in deinem <em>Reel?</em>',
    lead: 'Lad eins hoch und finde es heraus. Kostenlos, der Befund kommt per Mail.',
    wo: 'Reel oder Kurzvideo. Von Instagram, TikTok, Facebook, LinkedIn oder YouTube.',
    los: 'Zeig es mir', termin: 'Termin mit Phil wählen', terminUrl: 'https://calendly.com/philipplibowicz/neues-meeting',
    waehlen: 'Video auswählen', ziehen: 'oder hierher ziehen', format: `MP4 oder MOV, bis ${MAX_MB} MB`, anderes: 'Anderes Video wählen',
    liegt: 'Ausgewählt', ohneBild: 'Dein Browser zeigt dieses Video nicht an. Ausgewählt ist es trotzdem.',
    zettel: 'Welches Reel sollen wir uns <em>ansehen?</em>',
    f1: 'Wo postest du es?', vorname: 'Dein Vorname', telefon: 'Handynummer', telefonh: 'Freiwillig. Nur wenn Phil dich zu deinem Befund anrufen darf.',
    mail: 'Wohin soll der Befund?', mailh: 'Deine E-Mail-Adresse',
    haken: `Ich bin einverstanden, dass social2scale mein Reel prüft, dabei die gesprochenen Worte und den Text im Bild von einer KI (Claude von Anthropic) auswerten lässt und mir den Befund per E-Mail schickt. Das Reel ist mein eigenes. Video und Befund werden nach ${LOESCH_FRIST_TAGE} Tagen gelöscht. Was wir daraus über Reels lernen, behalten wir ohne meinen Namen.`,
    mehr: 'Mehr dazu in der', ds: 'Datenschutzerklärung', dsFuss: 'Datenschutz', dsUrl: 'https://social2scale.com/datenschutz/#reel-check',
    senden: 'Reel prüfen lassen',
    impressum: 'Impressum', impressumUrl: 'https://social2scale.com/impressum/',
    js: {
      kommt: 'Dein Reel kommt an', offen: 'Lass die Seite offen, bis dein Video bei uns liegt.', weiter: 'Weiter hochladen',
      prueft: 'Wir sehen uns dein Reel an', bleib: 'Das dauert ein paar Minuten. Dein Befund erscheint gleich hier, und wir schicken ihn dir zusätzlich per Mail.',
      lang: 'Heute dauert es länger als sonst. Du kannst die Seite schließen, dein Befund kommt per Mail, sobald er fertig ist.',
      tun: ['Wir sehen uns dein Bild an', 'Wir hören deinen Ton ab', 'Wir lesen deinen Text im Bild', 'Wir gehen deinen Einstieg durch', 'Wir schreiben deine Vorschläge'],
      tipps: [['Die ersten drei Sekunden entscheiden.', 'Instagram misst, wie viele in den ersten 3 Sekunden weiterwischen.'], ['Text gehört in die Mitte.', 'Oben und unten liegen Knöpfe und Bildunterschrift darüber.'], ['Viele schauen ohne Ton.', 'Untertitel tragen deinen Satz auch dann.'], ['Ein Gedanke je Reel.', 'Unsere Arbeitsregel aus der täglichen Arbeit an Reels.']],
      fehler: {
        datei: 'Wähl zuerst dein Reel aus.',
        video_art: 'Das ist kein MP4 oder MOV. Speichere das Reel als Video auf deinem Gerät und wähl es nochmal aus.',
        video_gross: `Das Video ist größer als ${MAX_MB} MB. Exportier es in 1080p, dann passt es.`,
        video_klein: 'Die Datei ist zu klein für ein Reel. Wähl das fertige Video aus.',
        email: 'Bitte prüf deine E-Mail-Adresse.', email_domain: 'An diese Adresse können wir nichts schicken. Bitte prüf sie.', disposable: 'Bitte nimm eine Adresse, die du dauerhaft nutzt.',
        zielgruppe: 'Schreib in ein paar Worten, wen du erreichen willst.', spricht: 'Bitte wähl eine Antwort aus.', lage: 'Bitte wähl eine Antwort aus.', plattform: 'Bitte wähl aus, wo du postest.', telefon: 'Die Handynummer sieht nicht richtig aus. Prüf sie oder lass das Feld leer.',
        schon: 'Deinen kostenlosen Check hast du schon genutzt. Jeden weiteren Beitrag sehen wir uns in der Betreuung an, such dir dafür oben einen Termin mit Phil aus.',
        einwilligung: 'Ohne dein Einverständnis dürfen wir das Reel nicht prüfen. Setz den Haken, wenn du einverstanden bist.',
        captcha: 'Die Sicherheitsprüfung läuft noch oder hat nicht geklappt. Warte einen Moment und tipp nochmal.',
        rate_limited: 'Das waren viele Versuche. Bitte versuch es in einer Stunde nochmal.',
        lesen: 'Dein Gerät gibt die Datei gerade nicht her. Tipp auf „Weiter hochladen“. Klappt es nicht, lad die Seite neu und wähl das Reel nochmal aus.',
        netz: 'Die Verbindung ist abgerissen. Dein Reel ist nicht verloren, tipp auf „Weiter hochladen“.',
        sonst: 'Das hat gerade nicht geklappt. Bitte versuch es gleich nochmal.',
      },
    },
    stand: {
      wartet: ['Bestätige deine <em>Adresse</em>', 'Wir haben dir eine Mail geschickt. Ein Klick darin, dann prüfen wir dein Reel.'],
      prueft: ['Wir sehen uns dein <em>Reel</em> an', 'Der Befund kommt per Mail, sobald er fertig ist. Du kannst diese Seite schließen oder hier warten.'],
      tun: ['Wir sehen uns dein Bild an', 'Wir hören deinen Ton ab', 'Wir lesen deinen Text im Bild', 'Wir gehen deinen Einstieg durch', 'Wir schreiben deine Vorschläge'],
      fehler: ['Das hat nicht <em>geklappt</em>', 'Wir konnten dieses Reel nicht prüfen. Lad es bitte nochmal hoch.'],
      weg: ['Diesen Befund gibt es <em>nicht mehr</em>', `Befunde löschen wir nach ${LOESCH_FRIST_TAGE} Tagen.`],
      neu: 'Reel hochladen',
    },
  },
  en: {
    pfad: '/en/reel-check/', andere: ['/reel-check/', 'Deutsch', 'de'], start: 'https://social2scale.com/en/',
    titel: 'Reel Check · social2scale',
    beschreibung: 'Upload a reel and get the report by email: 50 checkpoints, one score from 0 to 100. Free.',
    marke: 'social2scale · Reel Check',
    h1: 'What do others see in your <em>reel?</em>',
    lead: 'Upload one and find out. Free, the report arrives by email.',
    wo: 'A reel or short video. From Instagram, TikTok, Facebook, LinkedIn or YouTube.',
    los: 'Show me', termin: 'Pick a call with Phil', terminUrl: 'https://calendly.com/philipplibowicz/neues-meeting',
    waehlen: 'Choose a video', ziehen: 'or drop it here', format: `MP4 or MOV, up to ${MAX_MB} MB`, anderes: 'Choose a different video',
    liegt: 'Selected', ohneBild: 'Your browser can’t show this video. It’s still selected.',
    zettel: 'Which reel should we <em>look at?</em>',
    f1: 'Where do you post it?', vorname: 'Your first name', telefon: 'Mobile number', telefonh: 'Optional. Only if Phil may call you about your report.',
    mail: 'Where should the report go?', mailh: 'Your email address',
    haken: `I agree that social2scale checks my reel, has an AI (Claude by Anthropic) evaluate the spoken words and on-screen text, and emails me the report. The reel is my own. Video and report are deleted after ${LOESCH_FRIST_TAGE} days. What we learn about reels from it, we keep without my name.`,
    mehr: 'More in our', ds: 'privacy policy', dsFuss: 'Privacy', dsUrl: 'https://social2scale.com/en/privacy/#reel-check',
    senden: 'Check my reel',
    impressum: 'Legal notice', impressumUrl: 'https://social2scale.com/impressum/',
    js: {
      kommt: 'Your reel is on its way', offen: 'Keep this page open until we have your video.', weiter: 'Continue upload',
      prueft: 'We’re looking at your reel', bleib: 'This takes a few minutes. Your report appears right here, and we also send it to you by email.',
      lang: 'It’s taking longer than usual today. You can close this page, your report will arrive by email as soon as it’s ready.',
      tun: ['We’re looking at your picture', 'We’re listening to your sound', 'We’re reading your on-screen text', 'We’re going through your opening', 'We’re writing your suggestions'],
      tipps: [['The first three seconds decide.', 'Instagram measures how many swipe away within the first 3 seconds.'], ['Text belongs in the middle.', 'Buttons and the caption sit on top at the top and bottom.'], ['Many watch without sound.', 'Captions carry your sentence even then.'], ['One idea per reel.', 'Our working rule from making reels every day.']],
      fehler: {
        datei: 'Choose your reel first.',
        video_art: 'That’s not an MP4 or MOV. Save the reel as a video on your device and choose it again.',
        video_gross: `The video is larger than ${MAX_MB} MB. Export it in 1080p and it will fit.`,
        video_klein: 'The file is too small to be a reel. Choose the finished video.',
        email: 'Please check your email address.', email_domain: 'We can’t send anything to this address. Please check it.', disposable: 'Please use an address you keep.',
        zielgruppe: 'Tell us in a few words who you want to reach.', spricht: 'Please pick an answer.', lage: 'Please pick an answer.', plattform: 'Please choose where you post.', telefon: 'That mobile number doesn’t look right. Check it or leave the field empty.',
        schon: 'You’ve already used your free check. We look at every further post as part of our service, pick a call with Phil at the top for that.',
        einwilligung: 'We can’t check the reel without your consent. Tick the box if you agree.',
        captcha: 'The security check is still running or didn’t work. Wait a moment and tap again.',
        rate_limited: 'That was a lot of attempts. Please try again in an hour.',
        lesen: 'Your device isn’t handing over the file right now. Tap “Continue upload”. If that doesn’t help, reload the page and choose the reel again.',
        netz: 'The connection dropped. Your reel isn’t lost, tap “Continue upload”.',
        sonst: 'That didn’t work just now. Please try again in a moment.',
      },
    },
    stand: {
      wartet: ['Confirm your <em>address</em>', 'We’ve sent you an email. One click in it and we check your reel.'],
      prueft: ['We’re looking at your <em>reel</em>', 'The report arrives by email as soon as it’s done. You can close this page or wait here.'],
      tun: ['We’re looking at your picture', 'We’re listening to your sound', 'We’re reading your on-screen text', 'We’re going through your opening', 'We’re writing your suggestions'],
      fehler: ['That didn’t <em>work</em>', 'We couldn’t check this reel. Please upload it again.'],
      weg: ['This report is <em>gone</em>', `We delete reports after ${LOESCH_FRIST_TAGE} days.`],
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
  .weg{max-width:34rem;margin:clamp(18px,4vw,48px) auto 0}
  .schritt{display:grid;gap:20px;animation:rein .5s var(--e-out) both}
  .schritt[hidden]{display:none}
  @keyframes rein{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .marke{color:var(--emerald-soft);font-weight:600;font-size:15px}
  h1,.schritt h2{font-family:var(--ff-serif);font-weight:450;line-height:1.05;letter-spacing:-.022em;text-wrap:balance}
  h1{font-size:clamp(2.2rem,1.4rem + 3.4vw,3.6rem)}
  .schritt h2{font-size:clamp(1.7rem,1.3rem + 1.8vw,2.3rem)}
  h1 em,.schritt h2 em,.st-kopf em{font-style:italic;background:linear-gradient(135deg,#1FC998,#46BEEA);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:var(--emerald-soft)}
  .lead{color:#B4B9B6;font-size:1.12rem;max-width:44ch}
  /* Einstieg: der Befund liegt verhüllt da */
  .schleier{position:relative;border-radius:20px;padding:26px 24px;display:grid;grid-template-columns:120px minmax(0,1fr);gap:22px;align-items:center;overflow:hidden;
    background:linear-gradient(180deg,rgba(16,27,32,.92),rgba(10,18,22,.92));box-shadow:inset 0 0 0 1px var(--hair),inset 0 1px 0 rgba(255,255,255,.07),0 40px 80px -40px #000}
  .s-uhr{position:relative;filter:blur(5px);opacity:.8}.s-uhr svg{display:block;width:100%}
  .s-uhr b{position:absolute;left:0;right:0;bottom:-4px;text-align:center;font:450 2.4rem/1 var(--ff-serif)}
  .s-zeilen{display:grid;gap:12px;filter:blur(4px)}.s-zeilen i{display:block;height:12px;border-radius:6px;background:rgba(242,243,241,.22)}
  .s-licht{position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.09) 50%,transparent 65%);transform:translateX(-100%);animation:streif 5.5s var(--e-out) 1.2s infinite}
  @keyframes streif{0%{transform:translateX(-100%)}45%,100%{transform:translateX(100%)}}
  .zwei{display:grid;gap:10px}
  /* das gewählte Video */
  .geraet{position:relative;min-height:150px;border-radius:20px;overflow:hidden;cursor:pointer;display:block;background:linear-gradient(160deg,#101D21,#070D10 60%);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.13),inset 0 1px 0 rgba(255,255,255,.22),0 30px 60px -30px rgba(0,0,0,.9)}
  .geraet:focus-within{outline:2px solid var(--emerald-soft);outline-offset:4px}
  .geraet input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:4}
  .geraet video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .6s var(--e-out)}
  .liegt .geraet video.zeigt{opacity:.55}
  .leer,.voll{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:18px;text-align:center}
  .leer::before{content:"";position:absolute;inset:12px;border-radius:14px;border:1px dashed rgba(242,243,241,.24)}
  .ziehen .leer::before{border-color:var(--emerald-soft);background:rgba(31,201,152,.08)}
  .voll{opacity:0;pointer-events:none;background:rgba(3,8,13,.45)}
  .liegt .voll{opacity:1;transition:opacity .4s .2s}.liegt .leer{opacity:0;transition:opacity .3s}
  .voll b{font-family:var(--ff-serif);font-weight:450;font-size:1.3rem}.voll .klein{color:#DDE1DE}
  .voll u{text-decoration:underline;text-underline-offset:3px;color:var(--ink);font-size:15px}
  /* Ladescreen: ihr Bild wird scharf, darauf nur die Zahl */
  .pixfeld{position:relative;width:min(210px,56vw);margin:0 auto;border-radius:18px;overflow:hidden;aspect-ratio:9/16;background:linear-gradient(160deg,#17262B,#0A1215);
    box-shadow:0 1px 1px #000,0 24px 48px -14px rgba(0,0,0,.8),0 0 80px -10px rgba(31,201,152,.25)}
  .pixfeld video{display:block;width:100%;height:100%;object-fit:cover;transform:scale(1.14);transition:filter .6s linear}
  .proz{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font:450 3.4rem/1 var(--ff-serif);letter-spacing:-.02em;font-variant-numeric:tabular-nums;text-shadow:0 2px 18px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.9)}
  .mitte{text-align:center}
  .tipp{border-radius:16px;padding:16px 18px;display:grid;gap:4px;background:rgba(16,27,32,.8);box-shadow:inset 0 0 0 1px var(--hair)}
  .tipp b{font-family:var(--ff-serif);font-weight:450;font-size:1.2rem;line-height:1.2}
  .knopf{position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 24px;border-radius:12px;border:0;cursor:pointer;
    font:600 17px var(--ff-body);color:#04201A;background:linear-gradient(135deg,#1FC998,#46BEEA);box-shadow:0 14px 30px -14px rgba(31,201,152,.8);transition:transform var(--dur-2) var(--e-out)}
  .knopf:hover{transform:translateY(-2px)}
  .knopf:focus-visible,.zeile:focus-within,.feld:focus-visible,.haken input:focus-visible,a:focus-visible{outline:2px solid var(--emerald-soft);outline-offset:3px}
  .klein{color:var(--muted);font-size:15px}
  .voll{justify-content:flex-end;padding-bottom:20px;background:linear-gradient(180deg,transparent 38%,rgba(3,8,13,.82) 62%,rgba(3,8,13,.96));opacity:0;pointer-events:none}
  .liegt .voll{opacity:1;transition:opacity .5s .5s}.liegt .leer{opacity:0;transition:opacity .3s}
  .voll b{font-family:var(--ff-serif);font-weight:450;font-size:1.3rem}.voll .klein{color:#DDE1DE}
  .voll u{text-decoration:underline;text-underline-offset:3px;color:var(--ink);font-size:15px}
  /* ── der eine Schirm mit Fragen ── */
  .zettel{display:grid;gap:0}
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
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chips .zeile{min-height:46px;padding:8px 16px;border-radius:999px}
  .knopf.leer-k,a.knopf.leer-k{text-decoration:none}
  .knopf[disabled]{opacity:.6;cursor:default}
  .knopf[hidden],.melde[hidden]{display:none}
  .haken{display:grid;grid-template-columns:26px minmax(0,1fr);gap:13px;align-items:start;margin:4px 0 20px;color:#B4B9B6;font-size:15.5px;line-height:1.5}
  .haken input{width:26px;height:26px;margin:0;accent-color:#1FC998;cursor:pointer}
  .haken label{cursor:pointer}
  .haken a,.fuss a{color:var(--ink);text-underline-offset:3px}
  .honig{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
  .turnstile-wrap{min-height:65px;margin-bottom:16px}
  .zettel .knopf{width:100%}
  .melde{margin-top:14px;padding:12px 14px;border-radius:12px;background:rgba(240,121,107,.10);box-shadow:inset 0 0 0 1px rgba(240,121,107,.45);color:#FFD9D3;font-size:16px}
  .melde.gut{background:rgba(31,201,152,.10);box-shadow:inset 0 0 0 1px rgba(31,201,152,.45);color:#D6FFF2}
  .lauf p{color:#B4B9B6;max-width:46ch;margin-inline:auto}
  .lauf .marke{color:var(--emerald-soft)}
  .streifen{position:relative;height:22px;margin:18px 0 10px;border-right:1px solid rgba(242,243,241,.28);background:repeating-linear-gradient(90deg,rgba(242,243,241,.28) 0 1px,transparent 1px 10%)}
  .streifen u{position:absolute;left:0;top:50%;height:6px;margin-top:-3px;border-radius:0 6px 6px 0;background:linear-gradient(90deg,#1FC998,#46BEEA)}
  .knopf.leer-k{background:none;color:var(--ink);box-shadow:inset 0 0 0 1px rgba(242,243,241,.32)}
  .fuss{margin-top:56px;color:var(--faint);font-size:15px;display:flex;gap:18px;flex-wrap:wrap}
  .fuss a{display:inline-flex;align-items:center;min-height:44px;color:var(--muted)}
  /* Stand-Seite */
  .st-kopf{max-width:36rem;margin-top:clamp(40px,10vh,120px)}
  .st-kopf h1{font-size:clamp(2rem,1.3rem + 2.6vw,3.2rem);margin:14px 0 16px}
  .st-kopf p{color:#B4B9B6;font-size:1.12rem;margin-bottom:26px;max-width:44ch}
  .st-kopf .streifen u{width:38%;animation:pendel 2.2s var(--e-out) 3 both}
  .st-kopf .tipp{margin-top:14px;max-width:30rem}
  @keyframes pendel{0%{transform:translateX(0)}50%{transform:translateX(163%)}100%{transform:translateX(0)}}

  /* kleine Handys (iPhone SE, 568 px hoch): der erste Knopf bleibt über dem Falz (besucher-sim 21.11.2026) */
  @media (max-height:620px){.schritt{gap:12px}.schleier{padding:14px 18px;grid-template-columns:84px minmax(0,1fr)}#s-ein .klein{display:none}h1{font-size:2rem}.lead{font-size:1rem}}
  @media (prefers-reduced-motion:reduce){.schritt{animation:none}.s-licht{animation:none}.pixfeld video{transition:none}.st-kopf .streifen u{animation:none;width:100%}}
`;

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function kopfleiste(T) {
  return `<header class="leiste"><a href="${T.start}"><img class="wm-logo" src="https://social2scale.com/assets/sig-wordmark.png" alt="social2scale" width="178" height="26"></a>
    <a class="sprache" href="${T.andere[0]}" hreflang="${T.andere[2]}" lang="${T.andere[2]}">${T.andere[1]}</a></header>`;
}

function markup(T, siteKey) {
  const chip = (wert, name, an) => `<label class="zeile"><input type="radio" name="plattform" value="${wert}"${an ? ' checked' : ''}><span>${name}</span></label>`;
  return `<div class="rc">${kopfleiste(T)}
  <main class="weg" id="weg" data-sitekey="${esc(siteKey)}">
    <section class="schritt" id="s-ein">
      <p class="marke">${T.marke}</p><h1>${T.h1}</h1><p class="lead">${T.lead}</p>
      <div class="schleier" aria-hidden="true"><div class="s-uhr"><svg viewBox="0 0 200 112"><defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="#1FC998"/><stop offset="1" stop-color="#46BEEA"/></linearGradient></defs><path d="M16 100A84 84 0 0 1 184 100" fill="none" stroke="url(#sg)" stroke-width="14" stroke-linecap="round"/></svg><b>?</b></div><div class="s-zeilen"><i style="width:82%"></i><i style="width:64%"></i><i style="width:91%"></i></div><div class="s-licht"></div></div>
      <p class="klein">${T.wo}</p>
      <div class="zwei"><button class="knopf" id="los" type="button">${T.los}</button><a class="knopf leer-k" href="${T.terminUrl}" target="_blank" rel="noopener">${T.termin}</a></div>
    </section>
    <section class="schritt" id="s-form" hidden aria-live="polite">
      <form id="form" class="zettel" novalidate>
        <h2 id="form-kopf" tabindex="-1" style="margin-bottom:20px">${T.zettel}</h2>
        <div class="frage" id="standort"><label class="geraet" id="geraet">
          <input type="file" id="datei" accept="video/mp4,video/quicktime,.mp4,.mov" aria-label="${T.waehlen}">
          <video id="vorschau" muted playsinline loop aria-hidden="true"></video>
          <span class="leer"><span class="knopf leer-k" aria-hidden="true">${T.waehlen}</span><span class="klein">${T.format}<span class="nur-maus"><br>${T.ziehen}</span></span></span>
          <span class="voll"><b>${T.liegt}</b><span class="klein" id="masse"></span><u>${T.anderes}</u></span>
        </label></div>
        <fieldset class="frage"><legend>${T.f1}</legend><div class="chips">
          ${chip('instagram', 'Instagram', true)}${chip('tiktok', 'TikTok')}${chip('facebook', 'Facebook')}${chip('linkedin', 'LinkedIn')}${chip('youtube', 'YouTube')}</div></fieldset>
        <div class="frage"><label for="vorname">${T.vorname}</label>
          <input class="feld" id="vorname" name="vorname" type="text" maxlength="40" autocomplete="given-name"></div>
        <div class="frage"><label for="email">${T.mail}</label>
          <input class="feld" id="email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="160" placeholder="${T.mailh}"></div>
        <div class="frage"><label for="telefon">${T.telefon}</label><p class="hilfe" id="telh">${T.telefonh}</p>
          <input class="feld" id="telefon" name="telefon" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" aria-describedby="telh"></div>
        <div class="honig" aria-hidden="true"><label>Website<input type="text" name="website" id="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="haken"><input type="checkbox" id="einwilligung"><label for="einwilligung">${T.haken} ${T.mehr} <a href="${T.dsUrl}" target="_blank" rel="noopener">${T.ds}</a>.</label></div>
        <div class="turnstile-wrap"><div id="ts"></div></div>
        <button class="knopf" type="submit">${T.senden}</button>
        <p class="melde" id="melde" role="alert" hidden></p>
      </form>
    </section>
    <section class="schritt lauf" id="s-lauf" hidden>
      <h2 class="mitte" id="lauf-kopf" tabindex="-1"></h2>
      <div class="pixfeld"><video id="laufbild" muted playsinline aria-hidden="true"></video><b class="proz" id="proz" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">0 %</b></div>
      <p class="marke mitte" id="lauf-text" role="status"></p>
      <p class="klein mitte" id="bleib" hidden></p>
      <div class="tipp" id="tipp" role="status"></div>
      <p class="melde" id="melde2" role="alert" hidden></p><button class="knopf" id="weiter" type="button" hidden></button>
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
  var form = $('form'), melde = $('melde'), standort = $('standort'), geraet = $('geraet'), video = $('vorschau'), tsId = null;
  var SCHRITTE = ['s-ein', 's-form', 's-lauf'];
  function zeig(id, kopf) {
    SCHRITTE.forEach(function (s) { $(s).hidden = s !== id; });
    scrollTo({ top: 0, behavior: ruhig ? 'auto' : 'smooth' });
    if (kopf) $(kopf).focus({ preventScroll: true });
  }
  // Turnstile erst zeichnen, wenn der Schirm mit den Fragen sichtbar ist (in einem versteckten Bereich misst es nichts)
  function tsZeichnen() {
    if (tsId !== null || !window.turnstile || $('s-form').hidden) return;
    try { tsId = turnstile.render('#ts', { sitekey: $('weg').getAttribute('data-sitekey'), theme: 'dark' }); } catch (e) {}
  }
  window.rcTs = tsZeichnen;
  $('los').addEventListener('click', function () { zeig('s-form', 'form-kopf'); tsZeichnen(); });

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
  }
  $('datei').addEventListener('change', function (e) { nimm(e.target.files[0]); });
  // eine Meldung gilt, bis sie etwas ändert: dann verschwindet sie
  form.addEventListener('input', function () { melde.hidden = true; });
  ['dragenter', 'dragover'].forEach(function (n) { geraet.addEventListener(n, function (e) { e.preventDefault(); geraet.classList.add('ziehen'); }); });
  ['dragleave', 'drop'].forEach(function (n) { geraet.addEventListener(n, function (e) { e.preventDefault(); geraet.classList.remove('ziehen'); }); });
  geraet.addEventListener('drop', function (e) { nimm(e.dataTransfer.files[0]); });

  var nm = document.querySelector('.nur-maus'); if (nm && !matchMedia('(pointer:fine)').matches) nm.hidden = true;

  function token() {
    try { return window.turnstile && tsId !== null ? (turnstile.getResponse(tsId) || '') : ''; } catch (e) { return ''; }
  }
  function wert(name) { var el = form.querySelector('input[name=' + name + ']:checked'); return el ? el.value : ''; }

  var p = 0, tippNr = 0, tippLauf = null;
  function tipp() {
    var x = T.tipps[tippNr % T.tipps.length], el = $('tipp'); tippNr++;
    el.textContent = ''; var b = document.createElement('b'); b.textContent = x[0]; var s = document.createElement('span'); s.className = 'klein'; s.textContent = x[1];
    el.appendChild(b); el.appendChild(s);
  }
  function zeigeLauf() {
    $('lauf-kopf').textContent = T.kommt; $('lauf-text').textContent = T.offen; $('weiter').textContent = T.weiter;
    var bild = $('laufbild'); bild.src = video.src; bild.onloadeddata = function () { try { bild.currentTime = Math.min(2.5, (bild.duration || 5) / 2); } catch (e) {} };
    stand(0); malen(); uhr = setInterval(malen, 220); tipp(); tippLauf = setInterval(tipp, 6000);
    zeig('s-lauf', 'lauf-kopf');
  }
  $('weiter').addEventListener('click', function () { $('weiter').hidden = true; $('melde2').hidden = true; laden(); });
  // Eine Zahl für den ganzen Weg: bis 30 folgt sie dem echten Upload, danach läuft sie über die Prüfzeit auf 96 zu und hält
  // dort, bis der Befund wirklich da ist. 100 heißt: es geht weiter. Die Anzeige zählt weich nach, sie springt nie.
  var ziel = 0, pruefStart = 0, uhr = null, verzug = false;
  function stand(anteil) { ziel = Math.max(ziel, Math.min(30, anteil * 30)); }
  function malen() {
    if (pruefStart && ziel < 100) {
      var s = (Date.now() - pruefStart) / 1000;
      ziel = Math.max(ziel, 30 + 66 * (1 - Math.exp(-s / 150)));
      if ((verzug || s > 600) && !$('bleib').hidden) $('bleib').hidden = true;
      $('lauf-text').textContent = verzug || s > 600 ? T.lang : T.tun[Math.min(T.tun.length - 1, Math.floor((p - 30) / 14))];
    }
    if (p < Math.floor(ziel)) p += ziel >= 100 ? 2 : 1; if (p > 100) p = 100;
    $('proz').textContent = p + ' %'; $('proz').setAttribute('aria-valuenow', p);
    $('laufbild').style.filter = 'blur(' + ((100 - p) * 0.17).toFixed(1) + 'px) saturate(' + (0.55 + p * 0.0045).toFixed(2) + ') brightness(' + (0.8 + p * 0.002).toFixed(2) + ')';
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
      if (r.ok && d.ok) return pruefen();
      stolper(d.error === 'backend' ? 'netz' : d.error);
    } catch (e) { stolper('netz'); }
  }
  // Das Video liegt bei uns: dieselbe Seite bleibt offen, bis der Befund da ist, und zeigt ihn dann selbst.
  function pruefen() {
    pruefStart = Date.now();
    $('lauf-kopf').textContent = T.prueft; $('bleib').textContent = T.bleib; $('bleib').hidden = false;
    var frage = setInterval(function () {
      if (document.hidden) return;
      fetch('/api/reel-check/status/' + lauf.token).then(function (r) { return r.json(); }).then(function (d) {
        // Geprüft wird auf unserem Rechner. Hat er das Reel nach drei Minuten noch nicht aufgenommen, ist er gerade nicht am Netz
        // (Reise, Nacht): dann sagt die Seite das ehrlich, statt minutenlang weiterzuzählen. Der Befund kommt per Mail nach.
        if (d.status === 'da' && Date.now() - pruefStart > 180000) verzug = true;
        if (d.status !== 'fertig' && d.status !== 'fehler') return;
        clearInterval(frage); clearInterval(tippLauf);
        if (d.status === 'fehler') { location.href = '/rc/' + lauf.token; return; }
        ziel = 100;
        var warte = setInterval(function () { if (p >= 100) { clearInterval(warte); clearInterval(uhr); setTimeout(function () { location.href = '/rc/' + lauf.token; }, ruhig ? 0 : 900); } }, 200);
      }).catch(function () {});
    }, 5000);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!datei) { sag('datei'); geraet.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'center' }); return; }
    var daten = { email: $('email').value.trim(), vorname: $('vorname').value.trim(), telefon: $('telefon').value.trim(), plattform: wert('plattform'),
      einwilligung: $('einwilligung').checked, website: $('website').value, elapsed: Date.now() - START,
      bytes: datei.f.size, mime: datei.art, sprache: LANG === 'en' ? 'en' : 'de', turnstile: token() };
    // dieselbe Reihenfolge wie auf dem Schirm: die erste offene Stelle wird genannt und angesprungen
    var luecke = !daten.plattform ? ['plattform', form.querySelector('input[name=plattform]')] : !/^\S+@\S+\.\S+$/.test(daten.email) ? ['email', $('email')] :
      !daten.einwilligung ? ['einwilligung', $('einwilligung')] : (window.turnstile && !daten.turnstile) ? ['captcha', null] : null;
    if (luecke) { sag(luecke[0]); if (luecke[1]) luecke[1].focus(); return; }
    var knopf = form.querySelector('button[type=submit]'); knopf.disabled = true;
    try {
      var r = await fetch('/api/reel-check/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(daten) });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok || !d.ok) { knopf.disabled = false; try { if (window.turnstile && tsId !== null) turnstile.reset(tsId); } catch (x) {} return sag(d.error || 'sonst'); }
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

// Der Bau des Workers (esbuild, keepNames) setzt in jede benannte Funktion einen Aufruf von __name. Das Seitenskript wird als
// Text in die Seite gelegt, dort gibt es __name nicht: ohne diese Zeile bricht das ganze Skript ab (21.11.2026 live so passiert,
// die Tests ohne Bau sahen es nicht). Deshalb bringt die Seite die Funktion selbst mit.
export const NAME_HILFE = 'var __name=function(f){return f};';

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
    // Platzhalter, falls Turnstile vor dem Seitenskript fertig ist; das Seitenskript setzt die echte Funktion.
    '<script>window.rcTs=function(){}</script>' +
    '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=rcTs" async defer></script>' +
    `<style>${STIL}</style>`;
  const daten = JSON.stringify(T.js).replace(/</g, '\\u003c');
  const body = `${markup(T, siteKey)}<script>window.RC_T=${daten};window.RC_MAX=${MAX_BYTES};${NAME_HILFE}(${seitenSkript.toString()})();</script>`;
  return htmlDoc({ title: T.titel, head, body, lang });
}

/** Stand-Seite /rc/<token>: wartet auf Bestätigung · wird geprüft · Befund · Fehler · gelöscht. */
export function reelCheckStandSeite({ status, sprache = 'de', befund = '', token = '' }) {
  const lang = sprache === 'en' ? 'en' : 'de';
  const T = TEXTE[lang];
  if (status === 'fertig' && befund) {
    // Der Befund kommt fertig vom Mac (seite.py maskiert jeden Satz, kein Skript). Die strenge CSP gilt auch hier.
    // Der Knopf zur Profil-Vorschau nimmt den Befund mit: so fragt die Vorschau Vorname und Adresse nicht nochmal.
    // Erst hier eingesetzt, damit der Token nie im abgelegten Befund steht. Ältere Befunde zeigten noch auf /gratis/.
    if (/^[a-f0-9]{48}$/.test(token)) {
      const mit = (pfad) => `href='https://start.social2scale.com${pfad}?von=check&amp;rc=${token}'`;
      befund = befund.replaceAll("href='https://start.social2scale.com/en/'", mit('/en/')).replaceAll("href='https://start.social2scale.com/'", mit('/'))
        .replaceAll("href='https://social2scale.com/en/free/'", mit('/en/')).replaceAll("href='https://social2scale.com/gratis/'", mit('/'));
    }
    return new Response(befund, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...SICHERHEITS_HEADER, 'X-Robots-Tag': 'noindex' } });
  }
  const art = status === 'wartet' ? 'wartet' : status === 'da' || status === 'in_arbeit' || status === 'fertig' ? 'prueft' : status === 'fehler' ? 'fehler' : 'weg';
  const [kopf, text] = T.stand[art];
  const laeuft = art === 'wartet' || art === 'prueft';
  const tokenOk = /^[a-f0-9]{48}$/.test(token);
  const lauf = art === 'prueft'
    ? `<p class="marke" id="st-tun" role="status">${T.stand.tun[0]}</p><div class="tipp" id="tipp" role="status"><b>${esc(T.js.tipps[0][0])}</b><span class="klein">${esc(T.js.tipps[0][1])}</span></div>`
    : '<div class="streifen" aria-hidden="true"><u></u></div>';
  const body = `<div class="rc">${kopfleiste(T)}<main class="st-kopf"><p class="marke">${T.marke}</p><h1>${kopf}</h1><p>${text}</p>` +
    (laeuft ? lauf : `<a class="knopf" href="${T.pfad}">${T.stand.neu}</a>`) +
    `</main><footer class="fuss"><a href="${T.impressumUrl}">${T.impressum}</a><a href="${T.dsUrl}">${T.dsFuss}</a></footer></div>` +
    // Ändert sich der Stand, lädt die Seite neu. Fragt nur, solange sie sichtbar ist. Beim Prüfen wechseln Schritt und Hinweis.
    (laeuft && tokenOk
      ? `<script>(function(){var alt=${JSON.stringify(status)},TUN=${JSON.stringify(T.stand.tun).replace(/</g, '\\u003c')},TIPPS=${JSON.stringify(T.js.tipps).replace(/</g, '\\u003c')},n=0;` +
        `setInterval(function(){if(document.hidden)return;fetch('/api/reel-check/status/${token}').then(function(r){return r.json()}).then(function(d){if(d.status&&d.status!==alt)location.reload()}).catch(function(){})},${art === 'prueft' ? 8000 : 20000});` +
        `var tun=document.getElementById('st-tun'),tipp=document.getElementById('tipp');if(tun)setInterval(function(){n++;tun.textContent=TUN[n%TUN.length];var x=TIPPS[n%TIPPS.length];tipp.firstChild.textContent=x[0];tipp.lastChild.textContent=x[1]},6000)})();</script>`
      : '');
  const antwort = htmlDoc({ title: T.titel, head: `<meta name="robots" content="noindex"><style>${STIL}</style>`, body, lang });
  antwort.headers.set('X-Robots-Tag', 'noindex');
  return antwort;
}
