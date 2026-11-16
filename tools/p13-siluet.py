#!/usr/bin/env python3
"""p13-siluet.py — P13 langkah 1: ukur SILUET (mask) asli tiap plate.

Kenapa: P13 mensyaratkan pengganti **prosedural** dengan "siluet baru vs lama IoU >= 0,98".
Sebelum menggambar apa pun, ukur dulu mask aslinya:
  - plate MIRA  : alfa citra (badan transparan di tepi)
  - plate APEX  : alfa TIDAK ada (100 % opak) ⇒ mask harus diturunkan dari kecerahan
                  (figur bercahaya di atas latar gelap), lihat blok `theme` per berkas.

Keluaran: verification/p13/siluet.json + mask PNG (biner) per berkas + PNG pratinjau mask.
"""
import json
import os

import numpy as np
from PIL import Image

ROOT = '/home/user'
OUT = f'{ROOT}/Kerja-Arena/verification/p13'
os.makedirs(OUT, exist_ok=True)

PLATES = [
    ('apex-humanoid-rebuild/public/humanoid', 'apex-idle-v1.webp', 'luma', 40),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-listening-v1.webp', 'luma', 40),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-speaking-v1.webp', 'luma', 40),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-speaking-strong-v1.webp', 'luma', 40),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-thinking-v1.webp', 'luma', 40),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-assembly-25-v1.webp', 'luma', 40),
    ('apex-humanoid-rebuild/public/humanoid', 'apex-assembly-60-v1.webp', 'luma', 40),
    ('mira-humanoid-rebuild/public/humanoid', 'mira-idle-v1.webp', 'alpha', 32),
    ('mira-humanoid-rebuild/public/humanoid', 'mira-hair-v1.webp', 'luma', 48),
]


def mask_of(path, mode, thr):
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)
    if mode == 'alpha':
        m = a[..., 3] > thr
    else:
        lum = a[..., :3].mean(2)
        m = lum > thr
        # tutup lubang kecil 1 px supaya mask tidak berderau
        p = np.pad(m, 1, mode='edge')
        cnt = sum(p[dy:dy + m.shape[0], dx:dx + m.shape[1]] for dy in range(3) for dx in range(3))
        m = cnt >= 5
    return m


rows = []
for rel, name, mode, thr in PLATES:
    path = f'{ROOT}/{rel}/{name}'
    m = mask_of(path, mode, thr)
    tag = name.replace('.webp', '')
    Image.fromarray((m * 255).astype(np.uint8)).save(f'{OUT}/mask-{tag}.png')
    ys, xs = np.where(m)
    rows.append({'berkas': name, 'mode': mode, 'ambang': thr,
                 'piksel': int(m.sum()), 'cakupan_persen': round(float(100 * m.mean()), 2),
                 'kotak': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]})
    print(f'{name:<34} {mode:<5} cakupan {100*m.mean():5.1f} % · kotak {xs.min()},{ys.min()} → {xs.max()},{ys.max()}')

json.dump({'judul': 'P13 langkah 1 — siluet asli tiap plate (dasar IoU >= 0,98)',
           'catatan': 'plate APEX opak (alfa 255) ⇒ mask diturunkan dari kecerahan > 40; plate MIRA memakai alfa > 32',
           'baris': rows}, open(f'{OUT}/siluet.json', 'w'), indent=1, ensure_ascii=False)
print(f'\nJSON: {OUT}/siluet.json · mask PNG di {OUT}')
