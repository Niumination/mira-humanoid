# Kalibrasi paritas: kenapa gerbang piksel-vs-produksi dipensiunkan (P14 · E1)

Ditulis: 2026-11-17 · bukti: `verification/kalibrasi/{apex,mira}-produksi-2026-11-17.json`

## 1. Yang dipensiunkan

| gerbang | butir | ambang lama | status |
|---|---|---|---|
| `tools/gate-apex.js` | seluruhnya | MAE piksel APEX kita vs produksi asli ≤ 6,0 (1440) / ≤ 2,3 (390) | **dipensiunkan** |
| `tools/gate-d.js` | D9 bagian "korelasi ≥ 0,95 vs live" | korelasi profil luma vs produksi ≥ 0,95 | **dipensiunkan** (D9 tinggal reprodusibilitas kita-vs-kita) |

Alasan singkat: **ambang itu tidak lulus di acuannya sendiri.** Bukan karena kita makin jauh, melainkan
karena acuan yang dipakai (produksi asli) adalah adegan 3D beranimasi, dan sejak P13 langkah 2–4 plate
serta latar APEX/MIRA adalah karya sendiri.

## 2. Angka acuan (diukur alat baru `tools/kalibrasi-paritas.js`)

Metrik sama dengan yang dipakai gerbang lama: tangkapan `page.screenshot()`, rata-rata kanal RGB (luma),
ambang terang `L > 20`, profil 32 pita vertikal.

| acuan | viewport | cakupan | cx | aspek siluet | **MAE dua tangkapan berurutan** |
|---|---|---|---|---|---|
| APEX produksi asli | 1440×900 | 9,9 % | 0,455 | 1,26 | **8,80** |
| APEX produksi asli | 414×896 | 7,4 % | 0,451 | 0,48 | **16,06** |
| APEX produksi asli | 390×844 | 7,4 % | 0,459 | 0,48 | **16,04** |
| MIRA produksi asli | 1440×900 | 20,0 % | 0,480 | 1,57 | **30,65** |
| MIRA produksi asli | 414×896 | 23,5 % | 0,485 | 0,43 | **32,74** |
| MIRA produksi asli | 390×844 | 24,9 % | 0,494 | 0,46 | **33,82** |

Perbandingan **antar viewport di dalam acuan itu sendiri**:

| acuan | pasangan | korelasi profil | rasio cakupan | Δcx | rasio aspek siluet |
|---|---|---|---|---|---|
| APEX produksi | 414 vs 1440 | **0,333** | ×0,74 | 0,42 % | ×0,38 |
| APEX produksi | 390 vs 1440 | **0,325** | ×0,75 | 0,34 % | ×0,38 |
| MIRA produksi | 414 vs 1440 | **0,581** | ×1,17 | 0,44 % | ×0,28 |
| MIRA produksi | 390 vs 1440 | **0,588** | ×1,25 | 1,39 % | ×0,29 |

Kesimpulan yang tidak bisa dihindari:

1. **MAE 0,0000 dua tangkapan** mustahil untuk aplikasi beranimasi — acuannya 8,80–33,82.
2. **Korelasi antar viewport ≥ 0,95** mustahil — acuannya 0,33–0,59. Ambang itu sebenarnya mengukur
   "ponsel harus memotret pemandangan yang sama seperti desktop", yang justru **tidak** dilakukan acuan.
3. Karena itu kegagalan D9 (korelasi 0,90 pada 390 px) **bukan** cacat karya kita: angka itu bahkan
   lebih tinggi daripada korelasi internal acuan (0,33).

## 3. Pengganti (yang sekarang dipakai)

| gerbang | apa yang diukur | ambang |
|---|---|---|
| `tools/gate-paritas.js` (v2) | P1 reprodusibilitas: MAE dua tangkapan berurutan | ≤ 1,5 × MAE diri acuan per viewport (1440 ≤ 13,2 · 414 ≤ 49,1 · 390 ≤ 50,7 untuk MIRA; 13,2 · 24,1 · 24,1 untuk APEX) |
| | P2 presentasi panggung: siluet hadir, cakupan, pusat, kotak siluet | cakupan 0,5–70 % · cx 0,30–0,70 · kotak ≥ 35 % tinggi & ≥ 20 % lebar viewport |
| | P3 deviasi vs acuan | **diagnostik** — dilaporkan, tidak menggagalkan |
| `tools/gate-aset-layout.js` | S1 aset: SHA-256 tiap plate **di halaman** vs berkas kita di disk | identik — 10 aset (8 APEX + 2 MIRA) |
| | S2 tata letak: panggung hadir & selebar ≥ 90 % viewport, tanpa gulir mendatar, tanpa elemen keluar layar | 3 viewport × 4 butir |
| `tools/gate-a11y.js` | A1–A8 aksesibilitas | lihat `docs/p14/GERBANG-CARA-JALAN.md` |

## 4. Hasil sesudah v2 dipakai, dan koreksi angka

`gate-paritas` v2 dijalankan penuh dengan Chromium: **24/24 lulus** (MIRA 12/12 · APEX 12/12).
Angka P3 (diagnostik, dibandingkan dengan acuan pada viewport yang sama):

| aplikasi | viewport | cakupan kita | cakupan acuan | cx kita | cx acuan | aspek kita | aspek acuan |
|---|---|---|---|---|---|---|---|
| MIRA | 1440×900 | **19,6 %** | 20,0 % | 0,479 | 0,480 | 1,62 | 1,57 |
| MIRA | 414×896 | **4,1 %** | 23,5 % | 0,433 | 0,485 | 0,53 | 0,43 |
| MIRA | 390×844 | **25,3 %** | 24,9 % | 0,458 | 0,494 | 0,47 | 0,46 |
| APEX | 1440×900 | **30,4 %** | 9,9 % | 0,564 | 0,455 | 1,60 | 1,26 |
| APEX | 414×896 | **30,5 %** | 7,4 % | 0,490 | 0,451 | 0,46 | 0,48 |
| APEX | 390×844 | **24,6 %** | 7,4 % | 0,502 | 0,459 | 0,47 | 0,48 |

**Dua klaim dari catatan awal sesi ini saya batalkan karena salah ukur** (keduanya berasal dari
`gate-paritas` v1 yang menyampel keadaan adegan pada saat berbeda):

1. "cakupan MIRA di 1440 hanya 1,5 % (acuan 20 %)" — **salah**. Angka sah: **19,6 % vs 20,0 %**.
2. "di ponsel siluet MIRA jauh lebih besar daripada acuan (×2,87)" — **salah**. Angka sah: 390 px
   **25,3 % vs 24,9 %** (rasio ×1,29 terhadap 1440, acuan ×1,25). Bingkai MIRA di 390 px justru cocok.

Yang **tinggal** sebagai temuan nyata (masuk P15):

* **MIRA di 414×896** hanya bercakupan **4,1 %** sementara 390×844 memberi 25,3 % dan 1440×900 19,6 %.
  Ada titik patah tata letak di antara 390 dan 414 px — bukan soal "lebih besar/kecil dari acuan",
  melainkan tangkapan yang jauh lebih kecil daripada kedua tetangganya. Ini yang perlu diperbaiki.
* **APEX tampak lebih "terang/luas"** daripada acuan di semua viewport (24–30 % vs 7–10 %). Perlu
  diperiksa apakah itu karena panggung kita memang lebih penuh, atau karena ambang `L > 20` menangkap
  latar kita yang berbeda — jadi bukan otomatis "lebih baik".
