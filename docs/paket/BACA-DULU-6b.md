# BACA-DULU-6b — Riwayat per aplikasi + tulang punggung anggaran build

tanggal: 2026-11-18 · dasar: paket 6a

## 1. Kenapa paket ini ada

Sesi ini workspace harus **dipulihkan ke keadaan upstream** setelah audit 5z (APEX tertinggal). Begitu itu
dilakukan, seluruh angka acuan lama kehilangan rujukannya: kita hanya bisa bilang "sekarang begini", tidak
bisa bilang "dulu begini". Padahal justru selisihnya yang menangkap kemunduran.

Paket ini memindahkan riwayat dari **workspace** ke **aplikasi**, lalu menambahkan **anggaran mutlak** yang
tidak bergantung pada acuan mana pun.

## 2. Isi

| berkas | fungsi | status |
|---|---|---|
| `tools/ukur-build.py` | simpan satu build sebagai sampel riwayat aplikasi + periksa anggaran (gzip, ukuran mentah, jumlah berkas JS). Sampel **tidak pernah ditimpa** | **baru** |
| `tools/ukur-viewport.py` | ukur satu URL pada 1440×900 · 414×896 · 390×844: cakupan, cx, cy, kotak siluet, aspek, **MAE diri**, jumlah error halaman | **baru** |
| `docs/p14/PETA-REGRESI.md` | tata letak riwayat, anggaran, aturan pemakaian | **baru** |
| `verification/riwayat/{apex,mira}/indeks.json` | daftar sampel (terbaru di atas) | **baru** |
| `tools/gate-paritas.js` | **v3**: menunggu adegan stabil (cakupan dua tangkapan berurutan selisih ≤ 0,5 %) sebelum mengukur | berubah |
| `docs/p14/BINGKAI-RESPONSIF.md` | bingkai per viewport dengan angka stabil + aturan keputusan | **baru** |

## 3. Sampel pertama — keadaan upstream apa adanya (titik nol jujur)

| aplikasi | aset | sha256 | mentah | gzip | provenance | 1440 | 414 | 390 |
|---|---|---|---|---|---|---|---|---|
| APEX | `index-Crb4yBDw.js` | `015740c8` | 234 405 B | 77 586 B | **0/10 milik kita** (10 salinan asli) | cakupan 0,309 · cx 0,531 | 0,248 · 0,550 | 0,356 · 0,499 |
| MIRA | `index-BiuEEVDg.js` | `17fc09d8` | 533 885 B | 129 917 B | **2/2 milik kita** | 0,195 · 0,479 | 0,238 · 0,462 | 0,253 · 0,458 |

MAE diri (dua tangkapan berurutan, viewport sama): APEX 7,45 / 8,89 / 19,26 · MIRA 4,87 / 8,36 / 7,30.
Bukti: `verification/riwayat/<app>/2026-11-18-<sha8>/{meta.json,ukur.json}`.

Catatan kejujuran soal sampel APEX: yang **byte-identik dengan produksi** adalah build tarikan upstream
`index-DyoQ8hKN.js` `8dac8dada237a264` (226 278 B). Sampel riwayat `015740c8` lahir dari build **workspace**
sesudah `src/main.tsx` & `src/index.css` dipulihkan ke upstream, sementara `HumanoidMode.tsx` di workspace
masih memuat F-164 (belum dipulihkan seluruhnya). Perbedaan itu dicatat eksplisit di `meta.json`
(`sumber: upstream`, `catatan_penting`), tidak disembunyikan.

## 4. Anggaran (gagal keras bila lewat)

| ukuran | APEX | MIRA | sekarang |
|---|---|---|---|
| gzip JS | ≤ 90 kB | ≤ 150 kB | 77,6 kB · 129,9 kB |
| JS mentah | ≤ 280 kB | ≤ 620 kB | 234 kB · 534 kB |
| jumlah berkas JS | 1 | 1 | 1 · 1 |

## 5. Koreksi yang ikut di paket ini: `gate-paritas` **v3**

Diagnosis "MIRA patah di 414×896 (cakupan 4,1 %)" **saya batalkan**: itu artefak **waktu tunggu**, bukan tata
letak. Diukur pada viewport 414×896:

| waktu tunggu | cakupan |
|---|---|
| 2,6 s (versi v2) | **0,042** |
| 3,5 s | 0,236 |
| 4,4–5,3 s | 0,042–0,043 |

Artinya pada detik ke-2,6 animasi kelahiran belum selesai (sandbox SwiftShader ±2,5 fps). Gerbang sekarang
**menunggu sampai stabil**: cakupan dua tangkapan berurutan selisih ≤ 0,5 % (maks 12 tangkapan). Sesudah
perbaikan, tiga run memberi cakupan 0,2636 / 0,2638 / 0,2647 (**rentang 0,0011**) — bisa dipertanggungjawabkan.

Yang **masih** benar sebagai temuan: dengan pengukuran stabil, MIRA 414×896 = **0,264** vs 390×844 = **0,253**
dan 1440×900 = **0,195** — ponsel lebih penuh, dan itu masuk P15 sebagai keputusan bingkai, bukan bug.

## 6. Cara pakai

```bash
python3 tools/ukur-build.py --aplikasi apex --dir /path/apex --sumber upstream --commit <sha> \
        --url http://127.0.0.1:8805/
python3 tools/ukur-build.py --aplikasi apex --bandingkan     # Δ terhadap sampel sebelumnya
```

## 7. Tambahan penting — kriteria "stabil" yang pertama masih bocor (dikoreksi di paket ini)

Versi pertama v3 memakai **dua** tangkapan berurutan. Run penuh pertama memberi MIRA 1440×900
**cakupan 0,507** dengan MAE diri **48,63** → dua butir gerbang gagal. Sesudah diperiksa, itu **bukan**
regresi aplikasi: renderer SwiftShader membeku di satu bingkai (kelaparan frame), dua tangkapan jadi sama
padahal adegan masih di tengah animasi.

Kriteria sekarang (**v3b**) memakai dua syarat sekaligus:

1. sudah lewat **≥ 8 s** sejak mulai, dan
2. cakupan **3 pembacaan berurutan** selisihnya ≤ 0,5 % (jadi minimal **4** tangkapan, bukan 2).

Angka pembanding yang mendukung: pengukuran per frame menunjukkan animasi baru tenang sekitar 11,5 s pada
lingkungan normal; `MAE diri` untuk MIRA di 1440 memang bisa 4,87 (run baik) sampai 48,63 (run yang
menangkap fase gerak) — jadi MAE diri **hanya sah** kalau kriteria stabil benar-benar terpenuhi.

Pelajaran umum yang saya bawa ke paket-paket berikutnya: **setiap gerbang yang memakai waktu harus punya
kriteria "sudah tenang" yang tidak bisa dipenuhi oleh renderer yang membeku.**

## Isi paket & sha256 (8 heks pertama) — 11 berkas

| berkas | sha256 | byte |
|---|---|---|
| `tools/ukur-build.py` | `537d093e` | 6350 |
| `tools/ukur-viewport.py` | `1a9f988b` | 5333 |
| `tools/gate-paritas.js` | `8005b6db` | 11841 |
| `docs/p14/PETA-REGRESI.md` | `373b9c89` | 2685 |
| `docs/p14/BINGKAI-RESPONSIF.md` | `2323a9ca` | 3724 |
| `verification/riwayat/apex/indeks.json` | `062059d7` | 238 |
| `verification/riwayat/apex/2026-11-18-015740c8/meta.json` | `c9492470` | 954 |
| `verification/riwayat/apex/2026-11-18-015740c8/ukur.json` | `5992553f` | 3269 |
| `verification/riwayat/mira/indeks.json` | `02fdaa5b` | 239 |
| `verification/riwayat/mira/2026-11-18-17fc09d8/meta.json` | `596db761` | 777 |
| `verification/riwayat/mira/2026-11-18-17fc09d8/ukur.json` | `5839d1bf` | 3230 |
