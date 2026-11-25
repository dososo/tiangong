// What to draw this frame: one pass over every instance, sorted into four lists (camera, mirror, near shadow, far shadow) by level of detail.
// Same choices as Engine.fill for the camera; the mirror and the near shadow map get their own frusta instead of the whole world.
import { v3 } from '../core/math.js';
const CAM = 1, REF = 2, SH0 = 4, SH1 = 8; let scratch = new Float32Array(1 << 16);
export function prepare(E) {
  E.drawAll = function (prog, view) { const gl = this.gl; prog.use(this.gUni); const key = view === 'cam' || view === 'ref' || view === 'sh0' ? view : 'all', sh = view !== 'cam' && view !== 'ref' && view !== 'all'; for (const g of this.groups) { if (g.o.fwd || (sh && !g.cast)) continue; let any = 0; for (const L of g.lods) any += L[key] ? L[key].count : 0; if (!any) continue; prog.set({ uAnim: g.anim }); if (g.o.twoSided) gl.disable(gl.CULL_FACE); for (const L of g.lods) if (L[key]) this.G.draw(L[key]); if (g.o.twoSided) gl.enable(gl.CULL_FACE); } };
}
function put(gl, m, off, n) { m.count = n; if (!n) return; gl.bindBuffer(gl.ARRAY_BUFFER, m.inst); if (n > m.cap) { m.cap = Math.max(4, Math.ceil(n * 1.25)); gl.bufferData(gl.ARRAY_BUFFER, m.cap * 80, gl.DYNAMIC_DRAW); } gl.bufferSubData(gl.ARRAY_BUFFER, 0, scratch, off * 20, n * 20); }
// need: { ref: mirror height or null, sh0: near light camera or null, sh1: true when the far map is redrawn }
export function fillRT(E, cam, need) {
  const gl = E.gl, pxk = E.H / (2 * Math.tan(cam.fov / 2)), bias = cam.lodBias ?? 1; const [px, py, pz] = cam.pos, [fx, fy, fz] = cam.f, [rx, ry, rz] = cam.r, [ux, uy, uz] = cam.u, tx = cam.tx, ty = cam.ty, kx = Math.sqrt(1 + tx * tx), ky = Math.sqrt(1 + ty * ty);
  const mir = need.ref ?? null, A = need.sh0 || null, far = !!need.sh1; let lf, lr, lu, lp, lt, lk; if (A) { lf = A.f; lr = A.r; lu = A.u; lt = A.t; lk = Math.sqrt(1 + lt * lt); lp = E.sunAt; } let tris = 0, trisR = 0, trisS = 0;
  for (const g of E.groups) {
    const I = g.inst, n = I.length, NL = g.lods.length, pxs = g.px, minPx = g.o.minPx ?? .6, shB = g.o.shBias ?? 1, cast = g.cast; if (!g.lods[0].ref) for (const L of g.lods) { L.ref = E.G.view(L.cam); L.sh0 = E.G.view(L.cam); }
    if (!g.kl || g.kl.length < n) { g.kl = new Uint8Array(n); g.ka = new Uint8Array(n); g.kf = new Uint8Array(n); g.cnt = new Int32Array(NL * 4); g.off = new Int32Array(NL * 4); }
    const kl = g.kl, ka = g.ka, kf = g.kf, cnt = g.cnt, off = g.off; cnt.fill(0);
    for (let i = 0; i < n; i++) {
      const it = I[i]; if (!it.vis) { kf[i] = 0; continue; } const c = it.c, R = it.r, dx = c[0] - px, dy = c[1] - py, dz = c[2] - pz; const size = R * 2 * pxk / Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz) - R * .6) * bias; if (size < minPx) { kf[i] = 0; continue; }
      let lod = NL - 1; for (let k = 0; k < NL - 1; k++) if (size > pxs[k]) { lod = k; break; } const la = Math.min(NL - 1, lod + shB); let f = 0; const m = R * 1.45 + 2;
      { const z = dx * fx + dy * fy + dz * fz; if (z >= -R) { const x = Math.abs(dx * rx + dy * ry + dz * rz), y = Math.abs(dx * ux + dy * uy + dz * uz); if (x <= z * tx + m * kx && y <= z * ty + m * ky) { f |= CAM; cnt[lod]++; } } }
      if (mir !== null && c[1] + R > mir && (size > 2.2 || minPx === 0)) { const my = 2 * mir - c[1] - py; const z = dx * fx + my * fy + dz * fz; if (z >= -R) { const x = Math.abs(dx * rx + my * ry + dz * rz), y = Math.abs(dx * ux + my * uy + dz * uz); if (x <= z * tx + m * kx && y <= z * ty + m * ky) { f |= REF; cnt[NL + la]++; } } }
      if (cast) {
        if (A) { const ax = c[0] - lp[0], ay = c[1] - lp[1], az = c[2] - lp[2]; const z = ax * lf[0] + ay * lf[1] + az * lf[2]; if (z >= -R && Math.abs(ax * lr[0] + ay * lr[1] + az * lr[2]) <= z * lt + R * lk && Math.abs(ax * lu[0] + ay * lu[1] + az * lu[2]) <= z * lt + R * lk) { f |= SH0; cnt[NL * 2 + la]++; } }
        if (far) { f |= SH1; cnt[NL * 3 + la]++; }
      }
      kl[i] = lod; ka[i] = la; kf[i] = f;
    }
    let o = 0; for (let k = 0; k < NL * 4; k++) { off[k] = o; o += cnt[k]; } if (scratch.length < o * 20) scratch = new Float32Array(o * 30); const s = scratch;
    if (o) for (let i = 0; i < n; i++) {
      const f = kf[i]; if (!f) continue; const it = I[i], M = it.m, D = it.dat, X = it.ext, l = kl[i], a = ka[i];
      for (let b = 0; b < 4; b++) if (f >> b & 1) { const p = off[NL * b + (b ? a : l)]++ * 20; s[p] = M[0]; s[p + 1] = M[4]; s[p + 2] = M[8]; s[p + 3] = M[12]; s[p + 4] = M[1]; s[p + 5] = M[5]; s[p + 6] = M[9]; s[p + 7] = M[13]; s[p + 8] = M[2]; s[p + 9] = M[6]; s[p + 10] = M[10]; s[p + 11] = M[14]; s[p + 12] = D[0]; s[p + 13] = D[1]; s[p + 14] = D[2]; s[p + 15] = D[3]; s[p + 16] = X[0]; s[p + 17] = X[1]; s[p + 18] = X[2]; s[p + 19] = X[3]; }
    }
    for (let k = 0; k < NL; k++) { const L = g.lods[k], t = L.cam.tris; put(gl, L.cam, off[k] - cnt[k], cnt[k]); tris += t * cnt[k]; if (mir !== null) { put(gl, L.ref, off[NL + k] - cnt[NL + k], cnt[NL + k]); trisR += t * cnt[NL + k]; } if (A) { put(gl, L.sh0, off[NL * 2 + k] - cnt[NL * 2 + k], cnt[NL * 2 + k]); trisS += t * cnt[NL * 2 + k]; } if (far) put(gl, L.all, off[NL * 3 + k] - cnt[NL * 3 + k], cnt[NL * 3 + k]); }
  }
  E.stats.tris = tris; if (mir !== null) E.stats.trisRef = trisR; if (A) E.stats.trisSh0 = trisS;
}
