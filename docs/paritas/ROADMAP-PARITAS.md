# ROADMAP PARITAS — APEX Niu & MIRA Niu menuju setara sumber asli

Versi: P16 · 2026-11-25 · Bahasa: Indonesia
Acuan absolut: `apex-humanoid.vercel.app` (untuk `niu-humanoid.vercel.app`) dan
`mira-humanoid.vercel.app` (untuk `mira-humanoid-niu.vercel.app`).
**Klon dibandingkan hanya dengan domain aslinya sendiri — APEX tidak pernah dibandingkan dengan MIRA.**

---

## 0. Aturan main (tidak berubah)

1. Tanpa izin eksplisit per repo: **tidak ada** commit, push, deploy, promote, rollback, atau perubahan alias.
   Agen hanya menyiapkan paket; penerapan dilakukan pemilik repo.
2. Setiap tahap harus punya **gerbang terukur** (angka), bukan penilaian mata.
3. Metode ukur baku: viewport **1440×900 DPR1**, UI disembunyikan, **median 9 frame** jarak 400 ms,
   APEX `?auto=1` + tunggu 11 s, MIRA `?auto=1&t=9`.
   MAE dihitung pada kanal luma 0–255; "tengah" = kotak pusat figur.
4. **Lantai derau (noise floor):** jitter antar-capture pada situs asli yang sama
   = **3,62** (APEX) dan **3,58** (MIRA). Angka MAE tidak mungkin turun di bawah ini.

---

## 1. Posisi sekarang (terukur, bukan perkiraan)

| Situs | MAE penuh | MAE tengah | Catatan |
|---|---:|---:|---|
| APEX klon (live, P14) | **7,29** | **8,86** | luma 23,92 vs asli 22,68 |
| APEX — latar saja (figur disembunyikan) | **5,24** | 4,03 | luma 17,75 vs asli 17,90 |
| MIRA klon (live, P15) | **6,40** | **13,29** | turun dari 8,26 / 15,08 |

Dekomposisi APEX yang sudah terbukti:

- **Latar**: pusat nyaris sempurna (selisih blok 0,3–0,6). Error terkonsentrasi pada
  **lereng gunung kiri & kanan** (blok 14,7 · 15,7 · 14,2 · 18,5 · 20,3).
- **Figur**: kelebihan terang di **lantai tengah-bawah** (+3,7…+6,3 pada y>720, puncak **+9,3** di x 600–840).
  Latar saja tidak punya kelebihan ini → sumbernya lapisan figur, bukan latar.

Hipotesis yang **sudah dibatalkan** (jangan diulang, lihat `APEX-DIAGNOSA-P16.md`):
kanvas ke-3 MIRA, gain/offset global APEX, `mixBlendMode: normal` pada kanvas latar,
`<img backdrop-v1.webp>` opacity 0, token `floor/ground/reflect` di bundel asli.

---

## 2. Tahapan sampai selesai

Urutan dipilih berdasarkan **rasio dampak/biaya** dari angka di atas.

### P17 — APEX A1: lapisan figur, kelebihan terang lantai
*Target: MAE penuh ≤ 6,0 · MAE tengah ≤ 7,5 · luma selisih ≤ 0,6*

- Tersangka utama: jalur aditif pada figur GPU — `gl.blendFunc(SRC_ALPHA, ONE)`
  (`src/components/Figure.tsx`) dan rangkaian `globalCompositeOperation = 'lighter'`
  di `src/lib/render.ts` (6 titik). Bloom/halo bawah menumpuk ke area lantai.
- Metode: sapuan terkontrol satu variabel per build (radius bloom, ambang, alpha halo bawah),
  masing-masing diukur ulang dengan prosedur baku; hanya perubahan yang menurunkan MAE
  **penuh dan tengah sekaligus** yang disimpan.
- Alat sudah siap: `tangkap.js --patch` (uji hipotesis tanpa build), `peta-blok.py` (lokalisasi error).
- Biaya: 6–10 siklus ukur (±75 detik/capture) + build lokal.

### P18 — APEX A2: siluet lereng gunung pada latar
*Target: MAE latar-saja ≤ 3,0 (dari 5,24) · MAE penuh ikut turun ≤ 5,5*

- Error hanya di tepi kiri/kanan → masalah **bentuk**, bukan warna.
  Kandidat: kontur plate `backdrop-v1.webp` (regenerasi P14 mencapai 88,0 % anggaran parameter)
  dan sebaran titik point-cloud WebGL di tepi bingkai.
- Metode: regenerasi `backdrop-v1.webp` dengan anggaran kontur dinaikkan (pagar tetap ≤ 90 % parameter),
  gerbang `gerbang-p14.py` wajib lulus (mae_sil, iou, r_grad, luma) sebelum diukur di layar.
- Catatan lisensi: tetap jalur **regenerasi sendiri**, bukan penyalinan aset asli — sesuai kesepakatan awal.

### P19 — MIRA B1: sisa puncak rambut
*Target: MAE tengah ≤ 10,0 (dari 13,29) · MAE penuh ≤ 5,5*

- Sisa error terbesar MIRA: puncak rambut (blok 24,6), terikat ke plate `mira-hair-v1.webp`
  (sekarang 88,1 % anggaran parameter, pagar 90 %).
- Opsi: naikkan anggaran kontur rambut dalam pagar, atau pisah plate rambut jadi dua lapis
  (massa + helai) agar kontur atas lebih tajam tanpa menambah parameter total.

### P20 — Cakupan state di luar IDLE
*Target: tiap state lulus gerbang plate dan MAE layar ≤ gerbang akhir*

- 6 plate state APEX (`assembly-25`, `assembly-60`, `listening`, `speaking`, `speaking-strong`, `thinking`)
  sudah ada sebagai aset, **belum pernah diukur di layar**.
- Butuh pemicu state deterministik untuk capture; gunakan jalur yang sama dengan gerbang `?auto=1`.

### P21 — Kebersihan & dokumentasi deviasi
- Parameter `?t=` pada APEX klon membekukan `dt = 0` (`src/components/HumanoidMode.tsx` ~144/228/258/262/282).
  APEX asli **tidak punya** `get("t")`. Ini deviasi sengaja untuk capture deterministik.
  Keputusan yang diusulkan: **pertahankan**, dokumentasikan di README repo, dan beri pagar
  agar hanya aktif pada `import.meta.env.DEV` atau flag build khusus gerbang.
- Rapikan NOTICE/LICENSE agar status "karya mandiri hasil rekonstruksi" tercatat eksplisit.

### P22 — Gerbang akhir & pembekuan
*Gerbang akhir yang diusulkan:*

| Situs | MAE penuh | MAE tengah | Syarat tambahan |
|---|---:|---:|---|
| APEX | ≤ **5,0** | ≤ **6,0** | selisih luma ≤ 0,5 · tidak ada blok > 12 |
| MIRA | ≤ **5,0** | ≤ **10,0** | selisih luma ≤ 0,5 · tidak ada blok > 15 |

Dengan lantai derau 3,6, angka ≤ 5 berarti selisih nyata ≈ 1,4 level luma — di bawah ambang
yang bisa dibedakan mata pada layar biasa. Setelah lulus: bekukan versi, simpan kit ukur
di repo (`tools/paritas/`), dan jadikan gerbang sebagai pemeriksaan pra-rilis.

---

## 3. Jadwal paket upstream

| Paket | Isi | Status |
|---|---|---|
| P14 | 12 aset plate regenerasi (2 repo) | ✅ diterapkan pemilik |
| P15 | `MiraStage.tsx` — jam sekunder & napas (repo `mira-humanoid` saja) | ✅ diterapkan pemilik |
| **P16** | roadmap + diagnosa APEX + **kit ukur paritas** (tanpa patch runtime) | paket ini |
| P17 | patch runtime APEX A1 (figur/lantai) | setelah sapuan ukur |
| P18 | aset `backdrop-v1.webp` v2 (APEX A2) | setelah gerbang plate |
| P19 | aset `mira-hair-v1.webp` v2 (MIRA B1) | — |
| P20 | 6 plate state APEX (bila perlu revisi) | — |
| P21 | dokumentasi deviasi `?t=` + pagar flag | — |

**P16 sengaja tidak berisi patch runtime.** Perbaikan A1/A2 memerlukan sapuan eksperimen
dengan build lokal; mengirim tebakan ke upstream tanpa angka melanggar aturan gerbang di bagian 0.

---

## 4. Risiko yang diketahui

1. **Reset sandbox** ("Something went wrong") sudah 7× sesi ini — menghapus Chromium, paket python,
   `work/build/`, `work/out/`. Mitigasi: `bash work/siapkan.sh [--build] [--browser]`,
   giliran pendek, salinan di Drive. **Tidak pernah merusak hasil kerja** (`report/`, `paket/`,
   `work/tools|asli|cap|src-current` selalu selamat).
2. **Lantai derau 3,6** membatasi gerbang akhir; mengejar MAE < 4 adalah pemborosan.
3. **Pagar lisensi 90 % parameter** pada regenerasi plate membatasi ketajaman kontur;
   bila P18/P19 mentok, pilihannya menaikkan pagar (butuh keputusan Anda) atau mengubah strategi lapisan.
