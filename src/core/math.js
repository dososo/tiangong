// Small math kit. Column-major mat4 in Float64Array for precision, uploaded as Float32.
export const TAU = Math.PI * 2, PI = Math.PI, DEG = Math.PI / 180;
export const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
export const lerp = (a, b, t) => a + (b - a) * t;
export const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const sss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOut = (t, k = 3) => 1 - Math.pow(1 - clamp(t), k);
export const easeIn = (t, k = 3) => Math.pow(clamp(t), k);
export const easeIO = (t, k = 2) => { t = clamp(t); return t < .5 ? .5 * Math.pow(2 * t, k) : 1 - .5 * Math.pow(2 - 2 * t, k); };
export const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const mulberry32 = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  mad: (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
};

export const m4 = {
  ident: () => { const m = new Float64Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b, o = new Float64Array(16)) {
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  // reversed-Z, zero-to-one, infinite far
  persp(fovy, asp, near) {
    const f = 1 / Math.tan(fovy / 2), m = new Float64Array(16);
    m[0] = f / asp; m[5] = f; m[10] = 0; m[11] = -1; m[14] = near; return m;
  },
  // asymmetric version for square light frusta with half extents at unit distance
  perspAsym(l, r, b, t, near) {
    const m = new Float64Array(16);
    m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[8] = (r + l) / (r - l); m[9] = (t + b) / (t - b); m[11] = -1; m[14] = near; return m;
  },
  // reversed-Z ortho, zero-to-one: near->1 far->0
  ortho(l, r, b, t, n, f) {
    const m = new Float64Array(16);
    m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b);
    m[10] = 1 / (f - n); m[14] = f / (f - n); m[15] = 1; return m;
  },
  lookAt(eye, at, up = [0, 1, 0]) {
    const z = v3.norm(v3.sub(eye, at)); let x = v3.cross(up, z);
    if (v3.len(x) < 1e-6) x = v3.cross([0, 0, 1], z);
    x = v3.norm(x); const y = v3.cross(z, x);
    const m = new Float64Array(16);
    m[0] = x[0]; m[4] = x[1]; m[8] = x[2]; m[1] = y[0]; m[5] = y[1]; m[9] = y[2]; m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
    m[12] = -v3.dot(x, eye); m[13] = -v3.dot(y, eye); m[14] = -v3.dot(z, eye); m[15] = 1; return m;
  },
  inv(a, o = new Float64Array(16)) {
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6], b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; det = 1 / det;
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
    return o;
  },
  trs(t, ry = 0, s = 1, rx = 0, rz = 0) {
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
    const S = Array.isArray(s) ? s : [s, s, s];
    // R = Ry * Rx * Rz
    const r00 = cy * cz + sy * sx * sz, r01 = -cy * sz + sy * sx * cz, r02 = sy * cx;
    const r10 = cx * sz, r11 = cx * cz, r12 = -sx;
    const r20 = -sy * cz + cy * sx * sz, r21 = sy * sz + cy * sx * cz, r22 = cy * cx;
    return new Float64Array([r00 * S[0], r10 * S[0], r20 * S[0], 0, r01 * S[1], r11 * S[1], r21 * S[1], 0, r02 * S[2], r12 * S[2], r22 * S[2], 0, t[0], t[1], t[2], 1]);
  },
  // basis from columns x,y,z and translation
  basis: (x, y, z, t) => new Float64Array([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, t[0], t[1], t[2], 1]),
  pt: (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]],
  dir: (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]],
};

// Catmull-Rom (centripetal-free, uniform keyed in time) over keys [{t, v:[...]}]
export function spline(keys, t) {
  const n = keys.length;
  if (t <= keys[0].t) return keys[0].v.slice();
  if (t >= keys[n - 1].t) return keys[n - 1].v.slice();
  let i = 0; while (i < n - 2 && t > keys[i + 1].t) i++;
  const k1 = keys[i], k2 = keys[i + 1], k0 = keys[Math.max(0, i - 1)], k3 = keys[Math.min(n - 1, i + 2)];
  const dt = k2.t - k1.t, u = (t - k1.t) / dt, u2 = u * u, u3 = u2 * u;
  const out = new Array(k1.v.length);
  for (let c = 0; c < out.length; c++) {
    const m1 = i === 0 ? (k2.v[c] - k1.v[c]) : (k2.v[c] - k0.v[c]) / (k2.t - k0.t) * dt;
    const m2 = i === n - 2 ? (k2.v[c] - k1.v[c]) : (k3.v[c] - k1.v[c]) / (k3.t - k1.t) * dt;
    out[c] = (2 * u3 - 3 * u2 + 1) * k1.v[c] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * k2.v[c] + (u3 - u2) * m2;
  }
  return out;
}
// deterministic smooth 1D noise in [-1,1]
export function noise1(x, seed = 0) {
  const h = (i) => { let n = Math.imul(i + seed * 1013, 374761393) ^ 0x5bd1e995; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296 * 2 - 1; };
  const i = Math.floor(x), f = x - i, u = f * f * f * (f * (f * 6 - 15) + 10);
  return lerp(h(i), h(i + 1), u);
}
export const fbm1 = (x, seed = 0, oct = 3) => { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise1(x * f, seed + i * 17); a *= .5; f *= 2.03; } return s; };
export const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
