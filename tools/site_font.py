#!/usr/bin/env python3
"""Subset the local Noto Serif SC variable font (OFL-1.1) to the characters of the landing page and the covers, at weights 200 and 400.
python3 tools/site_font.py <NotoSerifSC-VF.ttf> [folder of index.html]   -> media/fonts/serif-200.woff2, serif-400.woff2"""
import html, os, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
ROOT = os.path.realpath(os.path.join(os.path.dirname(os.path.realpath(__file__)), '..')); src = sys.argv[1]; SITE = os.path.join(ROOT, sys.argv[2] if len(sys.argv) > 2 else 'publish/repo' if os.path.isdir(os.path.join(ROOT, 'publish/repo')) else '.')
text = html.unescape(re.sub(r'<(script|style)\b.*?</\1>', '', open(os.path.join(SITE, 'index.html'), encoding='utf8').read(), flags=re.S))
for f in ('tools/covers.mjs', 'tools/stills.py'):
    p = os.path.join(ROOT, f); text += open(p, encoding='utf8').read() if os.path.exists(p) else ''
chars = {c for c in text if ord(c) > 0x7f} | {chr(i) for i in range(0x20, 0x7f)} | set('「」『』，。；：、？！（）…—·–／　')
for w in (200, 400):
    font = instancer.instantiateVariableFont(TTFont(src), {'wght': w})
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['vert', 'vrt2', 'kern', 'liga', 'locl', 'lnum', 'tnum', 'halt', 'vhal', 'chws', 'vchw']; opt.drop_tables += ['DSIG']; opt.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    s = subset.Subsetter(opt); s.populate(unicodes=[ord(c) for c in chars]); s.subset(font); cmap = font.getBestCmap()
    out = os.path.join(SITE, f'media/fonts/serif-{w}.woff2'); os.makedirs(os.path.dirname(out), exist_ok=True); subset.save_font(font, out + '.tmp', opt); os.replace(out + '.tmp', out)
    print(w, len(chars), 'characters,', os.path.getsize(out), 'bytes; missing:', ''.join(sorted(c for c in chars if ord(c) > 0x7f and ord(c) not in cmap)) or 'none')
