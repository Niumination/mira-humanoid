#!/usr/bin/env python3
"""p13-siluet.py — P13 langkah 1 (revisi): ukur SILUET (mask) asli tiap plate dengan definisi TUNGGAL.

Definisi mask dipakai bersama oleh semua alat P13 (p13-siluet, p13-aset, p13-garis):
  - plate MIRA-idle : alfa citra > 32 (plate ini memang beralfa)
  - plate APEX      : alfa tidak ada (opak) ⇒ mask dari kecerahan: gaussian(σ=3) luma > 8
  - plate MIRA-hair : gaussian(σ=3) luma > 3 (plate pendaran sangat redup)
lalu: closing(3) → isi lubang → komponen terbesar → buang komponen < 200 px.

CATATAN KOREKSI (penting): versi pertama alat ini memakai gaussian(σ=6) luma > 40 dan menghasilkan
cakupan 18,6–22,9 %. Angka itu SALAH: blur σ=6 + ambang 40 memotong bahu sehingga siluet kehilangan
±13 poin cakupan. Dengan definisi di atas, apex-idle-v1 bercakupan 35,7 %. Semua angka IoU paket 5q
berbasis mask yang cacat itu dan sudah diganti.

Keluaran: verification/p13/siluet.json + mask-*.png (biner) di verification/p13/.
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = '/home/user'
OUT = f'{ROOT}/Kerja-Arena/verification/p13'
os.makedirs(OUT, exist_ok=True)

PLATES = [
    ('apex-humanoid-rebuild/public/humanoid', 'apex-idle-v1.webp', 'luma', 8),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-listening-v1.webp', 'luma', 8),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-speaking-v1.webp', 'luma', 8),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-speaking-strong-v1.webp', 'luma', 8),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-thinking-v1.webp', 'luma', 8),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-assembly-25-v1.webp', 'luma', 8),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-assembly-60-v1.webp', 'luma', 8),
    ('mira-humanoid-rebuild/public/humanoid', 'mira-idle-v1.webp', 'alpha', 32),
    ('mira-humanoid-rebuild/public/humanoid', 'mira-hair-v1.webp', 'luma', 3),
]


def siluet(a, mode, thr):
    if mode == 'alpha':
        m = ndi.binary_closing(a[..., 3] > thr, iterations=2)
    else:
        m = ndi.binary_closing(ndi.gaussian_filter(a[..., :3].mean(2), 3.0) > thr, iterations=3)
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n > 1:
        sz = ndi.sum(m, lab, range(1, n + 1))
        m = lab == (1 + int(np.argmax(sz)))
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n > 1:
        sz = ndi.sum(m, lab, range(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sz >= 200
        m = keep[lab]
    return m


rows = []
for rel, name, mode, thr in PLATES:
    a = np.asarray(Image.open(f'{ROOT}/{rel}/{name}').convert('RGBA')).astype(np.float32)
    m = siluet(a, mode, thr)
    tag = name.replace('.webp', '')
    Image.fromarray((m * 255).astype(np.uint8)).save(f'{OUT}/mask-{tag}.png')
    ys, xs = np.where(m)
    lum = a[..., :3].mean(2)
    lv = float(lum[m].mean())
    lubang = int(ndi.binary_fill_holes(m).sum() - m.sum())
    rows.append({'berkas': name, 'mode': mode, 'ambang': thr,
                 'piksel': int(m.sum()), 'cakupan_persen': round(float(100 * m.mean()), 2),
                 'kotak': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                 'luma_rata_dalam_siluet': round(lv, 2), 'lubang_diisi': lubang})
    print(f'{name:<32} {mode:<5} cakupan {100 * m.mean():5.1f} % · luma {lv:5.1f} · '
          f'kotak {xs.min()},{ys.min()} → {xs.max()},{ys.max()}')

json.dump({'judul': 'P13 langkah 1 — siluet asli tiap plate (dasar IoU >= 0,98)',
           'definisi': 'MIRA-idle alfa>32 · APEX gaussian(luma,3)>8 · MIRA-hair gaussian(luma,3)>3 · '
                       'closing 3 · isi lubang · komponen terbesar · buang < 200 px',
           'koreksi': 'versi pertama (gaussian σ6 > 40) memotong bahu; cakupan 18,6–22,9 % → sekarang 35,7 % '
                      '(apex-idle). Semua angka IoU paket 5q berbasis mask cacat dan diganti di paket 5r.',
           'baris': rows}, open(f'{OUT}/siluet.json', 'w'), indent=1, ensure_ascii=False)
print(f'\nJSON: {OUT}/siluet.json · mask PNG di {OUT}')
