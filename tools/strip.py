# contact strip from rendered chunks: python3 tools/strip.py <dir> <t0> <t1> <step> [cols] [W] -> out/strip.png
import sys, subprocess, os, glob, json
from PIL import Image, ImageDraw
d, t0, t1, st = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]); cols = int(sys.argv[5]) if len(sys.argv) > 5 else 6; W = int(sys.argv[6]) if len(sys.argv) > 6 else 330
fs = sorted(glob.glob(d + '/c_*.mkv')); fs = [f for f in fs if '.tmp' not in f]; ims = []; t = t0
while t < t1 - 1e-6:
    n = int(round(t * 24)); f = next((f for f in fs if int(f[-15:-10]) <= n < int(f[-9:-4])), None)
    if f:
        k = n - int(f[-15:-10]); p = '/tmp/_s.jpg'; subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(k / 24 + .001), '-i', f, '-frames:v', '1', '-q:v', '2', p]); im = Image.open(p).convert('RGB'); im = im.resize((W, int(W * im.height / im.width)), Image.LANCZOS); ImageDraw.Draw(im).text((4, 3), '%.2f' % t, fill=(255, 255, 255)); ims.append(im)
    t += st
rows = (len(ims) + cols - 1) // cols; h = ims[0].height; out = Image.new('RGB', (cols * W, rows * h))
for i, im in enumerate(ims): out.paste(im, ((i % cols) * W, (i // cols) * h))
out.save('out/strip.png'); print(len(ims), out.size)
