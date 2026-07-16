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

  it('laesst einen Bindestrich nicht zur Umgehung werden', () => {
    // Ein frueherer Fix hatte genau das geoeffnet: Trigger + Bindestrich = frei.
    // "Schmerzfrei-Programm" ist deutsche Coach-Standardsprache, keine Umgehung.
    for (const z of ['Schmerzfrei-Programm garantiert', 'Heilung-Garantie in 4 Wochen',
                     'Drogen-Verkauf an Jugendliche', 'Hass-auf Frauen Kampagne']) {
      expect(checkInput({ branche: 'Coaching', ziel: z }).ok, z).toBe(false);
    }
  });

  it('lehnt Bindestrich-Komposita bewusst ab — der Founder-Alarm faengt das', () => {
    // Dokumentiert die Entscheidung, nicht ein Versehen: strenger Filter + Mensch
    // schlaegt schlauen Filter ohne Mensch. Eine Wortliste kann
    // 'Drogen-Praevention' nicht von 'Drogen-Verkauf' trennen.
    expect(checkInput({ branche: 'Anti-Drogen-Aufklärung', ziel: 'x' }).ok).toBe(false);
  });

  it('haelt den Umlaut-Fix — er hatte keinen Nachteil', () => {
    // \w ist ASCII, also machte '\bkrebs\b' aus dem 'ä' eine Wortgrenze und
    // warf eine Onkologie-Praxis raus.
    expect(checkInput({ branche: 'Krebsärzte', ziel: 'Mehr Patienten' }).ok).toBe(true);
  });

  it('lehnt konjugierte Heilversprechen ab — "ich heile" ist der Normalfall, keine Umgehung', () => {
    const fies = [
      'Ich heile deine Schmerzen für immer',
      'du heilst chronische Schmerzen',
      'schmerzfreies Leben in 4 Wochen',
      'Ich lindere deine Beschwerden',
    ];
    for (const ziel of fies) {
      const r = checkInput({ ...gut, ziel });
      expect(r.ok, ziel).toBe(false);
      expect(r.grund, ziel).toBe('heilversprechen');
    }
  });

  it('laesst Heil-Berufe und -Angebote durch — Substantive sind keine Versprechen', () => {
    // "Geistiger Heiler" ist eine echte (wenn auch zweifelhafte) Nische und ein
    // Substantiv. Ablehnen waere die Fehlalarm-Richtung.
    const berufe = [
      'Heilpraktikerin',
      'Heilerziehungspfleger',
      'Heilfasten',
      'Krebsberatungsstelle',
      'Krebsärzte',
      'Geistiger Heiler',
      'Schmerzlinderung durch Massage',
      'Waffenschmiede',
      'Diagnostik-Praxis',
      'Suchtberatung',
      'Trauerbegleitung',
      'Physiotherapie-Praxis',
    ];
    for (const branche of berufe) {
      expect(checkInput({ branche, ziel: 'Mehr Anfragen' }).ok, branche).toBe(true);
    }
  });

  it('lehnt Politisches ab — auch im Bindestrich-Kompositum', () => {
    // Diese Kategorie hatte als EINZIGE keinen Test — und ausgerechnet ihr Kommentar
    // behauptete in einer frueheren Runde ein Verhalten, das der Code nicht hatte.
    // Ein Kommentar ohne Test ist eine Behauptung.
    // Politisch heisst politisch, egal in welche Richtung: eine Kampagne setzt unser
    // Logo unter eine politische Aussage.
    for (const branche of ['AfD-nahe Beratung', 'Anti-AfD-Kampagne', 'Querdenken-Bewegung']) {
      const r = checkInput({ branche, ziel: 'Reichweite' });
      expect(r.ok, branche).toBe(false);
      expect(r.grund, branche).toBe('politik');
    }
  });

  it('haelt Politikberatung fuer legitim — das Wort allein ist kein Treffer', () => {
    for (const branche of ['Politikberatung', 'Politische Bildung für Schulen']) {
      expect(checkInput({ branche, ziel: 'Mehr Mandate' }).ok, branche).toBe(true);
    }
  });
});
