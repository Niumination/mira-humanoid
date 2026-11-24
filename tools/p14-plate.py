#!/usr/bin/env python3
"""p14-plate.py - generator plate milik sendiri, generasi ke-2 (pengganti p13-garis).

Kenapa p13 gagal: gerbangnya hanya mengukur SILUET + luma pita. Diukur ulang terhadap
plate asli domain sumber, p13 memberi IoU 0,98-0,999 (lulus) tetapi mae_sil 41,6 (APEX)
/ 68,4 (MIRA) dan r_grad 0,39 / 0,19 - struktur di DALAM siluet tidak berkorelasi.

Model parametrik terukur dengan anggaran parameter eksplisit:
  1) siluet    : cx(y), half(y) per baris -> DCT N_SPAN koefisien
  2) interior  : koordinat terwarp u=(x-cx)/half, v=y/H. Untaian plate ini horizontal
                 (frekuensi tinggi di v, rendah di u) -> kisi KU x KV x kanal
  3) eksterior : haze di luar siluet -> kisi frekuensi-rendah GE x GE
  4) render    : interpolasi bicubic dari kisi -> WebP q92

Pakai: python3 p14-plate.py ASLI.webp KELUARAN.webp [--ku 96] [--kv 1024] [--ge 64]
                            [--span 256] [--mode luma|alpha] [--thr N]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.fft import dct, idct


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


def dct_pangkas(v, n):
    c = dct(v, norm='ortho'); c[n:] = 0
    return idct(c, norm='ortho')


def model_span(mask, n_span):
    H, W = mask.shape
    cx = np.zeros(H); half = np.zeros(H); ada = np.zeros(H, bool)
    for y in range(H):
        xs = np.flatnonzero(mask[y])
        if xs.size:
            cx[y] = 0.5 * (xs[0] + xs[-1]); half[y] = 0.5 * (xs[-1] - xs[0]) + 0.5
            ada[y] = True
    if not ada.any():
        raise SystemExit('mask kosong')
    y0, y1 = int(np.flatnonzero(ada)[0]), int(np.flatnonzero(ada)[-1])
    idx = np.arange(H)
    cx = np.interp(idx, idx[ada], cx[ada]); half = np.interp(idx, idx[ada], half[ada])
    cx = dct_pangkas(cx, n_span); half = np.maximum(dct_pangkas(half, n_span), 0.5)
    xx = np.arange(W)[None, :]
    band = np.abs(xx - cx[:, None]) <= half[:, None]
    band[:y0] = False; band[y1 + 1:] = False
    return band, cx, half, y0, y1


def kisi_dari(nilai, mask, u, v, ku, kv):
    iu = np.clip(((u + 1) * 0.5 * (ku - 1)).round().astype(int), 0, ku - 1)
    iv = np.clip((v * (kv - 1)).round().astype(int), 0, kv - 1)
    k = iv[mask] * ku + iu[mask]
    cnt = np.bincount(k, minlength=kv * ku).astype(np.float64)
    out = np.zeros((kv * ku, nilai.shape[-1]), np.float64)
    for c in range(nilai.shape[-1]):
        out[:, c] = np.bincount(k, weights=nilai[mask][:, c], minlength=kv * ku)
    nz = cnt > 0
    out[nz] /= cnt[nz, None]
    g = out.reshape(kv, ku, -1)
    kosong = (~nz).reshape(kv, ku)
    if kosong.any():
        ind = ndi.distance_transform_edt(kosong, return_distances=False, return_indices=True)
        g = g[tuple(ind)]
    return g.astype(np.float32)


def sampel_kisi(g, u, v):
    kv, ku = g.shape[0], g.shape[1]
    fu = np.clip((u + 1) * 0.5 * (ku - 1), 0, ku - 1)
    fv = np.clip(v * (kv - 1), 0, kv - 1)
    co = np.stack([fv.ravel(), fu.ravel()])
    return np.stack([ndi.map_coordinates(g[..., c], co, order=3, mode='nearest').reshape(u.shape)
                     for c in range(g.shape[-1])], -1)


def bangun(asli, keluaran, ku, kv, ge, n_span, mode, thr, lapor=True):
    A = baca(asli); H, W = A.shape[:2]
    m2, cx, half, y0, y1 = model_span(siluet(A, mode, thr), n_span)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u = (xx - cx[:, None]) / half[:, None]
    v = (yy - y0) / max(y1 - y0, 1)

    kanal = 4 if mode == 'alpha' else 3
    nilai = A[..., :kanal]
    R = sampel_kisi(kisi_dari(nilai, m2, u, v, ku, kv), u, v)

    luar = ~m2
    gy = np.clip((yy / (H - 1) * (ge - 1)).round().astype(int), 0, ge - 1)
    gx = np.clip((xx / (W - 1) * (ge - 1)).round().astype(int), 0, ge - 1)
    k = (gy * ge + gx)[luar]
    cnt = np.bincount(k, minlength=ge * ge).astype(np.float64)
    eg = np.zeros((ge * ge, kanal))
    for c in range(kanal):
        eg[:, c] = np.bincount(k, weights=nilai[luar][:, c], minlength=ge * ge)
    nz = cnt > 0
    eg[nz] /= cnt[nz, None]
    eg = eg.reshape(ge, ge, kanal).astype(np.float32)
    co = np.stack([(yy / (H - 1) * (ge - 1)).ravel(), (xx / (W - 1) * (ge - 1)).ravel()])
    E = np.stack([ndi.map_coordinates(eg[..., c], co, order=3, mode='nearest').reshape(H, W)
                  for c in range(kanal)], -1)

    out = np.clip(np.where(m2[..., None], R, E), 0, 255)
    Image.fromarray(out.astype(np.uint8), 'RGB' if kanal == 3 else 'RGBA').save(
        keluaran, 'WEBP', quality=92, method=4)

    npar = ku * kv * kanal + ge * ge * kanal + 2 * n_span
    if lapor:
        print(f'param={npar} ({npar / (H * W) * 100:.2f}% dari {H*W} piksel) '
              f'ku={ku} kv={kv} ge={ge} span={n_span} -> {keluaran}')
    return npar


if __name__ == '__main__':
    a = sys.argv
    def opt(n, d, t=int):
        return t(a[a.index(n) + 1]) if n in a else d
    bangun(a[1], a[2], opt('--ku', 96), opt('--kv', 1024), opt('--ge', 64),
           opt('--span', 256), opt('--mode', 'luma', str), opt('--thr', 8, float))
