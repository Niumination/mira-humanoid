#!/usr/bin/env python3
"""Metrik v3 (acuan live-ref-v3) + peta selisih grid.

Pemakaian:
  python3 tools/metric3.py <prefix> [--grid t] t1 t2 ...
Contoh:
  python3 tools/metric3.py b33 11.0 12.0 7.5 8.0
  python3 tools/metric3.py b33 --grid 11.0
Acuan: Kerja-Arena/recon/live-ref-v3/ref_-<t>.png
Kita : Kerja-Arena/verification/langkah3/<prefix>-<t>.png
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = '/home/user/Kerja-Arena'


def A(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(float)


def blur(a, r):
    return np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float)


def pair(prefix, t):
    import os
    # W-6: acuan `live-ref-v2` TERBUKTI BASI (vs live hari ini: MAE 3,83 pada t=9,5) — set itu yang
    # selama ini dipakai metrik paritas dan membuat perubahan nyata tampak "tidak berubah".
    # Urutan baru: v4 (tangkapan segar pada 6 fase acuan) → v3 → v2.
    p4 = f'{ROOT}/recon/live-ref-v4/live-{t}.png'
    p3 = f'{ROOT}/recon/live-ref-v3/ref_-{t}.png'
    p2 = f'{ROOT}/recon/live-ref-v2/live-t{t}.png'
    L = A(p4 if os.path.exists(p4) else (p3 if os.path.exists(p3) else p2))
    O = A(f'{ROOT}/verification/langkah3/{prefix}-{t}.png')
    return O, L


def gridmap(O, L, cols=12, rows=8):
    d = (O - L).mean(axis=2)          # tanda: + = kita lebih terang
    h, w = d.shape
    out = []
    for r in range(rows):
        row = []
        for c in range(cols):
            blk = d[r * h // rows:(r + 1) * h // rows, c * w // cols:(c + 1) * w // cols]
            row.append(blk.mean())
        out.append(row)
    return out


def main():
    args = sys.argv[1:]
    prefix = args[0]
    show_grid = None
    if '--grid' in args:
        i = args.index('--grid')
        show_grid = args[i + 1]
        args = args[:i] + args[i + 2:]
    ts = args[1:] or ['0.3', '1.89', '3.5', '5.5', '6.8', '9.5']
    print('t      MAE    blur4  blur10   (kita/live)')
    tot = [0.0, 0.0, 0.0]
    for t in ts:
        O, L = pair(prefix, t)
        m0 = np.abs(O - L).mean()
        m4 = np.abs(blur(O, 4) - blur(L, 4)).mean()
        m10 = np.abs(blur(O, 10) - blur(L, 10)).mean()
        tot[0] += m0
        tot[1] += m4
        tot[2] += m10
        print(f'{t:<6} {m0:5.2f}  {m4:5.2f}  {m10:5.2f}   {O.mean():5.1f}/{L.mean():5.1f}')
    n = len(ts)
    print(f'rata2  {tot[0]/n:5.2f}  {tot[1]/n:5.2f}  {tot[2]/n:5.2f}')
    if show_grid:
        O, L = pair(prefix, show_grid)
        g = gridmap(O, L)
        print(f'\npeta selisih t={show_grid} (kita-live, + = kita lebih terang), grid 12x8:')
        for r, row in enumerate(g):
            print(f'r{r} ' + ' '.join(f'{v:+6.1f}' for v in row))


if __name__ == '__main__':
    main()
