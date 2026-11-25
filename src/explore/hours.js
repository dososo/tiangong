// 十二时辰: light as a function of the hour, and the blending of any two lights.
import { ENV, merge } from '../film/env.js';
import { clamp, lerp, ss, v3, TAU, PI } from '../core/math.js';
const clone = (o) => Array.isArray(o) ? o.map(clone) : (o && typeof o === 'object') ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clone(v)])) : o;
// light and colour are multiplied, so they are mixed on a logarithmic scale; everything else is linear
const LOG = new Set(['skyZ', 'skyM', 'skyH', 'skyN', 'glowA', 'glowB', 'band', 'ambU', 'ambD', 'ambS', 'fog0', 'fog1', 'exp', 'lit', 'bloom']);
const SKIP = new Set(['sun', 'moon', 'dS', 'dM', 'reflect', 'lights', 'shadow', 'l2', 'dip']);
const num = (a, b, t, lg) => lg && a > 1e-9 && b > 1e-9 ? Math.exp(lerp(Math.log(a), Math.log(b), t)) : lerp(a, b, t);
const mixv = (x, y, t, lg) => {
  if (x === undefined) return clone(y); if (y === undefined) return clone(x);
  if (typeof x === 'number' && typeof y === 'number') return num(x, y, t, lg);
  if (Array.isArray(x) && Array.isArray(y)) return x.map((v, i) => typeof v === 'number' && typeof y[i] === 'number' ? num(v, y[i], t, lg) : (t < .5 ? v : y[i]));
  if (x && y && typeof x === 'object' && typeof y === 'object') { const o = {}; for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) o[k] = mixv(x[k], y[k], t, lg || LOG.has(k)); return o; }
  if (x === null && Array.isArray(y)) return [y[0] * t, ...y.slice(1)]; if (y === null && Array.isArray(x)) return [x[0] * (1 - t), ...x.slice(1)]; // light shafts fade
  return t < .5 ? clone(x) : clone(y);
};
export const sph = (p, c = [0, 0, 0]) => { const d = v3.sub(p, c), r = v3.len(d); return [Math.atan2(d[0], d[2]), Math.asin(clamp(d[1] / r, -1, 1)), r]; };
export const unsph = (a, c = [0, 0, 0]) => [c[0] + Math.sin(a[0]) * Math.cos(a[1]) * a[2], c[1] + Math.sin(a[1]) * a[2], c[2] + Math.cos(a[0]) * Math.cos(a[1]) * a[2]];
export const slerpP = (p, q, t) => { const a = sph(p), b = sph(q); let d = b[0] - a[0]; d = ((d + PI) % TAU + TAU) % TAU - PI; return unsph([a[0] + d * t, lerp(a[1], b[1], t), Math.exp(lerp(Math.log(a[2]), Math.log(b[2]), t))]); };
// give an environment its two discs: sun (dS) and moon (dM); `kind` says which of them lights the world
export const norm = (e) => { e.dS = e.sun.disc === false ? null : { pos: e.sun.pos.slice(), r: e.sun.radius, cx: e.sun.cx ?? -.02, cy: e.sun.cy ?? .02, glow: e.sun.glow ?? 20, crow: e.sun.crow ?? 1, cs: e.sun.cs ?? 1.2, open: e.sun.open ?? 1, perch: e.sun.perch || null }; e.dM = e.moon && e.moon.on !== false ? { pos: e.moon.pos.slice(), r: e.moon.r, glow: e.moon.glow ?? 1, ry: e.moon.ry ?? 2.2, cx: e.moon.cx ?? 0, cy: e.moon.cy ?? 0, ink: e.moon.ink ?? .62, soft: e.moon.soft ?? .02, scale: e.moon.scale ?? 1.02 } : null; return e; };
const kind = (e) => e.dM ? 'm' : 's';
const disc = (a, b, t) => { const o = {}; for (const k of Object.keys(a)) o[k] = k === 'pos' ? slerpP(a.pos, b.pos, t) : k === 'perch' ? (t < .5 ? a.perch : b.perch) : (typeof a[k] === 'number' && typeof b[k] === 'number') ? lerp(a[k], b[k], t) : b[k]; return o; };
const sunk = (d, k) => ({ ...d, pos: [d.pos[0], d.pos[1] - (d.pos[1] + d.r * 1.7 + 900) * k, d.pos[2]] });
const tint = (l, k) => ({ ...l, pos: l.pos.slice(), col: l.col.map(x => x * k) });
export function blend(A, B, t) {
  if (t <= .0005) return A; if (t >= .9995) return B; const e = {}; for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) if (!SKIP.has(k)) e[k] = mixv(A[k], B[k], t, LOG.has(k)); e.dip = mixv(A.dip, B.dip, t);
  if (kind(A) === kind(B)) { e.sun = { ...mixv(A.sun, B.sun, t), pos: slerpP(A.sun.pos, B.sun.pos, t), col: A.sun.col.map((x, i) => num(x, B.sun.col[i], t, true)) }; if (!A.sun.fall !== !B.sun.fall) e.sun.fall = A.sun.fall ? lerp(A.sun.fall, A.sun.fall * 12, ss(0, .6, t)) : lerp(B.sun.fall * 12, B.sun.fall, ss(.4, 1, t)); }
  else { const w = t < .5 ? 1 - 2 * t : 2 * t - 1; e.sun = tint(t < .5 ? A.sun : B.sun, w * w); const k = t < .5 ? ss(.02, .5, t) : 1 - ss(.5, .98, t), p = e.sun.pos; if (p[1] > 400) e.sun.pos = [p[0], lerp(p[1], 400, k), p[2]]; }
  const D = (a, b) => a && b ? disc(a, b, t) : a ? (t < .55 ? sunk(a, ss(.02, .5, t)) : null) : b ? (t > .45 ? sunk(b, 1 - ss(.5, .98, t)) : null) : null; e.dS = D(A.dS, B.dS); e.dM = D(A.dM, B.dM);
  e.l2 = { pos: t < .5 ? A.l2.pos : B.l2.pos, col: t < .5 ? A.l2.col.map(x => x * (1 - 2 * t)) : B.l2.col.map(x => x * (2 * t - 1)), on: (t < .5 ? A.l2.on : B.l2.on) };
  e.lights = [...A.lights.map(l => ({ ...l, c: l.c.map(x => x * (1 - t)) })), ...B.lights.map(l => ({ ...l, c: l.c.map(x => x * t) }))].slice(0, 16); e.reflect = t < .5 ? A.reflect : B.reflect; e.shadow = t < .5 ? A.shadow : B.shadow; return e;
}
const E_ = (n, d) => norm(merge(clone(ENV[n]), d || {}));
const free = { reflect: 60 }; const night = { star: [.9, .07, .08, 0], ambU: [.024, .037, .064, 0], ambD: [.010, .014, .022, 0], ambS: [.016, .022, .032, 0], lit: [1.3, 1.1, 0, 0] }; // a walker needs a little more of the moon than the film does
const K = [
  [0, E_('ink', { ...free, ...night })],
  [4, E_('star', { ...free })],
  [6.2, E_('dawn', { ...free, skyZ: [.03, .11, .26, .62], skyM: [.34, .48, .58, 0], skyH: [1.75, 1.22, .74, .34], fog1: [.20, .20, .23, 8e-6] })],
  [9, E_('jade', { ...free })],
  [14, E_('gold', { ...free, cl5: [600, .05, .48, .2], cl2: [.62, 1, 1.2, -900], glowA: [1.5, .98, .42, 7], glowB: [3, 2.0, .9, 120], skyZ: [.014, .090, .240, .62], skyM: [.14, .46, .62, 0], skyH: [1.60, 1.36, .90, .32], fog1: [.11, .24, .33, 8e-6], ambU: [.24, .49, .78, 0], ambD: [.52, .46, .40, 0], ambS: [.42, .28, .13, 0], sun: { col: [10.8, 7.3, 4.0], fog: .20, glow: 90 }, post: { exp: .475, con: 1.18, sat: 1.17 } })],
  [18, E_('halo', { ...free })],
  [20.3, E_('star', { ...free, sun: { pos: [9000, 2600, -1800] }, moon: { pos: [9000, 2600, -1800] } })],
  [24, E_('ink', { ...free, ...night })],
];
export function hourEnv(h) { h = ((h % 24) + 24) % 24; let i = 0; while (i < K.length - 2 && h >= K[i + 1][0]) i++; const a = K[i], b = K[i + 1]; const t = clamp((h - a[0]) / (b[0] - a[0])); return clone(blend(a[1], b[1], t * t * (3 - 2 * t) * .55 + t * .45)); }
export const VOID = E_('void'), MANDALA = E_('mandala');
// 子 丑 寅 ... the name of the two-hour watch
export const ZHI = [...'子丑寅卯辰巳午未申酉戌亥']; export const zhi = (h) => Math.floor((((h + 1) % 24) + 24) % 24 / 2);
