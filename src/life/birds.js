// Cranes and phoenixes. Wingspan is 2 units (x in -1..1), facing +z. aNor.w carries wing (+) or tail (-) weight.
import { GB, MAT } from '../arch/gb.js';
import { m4, v3, clamp, lerp, ss, TAU, PI } from '../core/math.js';
const F = MAT.FEATHER;
// a thin two-sided vane: rows of points across
function vane(gb, nu, nv, f, p1, w, flip) { const pw = gb.nw; gb.p1 = p1; const base = gb.nv; const P = []; for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) P.push(f(i / nu, j / nv)); const at = (i, j) => P[clamp(j, 0, nv) * (nu + 1) + clamp(i, 0, nu)]; for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const n = v3.norm(v3.cross(v3.sub(at(i + 1, j), at(i - 1, j)), v3.sub(at(i, j + 1), at(i, j - 1)))); const p = at(i, j); const up = n[1] < 0 ? -1 : 1; gb.nw = typeof w === 'function' ? w(p) : w; gb.v(p[0], p[1], p[2], n[0] * up, n[1] * up, n[2] * up, i / nu, j / nv, F, p[3] ?? 1); } for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; gb.I.push(a, b, c, b, d, c); } gb.nw = pw; gb.p1 = 0; }
// wing = arm (inner + outer sheet) + separate finger feathers. s = side
function wing(gb, s, o) {
  const N = o.lod ? 8 : 16; const lead = x => o.z0 + .05 * Math.sin(x * PI * .9) - .10 * ss(.42, 1, x) * x; const wgt = p => Math.round(127 * ss(.02, .10, Math.abs(p[0])));
  const chord = x => o.chord * (1 - .25 * ss(.0, .42, x) - .35 * ss(.42, .8, x));
  // coverts
  vane(gb, N, o.lod ? 2 : 4, (u, v) => { const x = lerp(.035, .74, u); return [s * x, .018 * Math.sin(v * PI) * (1 - x * .7) + .004, lead(x) - v * chord(x) * .46]; }, o.cov, wgt);
  // secondaries (scalloped)
  const ns = o.lod ? 5 : 11; for (let k = 0; k < ns; k++) { const x0 = lerp(.04, .44, k / ns), x1 = lerp(.04, .44, (k + 1.25) / ns), xm = (x0 + x1) / 2; const c = chord(xm); vane(gb, 2, 3, (u, v) => { const w = (1 - .5 * v * v * v); const x = xm + (u - .5) * (x1 - x0) * w; return [s * x, .006 - .001 * k - .012 * v, lead(xm) - .40 * c - v * c * .62]; }, o.sec, wgt); }
  // primaries
  const np = o.lod ? 6 : 10; for (let k = 0; k < np; k++) { const t = k / (np - 1); const x0 = lerp(.45, .74, t), z0 = lead(x0) - .30 * chord(x0) * (1 - t * .6); const ang = lerp(-1.25, -.12, Math.pow(t, .8)); const L = lerp(o.prim * .78, o.prim, Math.sin(t * PI * .62)); const dir = [Math.cos(ang), Math.sin(ang)]; const pw = lerp(.040, .026, t) * (o.lod ? 1.5 : 1); vane(gb, 2, 4, (u, v) => { const w = pw * (1 - .75 * v * v * v) * (.75 + .5 * Math.sin(v * PI)); const d = (u - .5) * 2 * w; return [s * (x0 + dir[0] * L * v - dir[1] * d), .004 + .002 * k + .045 * v * v * (1 - t * .3), z0 + dir[1] * L * v + dir[0] * d - .0]; }, o.pri, wgt); }
}
export function crane(lod = 0) {
  const gb = new GB(); const sg = lod ? 6 : 12; gb.nw = 0;
  gb.p1 = 0; gb.tube([[0, .0, -.36], [0, .004, -.27], [0, .004, -.12], [0, .0, .02], [0, .004, .14], [0, .012, .22], [0, .020, .28]], t => [.004 + .082 * Math.pow(Math.sin(PI * clamp(t * .94 + .05)), .75), .004 + .078 * Math.pow(Math.sin(PI * clamp(t * .94 + .05)), .75)], sg, F);
  gb.p1 = 1; gb.tube([[0, .016, .24], [0, .026, .34], [0, .034, .46], [0, .036, .58], [0, .040, .69]], t => .030 - .012 * t, sg, F, {}); gb.p1 = 0; gb.tube([[0, .0455, .52], [0, .0475, .60], [0, .0495, .67], [0, .050, .705]], t => .0155 * Math.sin(PI * (.12 + .70 * t)), sg, F);
  gb.p1 = 1; gb.tube([[0, .040, .68], [0, .043, .72], [0, .041, .765]], t => .022 * (1 - t * .45), sg, F); gb.p1 = 2; gb.tube([[0, .056, .705], [0, .058, .73], [0, .051, .755]], t => .010 * Math.sin(PI * (.15 + t * .8)), 8, F); gb.p1 = 3; gb.tube([[0, .040, .76], [0, .036, .82], [0, .032, .885]], t => .009 * (1 - t) + .001, 6, F);
  // legs and tail
  for (const s of [1, -1]) { gb.p1 = 1; gb.tube([[s * .03, -.03, -.22], [s * .028, -.028, -.45], [s * .026, -.018, -.70], [s * .026, -.016, -.80]], t => .0075 - .003 * t, 5, F); for (const a of [-.25, 0, .25]) gb.tube([[s * .026, -.016, -.79], [s * .026 + a * .05, -.018, -.86]], .003, 4, F); }
  vane(gb, 5, 3, (u, v) => [(u - .5) * (.12 + .10 * v), .012 - .02 * v, -.30 - v * (.15 + .03 * Math.cos((u - .5) * 3))], 0, 0);
  for (const s of [1, -1]) wing(gb, s, { lod, z0: .18, chord: .30, cov: 0, sec: 1, pri: 0, prim: .36 });
  return gb;
}
export function phoenix(lod = 0) {
  const gb = new GB(); const sg = lod ? 7 : 14; gb.nw = 0;
  gb.p1 = 4; gb.tube([[0, .0, -.30], [0, .004, -.20], [0, .0, -.06], [0, .0, .08], [0, .02, .20], [0, .05, .28]], t => .006 + .098 * Math.pow(Math.sin(PI * clamp(t * .92 + .07)), .7), sg, F, { uS: 1 });
  gb.tube([[0, .04, .22], [0, .085, .32], [0, .145, .40], [0, .185, .48], [0, .190, .55]], t => .046 - .016 * t, sg, F); gb.tube([[0, .188, .53], [0, .192, .575], [0, .186, .62], [0, .178, .645]], t => .036 * Math.sin(PI * (.28 + t * .62)), sg, F); gb.p1 = 3; gb.tube([[0, .180, .63], [0, .172, .67], [0, .152, .70]], t => .015 * (1 - t) + .002, 7, F);
  // crest, wattles, comb
  for (let k = 0; k < 5; k++) { const a = (k - 2) * .22; gb.p1 = 7; const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([Math.sin(a) * t * .10, .215 + Math.sin(t * 2.2) * .13, .575 - t * .20 - t * t * .05]); } gb.tube(pts, t => .006 * (1 - t * .5) + .008 * Math.exp(-Math.pow((t - .93) / .07, 2)), 5, F, {}); }
  for (const s of [1, -1]) { gb.p1 = 2; gb.tube([[s * .014, .165, .635], [s * .016, .135, .630], [s * .014, .115, .622]], t => .011 * Math.sin(PI * (.2 + .7 * t)), 6, F); gb.p1 = 3; gb.tube([[s * .03, -.07, -.10], [s * .03, -.09, -.28], [s * .03, -.085, -.42]], t => .010 - .004 * t, 5, F); }
  for (const s of [1, -1]) wing(gb, s, { lod, z0: .20, chord: .38, cov: 5, sec: 5, pri: 5, prim: .40 });
  // five long streaming tail plumes plus short fan
  const T = lod ? 16 : 34; const plume = (x0, sp, L, w, dy, seed) => vane(gb, 4, T, (u, v) => { const ww = w * (.22 + .25 * ss(.0, .3, v) + .9 * Math.exp(-Math.pow((v - .90) / .075, 2))) * (1 - ss(.97, 1, v) * .9); const cx = x0 + sp * v * (1 - .25 * v) + .05 * Math.sin(v * 5 + seed) * v; return [cx + (u - .5) * 2 * ww, .0 + dy * Math.sin(v * PI * .9) + .02 * Math.cos((u - .5) * 3), -.22 - v * L]; }, 6, p => -Math.round(127 * ss(.22, .9, -p[2])));
  plume(0, 0, 2.5, .075, .10, 0); plume(.02, .34, 2.25, .068, .05, 1); plume(-.02, -.34, 2.25, .068, .05, 2); plume(.03, .70, 1.8, .060, 0, 3); plume(-.03, -.70, 1.8, .060, 0, 4); if (!lod) { plume(.02, .16, 1.3, .05, .16, 5); plume(-.02, -.16, 1.3, .05, .16, 6); }
  return gb;
}
