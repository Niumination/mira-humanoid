# TEMUAN P15 — mengapa paket kecil berulang kali berhenti di "sebagian"

## 1. Ringkas

| putusan | angka |
|---|---|
| Klaim "paket 6d sudah diterapkan (APEX)" | **SALAH**: paket 5z–6d masuk APEX **1/41 berkas** |
| APEX menerima 6d | **0/4 berkas `src/`**; `docs/p14/JANGKAR-WAKTU.md` & `GERBANG-PRODUKSI.md` juga tidak ada |
| MIRA menerima 6d | 5/14 (`JANGKAR-WAKTU.md`, `GERBANG-PRODUKSI.md`, `gate-paritas-2026-11-18c.json`, `gate-a11y-2026-11-18b.json`, `AUDIT-PENERAPAN-2.md`) |
| Akar masalah paket kecil | `paket/spec/spec-*.json` mengirim **berkas yang berubah**, bukan **delta repo** |

## 2. Akar masalah yang sebenarnya (dan ini kesalahan saya)

Sejak paket 5z saya merakit paket dari *berkas yang baru saya sentuh*. Untuk MIRA itu bekerja (repo MIRA memang
sudah memuat pekerjaan kita). Untuk **APEX tidak**, karena repo APEX masih di commit `49e011dd15` (5y) dan
**belum pernah** menerima 5z–6d. Akibatnya tiap paket hanya mengirim "kulit" perubahan baru, sementara
`src/` APEX masih versi P11 — dan selisihnya **tidak pernah** tertutup.

Bukti angka (APEX lokal vs `Niu-Humanoid-main`):

| | berkas |
|---|---|
| beda isi | **9** (7 di `src/`, `package.json`, `tsconfig.tsbuildinfo`) |
| hanya di lokal | **1** (`src/lib/a11y.ts`) |
| hanya di repo | 1 256 (docs/verification historis, 318 MB — **tidak** perlu diselaraskan) |

## 3. Temuan keras: paket 6d MEMATIKAN build APEX

`src/main.tsx` versi 6d mengimpor `./lib/a11y`, tetapi `src/lib/a11y.ts` **tidak ada di repo APEX**. Diuji pada
salinan repo + isi paket 6d:

```
src/main.tsx(4,37): error TS2307: Cannot find module './lib/a11y'
[vite] Rollup failed to resolve import './lib/a11y' from src/main.tsx → BUILD GAGAL
```

Setelah `src/lib/a11y.ts` ditambahkan: `tsc` bersih, `vite build` **sukses** (`index-B6FCaXg2.js`, 227,51 kB).

> Ini pelajaran proses: paket **wajib diuji "terapkan ke salinan repo lalu build"** sebelum dikirim. Saya belum
> pernah melakukannya sampai ronde ini — dan justru di situ kesalahannya tertangkap.

## 4. Mengapa `periksa-penerapan` selama ini melaporkan APEX 41/54, bukan 13/54

Alat itu memeriksa **penanda** (`sr-only`, `calc(100vw - 16px)`, …) yang sebagian sudah ada di repo APEX sejak
5x/P11. Penanda lulus ≠ berkas sama. Ukuran yang benar untuk "paket diterapkan" adalah **sha256 berkas paket
vs berkas repo**, dan itu yang sekarang dipakai (tabel di `paket/BACA-DULU-6e.md`).

## 5. Aturan baru yang berlaku sejak paket 6e

1. Setiap paket **besar** (delta repo penuh), bukan tambalan berkas.
2. Setiap paket **diuji terapkan**: salin repo upstream → timpa isi paket → `tsc -b` + `vite build` **harus
   lulus** → baru zip dibuat.
3. Tabel verifikasi memakai **sha256**, bukan penanda.
4. Bila repo lebih tua dari lokal, paket memuat **seluruh** berkas yang beda + berkas yang hanya ada di lokal.
