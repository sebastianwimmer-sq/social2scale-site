import { describe, it, expect } from 'vitest';
import { normalizeEmail } from '../src/validate.js';

describe('normalizeEmail', () => {
  it('trimmt und schreibt klein', () => {
    expect(normalizeEmail('  Sebi@Firma.DE ')).toBe('sebi@firma.de');
  });

  it('entfernt bei Gmail die Punkte im lokalen Teil', () => {
    expect(normalizeEmail('s.e.b.i@gmail.com')).toBe('sebi@gmail.com');
  });

  it('schneidet +Tags ab', () => {
    expect(normalizeEmail('sebi+neu@gmail.com')).toBe('sebi@gmail.com');
  });

  it('behandelt googlemail wie gmail', () => {
    expect(normalizeEmail('s.ebi+x@googlemail.com')).toBe('sebi@gmail.com');
  });

  it('laesst Punkte bei Nicht-Gmail signifikant', () => {
    expect(normalizeEmail('a.b@firma.de')).toBe('a.b@firma.de');
    expect(normalizeEmail('a.b@firma.de')).not.toBe(normalizeEmail('ab@firma.de'));
  });

  it('schneidet +Tags auch bei Nicht-Gmail ab', () => {
    expect(normalizeEmail('a.b+shop@firma.de')).toBe('a.b@firma.de');
  });

  it('gibt bei Unsinn einen leeren String zurueck', () => {
    for (const bad of ['', '   ', 'keinAt', '@firma.de', 'sebi@', null, undefined, 'a@b@c']) {
      expect(normalizeEmail(bad)).toBe('');
    }
  });

  it('alle vier Gmail-Schreibweisen ergeben denselben Schluessel', () => {
    const keys = new Set([
      normalizeEmail('sebi@gmail.com'),
      normalizeEmail('S.E.B.I@gmail.com'),
      normalizeEmail('sebi+neu@gmail.com'),
      normalizeEmail('se.bi+a+b@googlemail.com'),
    ]);
    expect(keys.size).toBe(1);
  });
});
