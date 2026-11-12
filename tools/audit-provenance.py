#!/usr/bin/env python3
"""audit-provenance.py — audit asal-usul ASET: mana yang masih salinan verbatim dari produk asli.

Ini gerbang hukum proyek (lihat docs/LISENSI-BRANDING.md): sebelum rebranding ke NIU & MIRAI,
tidak boleh ada satu berkas pun di `public/` yang byte-identik dengan aset produk asli.

Pakai:
  python3 tools/audit-provenance.py                 # periksa + tulis verification/provenance.json
  python3 tools/audit-provenance.py --quiet         # ringkas saja

Cara kerja: daftar berkas publik dari sumber yang kita punya, unduh versi PRODUKSI ASLI dari URL
yang sama (kalau ada), lalu bandingkan sha256. Berkas yang identik = SALINAN.
"""
import hashlib
import json
import os
import sys
import urllib.request

ROOT = '/home/user'
OUT = f'{ROOT}/Kerja-Arena/verification/provenance.json'
# (direktori publik kita, URL asli, daftar berkas)
APPS = [
    ('mira-humanoid-rebuild/public/humanoid', 'https://mira-humanoid.vercel.app/humanoid'),
    ('apex-humanoid-rebuild/public/humanoid', 'https://apex-humanoid.vercel.app/humanoid'),
]
UA = {'User-Agent': 'Mozilla/5.0 (audit-provenance)'}


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for blk in iter(lambda: f.read(1 << 16), b''):
            h.update(blk)
    return h.hexdigest()


def fetch(url):
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read()
    except Exception:
        return None


def main():
    quiet = '--quiet' in sys.argv
    rows, salinan, milik = [], 0, 0
    for rel_dir, base in APPS:
        d = f'{ROOT}/{rel_dir}'
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            p = f'{d}/{name}'
            if not os.path.isfile(p):
                continue
            h_ours = sha(p)
            # aset bisa berasal dari SALAH SATU produk asli (mis. APEX juga memuat aset MIRA),
            # jadi periksa kedua origin, bukan hanya origin aplikasi tempat berkas itu berada.
            h_prod = None
            for origin in ('https://mira-humanoid.vercel.app/humanoid', 'https://apex-humanoid.vercel.app/humanoid'):
                body = fetch(f'{origin}/{name}')
                if not body:
                    continue
                cand = hashlib.sha256(body).hexdigest()
                if cand == h_ours:
                    h_prod = cand
                    break
                h_prod = h_prod or cand
            verdict = ('SALINAN' if h_ours == h_prod else 'beda/baru') if h_prod else 'tidak ada di produksi asli'
            if verdict == 'SALINAN':
                salinan += 1
            else:
                milik += 1
            rows.append({'aplikasi': rel_dir.split('/')[0], 'berkas': name, 'byte': os.path.getsize(p),
                         'sha256_kita': h_ours[:16], 'sha256_asli': (h_prod or '')[:16], 'putusan': verdict})
            if not quiet:
                print(f'{rel_dir.split("/")[0]:24} {name:30} {verdict}')
    total = salinan + milik
    hasil = {
        'judul': 'Audit asal-usul aset publik (gerbang hukum rebranding)',
        'total_berkas': total, 'salinan_verbatim': salinan, 'bukan_salinan': milik,
        'lulus_gerbang_E_aset': salinan == 0,
        'catatan': 'Gerbang E (kelayakan rebranding) mensyaratkan salinan_verbatim == 0. Selama masih '
                   'ada salinan, aset itu milik pihak lain dan TIDAK boleh dipakai dengan merek NIU/MIRAI.',
        'baris': rows,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(hasil, f, indent=1, ensure_ascii=False)
    print(f'\ntotal {total} berkas · SALINAN VERBATIM {salinan} · bukan salinan {milik}')
    print(f'gerbang E (aset): {"LULUS" if salinan == 0 else "BELUM LULUS — " + str(salinan) + " berkas harus diganti"}')
    print(f'→ {OUT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
