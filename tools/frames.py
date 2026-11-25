# contact sheet of listed frames. usage: frames.py <dir> out.png W cols f1 f2 ...
import sys, os, glob, subprocess, re, io
from PIL import Image, ImageDraw
d, out, W, cols = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]); fs = [int(x) for x in sys.argv[5:]]
ch = sorted(glob.glob(os.path.join(d, 'c_*.mkv'))); rg = [(int(a), int(b), f) for f in ch for a, b in [re.search(r'c_(\d+)_(\d+)', f).groups()]]
ims = []
for n in fs:
    a, b, f = next(r for r in rg if r[0] <= n < r[1]); p = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'select=eq(n\\,{n-a}),scale={W}:-2', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True).stdout
    im = Image.open(io.BytesIO(p)).convert('RGB'); ImageDraw.Draw(im).text((4, 3), f'f{n} {n/24:.2f}s', fill=(255, 230, 120)); ims.append(im)
w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols; S = Image.new('RGB', (w * cols, h * rows))
for i, im in enumerate(ims): S.paste(im, (i % cols * w, i // cols * h))
S.save(out); print(out, S.size)
