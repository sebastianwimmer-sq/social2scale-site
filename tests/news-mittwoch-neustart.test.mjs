// Der Mittwochslauf stellt sich auf origin/main um und muss danach mit dem NEUEN Skript laufen (25.11.2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUELLE = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'news-mittwoch.py');
function spielen(aendert) {
  const d = mkdtempSync(join(tmpdir(), 'newsm-'));
  try {
    const ort = join(d, '.s2s-wachen', 'seite', 'scripts');
    mkdirSync(ort, { recursive: true });
    const datei = join(ort, 'news-mittwoch.py');
    copyFileSync(QUELLE, datei);
    const code = `
import importlib.util, sys, pathlib
p = pathlib.Path(${JSON.stringify(datei)})
s = importlib.util.spec_from_file_location('nm', p); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
m.subprocess.run = lambda bef, **k: p.write_text(p.read_text() + '# neu\\n') if ${aendert ? 'True' : 'False'} and 'checkout' in bef else None
rufe = []
m.os.execv = lambda a, b: rufe.append(b)
sys.argv = ['x', '--kw', '48']
m.auf_main_stellen()
print('NEUSTART ' + ' '.join(rufe[0][2:]) if rufe else 'KEIN')`;
    return execFileSync('python3', ['-c', code], { encoding: 'utf8' }).trim().split('\n').pop();
  } finally { rmSync(d, { recursive: true, force: true }); }
}
test('geändertes Skript: Neustart mit denselben Argumenten', () => assert.equal(spielen(true), 'NEUSTART --kw 48'));
test('unverändertes Skript: kein Neustart', () => assert.equal(spielen(false), 'KEIN'));
test('eigene Sperre hält den Neustart nicht auf', () => assert.match(readFileSync(QUELLE, 'utf8'), /besitzer != os\.getpid\(\)/));
