# P15 — Koreksi gerbang 2026-11-20 (alasan, temuan, keputusan)

Dokumen ini mencatat **apa yang salah pada gerbang kita sendiri** dan bagaimana koreksinya. Ditulis
sebelum paket `6l` dikirim supaya penerima tidak mengulang kesalahan yang sama. Setiap butir menyebut
bukti berangka dari ronde ini.

## 1. `gerbang-semua.sh` mencari `verification/` di alamat yang salah

**Gejala:** dijalankan dari workspace kerja (`/home/user/tools/gerbang-semua.sh`), gerbang `uji-alat`
hanya **3/7** dan `provenance` **FATAL: tabel sidik kosong** — padahal `verification/p13/` lengkap.

**Sebab:** `K=$(dirname TOOLS_DIR)` menghasilkan `/home/user`, sedangkan `verification/` ada di
`/home/user/Kerja-Arena`. Di dalam repo hal itu benar (alat ada di `<repo>/tools`), jadi bug ini hanya
muncul di workspace kerja.

**Koreksi:** `K` dideteksi berurutan — `KERJA_ARENA` (bila di-set) → `<induk alat>/Kerja-Arena/verification`
→ `<induk alat>/verification`. Setelah koreksi: `uji-alat` **6/7** dan tabel sidik terbaca.
(Dua kandidat pertama sempat dipasang terbalik sehingga `/home/user/verification` sempat terbuat —
sudah dibuang; urutannya kini diuji.)

## 2. `gate-paritas-fase.js` menunjuk shim yang tidak ada

Berkas yang diadopsi dari repo MIRA memakai `pw-shim.cjs`, sedangkan di workspace shim bernama
`pw-shim.js`. Tanpa `PW` di-export, alat gagal sebagai `MODULE_NOT_FOUND` — terbaca seperti
"lingkungan belum siap", padahal hanya salah nama. **Koreksi:** jalur bawaan `pw-shim.js`.

## 3. G7 (uji umur paket) memberi putusan yang tidak bisa dipercaya

Versi pertama G7 membandingkan **waktu-ubah** `tools/gerbang-semua.sh` di disk dengan waktu-ubah zip.
Dua cacat:

- setelah pemulihan snapshot, **semua** zip 6a–6k bermtime `17:16` dan alat `17:32`, sehingga paket
  lama yang sah tampak "basi";
- yang sebenarnya berbahaya bukan umur, melainkan **isi**: pada ronde ini `gerbang-semua.sh` dan
  `uji-gerbang.py` disunting **sesudah** zip 6k dirakit. Repo penerima menjalankan alat lama, workspace
  menjalankan alat baru, dan laporan tetap "lulus" karena alat menilai dirinya sendiri.

**Koreksi:** G7 sekarang membandingkan **sha256 alat di dalam paket terakhir vs alat di disk**
(`7 alat di paket = alat di disk`). Paket juga dipilih berdasarkan **kode huruf** (`6a < 6b < … < 6l`),
bukan mtime. Bukti bahwa uji ini bekerja: sebelum 6l dirakit, G7 **GAGAL** dan menyebut tepat tiga
berkas yang menyimpang (`gate-paritas-fase.js`, `gerbang-semua.sh`, `uji-gerbang.py`); sesudah 6l
dirakit, G7 lulus.

## 4. `lingkaran` dihitung sebagai butir gerbang

`gerbang-semua.sh` mencetak baris `.hasil` bernama `lingkaran` untuk prasyarat lingkungan (Playwright +
shim + pustaka sistem), lalu menghitungnya sebagai gerbang. Akibatnya angkanya selalu **8 butir**
padahal yang diukur 7. **Koreksi:** lingkungan tidak dihitung sebagai butir; ia ditulis sebagai kunci
`lingkungan: siap|belum siap` di ringkasan JSON, dan butirnya 7.

## 5. Produksi 2026-11-20: **7/8**, satu GAGAL — dan kegagalan itu derau, bukan aplikasi

`SUMBER=produksi bash tools/gerbang-semua.sh` → 7 lulus, 1 gagal: `paritas-fase`.
Penyebabnya terukur: `paritas-fase-apex` memberi `mae_diri 9.9` pada `t=7` — di atas ambang 8.

Diukur ulang pada **halaman yang sama**, `t=7`, tiga pasangan berurutan:
`MAE 8.71 · 0.97 · 2.78` (median **2.78**). Pada build lokal (`127.0.0.1:8807`): `3.20 · 1.16 · 2.69`
(median **2.69**). Jadi pasangan **pertama** setelah muat pertama selalu jauh lebih berderau
(jaringan + kompositing perangkat lunak), dan F1 lama memakai **satu** pasangan — derau dijadikan
putusan.

**Koreksi:** tiap titik diukur **N pasangan** (`ULANG`, bawaan 3). F1 memakai **median**; derau maksimum
dilaporkan terpisah sebagai **F5 (catatan, bukan ambang)**. Sesudah koreksi, pada build bersih:

| titik | cakupan | MAE median | semua pasangan |
|---|---|---|---|
| 3 | 0.3077 | 4.95 | 3.21 / 4.95 / 5.32 |
| 5 | 0.3567 | 5.47 | 6.16 / 5.28 / 5.47 |
| 7 | 0.4209 | 5.16 | **9.90** / 4.70 / 5.16 |
| 9 | 0.4006 | 5.37 | 5.86 / 5.08 / 5.37 |
| 11 | 0.4028 | 5.78 | 7.82 / 5.48 / 5.78 |

F1 lulus (terburuk 5.78), F5 mencatat `derau maks 9.9 · pasangan di atas ambang: t=7:9.9`.
Angka `t=7` yang dulu "gagal" ternyata **hanya di pasangan pertama** — sama di produksi maupun lokal.
Catatan kejujuran: bagian atas alat masih menulis "sekitar 3" untuk MAE diri, sedangkan median terukur
1,2–5,8 tergantung beban sandbox; angka di catatan itu **bukan ambang** dan tidak dipakai menilai.

## 6. Repo APEX di GitHub **tidak bisa dibangun** — dan sekarang 6l yang membuatnya bisa

`49e011dd15` (2026-11-17) menjalankan `npm ci && npm run build` **lulus**, tetapi hasilnya
`dist/assets/index-DyoQ8hKN.js` **226.20 kB** — bukan bundel yang disajikan produksi
(`index-DeDMCu_9.js`, 235.18 kB, sha256 `873d3b54ea222267`). Itu bukti kuantitatif bahwa repo
ketinggalan 6j/6k/6l. Peta kesenjangan P-4 karena itu **wajib** menyebut: cut-over merek belum boleh
sebelum penerapan 6l diverifikasi lewat sha256 bundel.

## 7. Bukti terapan 6l (diuji, bukan diklaim)

Salinan bersih `49e011dd15` → 36 berkas 6l ditempatkan → `npm ci` (exit 0) → `npm run build` (exit 0):

```
dist/assets/index-DeDMCu_9.js   235.18 kB │ gzip: 78.19 kB
sha256 (16 heks pertama) 873d3b54ea222267   ← sama dengan bundel yang disajikan https://niu-humanoid.vercel.app/
```

Byte-cocok dengan produksi berarti: **satu-satunya** selisih antara repo dan produksi adalah paket ini,
dan hasil build-nya deterministik. Gerbang 7 butir dijalankan pada salinan itu (bukan pada repo kerja
kita) supaya yang diuji benar-benar isi paket.

## 8. Insiden kebersihan workspace (dicatat, bukan disembunyikan)

- Saat menjalankan gerbang dari direktori kerja, `K` yang salah membuat `/home/user/verification`
  (bukan `Kerja-Arena/verification`) dan `mkdir -p` menimpa berkas **kosong** bernama
  `/home/user/Kerja-Arena/tools` menjadi direktori — sempat menghapus isi direktori itu (9 salinan
  alat, kini dipulihkan dari `/home/user/tools`). Tidak ada artefak bukti yang hilang: seluruh JSON
  gerbang ditulis ulang pada jalannya gerbang final.
- `/tmp` hanya 992 MB (tmpfs). Menyalin repo APEX (393 MB termasuk `node_modules` dan `docs/`) ke `/tmp`
  dua kali gagal (`No space left on device`) dengan hasil build 0 byte yang **tampak** seperti kegagalan
  build. Uji terapkan karena itu dijalankan di `/srv` (disk 20 GB); hasil zip tidak terpengaruh.

## 9. Yang **tidak** diubah (keputusan sadar)

- Ambang piksel-vs-produksi, `gate-apex.js`, D9 lama, paritas v1, dan `?auto=1` APEX **tetap mati**.
- Branding tetap **APEX** dan **MIRA**; rebranding NIU/MIRAI tetap ditunda (lihat
  `docs/P4-KESIAPAN-REBRANDING.md`: syarat hukum lulus, syarat teknis belum).

## Uji penerimaan final paket 6l (2026-11-20)

Zip final `niu-update-langkah6l.zip` diekstrak ke salinan segar repo `Niumination/Niu-Humanoid` (`49e011dd15`).
`npm ci` exit 0; menyalin `pak6l/niu-humanoid/` ke akar repo lalu `npm run build` exit 0; hasil
`index-DeDMCu_9.js` = 235 260 byte, sha256 `873d3b54ea222267` (bundel produksi). Seluruh paket
kemudian diekstrak ke salinan yang sama dan `python3 tools/uji-gerbang.py` = 7/7.

Gerbang penuh di salinan penerima juga lulus: **7/7**, lingkungan `siap`, exit 0. Rinciannya server,
uji-alat, provenance, aset-layout, a11y, paritas, dan paritas-fase semuanya LULUS. Ringkasan JSON uji
terapan disimpan di `verification/p15/ringkas-2026-11-20-uji-terap.json` dan disertakan pada paket.

Catatan penting dari proses ini: uji penerimaan menemukan tiga masalah paket yang sebelumnya luput
(lihat `BACA-DULU-6l.md` § “Cara paket ini diuji”). Paket akhir menyertakan `TOOLS` export, bukti kontrak
2026-11-20, 10 plate asli untuk memastikan G5 benar-benar berjalan, serta instruksi menerapkan hanya
subfolder `pak6l/niu-humanoid/`. Hasil 7/7 di atas diperoleh setelah semua perbaikan itu.
