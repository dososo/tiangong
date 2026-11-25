// Geometry builder: accumulates triangles with normal, uv (metres), and 4 bytes (material, ao, p1, p2)
import { m4, v3, clamp, lerp, TAU, PI } from '../core/math.js';
export const MAT = { JADE: 0, TILE: 1, GOLD: 2, LACQUER: 3, CAIHUA: 4, LATTICE: 5, BRONZE: 6, ROCK: 7, FOLIAGE: 8, CLOTH: 9, EMIT: 10, RELIEF: 11, SUN: 12, MOON: 13, DRAGON: 14, WATER: 15, PLAQUE: 16, FEATHER: 17, RAFTER: 18, DOUGONG: 19, TILEEDGE: 20, FALLS: 21, SILK: 22, WOOD: 23, PETAL: 24, FLOOR: 25, DOOR: 26, FUR: 27, SKIN: 28, LOTUS: 29, LOTUSB: 30, CLOUD: 31, CLOTH2: 32, AURA: 33 };
export class GB {
  constructor() { this.P = []; this.N = []; this.U = []; this.D = []; this.I = []; this.nv = 0; this.M = null; this.ao = 1; this.p1 = 0; this.p2 = 0; }
  with(m, fn) { const prev = this.M; this.M = prev ? m4.mul(prev, m) : m; fn(this); this.M = prev; return this; }
  at(x, y, z, ry, fn, s = 1) { return this.with(m4.trs([x, y, z], ry, s), fn); }
  v(x, y, z, nx, ny, nz, u, v, mat, ao = 1, p1 = this.p1, p2 = this.p2) {
    const M = this.M;
    if (M) {
      const X = M[0] * x + M[4] * y + M[8] * z + M[12], Y = M[1] * x + M[5] * y + M[9] * z + M[13], Z = M[2] * x + M[6] * y + M[10] * z + M[14];
      const sx = M[0] * M[0] + M[1] * M[1] + M[2] * M[2], sy = M[4] * M[4] + M[5] * M[5] + M[6] * M[6], sz = M[8] * M[8] + M[9] * M[9] + M[10] * M[10];
      const ax = nx / sx, ay = ny / sy, az = nz / sz;
      const a = M[0] * ax + M[4] * ay + M[8] * az, b = M[1] * ax + M[5] * ay + M[9] * az, c = M[2] * ax + M[6] * ay + M[10] * az;
      x = X; y = Y; z = Z; nx = a; ny = b; nz = c;
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    this.P.push(x, y, z); this.N.push(nx / l * 127, ny / l * 127, nz / l * 127, this.nw || 0); this.U.push(u, v);
    this.D.push(mat, Math.round(clamp(ao * this.ao) * 255), p1, p2); return this.nv++;
  }
  tri(a, b, c) { this.I.push(a, b, c); }
  // quad with corners ccw, auto normal; uv array of 4 [u,v]; ao number or array
  quad(a, b, c, d, uv, mat, ao = 1, n = null) {
    if (!n) n = v3.norm(v3.cross(v3.sub(b, a), v3.sub(d, a)));
    const A = Array.isArray(ao) ? ao : [ao, ao, ao, ao];
    const i = [a, b, c, d].map((p, k) => this.v(p[0], p[1], p[2], n[0], n[1], n[2], uv[k][0], uv[k][1], mat, A[k]));
    this.I.push(i[0], i[1], i[2], i[0], i[2], i[3]);
  }
  // axis-aligned box; o: {ao, aoB (bottom), skip:'b t n s e w', tx,tz: top taper factors}
  box(x0, y0, z0, x1, y1, z1, mat, o = {}) {
    const tx = o.tx ?? 1, tz = o.tz ?? 1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ao = o.ao ?? 1, ab = o.aoB ?? ao, sk = o.skip || '';
    const X0 = cx + (x0 - cx) * tx, X1 = cx + (x1 - cx) * tx, Z0 = cz + (z0 - cz) * tz, Z1 = cz + (z1 - cz) * tz;
    const w = x1 - x0, h = y1 - y0, d = z1 - z0; const A = [ab, ab, ao, ao];
    if (!sk.includes('s')) this.quad([x0, y0, z1], [x1, y0, z1], [X1, y1, Z1], [X0, y1, Z1], [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], mat, A);
    if (!sk.includes('n')) this.quad([x1, y0, z0], [x0, y0, z0], [X0, y1, Z0], [X1, y1, Z0], [[-x1, y0], [-x0, y0], [-x0, y1], [-x1, y1]], mat, A);
    if (!sk.includes('e')) this.quad([x1, y0, z1], [x1, y0, z0], [X1, y1, Z0], [X1, y1, Z1], [[-z1, y0], [-z0, y0], [-z0, y1], [-z1, y1]], mat, A);
    if (!sk.includes('w')) this.quad([x0, y0, z0], [x0, y0, z1], [X0, y1, Z1], [X0, y1, Z0], [[z0, y0], [z1, y0], [z1, y1], [z0, y1]], mat, A);
    if (!sk.includes('t')) this.quad([X0, y1, Z1], [X1, y1, Z1], [X1, y1, Z0], [X0, y1, Z0], [[X0, -Z1], [X1, -Z1], [X1, -Z0], [X0, -Z0]], mat, ao);
    if (!sk.includes('b')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], mat, ab);
  }
  // generic grid surface. f(u,v)->[x,y,z,(U),(V),(ao)]; flip reverses winding
  grid(nu, nv, f, mat, o = {}) {
    const base = this.nv, pts = []; const aoF = o.ao ?? 1;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) pts.push(f(i / nu, j / nv));
    const at = (i, j) => pts[clamp(j, 0, nv) * (nu + 1) + clamp(i, 0, nu)];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      let du = v3.sub(at(i + 1, j), at(i - 1, j)), dv = v3.sub(at(i, j + 1), at(i, j - 1));
      if (o.wrapU) du = v3.sub(pts[j * (nu + 1) + (i + 1 > nu ? 1 : i + 1)], pts[j * (nu + 1) + (i - 1 < 0 ? nu - 1 : i - 1)]);
      let n = v3.cross(du, dv); if (v3.len(n) < 1e-9) { const jj = j === 0 ? 1 : j === nv ? nv - 1 : j; du = v3.sub(at(i + 1, jj), at(i - 1, jj)); n = v3.cross(du, dv); if (v3.len(n) < 1e-9) n = [0, 1, 0]; }
      n = v3.norm(n); if (o.flip) n = v3.mul(n, -1);
      const p = at(i, j); this.v(p[0], p[1], p[2], n[0], n[1], n[2], p[3] ?? i / nu, p[4] ?? j / nv, mat, (p[5] ?? 1) * aoF);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; o.flip ? this.I.push(a, c, b, b, c, d) : this.I.push(a, b, c, b, d, c); }
  }
  // lathe about Y. prof: [[r,y,(sharp)],...] bottom to top, outside facing
  lathe(prof, seg, mat, o = {}) {
    const a0 = o.a0 ?? 0, a1 = o.a1 ?? TAU, ao = o.ao ?? 1;
    let s = 0;
    for (let k = 0; k < prof.length - 1; k++) {
      const A = prof[k], B = prof[k + 1]; const dr = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dr, dy); if (L < 1e-9) continue;
      const nr = (q, w) => { const X = prof[q], Y = prof[w]; return [Y[1] - X[1], -(Y[0] - X[0])]; };
      let n0 = [dy / L, -dr / L], n1 = n0;
      if (o.smooth) {
        if (k > 0 && !A[2]) { const p = nr(k - 1, k), l = Math.hypot(...p) || 1; n0 = [n0[0] + p[0] / l, n0[1] + p[1] / l]; }
        if (k < prof.length - 2 && !B[2]) { const p = nr(k + 1, k + 2), l = Math.hypot(...p) || 1; n1 = [n1[0] + p[0] / l, n1[1] + p[1] / l]; }
      }
      const base = this.nv; const m = Array.isArray(mat) ? mat[k] : mat;
      for (let i = 0; i <= seg; i++) {
        const a = lerp(a0, a1, i / seg), c = Math.sin(a), d = Math.cos(a); const uu = a * (o.ur ?? Math.max(A[0], B[0]));
        this.v(A[0] * c, A[1], A[0] * d, n0[0] * c, n0[1], n0[0] * d, uu, o.vn ? (A[1] - o.vn[0]) / (o.vn[1] - o.vn[0]) : o.vy ? A[1] : s, m, ao * (A[3] ?? 1));
        this.v(B[0] * c, B[1], B[0] * d, n1[0] * c, n1[1], n1[0] * d, uu, o.vn ? (B[1] - o.vn[0]) / (o.vn[1] - o.vn[0]) : o.vy ? B[1] : s + L, m, ao * (B[3] ?? 1));
      }
      for (let i = 0; i < seg; i++) { const q = base + i * 2; this.I.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
      s += L;
    }
  }
  cyl(x, z, r0, y0, r1, y1, seg, mat, o = {}) {
    this.at(x, 0, z, 0, () => { const p = []; if (o.capB) p.push([0, y0, 1]); p.push([r0, y0, 1, o.aoB]); if (o.ent) { for (let k = 1; k < 5; k++) { const t = k / 5; p.push([lerp(r0, r1, t) * (1 + .03 * Math.sin(t * PI)), lerp(y0, y1, t)]); } } p.push([r1, y1, 1, o.aoT]); if (o.cap !== false) p.push([0, y1, 1]); this.lathe(p, seg, mat, { smooth: !!o.ent, ao: o.ao, vy: true }); });
  }
  // profile swept round a rectangle. prof: [[out,y,ao],...] bottom->top
  frame(prof, hw, hd, mat, o = {}) {
    for (let k = 0; k < prof.length - 1; k++) {
      const A = prof[k], B = prof[k + 1]; const m = Array.isArray(mat) ? mat[k] : mat; const a0 = A[2] ?? 1, a1 = B[2] ?? 1;
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]); const vn = o.vn; const vA = vn ? (A[1] - vn[0]) / (vn[1] - vn[0]) : o.vy ? A[1] : 0, vB = vn ? (B[1] - vn[0]) / (vn[1] - vn[0]) : o.vy ? B[1] : L;
      const wa = hw + A[0], wb = hw + B[0], da = hd + A[0], db = hd + B[0];
      this.quad([-wa, A[1], da], [wa, A[1], da], [wb, B[1], db], [-wb, B[1], db], [[-wa, vA], [wa, vA], [wb, vB], [-wb, vB]], m, [a0, a0, a1, a1]);
      this.quad([wa, A[1], -da], [-wa, A[1], -da], [-wb, B[1], -db], [wb, B[1], -db], [[-wa, vA], [wa, vA], [wb, vB], [-wb, vB]], m, [a0, a0, a1, a1]);
      this.quad([wa, A[1], da], [wa, A[1], -da], [wb, B[1], -db], [wb, B[1], db], [[-da, vA], [da, vA], [db, vB], [-db, vB]], m, [a0, a0, a1, a1]);
      this.quad([-wa, A[1], -da], [-wa, A[1], da], [-wb, B[1], db], [-wb, B[1], -db], [[-da, vA], [da, vA], [db, vB], [-db, vB]], m, [a0, a0, a1, a1]);
    }
  }
  // tube along points; radius number or f(t)
  tube(pts, rad, seg, mat, o = {}) {
    const n = pts.length, base = this.nv; let up = o.up || [0, 1, 0]; let s = 0; const rf = typeof rad === 'function' ? rad : () => rad; let prevN = null;
    for (let i = 0; i < n; i++) {
      const t = v3.norm(v3.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
      let nn = prevN ? v3.sub(prevN, v3.mul(t, v3.dot(prevN, t))) : v3.cross(t, up); if (v3.len(nn) < 1e-5) nn = v3.cross(t, [1, 0, 0]); nn = v3.norm(nn); prevN = nn; const b = v3.cross(t, nn);
      if (i) s += v3.dist(pts[i], pts[i - 1]); const r = rf(i / (n - 1));
      for (let k = 0; k <= seg; k++) { const a = k / seg * TAU, c = Math.cos(a), d = Math.sin(a); const q = [nn[0] * c + b[0] * d, nn[1] * c + b[1] * d, nn[2] * c + b[2] * d]; const R = Array.isArray(r) ? Math.abs(c) * r[0] + Math.abs(d) * r[1] : r; this.v(pts[i][0] + q[0] * R, pts[i][1] + q[1] * R, pts[i][2] + q[2] * R, q[0], q[1], q[2], k / seg * (o.uS ?? 1), s, mat, o.ao ?? 1); }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) { const a = base + i * (seg + 1) + k, b = a + 1, c = a + seg + 1, d = c + 1; this.I.push(a, b, c, b, d, c); }
  }
  merge(g) { const base = this.nv; const M = this.M; for (let i = 0; i < g.nv; i++) this.v(g.P[i * 3], g.P[i * 3 + 1], g.P[i * 3 + 2], g.N[i * 4], g.N[i * 4 + 1], g.N[i * 4 + 2], g.U[i * 2], g.U[i * 2 + 1], g.D[i * 4], g.D[i * 4 + 1] / 255, g.D[i * 4 + 2], g.D[i * 4 + 3]); for (let i = 0; i < g.I.length; i++) this.I.push(base + g.I[i]); }
  build() {
    const pos = new Float32Array(this.P), nor = new Int8Array(this.N), uv = new Float32Array(this.U), dat = new Uint8Array(this.D), idx = this.nv < 65536 ? new Uint16Array(this.I) : new Uint32Array(this.I);
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[i + k]); hi[k] = Math.max(hi[k], pos[i + k]); }
    const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]; return { pos, nor, uv, dat, idx, bounds: { lo, hi, c, r: v3.dist(lo, hi) / 2 } };
  }
}
