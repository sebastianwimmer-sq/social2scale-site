import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formPage } from '../src/pages/form.js';
import { filmMarkup } from '../src/pages/film.js';
import { FILM } from '../src/pages/film-daten.js';

// Setting-Film nach dem Abschicken (17.–25.10.2026). Was hier steht, sind stehende Entscheidungen:
// KI sichtbar gekennzeichnet (AI Act Art. 50), keine Gruenderfotos im Film (Sebi 23.10.: „kann sich ja
// mal aktualisieren“), Erstgespraech etwa 45 Minuten (#62), Ton nur aus social2scale.com (CSP).
const html = await formPage({ TURNSTILE_SITE_KEY: 'x' }).text();
const film = (w) => { const a = html.indexOf(`<figure class="film" data-film="${w}">`); assert.ok(a > 0, 'Film ' + w + ' fehlt'); return html.slice(a, html.indexOf('</figure>', a)); };

test('beide Filme stehen im Funnel: A nach der Mail (Schritt 11), B nach der Anfrage (Schritt 15)', () => {
  const s11 = html.slice(html.indexOf('class="q" data-step="11"'), html.indexOf('class="q" data-step="12"'));
  const s15 = html.slice(html.indexOf('class="q" data-step="15"'), html.indexOf('class="q" data-step="16"'));
  assert.match(s11, /data-film="a"/);
  assert.match(s15, /data-film="b"/);
});

test('KI-Kennzeichnung steht sichtbar im Bild und in der Bildunterschrift', () => {
  for (const w of ['a', 'b']) {
    assert.match(film(w), /<span class="film-ki">KI-generiert<\/span>/);
    assert.match(film(w), /<figcaption>Avatar und Stimme sind KI-generiert/);
  }
});

test('keine Fotos von Phil oder Sebastian im Film', () => {
  for (const w of ['a', 'b']) assert.doesNotMatch(filmMarkup(w), /founder-|<img/);
});

test('Erstgespraech etwa 45 Minuten, nirgends mehr 20', () => {
  const alles = filmMarkup('a') + filmMarkup('b') + JSON.stringify(FILM);
  assert.match(alles, /45 Minuten/);
  assert.doesNotMatch(alles, /\b20 Minuten|zwanzig/);
});

test('jeder Untertitel hat je Wort eine Zeit, steigend und im Untertitel', () => {
  for (const w of ['a', 'b']) for (const c of FILM[w].untertitel) {
    assert.equal(c.worte.length, c.text.split(' ').length, c.text);
    c.worte.forEach((z, k) => {
      assert.ok(z >= c.von - 0.01 && z <= c.bis, `${c.text}: Wort ${k} bei ${z}`);
      if (k) assert.ok(z >= c.worte[k - 1], `${c.text}: Wort ${k} vor Wort ${k - 1}`);
    });
  }
});

test('jede Szene der Zeitleiste hat Markup, jede Wortmarke liegt in ihrem Abschnitt', () => {
  for (const w of ['a', 'b']) {
    assert.doesNotThrow(() => filmMarkup(w));
    for (const a of FILM[w].abschnitte) for (const [m, z] of Object.entries(a.marken))
      assert.ok(z >= a.von && z < a.bis, `${w}/${a.szene}/${m} bei ${z} ausserhalb ${a.von}–${a.bis}`);
  }
});

test('Film-Dateien kommen nur von social2scale.com, die CSP erlaubt genau das', () => {
  const shell = readFileSync(new URL('../src/pages/shell.js', import.meta.url), 'utf8');
  assert.match(shell, /"media-src https:\/\/social2scale\.com"/);
  for (const w of ['a', 'b']) assert.match(filmMarkup(w), new RegExp(`src="https://social2scale\\.com/assets/film-${w}\\.mp4"`));
});

test('Zaehlpfade des Films passen zur Portal-Freigabe (VORSCHAU_FILM: Start, auto, ton, ende, termin)', () => {
  const skript = html.slice(html.indexOf('function filmZeigen'));
  for (const was of ["'-auto'", "'-ton'", "'-ende'", "'-termin'"]) assert.ok(skript.includes(was), was);
  assert.match(html, /n\.startsWith\('film-'\)\)return '\/vorschau\/'\+n\.split\('-'\)\.join\('\/'\)\+'\/'/);
});
