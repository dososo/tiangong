// Second generation of wall modules: the lit arcade bay and the carved jade cliff.
import { GB, MAT } from './gb.js';
import { PAL, bracket, rail } from './parts.js';
import { ext } from './heaven.js';
import { m4, v3, lerp, PI } from '../core/math.js';

// one storey of the great drum: 40 m wide, 58 m tall. face at z=0, wall set back
export const BAY = { W: 40, H: 58 };
export function bay(lod = 0) {
  const gb = new GB(); const h = 20; const zw = -7; gb.p1 = 0;
  const P = [[2.6, 0, .5], [2.6, 1.2, .7], [2.0, 1.5], [2.0, 2.3], [1.2, 3.0, .6], [1.0, 4.4, .6], [1.9, 5.2], [2.6, 5.4], [2.6, 6.2], [zw, 6.2, .6]];
  const Q = lod < 2 ? P : [P[0], P[4], P[7], P[8], P[9]]; ext(gb, Q, -h, h, Q.map((_, i) => lod < 2 && i === 4 ? MAT.RELIEF : MAT.JADE), { vy: true });
  ext(gb, [[2.68, 5.45], [2.68, 6.1]], -h, h, MAT.GOLD);
  if (lod < 2) rail(gb, [-h, 6.2, 1.8], [h, 6.2, 1.8], { lod: Math.max(1, lod), h: 2.4, sp: lod ? 5 : 4, noEnd: true });
  // lit lattice wall: six leaves and a transom
  gb.p1 = 0; gb.p2 = 255; gb.quad([-h, 6.2, zw], [h, 6.2, zw], [h, 31, zw], [-h, 31, zw], [[0, 0], [6, 0], [6, 1], [0, 1]], MAT.LATTICE, [.75, .75, .6, .6]);
  gb.quad([-h, 33, zw], [h, 33, zw], [h, 41, zw], [-h, 41, zw], [[0, .60], [8, .60], [8, .97], [0, .97]], MAT.LATTICE, [.6, .6, .45, .45]); gb.p2 = 0;
  ext(gb, [[zw, 31, .5], [zw + .7, 31.1, .6], [zw + .7, 32.9, .6], [zw, 33, .5]], -h, h, MAT.GOLD);
  gb.quad([-h, 41, zw], [h, 41, zw], [h, 41, .4], [-h, 41, .4], [[-h, 0], [h, 0], [h, 4], [-h, 4]], MAT.CAIHUA, .4, [0, -1, 0]);
  // columns
  for (const x of lod === 2 ? [0] : [-10, 10]) { gb.p1 = 4; gb.cyl(x, -.4, lod === 2 ? 2 : 1.75, 6.2, lod === 2 ? 1.9 : 1.6, 42, [16, 8, 4][lod], MAT.LACQUER, { cap: false, aoB: .75, aoT: .6 }); if (lod < 2) { gb.p1 = 0; gb.cyl(x, -.4, 3, 6.2, 2.1, 7.6, [16, 8][lod], MAT.JADE, {}); gb.lathe; gb.at(x, 39.2, -.4, 0, () => gb.lathe([[1.7, 0], [2.3, .4], [2.3, 1.2], [1.8, 1.8]], [14, 8][lod], MAT.GOLD, {})); } }
  gb.p1 = 0; ext(gb, [[.5, 41, .5], [1.3, 41, .7], [1.3, 45.6, .9]], -h, h, MAT.CAIHUA, { vn: [41, 45.6] }); ext(gb, [[1.3, 45.6], [1.9, 45.8], [1.9, 46.8], [.6, 46.8]], -h, h, MAT.GOLD);
  if (lod === 0) for (let i = 0; i < 8; i++) gb.at(-h + 2.5 + i * 5, 46.8, .4, 0, () => bracket(gb, 5, 3, i, 1));
  gb.p1 = lod === 0 ? 2 : 3; ext(gb, [[.3, 46.8, .5], [1.5, 48.2, .5], [1.6, 49.4, .55], [2.8, 50.2, .55], [3.0, 51.8, .6]], -h, h, MAT.DOUGONG, { vy: true });
  const ey = 51.6, eo = 9.4; gb.p1 = 1; gb.quad([-h, ey - 1.0, eo - .3], [-h, ey, 3], [h, ey, 3], [h, ey - 1.0, eo - .3], [[-h, 0], [-h, 5], [h, 5], [h, 0]], MAT.RAFTER, [.95, .5, .5, .95], [0, -1, .15]);
  gb.p1 = PAL.GOLD; ext(gb, [[eo - .3, ey - 1.0], [eo, ey + .2]], -h, h, MAT.TILEEDGE, { vn: [ey - 1.0, ey + .2] });
  const n = [5, 3, 1][lod]; const pr = []; for (let k = 0; k <= n; k++) { const v = k / n; pr.push([lerp(eo, -1, v), ey + .2 + 5.2 * (.55 * v + .45 * v * v), 1]); } gb.p1 = PAL.TEAL; ext(gb, pr, -h, h, MAT.TILE);
  gb.p1 = 0; ext(gb, [[-.6, 56.6], [.7, 56.8], [.7, 58], [-.6, 58]], -h, h, MAT.GOLD);
  return gb;
}
// carved white-jade cliff of the terraces: 40 m wide, 58 m tall
export function cliff(lod = 0) {
  const gb = new GB(); const h = 20; gb.p1 = 0;
  const P = [[4.2, 0, .45], [4.2, 2.6, .8], [3.2, 3.2], [3.2, 5.4], [2.4, 6.2, .7], [2.4, 7.6, .8], [.6, 13.2, .5], [.2, 14, .45], [.2, 41, .5], [.6, 42, .5], [2.6, 47.4, .8], [2.6, 49, .9], [3.4, 49.6], [3.4, 52.2], [4.2, 52.8], [4.2, 55.6], [5.0, 56], [5.0, 58], [-2, 58]];
  const M = P.map(() => MAT.JADE); M[5] = MAT.RELIEF; M[9] = MAT.RELIEF; M[14] = MAT.GOLD; M[2] = MAT.JADE; M[12] = MAT.RELIEF;
  if (lod < 2) ext(gb, P, -h, h, M, { vy: true }); else ext(gb, [P[0], P[3], P[6], P[8], P[10], P[13], P[14], P[17], P[18]], -h, h, [MAT.JADE, MAT.RELIEF, MAT.JADE, MAT.RELIEF, MAT.JADE, MAT.GOLD, MAT.JADE, MAT.JADE], { vy: true });
  // waist: three arched, lit niches between gilded pilasters
  for (let i = -1; i <= 1; i++) { const x = i * 13.333; const w = 4.2, y0 = 15.6, ys = 31, z = .5; gb.p2 = 200; gb.p1 = 0; gb.quad([x - w, y0, z], [x + w, y0, z], [x + w, ys, z], [x - w, ys, z], [[0, 0], [2, 0], [2, .8], [0, .8]], MAT.LATTICE, [.8, .8, .65, .65]);
    const n = lod === 0 ? 10 : lod === 1 ? 6 : 3; const c = gb.v(x, ys, z, 0, 0, 1, 1, .8, MAT.LATTICE, .6); const a = []; for (let k = 0; k <= n; k++) { const t = PI * k / n; a.push(gb.v(x + Math.cos(t) * w, ys + Math.sin(t) * w * 1.15, z, 0, 0, 1, 1 + Math.cos(t), .8 + Math.sin(t) * .16, MAT.LATTICE, .5)); } for (let k = 0; k < n; k++) gb.I.push(c, a[k], a[k + 1]); gb.p2 = 0;
    if (lod < 2) { // gilded arch moulding
      const pts = [[x - w - .4, y0, z + .5], [x - w - .4, ys, z + .5]]; for (let k = 1; k < n; k++) { const t = PI - PI * k / n; pts.push([x + Math.cos(t) * (w + .4), ys + Math.sin(t) * (w + .4) * 1.15, z + .5]); } pts.push([x + w + .4, ys, z + .5], [x + w + .4, y0, z + .5]); gb.tube(pts, .55, lod === 0 ? 8 : 5, MAT.GOLD, { up: [0, 0, 1] }); }
    gb.box(x - w - 1, y0 - 1.2, 0, x + w + 1, y0, 2.0, MAT.JADE, { skip: 'n' }); }
  for (let i = 0; i < 3; i++) { const x = -h + 13.333 * (i + .0) + 0; gb.p1 = 7; gb.box(x - 1.5, 14, 0, x + 1.5, 41.4, 1.6, MAT.RELIEF, { skip: 'nbt' }); gb.p1 = 0; gb.box(x - 2, 40.6, 0, x + 2, 42.4, 2.2, MAT.GOLD, { skip: 'n' }); gb.box(x - 2, 13.6, 0, x + 2, 15.2, 2.2, MAT.GOLD, { skip: 'n' }); }
  // dragon-head spouts and balustrade
  if (lod < 2) { for (const x of [-10, 10]) { gb.box(x - .7, 53.2, 4, x + .7, 55, 8.2, MAT.JADE, { tz: .9, skip: 'n' }); gb.box(x - .9, 53.6, 7.4, x + .9, 55.4, 9.2, MAT.JADE, {}); } rail(gb, [-h, 58, 4.2], [h, 58, 4.2], { lod: Math.max(1, lod), h: 3, sp: 5, noEnd: true }); } else ext(gb, [[4.2, 58, .9], [4.2, 61, 1]], -h, h, MAT.JADE);
  return gb;
}
