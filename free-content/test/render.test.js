import { describe, it, expect } from 'vitest';
import { r2Key } from '../src/render.js';

describe('r2Key', () => {
  it('legt Bilder je Lead getrennt ab', () => {
    expect(r2Key('abc123', 'f-0-profil')).toBe('free/abc123/f-0-profil.jpg');
  });

  it('trennt zwei Leads sauber', () => {
    expect(r2Key('aaa', 'f-0-s1')).not.toBe(r2Key('bbb', 'f-0-s1'));
  });

  it('laesst nichts Fremdes in den Key — der Token kommt von aussen', () => {
    // Ein Key mit ../ koennte fremde Objekte adressieren.
    const k = r2Key('../../etc/passwd', 'f-0-s1');
    expect(k).not.toContain('..');
    expect(k.startsWith('free/')).toBe(true);
  });

  it('saeubert auch die Frame-Id', () => {
    expect(r2Key('abc', '../x')).not.toContain('..');
  });
});
