// Layout of heaven: 33 palaces, 72 halls, the jade mountain, the axis, the South Gate, the isles.
import { m4, v3, clamp, lerp, ss, TAU, PI, DEG, mulberry32 } from '../core/math.js';
import { GB, MAT } from '../arch/gb.js';
import * as B from '../arch/buildings.js';
import * as H from '../arch/heaven.js';
import * as H2 from '../arch/heaven2.js';
import { rail, stairs } from '../arch/parts.js';
import * as DR from '../life/dragons.js';

export const LAY = { TR: [{ r: 1350, y0: 56, y1: 116 }, { r: 1200, y0: 116, y1: 174 }, { r: 1070, y0: 174, y1: 230 }], base: 50, R: [1150, 1030, 920, 815, 715, 620, 530, 450, 380], topY: 860, altarY: 902, palR: 1850, palN: 32, hallR: 2700, hallN: 72, gateZ: 5200, deckY: 60, sunT: 4300, ecl: 23.5 * DEG };
export function buildWorld(E, o = {}) {
  const L = (f) => [0, 1, 2].map(l => f(l).build()); const one = f => [f().build()];
  const t0 = performance.now(); const W = { E, G: {}, dyn: {} }; const g = W.G; const rnd = mulberry32(20261124);
  const grp = (n, lods, opt) => (g[n] = E.group(n, lods, opt)); const I = m4.ident();
  grp('bay', L(H2.bay), { px: [300, 60] }); grp('cliff', L(H2.cliff), { px: [300, 60] });
  grp('hall', L(l => B.hall({ lod: l, tiers: 1, W: 56, D: 30, nx: 9, nz: 5 })), { px: [480, 120] });
  grp('hallB', L(l => B.hall({ lod: l, tiers: 2, W: 66, D: 36, nx: 11, nz: 5, eaves: 3, roof: 'hip' })), { px: [480, 130] });
  grp('hallX', L(l => B.hall({ lod: l, tiers: 1, W: 44, D: 28, nx: 7, nz: 4, roof: 'xie' })), { px: [420, 110] });
  grp('tower3', L(l => B.tower({ lod: l, floors: 3 })), { px: [420, 110] });
  grp('tower5', L(l => B.tower({ lod: l, floors: 5, W: 24, shrink: .88 })), { px: [480, 130] });
  grp('pagoda', L(l => H.pagoda(l)), { px: [520, 150] });
  grp('pav', L(H.pavilion), { px: [260, 60] });
  grp('mega', L(H.megaHall), { px: [700, 260], shBias: 0 }); grp('mbr', [0, 1].map(l => H.megaBracket(l).build()), { px: [60] }); grp('dormer', L(H.dormer), { px: [300, 90] }); grp('cluster', L(H.cluster), { px: [620, 240], shBias: 0 });
  for (let i = 0; i < 5; i++) { grp('peak' + i, L(l => H.mount(3 + i * 5, l, { n: 4 + (i % 3) })), { px: [420, 130] }); } for (let i = 0; i < 3; i++) grp('mesa' + i, L(l => H.mesa(21 + i * 4, l)), { px: [420, 130] });
  grp('avenue', L(H.avenue), { px: [420, 90] });
  grp('sky', L(l => H.skybridge(l, 80, 14, 9)), { px: [300, 70] });
  grp('corr', L(l => B.corridor({ lod: l, n: 18, L: 4 })), { px: [420, 110] });
  grp('lotus', L(H.lotus), { px: [700, 220] });
    for (let i = 0; i < 2; i++) { grp('pine' + i, L(l => H.pine(5 + i * 3, l)), { px: [150, 46], minPx: 1.2, twoSided: true }); grp('blos' + i, L(l => H.blossom(9 + i, l, 1 + i)), { px: [150, 46], minPx: 1.2, twoSided: true }); if (i) grp('osm', L(l => H.osmanthus(5, l)), { px: [300, 90], minPx: 1.2, twoSided: true }); }
  grp('lamp', one(H.lamp), { minPx: 1 }); grp('huabiao', L(H.huabiao), { px: [160, 40] }); grp('falls', one(() => H.falls(8, 28)), { twoSided: true, cast: false, fwd: true });
  grp('gate', L(H.southGate), { px: [900, 300], shBias: 0 }); grp('que', L(H.que), { px: [420, 150] }); grp('pillar', L(H.pillar), { px: [300, 90] }); grp('leaf', one(H.doorLeaf), {});
  grp('sun', [H.sphere(MAT.SUN).build()], { cast: false }); grp('moon', [H.sphere(MAT.MOON).build()], { cast: false });

  const add = (n, m, dat, ext) => E.add(g[n], m, dat || [rnd(), rnd(), 1, 0], ext);
  const polar = (r, a, y = 0) => [Math.sin(a) * r, y, Math.cos(a) * r];
  const mounds = []; const mound = (x, z, r, h) => mounds.push([x, z, r, h]);

  // --- the great hall on its mountain ----------------------------------------
  const ax = (a, w) => [0, 1, 2, 3].some(k => { let d = Math.abs(((a - k * PI / 2 + PI) % TAU + TAU) % TAU - PI); return d < w; });
  const ringWall = (nm, R, y, sy, gap) => { const n = Math.round(TAU * R / 40), sx = 2 * R * Math.tan(PI / n) / 40 * 1.002; for (let i = 0; i < n; i++) { const a = (i + .5) / n * TAU; if (gap && ax(a, Math.asin(gap / R))) continue; add(nm, m4.trs(polar(R, a, y), a, [sx, sy, 1])); } };
  const TR = LAY.TR; TR.forEach((T, k) => { ringWall('cliff', T.r, T.y0, (T.y1 - T.y0) / 58, 70); const r1 = k < TR.length - 1 ? TR[k + 1].r - 8 : 700; E.add(E.group('tfloor' + k, [H.ringFloor(T.r + 2, r1, T.y1, 512, MAT.FLOOR, 1).build()]), I); });
  grp('gLotus', [0, 1, 2].map(l => H.greatLotus(l).build()), { px: [1500, 500], minPx: 0, shBias: 1 }); E.add(g.gLotus, m4.trs([0, 60, 0], 0, 1420), [.4, .2, 1, 0]); E.add(E.group('skirtFloor', [H.ringFloor(1400, 1330, 58, 512, MAT.FLOOR, 1).build()]), I);
  { const gb = new GB(); for (let k = 0; k < TR.length; k++) { const T = TR[k]; stairsN(gb, { w: 120, y0: T.y0 + (k ? 0 : 2), y1: T.y1 + .3, z0: T.r - 26, z1: T.r + (T.y1 - T.y0) * 1.75, n: 110, low: T.y0 - 8 }); } const G2 = E.group('tianti', [gb.build()]); for (let k = 0; k < 4; k++) E.add(G2, m4.trs([0, 0, 0], k * PI / 2)); }
  E.add(E.group('megaCore', [(() => { const gb = new GB(); H.MEGA.S.forEach(s => { gb.lathe([[s.r - 10, s.y - 4], [s.r - 10, s.y + s.h + 60]], 96, MAT.WOOD, {}); gb.lathe([[s.r + 70, s.y - 14], [s.r + 70, s.y], [s.r - 10, s.y]], 192, [MAT.JADE, MAT.FLOOR], { vy: true, ur: s.r }); }); return gb.build(); })()]), I);
  const mega = E.add(g.mega, I, [.3, 0, 1, 0]); W.mega = mega;
  H.MEGA.S.forEach((s, e) => { const rows = [4, 3, 3][e]; for (let j = 0; j < rows; j++) ringWall('bay', s.r, s.y + j * s.h / rows, s.h / rows / 58, 0); const bh = H.MEGA.bh[e], rb = s.r + 34; const n = s.cols * 3; for (let k = 0; k < n; k++) { const a = (k + .5) / n * TAU; add('mbr', m4.trs(polar(rb - 2, a, s.y + s.h + 3), a, bh / 46)); }
    // dormers on the great roofs
    const { y0 } = H.megaRoof(s, bh); const ris = v => .5 * v + .5 * Math.pow(v, 2.25); const rings = e === 2 ? [[.17, 24, .9], [.40, 16, .72]] : [[.30, e === 0 ? 36 : 30, 1.0]]; for (const [v, m, sc] of rings) for (let k = 0; k < m; k++) { const a = (k + .5) / m * TAU; add('dormer', m4.trs(polar(lerp(s.r0, s.r1, v), a, y0 + s.H * ris(v) + 14), a, sc)); } });
  for (let d = 0; d < 4; d++) { const a = PI / 4 + d * PI / 2; add('cluster', m4.trs(polar(1010, a, TR[2].y1 + 34), a, 1), [.3, 0, 1, 0]); }
  // south, east, north, west porches as two-storeyed gates
  for (let d = 0; d < 4; d++) { const a = d * PI / 2; add('hallB', m4.trs(polar(872, a, TR[2].y1), a, 1.9)); }
  // life on the terraces
  TR.forEach((T, k) => { const r1 = k < TR.length - 1 ? TR[k + 1].r : 1010; const mid = (T.r + r1) / 2; const n = [72, 60, 36][k]; for (let i = 0; i < n; i++) { const a = (i + .5) / n * TAU; if (ax(a, .105)) continue; if (k === 2 && [0, 1, 2, 3].some(d => Math.abs(((a - PI / 4 - d * PI / 2 + PI) % TAU + TAU) % TAU - PI) < .16)) continue; const t = (i * 5 + k * 3) % 8; const nm = ['tower5', 'hallX', 'pav', 'hall', 'tower3', 'hallX', 'tower5', 'hall'][t]; const big = nm === 'hall' ? .95 : nm === 'pav' ? 1.6 : .95 + .2 * rnd(); add(nm, m4.trs(polar(mid + (nm === 'pav' ? 20 : -6), a, T.y1), a, big)); for (let q = 0; q < 3; q++) { const aa = a + (rnd() - .5) * TAU / n, rr = mid + (rnd() - .5) * 120; add(rnd() < .62 ? 'pine' + (rnd() * 2 | 0) : 'blos' + (rnd() * 2 | 0), m4.trs(polar(rr, aa, T.y1), rnd() * 6, 1.1 + rnd() * 1.1)); } } });
  // cloud banked against the foot of the terraces
  for (let i = 0; i < 56; i++) { const a = (i + .5) / 56 * TAU; if (ax(a, .10)) continue; const p = polar(1478 + 26 * Math.sin(i * 2.3), a); mound(p[0], p[2], 120 + 30 * Math.sin(i * 1.7), .20 + .07 * Math.sin(i * 2.9)); }
  for (let i = 0; i < 16; i++) { const a = (i + .5) / 16 * TAU + .05; add('falls', m4.trs(polar(1372, a, 62), a, [34, 360, 90]), [rnd(), 0, 1, 0], [34, 360, 0, 0]); }
  mound(0, 0, 1560, .05);
  // --- axis ---------------------------------------------------------------
  for (let k = 0; k < 4; k++) { const a = k * PI / 2; const zEnd = k === 0 ? 5060 : 3300; for (let z = 1440; z < zEnd; z += 100) add('avenue', m4.mul(m4.trs([0, 0, 0], a), m4.trs([0, LAY.deckY, z + 50]))); }
  const plat = []; for (let i = 0; i < 9; i++) plat.push(1700 + i * 380); W.plat = plat;
  for (const z of plat) { add('lotus', m4.trs([0, LAY.deckY + .4, z], 0, [128, 128, 128]), [rnd(), rnd(), 1, 55.5]); mound(0, z, 260, -.06);
    for (const s of [1, -1]) { for (const dz of [-62, 62]) add('huabiao', m4.trs([s * 74, LAY.deckY + .4, z + dz], s > 0 ? PI / 2 : -PI / 2, 1.15)); add('pav', m4.trs([s * 98, LAY.deckY + .4, z], s * -PI / 2, 1.5)); for (let q = 0; q < 2; q++) add('blos' + (q), m4.trs([s * (88 + q * 14), LAY.deckY, z + (q ? 34 : -34)], rnd() * 6, 1.5)); } }
  for (let z = 1540; z < 5050; z += 40) for (const s of [1, -1]) add('lamp', m4.trs([s * 48, LAY.deckY, z], 0, 1.25), [rnd(), 0, 1, 0]);

  // --- thirty-three palaces: 1 + 32 on lotuses ------------------------------
  const palace = (a, r, y, s, i) => { const M = m4.mul(m4.trs(polar(r, a, y), a), m4.trs([0, 0, 0], 0, s)); const P = (n, x, yy, z, ry, sc) => add(n, m4.mul(M, m4.trs([x, yy, z], ry, sc)));
    P('lotus', 0, 0, 0, 0, [132, 132, 132]); const t = i % 4; 
    if (t === 0) { P('hallB', 0, 0, -6, 0, 1.18); P('tower5', -82, 0, -22, 0, 1); P('tower5', 82, 0, -22, 0, 1); } else if (t === 1) { P('pagoda', 0, 0, -40, 0, .62); P('hall', 0, 0, 34, 0, .9); P('tower3', -78, 0, 0, 0, 1); P('tower3', 78, 0, 0, 0, 1); } else if (t === 2) { P('hallB', 0, 0, 4, 0, 1.1); P('hallX', -74, 0, -18, PI / 5, .8); P('hallX', 74, 0, -18, -PI / 5, .8); P('tower5', 0, 0, -84, 0, .95); } else { P('tower5', 0, 0, -10, 0, 1.75); P('hallX', -70, 0, 14, PI / 4, .8); P('hallX', 70, 0, 14, -PI / 4, .8); }
    for (let q = 0; q < 10; q++) { const aa = rnd() * TAU, rr = 92 + rnd() * 22; P(rnd() < .55 ? 'pine' + (q & 1) : 'blos0', Math.sin(aa) * rr, 0, Math.cos(aa) * rr, rnd() * 6, .9 + rnd() * .6); } for (const s2 of [1, -1]) P('pav', s2 * 46, 0, 84, 0, 1); };
  W.pal = []; for (let i = 0; i < LAY.palN; i++) { let a = (i + .5) / LAY.palN * TAU; { const q = PI / 2; const d = a - Math.round(a / q) * q; a += .062 * Math.exp(-((d / .19) ** 2)) * Math.sign(d); } const y = 120 + 34 * Math.sin(i * 2.4) + (i % 2) * 40; palace(a, LAY.palR, y, 1.12, i); W.pal.push([a, y]); mound(...[polar(LAY.palR, a)[0], polar(LAY.palR, a)[2]], 210, .10); }
  for (let i = 0; i < LAY.palN; i++) { const A = W.pal[i], Bb = W.pal[(i + 1) % LAY.palN]; if (ax((A[0] + (i + 1 === LAY.palN ? TAU : 0) + PI / LAY.palN) % TAU, .02)) { } const pa = polar(LAY.palR, A[0], A[1]), pb = polar(LAY.palR, Bb[0], Bb[1]); const d = v3.sub(pb, pa), l = Math.hypot(d[0], d[2]); const gap = l - 2 * 132 * 1.12 * .95; const dir = v3.mul(d, 1 / l); const p0 = v3.mad(pa, dir, 132 * 1.12 * .95), p1 = v3.mad(pb, dir, -132 * 1.12 * .95); const mid = v3.mul(v3.add(p0, p1), .5); const len = v3.dist(p0, p1); const zz = v3.norm(v3.sub(p1, p0)); const xx = v3.norm(v3.cross([0, 1, 0], zz)); const yy = v3.cross(zz, xx); const s = len / 80; add('sky', m4.basis(xx, yy, v3.mul(zz, s), mid)); }

  // --- seventy-two halls on blue-green rocks, linked by the covered gallery ----
  W.h72 = []; for (let i = 0; i < LAY.hallN; i++) { const a = (i + .5) / LAY.hallN * TAU; const y = 92 + 22 * Math.sin(i * 1.7) + 14 * Math.sin(i * .6); const p = polar(LAY.hallR, a, y); W.h72.push([a, y]); add('lotus', m4.trs([p[0], p[1] + .2, p[2]], a, [86, 86, 86])); const nm = ['hall', 'hallX', 'tower3', 'hallB', 'hallX', 'tower5'][i % 6]; add(nm, m4.trs([p[0], p[1] + .2, p[2]], a, nm === 'hallB' ? .86 : 1)); for (let q = 0; q < 8; q++) { const aa = rnd() * TAU, rr = 54 + rnd() * 24; add(rnd() < .7 ? 'pine' + (q & 1) : 'blos' + (q & 1), m4.trs([p[0] + Math.sin(aa) * rr, p[1], p[2] + Math.cos(aa) * rr], rnd() * 6, .9 + rnd() * .6)); } mound(p[0], p[2], 130, .16); if (i % 3 === 1) { const out = polar(LAY.hallR + 84, a, y); add('falls', m4.trs([out[0], y - 1, out[2]], a, [16, 190, 60]), [rnd(), 0, 1, 0], [16, 190, 0, 0]); } }
  for (let i = 0; i < LAY.hallN; i++) { const A = W.h72[i], Bb = W.h72[(i + 1) % LAY.hallN]; const pa = polar(LAY.hallR, A[0], A[1]), pb = polar(LAY.hallR, Bb[0], Bb[1]); const zz0 = v3.norm(v3.sub(pb, pa)); const p0 = v3.mad(pa, zz0, 74), p1 = v3.mad(pb, zz0, -74); const len = v3.dist(p0, p1); const zz = v3.norm(v3.sub(p1, p0)); const xx = v3.norm(v3.cross([0, 1, 0], zz)); const yy = v3.cross(zz, xx); add('corr', m4.basis(v3.mul(zz, len / 72), yy, v3.mul(xx, -1), v3.add(v3.mul(v3.add(p0, p1), .5), [0, .5, 0]))); }
  // diagonal radial bridges
  for (let d = 0; d < 4; d++) { const a = PI / 4 + d * PI / 2; for (let k = 0; k < 18; k++) { const r = 1260 + k * 80; const p = polar(r, a, lerp(62, 92, k / 17)); add('sky', m4.trs(p, a, [1.4, 1, 1])); if (k % 3 === 2) { add('lotus', m4.trs(polar(r + 40, a, lerp(62, 92, k / 17) + .1), k, [30, 30, 30])); add('pav', m4.trs(polar(r + 40, a, lerp(62, 92, k / 17)), a, 1.4)); } } }

  // --- sun and moon terraces ------------------------------------------------
  for (const s of [1, -1]) { const gb = new GB(); B.altar(gb, { R: 210, tiers: 3, h: 12, step: 34, y0: 0, lod: 1, stairW: 50, railH: 2.4, railSp: 5 }); const G3 = E.group('tan' + s, [gb.build()]); E.add(G3, m4.trs([s * LAY.sunT, 70, 0])); add('lotus', m4.trs([s * LAY.sunT, 70, 0], s, [318, 318, 318])); for (let k = 0; k < 10; k++) add('avenue', m4.mul(m4.trs([0, 0, 0], s * PI / 2), m4.trs([0, LAY.deckY, 3350 + k * 100]))); mound(s * LAY.sunT, 0, 480, .14);
    const top = 106, X = s * LAY.sunT; if (s < 0) { add('hallB', m4.trs([X - 16, top, 0], PI / 2, 1.05), [.4, .2, 2.2, 4]); for (const q of [1, -1]) add('tower3', m4.trs([X - 34, top, q * 66], PI / 2, .86), [.4, .2, 2.2, 4]); add('osm', m4.trs([X + 102, top, -23], .6, 3.6), [.5, .9, 1, 0]); for (const [dx, dz, sc] of [[-20, 96, 2.2], [44, 86, 1.5]]) add('blos1', m4.trs([X + dx, top, dz], dz, sc), [.5, .9, 1, 0]); }
    else { add('pagoda', m4.trs([X, top, 0], 0, .62), [.4, .2, 2.2, 1]); for (const [dx, dz, sc] of [[-60, 40, 3.2], [-50, -56, 2.6], [52, 50, 2.4], [56, -48, 2.8]]) add('pine0', m4.trs([X + dx, top, dz], dz, sc)); }
    for (let k = 0; k < 40; k++) { const a = (k + .5) / 40 * TAU; if (k % 2 === 0) add('lamp', m4.trs([X + Math.sin(a) * 124, top, Math.cos(a) * 124], a, .62), [rnd(), 0, 1, 0]); else rnd(); add('lamp', m4.trs([X + Math.sin(a) * 196, 82, Math.cos(a) * 196], a, 1.3), [rnd(), 0, 1, 0]); } }

  // --- South Gate ----------------------------------------------------------
  add('gate', m4.trs([0, LAY.deckY - 1, LAY.gateZ]), [.2, 0, 1, 0]); for (const s of [1, -1]) { add('que', m4.mul(m4.trs([s * 262, LAY.deckY + 15, LAY.gateZ + 10]), m4.trs([0, 0, 0], s > 0 ? 0 : 0, [s > 0 ? 1 : 1, 1, 1])), [.3, 0, 1, 0]); }
  W.pillars = [[-66, LAY.gateZ + 104], [66, LAY.gateZ + 104], [-150, LAY.gateZ + 112], [150, LAY.gateZ + 112]]; for (const [x, z] of W.pillars) add('pillar', m4.trs([x, LAY.deckY + 15, z]), [.5, 0, 1, 0]);
  W.setDoors = (th) => { const y = LAY.deckY - 1 + H.GATE.pod, z = LAY.gateZ + 10; W.leaves.forEach((l, i) => { l.m = i ? m4.trs([H.GATE.ow / 2, y, z], PI - th) : m4.trs([-H.GATE.ow / 2, y, z], th); l.c = m4.pt(l.m, g.leaf.bounds.c); }); };
  W.leaves = [add('leaf', I), add('leaf', I)]; W.setDoors(1.35);
  add('lotus', m4.trs([0, LAY.deckY - 13, LAY.gateZ], 0, [470, 210, 330]), [rnd(), .1, 1, 55.5]); mound(0, LAY.gateZ, 620, .05);
  for (const [x, z] of W.pillars) add('lotus', m4.trs([x, LAY.deckY + 15 + H.PIL.H + 1, z], 0, [22, 26, 22]));
  // the red-bearded dragons with golden scales
  { const mk = (o) => [DR.coil(o).build()]; const k = 5.5; grp('coilL', mk({ k, hand: 1, psi: .95 }), {}); grp('coilR', mk({ k, hand: -1, psi: -.95 }), {}); grp('coilL2', mk({ k, hand: -1, psi: .55, y1: 120, turns: 2.9 }), {}); grp('coilR2', mk({ k, hand: 1, psi: -.55, y1: 120, turns: 2.9 }), {});
    W.pillars.forEach(([x, z], i) => add(['coilL', 'coilR', 'coilL2', 'coilR2'][i], m4.trs([x, LAY.deckY + 15, z]), [.5, 0, 2.2, 0]));
    grp('relL', [DR.relief({ dir: -1 }).build()], {}); grp('relR', [DR.relief({ dir: 1, seed: 2 }).build()], {});
    const y = LAY.deckY - 1 + H.GATE.pod + 19, zf = H.GATE.D / 2 + 1.0; for (const n of [1, -1]) for (const [x, r] of [[-184, 'relR'], [-75, 'relR'], [75, 'relL'], [184, 'relL']]) { const M = m4.mul(m4.trs([0, 0, LAY.gateZ], n > 0 ? 0 : PI), m4.trs([x, y, zf + 1.2])); add(r, M, [.3, 0, 1.4, 0]); }
    grp('knock', [DR.knocker().build()], {}); const set0 = W.setDoors; W.knocks = [add('knock', I, [.3, 0, 1.6, 0]), add('knock', I, [.3, 0, 1.6, 0])]; W.setDoors = (th) => { set0(th); W.knocks.forEach((q, i) => { q.m = W.leaves[i].m; q.c = W.leaves[i].c; }); }; W.setDoors(1.35); }
  // southern approach beyond the gate
  for (let z = LAY.gateZ + 175; z < LAY.gateZ + 1400; z += 100) add('avenue', m4.trs([0, LAY.deckY - 1, z + 50]));
  for (let z = LAY.gateZ + 190; z < LAY.gateZ + 1400; z += 40) for (const s of [1, -1]) add('lamp', m4.trs([s * 48, LAY.deckY - 1, z], 0, 1.25), [rnd(), 0, 1, 0]);

  // --- outer isles ---------------------------------------------------------
  const isles = []; const tryIsle = (x, z, y, r, k) => { isles.push([x, z, r]); const toC = Math.atan2(-x, -z) + PI; const tall = k >= 2; 
    if (tall) { const skip = z > 4600 && Math.abs(x) < 2300; const h = 140 + r * 2.5; for (let q = 0; q < 2 + (r / 80 | 0); q++) { const a = rnd() * TAU, rr = q ? r * (.8 + rnd() * .7) : 0, hh = h * (q ? .35 + rnd() * .45 : 1); const nm = 'peak' + (rnd() * 5 | 0), ry = rnd() * 6, sd = rnd(); if (!skip) add(nm, m4.trs([x + Math.sin(a) * rr, 0, z + Math.cos(a) * rr], ry, [hh * .95, hh, hh * .95]), [sd, 0, 1, 1]); } if (skip) return; }
    else { const top = 70 + rnd() * 130; const L1 = Math.min(150, 60 + r * .5); const lot = (lx, lz, ly, lr, nm, sc) => { add('lotus', m4.trs([lx, ly, lz], rnd() * 6, [lr, lr, lr])); add(nm, m4.trs([lx, ly + .2, lz], toC + (rnd() - .5) * .4, sc)); const nt = Math.round(lr / 9); for (let q = 0; q < nt; q++) { const a = rnd() * TAU, rr = lr * (.66 + .22 * rnd()); add(rnd() < .6 ? 'pine' + (q & 1) : 'blos' + (q & 1), m4.trs([lx + Math.sin(a) * rr, ly, lz + Math.cos(a) * rr], rnd() * 6, 1 + rnd() * .9)); } }; const t = rnd(); lot(x, z, top, L1, t < .3 ? 'pagoda' : t < .6 ? 'tower5' : 'hallB', Math.min(1.1, L1 / 92)); const cap = r > 130 ? 3 : r > 80 ? 2 : 0; for (let q = 0; q < cap; q++) { const a = rnd() * TAU + q * 2.1, rr = L1 * 1.36 + 80; lot(x + Math.sin(a) * rr, z + Math.cos(a) * rr, top - 20 - rnd() * 50, 52 + rnd() * 20, rnd() < .5 ? 'hallX' : 'tower3', .8); } if (rnd() < .4) { const a = rnd() * TAU; add('falls', m4.trs([x + Math.sin(a) * L1 * .97, top - 1, z + Math.cos(a) * L1 * .97], a, [L1 * .12, top + 120, L1 * .3]), [rnd(), 0, 1, 0], [L1 * .12, top + 120, 0, 0]); } }
    mound(x, z, tall ? r * 2.4 : r * 1.3, tall ? .24 : .10); };
  let tries = 0; while (isles.length < 84 && tries++ < 6000) { const a = rnd() * TAU, r = 3250 + Math.pow(rnd(), 1.4) * 6200; const x = Math.sin(a) * r, z = Math.cos(a) * r; const R = 46 + Math.pow(rnd(), 2.2) * 240; if (z > 0 && Math.abs(x) < 560 + R) continue; if (Math.abs(x) < 320 + R && Math.abs(z) < 4000) continue; if (Math.abs(z) < 420 + R && Math.abs(x) < 4900) continue; if (isles.some(q => Math.hypot(q[0] - x, q[1] - z) < q[2] + R + 90)) continue; tryIsle(x, z, 50 + Math.pow(rnd(), 1.7) * 520, R, r > 5400 ? (rnd() < .62 ? 2 : 0) : 0); }
  // symmetric sentinels along the southern axis
  for (const s of [1, -1]) { for (const [x, z, y, r, k] of [[640, 3360, 150, 118, 0], [980, 4050, 260, 140, 1], [520, 4440, 96, 84, 2]]) { add('lotus', m4.trs([s * x, y, z], s * 1.3, [r, r, r])); add(k === 1 ? 'pagoda' : 'tower5', m4.trs([s * x, y + .2, z], 0, k === 1 ? 1.05 : k ? 1.15 : 1.6)); mound(s * x, z, r * 1.5, .08); for (let q = 0; q < 14; q++) { const a = rnd() * TAU, rr = r * (.70 + .18 * rnd()); add(q % 4 ? 'pine' + (q & 1) : 'blos0', m4.trs([s * x + Math.sin(a) * rr, y, z + Math.cos(a) * rr], rnd() * 6, 1.2)); } add('falls', m4.trs([s * (x - r * .96), y - 1, z + r * .25], -s * PI / 2, [r * .14, y + 150, r * .4]), [rnd(), 0, 1, 0], [r * .14, y + 150, 0, 0]); } }
  // the armillary rings: the prime vertical stands behind the hall like a nimbus; the ecliptic dips beneath heaven and carries the sun
  g.armA = E.group('armA', [H.armRing(2350, 96, 44, { lodges: true, lamps: 168 }).build()], { minPx: 0 }); g.armB = E.group('armB', [H.armRing(3920, 70, 34, { lamps: 168 }).build()], { minPx: 0 });
  W.armA = E.add(g.armA, m4.trs([0, 1180, -420], 0, 1, PI / 2), [.3, 0, 1, 0]); W.armB = E.add(g.armB, m4.trs([0, 300, 0], 0, 1, LAY.ecl), [.3, 0, 1, 0]);
  // dynamic bodies
  W.sun = E.add(g.sun, I, [0, 0, 20, 0]); W.moon = E.add(g.moon, I, [0, 0, 1, 0]); W.sun.r = W.moon.r = 1e6; 
  // mound map
  const N = 1024, ext = 24000, a = new Float32Array(N * N); for (const [x, z, r, h] of mounds) { const px = (x / ext + .5) * N, pz = (z / ext + .5) * N, pr = r / ext * N; const x0 = Math.max(0, Math.floor(px - pr * 2.6)), x1 = Math.min(N - 1, Math.ceil(px + pr * 2.6)), z0 = Math.max(0, Math.floor(pz - pr * 2.6)), z1 = Math.min(N - 1, Math.ceil(pz + pr * 2.6)); for (let j = z0; j <= z1; j++) for (let i = x0; i <= x1; i++) { const d2 = ((i - px) ** 2 + (j - pz) ** 2) / (pr * pr); const v = h * Math.exp(-d2); if (h > 0) a[j * N + i] = Math.max(a[j * N + i], 0) < v ? Math.max(a[j * N + i], v) : a[j * N + i]; else a[j * N + i] += v; } }
  E.setMound(a, N); W.ms = performance.now() - t0; return W;
}
// long stair with explicit step count
function stairsN(gb, o) {
  const { w, y0, y1, z0, z1, n } = o; const low = o.low ?? -60; gb.p1 = 0; const rw = w * .26; const fl = (xa, xb) => { for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; const ya = lerp(y1, y0, t0), yb = lerp(y1, y0, t1), za = lerp(z0, z1, t0), zb = lerp(z0, z1, t1); gb.quad([xa, yb, zb], [xb, yb, zb], [xb, yb, za], [xa, yb, za], [[xa, zb], [xb, zb], [xb, za], [xa, za]], MAT.JADE, [1, 1, .72, .72]); gb.quad([xa, yb, za], [xb, yb, za], [xb, ya, za], [xa, ya, za], [[xa, yb], [xb, yb], [xb, ya], [xa, ya]], MAT.JADE, [.65, .65, .95, .95]); } };
  fl(-w / 2, -rw / 2); fl(rw / 2, w / 2); const Ls = Math.hypot(y1 - y0, z1 - z0); gb.p1 = 1; gb.quad([-rw / 2, y0 + .8, z1], [rw / 2, y0 + .8, z1], [rw / 2, y1 + .8, z0], [-rw / 2, y1 + .8, z0], [[-rw / 2, 0], [rw / 2, 0], [rw / 2, Ls], [-rw / 2, Ls]], MAT.RELIEF, 1); gb.p1 = 0;
  for (const s of [1, -1]) { gb.quad(...[[s * (rw / 2), y0 + .9, z1], [s * (rw / 2 + 1.2), y0 + .9, z1], [s * (rw / 2 + 1.2), y1 + .9, z0], [s * (rw / 2), y1 + .9, z0]].slice(0).sort(() => 0), [[0, 0], [1, 0], [1, 1], [0, 1]], MAT.GOLD, 1, v3.norm([0, z1 - z0, y1 - y0])); }
  for (const s of [1, -1]) { const x2 = s * (w / 2 + 5), x = s * w / 2; const segs = 40; for (let i = 0; i < segs; i++) { const t0 = i / segs, t1 = (i + 1) / segs; const za = lerp(z1, z0, t0), zb = lerp(z1, z0, t1), ya = lerp(y0, y1, t0) + 1, yb = lerp(y0, y1, t1) + 1; const q = [[x2, low, za], [x2, low, zb], [x2, yb, zb], [x2, ya, za]]; gb.quad(...(s > 0 ? q : [q[1], q[0], q[3], q[2]]), [[za, -60], [zb, -60], [zb, yb], [za, ya]], MAT.JADE, .95); const g0 = [[x2 + s * .3, ya - 3, za], [x2 + s * .3, yb - 3, zb], [x2 + s * .3, yb - 1.4, zb], [x2 + s * .3, ya - 1.4, za]]; gb.quad(...(s > 0 ? g0 : [g0[1], g0[0], g0[3], g0[2]]), [[0, 0], [1, 0], [1, 1], [0, 1]], MAT.GOLD, 1); } const t = [[x, y0 + 1, z1], [x2, y0 + 1, z1], [x2, y1 + 1, z0], [x, y1 + 1, z0]]; gb.quad(...(s > 0 ? t : [t[1], t[0], t[3], t[2]]), [[0, 0], [1, 0], [1, 1], [0, 1]], MAT.JADE, 1); rail(gb, [s * (w / 2 + 2.4), y1 + 1, z0], [s * (w / 2 + 2.4), y0 + 1, z1], { lod: 1, h: 3.4, sp: 7 }); rail(gb, [s * rw / 2 + s * 1.2, y1 + .5, z0], [s * rw / 2 + s * 1.2, y0 + .5, z1], { lod: 1, h: 2.4, sp: 7 }); }
}
