// Signed distance helpers and naive surface nets. Everything is plain numbers for speed.
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
export const smax = (a, b, k) => -smin(-a, -b, k);
export const ell = (x, y, z, cx, cy, cz, rx, ry, rz) => { const ax = (x - cx) / rx, ay = (y - cy) / ry, az = (z - cz) / rz; const k0 = Math.sqrt(ax * ax + ay * ay + az * az); if (k0 < 1e-5) return -Math.min(rx, ry, rz); const bx = ax / rx, by = ay / ry, bz = az / rz; return k0 * (k0 - 1) / Math.sqrt(bx * bx + by * by + bz * bz); };
export const sph = (x, y, z, cx, cy, cz, r) => Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy) + (z - cz) * (z - cz)) - r;
// capsule with linearly varying radius
export const cone = (x, y, z, ax, ay, az, bx, by, bz, ra, rb) => { const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az; let h = (px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz); h = h < 0 ? 0 : h > 1 ? 1 : h; const qx = px - dx * h, qy = py - dy * h, qz = pz - dz * h; return Math.sqrt(qx * qx + qy * qy + qz * qz) - (ra + (rb - ra) * h); };
// polygonise f over box lo..hi with cell h. returns {P,N,AO,I}
export function surfaceNets(f, lo, hi, h, o = {}) {
  const n = [0, 1, 2].map(k => Math.ceil((hi[k] - lo[k]) / h) + 1); const [nx, ny, nz] = n; const F = new Float32Array(nx * ny * nz); const B = 4; const id = (i, j, k) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k += B) for (let j = 0; j < ny; j += B) for (let i = 0; i < nx; i += B) {
    const c = f(lo[0] + (i + B / 2) * h, lo[1] + (j + B / 2) * h, lo[2] + (k + B / 2) * h); const far = Math.abs(c) > h * B * 1.35;
    for (let kk = k; kk < Math.min(nz, k + B); kk++) for (let jj = j; jj < Math.min(ny, j + B); jj++) for (let ii = i; ii < Math.min(nx, i + B); ii++) F[id(ii, jj, kk)] = far ? c : f(lo[0] + ii * h, lo[1] + jj * h, lo[2] + kk * h);
  }
  const V = new Int32Array(nx * ny * nz).fill(-1); const P = [], I = []; const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = id(i, j, k); const g = [F[a], F[a + 1], F[a + nx], F[a + nx + 1], F[a + nx * ny], F[a + nx * ny + 1], F[a + nx * ny + nx], F[a + nx * ny + nx + 1]]; let m = 0; for (let q = 0; q < 8; q++) if (g[q] < 0) m |= 1 << q; if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, c = 0; for (const [u, v] of E) { const A = g[u], Bb = g[v]; if ((A < 0) === (Bb < 0)) continue; const t = A / (A - Bb); sx += ((u & 1) * (1 - t) + (v & 1) * t); sy += (((u >> 1) & 1) * (1 - t) + ((v >> 1) & 1) * t); sz += ((u >> 2) * (1 - t) + (v >> 2) * t); c++; }
    V[a] = P.length / 3; P.push(lo[0] + (i + sx / c) * h, lo[1] + (j + sy / c) * h, lo[2] + (k + sz / c) * h);
  }
  const quad = (a, b, c, d, fl) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; fl ? I.push(a, c, b, a, d, c) : I.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = id(i, j, k), s = F[a] < 0; if (s !== F[a + 1] < 0) quad(V[a], V[a - nx], V[a - nx - nx * ny], V[a - nx * ny], !s); if (s !== F[a + nx] < 0) quad(V[a], V[a - nx * ny], V[a - 1 - nx * ny], V[a - 1], !s); if (s !== F[a + nx * ny] < 0) quad(V[a], V[a - 1], V[a - 1 - nx], V[a - nx], !s);
  }
  // project to the surface, normals and occlusion from the field
  const nv = P.length / 3, N = new Float32Array(nv * 3), AO = new Float32Array(nv), e = h * .6; const aoD = o.aoD || [.06, .14, .28];
  for (let q = 0; q < nv; q++) {
    let x = P[q * 3], y = P[q * 3 + 1], z = P[q * 3 + 2], gx, gy, gz;
    for (let it = 0; it < 2; it++) { gx = f(x + e, y, z) - f(x - e, y, z); gy = f(x, y + e, z) - f(x, y - e, z); gz = f(x, y, z + e) - f(x, y, z - e); const l = Math.hypot(gx, gy, gz) || 1; gx /= l; gy /= l; gz /= l; if (it === 0) { const d = Math.max(-h * .5, Math.min(h * .5, f(x, y, z))); x -= gx * d * .8; y -= gy * d * .8; z -= gz * d * .8; } }
    P[q * 3] = x; P[q * 3 + 1] = y; P[q * 3 + 2] = z; N[q * 3] = gx; N[q * 3 + 1] = gy; N[q * 3 + 2] = gz; let oc = 0, w = 1; for (const d of aoD) { oc += w * Math.max(0, d - f(x + gx * d, y + gy * d, z + gz * d)) / d; w *= .75; } AO[q] = Math.max(.12, 1 - oc * .42);
  }
  return { P, N, AO, I };
}
