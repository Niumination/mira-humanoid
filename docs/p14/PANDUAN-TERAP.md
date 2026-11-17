# Panduan terapkan paket 5s → 5y ke repo upstream (untuk kamu, sang penerap)

Ditulis: 2026-11-17 · berlaku untuk: `Niumination/Niu-Humanoid` (APEX) dan `Niumination/mira-humanoid` (MIRA)

## 0. Peta: berkas paket → tujuan di repo

Setiap zip berisi satu folder `pak<kode>/` yang **mencermin tata letak repo**, dengan satu tambahan:
paket yang menyentuh **kedua** aplikasi menaruh `src/` di bawah nama repo masing-masing.

| isi paket | tujuan |
|---|---|
| `pak<kode>/tools/…` | `tools/…` (di repo kerja, sama untuk kedua aplikasi) |
| `pak<kode>/docs/…` | `docs/…` |
| `pak<kode>/verification/…` | `verification/…` |
| `pak<kode>/PROGRESS.md`, `STATUS-ROADMAP.md` | akar repo kerja |
| `pak<kode>/niu-humanoid/src/…` | `src/…` di repo **Niu-Humanoid** (APEX) |
| `pak<kode>/mira-humanoid/src/…` | `src/…` di repo **mira-humanoid** (MIRA) |

Tidak ada berkas yang perlu dihapus oleh paket-paket ini. Yang **dipensiunkan** hanya *peran* dua alat
(`gate-apex.js`, bagian D9 di `gate-d.js`) — berkasnya tetap ada sebagai arsip.

## 1. Urutan penerapan

```
5s → 5t → 5u → 5v → 5w → 5x → 5y
```

Kalau 5s/5t/5u sudah masuk, lanjut dari **5v**. Jangan lompat ke 5x sebelum 5v: 5x memakai lingkungan
Chromium dari 5v untuk membuktikan hasilnya.

## 2. Langkah per paket

```bash
# 1. periksa isi sebelum menimpa
unzip -l ~/niu-update-langkah5v.zip

# 2. terapkan (dari akar repo kerja)
unzip -oq ~/niu-update-langkah5v.zip -d /tmp/pak5v
rsync -a --exclude 'niu-humanoid/' --exclude 'mira-humanoid/' /tmp/pak5v/pak5v/ ./
rsync -a /tmp/pak5v/pak5v/niu-humanoid/ /path/ke/Niu-Humanoid/
rsync -a /tmp/pak5v/pak5v/mira-humanoid/ /path/ke/mira-humanoid/

# 3. buktikan kesetaraan (tidak boleh ada yang "hampir sama")
cd /path/ke/mira-humanoid && npm ci && npx tsc --noEmit && npm run build
sha256sum dist/assets/index-*.js     # harus sama dengan tabel di BACA-DULU paket itu
```

Setelah 5v masuk, siapkan lingkungan gerbang **sekali**:

```bash
tools/gerbang-lingkungan.sh
. /home/user/.gerbang-env
tools/gerbang-semua.sh
```

## 3. Sesudah `vercel deploy`

```bash
bash tools/periksa-produksi.sh            # harus: kesegaran build 2/2 + plate 10/10 identik
bash tools/periksa-produksi.sh --gerbang  # + gate-aset-layout & gate-a11y DI URL PRODUKSI
```

Tiga tingkat lulus yang saya pakai untuk menilai klaim "sudah terpasang":

| tingkat | alat | arti |
|---|---|---|
| 1. aset segar | `periksa-produksi.sh` lapis A–D | HTML produksi menunjuk aset yang sha256-nya sama dengan build kita, dan 10 plate identik |
| 2. gerbang lulus di URL produksi | `periksa-produksi.sh --gerbang` | aset/tata letak/a11y benar **di produksi**, bukan hanya di localhost |
| 3. gerbang fase | `tools/gerbang-semua.sh` | A/B/D/step4c/step5/paritas semuanya berangka |

## 4. Kalau ada yang gagal

| gejala | arti | tindakan |
|---|---|---|
| `periksa-produksi.sh` → "BELUM MEMUAT PAKET INI" | produksi masih build lama | normal sebelum deploy; deploy dulu |
| plate `⏳ … ≠` | `public/humanoid/*` belum ikut terunggah | pastikan berkas ada di repo sebelum build; Vercel hanya mengunggah yang ada di repo |
| `gate-mira-a` gagal di butir teks | ada teks baru yang tidak ada di live | cek apakah teks itu **terlihat**; yang tersembunyi (`.sr-only`) memang disaring alat |
| klik panel MIRA ter-time-out | renderer lambat (SwiftShader), bukan bug | pakai `PW=tools/pw-shim.js`, ulangi; kalau perlu ukur per frame |
| `libnspr4.so` / `Cannot find module playwright` | lingkungan gerbang belum siap | `tools/gerbang-lingkungan.sh` |

## 5. Rollback

Semua paket hanya menambah/menimpa berkas; tidak ada migrasi data. Rollback = `git checkout -- <berkas>`
atau `git revert <commit paket>`. Untuk 5x, rollback `src/` otomatis mengembalikan perilaku lama
(`<main>` dan `.sr-only` hanya tambahan; bar debug APEX kembali melebar di ponsel).
