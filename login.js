const { firefox } = require('playwright');
(async () => {
  const ctx = await firefox.launchPersistentContext('./profile', {
    headless: true, viewport: { width: 1280, height: 800 },
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://web.whatsapp.com/');
  const t0 = Date.now();
  while (Date.now() - t0 < 240000) {
    if (await page.locator('#pane-side').count()) { console.log('LOGGED_IN'); break; }
    await page.screenshot({ path: 'qr.png' });
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(5000);
  await ctx.close();
})();
