#!/usr/bin/env python3
"""Metrik v3: pisahkan galat STRUKTUR (frekuensi rendah) dari galat TEKSTUR titik (frekuensi tinggi).

MAE mentah pada panggung berisi titik-titik kecil; dua implementasi berbeda selalu berbeda di
tingkat titik meski strukturnya sama. Metrik ini melaporkan:
  MAE mentah  — seperti sebelumnya
  MAE blur4   — setelah blur gaussian 4 px  (gumpalan: rambut, tubuh, cahaya)
  MAE blur10  — setelah blur gaussian 10 px (tata letak / sebaran besar)

Pemakaian:
  python3 tools/metric.py <prefix-kita> [t1 t2 ...]
  contoh: python3 tools/metric.py build22 0.3 1.89 3.5 5.5 6.8 9.5
Acuan: Kerja-Arena/recon/live-ref-v2/live-t<t>.png ; kita: verification/langkah3/<prefix>-<t>.png
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = '/home/user/Kerja-Arena'


def A(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(float)


def blur(a, r):
    return np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float)


def main():
    prefix = sys.argv[1]
    ts = sys.argv[2:] or ['0.3', '1.89', '3.5', '5.5', '6.8', '9.5']
    print('t      MAE    blur4  blur10   (kita/live)')
    tot = [0.0, 0.0, 0.0]
    for t in ts:
        L = A(f'{ROOT}/recon/live-ref-v2/live-t{t}.png')
        O = A(f'{ROOT}/verification/langkah3/{prefix}-{t}.png')
        m0 = np.abs(O - L).mean()
        m4 = np.abs(blur(O, 4) - blur(L, 4)).mean()
        m10 = np.abs(blur(O, 10) - blur(L, 10)).mean()
        tot[0] += m0
        tot[1] += m4
        tot[2] += m10
        print(f'{t:<6} {m0:5.2f}  {m4:5.2f}  {m10:5.2f}   {O.mean():5.1f}/{L.mean():5.1f}')
    n = len(ts)
    print(f'rata2  {tot[0]/n:5.2f}  {tot[1]/n:5.2f}  {tot[2]/n:5.2f}')


if __name__ == '__main__':
    main()
