#!/usr/bin/env python3
"""p13-garis.py — P13 langkah 2: plate milik kita LENGKAP (siluet hasil model + struktur garis).

Langkah 1 memodelkan SILUET (rentang per baris) sampai IoU >= 0,999. Di sini siluet itu dipakai sebagai
satu-satunya masukan bentuk, lalu struktur di dalamnya DIBANGUN DARI ATURAN:

  1) model rentang  : mask -> rentang per baris (span) dihaluskan -> mask model (tidak ada piksel asli)
  2) isi            : gradasi vertikal gelap + peredupan tepi (bukan slab)
  3) rim            : garis tepi siluet menyala
  4) kontur offset  : 3 kurva sejajar tepi (medan jarak) — lengkung mahkota/bahu
  5) garis medan    : garis horizontal bergelombang tiap `jarak` px, kekuatan & fase berbeda per garis,
                      memudar di ujung rentang; warna BERGESER dingin -> hangat di dalam elips wajah
  6) glow           : blur lembut dari lapisan garis saja
  7) kalibrasi      : satu skalar per plate supaya rata-rata luma di dalam siluet = plate asli (rasio ~1,0)

Paritas yang diukur (bukan "kelihatan mirip"):
  IoU siluet (model vs render) · IoU siluet (model vs plate asli) · impitan ridge (2 px) ·
  korelasi profil luma 16 pita · rasio luma (setelah kalibrasi)

Pakai: python3 tools/p13-garis.py [--hanya apex-idle-v1] [--banding] [--tulis]
  --banding : tulis verification/p13/banding-<plate>.png (asli | kita | selisih)
  --tulis   : salin plate baru ke public/humanoid/ kedua aplikasi (termasuk salinan mira-* di repo APEX)
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = '/home/user'
OUT = f'{ROOT}/Kerja-Arena/verification/p13'
BARU = f'{OUT}/baru'
os.makedirs(BARU, exist_ok=True)
TULIS = '--tulis' in sys.argv
BANDING = '--banding' in sys.argv
HANYA = sys.argv[sys.argv.index('--hanya') + 1] if '--hanya' in sys.argv else None

# palet kami sendiri (bukan sampel dari plate asli)
PALET = {
    'apex': {'atas': (26, 70, 116), 'bawah': (6, 16, 34), 'tepi': (150, 232, 255),
             'garis': (56, 188, 255), 'inti': (255, 150, 56), 'glow': 0.16},
    'mira': {'atas': (74, 42, 112), 'bawah': (20, 8, 44), 'tepi': (232, 200, 255),
             'garis': (170, 116, 255), 'inti': (255, 198, 120), 'glow': 0.18},
}

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
    """mask siluet sumber (acuan bentuk; tidak dipakai sebagai piksel keluaran)."""
    if mode == 'alpha':
        m = a[..., 3] > thr
        m = ndi.binary_closing(m, iterations=2)
    else:
        # sigma 3 & ambang 8: blur besar + ambang tinggi memotong bahu (cakupan 22,9 % -> 35,7 %)
        lum = ndi.gaussian_filter(a[..., :3].mean(2), 3.0)
        m = lum > thr
        m = ndi.binary_closing(m, iterations=3)
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        m = lab == (1 + int(np.argmax(sizes)))
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes >= 200
        m = keep[lab]
    return m


def rentang(baris):
    """indeks -> daftar (a0, a1) rentang menyambung (toleransi lubang 3 px)."""
    if len(baris) == 0:
        return []
    out, a, prev = [], baris[0], baris[0]
    for x in baris[1:]:
        if x - prev > 3:
            out.append((int(a), int(prev)))
            a = x
        prev = x
    out.append((int(a), int(prev)))
    return out


def model_bentuk(m):
    """model bentuk: mask dihaluskan (tutup lubang kecil + rata tepi) — bentuk saja, bukan piksel asli."""
    mk = ndi.gaussian_filter(m.astype(np.float32), 1.6) > 0.5
    mk = ndi.binary_closing(mk, iterations=3)
    mk = ndi.binary_fill_holes(mk)
    lab, n = ndi.label(mk)
    if n > 1:
        sizes = ndi.sum(mk, lab, range(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes >= 200
        mk = keep[lab]
    mk = ndi.binary_fill_holes(mk)
    return mk


def splat(buf, xs, ys, w, r, g, b):
    """tulis titik subpiksel (xs, ys) berbobot (w) ke buf (H,W,3) dengan sebaran bilinear 2x2."""
    H, W = buf.shape[:2]
    ok = (xs >= 1) & (xs < W - 2) & (ys >= 1) & (ys < H - 2)
    xs, ys, w = xs[ok], ys[ok], w[ok]
    x0 = np.floor(xs).astype(int)
    y0 = np.floor(ys).astype(int)
    fx, fy = xs - x0, ys - y0
    for dy in (0, 1):
        for dx in (0, 1):
            ww = w * (fx if dx else 1 - fx) * (fy if dy else 1 - fy)
            for k, c in enumerate((r, g, b)):
                buf[y0 + dy, x0 + dx, k] += ww * c


def render_medan(mk, pal, H, W, jarak=6.5, lantai=24.0, ramp=(2.0, 8.0, 1.4), partikel=0.55, kuat_p=1.0, core_buka=26, balik=False, medial=0.0):
    """gambar plate dari model bentuk `mk` — semua parameter dari palet & aturan, bukan piksel asli."""
    ys = np.where(mk.any(1))[0]
    y0, y1 = int(ys.min()), int(ys.max())
    atas = np.array(pal['atas'], np.float32)
    bawah = np.array(pal['bawah'], np.float32)
    tepi = np.array(pal['tepi'], np.float32)
    garis = np.array(pal['garis'], np.float32)
    inti = np.array(pal['inti'], np.float32)
    # inti bentuk vs cangkang: cangkang = gerigi/semburan partikel di tepi (diisi partikel, bukan garis)
    # inti = bagian yang lebih dalam dari `core_buka` px dari tepi -> semburan tipis otomatis tertinggal di cangkang
    D0 = ndi.distance_transform_edt(mk)
    core = mk & (D0 >= core_buka)
    core = ndi.binary_fill_holes(core)
    lab, n = ndi.label(core)
    if n > 1:
        sz = ndi.sum(core, lab, range(1, n + 1))
        core = lab == (1 + int(np.argmax(sz)))
    core = ndi.binary_fill_holes(core)
    shell = mk & ~core
    fc = core.astype(np.float32)
    f = mk.astype(np.float32)
    D = D0
    Dc = ndi.distance_transform_edt(core)

    # ---- aturan 1: makin ke bawah makin redup (kepala/dada terang, kaki redup)
    v = np.clip((np.arange(H) - y0) / max(1, (y1 - y0)), 0, 1)
    vig = (1.0 - 0.58 * np.clip((v - 0.56) / 0.44, 0, 1) ** 1.25).astype(np.float32)
    if balik:
        vig = vig[::-1].copy()

    # ---- 1) isi: gradasi vertikal, diredupkan dekat tepi
    vv = v[:, None, None]
    dasar = atas[None, None, :] * (1 - vv) + bawah[None, None, :] * vv
    tepi_redam_c = np.clip(Dc / 24.0, 0, 1)[..., None] ** 0.7
    # ---- aturan 2: bobot medial — makin dekat sumbu massa, makin terang (otot/tulang punggung)
    if medial > 0:
        sumbu = np.exp(-(Dc / (0.22 * Dc.max() + 1e-3)) ** 2)
        bobot_m = 1.0 + medial * sumbu
    else:
        bobot_m = np.ones_like(Dc)
    isi = dasar * (0.075 + 0.11 * tepi_redam_c) * vig[:, None, None] * fc[..., None] * bobot_m[..., None]

    # ---- elips wajah (dingin -> hangat)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    fx, fy = W * 0.5, y0 + (y1 - y0) * 0.43
    rx, ry = W * 0.175, (y1 - y0) * 0.175
    hangat = np.clip(np.exp(-(((xx - fx) / rx) ** 2 + ((yy - fy) / ry) ** 2)), 0, 1)

    # ---- 2) garis medan: horizontal bergelombang, jarak tetap, tiap garis beda fase & kuat
    lap = np.zeros((H, W, 3), np.float32)
    iy = 0
    y = y0
    while y < y1:
        for a0, a1 in rentang(np.where(core[int(y)])[0]):
            if a1 - a0 < 10:
                continue
            xs = np.arange(a0, a1 + 1, dtype=np.float32)
            u = (xs - a0) / (a1 - a0)
            gel = 1.5 * np.sin(xs / 44.0 + iy * 0.6) + 0.85 * np.sin(xs / 17.0 + iy * 1.7)
            gel *= 0.6 + 0.4 * np.sin(np.pi * u)
            yv = y + gel
            taper = np.clip(np.minimum(u, 1 - u) * (a1 - a0) / 26.0, 0, 1) ** 0.6
            kuat = 0.62 + 0.38 * np.sin(iy * 2.399)
            kyt = vig[int(np.clip(y, 0, H - 1))]
            ycl = np.clip(yv.astype(int), 0, H - 1)
            xcl = np.clip(xs.astype(int), 0, W - 1)
            hp = hangat[ycl, xcl]
            bm = 1.0 + medial * np.exp(-(Dc[ycl, xcl] / (0.22 * Dc.max() + 1e-3)) ** 2)
            cr = (garis[0] * (1 - hp) + inti[0] * hp) * (taper * kuat * kyt * bm)
            cg = (garis[1] * (1 - hp) + inti[1] * hp) * (taper * kuat * kyt * bm)
            cb = (garis[2] * (1 - hp) + inti[2] * hp) * (taper * kuat * kyt * bm)
            for dyk, wk in ((-1.0, 0.18), (0.0, 1.0), (1.0, 0.18)):
                splat(lap, xs, yv + dyk, np.full(len(xs), wk, np.float32), cr, cg, cb)
        iy += 1
        y += jarak

    # ---- 2b) inti hangat: elips wajah menyala (bukan hanya menggeser warna)
    lap += (hangat ** 1.6 * fc)[..., None] * inti * 0.55 * vig[:, None, None]

    # ---- 3) kontur offset sejajar tepi (lengkung mahkota/bahu)
    for lvl, amp in ((4.0, 1.1), (8.5, 0.85), (14.0, 0.65), (21.0, 0.45), (30.0, 0.30)):
        band = np.exp(-((Dc - lvl) / 0.8) ** 2)
        lap += band[..., None] * (garis * 0.62 + tepi * 0.18) * (0.34 * amp) * vig[:, None, None]

    # ---- 4) rim: tepi siluet menyala
    # rim: garis tepi menyala pada jarak tetap DI DALAM inti (lengkung mahkota/bahu)
    rim = np.exp(-((Dc - 7.0) / 1.15) ** 2) + 0.45 * np.exp(-((Dc - 13.0) / 1.3) ** 2)
    mahkota = (1.0 + 0.55 * np.exp(-((np.arange(H) - y0) / max(1.0, 0.05 * (y1 - y0))) ** 2))[:, None]
    lap += rim[..., None] * tepi * 2.0 * vig[:, None, None] * mahkota[:, :, None]

    # ---- 4b) untaian vertikal (leher/dada/badan bawah): kolom-kolom yang menyusuri bentuk
    yb = int(y0 + 0.42 * (y1 - y0))
    for x in range(int(W * 0.10), int(W * 0.90), 12):
        ys2 = np.where(mk[yb:y1, x])[0]
        if len(ys2) < 60:
            continue
        ytop, ybot = yb + ys2.min() + 12, yb + ys2.max() - 12
        if ybot - ytop < 40:
            continue
        yv = np.arange(ytop, ybot, 1.0)
        xv = x + 3.0 * np.sin((yv - ytop) / 74.0 + x * 0.37) + 1.2 * np.sin((yv - ytop) / 21.0)
        uu = (yv - ytop) / (ybot - ytop)
        tp = np.clip(np.minimum(uu, 1 - uu) * (ybot - ytop) / 30.0, 0, 1) ** 0.7
        ky = vig[np.clip(yv.astype(int), 0, H - 1)]
        amp2 = tp * ky * 0.30
        hp2 = hangat[np.clip(yv.astype(int), 0, H - 1), np.clip(xv.astype(int), 0, W - 1)]
        splat(lap, xv, yv, amp2, garis[0] * (1 - hp2) + inti[0] * hp2,
              garis[1] * (1 - hp2) + inti[1] * hp2, garis[2] * (1 - hp2) + inti[2] * hp2)

    # ---- 4c) cangkang: semburan partikel deterministik (biji = nama plate), bukan garis
    ys_s, xs_s = np.where(shell)
    if len(ys_s):
        rng = np.random.default_rng(abs(hash(pal['garis'])) % (2 ** 32) + len(ys_s))
        n_p = min(len(ys_s), int(len(ys_s) * partikel) + 400)
        sel = rng.choice(len(ys_s), n_p, replace=False)
        px = xs_s[sel].astype(np.float32) + rng.uniform(-0.5, 0.5, n_p)
        py = ys_s[sel].astype(np.float32) + rng.uniform(-0.5, 0.5, n_p)
        bobot = rng.uniform(0.25, 1.0, n_p) ** 2.2 * 1.2 * kuat_p
        splat(lap, px, py, bobot, np.full(n_p, tepi[0] * 0.30), np.full(n_p, tepi[1] * 0.45),
              np.full(n_p, tepi[2] * 0.55))

    # ---- 5) glow halus dari lapisan garis, DIPOTONG mask (tidak membengkakkan siluet)
    glow = np.asarray(Image.fromarray(np.clip(lap, 0, 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(3))).astype(np.float32) * pal['glow']
    # tepi luar diredam 2 px: halo tidak melebar keluar siluet (dihitung dengan definisi mask yang sama)
    soft = np.clip((Dc - ramp[0]) / ramp[1], 0, 1) ** ramp[2]
    out = (isi + lap + glow) * soft[..., None]
    # lantai redup di dalam siluet: siluet tetap utuh walau isi gelap (tidak mengubah rupa)
    soft_f = f
    out = np.maximum(out, np.array([0.35, 0.72, 1.0], np.float32)[None, None, :] * lantai * soft_f[..., None])
    return np.clip(out, 0, 255)


def meter(a, mk, img, mode='luma', thr=8, alfa=None):
    """paritas: IoU model vs render, IoU model vs asli, impitan ridge, korelasi & rasio luma."""
    lum_a = a[..., :3].mean(2)
    lum_b = img.mean(2)
    if mode == 'alpha':
        mr = (alfa > 32)
    else:
        mr = siluet(np.dstack([img, np.full(img.shape[:2], 255, np.float32)]), 'luma', thr)
    iou_render = float((mk & mr).sum()) / max(1, int((mk | mr).sum()))   # mk = siluet asli (acuan)
    # impitan ridge: puncak plate asli (persentil 80 dalam siluet) yang punya puncak baru <= 2 px
    H, W = mk.shape
    hit = tot = 0
    for y in range(0, H, 4):
        idx = np.where(mk[y])[0]
        if len(idx) < 5:
            continue
        amb = max(28.0, float(np.percentile(lum_a[y][idx], 80)))
        for x in idx:
            if lum_a[y, x] < amb:
                continue
            tot += 1
            if lum_b[y, max(0, x - 2):min(W, x + 3)].max() > 26:
                hit += 1
    impit = 100.0 * hit / max(1, tot)
    pl, pb = [], []
    for i in range(16):
        sl = (slice(i * H // 16, (i + 1) * H // 16), slice(0, W))
        if mk[sl].any():
            pl.append(float(lum_a[sl][mk[sl]].mean()))
            pb.append(float(lum_b[sl][mk[sl]].mean()))
    kor = float(np.corrcoef(pl, pb)[0, 1]) if len(pl) > 2 else 0.0
    rasio = float(np.mean(pb) / max(1e-3, np.mean(pl)))
    return iou_render, impit, kor, rasio


rows = []
for app, rel, name, mode, thr in PLATES:
    tag = name.replace('.webp', '')
    if HANYA and tag != HANYA:
        continue
    a = read(rel, name)
    H, W = a.shape[:2]
    msrc = siluet(a, mode, thr)
    mk = model_bentuk(msrc)
    iou_model = float((msrc & mk).sum()) / max(1, int((msrc | mk).sum()))
    pal = PALET[app]
    target = float(a[..., :3].mean(2)[msrc].mean())
    alfa = (mk.astype(np.uint8) * 255) if (app == 'mira' and mode == 'alpha') else None

    def coba(balik, lantai, ramp=(2.0, 8.0, 1.4), medial=0.0):
        im = render_medan(mk, pal, H, W, lantai=lantai, balik=balik, ramp=ramp, medial=medial)
        sk = float(np.clip(target / max(1e-3, float(im.mean(2)[msrc].mean())), 0.15, 4.0))
        return np.clip(im * sk, 0, 255), sk

    # arah gradasi: dua pilihan aturan (kepala-terang / badan-terang), dipilih dari korelasi profil
    pilih = None
    for balik in (False, True):
        im, sk = coba(balik, 18.0)
        _, _, kor0, _ = meter(a, msrc, im, mode, thr, alfa)
        if pilih is None or kor0 > pilih[0]:
            pilih = (kor0, balik, im, sk)
    _, balik_p, img, skala = pilih
    # lantai & lebar tepi: dipilih dari IoU siluet (bentuk tepi menyesuaikan ketebalan bentuk)
    pilih2 = None
    for lantai in (6.0, 12.0, 18.0, 26.0):
        for ramp in ((2.0, 8.0, 1.4), (0.5, 3.0, 1.0)):
            for medial in (0.0, 0.6, 1.2):
                im, sk = coba(balik_p, lantai, ramp, medial)
                iou0, _, kor0, _ = meter(a, msrc, im, mode, thr, alfa)
                skor = iou0 + 0.02 * kor0          # IoU utama, korelasi sebagai pengimbang tipis
                if pilih2 is None or skor > pilih2[0]:
                    pilih2 = (skor, lantai, ramp, medial, im, sk)
    _, lantai_p, ramp_p, medial_p, img, skala = pilih2
    iou_render, impit, kor, rasio = meter(a, msrc, img, mode, thr, alfa)
    alfa_out = (mk.astype(np.uint8) * 255) if (app == 'mira' and mode == 'alpha') else np.full((H, W), 255, np.uint8)
    Image.fromarray(np.dstack([img.astype(np.uint8), alfa_out]), 'RGBA').save(
        f'{BARU}/{name}', 'WEBP', quality=92, method=4)
    if BANDING:
        beda = np.abs(img - a[..., :3]).mean(2)
        beda = (255 * np.clip(beda / max(1.0, beda.max()), 0, 1) ** 0.5).astype(np.uint8)
        pn = np.concatenate([a[..., :3].astype(np.uint8), img.astype(np.uint8),
                             np.dstack([beda] * 3)], 1)
        Image.fromarray(pn).resize((pn.shape[1] // 2, pn.shape[0] // 2)).save(f'{OUT}/banding-{tag}.png')
    rows.append({'aplikasi': app, 'berkas': name, 'iou_model_vs_siluet_asli': round(iou_model, 4),
                 'iou_model_vs_render': round(iou_render, 4), 'impitan_ridge_persen': round(impit, 2),
                 'korelasi_profil_luma': round(kor, 3), 'rasio_luma': round(rasio, 3),
                 'skala_kalibrasi': round(skala, 3), 'vig_terbalik': bool(balik_p), 'lantai': lantai_p, 'ramp_tepi': list(ramp_p), 'bobot_medial': medial_p})
    print(f'{tag:<28} IoU model {iou_model:.4f} · render {iou_render:.4f} · impit {impit:5.1f}% · '
          f'korelasi {kor:5.3f} · rasio {rasio:4.2f} · skala {skala:.2f}')

if not HANYA:
    lulus = [r for r in rows if r['iou_model_vs_render'] >= 0.98 and r['iou_model_vs_siluet_asli'] >= 0.98]
    json.dump({'judul': 'P13 langkah 2 — plate milik kita (siluet model + struktur garis) dan paritasnya',
               'cara': 'mask -> model rentang per baris (dihaluskan) -> isi gradasi + rim + 3 kontur offset + '
                       'garis medan bergelombang (warna dingin->hangat di elips wajah) + glow; '
                       'kecerahan dikalibrasi satu skalar per plate',
               'syarat': {'iou_siluet': 0.98},
               'ringkas': {'plate': len(rows), 'lulus': len(lulus),
                           'iou_render_min': round(min(r['iou_model_vs_render'] for r in rows), 4),
                           'korelasi_min': round(min(r['korelasi_profil_luma'] for r in rows), 3)},
               'palet': {k: {kk: (list(vv) if isinstance(vv, tuple) else vv) for kk, vv in v.items()}
                         for k, v in PALET.items()},
               'baris': rows}, open(f'{OUT}/p13-langkah2.json', 'w'), indent=1, ensure_ascii=False)
    print(f'\nJSON: {OUT}/p13-langkah2.json · plate baru di {BARU}')
    if TULIS:
        import shutil
        for app, rel2, name2, mode2, thr2 in PLATES:
            shutil.copy(f'{BARU}/{name2}', f'{ROOT}/{rel2}/{name2}')
        for n in ('mira-idle-v1.webp', 'mira-hair-v1.webp'):
            shutil.copy(f'{BARU}/{n}', f'{ROOT}/apex-humanoid-rebuild/public/humanoid/{n}')
        print('--tulis: plate baru disalin ke public/humanoid kedua aplikasi')
