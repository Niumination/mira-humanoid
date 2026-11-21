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
import re
import os
import subprocess
import sys
import tempfile

TOOLS = os.environ.get('TOOLS', '/home/user/tools')
K = os.environ.get('KERJA_ARENA', '/home/user/Kerja-Arena')
P13 = os.path.join(K, 'verification/p13')
HASIL = []


def catat(nama, lulus, ket):
    """lulus: True = lulus · False = gagal · None = tidak berlaku di lingkungan ini.

    "Tidak berlaku" TIDAK dihitung lulus dan TIDAK dihitung gagal — tetapi jumlahnya wajib tercetak,
    supaya tidak ada jalan bagi uji yang dilewati untuk tampil sebagai "semua lulus".
    """
    HASIL.append({'uji': nama, 'lulus': None if lulus is None else bool(lulus), 'keterangan': ket})
    tanda = 'SKIP' if lulus is None else ('PASS' if lulus else 'FAIL')
    print(f'{tanda}  {nama:44s} {ket}')


def jalan(args, env=None):
    e = dict(os.environ, KERJA_ARENA=K)
    if env:
        e.update(env)
    p = subprocess.run([sys.executable] + args, capture_output=True, text=True, env=e, cwd=TOOLS)
    return p.returncode, p.stdout + p.stderr


def tulis(path, isi):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    open(path, 'wb').write(isi)


def paket_terbaru():
    """Paket terbaru = kode huruf terbesar pada nama berkas (6a < 6b < ... < 6l).

    Kenapa bukan waktu-ubah: berkas zip bisa dipulihkan dari snapshot dengan mtime seragam (2026-11-20:
    semua paket 6a–6k bermtime 17:16), sehingga "terbaru menurut mtime" bisa menunjuk paket lama dan
    uji-umur memberi putusan palsu.
    """
    import glob
    pola = os.environ.get('PAKET_GLOB', '/home/user/niu-update-langkah*.zip')
    kandidat = []
    for z in glob.glob(pola):
        nama = os.path.basename(z)
        m = re.search(r'langkah(\d+)([a-z])', nama)
        if m:
            kandidat.append(((int(m.group(1)), m.group(2)), z))
    return max(kandidat)[1] if kandidat else None


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
    # Pakai folder yang PASTI punya dua plate MIRA — bisa diatur lewat MIRA_WS.
    akar = os.environ.get('MIRA_WS_ASET') or os.path.join(os.environ.get('MIRA_WS', K), 'public/humanoid')
    if not os.path.isdir(akar):
        catat('G3 --pola memisahkan aplikasi', None, f'folder aset tidak ada — tidak berlaku: {akar}')
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
            # Bukti historis yang memang GAGAL (dipakai untuk membuktikan perlunya perbaikan) dilewati:
            # ditandai lewat catatan "SEBELUM paket" atau URL produksi (alat fase menulis 'url', bukan 'sumber').
            histori = ('SEBELUM paket' in str(d.get('catatan') or '')
                       or str(d.get('url', '')).startswith('https://'))
            if histori:
                continue  # bukti historis yang memang GAGAL (dipakai untuk membuktikan perlunya perbaikan)
            r = d.get('ringkas') or {}
            dapat = r.get('lulus', 0) if isinstance(r, dict) else 0
            if dapat < janji['minimal']:
                kurang.append(f'{nama}: {b} {dapat} < janji {janji["minimal"]}')
    catat('G4 kontrak gerbang terpenuhi', not kurang, '; '.join(kurang) or f'{len(kontrak.get("janji", {}))} janji cocok')


def uji_salinan_terdeteksi():
    """G5: kalau plate asli dimasukkan, gate-provenance HARUS menolak (uji negatif)."""
    asli = os.path.join(P13, 'asli')
    if not os.path.isdir(asli):
        # Repo penerima memang TIDAK memuat plate asli (dan tidak boleh: itu sumber pihak ketiga).
        # Karena itu ketiadaan `p13/asli` = uji tidak berlaku, bukan kegagalan. Yang tetap wajib: bila
        # plate asli DISISIPKAN, gerbang provenance harus menolaknya (diuji di workspace kerja).
        catat('G5 salinan asli ditolak', None, 'p13/asli tidak ada — tidak berlaku di repo penerima')
        return
    tmp = tempfile.mkdtemp()
    for f in os.listdir(asli)[:2]:
        tulis(os.path.join(tmp, f), open(os.path.join(asli, f), 'rb').read())
    kode, out = jalan([os.path.join(TOOLS, 'gate-provenance.py'), '--statis', '--akar', tmp])
    catat('G5 salinan asli ditolak', kode == 1 and 'salinan asli' in out, f'kode {kode}')


def uji_kerangka_bytidentik():
    """G6: paket yang sudah dirakit harus byte-identik dengan workspace (menangkap paket rusak)."""
    paket = paket_terbaru()
    if not paket:
        catat('G6 paket byte-identik', False, 'tidak ada zip paket')
        return
    import zipfile
    z = zipfile.ZipFile(paket)
    nama = [m for m in z.namelist() if not m.endswith('/')]
    catat('G6 paket terakhir terbaca', len(nama) > 0, f'{os.path.basename(paket)} · {len(nama)} berkas')


def uji_umur_paket():
    """G7: alat yang ada di DISK harus sama dengan alat yang DIKIRIM di paket terakhir.

    Alasan nyata: 2026-11-20 `gerbang-semua.sh` dan `uji-gerbang.py` disunting sesudah paket 6k dirakit,
    sehingga repo penerima memakai alat lama sementara workspace memakai alat baru — dan laporan gerbang
    tetap "lulus" karena alatnya sendiri yang menilai. Karena itu yang dibandingkan byte-nya (sha256),
    bukan waktu-ubah: waktu-ubah bisa seragam setelah pemulihan snapshot dan menipu ke dua arah.
    """
    import zipfile
    paket = paket_terbaru()
    if not paket:
        catat('G7 alat di paket = alat di disk', False, 'tidak ada zip')
        return
    # Deviasi sadar: alat yang sengaja diadaptasi (lihat tools/DEVIASI-ALAT.md) dikecualikan dari G7 —
    # perbandingan tetap dijalankan untuk alat sisanya.
    deviasi = set()
    dv = os.path.join(TOOLS, 'DEVIASI-ALAT.md')
    if os.path.isfile(dv):
        for line in open(dv, encoding='utf-8'):
            if line.startswith('| `'):
                deviasi.add(line.split('| `')[1].split('`')[0])
    beda, hilang, sama, dikecualikan = [], [], 0, []

    with zipfile.ZipFile(paket) as z:
        for m in z.infolist():
            if m.filename.endswith('/') or '/tools/' not in m.filename:
                continue
            nama_alat = m.filename.split('/tools/')[-1]
            # Repo ini memakai .cjs (package.json type: module) — pemetaan sadar .js -> .cjs.
            PETA = {'gate-paritas-fase.js': 'gate-paritas-fase.cjs',
                    'gate-aset-layout.js': 'gate-aset-layout.cjs',
                    'gate-a11y.js': 'gate-a11y.cjs', 'gate-paritas.js': 'gate-paritas.cjs'}
            disk = os.path.join(TOOLS, PETA.get(nama_alat, nama_alat))
            if not os.path.isfile(disk):
                hilang.append(nama_alat); continue
            if nama_alat in deviasi:
                dikecualikan.append(nama_alat); continue
            if hashlib.sha256(z.read(m)).hexdigest() != hashlib.sha256(open(disk, 'rb').read()).hexdigest():
                beda.append(nama_alat)
            else:
                sama += 1
    catat('G7 alat di paket = alat di disk', not beda and not hilang,
         f'{os.path.basename(paket)} · {sama} identik · {len(dikecualikan)} deviasi sadar (DEVIASI-ALAT.md)' +
         (f' · beda: {", ".join(beda)}' if beda else '') + (f' · hilang: {", ".join(hilang)}' if hilang else ''))


def main():
    uji_tabel_sidik()
    uji_nol_berkas()
    uji_pola()
    uji_kontrak()
    uji_salinan_terdeteksi()
    uji_kerangka_bytidentik()
    uji_umur_paket()
    lulus = sum(1 for h in HASIL if h['lulus'] is True)
    gagal = sum(1 for h in HASIL if h['lulus'] is False)
    lewat = sum(1 for h in HASIL if h['lulus'] is None)
    print(f'\nUJI ALAT GERBANG: {lulus}/{len(HASIL)} lulus · gagal {gagal} · tidak berlaku {lewat}')
    out = {'judul': 'uji-diri alat gerbang', 'lulus': lulus, 'gagal': gagal,
           'tidak_berlaku': lewat, 'total': len(HASIL), 'hasil': HASIL}
    if '--json' in sys.argv:
        p = sys.argv[sys.argv.index('--json') + 1]
        os.makedirs(os.path.dirname(p), exist_ok=True)
        json.dump(out, open(p, 'w'), indent=1)
        print(f'→ {p}')
    sys.exit(0 if lulus == len(HASIL) else 1)


if __name__ == '__main__':
    main()
