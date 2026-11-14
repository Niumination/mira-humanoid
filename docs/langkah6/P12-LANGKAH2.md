# P12 — Langkah 2: sapu 8 keluarga knob (semua gugur), penyebab terkunci

Sesi 57 · 2026-10-29 · build `index-DCR382kJ.js` `e215b5a7…` (tanpa ubahan bawaan; tiga knob uji dicabut lagi)

Protokol: `?auto=1&t=9,5`, UI disembunyikan, **tunggu 5 000 ms** (aturan F-170), viewport 1440×900.
Acuan: `https://mira-humanoid.vercel.app/`.

---

## 0. Ringkas

| | MAE | torso | bias | pita 0–20 | pita 200+ |
|---|---|---|---|---|---|
| **bawaan (hari ini)** | **5,089** | **10,691** | **+3,51** | **+12,08** | **−4,24** |
| 31 varian uji (8 keluarga) | terbaik 5,149 | terbaik 10,417 | — | — | — |

**Tidak ada satu pun varian yang menurunkan torso di bawah 10,4 tanpa memperburuk seluruh bingkai.**
Penyebabnya kini terkunci dan berangka — lihat §2.

---

## 1. Acuan live kini terbukti REPRODUCIBLE

Dua tangkapan live berturut-turut dengan tunggu sama (5 000 ms): **MAE 0,003 · torso 0,003**.

⇒ F-170 dipertajam: acuan live MIRA deterministik **asal tunggunya sama**; derau 1,04 / 2,16 yang
terukur sesi lalu berasal dari tunggu yang berbeda (5 s vs 12/14 s), bukan dari live-nya sendiri.
Aturan: **selalu 5 000 ms untuk acuan maupun tangkapan kita.**

---

## 2. Galat terkonsentrasi di torso ATAS, dan penyebab terbesarnya NEBULA yang menembus badan

Peta galat per pita baris (x 520–900):

| pita | MAE | bias |
|---|---|---|
| y 400–496 (dada atas, akar rambut) | **14,97** | **+8,84** |
| y 496–620 | 9,22 | +1,58 |
| y 620–780 | 9,26 | +1,80 |

Dekomposisi lapisan pada piksel yang di live **gelap (<20 luma)** dan kita **>8 lebih terang**
(n = 11 332 = 7,8 % torso · live **9,8** vs kita **23,6**):

| lapisan | sumbangan luma |
|---|---|
| **field (nebula)** | **17,9** |
| bloom | 4,9 |
| picture | 4,0 |
| lines | 2,6 |
| hair | 1,6 |
| matter · fill · waves | 0,0 · −0,2 · 0,0 |

⇒ Di live daerah itu **ditutup permukaan badan 3D**; di kita nebula tembus. Ini menjelaskan sekaligus
mengapa mematikan nebula (`off=field`) membuat kita −13,87 dan mengapa `off=hair` membuat −17,89:
keduanya memperbaiki sebagian, merusak sebagian lain.

---

## 3. Delapan keluarga knob yang habis (31 varian)

| keluarga | varian | torso terbaik | MAE terbaik | putusan |
|---|---|---|---|---|
| geser rambut `hhx`/`hhy` | ±3, ±6 px citra | 14,01 | 6,07 | GUGUR — setiap geser memperburuk (rambut sudah di tempatnya) |
| terang rambut `hgg` | 0,70 · 0,85 | 10,64 | 5,22 | GUGUR — torso membaik 0,05 tapi puncak terang makin kurang (−6,97) |
| kecerahan nebula `fk` | 0,85 · 0,90 · 0,95 | **10,42** | **6,19** | GUGUR — torso turun 0,27 tetapi seluruh bingkai memburuk 1,10 |
| gamma komposit `gm` | 0,94 · 1,06 · 1,12 | 11,31 | 5,25 | GUGUR — gamma menggeser gelap & terang ke arah sama |
| lantai gelap `pft` (uniform baru) | 0,02 · 0,07 · 0,14 | 14,44 | 5,91 | GUGUR — memotong kabut kuad gambar tapi mematikan garis redup |
| lengkung-S kontras `scx` (uniform baru) | 0,15 · 0,30 · 0,60 | 11,06 | 5,15 | GUGUR — pita gelap turun, puncak terang ikut turun |
| penutup badan `ock` | 0,5 · 0,75 · 1,0 | 11,20 | 5,61 | **setengah berhasil** — lihat F-171 |
| penutup + penguat (`hg`/`fk`) | 6 kombinasi | 10,88 | 5,43 | GUGUR — menambal di satu tempat, menjebol di tempat lain |

Tiga knob baru yang dipakai untuk menguji (`hhx`/`hhy`, `pft`, `scx`) **dicabut kembali** setelah
terbukti tidak menolong: `npx tsc --noEmit` bersih dan `vite build` menghasilkan
`index-DCR382kJ.js` `e215b5a76220a3dd…` — **byte-identik** dengan produksi.

---

## 4. F-171 — penutup badan benar arahnya, salah bentuknya

`ock` memperbaiki pita gelap dengan rapi:

| `ock` | pita 0–20 | torso | MAE |
|---|---|---|---|
| 0 | +12,08 | 10,69 | **5,089** |
| 0,5 | +5,05 | 11,20 | 5,610 |
| 0,75 | +1,57 | 12,98 | 6,267 |
| 1,0 | **−2,03** | 15,51 | 7,099 |

Pita gelap justru **berlebih** pada `ock`=1,0 (−2,03), artinya menutup dengan hitam itu sudah cukup
untuk daerah itu — tetapi di baris lain kita lalu jadi terlalu gelap, dan menambal dengan figur
(`hg`) atau nebula (`fk`) yang lebih terang merusak yang lain lagi. Kesimpulannya: **badan di live
bukan "hitam di atas nebula", melainkan permukaan yang punya cahaya sendiri** (mesh 3D + pencahayaan).
Ini menegaskan F-149/F-150 (yang dulu gugur sebagai MAE global) dengan angka per wilayah.

---

## 5. Keputusan P12

1. Jalur penyetelan **ditutup**: 31 varian, 8 keluarga, tidak ada yang menembus torso 10,4.
2. Langkah berikut = **geometri**, urut:
   - **(B1) permukaan badan**: bidang/permukaan di wilayah torso dengan pencahayaan sendiri
     (menggantikan penutup hitam; `recon/shaders/mira-live/24-frag-10857b` = acuan bodymesh live).
   - **(B2) untaian rambut**: pita rambut di torso atas (galat terbesar 14,97 · bias +8,84).
   - **(B3) kuad → geometri**: baru setelah B1/B2 terbukti menurunkan torso.
3. Gerbang keluar P12 tetap: torso ≤ 7,0 · `|Δbias|` tiap pita ≤ 2 · 5 fase lain tak naik > 0,3 ·
   paritas 6 fase ≤ 2,5 (sekarang 2,758).

---

## 6. Berkas

- Angka: `verification/mira/p12-langkah2.json` (31 baris sapu + peta pita + dekomposisi lapisan).
- Gambar: `p12-strip-bawah-95.png` (live atas / kita bawah, crop torso bawah) ·
  `p12-peta-gelap-terang-95.png` (piksel galat di peta) · `p12-pasangan-torso-95.png` (dari paket 5l).
- Alat: `tools/p12-sapu.js` (**versi diperbaiki** — di paket 5l versi itu salah mengurai `tag=knob=nilai`,
  sehingga semua varian memakai URL tanpa knob dan hasilnya identik; sudah dibetulkan).
