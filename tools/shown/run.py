#!/usr/bin/env python3
"""Does the finished file look on screen like the frames that were reviewed? python3 tools/shown/run.py <film.mp4> <chunk dir> <out.json>
Sixteen frames are shown by AVFoundation and by Chrome and compared, tone band by tone band, with the rendered frames."""
import sys, os, json, subprocess, hashlib, time, tempfile, numpy as np
from PIL import Image
f, ch, outp = sys.argv[1:4]; HERE = os.path.dirname(os.path.abspath(__file__)); T = tempfile.mkdtemp(); NS = [140, 228, 500, 620, 760, 1000, 1400, 1800, 1930, 2060, 2250, 2450, 2620, 2800, 3200, 3920]
OFF = int(sys.argv[sys.argv.index('--offset') + 1]) if '--offset' in sys.argv else 0 # for short test files cut out of the film
if '--frames' in sys.argv: NS = [int(x) for x in sys.argv[sys.argv.index('--frames') + 1].split(',')]
exe = os.path.join(T, 'frames'); subprocess.run(['swiftc', '-O', os.path.join(HERE, 'frames.swift'), '-o', exe], check=True, stderr=subprocess.DEVNULL); out = []
def blk(x): return x[:1080, :1920].reshape(135, 8, 240, 8, 3).mean((1, 3)) # 8 x 8 blocks: tone, not grain or scaler ringing
def ok(name, passed, info=None): out.append(dict(name=name, passed=bool(passed), info=info)); print('PASS' if passed else 'FAIL', name, json.dumps(info, ensure_ascii=False), flush=True)
h = hashlib.sha256(); 
with open(f, 'rb') as fh:
    for b in iter(lambda: fh.read(1 << 22), b''): h.update(b)
src = {}
for n in NS:
    m = n + OFF; c = m // 96 * 96; p = f'{T}/src_{n}.png'; subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{ch}/c_{c:05d}_{c + 96:05d}.mkv', '-vf', f'select=eq(n\\,{m - c}),scale=1920:1080:flags=lanczos+accurate_rnd+full_chroma_int', '-frames:v', '1', p], check=True); src[n] = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
for who, cmd in [('av', [exe, f, T]), ('chrome', ['node', os.path.join(HERE, 'browser.mjs'), f, T])]:
    r = subprocess.run(cmd + [str(n) for n in NS], capture_output=True, text=True); got = dict(tuple(int(x) for x in l.split()) for l in r.stdout.splitlines() if len(l.split()) == 2 and l.split()[0].isdigit()); ok(f'{who}: shows the asked frames', all(got.get(n) == n for n in NS), None if all(got.get(n) == n for n in NS) else dict(got=got, err=(r.stderr or r.stdout)[-300:])); worst = (0, None); rows = []
    for n in NS:
        p = f'{T}/{who}_{n}.png'
        if not os.path.exists(p): rows.append([n, None]); worst = (99, n); continue
        b = blk(np.asarray(Image.open(p).convert('RGB')).astype(np.float32)); s = blk(src[n]); g = s.mean(2); d = (b - s).mean(2); bands = [float(d[(g >= lo) & (g < lo + 32)].mean()) for lo in range(0, 256, 32) if ((g >= lo) & (g < lo + 32)).sum() > 120]; m = max(bands, key=abs); rows.append([n, round(float(d.mean()), 2), round(m, 2), round(float(np.abs(b - s).mean()), 2)])
        if abs(m) > worst[0]: worst = (abs(m), n)
    ok(f'{who}: no tone band shifts by more than 2.5 of 255', worst[0] <= 2.5, dict(worst=round(worst[0], 2), frame=worst[1], rows_frame_mean_band_abs=rows))
res = dict(schema_version=1, file=os.path.basename(f), sha256=h.hexdigest(), time=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), passed=sum(x['passed'] for x in out), total=len(out), checks=out); open(outp + '.tmp', 'w').write(json.dumps(res, ensure_ascii=False, indent=1)); os.replace(outp + '.tmp', outp); print(f"{res['passed']}/{res['total']}"); sys.exit(0 if res['passed'] == res['total'] else 1)
