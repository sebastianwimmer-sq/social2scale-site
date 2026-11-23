import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  pruefeStart, teile, teilGroesse, istVideoKopf, reelCheckApi, bestaetigen, stand, reelCheckAufraeumen,
  reelCheckPost, reelCheckWaechter, WAECHTER_TITEL, MARKIERT_TITEL, WAECHTER_MIN,
  TEIL_BYTES, MAX_BYTES, MIN_BYTES, JE_ADRESSE_AM_TAG, PLATTFORMEN, LOESCH_FRIST_TAGE, EINWILLIGUNG_FASSUNG,
} from '../src/reel-check.js';
import { reelCheckSeite, reelCheckStandSeite, TEXTE } from '../src/pages/reel-check.js';

// D1-Hülle um echtes SQLite mit dem echten Schema aus der Migration; R2 als Speicher mit echter Teile-Logik.
function welt() {
  const s = new DatabaseSync(':memory:');
  for (const m of ['2026-11-15-reel-check.sql', '2026-11-21-reel-check-person.sql', '2026-11-21b-reel-check-telefon.sql']) s.exec(readFileSync(new URL('../migrationen/' + m, import.meta.url), 'utf8'));
  s.exec('CREATE TABLE free_intake_log (ip TEXT, created_at TEXT)');
  s.exec('CREATE TABLE tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER, type TEXT, title TEXT, body TEXT, status TEXT, priority TEXT, source TEXT, owner TEXT, updated_at TEXT, done_at TEXT, done_note TEXT)');
  const prep = (sql, args = []) => ({
    bind: (...a) => prep(sql, a),
    all: async () => ({ results: s.prepare(sql).all(...args) }),
    first: async () => s.prepare(sql).get(...args) ?? null,
    run: async () => { const r = s.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
  });
  const ablage = new Map(); const offen = new Map(); let nr = 0;
  const mp = (key, id) => ({
    uploadId: id,
    uploadPart: async (n, daten) => { offen.get(id).set(n, new Uint8Array(daten)); return { partNumber: n, etag: `e${n}` }; },
    complete: async (liste) => {
      const t = offen.get(id); const stuecke = liste.map((x) => { assert.equal(x.etag, `e${x.partNumber}`); return t.get(x.partNumber); });
      const ganz = new Uint8Array(stuecke.reduce((a, b) => a + b.length, 0)); let o = 0;
      for (const b of stuecke) { ganz.set(b, o); o += b.length; }
      ablage.set(key, ganz); offen.delete(id); return { size: ganz.length };
    },
    abort: async () => { offen.delete(id); },
  });
  const IMAGES = {
    createMultipartUpload: async (key) => { const id = `u${++nr}`; offen.set(id, new Map()); return mp(key, id); },
    resumeMultipartUpload: (key, id) => mp(key, id),
    get: async (key) => (ablage.has(key) ? { text: async () => new TextDecoder().decode(ablage.get(key)) } : null),
    put: async (key, v) => ablage.set(key, new TextEncoder().encode(v)),
    delete: async (k) => { for (const x of [].concat(k)) ablage.delete(x); },
  };
  const mails = [];
  const echt = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('api.brevo.com')) {
      const m = JSON.parse(init.body);
      // wie das echte Brevo: ein leerer Name im Empfänger ist ein 400 (15.11.2026 live so passiert, die Attrappe hatte es durchgelassen)
      if (m.to.some((e) => 'name' in e && !e.name)) return new Response('{"code":"missing_parameter","message":"name is missing in to"}', { status: 400 });
      mails.push(m); return new Response('{}', { status: 201 });
    }
    if (u.includes('cloudflare-dns.com')) return new Response(JSON.stringify({ Answer: [{}] }));
    throw new Error('unerwarteter Abruf ' + u);
  };
  const env = { DB: { prepare: (sql) => prep(sql) }, IMAGES, BREVO_API_KEY: 'x', NOTIFY_FROM: 'info@example.org', PUBLIC_ORIGIN: 'https://start.example.org' };
  return { s, env, ablage, offen, mails, ende: () => { globalThis.fetch = echt; } };
}

const GUT = { email: 'Lead@Example.org', zielgruppe: 'Frauen ab 40, die wieder Sport machen', spricht: 'nein', lage: 'besser', einwilligung: true, mime: 'video/mp4', bytes: TEIL_BYTES + 300_000 };
const ruf = (env, pfad, method, body, kopf = {}) => {
  const url = new URL('https://start.example.org' + pfad);
  const init = { method, headers: { 'CF-Connecting-IP': '203.0.113.9', ...kopf } };
  if (body !== undefined) init.body = body instanceof Uint8Array ? body : JSON.stringify(body);
  if (body instanceof Uint8Array) init.headers['content-length'] = String(body.length);
  return reelCheckApi(new Request(url, init), env, { waitUntil() {} }, {}, url);
};
function video(bytes) {
  const b = new Uint8Array(bytes); b.set([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]); return b;
}
async function hochladen(w, daten = GUT) {
  const r = await (await ruf(w.env, '/api/reel-check/start', 'POST', daten)).json();
  assert.equal(r.ok, true); const v = video(daten.bytes); const etags = [];
  for (let n = 1; n <= r.teile; n++) {
    const t = await (await ruf(w.env, `/api/reel-check/teil/${r.token}/${n}`, 'PUT', v.slice((n - 1) * r.teil, n * r.teil))).json();
    assert.equal(t.ok, true, JSON.stringify(t)); etags.push({ nr: n, etag: t.etag });
  }
  return { token: r.token, etags, antwort: r };
}

test('Anmeldung: jede Lücke hat ihren eigenen Schlüssel, Einwilligung zählt nur als ausdrückliches true', () => {
  assert.equal(pruefeStart(GUT).ok, true);
  for (const [feld, wert, fehler] of [['email', 'keine', 'email'], ['zielgruppe', 'ab', 'zielgruppe'], ['spricht', 'vielleicht', 'spricht'], ['lage', 'x', 'lage'],
    ['einwilligung', 'true', 'einwilligung'], ['einwilligung', 1, 'einwilligung'], ['bytes', MAX_BYTES + 1, 'video_gross'], ['bytes', MIN_BYTES - 1, 'video_klein'],
    ['mime', 'video/webm', 'video_art'], ['mime', 'image/png', 'video_art'], ['email', 'a@mailinator.com', 'disposable']]) {
    assert.equal(pruefeStart({ ...GUT, [feld]: wert }).error, fehler, feld + '=' + wert);
  }
  assert.equal(pruefeStart({ ...GUT, bytes: MAX_BYTES }).ok, true, 'genau die Grenze geht noch');
  assert.equal(pruefeStart({ ...GUT, bytes: MIN_BYTES }).ok, true);
  // seit dem 21.11.2026 fragt die Seite nur noch Video, Plattform, Vorname, Adresse: der Rest darf fehlen, Falsches bleibt falsch
  const KURZ = { email: 'lead@example.org', einwilligung: true, mime: 'video/mp4', bytes: MIN_BYTES };
  const k = pruefeStart(KURZ).value;
  assert.deepEqual([k.zielgruppe, k.spricht, k.lage, k.vorname, k.plattform], ['', '', '', '', 'instagram']);
  for (const pl of PLATTFORMEN) assert.equal(pruefeStart({ ...KURZ, plattform: pl }).value.plattform, pl);
  assert.equal(pruefeStart({ ...KURZ, plattform: 'myspace' }).error, 'plattform'); assert.equal(pruefeStart({ ...KURZ, plattform: '' }).error, 'plattform');
  assert.equal(pruefeStart({ ...KURZ, vorname: '  <b>Ana</b>\u0000 ' + 'x'.repeat(80) }).value.vorname.length, 40);
  assert.doesNotMatch(pruefeStart({ ...KURZ, vorname: '<script>"Ana"&' }).value.vorname, /[<>&"]/);
  assert.equal(pruefeStart(KURZ).value.telefon, ''); assert.equal(pruefeStart({ ...KURZ, telefon: ' +49 (171) 234-5678 ' }).value.telefon, '+491712345678');
  for (const falsch of ['ruf mich an', '123', '+49 171 <b>', '0171 2345678 und 0172 9999999 oder so']) assert.equal(pruefeStart({ ...KURZ, telefon: falsch }).error, 'telefon', falsch);
  const v = pruefeStart({ ...GUT, zielgruppe: 'Mütter\u0000 <b>in</b>\nElternzeit', website: 'x', sprache: 'fr' }).value;
  assert.equal(v.zielgruppe, 'Mütter <b>in</b> Elternzeit'); assert.equal(v.spam, 1); assert.equal(v.sprache, 'de');
});

test('Teile: Größen ergeben zusammen genau das Video', () => {
  for (const bytes of [MIN_BYTES, TEIL_BYTES, TEIL_BYTES + 1, 3 * TEIL_BYTES - 5, MAX_BYTES]) {
    let summe = 0; for (let n = 1; n <= teile(bytes); n++) summe += teilGroesse(bytes, n);
    assert.equal(summe, bytes); assert.equal(teilGroesse(bytes, 0), 0); assert.equal(teilGroesse(bytes, teile(bytes) + 1), 0);
  }
  assert.equal(istVideoKopf(video(64)), true); assert.equal(istVideoKopf(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])), false);
});

test('ganzer Weg: hochladen → der Mac darf sofort prüfen, ohne Mail-Klick → Befund', async () => {
  const w = welt();
  try {
    const { token, etags } = await hochladen(w);
    assert.equal(w.mails.length, 0, 'vor dem Abschluss geht keine Mail raus');
    const f = await (await ruf(w.env, `/api/reel-check/fertig/${token}`, 'POST', { teile: etags })).json();
    assert.equal(f.ok, true);
    const z = w.s.prepare('SELECT * FROM reel_check').get();
    assert.equal(z.status, 'da', 'kein Umweg über eine Bestätigungsmail'); assert.ok(z.confirmed_at, 'die Löschfrist läuft ab dem Hochladen'); assert.equal(z.einwilligung_fassung, EINWILLIGUNG_FASSUNG); assert.equal(z.email, 'lead@example.org'); assert.equal(z.upload_id, null);
    assert.equal(w.ablage.get(`reelcheck/${token}/reel.mp4`).length, GUT.bytes);
    assert.equal(w.mails.length, 0, 'beim Hochladen geht keine Mail raus, die erste ist der Befund');
    assert.equal((await ruf(w.env, `/api/reel-check/fertig/${token}`, 'POST', { teile: etags })).status, 404, 'zweiter Abschluss ändert nichts');
    assert.equal((await bestaetigen(w.env, token)).status, 'da', 'ein alter Bestätigungslink ist harmlos');
    assert.equal((await stand(w.env, token)).status, 'da');
    w.s.exec("UPDATE reel_check SET status='fertig'");
    assert.equal((await stand(w.env, token)).status, 'in_arbeit', 'fertig ohne Befund-Datei zeigt nie eine leere Seite');
    // Die Profil-Vorschau übernimmt Vorname und Adresse aus dem Befund: nur mit dem echten Link, nie für Fremde
    const pers = await (await ruf(w.env, `/api/reel-check/person/${token}`, 'GET')).json();
    assert.deepEqual(pers, { ok: true, vorname: '', email: 'lead@example.org' });
    assert.equal((await ruf(w.env, `/api/reel-check/person/${'b'.repeat(48)}`, 'GET')).status, 404);
    await w.env.IMAGES.put(`reelcheck/${token}/befund.html`, '<!doctype html><title>Befund</title>');
    const st = await stand(w.env, token); assert.equal(st.status, 'fertig'); assert.match(st.befund, /Befund/);
  } finally { w.ende(); }
});

test('nach der Prüfung: genau eine Mail an die Person, der Hinweis an uns nennt keine Adresse, Fehler bekommt eine eigene Mail', async () => {
  const w = welt();
  try {
    const { token, etags } = await hochladen(w);
    await ruf(w.env, `/api/reel-check/fertig/${token}`, 'POST', { teile: etags });
    await bestaetigen(w.env, token);
    w.mails.length = 0;
    assert.equal(await reelCheckPost(w.env), 0, 'solange geprüft wird, geht nichts raus');
    w.s.exec("UPDATE reel_check SET status='fertig', zahl=62");
    assert.equal(await reelCheckPost(w.env), 0, 'fertig ohne Befund-Datei: keine Mail auf eine leere Seite');
    await w.env.IMAGES.put(`reelcheck/${token}/befund.html`, '<!doctype html><title>Befund</title>');
    assert.equal(await reelCheckPost(w.env), 1);
    assert.equal(w.mails.length, 2);
    assert.equal(w.mails[0].to[0].email, 'lead@example.org'); assert.match(w.mails[0].htmlContent, new RegExp(`/rc/${token}`)); assert.match(w.mails[0].htmlContent, /30 Tage/);
    assert.equal(w.mails[1].to[0].email, 'info@example.org'); assert.match(w.mails[1].subject, /62 von 100/);
    assert.doesNotMatch(JSON.stringify(w.mails[1]), /lead@example\.org/i, 'der Hinweis an uns trägt die Adresse nicht');
    assert.equal(await reelCheckPost(w.env), 0, 'zweiter Lauf: keine zweite Mail'); assert.equal(w.mails.length, 2);
    // Fehler nach der Bestätigung: eigene Mail mit dem Weg zurück zum Upload, kein Hinweis an uns (dafür gibt es das Ticket der Wache)
    const zwei = await hochladen(w, { ...GUT, email: 'zwei@example.org', sprache: 'en' });
    await ruf(w.env, `/api/reel-check/fertig/${zwei.token}`, 'POST', { teile: zwei.etags }); await bestaetigen(w.env, zwei.token);
    w.mails.length = 0; w.s.prepare("UPDATE reel_check SET status='fehler', fehler='nicht_lesbar' WHERE token=?").run(zwei.token);
    assert.equal(await reelCheckPost(w.env), 1); assert.equal(w.mails.length, 1);
    assert.match(w.mails[0].subject, /could not check/); assert.match(w.mails[0].htmlContent, /\/en\/reel-check\//);
    // markierte Zeile: keine Mail
    const drei = await hochladen(w, { ...GUT, email: 'drei@example.org', website: 'x' });
    await ruf(w.env, `/api/reel-check/fertig/${drei.token}`, 'POST', { teile: drei.etags }); await bestaetigen(w.env, drei.token);
    w.mails.length = 0; w.s.prepare("UPDATE reel_check SET status='fertig' WHERE token=?").run(drei.token);
    await w.env.IMAGES.put(`reelcheck/${drei.token}/befund.html`, 'x');
    assert.equal(await reelCheckPost(w.env), 0);
  } finally { w.ende(); }
});

test(`Wächter: bestätigte Reels, die länger als ${WAECHTER_MIN} Minuten warten, werden ein Ticket, das sich selbst schließt; Markierte bekommen ein eigenes`, async () => {
  const w = welt();
  try {
    const { token, etags } = await hochladen(w);
    await ruf(w.env, `/api/reel-check/fertig/${token}`, 'POST', { teile: etags }); await bestaetigen(w.env, token);
    assert.deepEqual(await reelCheckWaechter(w.env), { steht: 'ruhig', markiert: 'ruhig' }, 'frisch bestätigt ist kein Stau');
    w.s.exec(`UPDATE reel_check SET updated_at = datetime('now', '-${WAECHTER_MIN - 1} minutes')`);
    assert.equal((await reelCheckWaechter(w.env)).steht, 'ruhig', 'kurz vor der Schwelle: ruhig');
    w.s.exec(`UPDATE reel_check SET updated_at = datetime('now', '-${WAECHTER_MIN + 1} minutes')`);
    assert.equal((await reelCheckWaechter(w.env)).steht, 'gemeldet');
    assert.equal((await reelCheckWaechter(w.env)).steht, 'schon gemeldet');
    const t = w.s.prepare('SELECT * FROM tickets').all(); assert.equal(t.length, 1); assert.equal(t[0].title, WAECHTER_TITEL);
    assert.doesNotMatch(t[0].body, /example\.org/, 'das Ticket nennt keine Adresse');
    w.s.exec("UPDATE reel_check SET status='fertig'");
    assert.equal((await reelCheckWaechter(w.env)).steht, 'geschlossen');
    w.s.exec("UPDATE reel_check SET status='da', spam=1");
    const r = await reelCheckWaechter(w.env); assert.equal(r.markiert, 'gemeldet'); assert.equal(r.steht, 'ruhig', 'Markierte zählen nicht als Stau der Wache');
    assert.equal(w.s.prepare("SELECT title FROM tickets WHERE status='offen'").get().title, MARKIERT_TITEL);
  } finally { w.ende(); }
});

test('Upload-Schutz: falsche Teilgröße, kein Video, fremder Token, unbestätigt bleibt unbestätigt', async () => {
  const w = welt();
  try {
    const r = await (await ruf(w.env, '/api/reel-check/start', 'POST', GUT)).json();
    assert.equal((await ruf(w.env, `/api/reel-check/teil/${r.token}/1`, 'PUT', video(TEIL_BYTES + 1))).status, 400, 'ein Byte zu viel');
    assert.equal((await ruf(w.env, `/api/reel-check/teil/${r.token}/1`, 'PUT', video(TEIL_BYTES - 1))).status, 400, 'ein Byte zu wenig');
    assert.equal((await ruf(w.env, `/api/reel-check/teil/${r.token}/3`, 'PUT', video(16))).status, 400, 'Teil, den es nicht gibt');
    const png = new Uint8Array(TEIL_BYTES); png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal((await (await ruf(w.env, `/api/reel-check/teil/${r.token}/1`, 'PUT', png)).json()).error, 'video_art', 'Bild mit Video-Endung');
    assert.equal((await ruf(w.env, `/api/reel-check/teil/${'a'.repeat(48)}/1`, 'PUT', video(TEIL_BYTES))).status, 404);
    assert.equal((await ruf(w.env, `/api/reel-check/fertig/${r.token}`, 'POST', { teile: [{ nr: 1, etag: 'e1' }] })).status, 400, 'Abschluss mit fehlendem Teil');
    assert.equal((await bestaetigen(w.env, r.token)).ok, false, 'ohne vollständiges Video gibt es nichts zu bestätigen');
    assert.equal(w.mails.length, 0);
    assert.equal((await (await ruf(w.env, `/api/reel-check/status/${'b'.repeat(48)}`, 'GET')).json()).status, 'not_found');
  } finally { w.ende(); }
});

test(`Bremse: ${JE_ADRESSE_AM_TAG} Prüfungen je Adresse am Tag, die nächste wird abgewiesen`, async () => {
  const w = welt();
  try {
    for (let i = 0; i < JE_ADRESSE_AM_TAG; i++) {
      w.s.exec('DELETE FROM free_intake_log');
      assert.equal((await ruf(w.env, '/api/reel-check/start', 'POST', { ...GUT, email: 'l.e.a.d+x@gmail.com' })).status, 200);
    }
    w.s.exec('DELETE FROM free_intake_log');
    assert.equal((await ruf(w.env, '/api/reel-check/start', 'POST', { ...GUT, email: 'lead@googlemail.com' })).status, 429, 'andere Schreibweise derselben Adresse');
    assert.equal((await ruf(w.env, '/api/reel-check/start', 'POST', { ...GUT, email: 'andere@example.org' })).status, 200);
  } finally { w.ende(); }
});

test('ein Gratis-Check je Adresse: liegt das Video einmal vollständig, wird die nächste Anmeldung abgewiesen; Abbruch und Fehler verbrauchen ihn nicht', async () => {
  const w = welt();
  try {
    const neu = async (email) => { w.s.exec('DELETE FROM free_intake_log'); return ruf(w.env, '/api/reel-check/start', 'POST', { ...GUT, email }); };
    await hochladen(w, { ...GUT, email: 'eins@example.org' });                               // bleibt bei laedt (abgebrochen)
    assert.equal((await neu('eins@example.org')).status, 200, 'ein abgebrochener Upload verbraucht den Check nicht');
    const b = await hochladen(w, { ...GUT, email: 'zwei@example.org' });
    await ruf(w.env, `/api/reel-check/fertig/${b.token}`, 'POST', { teile: b.etags });       // da
    const r = await neu('Zwei@Example.org');
    assert.equal(r.status, 409); assert.equal((await r.json()).error, 'schon');
    w.s.prepare("UPDATE reel_check SET status = 'fehler' WHERE token = ?").run(b.token);
    assert.equal((await neu('zwei@example.org')).status, 200, 'ließ sich das Video nicht prüfen, darf sie es nochmal versuchen');
    for (const st of ['wartet', 'in_arbeit', 'fertig']) {
      w.s.prepare('UPDATE reel_check SET status = ? WHERE token = ?').run(st, b.token);
      w.s.prepare("DELETE FROM reel_check WHERE status = 'laedt'").run();
      assert.equal((await neu('zwei@example.org')).status, 409, st);
    }
    assert.equal((await neu('drei@example.org')).status, 200, 'eine andere Adresse ist frei');
  } finally { w.ende(); }
});

test('Löschfristen: 24 h ohne Abschluss, 7 Tage ohne Bestätigung, 30 Tage nach Bestätigung, die Grenze selbst bleibt', async () => {
  const w = welt();
  try {
    const a = await hochladen(w, { ...GUT, email: 'a@example.org' });                       // bleibt bei laedt
    const b = await hochladen(w, { ...GUT, email: 'b@example.org' });
    await ruf(w.env, `/api/reel-check/fertig/${b.token}`, 'POST', { teile: b.etags });
    w.s.prepare("UPDATE reel_check SET status = 'wartet', confirmed_at = NULL WHERE token = ?").run(b.token);   // alte Zeile von vor dem 21.11.: Mail nie bestätigt
    const c = await hochladen(w, { ...GUT, email: 'c@example.org', vorname: 'Carla', telefon: '0171 2345678' });
    await ruf(w.env, `/api/reel-check/fertig/${c.token}`, 'POST', { teile: c.etags }); await bestaetigen(w.env, c.token);
    await w.env.IMAGES.put(`reelcheck/${c.token}/befund.html`, 'x');
    assert.equal(await reelCheckAufraeumen(w.env), 0, 'frisch: nichts wird gelöscht');
    const alt = (tok, spalte, wie) => w.s.prepare(`UPDATE reel_check SET ${spalte} = datetime('now', ?) WHERE token = ?`).run(wie, tok);
    alt(a.token, 'created_at', '-23 hours'); alt(b.token, 'created_at', '-6 days'); alt(c.token, 'confirmed_at', `-${LOESCH_FRIST_TAGE - 1} days`);
    assert.equal(await reelCheckAufraeumen(w.env), 0, 'kurz vor der Frist: nichts wird gelöscht');
    alt(a.token, 'created_at', '-25 hours'); alt(b.token, 'created_at', '-8 days'); alt(c.token, 'confirmed_at', `-${LOESCH_FRIST_TAGE + 1} days`);
    assert.equal(await reelCheckAufraeumen(w.env), 3);
    assert.equal(w.ablage.size, 0, 'Videos und Befund sind weg'); assert.equal(w.offen.size, 0, 'der offene Upload ist abgebrochen');
    const rest = w.s.prepare('SELECT status, email, email_norm, zielgruppe, fehler FROM reel_check ORDER BY id').all();
    assert.deepEqual(rest.map((r) => [r.status, r.email, r.email_norm, r.zielgruppe]), Array(3).fill(['geloescht', '', '', '']));
    assert.equal(w.s.prepare("SELECT COUNT(*) AS c FROM reel_check WHERE vorname != '' OR telefon != ''").get().c, 0, 'der Vorname ist mit weg');
    assert.deepEqual(rest.map((r) => r.fehler), ['upload_abgebrochen', 'nie_bestaetigt', 'frist']);
    assert.equal((await bestaetigen(w.env, b.token)).ok, false, 'ein gelöschter Link bestätigt nichts mehr');
    assert.equal(await reelCheckAufraeumen(w.env), 0, 'zweiter Lauf fasst Gelöschtes nicht nochmal an');
  } finally { w.ende(); }
});

test('Seite: beide Sprachen haben dieselben Felder, der Haken ist nie vorbelegt, die Frist steht im Wortlaut', async () => {
  const de = await reelCheckSeite({}, 'de').text(); const en = await reelCheckSeite({}, 'en').text();
  for (const [html, lang] of [[de, 'de'], [en, 'en']]) {
    assert.match(html, new RegExp(`<html lang="${lang}">`));
    assert.equal((html.match(/type="radio" name="plattform"/g) || []).length, PLATTFORMEN.length); assert.equal((html.match(/ checked/g) || []).length, 1, 'vorbelegt ist nur die Plattform');
    for (const pl of PLATTFORMEN) assert.match(html, new RegExp(`name="plattform" value="${pl}"`));
    assert.equal((html.match(/class="feld"/g) || []).length, 3, 'drei Textfelder: Vorname, Adresse, freiwillige Handynummer');
    assert.doesNotMatch(html, /Bestätige deine|confirm your address/i, 'die Seite schickt niemanden mehr ins Postfach');
    assert.match(html, /calendly\.com\/philipplibowicz/);
    assert.match(html, /<input type="checkbox" id="einwilligung">/);
    assert.match(html, new RegExp(`${LOESCH_FRIST_TAGE} (Tagen|days)`)); assert.match(html, /Claude/);
    assert.match(html, /var __name=function\(f\)\{return f\};\(function seitenSkript/, 'das Seitenskript bringt __name mit, sonst bricht es nach dem Bau ab');
    for (const s of ['fragen', 'abgeschickt', 'liegt', 'befund']) assert.ok(html.includes(`zaehl('${s}')`), 'Schritt wird gezählt: ' + s);
    assert.match(html, /hreflang="de" href="https:\/\/start\.social2scale\.com\/reel-check\/"/);
  }
  const schluessel = (o) => Object.keys(o).sort().join();
  assert.equal(schluessel(TEXTE.de), schluessel(TEXTE.en)); assert.equal(schluessel(TEXTE.de.js), schluessel(TEXTE.en.js));
  assert.equal(schluessel(TEXTE.de.js.fehler), schluessel(TEXTE.en.js.fehler)); assert.equal(schluessel(TEXTE.de.stand), schluessel(TEXTE.en.stand));
  const r = reelCheckStandSeite({ status: 'fertig', befund: '<!doctype html><p>Befund</p>' });
  assert.match(r.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/); assert.equal(await r.text(), '<!doctype html><p>Befund</p>');
  const tok = 'c'.repeat(48);
  const mitLink = await reelCheckStandSeite({ status: 'fertig', token: tok, befund: "<a href='https://start.social2scale.com/'>V</a><a href='https://start.social2scale.com/en/'>E</a><a href='https://social2scale.com/gratis/'>alt</a>" }).text();
  assert.equal(mitLink.split(`?von=check&amp;rc=${tok}'`).length - 1, 3, 'der Weg zur Profil-Vorschau nimmt den Befund mit, auch aus älteren Befunden');
  assert.ok(mitLink.includes(`start.social2scale.com/en/?von=check&amp;rc=${tok}`));
  assert.match(await reelCheckStandSeite({ status: 'geloescht', sprache: 'en' }).text(), /This report is/);
  assert.doesNotMatch(await reelCheckStandSeite({ status: 'da', token: '"><script>' }).text(), /"><script>/);
});
