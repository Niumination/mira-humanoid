# P12 — Langkah 4: plato komposisi. Sisa galat adalah STRUKTUR (dengan angka)

Sesi 57 · 2026-10-29 · build **`index-mdGGxCxr.js` `af245fab40b03581…`** (tidak berubah sejak paket 5n)

Enam knob uji ditambahkan, disapu, lalu **dicabut lagi**; build dibangun ulang dan kembali byte-identik.
Protokol: `?auto=1&t=<fase>`, UI disembunyikan, tunggu **5 000 ms**, 1440×900, acuan `https://mira-humanoid.vercel.app/`.

---

## 0. Ringkas

| | nilai |
|---|---|
| paritas 6 fase | **2,747** (target ≤ 2,5) |
| torso t=9,5 | **10,070** (target ≤ 7,0) |
| pita 0–20 (bias) | **+7,40** (target \|Δ\| ≤ 2) |
| porsi galat **frekuensi tinggi** (<16 px) | **90 %** atas · 86 % tengah · 76 % bawah |
| knob keluarga yang ditutup hari ini | 7 keluarga, 22 varian — semuanya gugur |

Kesimpulan: **jalur komposisi habis.** Sisa galat bukan terang, warna, gain, skala, geser, ketajaman,
atau mipmap — melainkan **di mana filamen berada**.

---

## 1. Anggaran galat (siapa menyumbang berapa)

MAE seluruh bingkai 4,94; peta 6×8 (baris = atas→bawah):

```
  1.0  1.3  1.6  4.4  2.8  0.3  0.5  0.9
  2.4  0.9  1.6 10.4  9.6  7.7  2.3  1.3
  4.9  2.0  3.2 13.9 12.6  8.4  4.6  1.1
  3.9  2.1  4.8 10.9  9.9  3.8  2.6  2.2
  3.0  1.7  9.1  7.6  8.9  7.1  4.1  6.5
  1.1  1.9  8.7  8.3 11.2 10.1  3.9  4.3
```

Kontribusi terbesar (persen dari total galat): **y300–450 x540–720 → 5,9 %** (MAE 13,9) ·
y300–450 x720–900 → 5,3 % · y750–900 x720–900 → 4,7 % · y450–600 x540–720 → 4,6 %.
Seluruh galat praktis berada di dalam figur; margin kiri/kanan 1,0–2,4.

## 2. Struktur vs terang

| pita torso | MAE | frekuensi rendah (>16 px) | frekuensi tinggi (<16 px) | porsi struktur |
|---|---|---|---|---|
| y400–496 (atas) | 15,47 | 9,53 | **13,92** | **90 %** |
| y496–620 (tengah) | 8,67 | 3,42 | 7,46 | 86 % |
| y620–780 (bawah) | 7,92 | 4,02 | 6,03 | 76 % |

## 3. Tujuh keluarga yang ditutup (22 varian, semua berangka)

| keluarga | varian | torso | bias/mid yang dicapai | MAE | putusan |
|---|---|---|---|---|---|
| lengkung tonal rambut `hht` | 1,1 · 1,3 · 1,6 | 10,17 / 11,35 / 13,06 | atas +9,42 → **+5,23** | 5,05 / 5,56 / 6,23 | GUGUR — MAE atas naik 15,47 → 15,82 |
| lengkung-S rambut `hhs` | 0,2 · 0,4 · 0,6 · 0,8 | 10,08 / 10,32 / 10,72 / 11,29 | atas → +0,67 pada 0,8 | naik | GUGUR — 19,00 MAE atas |
| penipisan rambut di bahu `hhb` | 0,2 … 1,0 | 10,22 … 17,96 | atas → −30,22 | naik | GUGUR |
| skala rambut `hsc` | 0,98 · 1,02 · 1,05 | 21,20 / 21,06 / 26,13 | — | **8,52 / 8,63 / 10,78** | GUGUR BESAR — skala sekarang tepat |
| cahaya badan bergerbang mid `bmgm` | `bmk` 0,35 … 1,2 | 10,05 (semua) | pita 0–20 7,74 → 8,46 | 4,95 → 4,98 | GUGUR (marginal, 0,02) |
| matte menurut ketinggian `mtlv` | ±0,3 · ±0,6 | 10,07 … 10,26 | — | 4,938 … 5,012 | GUGUR (0,002 = di bawah derau) |
| mipmap gambar `nm=1` | — | 11,20 | — | 5,20 | GUGUR (menegaskan F-132) |

**Pola yang berulang:** setiap perubahan yang menurunkan *bias* pita atas selalu **menaikkan** MAE pita itu.
Itu tanda pasti bahwa galat tidak berkorelasi dengan terang kita — filamennya beda tempat.

## 4. Filamen: lebarnya berbeda hanya di pita atas

Ambang luma 110, wilayah x520–900:

| pita | live terang % | kita terang % | run p90 live | run p90 kita |
|---|---|---|---|---|
| atas 400–496 | 42,0 | **46,2** | 17 | **25** |
| tengah 496–620 | 33,9 | 33,6 | 15 | 16 |
| bawah 620–780 | 28,0 | 27,5 | 18 | 17 |

⇒ Hanya **rambut yang jatuh ke bahu** yang terlalu lebar/tebal (+4,2 poin piksel terang, run p90 +47 %).
Tengah dan bawah torso sudah setara secara statistik, tetapi tetap bergalat 8–9 MAE karena posisi
tiap filamen tidak sama (90 % galat frekuensi tinggi).

## 5. Bukan salah daftar, dan acuan bukan diri sendiri

- Uji skala 0,996–1,004 × geser ±2 px: optimum tetap **skala 1,000 · geser (0,0)**; MAE 8,952 → 8,925 (−0,03).
- **F-176:** `mira-humanoid.vercel.app` menyajikan `index-xg1U0Foi.js` (1 201 961 B) yang **tidak** memuat
  satu pun knob kita (`uSrf` 0 · `uCutOn` 0 · `pgg` 0) ⇒ acuan memang aplikasi asli, bukan deployment kita.
- Deployment kita `mira-humanoid-niu.vercel.app` menyajikan `index-mdGGxCxr.js` = build paket 5n ⇒ sinkron.

## 6. Langkah 5 — satu-satunya jalan yang tersisa (geometri filamen)

1. **Ekstrak pita/lengkung torso dari live** (`recon/shaders/mira-live/` + ridge yang sudah kita punya di
   `pola-torso-*.json`) menjadi **aset garis milik kita**: segmen + lebar + terang, bukan tekstur.
2. **Ganti kuad citra di wilayah torso** dengan geometri itu, dan **ganti rambut di bahu** dengan untaian
   (bukan citra) — inilah bagian yang lebarnya +47 %.
3. Jaga angka: torso ≤ 7,0 · `|Δbias|` pita ≤ 2 · 5 fase lain tak naik > 0,3 · paritas ≤ 2,5.
4. Kalau langkah ini tidak menembus 7,0 dalam dua sesi, P12 ditutup apa adanya dan kita nyatakan bersama
   P13 (aset milik sendiri), karena sejak P13 paritas piksel memang bukan lagi ukuran yang tepat.

## 7. Berkas

- Alat baru: `tools/p12-budget.py` (anggaran galat + porsi struktur + lebar filamen + uji skala/geser).
- Angka: `verification/mira/p12-langkah4.json` dan `verification/mira/p12-budget-95.json`.
- Ubahan `src/`: **tidak ada** (enam knob uji dicabut; build kembali `af245fab…`).
