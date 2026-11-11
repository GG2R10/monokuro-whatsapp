// Screenshots every theme (dist/themes/inject.<id>.css) on a live chat + the chat list; PNGs go to /tmp/themes/<id>_*.png
const { open, openChat } = require('./lib');
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'dist/themes'); const only = process.argv.slice(2);
const ids = fs.readdirSync(dir).filter(f => f.startsWith('inject.')).map(f => f.slice(7, -4)).filter(id => !only.length || only.includes(id));
fs.mkdirSync('/tmp/themes', { recursive: true });
(async () => {
  const { ctx, page } = await open({ css: false });
  await openChat(page); await page.waitForTimeout(1500);
  for (const id of ids) {
    const css = fs.readFileSync(path.join(dir, `inject.${id}.css`), 'utf8');
    await page.evaluate((c) => { document.querySelectorAll('style[data-th]').forEach(s => s.remove()); const s = document.createElement('style'); s.dataset.th = '1'; s.textContent = '*,*::before,*::after{animation:none !important}' + c; document.head.appendChild(s) }, css);
    await page.waitForTimeout(900); await page.screenshot({ path: `/tmp/themes/${id}_chat.png` }); console.log('shot', id);
  }
  await ctx.close();
})();
