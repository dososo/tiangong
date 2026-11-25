#!/usr/bin/env python3
"""Subset the local Noto Serif SC variable font (OFL-1.1) to the characters the roaming page uses, at weight 400.
usage: python3 tools/ui_font.py <NotoSerifSC-VF.ttf>   -> src/explore/uifont.js, src/explore/ui-serif-400.woff2"""
import base64, glob, io, os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), '..')); src = sys.argv[1]
text = open(os.path.join(ROOT, 'explore.html'), encoding='utf8').read()
for f in sorted(glob.glob(os.path.join(ROOT, 'src/explore/*.js'))):
    if os.path.basename(f) not in ('uifont.js', 'ambient.js'): text += open(f, encoding='utf8').read()
chars = {c for c in text if ord(c) > 0x7f} | {chr(i) for i in range(0x20, 0x7f)} | set('「」『』，。；：、？！（）…—·／　')
font = TTFont(src); font = instancer.instantiateVariableFont(font, {'wght': 400})
opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = ['vert', 'vrt2', 'kern', 'liga', 'locl']; opt.drop_tables += ['DSIG']; opt.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
s = subset.Subsetter(opt); s.populate(unicodes=[ord(c) for c in chars]); s.subset(font)
missing = sorted(c for c in chars if ord(c) > 0x7f and ord(c) not in font.getBestCmap())
out = os.path.join(ROOT, 'src/explore/ui-serif-400.woff2'); subset.save_font(font, out + '.tmp', opt); os.replace(out + '.tmp', out); b = open(out, 'rb').read()
js = os.path.join(ROOT, 'src/explore/uifont.js'); open(js + '.tmp', 'w').write('// Subset of Noto Serif SC (OFL-1.1, notofonts/noto-cjk Serif2.003), weight 400. Made by tools/ui_font.py.\nexport const UIFONT = "' + base64.b64encode(b).decode() + '";\n'); os.replace(js + '.tmp', js)
print(len(chars), 'characters,', len(b), 'bytes; missing:', ''.join(missing) or 'none')
