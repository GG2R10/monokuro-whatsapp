// Pixel regression: same live page, screenshot with CSS A then CSS B, write A/B/diff PNGs and print the number of differing pixels.
//   node tools/pixdiff.js A.css B.css outdir
const { open, openChat } = require('./lib');
const fs = require('fs'), path = require('path');
const [Af, Bf, out] = process.argv.slice(2); const A = fs.readFileSync(Af, 'utf8'), B = fs.readFileSync(Bf, 'utf8');
fs.mkdirSync(out, { recursive: true });
const FREEZE = '*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important} [data-testid="wa-wordmark"]{visibility:hidden !important}';
(async () => {
  const { ctx, page } = await open({ css: false });
  const view = async (name, clip) => {
    for (const [tag, css] of [['A', A], ['B', B]]) {
      await page.evaluate((c) => { document.querySelectorAll('style[data-mk]').forEach(s => s.remove()); const s = document.createElement('style'); s.dataset.mk = '1'; s.textContent = c; document.head.appendChild(s) }, FREEZE + '\n' + css);
      await page.waitForTimeout(500); await page.screenshot({ path: path.join(out, `${name}_${tag}.png`), clip: clip || { x: 0, y: 0, width: 1440, height: 900 } });
    }
  };
  await view('list');
  await page.locator('[data-navbar-item][aria-label="Status"]').first().click(); await page.waitForTimeout(2500); await view('status');
  await page.locator('[data-navbar-item][aria-label="Chats"]').first().click().catch(() => {}); await page.waitForTimeout(1000);
  await openChat(page); await view('chat');
  await page.locator('[data-testid="conversation-info-header"]').first().click(); await page.waitForTimeout(2000); await view('drawer');
  await ctx.close();
})();
