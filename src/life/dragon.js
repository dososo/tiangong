// The dragon. Canonical pose: head at the origin looking along +z, body trailing along -z, y up.
// The straight body is bent along a path either here (static coils, reliefs) or in the vertex shader (flight).
import { GB, MAT } from '../arch/gb.js';
import { m4, v3, clamp, lerp, ss, TAU, PI, mulberry32 } from '../core/math.js';
import { smin, smax, ell, sph, cone, surfaceNets } from './sdf.js';

const EYE = [.545, .60, .86], EYR = .225;
// ---- head field ------------------------------------------------------------
export function headSDF(x, y, z) {
  const X = Math.sqrt(x * x + .0009); const ax = X;
  // neck and skull
  let d = cone(x, y, z, 0, .02, -1.25, 0, .22, -.10, .74, .72);
  d = smin(d, ell(x, y, z, 0, .46, .16, .70, .58, .74), .25);
  d = smin(d, ell(x, y, z, 0, .86, .40, .34, .26, .42), .22);            // forehead boss
  d = smin(d, ell(ax, y, z, .56, .06, .10, .26, .46, .44), .22);          // cheek muscle
  d = smin(d, ell(ax, y, z, .60, .34, .58, .20, .18, .30), .16);          // cheek bone under the eye
  // upper jaw
  d = smin(d, cone(x * .92, y, z, 0, .42, .70, 0, .34, 1.85, .46, .34), .18);
  d = smin(d, cone(ax, y, z, .30, .16, .75, .27, .19, 2.02, .27, .27), .14);
  d = smin(d, cone(x, y, z, 0, .80, .72, 0, .64, 1.95, .13, .15), .14);   // nasal ridge
  d = smin(d, ell(x, y, z, 0, .50, 2.20, .40, .25, .30), .14);            // nose
  d = smin(d, ell(ax, y, z, .31, .50, 2.24, .19, .18, .24), .10);         // alar wings
  d = smin(d, ell(ax, y, z, .16, .70, 2.26, .12, .10, .16), .10);         // ruyi lobes on the nose
  d = smin(d, ell(x, y, z, 0, .76, 2.14, .10, .12, .16), .10);
  d = smin(d, ell(x, y, z, 0, .17, 2.34, .34, .16, .24), .12);            // lip
  d = smin(d, ell(ax, y, z, .31, .06, 2.06, .13, .15, .22), .10);         // flew over the fang
  d = smin(d, ell(ax, y, z, .38, .00, 1.42, .11, .14, .30), .12);
  d = smin(d, ell(ax, y, z, .50, -.02, .82, .12, .14, .26), .12);
  // lip rolls: a ridge that runs along the upper lip and curls up at the corner
  d = smin(d, cone(ax, y, z, .34, .00, 2.20, .42, -.06, 1.40, .07, .075), .06);
  d = smin(d, cone(ax, y, z, .42, -.06, 1.40, .58, -.06, .62, .075, .08), .06);
  d = smin(d, cone(ax, y, z, .58, -.06, .62, .66, .10, .34, .08, .06), .06);
  // nostrils
  d = smax(d, -ell(ax, y, z, .33, .47, 2.46, .085, .075, .15), .05);
  // palate
  d = smax(d, -ell(x, y, z, 0, -.20, 1.40, .30, .26, .98), .08);
  // wrinkles on the bridge and muzzle
  const wr = ss(.95, 1.15, z) * (1 - ss(1.95, 2.1, z)) * ss(.42, .60, y); d += .020 * Math.sin(z * 30 + ax * 5) * wr;
  const wf = ss(.30, .42, ax) * ss(1.5, 1.7, z) * (1 - ss(2.2, 2.35, z)) * ss(.12, .24, y) * (1 - ss(.42, .55, y)); d += .012 * Math.sin((z * 1.2 + y) * 34) * wf;
  // brow: a rolling flame above the eye
  d = smin(d, cone(ax, y, z, .26, .86, 1.16, .50, .88, .96, .085, .13), .08);
  d = smin(d, cone(ax, y, z, .50, .88, .96, .74, .90, .62, .13, .13), .08);
  d = smin(d, cone(ax, y, z, .74, .90, .62, .90, 1.06, .26, .13, .08), .07);
  d = smin(d, cone(ax, y, z, .90, 1.06, .26, 1.00, 1.30, -.06, .08, .015), .05);
  d = smin(d, sph(ax, y, z, .22, .88, 1.20, .12), .06);                   // curl at the inner end
  // lids round the eyeball
  const ex = ax - EYE[0], ey = y - EYE[1], ez = z - EYE[2]; const er = Math.sqrt(ex * ex + ey * ey + ez * ez);
  d = smax(d, -(er - EYR - .005), .03);
  const f = ex * .80 + ez * .58; const up = ey - .10 * (-ex * .58 + ez * .80); // facing, vertical
  let lid = Math.max(Math.abs(er - (EYR + .035)) - .032, -(f + .16)); const open = Math.max(Math.abs(up - .01) - (.135 - .9 * Math.pow(Math.abs(-ex * .58 + ez * .80), 2)), -f); lid = smax(lid, -open, .02); d = smin(d, lid, .03);
  // lower jaw, open
  let j = cone(ax, y, z, .50, -.22, .10, .30, -.62, 1.15, .27, .20); j = smin(j, cone(ax, y, z, .30, -.62, 1.15, .16, -.80, 1.92, .20, .15), .12);
  j = smin(j, ell(x, y, z, 0, -.84, 1.98, .25, .13, .20), .10); j = smin(j, cone(x, y, z, 0, -.48, .35, 0, -.80, 1.80, .30, .10), .16);
  j = smin(j, cone(ax, y, z, .56, -.10, .30, .40, -.42, 1.05, .07, .06), .07); j = smin(j, cone(ax, y, z, .40, -.42, 1.05, .22, -.63, 1.96, .06, .05), .06);
  j = smax(j, -ell(x, y, z, 0, -.36, 1.30, .22, .22, .78), .08);
  d = smin(d, j, .10);
  // jaw corner and throat
  d = smin(d, ell(x, y, z, 0, -.36, -.10, .50, .34, .50), .25);
  // ear roots and horn roots
  d = smin(d, cone(ax, y, z, .60, .70, -.02, .78, .78, -.16, .18, .13), .12);
  d = smin(d, cone(ax, y, z, .27, .94, .02, .36, 1.16, -.14, .21, .20), .10);
  return d;
}
// ear: a scooped leaf
const earSDF = (x, y, z) => { // local: along +z, opening +x
  let d = ell(x, y, z, 0, 0, .38, .13, .20, .46); d = smax(d, -ell(x, y, z, .14, 0, .42, .13, .13, .34), .04); return d; };
// fore limb in its own frame: shoulder at origin on the body side, elbow back, hand forward and down. x outwards
export function limbSDF(x, y, z) {
  let d = ell(x, y, z, .05, .0, 0, .42, .62, .62); d = smin(d, cone(x, y, z, .18, -.10, .05, .62, -.70, -.55, .42, .27), .2);
  d = smin(d, cone(x, y, z, .62, -.70, -.55, .74, -1.28, .22, .27, .19), .12); d = smin(d, ell(x, y, z, .60, -.62, -.62, .20, .22, .24), .1);
  d = smin(d, cone(x, y, z, .66, -.84, -.30, .70, -1.10, 0, .25, .22), .12);
  d = smin(d, ell(x, y, z, .76, -1.42, .36, .30, .17, .32), .12);
  for (const [a, l, w] of [[-.62, .66, .13], [-.20, .76, .14], [.22, .76, .14], [.64, .66, .13]]) { const sx = .76 + Math.sin(a) * .20, sz = .40 + Math.cos(a) * .16; const kx = .76 + Math.sin(a) * l * .62, kz = .40 + Math.cos(a) * l * .62, tx = .76 + Math.sin(a) * l, tz = .40 + Math.cos(a) * l; d = smin(d, cone(x, y, z, sx, -1.43, sz, kx, -1.30, kz, w, w * .95), .06); d = smin(d, cone(x, y, z, kx, -1.30, kz, tx, -1.54, tz, w * .95, w * .7), .05); d = smin(d, sph(x, y, z, kx, -1.30, kz, w * 1.12), .05); }
  d = smin(d, cone(x, y, z, .62, -1.42, .22, .50, -1.36, -.10, .14, .12), .06); d = smin(d, cone(x, y, z, .50, -1.36, -.10, .46, -1.54, -.30, .12, .09), .05);
  return d;
}
const CLAWS = [[-.62, .66], [-.20, .76], [.22, .76], [.64, .66]].map(([a, l]) => ({ p: [.76 + Math.sin(a) * l, -1.54, .40 + Math.cos(a) * l], d: [Math.sin(a), 0, Math.cos(a)] })).concat([{ p: [.46, -1.54, -.30], d: [-.25, 0, -.97] }]);

const putNet = (gb, net, mat, p1, M, uvf) => { const b = gb.nv; gb.p1 = p1; gb.with(M || m4.ident(), () => { for (let i = 0; i < net.P.length / 3; i++) { const x = net.P[i * 3], y = net.P[i * 3 + 1], z = net.P[i * 3 + 2]; const u = uvf ? uvf(x, y, z) : [Math.atan2(x - .3, z) * .5, y]; gb.v(x, y, z, net.N[i * 3], net.N[i * 3 + 1], net.N[i * 3 + 2], u[0], u[1], mat, net.AO[i], u[2] ?? p1); } }); const fl = M && m4det(M) < 0; for (let i = 0; i < net.I.length; i += 3) fl ? gb.I.push(b + net.I[i], b + net.I[i + 2], b + net.I[i + 1]) : gb.I.push(b + net.I[i], b + net.I[i + 1], b + net.I[i + 2]); gb.p1 = 0; };
const m4det = M => M[0] * (M[5] * M[10] - M[6] * M[9]) - M[4] * (M[1] * M[10] - M[2] * M[9]) + M[8] * (M[1] * M[6] - M[2] * M[5]);
// a flame lock: flattened, tapered, curving along pts
const bez = (p0, p1, p2, p3, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [0, 1, 2].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]); });
// Catmull-Rom through keys; and a strand that ripples more towards its tip
const crv = (K, n) => { const o = []; for (let i = 0; i < K.length - 1; i++) { const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)]; for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t; o.push([0, 1, 2].map(k => .5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3))); } } o.push(K[K.length - 1]); return o; };
const wavy = (pts, amp, fr, ph, ax = [1, 0, 0], bx = [0, 0, 1]) => pts.map((p, i) => { const t = i / (pts.length - 1); const w = amp * t * Math.sin(t * fr + ph), w2 = amp * .6 * t * Math.cos(t * fr * .8 + ph * 1.7); return [0, 1, 2].map(k => p[k] + ax[k] * w + bx[k] * w2); });
const lock = (gb, pts, r, o = {}) => { gb.p1 = o.p1 ?? 2; gb.tube(pts, t => { const k = Math.pow(Math.max(0, 1 - t), .75) * (.55 + .45 * Math.min(1, t * 5 + .2)) * (1 + .25 * Math.sin(t * 3.1)); return [r * k * (o.fl ?? 1) + .002, r * k * (o.fw ?? .55) + .002]; }, o.seg ?? 7, MAT.DRAGON, { up: o.up || [0, 1, 0], ao: o.ao ?? .95, uS: 1 }); gb.p1 = 0; };
const spike = (gb, p, d, up, len, r, o = {}) => { // curved horn-like cone
  const n = o.n ?? 8; const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(v3.add(p, v3.add(v3.mul(d, len * t), v3.mul(up, len * (o.curl ?? .25) * t * t)))); } gb.p1 = o.p1 ?? 3; gb.tube(pts, t => r * Math.pow(1 - t, .8) + .003, o.seg ?? 8, MAT.DRAGON, { ao: 1, up: [1, 0, .2] }); gb.p1 = 0; };

let _cache = {};
export function headNets(q = 1) { return _cache['h' + q] ??= { head: surfaceNets(headSDF, [-1.15, -1.12, -1.35], [1.15, 1.45, 2.65], q === 0 ? .026 : q === 1 ? .040 : .085), ear: surfaceNets(earSDF, [-.25, -.3, -.2], [.25, .3, 1], q === 0 ? .03 : .05), limb: surfaceNets(limbSDF, [-.55, -1.85, -1.1], [1.6, .8, 1.5], q === 0 ? .035 : q === 1 ? .055 : .1) }; }
// the head with all its furniture. scale 1: neck radius .74
export function buildHead(gb, q = 1, o = {}) {
  const N = headNets(q); const rnd = mulberry32(9);
  // skin; lips and mouth lining by region
  putNet(gb, N.head, MAT.DRAGON, 5, null, (x, y, z) => { const ax = Math.abs(x); const inMouth = z > .3 && z < 2.3 && ax < .30 && y < .10 && y > -.62 + 0 * z && (y < .02 && y > -.30 - .24 * (z - .4)); return [Math.atan2(x, y - .15) * .62, z, inMouth ? 6 : 5]; });
  for (const s of [1, -1]) {
    // eyes
    gb.with(m4.mul(m4.trs([s * EYE[0], EYE[1], EYE[2]], s * .95, 1), m4.trs([0, 0, 0], 0, 1, PI / 2)), () => { gb.p1 = 4; gb.lathe(Array.from({ length: 13 }, (_, k) => [Math.max(0, Math.cos(-PI / 2 + PI * k / 12)) * EYR, Math.sin(-PI / 2 + PI * k / 12) * EYR]), 20, MAT.DRAGON, { smooth: true }); gb.p1 = 0; });
    // ears
    const E = m4.basis(v3.norm([s * .55, -.25, .75]), v3.norm([s * -.2, .95, .18]), v3.norm([s * .70, .30, -.62]), [s * .74, .74, -.12]); putNet(gb, N.ear, MAT.DRAGON, 5, orth(E, s));
    // antlers
    const beam = bez([s * .34, 1.10, -.10], [s * .50, 1.75, -.45], [s * .80, 1.70, -1.35], [s * .86, 2.35, -2.15], 22); gb.p1 = 3; const R = t => lerp(.185, .03, Math.pow(t, .9)) * (1 + .07 * Math.sin(t * 60) * (1 - t)) * (t > .96 ? Math.sqrt(Math.max(0, (1 - t) / .04)) : 1) + .004; gb.tube(beam, R, q ? 8 : 12, MAT.DRAGON, { ao: 1 });
    const br = (i, a, b, c, r) => { const p = beam[i]; gb.p1 = 3; gb.tube(bez(p, v3.add(p, a), v3.add(p, b), v3.add(p, c), 10), t => lerp(r, .02, t) * (t > .9 ? Math.sqrt(Math.max(0, (1 - t) / .1)) : 1) + .003, q ? 7 : 10, MAT.DRAGON, {}); };
    br(6, [s * .02, .30, .10], [s * .10, .55, .22], [s * .06, .88, .18], .12); br(12, [s * .10, .22, .02], [s * .26, .48, .0], [s * .24, .82, -.06], .10); br(17, [s * .02, .05, -.25], [s * .10, .08, -.45], [s * .14, .0, -.72], .07); gb.p1 = 0;
    // teeth
    const T = (p, d, l, r, c = .25) => spike(gb, [s * p[0], p[1], p[2]], v3.norm([s * d[0], d[1], d[2]]), [0, 0, c > 0 ? -1 : 1], l, r, { curl: Math.abs(c) });
    T([.27, .02, 2.18], [.10, -1, .12], .50, .085, .30); T([.09, .03, 2.38], [0, -1, .2], .20, .05, .1); T([.19, .02, 2.32], [.05, -1, .15], .22, .05, .1); for (let k = 0; k < 6; k++) T([.31 + .016 * k, -.02 - .012 * k, 1.92 - k * .19], [.05, -1, .04], .22 - .012 * k + (k === 2 ? .10 : 0), .055, .15);
    T([.215, -.70, 1.98], [.10, 1, .10], .46, .075, .28); T([.08, -.74, 2.10], [0, 1, .2], .18, .045, .1); for (let k = 0; k < 6; k++) T([.25 + .032 * k, -.62 + .055 * k, 1.80 - k * .18], [.04, 1, .05], .19, .048, .12);
    // whiskers: long barbels from beside the nose
    if (!o.noWhisk) { const w = crv([[.36, .40, 2.34], [.70, .72, 2.66], [1.16, .80, 2.58], [1.58, .42, 2.20], [1.90, .06, 1.62], [2.06, .10, .90], [1.92, .50, .16], [1.78, .92, -.60], [2.02, 1.02, -1.35], [2.50, .84, -2.0], [2.92, 1.12, -2.7]].map(p => [s * p[0], p[1], p[2]]), 6); gb.p1 = 2; gb.tube(w, t => lerp(.046, .0045, Math.pow(t, .75)) * Math.min(1, .5 + t * 12), 7, MAT.DRAGON, {}); }
    // cheek frill: spines that fan from the jaw corner
    for (let k = 0; k < 7; k++) { const a = -1.15 + k * .34; const st = [s * .66, -.02 + .30 * Math.sin(a) * .6, -.12 - .10 * Math.cos(a)]; const dd = v3.norm([s * 1.0, Math.sin(a) * .95, -.45 * Math.cos(a) - .15]); const L = 1.15 - .07 * Math.abs(k - 3); lock(gb, bez(st, v3.add(st, v3.mul(dd, L * .4)), v3.add(st, v3.add(v3.mul(dd, L * .75), [0, 0, -.12])), v3.add(st, v3.add(v3.mul(dd, L), [0, .10, -.40])), 10), .12, { fl: 1, fw: .34, up: [0, 0, 1] }); }
    // beard under the jaw
    { const nb = q < 2 ? 36 : 12; for (let k = 0; k < nb; k++) { const t = (k + .6 * rnd()) / nb; const st = [s * (lerp(.10, .50, t) - .06 * rnd()), lerp(-.92, -.46, t), lerp(1.98, .28, t)]; const L = lerp(1.25, .85, t) * (.60 + .65 * rnd()); lock(gb, wavy(bez(st, v3.add(st, [s * .05, -.35 * L, .05 - .1 * rnd()]), v3.add(st, [s * (.08 + .22 * rnd()), -.75 * L, -.30]), v3.add(st, [s * (.0 + .30 * rnd()), -.98 * L, -.75 + .35 * rnd()]), q < 2 ? 16 : 8), .07 * L, 6 + 4 * rnd(), rnd() * 6), q < 2 ? .030 + .022 * rnd() : .066, { fl: 1, fw: .7, seg: 5 }); } }
    // small moustache tufts behind the fang
    for (let k = 0; k < 3; k++) { const st = [s * .40, .06 + .03 * k, 1.95 - k * .16]; lock(gb, bez(st, v3.add(st, [s * .25, -.05, 0]), v3.add(st, [s * .45, -.02, -.25]), v3.add(st, [s * .55, .16, -.55]), 8), .06, { fl: 1, fw: .6 }); }
    // mane: rings of S-curved locks swept back, every one a different length
    for (let ring = 0; ring < 4; ring++) { const n = [13, 15, 15, 13][ring] + (q < 2 ? 5 : 0); for (let k = 0; k < n; k++) { const a = lerp(.03, 2.55, (k + .5 * (ring % 2) + .2 * rnd()) / n); const z0 = -.06 - ring * .30; const rr = .68; const st = [s * Math.sin(a) * rr, .20 + Math.cos(a) * rr * .98, z0]; const out = [s * Math.sin(a), Math.cos(a), 0]; const tg = [s * Math.cos(a), -Math.sin(a), 0]; const L = (1.35 + .85 * rnd()) * (.82 + .16 * ring); const w1 = (rnd() - .5) * .55, w2 = (rnd() - .5) * .9, lift = .38 + .26 * rnd(); const p1 = v3.add(st, v3.add(v3.add(v3.mul(out, lift), v3.mul(tg, w1 * .3)), [0, .04, -.26 * L])), p2 = v3.add(st, v3.add(v3.add(v3.mul(out, .34 + .2 * rnd()), v3.mul(tg, w1)), [0, .02, -.88 * L])), p3 = v3.add(st, v3.add(v3.add(v3.mul(out, .30 + w2 * .35), v3.mul(tg, w2 * .55)), [0, .26, -1.32 * L])); lock(gb, bez(st, p1, p2, p3, 15), (q < 2 ? .078 : .098) * (.7 + .6 * rnd()), { fl: 1, fw: .6, up: out, seg: 6 }); } }
  }
  // chin beard, centre
  for (let y = 0; y < (q < 2 ? 3 : 1); y++) { const nn = q < 2 ? 15 : 9, m = (nn - 1) / 2; for (let k = 0; k < nn; k++) { const a = (k - m) / m * 4 + (rnd() - .5) * .5; const st = [a * .045, -.91 + .02 * y, 2.04 - Math.abs(a) * .03 - y * .07]; const L = (1.62 - .13 * Math.abs(a)) * (.78 + .34 * rnd()); lock(gb, wavy(bez(st, v3.add(st, [a * .03, -.4 * L, .26 - .08 * y]), v3.add(st, [a * .08, -.85 * L, .02]), v3.add(st, [a * .07 + (rnd() - .5) * .2, -1.12 * L, -.55 + .3 * rnd()]), q < 2 ? 18 : 10), .06, 6 + 4 * rnd(), rnd() * 6), q < 2 ? .026 + .020 * rnd() : .064, { fl: 1, fw: .75, seg: 5 }); } }
  // tongue
  { const t = bez([0, -.34, .45], [0, -.30, 1.0], [0, -.62, 1.55], [0, -.40, 2.10], 18).concat([[0, -.28, 2.22], [0, -.18, 2.26]]); gb.p1 = 7; gb.tube(t, u => [lerp(.17, .10, u) * (u > .93 ? Math.sqrt((1 - u) / .07 + .05) : 1), .055], 12, MAT.DRAGON, { up: [0, 1, 0], ao: .6 }); gb.p1 = 0; }
}
const orth = (E, s) => E;
// radius of the body at distance s behind the skull (unit: neck radius .74)
export const bodyR = (s, L) => { const t = s / L; const a = lerp(.72, 1.02, ss(0, .16, t)); return a * (1 - .0 * t) * Math.pow(Math.max(0, 1 - Math.pow(t, 2.6)), .62) * (1 - .12 * ss(.16, .75, t)) + .03; };
// straight body from s=0.8 (inside the neck) back to L. returns geometry builder in canonical space
export function buildBody(gb, L, o = {}) {
  const ns = o.ns ?? Math.round(L * 5), nu = o.nu ?? 26; const base = gb.nv; const SC = o.scales ?? 22; let v = 0; let prev = 0;
  for (let i = 0; i <= ns; i++) { const s = lerp(.85, L, i / ns); const r = bodyR(s, L); v += (s - prev) / (r * TAU / SC) * .92; prev = s; for (let k = 0; k <= nu; k++) { const a = (k / nu - .5) * TAU; let ca = Math.sin(a), sa = -Math.cos(a) * -1; // a=0 top
      const ny = Math.cos(a), nx = Math.sin(a); const belly = ny < -.72; const fl = belly ? lerp(1, .86, ss(-.72, -1, ny)) : 1; const rx = r * (1 + .03), ry = r * fl; const nn = v3.norm([nx / rx, ny / ry, 0]); gb.p1 = 0; gb.v(nx * rx, ny * ry + .05 * Math.min(1, s), -s, nn[0], nn[1], 0, k / nu * SC, v, MAT.DRAGON, belly ? .85 : 1, ny < -.66 ? 1 : 0); } }
  const at = (i, k) => base + i * (nu + 1) + k; for (let i = 0; i < ns; i++) for (let k = 0; k < nu; k++) gb.I.push(at(i, k), at(i, k + 1), at(i + 1, k), at(i, k + 1), at(i + 1, k + 1), at(i + 1, k));
  // belly plates get their own uv scale through p1=1 (v*.5 in the shader)
  // dorsal flame fins
  const nf = o.fins ?? Math.round(L * 1.15); gb.p1 = 2; for (let i = 0; i < nf; i++) { const s = lerp(1.0, L * .97, i / nf); const r = bodyR(s, L); const l = r * lerp(1.0, .9, i / nf), h = r * (.62 + .10 * Math.sin(i * 1.7)); fin(gb, s, r * .98, l, h, r * .16); }
  // tail: a flame of locks
  const rnd = mulberry32(5); for (let k = 0; k < 17; k++) { const a = (k - 8) / 8; const st = [(rnd() - .5) * .10, .05, -L * .955 + Math.abs(a) * .25]; const ll = 1.5 + .7 * rnd() + .9 * (1 - Math.abs(a)); lock(gb, bez(st, v3.add(st, [a * .15 + (rnd() - .5) * .3, a * .62, -.45]), v3.add(st, [a * .2, a * 1.05 + .15, -ll * .62]), v3.add(st, [(rnd() - .5) * .5, a * .55 + .45, -ll]), 14), .16 * (.8 + .5 * rnd()), { fl: .6, fw: 1 }); }
  gb.p1 = 0;
}
function fin(gb, s, r, l, h, w) { // thin flame-shaped blade on the back
  const prof = [[.55, -.05], [.30, .42], [.02, .80], [-.40, 1.0], [-.22, .62], [-.42, .30], [-.55, -.05]]; const c = [0, r + h * .25, -s]; const pts = prof.map(([a, b]) => [0, r + b * h, -(s - a * l)]); for (const sd of [1, -1]) { const n = [sd * .95, .2, 0]; const ci = gb.v(sd * w * .5, r + h * .32, -s, n[0], n[1], n[2], .5, .3, MAT.DRAGON, .9); const idx = pts.map(p => gb.v(sd * .012, p[1], p[2], n[0], n[1], n[2], p[2], p[1], MAT.DRAGON, p[1] < r + .05 ? .6 : 1)); for (let i = 0; i < idx.length - 1; i++) sd > 0 ? gb.I.push(ci, idx[i + 1], idx[i]) : gb.I.push(ci, idx[i], idx[i + 1]); }
}
export function buildLimb(gb, q, s, o = {}) { // s: +1 left, -1 right; o.back flips the hand for hind legs
  const N = headNets(q).limb; const S = m4.ident(); S[0] = s; const put = (fn) => gb.with(S, fn); putNet(gb, N, MAT.DRAGON, 5, S);
  put(() => { CLAWS.forEach(c => spike(gb, c.p, v3.norm([c.d[0] * .9, -.35, c.d[2] * .9]), [0, -1, 0], .46, .10, { curl: .42 }));
    for (let k = 0; k < 7; k++) { const a = -.6 + k * .2; const st = [.60 + .04 * k, -.62 + .10 * a, -.72]; lock(gb, bez(st, v3.add(st, [a * .2, .12 + a * .3, -.4]), v3.add(st, [a * .3, .30 + a * .5, -.9]), v3.add(st, [a * .2, .75 + a * .5, -1.25 + .2 * Math.abs(a)]), 10), .13, { fl: 1, fw: .5 }); } });
}
// whole straight dragon. head anchored at s=0. Returns {gb, parts} where every vertex keeps its anchor for rigid parts in anc[]
export function straightDragon(L = 46, q = 1, o = {}) {
  const gb = new GB(); const anc = []; const mark = (s) => { while (anc.length < gb.nv) anc.push(s); };
  buildBody(gb, L, o); mark(-1); buildHead(gb, q, o); mark(.35);
  const legs = o.legs ?? [[.14, 1, 0], [.165, -1, .25], [.60, 1, .3], [.63, -1, 0]]; for (const [t, s, sw] of legs) { const sp = t * L, r = bodyR(sp, L); gb.with(m4.mul(m4.trs([s * r * .62, -r * .22, -sp], 0, 1), m4.mul(m4.trs([0, 0, 0], s * (.15 + sw * .6), 1.02, sw * .9), m4.ident())), () => buildLimb(gb, q, s)); mark(sp); }
  gb.anc = anc; return gb;
}
// bend along path(s) -> {p, t (pointing to the head), u (up)}; scale k. rigid parts keep the frame at their anchor
export function bend(src, path, k = 1, o = {}) {
  const out = new GB(); out.P = new Array(src.P.length); out.N = new Array(src.N.length); out.U = src.U.slice(); out.D = src.D.slice(); out.I = src.I.slice(); out.nv = src.nv; const memo = new Map(); const F = s => { const key = Math.round(s * 400); let f = memo.get(key); if (!f) { f = path(s); memo.set(key, f); } return f; };
  for (let i = 0; i < src.nv; i++) { const x = src.P[i * 3], y = src.P[i * 3 + 1], z = src.P[i * 3 + 2]; const a = src.anc[i]; const s = a < 0 ? -z : a; const dz = a < 0 ? 0 : z + a; const f = F(s); const r = v3.cross(f.u, f.t); const P = [0, 1, 2].map(c => f.p[c] + k * (r[c] * x + f.u[c] * y + f.t[c] * dz)); const nx = src.N[i * 4], ny = src.N[i * 4 + 1], nz = src.N[i * 4 + 2]; const N = [0, 1, 2].map(c => r[c] * nx + f.u[c] * ny + f.t[c] * nz); if (o.squash) { P[2] = o.squash.z + (P[2] - o.squash.z) * o.squash.k; N[2] /= o.squash.k; const l = Math.hypot(...N) || 1; N[0] *= 127 / l; N[1] *= 127 / l; N[2] *= 127 / l; } out.P[i * 3] = P[0]; out.P[i * 3 + 1] = P[1]; out.P[i * 3 + 2] = P[2]; out.N[i * 4] = N[0]; out.N[i * 4 + 1] = N[1]; out.N[i * 4 + 2] = N[2]; out.N[i * 4 + 3] = 0; }
  return out;
}
