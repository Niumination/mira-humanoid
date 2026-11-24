# TERAPAN — paket UPSTREAM-P14 (2026-11-24)

Paket `UPSTREAM-P14.zip` (24 berkas; MANIFEST 22/22 sha256 terverifikasi cocok).

## Diterapkan
- APEX (`/tmp/5z-repo` → apex-humanoid-rebuild + Niu-Humanoid): 10 plate P14 + 4 alat
  (gerbang-p14.py, p14-plate.py, ukur-plate.py, ukur_plate_lib.py) + docs/P14-ASET.md.
- MIRA (`/tmp/5z-mira`): 2 plate P14 + alat + docs (sinkron).
- scipy diinstal di server (`/usr/bin/python3`) untuk menjalankan gerbang.

## Verifikasi
- Gerbang P14: **10/10 LULUS** (APEX, rujukan `verification/p13/asli`) & **2/2 LULUS** (MIRA) —
  angka persis klaim paket (mae_sil 7,4–8,5; r_grad 0,76–0,94; luma 0,99–1,00).
- Build byte-identik: `index-DeDMCu_9.js` sha `873d3b54ea222267` (235 260 B) — kode runtime tak berubah ✅.
- **Produksi terverifikasi live**: niu-humanoid.vercel.app menyajikan 10/10 plate dengan hash P14 = MANIFEST;
  bundle tetap DeDMCu_9. mira-humanoid-niu.vercel.app: mira-idle `a49541b0`, mira-hair `6fb72215`; bundle tetap BiuEEVDg.
- Deploy via git-link otomatis (commit `f1e2475` Niu-Humanoid, `261784f` mira-humanoid).

## Catatan paket (jujur, diterima)
- Lisensi: plate = keluaran model parametrik, fit terhadap rujukan pada anggaran 78–88% piksel (pagar ≤90%).
  Keputusan lisensi tetap milik pemilik (proprietary sementara, sesuai keputusan 21 Nov).
- MIRA belum setara penuh: selisih rambut/tepi = perbedaan komposisi (rujukan 3 kanvas, build 2) — perbaikan
  kode di luar paket ini.
- Angka paket diukur di preview lokal; verifikasi produksi di sini baru level hash aset, bukan MAE layar.
