import { describe, it, expect } from 'vitest';
import { checkInput } from '../src/moderate.js';

const gut = { branche: 'Fitness-Coaching', ziel: 'Mehr Anfragen ueber Instagram' };

describe('checkInput', () => {
  it('laesst normale Eingaben durch', () => {
    const okFaelle = [
      { branche: 'Fitness-Coaching', ziel: 'Mehr Anfragen' },
      { branche: 'Ernährungsberatung', ziel: 'Sichtbarer werden' },
      { branche: 'Karriere-Coaching für Frauen', ziel: 'Endlich regelmäßig posten' },
      { branche: 'Yoga & Achtsamkeit', ziel: 'Meine Community aufbauen' },
    ];
    for (const f of okFaelle) expect(checkInput(f).ok, JSON.stringify(f)).toBe(true);
  });

  it('lehnt Heilversprechen ab — sonst steht unser Logo unter ihrem HWG-Verstoss', () => {
    const r = checkInput({ ...gut, ziel: 'Kunden versprechen dass sie in 4 Wochen geheilt sind' });
    expect(r.ok).toBe(false);
    expect(r.grund).toBe('heilversprechen');
  });

  it('lehnt Hass ab', () => {
    expect(checkInput({ ...gut, branche: 'Ich hasse Ausländer' }).ok).toBe(false);
  });

  it('lehnt Sexuelles ab', () => {
    expect(checkInput({ ...gut, branche: 'Escort Service' }).ok).toBe(false);
  });

  it('lehnt Illegales ab', () => {
    expect(checkInput({ ...gut, ziel: 'Drogen verkaufen' }).ok).toBe(false);
  });

  it('prueft beide Freitextfelder, nicht nur eins', () => {
    expect(checkInput({ branche: 'Coaching', ziel: 'heilt Krebs' }).ok).toBe(false);
    expect(checkInput({ branche: 'heilt Krebs', ziel: 'Coaching' }).ok).toBe(false);
  });

  it('faellt nicht auf Gross-/Kleinschreibung herein', () => {
    expect(checkInput({ ...gut, ziel: 'HEILT KREBS' }).ok).toBe(false);
  });

  it('kippt nicht bei fehlenden Feldern', () => {
    expect(checkInput({}).ok).toBe(true);
    expect(checkInput(null).ok).toBe(true);
  });

  it('meldet keinen Fehlalarm bei harmlosen Teilwoertern', () => {
    // "Heilpraktikerin" ist ein Beruf, kein Heilversprechen. Wer den ablehnt,
    // wirft eine echte Kundin raus.
    expect(checkInput({ branche: 'Heilpraktikerin', ziel: 'Mehr Anfragen' }).ok).toBe(true);
    expect(checkInput({ branche: 'Ganzheitliche Beratung', ziel: 'Menschen erreichen' }).ok).toBe(true);
  });
});
