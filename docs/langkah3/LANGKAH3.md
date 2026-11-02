# Langkah 3 — jam build MIRA (bagian 1–2)

Tanggal: 2026-10-30. Semua angka = `?auto=1&t=<detik>` 1440×900, dibandingkan dengan **app MIRA asli**
(`https://mira-humanoid.vercel.app`, dipakai sebagai ground truth karena itu yang direkam di `recon/`).

## Yang dikerjakan

| # | perubahan | bukti/asal |
|---|---|---|
| 1 | `uBT` rambut/helai/bintik = **jam build** (dulu konstanta 100) | uniform live `uBT 0,9071` pada t≈1,89 |
| 2 | ramp build `iField`/`iMatter` (dulu konstanta 1) | `Tw({waves, matter, orb})` di bundle live |
| 3 | opacity kanvas latar = `min(1, waves·1,6)` | DOM live: 0,064 / 0,604 / 1,0 pada t 0,3 / 1,89 / 9,5 |
| 4 | warna lapisan gambar dikali `filled` (mask reveal) | lihat “akar masalah” |
| 5 | cincin kejut ignition `35/36` + `qN(t)` | uniform live `uShock [574,1008,2204·,0,115]` |

### Akar masalah “figur tampil sejak frame pertama”
Di live, `06-frag` (lapisan gambar) hanya mengalikan **alpha** dengan `filled`; warna tetap keluar. Yang
membuatnya tak terlihat sebelum gelombang reveal adalah **komposisi kanvas ber-alpha (premultiplied)** oleh
browser. Rebuild memakai satu kanvas opaque → warna additive tetap menyembur sejak frame pertama.
Eksperimen yang membuktikan: membaca alpha RT figur lewat `?dbgalpha=1` → alpha ≈ 0 di semua fase
(2/255), jadi meniru premultiply di kanvas tidak menolong (`t=9,5` malah jadi 18,3). Perbaikan yang dipakai:
kalikan **rgb** dengan `filled` di `picColor.frag`.

## Hasil terukur per fase

| t (s) | MAE sebelum | MAE sesudah | >8/255 sesudah | kecerahan build / live |
|---|---|---|---|---|
| 0,3 | 18,05 | **3,19** | 3,6 % | 2,0 / 3,0 |
| 1,89 | 31,61 | **20,06** | 21,4 % | 3,2 / 21,7 |
| 3,5 | 25,12 | **15,27** | 17,9 % | 10,2 / 23,0 |
| 5,5 | 27,16 | **18,46** | 20,3 % | 8,0 / 22,5 |
| 6,8 | 36,52 | **37,25** | 43,1 % | 32,4 / 61,2 |
| 9,5 | **12,53** | **12,53** | 57,2 % | 44,8 / 39,6 |

Tidak ada fase yang memburuk; kondisi mapan (9,5) tidak berubah.

## Sisa yang terukur (pekerjaan berikutnya)

1. **Orb `25/26` (15 kuad) belum ada** — pada 1,89–5,5 live terang (21,7–23,0) sementara rebuild 3–10.
   Ini benda terang yang berpusar sebelum ignition; tanpa lapisan ini fase build selalu gelap.
2. **Kilatan ignition** pada 6,8: live 61,2 vs rebuild 32,4. `qN` sudah masuk; yang belum: `hum.strike.flash`
   pada garis glide `13/14` + percikan orb `33/34`.
3. Sesudah itu: gerbang C (baseline terukur per run).

Berkas gambar: `live-t*.png` (app asli) dan `build6-t*.png` (rebuild) di folder ini.

## Verifikasi di produksi (`mira-humanoid-niu.vercel.app`) — 1 Nov

Bundle produksi `index-DZGcjv2t.js` 401.882 B, sha256 `68b1b5e0a7e7b567…` = build repo HEAD `6829d6a`.

| t (s) | produksi vs live (GT) | produksi vs `build6` (lokal) |
|---|---|---|
| 0,3 | 3,19 (2,0 / 3,0) | **0,00** |
| 5,5 | 18,46 (8,0 / 22,5) | 0,08 |
| 6,8 | 37,24 (32,4 / 61,2) | 0,18 |
| 9,5 | 12,53 (44,8 / 39,6) | 0,14 |

Jadi produksi = kode repo = kondisi kerja (selisih ≤ 0,18 dari tangkapan lokal). Angka terhadap app asli
sama dengan tabel di atas.

## Bagian 3 — salinan materi & `uSettle` (F-81)

Dibaca dari program materi app asli dengan `tools/probe-mira-field.js` (dua konteks WebGL: medan `webgl`
1007×630, figur `webgl2` 1440×900). Nilai live vs rebuild:

| uniform | live | rebuild sebelum | sekarang |
|---|---|---|---|
| salinan utama `uLag`/`uTrail` | 0 / **1** | — (tidak ada salinan utama) | 0 / 1 |
| salinan jejak | 3 × `[0,025·0,55] [0,05·0,32] [0,08·0,16]` | 1 × (0,025·0,55) | 3 × |
| `uSettle` | `0,75 − 0,4·smoothstep(t;0,9;6)` | 0,7109 (konstanta) | rumus live |
| `uLiveT` | = jam build | 0 | = jam build |
| setelah `last+0,5 s` | `drawRange(0, nStay)`, jejak disembunyikan | tidak ada | ada |

| t | MAE sebelum | MAE sesudah | kecerahan build/live |
|---|---|---|---|
| 0,3 | 3,19 | 4,30 | 6,3 / 3,0 |
| 1,89 | 20,06 | **13,92** | 9,6 / 21,7 |
| 3,5 | 15,27 | **9,14** | 22,6 / 23,0 |
| 5,5 | 18,46 | **14,30** | 27,4 / 22,5 |
| 6,8 | 37,25 | **35,45** | 36,8 / 61,2 |
| 9,5 | 12,53 | 12,89 | 45,2 / 39,6 |

## Bagian 4 — empat jam terpisah + orb/gain (F-82)

| hal | live (terukur) | sebelumnya |
|---|---|---|
| jam medan `iTime` saat `?t=` dipin | **0,150** | = jam build |
| jam rambut/helai/bintik | 0,045–0,2 (sendiri) | = jam build |
| jam wajah `uFaceA.z` | 0,2 | 0 |
| orb `uOpacity` | `matter·0,3` | 0,36 tetap |
| orb `uOrbPx`/`uOrbR` | 721,35 / 622,08 · 111,47 @1440×900 | (−9999,−9999) · 1 |
| garis `uGain` | `0,95·(1+1,1·e^(−Δ/1,9))` = 1,1712 @9,5 | 0,95 |

| t | MAE sebelum | sesudah | kecerahan build/live |
|---|---|---|---|
| 0,3 | 4,30 | **3,46** | 5,5 / 3,0 |
| 1,89 | 13,92 | **13,45** | 8,8 / 21,7 |
| 3,5 | 9,14 | **8,55** | 22,1 / 23,0 |
| 5,5 | 14,30 | **13,72** | 26,8 / 22,5 |
| 6,8 | 35,45 | **34,87** | 36,7 / 61,2 |
| 9,5 | 12,89 | **9,89** | 46,7 / 39,6 |

Kelebihan terang pada 9,5 (+7,1) menurut uji `off=…`: gambar 10,0 · garis 6,5 · rambut 5,8 · bloom 4,5 ·
materi 0,4 · pita 0,8 → soal cakupan/komposisi, bukan nilai uniform.
