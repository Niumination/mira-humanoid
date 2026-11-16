# P13 — LANGKAH 2: plate milik kita (siluet model + struktur garis)

tanggal: 2026-10-29 · alat: `tools/p13-garis.py` · angka: `verification/p13/p13-langkah2.json`
plate hasil: `verification/p13/baru/*.webp` (juga sudah dipasang di `public/humanoid/` kedua aplikasi)

---

## 0. Ringkas

| butir | hasil |
|---|---|
| plate digambar ulang dari aturan (tanpa piksel plate asli) | **9/9** |
| IoU siluet (model ↔ siluet asli) | **0,9960 – 0,9992** (syarat ≥ 0,98) ✅ |
| IoU siluet (render ↔ siluet asli) | **0,9851 – 0,9989** (syarat ≥ 0,98) ✅ |
| impitan ridge (puncak plate asli yang punya puncak kita ≤ 2 px) | 47,1 % – 73,8 % |
| korelasi profil luma 16 pita | 0,077 – 0,918 (7/9 ≥ 0,59) ⚠️ |
| rasio luma (kita / asli, rata dalam siluet) | **0,83 – 1,01** ✅ (target ≈ 1,0) |
| `audit-provenance` | **12/12 SALINAN → 1/12 SALINAN** (sisa: `backdrop-v1.webp`) |
| bundle JS kedua aplikasi sebelum vs sesudah tukar plate | **byte-identik** (APEX `b489da8ce6354b3d…` · MIRA `af245fab40b03581…`) |
| gerbang fase (MIRA D/A/B/step5/step4c, APEX) | **tidak bisa dijalankan di sesi ini** (lihat §6) — diganti bukti bundle identik |

**Yang belum setara (jujur, berangka):** struktur *dalam* plate kita masih skematis. Korelasi profil luma
`apex-assembly-25` hanya **0,077** dan `mira-idle` **0,261**; dua plate itu belum bisa dibilang setara
secara sebaran cahaya. Semua plate kita juga belum punya fitur anatomi (mata/hidung/mulut, untaian otot) —
plate kita adalah *medan garis* di dalam bentuk yang benar, bukan tiruan wajah.

---

## 1. KOREKSI BESAR: definisi mask P13 sebelumnya salah

Versi pertama `tools/p13-siluet.py` (dipakai seluruh paket 5q) memakai **`gaussian(σ=6) luma > 40`**.
Blur 6 px + ambang 40 **memotong bahu**: cakupan `apex-idle-v1` terukur 22,9 %, padahal dengan definisi
yang benar **35,7 %**.

| definisi mask | cakupan `apex-idle-v1` |
|---|---|
| σ6 > 20 | 27,3 % |
| σ6 > 40 (**paket 5q**) | **22,9 %** ❌ bahu hilang |
| σ3 > 12 | 32,0 % |
| **σ3 > 8 (dipakai sekarang)** | **35,7 %** ✅ |
| σ2 > 6 | 38,3 % (mulai menangkap pendar latar) |

Definisi tunggal yang sekarang dipakai **ketiga alat** (`p13-siluet.py`, `p13-aset.py`, `p13-garis.py`):

```
MIRA-idle  : alfa > 32
APEX       : gaussian(luma, σ=3) > 8      (plate opak, tak punya alfa)
MIRA-hair  : gaussian(luma, σ=3) > 3      (pendarnya sangat redup; latar p90 = 2)
lalu       : closing(3) → isi lubang → komponen terbesar → buang komponen < 200 px
```

Akibat koreksi ini **semua angka langkah 1 di paket 5q diganti**. Angka baru (berkas
`verification/p13/siluet.json` dan `aset-siluet.json`):

| plate | cakupan | IoU model langkah 1 |
|---|---|---|
| apex-idle | 35,7 % | 0,9991 |
| apex-listening | 59,6 % | 0,9998 |
| apex-speaking | 34,5 % | 0,9992 |
| apex-speaking-strong | 38,5 % | 0,9991 |
| apex-thinking | 32,8 % | 0,9993 |
| apex-assembly-25 | 37,1 % | 0,9990 |
| apex-assembly-60 | 37,6 % | 0,9992 |
| mira-idle (alfa) | 50,9 % | 1,0000 |
| mira-hair | 23,6 % | 0,9994 |

Kesimpulan langkah 1 tidak berubah (**9/9 lulus**), tetapi angka cakupan/IoU 5q tidak boleh dipakai lagi.

---

## 2. Metode: plate dibangun dari aturan, bukan dari jejak

`tools/p13-garis.py` (v7) — pipeline per plate:

1. **Model bentuk.** Mask → `gaussian(σ1,6) > 0,5` → closing 3 → isi lubang → komponen ≥ 200 px
   (IoU model ↔ siluet asli **0,9960 – 0,9992**). Ini satu-satunya masukan bentuk; **tidak ada piksel
   plate asli yang masuk ke keluaran**.
2. **Inti vs cangkang.** `D = jarak-ke-tepi`; inti = `mask ∧ D ≥ 26` (diisi lubang). Semua garis hidup di
   inti; cangkang (gerigi/semburan tepi) hanya diisi partikel.
3. **Isi.** Gradasi vertikal `atas → bawah` dari palet kita, diredupkan 24 px dari tepi, dikali aturan
   **redup-ke-bawah** `vig = 1 − 0,58·clip((v−0,56)/0,44)^1,25` (atau terbalik, lihat §3).
4. **Garis medan.** Tiap 6,5 px: polyline horizontal bergelombang (`1,5·sin(x/44) + 0,85·sin(x/17)`,
   fase per garis), memudar 26 px di ujung rentang, kekuatan berbeda per garis (`0,62 + 0,38·sin(2,399·i)`).
   Warna bergeser **dingin → hangat** di dalam elips wajah (pusat 0,50 W; 0,43 tinggi, jari-jari 0,175).
5. **Kontur offset.** 5 kurva sejajar tepi (medan jarak 4/8,5/14/21/30 px) — lengkung mahkota/bahu.
6. **Rim.** Garis tepi menyala pada jarak tetap di dalam inti (7 px, + bayangan 13 px), dipacu 1,55× di
   mahkota.
7. **Untaian vertikal.** Kolom tiap 12 px menyusuri bentuk bawah (bobot 0,30) — leher/dada/badan.
8. **Partikel cangkang.** Sampel acak deterministik (biji dari palet + jumlah piksel) di cangkang.
9. **Glow** = blur(3) lapisan garis × 0,16–0,18, **dipotong mask** (supaya halo tidak melebarkan siluet).
10. **Kalibrasi** satu skalar per plate: rata-rata luma di dalam siluet dibuat = plate asli → rasio luma ≈ 1,0.

Alat **tidak** memakai: piksel asli, warna hasil sampel, jejak ridge asli sebagai koordinat gambar.
Yang dipilih per plate hanya **3 parameter** (arah `vig`, `lantai`, lebar `ramp` tepi) + 1 skalar kalibrasi;
pemilihannya dari metrik (korelasi profil untuk `vig`; IoU siluet untuk `lantai`/`ramp`), bukan dari mata.

---

## 3. Parameter terpilih per plate

| plate | arah vig | lantai | ramp tepi | skala |
|---|---|---|---|---|
| apex-idle | normal | 26 | 0,5/3,0/1,0 | 0,89 |
| apex-listening | **terbalik** | 34 | 2,0/8,0/1,4 | 0,65 |
| apex-speaking | normal | 26 | 0,5/3,0/1,0 | 0,92 |
| apex-speaking-strong | normal | 18 | 2,0/8,0/1,4 | 1,27 |
| apex-thinking | normal | 34 | 0,5/3,0/1,0 | 0,72 |
| apex-assembly-25 | **terbalik** | 34 | 0,5/3,0/1,0 | 0,73 |
| apex-assembly-60 | normal | 26 | 1,0/5,0/1,2 | 0,89 |
| mira-idle | normal | 6 | 2,0/8,0/1,4 | 1,48 |
| mira-hair | normal | 6 | 0,5/3,0/1,0 | 1,49 |

---

## 4. Hasil ukur paritas (bukan "kelihatan mirip")

| plate | IoU model↔asli | IoU render↔asli | impit ridge | korelasi luma | rasio luma |
|---|---|---|---|---|---|
| apex-idle | 0,9969 | 0,9877 | 67,6 % | 0,779 | 1,00 |
| apex-listening | 0,9992 | 0,9948 | 51,5 % | 0,590 | 1,00 |
| apex-speaking | 0,9968 | 0,9879 | 67,2 % | 0,870 | 1,01 |
| apex-speaking-strong | 0,9966 | 0,9865 | 73,8 % | 0,918 | 0,99 |
| apex-thinking | 0,9960 | 0,9880 | 58,6 % | 0,766 | 1,01 |
| apex-assembly-25 | 0,9961 | 0,9853 | 61,1 % | **0,077** | 0,94 |
| apex-assembly-60 | 0,9963 | 0,9851 | 65,9 % | 0,617 | 0,98 |
| mira-idle | 0,9989 | 0,9989 | 47,1 % | **0,261** | 0,96 |
| mira-hair | 0,9979 | 0,9895 | 59,2 % | 0,857 | 0,83 |

Cara ukur (semua bisa diulang dengan `python3 tools/p13-garis.py --banding`):

- **IoU model↔asli** — bentuk model vs siluet asli (kesetiaan bentuk).
- **IoU render↔asli** — siluet plate kita (dihitung dengan definisi mask yang **sama**) vs siluet asli.
- **impitan ridge** — tiap puncak kecerahan plate asli diperiksa: ada puncak kita dalam ±2 px?
  (jarak baris 4 px, ambang persentil-80 di dalam siluet).
- **korelasi profil luma** — rata-rata luma di dalam siluet untuk 16 pita mendatar, Pearson kita vs asli.
- **rasio luma** — rata-rata luma kita / asli, di dalam siluet.

Banding visual per plate: `verification/p13/banding-<plate>.png` (asli | kita | selisih).

---

## 5. Pemasangan aset & audit provenance

- Plate baru disalin ke **kedua** `public/humanoid/` (APEX 7 plate + 2 salinan `mira-*`; MIRA 2 plate).
- `python3 tools/audit-provenance.py` → **11 dari 12 berkas `beda/baru`**, sisa **1**: `backdrop-v1.webp`
  (masih salinan verbatim plate asli). Gerbang E belum penuh; backdrop masuk langkah berikut P13.
- Backup plate asli: `verification/p13/asli/` (10 berkas) — balik dengan menyalin ulang ke `public/humanoid/`.
- Build ulang: APEX `dist/assets/index-ClEvdEMa.js` `b489da8ce6354b3d…` · MIRA `dist/assets/index-mdGGxCxr.js`
  `af245fab40b03581…`. Keduanya **identik** dengan build sebelum tukar plate (diuji dengan mengembalikan
  plate asli lalu build lagi: hash JS sama) ⇒ tukar plate tidak menyentuh logika/waktu, hanya aset.

---

## 6. Batas sesi ini (dilaporkan apa adanya)

- **Gerbang berbasis Chromium tidak bisa dijalankan.** Sandbox sesi ini tidak punya `libnspr4/libnss3`
  dan pengguna bukan root (`id -u` = 1000, `apt-get` tanpa sudo). Playwright + Chromium terpasang, tetapi
  peluncuran gagal: `error while loading shared libraries: libnspr4.so`.
  Pengganti bukti: **bundle JS kedua aplikasi byte-identik** sebelum/sesudah tukar plate, jadi gerbang
  perilaku/waktu (yang membaca bundle & status runtime) tidak dapat berubah karena perubahan ini.
  Bagian Node dari `gate-step5.js` tetap dijalankan: **6/6 LULUS** (respons talk/listen/voice, pemusnahan
  < 0,01, pin URL & pace, presence, `VN()` 486 kombinasi, `Kk()`/`PF()`).
- **Dua plate belum setara sebaran cahaya** (`assembly-25` 0,077 · `mira-idle` 0,261). Penyebab terukur:
  plate asli punya struktur anatomis/kurva badan; plate kita hanya medan garis mendatar + kontur offset.
  Ini pekerjaan langkah struktur berikutnya, bukan cacat alat.

---

## 7. Berkas

| berkas | isi |
|---|---|
| `tools/p13-garis.py` | generator plate (10 tahap di §2) + 5 metrik + `--banding` + `--tulis` |
| `tools/p13-siluet.py` | **diperbaiki**: definisi mask tunggal, cakupan + luma + lubang per plate |
| `tools/p13-aset.py` | model siluet parametrik + uji kompresi (mask sudah σ3/8 dan 3) |
| `verification/p13/p13-langkah2.json` | angka + palet + parameter terpilih |
| `verification/p13/siluet.json` | mask baru per plate (+ catatan koreksi) |
| `verification/p13/aset-siluet.json` | model siluet + uji kompresi (angka baru) |
| `verification/p13/baru/*.webp` | 9 plate kita (ukuran & kanal sama dengan asli) |
| `verification/p13/banding-*.png` | perbandingan asli / kita / selisih |
| `verification/p13/asli/*.webp` | backup plate asli |
| `verification/provenance.json` | audit: 1/12 salinan |
