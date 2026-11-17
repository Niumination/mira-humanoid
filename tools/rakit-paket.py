#!/usr/bin/env python3
"""
rakit-paket.py — merakit paket siap-terap dari workspace, byte-identik, plus daftar sha256.

Paket = folder `pak<kode>/` yang isinya cermin tata letak repo, lalu di-zip ke
/home/user/niu-update-langkah<kode>.zip. Berkas BACA-DULU-<kode>.md ditulis lebih dulu oleh penyusun
(isi naratif), lalu skrip ini MENAMBAHKAN tabel sha256 ke bagian akhirnya dan mencetak ringkasannya.

Spesifikasi (JSON):
{
  "kode": "5v",
  "berkas": [
    ["/home/user/tools/gate-a11y.js", "tools/gate-a11y.js"],
    ["/home/user/apex-humanoid-rebuild/src/main.tsx", "niu-humanoid/src/main.tsx"]
  ]
}

Pakai: python3 tools/rakit-paket.py spec-5v.json [--tanpa-zip]
"""
import hashlib
import json
import os
import shutil
import sys
import zipfile

BASE = '/home/user/Kerja-Arena/paket'
ZIPDIR = '/home/user'


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for blok in iter(lambda: f.read(1 << 16), b''):
            h.update(blok)
    return h.hexdigest()


def main():
    spec_path = sys.argv[1]
    tanpa_zip = '--tanpa-zip' in sys.argv
    spec = json.load(open(spec_path))
    kode = spec['kode']
    nama = f'pak{kode}'
    root = os.path.join(BASE, nama)
    if os.path.isdir(root):
        shutil.rmtree(root)
    os.makedirs(root, exist_ok=True)

    baris = []
    hilang = []
    for src, dst in spec['berkas']:
        if not os.path.exists(src):
            hilang.append(src)
            continue
        tujuan = os.path.join(root, dst)
        os.makedirs(os.path.dirname(tujuan), exist_ok=True)
        shutil.copy2(src, tujuan)
        if sha256(src) != sha256(tujuan):
            raise SystemExit(f'GAGAL: salinan tidak byte-identik: {dst}')
        baris.append((dst, sha256(tujuan), os.path.getsize(tujuan)))
    if hilang:
        raise SystemExit('berkas sumber tidak ada:\n  ' + '\n  '.join(hilang))

    # BACA-DULU: ambil dari paket/BACA-DULU-<kode>.md, tambahkan tabel hash
    baca_src = os.path.join(BASE, f'BACA-DULU-{kode}.md')
    if os.path.exists(baca_src):
        teks = open(baca_src).read().rstrip() + '\n'
        teks += f'\n## Isi paket & sha256 (8 heks pertama) — {len(baris)} berkas\n\n'
        teks += '| berkas | sha256 | byte |\n|---|---|---|\n'
        for dst, h, size in baris:
            teks += f'| `{dst}` | `{h[:8]}` | {size} |\n'
        open(os.path.join(root, f'BACA-DULU-{kode}.md'), 'w').write(teks)

    if not tanpa_zip:
        zpath = os.path.join(ZIPDIR, f'niu-update-langkah{kode}.zip')
        with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
            for akar, _, berkas in os.walk(root):
                rel = os.path.relpath(akar, BASE)
                z.write(akar, rel + '/')
                for f in sorted(berkas):
                    full = os.path.join(akar, f)
                    z.write(full, os.path.join(rel, f))
        print(f'zip  : {zpath} · {os.path.getsize(zpath)} byte · sha256 {sha256(zpath)[:16]}')
    print(f'paket: {root} · {len(baris)} berkas')
    for dst, h, size in baris:
        print(f'  {h[:8]}  {size:>9}  {dst}')


if __name__ == '__main__':
    main()
