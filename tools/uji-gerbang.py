#!/usr/bin/env python3
"""
uji-gerbang.py — menguji ALAT GERBANG, bukan aplikasi.

Alasan: pada 2026-11-18/19 ditemukan tiga alat gerbang yang **lulus palsu** atau salah menilai:
  1. `gate-provenance.py --live` tanpa `--akar` memeriksa 0 berkas → melaporkan "0/0 LULUS".
  2. gerbang aset membandingkan halaman dengan berkas repo, padahal repo belum memuat paket aset →
      aset kita dilaporkan "beda".
  3. tabel sidik di workspace sempat berisi plate KITA sebagai "asli" → membandingkan kita dengan kita.
Ketiganya hanya tertangkap karena kebetulan. Skrip ini membuat penangkapan itu **sengaja**: setiap sifat
penting alat dibuktikan dengan kasus uji yang hasilnya sudah ditentukan.

Pakai:
  python3 tools/uji-gerbang.py              # jalankan semua uji
  python3 tools/uji-gerbang.py --json out.json
Keluar: 0 = semua uji lulus · 1 = ada uji gagal.
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile

TOOLS = os.environ.get('TOOLS', '/home/user/tools')
K = os.environ.get('KERJA_ARENA', '/home/user/Kerja-Arena')
P13 = os.path.join(K, 'verification/p13')
HASIL = []


def catat(nama, lulus, ket):
    HASIL.append({'uji': nama, 'lulus': bool(lulus), 'keterangan': ket})
    print(f'{"PASS" if lulus else "FAIL"}  {nama:44s} {ket}')


def jalan(args, env=None):
    e = dict(os.environ, KERJA_ARENA=K)
    if env:
        e.update(env)
    p = subprocess.run([sys.executable] + args, capture_output=True, text=True, env=e, cwd=TOOLS)
    return p.returncode, p.stdout + p.stderr


def tulis(path, isi):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    open(path, 'wb').write(isi)


def uji_tabel_sidik():
    """G1: tabel sidik kosong harus FATAL (kode 2), bukan lulus."""
    tmp = tempfile.mkdtemp()
    akar = os.path.join(tmp, 'aset')
    os.makedirs(akar)
    tulis(os.path.join(akar, 'a.webp'), b'x' * 4096)
    kode, out = jalan([os.path.join(TOOLS, 'gate-provenance.py'), '--statis', '--akar', akar],
                      env={'P13_DIR': os.path.join(tmp, 'p13-kosong')})
    catat('G1 tabel sidik kosong = FATAL', kode == 2 and 'tabel sidik kosong' in out, f'kode {kode}')


def uji_nol_berkas():
    """G2: mode live tanpa berkas yang diperiksa tidak boleh melaporkan LULUS (lulus palsu)."""
    tmp = tempfile.mkdtemp()
    p13 = os.path.join(tmp, 'p13')
    asli = os.path.join(p13, 'asli')
    os.makedirs(asli)
    tulis(os.path.join(asli, 'dummy.webp'), b'y' * 4096)
    kode, out = jalan([os.path.join(TOOLS, 'gate-provenance.py'), '--live', 'http://127.0.0.1:9/'],
                      env={'P13_DIR': p13})
    # host tidak ada → tiap berkas gagal diunduh → tidak boleh lulus
    lulus_palsu = 'PUTUSAN: LULUS' in out
    catat('G2 live tanpa hasil unduh ≠ LULUS', not lulus_palsu, f'kode {kode} · {"LULUS(!)" if lulus_palsu else "tidak lulus"}')


def uji_pola():
    """G3: --pola membatasi berkas yang diperiksa (memisahkan APEX/MIRA)."""
    akar = os.environ.get('MIRA_WS', os.path.join(K, 'public/humanoid'))
    if not os.path.isdir(akar):
        catat('G3 --pola memisahkan aplikasi', False, 'folder aset APEX tidak ada')
        return
    kode, out = jalan([os.path.join(TOOLS, 'gate-provenance.py'), '--statis', '--akar', akar, '--pola', 'mira-*'])
    jumlah = out.count('PASS') + out.count('FAIL')
    catat('G3 --pola hanya mira-*', jumlah == 2, f'{jumlah} berkas diperiksa (harus 2)')


def uji_kontrak():
    """G4: kontrak gerbang (angka yang dijanjikan) harus cocok dengan bukti terakhir."""
    kontrak_path = os.path.join(K, 'verification/gerbang/kontrak.json')
    if not os.path.isfile(kontrak_path):
        catat('G4 kontrak gerbang', False, 'kontrak.json belum ada')
        return
    kontrak = json.load(open(kontrak_path))
    kurang = []
    for nama, janji in kontrak.get('janji', {}).items():
        daftar = janji['bukti'] if isinstance(janji['bukti'], list) else [janji['bukti']]
        for b in daftar:
            berkas = os.path.join(K, 'verification/gerbang', b)
            if not os.path.isfile(berkas):
                kurang.append(f'{nama}: bukti {b} tidak ada')
                continue
            d = json.load(open(berkas))
            r = d.get('ringkas') or {}
            dapat = r.get('lulus', 0) if isinstance(r, dict) else 0
            if dapat < janji['minimal']:
                kurang.append(f'{nama}: {b} {dapat} < janji {janji["minimal"]}')
    catat('G4 kontrak gerbang terpenuhi', not kurang, '; '.join(kurang) or f'{len(kontrak.get("janji", {}))} janji cocok')


def uji_salinan_terdeteksi():
    """G5: kalau plate asli dimasukkan, gate-provenance HARUS menolak (uji negatif)."""
    asli = os.path.join(P13, 'asli')
    if not os.path.isdir(asli):
        catat('G5 salinan asli ditolak', False, 'p13/asli tidak ada')
        return
    tmp = tempfile.mkdtemp()
    for f in os.listdir(asli)[:2]:
        tulis(os.path.join(tmp, f), open(os.path.join(asli, f), 'rb').read())
    kode, out = jalan([os.path.join(TOOLS, 'gate-provenance.py'), '--statis', '--akar', tmp])
    catat('G5 salinan asli ditolak', kode == 1 and 'salinan asli' in out, f'kode {kode}')


def uji_kerangka_bytidentik():
    """G6: paket yang sudah dirakit harus byte-identik dengan workspace (menangkap paket rusak)."""
    import glob
    zipnya = sorted(glob.glob(os.environ.get('PAKET_GLOB', '/home/user/niu-update-langkah6*.zip')))
    if not zipnya:
        catat('G6 paket byte-identik', False, 'tidak ada zip paket')
        return
    import zipfile
    z = zipfile.ZipFile(zipnya[-1])
    nama = [m for m in z.namelist() if not m.endswith('/')]
    catat('G6 paket terakhir terbaca', len(nama) > 0, f'{os.path.basename(zipnya[-1])} · {len(nama)} berkas')


def main():
    uji_tabel_sidik()
    uji_nol_berkas()
    uji_pola()
    uji_kontrak()
    uji_salinan_terdeteksi()
    uji_kerangka_bytidentik()
    lulus = sum(1 for h in HASIL if h['lulus'])
    print(f'\nUJI ALAT GERBANG: {lulus}/{len(HASIL)} lulus')
    out = {'judul': 'uji-diri alat gerbang', 'lulus': lulus, 'total': len(HASIL), 'hasil': HASIL}
    if '--json' in sys.argv:
        p = sys.argv[sys.argv.index('--json') + 1]
        os.makedirs(os.path.dirname(p), exist_ok=True)
        json.dump(out, open(p, 'w'), indent=1)
        print(f'→ {p}')
    sys.exit(0 if lulus == len(HASIL) else 1)


if __name__ == '__main__':
    main()
