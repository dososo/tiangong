# contact sheet of any pictures: python3 tools/pics.py out.png cols W file...
import sys, os
from PIL import Image, ImageDraw
out, cols, W, fs = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in fs]; H = round(W * ims[0].height / ims[0].width); rows = (len(ims) + cols - 1) // cols; S = Image.new('RGB', (cols * W, rows * H))
for i, (im, f) in enumerate(zip(ims, fs)):
    S.paste(im.resize((W, H), Image.LANCZOS), ((i % cols) * W, (i // cols) * H)); ImageDraw.Draw(S).text(((i % cols) * W + 6, (i // cols) * H + 4), os.path.basename(f)[:-4], fill=(255, 235, 160))
S.save(out); print(out, S.size)
