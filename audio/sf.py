"""Minimal MIDI writer + fluidsynth offline renderer (no third-party MIDI package)."""
import struct, subprocess, os, tempfile, hashlib, numpy as np, soundfile as sf
SR = 48000
A = os.path.join(os.environ.get('TG_SAMPLES') or os.path.join(os.path.dirname(os.path.realpath(__file__)), '..', 'samples'), '') # the sample library is not part of this repository: put the files of https://github.com/dososo/blcaptain-code-band/releases/tag/soundfonts-v1 here, or point TG_SAMPLES at them
SF2 = dict(sheng=A+'chinese-expansion-20261031/Sheng-Old-CCBY4-v1.sf2', dizi=A+'chinese-expansion-20261031/Dizi-SUTD-Membrane-v2.sf2', xiao=A+'chinese-expansion-20261031/Xiao-CC0-HQ-v1.sf2', pipa=A+'chinese-expansion-20261031/PipaSet-CCBY4-v1.sf2', jingju=A+'chinese-expansion-20261031/Jingju-Percussion-CCBY3-v2.sf2', guqin=A+'guqin-20261103/Guqin-GuqinSonGest-v2.sf2', guzheng=A+'guzheng-20261103/Guzheng-Pufermufin-Sliced-v3.sf2', erhu=A+'erhu-20261103/Erhu-Aliexpress-CC0-v2.sf2', xun=A+'china-xun-ccby4/Xun-CCBY4-3keys.sf2', tamtam=A+'pjcohen-orchestral-tamtam-bya-20261102/PJCohen-Orchestral-TamTam.sf2',
    timp=A+'vsco2-20261103/vsco_timpani_v2.sf2', horn=A+'vsco2-20261103/vsco_french_horn_v2.sf2', cello=A+'vsco2-20261103/vsco_cello_section.sf2', viola=A+'vsco2-20261103/vsco_viola_section.sf2', violin=A+'vsco2-20261103/vsco_violin_section.sf2', bass=A+'vsco2-20261103/vsco_contrabass_solo_v2.sf2', tbn=A+'vsco2-20261103/vsco_trombone_v2.sf2', tuba=A+'vsco2-20261103/vsco_tuba.sf2', harp=A+'vsco2-20261103/vsco_harp.sf2', glock=A+'vsco2-20261103/vsco_glockenspiel.sf2', ms=A+'soundfonts/MuseScore_General.sf3')
SF2 = {k: p if os.path.exists(p) else A + os.path.basename(p) for k, p in SF2.items()} # folders as they were here, or all files side by side
TPQ = 960; TPS = TPQ * 2  # 120 bpm -> 1920 ticks per second
def vlq(n):
    b = [n & 127]; n >>= 7
    while n: b.append((n & 127) | 128); n >>= 7
    return bytes(reversed(b))
class Track:
    """notes: (t, dur, key(float ok -> bend), vel). cc curves: (t, cc, val)"""
    def __init__(self, sf2, prog=0, bank=0, ch=0): self.sf2, self.prog, self.bank, self.ch, self.ev = sf2, prog, bank, ch, []
    def note(self, t, d, k, v, ch=None, detune=None):
        ch = self.ch if ch is None else ch; ki = int(round(k)); self.ev.append((t, 1, bytes([0x90 | ch, ki, max(1, min(127, int(v)))]))); self.ev.append((t + d, 0, bytes([0x80 | ch, ki, 0]))); return self
    def cc(self, t, c, v, ch=None): self.ev.append((t, 0, bytes([0xB0 | (self.ch if ch is None else ch), c, max(0, min(127, int(round(v))))]))); return self
    def curve(self, pts, c=11, step=.04, ch=None):
        pts = sorted(pts); t = pts[0][0]
        while t <= pts[-1][0] + 1e-6:
            for (a, va), (b, vb) in zip(pts, pts[1:]):
                if a <= t <= b: f = (t - a) / max(1e-9, b - a); self.cc(t, c, va + (vb - va) * f, ch); break
            t += step
        return self
    def bend(self, t, semis, ch=None, rng=2.0):
        v = int(8192 + 8191 * max(-1, min(1, semis / rng))); self.ev.append((t, 0, bytes([0xE0 | (self.ch if ch is None else ch), v & 127, (v >> 7) & 127]))); return self
    def midi(self):
        ev = [(0, -2, bytes([0xB0 | c, 0, self.bank])) for c in range(8)] + [(0, -1, bytes([0xC0 | c, self.prog])) for c in range(8)] + sorted(self.ev, key=lambda e: (e[0], e[1])); out = b''; last = 0
        for t, _, b in ev: k = int(round(t * TPS)); out += vlq(max(0, k - last)) + b; last = max(last, k)
        out += vlq(TPS) + b'\xff\x2f\x00'; hdr = b'MThd' + struct.pack('>IHHH', 6, 0, 1, TPQ); tempo = b'\x00\xff\x51\x03' + struct.pack('>I', 500000)[1:]; body = tempo + out; return hdr + b'MTrk' + struct.pack('>I', len(body)) + body
    def render(self, total, gain=.6, cache=True):
        m = self.midi(); key = hashlib.sha1(m + self.sf2.encode() + str(gain).encode()).hexdigest()[:16]; d = os.path.join(os.path.dirname(__file__), '.cache'); os.makedirs(d, exist_ok=True); wav = os.path.join(d, key + '.wav')
        if not (cache and os.path.exists(wav)):
            mid = os.path.join(d, key + '.mid'); open(mid, 'wb').write(m); tmp = wav + '.tmp.wav'
            subprocess.run(['fluidsynth', '-ni', '-q', '-g', str(gain), '-R', '0', '-C', '0', '-r', str(SR), '-O', 'float', '-T', 'wav', '-F', tmp, SF2.get(self.sf2, self.sf2), mid], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); os.replace(tmp, wav); os.remove(mid)
        x, sr = sf.read(wav, dtype='float32', always_2d=True); n = int(total * SR); y = np.zeros((n, 2), np.float32); k = min(n, len(x)); y[:k] = x[:k, :2]; return y
