// Chinese timber/stone grammar: roofs, brackets, columns, terraces, balustrades, stairs.
import { GB, MAT } from './gb.js';
import { m4, v3, clamp, lerp, TAU, PI, ss, mulberry32 } from '../core/math.js';
export const PAL = { TEAL: 0, GOLD: 1, AZUR: 2, INK: 3, JADE: 4, CINN: 5 };
const rise = (v, a = .5, p = 2.3) => a * v + (1 - a) * Math.pow(v, p);
const ucurve = (s) => Math.sign(s) * (1 - Math.pow(1 - Math.abs(s), 1.55));

// Four-sided roof ring. o: W,D outer extents; w,d inner extents at top; y0 eave height; H rise; lift, flare, zone; pal; lod
// returns helpers for ridges
export function slopes(gb, o) {
  const { W, D, w, d, y0, H, pal = PAL.TEAL, lod = 0 } = o; const a = o.a ?? .5, pw = o.p ?? 2.3;
  const lift = o.lift ?? 0, flare = o.flare ?? lift * .55, zone = o.zone ?? Math.min(W, D) * .34;
  const nu = o.nu ?? [44, 20, 10][lod], nv = o.nv ?? [12, 6, 3][lod]; const eH = o.edge ?? .55;
  const hx = v => lerp(W / 2, w / 2, v), hz = v => lerp(D / 2, d / 2, v);
  const cor = (dist) => { const t = clamp(1 - dist / zone); return t * t * (0.35 + .65 * t); };
  const pt = (side, s, v) => {
    const front = side === 0 || side === 2; const half = front ? hx(v) : hz(v), other = front ? hz(v) : hx(v);
    const c = cor((1 - Math.abs(s)) * (front ? W / 2 : D / 2)); const k = (1 - v) * (1 - v);
    const al = s * half + Math.sign(s) * flare * c * k, out = other + flare * c * k;
    const y = y0 + H * rise(v, a, pw) + lift * c * k * (1 - v);
    return [al, y, out];
  };
  const world = (side, p) => side === 0 ? [p[0], p[1], p[2]] : side === 1 ? [p[2], p[1], -p[0]] : side === 2 ? [-p[0], p[1], -p[2]] : [-p[2], p[1], p[0]];
  // arc length table per side type
  const arc = (run) => { const t = [0]; let s = 0, py = 0; for (let j = 1; j <= nv; j++) { const v = j / nv, y = H * rise(v, a, pw); s += Math.hypot(run / nv, y - py); py = y; t.push(s); } return t; };
  const arcF = arc((D - d) / 2), arcS = arc((W - w) / 2);
  for (let side = 0; side < 4; side++) {
    const tab = side % 2 === 0 ? arcF : arcS; gb.p1 = pal; const p2o = gb.p2; gb.p2 = Math.round((o.ts || 0) * 16);
    if ((side % 2 === 0 ? W : D) < .1) { gb.p2 = p2o; continue; }
    gb.grid(nu, nv, (uu, v) => { const s = ucurve(uu * 2 - 1); const p = pt(side, s, v); const q = world(side, p); return [q[0], q[1], q[2], p[0], tab[Math.round(v * nv)], 1]; }, MAT.TILE);
    gb.p1 = o.edgePal ?? PAL.GOLD;
    // eave edge fascia
    const base = []; for (let i = 0; i <= nu; i++) { const s = ucurve(i / nu * 2 - 1); base.push(pt(side, s, 0)); }
    for (let i = 0; i < nu; i++) { const A = base[i], B = base[i + 1]; const a0 = world(side, [A[0], A[1] - eH, A[2] - eH * .25]), b0 = world(side, [B[0], B[1] - eH, B[2] - eH * .25]), b1 = world(side, [B[0], B[1] + .02, B[2]]), a1 = world(side, [A[0], A[1] + .02, A[2]]); gb.quad(a0, b0, b1, a1, [[A[0], 0], [B[0], 0], [B[0], 1], [A[0], 1]], MAT.TILEEDGE, 1); }
    gb.p2 = p2o;
    // underside rafters
    if (o.inW !== undefined) {
      const nk = [6, 3, 1][lod]; gb.p1 = 0; const n2 = lod === 0 ? nu : Math.max(6, nu >> 1);
      gb.grid(n2, nk, (uu, k) => {
        const s = ucurve(uu * 2 - 1), e = pt(side, s, 0); const half = side % 2 === 0 ? o.inW / 2 : o.inD / 2, oth = side % 2 === 0 ? o.inD / 2 : o.inW / 2;
        const x = lerp(e[0], s * half, k), z = lerp(e[2] - eH * .3, oth, k), y = lerp(e[1] - eH, o.inY, Math.pow(k, .85)); const q = world(side, [x, y, z]);
        return [q[0], q[1], q[2], x, k * Math.hypot(e[2] - oth, e[1] - o.inY), lerp(.95, .42, k)];
      }, MAT.RAFTER, { flip: true });
    }
  }
  return { pt, world, hx, hz };
}
// ridge along polyline with raised section
function ridgeLine(gb, pts, hw, h, mat, lod) {
  const n = pts.length; const up = [0, 1, 0];
  const secs = pts.map((p, i) => { const t = v3.norm(v3.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)])); let s = v3.cross(t, up); s = v3.len(s) < 1e-5 ? [1, 0, 0] : v3.norm(s); const u = v3.cross(s, t); return { p, s, u }; });
  const prof = lod < 2 ? [[-1, -.35], [-1, .42], [-.62, .5], [-.62, .78], [-.8, .86], [-.45, 1.05], [.45, 1.05], [.8, .86], [.62, .78], [.62, .5], [1, .42], [1, -.35]] : [[-1, -.3], [-.8, 1], [.8, 1], [1, -.3]];
  const at = (q, k) => { const [a, b] = prof[k]; return v3.add(v3.add(q.p, v3.mul(q.s, a * hw)), v3.mul(q.u, b * h)); };
  let s = 0;
  for (let i = 0; i < n - 1; i++) { const L = v3.dist(pts[i], pts[i + 1]); for (let k = 0; k < prof.length - 1; k++) { const A = at(secs[i], k), B = at(secs[i], k + 1), C = at(secs[i + 1], k + 1), D = at(secs[i + 1], k); gb.quad(A, B, C, D, [[s, k], [s, k + 1], [s + L, k + 1], [s + L, k]], mat, 1); } s += L; }
  for (const e of [0, n - 1]) { const c = secs[e]; const cc = v3.add(c.p, v3.mul(c.u, h * .4)); for (let k = 0; k < prof.length - 1; k++) { const A = at(c, k), B = at(c, k + 1); e ? gb.quad(cc, A, B, B, [[0, 0], [1, 0], [1, 1], [1, 1]], mat, 1) : gb.quad(cc, B, A, A, [[0, 0], [1, 0], [1, 1], [1, 1]], mat, 1); } }
}
// ridge-end dragon-fish (chiwen): curling tail that swallows the ridge
export function chiwen(gb, s, lod) {
  if (lod > 1) { gb.box(-s * .18, 0, -s * .16, s * .5, s * 1.1, s * .16, MAT.GOLD, { tx: .5 }); return; }
  const pts = []; const N = lod === 0 ? 18 : 9;
  for (let i = 0; i <= N; i++) { const t = i / N; const a = -0.5 + t * 4.2; const r = s * (.62 - .42 * t); pts.push([s * .30 - Math.cos(a) * r * .75 - t * s * .06, s * (.52 + t * .42) + Math.sin(a) * r * .78, 0]); }
  gb.tube(pts, t => [s * lerp(.34, .05, Math.pow(t, .8)), s * lerp(.20, .03, t)], lod === 0 ? 10 : 6, MAT.GOLD, { up: [0, 0, 1] });
  gb.box(-s * .42, -s * .1, -s * .19, s * .42, s * .5, s * .19, MAT.GOLD, { tx: .85 });
  // fins
  const nf = lod === 0 ? 7 : 3; for (let i = 0; i < nf; i++) { const t = i / nf; const p = pts[Math.floor((.15 + .75 * t) * N)]; gb.with(m4.trs([p[0], p[1], 0], 0, 1, 0, .6 + t * 3.6), () => gb.box(-s * .05, s * .12 * (1 - t), -s * .02, s * .05, s * (.42 - .22 * t), s * .02, MAT.GOLD, { tx: .1 })); }
}
// full ridge set for a hip roof
export function hipRidges(gb, R, o) {
  const { w, d, W, lod = 0 } = o; const rw = o.rw ?? .55, rh = o.rh ?? 1.0; const nv = [12, 6, 3][lod]; const M = o.mat ?? MAT.GOLD;
  for (const [side, s] of [[0, 1], [0, -1], [2, 1], [2, -1]]) {
    const pts = []; for (let j = 0; j <= nv; j++) { const v = j / nv; const p = R.world(side, R.pt(side, s * .9999, v)); pts.push([p[0], p[1] + rh * .15, p[2]]); }
    // upturned tip
    const t = v3.norm(v3.sub(pts[0], pts[1])); pts.unshift([pts[0][0] + t[0] * rw * 1.6, pts[0][1] + t[1] * rw * 1.6 + rw * 1.1, pts[0][2] + t[2] * rw * 1.6]);
    ridgeLine(gb, pts, rw, rh, M, lod);
    if (lod < 2 && o.beasts !== 0) { const nb = lod === 0 ? (o.beasts ?? 9) : 4; for (let b = 0; b < nb; b++) { const t = .06 + b * (.34 / nb); const p = R.world(side, R.pt(side, s * .9999, t)); gb.at(p[0], p[1] + rh * 1.0, p[2], Math.atan2(p[0], p[2]), () => { const q = rw * .62; gb.box(-q * .4, 0, -q * .7, q * .4, q * 1.1, q * .5, M, { tx: .7, tz: .6 }); gb.box(-q * .28, q * .9, -q * .1, q * .28, q * 1.75, q * .62, M, { tx: .6, tz: .55 }); }); } }
  }
  if (w > .5) { // main ridge
    const n = [14, 8, 4][lod], pts = []; const p0 = R.pt(0, 0, 1); for (let i = 0; i <= n; i++) { const s = i / n * 2 - 1; pts.push([s * w / 2, p0[1] + rh * .25 + Math.pow(Math.abs(s), 3) * rh * .9, 0]); }
    ridgeLine(gb, pts, rw * 1.15, rh * 1.5, M, lod);
    const cs = o.chi ?? rh * 3.2; for (const s of [1, -1]) gb.at(s * (w / 2 - cs * .18), p0[1] + rh * 1.2, 0, s > 0 ? PI : 0, () => chiwen(gb, cs, lod));
  }
}
// gable-and-hip roof (xieshan): lower skirt + upper gable
export function xieshan(gb, o) {
  const { W, D, y0, H, lod = 0 } = o; const vb = o.vb ?? .5; const gx = o.gx ?? W / 2 - (D / 2) * .55; // gable half width
  const dIn = D * (1 - vb), hb = H * rise(vb) * 1.0;
  const R = slopes(gb, { ...o, w: gx * 2, d: dIn, H: H * .40, p: 1.7, a: .62 });
  // upper gable: continue from v=1 of the skirt to ridge
  const y1 = y0 + H * .40, rH = H * .60; const nu = [26, 12, 6][lod], nv = [10, 5, 3][lod]; const pal = o.pal ?? 0; const ov = Math.min(1.2, gx * .06);
  const prof = v => rise(v, .62, 2.2);
  gb.p1 = pal; const p2q = gb.p2; gb.p2 = Math.round((o.ts || 0) * 16);
  let s0 = Math.hypot((D - dIn) / 2, H * .4);
  for (const side of [1, -1]) gb.grid(nu, nv, (uu, v) => { const x = (uu * 2 - 1) * (gx + ov) * side; const z = side * lerp(dIn / 2, 0, v); return [x, y1 + rH * prof(v), z, x, s0 + v * Math.hypot(dIn / 2, rH)]; }, MAT.TILE);
  gb.p2 = p2q;
  // gable triangles
  gb.p1 = 5; for (const s of [1, -1]) { const n = nv; for (let j = 0; j < n; j++) { const v0 = j / n, v1 = (j + 1) / n; const z0 = lerp(dIn / 2, 0, v0), z1 = lerp(dIn / 2, 0, v1), ya = y1 + rH * prof(v0), yb = y1 + rH * prof(v1); const x = s * (gx - ov * .4); const q = s > 0 ? [[x, ya, z0], [x, ya, -z0], [x, yb, -z1], [x, yb, z1]] : [[x, ya, -z0], [x, ya, z0], [x, yb, z1], [x, yb, -z1]]; gb.quad(...q, [[z0, ya], [-z0, ya], [-z1, yb], [z1, yb]], MAT.RELIEF, .7); } }
  const rw = o.rw ?? .5, rh = o.rh ?? .95;
  hipRidges(gb, R, { ...o, w: 0, rw, rh, beasts: o.beasts ?? 7 });
  // vertical ridges and main ridge
  for (const sx of [1, -1]) for (const sz of [1, -1]) { const pts = []; const n = [8, 5, 3][lod]; for (let j = 0; j <= n; j++) { const v = j / n; pts.push([sx * (gx + ov * .6), y1 + rH * prof(v) + rh * .1, sz * lerp(dIn / 2 * 1.02, 0, v)]); } ridgeLine(gb, pts, rw * .9, rh * .9, o.mat ?? MAT.GOLD, lod); }
  const n = [12, 7, 4][lod], pts = []; for (let i = 0; i <= n; i++) { const s = i / n * 2 - 1; pts.push([s * (gx + ov), y0 + H + rh * .3 + Math.pow(Math.abs(s), 3) * rh * .8, 0]); } ridgeLine(gb, pts, rw * 1.1, rh * 1.5, o.mat ?? MAT.GOLD, lod);
  const cs = o.chi ?? rh * 3; for (const s of [1, -1]) gb.at(s * (gx - cs * .1), y0 + H + rh * 1.2, 0, s > 0 ? PI : 0, () => chiwen(gb, cs, lod));
  return R;
}
// one bracket set, local frame: x along wall, z outwards, unit size s (total height)
export function bracket(gb, s, steps, idx, lod) {
  const u = s / (steps * .34 + .3); gb.p1 = idx & 1; const A = MAT.DOUGONG, B = MAT.GOLD;
  gb.box(-.2 * u, 0, -.2 * u, .2 * u, .2 * u, .2 * u, A, { tx: 1.35, tz: 1.35, skip: 'tn' });
  for (let k = 0; k < steps; k++) {
    const y = (.2 + k * .34) * u, z = k * .4 * u;
    gb.box(-.085 * u, y, -.3 * u, .085 * u, y + .24 * u, z + .46 * u, A, { ao: .9, aoB: .8, skip: 'n' });
    if (lod === 0) { gb.box(-.085 * u, y - .07 * u, z + .30 * u, .085 * u, y + .02 * u, z + .56 * u, A, { ao: .9, tz: .6, skip: 'n' }); }
    const L1 = .5 * u, L2 = .74 * u;
    gb.box(-L1, y, z - .075 * u, L1, y + .2 * u, z + .075 * u, A, { ao: .85, aoB: .7 });
    gb.box(-L2, y + .3 * u, z - .07 * u, L2, y + .48 * u, z + .07 * u, A, { ao: .85, aoB: .75 });
    if (lod === 0) for (const [x, yy] of [[-L1 + .07 * u, y + .2 * u], [L1 - .07 * u, y + .2 * u], [-L2 + .08 * u, y + .48 * u], [L2 - .08 * u, y + .48 * u], [0, y + .24 * u]]) gb.box(x - .1 * u, yy, z - .1 * u, x + .1 * u, yy + .11 * u, z + .1 * u, B, { tx: 1.2, tz: 1.2, skip: 't' });
  }
}
// ring of brackets between a wall plate rectangle and an eave plate
export function bracketRing(gb, o) {
  const { W, D, y, h, steps = 3, lod = 0, sp = 1.7 } = o; const out = o.out ?? h * .95;
  if (lod < 2) {
    const side = (len, fn) => { const n = Math.max(2, Math.round(len / sp)); for (let i = 0; i <= n; i++) fn(lerp(-len / 2, len / 2, i / n), i); };
    if (lod === 0 || o.force) {
      side(W, (x, i) => { gb.at(x, y, D / 2, 0, () => bracket(gb, h, steps, i, o.blod ?? lod)); gb.at(x, y, -D / 2, PI, () => bracket(gb, h, steps, i, o.blod ?? lod)); });
      side(D, (z, i) => { gb.at(W / 2, y, z, PI / 2, () => bracket(gb, h, steps, i, o.blod ?? lod)); gb.at(-W / 2, y, z, -PI / 2, () => bracket(gb, h, steps, i, o.blod ?? lod)); });
    }
  }
  // stepped plates behind / in place of the brackets
  gb.p1 = lod === 0 ? 2 : 3; const pr = []; const n = steps + 1; for (let k = 0; k < n; k++) { const k0 = lod === 0 ? .72 : 1; pr.push([out * (k / n) * k0 - .04, y + h * (k / n), .5 + .3 * k / n]); pr.push([out * (k / n) * k0 - .04, y + h * ((k + .86) / n), .62]); pr.push([out * ((k + 1) / n) * k0 - .04, y + h * ((k + 1) / n), .55]); }
  gb.frame(pr, W / 2, D / 2, MAT.DOUGONG, { vy: true });
}
export function columnsRect(gb, o) { // columns round a rectangle with bay counts
  const { W, D, nx, nz, y0, y1, r, lod = 0, mat = MAT.LACQUER } = o; const seg = [16, 8, 5][lod]; const set = new Set();
  const put = (x, z) => { const k = x.toFixed(2) + ',' + z.toFixed(2); if (set.has(k)) return; set.add(k); gb.p1 = o.p1 ?? 0; if (o.p1 === 3) gb.p2 = Math.round(r * 8); gb.cyl(x, z, r, y0, r * .92, y1, seg, mat, { cap: false, aoB: .7, aoT: .55 }); gb.p2 = 0; if (lod < 2) { gb.p1 = 0; gb.cyl(x, z, r * 1.75, y0 - .02, r * 1.2, y0 + r * .7, seg, MAT.JADE, {}); } };
  for (let i = 0; i <= nx; i++) { const x = lerp(-W / 2, W / 2, i / nx); put(x, D / 2); put(x, -D / 2); }
  for (let i = 0; i <= nz; i++) { const z = lerp(-D / 2, D / 2, i / nz); put(W / 2, z); put(-W / 2, z); }
}
// wall ring with lattice doors; glow p2 0..255
export function doorsRect(gb, o) {
  const { W, D, nx, nz, y0, y1, glow = 120, lod = 0 } = o; const inset = o.inset ?? .25; gb.p2 = glow; gb.p1 = 0;
  const seg = (a, b, n, nrm) => { // a,b points [x,z]
    for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; const A = [lerp(a[0], b[0], t0), lerp(a[1], b[1], t0)], B = [lerp(a[0], b[0], t1), lerp(a[1], b[1], t1)]; const w = Math.hypot(B[0] - A[0], B[1] - A[1]); const np = Math.max(2, Math.round(w / 1.3)); const off = [-nrm[0] * inset, -nrm[1] * inset]; gb.quad([A[0] + off[0], y0, A[1] + off[1]], [B[0] + off[0], y0, B[1] + off[1]], [B[0] + off[0], y1, B[1] + off[1]], [A[0] + off[0], y1, A[1] + off[1]], [[0, 0], [np, 0], [np, 1], [0, 1]], MAT.LATTICE, [.6, .6, .45, .45]); }
  };
  seg([-W / 2, D / 2], [W / 2, D / 2], nx, [0, 1]); seg([W / 2, -D / 2], [-W / 2, -D / 2], nx, [0, -1]);
  seg([W / 2, D / 2], [W / 2, -D / 2], nz, [1, 0]); seg([-W / 2, -D / 2], [-W / 2, D / 2], nz, [-1, 0]); gb.p2 = 0;
}
// painted beam ring
export function beamRect(gb, o) { const { W, D, y0, y1, t = .35 } = o; gb.p1 = o.p1 ?? 0; gb.frame([[-t, y0, .6], [t, y0, .6], [t, y1, .8], [-t, y1, .8]], W / 2, D / 2, MAT.CAIHUA, { vn: [y0, y1] }); }

// sumeru terrace (rect). returns top y
export function sumeru(gb, o) {
  const { W, D, y0, h, lod = 0 } = o; const e = o.e ?? h * .16; gb.p1 = o.p1 ?? 0;
  const P = lod < 2 ? [[e * 1.15, 0, .55], [e * 1.15, .10, .7], [e * .95, .11], [e * .95, .20], [e * .8, .24, .8], [e * .35, .33, .6], [e * .2, .36, .5], [e * .2, .62, .5], [e * .35, .65, .6], [e * .8, .74, .8], [e * .95, .78], [e * .95, .90], [e * 1.2, .91], [e * 1.2, 1.0]] : [[e, 0, .6], [e, .24, .8], [e * .2, .34, .55], [e * .2, .64, .55], [e, .78, .85], [e * 1.1, 1]];
  const mats = lod < 2 ? P.slice(0, -1).map((_, i) => (i === 4 || i === 8) ? MAT.RELIEF : (i === 6) ? MAT.RELIEF : MAT.JADE) : MAT.JADE;
  gb.frame(P.map(p => [p[0], y0 + p[1] * h, p[2]]), W / 2, D / 2, mats, { vy: true });
  const hw = W / 2 + e * 1.2, hd = D / 2 + e * 1.2; if (o.top !== false) gb.quad([-hw, y0 + h, hd], [hw, y0 + h, hd], [hw, y0 + h, -hd], [-hw, y0 + h, -hd], [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]], o.topMat ?? MAT.FLOOR, 1);
  return y0 + h;
}
// balustrade between two points (local), posts at spacing
export function rail(gb, a, b, o = {}) {
  const lod = o.lod ?? 0, h = o.h ?? 1.25, sp = o.sp ?? 2.1; const L = v3.dist(a, b); const n = Math.max(1, Math.round(L / sp)); const d = v3.norm([b[0] - a[0], 0, b[2] - a[2]]); const ry = Math.atan2(-d[2], d[0]);
  gb.p1 = 0;
  if (lod >= 2) { const up = h * .95; gb.quad([a[0], a[1], a[2]], [b[0], b[1], b[2]], [b[0], b[1] + up, b[2]], [a[0], a[1] + up, a[2]], [[0, 0], [n, 0], [n, 1], [0, 1]], MAT.JADE, .9); gb.quad([b[0], b[1], b[2]], [a[0], a[1], a[2]], [a[0], a[1] + up, a[2]], [b[0], b[1] + up, b[2]], [[0, 0], [n, 0], [n, 1], [0, 1]], MAT.JADE, .9); return; }
  const sl = (b[1] - a[1]) / Math.max(L, 1e-3); const seg = L / n; const pw = h * .13;
  for (let i = 0; i <= n; i++) {
    if (i === n && o.noEnd) break; const t = i / n; const x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t), z = lerp(a[2], b[2], t);
    gb.at(x, y, z, ry, () => {
      gb.box(-pw, 0, -pw, pw, h, pw, MAT.JADE, { aoB: .7, skip: 'b' });
      if (lod === 0) { gb.lathe([[pw * .7, h], [pw * 1.0, h + h * .06], [pw * .55, h + h * .1], [pw * 1.02, h + h * .2], [pw * 1.0, h + h * .34], [pw * .5, h + h * .44], [0, h + h * .46]], 8, MAT.RELIEF, { smooth: true }); }
      else gb.box(-pw * .85, h, -pw * .85, pw * .85, h * 1.36, pw * .85, MAT.JADE, { tx: .5, tz: .5 });
    });
    if (i < n) gb.at(x, y, z, ry, () => {
      const s0 = pw, s1 = seg - pw; const sh = (u) => u * sl * 1.0; const th = pw * .55; const B = (x0, y0, x1, y1, tt, m = MAT.JADE, k = 1) => { // sheared box
        const z0 = -tt, z1 = tt; const q = [[x0, y0 + sh(x0), z1], [x1, y0 + sh(x1), z1], [x1, y1 + sh(x1), z1], [x0, y1 + sh(x0), z1]]; gb.quad(...q, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], m, k); gb.quad([x1, y0 + sh(x1), z0], [x0, y0 + sh(x0), z0], [x0, y1 + sh(x0), z0], [x1, y1 + sh(x1), z0], [[x1, y0], [x0, y0], [x0, y1], [x1, y1]], m, k); gb.quad([x0, y1 + sh(x0), z1], [x1, y1 + sh(x1), z1], [x1, y1 + sh(x1), z0], [x0, y1 + sh(x0), z0], [[x0, 0], [x1, 0], [x1, .2], [x0, .2]], m, k); gb.quad([x0, y0 + sh(x0), z0], [x1, y0 + sh(x1), z0], [x1, y0 + sh(x1), z1], [x0, y0 + sh(x0), z1], [[x0, 0], [x1, 0], [x1, .2], [x0, .2]], m, k * .6);
      };
      B(s0, 0, s1, h * .5, th, lod === 0 ? MAT.RELIEF : MAT.JADE, .95); B(s0, h * .72, s1, h * .86, th * .9);
      if (lod === 0) for (let k = 0; k < 3; k++) { const c = lerp(s0, s1, (k + .5) / 3); B(c - h * .06, h * .5, c + h * .06, h * .72, th * .7); }
    });
  }
}
export function railRect(gb, W, D, y, o = {}) { const gap = o.gap ?? 0; const hw = W / 2, hd = D / 2; const R = (a, b) => rail(gb, a, b, o);
  if (gap > 0 && !(o.sides && !o.sides.includes('s'))) { R([-hw, y, hd], [-gap / 2, y, hd]); R([gap / 2, y, hd], [hw, y, hd]); } else R([-hw, y, hd], [hw, y, hd]);
  if (gap > 0 && o.gapN) { R([hw, y, -hd], [gap / 2, y, -hd]); R([-gap / 2, y, -hd], [-hw, y, -hd]); } else R([hw, y, -hd], [-hw, y, -hd]);
  R([hw, y, hd], [hw, y, -hd]); R([-hw, y, -hd], [-hw, y, hd]); }
export function railRing(gb, r, y, o = {}) { const lod = o.lod ?? 0; const sp = o.sp ?? 2.1; const a0 = o.a0 ?? 0, a1 = o.a1 ?? TAU; const n = Math.max(6, Math.round((a1 - a0) * r / (sp * (lod === 0 ? 4 : lod === 1 ? 6 : 10)))); const gaps = o.gaps || [];
  for (let i = 0; i < n; i++) { const t0 = lerp(a0, a1, i / n), t1 = lerp(a0, a1, (i + 1) / n), tm = (t0 + t1) / 2; if (gaps.some(g => { let d = Math.abs(((tm - g[0] + PI) % TAU + TAU) % TAU - PI); return d < g[1]; })) continue; rail(gb, [Math.sin(t0) * r, y, Math.cos(t0) * r], [Math.sin(t1) * r, y, Math.cos(t1) * r], { ...o, noEnd: true }); } }
// straight stair descending along +z from (y1 at z0) to (y0 at z1)
export function stairs(gb, o) {
  const { w, y0, y1, z0, z1, lod = 0 } = o; const n = lod === 0 ? Math.round((y1 - y0) / .32) : lod === 1 ? Math.min(40, Math.round((y1 - y0) / .9)) : 0; gb.p1 = 0;
  const lanes = o.lanes ?? 1; const rampW = lanes === 3 ? w * .26 : 0;
  const flight = (xa, xb) => {
    if (!n) { gb.quad([xa, y0, z1], [xb, y0, z1], [xb, y1, z0], [xa, y1, z0], [[xa, 0], [xb, 0], [xb, Math.hypot(y1 - y0, z1 - z0)], [xa, Math.hypot(y1 - y0, z1 - z0)]], MAT.JADE, .95); return; }
    for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; const ya = lerp(y1, y0, t0), yb = lerp(y1, y0, t1), za = lerp(z0, z1, t0), zb = lerp(z0, z1, t1); gb.quad([xa, yb, zb], [xb, yb, zb], [xb, yb, za], [xa, yb, za], [[xa, zb], [xb, zb], [xb, za], [xa, za]], MAT.JADE, [1, 1, .72, .72]); gb.quad([xa, yb, za], [xb, yb, za], [xb, ya, za], [xa, ya, za], [[xa, yb], [xb, yb], [xb, ya], [xa, ya]], MAT.JADE, [.65, .65, .95, .95]); }
  };
  if (lanes === 3) { flight(-w / 2, -rampW / 2); flight(rampW / 2, w / 2); const L = Math.hypot(y1 - y0, z1 - z0); const up = .25; gb.p1 = 1; gb.quad([-rampW / 2, y0 + up, z1], [rampW / 2, y0 + up, z1], [rampW / 2, y1 + up, z0], [-rampW / 2, y1 + up, z0], [[-rampW / 2, 0], [rampW / 2, 0], [rampW / 2, L], [-rampW / 2, L]], MAT.RELIEF, 1); gb.p1 = 0; }
  else flight(-w / 2, w / 2);
  // side walls
  for (const s of [1, -1]) { const x = s * w / 2, x2 = s * (w / 2 + .6); gb.quad(...(s > 0 ? [[x2, y0 - (o.drop ?? 0), z1], [x2, y0 - (o.drop ?? 0), z0], [x2, y1 + .3, z0], [x2, y0 + .3, z1]] : [[x2, y0 - (o.drop ?? 0), z0], [x2, y0 - (o.drop ?? 0), z1], [x2, y0 + .3, z1], [x2, y1 + .3, z0]]), [[0, 0], [1, 0], [1, 1], [0, 1]], MAT.JADE, .9); gb.quad(...(s > 0 ? [[x, y0 + .3, z1], [x2, y0 + .3, z1], [x2, y1 + .3, z0], [x, y1 + .3, z0]] : [[x2, y0 + .3, z1], [x, y0 + .3, z1], [x, y1 + .3, z0], [x2, y1 + .3, z0]]), [[0, 0], [1, 0], [1, 1], [0, 1]], MAT.JADE, 1); if (o.rail !== false) rail(gb, [s * (w / 2 + .3), y1 + .3, z0], [s * (w / 2 + .3), y0 + .3, z1], { lod, h: o.railH ?? 1.25, sp: o.railSp ?? 2.1 }); }
  if (lanes === 3 && lod < 2 && o.rail !== false) for (const s of [1, -1]) rail(gb, [s * rampW / 2, y1 + .2, z0], [s * rampW / 2, y0 + .2, z1], { lod, h: o.railH ?? 1.25, sp: o.railSp ?? 2.1 });
}
// gourd finial
export function gourd(gb, s, seg = 32, mat = MAT.GOLD) {
  const pr = [[.34, 0], [.40, .05], [.30, .09], [.22, .12, 0], [.30, .16], [.36, .20], [.24, .25], [.20, .28]];
  const bulb = (y, r, h, n) => { for (let i = 0; i <= n; i++) { const a = -PI / 2 + PI * i / n; pr.push([Math.max(.05, Math.cos(a) * r), y + h / 2 + Math.sin(a) * h / 2]); } };
  bulb(.27, .34, .50, 12); pr.push([.085, .79]); bulb(.78, .21, .30, 10); pr.push([.05, 1.09], [.075, 1.12], [.03, 1.18], [.012, 1.5], [0, 1.62]);
  gb.lathe(pr.map(p => [p[0] * s, p[1] * s, p[2]]), seg, mat, { smooth: true });
}
