#!/usr/bin/env python3
"""gerbang-p14.py — gerbang penerimaan plate, pengganti gerbang P13.

Kenapa ada: gerbang P13 hanya mengukur SILUET + luma pita, jadi plate dengan isi
siluet yang tidak berkorelasi tetap lulus (APEX r_grad 0,395 / MIRA 0,195) lalu
terbit ke produksi. Gerbang ini menambahkan dua syarat yang menangkap kegagalan itu:
`mae_sil` (beda warna DI DALAM siluet) dan `r_grad` (korelasi struktur garis).

Ditambah satu pagar arah sebaliknya: anggaran parameter model tidak boleh melewati
BATAS_PARAM dari jumlah piksel — di atas itu keluaran lebih mirip salinan
terkompresi daripada karya model sendiri, dan klaim lisensi.aset melemah.

Pakai:
  python3 tools/gerbang-p14.py --asli asli --kandidat out
  python3 tools/gerbang-p14.py --asli asli --kandidat out --param apex-idle-v1.webp=0.8085
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ukur_plate_lib import skor  # noqa: E402

AMBANG = {
    'iou_min': 0.95,
    'mae_sil_max': 12.0,
    'r_grad_min': 0.75,
    'luma_lo': 0.98,
    'luma_hi': 1.02,
}
BATAS_PARAM = 0.90
MODE_ALFA = {'mira-idle-v1.webp'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--asli', required=True)
    ap.add_argument('--kandidat', required=True)
    ap.add_argument('--param', nargs='*', default=[], help='berkas=rasio_param (0..1)')
    a = ap.parse_args()
    rasio = dict((p.split('=')[0], float(p.split('=')[1])) for p in a.param)

    nama = sorted(f for f in os.listdir(a.kandidat)
                  if f.endswith('.webp') and os.path.exists(os.path.join(a.asli, f)))
    if not nama:
        print('⛔ tidak ada kandidat yang punya pasangan di --asli')
        return 2

    print(f'{"plate":<24} {"mae_sil":>8} {"iou":>6} {"r_grad":>7} {"luma":>6} {"param%":>7}  hasil')
    gagal = 0
    for n in nama:
        s = skor(os.path.join(a.asli, n), os.path.join(a.kandidat, n),
                 'alpha' if n in MODE_ALFA else 'luma')
        if 'error' in s:
            print(f'{n:<24} {s["error"]}')
            gagal += 1
            continue
        sebab = []
        if s['iou'] < AMBANG['iou_min']: sebab.append('iou')
        if s['mae_sil'] > AMBANG['mae_sil_max']: sebab.append('mae_sil')
        if s['r_grad'] < AMBANG['r_grad_min']: sebab.append('r_grad')
        if not AMBANG['luma_lo'] <= s['luma_ratio'] <= AMBANG['luma_hi']: sebab.append('luma')
        p = rasio.get(n)
        if p is not None and p > BATAS_PARAM: sebab.append('anggaran')
        gagal += bool(sebab)
        print(f'{n:<24} {s["mae_sil"]:>8.2f} {s["iou"]:>6.3f} {s["r_grad"]:>7.3f} '
              f'{s["luma_ratio"]:>6.3f} {("-" if p is None else f"{p*100:.1f}"):>7}  '
              f'{"✅ lulus" if not sebab else "⛔ gagal: " + ",".join(sebab)}')
    print(f'\nambang: mae_sil ≤ {AMBANG["mae_sil_max"]}, iou ≥ {AMBANG["iou_min"]}, '
          f'r_grad ≥ {AMBANG["r_grad_min"]}, luma {AMBANG["luma_lo"]}–{AMBANG["luma_hi"]}, '
          f'param ≤ {BATAS_PARAM*100:.0f}%')
    print('⛔ ADA YANG GAGAL' if gagal else '✅ SEMUA LULUS')
    return 1 if gagal else 0


if __name__ == '__main__':
    sys.exit(main())
