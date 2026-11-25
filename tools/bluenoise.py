# 128x128 blue noise by void and cluster (Ulichney 1993), written as src/core/bn.js. usage: bluenoise.py
import numpy as np, base64
from numba import njit
N = 128; SIG = 1.5
@njit
def addg(E, G, y, x, s):
    n = E.shape[0]
    for j in range(n):
        for i in range(n): E[j, i] += s * G[(j - y) % n, (i - x) % n]
@njit
def amax(E, B, v):
    best = -1e30; p = (0, 0)
    for j in range(E.shape[0]):
        for i in range(E.shape[1]):
            if B[j, i] == v and E[j, i] > best: best = E[j, i]; p = (j, i)
    return p
@njit
def amin(E, B, v):
    best = 1e30; p = (0, 0)
    for j in range(E.shape[0]):
        for i in range(E.shape[1]):
            if B[j, i] == v and E[j, i] < best: best = E[j, i]; p = (j, i)
    return p
@njit
def run(G, B, rank):
    n = B.shape[0]; E = np.zeros((n, n)); ones = 0
    for j in range(n):
        for i in range(n):
            if B[j, i] == 1: addg(E, G, j, i, 1.0); ones += 1
    while True:
        c = amax(E, B, 1); B[c] = 0; addg(E, G, c[0], c[1], -1.0); v = amin(E, B, 0); B[v] = 1; addg(E, G, v[0], v[1], 1.0)
        if c == v: break
    B0 = B.copy(); E0 = E.copy(); r = ones - 1
    while r >= 0:
        c = amax(E, B, 1); B[c] = 0; addg(E, G, c[0], c[1], -1.0); rank[c] = r; r -= 1
    B = B0; E = E0; r = ones
    while r < n * n:
        v = amin(E, B, 0); B[v] = 1; addg(E, G, v[0], v[1], 1.0); rank[v] = r; r += 1
    return rank
d = np.minimum(np.arange(N), N - np.arange(N)).astype(float); G = np.exp(-(d[:, None] ** 2 + d[None] ** 2) / (2 * SIG * SIG))
rng = np.random.default_rng(20261124); B = np.zeros((N, N), np.int64); B.ravel()[rng.choice(N * N, N * N // 10, replace=False)] = 1
rank = run(G, B, np.zeros((N, N), np.int64)); v = (rank * 256 // (N * N)).astype(np.uint8)
f = np.abs(np.fft.fftshift(np.fft.fft2(v - v.mean()))) ** 2; yy, xx = np.mgrid[-64:64, -64:64]; r = np.hypot(yy, xx); print('power, low / high frequency:', f[(r > 0) & (r < 12)].mean() / f[(r > 44) & (r < 64)].mean())
open('src/core/bn.js', 'w').write('// 128 x 128 blue noise, void and cluster; written by tools/bluenoise.py\nexport const BN = "' + base64.b64encode(v.tobytes()).decode() + '";\n')
