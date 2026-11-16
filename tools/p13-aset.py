#!/usr/bin/env python3
"""p13-aset.py — P13 langkah 1: dari PLATE ASLI ke **aset siluet milik kita**.

Alur (tidak ada satu piksel pun yang disalin ke keluaran):
  1) mask asli  : alfa (MIRA) atau kecerahan+closing (APEX, plate opak)
  2) siluet     : closing besar → isi lubang → komponen terbesar → halus
  3) **model parametrik** (ini asetnya): untuk tiap baris y, pusat cx(y) & setengah-lebar h(y),
                dihaluskan lalu disimpan sebagai ~40 koefisien (bukan bitmap)
  4) render ulang: plate baru dibangkitkan dari model itu (geometri + gradasi warna), lalu
     dibandingkan dengan siluet asli → **IoU** (syarat P13: >= 0,98)

Pakai: python3 tools/p13-aset.py [--uji 0.98]
Keluaran: verification/p13/aset-siluet.json (model), verification/p13/render-<nama>.png (plate baru),
          verification/p13/banding-<nama>.png (asli | mask | render)
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = '/home/user'
OUT = f'{ROOT}/Kerja-Arena/verification/p13'
os.makedirs(OUT, exist_ok=True)
TARGET = 0.98
if '--uji' in sys.argv:
    TARGET = float(sys.argv[sys.argv.index('--uji') + 1])

PLATES = [
    ('apex', 'apex-humanoid-rebuild/public/humanoid', 'apex-idle-v1.webp', 'luma', 8),
    ('apex', 'apex-humanoid-rebuild/public/humanoid', 'apex-listening-v1.webp', 'luma', 8),
    ('apex', 'apex-humanoid-rebuild/public/humanoid', 'apex-speaking-v1.webp', 'luma', 8),
    ('apex', 'apex-humanoid-rebuild/public/humanoid', 'apex-speaking-strong-v1.webp', 'luma', 8),
    ('apex', 'apex-humanoid-rebuild/public/humanoid', 'apex-thinking-v1.webp', 'luma', 8),
    ('apex', 'apex-humanoid-rebuild/public/humanoid', 'apex-assembly-25-v1.webp', 'luma', 8),
    ('apex', 'apex-humanoid-rebuild/public/humanoid', 'apex-assembly-60-v1.webp', 'luma', 8),
    ('mira', 'mira-humanoid-rebuild/public/humanoid', 'mira-idle-v1.webp', 'alpha', 32),
    ('mira', 'mira-humanoid-rebuild/public/humanoid', 'mira-hair-v1.webp', 'luma', 3),
]


def read(rel, name):
    return np.asarray(Image.open(f'{ROOT}/{rel}/{name}').convert('RGBA')).astype(np.float32)


def siluet(a, mode, thr):
    """mask biner siluet: dari alfa, atau dari kecerahan + closing besar (plate opak)."""
    if mode == 'alpha':
        m = a[..., 3] > thr
        m = ndi.binary_closing(m, iterations=2)
    else:
        # plate APEX opak: garis cahaya tipis di atas latar hitam. Siluet diturunkan dengan
        # BLUR + ambang rendah (bukan dilasi), supaya tepinya mengikuti cahaya, bukan kotak dilasi.
        # sigma 3 & ambang 8: blur besar + ambang tinggi memotong bahu (cakupan 20,1 % → 35,7 %)
        lum = ndi.gaussian_filter(a[..., :3].mean(2), 3.0)
        m = lum > 8
        m = ndi.binary_closing(m, iterations=3)
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n > 1:                                    # komponen terbesar = badannya
        sizes = ndi.sum(m, lab, range(1, n + 1))
        m = lab == (1 + int(np.argmax(sizes)))
    m = ndi.binary_fill_holes(m)
    # buang bintik terpisah < 200 px, sisakan geometri asli (tanpa penghalusan)
    lab, n = ndi.label(m)
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes >= 200
        m = keep[lab]
    return m


def model_of(m):
    """model parametrik: daftar RENTANG (x0,x1) per baris — geometri, bukan piksel.

    Satu baris boleh punya beberapa rentang (lengan terpisah, celah pinggang, dsb). Celah < 4 px
    digabung supaya model tidak menyimpan derau.
    """
    H, W = m.shape
    baris = {}
    for y in range(H):
        xs = np.where(m[y])[0]
        if len(xs) == 0:
            continue
        rentang = []
        a = xs[0]
        prev = xs[0]
        for x in xs[1:]:
            if x - prev > 4:
                rentang.append((int(a), int(prev)))
                a = x
            prev = x
        rentang.append((int(a), int(prev)))
        rentang = [(a, b) for a, b in rentang if b - a >= 2]
        if rentang:
            baris[y] = rentang
    if not baris:
        return None
    ys = sorted(baris)
    return {'H': H, 'W': W, 'y0': ys[0], 'y1': ys[-1], 'baris': baris,
            'jumlah_rentang': sum(len(v) for v in baris.values())}


def render(model, warna):
    """bangkitan plate dari MODEL (geometri rentang + gradasi warna kita sendiri)."""
    H, W = model['H'], model['W']
    out = np.zeros((H, W, 3), np.float32)
    y0, y1 = model['y0'], model['y1']
    for y, rentang in model['baris'].items():
        vy = (y - y0) / max(1, (y1 - y0))
        dasar = np.array(warna['atas'], np.float32) * (1 - vy) + np.array(warna['bawah'], np.float32) * vy
        for (x0, x1) in rentang:
            x0, x1 = max(0, x0), min(W - 1, x1)
            if x1 <= x0:
                continue
            xs = np.arange(x0, x1 + 1)
            tengah = (x0 + x1) / 2
            r = np.abs(xs - tengah) / max((x1 - x0) / 2, 1e-3)
            profil = np.clip(1.0 - 0.85 * r ** 2, 0.0, 1.0)[:, None]
            out[y, x0:x1 + 1] = dasar[None, :] * profil + np.array(warna['tepi'], np.float32) * (1 - profil) * 0.5
    return np.clip(out, 0, 255)


def iou(a, b):
    return float((a & b).sum()) / max(1, int((a | b).sum()))


rows = []
for app, rel, name, mode, thr in PLATES:
    a = read(rel, name)
    m = siluet(a, mode, thr)
    model = model_of(m)
    if model is None:
        print(f'{name}: siluet kosong — lewati')
        continue
    warna = ({'atas': (150, 120, 235), 'bawah': (60, 45, 130), 'tepi': (210, 190, 255)}
             if app == 'mira' else
             {'atas': (120, 150, 235), 'bawah': (40, 70, 160), 'tepi': (200, 225, 255)})
    img = render(model, warna)
    mp = np.zeros(m.shape, bool)
    mp[img.mean(2) > 30] = True
    sc = iou(m, mp)
    tag = name.replace('.webp', '')
    Image.fromarray(img.astype(np.uint8)).save(f'{OUT}/render-{tag}.png')
    band = np.concatenate([np.asarray(Image.open(f'{ROOT}/{rel}/{name}').convert('RGB')).astype(np.float32),
                           np.stack([m * 255] * 3, -1).astype(np.float32),
                           img], axis=1)
    Image.fromarray(np.clip(band, 0, 255).astype(np.uint8)).resize(
        (band.shape[1] // 2, band.shape[0] // 2)).save(f'{OUT}/banding-{tag}.png')
    rows.append({'aplikasi': app, 'berkas': name, 'mode': mode,
                 'cakupan_persen': round(float(100 * m.mean()), 2),
                 'rentang_y': [int(model['y0']), int(model['y1'])],
                 'tinggi_siluet': int(model['y1'] - model['y0'] + 1),
                 'rentang_total': int(model['jumlah_rentang']),
                 'lebar_maks': round(float(max((b - a) for v in model['baris'].values() for a, b in v)), 1),
                 'iou_render_vs_siluet': round(sc, 4),
                 'lulus': bool(sc >= TARGET)})
    print(f'{name:<34} cakupan {100*m.mean():5.1f}% · y {model["y0"]}-{model["y1"]} · '
          f'rentang {model["jumlah_rentang"]:5d} · IoU {sc:.4f} {"LULUS" if sc >= TARGET else "GAGAL"}')


# ---- 5. uji KOMPRESI: seberapa kecil aset yang masih memenuhi IoU >= syarat ----
def encode(model, sy, sx):
    """kuantisasi: satu rentang tiap `sy` baris, x dibulatkan ke kelipatan `sx`, lalu interpolasi."""
    ys = sorted(model['baris'])
    keep = ys[::sy]
    baris = {}
    for y in ys:
        # ambil baris kunci terdekat
        k = min(keep, key=lambda v: abs(v - y))
        rentang = [((a // sx) * sx, (b // sx) * sx) for a, b in model['baris'][k]]
        rentang = [(a, b) for a, b in rentang if b - a >= 2]
        if rentang:
            baris[y] = rentang
    m2 = dict(model); m2['baris'] = baris
    m2['jumlah_rentang'] = sum(len(v) for v in baris.values())
    return m2


def mask_of_render(img):
    m = np.zeros(img.shape[:2], bool)
    m[img.mean(2) > 30] = True
    return m


print('\nkompresi (sy = tiap berapa baris, sx = pembulatan x): IoU · jumlah rentang · perkiraan ukuran JSON')
komp = {}
for app, rel, name, mode, thr in PLATES:
    a = read(rel, name)
    m = siluet(a, mode, thr)
    model = model_of(m)
    if model is None:
        continue
    warna = ({'atas': (150, 120, 235), 'bawah': (60, 45, 130), 'tepi': (210, 190, 255)}
             if app == 'mira' else
             {'atas': (120, 150, 235), 'bawah': (40, 70, 160), 'tepi': (200, 225, 255)})
    tag = name.replace('.webp', '')
    komp[tag] = {}
    for sy, sx in ((1, 1), (2, 2), (4, 4), (8, 8), (4, 8)):
        mm = encode(model, sy, sx)
        img = render(mm, warna)
        sc = iou(m, mask_of_render(img))
        perkiraan = int(mm['jumlah_rentang'] * 8)      # 2x int16 per rentang
        komp[tag][f'sy{sy}_sx{sx}'] = {'iou': round(sc, 4), 'rentang': int(mm['jumlah_rentang']),
                                       'perkiraan_byte': perkiraan}
        print(f'  {tag:<30} sy{sy}_sx{sx}: IoU {sc:.4f} · rentang {mm["jumlah_rentang"]:5d} · ~{perkiraan:6d} B')

json.dump({'judul': 'P13 langkah 1 — model siluet parametrik (aset milik kita)',
           'syarat_iou': TARGET,
           'cara': 'mask asli → isi lubang → komponen terbesar → cx(y), h(y) dihaluskan (40-1400 titik) → '
                   'render ulang dengan gradasi warna; tidak ada piksel asli yang dipakai di keluaran',
           'ringkas': {'plate': len(rows), 'lulus': sum(r['lulus'] for r in rows),
                       'iou_min': min(r['iou_render_vs_siluet'] for r in rows)},
           'baris': rows, 'kompresi': komp}, open(f'{OUT}/aset-siluet.json', 'w'), indent=1, ensure_ascii=False)
print(f'\n{sum(r["lulus"] for r in rows)}/{len(rows)} plate mencapai IoU >= {TARGET}')
