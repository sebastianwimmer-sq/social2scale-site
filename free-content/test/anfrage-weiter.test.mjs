import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAnfrage, anfrageAusFunnel, pflichtFehler } from '../src/anfrage-weiter.js';

const GUT = { name: 'Anna', email: 'anna@beispiel.de', phone: '0171 2345678', business: 'Coach', status: 'Ganz am Anfang', goal: 'Mehr Anfragen', budget: '1.000–3.000 €', start: 'Sofort', turnstile: 'tok' };

function db() {
  return { prepare: () => ({ bind: () => ({ run: async () => ({}), first: async () => ({ c: 1 }) }) }) };
}
function req(body, headers = {}) {
  return new Request('https://start.social2scale.com/api/anfrage', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7', ...headers }, body: JSON.stringify(body),
  });
}
// Turnstile-Prüfung läuft über globales fetch — im Test beantwortet es dieselbe Attrappe.
function mitTurnstile(ok, fn) {
  const alt = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: ok }), { status: 200 });
  return fn().finally(() => { globalThis.fetch = alt; });
}
const ENV = { TURNSTILE_SECRET: 's', FUNNEL_KEY: 'k', DB: db() };

test('Start-Zeitpunkt wandert ins Ziel, fremde Felder fallen weg', () => {
  const d = anfrageAusFunnel({ ...GUT, foto: 'x', website: '' });
  assert.equal(d.goal, 'Mehr Anfragen · Start: Sofort');
  assert.equal(d.von, 'vorschau-b');
  assert.equal('foto' in d, false);
  assert.equal('start' in d, false);
});

test('Telefon ist Pflicht (Erstgespräch läuft telefonisch)', () => {
  assert.equal(pflichtFehler(anfrageAusFunnel({ ...GUT, phone: '12' })), 'phone');
  assert.equal(pflichtFehler(anfrageAusFunnel(GUT)), '');
});

test('gültige Anfrage geht mit Schlüssel und echter IP ans Portal', () => mitTurnstile(true, async () => {
  let gesehen;
  const holen = async (url, init) => { gesehen = { url, init }; return new Response(JSON.stringify({ success: true }), { status: 200 }); };
  const r = await handleAnfrage(req(GUT), ENV, {}, holen);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  assert.equal(gesehen.url, 'https://closing.social2scale.com/api/anfrage');
  assert.equal(gesehen.init.headers['X-Funnel-Key'], 'k');
  assert.equal(gesehen.init.headers['X-Funnel-IP'], '203.0.113.7');
  assert.equal(JSON.parse(gesehen.init.body).phone, '0171 2345678');
}));

test('ohne gültiges Turnstile geht nichts ans Portal', () => mitTurnstile(false, async () => {
  let gerufen = false;
  const r = await handleAnfrage(req(GUT), ENV, {}, async () => { gerufen = true; return new Response('{}'); });
  assert.equal(r.status, 403);
  assert.equal(gerufen, false);
}));

test('ohne FUNNEL_KEY scheitert Weg B laut statt still', () => mitTurnstile(true, async () => {
  const r = await handleAnfrage(req(GUT), { ...ENV, FUNNEL_KEY: '' }, {}, async () => new Response('{}'));
  assert.equal(r.status, 503);
}));

test('Honeypot antwortet wie Erfolg, ohne weiterzureichen', () => mitTurnstile(true, async () => {
  let gerufen = false;
  const r = await handleAnfrage(req({ ...GUT, website: 'x' }), ENV, {}, async () => { gerufen = true; return new Response('{}'); });
  assert.equal(r.status, 200);
  assert.equal(gerufen, false);
}));

test('Portal lehnt Mail-Domain ab → Besucherin erfährt es', () => mitTurnstile(true, async () => {
  const r = await handleAnfrage(req(GUT), ENV, {}, async () => new Response(JSON.stringify({ success: false, error: 'email_domain' }), { status: 422 }));
  assert.equal(r.status, 422);
  assert.equal((await r.json()).error, 'email_domain');
}));

test('Portal antwortet mit Erfolg ohne success:true → kein Danke', () => mitTurnstile(true, async () => {
  const r = await handleAnfrage(req(GUT), ENV, {}, async () => new Response('<html>CRM</html>', { status: 200 }));
  assert.equal(r.status, 422);
}));

import { anfrageProbe } from '../src/anfrage-weiter.js';
test('Probe: ok nur bei probe:true, 403 heißt falscher Schlüssel, ohne Schlüssel aus', async () => {
  assert.equal(await anfrageProbe({ FUNNEL_KEY: 'k' }, async () => new Response('{"success":true,"probe":true}')), 'ok');
  assert.equal(await anfrageProbe({ FUNNEL_KEY: 'k' }, async () => new Response('{"success":false}', { status: 403 })), 'schluessel');
  assert.equal(await anfrageProbe({ FUNNEL_KEY: 'k' }, async () => new Response('<html>', { status: 200 })), 'portal');
  assert.equal(await anfrageProbe({ FUNNEL_KEY: '' }, async () => { throw new Error('nie'); }), 'aus');
  assert.equal(await anfrageProbe({ FUNNEL_KEY: 'k' }, async () => { throw new Error('dns'); }), 'netz');
});
