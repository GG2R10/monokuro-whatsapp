const { firefox } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

async function open({ css = false, width = 1440, height = 900 } = {}) {
  const ctx = await firefox.launchPersistentContext(path.join(root, 'profile'), {
    headless: true, viewport: { width, height }, colorScheme: 'dark',
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://web.whatsapp.com/');
  await page.waitForSelector('#pane-side', { timeout: 90000 });
  await page.waitForTimeout(2500);
  const cont = page.getByRole('button', { name: 'Continue' });
  if (await cont.count()) { await cont.first().click().catch(() => {}); await page.waitForTimeout(500); }
  if (css) await page.addStyleTag({ content: fs.readFileSync(process.env.MK_CSS ? path.resolve(process.env.MK_CSS) : path.join(root, 'dist/inject.css'), 'utf8').replace(process.env.MK_REAL ? /$^/ : /:hover/g, '.__h') });
  return { ctx, page };
}

// name: chat title; number: nth row of the chat list; omitted: MK_CHAT (env) or the first row
async function openChat(page, name = process.env.MK_CHAT || 0) {
  const row = typeof name === 'number'
    ? page.locator('#pane-side [data-testid="cell-frame-container"]').nth(name)
    : page.locator('#pane-side span[title]', { hasText: name }).first();
  await row.click();
  await page.waitForSelector('#main footer', { timeout: 20000 });
  await page.waitForTimeout(2000);
}

// simulate :hover deterministically (headless Firefox loses real :hover on re-rendered buttons)
async function forceHover(loc) {
  await loc.first().evaluate((el) => { document.querySelectorAll('.__h').forEach(e => e.classList.remove('__h')); for (let e = el; e && e !== document.documentElement; e = e.parentElement) e.classList.add('__h'); });
  await loc.page().waitForTimeout(300);
}
module.exports = { open, openChat, root, forceHover };
