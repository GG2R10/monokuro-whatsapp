// Simulates the Stylus options by appending a :root block, then screenshots / samples colours. Animations are driven by pausing at chosen times.
//   node tools/rainbow.js            -> several scenarios, PNGs in /tmp/rb_*.png and computed-colour samples on stdout
const { open, openChat } = require('./lib');
const SC = {
  fixed_ui_pink: ':root{--ui-color:#ff2bd6}',
  fixed_text_cyan: ':root{--text-color:#00e5ff}',
  ui_rainbow_t0: ':root{--ui-rainbow:1}',
  ui_rainbow_t12: ':root{--ui-rainbow:1}',
  text_rainbow: ':root{--text-rainbow:1}',
  names_rainbow: ':root{--name-rainbow:1}',
  names_custom: ':root{--name-custom:1;--name-color:#ffd400}',
  all_on: ':root{--ui-rainbow:1;--text-rainbow:1;--name-rainbow:1}',
};
const AT = { ui_rainbow_t12: 12, text_rainbow: 6, names_rainbow: 6, all_on: 3 };      // pause the hue animation at step N (of 36)
(async () => {
  const { ctx, page } = await open({ css: true });
  await openChat(page); await page.waitForTimeout(800);
  const probe = () => page.evaluate(() => {
    const c = (e) => e ? getComputedStyle(e).color : null, fill = (e) => e ? getComputedStyle(e).webkitTextFillColor : null;
    const name = document.querySelector('#main [data-testid="author"]:first-child'), body = document.querySelector('#main [data-testid="msg-container"] [data-testid="selectable-text"]');
    const hdr = document.querySelector('#main header span[title], #main header span');
    const rs = getComputedStyle(document.documentElement);
    return { ink: rs.getPropertyValue('--mk-ink').trim().slice(0, 60), hue: rs.getPropertyValue('--mk-hue').trim(), anim: rs.animationName + '/' + rs.animationDuration, uiText: c(hdr), chatText: c(body), nameFill: fill(name), dim: rs.getPropertyValue('--mk-dim').trim().slice(0, 50) };
  });
  for (const [name, css] of Object.entries(SC)) {
    await page.evaluate((c) => { document.querySelectorAll('style[data-sc]').forEach(s => s.remove()); const s = document.createElement('style'); s.dataset.sc = '1'; s.textContent = c; document.head.appendChild(s) }, css);
    await page.waitForTimeout(400);
    if (AT[name] !== undefined) await page.evaluate((st) => { for (const a of document.documentElement.getAnimations()) { a.pause(); a.currentTime = st * (a.effect.getTiming().duration / 36) } }, AT[name]);
    await page.waitForTimeout(300);
    console.log(name.padEnd(16), JSON.stringify(await probe()));
    await page.screenshot({ path: `/tmp/rb_${name}.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  }
  await ctx.close();
})();
