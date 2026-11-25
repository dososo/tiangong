#!/usr/bin/env python3
"""Pictures of the web page and the README: plates (out/plates, made by tools/plates.mjs and tools/roam_shots.mjs) and 4K stills (delivery/stills, made by tools/stills.py) at web sizes.
python3 tools/page_media.py   -> media/page/*.webp, media/stills/*.jpg and *.webp"""
import os, glob, json
from PIL import Image
ROOT = os.path.realpath(os.path.join(os.path.dirname(os.path.realpath(__file__)), '..')); os.chdir(ROOT); DRAFT = os.path.isdir('publish/repo'); OUT, PLATES, LIST = ('publish/repo/media', 'publish/plates', 'publish/stills.json') if DRAFT else ('media', 'out/plates', 'out/stills.json')
def save(im, p, **k):
    os.makedirs(os.path.dirname(p), exist_ok=True); t = p + '.tmp'; im.save(t, {'.webp': 'WEBP', '.jpg': 'JPEG'}[os.path.splitext(p)[1]], **k); os.replace(t, p); return os.path.getsize(p)
def fit(im, w): return im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
WEBP = dict(quality=80, method=6); total = 0; n = 0
MAIN, SMALL = ['ink', 'jade', 'rabbit', 'caisson', 'home'], ['gate', 'dragon', 'doors', 'corridor', 'apsara', 'crow', 'court', 'audience', 'mandala', 'eye', 'golden_eye']
for name, widths in [('hero', (2560, 1600)), ('hero_tall', (1080,)), ('gold', (1600,))] + [(m, (2000, 1200)) for m in MAIN] + [(s, (1200, 700)) for s in SMALL]:
    im = Image.open(f'{PLATES}/{name}.png').convert('RGB')
    for w in widths: total += save(fit(im, w), f'{OUT}/page/{name}-{w}.webp', **WEBP); n += 1
if os.path.exists(f'{PLATES}/roam.png'):
    im = Image.open(f'{PLATES}/roam.png').convert('RGB')
    for w in (2000, 1200): total += save(fit(im, w), f'{OUT}/page/roam-{w}.webp', **WEBP); n += 1
st = []
for p in sorted(glob.glob('delivery/stills/*.jpg')):
    k, shot, title = os.path.splitext(os.path.basename(p))[0].split('_', 2); im = Image.open(p).convert('RGB')
    total += save(fit(im, 1920), f'{OUT}/stills/{k}.jpg', quality=84, optimize=True, progressive=True, subsampling=0) + save(fit(im, 720), f'{OUT}/stills/{k}-720.webp', **WEBP); n += 2; st.append([k, shot, title])
json.dump(st, open(LIST, 'w', encoding='utf8'), ensure_ascii=False)
print(n, 'pictures', round(total / 1e6, 1), 'MB')
