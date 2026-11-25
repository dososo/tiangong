// Where the dragons live: coiled on the pillars, in glazed relief on the gate, as knockers on its doors, and one in the open sky.
import { GB, MAT } from '../arch/gb.js';
import { m4, v3, clamp, lerp, ss, TAU, PI, mulberry32 } from '../core/math.js';
import { GATE, PIL } from '../arch/heaven.js';
import * as D from './dragon.js';

// path through points ordered head -> tail. ups: one per point. returns f(s) for canonical distance s (scaled by k)
export function splinePath(pts, ups, k, n = 1400) {
  const N = pts.length; const g = (A, i) => A[clamp(i, 0, N - 1)]; const cr = (A, i, t) => { const p0 = g(A, i - 1), p1 = g(A, i), p2 = g(A, i + 1), p3 = g(A, i + 2); const t2 = t * t, t3 = t2 * t; return [0, 1, 2].map(c => .5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3)); };
  const S = [], P = [], U = []; let L = 0; for (let q = 0; q <= n; q++) { const x = q / n * (N - 1), i = Math.min(N - 2, Math.floor(x)), t = x - i; const p = cr(pts, i, t); if (q) L += v3.dist(p, P[q - 1]); P.push(p); S.push(L); U.push(cr(ups, i, t)); }
  const at = (d) => { let a = 0, b = n; if (d <= 0) return [0, 0]; if (d >= L) return [n - 1, 1]; while (b - a > 1) { const m = (a + b) >> 1; if (S[m] <= d) a = m; else b = m; } return [a, (d - S[a]) / Math.max(1e-6, S[b] - S[a])]; };
  const pos = d => { const [i, t] = at(d); return v3.add(v3.mul(P[i], 1 - t), v3.mul(P[i + 1], t)); }; const e = L / n * 2.5;
  const f = (s) => { const d = clamp(s * k, 0, L - .01); const p = pos(d); const t = v3.norm(v3.sub(pos(Math.max(0, d - e)), pos(Math.min(L, d + e)))); const [i, w] = at(d); let u = v3.add(v3.mul(U[i], 1 - w), v3.mul(U[i + 1], w)); u = v3.norm(v3.sub(u, v3.mul(t, v3.dot(u, t)))); return { p, t, u }; };
  f.L = L / k; return f;
}
// coil round a pillar of radius r. hand = +1 / -1, psi = azimuth the head looks to
export function coil({ r = PIL.r, y0 = 24, y1 = 132, turns = 3.15, k = 4.2, hand = 1, psi = 0, reach = 1 }) {
  const th = psi - hand * PI / 2; const R = r + k * .86; const pts = [], ups = []; const radial = a => [Math.sin(a), 0, Math.cos(a)]; const hd = [Math.sin(psi), 0, Math.cos(psi)];
  const r0 = radial(th); const H0 = [r0[0] * R, y1, r0[2] * R]; const a0 = v3.add(H0, v3.add(v3.mul(hd, 9 * reach * k / 4.2), v3.add(v3.mul(r0, 1.5 * k / 4.2), [0, 8 * k / 4.2, 0]))); const a1 = v3.add(a0, v3.add(v3.mul(hd, 9 * reach * k / 4.2), [0, 9 * k / 4.2, 0])); const a2 = v3.add(a1, v3.add(v3.mul(hd, 10 * reach * k / 4.2), [0, -1.5 * k / 4.2, 0])); const a3 = v3.add(a2, v3.add(v3.mul(hd, 9 * k / 4.2), [0, -4.5 * k / 4.2, 0]));
  for (const p of [a3, a2, a1, a0]) { pts.push(p); ups.push([0, 1, 0]); } ups[2] = v3.norm(v3.add([0, 1, 0], v3.mul(hd, -.5))); ups[3] = v3.norm(v3.add(v3.mul(r0, 1.4), [0, .5, 0]));
  const n = Math.round(turns * 14); for (let i = 0; i <= n; i++) { const t = i / n; const a = th - hand * t * turns * TAU; const RR = R + .35 * k * Math.sin(t * turns * 5.3 + 1) * .5 + .2; const y = lerp(y1, y0, t) + 1.2 * Math.sin(t * 17); pts.push([Math.sin(a) * RR, y, Math.cos(a) * RR]); ups.push(radial(a)); }
  // the tail flicks free of the shaft
  const ae = th - hand * turns * TAU; const tg = v3.mul([Math.cos(ae), 0, -Math.sin(ae)], -hand); const e0 = pts[pts.length - 1]; for (const [a, b, c] of [[6, 3, -2], [12, 8, 0], [17, 13, 6]]) { pts.push(v3.add(e0, v3.add(v3.mul(tg, a * k / 4.2), v3.add(v3.mul(radial(ae), b * k / 4.2), [0, c * k / 4.2, 0])))); ups.push(radial(ae)); }
  const path = splinePath(pts, ups, k, 2000); return D.bend(D.straightDragon(path.L - .2, 1, { fins: Math.round(path.L * .8) }), path, k);
}
// bas-relief dragon rising from the sea. dir = -1 looks left, +1 looks right
export function relief({ w = 48, h = 134, k = 4.1, dir = -1, seed = 0, z = 0, sq = .40 }) {
  const Q = [[-13, 104], [-7, 110], [2, 113], [11, 108], [14.5, 98], [9, 88], [-1, 82], [-11, 76], [-15.5, 66], [-11, 56], [-1, 51], [9, 46], [14, 37], [10, 28], [2, 23], [-6, 19], [-12, 13], [-15, 6]]; const pts = Q.map(([x, y], i) => [x * -dir * -1 * (dir < 0 ? 1 : 1) * (dir < 0 ? 1 : -1), y + 1.2 * Math.sin(i * 1.9 + seed), 0]);
  const ups = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const t = v3.norm(v3.sub(a, b)); return dir < 0 ? [t[1], -t[0], 0] : [-t[1], t[0], 0]; });
  const path = splinePath(pts, ups, k, 1200); return D.bend(D.straightDragon(path.L - .2, 1, { noWhisk: false, fins: Math.round(path.L * .9) }), path, k, { squash: { z: 0, k: sq } });
}
export function knocker() { const gb = new GB(); const w = GATE.ow / 2, h = GATE.oh; for (const s of [1, -1]) gb.with(m4.mul(m4.trs([w * .74, h * .40, s * 5.0], s > 0 ? 0 : PI, 2.7), m4.trs([0, -.2, .3], 0, 1, .12)), () => D.buildHead(gb, 2, { noWhisk: true })); return gb; }

// the sky dragon: one straight mesh bent on the GPU along a path texture
export const PATHN = 512;
export function skyMesh(L, q, o) { const g = D.straightDragon(L, q, o); const geo = g.build(); for (let i = 0; i < g.nv; i++) geo.nor[i * 4 + 3] = g.anc[i] < 0 ? 0 : Math.max(1, Math.round(g.anc[i] / L * 127)); return geo; }
// sample a closed or open control polygon into a texture row: position.xyz + total length; up.xyz
export function bakePath(pts, ups, closed) {
  const N = pts.length; const g = (A, i) => A[closed ? ((i % N) + N) % N : clamp(i, 0, N - 1)]; const cr = (A, i, t) => { const p0 = g(A, i - 1), p1 = g(A, i), p2 = g(A, i + 1), p3 = g(A, i + 2); const t2 = t * t, t3 = t2 * t; return [0, 1, 2].map(c => (p0[c] * (1 - 3 * t + 3 * t2 - t3) + p1[c] * (4 - 6 * t2 + 3 * t3) + p2[c] * (1 + 3 * t + 3 * t2 - 3 * t3) + p3[c] * t3) / 6); };
  const M = 6000, seg = closed ? N : N - 1; const P = [], S = [0]; for (let q = 0; q <= M; q++) { const x = q / M * seg, i = Math.min(seg - 1, Math.floor(x)); P.push(cr(pts, i, x - i)); if (q) S.push(S[q - 1] + v3.dist(P[q], P[q - 1])); } const L = S[M]; const A = new Float32Array(PATHN * 4), B = new Float32Array(PATHN * 4); let q = 0;
  for (let i = 0; i < PATHN; i++) { const d = i / (PATHN - 1) * L; while (q < M - 1 && S[q + 1] < d) q++; const t = (d - S[q]) / Math.max(1e-6, S[q + 1] - S[q]); const p = v3.add(v3.mul(P[q], 1 - t), v3.mul(P[q + 1], t)); const x = (q + t) / M * seg, j = Math.min(seg - 1, Math.floor(x)); const u = cr(ups, j, x - j); A.set([...p, L], i * 4); B.set([...u, 0], i * 4); }
  return { A, B, L };
}
