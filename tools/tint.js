// Leak test: every role token gets a distinct loud colour; whatever is still white/black is NOT tokenised yet.
const { open, openChat } = require('./lib');
const TINT = ':root{--mk-ink:#ff2bd6 !important;--mk-text:#00e5ff !important;--mk-fill:#ffd400 !important;--mk-on-fill:#1a0066 !important;--mk-paper:#0b1a40 !important;--mk-dim:#ff9a00 !important;--mk-dim-hi:#ff6a00 !important;--mk-quote:#7cff00 !important;--mk-row:#7a2d00 !important}';
(async () => {
  const { ctx, page } = await open({ css: true });
  await page.addStyleTag({ content: TINT });
  const shot = async (n, clip) => { await page.waitForTimeout(500); await page.screenshot({ path: `t_${n}.png`, clip: clip || { x: 0, y: 0, width: 1440, height: 900 } }) };
  await openChat(page); await page.evaluate(() => { const r = document.querySelector('[data-testid="cell-frame-container"]'); });
  await shot('chat');
  await page.locator('[aria-label="Emojis, GIFs, Stickers"]').click(); await page.waitForTimeout(1200); await page.locator('[data-testid="expressions-btn-sticker"]').click(); await page.waitForTimeout(1500); await shot('popup'); await page.keyboard.press('Escape');
  await page.locator('[aria-label="New chat"]').first().click(); await page.waitForTimeout(1500); await shot('newchat', { x: 0, y: 0, width: 520, height: 500 });
  await ctx.close();
})();
