import { GB, MAT } from './gb.js';
import { PAL, slopes, hipRidges, xieshan, bracketRing, bracket, columnsRect, doorsRect, beamRect, sumeru, rail, railRect, railRing, stairs, gourd, chiwen } from './parts.js';
import { m4, v3, clamp, lerp, TAU, PI, ss, mulberry32, DEG } from '../core/math.js';

// multi-tier terrace with rails and south stairs. returns top y
export function terrace(gb, o) {
  const { W, D, tiers = 1, h = 3, step = 5, lod = 0 } = o; let y = o.y0 ?? 0;
  for (let t = 0; t < tiers; t++) { const k = tiers - 1 - t; const w = W + k * step * 2, d = D + k * step * 2; sumeru(gb, { W: w, D: d, y0: y, h, lod }); y += h; if (o.rail !== false) railRect(gb, w + .2, d + .2, y, { lod, h: o.railH ?? 1.25, sp: o.railSp ?? 2.1, gap: o.stairW ? o.stairW + 1.4 : 0 }); if (o.stairW) { stairs(gb, { w: o.stairW, y0: y - h, y1: y, z0: d / 2 + h * .15, z1: d / 2 + h * .15 + h * 1.9, lanes: 3, lod, railH: o.railH, railSp: o.railSp }); } }
  return y;
}
// rectangular hall. roof: 'hip' | 'xie'; eaves 1|2|3
export function hall(o) {
  const gb = new GB(); const lod = o.lod ?? 0; const { W = 60, D = 34, nx = 11, nz = 5, colH = 8.5, eaves = 2, roof = 'hip', pal = PAL.TEAL, glow = 130 } = o;
  const r = .42 * colH / 8; let y = terrace(gb, { W: W + 14, D: D + 14, tiers: o.tiers ?? 3, h: o.th ?? 2.6, step: o.tstep ?? 6.5, stairW: W * .22, lod });
  let w = W, d = D, oh = colH * .62; const bh = colH * .26;
  for (let e = 0; e < eaves; e++) {
    const ch = e === 0 ? colH : colH * .42; const y1 = y + ch;
    columnsRect(gb, { W: w, D: d, nx, nz, y0: y, y1, r: e ? r * .8 : r, lod });
    doorsRect(gb, { W: w, D: d, nx, nz, y0: y, y1: y1 - ch * (e ? .25 : .13), glow, lod, inset: .1 });
    beamRect(gb, { W: w, D: d, y0: y1 - ch * (e ? .25 : .13), y1: y1 + .05, t: r * .9 });
    bracketRing(gb, { W: w, D: d, y: y1, h: bh, steps: e === eaves - 1 ? 4 : 3, lod, sp: o.sp ?? 1.9, out: bh * 1.05, blod: o.blod ?? 1 });
    const ey = y1 + bh * 1.0; const last = e === eaves - 1; const ew = w + oh * 2, ed = d + oh * 2;
    if (!last) { const nw = w * .86, nd = d * .80; const H = oh * 1.05; const R = slopes(gb, { W: ew, D: ed, w: nw - .2, d: nd - .2, y0: ey - oh * .18, H, lift: oh * .55, pal, lod, inW: w + bh * 2, inD: d + bh * 2, inY: ey, a: .62, p: 1.9 }); hipRidges(gb, R, { W: ew, w: 0, d: nd, lod, rw: .42, rh: .8, beasts: 7 }); y = ey - oh * .18 + H; w = nw; d = nd; }
    else if (roof === 'hip') { const H = ed * .42; const R = slopes(gb, { W: ew, D: ed, w: Math.max(ew - ed * .92, ew * .18), d: 0.01, y0: ey - oh * .18, H, lift: oh * .66, pal, lod, inW: w + bh * 2, inD: d + bh * 2, inY: ey }); hipRidges(gb, R, { W: ew, w: Math.max(ew - ed * .92, ew * .18), d: .01, lod, rw: .55, rh: 1.05, beasts: 9, chi: colH * .42 }); }
    else xieshan(gb, { W: ew, D: ed, y0: ey - oh * .18, H: ed * .44, lift: oh * .66, pal, lod, inW: w + bh * 2, inD: d + bh * 2, inY: ey, rw: .5, rh: .95, chi: colH * .4 });
  }
  return gb;
}
// storeyed pavilion
export function tower(o) {
  const gb = new GB(); const lod = o.lod ?? 0; const { W = 22, D = o.W ?? 22, floors = 3, fh = 6.5, shrink = .86, n = 3, pal = PAL.TEAL, glow = 160, top = 'xie' } = o;
  let y = terrace(gb, { W: W + 8, D: D + 8, tiers: o.tiers ?? 1, h: o.th ?? 3, step: 4, stairW: W * .3, lod }); let w = W, d = D;
  for (let f = 0; f < floors; f++) {
    const oh = fh * .52, bh = fh * .2, r = .34 * fh / 6.5; const y1 = y + fh * .62; const last = f === floors - 1;
    columnsRect(gb, { W: w, D: d, nx: n, nz: n, y0: y, y1, r, lod }); doorsRect(gb, { W: w, D: d, nx: n, nz: n, y0: y, y1: y1 - fh * .1, glow, lod, inset: .1 }); beamRect(gb, { W: w, D: d, y0: y1 - fh * .1, y1: y1 + .05, t: r });
    bracketRing(gb, { W: w, D: d, y: y1, h: bh, steps: 3, lod, sp: 1.7, blod: 1 });
    const ey = y1 + bh, ew = w + oh * 2, ed = d + oh * 2;
    if (last) { if (top === 'xie') xieshan(gb, { W: ew, D: ed, y0: ey - oh * .15, H: ed * .46, lift: oh * .75, pal, lod, inW: w + bh * 2, inD: d + bh * 2, inY: ey, rw: .4, rh: .75, chi: fh * .36, gx: ew * .29 }); else { const H = ed * .62; const R = slopes(gb, { W: ew, D: ed, w: .6, d: .6, y0: ey - oh * .15, H, lift: oh * .8, pal, lod, inW: w + bh * 2, inD: d + bh * 2, inY: ey }); hipRidges(gb, R, { W: ew, w: 0, d: .6, lod, rw: .4, rh: .7, beasts: 6 }); gb.at(0, ey - oh * .15 + H, 0, 0, () => gourd(gb, fh * .42, lod === 0 ? 20 : 10)); } }
    else {
      const nw = w * shrink, nd = d * shrink; const H = oh * .75; const R = slopes(gb, { W: ew, D: ed, w: nw + 1.4, d: nd + 1.4, y0: ey - oh * .15, H, lift: oh * .62, pal, lod, inW: w + bh * 2, inD: d + bh * 2, inY: ey, a: .7, p: 1.8 }); hipRidges(gb, R, { W: ew, w: 0, d: nd, lod, rw: .34, rh: .6, beasts: 5 });
      // balcony
      const by = ey - oh * .15 + H; gb.p1 = 1; gb.frame([[.2, by - .6, .5], [1.2, by - .1, .7], [1.5, by - .1], [1.5, by + .35]], nw / 2, nd / 2, MAT.DOUGONG, { vy: true }); gb.quad([-nw / 2 - 1.5, by + .35, nd / 2 + 1.5], [nw / 2 + 1.5, by + .35, nd / 2 + 1.5], [nw / 2 + 1.5, by + .35, -nd / 2 - 1.5], [-nw / 2 - 1.5, by + .35, -nd / 2 - 1.5], [[0, 0], [1, 0], [1, 1], [0, 1]], MAT.WOOD, .8); railRect(gb, nw + 2.8, nd + 2.8, by + .35, { lod, h: 1.1, sp: 1.8 }); y = by + .35; w = nw; d = nd;
    }
  }
  return gb;
}
// conical roof for round halls: rows radiate
function coneRoof(gb, o) { const { r0, r1, y0, H, seg, lod, pal } = o; const nv = [14, 8, 4][lod]; const pr = []; const ris = v => .5 * v + .5 * Math.pow(v, 2.2); gb.p1 = pal; const P = []; let s = 0, pp = null; for (let j = 0; j <= nv; j++) { const v = j / nv; const p = [lerp(r0, r1, v), y0 + H * ris(v)]; if (pp) s += Math.hypot(p[0] - pp[0], p[1] - pp[1]); P.push([...p, s]); pp = p; }
  const rows = Math.round(TAU * r0 / (o.row ?? .42)); gb.grid(seg, nv, (u, v) => { const q = P[Math.round(v * nv)], a = u * TAU; return [Math.sin(a) * q[0], q[1], Math.cos(a) * q[0], u * rows * .34, q[2], 1]; }, MAT.TILE, { wrapU: true });
  // eave edge and underside
  const e = o.edge ?? .6; gb.p1 = PAL.GOLD; gb.lathe([[r0 - e * .3, y0 - e], [r0, y0 + .02]], seg, MAT.TILEEDGE, { ur: r0 }); const base = gb.nv; gb.p1 = 0; if (o.inR) { gb.grid(seg, 2, (u, k) => { const a = u * TAU, R = lerp(r0 - e * .3, o.inR, k), y = lerp(y0 - e, o.inY, Math.pow(k, .85)); return [Math.sin(a) * R, y, Math.cos(a) * R, u * TAU * r0, k * (r0 - o.inR), lerp(.95, .42, k)]; }, MAT.RAFTER, { wrapU: true, flip: true }); }
}
// radial ridges for cone
function coneRidges(gb, o) { const { n, r0, r1, y0, H, rw, rh, lod } = o; const ris = v => .5 * v + .5 * Math.pow(v, 2.2); const nv = [12, 7, 4][lod]; for (let k = 0; k < n; k++) { const a = k / n * TAU; gb.at(0, 0, 0, a, () => { const pts = []; for (let j = 0; j <= nv; j++) { const v = j / nv; pts.push([0, y0 + H * ris(v) + rh * .2, lerp(r0, r1, v)]); } for (let j = 0; j < nv; j++) { const A = pts[j], B = pts[j + 1]; gb.quad([-rw, A[1] - rh * .3, A[2]], [-rw * .8, A[1] + rh, A[2]], [-rw * .8, B[1] + rh, B[2]], [-rw, B[1] - rh * .3, B[2]], [[0, 0], [1, 0], [1, 1], [0, 1]], MAT.GOLD); gb.quad([rw * .8, A[1] + rh, A[2]], [rw, A[1] - rh * .3, A[2]], [rw, B[1] - rh * .3, B[2]], [rw * .8, B[1] + rh, B[2]], [[0, 0], [1, 0], [1, 1], [0, 1]], MAT.GOLD); gb.quad([-rw * .8, A[1] + rh, A[2]], [rw * .8, A[1] + rh, A[2]], [rw * .8, B[1] + rh, B[2]], [-rw * .8, B[1] + rh, B[2]], [[0, 0], [1, 0], [1, 1], [0, 1]], MAT.GOLD); } }); } }
// round hall: o.R body radius, storeys of eaves
export function roundHall(o) {
  const gb = new GB(); const lod = o.lod ?? 0; const { R = 20, eaves = 3, colH = 9, pal = PAL.AZUR, glow = 170, nCol = 12 } = o; const seg = [144, 64, 28][lod]; let y = o.y0 ?? 0; let r = R; const sc = o.scale ?? 1;
  for (let e = 0; e < eaves; e++) {
    const last = e === eaves - 1; const ch = e === 0 ? colH : colH * .55; const y1 = y + ch, bh = colH * .28, oh = colH * .78; const n = nCol * (lod === 0 ? 2 : 1) * (o.colMul ?? 1);
    for (let k = 0; k < n; k++) { const a = k / n * TAU; gb.p1 = o.colPal ?? 0; gb.cyl(Math.sin(a) * r, Math.cos(a) * r, .5 * sc, y, .46 * sc, y1, lod === 0 ? 14 : 7, MAT.LACQUER, { cap: false, aoT: .55, aoB: .7 }); }
    gb.p2 = glow; gb.p1 = 0; const ri = r - .3 * sc; const np = n * Math.max(2, Math.round(TAU * r / n / (1.35 * sc))); const base = []; const ns = lod === 2 ? 28 : n * 2; for (let k = 0; k < ns; k++) { const a0 = k / ns * TAU, a1 = (k + 1) / ns * TAU; const A = [Math.sin(a0) * ri, Math.cos(a0) * ri], B = [Math.sin(a1) * ri, Math.cos(a1) * ri]; const u0 = k / ns * np, u1 = (k + 1) / ns * np; gb.quad([A[0], y, A[1]], [B[0], y, B[1]], [B[0], y1 - ch * .14, B[1]], [A[0], y1 - ch * .14, A[1]], [[u0, 0], [u1, 0], [u1, 1], [u0, 1]], MAT.LATTICE, [.6, .6, .45, .45]); } gb.p2 = 0;
    gb.p1 = 0; gb.lathe([[r - .5 * sc, y1 - ch * .14, 1, .6], [r + .45 * sc, y1 - ch * .14, 1, .7], [r + .45 * sc, y1 + .05, 1, .8]], seg, MAT.CAIHUA, { vn: [y1 - ch * .14, y1 + .05], ur: r });
    if (lod < 2) { const nb = Math.round(TAU * r / (o.sp ?? 2.2 * sc)); if (lod === 0) for (let k = 0; k < nb; k++) { const a = k / nb * TAU; gb.at(Math.sin(a) * r, y1, Math.cos(a) * r, a, () => bracket(gb, bh, 3, k, 1)); } }
    gb.p1 = lod === 0 ? 2 : 3; const pr = []; for (let k = 0; k < 4; k++) { const q = lod === 0 ? .72 : 1; pr.push([r + bh * (k / 4) * q, y1 + bh * (k / 4), 1, .55]); pr.push([r + bh * (k / 4) * q, y1 + bh * ((k + .86) / 4), 1, .62]); pr.push([r + bh * ((k + 1) / 4) * q, y1 + bh * ((k + 1) / 4), 1, .55]); } gb.lathe(pr, seg, MAT.DOUGONG, { vy: true, ur: r });
    const ey = y1 + bh; const r0 = r + oh; const nr = last ? .9 * sc : r * (o.shrink ?? .72); const H = last ? r0 * (o.topH ?? .62) : (r0 - nr) * .62;
    coneRoof(gb, { r0, r1: nr, y0: ey - oh * .12, H, seg, lod, pal, inR: r + bh, inY: ey, row: .42 * sc, edge: .6 * sc });
    coneRidges(gb, { n: o.ridges ?? 12, r0: r0 * .995, r1: nr, y0: ey - oh * .12, H, rw: .28 * sc, rh: .5 * sc, lod });
    gb.lathe([[nr + .5 * sc, ey - oh * .12 + H - .5 * sc], [nr + .7 * sc, ey - oh * .12 + H + .1 * sc], [nr + .2 * sc, ey - oh * .12 + H + .9 * sc], [nr - .3 * sc, ey - oh * .12 + H + .9 * sc]], seg, MAT.GOLD, {});
    y = ey - oh * .12 + H; r = nr - .4 * sc; if (!last) r = nr - .6 * sc;
    if (last) gb.at(0, y, 0, 0, () => gourd(gb, o.gourd ?? colH * .9, lod === 0 ? 48 : 20));
  }
  gb.topY = y; return gb;
}
// round triple terrace (altar of heaven)
export function altar(gb, o) { const { R, tiers = 3, h = 3, step = 8, lod = 0 } = o; let y = o.y0 ?? 0; const seg = o.seg ?? [160, 96, 48][lod];
  for (let t = 0; t < tiers; t++) { const r = R + (tiers - 1 - t) * step; const e = h * .16; const P = [[r + e * 1.15, 0, 1, .6], [r + e * 1.15, .10], [r + e * .95, .11], [r + e * .95, .2], [r + e * .4, .33, 0, .6], [r + e * .2, .36, 0, .5], [r + e * .2, .62, 0, .5], [r + e * .4, .66, 0, .6], [r + e * .95, .78], [r + e * .95, .9], [r + e * 1.2, .91], [r + e * 1.2, 1, 1]]; gb.p1 = 0; gb.lathe(P.map(p => [p[0], y + p[1] * h, p[2], p[3]]), seg, P.slice(0, -1).map((_, i) => i === 3 || i === 5 || i === 7 ? MAT.RELIEF : MAT.JADE), { vy: true, ur: r }); y += h;
    const inner = t === tiers - 1 ? 0 : r - step - 1; gb.lathe([[r + e * 1.2, y], [inner, y]].map(p => [...p]), seg, MAT.FLOOR, { ur: r });
    railRing(gb, r + e * .7, y, { lod: o.railLod ?? lod, h: o.railH ?? 1.25, sp: o.railSp ?? 2.1, gaps: [0, PI / 2, PI, -PI / 2].map(a => [a, (o.stairW ?? 6) / r * .56]) });
    if (o.stairW) for (let k = 0; k < 4; k++) gb.at(0, 0, 0, k * PI / 2, () => stairs(gb, { w: o.stairW, y0: y - h, y1: y, z0: r + e, z1: r + e + h * 1.9, lanes: 3, lod, railH: o.railH, railSp: o.railSp })); }
  return y; }
// covered gallery bay, along x, length L
export function corridor(o) { const gb = new GB(); const lod = o.lod ?? 0; const { L = 4, W = 5, H = 4.2, pal = PAL.TEAL, n = 1 } = o; const tot = L * n; const r = .22;
  sumeru(gb, { W: tot, D: W + 1.6, y0: -2.2, h: 2.2, lod, e: .25 });
  for (let i = 0; i <= n; i++) for (const s of [1, -1]) { const x = -tot / 2 + i * L; gb.p1 = 0; gb.cyl(x, s * W / 2, r, 0, r * .92, H, lod === 0 ? 12 : 6, MAT.LACQUER, { cap: false, aoT: .6, aoB: .75 }); if (lod === 0) gb.cyl(x, s * W / 2, r * 1.7, 0, r * 1.2, r * .7, 12, MAT.JADE, {}); }
  for (const s of [1, -1]) { gb.p1 = 0; gb.box(-tot / 2, H - .62, s * W / 2 - .18, tot / 2, H, s * W / 2 + .18, MAT.CAIHUA, { aoB: .7 }); rail(gb, [-tot / 2, 0, s * (W / 2)], [tot / 2, 0, s * (W / 2)], { lod, h: .9, sp: L / 2 }); if (lod === 0) for (let i = 0; i < n * 3; i++) gb.at(-tot / 2 + (i + .5) * L / 3, H, s * W / 2, s > 0 ? 0 : PI, () => bracket(gb, .8, 2, i, 1)); }
  // roof (two slopes, open gable ends)
  const oh = 1.5, rh = W * .42; gb.p1 = pal; for (const s of [1, -1]) { gb.grid(lod === 0 ? 8 : 2, lod === 0 ? 8 : 4, (u, v) => { const x = (u * 2 - 1) * tot / 2 * s, z = s * lerp(W / 2 + oh, 0, v); return [x, H + .55 + rh * (.55 * v + .45 * v ** 2.2), z, x, v * Math.hypot(W / 2 + oh, rh)]; }, MAT.TILE); gb.p1 = PAL.GOLD; const zz = s * (W / 2 + oh); gb.quad(...(s > 0 ? [[-tot / 2, H + .15, zz], [tot / 2, H + .15, zz], [tot / 2, H + .57, zz], [-tot / 2, H + .57, zz]] : [[tot / 2, H + .15, zz], [-tot / 2, H + .15, zz], [-tot / 2, H + .57, zz], [tot / 2, H + .57, zz]]), [[-tot / 2, 0], [tot / 2, 0], [tot / 2, 1], [-tot / 2, 1]], MAT.TILEEDGE); gb.p1 = 0; const q = s > 0 ? [[tot / 2, H + .15, zz], [-tot / 2, H + .15, zz], [-tot / 2, H + rh * .8, 0], [tot / 2, H + rh * .8, 0]] : [[-tot / 2, H + .15, zz], [tot / 2, H + .15, zz], [tot / 2, H + rh * .8, 0], [-tot / 2, H + rh * .8, 0]]; gb.quad(...q, [[-tot / 2, 0], [tot / 2, 0], [tot / 2, 4], [-tot / 2, 4]], MAT.RAFTER, [.9, .9, .4, .4]); gb.p1 = pal; }
  gb.box(-tot / 2, H + .5 + rh, -.3, tot / 2, H + 1.15 + rh, .3, MAT.GOLD, {}); return gb; }
