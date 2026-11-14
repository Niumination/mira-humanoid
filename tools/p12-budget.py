#!/usr/bin/env python3
"""p12-budget.py — anggaran galat MIRA: DI MANA galat berada, berapa bagian struktur vs terang,
dan berapa lebar filamen kita dibanding live.

Pakai: python3 tools/p12-budget.py [--dir /tmp/p12] [--t 9.5] [--ours r0] [--live live]
Keluaran: tabel peta MAE 6x8, 10 blok penyumbang terbesar, porsi frekuensi-tinggi per pita torso,
statistik filamen (lebar run terang) per pita, uji skala/geser global, dan ringkasan JSON.

Kenapa alat ini ada: sesi 57 membuktikan sisa galat P12 BUKAN bias/gain/geser/skala, melainkan
STRUKTUR (76-90 % galat frekuensi tinggi). Tanpa alat ini, sesi berikutnya akan mengulang sapu knob
yang sama dan mendapat kesimpulan yang sama.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter

D = sys.argv[sys.argv.index('--dir') + 1] if '--dir' in sys.argv else '/tmp/p12'
T = sys.argv[sys.argv.index('--t') + 1] if '--t' in sys.argv else '9.5'
OURS = sys.argv[sys.argv.index('--ours') + 1] if '--ours' in sys.argv else 'r0'
LIVE = sys.argv[sys.argv.index('--live') + 1] if '--live' in sys.argv else 'live'
TORSO = (520, 400, 900, 780)                  # x0, y0, x1, y1
PITA = {'atas 400-496': (400, 496), 'tengah 496-620': (496, 620), 'bawah 620-780': (620, 780)}


def A(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32).mean(2)


def blur(a, r):
    return np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)


L = A(f'{D}/{LIVE}-{T}.png')
O = A(f'{D}/{OURS}-{T}.png')
d = np.abs(O - L)
H, W = d.shape
out = {'t': T, 'mae': round(float(d.mean()), 3)}

# ---- 1. peta anggaran galat ----
rows, cols = 6, 8
grid, share, blocks = [], [], []
for i in range(rows):
    gr, sr = [], []
    for j in range(cols):
        y0, y1 = i * H // rows, (i + 1) * H // rows
        x0, x1 = j * W // cols, (j + 1) * W // cols
        m = float(d[y0:y1, x0:x1].mean())
        sh = float(d[y0:y1, x0:x1].sum() / d.sum() * 100)
        gr.append(round(m, 1)); sr.append(round(sh, 1))
        blocks.append((m, sh, y0, y1, x0, x1))
    grid.append(gr); share.append(sr)
blocks.sort(reverse=True)
print(f'MAE seluruh bingkai {out["mae"]}')
print('peta MAE 6x8:')
for r in grid:
    print('  ', ' '.join(f'{v:5.1f}' for v in r))
print('kontribusi ke MAE (%):')
for r in share:
    print('  ', ' '.join(f'{v:5.1f}' for v in r))
print('10 blok terburuk:')
for m, sh, y0, y1, x0, x1 in blocks[:10]:
    print(f'  MAE {m:5.1f} · {sh:4.1f}% · y{y0}-{y1} x{x0}-{x1}')
out['peta_mae'] = grid
out['peta_kontribusi_persen'] = share
out['blok_terburuk'] = [{'mae': round(m, 2), 'kontribusi_persen': round(sh, 2),
                         'y': [y0, y1], 'x': [x0, x1]} for m, sh, y0, y1, x0, x1 in blocks[:10]]

# ---- 2. struktur vs terang per pita torso ----
print('\npita torso: MAE · galat frekuensi-rendah (blur16) · frekuensi-tinggi · porsi struktur')
pita_out = {}
for n, (y0, y1) in PITA.items():
    l = L[y0:y1, TORSO[0]:TORSO[2]]; o = O[y0:y1, TORSO[0]:TORSO[2]]
    lo = float(np.abs(blur(o, 16) - blur(l, 16)).mean())
    hi = float(np.abs((o - blur(o, 16)) - (l - blur(l, 16))).mean())
    tot = float(np.abs(o - l).mean())
    pita_out[n] = {'mae': round(tot, 2), 'frekuensi_rendah': round(lo, 2),
                   'frekuensi_tinggi': round(hi, 2), 'porsi_struktur_persen': round(100 * hi / tot)}
    print(f'  {n:<16} {tot:6.2f} · {lo:6.2f} · {hi:6.2f} · {100*hi/tot:3.0f}%')
out['pita_torso'] = pita_out

# ---- 3. lebar filamen (run terang) ----
def runs(a, thr):
    res = []
    for row in a:
        c = 0
        for v in row:
            if v > thr:
                c += 1
            elif c:
                res.append(c); c = 0
        if c:
            res.append(c)
    return np.array(res) if res else np.array([0])


print('\nfilamen (ambang luma 110): piksel terang % · run median / p90 · segmen per baris')
fil = {}
for n, (y0, y1) in PITA.items():
    r = {}
    for nm, img in (('live', L), ('kita', O)):
        s = img[y0:y1, TORSO[0]:TORSO[2]]
        rr = runs(s, 110)
        r[nm] = {'terang_persen': round(float(100 * (s > 110).mean()), 1),
                 'run_median': float(np.median(rr)), 'run_p90': float(np.percentile(rr, 90)),
                 'segmen_per_baris': round(float(np.mean([(row > 110).sum() for row in s])), 1)}
    r['kita_minus_live'] = {'terang_persen': round(r['kita']['terang_persen'] - r['live']['terang_persen'], 1),
                            'run_p90': r['kita']['run_p90'] - r['live']['run_p90']}
    fil[n] = r
    print(f'  {n:<16} live {r["live"]["terang_persen"]:5.1f}% run p90 {r["live"]["run_p90"]:4.0f} · '
          f'kita {r["kita"]["terang_persen"]:5.1f}% run p90 {r["kita"]["run_p90"]:4.0f}')
out['filamen'] = fil

# ---- 4. uji skala & geser global (membuktikan bukan registrasi) ----
reg = (slice(120, 900), slice(430, 1010))
best = None
for s in (1.0, 0.998, 0.996, 1.002, 1.004):
    for dx in (-2, -1, 0, 1, 2):
        for dy in (-2, -1, 0, 1, 2):
            cy, cx = 520, 720
            M = np.array([[s, 0, (1 - s) * cx + dx], [0, s, (1 - s) * cy + dy]], dtype=np.float32)
            o = np.asarray(Image.fromarray(np.clip(O, 0, 255).astype(np.uint8)).transform(
                (W, H), Image.AFFINE, M.flatten()[:6], resample=Image.BILINEAR)).astype(np.float32)
            m = float(np.abs(o[reg] - L[reg]).mean())
            if best is None or m < best[0]:
                best = (m, s, dx, dy)
base = float(np.abs(O[reg] - L[reg]).mean())
print(f'\nskala/geser terbaik: MAE {best[0]:.3f} pada skala {best[1]} geser ({best[2]},{best[3]}) '
      f'· tanpa koreksi {base:.3f} ⇒ {"TIDAK ada salah daftar" if best[0] > base - 0.05 else "ADA salah daftar"}')
out['uji_skala_geser'] = {'mae_terbaik': round(best[0], 3), 'skala': best[1], 'dx': best[2], 'dy': best[3],
                          'mae_tanpa_koreksi': round(base, 3)}

json.dump(out, open(f'{D}/p12-budget-{T.replace(".", "")}.json', 'w'), indent=1, ensure_ascii=False)
print(f'\nJSON: {D}/p12-budget-{T.replace(".", "")}.json')
