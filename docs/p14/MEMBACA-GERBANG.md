# MEMBACA GERBANG — arti tiap angka, dan kapan angka itu bohong

Dokumen ini untuk siapa pun yang membaca laporan gerbang tanpa menjalankannya. Isinya: arti setiap butir,
ambangnya, dan **cara angka bisa menipu**.

## 0. Aturan dasar

1. **Angka atau tidak ada.** "Terlihat mirip" bukan bukti.
2. **Butir yang tidak bisa dijalankan = GAGAL.** Tidak ada "dilewati". (Ini pernah terjadi: lingkungan
   Chromium hilang → alat keluar 0 dengan `{"tersedia": false}` dan dilaporkan sebagai lulus.)
3. **Dua kolom, dua putusan.** Repo dan produksi dinilai terpisah; lulus di satu kolom tidak membuktikan kolom
   lain. Contoh nyata 2026-11-19: repo APEX memuat aset **asli** (0/10) sementara produksi menyajikan plate
   **kita** (10/10).

## 1. Delapan butir (versi 2026-11-19)

| butir | pertanyaan | ambang | cara angka bisa menipu |
|---|---|---|---|
| `lingkaran` | lingkungan gerbang terpasang? | `pw/node_modules/playwright` ada | dulu: tanpa ini alat keluar 0 dan tampak lulus |
| `server` | server pratinjau/URL hidup? | HTTP 2xx | dulu: server mati → gerbang Chromium gagal karena sebab yang salah |
| `uji-alat` | alat gerbangnya sendiri benar? | 6/6 | dulu: tiga bug alat ditemukan kebetulan; sekarang diuji (G1–G6) |
| `provenance` | aset kita, bukan salinan asli? | 10/10 (APEX 7+1, MIRA 2) | **dulu lulus palsu**: 0 berkas diperiksa → "0/0 LULUS" |
| `aset-layout` | aset & tata letak | 34/34 | dulu: dibandingkan dengan berkas repo padahal repo belum memuat paket → 8 aset kita disebut "beda" |
| `a11y` | aksesibilitas | 16/16 | A7 "reduced-motion" pernah gagal karena `a11y.ts` ada tetapi tak dipanggil — itu bug nyata, bukan gerbang rewel |
| `paritas` | reproduktibilitas satu bingkai | 24/24 | dulu APEX diukur tanpa jangkar → Δ cakupan 0,0475; dengan `?t=9` → 0,0048 |
| `paritas-fase` | seluruh animasi | 4/4 per aplikasi | **menangkap 3 bug** yang tidak terlihat oleh satu bingkai (MAE diri 11,88 · rentang 0,0021 · 11,64) |

## 2. Tiga pelajaran dari angka yang menipu

1. **Cakupan 0,90 pada MIRA `?t=8` bukan kegagalan.** Itu fase kelahiran (siluet besar + cahaya belakang).
   Bingkainya diperiksa manual. Gerbang sekarang membedakan `kelahiran` (< total timeline) dan `mantap`.
2. **`?t=` yang membekukan seluruh timeline membuat animasi tampak "tidak bergerak"** (rentang 0,0021). Itu
   bukan bukti aplikasi statis, melainkan bukti jangkar salah desain — dan itulah yang dilaporkan F3.
3. **Acuan yang tidak terukur bukan acuan.** APEX asli di sandbox memberi cakupan 0,0021 (WebGL gagal), jadi
   angka 0,099 hanya boleh dikutip sebagai angka lama, bukan pengukuran baru.

## 3. Ambang yang dipakai (dan mengapa)

| besaran | ambang | alasan |
|---|---|---|
| MAE diri (reproduktibilitas) | ≤ 8 | derau SwiftShader ~3; di atas 8 artinya waktu/frame tidak beku |
| cakupan siluet (mantap) | 0,05–0,70 | di bawah 0,05 = figur hilang; di atas 0,70 = layar penuh (bukan desain) |
| rentang cakupan antar detik | ≥ 0,01 | kalau 0,00 berarti animasi tidak berjalan pada rentang yang diuji |
| lompatan cakupan antar titik mantap | ≤ 0,25 | mencegah "kegagalan" palsu karena transisi state |
| Δ cakupan antar dua run | ≤ 0,01 | ukuran kestabilan; `?t=9` memberi 0,0048, `?auto=1` memberi 0,0475 |

## 4. Cara menjalankan

```bash
bash tools/gerbang-lingkungan.sh && . /home/user/.gerbang-env
/home/user/pw/node_modules/.bin/playwright install --force chromium
bash tools/gerbang-semua.sh                                    # repo
SUMBER=produksi bash tools/gerbang-semua.sh                    # produksi
HANYA=paritas-fase bash tools/gerbang-semua.sh                 # satu butir
```

Keluaran: `verification/gerbang/ringkas-<tanggal>.json` + satu JSON per butir.
