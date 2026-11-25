#!/usr/bin/env python3
"""ukur-tangkap.py — median N frame lalu ukur selisih terhadap acuan (domain asli).

Pakai:
  python3 tools/ukur-tangkap.py --dir CAP --acuan apex-asli --uji apex-niu-live apex-p14
Keluar: median-<prefix>.png di CAP, plus tabel MAE penuh / tengah / >8 per-255.
"""
import argparse
import glob
import os

import numpy as np
from PIL import Image

# kotak "tengah" = daerah figur pada 1440x900 (x 420..1020, y 90..810)
TENGAH = (420, 90, 1020, 810)


def median_frame(cap, prefix):
    files = sorted(glob.glob(os.path.join(cap, f'{prefix}-f*.png')))
    if not files:
        raise SystemExit(f'tidak ada frame untuk {prefix}')
    stack = np.stack([np.asarray(Image.open(f).convert('RGB'), dtype=np.float32) for f in files])
    med = np.median(stack, axis=0)
    out = os.path.join(cap, f'median-{prefix}.png')
    Image.fromarray(med.astype(np.uint8)).save(out)
    jitter = float(np.abs(stack - med).mean())
    return med, out, len(files), jitter


def ukur(a, b):
    d = np.abs(a - b)
    x0, y0, x1, y1 = TENGAH
    c = d[y0:y1, x0:x1]
    return {
        'mae_penuh': float(d.mean()),
        'mae_tengah': float(c.mean()),
        'px_gt8_penuh': float((d.max(2) > 8).mean() * 100),
        'px_gt8_tengah': float((c.max(2) > 8).mean() * 100),
        'luma_kita': float(b.mean()),
        'luma_acuan': float(a.mean()),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', required=True)
    ap.add_argument('--acuan', required=True)
    ap.add_argument('--uji', nargs='+', required=True)
    a = ap.parse_args()

    ref, refpath, n, jit = median_frame(a.dir, a.acuan)
    print(f'acuan  {a.acuan:<16} {n} frame  jitter {jit:.2f}  luma {ref.mean():.2f}  -> {os.path.basename(refpath)}')
    print(f'{"uji":<16} {"MAE penuh":>10} {"MAE tengah":>11} {">8 penuh%":>10} {">8 tengah%":>11} {"luma":>7}')
    for u in a.uji:
        img, _, n2, j2 = median_frame(a.dir, u)
        m = ukur(ref, img)
        print(f'{u:<16} {m["mae_penuh"]:>10.3f} {m["mae_tengah"]:>11.3f} '
              f'{m["px_gt8_penuh"]:>10.2f} {m["px_gt8_tengah"]:>11.2f} {m["luma_kita"]:>7.2f}   '
              f'({n2} frame, jitter {j2:.2f})')


if __name__ == '__main__':
    main()
