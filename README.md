# Monokuro WhatsApp

<!-- TODO: screenshots (chat, group info, themes). Put the images in docs/ and reference them here. -->

A 1-bit style pixel art theme for [WhatsApp Web](https://web.whatsapp.com), inspired by *monokuro world*.

It is a **userstyle for [Stylus](https://add0n.com/stylus.html)** (Firefox / Chrome), written as modular CSS and compiled by a tiny build script.

Pixel font ([Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P), embedded), 2px white borders, square corners, square
status rings split by number of statuses, optional wallpaper and a few small animations.

## Install

<details open>
<summary><b>Method 1: from Stylus / userstyles</b> (coming soon)</summary>

Once the style is published on a userstyles site it will show up when you search for *Monokuro* in Stylus, with one-click install and updates.
</details>

<details>
<summary><b>Method 2: manual</b></summary>

1. Install the Stylus extension.
2. Open one of the files from [`dist/`](dist) and let Stylus install it (or paste it into *Write new style*, keeping the `==UserStyle==` header):

| File | What it is |
| --- | --- |
| `dist/monokuro-whatsapp.user.css` | **Default.** Base theme + effects (`src/fx`) + wallpaper options |
| `dist/monokuro-whatsapp.min.user.css` | Same, minified |
| `dist/monokuro-whatsapp.base.user.css` | Base theme only: no animations, no wallpaper |
| `dist/monokuro-whatsapp.base.min.user.css` | Base only, minified |
| `dist/inject*.css` | Same rules without the Stylus wrapper (used by the test harness, do not install) |

If an effect misbehaves, switch to the `base` file: nothing else changes.
</details>

## Themes

A theme is a palette plus an optional wallpaper, stored as one small JSON file in [`themes/`](themes). The repository ships these presets:

| Id | Name |
| --- | --- |
| `edgerunners-moon` | Edgerunners - moon |
| `dark-room` | Dark room |
| `red-sun` | Red sun |
| `neon-hunter` | Neon hunter |
| `dedsec-acid` | DedSec acid |
| `dedsec-mono` | DedSec mono |

The wallpapers of the presets are third-party artwork and are **not** distributed (see [Credits](#credits)); the JSON files only hold the palette and the
name of the image. You can use the presets as they are (palette only: set the colours from the Stylus options) or build them with your own image.

### Define your own theme

```json
{
  "id": "my-theme",
  "name": "My theme",
  "wallpaper": "path/to/image.jpg",
  "maxWidth": 1600,
  "asJpeg": true,
  "options": {
    "paper-color": "#050b12",
    "ui-color": "#f4f92f",
    "text-color": "#eae1c9",
    "ring-new-color": "#46d6c8",
    "ring-seen-color": "#435f7f",
    "wp-brightness": 55,
    "wp-fit": "cover"
  }
}
```

`options` accepts any Stylus option (see the tables below). Then run `node build.js` (needs ImageMagick for the image): it writes
`dist/themes/monokuro-whatsapp.<id>.user.css`, where the values are the **defaults** of the Stylus options (everything stays editable) and the
image, resized to `maxWidth`, is embedded. `dist/themes/` is git-ignored because it contains images. `node tools/themeshot.js [id ...]` renders
every theme on a live chat.

Tip: palettes can be derived from an image with `ucs` (`ucs palette generate <image> --out <file>`) and then adjusted by eye for contrast.

## Custom wallpaper

Open the style's options in Stylus. All sliders apply live: brightness, contrast, saturation, blur, grayscale, opacity, 1-bit dither overlay, and fit (cover / contain / stretch).

The **Wallpaper image** field takes a full CSS token, not just a URL:

* `none`: no wallpaper (default).
* `url("data:image/jpeg;base64,...")`: always works. Convert your image with any "image to base64" web tool, keep the
  `data:image/...;base64,` prefix, and wrap it in `url("...")`. Resize first (about 1280px wide, under ~300 KB): Stylus stores the value and
  applies it in every WhatsApp tab.
* `url("https://example.com/image.jpg")`: only works if you enable Stylus' option **"Patch CSP to allow style assets"**; WhatsApp's
  Content-Security-Policy blocks external images otherwise. Some hosts also refuse hotlinking.

## Colour options and rainbow (Stylus)

Besides the wallpaper, the options panel has:

| Option | What it does |
| --- | --- |
| Background colour | the paper colour (default black); on-fill text and the greys are derived from it |
| UI colour / UI rainbow | colour of borders, icons, UI text and the inverted fills; Off/On rainbow (**uses CPU**) |
| Chat text colour / Chat text rainbow | message text and the compose box; quoted text follows it (dimmed) |
| User names: custom colour, colour, rainbow | Off keeps WhatsApp's per-user colours (boosted). On replaces them with one colour. Rainbow rotates the hue of each name's own colour, so different people stay different |
| Status ring colours | unviewed / viewed segments |
| Rainbow cycle time / brightness | speed (seconds per full cycle; **the shorter, the more CPU**: every step restyles the whole page) and lightness shared by UI and text rainbow |

How it works: Stylus turns each `@var` into a `:root` custom property (`--ui-color`, `--ui-rainbow`, `--name-custom`, ...); `src/00-tokens.css` mixes them into the
role tokens with `color-mix()`; the greys are the chosen colour dimmed towards black. `src/fx/50-rainbow.css` animates one shared hue (`--mk-hue`, an `@property`
number) in 36 steps; chat text sits 180deg away from the UI on the colour wheel. The animation only runs while at least one rainbow option is On, and
`prefers-reduced-motion` turns rainbow off. Needs `@property` and `color-mix()` (Firefox 128+, Chrome 111+).

`tools/rainbow.js` simulates the options and samples/screenshots the result.

## Colour tokens

Every colour the theme draws comes from a role token defined once in `src/00-tokens.css`; the rest of `src/` only uses `var(--mk-*)`:

| Token | Role |
| --- | --- |
| `--mk-paper` | every background / surface |
| `--mk-ink` | UI chrome: borders, outlines, icons, UI text |
| `--mk-text` | chat text (message bodies, compose box) |
| `--mk-fill` / `--mk-on-fill` | solid inverted fills (hover, selected row, send button, badges) and what is drawn on them |
| `--mk-dim`, `--mk-dim-hi`, `--mk-quote`, `--mk-row` | greys: secondary text, member tag / date label, quoted text, selected list row |
| `--mk-link`, `--mk-mention` | blue links, neon-pink @mentions |
| `--mk-ring-new`, `--mk-ring-seen` | status ring segments: unviewed (green) / viewed (grey) |
| `--mk-logo-accent` | the pink details of the cat logo (nose, ear, blush); the rest of the logo follows `--mk-ink` |

The dither dots and the status rings are drawn through CSS masks (`--mk-dither-mask`, `--mk-ring-mask-*`), so they take their colour from tokens too:
dots use `--mk-ink`; rings use `--mk-ring-new` (unviewed segments), `--mk-ring-seen` (viewed) and `--mk-ink` for any ring the generator does not recognise.
The animated cat logo is also two alpha masks of one animated SVG (`assets/cat-logo/gen_css.py` generates `src/fx/30-logo-cat.css` from the art): outline, text and floor shadow follow `--mk-ink`, the pink details follow `--mk-logo-accent`. Nothing is baked into an image any more.

`tools/regress.js A.css B.css` compares the computed colours of every element across ~20 views of a live WhatsApp Web (same DOM, CSS A vs CSS B)
and reports any difference; `tools/pixdiff.js` does the same with screenshots, `tools/ringgrid.js` renders every status-ring variant (N=2..12, every viewed/unviewed split)
under two stylesheets and diffs the pixels; `tools/tint.js` paints each token a loud colour to spot anything that is still hard-coded.

## Repository layout

```
src/*.css        base theme, concatenated in filename order (00-tokens … 90-controls)
themes/*.json    local theme presets (palette + wallpaper), built into dist/themes/
src/fx/*.css     optional effects, appended after the base (name scan animation, wallpaper, animated cat logo)
assets/cat-logo/ source of the pixel-art cat logo: gen.py generates the SVG and a preview; gen_css.py turns the SVG into the two masks in src/fx/30-logo-cat.css
fonts/           Press Start 2P (SIL OFL, see `fonts/OFL.txt`), embedded into the CSS as base64 at build time
gen-rings.js     generates the square, segmented status-ring CSS
build.js         builds everything into dist/
dist/            built files (these are what users install)
tools/           Playwright scripts used to inspect and test the theme against a real WhatsApp Web session
```

`src` modules, roughly: `00-tokens` (WhatsApp `--WDS-*` variables recoloured to black/white), `05-surfaces` (grey surface variables),
`10-base`, `20-sidebar`, `30-header`, `40-messages`, `50-compose`, `60-overlays` (dialogs, menus, toasts), `70-media` (avatars, rings),
`80-hover` (one unified hover system), `85-buttons`, `90-controls` (switches, floating labels).

## Build

```bash
npm install          # only needed for the Playwright test tools
npm run build        # = node build.js  ->  dist/
```

Optional static wallpaper build (no Stylus variables, handy to test an image; the output is git-ignored because it embeds your image):

```bash
MK_WALLPAPER=path/to/image.jpg [MK_WP_BRIGHTNESS=60 MK_WP_BLUR=0 MK_WP_GRAY=0 ...] node build.js
# -> dist/monokuro-whatsapp.wallpaper.user.css
```

## Notes for contributors

* WhatsApp Web ships obfuscated StyleX class names (`x78zum5`…). Selectors therefore rely on `data-testid`, `role`, `aria-label`, structure
  and `:has()`. A few rules do use a class (for example `xfn3atn`, `x17t9dm2`) because nothing else distinguishes the element; treat those as
  the first suspects when WhatsApp ships an update.
* Colours come from WhatsApp's CSS variables. Recolouring `--WDS-*` in `00-tokens` / `05-surfaces` is more robust than painting elements.
* Most declarations are `!important` and many selectors carry `:not(#_)` to out-specify WhatsApp's atomic classes; keep that in mind
  when adding rules. `!important` also beats CSS animations, so animated properties must not be `!important`.
* `@preprocessor default`: Stylus exposes every `@var` as a CSS custom property on `:root` (`--wp-img`, …). The `/*[[name]]*/` placeholder
  syntax is **not** supported here. The variable table lives in `build.js` (`VARS`).
* Fonts: Press Start 2P is licensed under the SIL Open Font License.

### Testing against a real session (Playwright)

`tools/*.js` open WhatsApp Web with a persistent Firefox profile in `profile/`.
`tools/lib.js` exposes `open`, `openChat` and `forceHover`.

* `MK_CSS=path/to/file.css` injects another stylesheet instead of `dist/inject.css`.
* `MK_CHAT="chat title"` picks the chat the scripts open (default: first row of the list); `regress.js` also reads `MK_CHATS="a,b,c"`.
* `MK_REAL=1` keeps real `:hover` (otherwise `:hover` is rewritten to `.__h` and simulated with `forceHover`, because headless Firefox loses real hover on re-rendered nodes).
* The first run needs a QR login: see `login.js`.

## Credits

* **Aesthetic and idea:** *monokuro world* (1-bit black and white pixel look). _Author / link to be added._
* **Font:** [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38, SIL Open Font License 1.1.
* **Cat logo:** pixel art drawn for this project (`assets/cat-logo/`).
* **Theme wallpapers** (not distributed, used to derive the preset palettes):

| Theme | Image source |
| --- | --- |
| Edgerunners - moon | _artist / series / URL to be added_ |
| Dark room | _artist / series / URL to be added_ |
| Red sun | _artist / series / URL to be added_ |
| Neon hunter | _artist / series / URL to be added_ |
| DedSec acid, DedSec mono | _artist / series / URL to be added_ |

## License

The code and the theme are released under the [MIT License](LICENSE).

### Third-party licenses

* **Press Start 2P** (font), Copyright 2012 The Press Start 2P Project Authors, [SIL Open Font License 1.1](fonts/OFL.txt). The built CSS files embed the
  unmodified font as base64; the font keeps its own license, which is why every built file carries a notice in its header. The OFL covers the font only, not the rest of the code.

This project is not affiliated with WhatsApp or Meta.
