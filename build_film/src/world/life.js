// Everything that breathes: guards, court, cranes, phoenixes, dragons, apsaras, petals, the Monkey King.
import { m4, v3, clamp, lerp, ss, TAU, PI, mulberry32 } from '../core/math.js';
import { GB, MAT } from '../arch/gb.js';
import * as H from '../arch/heaven.js';
import * as BD from '../life/birds.js';
import * as PP from '../life/people.js';
import * as DR from '../life/dragons.js';
import { LAY } from './world.js';
const face = (p, f, up, s) => { f = v3.norm(f); let x = v3.norm(v3.cross(up, f)); const y = v3.cross(f, x); return m4.basis(v3.mul(x, s), v3.mul(y, s), v3.mul(f, s), p); };
export function petalMesh(N, seed = 3, mat = MAT.PETAL) { const gb = new GB(); const R = mulberry32(seed); for (let i = 0; i < N; i++) { const p = [R(), R(), R()], a = [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1]; const b = gb.nv; gb.p2 = Math.floor(R() * 255); gb.p1 = mat === MAT.EMIT ? 1 : 0; for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { gb.nw = 0; gb.v(p[0], p[1], p[2], a[0], a[1], a[2], u, v, mat); } gb.I.push(b, b + 1, b + 2, b, b + 2, b + 3); } return gb; }
export function populate(W, E, o = {}) {
  const grp = (n, lods, opt) => (W.G[n] = E.group(n, lods.map(g => g.build()), opt)); const G = W.G; const rnd = mulberry32(424242); const L = W.life = {};
  // --- golden guardians at the gate and along the stair
  grp('guard', [PP.guardian(0), PP.guardian(1), PP.guardian(2)], { px: [420, 150], twoSided: true }); L.guards = [];
  const gz = LAY.gateZ, gy = LAY.deckY + 15; const guard = (x, y, z, ry, s) => L.guards.push(E.add(G.guard, m4.trs([x, y, z], ry, s), [rnd(), 0, 2.5, 0]));
  for (const s of [1, -1]) { for (const [x, z] of [[34, 78], [34, 100], [98, 96], [108, 64], [190, 96], [222, 70], [222, 100], [36, -66], [36, -90]]) guard(s * x, gy, gz + z, z < 0 ? PI + (s > 0 ? -.0 : .0) : s * -.18, 7.5); for (let k = 0; k < 4; k++) guard(s * 66, LAY.deckY - 1, gz + 190 + k * 46, s * -PI / 2 * .8, 7.5); }
  for (const s of [1, -1]) for (const z of [1480, 1620, 2080, 2460, 2840, 3220, 3600, 3980, 4360]) guard(s * 60, LAY.deckY, z, s * -PI / 2, 6.5);
  // two colossi keep the gate
  L.colossi = []; for (const s of [1, -1]) L.colossi.push(E.add(G.guard, m4.trs([s * 218, gy, gz + 118], s * -.22, 54), [.37 + s * .1, 0, 2.2, 0]));
  // --- ribbons of auspicious vapour: long silks of light that stream up out of the cloud
  { const rib = (pts, w0, w1, p1, al, seed, tw) => { const gb = new GB(); gb.p1 = p1; gb.p2 = Math.round(al * 255); const nu = 10, nv = 220; const N = pts.length; const g = i => pts[clamp(i, 0, N - 1)]; const C = t => { const x = t * (N - 1), i = Math.min(N - 2, Math.floor(x)), f = x - i; const a = g(i - 1), b = g(i), c = g(i + 1), d = g(i + 2); return [0, 1, 2].map(k => .5 * (2 * b[k] + (c[k] - a[k]) * f + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * f * f + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * f * f * f)); };
      for (let j = 0; j <= nv; j++) { const v = j / nv; const p = C(v), q = C(Math.min(1, v + .004)), r = C(Math.max(0, v - .004)); const t = v3.norm(v3.sub(q, r)); let s = v3.norm(v3.cross(t, [0, 0, 1])); const n = v3.cross(s, t); const a = tw * Math.sin(v * 5 + seed) + .5 * Math.sin(v * 11 + seed * 2); s = v3.add(v3.mul(s, Math.cos(a)), v3.mul(n, Math.sin(a))); const w = 1.9 * lerp(w0, w1, v) * (.6 + .4 * Math.sin(v * 7 + seed)); for (let i = 0; i <= nu; i++) { const u = i / nu - .5; const bow = (u * u - .25) * w * .35; gb.v(p[0] + s[0] * u * w + n[0] * bow, p[1] + s[1] * u * w + n[1] * bow, p[2] + s[2] * u * w + n[2] * bow, n[0], n[1], n[2], i / nu, v, MAT.AURA, 1); } }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; gb.I.push(a, a + 1, b + 1, a, b + 1, b); } return gb.build(); };
    L.ribs = []; const defs = [[[[-500, 60, -700], [-1500, 500, -900], [-1250, 1150, -1300], [-2500, 1700, -1500], [-2500, 2700, -2000], [-4300, 3400, -2600]], 150, 620, 0, .62, 1, .9], [[[620, 60, -800], [1700, 420, -1000], [1600, 1050, -1500], [2750, 1500, -1600], [3000, 2500, -2300], [5000, 3000, -2800]], 150, 620, 1, .55, 4, 1.0], [[[-150, 100, -1500], [-800, 900, -1900], [200, 1800, -2300], [-700, 2600, -2600], [300, 3700, -3000]], 160, 560, 2, .42, 7, 1.2], [[[900, 40, 2400], [1500, 260, 1700], [2300, 520, 1500], [2600, 900, 700], [3600, 1100, 200], [4300, 1700, -900]], 70, 300, 0, .5, 2.4, .8], [[[-1000, 40, 2600], [-1700, 240, 1900], [-2300, 560, 1600], [-2900, 820, 700], [-3600, 1250, 300], [-4700, 1700, -700]], 70, 300, 1, .5, 5.4, .8]];
    defs.forEach((d, i) => { const gr = E.group('rib' + i, [rib(...d)], { anim: 2, cast: false, minPx: 0, twoSided: true, fwd: true }); const it = E.add(gr, m4.ident(), [i * .21, 0, .9, i * .17], [1, 26, 9, .16]); it.r = 1e5; it.c = [0, 1000, 0]; it.vis = false; L.ribs.push(it); }); }
  // --- the court in ranks
  grp('imm', [PP.immortal(0), PP.immortal(1), PP.immortal(2)], { px: [260, 70], minPx: .5, twoSided: true }); const pal = [1, 2, 3, 1, 2, 6, 7, 4, 8]; L.court = [];
  const im = (x, y, z, ry, s, c) => L.court.push(E.add(G.imm, m4.trs([x, y, z], ry, s), [rnd(), rnd() * .5, 1.6, c]));
  // along the avenue, in files facing the hall
  for (let r = 0; r < 150; r++) { const z = 1500 + r * 11; for (const s of [1, -1]) for (let k = 0; k < 4; k++) im(s * (14.5 + k * 6.4) + (rnd() - .5) * .5, LAY.deckY + .1, z + (rnd() - .5) * .5, PI + (rnd() - .5) * .06, 2.5, pal[(k * 2 + (r / 25 | 0)) % pal.length]); }
  // rings on the terraces: the ten thousand saints
  const TR = LAY.TR; const ringOf = (R, y, n, cIdx) => { for (let i = 0; i < n; i++) { const a = (i + .5) / n * TAU; if ([0, 1, 2, 3].some(k => Math.abs(((a - k * PI / 2 + PI) % TAU + TAU) % TAU - PI) < .075)) continue; im(Math.sin(a) * R, y + .2, Math.cos(a) * R, a + PI, 2.6, pal[cIdx % pal.length]); } };
  ringOf(1330, TR[0].y1, 620, 0); ringOf(1320, TR[0].y1, 620, 1); ringOf(1186, TR[1].y1, 560, 2); ringOf(1176, TR[1].y1, 560, 3); ringOf(1056, TR[2].y1, 500, 7); ringOf(1046, TR[2].y1, 500, 4);
  // --- cranes: flocks in slow chevrons on big loops
  grp('crane', [BD.crane(0), BD.crane(1)], { anim: 1, px: [90], minPx: .8, twoSided: true }); L.cranes = [];
  const flock = (path, n, s, v, ph, spread = 6) => { for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, k = (i + 1) >> 1; const it = E.add(G.crane, m4.ident(), [rnd(), 0, 1, rnd()], [4.4 + rnd() * .8, .50, .9, 0]); it.r = s * 3; L.cranes.push({ it, path, off: [side * k * spread * (.9 + .25 * rnd()), (rnd() - .5) * spread * .5, -k * spread * (1.0 + .3 * rnd())], s, v, ph }); } };
  L.flock = flock;
  const loop = (cx, cy, cz, rx, rz, dir = 1, wy = 20) => (d) => { const R = (rx + rz) / 2; const a = dir * d / R; return [cx + Math.sin(a) * rx, cy + wy * Math.sin(a * 2 + 1), cz + Math.cos(a) * rz]; };
  flock(loop(0, 330, 4700, 520, 320, 1, 30), 15, 3.2, 17, 0); flock(loop(0, 240, 4100, 420, 700, -1, 20), 13, 3.2, 17, 900); flock(loop(0, 520, 2500, 1300, 800, 1, 40), 21, 3.4, 19, 2500, 8); flock(loop(0, 900, 300, 1700, 1500, -1, 60), 25, 3.6, 20, 4000, 9); flock(loop(-600, 300, 2900, 500, 500, 1, 20), 11, 3.2, 17, 100); flock(loop(700, 360, 3400, 420, 600, -1, 20), 11, 3.2, 17, 700); flock(loop(2600, 420, 1200, 700, 900, 1, 30), 15, 3.3, 18, 0); flock(loop(-2700, 420, 900, 800, 900, -1, 30), 15, 3.3, 18, 600);
  // --- phoenixes over the long bridges
  grp('phoenix', [BD.phoenix(0), BD.phoenix(1)], { anim: 1, px: [160], minPx: 1, twoSided: true }); L.phx = [];
  const phx = (path, s, v, ph) => { const it = E.add(G.phoenix, m4.ident(), [rnd(), 0, 1, rnd()], [2.7, .42, .6, 0]); it.r = s * 4; L.phx.push({ it, path, off: [0, 0, 0], s, v, ph }); };
  L.phx0 = phx; for (let i = 0; i < 5; i++) phx(loop(0, 150 + i * 16, 4560 - i * 560, 120 + 30 * (i % 2), 190, i % 2 ? 1 : -1, 14), 15, 15, i * 200); for (let i = 0; i < 6; i++) phx(loop(0, 640 + i * 46, 0, 1000 - i * 50, 1000 - i * 50, i % 2 ? 1 : -1, 26), 30, 26, i * 1050);
  // --- apsaras strewing flowers
  grp('aps', [PP.apsara(0), PP.apsara(1), PP.apsara(2)], { px: [300, 90], minPx: 1, twoSided: true }); grp('apsS', [PP.apsaraSilk(0), PP.apsaraSilk(1), PP.apsaraSilk(2)], { px: [420, 130], minPx: 1, anim: 2, twoSided: true }); L.aps = [];
  const aps = (path, s, v, ph, off = [0, 0, 0]) => { const a = E.add(G.aps, m4.ident(), [rnd(), 0, 1.4, 0]), b = E.add(G.apsS, m4.ident(), [rnd(), 0, 1, rnd()], [1, .30, 5.5, 1.5]); a.r = b.r = s * 5; L.aps.push({ it: a, it2: b, path, off, s, v, ph }); };
  L.aps0 = aps; for (let i = 0; i < 14; i++) aps(loop(0, 300 + 22 * (i % 3), 3700, 300 + 40 * (i % 2), 520, 1, 26), 6.5, 9, i * 180 + rnd() * 60); for (let i = 0; i < 18; i++) aps(loop(0, 560 + 30 * (i % 3), 0, 1230, 1230, -1, 22), 9, 11, i * 420 + rnd() * 90);
  // --- two dragons wind about the hall, one rides the cloud sea
  const DL = 64; const dm = [DR.skyMesh(DL, 1, {}), DR.skyMesh(DL, 2, {})]; G.dragon = E.group('dragon', dm, { anim: 4, px: [1400], minPx: 0 }); L.dragons = [];
  const helix = (R, y0, y1, n, turns, dir, wob) => { const P = [], U = []; for (let i = 0; i < n; i++) { const t = i / n, a = dir * t * turns * TAU; const rr = R + wob * Math.sin(t * TAU * 5), y = lerp(y0, y1, .5 - .5 * Math.cos(t * TAU)) + wob * .5 * Math.sin(t * TAU * 7 + 1); P.push([Math.sin(a) * rr, y, Math.cos(a) * rr]); U.push([0, 1, 0]); } return [P, U, true]; };
  const dragon = (P, U, closed, k, v, ph, glow = 2.6) => { const bp = DR.bakePath(P, U, closed); const row = E.addPath(bp); const it = E.add(G.dragon, m4.ident(), [rnd(), 0, glow, DL], [row, 0, k, 0]); it.c = [0, 400, 0]; it.r = 1e5; const d = { it, row, L: bp.L, k, v, ph, closed, len: DL * k }; L.dragons.push(d); return d; };
  L.dragon = dragon; dragon(...helix(1290, 420, 640, 40, 1, 1, 60), 9, 30, 900); dragon(...helix(1180, 820, 1010, 36, 1, -1, 50), 7.5, 28, 2600);
  // --- monkey
  grp('monkey', [PP.monkey(0), PP.monkey(1), PP.monkey(2)], { px: [260, 90], minPx: .5 }); grp('cape', [PP.cape(0), PP.cape(1)], { px: [200], anim: 2, twoSided: true, minPx: .5 }); grp('nimbus', [PP.nimbus(0), PP.nimbus(1), PP.nimbus(2)], { px: [500, 200], minPx: .5, cast: false });
  L.monkey = { a: E.add(G.monkey, m4.ident(), [.2, 0, 1, 0]), b: E.add(G.cape, m4.ident(), [.2, 0, 1, .2], [1, .07, 7, 3.2]), c: E.add(G.nimbus, m4.ident(), [.2, 0, 1, 0]) };
  L.setMonkey = (p, ry, s = 1, show = true, cloud = true) => { const M = m4.trs(p, ry, s); for (const k of ['a', 'b', 'c']) { const it = L.monkey[k]; it.m = M; it.c = m4.pt(M, [0, .8, -.5]); it.r = 3 * s; it.vis = show && (k !== 'c' || cloud); } }; L.setMonkey([0, -9999, 0], 0, 1, false);
  // --- petals and gold dust around the camera
  G.petals = E.group('petals', [petalMesh(o.lite ? 1500 : 5200).build()], { anim: 5, cast: false, minPx: 0, twoSided: true }); L.petal = E.add(G.petals, m4.ident(), [0, 0, 1, 0], [90, 1.6, .16, 1]); L.petal.r = 1e6; L.petal.vis = false;
  G.dust = E.group('dust', [petalMesh(o.lite ? 1500 : 5200, 9, MAT.EMIT).build()], { anim: 5, cast: false, minPx: 0, twoSided: true, fwd: true }); L.dust = E.add(G.dust, m4.ident(), [0, 0, 1, 0], [120, -.5, .05, 1]); L.dust.r = 1e6; L.dust.vis = false;
  const fly = (q, t, bank) => { const d = q.ph + t * q.v; const p = q.path(d), a = q.path(d + 3), b = q.path(d - 3); const f = v3.norm(v3.sub(a, b)); const acc = v3.sub(v3.add(a, b), v3.mul(p, 2)); let up = v3.norm(v3.add([0, 1, 0], v3.mul(acc, bank))); const x = v3.norm(v3.cross(up, f)); const y = v3.cross(f, x); const w = v3.add(p, v3.add(v3.mul(x, q.off[0]), v3.add(v3.mul(y, q.off[1]), v3.mul(f, q.off[2])))); w[1] += Math.sin(t * .9 + q.ph + q.off[0]) * .4 * q.s * .3; const M = face(w, f, up, q.s); q.it.m = M; q.it.c = w; if (q.it2) { q.it2.m = M; q.it2.c = w; } };
  L.update = (t) => { for (const q of L.cranes) fly(q, t, 5); for (const q of L.phx) fly(q, t, 4); for (const q of L.aps) fly(q, t, 2); for (const d of L.dragons) { const s = d.ph + t * d.v; d.it.ext[1] = d.closed ? d.len + (((s) % (d.L - d.len)) + (d.L - d.len)) % (d.L - d.len) : s; d.it.ext[3] = 0; } };
  L.show = (o = {}) => { for (const q of L.cranes) q.it.vis = o.cranes !== false; for (const q of L.phx) q.it.vis = o.phx !== false; for (const q of L.aps) q.it.vis = q.it2.vis = o.aps !== false; for (const d of L.dragons) d.it.vis = o.dragons !== false; for (const i of L.court) i.vis = o.court !== false; for (const i of L.guards) i.vis = o.guards !== false; for (const i of L.colossi) i.vis = o.colossi !== false; for (const i of L.ribs) { i.vis = !!o.ribs; i.dat[2] = o.ribs === true ? 2.6 : (o.ribs || 0); } L.petal.vis = !!o.petals; L.dust.vis = !!o.dust; };
  L.update(0); return L;
}
