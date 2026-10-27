import { createRequire } from "node:module";
const require = createRequire(process.env.HOME + "/s2s-extern/package.json");
const { chromium, webkit, devices } = require("playwright");
const BASE = "https://social2scale.com";
const SEITEN = ["/gratis/", "/anfrage/"];
const name = p => (p === "/" ? "start" : p.replace(/^\/|\/$/g, "").replace(/\//g, "_"));
const messen = () => {
  const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch { return []; } }).join("\n");
  const anim = document.getAnimations();
  return {
    viewTransition: /@view-transition/.test(css), vtNamen: (css.match(/view-transition-name:\s*[\w-]+/g) || []).length,
    scrollTimeline: /animation-timeline/.test(css), property: (css.match(/@property/g) || []).length,
    canvas: document.querySelectorAll("canvas").length, video: document.querySelectorAll("video").length,
    webgl: [...document.querySelectorAll("canvas")].some(c => { try { return !!c.getContext && false; } catch { return false; } }),
    animationen: anim.length, endlos: anim.filter(a => a.effect?.getComputedTiming().iterations === Infinity).length,
    pointerHandler: /pointermove|mousemove/.test([...document.scripts].map(s => s.textContent).join("")),
    blendScreen: /mix-blend-mode:\s*screen/.test(css), backdrop: /backdrop-filter/.test(css),
    hoeheBildschirme: +(document.documentElement.scrollHeight / innerHeight).toFixed(1),
    abschnitte: document.querySelectorAll("main section, main > *").length,
  };
};
async function jank(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const r = await page.evaluate(async () => {
    scrollTo(0, 0); const t = []; let last = performance.now(); const max = document.documentElement.scrollHeight - innerHeight;
    await new Promise(ok => { const step = now => { t.push(now - last); last = now; if (scrollY >= max - 2 || t.length > 1500) return ok(); scrollBy(0, 14); requestAnimationFrame(step); }; requestAnimationFrame(step); });
    return { frames: t.length, ueber50: +(t.filter(x => x > 50).length / t.length * 100).toFixed(1) };
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  return r;
}
const out = {};
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
for (const p of SEITEN) {
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + p, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `d-${name(p)}.png` });
    out[p] = { ...(await page.evaluate(messen)), jank: await jank(page) };
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `dv-${name(p)}.png`, fullPage: true });
  } catch (e) { out[p] = { fehler: String(e).slice(0, 200) }; }
  await page.close();
}
await b.close();
const w = await webkit.launch();
const m = await w.newContext({ ...devices["iPhone 15 Pro"] });
for (const p of SEITEN) {
  const page = await m.newPage();
  try { await page.goto(BASE + p, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000); await page.screenshot({ path: `m-${name(p)}.png` }); } catch (e) { (out[p] ||= {}).mobilFehler = String(e).slice(0, 120); }
  await page.close();
}
await w.close();
console.log(JSON.stringify(out, null, 1));
