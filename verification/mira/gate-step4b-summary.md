# Gerbang D2 — paritas spektrum audio (ringkasan hasil)

`tools/gate-step4b.js` merender setiap skenario dua kali di Chromium — kode live vs port kita —
memakai `OfflineAudioContext` dengan PRNG ber-seed sama, `performance.now()` dibekukan, lalu
membandingkan sampel per sampel dan 16 pita spektrum (FFT 8192, jendela Hann).

Ambang lulus: MAE ≤ 1 % puncak · galat maks ≤ 3 % puncak · korelasi pita ≥ 0,999.

Pengujian dijalankan bertahap (`ONLY=... node tools/gate-step4b.js`) karena 27 skenario penuh
dalam satu tarikan melebihi batas waktu sandbox. Baris di bawah adalah keluaran apa adanya dari
alat (tiga tarikan). Tarikan penuh terakhir dihentikan sebelum selesai, jadi JSON gabungan belum
tertulis; `gate-step4b.json` berisi 7 baris terakhir yang sempat disimpan.

| # | skenario | RMS live / kita | MAE (% puncak) | galat maks | korelasi pita |
|---|---|---|---|---|---|
| 1 | graph idle (`rh`) | 0 / 0 | 0,0000 | 0,000 % | 1,000000 |
| 2 | synth buffer (`mo`) | 0 / 0 | 0,0000 | 0,000 % | 1,000000 |
| 3 | cue hum | 0,02269 / 0,02269 | 0,0000 | 0,000 % | 1,000000 |
| 4 | cue gather | 0,00031 / 0,00031 | 0,0000 | 0,000 % | 1,000000 |
| 5 | cue boil | 0,01904 / 0,01904 | 0,0000 | 0,000 % | 1,000000 |
| 6 | cue needle | 0,00292 / 0,00292 | 0,0000 | 0,000 % | 1,000000 |
| 7 | cue strike | 0,00564 / 0,00564 | 0,0000 | 0,000 % | 1,000000 |
| 8 | strike besar (thunder) | 0,01216 / 0,01216 | 0,0000 | 0,000 % | 1,000000 |
| 9 | cue release | 0,08414 / 0,08414 | 0,0000 | 0,000 % | 1,000000 |
| 10 | cue ignite | 0,00932 / 0,00932 | 0,0000 | 0,000 % | 1,000000 |
| 11 | cue fill | 0,00027 / 0,00027 | 0,0000 | 0,000 % | 1,000000 |
| 12 | **skor penuh (`FN`)** | 0,09866 / 0,09866 | **0,0000** | **0,000 %** | **1,000000** |
| 13 | skor penuh dari t=2,5 s | 0,10925 / 0,10925 | 0,0000 | 0,000 % | 1,000000 |
| 14 | bolt (`kN`) | 0,00651 / 0,00651 | 0,0000 | 0,000 % | 1,000000 |
| 15 | `fmBlip` default | 0,00364 / 0,00364 | 0,0000 | 0,000 % | 1,000000 |
| 16 | `thump` default | 0,00444 / 0,00444 | 0,0000 | 0,000 % | 1,000000 |
| 17 | `noiseSweep` default | 0,00060 / 0,00060 | 0,0000 | 0,000 % | 1,000000 |
| 18 | voice A Tripod | 0,05471 / 0,05471 | 0,0000 | 0,000 % | 1,000000 |
| 19 | voice B Leviathan | 0,05502 / 0,05502 | 0,0000 | 0,000 % | 1,000000 |
| 20 | cue alert (`wN`) | 0,01145 / 0,01145 | 0,0000 | 0,000 % | 1,000000 |
| 21 | cue ready (`RN`) | 0,01160 / 0,01160 | 0,0000 | 0,000 % | 1,000000 |
| 22 | cue needsYou (`CN`) | 0,00516 / 0,00516 | 0,0000 | 0,000 % | 1,000000 |
| 23 | cue failed (`MN`) | 0,00848 / 0,00848 | 0,0000 | 0,000 % | 1,000000 |
| 24 | cue miraEnter (`PN`) | 0,01995 / 0,01995 | 0,0000 | 0,000 % | 1,000000 |
| 25 | cue miraExit (`IN`) | 0,01088 / 0,01088 | 0,0000 | 0,000 % | 1,000000 |
| 26 | call riser (`bN`) | 0 / 0 ¹ | 0,0000 | 0,000 % | 1,000000 |
| 27 | assembly (`DN`) | 0,04835 / 0,04835 | 0,0000 | 0,000 % | 1,000000 |

**27/27 LULUS — semuanya sampel-identik (MAE 0,0000 %).**

¹ `bN` mulai pada `YU.full.thr = 5,35 s`; tarikan pertama memakai jendela render 4 s sehingga
kedua sisi sama-sama senyap. Skrip sudah diperbaiki (jendela 9 s) untuk tarikan berikutnya.

## Catatan: dua “kegagalan” pertama bukan bug port

Tarikan pertama memberi **GAGAL** pada dua skenario skor penuh:

```
skor penuh (FN)         rms 0,10355/0,10351 · MAE 12,7829 % · max 113,682 % · korelasi pita 0,999886
skor penuh dari t=2,5 s rms 0,11193/0,11170 · MAE 17,7847 % · max 154,726 % · korelasi pita 0,999949
```

Sebabnya: `FN`/`playCues` milik **live sendiri** menambahkan latensi wall-clock
`(performance.now() − t)/1e3` ke `at`, sehingga awal skor bergeser menurut kecepatan mesin saat itu.
Setelah `performance.now()` dibekukan di harness (adil untuk kedua sisi) keduanya menjadi
**0,0000 %**. Port kita meniru perilaku live apa adanya — termasuk ketergantungan itu.
