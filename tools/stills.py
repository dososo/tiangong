#!/usr/bin/env python3
"""4K stills out of the finished chunks: python3 tools/stills.py [chunk dir] [out dir] [--try id:t,id:t …]"""
import sys, os, re, subprocess, hashlib, json
from PIL import Image
import numpy as np
av = sys.argv[1:]; extra = av[av.index('--try') + 1:] if '--try' in av else None; av = av[:av.index('--try')] if '--try' in av else av
D = av[0] if av else 'out/film4k'; O = av[1] if len(av) > 1 else 'delivery/stills'; FPS = 24; W, H = 3840, 2160
PICK = [('01_A_初登上界', 9.4), ('02_B1_龙柱晨光', 20.6), ('03_B2_赤须龙', 25.8), ('04_B3_南天门', 32.8), ('05_C_门开', 43.6), ('06_D_金碧', 51.4), ('07_D_三十三座天宫', 59.0), ('08_D_青绿', 68.4), ('09_E1_复道回廊', 75.0), ('10_E2_龙凤翱翔', 80.4), ('11_E3_飞天', 85.4), ('12_F1_金乌着底飞', 93.4), ('13_F2_玉兔坛边过', 102.4), ('14_G1_丹墀', 109.4), ('15_G2_万圣朝王', 118.6), ('16_H_仰观藻井', 126.8), ('17_H_三十三重天', 132.4), ('18_H_俯观曼荼罗', 142.2), ('19_I_芥子须弥', 147.6), ('20_I_金睛', 151.0), ('21_J_天宫', 163.4)]
if extra: PICK = [(e.split(':')[0], float(e.split(':')[1])) for e in extra]
ch = sorted((int(m[1]), int(m[2]), os.path.join(D, m[0])) for m in (re.match(r'c_(\d+)_(\d+)\.mkv$', f) for f in os.listdir(D)) if m); os.makedirs(O, exist_ok=True); n = 0
for name, t in PICK:
    f = round(t * FPS); c = next((c for c in ch if c[0] <= f < c[1]), None)
    if not c: print('not rendered yet', name, f); continue
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', c[2], '-vf', f"select='eq(n\\,{f - c[0]})',scale=in_color_matrix=bt709:flags=accurate_rnd+full_chroma_int", '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True); a = np.frombuffer(r.stdout, np.uint8).reshape(H, W, 3); p = os.path.join(O, name + '.jpg'); Image.fromarray(a).save(p + '.tmp', 'JPEG', quality=95, subsampling=0, optimize=True); os.replace(p + '.tmp', p); n += 1; print(name, 'frame', f, round(os.path.getsize(p) / 1e6, 2), 'MB')
print(n, 'stills')
