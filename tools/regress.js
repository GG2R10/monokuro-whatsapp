// Visual regression by COMPUTED STYLE: loads the same live DOM twice (same page state), once with CSS A and once with CSS B,
// dumps every element's colour-related computed properties (+ ::before/::after) and diffs them.
//   node tools/regress.js A.css B.css        (exit code 1 when anything differs)
// Animations are disabled in both runs so time does not leak into the comparison.
const { open, openChat } = require('./lib');
const fs = require('fs');
const [A, B] = process.argv.slice(2).map(f => fs.readFileSync(f, 'utf8'));
const PROPS = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-top-width', 'border-top-style',
  'outline-color', 'outline-style', 'fill', 'stroke', 'caret-color', 'text-decoration-color', 'scrollbar-color', 'box-shadow', 'filter', 'background-image', 'visibility'];
const NOANIM = '*,*::before,*::after{animation:none !important;transition:none !important;caret-color:auto}';
const dump = (props) => {
  const out = []; const els = document.querySelectorAll('#app, #app *, body');
  const path = (e) => { const p = []; for (; e && e !== document.body; e = e.parentElement) p.unshift(e.tagName[0] + (e.parentElement ? [...e.parentElement.children].indexOf(e) : 0)); return p.join('/') };
  const norm = (v) => v.replace(/color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)/g, (m, r, g, b, a) => `rgb${a !== undefined && a !== '1' ? 'a' : ''}(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}${a !== undefined && a !== '1' ? ', ' + a : ''})`);   // color-mix() serialises as color(srgb ...)
  const snap = (e, ps) => props.map(p => { let v = norm(getComputedStyle(e, ps || null).getPropertyValue(p)); if (p === 'background-image' && v.length > 60) v = v.slice(0, 20) + '#' + v.length; return v }).join('|');
  for (const e of els) { const r = e.getBoundingClientRect(); if (e.tagName === 'SCRIPT' || e.tagName === 'STYLE') continue; const k = path(e); out.push([k, snap(e)]);
    for (const ps of ['::before', '::after']) { const c = getComputedStyle(e, ps).content; if (c && c !== 'none' && c !== 'normal') out.push([k + ps, snap(e, ps)]) } }
  return out;
};
let totalDiff = 0;
const compare = async (page, label) => {
  const run = async (css) => { await page.evaluate((c) => { document.querySelectorAll('style[data-mk]').forEach(s => s.remove()); const s = document.createElement('style'); s.dataset.mk = '1'; s.textContent = c; document.head.appendChild(s) }, NOANIM + '\n' + css); await page.waitForTimeout(350); return page.evaluate(dump, PROPS) };
  const a = await run(A), b = await run(B);
  const mb = new Map(b); let diffs = []; let missing = 0;
  for (const [k, v] of a) { if (!mb.has(k)) { missing++; continue } if (mb.get(k) !== v) { const va = v.split('|'), vb = mb.get(k).split('|'); PROPS.forEach((p, i) => { if (va[i] !== vb[i]) diffs.push(`${k} ${p}: ${va[i]}  ->  ${vb[i]}`) }) } }
  totalDiff += diffs.length;
  console.log(`${diffs.length ? 'DIFF' : 'ok  '} ${label}: ${a.length} nodes, ${diffs.length} differing props${missing ? ', ' + missing + ' unmatched' : ''}`);
  const seen = new Set(); for (const d of diffs) { const key = d.replace(/^\S+ /, ''); if (!seen.has(key) && seen.size < 14) { seen.add(key); console.log('   ' + d.slice(0, 230)) } }
};
(async () => {
  const { ctx, page } = await open({ css: false, width: 1440, height: 900 });
  const hover = async (loc) => { const b = await loc.first().boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(400) };
  await compare(page, 'chat list');
  await page.locator('button', { hasText: /^Unread/ }).first().click(); await page.waitForTimeout(700); await compare(page, 'chat list / Unread filter');
  await page.locator('button', { hasText: /^All/ }).first().click(); await page.waitForTimeout(500);
  await hover(page.locator('#pane-side [data-testid="cell-frame-container"]').nth(2)); await compare(page, 'chat list / row hover'); await page.mouse.move(700, 400);
  await page.locator('#side input').first().click(); await page.waitForTimeout(400); await compare(page, 'search focused'); await page.keyboard.press('Escape');
  // chats to visit: MK_CHATS="title one,title two" or the first three rows of the list
  for (const chat of process.env.MK_CHATS ? process.env.MK_CHATS.split(',') : [0, 1, 2]) {
    await openChat(page, chat); await compare(page, `chat ${chat}`);
    const m = page.locator('[data-testid="msg-container"]'); const n = await m.count(); if (n) { await m.nth(n - 1).scrollIntoViewIfNeeded(); await hover(m.nth(n - 1)); await compare(page, `chat ${chat} / message hover`); }
    await page.mouse.move(700, 450);
  }
  await openChat(page, 0);
  await page.locator('[aria-label="Emojis, GIFs, Stickers"]').click(); await page.waitForTimeout(1500); await compare(page, 'emoji popup');
  await page.locator('[data-testid="expressions-btn-gif"]').click(); await page.waitForTimeout(2000); await compare(page, 'gif popup');
  await page.locator('[data-testid="expressions-btn-sticker"]').click(); await page.waitForTimeout(2000); await compare(page, 'sticker popup'); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.locator('[data-testid="conversation-info-header"]').first().click(); await page.waitForTimeout(1800); await compare(page, 'group info drawer'); await page.keyboard.press('Escape');
  await page.locator('[aria-label="New chat"]').first().click(); await page.waitForTimeout(1500); await compare(page, 'new chat panel');
  await hover(page.locator('[data-testid="new-chat-drawer-new-group-cell"]')); await compare(page, 'new chat / row hover'); await page.mouse.move(900, 450); await page.keyboard.press('Escape');
  for (const nav of ['Status', 'Calls', 'Communities']) { await page.locator(`[data-navbar-item][aria-label="${nav}"]`).first().click().catch(() => {}); await page.waitForTimeout(1800); await compare(page, `nav ${nav}`); }
  await page.locator('[data-navbar-item][aria-label="Status"]').first().click(); await page.waitForTimeout(1200);
  await page.locator('[aria-label="Status menu"]').first().click().catch(() => {}); await page.waitForTimeout(600); await compare(page, 'status menu open'); await page.keyboard.press('Escape');
  console.log(totalDiff ? `\nTOTAL: ${totalDiff} differing properties` : '\nTOTAL: identical');
  await ctx.close(); process.exit(totalDiff ? 1 : 0);
})();
