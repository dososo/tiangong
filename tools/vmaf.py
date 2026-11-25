#!/usr/bin/env python3
"""How much did the encoder take away? VMAF and PSNR of the finished file against the rendered frames, eighteen one-second windows, one or two in every shot.
python3 tools/vmaf.py <film.mp4> <chunk dir> <out.json> [--frames 100,700]"""
import sys, os, json, subprocess, hashlib, tempfile, time
f, ch, outp = sys.argv[1:4]; NS = [100, 240, 490, 600, 730, 1000, 1300, 1600, 1760, 1890, 2030, 2150, 2400, 2600, 2800, 3000, 3520, 3850]; K = 24; T = tempfile.mkdtemp(); out = []
if '--frames' in sys.argv: NS = [int(x) for x in sys.argv[sys.argv.index('--frames') + 1].split(',')]
h = hashlib.sha256()
with open(f, 'rb') as fh:
    for b in iter(lambda: fh.read(1 << 22), b''): h.update(b)
w, hh = map(int, subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', f], capture_output=True, text=True).stdout.strip().split('x')[:2]); model = 'vmaf_4k_v0.6.1' if w > 2000 else 'vmaf_v0.6.1'; rows = []
for n in NS:
    c = n // 96 * 96; k = n - c; assert k + K <= 96, n; src = f'{ch}/c_{c:05d}_{c + 96:05d}.mkv'
    g = f'[0:v:0]select=between(t\\,{(n - .5) / 24:.6f}\\,{(n + K - .5) / 24:.6f}),settb=1/24,setpts=N,format=yuv420p10le[d];[1:v]trim=start_frame={k}:end_frame={k + K},settb=1/24,setpts=N,scale={w}:{hh}:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p10le[r];[d][r]libvmaf=model=version={model}:feature=name=psnr|name=float_ssim:n_threads=8:log_fmt=json:log_path={T}/v.json'
    e = subprocess.run(['nice', '-n', '10', 'ffmpeg', '-hide_banner', '-nostats', '-copyts', '-ss', f'{max(0, n - 60) / 24:.6f}', '-to', f'{(n + K + 1) / 24:.6f}', '-i', f, '-i', src, '-filter_complex', g, '-f', 'null', '-'], capture_output=True, text=True)
    if e.returncode: print(e.stderr[-600:]); sys.exit(2)
    v = json.load(open(f'{T}/v.json')); p = v['pooled_metrics']; rows.append(dict(frame=n, frames=len(v['frames']), vmaf=round(p['vmaf']['mean'], 2), vmaf_min=round(p['vmaf']['min'], 2), psnr_y=round(p['psnr_y']['mean'], 2), ssim=round(p['float_ssim']['mean'], 4))); print(rows[-1], flush=True)
def ok(name, passed, info=None): out.append(dict(name=name, passed=bool(passed), info=info)); print('PASS' if passed else 'FAIL', name, json.dumps(info), flush=True)
m = [r['vmaf'] for r in rows]; mn = min(rows, key=lambda r: r['vmaf_min']); ok('every window was compared frame by frame', all(r['frames'] == K for r in rows), len(rows)); ok('VMAF mean of every window at or above 96', min(m) >= 96, dict(model=model, mean=round(sum(m) / len(m), 2), lowest_window=min(m))); ok('no single frame under VMAF 93', mn['vmaf_min'] >= 93, dict(frame_window=mn['frame'], vmaf=mn['vmaf_min']))
res = dict(schema_version=1, file=os.path.basename(f), sha256=h.hexdigest(), time=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), passed=sum(x['passed'] for x in out), total=len(out), checks=out, rows=rows); open(outp + '.tmp', 'w').write(json.dumps(res, ensure_ascii=False, indent=1)); os.replace(outp + '.tmp', outp); print(f"{res['passed']}/{res['total']}"); sys.exit(0 if res['passed'] == res['total'] else 1)
