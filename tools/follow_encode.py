#!/usr/bin/env python3
"""Encode the 4K picture track while the film is still rendering: waits for each chunk, feeds it to one x265 encoder, writes a record that tools/encode.mjs checks before it uses the track.
python3 tools/follow_encode.py [chunk dir] [out track.mp4] [--frames n] [--wait minutes]   (settings come from `node tools/encode.mjs --print4k`)"""
import sys, os, json, subprocess, time, hashlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); os.chdir(ROOT); av = sys.argv[1:]
def opt(k, d):
    if '--' + k not in av: return d
    i = av.index('--' + k); v = av[i + 1]; del av[i:i + 2]; return v
limit, patience = int(opt('frames', 0)), float(opt('wait', 60)); D = av[0] if av else 'out/film4k'; OUT = av[1] if len(av) > 1 else 'out/enc/v4k.mp4'; STEP = 96
S = json.loads(subprocess.run(['node', 'tools/encode.mjs', '--print4k'], capture_output=True, text=True, check=True).stdout); N = limit or S['frames']; os.makedirs(os.path.dirname(OUT), exist_ok=True); tmp = OUT.replace('.mp4', '.tmp.mp4')
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 22), b''): h.update(b)
    return h.hexdigest()
def packets(p): return int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', p], capture_output=True, text=True, check=True).stdout.strip().rstrip(','))
enc = subprocess.Popen(['nice', '-n', '15', 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'yuv422p10le', '-video_size', '3840x2160', '-framerate', str(S['fps']), '-color_range', 'tv', '-colorspace', 'bt709', '-chroma_sample_location', 'left', '-i', '-', '-map', '0:v:0', '-filter:v:0', S['vf'], '-r:v:0', str(S['fps']), '-fps_mode:v:0', 'cfr', *S['vcodec'], *S['tags'], '-f', 'mp4', tmp], stdin=subprocess.PIPE)
rec = dict(schema_version=1, settings={k: S[k] for k in ('vf', 'vcodec', 'tags', 'fps', 'frames')}, chunks=[]); t0 = time.time(); a = 0
try:
    while a < N:
        f = os.path.join(D, f'c_{a:05d}_{a + STEP:05d}.mkv'); t = time.time()
        while not os.path.exists(f):
            if enc.poll() is not None: raise SystemExit(f'encoder stopped with {enc.returncode}')
            if time.time() - t > patience * 60: raise SystemExit(f'gave up waiting for {f}')
            time.sleep(3)
        n = packets(f)
        if n != STEP: raise SystemExit(f'{f} holds {n} frames')
        take = min(STEP, N - a); r = subprocess.run(['nice', '-n', '15', 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', f, '-map', '0:v:0', '-frames:v', str(take), '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'yuv422p10le', '-'], stdout=enc.stdin)
        if r.returncode: raise SystemExit(f'{f} did not decode')
        rec['chunks'].append(dict(file=os.path.basename(f), sha256=sha(f))); a += take; print(time.strftime('%H:%M:%S', time.gmtime()), os.path.basename(f), 'fed;', a, 'frames in', round((time.time() - t0) / 60, 1), 'min', flush=True)
    enc.stdin.close(); code = enc.wait()
    if code: raise SystemExit(f'encoder failed with {code}')
except BaseException:
    enc.kill(); raise
n = packets(tmp)
if n != N: raise SystemExit(f'track holds {n} frames, not {N}')
os.replace(tmp, OUT); rec['sha256'] = sha(OUT); rec['frames'] = n; rec['bytes'] = os.path.getsize(OUT); rec['minutes'] = round((time.time() - t0) / 60, 1)
open(OUT + '.json.tmp', 'w').write(json.dumps(rec, indent=1)); os.replace(OUT + '.json.tmp', OUT + '.json'); print('done', n, 'frames', round(rec['bytes'] / 1e6, 1), 'MB', round(rec['bytes'] * 8 / (n / S['fps']) / 1e6, 1), 'Mbit/s', rec['minutes'], 'min', rec['sha256'])
