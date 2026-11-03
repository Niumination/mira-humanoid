#!/usr/bin/env python3
"""Peta selisih per-blok antara tangkapan kita dan acuan live.

Pemakaian:
  python3 tools/diffmap.py <t> [--gx 12] [--gy 8] [--chan all|r|g|b]
Acuan : Kerja-Arena/recon/live-ref/live-t<t>.png
Kita  : Kerja-Arena/verification/langkah3/build*-(t).png  (build terbaru dipakai)
"""
import sys
import glob
import numpy as np
from PIL import Image

ROOT = '/home/user/Kerja-Arena'


def load(t):
    live = f'{ROOT}/recon/live-ref/live-t{t}.png'
    cand = sorted(glob.glob(f'{ROOT}/verification/langkah3/build*-{t}.png'),
                  key=lambda p: int(p.rsplit('build', 1)[1].split('-')[0]))
    ours = cand[-1]
    return np.asarray(Image.open(live).convert('RGB')).astype(float), ours


def main():
    t = sys.argv[1]
    gx = int(sys.argv[sys.argv.index('--gx') + 1]) if '--gx' in sys.argv else 12
    gy = int(sys.argv[sys.argv.index('--gy') + 1]) if '--gy' in sys.argv else 8
    L, path = load(t)
    O = np.asarray(Image.open(path).convert('RGB')).astype(float)
    h, w, _ = L.shape
    d = O - L
    print(f't={t}  live={L.mean():.2f} kita={O.mean():.2f}  MAE={np.abs(d).mean():.2f}  ({path.split("/")[-1]})')
    print(f'kanal selisih: R {d[:, :, 0].mean():+.2f}  G {d[:, :, 1].mean():+.2f}  B {d[:, :, 2].mean():+.2f}')
    print(f'\npeta selisih rata-rata per blok ({gx}x{gy}), angka = kita - live:')
    lum = d.mean(axis=2)
    grid = np.zeros((gy, gx))
    for i in range(gy):
        for j in range(gx):
            grid[i, j] = lum[i * h // gy:(i + 1) * h // gy, j * w // gx:(j + 1) * w // gx].mean()
    for row in grid:
        print('  ' + ' '.join(f'{v:+6.1f}' for v in row))
    print('\npeta |selisih| per blok:')
    for i in range(gy):
        row = []
        for j in range(gx):
            row.append(np.abs(lum[i * h // gy:(i + 1) * h // gy, j * w // gx:(j + 1) * w // gx]).mean())
        print('  ' + ' '.join(f'{v:6.1f}' for v in row))
    print(f'\nblok terburuk: {np.unravel_index(np.argmax(np.abs(grid)), grid.shape)} '
          f'({np.abs(grid).max():.1f}) · 5 blok teratas: '
          + ', '.join(f'({i},{j})={grid[i, j]:+.1f}' for i, j in
                      zip(*np.unravel_index(np.argsort(-np.abs(grid), axis=None)[:5], grid.shape))))


if __name__ == '__main__':
    main()
