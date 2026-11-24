#!/usr/bin/env python3
"""ukur-plate.py - skor kandidat plate terhadap plate ASLI domain sumber.

  mae_full   : MAE seluruh kanvas (0..255)
  mae_sil    : MAE di dalam siluet asli - METRIK UTAMA
  iou        : IoU siluet
  cov_a/b    : cakupan siluet asli / kandidat
  r_row      : korelasi profil luma per-baris
  r_grad     : korelasi magnitudo gradien (struktur garis) - METRIK UTAMA
  luma_ratio : rata-rata luma kandidat / asli di dalam siluet

Pakai: python3 ukur-plate.py ASLI.webp KANDIDAT.webp [--mode luma|alpha] [--thr N]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def baca(p):
    return np.asarray(Image.open(p).convert('RGBA')).astype(np.float32)


def siluet(a, mode, thr):
    if mode == 'alpha':
        m = ndi.binary_closing(a[..., 3] > thr, iterations=2)
    else:
        m = ndi.binary_closing(ndi.gaussian_filter(a[..., :3].mean(2), 3.0) > thr, iterations=3)
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n > 1:
        sz = ndi.sum(m, lab, range(1, n + 1))
        m = lab == (int(np.argmax(sz)) + 1)
    return m


def skor(pa, pb, mode='luma', thr=8):
    A, B = baca(pa), baca(pb)
    if A.shape[:2] != B.shape[:2]:
        return {'error': f'geometri beda {A.shape[:2]} vs {B.shape[:2]}'}
    sa, sb = siluet(A, mode, thr), siluet(B, mode, thr)
    la, lb = A[..., :3].mean(2), B[..., :3].mean(2)
    d = np.abs(A[..., :3] - B[..., :3]).mean(2)
    inter = float((sa & sb).sum()); union = float((sa | sb).sum())
    ga = ndi.gaussian_gradient_magnitude(la, 1.0).ravel()
    gb = ndi.gaussian_gradient_magnitude(lb, 1.0).ravel()
    return {
        'mae_full': float(d.mean()),
        'mae_sil': float(d[sa].mean()) if sa.any() else float('nan'),
        'iou': inter / union if union else 0.0,
        'cov_a': float(sa.mean()), 'cov_b': float(sb.mean()),
        'r_row': float(np.corrcoef(la.mean(1), lb.mean(1))[0, 1]),
        'r_grad': float(np.corrcoef(ga, gb)[0, 1]),
        'luma_ratio': float(lb[sa].mean() / max(la[sa].mean(), 1e-6)),
    }


if __name__ == '__main__':
    mode = 'luma'; thr = 8
    if '--mode' in sys.argv: mode = sys.argv[sys.argv.index('--mode') + 1]
    if '--thr' in sys.argv: thr = float(sys.argv[sys.argv.index('--thr') + 1])
    s = skor(sys.argv[1], sys.argv[2], mode, thr)
    if 'error' in s:
        print(s['error']); sys.exit(1)
    print(' '.join(f'{k}={v:.4f}' for k, v in s.items()))
