// Builds the theme from src/:
//   src/*.css       base theme (sorted by filename)
//   src/fx/*.css    optional animations / aesthetic extras (sorted), appended after the base
// Outputs in dist/:
//   monokuro-whatsapp.user.css      (+ .min.user.css, inject.css)       base + fx   <- default, paste into Stylus
//   monokuro-whatsapp.base.user.css (+ .base.min.user.css, inject.base.css)  base only, no animations
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'src');
const fontB64 = fs.readFileSync(path.join(__dirname, 'fonts/PressStart2P-Regular.ttf')).toString('base64');
const fontFace = `@font-face { font-family: "Press Start 2P"; font-style: normal; font-weight: 400; src: url("data:font/ttf;base64,${fontB64}") format("truetype"); }`;
const rings = '/* ---- generated: square status rings (gen-rings.js) ---- */\n' + require('./gen-rings.js');
const readMods = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.css')).sort()
  .map(f => `/* ---- ${path.relative(dir, path.join(d, f))} ---- */\n` + fs.readFileSync(path.join(d, f), 'utf8').trim()) : [];
const baseMods = readMods(dir), fxMods = readMods(path.join(dir, 'fx'));
const mk = mods => fontFace + '\n\n' + mods.join('\n\n') + '\n\n' + rings;
const body = mk(baseMods.concat(fxMods));        // full: base theme + src/fx/*.css
const bodyBase = mk(baseMods);                   // base only (no animations / aesthetic extras)

// Stylus user-configurable variables. @preprocessor default => Stylus exposes each as `:root { --<name>: <value> }` (no placeholders involved).
// [type, name, label, @var default syntax, default CSS value used for dist/inject*.css and the static wallpaper build]
// Ranges are unit-less on purpose: the CSS applies the unit (calc(x / 100), calc(x * 1px)).
const VARS = [
  ['text',   'wp-img',        'Wallpaper image: none | url("https://...") | url("data:image/jpeg;base64,...")', 'none', 'none'],
  ['select', 'wp-fit',        'Wallpaper fit', '{"cover:Cover*": "cover", "contain:Contain": "contain", "stretch:Stretch": "100% 100%"}', 'cover'],
  ['range',  'wp-brightness', 'Wallpaper brightness (%)', '[60, 0, 200, 1]', '60'],
  ['range',  'wp-contrast',   'Wallpaper contrast (%)',   '[100, 0, 300, 1]', '100'],
  ['range',  'wp-saturate',   'Wallpaper saturation (%)', '[100, 0, 300, 1]', '100'],
  ['range',  'wp-blur',       'Wallpaper blur (px)',      '[0, 0, 30, 0.5]', '0'],
  ['range',  'wp-gray',       'Wallpaper grayscale (%)',  '[0, 0, 100, 1]', '0'],
  ['range',  'wp-opacity',    'Wallpaper opacity (%)',    '[100, 0, 100, 1]', '100'],
  ['range',  'wp-dither',     '1-bit dither overlay (%)', '[0, 0, 100, 1]', '0'],
  // colours and rainbow toggles (select 0/1 instead of checkbox: the value that reaches CSS is exactly the number)
  ['color',  'paper-color',   'Background colour', '#000000', '#000000'],
  ['color',  'ui-color',      'UI colour (borders, icons, UI text)', '#ffffff', '#ffffff'],
  ['select', 'ui-rainbow',    'UI rainbow (uses CPU)', '["0:Off*", "1:On"]', '0'],
  ['color',  'text-color',    'Chat text colour', '#ffffff', '#ffffff'],
  ['select', 'text-rainbow',  'Chat text rainbow (uses CPU)', '["0:Off*", "1:On"]', '0'],
  ['select', 'name-custom',   'User names: custom colour (Off = WhatsApp colours)', '["0:Off*", "1:On"]', '0'],
  ['color',  'name-color',    'User names: custom colour', '#ffffff', '#ffffff'],
  ['select', 'name-rainbow',  'User names rainbow (uses CPU; hue-shifts each name)', '["0:Off*", "1:On"]', '0'],
  ['color',  'ring-new-color',  'Status ring: unviewed colour', '#21c063', '#21c063'],
  ['color',  'ring-seen-color', 'Status ring: viewed colour', '#666666', '#666666'],
  ['range',  'rainbow-speed', 'Rainbow cycle time in seconds (WARNING: the shorter, the more CPU)', '[12, 2, 60, 1]', '12'],
  ['range',  'rainbow-light', 'Rainbow brightness (%)', '[62, 35, 85, 1]', '62'],
];
const varLines = VARS.map(([t, n, l, d]) => `@var ${t} ${n} "${l.replace(/"/g, "'")}" ${d}`).join('\n');
const rootDefaults = (over = {}) => ':root {\n' + VARS.map(([, n, , , d]) => `  --${n}: ${over[n] !== undefined ? over[n] : d};`).join('\n') + '\n}\n';
const mkHeader = (vars) => `/* ==UserStyle==
@name        Monokuro for WhatsApp Web
@namespace   local.monokuro
@version     2.0.0
@description 1-bit black & white pixel theme inspired by the monokuro world portfolio. CUSTOM WALLPAPER (optional): in the options set "Wallpaper image" to a full CSS token: url("https://example.com/image.jpg") [needs the Stylus option "Patch CSP to allow style assets"] or url("data:image/jpeg;base64,...") [works without it: convert your image with any "image to base64" web tool, resize it to ~1280px / under ~300 KB first, and keep the data:image/...;base64, prefix]. none = no wallpaper.
@preprocessor default${vars ? '\n' + varLines : ''}
==/UserStyle== */
`;
// conservative minifier: strips comments and layout whitespace but never touches quoted strings / data URIs
function minify(css) {
  // single left-to-right pass: strings and comments are tokenized together so apostrophes inside comments never pair up as strings,
  // and Stylus placeholders (/*[[name]]*/, also inside strings) survive
  const keep = [];
  css = css.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\*[\s\S]*?\*\//g, m => {
    if (m[0] === '/' && !/^\/\*\[\[[\w-]+\]\]\*\/$/.test(m)) return '';
    keep.push(m); return `\u0000${keep.length - 1}\u0000`;
  });
  css = css.replace(/\s+/g, ' ').replace(/\s*([{};])\s*/g, '$1').replace(/;}/g, '}').trim();
  return css.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]);
}
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
const emit = (b, suffix, full) => {
  const header = mkHeader(full);
  const w = (name, txt) => fs.writeFileSync(path.join(__dirname, 'dist', name), txt);
  w(`inject${suffix}.css`, (full ? rootDefaults() + '\n' + b : b) + '\n');
  w(`monokuro-whatsapp${suffix}.user.css`, header + '\n@-moz-document domain("web.whatsapp.com") {\n' + b.replace(/^/gm, '  ') + '\n}\n');
  w(`monokuro-whatsapp${suffix}.min.user.css`, header + '\n@-moz-document domain("web.whatsapp.com") {' + minify(b) + '}\n');
};
emit(body, '', true);            // dist/monokuro-whatsapp.user.css (+ .min, inject.css)  = full
emit(bodyBase, '.base', false);

// Optional: STATIC wallpaper build with no Stylus variables (a fallback; the normal build already uses the Stylus @var UI):
//   MK_WALLPAPER=path/or/https-url  [MK_WP_FIT=cover] [MK_WP_BRIGHTNESS=60] [MK_WP_CONTRAST=100] [MK_WP_SATURATE=100]
//   [MK_WP_BLUR=0] [MK_WP_GRAY=0] [MK_WP_OPACITY=100] [MK_WP_DITHER=0]  node build.js
// -> dist/monokuro-whatsapp.wallpaper.user.css  (no @var header; change a value = rebuild)
if (process.env.MK_WALLPAPER) {
  const src = process.env.MK_WALLPAPER; let uri = src;
  if (!/^(data:|https?:)/.test(src)) {
    const f = path.resolve(src); const ext = path.extname(f).slice(1).toLowerCase().replace('jpg', 'jpeg');
    uri = `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,` + fs.readFileSync(f).toString('base64');
  }
  const over = { 'wp-img': `url("${uri}")` };
  for (const [, n] of VARS) { const e = process.env['MK_' + n.toUpperCase().replace(/-/g, '_')]; if (e !== undefined && n !== 'wp-img') over[n] = e; }
  const out = rootDefaults(over) + '\n' + body;
  fs.writeFileSync(path.join(__dirname, 'dist/monokuro-whatsapp.wallpaper.user.css'),
    mkHeader(false) + '\n@-moz-document domain("web.whatsapp.com") {\n' + out.replace(/^/gm, '  ') + '\n}\n');
  console.log('static wallpaper build:', (uri.length / 1024).toFixed(0), 'KB source');
}

// ---- Local themes: themes/<id>.json = a palette (+ wallpaper options) for one wallpaper image ----
// -> dist/themes/monokuro-whatsapp.<id>.user.css (Stylus file: the theme's values are the DEFAULTS of the options, the image is embedded, everything stays
//    editable in Stylus except the image) and dist/themes/inject.<id>.css (no wrapper, for the test harness). dist/themes is git-ignored (embeds images).
// Image: resized with ImageMagick (`magick`) to maxWidth and re-encoded, so a 10000px PNG does not end up inside a CSS file.
const themeDir = path.join(__dirname, 'themes');
if (fs.existsSync(themeDir)) {
  const { execFileSync } = require('child_process'); const os = require('os');
  const outDir = path.join(__dirname, 'dist/themes'); fs.mkdirSync(outDir, { recursive: true });
  const withDefault = ([t, n, l, d], v) => {                       // the @var line with `v` as its default
    if (v === undefined) return `@var ${t} ${n} "${l.replace(/"/g, "'")}" ${d}`;
    let dd = d;
    if (t === 'range') dd = d.replace(/^\[\s*[-\d.]+/, '[' + v);
    else if (t === 'color') dd = String(v);
    else if (t === 'select') dd = d.replace(/\*/g, '').replace(new RegExp(`("${String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:[^"]*)"`), '$1*"');
    return `@var ${t} ${n} "${l.replace(/"/g, "'")}" ${dd}`;
  };
  for (const f of fs.readdirSync(themeDir).filter(x => x.endsWith('.json')).sort()) {
    const t = JSON.parse(fs.readFileSync(path.join(themeDir, f), 'utf8')); const id = t.id || path.basename(f, '.json');
    const img = path.resolve(__dirname, t.wallpaper || '');
    if (!t.wallpaper || !fs.existsSync(img)) { console.log(`theme ${id}: wallpaper not found (${t.wallpaper}), skipped`); continue; }
    const ext = /\.png$/i.test(img) && !t.asJpeg ? 'png' : 'jpg', tmp = path.join(os.tmpdir(), `mk-theme-${id}.${ext}`);
    const args = [img + '[0]', '-resize', `${t.maxWidth || 1600}x>`, '-strip']; if (ext === 'jpg') args.push('-quality', String(t.quality || 78));
    execFileSync('magick', [...args, tmp]);
    const uri = `url("data:image/${ext === 'jpg' ? 'jpeg' : 'png'};base64,${fs.readFileSync(tmp).toString('base64')}")`;
    const opts = t.options || {};
    const lines = VARS.filter(v => v[1] !== 'wp-img').map(v => withDefault(v, opts[v[1]])).join('\n');
    const hdr = mkHeader(false).replace(/@name .*/, `@name        Monokuro for WhatsApp Web - ${t.name || id}`).replace('@preprocessor default', '@preprocessor default\n' + lines);
    fs.writeFileSync(path.join(outDir, `monokuro-whatsapp.${id}.user.css`), hdr + '\n@-moz-document domain("web.whatsapp.com") {\n:root { --wp-img: ' + uri + '; }\n' + body.replace(/^/gm, '  ') + '\n}\n');
    const over = { ...opts, 'wp-img': uri };
    fs.writeFileSync(path.join(outDir, `inject.${id}.css`), rootDefaults(over) + '\n' + body + '\n');
    console.log(`theme ${id}: ${(uri.length / 1024).toFixed(0)} KB image`);
  }
}
