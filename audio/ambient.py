"""云游 — a seamless loop for the free-roam page. Same instruments, same court mode, no drums: breath, stones and distance.
Everything is written into a ring: whatever rings past the end comes back in at the beginning."""
import os, sys, numpy as np, soundfile as sfile, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import *
import sf as S
L = 96.0; NL = int(L * SR); TAIL = 26.0; N = int((L + TAIL) * SR); ST = {}
def add(name, x, t=0., g=1.): put(ST.setdefault(name, np.zeros((N, 2), np.float32)), x, t, g)
def ring(x): y = x[:NL].copy(); r = x[NL:]; y[:len(r)] += r; return y
# bells far off, one to a breath
for t, v, n, k in [(0.4, .55, 'D3', 'boM'), (24.2, .30, 'B2', 'bo'), (48.1, .42, 'D3', 'boM'), (72.3, .30, 'A2', 'bo')]: add('bell', bell(k, hz(n), 24, v, int(t) + 3, .7), t, .9)
def scat(kind, ev, g, seed):
    for i, (t, n, v) in enumerate(ev): x = bell(kind, hz(n), 7., v, seed + i, long=1.5); p = np.sin(i * 2.4) * .8; add('stone', x * np.array([1 - max(0, p) * .7, 1 + min(0, p) * .7], np.float32), t, g)
scat('zhong', [(6.0, 'A5', .35), (7.6, 'E5', .30), (10.4, 'D6', .28), (13.0, 'F#5', .3), (27.0, 'B5', .32), (28.6, 'F#5', .28), (31.4, 'D6', .26), (40.2, 'E5', .26), (53.2, 'E6', .28), (55.0, 'G#5', .30), (57.2, 'B5', .28), (66.0, 'E5', .26), (77.0, 'C#6', .28), (79.0, 'A5', .3), (81.0, 'E5', .28), (90.4, 'F#5', .24)], .5, 1000)
scat('qing', [(4.0, 'A6', .25), (15.8, 'E6', .22), (19.6, 'D7', .18), (34.8, 'F#6', .22), (37.0, 'B6', .18), (45.0, 'A6', .20), (60.2, 'G#6', .2), (62.4, 'E7', .14), (69.0, 'B6', .18), (84.6, 'E6', .2), (86.8, 'C#7', .16), (93.8, 'A6', .18)], .42, 1100)
# four slow harmonies, each melting into the next: D, B, E, A
for k, (t, ns) in enumerate([(0, ['D4', 'A4', 'E5', 'F#5']), (24, ['B3', 'F#4', 'D5', 'A5']), (48, ['E4', 'B4', 'G#5', 'F#5']), (72, ['A3', 'E4', 'C#5', 'B5'])]):
    for j, n in enumerate(ns): a = .34 - .05 * j; add('choir', choir(n, 32, [(0, 0), (8, a), (16, a * 1.05), (24, a * .5), (31.5, 0)], [(0, .2), (14, .9 + .1 * j), (31, .2)], 'm' if midi(n) < 60 else 'f', 5, 2000 + k * 10 + j), t - 2 if t else 0, 1.); 
    add('sheng', sheng(ns[-1], 30, [(0, 0), (10, .20), (18, .26), (29.5, 0)], 2100 + k), t + 1, .8); add('sheng', sheng(ns[-2], 30, [(0, 0), (13, .16), (20, .2), (29.5, 0)], 2110 + k), t + 2, .8)
# one xiao, twice; a few harmonics on the qin
add('xiao', flute([(0, 'A4', 1.9, .5), (1.9, 'B4', .9, .55), (2.8, 'D5', 2.8, .7), (5.6, 'E5', 1.0, .6), (6.6, 'D5', 1.0, .55), (7.6, 'B4', 3.4, .6)], 13, 5, -.25), 29.5, .9)
add('xiao', flute([(0, 'E5', 2.2, .55), (2.2, 'F#5', 1.0, .6), (3.2, 'A5', 2.6, .68), (5.8, 'F#5', 1.0, .55), (6.8, 'E5', 1.0, .5), (7.8, 'C#5', 1.2, .5), (9.0, 'B4', 3.6, .55)], 15, 8, .2), 74.0, .8)
q = S.Track('guqin', 3); [q.note(t, 6, k, 70) for t, k in [(17.0, 62), (18.2, 69), (20.6, 74), (41.8, 59), (43.0, 66), (45.4, 62), (64.4, 64), (65.6, 59), (67.8, 71), (87.8, 57), (89.0, 64), (91.6, 69)]]; add('pluck', q.render(L + TAIL), 0, 1.)
BUS = dict(bell=(.8, .30, .50, 30), stone=(.45, .4, .7, 200), choir=(.28, .35, .70, 110), sheng=(.25, .3, .6, 220), xiao=(.6, .5, .6, 200), pluck=(.9, .5, .5, 50)); TR = dict(bell=.9, stone=.9, choir=.62, sheng=.40, xiao=1.1, pluck=1.5)
H, V = HALL(), HEAVEN(); dry = np.zeros((N, 2), np.float32); sh = dry.copy(); sv = dry.copy()
for k, x in ST.items(): d, h, v, f = BUS[k]; x = hp(x * TR[k], f); dry += x * d; sh += x * h; sv += x * v
# the wind is already periodic: two layers cross-faded at the seam
w = wind(L + 8, 77, 140, 620, .55); f = np.linspace(0, 1, int(8 * SR))[:, None]; wl = w[:NL].copy(); wl[:len(f)] = w[:len(f)] * np.sqrt(f) + w[NL:NL + len(f)] * np.sqrt(1 - f)
pad = np.zeros((int(13 * SR), 2), np.float32)
def wet(x, ir):
    r = np.stack([signal.fftconvolve(x[:, c], ir[:, c]) for c in range(2)], 1).astype(np.float32); M = N + len(pad); return r[:M] if len(r) >= M else np.concatenate([r, np.zeros((M - len(r), 2), np.float32)])
mix = np.concatenate([dry, pad]) + wet(sh, H) * 1.2 + wet(hp(sv, 140), V) * 1.35; y = np.zeros((NL, 2), np.float32)
for s in range(0, len(mix), NL): seg = mix[s:s + NL]; y[:len(seg)] += seg
y += wl * .8; y = hp(np.concatenate([y, y]), 30)[NL:]; y *= 10 ** (-21 / 20) / np.sqrt((y ** 2).mean()); y = np.tanh(y * 1.05) / 1.05; print('peak %.2f  seam jump %.5f' % (np.abs(y).max(), np.abs(y[0] - y[-1]).max()))
XF = int(4 * SR); out = np.concatenate([y, y[:XF]]); sfile.write('../out/ambient_loop.wav', out, SR, subtype='PCM_16'); subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', '../out/ambient_loop.wav', '-c:a', 'aac', '-b:a', '112k', '-movflags', '+faststart', '../out/ambient_loop.m4a'], check=True); print(os.path.getsize('../out/ambient_loop.m4a'))
