/* Szenen je Abschnitt (28.10.2026) — jeder Abschnitt ist ein eigener Ort im Studio.
 * Quelle der Markierungen: scripts/szenen-bauen.mjs · Gestaltung: szenen/<seite>.css
 *
 * Was dieses Skript tut (und nur das):
 *  - .sz-an, sobald eine Szene zu einem Fünftel im Bild ist (bleibt an — kein Flackern beim Zurückscrollen)
 *  - --sp (0…1): wie weit die Szene durchs Bild gelaufen ist; nur für sichtbare Szenen, ein rAF je Frame
 *  - --sv: gedämpfte Scroll-Geschwindigkeit (−1…1) für Szenen mit data-schwung (z. B. Wäscheleine)
 *  - --sx/--sy: Zeiger in der Szene (−1…1), nur Maus, nur Szenen mit data-zeiger
 *  - .sz-lit an Teilen mit [data-sz-teil], wenn sie die Bildmitte kreuzen (Lampen, Stationen, Fragen)
 * Kein Endlos-Lauf: ohne Scrollen/Zeiger steht alles still. Bewegung reduzieren = Endzustand, kein Versatz.
 */
(() => {
  // Gestaltung nachladen (data-css="basis,start"): per Skript eingehängt blockiert sie das erste Bild nicht
  const ich = document.currentScript;
  for (const n of (ich?.dataset.css || '').split(',').filter(Boolean)) {
    if (!/^[a-z0-9-]+$/.test(n) || document.querySelector(`link[href="/szenen/${n}.css"]`)) continue;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `/szenen/${n}.css`; document.head.append(l);
  }
  const szenen = [...document.querySelectorAll('[data-sz]')];
  if (!szenen.length) return;
  const wurzel = document.documentElement;
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Maßband: Spannen aus dem Text lesen (z. B. „400 – 900 €“), damit Strecke und Zahl nie auseinanderlaufen
  for (const skala of document.querySelectorAll('[data-sz="massband"] .pr-why-scale')) {
    const zeilen = [...skala.querySelectorAll(':scope > div')].map((z) => {
      const m = z.querySelector('.v')?.textContent.replace(/\./g, '').match(/(\d+)\D+(\d+)/);
      return m ? { z, von: +m[1], bis: +m[2] } : null;
    }).filter(Boolean);
    const max = Math.max(...zeilen.map((x) => x.bis));
    for (const { z, von, bis } of zeilen) { z.style.setProperty('--von', (von / max).toFixed(4)); z.style.setProperty('--bis', (bis / max).toFixed(4)); }
    skala.style.setProperty('--max', max);
  }

  // Teile: an, sobald sie die Mitte des Bildes kreuzen (ein Band von 30 % Höhe)
  const teile = document.querySelectorAll('[data-sz-teil]');
  if (ruhig || !('IntersectionObserver' in window)) {
    szenen.forEach((s) => s.classList.add('sz-an'));
    teile.forEach((t) => t.classList.add('sz-lit'));
    wurzel.classList.add('sz-ruhig');
    wurzel.setAttribute('data-sz-sicht', '');
    return;
  }
  const teilBeob = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) if (e.isIntersecting) e.target.classList.add('sz-lit');
  }, { rootMargin: '-35% 0px -35% 0px' });
  teile.forEach((t) => teilBeob.observe(t));

  const sichtbar = new Set();
  const beob = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) {
      if (e.isIntersecting) {
        sichtbar.add(e.target);
        if (e.intersectionRatio >= 0.2 || e.intersectionRect.height > innerHeight * 0.35) e.target.classList.add('sz-an');
      } else sichtbar.delete(e.target);
    }
    wurzel.toggleAttribute('data-sz-sicht', sichtbar.size > 0);
    planen();
  }, { threshold: [0, 0.2, 0.4] });
  szenen.forEach((s) => beob.observe(s));

  // Fortschritt + Schwung: ein rAF je Frame, nur solange sich etwas bewegt
  let geplant = false, letztY = scrollY, schwung = 0, letzteZeit = performance.now();
  const gemerkt = new WeakMap();
  function planen() { if (!geplant) { geplant = true; requestAnimationFrame(schritt); } }
  function schritt(t) {
    geplant = false;
    const dt = Math.max(8, t - letzteZeit); letzteZeit = t;
    const dy = scrollY - letztY; letztY = scrollY;
    const ziel = Math.max(-1, Math.min(1, dy / dt / 2.2));
    schwung += (ziel - schwung) * 0.12;
    if (Math.abs(schwung) < 0.002) schwung = 0;
    const h = innerHeight;
    for (const s of sichtbar) {
      const r = s.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (h - r.top) / (h + r.height)));
      const alt = gemerkt.get(s);
      if (alt === undefined || Math.abs(alt - p) > 0.002) { s.style.setProperty('--sp', p.toFixed(3)); gemerkt.set(s, p); }
      if (s.hasAttribute('data-schwung')) s.style.setProperty('--sv', schwung.toFixed(3));
    }
    // Nachschwingen nur, solange eine Szene mit Schwung im Bild ist — sonst ruht die Schleife sofort
    const schwingt = [...sichtbar].some((s) => s.hasAttribute('data-schwung'));
    if (!schwingt) schwung = 0;
    if (schwung !== 0) planen();
  }
  // Nur rechnen, wenn eine Szene im Bild ist oder noch Schwung abklingt — sonst kein einziger Frame
  addEventListener('scroll', () => { if (sichtbar.size || schwung) planen(); }, { passive: true });
  addEventListener('resize', planen, { passive: true });
  planen();

  // Zeiger: nur Maus, je Szene gemerkte Box (beim Scrollen neu)
  if (matchMedia('(pointer: fine)').matches) {
    for (const s of document.querySelectorAll('[data-sz][data-zeiger]')) {
      let box = null, ziel = null;
      const setzen = () => {
        ziel = null;
        if (!box) return;
        s.style.setProperty('--sx', box.x.toFixed(3));
        s.style.setProperty('--sy', box.y.toFixed(3));
      };
      s.addEventListener('pointermove', (e) => {
        const r = s.getBoundingClientRect();
        box = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
        if (!ziel) ziel = requestAnimationFrame(setzen);
      });
      s.addEventListener('pointerleave', () => { box = { x: 0, y: 0 }; if (!ziel) ziel = requestAnimationFrame(setzen); });
    }
  }
})();
