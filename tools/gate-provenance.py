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
            if f.endswith('.sha256') or f.endswith('.md') or f.endswith('.json'):
                continue
            tabel[sha(os.path.join(d, f))] = {'asal': tag, 'contoh': f}
    # Cadangan: berkas asli tak ada di workspace; sidik penuh ada di p13/asli-sidik.json.
    for kandidat in (os.path.join(P13, 'asli-sidik.json'),
                     os.path.join(P13, '..', 'provenance.json')):
        if not os.path.isfile(kandidat):
            continue
        try:
            d = json.load(open(kandidat, encoding='utf-8'))
        except Exception:
            continue
        if 'sidik_asli' in d:
            for nama, h in d['sidik_asli'].items():
                if len(h) == 64:
                    tabel.setdefault(h, {'asal': 'asli', 'contoh': nama})
            break
        for b in d.get('baris', []):
            h = b.get('sha256_asli', '')
            if h and len(h) == 64:
                tabel.setdefault(h, {'asal': 'asli', 'contoh': b['berkas']})
    return tabel


def main():
    import fnmatch
    akar = arg('--akar', AKAR_BAWAAN)
    pola = arg('--pola', '*')          # mis. 'mira-*' untuk MIRA, 'apex-*' + backdrop untuk APEX
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

    # mode --live saja tidak memerlukan folder lokal: berkas diambil dari halaman.
    if not live and not os.path.isdir(akar):
        print(f'FATAL: {akar} tidak ada')
        sys.exit(2)

    hasil = {'gerbang': 'provenance aset', 'akar': akar, 'live': live,
             'syarat': {'min_byte': MIN_BYTE, 'larangan': len(larangan)}, 'berkas': []}
    # daftar berkas: dari folder lokal bila ada; kalau tidak (mode --live saja), dari tabel sidik.
    # Tanpa ini, mode live tanpa --akar memeriksa 0 berkas dan melaporkan "LULUS" — lulus palsu.
    if os.path.isdir(akar):
        nama_periksa = sorted(os.listdir(akar))
    else:
        nama_periksa = sorted({v['contoh'] for v in sidik.values()})
    nama_periksa = [f for f in nama_periksa if fnmatch.fnmatch(f, pola)]

    gagal = 0
    gagal_repo = 0
    for f in nama_periksa:
        p = os.path.join(akar, f)
        ada_lokal = os.path.isfile(p)
        if not ada_lokal and os.path.isdir(akar):
            continue
        ukuran = os.path.getsize(p) if ada_lokal else 0
        h = sha(p) if ada_lokal else None
        info = sidik.get(h) if h else None
        asal = info['asal'] if info else ('(tak ada berkas lokal)' if not ada_lokal else 'tak dikenal')
        alasan = []
        if asal == 'asli':
            alasan.append(f'salinan asli produksi (={info["contoh"]})')
        elif asal == 'tak dikenal':
            alasan.append('tidak ada di tabel sidik P13')
        if ada_lokal and ukuran < MIN_BYTE:
            alasan.append(f'placeholder {ukuran} B < {MIN_BYTE} B')
        if h in larangan:
            alasan.append(f'ada di daftar larangan ({larangan[h].get("alasan", "salinan asli")})')
        # mode live-saja (tanpa folder lokal): ketiadaan berkas lokal BUKAN kegagalan repo,
        # yang dinilai adalah apa yang disajikan halaman.
        mode_live_saja = bool(live) and not os.path.isdir(akar)
        if not ada_lokal and not mode_live_saja:
            alasan = ['berkas tidak ada di folder yang diperiksa']
        ok = not alasan
        if not ok:
            gagal += 1
            gagal_repo += 1
        hasil['berkas'].append({'berkas': f, 'sha256': (h[:16] if h else None), 'byte': ukuran,
                                'asal': asal, 'lulus': ok, 'alasan': alasan})
        print(f'{"PASS" if ok else "FAIL"}  {f:34s} {(h[:12] if h else "—"):12s} {ukuran:>8} B  {asal}'
              + ('' if ok else '  ← ' + '; '.join(alasan)))

    # mode live: buktikan yang DISAJIKAN juga milik kita — ini butir gerbang, bukan sekadar catatan
    live_ringkas = None
    gagal_live = 0
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
                asal_live = info['asal'] if info else 'tak dikenal'
                sama = (hl == hashlib.sha256(open(os.path.join(akar, b['berkas']), 'rb').read()).hexdigest()
                        if os.path.isfile(os.path.join(akar, b['berkas'])) else None)
                b['live'] = {'sha256': hl[:16], 'asal': asal_live, 'sama_dengan_disk': sama}
                # DUA hal berbeda, jangan dicampur:
                #   (a) produksi menyajikan aset MILIK KITA  → butir gerbang
                #   (b) isi produksi SAMA dengan berkas lokal → informasi pemutakhiran paket
                status = 'PASS' if asal_live == 'kita' else 'FAIL'
                if asal_live != 'kita':
                    gagal += 1
                    gagal_live += 1
                print(f'{status}  live {b["berkas"]:28s} {hl[:12]} {asal_live}'
                      + ('' if sama else '  (isi ≠ berkas lokal: repo belum memuat paket aset)'))
            live_ok = sum(1 for b in hasil['berkas'] if b.get('live', {}).get('asal') == 'kita')
            live_gagal = sum(1 for b in hasil['berkas'] if 'galat' in b.get('live', {}))
            live_ringkas = {'lulus': live_ok, 'total': len(hasil['berkas']), 'galat_unduh': live_gagal}
            # BUG yang ditemukan uji-gerbang G2: bila SEMUA unduhan gagal, dulu tetap "LULUS" karena
            # tidak ada satu pun yang dinilai gagal. Halaman tak terjangkau = bukti tidak sah → gagal.
            if live_gagal == len(hasil['berkas']) and len(hasil['berkas']) > 0:
                print('FATAL: semua unduhan gagal — bukti produksi tidak sah')
                gagal += 1
                gagal_live += 1
            hasil['live_ringkas'] = live_ringkas
        except Exception as e:  # noqa: BLE001
            print(f'WARN mode live dilewati: {e}')

    hasil['ringkas'] = {'gagal': gagal, 'total': len(hasil['berkas']),
                        'repo': {'lulus': sum(1 for b in hasil['berkas'] if b['lulus']),
                                 'total': len(hasil['berkas'])},
                        'produksi': live_ringkas}
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

    repo_lulus = hasil['ringkas']['repo']['lulus']
    total_berkas = len(hasil['berkas'])
    if total_berkas == 0:
        print('FATAL: 0 berkas diperiksa — bukan lulus')
        sys.exit(2)
    mode_live_saja = bool(live) and not os.path.isdir(akar)
    if not mode_live_saja:
        print(f'GERBANG E ASET — repo     : {repo_lulus}/{total_berkas} lulus')
    if live_ringkas:
        print(f'GERBANG E ASET — produksi : {live_ringkas["lulus"]}/{live_ringkas["total"]} lulus')
    print(f'PUTUSAN: ' + ('LULUS' if gagal == 0 else f'GAGAL (repo {gagal_repo} · produksi {gagal_live})'))
    sys.exit(0 if gagal == 0 else 1)


if __name__ == '__main__':
    main()
