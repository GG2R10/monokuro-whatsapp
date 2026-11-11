// Generates CSS that replaces WhatsApp's circular, dashed status rings (SVG <circle stroke-dasharray>) with
// SQUARE rings split into the same number of segments (viewed first, unviewed after).
// Ring data is encoded in the circle's stroke-dasharray: dash = (C - 10N)/N, N = number of statuses.
//
// Colour is NOT baked into the images any more: the ring SHAPE is an SVG alpha mask (mask-image) and the colour comes from CSS tokens
//   --mk-ring-new (unviewed), --mk-ring-seen (viewed), --mk-ink (any ring we do not recognise).
// A mixed ring (k unviewed + N-k viewed) is ONE mask (the N segments) filled by a conic-gradient with a hard stop. The stop is the radial line
// through the centre of the gap between the last viewed and the first unviewed segment; that line stays inside the 10-unit gap across the whole
// 4-unit band, so it cuts exactly between two segments.
const C = 2 * Math.PI * 50, GAP = 10, P = 400;               // WhatsApp circle length, gap, square perimeter (100x100 rect)
const G = 'xc92gef', Y = 'x1xwosuo';                          // StyleX classes: unviewed (green) / viewed (grey) circle
const FULL = 'var(--mk-ring-mask-full)';
const NEW = 'var(--mk-ring-new)', SEEN = 'var(--mk-ring-seen)', INK = 'var(--mk-ink)';
const dash = (N) => String((C - GAP * N) / N);
const prefix = (D, k) => (`${D} ${GAP} `).repeat(k - 1) + `${D} `;   // first k dashes then the final gap token

const shape = (inner) => `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 104 104' shape-rendering='crispEdges'>${inner}</svg>")`;
const fullShape = () => shape(`<path fill-rule='evenodd' d='M0 0H104V104H0Z M4 4V100H100V4Z'/>`);   // 4-unit square frame as a filled path: exact outer corners
const segShape = (N) => {                                     // N equal segments, first one starts at the top-left corner, clockwise
  const s = (P - GAP * N) / N;
  return shape(`<rect x='2' y='2' width='100' height='100' fill='none' stroke='black' stroke-width='4' stroke-dasharray='${`${s} ${GAP} `.repeat(N - 1)}${s} ${P}'/>`);   // explicit dash list (same as the old per-colour images) so pixels match
};
// CSS angle (0 = up, clockwise) of the point at perimeter distance t, measured from the ring start (top-left corner)
const pt = (t) => t < 100 ? [2 + t, 2] : t < 200 ? [102, 2 + (t - 100)] : t < 300 ? [102 - (t - 200), 102] : [2, 102 - (t - 300)];
const ang = (t) => { const [x, y] = pt(t); return (Math.atan2(x - 52, -(y - 52)) * 180 / Math.PI + 360) % 360; };
// The conic seam (0deg == 360deg) must also fall inside a GAP, not on the corner where the first segment starts (that cut would clip the
// segment's start). The ring closes with a gap [P-GAP, P], so the gradient starts at the centre of that gap.
const seamAng = ang(P - GAP / 2);
const rel = (t) => ((ang(t) - seamAng + 360) % 360).toFixed(3);

const out = [];
const masks = [`--mk-ring-mask-full: ${fullShape()};`];            // the shapes are declared once as custom properties, rules just reference them
for (let N = 2; N <= 12; N++) masks.push(`--mk-ring-mask-${N}: ${segShape(N)};`);
out.push(`:root { ${masks.join(' ')} }`);
const hide = (sel) => out.push(`${sel} circle { display: none !important; }`);
const paint = (sel, colour, mask) => out.push(`${sel} { background: ${colour} !important; -webkit-mask: ${mask} 0 0 / 100% 100% no-repeat !important; mask: ${mask} 0 0 / 100% 100% no-repeat !important; }`);

// generic fallback: any ring we do not recognise becomes a plain full square in --mk-ink, so no circle is ever left over
const anyRing = '#app svg[viewBox="0 0 104 104"]:has(circle[stroke-width="4"][r="50"])';
hide(anyRing); paint(anyRing, INK, FULL);
// more than 12 statuses (or anything mixed we do not draw): colour the full square by class instead of leaving it neutral
{ const sel = `#app svg[viewBox="0 0 104 104"]:has(circle.${G}[stroke-width="4"][r="50"])`; hide(sel); paint(sel, NEW, FULL); }
{ const sel = `#app svg[viewBox="0 0 104 104"]:has(circle.${Y}[stroke-width="4"][r="50"]):not(:has(circle.${G}))`; hide(sel); paint(sel, SEEN, FULL); }
// single-colour full rings (one status)
for (const [cls, col] of [[G, NEW], [Y, SEEN]]) {
  const sel = `#app svg[viewBox="0 0 104 104"]:has(circle.${cls}[stroke-width="4"]:not([stroke-dasharray]))`; hide(sel); paint(sel, col, FULL);
}
for (let N = 2; N <= 12; N++) {
  const D = dash(N), step = (P - GAP * N) / N + GAP, mask = `var(--mk-ring-mask-${N})`;
  // pure rings: every segment one colour
  for (const [cls, col, other] of [[G, NEW, Y], [Y, SEEN, G]]) {
    const sel = `#app svg[viewBox="0 0 104 104"]:has(circle.${cls}[stroke-dasharray^="${D} ${GAP}"]):not(:has(circle.${other}))`;
    hide(sel); paint(sel, col, mask);
  }
  // mixed rings: k unviewed (green circle with k dashes) + (N-k) viewed (grey circle); viewed segments come first, clockwise from the top-left
  for (let k = 1; k < N; k++) {
    const P1 = prefix(D, k), v = N - k;
    const sel = `#app svg[viewBox="0 0 104 104"]:has(circle.${G}[stroke-dasharray^="${P1}"]:not([stroke-dasharray^="${P1.slice(0, -1)} ${GAP} "])):has(circle.${Y})`;
    const cut = rel(v * step - GAP / 2);                      // centre of the gap between segment v-1 (viewed) and segment v (unviewed)
    hide(sel); paint(sel, `conic-gradient(from ${seamAng.toFixed(3)}deg at 50% 50%, ${SEEN} 0deg ${cut}deg, ${NEW} ${cut}deg 360deg)`, mask);
  }
}
module.exports = out.join('\n');
