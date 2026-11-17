# Gerbang fase: cara menjalankan & angka acuan

Gerbang fase (A · B · D sisa · step4c · step5 · step-apex) butuh **Chromium lewat Playwright**.
Sandbox kerja P13 (Debian trixie, pengguna bukan root) **tidak bisa** menjalankan Chromium:
`error while loading shared libraries: libnspr4.so`. Karena itu di sesi-sesi terakhir bukti gerbang
diganti dengan **bundle JS byte-identik** — sah untuk perubahan *aset*, tetapi **bukan** pengganti penuh.

## Satu perintah

```bash
tools/gerbang-semua.sh --pasang      # sekali saja: apt libnspr4 libnss3 … + playwright + chromium
tools/gerbang-semua.sh               # jalankan semua gerbang + tulis bukti
```

Hasil: `verification/gerbang-<tanggal>/<gerbang>.txt` + `RINGKAS.md`.

Variabel yang bisa diubah: `PORT_MIRA` (bawaan 8804) · `PORT_APEX` (8805) · `PW` (lokasi playwright).

## Daftar gerbang & angka acuan terakhir yang LULUS

| gerbang | perintah | target | angka acuan |
|---|---|---|---|
| A MIRA (entry + mode humanoid) | `node tools/gate-mira-a.js http://127.0.0.1:8804` | 8/8 | LULUS 8/8 |
| B MIRA (panel 82/82, 20 seksi, 7 alias) | `node tools/gate-mira-b.js http://127.0.0.1:8804` | 10/10 | LULUS 10/10 |
| D sisa (reproduktibilitas, seam, fps, viewport 390) | `node tools/gate-d.js` | 7/7 | LULUS 7/7 |
| D langkah 4c (audio hidup di aplikasi) | `node tools/gate-step4c.js` | 9/9 | LULUS 9/9 |
| D langkah 5 (state machine + `VN()`) | `node tools/gate-step5.js` | 12/12 | LULUS 12/12 |
| D langkah 5 — bagian Node saja (tanpa Chromium) | `BAGIAN=A node tools/gate-step5.js` | 6/6 | **LULUS 6/6 (diverifikasi sesi ini)** |
| paritas piksel APEX | `BASE=http://127.0.0.1:8805/ node tools/gate-apex.js` | 1440 ≤ 6,0 · 390 ≤ 2,3 | 3,96 · 4,35 (390 belum lulus) |

## Aturan tafsir

1. Gerbang yang **gagal karena Chromium tidak ada** bukan gerbang lulus: laporkan sebagai **BELUM DIUJI**.
2. Perubahan yang hanya menyentuh `public/humanoid/*` boleh dibuktikan dengan **hash bundle JS identik**
   (aset tidak masuk bundel), **asalkan** disebut sebagai bukti pengganti, bukan hasil gerbang.
3. Perubahan `src/` **wajib** gerbang penuh (Chromium) sebelum dinyatakan lulus.
