# BACA-DULU-6k — MIRA: paritas fase, uji alat gerbang, gerbang 8/8

tanggal: 2026-11-19 · pasangan dari 6j (APEX)

## 1. Audit lebih dulu

| yang diperiksa | hasil |
|---|---|
| `mira-humanoid@9059b57e48` kode `src/` | **67/67 sama** dengan workspace → tidak ada perubahan kode |
| konfigurasi deploy (`vite.config.ts` dkk) | **ada** (hasil paket 6i) ✔ |
| `tools/gate-paritas.js` | **v4 portabel** (`KAL_DIR`, `PY`) — versi repo, sudah disalin ke workspace |
| `tools/gerbang-semua.sh` | versi repo (path dari lokasi skrip) — **lebih portabel**; dipakai sebagai dasar |
| `verification/p13/asli-sidik.json` | benar ✔ |
| `package-lock.json` | beda dari repo (salinan kerja) — **tidak** dikirim (bukan sumber, hanya artefak `npm ci`) |

## 2. Yang dibawa paket ini

* `tools/gate-paritas-fase.js` (**baru**) — paritas di banyak titik waktu, sadar-fase.
* `tools/uji-gerbang.py` (**baru**) — 6 uji untuk alat gerbang, termasuk uji negatif (plate asli harus ditolak).
* `tools/gerbang-semua.sh` — versi rekonsiliasi: 8 butir, `APEX`/`MIRA` di-`export`, tanpa `|| true` yang
  menelan kegagalan, folder aset menunjuk repo kerja.
* `tools/gate-provenance.py` — bug keempat diperbaiki: **semua unduhan gagal = GAGAL** (dulu LULUS).
* `tools/gate-paritas.js` — versi portabel.
* Bukti: `verification/gerbang/{kontrak,uji-gerbang-2026-11-19,ringkas-2026-11-19-lokal}.json`,
  `verification/p15/paritas-fase-{mira,apex}-2026-11-19.json`.
* Dokumen: `docs/p14/AUDIT-PENERAPAN-3.md`, `docs/PETA-KESENJANGAN-P15.md`.

## 3. Hasil gerbang MIRA 2026-11-19

| butir | hasil |
|---|---|
| paritas fase (t = 4, 8, 11.5, 12.5, 13.5) | **4/4** · MAE diri 0,00 / 0,00 / 2,80 / 2,90 / 2,97 · cakupan 0,1907 · 0,9003 · 0,4803 · 0,4794 · 0,4789 |
| provenance repo & produksi | 2/2 · 2/2 |
| aset-layout · a11y · paritas | 34/34 · 16/16 · 24/24 |
| gerbang satu perintah | **8/8 LULUS** |

Catatan jujur: cakupan `?t=8` = **0,90** bukan kegagalan — itu fase kelahiran MIRA (siluet besar + cahaya
belakang); bingkainya diperiksa manual. Ambang 0,70 hanya berlaku untuk keadaan mantap, dan gerbang sekarang
membedakan keduanya (sebelumnya salah menuduh).

## 4. Uji terapkan

Salinan `mira-humanoid@9059b57e48` + isi paket → `npm ci` → `tsc -b` → `vite build` harus lulus dan tetap
menghasilkan `index-BiuEEVDg.js` `17fc09d82f4fd52c` (kode MIRA tidak diubah).
