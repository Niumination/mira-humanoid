# Bingkai responsif: angka stabil per viewport, dan apa yang benar-benar boleh disimpulkan

## 1. Masalah yang harus dibereskan lebih dulu: waktu ukur, bukan tata letak

Sepanjang sesi ini, cakupan siluet MIRA di 414×896 dilaporkan **4,1 %** sementara 390×844 memberi 25 %.
Sempat saya sebut "titik patah tata letak antara 390 dan 414 px". **Itu salah.** Yang berubah adalah
**kapan** tangkapan diambil:

| waktu tunggu sebelum tangkapan | cakupan MIRA 414×896 |
|---|---|
| 2,6 s | **0,042** |
| 3,5 s | 0,236 |
| 4,4 s | 0,042 |
| 5,3 s | 0,043 |

Gambar bergerak: animasi kelahiran (birth) belum selesai pada 2,6 s di sandbox SwiftShader (±2,5 fps), dan
tangkapan yang diambil pada fase berbeda menangkap bingkai berbeda. Jadi angka 4,1 % **bukan** sifat tata
letak 414 px.

Sesudah `gate-paritas` v3 (menunggu sampai cakupan dua tangkapan berurutan selisih ≤ 0,5 %):

| aplikasi | 1440×900 | 414×896 | 390×844 |
|---|---|---|---|
| MIRA — uji stabil 3 run (5,9 s) | 0,264 / 0,264 / 0,265 | **0,2636 / 0,2638 / 0,2647** | 0,253 |
| APEX — uji stabil 3 run (8 s) | 0,3277 / 0,3277 / 0,3283 | — | 0,3335 / 0,3339 / 0,3335 |

Catatan: sampel riwayat `ukur.json` pada tabel §2 diukur pada 2,6 s (sebelum perbaikan menunggu), jadi nilainya
sedikit berbeda (MIRA 414 = 0,238 di sampel, 0,264 pada uji stabil). Yang dipakai untuk keputusan adalah
**uji stabil**, dan mulai sekarang `ukur-viewport.py` memakai jalur yang sama (lihat §5).

Sebaran ≤ **0,0019** — cukup untuk dijadikan dasar keputusan.

## 2. Bentuk bingkai sekarang (stabil)

| aplikasi | 1440 | 414 | 390 | pola |
|---|---|---|---|---|
| MIRA | 0,195–0,264 | 0,264 | 0,253 | ponsel **lebih penuh** daripada desktop (± +30 %) |
| APEX | 0,328 | — | 0,334 | ponsel dan desktop **hampir sama** |

Untuk acuan produksi asli (dari `verification/kalibrasi/`): MIRA 0,200 / 0,235 / 0,249 · APEX 0,099 / 0,074 /
0,074. Pola MIRA kita **mengikuti** pola acuan (ponsel lebih penuh); pola APEX kita **berbeda** (acuan jauh
lebih longgar di semua viewport).

## 3. Aturan keputusan (supaya tidak "menambal selera")

1. **Jangan** mengubah bingkai berdasarkan satu tangkapan. Ukur dengan `gate-paritas` v3; kalau sebaran
   antar run > 0,01, ukurannya belum sah.
2. Bingkai dianggap **cacat** hanya bila: siluet keluar viewport (kotak siluet > 100 %), atau cakupan
   < 0,5 %, atau cx di luar 0,30–0,70. Ketiganya sudah menjadi butir gerbang.
3. Perbedaan cakupan **antar viewport** (ponsel lebih penuh) **bukan** cacat: acuan sendiri melakukannya
   (MIRA ×1,25 dari 1440 ke 390).
4. Yang boleh diubah hanya lewat knob bernomor (`F-###`) + satu gerbang berangka sebelum/sesudah; bawaan
   tanpa knob harus tetap byte-identik (aturan lama, tetap berlaku).

## 4. Kerja P15 yang sudah punya angka awal

| # | pekerjaan | angka awal | angka yang dituju |
|---|---|---|---|
| R-1 | APEX: bingkai desktop terlalu penuh dibanding acuan (0,328 vs 0,099) | 0,328 · 0,334 | diputuskan setelah satu uji knob; **bukan** mengejar acuan, tetapi memastikan tidak "menelan" tepi layar |
| R-2 | MIRA: selisih ponsel vs desktop +30 % | 0,264 vs 0,195 | boleh dipertahankan; catat sebagai sifat desain, bukan regresi |
| R-3 | APEX di 414 tidak terukur (tangkapan > 120 s di sandbox) | — | ukur dengan `PW_TIMEOUT=300000`; jalankan sekali lalu simpan |

## 5. Catatan alat

* `HANYA=414x896` membatasi `gate-paritas.js` ke satu viewport (diagnosis cepat).
* `PW_TIMEOUT` dinaikkan (mis. `300000`) untuk viewport ponsel di sandbox ini; tanpa itu tangkapan bisa
  menggantung dan alat berhenti dengan "Target page … has been closed" — itu batas alat, bukan kegagalan app.
* `SHOTS_DIR` memisahkan folder tangkapan supaya beberapa run tidak saling menimpa.
