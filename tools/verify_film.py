#!/usr/bin/env python3
"""Check a finished film file: python3 tools/verify_film.py <file.mp4> <out.json>
streams, frame count, decode errors, hard cuts and black frames against the shot list, frozen frames, loudness, true peak, fast start, sha256."""
import sys, os, json, re, subprocess, hashlib, struct, time, numpy as np
f, outp = sys.argv[1], sys.argv[2]; W, H = 320, 180; FPS, N, DUR = 24, 4032, 168.0
CUTS = [552, 672, 840, 1728, 1860, 1992, 2112, 2352, 2544, 2688, 2880]
out = []
def ok(name, passed, info=None):
    out.append(dict(name=name, passed=bool(passed), info=info)); print('PASS' if passed else 'FAIL', name, json.dumps(info, ensure_ascii=False) if info is not None else '', flush=True)
def sh(*a): return subprocess.run(a, capture_output=True, text=True)
b = open(f, 'rb').read(); sha = hashlib.sha256(b).hexdigest(); size = len(b)
atoms = []; p = 0
while p + 8 <= size and len(atoms) < 12:
    n, t = struct.unpack('>I4s', b[p:p + 8]); atoms.append(t.decode('latin1')); n = struct.unpack('>Q', b[p + 8:p + 16])[0] if n == 1 else n; p += n or size
ok('fast start: index before the pictures', 'moov' in atoms and 'mdat' in atoms and atoms.index('moov') < atoms.index('mdat'), atoms); del b
j = json.loads(sh('ffprobe', '-v', 'error', '-count_packets', '-show_streams', '-show_format', '-of', 'json', f).stdout); v = next(s for s in j['streams'] if s['codec_type'] == 'video'); a = next(s for s in j['streams'] if s['codec_type'] == 'audio')
hi = v['codec_name'] == 'hevc'; want = (3840, 2160, 'yuv420p10le', 'Main 10') if hi else (1920, 1080, 'yuv420p', 'High')
ok('picture format', (v['width'], v['height'], v['pix_fmt'], v['profile']) == want, dict(codec=v['codec_name'], profile=v['profile'], size=[v['width'], v['height']], pix=v['pix_fmt'], level=v.get('level'), tag=v.get('codec_tag_string')))
ok('colour tags: Rec.709 primaries and matrix, sRGB curve, video range', (v.get('color_space'), v.get('color_transfer'), v.get('color_primaries'), v.get('color_range')) == ('bt709', 'iec61966-2-1', 'bt709', 'tv'), [v.get(k) for k in ('color_space', 'color_transfer', 'color_primaries', 'color_range')])
ok('24 frames a second, constant', v['r_frame_rate'] == '24/1' and v['avg_frame_rate'] == '24/1', [v['r_frame_rate'], v['avg_frame_rate']])
ok('4032 frames', int(v['nb_read_packets']) == N, int(v['nb_read_packets'])); ok('picture lasts 168.000 s', abs(float(v['duration']) - DUR) < .002, v['duration'])
ok('sound: AAC, 48 kHz, stereo, 168 s', a['codec_name'] == 'aac' and a['sample_rate'] == '48000' and a['channels'] == 2 and abs(float(a['duration']) - DUR) < .06, dict(codec=a['codec_name'], sr=a['sample_rate'], ch=a['channels'], dur=a['duration'], kbps=round(int(a.get('bit_rate', 0)) / 1000)))
ok('picture and sound start together', abs(float(v.get('start_time', 0)) - float(a.get('start_time', 0))) < .03, [v.get('start_time'), a.get('start_time')])
t = time.time(); r = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-map', '0:v:0', '-vf', f'scale={W}:{H}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True); F = np.frombuffer(r.stdout, np.uint8).reshape(-1, H, W, 3)
ok('every frame decodes, no decoder message', len(F) == N and not r.stderr, dict(frames=len(F), messages=r.stderr.decode()[:300], seconds=round(time.time() - t, 1)))
m = F.reshape(len(F), -1).mean(1); d = np.array([np.abs(F[i + 1].astype(np.int16) - F[i].astype(np.int16)).mean() for i in range(len(F) - 1)])
cuts = [i + 1 for i in range(len(d)) if d[i] > 12 and d[i] > 4 * np.median(d[max(0, i - 12):i + 13])]
ok('hard cuts exactly where the shot list has them', cuts == CUTS, dict(found=cuts, expected=CUTS))
black = [int(i) for i in np.where(m < 1.0)[0]]; runs = []
for i in black:
    if runs and i == runs[-1][1] + 1: runs[-1][1] = i
    else: runs.append([i, i])
BLACK = [(0, 4), (381, 387), (838, 842), (3668, 3676), (4028, 4031)] # opening, ink to colour, the dark before the gate, the blink of the eye, the end
ok('black only in the fades and the blink of the eye', 0 < len(black) <= 14 and all(any(x <= r0 and r1 <= y for x, y in BLACK) for r0, r1 in runs), dict(count=len(black), runs=runs, allowed=BLACK))
fr = [int(i) + 1 for i in np.where(d == 0)[0] if m[i] > 1.0 and m[i + 1] > 1.0]; ok('no frozen frames', len(fr) == 0, fr[:10])
# A one-frame flash: what a frame shows that neither neighbour explains, against the same measure in the ten frames around it (a fast pan scores high in every frame, a flash only in one).
def odd(p, c, n): p, c, n = (x.astype(np.float32) for x in (p, c, n)); return float(np.maximum(np.abs(c - (p + n) * .5) - np.abs(n - p) * .5, 0).mean())
g = np.array([0.] + [odd(F[i - 1], F[i], F[i + 1]) for i in range(1, len(F) - 1)] + [0.]); near = set(x + k for x in CUTS for k in (-2, -1, 0, 1, 2))
def around(q, i): return float(np.median([q[k] for k in range(max(1, i - 5), min(len(q) - 1, i + 6)) if k != i and k not in near]))
def flash(q, i): return q[i] > 3 * around(q, i) + .5
hits = [i for i in range(1, len(g) - 1) if i not in near and flash(g, i)]; top = sorted(((g[i] / (3 * around(g, i) + .5), i) for i in range(1, len(g) - 1) if i not in near), reverse=True)[:5]
def inject(i, frame): q = g.copy(); q[i] = odd(F[i - 1], frame, F[i + 1]); q[i - 1] = odd(F[i - 2], F[i - 1], frame); q[i + 1] = odd(frame, F[i + 1], F[i + 2]); return bool(flash(q, i))
FAST = [x for x in range(390, 4020) if x not in near and 6 < m[x]]; FAST = sorted(FAST, key=lambda x: -around(g, x))[:1] + sorted([x for x in FAST if x > 2880], key=lambda x: -around(g, x))[:1]; CALM = [1000, 1400, 2250, 2450, 3900]
ctl = {f'{k} {i}': inject(i, fr_) for i in FAST + CALM for k, fr_ in [('black', np.zeros_like(F[i])), ('white', np.full_like(F[i], 255))]}; ctl |= {f'{k} {i}': inject(i, fr_) for i in CALM for k, fr_ in [('brighter by a fifth', np.clip(F[i] * 1.2, 0, 255)), ('frame of another shot', F[i - 900])]}
ok('no one-frame flashes', not hits, dict(flagged=hits[:10], nearest=[(int(i), round(float(x), 2)) for x, i in top], rule='more than 3 x the median of the ten frames around + 0.5; nearest = score / limit'))
ok('that check sees injected flashes (positive control)', all(ctl.values()), dict(seen=sum(ctl.values()), total=len(ctl), missed=[k for k, x in ctl.items() if not x], fast_frames=FAST, calm_frames=CALM))
e = sh('ffmpeg', '-hide_banner', '-nostats', '-i', f, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-').stderr; s = e[e.rindex('Summary:'):]; I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)); L = float(re.search(r'LRA:\s+([\d.]+) LU', s).group(1)); P = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1))
ok('loudness near -14 LUFS', -15.5 < I < -13.0, dict(I=I, LRA=L)); ok('true peak at or below -1 dBTP', P <= -1.0, P)
res = dict(schema_version=1, file=os.path.basename(f), sha256=sha, bytes=size, mbit=round(size * 8 / DUR / 1e6, 1), time=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), passed=sum(x['passed'] for x in out), total=len(out), checks=out)
open(outp + '.tmp', 'w').write(json.dumps(res, ensure_ascii=False, indent=1)); os.replace(outp + '.tmp', outp); print(f"{res['passed']}/{res['total']}"); sys.exit(0 if res['passed'] == res['total'] else 1)
