#!/usr/bin/env python3
"""avatar-baru.py — scaffold & validator untuk avatar baru (lihat docs/MESIN-PRODUKSI-AVATAR.md).

Pakai:
  python3 tools/avatar-baru.py mirai             # buat kerangka avatars/mirai/ dari templates/
  python3 tools/avatar-baru.py --periksa mirai   # validasi manifest yang sudah ada
  python3 tools/avatar-baru.py --daftar          # daftar avatar yang sudah ada

Gunanya: setiap avatar baru langsung punya (1) manifest valid, (2) daftar gerbang yang harus lulus,
(3) berkas lisensi aset. Tanpa tiga itu, avatar tidak boleh masuk produksi.
"""
import json
import os
import shutil
import sys

ROOT = '/home/user'
KERJA = f'{ROOT}/Kerja-Arena'
TPL = f'{KERJA}/templates/avatar.manifest.json'
DIR_AVATAR = f'{KERJA}/avatars'
WAJIB = ['id', 'nama', 'kanvas', 'state', 'plate', 'siluet', 'waktu', 'dial', 'warna', 'lisensi']
GERBANG = ['A', 'B', 'C', 'D', 'deploy', 'hukum']


def periksa(path, nama):
    if not os.path.exists(path):
        print(f'❌ {nama}: manifest tidak ada ({path})')
        return 1
    d = json.load(open(path))
    gagal = 0
    for k in WAJIB:
        if k not in d:
            print(f'❌ {nama}: kunci wajib hilang: {k}')
            gagal += 1
    if d.get('lisensi', {}).get('aset') != 'milik-sendiri':
        print(f'❌ {nama}: lisensi.aset = {d.get("lisensi", {}).get("aset")!r} — harus "milik-sendiri" sebelum publikasi')
        gagal += 1
    for k in GERBANG:
        if k not in d.get('gerbang', {}):
            print(f'❌ {nama}: gerbang {k} tidak dipetakan')
            gagal += 1
    if len(d.get('state', [])) < 1:
        print(f'❌ {nama}: tidak ada state')
        gagal += 1
    else:
        for st in d['state']:
            if st not in d.get('plate', {}):
                print(f'❌ {nama}: state {st} tidak punya plate')
                gagal += 1
    print(f'{"✅" if gagal == 0 else "⛔"} {nama}: {gagal} masalah')
    return 1 if gagal else 0


def buat(nama):
    d = f'{DIR_AVATAR}/{nama}'
    if os.path.exists(d):
        print(f'⛔ {d} sudah ada — tidak ditimpa')
        return 1
    os.makedirs(d)
    m = json.load(open(TPL))
    m['id'] = nama
    m['nama'] = nama.upper()
    m['plate'] = {k: v.replace('avatar', nama) for k, v in m['plate'].items()}
    m['rambut']['berkas'] = m['rambut']['berkas'].replace('avatar', nama)
    json.dump(m, open(f'{d}/manifest.json', 'w'), indent=1, ensure_ascii=False)
    open(f'{d}/README.md', 'w').write(f"""# Avatar `{nama}`

Kerangka dibuat oleh `tools/avatar-baru.py` (lihat `docs/MESIN-PRODUKSI-AVATAR.md`).

## Yang harus kamu isi
1. `public/humanoid/{nama}-*.webp` — plate per state, **dimensi identik**, alfa benar, **milik sendiri**.
2. `rambut.offset` & `rambut.pivot` — **ukur** dari acuan, jangan dikira (jebakan W-9b/W-9c).
3. `waktu` — ignite & kecepatan gelombang, kalau perlu ukur ulang.
4. `warna` — tiga warna saja; semua turunan warna mengikuti.

## Gerbang yang harus lulus sebelum produksi
| gerbang | alat | syarat |
|---|---|---|
| A fungsi | `tools/gate-mira-a.js` | 8/8 |
| B parameter | `tools/gate-mira-b.js` | 10/10 |
| C paritas | `tools/metric3.py` + `tools/sweep-knob.js` | angka + peta selisih dilaporkan |
| D ketahanan | `tools/gate-d.js` | 7/7 (reproduksi 0,0000) |
| deploy | `tools/verifikasi-produksi.sh --gates` | aset produksi = build byte-identik |
| hukum | `tools/audit-provenance.py` | **0 salinan verbatim** |

## Perintah harian
```
npx tsc --noEmit && npx vite build
node tools/reg-build.js --t 8 --t 11.5
node tools/capture.js --prefix {nama} --t 0.3,1.89,3.5,5.5,6.8,9.5
python3 tools/metric3.py {nama} 0.3 1.89 3.5 5.5 6.8 9.5
```
""")
    shutil.copy(f'{ROOT}/mira-humanoid-rebuild/LICENSE', f'{d}/LICENSE-ASET.txt')
    print(f'✅ kerangka dibuat: {d}')
    print('   → isi manifest.json, taruh plate milik sendiri, lalu jalankan --periksa')
    return periksa(f'{d}/manifest.json', nama)


def main():
    a = sys.argv[1:]
    if not a or a[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    if a[0] == '--daftar':
        if not os.path.isdir(DIR_AVATAR):
            print('belum ada avatar')
            return 0
        for n in sorted(os.listdir(DIR_AVATAR)):
            periksa(f'{DIR_AVATAR}/{n}/manifest.json', n)
        return 0
    if a[0] == '--periksa':
        return periksa(f'{DIR_AVATAR}/{a[1]}/manifest.json', a[1])
    return buat(a[0])


if __name__ == '__main__':
    sys.exit(main())
