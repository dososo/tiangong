#!/usr/bin/env python3
"""Do the skies step? Five soft gradients from both masters, local contrast x14, 1080p (8 bit) left, 4K (10 bit) right, for the eye: python3 tools/banding.py [out.jpg]"""
import sys, os, subprocess, numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); os.chdir(ROOT); out = sys.argv[1] if len(sys.argv) > 1 else 'evidence/banding.jpg'
CROPS = [(9.4, 0, 0), (91, 0, 540), (102.4, 960, 40), (114, 0, 60), (160, 0, 100)]
def grab(f, t, big):
    vf = ('scale=1920:1080:flags=area:' if big else 'scale=') + 'in_color_matrix=bt709:in_range=tv:out_range=pc,format=' + ('rgb48le' if big else 'rgb24')
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', f, '-map', '0:v:0', '-frames:v', '1', '-vf', vf, '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(r, '<u2' if big else np.uint8).reshape(1080, 1920, 3).astype(np.float32) / (257 if big else 1)
rows = []
for t, x, y in CROPS:
    two = []
    for f, big in [('delivery/tiangong_1080p.mp4', False), ('delivery/tiangong_4k.mp4', True)]:
        l = grab(f, t, big)[y:y + 540, x:x + 960].mean(2); two.append(np.clip((gaussian_filter(l, 2.0) - gaussian_filter(l, 60)) * 14 + 128, 0, 255))
    rows.append(np.concatenate(two, 1))
a = np.concatenate(rows, 0).astype(np.uint8); Image.fromarray(a).resize((1440, a.shape[0] * 1440 // a.shape[1])).save(out + '.tmp', 'JPEG', quality=88); os.replace(out + '.tmp', out); print(out, a.shape)
