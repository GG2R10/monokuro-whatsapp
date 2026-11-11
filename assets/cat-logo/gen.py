"""Genera el logo pixel art animado (gato + 'WhatsApp') como SVG + snippet UserCSS."""
from urllib.parse import quote

WHITE, PINK, FILL, SHADOW = "#fff", "#ff6ec7", "#000", "#3a3a3a"

# ---------------- Cara del gato (16x14, coords de cara) ----------------
FACE = [
    ".#............#.",
    ".##..........##.",
    ".#p#........#p#.",
    ".#..########..#.",
    ".#............#.",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    ".#............#.",
    "..##........##..",
    "....########....",
]
FW, FH = 16, 14
CAT_X, CAT_Y = 2, 2  # offset de la cara dentro del lienzo (deja sitio a bigotes y a flotar)

def flood_interior(grid):
    """Celdas '.' no alcanzables desde el borde = relleno de la cara."""
    h, w = len(grid), len(grid[0])
    outside = set()
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while stack:
        x, y = stack.pop()
        if not (0 <= x < w and 0 <= y < h) or (x, y) in outside or grid[y][x] != ".":
            continue
        outside.add((x, y))
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return {(x, y) for y in range(h) for x in range(w) if grid[y][x] == "." and (x, y) not in outside}

def rects_from_cells(cells, color, ox=0, oy=0):
    """Une píxeles contiguos por fila en <rect> para reducir tamaño."""
    out, rows = [], {}
    for x, y in cells:
        rows.setdefault(y, []).append(x)
    for y in sorted(rows):
        xs = sorted(rows[y]); start = prev = xs[0]
        for x in xs[1:] + [None]:
            if x is not None and x == prev + 1:
                prev = x; continue
            out.append(f"<rect x='{start+ox}' y='{y+oy}' width='{prev-start+1}' height='1' fill='{color}'/>")
            if x is not None: start = prev = x
    return "".join(out)

def cells_of(grid, ch):
    return [(x, y) for y, r in enumerate(grid) for x, c in enumerate(r) if c == ch]

def px(points, color):
    return rects_from_cells(points, color, CAT_X, CAT_Y)

# Oreja izquierda separada para poder hacer el "twitch"
LEFT_EAR = {(1, 0), (1, 1), (2, 1), (1, 2), (3, 2)}
outline = [c for c in cells_of(FACE, "#") if c not in LEFT_EAR]
ear_pink_l = [(2, 2)]
ear_pink_r = [c for c in cells_of(FACE, "p") if c != (2, 2)]
fill = flood_interior([r.replace("p", "#") for r in FACE])

# Rasgos (coords de cara)
EYES = {
    "open":  [(x, y) for x in (4, 5, 10, 11) for y in (6, 7)],
    "left":  [(x, y) for x in (3, 4, 9, 10) for y in (6, 7)],
    "right": [(x, y) for x in (5, 6, 11, 12) for y in (6, 7)],
    "blink": [(x, 7) for x in (4, 5, 10, 11)],
    "happy": [(3, 7), (4, 6), (5, 6), (6, 7), (9, 7), (10, 6), (11, 6), (12, 7)],
    "big":   [(x, y) for x in (4, 5, 10, 11) for y in (5, 6, 7)],
}
NOSE = [(7, 9), (8, 9)]
MOUTH_W = [(5, 10), (7, 10), (8, 10), (10, 10), (6, 11), (9, 11)]
MOUTH_O = [(7, 10), (8, 10), (7, 11), (8, 11)]
BLUSH = [(2, 9), (3, 9), (12, 9), (13, 9)]
WHISKERS = [(-2, 8), (-1, 8), (-2, 10), (-1, 10), (16, 8), (17, 8), (16, 10), (17, 10)]

# Sombra bajo el gato (cambia de ancho al flotar)
SHADOW_Y = 17
shadow = {
    "s0": [(x, SHADOW_Y) for x in range(5, 15)],
    "s1": [(x, SHADOW_Y) for x in range(6, 14)],
    "s2": [(x, SHADOW_Y) for x in range(7, 13)],
}

# ---------------- Fuente pixel (mayúsc. 7 filas, descendente 2) ----------------
GLYPHS = {
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
    "h": ["#...", "#...", "#.#.", "##.#", "#..#", "#..#", "#..#"],
    "a": ["....", "....", ".##.", "...#", ".###", "#..#", ".###"],
    "t": [".#..", ".#..", "####", ".#..", ".#..", ".#..", "..##"],
    "s": ["....", "....", ".###", "#...", ".##.", "...#", "###."],
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "p": ["....", "....", "###.", "#..#", "#..#", "#..#", "###.", "#...", "#..."],
}
TEXT = "WhatsApp"
TEXT_X, TEXT_Y = 23, 5

# ---------------- Timeline de expresiones (loop de 12 s) ----------------
LOOP = 12
TIMELINE = {  # intervalos visibles en %
    "open":  [(0, 14), (16, 25), (37, 42), (70, 84), (86, 100)],
    "blink": [(14, 16), (84, 86)],
    "left":  [(25, 31)],
    "right": [(31, 37)],
    "happy": [(42, 58)],
    "big":   [(58, 70)],
    "mw":    [(0, 58), (70, 100)],
    "mo":    [(58, 70)],
    "blush": [(42, 58)],
}

def vis_keyframes(name, spans):
    pts = {0: 0, 100: 0}
    for a, b in spans:
        pts[a] = 1
        if b < 100: pts.setdefault(b, 0)
        if b == 100: pts[100] = 1
    body = "".join(f"{k}%{{opacity:{v}}}" for k, v in sorted(pts.items()))
    return f"@keyframes v-{name}{{{body}}}"

css = [
    "*{animation-timing-function:steps(1,end);animation-iteration-count:infinite}",
    # flotar: 4 frames pixelados
    ".cat{animation-name:bob;animation-duration:1.6s}",
    "@keyframes bob{0%{transform:translateY(0)}25%{transform:translateY(-1px)}50%{transform:translateY(-2px)}75%{transform:translateY(-1px)}100%{transform:translateY(0)}}",
    ".s0{animation-name:sh0;animation-duration:1.6s}.s1{opacity:0;animation-name:sh1;animation-duration:1.6s}.s2{opacity:0;animation-name:sh2;animation-duration:1.6s}",
    "@keyframes sh0{0%{opacity:1}25%{opacity:0}100%{opacity:1}}",
    "@keyframes sh1{0%{opacity:0}25%{opacity:1}50%{opacity:0}75%{opacity:1}100%{opacity:0}}",
    "@keyframes sh2{0%{opacity:0}50%{opacity:1}75%{opacity:0}100%{opacity:0}}",
    # oreja que se mueve
    ".ear{animation-name:twitch;animation-duration:12s}",
    "@keyframes twitch{0%{transform:translateY(0)}92%{transform:translateY(1px)}94%{transform:translateY(0)}95%{transform:translateY(1px)}97%{transform:translateY(0)}100%{transform:translateY(0)}}",
    # letras: pequeña ola cuando el gato se pone feliz
    ".L{animation-name:hop;animation-duration:12s}",
    "@keyframes hop{0%{transform:translateY(0)}42%{transform:translateY(-1px)}43.5%{transform:translateY(0)}100%{transform:translateY(0)}}",
]
for name, spans in TIMELINE.items():
    default = 1 if name in ("open", "mw") else 0
    css.append(f".x-{name}{{opacity:{default};animation-name:v-{name};animation-duration:{LOOP}s}}")
    css.append(vis_keyframes(name, spans))
css.append("@media (prefers-reduced-motion:reduce){*{animation:none!important}}")

# ---------------- Ensamblar SVG ----------------
W, H = 64, 18
parts = [f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {W} {H}' width='{W*2}' height='{H*2}' shape-rendering='crispEdges'>",
         "<style>" + "".join(css) + "</style>"]
for k, pts in shadow.items():
    parts.append(f"<g class='{k}'>{rects_from_cells(pts, SHADOW)}</g>")
parts.append("<g class='cat'>")
parts.append(px(fill, FILL))
parts.append(px(outline, WHITE) + px(ear_pink_r, PINK))
parts.append(f"<g class='ear'>{px(fill & {(2,2)}, FILL)}{px(LEFT_EAR, WHITE)}{px(ear_pink_l, PINK)}</g>")
parts.append(px(WHISKERS, WHITE) + px(NOSE, PINK))
for name, pts in EYES.items():
    parts.append(f"<g class='x-{name}'>{px(pts, WHITE)}</g>")
parts.append(f"<g class='x-mw'>{px(MOUTH_W, WHITE)}</g>")
parts.append(f"<g class='x-mo'>{px(MOUTH_O, WHITE)}</g>")
parts.append(f"<g class='x-blush'>{px(BLUSH, PINK)}</g>")
parts.append("</g>")

x = TEXT_X
for i, ch in enumerate(TEXT):
    g = GLYPHS[ch]
    parts.append(f"<g class='L' style='animation-delay:{i*0.08:.2f}s'>{rects_from_cells(cells_of(g, '#'), WHITE, x, TEXT_Y)}</g>")
    x += len(g[0]) + 1
parts.append("</svg>")
svg = "".join(parts)
assert x - 1 <= W, x

open("whatsapp-cat-logo.svg", "w").write(svg)

data_uri = "data:image/svg+xml," + quote(svg, safe=" '=:/;,()!*.-_{}")

usercss = f"""/* ==== Logo pixel art: gato + WhatsApp ==== */
/* Selector del wordmark de WhatsApp Web. Si WhatsApp cambia el data-icon, verifica con el inspector
   (clic derecho sobre el logo > Inspeccionar) y ajusta solo esta línea. */
[data-icon^="wa-wordmark"] {{
  /* Tamaño en múltiplos enteros de 64x18 para que los píxeles queden nítidos: 128x36 (2x) o 192x54 (3x) */
  width: 128px !important;
  height: 36px !important;
  display: inline-block !important;
  background: url("{data_uri}") no-repeat left center / 100% 100% !important;
}}
[data-icon^="wa-wordmark"] > svg {{
  display: none !important;
}}
"""
open("whatsapp-cat-logo.user.css", "w").write(usercss)

preview = f"""<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Preview logo gato pixel</title>
<style>
body{{margin:0;background:#000;color:#fff;font:14px 'Courier New',monospace;padding:28px;display:grid;gap:28px}}
.header{{border:2px solid #fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;width:520px}}
.btns{{display:flex;gap:8px}}.btns span{{width:34px;height:34px;border:2px solid #fff;display:inline-block}}
.big{{image-rendering:pixelated}}
small{{color:#aaa}}
</style></head><body>
<div><small>Así se vería en el header (2x, 128×36)</small>
<div class="header"><img src="{data_uri}" width="128" height="36" alt="WhatsApp"><div class="btns"><span></span><span></span></div></div></div>
<div><small>Zoom 6x para ver el detalle</small><br><img class="big" src="{data_uri}" width="384" height="108" alt="WhatsApp"></div>
</body></html>"""
open("preview.html", "w").write(preview)
print(len(svg), "bytes svg;", len(data_uri), "bytes data uri")
