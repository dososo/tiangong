#!/usr/bin/env python3
"""Pick the rate of the 4K master: encode two-second samples of unlike pictures at several CRF values, measure size, VMAF (4K model), PSNR.
python3 tools/crf_test.py <chunk dir> <out dir> <out.json> [--crf 17,19,21] [--at 100,700,1010]"""
import sys, os, json, re, subprocess, time
a = sys.argv[1:]
def opt(k, d):
    if '--' + k in a: i = a.index('--' + k); v = a[i + 1]; del a[i:i + 2]; return v
    return d
crfs = opt('crf', '17,19,21').split(','); ats = [int(x) for x in opt('at', '100,700,1010').split(',')]; ch, od, outp = a[0], a[1], a[2]; os.makedirs(od, exist_ok=True); N = 48; rows = []
X = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'encode.mjs'), encoding='utf8').read(); PRM = re.search(r"'(log-level=error:aq-mode[^']+)'", X).group(1); TAG = re.search(r"const TAG = '([^']+)'", X).group(1) # the very settings of the encoder
for at in ats:
    c = at // 96 * 96; src = os.path.join(ch, f'c_{c:05d}_{c + 96:05d}.mkv'); k = at - c; assert k + N <= 96, 'sample crosses a chunk'
    for crf in crfs:
        o = os.path.join(od, f's{at}_{crf}.mp4'); t = time.time()
        subprocess.run(['nice', '-n', '12', 'ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', f'trim=start_frame={k}:end_frame={k + N},setpts=N/24/TB,format=yuv420p10le,{TAG}', '-r', '24', '-c:v', 'libx265', '-preset', 'slow', '-crf', crf, '-profile:v', 'main10', '-tag:v', 'hvc1', '-x265-params', PRM, o], check=True); sec = time.time() - t
        e = subprocess.run(['nice', '-n', '12', 'ffmpeg', '-hide_banner', '-nostats', '-i', o, '-i', src, '-filter_complex', f'[1:v]trim=start_frame={k}:end_frame={k + N},setpts=N/24/TB,format=yuv420p10le,settb=1/24[r];[0:v]settb=1/24,setpts=N[d];[r]setpts=N[r2];[d][r2]libvmaf=model=version=vmaf_4k_v0.6.1:feature=name=psnr:n_threads=6:log_fmt=json:log_path={od}/v.json', '-f', 'null', '-'], capture_output=True, text=True)
        try: v = json.load(open(f'{od}/v.json'))['pooled_metrics']
        except Exception: print(e.stderr[-800:]); raise
        r = dict(at=at, crf=float(crf), mbit=round(os.path.getsize(o) * 8 / (N / 24) / 1e6, 1), vmaf=round(v['vmaf']['mean'], 2), vmaf_min=round(v['vmaf']['min'], 2), psnr_y=round(v['psnr_y']['mean'], 2), seconds=round(sec)); rows.append(r); print(r, flush=True)
open(outp + '.tmp', 'w').write(json.dumps(dict(schema_version=1, samples=N, settings=PRM, rows=rows), indent=1)); os.replace(outp + '.tmp', outp)
