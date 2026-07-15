const { chromium } = require('/opt/homebrew/lib/node_modules/playwright');
const path = '/private/tmp/claude-501/-Users-sebastianwimmer/487ef944-dd9f-43f7-8a90-cb47d7538496/scratchpad/design-pass';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path + '/looks.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);   // Font-Race: sonst rendert es Fallback
  await p.waitForTimeout(600);

  const ziele = ['p-a','s-a','p-b','s-b','p-c','s-c','wm-soft','wm-loud'];
  for (const id of ziele) {
    const el = await p.$('#' + id + ' .frame');
    if (!el) { console.log('FEHLT: ' + id); continue; }
    await el.screenshot({ path: `${path}/${id}.png` });
    const box = await el.boundingBox();
    console.log(`${id.padEnd(9)} ${Math.round(box.width)}×${Math.round(box.height)}`);
  }
  await b.close();
})().catch(e => { console.error('FEHLER:', e.message); process.exit(1); });
