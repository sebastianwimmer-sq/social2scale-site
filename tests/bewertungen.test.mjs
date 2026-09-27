/**
 * Tore fuer den Bewertungs-Bauschritt.
 *
 * Aufruf: node --test tests/bewertungen.test.mjs
 *
 * Jedes Tor wird in BEIDE Richtungen geprueft: ein Fall, der rot werden MUSS,
 * und einer, der gruen bleiben MUSS. Ein Waechter, den man nie hat anschlagen
 * sehen, ist keiner.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  abschnittBauen,
  alterPruefen,
  einsetzen,
  maskieren,
  nummerieren,
} from '../scripts/bewertungen-bauen.mjs';

/** Fiktive Namen — echte Kundennamen haben in Fixtures nichts verloren. */
const SAUBER = {
  geholt_am: new Date().toISOString(),
  profil: 'Beispielbetrieb',
  profil_url: 'https://maps.google.com/?cid=000',
  schnitt: 4.8,
  anzahl_gesamt: 6,
  bewertungen: [
    {
      id: 'x/1',
      autor: 'Marlene Ostermann',
      initialen: 'MO',
      sterne: 5,
      text: 'Nach acht Wochen kamen die ersten Anfragen ueber Instagram statt ueber Empfehlung.',
      veroeffentlicht: '2026-09-01T10:00:00Z',
      wann: 'vor 2 Wochen',
    },
    {
      id: 'x/2',
      autor: 'Tilda Bruns',
      initialen: 'TB',
      sterne: 4,
      text: 'Die Abstimmung war anfangs zaeh, das Ergebnis stimmt.',
      veroeffentlicht: '2026-08-20T10:00:00Z',
      wann: 'vor einem Monat',
    },
  ],
};

const LEER = { ...SAUBER, bewertungen: [], anzahl_gesamt: 0, schnitt: null };

describe('Abschnitt bauen', () => {
  test('MUSS GRUEN: echte Bewertungen erzeugen Karten samt Quelle', () => {
    const html = abschnittBauen(SAUBER);
    assert.match(html, /<section class="rs-blk" id="stimmen"/);
    assert.equal((html.match(/class="bw-karte"/g) ?? []).length, 2);
    assert.match(html, /Marlene Ostermann/);
    assert.match(html, /Alle Bewertungen auf Google ansehen/);
    assert.match(html, /6 Google-Bewertungen/);
    assert.match(html, /Schnitt 4,8/, 'Dezimaltrenner muss deutsch sein');
  });

  test('MUSS ROT: null Bewertungen erzeugen KEINEN Abschnitt', () => {
    const html = abschnittBauen(LEER);
    assert.doesNotMatch(html, /<section/, 'leerer Kasten ist schlechter als keiner');
    assert.match(html, /bewusst leer/);
  });

  // Das Tor darf nur das AUSGELIEFERTE Markup pruefen. Beim ersten Lauf schlug
  // es auf den eigenen Warnkommentar an ("KEIN aggregateRating…") — ein Tor,
  // das den Hinweis auf ein Verbot fuer den Verstoss haelt, steht dauerhaft rot.
  const ohneKommentare = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

  test('MUSS ROT: kein Schema-Markup, niemals', () => {
    const html = ohneKommentare(abschnittBauen(SAUBER));
    assert.doesNotMatch(
      html,
      /aggregateRating|"@type"\s*:\s*"Review"|itemprop=|application\/ld\+json/i,
      'self-serving reviews koennen eine manuelle Massnahme fuer die ganze Domain ausloesen'
    );
  });

  test('MUSS GRUEN: der Warnkommentar im Markup darf das Tor NICHT ausloesen', () => {
    assert.match(abschnittBauen(SAUBER), /KEIN aggregateRating/,
      'der Hinweis soll drinbleiben — er haelt spaetere "Verbesserungen" ab');
  });

  test('MUSS ROT: kein fremder Host im Markup', () => {
    const html = ohneKommentare(abschnittBauen(SAUBER));
    // googleusercontent (Profilbilder) wuerde an img-src 'self' data: scheitern
    // und eine 0x0-Box hinterlassen, die kein Statuscode-Test bemerkt.
    assert.doesNotMatch(html, /googleusercontent|<script|<iframe/i);
  });

  test('Einzahl/Mehrzahl bei genau einer Bewertung', () => {
    const eins = { ...SAUBER, anzahl_gesamt: 1, bewertungen: [SAUBER.bewertungen[0]] };
    assert.match(abschnittBauen(eins), /1 Google-Bewertung /);
    assert.doesNotMatch(abschnittBauen(eins), /1 Google-Bewertungen/);
  });
});

describe('Maskierung', () => {
  test('MUSS ROT: Markup aus einem Bewertungstext wird unschaedlich', () => {
    const boese = {
      ...SAUBER,
      bewertungen: [
        {
          ...SAUBER.bewertungen[0],
          autor: '"><script>alert(1)</script>',
          text: 'Top! <img src=x onerror=alert(1)> & weiter',
        },
      ],
    };
    const html = abschnittBauen(boese);
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&amp; weiter/, 'kaufmaennisches Und muss erhalten bleiben');
  });

  test('MUSS GRUEN: Umlaute bleiben unangetastet', () => {
    assert.equal(maskieren('Grüße, Rühl'), 'Grüße, Rühl');
  });
});

describe('Alter des Standes (Googles 30-Tage-Grenze)', () => {
  const jetzt = new Date('2026-10-01T12:00:00Z');

  test('MUSS GRUEN: 29 Tage alt geht durch', () => {
    assert.equal(alterPruefen('2026-09-02T12:00:00Z', jetzt), 29);
  });

  test('MUSS ROT: 31 Tage alt bricht ab', () => {
    assert.throws(
      () => alterPruefen('2026-08-31T11:00:00Z', jetzt),
      /30 Tage Zwischenspeicherung/
    );
  });

  test('MUSS ROT: fehlendes Datum ist ein eigener Befund, keine stille Null', () => {
    assert.throws(() => alterPruefen('', jetzt), /geholt_am/);
    assert.throws(() => alterPruefen('gestern', jetzt), /kein Datum/);
  });
});

describe('Einsetzen in die Seite', () => {
  const seite = `<main>\n  <!-- BEWERTUNGEN -->\n  ALT\n  <!-- /BEWERTUNGEN -->\n</main>`;

  test('MUSS GRUEN: ersetzt nur zwischen den Markern und laesst sie stehen', () => {
    const neu = einsetzen(seite, '    NEU');
    assert.match(neu, /<!-- BEWERTUNGEN -->/);
    assert.match(neu, /<!-- \/BEWERTUNGEN -->/);
    assert.match(neu, /NEU/);
    assert.doesNotMatch(neu, /ALT/);
    assert.match(neu, /^<main>/);
  });

  test('MUSS GRUEN: zweimal bauen ergibt dasselbe (kein Aufschaukeln)', () => {
    const a = einsetzen(seite, abschnittBauen(SAUBER));
    const b = einsetzen(a, abschnittBauen(SAUBER));
    assert.equal(a, b);
  });

  test('MUSS ROT: fehlender Marker ist ein lauter Fehler, kein stiller Durchlauf', () => {
    assert.throws(() => einsetzen('<main>ohne Marker</main>', 'X'), /Marker/);
  });
});

describe('nummerieren', () => {
  const rubrik = (n) => `<p class="rs-rh"><b>№ ${n}</b> — X</p>`;

  test('Luecke wird geschlossen (ohne Bewertungen kein Sprung von 05 auf 07)', () => {
    const html = [rubrik('01'), rubrik('05'), rubrik('07')].join('');
    assert.equal(nummerieren(html), [rubrik('01'), rubrik('02'), rubrik('03')].join(''));
  });

  test('lueckenlose Folge bleibt byte-gleich', () => {
    const html = [rubrik('01'), rubrik('02'), rubrik('03')].join('');
    assert.equal(nummerieren(html), html);
  });
});
