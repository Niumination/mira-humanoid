#!/usr/bin/env python3
"""
gate-provenance.py — GERBANG E sebagai gerbang yang MENGGAGALKAN build (bukan laporan yang bisa dilewati).

Masalah yang ditutup: P13 menyatakan "aset milik kita" dengan angka, tetapi tidak ada yang menghentikan
salinan aset produksi asli masuk kembali ke repo. Terbukti pada audit 2026-11-18: repo APEX masih memuat
10/10 plate **salinan asli** (`ba1a6d93f39c` = identik `verification/p13/asli/apex-idle-v1.webp`)
sementara semua gerbang lain lulus.

Dua mode:

  --statis   (bawaan, tanpa jaringan)  : setiap berkas di public/humanoid dibandingkan dengan tabel sidik
                                         ASET ASLI (`verification/p13/asli/*`) dan ASET KITA
                                         (`verification/p13/baru/*`). Salinan asli / tak dikenal → GAGAL.
  --live URL (opsional)                : berkas disajikan aplikasi (fetch di halaman) → sha256 vs tabel sidik,
                                         membuktikan yang DISAJIKAN juga milik kita, bukan hanya yang di repo.

Pengaman tambahan (P14-B):
  * `--larang-dari <berkas>` : daftar sha256 yang DILARANG muncul lagi (salinan asli). Bisa diisi dari
    `--tulis-larangan` pada run yang gagal.
  * berkas < 1 KB dianggap placeholder dan GAGAL (kasus `a-mira-idle-v1.webp` 79 B di masa lalu).

Pakai:
  python3 tools/gate-provenance.py [--akar public/humanoid] [--live URL] [--json keluar.json]
  python3 tools/gate-provenance.py --tulis-larangan verification/p14/larangan-aset.json
Keluar: 0 = semua aset milik kita · 1 = ada salinan asli/tak dikenal/placeholder.
"""
import hashlib
import json
import os
import sys

K = os.environ.get('KERJA_ARENA', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P13 = os.environ.get('P13_DIR') or f'{K}/verification/p13'
AKAR_BAWAAN = os.environ.get('AKAR_ASET', 'public/humanoid')
MIN_BYTE = 1024


def arg(nama, bawaan=None):
    return sys.argv[sys.argv.index(nama) + 1] if nama in sys.argv else bawaan


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 16), b''):
            h.update(b)
    return h.hexdigest()


def tabel_sidik():
    tabel = {}
    for sub, tag in [('asli', 'asli'), ('baru', 'kita')]:
        d = os.path.join(P13, sub)
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            tabel[sha(os.path.join(d, f))] = {'asal': tag, 'contoh': f}
    return tabel


def main():
    akar = arg('--akar', AKAR_BAWAAN)
    json_out = arg('--json')
    live = arg('--live')
    larang_path = arg('--larang-dari')
    tulis_larangan = arg('--tulis-larangan')

    sidik = tabel_sidik()
    if not sidik:
        print(f'FATAL: tabel sidik kosong ({P13}/asli & baru tidak ada)')
        sys.exit(2)

    larangan = {}
    if larang_path and os.path.isfile(larang_path):
        larangan = json.load(open(larang_path)).get('sha256', {})

    if not os.path.isdir(akar):
        print(f'FATAL: {akar} tidak ada')
        sys.exit(2)

    hasil = {'gerbang': 'provenance aset', 'akar': akar, 'live': live,
             'syarat': {'min_byte': MIN_BYTE, 'larangan': len(larangan)}, 'berkas': []}
    gagal = 0
    for f in sorted(os.listdir(akar)):
        p = os.path.join(akar, f)
        if not os.path.isfile(p):
            continue
        ukuran = os.path.getsize(p)
        h = sha(p)
        info = sidik.get(h)
        asal = info['asal'] if info else 'tak dikenal'
        alasan = []
        if asal == 'asli':
            alasan.append(f'salinan asli produksi (={info["contoh"]})')
        elif asal == 'tak dikenal':
            alasan.append('tidak ada di tabel sidik P13')
        if ukuran < MIN_BYTE:
            alasan.append(f'placeholder {ukuran} B < {MIN_BYTE} B')
        if h in larangan:
            alasan.append(f'ada di daftar larangan ({larangan[h].get("alasan", "salinan asli")})')
        ok = not alasan
        if not ok:
            gagal += 1
        hasil['berkas'].append({'berkas': f, 'sha256': h[:16], 'byte': ukuran,
                                'asal': asal, 'lulus': ok, 'alasan': alasan})
        print(f'{"PASS" if ok else "FAIL"}  {f:34s} {h[:12]} {ukuran:>8} B  {asal}'
              + ('' if ok else '  ← ' + '; '.join(alasan)))

    # mode live: buktikan yang DISAJIKAN juga milik kita
    if live:
        try:
            import urllib.request
            for b in hasil['berkas']:
                try:
                    data = urllib.request.urlopen(f'{live.rstrip("/")}/humanoid/{b["berkas"]}', timeout=40).read()
                except Exception as e:  # noqa: BLE001
                    b['live'] = {'galat': str(e)}
                    print(f'WARN  live {b["berkas"]}: {e}')
                    continue
                hl = hashlib.sha256(data).hexdigest()
                info = sidik.get(hl)
                b['live'] = {'sha256': hl[:16], 'asal': info['asal'] if info else 'tak dikenal'}
                sama = hl == sha(os.path.join(akar, b['berkas']))
                print(f'{"PASS" if sama and b["lulus"] else "FAIL"}  live {b["berkas"]:28s} {hl[:12]} '
                      f'{b["live"]["asal"]}' + ('' if sama else '  ≠ berkas di disk'))
                if not sama or b['live']['asal'] != 'kita':
                    gagal += 1
        except Exception as e:  # noqa: BLE001
            print(f'WARN mode live dilewati: {e}')

    hasil['ringkas'] = {'gagal': gagal, 'total': len(hasil['berkas'])}
    if json_out:
        os.makedirs(os.path.dirname(json_out), exist_ok=True)
        json.dump(hasil, open(json_out, 'w'), ensure_ascii=False, indent=1)

    if tulis_larangan:
        peta = {b['sha256']: {'berkas': b['berkas'], 'alasan': 'salinan asli produksi'}
                for b in hasil['berkas'] if b['asal'] == 'asli'}
        os.makedirs(os.path.dirname(tulis_larangan), exist_ok=True)
        json.dump({'dibuat': 'gate-provenance.py', 'sha256': peta}, open(tulis_larangan, 'w'),
                  ensure_ascii=False, indent=1)
        print(f'\nlarangan ditulis: {tulis_larangan} ({len(peta)} sidik)')

    print(f'\nGERBANG E ASET: {len(hasil["berkas"]) - gagal}/{len(hasil["berkas"])} lulus'
          + (f' · {gagal} GAGAL' if gagal else ' · semua milik kita'))
    sys.exit(0 if gagal == 0 else 1)


if __name__ == '__main__':
    main()
