# Gerbang fase: cara menjalankan & angka acuan (revisi P14)

Menggantikan `docs/p13/GERBANG-CARA-JALAN.md`. Perubahan besar: Chromium **bisa** dijalankan di sandbox
(tanpa root) lewat `tools/gerbang-lingkungan.sh`, jadi tidak ada lagi gerbang berstatus "BELUM DIUJI"
hanya karena pustaka kurang.

## 0. Sekali per sandbox

```bash
tools/gerbang-lingkungan.sh      # unduh 10 .deb → ekstrak ke /home/user/sysroot, pasang playwright
                                 # + chromium headless-shell, tulis /home/user/.gerbang-env
. /home/user/.gerbang-env        # LD_LIBRARY_PATH · PLAYWRIGHT_BROWSERS_PATH · PW · PW_ASLI
```

Skrip idempoten: kalau `/home/user/.gerbang-env` sudah ada dan Chromium hidup, ia tidak memasang apa pun.
Chromium **penuh** (`chrome-linux64/chrome`) tetap tidak bisa hidup di sandbox ini — yang dipakai
`chromium_headless_shell`.

## 1. Satu perintah untuk semua gerbang

```bash
tools/gerbang-semua.sh                      # siapkan (bila perlu) + jalankan semua gerbang
tools/gerbang-semua.sh --siapkan            # hanya lingkungan
PORT_MIRA=8804 PORT_APEX=8805 tools/gerbang-semua.sh
```

Keluaran: `verification/gerbang-<YYYY-MM-DD>/{<gerbang>.txt,RINGKAS.md}`.
Variabel: `PORT_MIRA` (8804) · `PORT_APEX` (8805) · `KERJA` (`/home/user/Kerja-Arena`) · `PW`.

## 2. Daftar gerbang & angka acuan terakhir yang LULUS (Chromium nyata)

| gerbang | perintah | target | angka terakhir |
|---|---|---|---|
| A MIRA (entry + mode humanoid) | `node tools/gate-mira-a.js http://127.0.0.1:8804` | 8/8 | 8/8 |
| B MIRA (82 slider · 20 seksi · 7 alias · `?dial.*` · localStorage) | `node tools/gate-mira-b.js http://127.0.0.1:8804` | 10/10 | 10/10 |
| D sisa (reprodusibilitas, seam, fps, stabilitas 120 s, viewport) | `node tools/gate-d.js` | 7/7 | 7/7 (D9 kini hanya reprodusibilitas) |
| step4c (audio hidup di aplikasi) | `node tools/gate-step4c.js` | 9/9 | 9/9 (36 cue, 12,550 s) |
| step5 (state machine + `VN()`) | `node tools/gate-step5.js` | 12/12 | 12/12 |
| step5 — bagian Node saja (tanpa Chromium) | `BAGIAN=A node tools/gate-step5.js` | 6/6 | 6/6 |
| paritas v2 (MIRA + APEX × 3 viewport) | `node tools/gate-paritas.js --json …` | 24/24 | **24/24** (MIRA 12/12 · APEX 12/12) |
| aset & tata letak (10 SHA-256 + 3 viewport × 4) | `node tools/gate-aset-layout.js --json …` | 34/34 | **34/34** |
| aksesibilitas (A1–A8 × 2 aplikasi) | `node tools/gate-a11y.js --json …` | 16/16 | **16/16** |
| kalibrasi acuan (diagnostik, bukan gerbang) | `node tools/kalibrasi-paritas.js --nama X --base URL --json …` | — | lihat `verification/kalibrasi/` |

**Dipensiunkan:** `tools/gate-apex.js` (MAE piksel vs produksi asli) dan bagian "korelasi ≥ 0,95 vs live"
pada `gate-d.js` D9. Dasarnya berangka: `docs/p14/KALIBRASI-PARITAS.md`.

## 3. Aturan tafsir (tetap berlaku)

1. Gerbang yang gagal karena Chromium/pustaka tidak ada = **BELUM DIUJI**, bukan lulus.
2. Perubahan yang hanya menyentuh `public/humanoid/*` boleh dibuktikan dengan **hash bundle JS identik**
   (aset tidak masuk bundel), asalkan disebut sebagai bukti pengganti.
3. Perubahan `src/` **wajib** gerbang penuh (Chromium).
4. Renderer SwiftShader di sandbox ini ±2,5 fps. Klik bisa butuh 30 s (pakai `PW=tools/pw-shim.js`
   yang menaikkan batas waktu halaman & konteks) dan `dt` per frame dibatasi 0,05 s — jadi gerbang yang
   mengukur **laju** harus mengukur per frame, bukan per milidetik dinding
   (contoh: `tools/probe-listen-frame.js`).
5. Alat baru **wajib** memakai `PW=tools/pw-shim.js`; halaman dari `browser.newContext()` juga harus
   lewat shim, kalau tidak `page.screenshot` bisa menggantung.

## 4. Angka lingkungan yang perlu dicatat saat membaca hasil

| hal | angka |
|---|---|
| fps aplikasi kita di sandbox (SwiftShader) | 2,49 (acuan live 1,29 pada lingkungan sama) |
| waktu klik panel MIRA | ± 30 s/tombol |
| panjang audio step4c | 12,550 s · 36 cue · RMS 5,37e-4 |
| build APEX | `index-Crb4yBDw.js` 234,33 kB (gzip 77,91) |
| build MIRA | lihat `verification/gerbang-<tgl>/` (hash dicatat per paket) |
