#!/usr/bin/env python3
"""
ukur-build.py — menyimpan satu build sebagai sampel riwayat APLIKASI (bukan workspace) + periksa anggaran.

Kenapa per aplikasi: workspace bisa dipulihkan/ditimpa ke keadaan upstream (dilakukan 2026-11-18 setelah
audit 5z), tetapi riwayat mutu aplikasi harus tetap utuh. Sampel lama tidak pernah ditimpa.

Pakai:
  python3 tools/ukur-build.py --aplikasi apex --dir /home/user/apex-humanoid-rebuild \
      [--sumber workspace|upstream|produksi] [--commit <sha>] [--tanpa-ukur]
  python3 tools/ukur-build.py --aplikasi apex --bandingkan   # Δ terhadap sampel sebelumnya

Hasil: verification/riwayat/<aplikasi>/<tgl>-<sha8>/{meta.json,ukur*.json} + indeks.json
Keluar: 0 = di dalam anggaran · 1 = melewati anggaran · 2 = gagal menyiapkan
"""
import datetime
import gzip
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time

K = os.environ.get('KERJA_ARENA', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RIWAYAT = f'{K}/verification/riwayat'
VIEWPORT = [('1440x900', 1440, 900), ('414x896', 414, 896), ('390x844', 390, 844)]
ANGGARAN = {
    'apex': {'gzip': 90_000, 'mentah': 280_000, 'berkas_js': 1, 'build_s': 60},
    'mira': {'gzip': 150_000, 'mentah': 620_000, 'berkas_js': 1, 'build_s': 60},
}


def arg(nama, bawaan=None):
    return sys.argv[sys.argv.index(nama) + 1] if nama in sys.argv else bawaan


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 16), b''):
            h.update(b)
    return h.hexdigest()


def baca_indeks(app):
    p = f'{RIWAYAT}/{app}/indeks.json'
    if os.path.isfile(p):
        return json.load(open(p))
    return {'aplikasi': app, 'sampel': []}


def tulis_indeks(app, idx):
    os.makedirs(f'{RIWAYAT}/{app}', exist_ok=True)
    json.dump(idx, open(f'{RIWAYAT}/{app}/indeks.json', 'w'), ensure_ascii=False, indent=1)


def kumpulkan(dir_app):
    d = os.path.join(dir_app, 'dist', 'assets')
    if not os.path.isdir(d):
        return None
    js = sorted(f for f in os.listdir(d) if f.endswith('.js'))
    css = sorted(f for f in os.listdir(d) if f.endswith('.css'))
    if not js:
        return None
    utama = [f for f in js if f.startswith('index-')] or js
    f = os.path.join(d, utama[0])
    mentah = os.path.getsize(f)
    gzip_byte = len(gzip.compress(open(f, 'rb').read(), 9))
    return {'aset': utama[0], 'sha256': sha(f), 'mentah': mentah, 'gzip': gzip_byte,
            'berkas_js': len(js), 'css': css[0] if css else None,
            'css_mentah': os.path.getsize(os.path.join(d, css[0])) if css else 0}


def main():
    app = arg('--aplikasi')
    dir_app = arg('--dir')
    sumber = arg('--sumber', 'workspace')
    commit = arg('--commit')
    if not app or app not in ANGGARAN:
        print('pakai: --aplikasi apex|mira'); sys.exit(2)

    if '--bandingkan' in sys.argv:
        idx = baca_indeks(app)
        if len(idx['sampel']) < 2:
            print(f'{app}: butuh ≥ 2 sampel untuk membandingkan (ada {len(idx["sampel"])})'); sys.exit(0)
        a, b = idx['sampel'][1], idx['sampel'][0]
        print(f'{app}: {a["sha8"]} ({a["tanggal"]}) → {b["sha8"]} ({b["tanggal"]})')
        for k in ['mentah', 'gzip', 'berkas_js']:
            if a.get(k) is not None and b.get(k) is not None:
                print(f'  {k:10s} {a[k]:>9} → {b[k]:>9}  Δ {b[k] - a[k]:+}')
        return

    if not dir_app or not os.path.isdir(dir_app):
        print('--dir tidak ada'); sys.exit(2)
    aset = kumpulkan(dir_app)
    if not aset:
        print(f'{dir_app}/dist/assets tidak ada — build dulu'); sys.exit(2)

    sha8 = aset['sha256'][:8]
    tgl = datetime.date.today().isoformat()
    nama = f'{tgl}-{sha8}'
    tujuan = f'{RIWAYAT}/{app}/{nama}'
    idx = baca_indeks(app)
    sudah = next((s for s in idx['sampel'] if s['sha8'] == sha8), None)

    meta = {
        'aplikasi': app, 'tanggal': tgl, 'sha8': sha8, 'sha256': aset['sha256'],
        'aset': aset['aset'], 'mentah': aset['mentah'], 'gzip': aset['gzip'],
        'berkas_js': aset['berkas_js'], 'css': aset['css'], 'css_mentah': aset['css_mentah'],
        'sumber': sumber, 'commit': commit,
        'dir': dir_app,
        'provenance': None,
    }
    # provenance plate (jumlah milik kita / asli / tak dikenal)
    try:
        r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gate-provenance.py'),
                            '--akar', os.path.join(dir_app, 'public', 'humanoid')],
                           capture_output=True, text=True)
        for b in r.stdout.splitlines():
            if b.startswith('GERBANG E'):
                meta['provenance'] = b.strip()
    except Exception:  # noqa: BLE001
        pass

    # anggaran
    angg = ANGGARAN[app]
    lewat = {k: {'nilai': meta[k], 'batas': angg[k]} for k in ('gzip', 'mentah', 'berkas_js')
             if meta[k] > angg[k]}
    meta['anggaran'] = {'batas': angg, 'lewat': lewat, 'lulus': not lewat}

    os.makedirs(tujuan, exist_ok=True)
    json.dump(meta, open(f'{tujuan}/meta.json', 'w'), ensure_ascii=False, indent=1)

    # metrik render (opsional: butuh Chromium + preview hidup)
    if '--tanpa-ukur' not in sys.argv:
        url = arg('--url')
        if url:
            r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ukur-viewport.py'), url, app,
                                '--json', f'{tujuan}/ukur.json'], capture_output=True, text=True,
                               env=dict(os.environ, PW=os.environ.get('PW', '/tmp/gates/pw-shim.cjs')))
            print('  ' + (r.stdout.strip() or r.stderr.strip()[-200:] or 'ukur: tanpa keluaran'))
        else:
            print('  (metrik render dilewati: tanpa --url)')

    if sudah is None:
        idx['sampel'].insert(0, {k: meta[k] for k in
                                ('tanggal', 'sha8', 'aset', 'mentah', 'gzip', 'berkas_js', 'sumber', 'commit')})
    else:
        sudah.update({'tanggal': sudah['tanggal'], 'sumber': sumber, 'commit': commit})
    tulis_indeks(app, idx)

    print(f'{app} · {nama} · {aset["aset"]} {sha8} · {aset["mentah"]} B · gzip {aset["gzip"]} B')
    print(f'  provenance: {meta["provenance"] or "—"}')
    if lewat:
        for k, v in lewat.items():
            print(f'  LEWAT ANGGARAN {k}: {v["nilai"]} > {v["batas"]}')
        sys.exit(1)
    print('  anggaran: di dalam batas')
    sys.exit(0)


if __name__ == '__main__':
    main()
