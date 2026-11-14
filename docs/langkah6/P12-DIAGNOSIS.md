# P12 — Diagnosis galat torso MIRA (langkah 1)

Sesi 57 · 2026-10-29 · build `index-DCR382kJ.js` `e215b5a7…` (rebuild bersih hari ini = byte-identik)

Acuan: `https://mira-humanoid.vercel.app/?auto=1&t=<fase>` · UI disembunyikan · tunggu **5 000 ms** ·
viewport 1440×900 · kita: `http://127.0.0.1:8804/` protokol sama.

---

## 0. Ringkas

| yang diukur | hasil |
|---|---|
| paritas 6 fase (t=0,3 · 1,89 · 3,5 · 5,5 · 6,8 · 9,5) | **2,758** (1,136 · 2,087 · 1,951 · 2,901 · 3,094 · **5,379**) — sama dengan catatan sesi 54 (2,72) |
| torso t=9,5 (x 520–900, y 400–780) | MAE **12,31** (RGB) / 10,57 (luma) · rerata 97,6 vs 94,1 · bias **+3,50** |
| bias pita luma torso | 0–20 **+12,08** · 20–60 +6,38 · 60–120 +2,10 · 120–200 +1,40 · 200–256 **−4,25** |
| galat menurut skala | 10,57 → blur1 9,24 → blur4 7,62 → blur16 5,77 |
| konsentrasi galat | torso **atas** (y 400–496: 14,3–14,9) · tengah kolom x≈712: 24,0–24,6 |

Sasaran P12 tetap: **torso 10,4 → ≤ 7,0**, `|Δbias|` tiap pita ≤ 2, paritas 6 fase ≤ 2,5.

---

## 1. Yang GUGUR hari ini (semua berangka)

**1.1 Terang menyeluruh (afin).** Cocok-afin terbaik pada torso t=9,5: `gain 1,00 · offset −1,0`,
MAE 12,272 vs 12,305 ⇒ **0,3 %** galat torso dapat dijelaskan terang menyeluruh. Ini menutup arah
F-149 (bodymesh `bmk`) dan F-150 (`ogw`/`ock`) untuk selamanya: menaikkan/menurunkan kecerahan badan
tidak akan menyentuh 99,7 % sisanya.

**1.2 Bidang terang spasial.** Koreksi afinitas **per blok** (seluruh layar, luma; tanpa koreksi 4,94):
4×4 → 4,59 · 8×8 → 4,84 · 16×16 → 5,10. Bahkan 16 parameter bebas hanya menurunkan 7 % ⇒ bukan
"kecerahan salah tempat" yang halus.

**1.3 Salah daftar / geser.** Block matching 16×16, radius ±6 px, pada torso t=9,5:
median |dx| = **0** · median |dy| = **0** · geser global terbaik (0,0) → 10,38 vs 10,57 · RMS sisa 8,25.
⇒ Gambar kita **tidak** bergeser/membesar; sisanya isi, bukan posisi.

**1.4 Pola garis dasar.** Ridge (puncak lokal) per baris, 380 baris:

| | live | kita |
|---|---|---|
| jumlah ridge | 12 750 | 12 408 |
| ridge/baris | 33,55 ± 5,02 | 32,65 ± 4,77 |
| jarak antar-ridge (median) | 7,0 px | 8,0 px |

Impitan titik-per-titik: 81,1 % (1 px) · **87,3 % (2 px)** · 92,3 % (3 px) · 96,0 % (5 px);
offset seam tengah 1,07 px. ⇒ Pola besar sudah dekat. **Yang mahal bukan letak garis, melainkan
ampitudo & sebaran cahaya di sekitarnya.**

**1.5 `arcs` tidak menyumbang.** `off=arcs` **identik** dengan bawaan (5,379 / 12,305 / +3,50) ⇒
lapisan busur (`gl.LINES`) kosong/mati pada t=9,5. Ini temuan tersendiri, dicatat sebagai F-168.

---

## 2. Yang HIDUP — tiga mekanisme, dengan bukti

**A. Kontras garis: inti terlalu redup, pinggir terlalu lebar.**
Pita 200+ kita **−4,25** sementara pita 0–20 **+12,08**. Artinya di tempat yang seharusnya hitam kita
menaruh cahaya, dan di tempat yang seharusnya putih kita kurang terang: **bukan gain, melainkan sebaran**.
Ablasi mendukung: mematikan bloom menurunkan kelebihan pita gelap dari +12,08 → **+7,16**, mematikan
garis → **+9,56** (dua-duanya membuat MAE keseluruhan memburuk, jadi bukan "matikan saja").
Uji knob murah (t=9,5, MAE / torso / bias / pita 0–20 / pita 200+):

| knob | MAE | torso | bias | 0–20 | 200+ |
|---|---|---|---|---|---|
| bawaan | **4,936** | 10,574 | +3,50 | +12,08 | −4,25 |
| `bt`=0,5 (ambang bloom turun) | 5,217 | 11,304 | +5,91 | +14,04 | −2,54 |
| `bt`=0,8 | 5,134 | **10,483** | **+0,13** | +9,48 | −6,47 |
| `bg`=1,6 / 2,5 | 4,962 / 5,473 | 10,670 / 11,987 | +3,82 / +6,88 | +12,36 / +15,08 | −4,06 / −2,35 |
| `lg`=0,7 / 1,4 | 4,975 / 5,034 | 10,678 / 10,924 | +2,25 / +5,14 | +11,36 / +13,18 | −5,74 / −2,46 |

⇒ Tidak ada satu knob pun yang menurunkan torso di bawah 10,4 tanpa menaikkan MAE keseluruhan.
Kontras memang salah arah, tetapi **tidak bisa diperbaiki dari parameter**: perlu perubahan bentuk cahaya.

**B. Kuad gambar datar vs permukaan di live.**
Torso kita = tekstur gambar di satu kuad (`picColor.frag.glsl`), live = permukaan 3D. Bukti visual
(`verification/mira/p12-pasangan-torso-95.png`): di kuad kita ada **bilah horizontal terang** (~x 640–740,
y 512) dan **pita putih lurus** (x 690–760, y 500–560) yang bertepi lurus — ciri tepi polygon, bukan
lengkung badan. Di live keduanya tidak ada.

**C. Rambut: penyumbang terbesar di potongan torso, dan galat terpusat di tempat rambut jatuh.**
`off=hair` di t=9,5: bias torso **+3,50 → −17,89**, pita 200+ **−54,81** ⇒ rambut menyumbang ±21 luma
rata-rata di potongan itu. Peta blok 32 px menunjukkan galat terbesar di **y 400–496** (14,3 / 14,8 / 14,9),
persis baris tempat untaian rambut melintas di atas tulang selangka. Catatan: knob `hy` (geser rambut)
**tidak berpengaruh** di t=9,5 — cabang itu tidak aktif, perlu diperiksa saat penyapuan rambut.

---

## 3. Derau acuan live — aturan baru untuk semua gerbang MIRA

Live **tidak beku** walau `?t=` dipin. Tangkapan berulang pada t=9,5:

| pasangan | MAE | torso |
|---|---|---|
| tunggu 5 s vs 12 s | 1,038 | 1,418 |
| tunggu 5 s vs 14 s | 2,162 | 3,657 |
| derau temporal 3 tangkapan (5/12/14 s) | rata **1,60** · p90 3,82 · p99 17,09 | piksel derau >6: **5,5 %** |

⇒ **Aturan:** acuan live dan tangkapan kita harus memakai **tunggu yang sama (5 000 ms)**; selisih jam
dinding menaikkan derau acuan sampai 2,2 (torso 3,7) dan itu bukan galat kita. Dengan tunggu sama derau
hanya 1,04 (torso 1,42), jadi **galat torso kita 12,3 bukan derau**.

---

## 4. Rencana langkah berikut (urut, tiap langkah punya angka keluar)

1. **Rambut (C)** — termurah & terarah: periksa mengapa `hy` mati di t=9,5, lalu sapu geser/lebar untaian
   pada potongan y 400–496. Keluar: galat potongan itu turun; torso ikut turun tanpa fase lain naik >0,3.
2. **Bentuk cahaya garis (A)** — jangan lewat 82 nilai bawaan panel: uji lebar inti + ekor glow pada
   `wire`/`points` (uniform baru di shader, bawaan = perilaku sekarang), sasaran pita 200+ naik ≥ 2 dan
   pita 0–20 turun ≥ 4 bersamaan.
3. **Geometri torso (B)** — ganti kuad `pic` pada wilayah badan dengan permukaan (mesh 3D seperti live,
   acuan `recon/shaders/mira-live/`). Ini yang paling mahal; dikerjakan setelah 1–2 terbukti.

Gerbang keluar P12 tidak berubah: torso ≤ 7,0 · `|Δbias|` tiap pita ≤ 2 · 5 fase lain tak naik > 0,3 ·
paritas 6 fase ≤ 2,5.

---

## 5. Berkas

- Alat baru: `tools/probe-mira-torso.js` (ridge + tangkapan pasangan), `tools/p12-peta.py` (dekomposisi
  galat torso), `tools/p12-sapu.js` (sapu knob + tabel angka).
- Angka mentah: `verification/mira/p12-diagnosis-5l.json`.
- Gambar: `p12-pasangan-torso-95.png` · `p12-peta-selisih-torso-95.png` ·
  `p12-ridge-live-95.png` · `p12-ridge-ours-95.png`.
