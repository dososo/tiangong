"""Stem balance, space, master. Writes out/score_master.wav (48 kHz 24 bit) + per-section loudness report."""
import sys, os, json, numpy as np, soundfile as sfile, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import *
Z = np.load('/tmp/tg_stems.npz'); N = len(Z['bell']); DUR = 168.0
#            dry   hall  heaven  hp    lp
BUS = dict(bell=(.90, .34, .34, 28, None), zhong=(.62, .42, .50, 150, None), drum=(.95, .30, .10, 24, None), tap=(.55, .40, .20, 90, None), gong=(.80, .35, .25, 40, None), low=(1.0, .30, .10, 26, 7000), brass=(.85, .42, .12, 40, 9000), horn=(.72, .55, .25, 60, 9000), str=(.80, .48, .28, 120, 12500), choir=(.34, .42, .46, 80, 11000), sheng=(.34, .34, .46, 180, 12000), pluck=(.95, .45, .35, 45, None), xiao=(.75, .55, .45, 200, None), sfx=(.95, .25, .15, 24, None), heart=(1.0, .22, .18, 22, None), ice=(.45, .30, .80, 800, None))
TRIM = dict(bell=.95, zhong=.95, drum=1.05, tap=.9, gong=.85, low=1.05, brass=.80, horn=.72, str=.95, choir=.60, sheng=.44, pluck=1.35, xiao=1.25, sfx=1.0, heart=1.05, ice=1.0)
H, V = HALL(), HEAVEN(); rep = {}
# The lid shuts at 152.6: everything that sounded before it belongs to the eye and is gone with it, echoes too. What comes after has its own room and waits for the first string (153.9); voices that were ringing come back only when their own next note does.
eye = curve([(0, 1), (153.2, 1), (153.5, 0), (171, 0)], N)[:, None]; gone = curve([(0, 1), (152.92, 1), (153.36, .006), (153.8, 0), (171, 0)], N)[:, None]; mix = np.zeros((N, 2), np.float32)
AFTER = dict(pluck=[(0, 0), (153.86, 0), (153.895, 1), (171, 1)], xiao=[(0, 0), (153.9, 0), (154.3, 1), (171, 1)], sheng=[(0, 0), (153.9, 0), (155.4, 1), (171, 1)], zhong=[(0, 0), (154.2, 0), (156.4, 1), (171, 1)], sfx=[(0, 0), (153.88, 0), (157.0, 1), (171, 1)]); REST = [(0, 0), (154.5, 0), (158.0, 1), (171, 1)]
for part in ('eye', 'after'):
    dry = np.zeros((N, 2), np.float32); sh = np.zeros_like(dry); sv = np.zeros_like(dry)
    for k in Z.files:
        x = Z[k].astype(np.float32) * TRIM[k]; d, h, v, hpf, lpf = BUS[k]; x = hp(x, hpf); x = lp(x, lpf) if lpf else x; rep[k] = x; x = x * (eye if part == 'eye' else curve(AFTER.get(k, REST), N)[:, None]); dry += x * d; sh += x * h; sv += x * v
    wet_h = conv(sh, H) * 1.25; wet_v = conv(hp(sv, 120), V) * 1.35; m = hp(dry + wet_h + wet_v, 22); mix += m * gone if part == 'eye' else m
del dry, sh, sv, wet_h, wet_v, m
t = np.arange(N) / SR
# gentle programme ride: keep the hushes hushed, let the reveals stand
ride = curve([(0, .92), (15.5, .95), (16, 1.22), (27.5, 1.22), (28, 1.0), (34.5, .88), (36, .80), (44, .84), (47.9, 1.0), (54, .98), (70, .98), (73, 1.25), (86.5, 1.25), (88, .98), (98, .92), (106, 1.0), (118, 1.06), (124, 1.0), (134.2, 1.06), (135.2, .55), (139.5, .62), (143.4, 1.04), (143.9, 1.08), (145.5, .86), (149, .95), (152.6, 1.08), (153.2, .95), (160, 1.0), (168, 1.0), (171, 1.0)], N)[:, None]
# gravity is switched off while the view turns over
weight = curve([(0, 0), (134.0, 0), (135.0, 1), (141.5, .85), (143.7, 0), (171, 0)], N)[:, None]; mix = mix * (1 - weight) + hp(mix, 380) * weight
mix = mix * ride; end = curve([(0, 1), (166.2, 1), (167.95, 0), (171, 0)], N)[:, None]; mix *= end; start = curve([(0, 0), (.25, 1), (171, 1)], N)[:, None]; mix *= start
# width: the bass stands in the middle (phones and subwoofers add the channels), the sides come in 2 dB, and no stretch may lean out of phase
from scipy.ndimage import uniform_filter1d
mid, side = (mix[:, 0] + mix[:, 1]) / 2, (mix[:, 0] - mix[:, 1]) / 2; side = (side - signal.sosfiltfilt(signal.butter(2, 110, 'low', fs=SR, output='sos'), side)) * .80
w = int(.4 * SR); guard = np.sqrt(uniform_filter1d(mid.astype(np.float64) ** 2, w) * 1.15 / np.maximum(uniform_filter1d(side.astype(np.float64) ** 2, w), 1e-12)); side = side * uniform_filter1d(np.minimum(1, guard), int(.25 * SR)); mix = np.stack([mid + side, mid - side], 1).astype(np.float32)
# soft saturation on the bus, then look-ahead limiter
drive = float(os.environ.get('DRIVE', '1.075')); mix = np.tanh(mix * drive * .9) / .9; out, gr = limiter(mix, .84, .006, .30)
n = int(DUR * SR); out = out[:n]; os.makedirs('../out', exist_ok=True); sfile.write('../out/score_master.wav', out, SR, subtype='PCM_24')
np.savez('/tmp/tg_rep.npz', **rep)
SEC = [('A', 0, 10), ('A2', 10, 16), ('B1', 16, 23), ('B2', 23, 28), ('B3', 28, 35), ('C0', 35, 38), ('C1', 38, 44), ('C2', 44, 48), ('D1', 48, 54), ('D2', 54, 60), ('D3', 60, 66), ('D4', 66, 72), ('E1', 72, 77.5), ('E2', 77.5, 83), ('E3', 83, 88), ('F1', 88, 98), ('F2', 98, 106), ('G1', 106, 112), ('G2', 112, 118), ('G2b', 118, 120), ('H0', 120, 127.5), ('H1', 127.5, 134.4), ('H2', 134.4, 140), ('H3', 140, 144), ('I0', 144, 150), ('I1', 150, 152.6), ('J0', 153, 159), ('J1', 159, 163), ('J2', 163, 168)]
print('limiter: max reduction %.1f dB, active %.1f%%' % (20 * np.log10(gr.min()), 100 * (gr < .98).mean()))
names = list(Z.files); print('%-4s %6s %6s | ' % ('sec', 'rms', 'peak') + ' '.join('%5s' % q[:5] for q in names))
for s, a, b in SEC: i, j = int(a * SR), int(b * SR); print('%-4s %6.1f %6.2f | ' % (s, rms_db(out[i:j]), np.abs(out[i:j]).max()) + ' '.join('%5.0f' % max(-99, rms_db(rep[q][i:j])) for q in names))
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', '../out/score_master.wav', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr; print(r[r.rfind('Summary'):])
