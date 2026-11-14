#!/usr/bin/env python3
"""p12-peta.py — P12 diagnosis: di mana galat torso MIRA berasal, dan berapa bagian yang
bisa dijelaskan oleh (a) terang menyeluruh, (b) struktur/tekstur, (c) sebaran pita luma.

Pakai: python3 tools/p12-peta.py [--dir /tmp/p12] [--t 9.5]
Keluaran: tabel per fase (MAE, torso, kepala), dekomposisi torso t=9.5
          (bias, galat struktur blur4, galat tekstur, sisa setelah cocok-afin), dan peta selisih PNG.
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

D = sys.argv[sys.argv.index('--dir') + 1] if '--dir' in sys.argv else '/tmp/p12'
TS = ['0.3', '1.89', '3.5', '5.5', '6.8', '9.5']
TORSO = (520, 400, 900, 780)   # x0, y0, x1, y1
KEPALA = (620, 120, 830, 380)


def A(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)


def blur(a, r):
    u8 = np.clip(a, 0, 255).astype(np.uint8)
    return np.asarray(Image.fromarray(u8).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)


def crop(a, r):
    x0, y0, x1, y1 = r
    return a[y0:y1, x0:x1]


print(f'{"t":>6} {"MAE":>7} {"torso":>7} {"bias":>7} {"kepala":>7} {"blur4":>7} {"blur10":>7}')
tot = []
for t in TS:
    L, O = A(f'{D}/live-{t}.png'), A(f'{D}/ours-{t}.png')
    mae = float(np.abs(O - L).mean())
    tl, to = crop(L, TORSO), crop(O, TORSO)
    mae_t = float(np.abs(to - tl).mean())
    bias_t = float((to - tl).mean())
    mae_k = float(np.abs(crop(O, KEPALA) - crop(L, KEPALA)).mean())
    b4 = float(np.abs(blur(O, 4) - blur(L, 4)).mean())
    b10 = float(np.abs(blur(O, 10) - blur(L, 10)).mean())
    tot.append(mae)
    print(f'{t:>6} {mae:7.3f} {mae_t:7.3f} {bias_t:+7.2f} {mae_k:7.3f} {b4:7.3f} {b10:7.3f}')
print(f'rata2  {np.mean(tot):7.3f}')

# ---- dekomposisi torso pada fase terakhir (t=9.5) ----
t = '9.5'
L, O = A(f'{D}/live-{t}.png'), A(f'{D}/ours-{t}.png')
tl, to = crop(L, TORSO), crop(O, TORSO)
print(f'\n== torso t={t} wilayah {TORSO} ==')
print(f'rerata live {tl.mean():.2f} · kita {to.mean():.2f} · bias {(to - tl).mean():+.2f}')
print(f'MAE {np.abs(to - tl).mean():.3f}')
for r in (4, 10, 20):
    print(f'  galat setelah blur{r:<3}: {np.abs(blur(to, r) - blur(tl, r)).mean():.3f}  '
          f'(tumpukan cahaya berskala besar)')

# (a) bagian galat yang hilang bila hanya terang digeser / diskalakan
best = None
for g in np.arange(0.70, 1.31, 0.02):
    for o in np.arange(-12, 12.1, 0.5):
        m = float(np.abs(np.clip(to * g + o, 0, 255) - tl).mean())
        if best is None or m < best[0]:
            best = (m, g, o)
print(f'(a) cocok-afin terbaik: MAE {best[0]:.3f} (gain {best[1]:.2f}, offset {best[2]:+.1f}) '
      f'⇒ {100 * (1 - best[0] / np.abs(to - tl).mean()):.1f} % galat torso dapat dijelaskan terang-menyeluruh')

# (b) struktur vs tekstur: berapa galat yang tinggal setelah hanya ampitudo garis diubah
gl = np.diff(tl.mean(2), axis=1)
go = np.diff(to.mean(2), axis=1)
print(f'(b) galat gradien |Δ(dx/dy)|: {np.abs(go - gl).mean():.3f} '
      f'(live {np.abs(gl).mean():.3f} · kita {np.abs(go).mean():.3f}) ⇒ '
      f'kontras garis kita {"lebih tinggi" if np.abs(go).mean() > np.abs(gl).mean() else "lebih rendah"}')

# (c) pita luma
lg = tl.mean(2)
band = [(0, 20), (20, 60), (60, 120), (120, 200), (200, 256)]
print('(c) pita luma torso: piksel% (live) · bias kita-live')
for a, b in band:
    m = (lg >= a) & (lg < b)
    if m.sum() == 0:
        print(f'  {a:3}-{b:3}: kosong')
        continue
    print(f'  {a:3}-{b:3}: {100 * m.mean():5.1f} % · {float((to.mean(2) - lg)[m].mean()):+6.2f}')

# (d) peta selisih bertanda
d = (to - tl).mean(2)
img = np.zeros((*d.shape, 3), np.float32)
img[..., 0] = np.clip(d * 8, 0, 255)
img[..., 2] = np.clip(-d * 8, 0, 255)
Image.fromarray(img.astype(np.uint8)).save(f'{D}/peta-selisih-torso-{t}.png')

# (e) baris-per-baris: di mana bias terbesar (sepersepuluh tinggi torso)
rows = d.mean(1)
q = np.array_split(rows, 10)
print('(e) bias per 38 baris (atas→bawah torso):', ' '.join(f'{v:+.1f}' for v in (x.mean() for x in q)))
cols = d.mean(0)
qc = np.array_split(cols, 10)
print('    bias per 38 kolom (kiri→kanan torso):', ' '.join(f'{v:+.1f}' for v in (x.mean() for x in qc)))
