#!/usr/bin/env python3
"""Copies of the film for web pages (two passes, start playing before they are all there), made from the 4K master.
python3 tools/web_film.py [--only hevc|1080|720]
  tiangong-1080p-hevc.mp4   HEVC Main 10, what the page offers first (Safari; Chrome and Firefox where the machine decodes it)
  tiangong-720p.mp4         H.264, plays everywhere, the page's second choice
  tiangong-1080p.mp4        H.264, for downloading"""
import os, sys, subprocess, tempfile, hashlib
ROOT = os.path.realpath(os.path.join(os.path.dirname(os.path.realpath(__file__)), '..')); os.chdir(ROOT); SRC, OUT = 'delivery/tiangong_4k.mp4', 'publish/web' if os.path.isdir('publish/repo') else 'out/web'; os.makedirs(OUT, exist_ok=True)
only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else ''
JOBS = [('1080', 1920, 1080, 5800, 192, 'tiangong-1080p.mp4', 'yuv420p', ['-profile:v', 'high', '-level', '4.1']), ('720', 1280, 720, 1750, 160, 'tiangong-720p.mp4', 'yuv420p', ['-profile:v', 'high', '-level', '3.1']), ('hevc', 1920, 1080, 2250, 160, 'tiangong-1080p-hevc.mp4', 'yuv420p10le', ['-profile:v', 'main10', '-tag:v', 'hvc1'])]
TAGS = ['-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1', '-colorspace', 'bt709', '-color_range', 'tv']
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 22), b''): h.update(b)
    return h.hexdigest()
for key, w, h, vk, ak, name, pix, prof in JOBS:
    if only and only != key: continue
    T = tempfile.mkdtemp(); out = os.path.join(OUT, name); tmp = out.replace('.mp4', '.tmp.mp4')
    vf = f'scale={w}:{h}:flags=lanczos+accurate_rnd+full_chroma_int:sws_dither=ed,format={pix},setparams=range=tv:color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709'
    if key == 'hevc': v = lambda p: ['-c:v', 'libx265', '-preset', 'slow', '-b:v', f'{vk}k', '-x265-params', f'pass={p}:stats={T}/x:vbv-maxrate={vk * 3}:vbv-bufsize={vk * 5}:keyint=96:aq-mode=3:psy-rd=1.2:deblock=-1,-1:log-level=error:colorprim=bt709:transfer=iec61966-2-1:colormatrix=bt709:range=limited'] + prof + TAGS
    else: v = lambda p: ['-c:v', 'libx264', '-preset', 'slower', '-b:v', f'{vk}k', '-maxrate', f'{vk * 2}k', '-bufsize', f'{vk * 4}k', '-pass', str(p), '-passlogfile', f'{T}/x', '-x264-params', 'aq-mode=3:deblock=-1,-1:psy-rd=1.0,0.10:keyint=96:bframes=6:ref=4:rc-lookahead=60:log-level=0'] + prof + TAGS
    base = ['nice', '-n', '10', 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', SRC, '-map', '0:v:0']
    subprocess.run(base + ['-vf', vf] + v(1) + ['-an', '-f', 'null', '-'], check=True)
    subprocess.run(base + ['-map', '0:a:0', '-vf', vf] + v(2) + ['-c:a', 'aac_at', '-b:a', f'{ak}k', '-ar', '48000', '-movflags', '+faststart', '-map_metadata', '-1', '-metadata', 'title=天宫', '-metadata', 'comment=西游记 第四回 · 署名与授权见 CREDITS.md', tmp], check=True)
    os.replace(tmp, out); print(name, os.path.getsize(out), 'bytes', sha(out), flush=True)
