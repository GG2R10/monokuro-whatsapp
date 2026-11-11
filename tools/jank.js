// Frame-pacing / error probe. Applies several CSS variants to the SAME live page state and measures, for each:
//   frames per second and long gaps (requestAnimationFrame), running animations, DOM mutations/s, console + page errors, and the cost of a forced
//   full style recalculation. Usage: node tools/jank.js <scenario>   scenario: rainbow | drawer
const { open, openChat } = require('./lib');
const fs = require('fs'), path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const scenario = process.argv[2] || 'rainbow', MS = +(process.env.MS || 6000);
const FULL = read('dist/inject.css'), BASE = read('dist/inject.base.css');
const variants = JSON.parse(process.env.VARIANTS || '["none","base","full"]');
const extra = { // extra :root blocks that simulate Stylus options
  rb_ui: ':root{--ui-rainbow:1}', rb_all: ':root{--ui-rainbow:1;--text-rainbow:1;--name-rainbow:1}', rb_all_fast: ':root{--ui-rainbow:1;--text-rainbow:1;--name-rainbow:1;--rainbow-speed:2}',
};
(async () => {
  const { ctx, page } = await open({ css: false });
  const logs = []; page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text().slice(0, 160)) }); page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e).slice(0, 160)));
  await openChat(page);
  if (scenario === 'drawer') { await page.locator('[data-testid="conversation-info-header"]').first().click(); await page.waitForTimeout(+(process.env.SETTLE || 3000)); }
  const apply = (css) => page.evaluate((c) => { document.querySelectorAll('style[data-mk]').forEach(s => s.remove()); if (c) { const s = document.createElement('style'); s.dataset.mk = '1'; s.textContent = c; document.head.appendChild(s) } }, css);
  const srcFiles = fs.readdirSync(path.join(__dirname, '..', 'src')).filter(f => f.endsWith('.css')).sort();
const fxFiles = fs.readdirSync(path.join(__dirname, '..', 'src/fx')).filter(f => f.endsWith('.css')).sort();
const rings = require('../gen-rings.js');
// 'drop:<file>' = the full theme minus one module (src or src/fx file name, or 'rings'); 'only:<file>' = tokens + that module only
const build = (mods, withRings = true) => mods.map(f => read(f.includes('/') ? f : 'src/' + f)).join('\n') + (withRings ? '\n' + rings : '');
const all = [...srcFiles, ...fxFiles.map(f => 'src/fx/' + f)];
const css = { none: '', base: BASE, full: FULL };
for (const f of all) css['drop:' + f.replace('src/', '')] = build(all.filter(x => x !== f));
css['drop:rings'] = build(all, false);
for (const f of all) if (!f.startsWith('00-')) css['only:' + f.replace('src/', '')] = build(['00-tokens.css', f], false);
css['only:rings'] = build(['00-tokens.css'], true);
  if (scenario === 'drawerload') {
    const LOAD = +(process.env.LOAD || 12000);
    const closeDrawer = async () => { for (let i = 0; i < 3 && await page.locator('[data-testid="drawer-right"]').count(); i++) { await page.locator('[data-testid="drawer-right"] [aria-label="Close"]').first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1200) } };
    for (const v of variants) {
      const [main] = v.split('+'); if (!(main in css)) { console.log('unknown variant', main); continue }
      await closeDrawer(); await page.waitForTimeout(4000);
      await page.evaluate((c) => { document.querySelectorAll('style[data-mk]').forEach(s => s.remove()); if (c) { const st = document.createElement('style'); st.dataset.mk = '1'; st.textContent = c; document.head.appendChild(st) } }, css[main]); await page.waitForTimeout(800);
      await page.evaluate(() => { window.__g = []; window.__l = performance.now(); const t = (n) => { window.__g.push([n - window.__l, n]); window.__l = n; window.__run && requestAnimationFrame(t) }; window.__run = true; requestAnimationFrame(t) });
      logs.length = 0; await page.locator('[data-testid="conversation-info-header"]').first().click();
      await page.waitForTimeout(LOAD);
      const g = await page.evaluate(() => { window.__run = false; return window.__g.map(x => x[0]) });
      const jank = g.reduce((a, x) => a + Math.max(0, x - 17.2), 0), n = g.length; const total = g.reduce((a, x) => a + x, 0);
      const windows = []; let acc = 0, cnt = 0; for (const x of g) { acc += x; cnt++; if (acc >= 3000) { windows.push((cnt * 1000 / acc).toFixed(0)); acc = 0; cnt = 0 } }
      console.log(v.padEnd(22), `frames ${n}, avg fps ${(1000 * n / total).toFixed(1)}, jank time ${(jank / 1000).toFixed(1)}s of ${(total / 1000).toFixed(1)}s, worst ${Math.max(...g).toFixed(0)}ms, fps per 3s: [${windows.join(', ')}]`, logs.length ? ' LOGS:' + logs.slice(0, 2).join(' | ') : '');
    }
    await ctx.close(); return;
  }
  for (const v of variants) {
    const [main, ...opts] = v.split('+'); if (!(main in css)) { console.log('unknown variant', main); continue } await apply((css[main] ?? '') + '\n' + opts.map(o => extra[o] || '').join('\n'));
    await page.waitForTimeout(1500); logs.length = 0;
    const r = await page.evaluate((ms) => new Promise((res) => {
      const gaps = []; let last = performance.now(), muts = 0; const mo = new MutationObserver((l) => { muts += l.length }); mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      const t0 = last; const tick = (t) => { gaps.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(tick); else { mo.disconnect();
        const g = gaps.slice(1); g.sort((a, b) => a - b);
        // forced style recalc cost
        const times = []; for (let i = 0; i < 15; i++) { document.documentElement.style.setProperty('--probe', String(i)); const s = performance.now(); getComputedStyle(document.body).color; document.body.offsetHeight; times.push(performance.now() - s) } document.documentElement.style.removeProperty('--probe'); times.sort((a, b) => a - b);
        res({ fps: +(1000 * g.length / (t - t0)).toFixed(1), medianGap: +g[g.length >> 1].toFixed(1), p95Gap: +g[Math.floor(g.length * 0.95)].toFixed(1), maxGap: +g[g.length - 1].toFixed(1), gapsOver50: g.filter(x => x > 50).length, animations: document.getAnimations().length, mutationsPerSec: +(muts / (ms / 1000)).toFixed(0), recalcMs: +times[times.length >> 1].toFixed(2) }) } };
      requestAnimationFrame(tick);
    }), MS);
    console.log(v.padEnd(18), JSON.stringify(r), logs.length ? ' LOGS:' + logs.slice(0, 3).join(' | ') : '');
  }
  await ctx.close();
})();
