# BACA-DULU-6h — MIRA: alat v4, tabel sidik yang benar, bukti produksi

tanggal: 2026-11-18 · pasangan dari 6g (APEX)

## 1. Audit MIRA lebih dulu (angka)

| yang diperiksa | keadaan |
|---|---|
| kode `src/` MIRA repo vs lokal | **67 berkas sama · 0 beda** → kode MIRA memang sudah selaras |
| plate MIRA di repo | 2/2 milik kita (`8409aa77647ed8d5`, `6c5e6791e3a5b9db`) → benar |
| `tools/gate-paritas.js` | repo **v2** 8 360 B (173 baris) · lokal **v4** 11 976 B (232 baris) |
| `tools/gate-provenance.py` | repo 8 231 B (versi 6d) · lokal **v5** (ada `--pola`, 0 berkas = FATAL) |
| `tools/periksa-penerapan.py` | repo 10 444 B · lokal 10 309 B (keduanya ada, isi beda tipis) |
| `verification/p13/asli-sidik.json` | **SALAH**: 8 dari 10 baris berisi hash plate KITA, bukan aset asli |
| `public/humanoid/apex-*.webp` | **tidak ada** (benar — MIRA hanya butuh `mira-*`) |

## 2. Kenapa `asli-sidik.json` harus diganti

Berkas itu dipakai `gate-provenance.py` sebagai *cadangan* tabel sidik. Isi yang sekarang menyebut
`apex-idle-v1.webp = 907c6623…` sebagai "asli", padahal itu **plate kita**; aslinya `ba1a6d93…` (menurut
`public/humanoid` repo APEX `49e011dd15`). Akibatnya alat bisa melaporkan plate kita sebagai salinan asli.
Versi di paket ini: 10 sha256 penuh, asli = repo APEX 5y.

## 3. Isi paket (13 berkas)

* `package.json` (lisensi `SEE LICENSE IN LICENSE`)
* `tools/`: `gate-paritas.js` **v4** · `gate-provenance.py` **v5** · `periksa-penerapan.py` ·
  `ukur-viewport.py` · `ukur-build.py`
* `verification/p13/`: `asli-sidik.json` (benar) + `sidik-tabel.json` (asli vs kita)
* `verification/p14/`: `gp-mira-live.json` (provenance produksi **2/2**) · `gp-apex-repo.json` (**0/7**, untuk
  arsip bahwa APEX repo masih asli sebelum 6g) · `gate-paritas-2026-11-18c.json` (24/24)
* `docs/p14/`: `AUDIT-PENERAPAN-3.md`, `TEMUAN-P15.md`

## 4. Uji terapkan

Salinan `mira-humanoid@main` + isi paket → `tsc -b` → `vite build`: hasilnya harus tetap
`index-BiuEEVDg.js` `17fc09d82f4fd52c` (kode MIRA tidak diubah oleh paket ini; hanya alat/tabel/dokumen).

## 5. Sesudah menerapkan

```bash
python3 tools/gate-provenance.py --statis --akar public/humanoid      # MIRA: 2/2 lulus
python3 tools/gate-provenance.py --live https://mira-humanoid-niu.vercel.app/ --pola 'mira-*'   # 2/2
node tools/gate-paritas.js --json verification/p14/gate-paritas-*.json
```
