#!/usr/bin/env python3
"""p12-warp-fit.py — P12 langkah 5: cari medan geser/regang HORIZONTAL per baris yang membuat
filamen torso kita jatuh di tempat filamen live.

Kenapa: langkah 4 membuktikan 76-90 % sisa galat adalah struktur (frekuensi tinggi <16 px) dan
semua knob terang/warna/skala GLOBAL sudah gugur. Yang belum dicoba: koreksi POSISI yang bergantung
pada baris (filamen kita melengkung beda dengan live walau pola besarnya sama, impitan 87 % @2 px).

Keluaran: koefisien polinom (skala & geser) + nilai per baris, disimpan JSON; dipakai shader lewat
uniform. Dipakai dengan: python3 tools/p12-warp-fit.py --dir /tmp/p12 --t 9.5
"""
import json
import sys

import numpy as np
from PIL import Image

D = sys.argv[sys.argv.index('--dir') + 1] if '--dir' in sys.argv else '/tmp/p12'
T = sys.argv[sys.argv.index('--t') + 1] if '--t' in sys.argv else '9.5'
OURS = sys.argv[sys.argv.index('--ours') + 1] if '--ours' in sys.argv else 'cur'
X0, X1, Y0, Y1 = 520, 900, 400, 780        # wilayah torso (layar px)
CX = (X0 + X1) / 2


def A(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32).mean(2)


L = A(f'{D}/live-{T}.png')
O = A(f'{D}/{OURS}-{T}.png')

rows = []
for y in range(Y0, Y1):
    l = L[y, X0:X1]
    o = O[y, :]                     # baris penuh supaya resample tidak keluar batas
    xall = np.arange(O.shape[1])
    best = None
    for s in np.arange(0.94, 1.061, 0.005):
        for dx in range(-10, 11):
            xs = np.clip((np.arange(X0, X1) - CX) / s + CX - dx, 0, O.shape[1] - 1)
            oi = np.interp(xs, xall, o)   # resample baris kita
            e = float(np.abs(oi - l).mean())
            if best is None or e < best[0]:
                best = (e, s, dx)
    rows.append({'y': y, 'err': best[0], 's': best[1], 'dx': best[2]})

s = np.array([r['s'] for r in rows])
dx = np.array([r['dx'] for r in rows])
err = np.array([r['err'] for r in rows])
base = np.array([float(np.abs(O[y, X0:X1] - L[y, X0:X1]).mean()) for y in range(Y0, Y1)])

print(f'per baris (t={T}): galat rata tanpa koreksi {base.mean():.2f} → setelah koreksi {err.mean():.2f}')
print(f'skala: rata {s.mean():.4f} · rentang {s.min():.3f}-{s.max():.3f} · median {np.median(s):.4f}')
print(f'geser: rata {dx.mean():+.2f} px · rentang {dx.min():+.0f}..{dx.max():+.0f} · median {np.median(dx):+.1f}')
# haluskan (median 9) supaya tidak overfit per baris
def smooth(a, k=9):
    pad = np.pad(a, k // 2, mode='edge')
    return np.array([np.median(pad[i:i + k]) for i in range(len(a))])

sm, sdx = smooth(s), smooth(dx)
v = (np.arange(Y0, Y1) - Y0) / (Y1 - Y0 - 1)          # 0..1 dari atas ke bawah torso
# polinom derajat 2 untuk skala-1 dan geser (dikurangi rata-rata supaya sisanya kecil)
cs = np.polyfit(v, sm - 1.0, 2)
cd = np.polyfit(v, sdx, 2)
print('\npolinom skala-1 :', np.round(cs, 5), '⇒ pada v=0/0,5/1:',
      np.round(np.polyval(cs, [0, 0.5, 1]), 4))
print('polinom geser   :', np.round(cd, 4), '⇒ pada v=0/0,5/1:',
      np.round(np.polyval(cd, [0, 0.5, 1]), 2))
res = np.abs(np.polyval(cs, v) + 1 - sm).max()
print(f'sisa pemodelan skala maks {res:.4f} · geser {np.abs(np.polyval(cd, v) - sdx).max():.2f} px')

# berapa galat torso yang bisa dihilangkan bila medan ini dipakai (batas atas, per baris)
gain = (base.mean() - err.mean()) / base.mean() * 100
print(f'\nbatas atas perbaikan torso (per baris, tanpa smoothing): {gain:.1f} %')

out = {'t': T, 'wilayah': [X0, Y0, X1, Y1],
       'skala_rata': float(sm.mean()), 'geser_rata': float(sdx.mean()),
       'polinom_skala': [float(x) for x in cs], 'polinom_geser': [float(x) for x in cd],
       'galat_tanpa': float(base.mean()), 'galat_dengan_batas_atas': float(err.mean()),
       'batas_atas_perbaikan_persen': float(gain),
       'per_baris': [{'y': int(r['y']), 's': float(r['s']), 'dx': float(r['dx']),
                      's_smooth': float(a), 'dx_smooth': float(b)}
                     for r, a, b in zip(rows, sm, sdx)]}
json.dump(out, open(f'{D}/p12-warp-{T.replace(".", "")}.json', 'w'), indent=1, ensure_ascii=False)
print(f'\nJSON: {D}/p12-warp-{T.replace(".", "")}.json')
