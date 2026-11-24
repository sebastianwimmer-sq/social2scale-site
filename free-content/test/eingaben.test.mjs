import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mailVorschlag, mailErfunden, nameGueltig, nummer, laender } from '../src/eingaben.js';

test('Nummer: echte Nummern je Land werden einheitlich gespeichert, unmögliche abgewiesen', () => {
  for (const [roh, land, soll] of [['0171 2345679', 'DE', '+491712345679'], ['171 2345679', 'DE', '+491712345679'], ['0664 1234568', 'AT', '+436641234568'], ['079 123 45 68', 'CH', '+41791234568'],
    ['+43 664 1234568', 'DE', '+436641234568'], ['0043 664 1234568', 'DE', '+436641234568'], ['050 123 4568', 'AE', '+971501234568'], ['', 'DE', '']]) assert.equal(nummer(roh, land), soll, roh);
  for (const [roh, land] of [['12345', 'DE'], ['0171 1111111', 'DE'], ['0171 1234567', 'DE'], ['0171 23', 'DE'], ['0900 5123456', 'DE'], ['ruf mich an', 'DE'], ['0171 2345679 oder 0172 1', 'DE']]) assert.equal(nummer(roh, land), null, roh);
});
test('Mail: Vertipper bekommen einen Vorschlag, richtige Adressen nie', () => {
  for (const [a, b] of [['ana@gmial.com', 'ana@gmail.com'], ['ana@gmail.con', 'ana@gmail.com'], ['ana@gmx.ed', 'ana@gmx.de'], ['ana@gxm.net', 'ana@gmx.net'], ['ana@wbe.de', 'ana@web.de'], ['ana@hotmial.com', 'ana@hotmail.com'], ['ana@iclod.com', 'ana@icloud.com'], ['ana@yaho.de', 'ana@yahoo.com'], ['ana@outlok.de', 'ana@outlook.com']]) assert.equal(mailVorschlag(a), b, a);
  for (const a of ['ana@gmail.com', 'ana@gmx.at', 'ana@gmx.ch', 'ana@web.de', 'ana@hotmail.de', 'ana@outlook.de', 'ana@yahoo.de', 'ana@firma.de', '']) assert.equal(mailVorschlag(a), '', a);
  for (const a of ['test@gmail.com', 'asdf123@web.de', 'aaaa@gmx.de']) assert.equal(mailErfunden(a), true, a);
  for (const a of ['test@firma.de', 'testarossa@gmail.com', 'mail.anna@web.de', 'anna@gmx.de']) assert.equal(mailErfunden(a), false, a);
});
test('Name: echte Schreibweisen aller Art gehen durch, Getippe nicht', () => {
  for (const n of ['', 'Ana', 'Jo', 'Anne-Marie', 'O’Neill', 'José', 'Zoë', 'Søren', 'Ülkü', '李明', 'Мария', 'Dr. Eva', 'Aaron', 'Ng']) assert.equal(nameGueltig(n), true, n);
  for (const n of ['a', '123', 'Ana1', 'asdf', 'asdfgh', 'qwertz', 'xxxx', 'test', 'www.seite.de', '<b>Ana</b>', '@ana']) assert.equal(nameGueltig(n), false, n);
});
test('Länder: DACH zuerst, beide Sprachen, jedes mit Vorwahl', () => {
  for (const s of ['de', 'en']) { const l = laender(s); assert.deepEqual(l.slice(0, 3).map((x) => x.c), ['DE', 'AT', 'CH']); assert.ok(l.length > 200 && l.every((x) => /^\d{1,3}/.test(x.vw) && x.name)); }
});

test('Erstgespräch: Nummer wird mit Land geprüft und mit Vorwahl gespeichert, ohne Land gilt die alte Regel', async () => {
  const { anfrageAusFunnel, pflichtFehler } = await import('../src/anfrage-weiter.js');
  const g = { name: 'Anna', email: 'anna@beispiel.de' };
  const mit = (x) => anfrageAusFunnel({ ...g, ...x });
  assert.equal(mit({ phone: '0151 26374850', land: 'DE' }).phone, '+4915126374850');
  assert.equal(pflichtFehler(mit({ phone: '0151 26374850', land: 'DE' })), '');
  assert.equal(pflichtFehler(mit({ phone: '0151 11111111', land: 'DE' })), 'phone');
  assert.equal(pflichtFehler(mit({ phone: '12345', land: 'AT' })), 'phone');
  assert.equal(pflichtFehler(mit({ phone: '0171 1234567' })), '');
  for (const [name, soll] of [['Anna-Lena Müller', ''], ["Dr. O'Neil", ''], ['asdf', 'name'], ['Aaaa', 'name']]) assert.equal(pflichtFehler(mit({ name, phone: '0151 26374850', land: 'DE' })), soll);
  assert.equal(pflichtFehler(anfrageAusFunnel({ ...g, email: 'test@gmail.com', phone: '015126374850', land: 'DE' })), 'email');
});
