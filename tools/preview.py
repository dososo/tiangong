#!/usr/bin/env python3
"""A small copy for phones and chat windows (720p, HEVC, under 30 MiB), made from the 1080p master: python3 tools/preview.py [out.mp4]"""
import sys, os, subprocess, tempfile
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); os.chdir(ROOT); out = sys.argv[1] if len(sys.argv) > 1 else 'delivery/tiangong_preview_720p.mp4'; T = tempfile.mkdtemp(); tmp = out.replace('.mp4', '.tmp.mp4')
LIMIT, DUR, AK = 30 * 1024 * 1024, 168, 128; vk = int((LIMIT * .955 * 8 / DUR - AK * 1000) / 1000); src = 'delivery/tiangong_1080p.mp4'
vf = 'scale=1280:720:flags=lanczos+accurate_rnd+full_chroma_int:sws_dither=ed,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709'
base = ['nice', '-n', '10', 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src]
def x265(p): return ['-c:v:0', 'libx265', '-preset:v:0', 'slow', '-b:v:0', f'{vk}k', '-tag:v:0', 'hvc1', '-x265-params:v:0', f'pass={p}:stats={T}/x.log:log-level=error:aq-mode=3:psy-rd=1.5:bframes=6:keyint=120:rc-lookahead=48:open-gop=0:colorprim=bt709:transfer=iec61966-2-1:colormatrix=bt709:range=limited', '-color_primaries:v:0', 'bt709', '-color_trc:v:0', 'iec61966-2-1', '-colorspace:v:0', 'bt709', '-color_range:v:0', 'tv']
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'delivery/stills/21_J_天宫.jpg', '-vf', 'scale=960:-2:flags=lanczos', '-q:v', '4', f'{T}/c.jpg'], check=True)
subprocess.run(base + ['-map', '0:v:0', '-filter:v:0', vf] + x265(1) + ['-an', '-f', 'null', '-'], check=True)
subprocess.run(base + ['-i', f'{T}/c.jpg', '-map', '0:v:0', '-map', '0:a:0', '-map', '1:v:0', '-filter:v:0', vf] + x265(2) + ['-c:v:1', 'copy', '-disposition:v:1', 'attached_pic', '-c:a', 'aac_at', '-b:a', f'{AK}k', '-movflags', '+faststart', '-metadata', 'title=天宫', '-metadata', 'comment=预览版 720p · 署名与授权见 CREDITS.md', tmp], check=True)
n = os.path.getsize(tmp); print(vk, 'kbit/s', n, 'bytes', 'OK' if n < LIMIT else 'TOO LARGE')
if n >= LIMIT: sys.exit(1)
os.replace(tmp, out)
