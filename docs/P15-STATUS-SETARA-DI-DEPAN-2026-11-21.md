# P15 — status “setara dan di depan” setelah 6n

## Putusan saat ini

**Belum final.** Kita berhasil menyelaraskan sumber repo APEX dengan build produksi 6l dan membuktikan dua
plate MIRA P13 pada deploy resmi. Itu pencapaian penerapan/reprodusibilitas, bukan bukti bahwa kedua produk
secara keseluruhan sudah setara atau lebih unggul dari sumber asli.

## Bukti sinkronisasi dan penerapan

| sasaran | status yang diperiksa |
|---|---|
| APEX GitHub `main` | commit `fb0e0adad48ccad2de9cdaaa82a1b7c8e6bb422c`; pesan commit menyatakan sinkronisasi 6n, alat v6l, bukti gerbang |
| APEX build dari repo | `npm ci` + `npm run build` lulus; `index-DeDMCu_9.js`, 235 260 B, SHA-256 `873d3b54ea222267` |
| APEX produksi resmi | URL menyajikan bundel dan 10 plate yang sesuai 6l; header HTTP 200 |
| Gerbang repo APEX | bukti commit `verification/gerbang/ringkas-2026-11-21.json`: 7/7; `uji-gerbang.py` 7/7 setelah lingkungan diarahkan ke aset MIRA yang benar |
| MIRA repo | commit `7a50024afcef371ecf6346db867254700357ea43`; dua plate MIRA P13 tersimpan dengan SHA yang diharapkan |
| MIRA deploy resmi | `mira-humanoid-niu.vercel.app`: bundel `index-BiuEEVDg.js` 533 885 B (`17fc09d82f4fd52c`), dua plate cocok; tidak ada file backdrop statis MIRA |
| domain MIRA lain | `mira-humanoid.vercel.app` masih berbeda dan menyajikan plate lama. Statusnya bukan deploy resmi yang tercatat; jangan campurkan metriknya dengan domain resmi tanpa otorisasi/konfirmasi pemilik |

## Arti “setara” yang sekarang dapat dibuktikan

1. **Artefak build:** APEX repo dan APEX produksi byte-identik pada bundel 6l. Ini bukti kuat bahwa repo dapat
   mereproduksi build yang sedang tayang.
2. **Fungsi/ketahanan:** ringkasan gerbang repo 7/7 lulus untuk butir yang dikontrak (server, alat, provenance,
   aset-layout, a11y, paritas, paritas-fase). Ini menjamin kontrak tersebut, bukan semua kemampuan sumber asli.
3. **Visual:** pengukuran reproduktibilitas (`MAE diri`) membandingkan tangkapan aplikasi dengan dirinya sendiri;
   `P3` pada `gate-paritas` adalah diagnostik panggung terhadap acuan lama. Keduanya **bukan** klaim bahwa semua
   piksel sama dengan produk asli. Aset P13 memang karya kita, bukan salinan piksel sumber.
4. **Pengukuran historis MIRA:** roadmap mencatat MAE rata-rata sekitar 2,72 terhadap acuan visual, tetapi sisa
   galat struktural belum nol. Angka tersebut historis dan bukan pengukuran ulang dalam audit ini.
5. **APEX vs sumber asli:** gerbang piksel-vs-produksi lama dipensiunkan karena acuannya sendiri sangat berubah
   akibat animasi/WebGL. Belum ada bukti baru yang membuktikan paritas visual penuh lintas keadaan/viewport.

Jadi frasa yang aman saat ini: **“build repo/produksi tersinkron; kontrak gerbang lulus; kesetaraan visual penuh
belum dibuktikan.”**

## Arti “di depan” menurut kesepakatan P15

`docs/RENCANA-LANJUTAN.md` menetapkan minimal **3 dari 5** kemampuan E1–E5, diukur pada produk nyata.

| butir | ambang proyek | status bukti yang tersedia |
|---|---|---|
| E1 Avatar kustom | pengguna memuat karakter/manifest tanpa mengubah kode | belum ada bukti lulus |
| E2 Performa | ≥1,5× sumber pada perangkat/kondisi sama | catatan lama 0,69 vs 0,62 fps ≈1,11×; **belum mencapai ambang** dan perlu pengukuran terkontrol baru |
| E3 Aksesibilitas | gerbang aksesibilitas | **16/16 lulus** |
| E4 Ketahanan | 120 s + pemulihan konteks WebGL | uji stabilitas lama ada, tetapi bukti lengkap pemulihan konteks belum ada; **belum dihitung lulus** |
| E5 Offline/PWA | muat penuh offline setelah kunjungan awal | belum ada bukti lulus |

Dengan bukti yang ada, hanya E3 yang dapat dihitung lulus. Maka syarat **3/5 belum terpenuhi** dan “di depan”
belum boleh diklaim. Rebranding juga tetap ditahan sampai semua syarat Gerbang E dan keputusan lisensi selesai.

## Pembaruan setelah pemeriksaan 6n dan probe benchmark

- GitHub APEX `main` sekarang `fb0e0adad48ccad2de9cdaaa82a1b7c8e6bb422c`; salinan bersih membangun bundel yang
  sama dengan produksi (`873d3b54ea222267`), dan gerbang ringkasan tercatat 7/7.
- Protokol v1 kini ditulis di `docs/P15-PROTOKOL-BENCHMARK.md`.
- Probe Chromium awal membandingkan APEX/MIRA resmi dengan kandidat acuan; hasil lengkap di
  `verification/p15/kalibrasi-2026-11/ringkas-probe.json`. Ini **diagnostik saja** (1 sesi, mask L>20 bukan mask
  figur; anchor APEX tidak pasti; domain MIRA legacy belum disahkan). MIRA pada anchor nominal tampak dekat dalam
  coverage/aspek; APEX memiliki coverage layar jauh lebih besar, tetapi belum dipisahkan antara figur dan glow latar.
- Ada satu jalur MIRA resmi yang sudah benar; domain legacy masih berbeda. Jangan mencampur hasil kedua domain.

## Urutan lanjutan

1. **Validasi scene-ready dan anchor** per aplikasi. Query MIRA `?t=11.5` memberi scene figur matang; query APEX
   pada kandidat sumber belum tampak deterministik. Perbaiki harness agar capture tidak diterima bila masih di fase
   masuk/bola awal atau hanya UI.
2. **Ambil 3 cold-run** per URL/viewport/anchor dengan mask figur yang tervalidasi (bukan semua piksel L>20), lalu
   bandingkan median dan rentang; simpan PNG, hash JS/aset, console/network log.
3. **Minta konfirmasi domain acuan MIRA legacy** atau tetapkan domain acuan lain yang berwenang.
4. **Tutup E1/E2/E4/E5 atau pilih tiga kemampuan yang realistis**, dengan tes otomatis dan bukti yang dapat diulang.
5. Jalankan ulang gerbang pada commit terbaru, simpulkan “setara/di depan” hanya dari bukti lulus; lisensi/branding
   tetap keputusan terpisah.
