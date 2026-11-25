# residual noise report from tools/noise.mjs pairs. usage: noise.py dir out_prefix [block]
import sys, os, glob, numpy as np
from PIL import Image
d, out = sys.argv[1], sys.argv[2]; B = int(sys.argv[3]) if len(sys.argv) > 3 else 40; rows = []
for a in sorted(glob.glob(os.path.join(d, '*_0.png'))):
    n = os.path.basename(a)[:-6]; A = Image.open(a).convert('RGB'); x = np.asarray(A).astype(np.float32); y = np.asarray(Image.open(a[:-5] + '1.png').convert('RGB')).astype(np.float32); D = (x - y) @ np.array([.3, .6, .1], np.float32); h, w = D.shape; h2, w2 = h // B * B, w // B * B
    v = np.sqrt((D[:h2, :w2] ** 2).reshape(h2 // B, B, w2 // B, B).mean((1, 3)) / 2); L = (x @ np.array([.3, .6, .1]))[:h2, :w2].reshape(h2 // B, B, w2 // B, B).mean((1, 3)); t = v.copy(); tops = []
    for _ in range(3):
        j, i = np.unravel_index(t.argmax(), t.shape); tops.append((int(i * B + B // 2), int(j * B + B // 2), round(float(t[j, i]), 2))); t[max(0, j - 7):j + 8, max(0, i - 10):i + 11] = 0
    print(f'{n:10s} median {np.median(v):5.2f}  p95 {np.percentile(v,95):5.2f}  p99 {np.percentile(v,99):5.2f}  max {v.max():5.2f}  worst {tops}'); rows.append((n, A, tops))
CW, CH = 480, 360
S = Image.new('RGB', (CW * 4, CH * len(rows)))
from PIL import ImageDraw
for r, (n, A, tops) in enumerate(rows):
    S.paste(A.resize((CW, int(CW * A.size[1] / A.size[0])), Image.LANCZOS), (0, r * CH)); dr = ImageDraw.Draw(S); dr.text((6, r * CH + 4), n, fill=(255, 220, 90))
    for k, (cx, cy, s) in enumerate(tops):
        x0 = min(max(cx - CW // 2, 0), A.size[0] - CW); y0 = min(max(cy - CH // 2, 0), A.size[1] - CH); S.paste(A.crop((x0, y0, x0 + CW, y0 + CH)), ((k + 1) * CW, r * CH)); dr.text(((k + 1) * CW + 6, r * CH + 4), f'{s}', fill=(255, 220, 90)); dr.rectangle([x0 * CW // A.size[0], r * CH + y0 * CW // A.size[0], (x0 + CW) * CW // A.size[0], r * CH + (y0 + CH) * CW // A.size[0]], outline=(255, 90, 60))
H = 5
for p in range(0, len(rows), H): S.crop((0, p * CH, CW * 4, min(len(rows), p + H) * CH)).save(f'{out}_{p // H}.jpg', quality=92)
