# P-4 · KESIAPAN REBRANDING (NIU & MIRAI) — daftar periksa berangka

> **Keputusan yang berlaku (dari Anda):** branding **tetap APEX & MIRA** sampai proyek terbukti setara atau
> lebih maju. Dokumen ini **tidak** mengganti merek. Isinya: apa yang sudah siap, apa yang belum, dan angka
> mana yang harus naik sebelum cut-over boleh dilakukan.

## 1. Syarat hukum (Gerbang E) — **LULUS**

| syarat | angka | bukti |
|---|---|---|
| salinan verbatim aset produksi asli | **0** dari 10 | `verification/p13/sidik-tabel.json` (irisan hash asli ∩ kita = 0) |
| plate kita disajikan produksi | APEX **10/10** · MIRA **2/2** | `gate-provenance --live --pola …` |
| ukuran plate (bukan placeholder) | 93–447 kB | `gte-provenance --statis` (ambang ≥ 1 kB) |

Catatan: `p13/asli-sidik.json` yang beredar di repo MIRA versi lama sempat **terbalik** (8 dari 10 baris berisi
hash kita). Sudah diganti dengan tabel yang benar; ini pelajaran: **tabel pembanding adalah bagian dari gerbang**.

## 2. Syarat teknis — **BELUM SEMUA**

| syarat | APEX | MIRA | catatan |
|---|---|---|---|
| kode = produksi (hash bundel) | ✅ produksi `index-DeDMCu_9.js` `873d3b54ea222267` | ✅ `index-BiuEEVDg.js` `17fc09d82f4fd52c` | |
| **repo bisa membangun sendiri** | ❌ repo masih `49e011dd15` (aset 10/10 asli, `a11y.ts` tidak ada) | ✅ (`9059b57e48` + 6i) | **penghalang cut-over** |
| gerbang satu perintah | 8/8 lokal | 8/8 lokal | |
| a11y | 16/16 | 16/16 | |
| aset & tata letak | 34/34 | 34/34 | |
| paritas fase | 4/4 | 4/4 | |
| dokumen deploy | `README-DEPLOY.md`, `vercel.json` ada | sama | |

**Putusan (diperbarui 21 Nov, pasca-6n):** semua syarat teknis §2 kini ✅ di kedua repo. Penghalang build
sudah hilang. Cut-over merek kini menunggu: (a) hasil benchmark setara/di-depan sesuai
`docs/P15-STATUS-SETARA-DI-DEPAN-2026-11-21.md` (belum final — 1/5 kemampuan E terbukti), dan
(b) keputusan lisensi §4 dari pemilik.

## 3. Nama merek: yang harus berubah pada saat cut-over

| tempat | sekarang | saat cut-over | risiko |
|---|---|---|---|
| `<title>` & `<h1 class="sr-only">` | "Apex Humanoid" / "MIRA Humanoid" | "NIU Humanoid" / "MIRAI Humanoid" | gerbang a11y A2 memeriksa judul → perbarui janji di `kontrak.json` |
| `package.json` `name` | `apex-humanoid-rebuild` / `mira-humanoid-rebuild` | `niu-humanoid` / `mirai-humanoid` | build tidak terpengaruh |
| `LICENSE` + `NOTICE` | `SEE LICENSE IN LICENSE` / `UNLICENSED` | lisensi final (lihat §4) | harus satu keputusan, dua repo |
| nama berkas aset | `apex-*`, `mira-*` | **jangan diganti** | mengganti nama = memutus jejak sidik P13; cukup ganti label tampilan |
| URL produksi | `niu-humanoid.vercel.app` / `mira-humanoid-niu.vercel.app` | boleh tetap | domain bukan merek |

## 4. Lisensi — tiga pilihan, satu keputusan

| pilihan | kelebihan | kekurangan | cocok bila |
|---|---|---|---|
| **Proprietary** (semua hak dilindungi) | merek & aset aman; sesuai "hukum mendahului estetika" | tidak bisa dipakai komunitas | produk akan dijual |
| **MIT / Apache-2.0** | adopsi luas, sederhana | pihak lain boleh memakai plate kita | ingin jadi contoh terbuka |
| **Source-available** (mis. BUSL) | kode terlihat, komersial dibatasi | tidak diakui OSI | ingin dilihat tetapi tidak dijual bebas |

Yang **tidak boleh**: membiarkan `LICENSE` kosong sementara merek sudah diganti. Itu membuat status aset ambigu
tepat pada saat aset menjadi identitas merek.

## 5. Urutan cut-over (setelah semua syarat §2 hijau)

1. Terapkan paket APEX → repo bisa `npm ci && npm run build` → **hash bundel cocok** dengan produksi.
2. Jalankan `bash tools/gerbang-semua.sh` di dua repo → **8/8** masing-masing.
3. Ganti `<title>`, `<h1>`, `package.json.name`; perbarui `kontrak.json` (janji a11y A2); jalankan ulang gerbang.
4. Tetapkan lisensi (§4) di **kedua** repo; tambahkan `NOTICE` yang menyebut karya turunan bila ada.
5. Deploy; jalankan `SUMBER=produksi bash tools/gerbang-semua.sh` → **8/8**; catat hash bundel baru.
6. Baru sesudah itu dokumen dan UI boleh menyebut **NIU** dan **MIRAI**.

## 6. Yang **tidak** boleh jadi alasan menunda

* Paritas piksel MIRA (MAE 2,72) — sudah ditutup sebagai plafon arsitektur, bukan syarat merek.
* R-1 (APEX desktop lebih penuh) — sudah dibuktikan sebagai sifat desain, bukan regresi.
* Selisih ponsel vs desktop MIRA (+4,4 %) — sifat desain.
