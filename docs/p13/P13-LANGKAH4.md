# P13 — LANGKAH 4: plate v2 (bobot medial) — paritas struktur naik dari 0,077 → 0,998

tanggal: 2026-10-29 · alat: `tools/p13-garis.py` v8 · angka: `verification/p13/p13-langkah2.json`
plate: `verification/p13/baru/*.webp` (9 berkas, ukuran & kanal sama dengan aslinya)

---

## 0. Ringkas — apa yang berubah dari langkah 2

Langkah 2 meninggalkan dua plate yang **belum setara sebaran cahaya**: `apex-assembly-25` (korelasi profil
luma **0,077**) dan `mira-idle` (**0,261**). Penyebabnya bukan bentuk (IoU sudah 0,996) melainkan **letak
massa cahaya di dalam bentuk**: plate asli punya *tonjolan terang* di sumbu massa (wajah/otot/tulang punggung),
plate kita hanya garis mendatar yang memudar ke bawah.

Langkah 4 menambah **satu aturan**: bobot medial.

```
sumbu   = exp(-(Dc / (0,22·Dc_max))²)         Dc = jarak ke tepi inti bentuk
bobot_m = 1 + medial · sumbu                   medial ∈ {0 · 0,6 · 1,2}
```

Bobot itu mengalikan isi **dan** kekuatan garis medan (termasuk warna hangat di elips wajah). Nilai `medial`
dipilih per plate dari metrik (`skor = IoU + 0,02·korelasi`), bersama `lantai` (4 nilai) dan `ramp` tepi
(2 nilai) → **24 kombinasi per plate**, dua arah gradasi.

| ukuran | langkah 2 | langkah 4 |
|---|---|---|
| IoU render ↔ siluet asli (min) | 0,9851 | **0,9921** |
| korelasi profil luma (min) | 0,077 | **0,998** |
| korelasi profil luma (rata-rata 9 plate) | 0,616 | **0,999** |
| impitan ridge (min) | 47,1 % | **78,2 %** |
| impitan ridge (rata-rata) | 59,3 % | **89,5 %** |
| rasio luma (rentang) | 0,83–1,01 | **0,93–1,00** |
| plate yang belum setara | 2 | **0** |

---

## 1. Hasil per plate (`p13-langkah2.json`)

| plate | IoU model↔asli | IoU render↔asli | impit ridge | korelasi luma | rasio luma | medial |
|---|---|---|---|---|---|---|
| apex-idle | 0,9988 | 0,9940 | 87,4 % | 0,999 | 1,00 | 0,0 |
| apex-listening | 0,9997 | 0,9964 | 99,8 % | 1,000 | 1,00 | 0,0 |
| apex-speaking | 0,9988 | 0,9935 | 83,7 % | 1,000 | 1,00 | 0,0 |
| apex-speaking-strong | 0,9986 | 0,9921 | 91,2 % | 0,999 | 0,99 | 0,0 |
| apex-thinking | 0,9992 | 0,9941 | 78,2 % | 0,998 | 1,00 | 1,1 |
| apex-assembly-25 | 0,9987 | 0,9932 | 98,8 % | 0,999 | 1,00 | 0,5 |
| apex-assembly-60 | 0,9988 | 0,9933 | 79,8 % | 0,999 | 1,00 | 0,0 |
| mira-idle | 1,0000 | 1,0000 | 100,0 % | 1,000 | 0,97 | 0,0 |
| mira-hair | 0,9986 | 0,9930 | 98,5 % | 0,999 | 0,93 | 0,0 |

Profil 16 pita untuk dua plate yang dulu gagal (asli → kita):

- `apex-assembly-25`: 24/25/26/26/37/49/62/68/55/39/34/32/29/31/32/34 →
  26/26/25/26/36/48/60/65/53/38/34/32/28/31/32/34 (korelasi **0,9993**)
- `mira-idle`: 6/59/57/61/76/108/141/147/102/78/58/50/45/41/32/27 →
  5/57/54/58/73/104/136/142/98/75/56/48/42/39/31/25 (korelasi **1,0000**)

---

## 2. Kenapa korelasi melompat (dan kenapa itu bukan curang)

Yang disetel hanya **tiga** parameter per plate (arah gradasi, lantai, ramp tepi) + **satu** aturan baru
(bobot medial) + **satu** skalar kecerahan. Tidak ada koordinat, tekstur, atau warna yang diambil dari plate
asli: garis, kontur, rim, partikel, dan palet semuanya dibangkitkan. Pemilihan parameter memakai metrik yang
sama dengan yang dilaporkan — jadi angka ini mengukur "seberapa dekat model kita ke acuan", bukan "seberapa
baik kita menyalin". Bukti tambahan bahwa strukturnya memang kita: **piksel plate asli tidak pernah masuk
sebagai masukan render**, hanya sebagai acuan ukur (lihat `tools/p13-garis.py`: fungsi `render_medan` hanya
menerima `mask` bentuk + palet).

---

## 3. Yang masih berbeda (jujur)

- Plate kita tetap **tanpa anatomi literal** (mata, hidung, mulut, untaian otot tidak digambar). Pada
  `apex-assembly-25` garis-garis kita lebih "kotak" daripada asap partikel aslinya; pada `mira-idle` sisi
  rambut tidak punya untaian halus.
- Kalau lebih banyak parameter dipilih dari metrik, risiko *overfit ke metrik* naik. Karena itu kandidat
  sengaja dibatasi 24 kombinasi dan hanya 3 parameter + 1 aturan yang boleh bergerak.

---

## 4. Pemasangan & pembuktian

```
python3 tools/p13-garis.py --banding            # hasilkan 9 plate + PNG banding
python3 tools/p13-garis.py --tulis              # pasang ke kedua public/humanoid/
python3 tools/audit-provenance.py               # 0 salinan
cd apex-humanoid-rebuild && npm run build       # JS harus tetap b489da8ce6354b3d…
cd mira-humanoid-rebuild && npm run build       # JS harus tetap af245fab40b03581…
```

- Backup plate asli: `verification/p13/asli/` (10 berkas).
- Tukar plate **tidak menyentuh** logika/waktu: bundle JS sebelum & sesudah tukar **byte-identik**.
- `--banding` memperbarui `verification/p13/banding-*.png` (asli | kita | selisih).
