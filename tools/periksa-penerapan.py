#!/usr/bin/env python3
"""
periksa-penerapan.py — menguji klaim "semua paket sudah diterapkan" TANPA percaya pada klaim itu.

Empat lapis, semuanya berangka:

  L1 SALINAN     : berkas tiap paket (5s…5y) di upstream vs workspace — byte-identik?
  L2 PROVENANCE  : setiap plate di repo upstream: sha256 milik SIAPA (asli produksi / karya kita / tak dikenal).
                   Ini lapis yang menangkap "berkas terkirim tetapi tidak diterapkan".
  L3 BUILD       : `npm ci` + build bersih dari tarikan upstream → sha256 aset JS.
                   Dibandingkan dengan: (a) workspace, (b) URL produksi.
  L4 PULIH       : daftar berkas yang harus dipulihkan di workspace agar workspace == upstream,
                   supaya verifikasi berikutnya tidak memakai acuan yang sudah usang.

Pakai:
  python3 tools/periksa-penerapan.py --apex /path/tarikan/apex --mira /path/tarikan/mira \
      [--produksi] [--json keluar.json]

`--produksi` mengambil HTML produksi untuk membandingkan nama+hash aset (lapis L3b).
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.request

K = os.environ.get('KERJA_ARENA', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P13 = f'{K}/verification/p13'
SPK = f'{K}/paket/spec'
URL = {'APEX': 'https://niu-humanoid.vercel.app', 'MIRA': 'https://mira-humanoid-niu.vercel.app'}


def arg(nama, bawaan=None):
    return sys.argv[sys.argv.index(nama) + 1] if nama in sys.argv else bawaan


def sha(path):
    if not os.path.isfile(path):
        return None
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 16), b''):
            h.update(b)
    return h.hexdigest()


def peta_provenance():
    """sha256 → 'asli' | 'kita' | 'placeholder' untuk semua artefak P13."""
    tabel = {}
    for sub, tag in [('asli', 'asli'), ('baru', 'kita')]:
        d = os.path.join(P13, sub)
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            tabel[sha(os.path.join(d, f))] = tag
    # placeholder 79 byte yang pernah menggantikan mira-idle-v1
    tabel[hashlib.sha256(b'\x00' * 79).hexdigest()] = 'placeholder?'
    return tabel


def build(dir_repo):
    """npm ci + build; kembalikan (nama_aset, sha256, ukuran) atau (None, None, None)."""
    paket = os.path.join(dir_repo, 'package.json')
    if not os.path.isfile(paket):
        return None, None, None
    subprocess.run(['npm', 'ci', '--no-audit', '--no-fund'], cwd=dir_repo,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    r = subprocess.run(['npm', 'run', 'build'], cwd=dir_repo,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if r.returncode != 0:
        return 'BUILD-GAGAL', None, None
    d = os.path.join(dir_repo, 'dist', 'assets')
    if not os.path.isdir(d):
        return None, None, None
    js = [f for f in os.listdir(d) if f.startswith('index-') and f.endswith('.js')]
    if not js:
        return None, None, None
    f = os.path.join(d, js[0])
    return js[0], sha(f), os.path.getsize(f)


def analisis_bundle(data, penanda):
    """Cari penanda khas perubahan di dalam bundel produksi (bukti yang dipakai browser)."""
    return {label: (tanda.encode() in data) for label, tanda in penanda.items()}


def aset_produksi(url):
    try:
        html = urllib.request.urlopen(url + '/', timeout=40).read().decode('utf-8', 'replace')
    except Exception as e:  # noqa: BLE001
        return None, None, f'gagal unduh: {e}'
    import re
    m = re.search(r'index-[A-Za-z0-9_-]+\.js', html)
    if not m:
        return None, None, 'tidak ada rujukan index-*.js'
    nama = m.group(0)
    try:
        b = urllib.request.urlopen(f'{url}/assets/{nama}', timeout=60).read()
    except Exception as e:  # noqa: BLE001
        return nama, None, f'gagal unduh aset: {e}'
    return nama, hashlib.sha256(b).hexdigest(), None


def main():
    apex = arg('--apex')
    mira = arg('--mira')
    if not apex or not mira:
        print('pakai: --apex DIR --mira DIR'); sys.exit(2)
    prov = peta_provenance()
    keluar = {'waktu': None, 'aplikasi': {}, 'pulihkan': []}

    import datetime
    keluar['waktu'] = datetime.datetime.utcnow().isoformat() + 'Z'

    for nama, repo, ws in [('APEX', apex, os.environ.get('APEX_WS', '/home/user/apex-humanoid-rebuild')),
                           ('MIRA', mira, os.environ.get('MIRA_WS', '/home/user/mira-humanoid-rebuild'))]:
        a = {'repo': repo, 'workspace': ws, 'plate': [], 'berkas_paket': [], 'build': {},
             'produksi': {}, 'lulus': 0, 'total': 0}

        # ---------- L1: berkas paket yang seharusnya ada di repo
        for k in ['5v', '5w', '5x', '5y']:
            sp_path = f'{SPK}/spec-{k}.json'
            if not os.path.isfile(sp_path):
                continue
            sp = json.load(open(sp_path))
            for src, dst in sp['berkas']:
                if dst.startswith('niu-humanoid/'):
                    if nama != 'APEX':
                        continue
                    tujuan = os.path.join(repo, dst[len('niu-humanoid/'):])
                elif dst.startswith('mira-humanoid/'):
                    if nama != 'MIRA':
                        continue
                    tujuan = os.path.join(repo, dst[len('mira-humanoid/'):])
                else:
                    tujuan = os.path.join(repo, dst)
                    if not os.path.isfile(tujuan):
                        alt = os.path.join(repo, dst)
                        if not os.path.isfile(alt):
                            continue
                hs, hu = sha(src), sha(tujuan)
                a['total'] += 1
                if hs and hs == hu:
                    a['lulus'] += 1
                a['berkas_paket'].append({'paket': k, 'berkas': dst,
                                          'workspace': (hs or '')[:12], 'repo': (hu or '')[:12],
                                          'status': 'SAMA' if hs == hu else ('HILANG' if hu is None else 'BEDA')})

        # ---------- L2: provenance plate
        pub = os.path.join(repo, 'public', 'humanoid')
        if os.path.isdir(pub):
            for f in sorted(os.listdir(pub)):
                hp = sha(os.path.join(pub, f))
                asal = prov.get(hp, 'tak dikenal')
                hw = sha(os.path.join(ws, 'public', 'humanoid', f))
                a['plate'].append({'berkas': f, 'sha256': (hp or '')[:12], 'asal': asal,
                                   'workspace': (hw or '')[:12]})
                a['total'] += 1
                if asal == 'kita':
                    a['lulus'] += 1
                else:
                    keluar['pulihkan'].append({'aplikasi': nama, 'berkas': f,
                                               'dari_repo': hp, 'asal': asal})

        # ---------- L2b: PRODUKSI tanpa perlu build (bukti yang benar-benar dijalankan browser)
        # Penanda khas tiap paket yang menyentuh src/. Kalau produksi memuatnya, paket itu SUDAH aktif
        # di produksi — walau repo belum (kasus APEX 5z-6c: dikirim 2026-11-18, repo belum).
        PENANDA = {
            'judul sr-only (5x)': 'sr-only',
            'bar debug maxWidth (5x)': 'calc(100vw - 16px)',
            'reduced-motion (5x)': 'data-reduced-motion',
        }
        # ---------- L3: build bersih dari tarikan upstream
        nm, hs, ukuran = build(repo)
        hw = None
        if os.path.isdir(os.path.join(ws, 'dist', 'assets')):
            for f in os.listdir(os.path.join(ws, 'dist', 'assets')):
                if f.startswith('index-') and f.endswith('.js'):
                    hw = sha(os.path.join(ws, 'dist', 'assets', f))
        a['build'] = {'aset': nm, 'sha256': (hs or '')[:16], 'ukuran': ukuran,
                      'workspace': (hw or '')[:16], 'sama_dengan_workspace': hs == hw}
        a['total'] += 1
        if hs and hs == hw:
            a['lulus'] += 1

        # ---------- L3b: produksi (nama+hash+penanda), tidak butuh build
        if '--produksi' in sys.argv:
            pn, ph, err = aset_produksi(URL[nama])
            if pn:
                try:
                    data = urllib.request.urlopen(f'{URL[nama]}/assets/{pn}', timeout=60).read()
                    a['produksi_penanda'] = analisis_bundle(data, PENANDA)
                except Exception as e:  # noqa: BLE001
                    a['produksi_penanda'] = {'galat': str(e)}
            a['produksi'] = {'aset': pn, 'sha256': (ph or '')[:16], 'galat': err,
                             'sama_dengan_build': ph == hs}
        keluar['aplikasi'][nama] = a

    if '--json' in sys.argv:
        out = arg('--json')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        json.dump(keluar, open(out, 'w'), ensure_ascii=False, indent=1)

    # ---------- laporan
    for nama, a in keluar['aplikasi'].items():
        print(f'### {nama} — {a["lulus"]}/{a["total"]} butir lulus')
        beda = [x for x in a['berkas_paket'] if x['status'] != 'SAMA']
        print(f'  L1 berkas paket : {len(a["berkas_paket"]) - len(beda)}/{len(a["berkas_paket"])} identik')
        for x in beda[:12]:
            print(f'      {x["status"]:6s} {x["berkas"]}  ws {x["workspace"] or "—"} · repo {x["repo"] or "—"}')
        salinan = [p for p in a['plate'] if p['asal'] != 'kita']
        print(f'  L2 plate        : {len(a["plate"]) - len(salinan)}/{len(a["plate"])} milik kita'
              + (f' · {len(salinan)} masih salinan asli/tak dikenal' if salinan else ''))
        for p in salinan:
            print(f'      {p["asal"]:12s} {p["berkas"]} ({p["sha256"]})')
        b = a['build']
        print(f'  L3 build repo   : {b["aset"]} {b["sha256"]} · workspace {b["workspace"]}'
              f' → {"SAMA" if b["sama_dengan_workspace"] else "BEDA"}')
        if a['produksi']:
            p = a['produksi']
            print(f'  L3b produksi    : {p["aset"]} {p["sha256"]}' +
                  (' → SAMA dengan build repo' if p['sama_dengan_build'] else ' → BEDA dari build repo'))
        for label, ada in (a.get('produksi_penanda') or {}).items():
            print(f'      penanda produksi: {label} = {ada}')
    if keluar['pulihkan']:
        print('\n### Perlu dipulihkan di workspace (workspace ≠ upstream)')
        for p in keluar['pulihkan']:
            print(f'  {p["aplikasi"]:5s} public/humanoid/{p["berkas"]} ← {p["dari_repo"][:12]} ({p["asal"]})')


if __name__ == '__main__':
    main()
