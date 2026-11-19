# PETA KESENJANGAN P15 — fase P0–P14 selesai; ini yang tersisa menuju "setara lalu lebih unggul"

Dokumen ini tidak mengubah `docs/RENCANA-EKSEKUSI.md` (arsip P0–P10) maupun menambah fase baru yang
mengarang-ngarang. Isinya: **apa yang benar-benar tersisa**, dengan angka yang sudah diukur, dan urutan
mengerjakannya.

## 1. Yang sudah tertutup (jangan dikerjakan lagi)

| hal | bukti |
|---|---|
| P0–P10 | ✅ `STATUS-ROADMAP.md` §1 |
| Aset milik sendiri (Gerbang E, syarat hukum rebranding) | **10/10 plate kita**, irisan hash dengan aset asli = **0** (`verification/p13/sidik-tabel.json`) |
| Repo MIRA selaras | `src/` **67/67 sama**, `tools/gate-paritas.js` v4, `gate-provenance.py` v5 (commit `44e5da6226`) |
| Produksi APEX = kode + aset kita | bundel `index-ffx1NC0u.js` `7daca178a692f337`; plate `apex-idle-v1.webp` = `9f7ee35b7a61462d` |
| Gerbang di produksi | a11y **16/16** · aset-layout **34/34** · provenance APEX **7/7 + 1/1** · MIRA **2/2** |

## 2. Sisa pekerjaan, urut prioritas

### R-1 · APEX desktop "terlalu penuh" — **DITUTUP sebagai sifat desain** (bukan regresi)

Diukur ulang pada build terbaru (`?t=9`, 1440×900):

| kondisi | cakupan | pita bawah 150 px |
|---|---|---|
| bawaan | 0,3919 | 0,2603 |
| tanpa backdrop (`__HUM_NO_BG`) | 0,1828 | **0,0787** |
| selisih karena backdrop | 0,2091 | 0,1816 |

Angka acuan 0,099 setara dengan kondisi **tanpa backdrop**, jadi kelebihan isi bingkai berasal dari **pendar
lantai backdrop** yang memang dipilih sebagai bagian karya kita — bukan cacat tata letak. Sesuai aturan
"knob tanpa diagnosis gugur", tidak ada perubahan yang dilakukan. Bukti: `verification/p15/r1-dekomposisi-desktop.json`.

Catatan kejujuran: acuan APEX asli **tidak terukur** di sandbox ini (WebGL-nya gagal, tangkapan 0,0021), jadi
perbandingan memakai angka acuan dari catatan lama, bukan pengukuran baru.

### R-3 · APEX 414×896 — **DITUTUP** (sekarang terukur)

| viewport | cakupan | pita atas | pita bawah |
|---|---|---|---|
| 1440×900 | 0,3778 | 0,0997 | 0,2304 |
| 390×844 | 0,3407 | 0,0884 | 0,5831 |
| **414×896** | **0,3389** | 0,0873 | 0,5819 |

Tidak ada lagi pengecualian alat. Ponsel memang lebih penuh di pita bawah (figur mengisi tinggi penuh),
konsisten dengan perilaku acuan yang juga ×1,25 lebih penuh di ponsel.
Bukti: `verification/p15/r3-414-terukur.json`.

### R-2 · MIRA ponsel vs desktop — angka lama **dibatalkan**

Angka lama "+30 % (0,264 vs 0,195)" tidak terulang. Pengukuran sekarang: 0,4874 (1440) · 0,5060 (414) ·
0,5088 (390) → selisih **+4,4 %**. Dicatat sebagai sifat desain.
Bukti: `verification/p15/r2-mira-ponsel-vs-desktop.json`.

### P-2 · MIRA: alur "produksi = repo" belum lengkap

Repo MIRA `main` (`44e5da6226`) belum memuat `vite.config.ts`, `tsconfig.json`, `vercel.json`, `index.html`,
`package.json` versi kita (11 berkas, termasuk `LICENSE`/`NOTICE`). Artinya **deploy MIRA tidak bisa
direproduksi dari repo** — persis masalah yang baru tertutup untuk APEX. Ini pekerjaan paket berikutnya.

### P-3 · Gerbang sebagai langkah CI

Keempat gerbang masih dijalankan manual. Yang diperlukan: satu perintah `tools/gerbang-semua.sh` yang
menjalankan provenance → aset-layout → a11y → paritas, menolak lulus bila ada yang < penuh, dan menulis
ringkasan JSON. Bukti produksi (provenance `--live`) dijadikan langkah terpisah sesudah deploy.

### P-4 · Kesiapan rebranding (baru boleh sesudah P-2/P-3)

Syarat Gerbang E sudah lulus (0 salinan asli). Yang belum: **lisensi akhir** diputuskan
(`docs/LISENSI-BRANDING.md` §"Putuskan lisensi akhir P15"), dan penggantian merek ke NIU/MIRAI **hanya setelah**
proyek terbukti setara atau lebih maju — sesuai keputusan Anda, branding tetap APEX & MIRA sampai itu terjadi.

## 3. Urutan kerja yang diusulkan

1. **P-2** (paket 6i): lengkapi repo MIRA supaya `npm ci && npm run build && vercel deploy` bisa dijalankan dari
   repo dan hasilnya `index-BiuEEVDg.js` `17fc09d82f4fd52c`.
2. **P-3**: `tools/gerbang-semua.sh` + ringkasan JSON; jalankan di dua repo.
3. **P-4**: keputusan lisensi + (bila Anda setuju) cut-over merek.
4. Cadangan: paritas piksel MIRA (2,72 MAE) — sudah ditutup sebagai plafon arsitektur, tidak dibuka lagi.
