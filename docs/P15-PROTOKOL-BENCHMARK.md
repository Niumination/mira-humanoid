# P15 — protokol benchmark “setara” (v1, dikunci untuk pengambilan berikutnya)

## Tujuan dan batas klaim

Benchmark memisahkan tiga hal yang sebelumnya mudah tercampur:

1. **Build parity**: kode repo dapat membangun bundel yang sama dengan deploy.
2. **Reproduksibilitas**: dua capture dari build yang sama pada keadaan sama tidak banyak berubah.
3. **Kesetaraan produk**: rekonstruksi dibandingkan dengan referensi asli pada keadaan semantik yang setara.

Lulus 1 atau 2 **tidak** berarti lulus 3. MAE diri bukan MAE terhadap sumber. Setelah plate P13 digambar ulang,
identitas piksel bukan sasaran; ukuran aset/provenance dan siluet/struktur tetap harus diuji.

## Acuan & deploy yang dicatat

| aplikasi | acuan kandidat | deploy rekonstruksi resmi | status acuan |
|---|---|---|---|
| APEX | `https://apex-humanoid.vercel.app/` | `https://niu-humanoid.vercel.app/` | URL merespons; commit/hash bundle wajib dicatat tiap ronde |
| MIRA | `https://mira-humanoid.vercel.app/` | `https://mira-humanoid-niu.vercel.app/` | domain acuan berstatus **legacy/tidak dikonfirmasi sebagai domain resmi**; hasil wajib diberi label kandidat sampai pemilik mengesahkan |

`mira-humanoid.vercel.app` tidak boleh disamakan dengan deploy resmi MIRA kita. Simpan hasilnya di jalur
`mira-legacy`, bukan campur ke hasil perbandingan deploy resmi.

## Setup yang wajib dicatat

- Chromium/Playwright versi dan hash bundel (HTML + JS + aset) untuk keempat URL.
- Viewport CSS: **1440×900, 414×896, 390×844**; DPR **1**; warna sRGB; browser cache baru.
- Lingkungan GPU: Chromium headless + SwiftShader. Ini alat pembanding tetap, bukan klaim mewakili semua GPU.
- Satu profile bersih per aplikasi/viewport; klik Enter hanya bila aplikasi memang menampilkan layar masuk.
- Catat kesalahan console/network, apakah kanvas/WebGL benar-benar menggambar (bukan hanya DOM/UI), dan
  apakah frame kosong/placeholder. Bila salah satu gagal, tandai run **INVALID**, bukan PASS.

## Keadaan animasi & pengulangan

- **MIRA**: anchor nominal `t=4, 8, 11.5, 12.5` detik; `t=8` fase kelahiran, jangan dinilai dengan batas keadaan mantap.
- **APEX**: anchor nominal `t=3, 5, 7, 9, 11`; `t≤7.4` kelahiran, `t≥9` mantap.
- Ambil **3 run independen per anchor × viewport**. Aplikasi kita menggunakan `?t=`; untuk referensi asli, gunakan
  hanya bila pemeriksaan bundle membuktikan query itu benar-benar memaku state. Jangan berasumsi dukungan query.
- Bila referensi tidak mendukung waktu deterministik, jalankan masing-masing 3 sesi cold-start, rekam waktu sejak
  aksi mulai, ambil sequence tiap 250 ms selama 2 s setelah state terdeteksi. Bandingkan distribusi/rentang
  terdekat (median dan IQR), bukan “frame ke-2.5 s” tunggal. Ini diberi label **time-windowed**, bukan exact-frame.
- Metrik sendiri (3 pasang per state) dilaporkan sebagai lantai derau. Untuk metrik lintas produk, gunakan median
  3 run dan rentang; jangan bandingkan satu frame sumber dengan satu frame rekonstruksi secara arbitrer.

## Metrik & status

### A. Integritas/konsistensi (otomatis

- Build repo vs deploy: hash bundel harus sama untuk klaim “build parity”.
- Provenance: **0 plate pihak asli** pada produk yang akan dirilis; plate P13 kita hash cocok dengan deploy.
- Self-reproducibility: pakai ambang gerbang terkontrak (MAE diri dibanding lantai derau acuan, bukan 0).
- A11y/layout/function: seluruh tes kontrak lulus; sertakan bukti JSON.

### B. Kesetaraan visual struktural (per fase & viewport)

- Ukur crop panggung/figur terpisah dari UI dan latar; jangan memakai `L>20` seluruh layar sebagai “siluet” tanpa
  validasi mask, karena glow/backdrop dapat masuk ke mask.
- Ukur: IoU siluet (bila mask tervalidasi), cakupan figur, pusat x/y, bbox aspect ratio, profil luma 32 pita,
  perubahan state/timing, dan keterlihatan fitur utama.
- **Target yang sudah ada**: IoU siluet ≥ **0,98** (P13/P15) untuk bentuk yang memang harus dipertahankan; fungsi/state
  test tidak boleh regresi. Metrik coverage/cx/aspect dilaporkan terhadap acuan per viewport, tidak diberi ambang
  baru sampai mask dan batas ketidakpastian tervalidasi.
- Pixel MAE/SSIM/LPIPS boleh dilaporkan sebagai diagnostik saja. Jangan mengklaim lulus/gagal hanya dari metrik
  piksel setelah aset dan materi visual sengaja dibuat ulang.

### C. “Di depan” (Gerbang E, harus dibuktikan pada perangkat sama)

- E1 avatar kustom: import manifest/plate eksternal tanpa ubah kode.
- E2 performa: median FPS rekonstruksi ≥ **1,5×** sumber, 3 run × ≥60 s, perangkat/viewport/thermal state sama.
- E3 aksesibilitas: gerbang a11y **16/16**.
- E4 recovery: kehilangan lalu pemulihan konteks WebGL otomatis, ≥3 siklus; stabilitas 120 s terpisah.
- E5 offline: cold-load setelah satu kunjungan, jaringan dimatikan, seluruh fungsi wajib bekerja.
- Syarat minimum tetap **3/5 E1–E5**, ditambah syarat lisensi/provenance P15. “Feature ada” tanpa tes tidak dihitung.

## Uji pendahuluan yang sengaja TIDAK dijadikan keputusan

Kalibrasi langsung (`verification/p15/kalibrasi-2026-11/`) memakai alat lama `kalibrasi-paritas.js`.
Pemeriksaan kode menunjukkan konstanta `FREEZE` ada tetapi **tidak pernah dipasang**; alat hanya mengambil dua
gambar berurutan. Capture biasa menunjukkan betapa sensitifnya fase: MIRA resmi rekonstruksi sempat hanya
coverage 1,4% pada desktop (bola/glow awal), sedangkan capture `?t=11.5` memberi coverage 48,7%. Run biasa itu
**INVALID untuk menilai parity**.

Probe dengan query anchor (masing-masing baru satu sesi, bukan benchmark final):

| target / probe | 1440×900 coverage · cx · aspek · MAE diri | 414×896 coverage · cx · aspek · MAE diri | 390×844 coverage · cx · aspek · MAE diri |
|---|---|---|---|
| APEX acuan `apex-humanoid.vercel.app/?auto=1&t=9` | 14,3% · .493 · 1,28 · 17,76 | 12,5% · .484 · .47 · 12,04 | 15,3% · .491 · .46 · 13,07 |
| APEX rekonstruksi `niu-humanoid.vercel.app/?t=9` | 34,4% · .517 · 1,61 · 4,27 | 27,5% · .491 · .46 · 2,00 | 27,7% · .491 · .46 · 1,42 |
| MIRA acuan legacy `mira-humanoid.vercel.app/?auto=1&t=11.5` | 46,1% · .496 · 1,60 · 4,80 | 43,1% · .507 · .46 · 4,92 | 43,9% · .503 · .46 · 5,02 |
| MIRA rekonstruksi resmi `mira-humanoid-niu.vercel.app/?auto=1&t=11.5` | 48,7% · .496 · 1,60 · 0,00 | 50,6% · .541 · .46 · 0,00 | 50,9% · .540 · .46 · 0,00 |

Angka tersebut **diagnostik, bukan putusan setara**: masing-masing satu sesi; “coverage” adalah semua piksel
berluma >20, bukan mask figur tersegmentasi; acuan MIRA berstatus legacy/tidak dikonfirmasi; dan untuk APEX
belum terbukti query `t=9` diterima sumber (noise acuan masih tinggi, MAE diri desktop 17,76). Yang boleh
disimpulkan sementara: MIRA di anchor itu punya coverage/aspek dekat, dengan beda coverage mobile dan posisi x;
APEX rekonstruksi jauh lebih terang/penuh pada mask layar sederhana, tetapi masih perlu mask figur terpisah untuk
memastikan bagian selisih berasal dari backdrop, figur, atau keduanya. Tidak ada klaim lulus/gagal parity yang
dikeluarkan dari tabel ini.

Artefak: `apex-asli.json`, `apex-auto-t9-probe.json`, `apex-rekon-t9.json`, `mira-legacy.json`,
`mira-auto-t115-probe.json`, `mira-rekon-t115.json` dan capture PNG pasangan di `/tmp/kalibrasi-*` (sementara,
tidak menjadi bukti permanen). Run berikutnya harus menambah 3 cold-run serta mask figur tervalidasi.

## Urutan eksekusi

1. Verifikasi query/anchor dengan uji bundle + screenshot; tambah pemeriksaan “scene-ready” per aplikasi.
2. Perbaiki/duplikasi harness agar mendukung anchor dan 3 cold-run; buang run invalid otomatis.
3. Kunci mask/crop siluet dengan anotasi manual satu kali dan hitung IoU antar penilai.
4. Jalankan matriks 2 aplikasi × 3 viewport × 4–5 fase × 3 run; simpan PNG, JSON, hash sumber/deploy, dan log.
5. Nilai kesetaraan struktural terpisah dari fungsi; audit E1–E5 terpisah dari keduanya.

**Status sekarang:** protokol disepakati sebagai v1; baseline baru belum sah karena run eksplorasi memakai alat yang
belum mengunci waktu. Jangan menyebut “setara/di depan” sampai butir 4 dan bukti Gerbang E dipenuhi.
