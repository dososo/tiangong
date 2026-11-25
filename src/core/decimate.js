// Far levels of detail by vertex clustering. K cells across the bounding diameter; everything inside one cell becomes one point.
// Attributes split a cell by material bytes and by the way the surface faces, so roofs, walls and gilding stay apart.
const hash3 = (a, b, c) => { let h = Math.imul(a, 0x9E3779B1) ^ Math.imul(b, 0x85EBCA77) ^ Math.imul(c, 0xC2B2AE3D); h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); return (h ^ h >>> 13) >>> 0; };
export function decimate(g, K) {
  const { pos, nor, uv, dat, idx, bounds } = g; const n = pos.length / 3; const h = 2 * bounds.r / K, inv = 1 / h; const ox = bounds.c[0] - bounds.r - h, oy = bounds.c[1] - bounds.r - h, oz = bounds.c[2] - bounds.r - h; const S = K + 4;
  let cap = 16; while (cap < n * 2) cap *= 2; const mask = cap - 1; const tab = new Int32Array(cap).fill(-1);
  // points
  const cell = new Int32Array(n), key = []; let nc = 0; const cx = new Float64Array(n), cy = new Float64Array(n), cz = new Float64Array(n), cw = new Float64Array(n);
  for (let i = 0; i < n; i++) { const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]; const k = Math.floor((x - ox) * inv) + S * (Math.floor((y - oy) * inv) + S * Math.floor((z - oz) * inv)); let s = hash3(k, 17, 29) & mask; while (tab[s] >= 0 && key[tab[s]] !== k) s = s + 1 & mask; if (tab[s] < 0) { tab[s] = nc; key[nc++] = k; } const c = tab[s]; cell[i] = c; cx[c] += x; cy[c] += y; cz[c] += z; cw[c]++; }
  // triangles that still span three cells, once each
  let tc = 16; while (tc < idx.length) tc *= 2; const tm = tc - 1, tt = new Int32Array(tc).fill(-1); const ta = [], keep = [];
  for (let i = 0; i < idx.length; i += 3) { let a = cell[idx[i]], b = cell[idx[i + 1]], c = cell[idx[i + 2]]; if (a === b || b === c || a === c) continue; const m = dat[idx[i + 2] * 4]; while (a > b || a > c) { const t = a; a = b; b = c; c = t; } let s = hash3(a, b, c) & tm, hit = false; while (tt[s] >= 0) { const q = tt[s] * 4; if (ta[q] === a && ta[q + 1] === b && ta[q + 2] === c && ta[q + 3] === m) { hit = true; break; } s = s + 1 & tm; } if (hit) continue; tt[s] = keep.length; ta.push(a, b, c, m); keep.push(i); }
  // attributes
  const face = (i) => { const x = nor[i * 4], y = nor[i * 4 + 1], z = nor[i * 4 + 2], X = Math.abs(x), Y = Math.abs(y), Z = Math.abs(z); return X >= Y && X >= Z ? (x < 0 ? 0 : 1) : Y >= Z ? (y < 0 ? 2 : 3) : (z < 0 ? 4 : 5); };
  const at = new Int32Array(cap).fill(-1), vc = [], vk = [], acc = []; const map = new Int32Array(n).fill(-1); const I = new Uint32Array(keep.length * 3); let nv = 0;
  for (let t = 0; t < keep.length; t++) for (let e = 0; e < 3; e++) { const i = idx[keep[t] + e]; if (map[i] < 0) { const c = cell[i], k = dat[i * 4] | dat[i * 4 + 2] << 8 | dat[i * 4 + 3] << 16 | face(i) << 24; let s = hash3(c, k, 3) & mask; while (at[s] >= 0 && (vc[at[s]] !== c || vk[at[s]] !== k)) s = s + 1 & mask; if (at[s] < 0) { at[s] = nv; vc[nv] = c; vk[nv] = k; nv++; for (let q = 0; q < 9; q++) acc.push(0); } const v = at[s]; map[i] = v; const o = v * 9; acc[o] += nor[i * 4]; acc[o + 1] += nor[i * 4 + 1]; acc[o + 2] += nor[i * 4 + 2]; acc[o + 3] += nor[i * 4 + 3]; acc[o + 4] += uv[i * 2]; acc[o + 5] += uv[i * 2 + 1]; acc[o + 6] += dat[i * 4 + 1]; acc[o + 7]++; } I[t * 3 + e] = map[i]; }
  const P = new Float32Array(nv * 3), N = new Int8Array(nv * 4), U = new Float32Array(nv * 2), D = new Uint8Array(nv * 4);
  for (let v = 0; v < nv; v++) { const c = vc[v], o = v * 9, w = 1 / acc[o + 7]; P[v * 3] = cx[c] / cw[c]; P[v * 3 + 1] = cy[c] / cw[c]; P[v * 3 + 2] = cz[c] / cw[c]; const l = 127 / (Math.hypot(acc[o], acc[o + 1], acc[o + 2]) || 1); N[v * 4] = acc[o] * l; N[v * 4 + 1] = acc[o + 1] * l; N[v * 4 + 2] = acc[o + 2] * l; N[v * 4 + 3] = acc[o + 3] * w; U[v * 2] = acc[o + 4] * w; U[v * 2 + 1] = acc[o + 5] * w; D[v * 4] = vk[v] & 255; D[v * 4 + 1] = acc[o + 6] * w; D[v * 4 + 2] = vk[v] >> 8 & 255; D[v * 4 + 3] = vk[v] >> 16 & 255; }
  return { pos: P, nor: N, uv: U, dat: D, idx: nv < 65536 ? Uint16Array.from(I) : I, bounds };
}
// append far levels to a list of built lods. Returns {lods, px}; a level of K cells is used below K / slack pixels
export function farLods(lods, px, o = {}) {
  const slack = o.slack ?? 1.5, out = lods.slice(), th = px.slice(0, lods.length - 1); let last = lods[lods.length - 1];
  for (const K of o.K || [1100, 560, 280, 140, 68, 44, 30, 20, 14]) { const lim = K / slack; if (th.length && lim > th[th.length - 1] * .8) continue; if (last.idx.length / 3 < (o.min ?? 90)) break; const d = decimate(last, K); const a = last.idx.length, b = d.idx.length; if (b > a * .68 || b < 12) { if (b < 12) break; continue; } out.push(d); th.push(lim); last = d; }
  return { lods: out, px: th };
}
