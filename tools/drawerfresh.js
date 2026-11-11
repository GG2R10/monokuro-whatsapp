// FIRST-load measurement of the group-info drawer in a fresh browser session (the page caches the member data afterwards).
//   node tools/drawerfresh.js none|base|full   -> fps while the drawer loads, and how many console warnings/errors WhatsApp itself emits
const { open, openChat } = require('./lib');
const fs = require('fs'), path = require('path');
const v = process.argv[2] || 'full'; const LOAD = +(process.env.LOAD || 14000);
const css = v === 'none' ? '' : fs.readFileSync(path.join(__dirname, '..', v === 'base' ? 'dist/inject.base.css' : 'dist/inject.css'), 'utf8');
(async () => {
  const { ctx, page } = await open({ css: false });
  const counts = {}; const note = (t) => { const k = t.replace(/\d+(\.\d+)?/g, 'N').slice(0, 110); counts[k] = (counts[k] || 0) + 1 };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) note(m.type() + ': ' + m.text()) }); page.on('pageerror', (e) => note('PAGEERROR: ' + e));
  await openChat(page); await page.waitForTimeout(3000);
  if (css) await page.evaluate((c) => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s) }, css);
  await page.waitForTimeout(1500); for (const k of Object.keys(counts)) delete counts[k];
  await page.evaluate(() => { window.__g = []; window.__l = performance.now(); window.__run = true; const t = (n) => { window.__g.push(n - window.__l); window.__l = n; window.__run && requestAnimationFrame(t) }; requestAnimationFrame(t) });
  await page.locator('[data-testid="conversation-info-header"]').first().click();
  await page.waitForTimeout(LOAD);
  const g = await page.evaluate(() => { window.__run = false; return window.__g });
  const total = g.reduce((a, x) => a + x, 0), jank = g.reduce((a, x) => a + Math.max(0, x - 17.2), 0);
  const rows = await page.evaluate(() => document.querySelectorAll('[data-testid="drawer-right"] [data-testid="cell-frame-container"], [data-testid="drawer-right"] [role="listitem"]').length);
  const nodes = await page.evaluate(() => document.querySelectorAll('*').length);
  console.log(`${v.padEnd(5)} avg fps ${(1000 * g.length / total).toFixed(1)}  jank ${(jank / 1000).toFixed(1)}s/${(total / 1000).toFixed(1)}s  worst ${Math.max(...g).toFixed(0)}ms  drawer rows ${rows}  dom nodes ${nodes}`);
  for (const [k, n] of Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4)) console.log(`   ${String(n).padStart(5)}x ${k}`);
  await ctx.close();
})();
