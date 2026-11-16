#!/usr/bin/env python3
"""p12-filamen.py — P12 langkah 5: ubah POLA FILAMEN torso live menjadi aset kurva milik kita,
lalu uji kelayakannya (before/after MAE) sebelum apa pun diporting ke shader.

Yang dihasilkan:
  1) penjejak ridge live → rantai titik (polyline) di wilayah torso
  2) penyederhanaan (Ramer–Douglas–Peucker) + lebar & terang tiap rantai → **aset kurva** (JSON),
     bukan bitmap: tiap filamen = daftar titik + lebar + warna
  3) render ulang aset itu di atas bingkai KITA TANPA gambar (`off=picture`), lalu ukur MAE vs live
     di wilayah torso. Ini batas atas yang bisa dicapai bila kuad citra torso diganti geometri.

Pakai: python3 tools/p12-filamen.py --dir /tmp/p12 --t 9.5
"""
import json
import sys

import numpy as np
from PIL import Image

D = sys.argv[sys.argv.index('--dir') + 1] if '--dir' in sys.argv else '/tmp/p12'
T = sys.argv[sys.argv.index('--t') + 1] if '--t' in sys.argv else '9.5'
X0, X1, Y0, Y1 = 470, 960, 330, 830        # wilayah kerja (lebih luas dari torso, mencakup bahu)
THR = 96                                    # ambang ridge (luma)
GAP = 3                                     # boleh melompat maks 3 baris
LINK = 4.0                                  # jarak maks antar titik rantai (px)


def A(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)


L = A(f'{D}/live-{T}.png')
lu = L.mean(2)


def ridges(y):
    row = lu[y, X0:X1]
    out = []
    for i in range(1, len(row) - 1):
        if row[i] >= THR and row[i] >= row[i - 1] and row[i] > row[i + 1]:
            if out and i - out[-1] <= 2:
                if row[i] > row[out[-1]]:
                    out[-1] = i
            else:
                out.append(i)
    return [X0 + i for i in out]


# ---- 1. rantai ----
chains = []
active = []            # [chain_index, last_x, last_y]
for y in range(Y0, Y1):
    pts = ridges(y)
    used = set()
    for ci, lx, ly in list(active):
        cand = [(abs(x - lx), k) for k, x in enumerate(pts) if k not in used]
        if cand:
            d, k = min(cand)
            if d <= LINK * (y - ly):
                chains[ci].append((pts[k], y))
                used.add(k)
                active[active.index([ci, lx, ly])] = [ci, pts[k], y]
                continue
        if y - ly > GAP:
            active.remove([ci, lx, ly])
    for k, x in enumerate(pts):
        if k in used:
            continue
        chains.append([(x, y)])
        active.append([len(chains) - 1, x, y])

chains = [c for c in chains if len(c) >= 14]

# ---- 2. sederhanakan (RDP) + ukur lebar & warna ----
def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float)
    ab = b - a
    n = np.hypot(*ab) or 1.0
    d = [abs(np.cross(ab, np.array(p, float) - a)) / n for p in pts[1:-1]]
    i = int(np.argmax(d))
    if d[i] > eps:
        left = rdp(pts[:i + 2], eps)
        right = rdp(pts[i + 1:], eps)
        return left[:-1] + right
    return [pts[0], pts[-1]]


asset = []
for c in chains:
    xs = np.array([p[0] for p in c])
    ys = np.array([p[1] for p in c])
    # lebar: separuh lebar profil rata-rata di atas ambang separuh puncak
    widths = []
    peak = []
    col = []
    for x, y in c:
        seg = lu[y, max(0, x - 12):x + 13]
        half = seg.max() / 2
        widths.append(int((seg > half).sum()) / 2)
        peak.append(float(seg.max()))
        col.append(L[y, x])
    simple = rdp(c, 1.2)
    asset.append({'pts': [[int(x), int(y)] for x, y in simple],
                  'len': int(len(c)),
                  'width': round(float(np.median(widths)), 2),
                  'bright': round(float(np.median(peak)) / 255.0, 3),
                  'col': [round(float(v), 3) for v in (np.mean(col, axis=0) / 255.0)]})
asset.sort(key=lambda a: -a['len'])

print(f'rantai: {len(chains)} · setelah RDP: {sum(len(a["pts"]) for a in asset)} titik '
      f'(dari {sum(a["len"] for a in asset)} titik ridge)')
print(f'lebar median rantai: {np.median([a["width"] for a in asset]):.1f} px · '
      f'terang median: {np.median([a["bright"] for a in asset]):.2f}')
json.dump({'t': T, 'wilayah': [X0, Y0, X1, Y1], 'ambang': THR, 'filamen': asset},
          open(f'{D}/filamen-{T.replace(".", "")}.json', 'w'), ensure_ascii=False)

# ---- 3. render aset di atas bingkai kita tanpa gambar ----
# Catatan metode: tiap filamen digambar ke buffer maksimum (bukan dijumlahkan) supaya satu garis
# tidak menumpuk cahaya dengan dirinya sendiri; hasilnya baru DITAMBAHKAN sekali ke bingkai.
base = A(f'{D}/nopic-{T}.png').copy()
out = base.copy()
for a in asset:
    pts = a['pts']
    for (x1, y1), (x2, y2) in zip(pts[:-1], pts[1:]):
        w = max(0.8, a['width'] * 0.55)
        b = min(1.0, a['bright'] * 0.95)
        col = np.array(a['col'], np.float32) * 255 * b
        n = int(max(abs(x2 - x1), abs(y2 - y1), 1)) + 1
        for i in range(n):
            x = x1 + (x2 - x1) * i / n
            y = y1 + (y2 - y1) * i / n
            r = 3 * w
            y0i, y1i = int(max(0, y - r)), int(min(base.shape[0], y + r + 1))
            x0i, x1i = int(max(0, x - r)), int(min(base.shape[1], x + r + 1))
            if y1i <= y0i or x1i <= x0i:
                continue
            yy, xx = np.mgrid[y0i:y1i, x0i:x1i]
            g = np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * (w * 0.75) ** 2))
            # bobot garis: puncak 1.0 di pusat, dipakai sebagai PENGALI warna (bukan penambah berulang)
            out[y0i:y1i, x0i:x1i] = np.maximum(out[y0i:y1i, x0i:x1i], base[y0i:y1i, x0i:x1i] + g[..., None] * col)

Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(f'{D}/filamen-render-{T.replace(".", "")}.png')
ours = A(f'{D}/cur-{T}.png')
sl = (slice(Y0, Y1), slice(X0, X1))
print(f'\nMAE di wilayah kerja ({X0}-{X1} x {Y0}-{Y1}):')
print(f'  kita sekarang            {np.abs(ours[sl] - L[sl]).mean():6.2f}')
print(f'  kita tanpa gambar        {np.abs(base[sl] - L[sl]).mean():6.2f}')
print(f'  tanpa gambar + geometri  {np.abs(out[sl] - L[sl]).mean():6.2f}  ← batas atas pendekatan geometri')
print(f'\nseluruh bingkai: sekarang {np.abs(ours - L).mean():.3f} · '
      f'tanpa gambar {np.abs(base - L).mean():.3f} · geometri {np.abs(out - L).mean():.3f}')
