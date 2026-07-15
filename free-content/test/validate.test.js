import { describe, it, expect } from 'vitest';
import { normalizeEmail, normalizeHandle } from '../src/validate.js';

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

describe('normalizeHandle', () => {
  it('entfernt das fuehrende @ und schreibt klein', () => {
    expect(normalizeHandle('@Sebi.Wimmer')).toBe('sebi.wimmer');
  });

  it('akzeptiert den nackten Handle', () => {
    expect(normalizeHandle('  sebi_wimmer  ')).toBe('sebi_wimmer');
  });

  it('zieht den Handle aus einer Profil-URL', () => {
    expect(normalizeHandle('https://www.instagram.com/sebi.wimmer/')).toBe('sebi.wimmer');
    expect(normalizeHandle('instagram.com/sebi.wimmer?igsh=abc')).toBe('sebi.wimmer');
  });

  it('alle Schreibweisen ergeben denselben Schluessel', () => {
    const keys = new Set([
      normalizeHandle('@Sebi.Wimmer'),
      normalizeHandle('sebi.wimmer'),
      normalizeHandle('https://instagram.com/Sebi.Wimmer/'),
    ]);
    expect(keys.size).toBe(1);
  });

  it('gibt bei ungueltigen Handles einen leeren String zurueck', () => {
    // IG erlaubt nur a-z 0-9 . _ und maximal 30 Zeichen.
    for (const bad of ['', '   ', 'hat leerzeichen', 'ümlaut', 'a'.repeat(31), '@@', null, undefined]) {
      expect(normalizeHandle(bad)).toBe('');
    }
  });

  it('akzeptiert genau 30 Zeichen', () => {
    expect(normalizeHandle('a'.repeat(30))).toBe('a'.repeat(30));
  });

  it('lehnt eine nackte Domain ohne Handle ab', () => {
    expect(normalizeHandle('instagram.com')).toBe('');
    expect(normalizeHandle('https://www.instagram.com')).toBe('');
  });

  it('lehnt eine URL mit ungueltigem Pfad-Segment ab statt sie zurechtzustutzen', () => {
    expect(normalizeHandle('instagram.com/has space')).toBe('');
  });

  it('erfindet aus beliebigem Text keinen Handle', () => {
    expect(normalizeHandle('some/random?query')).toBe('');
    expect(normalizeHandle('notinstagram.com/user')).toBe('');
  });
});
