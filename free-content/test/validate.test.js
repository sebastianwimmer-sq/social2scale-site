import { describe, it, expect } from 'vitest';
import { normalizeEmail, normalizeHandle, isDisposable, validateSubmission } from '../src/validate.js';

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

describe('isDisposable', () => {
  it('erkennt bekannte Wegwerf-Domains', () => {
    expect(isDisposable('a@mailinator.com')).toBe(true);
    expect(isDisposable('a@10minutemail.com')).toBe(true);
    expect(isDisposable('A@Mailinator.COM')).toBe(true);
  });

  it('laesst echte Provider durch', () => {
    expect(isDisposable('a@gmail.com')).toBe(false);
    expect(isDisposable('a@firma.de')).toBe(false);
  });
});

describe('validateSubmission', () => {
  const gut = {
    name: 'Sebi',
    email: 'Sebi+x@Gmail.com',
    handle: '@sebi.wimmer',
    branche: 'Fitness-Coaching',
    ziel: 'Mehr Anfragen ueber Instagram',
    stimmung: 'ruhig',
    farbe: '#124466',
    consent: true,
    source: 'ig-bio',
  };

  it('akzeptiert eine vollstaendige Eingabe und normalisiert mit', () => {
    const r = validateSubmission(gut);
    expect(r.ok).toBe(true);
    expect(r.value.emailNorm).toBe('sebi@gmail.com');
    expect(r.value.handleNorm).toBe('sebi.wimmer');
    expect(r.value.name).toBe('Sebi');
  });

  it('verlangt die Einwilligung (DSGVO)', () => {
    const r = validateSubmission({ ...gut, consent: false });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('consent');
  });

  it('lehnt ungueltige Mails ab', () => {
    expect(validateSubmission({ ...gut, email: 'keinAt' }).error).toBe('email');
  });

  it('lehnt Wegwerf-Mails ab', () => {
    expect(validateSubmission({ ...gut, email: 'x@mailinator.com' }).error).toBe('disposable');
  });

  it('lehnt ungueltige Handles ab', () => {
    expect(validateSubmission({ ...gut, handle: 'hat leerzeichen' }).error).toBe('handle');
  });

  it('verlangt Name, Branche und Ziel', () => {
    expect(validateSubmission({ ...gut, name: '  ' }).error).toBe('name');
    expect(validateSubmission({ ...gut, branche: '' }).error).toBe('branche');
    expect(validateSubmission({ ...gut, ziel: '' }).error).toBe('ziel');
  });

  it('kappt zu lange Eingaben statt sie abzulehnen', () => {
    const r = validateSubmission({ ...gut, ziel: 'x'.repeat(5000) });
    expect(r.ok).toBe(true);
    expect(r.value.ziel.length).toBe(2000);
  });

  it('akzeptiert eine fehlende Farbe (optionales Feld)', () => {
    const r = validateSubmission({ ...gut, farbe: undefined });
    expect(r.ok).toBe(true);
    expect(r.value.farbe).toBe('');
  });
});
