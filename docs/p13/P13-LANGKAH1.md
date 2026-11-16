# P13 — Langkah 1: aset siluet milik sendiri (model parametrik, IoU ≥ 0,9998)

Sesi 57 · 2026-10-29 · **tanpa ubahan `src/`** · build MIRA tetap `index-mdGGxCxr.js` `af245fab…`

---

## 0. Kenapa ini dikerjakan sekarang

- P12 ditutup dengan plato (paritas piksel 2,747 · torso 10,07) — sebabnya galat frekuensi tinggi dari mesh 3D live.
- Rencana lanjutan menetapkan: **sejak P13 ukuran paritas berpindah** dari MAE piksel ke **paritas struktur**
  (siluet IoU, timing, gerbang fase), karena mengejar MAE piksel = menyalin citra live.
- Gerbang hukum: `audit-provenance` masih **12/12 SALINAN** ⇒ rebranding belum boleh. P13 dimulai dari sini.

## 1. Yang dikerjakan (dan yang tidak)

| | |
|---|---|
| **dilakukan** | siluet tiap plate diukur → dinyatakan ulang sebagai **model** (daftar rentang x per baris) → plate baru **digambar dari model itu** dengan warna & gradasi buatan sendiri |
| **tidak dilakukan** | tidak ada satu piksel asli yang disalin ke keluaran; struktur **garis di dalam** plate belum dimodelkan |

Mask diturunkan dua cara karena bahan mentahnya beda:

- **APEX** (plate opak, alfa = 255 semuanya): luma di-blur 6 px → ambang 40 → closing 3 → isi lubang → komponen terbesar.
- **MIRA** (plate beralfa): alfa > 32 → closing 2 → isi lubang → komponen terbesar.

## 2. Hasil

| plate | cakupan siluet | rentang y | lebar maks | rentang (baris × celah) | **IoU render vs siluet** |
|---|---|---|---|---|---|
| apex-idle-v1 | 20,1 % | 106–1157 | 674 | 1 470 | **1,0000** |
| apex-listening-v1 | 19,9 % | 149–1144 | 690 | 1 388 | **1,0000** |
| apex-speaking-v1 | 19,4 % | 128–1146 | 683 | 1 423 | **1,0000** |
| apex-speaking-strong-v1 | 22,9 % | 109–1176 | 725 | 2 086 | **0,9999** |
| apex-thinking-v1 | 18,6 % | 143–1121 | 668 | 1 373 | **1,0000** |
| apex-assembly-25-v1 | 8,9 % | 40–1250 | 582 | 2 352 | **0,9998** |
| apex-assembly-60-v1 | 16,6 % | 100–1065 | 566 | 1 774 | **0,9999** |
| mira-idle-v1 | 50,9 % | 56–1371 | 830 | 1 745 | **1,0000** |
| mira-hair-v1 | 10,3 % | 36–834 | 520 | 1 451 | **1,0000** |

**9/9 plate ≥ 0,9998** (syarat P13: ≥ 0,98) — model dapat mereproduksi siluet.

**Jujur soal arti angka ini:** IoU diukur terhadap **mask hasil ekstraksi kita sendiri** (untuk plate APEX
mask itu turunan kecerahan, bukan alfa resmi). Jadi yang terbukti adalah *kesetiaan model terhadap mask*,
bukan kesetiaan ke objek asli.

## 3. Ukuran aset (inilah keuntungannya)

| | |
|---|---|
| total plate asli (9 webp) | 2 699 462 B |
| total model siluet | **120 496 B (4,5 %)** |
| rentang per plate | 11–19 kB |

Model terkuantisasi (tiap 2 baris, x dibulatkan 2 px) masih **≥ 0,9895** untuk 7/9 plate; `assembly-25`
turun ke 0,9729 dan `assembly-60` 0,9895 ⇒ untuk dua plate itu pakai model penuh.

## 4. Yang belum selesai (jangan dibaca sebagai selesai)

1. **Struktur garis di dalam plate** (pola filamen/urat yang membuat plate terlihat hidup) belum dimodelkan —
   yang baru siluet + gradasi warna. Ini pekerjaan langkah 2.
2. Aplikasi **belum memuat** aset baru: MIRA masih memakai `mira-idle-v1.webp` + `mira-hair-v1.webp`,
   APEX masih plate webp.
3. `audit-provenance` **masih 12/12 SALINAN** — berkas publik belum diganti.
4. Logo, tipografi, ikon belum diperiksa.

## 5. Langkah 2 (rencana)

1. Model **garis dalam**: mulai dari aset 179 rantai filamen (P12) + aturan lengkung, digambar prosedural.
2. Ganti berkas publik dengan render baru, jalankan `audit-provenance.py` → target **SALINAN 0/12**.
3. Ukur **paritas struktur**: IoU plate baru vs plate lama ≥ 0,98 + **6 gerbang fase tetap lulus**
   (gerbang A/B/D/langkah 4–6 tidak boleh regresi).
4. Bangun ulang MIRA & APEX, jalankan gerbang produksi.

## 6. Berkas

- Alat: `tools/p13-siluet.py` (ukur mask asli) · `tools/p13-aset.py` (model + render + IoU + uji kompresi)
- Angka: `verification/p13/siluet.json` · `verification/p13/aset-siluet.json` · `verification/p13/p13-langkah1.json`
- Gambar: `verification/p13/mask-*.png` (9) · `render-*.png` (9) · `banding-*.png` (9, asli | mask | render)
