# P12 — Langkah 5 (uji geometri) dan penutupan P12 dengan plato

Sesi 57 · 2026-10-29 · build `index-mdGGxCxr.js` `af245fab40b03581…` (**tanpa ubahan `src/`** — langkah ini
seluruhnya uji kelayakan di luar aplikasi, supaya tidak ada build yang harus dipasang kalau hasilnya negatif)

---

## 0. Ringkas jujur

| | awal P12 | akhir | target | status |
|---|---|---|---|---|
| paritas 6 fase | 2,758 | **2,747** | ≤ 2,5 | ✗ (kurang 0,25) |
| torso t=9,5 | 10,69 | **10,07** | ≤ 7,0 | ✗ (kurang 3,07) |
| pita 0–20 (bias) | +12,08 | **+7,40** | ≤ 2,0 | ✗ |

P12 **ditutup dengan plato**, bukan dengan target tercapai. Tiga percobaan terakhir hari ini menjelaskan
kenapa — dan semuanya berangka.

---

## 1. Percobaan 1 — medan geser/regang per baris: NOL (F-177)

Untuk tiap baris torso (y 400–780) dicari skala 0,94–1,06 dan geser −10…+10 px yang paling cocok dengan
baris live:

- skala rata **1,0000** · geser rata **0,00 px**
- galat baris tanpa koreksi **10,40** → batas atas dengan koreksi **10,40** (perbaikan **0,0 %**)

⇒ Tidak ada salah posisi horizontal, bahkan per baris. Alat: `tools/p12-warp-fit.py`.

## 2. Percobaan 2 — geometri filamen menggantikan kuad citra: LEBIH BURUK (F-178)

Aset kurva berhasil dibuat dari pola live (ini bahan berharga untuk P13):

| | |
|---|---|
| rantai filamen | **179** |
| titik ridge | 14 928 → disederhanakan RDP → **3 468 titik** |
| lebar median | 6,5 px · terang median 0,91 |
| isi aset | titik polyline + lebar + warna (bukan bitmap) |

Hasil render di atas bingkai kita **tanpa gambar** (wilayah 470–960 × 330–830):

| varian | MAE wilayah |
|---|---|
| kita sekarang | **11,36** |
| kita tanpa gambar | 37,20 |
| tanpa gambar + geometri filamen | **54,75** |

⇒ Garis tipis **tidak bisa** menggantikan kuad: kuad membawa **massa cahaya lebar** (badan + glow), bukan
hanya filamen. "Ganti kuad dengan geometri" harus berarti **tambah** geometri, bukan buang kuadnya.

## 3. Percobaan 3 — menambal garis live di celah: LEBIH BURUK (F-179)

Menambahkan garis live **hanya** di tempat yang di live terang (>135) dan kita ≥35 lebih gelap (1 121 titik):

| | wilayah | seluruh bingkai |
|---|---|---|
| sebelumnya | 11,36 | 5,586 |
| sesudah tambalan | **18,25** | **6,901** |

⇒ Filamen kita **sudah ada** di dekat posisi live (impitan 87 % pada 2 px); menambah puncak kedua membuat
galat naik. Sisanya adalah selisih **posisi sub-2 piksel** yang tidak bisa ditambal dari 2D.

## 4. Daftar lengkap yang sudah ditutup P12 (semua berangka, jangan diulang)

1. gain/gamma global · 2. lengkung tonal gambar (`pgg`) · 3. lantai gelap kuad · 4. lengkung-S bingkai ·
5. matte/penutup badan (`ock`) · 6. gerbang kecerahan citra (`mgw`) · 7. skala & geser global (F-175) ·
8. skala & geser **per baris** (F-177) · 9. skala rambut (2 % → MAE 8,52) · 10. terang rambut ·
11. lengkung tonal & lengkung-S rambut · 12. penipisan rambut di bahu · 13. cahaya badan bergerbang mid-tone ·
14. matte menurut ketinggian · 15. mipmap gambar & mipmap rambut · 16. tambalan filamen dari live (F-179) ·
17. geometri-sebagai-pengganti kuad (F-178).

**Sebab plato (satu kalimat):** sisa galat 76–90 % adalah struktur frekuensi tinggi < 16 px yang berasal dari
mesh 3D live — tidak dapat direproduksi dari kuad citra 2D kecuali dengan menyalin citra live itu sendiri.

## 5. Yang dibawa P12 ke depan (bukan nol)

1. **Permukaan badan** (`mtl`/`srf`, `ocr`) — mekanisme baru yang menurunkan pita gelap 4,7 poin dan
   menurunkan paritas 2,783 → 2,747. Ini tetap dipakai.
2. **Aset kurva filamen** (179 rantai, JSON) — bahan langsung untuk P13 (aset milik sendiri): kurva kita
   sendiri bisa dibangkitkan dari parameter, bukan dari citra.
3. **Alat**: `p12-budget.py` (anggaran galat), `p12-filamen.py` (penjejak + aset + uji render),
   `p12-warp-fit.py` (medan geser), `p12-sapu.js` (sapu knob).
4. **Aturan pengukuran** F-170 (tunggu 5 000 ms) dan F-176 (acuan = app asli, bukan deploy kita).

## 6. Langkah berikut: P13 (aset milik sendiri)

Rencana P13 sudah ada di `docs/RENCANA-LANJUTAN.md` §4; yang **berubah** karena hasil hari ini:

- Ukuran paritas pindah dari **MAE piksel vs live** ke **paritas struktur** (siluet IoU, sebaran filamen,
  6 gerbang fase) — karena MAE piksel menuntut menyalin citra live, yang justru dilarang P13.
- Bahan awal P13 sudah ada: 179 rantai filamen + statistik lebar/terang + alat penjejak.
- Angka struktur yang harus dijaga (dari pengukuran hari ini): ridge/baris 33,55 ± 5,02 · jarak antar-ridge
  median 7,0 px · run terang p90 17 px · piksel terang 42,0 % (torso atas) / 33,9 % / 28,0 %.

## 7. Berkas

- `verification/mira/p12-langkah5.json` — hasil tiga percobaan + rekap penutupan
- `verification/mira/p12-filamen-aset-95.json` — **aset 179 rantai** (bahan P13)
- `verification/mira/p12-filamen-render-95.png` — hasil render percobaan 2
- `verification/mira/p12-warp-95.json` — medan geser per baris (semuanya nol)
- Alat: `tools/p12-warp-fit.py`, `tools/p12-filamen.py` (baru), `tools/p12-budget.py`, `tools/p12-sapu.js`
