# Frame-difference scan for the eye: cuts, jumps and the highest one-frame scores. usage: python3 tools/fdiff.py <dir> [W]
import sys, glob, os, json, subprocess, numpy as np
d = sys.argv[1]; W = int(sys.argv[2]) if len(sys.argv) > 2 else 320; H = W * 9 // 16 // 2 * 2
shots = json.load(open(os.path.join(d, 'shots.json'))) if os.path.exists(os.path.join(d, 'shots.json')) else None
fr = []
for f in sorted(f for f in glob.glob(os.path.join(d, 'c_*.mkv')) if '.tmp.' not in f):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'scale={W}:{H}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    fr.append(np.frombuffer(p, np.uint8).reshape(-1, H, W, 3))
F = np.concatenate(fr).astype(np.float32); N = len(F); print('frames', N)
m = F.mean((1, 2, 3)); d1 = np.abs(F[1:] - F[:-1]).mean((1, 2, 3))
g = np.zeros(N); loc = np.zeros(N)
for i in range(1, N - 1):
    e = np.abs(F[i] - (F[i - 1] + F[i + 1]) * .5) ; base = np.abs(F[i + 1] - F[i - 1]) * .5
    x = np.maximum(e - base, 0).mean(2); g[i] = x.mean(); b = x[:H // 8 * 8, :W // 8 * 8].reshape(H // 8, 8, W // 8, 8).mean((1, 3)); loc[i] = b.max()
np.savez(os.path.join(d, 'fdiff.npz'), m=m, d1=d1, g=g, loc=loc)
cuts = [i + 1 for i in range(N - 1) if d1[i] > 12 and d1[i] > 4 * np.median(d1[max(0, i - 12):i + 13])]
print('hard changes at', cuts)
black = [i for i in range(N) if m[i] < 1.0]; print('black frames', len(black), (black[0], black[-1]) if black else '')
print('highest one-frame scores, whole picture (a list for the eye, not a verdict: fast pans score high in every frame; the pass/fail test is the relative one in tools/verify_film.py):'); o = np.argsort(-g)[:24]
for i in sorted(o): print(f'  f{i} t={i/24:.3f} g={g[i]:.2f} loc={loc[i]:.1f} d1={d1[i-1]:.2f},{d1[i]:.2f}' if 0 < i < N - 1 else '')
print('highest one-frame scores, local (a list for the eye: whip pan, blink, passing cranes and petals):'); o = np.argsort(-loc)[:36]
for i in sorted(o): print(f'  f{i} t={i/24:.3f} loc={loc[i]:.1f} g={g[i]:.2f}')
# jumps in motion that are not cuts
r = d1 / (1e-3 + np.array([np.median(d1[max(0, i - 8):i + 9]) for i in range(N - 1)])); o = np.argsort(-r)[:30]
print('motion jumps:'); 
for i in sorted(o): print(f'  f{i+1} t={(i+1)/24:.3f} d={d1[i]:.2f} ratio={r[i]:.1f}')
