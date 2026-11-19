# GERBANG-SATU-PERINTAH — cara menjalankan semua gerbang dan cara membacanya

Masalah yang ditutup: sampai 2026-11-18 gerbang dijalankan satu per satu secara manual. Akibatnya beberapa
ronde melaporkan "sudah lulus" padahal hanya sebagian gerbang yang sempat dijalankan, dan lingkungan gerbang
yang rusak sempat lolos sebagai `{"tersedia": false}`.

## 1. Satu perintah

```bash
bash tools/gerbang-semua.sh                     # lokal (repo kerja)
SUMBER=produksi bash tools/gerbang-semua.sh     # memeriksa URL produksi
HANYA=a11y bash tools/gerbang-semua.sh          # satu gerbang (diagnosis)
```

Keluaran akhir: `verification/gerbang/ringkas-<tanggal>.json`.

## 2. Butir gerbang (6)

| # | butir | lulus bila |
|---|---|---|
| 1 | `lingkungan` | `pw/node_modules/playwright` ada (kalau tidak: GAGAL, bukan dilewati) |
| 2 | `server` | `$APEX` dan `$MIRA` menjawab HTTP 2xx — mencegah gerbang Chromium gagal karena sebab yang salah |
| 3 | `provenance` | APEX `apex-*` 7/7 · `backdrop-*` 1/1 · MIRA `mira-*` 2/2 (0 salinan asli) |
| 4 | `aset-layout` | 34/34 (3 viewport × 2 aplikasi) |
| 5 | `a11y` | 16/16 |
| 6 | `paritas` | 24/24 |

## 3. Hasil 2026-11-19

| sumber | putusan | rincian |
|---|---|---|
| repo (lokal) | **LULUS 6/6** | aset-layout **34/34** · a11y **16/16** · paritas **24/24** · provenance LULUS |
| produksi (URL) | **LULUS 6/6** | aset-layout **34/34** (dengan `SUMBER=produksi`) · a11y **16/16** · provenance LULUS · paritas LULUS |

Bukti: `verification/gerbang/ringkas-2026-11-19-repo.json` dan `ringkas-2026-11-19-produksi.json`.

## 4. Dua kegagalan yang ditangkap gerbang ini (dan itu gunanya)

1. **`apex-humanoid-rebuild/public/humanoid` di workspace masih berisi 10 plate ASLI** — provenance repo
   melaporkan 0/7 + 0/1. Diperbaiki dengan plate kita → 7/7 + 1/1.
2. **Server pratinjau menyajikan aset basi** — `vite preview` memakai `dist/` yang dibangun sebelum plate
   diganti; `gate-aset-layout` menangkapnya (`halaman ba1a6d93… · disk 9f7ee35b…`). Perlu `npm run build`
   lalu server dijalankan ulang. Ini sekarang menjadi butir `server` + catatan di dokumen ini.

## 5. Aturan baca

* `RINGKAS: LULUS` hanya bila **semua** butir lulus dan jumlah butir > 0.
* Gerbang yang tidak bisa dijalankan dihitung **GAGAL**. Tidak ada "dilewati".
* Angka tiap butir tetap harus dilaporkan (34/34, 16/16, 24/24) — ringkasan saja tidak cukup.
