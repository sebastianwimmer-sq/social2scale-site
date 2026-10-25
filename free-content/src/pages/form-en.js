/**
 * Englischer Funnel (`GET /en/`) — dieselbe Seite wie `GET /`, nur uebersetzt (Sebi 23.10.2026:
 * „ich will immer beides einfach 1/1 gleich designt“). Quelle bleibt form.js: die EN-Seite entsteht
 * aus der fertigen deutschen Seite plus dieser Tabelle. Jede Zeile muss in der deutschen Seite
 * vorkommen, sonst bricht der Bau ab (Test) — so faellt eine geaenderte deutsche Stelle sofort auf,
 * statt dass die englische Seite still deutsch bleibt.
 *
 * Werte, die an den Server gehen (data-ziel, data-stand, data-budget …), bleiben deutsch: Pruefung,
 * Erzeugung und CRM kennen nur sie. Uebersetzt wird, was man sieht.
 */

import { formPage, FLAGGE_EN, FLAGGE_DE } from './form.js';
import { filmMarkup, filmScript } from './film.js';

export const TABELLE = [
  // ── Kopf ──
  ['<html lang="de">', '<html lang="en">'],
  ['<title>Deine Gratis-Vorschau · social2scale</title>', '<title>Your free preview · social2scale</title>'],
  ['content="Dein Feed-Entwurf in 60 Sekunden. Kostenlos, mit deinem Foto und deiner Farbe."', 'content="Your feed draft in 60 seconds. Free, with your photo and your colour."'],
  ['content="Deine Gratis-Vorschau · social2scale"', 'content="Your free preview · social2scale"'],
  ['<meta property="og:url" content="https://start.social2scale.com/">', '<meta property="og:url" content="https://start.social2scale.com/en/">'],
  ['<meta property="og:locale" content="de_DE">', '<meta property="og:locale" content="en_US">'],
  ['<meta property="og:locale:alternate" content="en_US">', '<meta property="og:locale:alternate" content="de_DE">'],
  ['<a href="https://social2scale.com/" aria-label="Zur social2scale-Startseite">', '<a href="https://social2scale.com/en/" aria-label="To the social2scale home page">'],
  ['<a class="sprache" href="/en/" hreflang="en" lang="en" data-sprache="en" aria-label="English">', '<a class="sprache" href="/" hreflang="de" lang="de" data-sprache="de" aria-label="Deutsch">'],
  [FLAGGE_EN + '<span>English</span></a>', FLAGGE_DE + '<span>Deutsch</span></a>'],
  ['aria-label="Wo du gerade bist"', 'aria-label="Where you are"'],
  ['<li data-ph="check">Check</li><li data-ph="ergebnis">Ergebnis</li><li data-ph="weg" id="ph-weg">Dein Weg</li>', '<li data-ph="check">Check</li><li data-ph="ergebnis">Result</li><li data-ph="weg" id="ph-weg">Your path</li>'],

  // ── Steckbrief und Handy-Vorschau ──
  ['<span class="br-eb">Steckbrief</span><span class="br-status" id="br-status">wird angelegt</span>', '<span class="br-eb">Profile</span><span class="br-status" id="br-status">in progress</span>'],
  ['<div class="br-name" id="br-name">Du</div>', '<div class="br-name" id="br-name">You</div>'],
    ['<dt>Was du machst</dt>', '<dt>What you do</dt>'],
  ['<dt>Thema</dt>', '<dt>Topic</dt>'],
  ['<dt>Ziel</dt>', '<dt>Goal</dt>'],
  ['<dt>Heute</dt>', '<dt>Today</dt>'],
  ['<dt>Zeit pro Woche</dt>', '<dt>Time per week</dt>'],
  ['<dt>Bringst du mit</dt>', '<dt>You bring</dt>'],
  ['<i></i><i></i><i></i></span>Passt</div>', '<i></i><i></i><i></i></span>Good fit</div>'],
  ['<span class="bsp">Beispiel</span>', '<span class="bsp">Example</span>'],
  ['<span class="h" id="pv-handle">dein.profil</span>', '<span class="h" id="pv-handle">your.profile</span>'],
  ['<span>Beiträge</span>', '<span>Posts</span>'],
  ['<span>Folgt</span>', '<span>Following</span>'],
  ['Entwurf aus deinen Antworten. Den echten Auftritt bauen wir mit dir.', 'A draft from your answers. We build the real thing together with you.'],

  // ── Schritt 0 ──
  ['<h1>Passt du zu <em>uns</em>?</h1>', '<h1>Are we the right <em>fit</em>?</h1>'],
  ['Wir sind zu zweit und betreuen jeden Auftritt selbst. Darum schauen wir erst, ob wir dir wirklich helfen können.', 'There are two of us, and we run every account ourselves. So first we check whether we can really help you.'],
  ['>Ja, kurz checken<', '>Yes, quick check<'],
  ['8 Fragen · eine Minute · kostenlos', '8 questions · one minute · free'],

  // ── gemeinsame Knoepfe ──
  ['<span class="lab">Weiter</span>', '<span class="lab">Next</span>'],
  ['>Zurück</button>', '>Back</button>'],

  // ── Schritte 1–6 ──
  ['<span class="eyebrow">Dein Name</span>', '<span class="eyebrow">Your name</span>'],
  ['<h2>Wie dürfen wir dich <em>nennen</em>?</h2>', '<h2>What should we <em>call</em> you?</h2>'],
  ['placeholder="Dein Vorname"', 'placeholder="Your first name"'],
  ['<span class="eyebrow">Dein Handle</span>', '<span class="eyebrow">Your handle</span>'],
  ['<h2>Dein <em>Instagram-Name</em>?</h2>', '<h2>Your <em>Instagram name</em>?</h2>'],
  ['placeholder="deinname"', 'placeholder="yourname"'],
  ['<span class="eyebrow">Was du machst</span>', '<span class="eyebrow">What you do</span>'],
  ['<h2>Was machst du <em>beruflich</em>?</h2>', '<h2>What do you do for <em>work</em>?</h2>'],
  ['aria-label="Was du machst"', 'aria-label="What you do"'],
  ['<span>Coach oder Beratung</span>', '<span>Coach or consultant</span>'],
  ['<span>Direktvertrieb oder Network</span>', '<span>Direct sales or network</span>'],
  ['<span>Studio oder Dienstleistung</span>', '<span>Studio or service</span>'],
  ['<span>Etwas anderes</span>', '<span>Something else</span>'],
  ['<span class="eyebrow">Dein Thema</span>', '<span class="eyebrow">Your topic</span>'],
  ['<h2>Worum geht’s <em>bei dir</em>?</h2>', '<h2>What’s your <em>thing</em>?</h2>'],
  ['placeholder="z.B. Yoga & Achtsamkeit für gestresste Berufstätige."', 'placeholder="e.g. Yoga & mindfulness for stressed professionals."'],
  ['<span class="eyebrow">Dein Ziel</span>', '<span class="eyebrow">Your goal</span>'],
  ['<h2>Was soll dein Auftritt <em>bewirken</em>?</h2>', '<h2>What should your presence <em>achieve</em>?</h2>'],
  ['aria-label="Dein Ziel"', 'aria-label="Your goal"'],
  ['<span>Mehr Anfragen</span>', '<span>More inquiries</span>'],
  ['<span>Mehr Sichtbarkeit</span>', '<span>More visibility</span>'],
  ['<span>Mehr Umsatz</span>', '<span>More revenue</span>'],
  ['<span>Weniger Zeit für Content</span>', '<span>Less time on content</span>'],
  ['<span>Meine Marke stärken</span>', '<span>Build my brand</span>'],
  ['<span class="eyebrow">Wo du stehst</span>', '<span class="eyebrow">Where you are</span>'],
  ['<h2>Wo stehst du <em>heute</em>?</h2>', '<h2>Where are you <em>today</em>?</h2>'],
  ['aria-label="Wo du heute stehst"', 'aria-label="Where you are today"'],
  ['<span>Ganz am Anfang</span>', '<span>Just starting out</span>'],
  ['<span>Poste schon, aber unregelmäßig</span>', '<span>Posting, but not regularly</span>'],
  ['<span>Aktiv — will aufs nächste Level</span>', '<span>Active — ready for the next level</span>'],

  // ── Weg A: Vorschau ──
  ['<span class="eyebrow">Deine Stimmung</span>', '<span class="eyebrow">Your mood</span>'],
  ['<h2>Welche <em>Stimmung</em> bist du?</h2>', '<h2>What’s your <em>mood</em>?</h2>'],
  ['aria-label="Stimmung"', 'aria-label="Mood"'],
  ['<span>Ruhig &amp; natürlich</span>', '<span>Calm &amp; natural</span>'],
  ['<span>Klar &amp; professionell</span>', '<span>Clear &amp; professional</span>'],
  ['<span>Warm &amp; nahbar</span>', '<span>Warm &amp; approachable</span>'],
  ['<span>Kraftvoll &amp; mutig</span>', '<span>Strong &amp; bold</span>'],
  ['<span class="eyebrow">Zeig dich</span>', '<span class="eyebrow">Show yourself</span>'],
  ['<h2>Magst du dein <em>Profilbild</em> zeigen?</h2>', '<h2>Want to show your <em>profile picture</em>?</h2>'],
  ['<span class="foto-lab" id="fotoLab">Foto auswählen</span>', '<span class="foto-lab" id="fotoLab">Choose a photo</span>'],
  ['>Entfernen</button>', '>Remove</button>'],
  ['Optional — dein Feed zeigt es dann wie auf Instagram, mit Story-Ring.', 'Optional — your feed then shows it like Instagram does, with a story ring.'],
  ['<span class="eyebrow">Deine Markenfarbe</span>', '<span class="eyebrow">Your brand colour</span>'],
  ['<h2>Hat deine Marke eine <em>Farbe</em>?</h2>', '<h2>Does your brand have a <em>colour</em>?</h2>'],
  ['aria-label="Markenfarbe"', 'aria-label="Brand colour"'],
  ['</i>Ocker</span>', '</i>Ochre</span>'],
  ['</i>Tannengrün</span>', '</i>Fir green</span>'],
  ['</i>Ozeanblau</span>', '</i>Ocean blue</span>'],
  ['</i>Violett</span>', '</i>Violet</span>'],
  ['</i>Beere</span>', '</i>Berry</span>'],
  ['</i>Eigene…</span>', '</i>Custom…</span>'],
  ['aria-label="Eigene Markenfarbe"', 'aria-label="Custom brand colour"'],
  ['Optional — ohne Auswahl wählen wir eine, die zu deiner Stimmung passt.', 'Optional — if you skip this, we pick one that matches your mood.'],
  ['<span class="eyebrow">Letzter Schritt</span>', '<span class="eyebrow">Last step</span>'],
  ['<h2>Fast fertig — <em>wohin damit</em>?</h2>', '<h2>Almost done — <em>where should it go</em>?</h2>'],
  ['placeholder="dein@email.de"', 'placeholder="you@email.com"'],
  ['Ja, baut mir meine Gratis-Vorschau — und meldet euch dazu bei mir. Es gilt die <a href="https://social2scale.com/datenschutz/" target="_blank" rel="noopener">Datenschutzerklärung</a> — abmelden jederzeit mit einem Klick.',
    'Yes, build my free preview — and get in touch with me about it. The <a href="https://social2scale.com/datenschutz/" target="_blank" rel="noopener">privacy policy (German)</a> applies — unsubscribe anytime with one click.'],
  ['Optional: Ihr dürft meine fertige Vorschau anonym als Beispiel zeigen. Freiwillig — ändert nichts an der Vorschau.', 'Optional: you may show my finished preview anonymously as an example. Voluntary — it doesn’t change the preview.'],
  ['<span class="lab">Meinen Feed bauen</span>', '<span class="lab">Build my feed</span>'],
  ['<span class="eyebrow">Fast geschafft</span>', '<span class="eyebrow">Almost there</span>'],
  ['<h2>Schau in dein <em>Postfach</em>, <span id="echo">…</span>.</h2>', '<h2>Check your <em>inbox</em>, <span id="echo">…</span>.</h2>'],
  ['Ein Bestätigungs-Link ist unterwegs. Ein Klick darauf, und dein Feed wird fertig gebaut.', 'A confirmation link is on its way. One click on it, and your feed gets built.'],
  ['<span class="lab">Postfach öffnen</span>', '<span class="lab">Open inbox</span>'],
  ['>Mail nicht angekommen? Nochmal schicken</button>', '>Email didn’t arrive? Send it again</button>'],
  ['>E-Mail ändern</button>', '>Change email</button>'],
  ['Lieber direkt mit jemandem reden? <button type="button" class="quer-b" data-quer="b">Erstgespräch anfragen</button>', 'Rather talk to someone directly? <button type="button" class="quer-b" data-quer="b">Request an intro call</button>'],

  // ── Weg B: Gespraech ──
  ['<span class="eyebrow">Betreuung</span>', '<span class="eyebrow">Management</span>'],
  ['<h2>Welcher <em>Rahmen</em> passt im Monat?</h2>', '<h2>What monthly <em>budget</em> works for you?</h2>'],
  ['aria-label="Rahmen im Monat"', 'aria-label="Monthly budget"'],
  ['<span>unter 1.000 €</span>', '<span>under €1,000</span>'],
  ['<span>1.000–3.000 €</span>', '<span>€1,000–3,000</span>'],
  ['<span>3.000 €+</span>', '<span>€3,000+</span>'],
  ['<span>Noch unklar</span>', '<span>Not sure yet</span>'],
  ['<h2>Wann willst du <em>starten</em>?</h2>', '<h2>When do you want to <em>start</em>?</h2>'],
  ['<span>Sofort</span>', '<span>Right away</span>'],
  ['<span>In 1–3 Monaten</span>', '<span>In 1–3 months</span>'],
  ['<span>Erst mal informieren</span>', '<span>Just looking for now</span>'],
  ['<h2>Wie erreicht Phil <em>dich</em>?</h2>', '<h2>How can Phil <em>reach you</em>?</h2>'],
  ['placeholder="Telefon für den Rückruf"', 'placeholder="Phone for a callback"'],
  ['Ich habe die <a href="https://social2scale.com/datenschutz/" target="_blank" rel="noopener">Datenschutzerklärung</a> gelesen und bin einverstanden.', 'I’ve read the <a href="https://social2scale.com/datenschutz/" target="_blank" rel="noopener">privacy policy (German)</a> and agree.'],
  ['<span class="lab">Erstgespräch anfragen</span>', '<span class="lab">Request an intro call</span>'],
  ['<span class="eyebrow">Anfrage ist da</span>', '<span class="eyebrow">Request received</span>'],
  ['<h2>Danke, <span id="echo-b">…</span>. Phil meldet sich <em>persönlich</em>.</h2>', '<h2>Thanks, <span id="echo-b">…</span>. Phil will get back to you <em>personally</em>.</h2>'],
  ['Mit deinen Antworten kennt er dein Thema schon vor dem Gespräch. Lieber gleich einen festen Termin? Such ihn dir selbst aus.', 'With your answers he already knows your topic before the call. Want a fixed time right away? Pick one yourself.'],
  ['<span class="lab">Termin direkt buchen</span>', '<span class="lab">Book a time now</span>'],
  ['Oder Phil ruft dich an. Direkt erreichst du ihn unter', 'Or Phil calls you. You can reach him directly at'],
  ['Bis dahin: <button type="button" class="quer-b" data-quer="a">deine Gratis-Vorschau bauen</button> (Stimmung, Foto, Farbe).', 'Until then: <button type="button" class="quer-b" data-quer="a">build your free preview</button> (mood, photo, colour).'],

  // ── Check: Zeit, Ergebnis, Mitbringen ──
  ['<span class="eyebrow">Deine Zeit</span>', '<span class="eyebrow">Your time</span>'],
  ['<h2>Wie viel Zeit hast du pro Woche für <em>Social Media</em>?</h2>', '<h2>How much time a week do you have for <em>social media</em>?</h2>'],
  ['aria-label="Zeit pro Woche"', 'aria-label="Time per week"'],
  ['<span>Kaum</span>', '<span>Hardly any</span>'],
  ['<span>1–3 Stunden</span>', '<span>1–3 hours</span>'],
  ['<span>Mehr als 3 Stunden</span>', '<span>More than 3 hours</span>'],
  ['<span class="eyebrow" id="passt-eb">Wir schauen kurz</span>', '<span class="eyebrow" id="passt-eb">Taking a quick look</span>'],
  ['Dein Platz ist freigeschaltet. Wie soll es weitergehen?', 'Your spot is unlocked. How would you like to continue?'],
  ['aria-label="Wie es weitergeht"', 'aria-label="How it continues"'],
  ['<span class="empf">Unsere Empfehlung</span><b>Ja, zeig mir meine Vorschau</b><small>So kann mein Auftritt aussehen · gratis, in 60 Sekunden</small>', '<span class="empf">We recommend</span><b>Yes, show me my preview</b><small>What my presence could look like · free, in 60 seconds</small>'],
  ['<span class="empf">Unsere Empfehlung</span><b>Ja, ich will mit Phil sprechen</b><small>Erstgespräch · Phil kennt deine Antworten schon</small>', '<span class="empf">We recommend</span><b>Yes, I want to talk to Phil</b><small>Intro call · Phil already knows your answers</small>'],
  ['<span class="eyebrow">Was du mitbringst</span>', '<span class="eyebrow">What you bring</span>'],
  ['<h2>Was du <em>mitbringst</em></h2>', '<h2>What you <em>bring</em></h2>'],
  ['Damit es läuft, brauchen wir drei Dinge von dir. Tipp an, was für dich passt.', 'To make it work, we need three things from you. Tap what works for you.'],
  ['aria-label="Was du mitbringst"', 'aria-label="What you bring"'],
  ['<b>Eine halbe Stunde</b><small>Das Briefing im ersten Monat. Danach nur noch, wenn du mitreden willst.</small>', '<b>Half an hour</b><small>The briefing in the first month. After that only if you want to weigh in.</small>'],
  ['<b>Zugang zum Account</b><small>Bestehendes Profil oder wir legen eines an. Die Rechte bleiben bei dir. Immer.</small>', '<b>Access to the account</b><small>Your existing profile, or we set one up. The rights stay with you. Always.</small>'],
  ['<b>Bildmaterial</b><small>Was da ist, reicht meist. Wenn nicht, organisieren wir einen Foto-Termin.</small>', '<b>Images</b><small>What you have is usually enough. If not, we organise a photo shoot.</small>'],
  ['<span class="mb-s">passt</span>', '<span class="mb-s">works</span>'],
  ['<span class="lab">Ergebnis zeigen</span>', '<span class="lab">Show result</span>'],
  ['<a href="https://social2scale.com/">Startseite</a> · <a href="https://social2scale.com/impressum/" target="_blank" rel="noopener">Impressum</a> · <a href="https://social2scale.com/datenschutz/" target="_blank" rel="noopener">Datenschutz</a>',
    '<a href="https://social2scale.com/en/">Home</a> · <a href="https://social2scale.com/impressum/" target="_blank" rel="noopener">Legal notice</a> · <a href="https://social2scale.com/datenschutz/" target="_blank" rel="noopener">Privacy</a>'],

  // ── Skript: Sprache der Anfragen ──
  ["const NOTIZ_MAX=600,NOTIZ_LABEL={de:{goal:'Ziel',business:'Business',status:'Stand',budget:'Rahmen',start:'Start',phone:'Rückruf'}},WAHL_EN={};",
    "const NOTIZ_MAX=600,NOTIZ_LABEL={de:{goal:'Ziel',business:'Business',status:'Stand',budget:'Rahmen',start:'Start',phone:'Rückruf'},en:{goal:'Goal',business:'Business',status:'Status',budget:'Budget',start:'Start',phone:'Call back'}},WAHL_EN={},"
    + "ZIEL_EN={'Mehr Anfragen':'more inquiries','Mehr Sichtbarkeit':'more visibility','Mehr Umsatz':'more revenue','Weniger Zeit für Content':'less time on content','Meine Marke stärken':'building your brand'};"],
  ["buchungsNotiz(payload,'de')", "buchungsNotiz(payload,'en')"],
  ['turnstile:tok,elapsed:Date.now()-START};', "turnstile:tok,elapsed:Date.now()-START,sprache:'en'};"],
  ["      source:'formular',\n", "      source:'formular',\n      sprache:'en',\n"],

  // ── Skript: sichtbare Texte ──
  ["WEG==='a'?'Vorschau':WEG==='b'?'Gespräch':'Dein Weg'", "WEG==='a'?'Preview':WEG==='b'?'Call':'Your path'"],
  ["wort+' '+(liste.indexOf(n)+1)+' von '+liste.length", "wort+' '+(liste.indexOf(n)+1)+' of '+liste.length"],
  ["stelle(CHECK,'Frage')", "stelle(CHECK,'Question')"],
  ["stelle(WEG_A,'Vorschau · Schritt')", "stelle(WEG_A,'Preview · Step')"],
  ["stelle(WEG_B,'Gespräch · Schritt')", "stelle(WEG_B,'Call · Step')"],
  ["word:'ruhig & natürlich'", "word:'Calm & natural'"],
  ["word:'klar & professionell'", "word:'Clear & professional'"],
  ["word:'warm & nahbar'", "word:'Warm & approachable'"],
  ["word:'kraftvoll & mutig'", "word:'Strong & bold'"],
  ["$('#br-status').textContent='wird angelegt'", "$('#br-status').textContent='in progress'"],
  ["$('#f-name').value.trim()||'schön'", "$('#f-name').value.trim()||'there'"],
  ["return mbGesehen?n+' von 3':''", "return mbGesehen?n+' of 3':''"],
  ["react('#r-mb','Du bringst alles mit, was es braucht.')", "react('#r-mb','You bring everything it takes.')"],
  ["react('#r-mb','Gut. Den Rest klären wir im Gespräch.')", "react('#r-mb','Good. We’ll sort out the rest on the call.')"],
  ["$('#br-name').textContent=name||'Du'", "$('#br-name').textContent=name||'You'"],
  ["const BEISPIEL=[['3 Atemzüge vor dem Meeting','f1'],['Was ist Yin Yoga?','f2'],['Kursplan Herbst','f3'],['Warum Ruhe Arbeit ist','f2'],['Dein erster Kurs','f3'],['Frag mich alles','f1']];",
    "const BEISPIEL=[['3 breaths before the meeting','f1'],['What is yin yoga?','f2'],['Autumn class schedule','f3'],['Why rest is work','f2'],['Your first class','f3'],['Ask me anything','f1']];"],
  ["pvH.textContent='beispiel.yoga';pvN.textContent='Beispiel · Yogastudio';pvB.textContent='Ruhe für volle Wochen';pvAv.textContent='B';",
    "pvH.textContent='example.yoga';pvN.textContent='Example · Yoga studio';pvB.textContent='Calm for busy weeks';pvAv.textContent='E';"],
  ["$('#disclaimer').innerHTML='<b>Beispiel</b> · so sieht ein Ergebnis aus. Deins entsteht aus deinen Antworten.';",
    "$('#disclaimer').innerHTML='<b>Example</b> · this is what a result looks like. Yours is built from your answers.';"],
  ["pvH.textContent=h||'dein.profil'", "pvH.textContent=h||'your.profile'"],
  ["pvH.textContent=v||'dein.profil'", "pvH.textContent=v||'your.profile'"],
  ['`Schön, dich kennenzulernen, ${v}.`', '`Nice to meet you, ${v}.`'],
  ['`@${v} — sieht gut aus, das nehmen wir.`', '`@${v} — looks good, we’ll use that.`'],
  ["['Dein Thema','Warum jetzt?','3 Schritte'].forEach", "['Your topic','Why now?','3 steps'].forEach"],
  ['`Verstanden — daraus bauen wir deine Posts.`', '`Got it — we’ll build your posts from that.`'],
  ["waehlen('taetigkeit','Danke, so wissen wir, für wen wir bauen.');", "waehlen('taetigkeit','Thanks, now we know who we’re building for.');"],
  ["waehlen('ziel','Klares Ziel — darauf zahlt jeder Post ein.');", "waehlen('ziel','Clear goal — every post works towards it.');"],
  ["waehlen('budget','Danke, so bereitet Phil das Gespräch vor.');", "waehlen('budget','Thanks, that helps Phil prepare the call.');"],
  ["waehlen('start','Alles klar.');", "waehlen('start','Got it.');"],
  ["waehlen('zeit','Danke.');", "waehlen('zeit','Thanks.');"],
  ["taetigkeit:{coach:'Du verkaufst dein Wissen. Genau dafür bauen wir.',dienstleistung:'Du verkaufst eine Leistung. Die zeigen wir so, dass man sie bucht.',",
    "taetigkeit:{coach:'You sell your knowledge. That’s exactly what we build for.',dienstleistung:'You sell a service. We show it so people book it.',"],
  ["direktvertrieb:'Direktvertrieb geht, mit sauberen Aussagen. Darauf achten wir für dich.',creator:'Als Creator passt es, wenn du daraus Anfragen machen willst.',anders:'Dein Feld klären wir kurz, das bekommen wir hin.'},",
    "direktvertrieb:'Direct sales works, with honest claims. We take care of that for you.',creator:'As a creator it fits if you want to turn it into inquiries.',anders:'We’ll quickly clarify your field — we can make it work.'},"],
  ["stand:{'Ganz am Anfang':'Du fängst neu an. Wir bauen von null.','Poste unregelmäßig':'Es gibt dich schon. Wir machen daraus ein System.','Aktiv, will mehr':'Du bist aktiv. Jetzt kommt das nächste Level.'},",
    "stand:{'Ganz am Anfang':'You’re starting fresh. We build from zero.','Poste unregelmäßig':'You’re already out there. We turn it into a system.','Aktiv, will mehr':'You’re active. Now comes the next level.'},"],
  ["zeit:{kaum:'Wenig Zeit. Dann übernehmen wir.','1-3':'Ein bis drei Stunden. Damit lässt sich arbeiten.',mehr:'Du hast Zeit. Vieles kannst du selbst machen.'}",
    "zeit:{kaum:'Little time. Then we take over.','1-3':'One to three hours. We can work with that.',mehr:'You have time. You can do a lot yourself.'}"],
  ["return n===3?'Du bringst alles mit, was es braucht.':n?'Du bringst '+n+' von 3 mit. Den Rest klären wir im Gespräch.':'Was du mitbringst, klären wir im Gespräch.';",
    "return n===3?'You bring everything it takes.':n?'You bring '+n+' of 3. We’ll sort out the rest on the call.':'We’ll talk about what you bring on the call.';"],
  ["ziel?'Dein Ziel: '+ziel+'. Darauf zahlt jeder Beitrag ein.':''", "ziel?'Your goal: '+(ZIEL_EN[ziel]||ziel)+'. Every post works towards it.':''"],
  ["$('#passt-h').innerHTML='Du passt zu <em>uns</em>'", "$('#passt-h').innerHTML='We’re a good <em>fit</em>'"],
  ["eb.textContent='Wir schauen kurz';", "eb.textContent='Taking a quick look';"],
  ["$('#br-status').textContent='wird geprüft';", "$('#br-status').textContent='checking';"],
  ["eb.textContent='Ergebnis';", "eb.textContent='Result';"],
  ["$('#br-status').textContent='geprüft';", "$('#br-status').textContent='checked';"],
  ["lab=['Dein Thema','Warum jetzt?','3 Schritte','Zitat','Einblick','Über dich'];", "lab=['Your topic','Why now?','3 steps','Quote','Insight','About you'];"],
  ['`${m.word} — deine Farbwelt steht.`', '`${m.word} — your colour world is set.`'],
  ['`Alles klar — da holen wir dich genau ab.`', '`Got it — we’ll meet you right there.`'],
  ["$('#fotoLab').textContent='Anderes Foto';", "$('#fotoLab').textContent='Different photo';"],
  ["react('#r-foto','Schön! Dein Feed zeigt dich — mit Story-Ring.');", "react('#r-foto','Nice! Your feed shows you — with a story ring.');"],
  ["react('#r-foto','Das Bild ließ sich nicht lesen — probier ein anderes.','warn');", "react('#r-foto','That image couldn’t be read — try another one.','warn');"],
  ["$('#fotoLab').textContent='Foto auswählen';", "$('#fotoLab').textContent='Choose a photo';"],
  ["react('#r-farbe','Deine Farbe — dein Feed trägt sie als Akzent.');", "react('#r-farbe','Your colour — your feed uses it as an accent.');"],
  ['`Meintest du <b id="tf">${s}</b>?`', '`Did you mean <b id="tf">${s}</b>?`'],
  ['`Passt — dahin schicken wir deine Vorschau.`', '`Great — that’s where we’ll send your preview.`'],
  ["react('#r-mail','Bitte gib eine gültige E-Mail-Adresse ein.','warn')", "react('#r-mail','Please enter a valid email address.','warn')"],
  ["'Bitte tipp eine Antwort an.'", "'Please tap an answer.'"],
  ["b.textContent='Nochmal geschickt — schau ins Postfach';", "b.textContent='Sent again — check your inbox';"],
  ["email:'Bitte prüf deine E-Mail-Adresse.',\n    disposable:'Bitte prüf deine E-Mail-Adresse.',\n    email_domain:'Bitte prüf deine E-Mail-Adresse.',\n    handle:'Bitte prüf deinen Instagram-Namen.',\n    name:'Bitte gib deinen Namen ein.',\n    branche:'Bitte ergänze dein Thema.',\n    ziel:'Bitte wähl dein Ziel.',\n    taetigkeit:'Bitte wähl aus, was du machst.',\n    consent:'Bitte bestätige die Einwilligung.',\n    captcha:'Sicherheitscheck nicht bestanden — Seite neu laden und nochmal.',\n    rate_limited:'Kurz warten und nochmal versuchen.',",
    "email:'Please check your email address.',\n    disposable:'Please check your email address.',\n    email_domain:'Please check your email address.',\n    handle:'Please check your Instagram name.',\n    name:'Please enter your name.',\n    branche:'Please add your topic.',\n    ziel:'Please choose your goal.',\n    taetigkeit:'Please choose what you do.',\n    consent:'Please confirm your consent.',\n    captcha:'Security check failed — reload the page and try again.',\n    rate_limited:'Please wait a moment and try again.',"],
  ["react('#r-mail','Bitte bestätige die Einwilligung.','warn')", "react('#r-mail','Please confirm your consent.','warn')"],
  ["label.textContent='Wird gesendet…';", "label.textContent='Sending…';"],
  ["SUBMIT_FEHLER[data&&data.error]||'Kurz warten und nochmal versuchen.'", "SUBMIT_FEHLER[data&&data.error]||'Please wait a moment and try again.'"],
  ["react('#r-mail','Keine Verbindung — kurz warten und nochmal versuchen.','warn');", "react('#r-mail','No connection — please wait a moment and try again.','warn');"],
  ["const B_FEHLER={email:'Bitte prüf deine E-Mail-Adresse.',email_domain:'Diese E-Mail-Adresse gibt es nicht — bitte prüfen.',\n    phone:'Bitte gib eine Telefonnummer für den Rückruf an.',name:'Bitte gib oben deinen Namen ein.',captcha:'Sicherheitscheck nicht bestanden — kurz warten und nochmal.',\n    rate_limited:'Kurz warten und nochmal versuchen.'};",
    "const B_FEHLER={email:'Please check your email address.',email_domain:'That email address doesn’t exist — please check it.',\n    phone:'Please enter a phone number so Phil can call you back.',name:'Please enter your name above.',captcha:'Security check failed — please wait a moment and try again.',\n    rate_limited:'Please wait a moment and try again.'};"],
  ["react('#r-b','Bitte gib eine gültige E-Mail-Adresse ein.','warn')", "react('#r-b','Please enter a valid email address.','warn')"],
  ["react('#r-b','Bitte bestätige die Datenschutzerklärung.','warn')", "react('#r-b','Please confirm the privacy policy.','warn')"],
  ["react('#r-b','Die Sicherheitsprüfung läuft noch. Bitte in ein paar Sekunden erneut.','warn')", "react('#r-b','The security check is still running. Please try again in a few seconds.','warn')"],
  ["'Bringt mit: '+mbWahl().join(', ')", "'Brings: '+mbWahl().join(', ')"],
  ["$('#echo-b').textContent=payload.name||'dir';", "$('#echo-b').textContent=payload.name||'you';"],
  ["B_FEHLER[data&&data.error]||'Gerade nicht angekommen — bitte kurz warten und nochmal senden.'", "B_FEHLER[data&&data.error]||'That didn’t go through — please wait a moment and send it again.'"],
  ["react('#r-b','Keine Verbindung — kurz warten und nochmal senden.','warn');", "react('#r-b','No connection — please wait a moment and send it again.','warn');"],
];

/** Ersetzt jede Zeile der Tabelle; eine Zeile ohne Treffer ist ein Fehler (Quelle hat sich geaendert). */
export function uebersetzen(html, tabelle = TABELLE) {
  const fehlt = tabelle.filter(([alt]) => !html.includes(alt)).map(([alt]) => alt.slice(0, 80));
  if (fehlt.length) throw new Error('form-en: nicht in der deutschen Seite gefunden: ' + fehlt.join(' | '));
  return tabelle.reduce((h, [alt, neu]) => h.split(alt).join(neu), html);
}

/**
 * Baut die englische Formular-Seite (`GET /en/`), gleiche Header wie die deutsche.
 * @param {{TURNSTILE_SITE_KEY?:string}} env
 * @returns {Promise<Response>}
 */
export async function formPageEn(env) {
  const de = formPage(env);
  return new Response(mitEnglischemFilm(uebersetzen(await de.text())), { status: de.status, headers: de.headers });
}

/**
 * Der Setting-Film auf Englisch (Sebi 25.10.: „ja eig soll alles auch so klappen am ende“, #378):
 * gleicher Film, gleiche Gestaltung — die beiden deutschen Filme und das deutsche Film-Skript werden
 * gegen ihre englischen Fassungen getauscht (film.js filmMarkup/filmScript mit 'en'). Der Stil bleibt.
 */
export function mitEnglischemFilm(html) {
  let n = 0;
  let neu = html.replace(/<figure class="film" data-film="([ab])">[\s\S]*?<\/figure>/g, (_, w) => { n++; return filmMarkup(w, 'en').trim(); });
  let s = 0;
  neu = neu.replace(/\/\*FILM:ANFANG\*\/[\s\S]*?\/\*FILM:ENDE\*\//g, (m) => (m.includes('function filmZeigen') ? (s++, filmScript('en')) : m));
  if (n !== 2 || s !== 1) throw new Error(`form-en: Film nicht getauscht (Filme ${n}/2, Skript ${s}/1)`);
  return neu;
}
