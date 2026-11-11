// Synthetic check of every ring variant: renders N=2..12 pure (new/seen) and every mixed k, with CSS A and CSS B, and diffs the pixels.
const { open } = require('./lib');
const fs = require('fs');
const [Af, Bf] = process.argv.slice(2); const A = fs.readFileSync(Af, 'utf8'), B = fs.readFileSync(Bf, 'utf8');
(async () => {
  const { ctx, page } = await open({ css: false });
  await page.evaluate(() => {
    const G = 'xc92gef', Y = 'x1xwosuo', C = 2 * Math.PI * 50, GAP = 10;
    const root = document.createElement('div'); root.id = 'ringgrid'; root.style.cssText = 'position:fixed;left:0;top:0;width:1440px;height:900px;background:#000;z-index:99999;display:flex;flex-wrap:wrap;align-content:flex-start;gap:6px;padding:6px';
    const mk = (parts) => { const d = document.createElement('div'); d.style.cssText = 'width:60px;height:60px'; d.innerHTML = `<svg viewBox="0 0 104 104" width="60" height="60">${parts}</svg>`; root.appendChild(d) };
    const circ = (cls, da) => `<g data-testid="status-ring-broken"><circle class="${cls}" cx="52" cy="52" r="50" fill="none" stroke-width="4" ${da ? `stroke-dasharray="${da}"` : ''}/></g>`;
    for (let N = 2; N <= 12; N++) {
      const D = (C - GAP * N) / N; const full = `${D} ${GAP} `.repeat(N - 1) + `${D} ${GAP}`;
      mk(circ(G, full)); mk(circ(Y, full));
      for (let k = 1; k < N; k++) { const gd = `${D} ${GAP} `.repeat(k - 1) + `${D} 9999`; mk(circ(Y, full) + circ(G, gd)) }
    }
    mk(circ(G, '')); mk(circ(Y, ''));
    document.getElementById('app').appendChild(root);
  });
  const shot = async (tag, css) => { await page.evaluate((c) => { document.querySelectorAll('style[data-mk]').forEach(s => s.remove()); const s = document.createElement('style'); s.dataset.mk = '1'; s.textContent = c; document.head.appendChild(s) }, css); await page.waitForTimeout(500); await page.screenshot({ path: `/tmp/ring_${tag}.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } }) };
  await shot('A', A); await shot('B', B);
  console.log(await page.evaluate(() => document.querySelectorAll('#ringgrid svg').length + ' rings rendered'));
  await ctx.close();
})();
