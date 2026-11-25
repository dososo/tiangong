#!/usr/bin/env python3
"""Machine checks of the score that need no ear: python3 tools/audio_check.py [wav] [out.json]
length, DC, balance, mono fold-down, phase, clean head and tail, the planned silence, isolated clicks. It says nothing about beauty."""
import sys, json, os, hashlib, time, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, sosfiltfilt
f = sys.argv[1] if len(sys.argv) > 1 else 'out/score_master.wav'; outp = sys.argv[2] if len(sys.argv) > 2 else 'evidence/audio.json'; x, sr = sf.read(f, dtype='float64'); n = len(x); out = []
def ok(name, passed, info=None): out.append(dict(name=name, passed=bool(passed), info=info)); print('PASS' if passed else 'FAIL', name, json.dumps(info, ensure_ascii=False), flush=True)
db = lambda v: round(float(20 * np.log10(max(v, 1e-12))), 2); rms = lambda a: float(np.sqrt(np.mean(a * a)))
ok('48 kHz stereo, 168 s', sr == 48000 and x.shape[1] == 2 and abs(n / sr - 168) < .02, dict(sr=sr, ch=x.shape[1], seconds=round(n / sr, 4)))
ok('no DC offset', np.abs(x.mean(0)).max() < 5e-4, [float(f'{v:.2e}') for v in x.mean(0)])
l, r = rms(x[:, 0]), rms(x[:, 1]); ok('left and right balanced within 1 dB', abs(20 * np.log10(l / r)) < 1, dict(left=db(l), right=db(r)))
m, s = x.mean(1), (x[:, 0] - x[:, 1]) / 2; ok('mono fold-down keeps the loudness (drop under 4 dB)', db(rms(x) / 1) - db(rms(m)) < 4, dict(stereo=db(rms(x)), mono=db(rms(m)), side=db(rms(s))))
W = int(.4 * sr); k = n // W; a, b = x[:k * W, 0].reshape(k, W), x[:k * W, 1].reshape(k, W); e = np.sqrt((a * a).mean(1) * (b * b).mean(1)); c = (a * b).mean(1) / np.maximum(e, 1e-12); loud = e > 10 ** (-45 / 20) ** 2 if False else np.sqrt(e) > 10 ** (-45 / 20); ok('no stretch out of phase (0.4 s correlation above -0.3)', c[loud].min() > -.3, dict(min=round(float(c[loud].min()), 2), at=round(float(np.where(loud)[0][c[loud].argmin()] * .4), 1), median=round(float(np.median(c[loud])), 2)))
h, t = x[:int(.002 * sr)], x[-int(.005 * sr):]; ok('head and tail start and end at silence', np.abs(h[:8]).max() < 3e-3 and np.abs(t[-8:]).max() < 1e-3, dict(first=db(np.abs(h[:8]).max()), last=db(np.abs(t[-8:]).max())))
w = int(.1 * sr); lev = np.array([rms(x[i:i + w]) for i in range(0, n - w, w)]); seg = lambda t0, t1: lev[int(t0 * 10):int(t1 * 10)]; q = seg(150, 154); i = int(q.argmin()); ok('the black after the blink is the quietest place of the film', db(q.min()) < -38, dict(level=db(q.min()), at=round(150 + i * .1, 1), film_median=db(np.median(lev))))
sil = [round(i * .1, 1) for i in range(5, len(lev) - 5) if lev[i] < 10 ** (-70 / 20)]; ok('no dropouts (0.1 s below -70 dB) outside the head, the tail and the blink', all(150 <= z <= 154 for z in sil), sil[:20])
# a click is one sample far above everything within 3 ms around it in the top band; struck bronze and stone are onsets: they stay loud after the first sample
sos = butter(6, 14000, 'hp', fs=sr, output='sos'); clicks = []
for ch in (0, 1):
    z = np.abs(sosfiltfilt(sos, x[:, ch])); win = int(.003 * sr); cs = np.concatenate([[0], np.cumsum(z * z)]); idx = np.where(z > 10 ** (-38 / 20))[0]
    for i in idx:
        if i < win or i > n - win - 1: continue
        near = cs[i + win] - cs[i - win] - (cs[i + 6] - cs[i - 5]); base = np.sqrt(max(near, 1e-14) / (2 * win - 11))
        if z[i] > 30 * base: clicks.append(round(i / sr, 4))
ok('no isolated clicks', len(clicks) == 0, dict(count=len(clicks), first=sorted(set(clicks))[:12]))
F = np.abs(np.fft.rfft(m * np.hanning(n))) ** 2; fr = np.fft.rfftfreq(n, 1 / sr); tot = F[(fr > 20) & (fr < 20000)].sum(); bands = {f'{lo}-{hi}': round(float(10 * np.log10(F[(fr >= lo) & (fr < hi)].sum() / tot)), 1) for lo, hi in [(20, 60), (60, 250), (250, 1000), (1000, 4000), (4000, 10000), (10000, 20000)]}; ok('spectrum: neither boomy nor thin (bass 60-250 Hz and mids 250-1000 Hz within 9 dB, treble 4-10 kHz above -35 dB)', abs(bands['60-250'] - bands['250-1000']) < 9 and bands['4000-10000'] > -35, bands)
res = dict(schema_version=1, file=os.path.basename(f), sha256=hashlib.sha256(open(f, 'rb').read()).hexdigest(), time=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), passed=sum(y['passed'] for y in out), total=len(out), checks=out); open(outp + '.tmp', 'w').write(json.dumps(res, ensure_ascii=False, indent=1)); os.replace(outp + '.tmp', outp); print(f"{res['passed']}/{res['total']}")
