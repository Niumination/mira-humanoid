# P12 — Langkah 3 (B1): permukaan badan — perbaikan nyata pertama

Sesi 57 · 2026-10-29 · build **`index-mdGGxCxr.js` `af245fab40b03581…`** (sebelumnya `index-DCR382kJ.js` `e215b5a7…`)

Protokol: `?auto=1&t=<fase>`, UI disembunyikan, tunggu **5 000 ms**, 1440×900, acuan `https://mira-humanoid.vercel.app/`.

---

## 0. Hasil

| | sebelum | **sesudah** | Δ |
|---|---|---|---|
| MAE 6 fase (rata) | 2,783 | **2,747** | −0,036 |
| t=6,8 | 3,099 | **3,075** | −0,024 |
| t=9,5 | 5,534 | **5,343** | −0,191 |
| torso t=9,5 | 10,692 | **10,070** | −0,62 |
| pita 0–20 (bias / MAE) | +12,08 / 12,08 | **+7,40 / 7,49** | −4,68 / −4,59 |
| pita 20–60 (bias / MAE) | +6,38 / 8,36 | **+4,38 / 7,67** | −2,00 / −0,69 |
| pita 200–256 (bias) | −4,24 | **−3,05** | +1,19 |

Fase 0,3 · 1,89 · 3,5 · 5,5 **tidak berubah sama sekali** (siluet masih 0 oleh gerbang reveal) — bukti
perubahan hanya menyentuh tempat yang memang salah.

**Jujur:** pita 120–200 sedikit memburuk (bias +1,40 → +3,05 · MAE 14,83 → 15,00). Target P12
(torso ≤ 7,0) **belum** tercapai; ini langkah pertama yang arahnya benar.

---

## 1. Yang dilakukan

Live: badan adalah **permukaan opak** yang menghapus latar, lalu garis cahaya citra ditambahkan di atasnya.
Kita: nebula tembus ke dalam badan (langkah 2: 17,9 dari 23,6 luma di piksel galat). Maka:

1. **Siluet badan dirender ke tekstur ruang layar.** Percobaan pertama memakai tekstur penutup (`texOccl`)
   langsung dengan UV layar — salah, karena tekstur itu berukuran gambar sehingga **margin kiri/kanan ikut
   meredup** (20,3 → 16,7). Sekarang siluet dirender sekali per frame dengan kuad gambar yang benar, dan
   margin kembali normal (MAE kiri 2,21 → 2,22).
2. **`comp`: alfa keluaran = max(alfa figur, siluet × `mtl`)** → latar dihapus di dalam badan, seperti mesh
   opak live. Bawaan `mtl` = 0,5.
3. **`comp`: `rgb × (1 + `srf` × siluet)`** → permukaan menyala oleh cahaya citranya sendiri, sehingga pita
   terang tidak hilang saat latar dihapus. Bawaan `srf` = 0,6.
4. **Siluet berhenti di batas kepala** (`uCutOn`/`uHeadCut`): kepala di live digambar titik 3D tersendiri;
   tanpa batas ini kepala memburuk +1,37.
5. `ocr` (radius penutupan siluet) 9 → **13**.

## 2. Yang gugur (berangka)

| percobaan | hasil | putusan |
|---|---|---|
| `srf` tanpa `mtl` | identik dengan bawaan | memang nol (pengali = siluet × `mtl`) |
| gerbang kecerahan citra `mgw` = 0,5 / 1,0 | MAE 4,976 / 5,017 · torso 10,250 / 10,466 | lebih buruk dari tanpa gerbang (4,951 / 10,138) ⇒ **gugur** |
| matte penuh `mtl` = 1 | MAE 7,105 · torso 15,517 | terlalu banyak latar dihapus ⇒ **gugur** |
| `ocr` 5 / 9 / 13 | torso 10,168 / 10,138 / 10,111 | kecil; 13 terbaik |
| `oct` 0,2 | torso 10,169 | tidak menolong |

Sapu akhir (t=9,5) memilih **`mtl` 0,5 · `srf` 0,6**: torso 10,070 · MAE 4,936
(0,45/0,45 → 10,164 · 0,55/0,55 → 10,081 · 0,5/0,4 → 10,230 · 0,6/0,5 → 10,138).

## 3. Sisa galat dan langkah berikut

MAE pita menurut luma live (t=9,5, torso): 0–20 → 7,49 · 20–60 → 7,67 · 60–120 → 9,62 ·
**120–200 → 15,00** · 200–256 → 11,15. Galat terbesar kini di **pita menengah-terang**, bukan lagi pita gelap.

Karena itu urutan B12 selanjutnya:

1. **B2 — untaian rambut di torso atas** (y 400–496 · MAE 14,97 · bias +8,84): pita rambut kita terlalu lebar.
2. **B1b — cahaya permukaan sendiri**: permukaan badan live punya sheen/rim sendiri (tidak hanya menyala
   oleh citra); tambahkan suku cahaya dengan normal dari medan tinggi (`texBodyH`, sudah ada) — ini yang
   dulu dicoba sebagai F-149 `bmk` dan gagal **sebagai MAE global**; sekarang arah dan tempatnya sudah
   diketahui (pita 120–200), jadi percobaannya terarah.
3. **B3 — kuad → geometri** baru setelah B2/B1b terbukti.

Gerbang keluar P12 tetap: torso ≤ 7,0 · `|Δbias|` tiap pita ≤ 2 · 5 fase lain tak naik > 0,3 ·
paritas 6 fase ≤ 2,5 (sekarang **2,747**).

## 4. Berkas

- Ubahan: `src/components/MiraStage.tsx` (`72c0ed67`) · `src/lib/shaders/comp.frag.glsl` (`8d3ca240`) ·
  `src/lib/shaders/picFill.frag.glsl` (`c69aee84`).
- Angka: `verification/mira/p12-langkah3.json`.
- Gambar: `verification/mira/p12-pasangan-5n-torso-95.png` (live kiri / kita kanan, torso t=9,5).
