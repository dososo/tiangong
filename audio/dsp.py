"""Synthesis and mixing: modal bells and stones, formant choir, free-reed sheng, flute, drums, air, reverbs, limiter."""
import numpy as np
from numba import njit, prange
from scipy import signal
SR = 48000
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def midi(s):
    i = 1; k = NOTE[s[0]]
    while s[i] in '#b': k += 1 if s[i] == '#' else -1; i += 1
    return k + 12 * (int(s[i:]) + 1)
def hz(s): return 440.0 * 2 ** (((midi(s) if isinstance(s, str) else s) - 69) / 12)
def rng(seed): return np.random.default_rng(seed)
def curve(pts, n, smooth=True, sr=SR):
    """piecewise curve over time in seconds; cosine easing between points"""
    t = np.arange(n) / sr; xs = np.array([p[0] for p in pts], float); ys = np.array([p[1] for p in pts], float)
    if not smooth: return np.interp(t, xs, ys).astype(np.float32)
    i = np.clip(np.searchsorted(xs, t, side='right') - 1, 0, len(xs) - 2); f = np.clip((t - xs[i]) / np.maximum(xs[i + 1] - xs[i], 1e-9), 0, 1); f = f * f * (3 - 2 * f); return (ys[i] + (ys[i + 1] - ys[i]) * f).astype(np.float32)
def slow(n, rate, seed, lo=-1., hi=1.):
    """smooth random control signal"""
    k = int(n / SR * rate) + 4; r = rng(seed).uniform(lo, hi, k); x = np.arange(n) / SR * rate; i = x.astype(int); f = x - i; f = f * f * (3 - 2 * f); return (r[i] + (r[i + 1] - r[i]) * f).astype(np.float32)
@njit(parallel=True, fastmath=True)
def _modal(n, f, a, t60, ph, att):
    m = len(f); out = np.zeros((m, n), np.float32)
    for k in prange(m):
        w = 2 * np.pi * f[k] / 48000.0; c = np.cos(w); s = np.sin(w); x = np.sin(ph[k]); y = np.cos(ph[k]); d = np.exp(-6.907755 / (t60[k] * 48000.0)); e = a[k]; na = max(1, int(att[k] * 48000))
        for i in range(n):
            g = e if i >= na else e * (0.5 - 0.5 * np.cos(np.pi * i / na)); out[k, i] = g * x; nx = x * c + y * s; y = y * c - x * s; x = nx; e *= d
    return out
def modal(f, a, t60, dur, seed=0, att=.0015):
    f = np.asarray(f, float); n = int(dur * SR); ok = f < SR * .45; f = f[ok]; a = np.asarray(a, float)[ok]; t60 = np.asarray(t60, float)[ok]; r = rng(seed); ph = r.uniform(0, 2 * np.pi, len(f)); at = np.full(len(f), att, float) if np.isscalar(att) else np.asarray(att, float)[ok]; return _modal(n, f, a, t60, ph, at)
def bp(x, lo, hi, order=2): return signal.sosfilt(signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x).astype(np.float32)
def lp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'low', fs=SR, output='sos'), x, axis=0).astype(np.float32)
def hp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'high', fs=SR, output='sos'), x, axis=0).astype(np.float32)
def noise(n, seed): return rng(seed).standard_normal(n).astype(np.float32)
def pan(x, p):
    """equal power, p in -1..1 (scalar or curve)"""
    th = (np.asarray(p) + 1) * np.pi / 4; return np.stack([x * np.cos(th), x * np.sin(th)], 1).astype(np.float32)
# --- bells and stones ---------------------------------------------------------
BO = [(.5, .55, 30), (.5013, .40, 28), (1.0, .95, 24), (1.0032, .70, 22), (1.183, .40, 15), (1.189, .25, 14), (1.51, .30, 12), (2.0, .80, 11), (2.0047, .45, 10), (2.47, .30, 8), (2.66, .24, 7), (3.01, .36, 6.5), (3.03, .2, 6), (3.62, .16, 5), (4.07, .25, 4.6), (4.75, .14, 4), (5.43, .16, 3.4), (6.21, .11, 2.8), (6.79, .09, 2.4), (8.2, .07, 1.8), (9.51, .05, 1.4), (11.2, .04, 1.0), (13.1, .03, .8), (15.7, .02, .6)]
BOM = [(k if k not in (1.183, 1.189, 2.47, 2.66) else {1.183: 1.2545, 1.189: 1.2610, 2.47: 2.512, 2.66: 3.004}[k], g * (.7 if k in (1.183, 1.189) else 1), q) for k, g, q in BO]  # the same bell with a major third
ZHONG = [(1.0, 1.0, 4.6), (1.0021, .5, 4.2), (1.498, .10, 2.2), (2.01, .42, 2.6), (2.62, .20, 1.9), (3.14, .28, 1.7), (4.09, .16, 1.2), (5.18, .14, .9), (6.63, .10, .7), (8.4, .07, .5), (10.5, .05, .35), (13.2, .03, .25)]
QING = [(1.0, 1.0, 3.2), (1.0017, .35, 3.0), (2.41, .22, 1.5), (2.83, .30, 1.3), (4.36, .14, .8), (5.47, .16, .7), (7.12, .09, .45), (9.3, .06, .3), (12.1, .04, .2)]
def bell(kind, f0, dur, vel=1., seed=0, bright=1., long=1.):
    tab = dict(bo=BO, boM=BOM, zhong=ZHONG, qing=QING)[kind]; kind = 'bo' if kind == 'boM' else kind; r = rng(seed + 17); f = [f0 * k * (1 + r.normal(0, .0008)) for k, _, _ in tab]; a = [g * (vel ** (0 if i < 8 else .6)) * (bright ** (min(i, 14) / 6)) * r.uniform(.8, 1.2) for i, (k, g, _) in enumerate(tab)]; t = [q * long * (f0 / {'bo': 110., 'zhong': 440., 'qing': 880.}[kind]) ** -.25 for _, _, q in tab]
    M = modal(f, a, t, dur, seed, att=[.006 if kind == 'bo' and k < 2.1 else .0012 for k, _, _ in tab]); n = M.shape[1]; nz = noise(int(.25 * SR), seed + 5) * np.exp(-np.arange(int(.25 * SR)) / SR / (.022 if kind == 'bo' else .006)); nz = bp(nz, 250 if kind == 'bo' else 1500, 3200 if kind == 'bo' else 9000) * (.55 if kind == 'bo' else .35) * bright
    out = np.zeros((n, 2), np.float32)
    for k in range(len(M)): out += pan(M[k], r.uniform(-.55, .55) if k > 3 else r.uniform(-.15, .15))
    out[:len(nz)] += pan(nz, 0); return out * vel * (.16 if kind == 'bo' else .25)
# --- drums ---------------------------------------------------------------------
def drum(vel=1., f=58., T=1.7, dur=4., seed=0, skin=1.):
    n = int(dur * SR); t = np.arange(n) / SR; r = rng(seed); out = np.zeros(n)
    for k, (rt, a, tt) in enumerate([(1, 1, 1), (1.50, .42, .62), (1.593, .5, .60), (2.02, .24, .45), (2.14, .30, .42), (2.65, .2, .32), (2.92, .16, .28), (3.5, .12, .22), (4.1, .08, .18)]):
        fr = f * rt * (1 + r.normal(0, .004)) * (1 + (.42 if k == 0 else .18) * vel * np.exp(-t / .028)); out += a * (vel ** (.2 * k)) * np.sin(2 * np.pi * np.cumsum(fr) / SR + r.uniform(0, 1)) * np.exp(-6.9 * t / (T * tt * r.uniform(.9, 1.1)))
    out *= 1 - np.exp(-t / .0018); nz = noise(n, seed + 3); out += skin * (vel ** 1.2) * (.9 * lp(nz * np.exp(-t / .030), 900) + .30 * bp(nz * np.exp(-t / .010), 1200, 4200) + .12 * bp(nz * np.exp(-t / .16), 180, 600)); return pan((out * vel * .34).astype(np.float32), 0)
# --- voices ----------------------------------------------------------------------
@njit(parallel=True, fastmath=True)
def _add(phi, A, hop):
    H, B = A.shape; n = len(phi); out = np.zeros(n, np.float32); chunk = 4096; m = (n + chunk - 1) // chunk
    for c in prange(m):
        for i in range(c * chunk, min(n, (c + 1) * chunk)):
            b = i // hop; f = (i - b * hop) / hop; p = phi[i]; s = 0.0; b1 = b + 1 if b + 1 < B else B - 1
            for h in range(H):
                a = A[h, b] + (A[h, b1] - A[h, b]) * f
                if a > 1e-6: s += a * np.sin((h + 1) * p)
            out[i] = s
    return out
VOW = {'f': {'u': [(330, 1., 70), (720, .30, 90), (2500, .030, 180), (3300, .02, 220)], 'o': [(430, 1., 80), (830, .55, 100), (2700, .05, 180), (3400, .03, 220)], 'a': [(800, 1., 110), (1180, .75, 130), (2900, .20, 190), (3700, .12, 240), (4800, .05, 300)]},
       'm': {'u': [(300, 1., 60), (640, .30, 80), (2300, .03, 170), (2900, .02, 200)], 'o': [(400, 1., 70), (760, .6, 90), (2450, .07, 160), (2850, .06, 180)], 'a': [(640, 1., 90), (1060, .8, 110), (2450, .28, 160), (2800, .25, 170), (3400, .10, 240)]}}
def formant(freqs, sex, v):
    """spectral gain at freqs for vowel position v: 0 u, 1 o, 2 a"""
    def g(tab): return sum(a / (1 + ((freqs - F) / (bw * .9)) ** 2) for F, a, bw in tab) + .004
    u, o, a = (g(VOW[sex][k]) for k in 'uoa'); v = np.clip(v, 0, 2); return np.where(v < 1, u + (o - u) * v, o + (a - o) * (v - 1))
def choir(note, dur, amp, vowel, sex='f', n_voices=8, seed=0, spread=.9, hop=512, breath=.015):
    """one note sung by several voices. amp, vowel: control points [(t, v)]"""
    n = int(dur * SR); f0 = hz(note); am = curve(amp, n); vw = curve(vowel, n); out = np.zeros((n, 2), np.float32); r = rng(seed); B = n // hop + 2; H = int(min(44, 6000 // f0)); hs = np.arange(1, H + 1)
    for k in range(n_voices):
        s = seed * 131 + k; vr = r.uniform(4.7, 5.9); vd = r.uniform(10, 26) / 1200; t = np.arange(n) / SR; vib = np.sin(2 * np.pi * (vr * t + .15 * np.cumsum(slow(n, 3, s + 9)) / SR) + r.uniform(0, 6.28)) * vd * (.35 + .65 * np.clip((t - r.uniform(.2, .9)) / 1.2, 0, 1)); dr = slow(n, 1.1, s + 1) * 9 / 1200 + slow(n, 7, s + 2) * 3 / 1200 + r.normal(0, 5) / 1200
        f = f0 * 2 ** (vib + dr); phi = np.cumsum(2 * np.pi * f / SR) + r.uniform(0, 6.28); idx = np.minimum(np.arange(B) * hop, n - 1); ds = int(r.uniform(0, .14) * SR); idx2 = np.maximum(idx - ds, 0)
        fb = f[idx][None] * hs[:, None]; A = formant(fb, sex, vw[idx2][None] + r.normal(0, .12)) / (hs[:, None] ** .85); A *= (fb < 9000); A /= np.sqrt((A ** 2).sum(0, keepdims=True)) + 1e-9; A *= (am[idx2] * (1 + .10 * slow(n, 2.3, s + 4)[idx]))[None]
        # effort opens the spectrum
        A *= 10 ** (-(hs[:, None] - 1) * .05 * (1 - np.clip(am[idx2][None], 0, 1)))
        x = _add(phi.astype(np.float64), A.astype(np.float64), hop); nz = bp(noise(n, s + 70), 700, 5200) * breath * am; out += pan(x + nz, r.uniform(-spread, spread))
    return out / np.sqrt(n_voices) * .30
def sheng(note, dur, amp, seed=0, spread=.7, hop=512, pipes=2):
    """free reed in a bamboo pipe: steady, bright, slightly beating; gets brighter as it swells"""
    n = int(dur * SR); f0 = hz(note); am = curve(amp, n); out = np.zeros((n, 2), np.float32); r = rng(seed); B = n // hop + 2; H = int(min(40, 14000 // f0)); hs = np.arange(1, H + 1); base = np.array([1., .62, .50, .34, .30, .20, .17, .13, .10, .085, .07, .06, .05, .042, .036, .03] + [.026 * .9 ** i for i in range(30)])[:H]
    for k in range(pipes):
        s = seed * 71 + k; t = np.arange(n) / SR; f = f0 * 2 ** ((slow(n, .7, s) * 2.2 + r.normal(0, 2.5) + slow(n, 9, s + 3) * .6) / 1200); phi = np.cumsum(2 * np.pi * f / SR) + r.uniform(0, 6.28); idx = np.minimum(np.arange(B) * hop, n - 1); e = am[idx]; fb = f[idx][None] * hs[:, None]; pk = 1 + .8 * np.exp(-((fb - 1900) / 700) ** 2) + .5 * np.exp(-((fb - 3600) / 900) ** 2); tilt = 10 ** (-(hs[:, None] - 1) * (.085 - .065 * np.clip(e[None], 0, 1))); A = base[:, None] * pk * tilt * (fb < 13000); A /= np.sqrt((A ** 2).sum(0, keepdims=True)) + 1e-9; A *= (e * (1 + .05 * slow(n, 5, s + 5)[idx]))[None]; x = _add(phi.astype(np.float64), A.astype(np.float64), hop); nz = bp(noise(n, s + 8), 1800, 7000) * .010 * am; out += pan(x + nz, r.uniform(-spread, spread))
    return out / np.sqrt(pipes) * .22
def flute(line, dur, seed=0, p=0., air=.09, breathy=1.):
    """line: [(t, note, dur, amp)] legato with portamento; returns one expressive xiao voice"""
    n = int(dur * SR); t = np.arange(n) / SR; pitch = np.zeros(n); am = np.zeros(n); last = None
    for (a, nt, d, v) in line:
        i0, i1 = int(a * SR), min(n, int((a + d) * SR)); m = midi(nt) if isinstance(nt, str) else nt; pitch[i0:] = m
        if last is None: pitch[:i0] = m - .4
        last = m; e = np.zeros(n); L = i1 - i0; at = int(min(.16, d * .35) * SR); rl = int(min(.30, d * .4) * SR); w = np.ones(L); w[:at] = np.sin(np.linspace(0, np.pi / 2, at)) ** 2; w[-rl:] *= np.cos(np.linspace(0, np.pi / 2, rl)) ** 2; sw = 1 - .25 * np.linspace(0, 1, L) ** 2; am[i0:i1] = np.maximum(am[i0:i1], w * sw * v)
    k = int(.055 * SR); pitch = signal.filtfilt(np.ones(k) / k, 1, pitch, padlen=min(n - 1, 3 * k)); am = signal.sosfiltfilt(signal.butter(1, 9, fs=SR, output='sos'), am); held = np.zeros(n)
    for (a, nt, d, v) in line: i0, i1 = int(a * SR), min(n, int((a + d) * SR)); held[i0:i1] = np.clip((np.arange(i1 - i0) / SR - .45) / .9, 0, 1) * (1 if d > .9 else .2)
    vib = np.sin(2 * np.pi * np.cumsum(4.6 + .5 * slow(n, 1, seed)) / SR) * held; f = 440 * 2 ** ((pitch - 69 + vib * .22 + slow(n, 2, seed + 1) * .05) / 12); phi = np.cumsum(2 * np.pi * f / SR); a2 = am * (1 + .12 * vib); x = np.zeros(n)
    for h, g in enumerate([1., .30, .16, .07, .035, .018, .01]): x += g * (np.clip(a2, 0, 1) ** (1 + .25 * h)) * np.sin((h + 1) * phi + h)
    nz = noise(n, seed + 2); b = np.zeros(n)
    for (a, nt, d, v) in line:
        i0, i1 = max(0, int((a - .05) * SR)), min(n, int((a + d + .2) * SR)); f0 = hz(nt); seg = nz[i0:i1]; b[i0:i1] += bp(seg, f0 * .82, min(f0 * 1.25, 20000)) * .9 + bp(seg, f0 * 1.8, min(f0 * 2.4, 21000)) * .5 + bp(seg, 2500, 8000) * .16
    chiff = np.zeros(n)
    for (a, nt, d, v) in line: i0 = int(a * SR); L = int(.09 * SR); chiff[i0:i0 + L] += (nz[i0:i0 + L] * np.hanning(L) * v * .5)[:max(0, n - i0)]
    x = x + air * breathy * b * np.clip(am, 0, 1) ** .7 + .05 * bp(chiff, 900, 5000); return pan((x * .20).astype(np.float32), p)
# --- air -----------------------------------------------------------------------------
@njit(fastmath=True)
def _svf(x, fc, q, mode):
    n = len(x); out = np.zeros(n, np.float32); ic1 = 0.0; ic2 = 0.0
    for i in range(n):
        g = np.tan(np.pi * min(fc[i], 21000.0) / 48000.0); k = 1.0 / q[i]; a1 = 1.0 / (1.0 + g * (g + k)); a2 = g * a1; a3 = g * a2; v3 = x[i] - ic2; v1 = a1 * ic1 + a2 * v3; v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; out[i] = v1 if mode == 1 else v2
    return out
def svf(x, fc, q=1., mode=1): n = len(x); return _svf(x.astype(np.float64), np.broadcast_to(np.asarray(fc, float), n).astype(np.float64), np.broadcast_to(np.asarray(q, float), n).astype(np.float64), mode)
def wind(dur, seed=0, lo=160, hi=900, depth=1.):
    n = int(dur * SR); ch = []
    for c in range(2):
        s = seed * 10 + c; fc = np.exp(np.log(lo) + (np.log(hi) - np.log(lo)) * (slow(n, .23, s) * .5 + .5) ** 1.2); x = svf(noise(n, s + 3), fc, 1.6) * (.55 + .45 * slow(n, .4, s + 4)) + .35 * svf(noise(n, s + 5), fc * 2.7, 4.) * (.5 + .5 * slow(n, .6, s + 6)) ** 2; ch.append(x)
    return np.stack(ch, 1).astype(np.float32) * .10 * depth
def whoosh(dur, f0, f1, peak=.6, seed=0, q=1.2, p0=0., p1=0.):
    n = int(dur * SR); t = np.linspace(0, 1, n); fc = f0 * (f1 / f0) ** t; e = np.where(t < peak, (t / peak) ** 2.2, ((1 - t) / (1 - peak)) ** 1.6); x = svf(noise(n, seed), fc, q) * e; return pan(x * .30, p0 + (p1 - p0) * t)
def thump(f=44., T=.5, vel=1., dur=1.2, f1=1.9, seed=0):
    n = int(dur * SR); t = np.arange(n) / SR; fr = f * (1 + (f1 - 1) * np.exp(-t / .035)); x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-6.9 * t / T) * (1 - np.exp(-t / .004)); x += .12 * lp(noise(n, seed) * np.exp(-t / .03), 400); return pan((x * vel * .5).astype(np.float32), 0)
def ice(n, notes, seed=0, rate=2.2):
    """a glitter of very high glass partials drifting in and out"""
    out = np.zeros((n, 2), np.float32); r = rng(seed); t = np.arange(n) / SR
    for i, nt in enumerate(notes):
        for k in range(3): f = hz(nt) * (1 + r.normal(0, .0006)) * [1, 2.0, 3.01][k]; e = np.clip(slow(n, rate * r.uniform(.5, 1.5), seed * 50 + i * 7 + k), 0, 1) ** 3 * [1, .35, .12][k]; out += pan((np.sin(2 * np.pi * f * t + r.uniform(0, 6)) * e).astype(np.float32), r.uniform(-.95, .95))
    return out * .05
# --- space ---------------------------------------------------------------------------
def impulse(rt, pre=.02, rise=.01, dur=None, seed=1, bands=None, er=0.):
    """diffuse exponential tail; rt is a list of (centre frequency, seconds to -60 dB)"""
    dur = dur or max(x for _, x in rt) * 1.15; n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros((n, 2), np.float32); edges = [40] + [np.sqrt(rt[i][0] * rt[i + 1][0]) for i in range(len(rt) - 1)] + [18000]
    for c in range(2):
        acc = np.zeros(n)
        for i, (f, T) in enumerate(rt): acc += bp(noise(n, seed * 100 + c * 37 + i), edges[i], min(edges[i + 1], 20000), 2) * np.exp(-6.9078 * t / T) * np.sqrt(1 / 1.0)
        acc *= 1 - np.exp(-t / max(rise, 1e-4)); out[:, c] = acc
    if er > 0:
        r = rng(seed + 8)
        for _ in range(26): d = int(r.uniform(.006, .095) * SR); g = er * r.uniform(.3, 1) * np.exp(-d / SR / .06); out[d, r.integers(0, 2)] += g * r.choice([-1, 1]) * 12
    k = int(pre * SR); out = np.concatenate([np.zeros((k, 2), np.float32), out]); return out / np.sqrt((out ** 2).sum() / 2)
HALL = lambda: impulse([(90, 4.6), (250, 4.4), (700, 4.0), (2000, 3.1), (5000, 2.0), (11000, 1.1)], pre=.026, rise=.012, seed=3, er=.05)
HEAVEN = lambda: impulse([(90, 8.5), (250, 10.5), (700, 11.5), (2000, 10.0), (5000, 6.5), (11000, 3.0)], pre=.06, rise=.28, seed=9)
def conv(x, ir):
    n = len(x); return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:n] for c in range(2)], 1).astype(np.float32)
@njit(fastmath=True)
def _limit(g, look, rel):
    n = len(g); out = np.ones(n, np.float64); cur = 1.0
    # running minimum over the look-ahead window, then smooth release
    for i in range(n):
        m = g[i]
        j = min(n - 1, i + look)
        if g[j] < m: m = g[j]
        cur = min(m, cur + (1.0 - cur) * rel); out[i] = cur
    return out
def limiter(x, ceil=.89, look=.006, rel=.35):
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    up = signal.resample_poly(np.abs(x).max(1), 1, 1); pk = np.abs(x).max(1); pk4 = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max(1); pk4 = pk4[:len(pk) * 4].reshape(-1, 4).max(1); pk = np.maximum(pk, pk4); g = np.minimum(1, ceil / np.maximum(pk, 1e-9)); L = int(look * SR); g = minimum_filter1d(g, 2 * L + 1); out = _limit(g, 0, 1 - np.exp(-1 / (rel * SR))); out = uniform_filter1d(out, L + 1); return (x * out[:, None]).astype(np.float32), out
def put(buf, x, t, g=1.):
    i = int(round(t * SR)); 
    if i < 0: x = x[-i:]; i = 0
    k = min(len(x), len(buf) - i)
    if k > 0: buf[i:i + k] += x[:k] * g
def rms_db(x): return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)
