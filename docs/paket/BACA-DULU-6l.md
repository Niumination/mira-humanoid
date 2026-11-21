# BACA DULU — paket `6l` (APEX: kode final + 10 plate + alat gerbang yang sudah dikoreksi + bukti 2026-11-20)

**Paket ini besar (58 berkas) dan menerapkan kode APEX yang sudah hidup di produksi.** Bundel yang
dihasilkan paket ini **byte-cocok** dengan yang disajikan https://niu-humanoid.vercel.app/ — jadi ini bukan
percobaan, ini penyelarasan repo dengan kenyataan.

## Ringkas dalam 8 baris

1. `niu-humanoid/` = repo `Niumination/Niu-Humanoid` (`49e011dd15`). Paket ini menaruh 9 berkas kode,
   `package.json`, dan 10 plate ke dalamnya.
2. Hasil `npm ci && npm run build` di salinan bersih repo: exit 0, `dist/assets/index-DeDMCu_9.js`
   **235.18 kB**, sha256 (16 heks) **`873d3b54ea222267`** = sama dengan bundel produksi.
3. Perbaikan APEX yang ikut masuk: `t = tPin`, `lewatiKelahiran` hanya bila `tPin ≥ 7,4`,
   `dt = tPin !== null ? 0 : dt`, argumen waktu butiran memakai `tPin`. Tanpa ini, `?t=` tidak beku.
4. Alat gerbang dikirim dalam versi **setelah koreksi**: `gerbang-semua.sh` (akar `verification/` benar,
   lingkungan tidak dihitung sebagai butir, `TGL` bisa dipaksa), `uji-gerbang.py` (G7 = sha256 alat di
   paket vs di disk), `gate-paritas-fase.js` (shim `pw-shim.js`, **median 3 pasangan** + F5 derau).
5. Bukti 2026-11-20 disertakan apa adanya: ringkas uji-terap 7 butir, paritas 24/24, a11y 16/16,
   aset-layout, uji-alat, paritas-fase APEX/MIRA (median) **dan** versi lama satu-pasangan sebagai
   pembanding derau.
6. **Produksi 2026-11-20: 7/8** dengan satu GAGAL (`paritas-fase`, `MAE 9.9` di `t=7`). Kegagalan itu
   **derau muat pertama**, bukan cacat aplikasi: diukur ulang 3 pasangan pada halaman yang sama →
   `8.71 / 0.97 / 2.78` (median 2.78). Alat lama memakai satu pasangan = derau jadi putusan.
7. Yang **tidak** diubah: ambang piksel-vs-produksi, `gate-apex.js`, D9 lama, paritas v1, `?auto=1` APEX
   tetap mati; branding tetap APEX/MIRA (rebranding ditunda — lihat `docs/P4-KESIAPAN-REBRANDING.md`).
8. Repo APEX **belum bisa** membangun bundel produksi sebelum paket ini (`index-DyoQ8hKN.js` 226.20 kB).
   Karena itu cut-over merek belum boleh, dan `docs/P15-KOREKSI-GERBANG.md` mencatatnya sebagai penghalang.

## Cara menerapkan (urut, jangan pilih sebagian)

```bash
# 1. dari akar repo Niu-Humanoid
unzip -o niu-update-langkah6l.zip -d /tmp/6l
cp -a /tmp/6l/pak6l/. .

# 2. buktikan byte-nya, jangan percaya klaim
npm ci && npm run build
sha256sum dist/assets/index-*.js        # harus 873d3b54ea222267…  (235260 byte)

# 3. jalankan gerbang pada build itu (bukan pada build lama)
npx vite preview --host 0.0.0.0 --port 8807 &
(cd ../mira-humanoid && npx vite preview --host 0.0.0.0 --port 8804 &)   # MIRA tetap versi repo MIRA
bash tools/gerbang-semua.sh             # 7 butir; ringkasan di verification/gerbang/ringkas-<tgl>.json
python3 tools/uji-gerbang.py            # 7/7 setelah paket ini ada (G7 membandingkan alat di paket)
bash tools/gerbang-semua.sh             # ulang: G6/G7 baru lulus setelah zip 6l ada di ~/
```

Catatan: `gerbang-semua.sh` kini menulis **7 butir** (dulu 8 karena `lingkungan` ikut dihitung); lingkungan
muncul sebagai kunci `lingkungan: siap|belum siap` pada ringkasan JSON.

## Berkas mana untuk apa

| kelompok | berkas | catatan |
|---|---|---|
| kode APEX (9) | `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/components/{Backdrop,HumanoidMode}.tsx`, `src/lib/{a11y,bloomGL,render}.ts` | `src/lib/a11y.ts` **baru** (tidak ada di repo) |
| manifest | `package.json` | nama paket belum di-rebrand (lihat P-4) |
| plate (10) | `public/humanoid/apex-*.webp` (7), `backdrop-v1.webp`, `mira-hair-v1.webp`, `mira-idle-v1.webp` | asli hasil P13; `verification/p13/asli-sidik.json` + `sidik-tabel.json` membuktikan **0 dari 10** salinan asli |
| alat (6) | `tools/{gate-provenance.py, gate-paritas-fase.js, uji-gerbang.py, gerbang-semua.sh, gate-paritas.js, periksa-penerapan.py}` | dikirim **sesudah** koreksi; G7 membandingkan sha256 alat di paket vs di disk |
| bukti (14) | `verification/gerbang/*2026-11-20*.json`, `verification/p15/paritas-fase-*-2026-11-20.json` | termasuk versi satu-pasangan sebagai pembanding derau |
| sidik asli (10) | `verification/p13/asli/*.webp` | plate pihak asli **hanya** sebagai acuan uji negatif G5 (0 dari 10 dipakai aplikasi); bukan aset produk |
| dokumen (5) | `docs/P15-KOREKSI-GERBANG.md`, `docs/P4-KESIAPAN-REBRANDING.md`, `docs/PETA-KESENJANGAN-P15.md`, `docs/p14/MEMBACA-GERBANG.md`, `docs/p14/AUDIT-PENERAPAN-3.md` | P15-KOREKSI wajib dibaca sebelum menyalahkan gerbang |

## Yang harus diperiksa penerima (jangan diterima tanpa ini)

- [ ] `sha256sum dist/assets/index-*.js` = `873d3b54ea222267…` (cocok dengan produksi).
- [ ] `python3 tools/uji-gerbang.py` → **7/7** (G7 baru lulus bila zip 6l ada di `~/`).
- [ ] `bash tools/gerbang-semua.sh` → **7/7** tanpa `GAGAL`; kalau `paritas-fase` gagal, lihat dulu
      `mae_semua` di JSON — satu pasangan derau bukan cacat aplikasi (dokumen P15 §5).
- [ ] `?t=7` pada pratinjau lokal membeku di detik 7 (bukti `t = tPin` masuk).
- [ ] Tiga nama merek lama **tidak** diganti pada paket ini (keputusan sadar, menunggu P-4).

## Cara paket ini diuji (dan apa yang ditemukan saat mengujinya)

Urutan yang dipakai sebelum paket dikirim, **dari nol** (repo diunduh ulang, bukan salinan kerja):

1. `curl codeload…/Niu-Humanoid/main` → tar bersih `49e011dd15`, `npm ci` exit 0.
2. `npm run build` repo apa adanya → `index-DyoQ8hKN.js` **226 278 B** (bundel lama, bukan produksi).
3. Zip 6l diekstrak, **isi `pak6l/niu-humanoid/`** ditempel ke akar repo, `npm run build` → exit 0,
   `index-DeDMCu_9.js` **235 260 B** `873d3b54ea222267` = bundel produksi.
4. Zip 6l diekstrak **seluruhnya** (termasuk `tools/`, `verification/`, `docs/`), lalu
   `python3 tools/uji-gerbang.py` dan `bash tools/gerbang-semua.sh` dijalankan **di dalam salinan repo itu**.

Tiga cacat paket ditemukan justru oleh langkah 4 dan **sudah dikoreksi di paket ini**:

| cacat | akibat | koreksi |
|---|---|---|
| `cp -a pak6l/. .` hanya bekerja bila `niu-humanoid/` dilucuti dulu | penerapan naif menghasilkan build **226 278 B** (lama) padahal laporan berbunyi "diterapkan" | struktur paket dipertahankan, tetapi instruksi di atas menyebut `pak6l/niu-humanoid` secara eksplisit; sha256 bundel jadi syarat terima |
| `kontrak.json` menunjuk bukti 2026-11-19 yang tidak dikirim | `uji-alat` G4 GAGAL di repo penerima | kontrak diperbarui ke 2026-11-20 dan **semua** berkas bukti yang dirujuk ikut dikirim |
| `gerbang-semua.sh` tidak meng-export `TOOLS` | G7 membandingkan alat workspace kita dengan zip, bukan alat repo yang diuji → laporan "beda" palsu | `export … TOOLS`; G7 kini jujur di repo penerima |

Tambahan koreksi alat: `uji-gerbang.py` kini mengenal tiga keadaan — **lulus / gagal / tidak berlaku**.
`p13/asli` tetap dikirim supaya G5 (uji negatif: plate asli harus ditolak) benar-benar berjalan di repo,
bukan dilewati.

## Riwayat paket

| paket | isi | zip sha256 (8 heks) |
|---|---|---|
| 6h | perbaikan timeline APEX | `99657c58` |
| 6i | gerbang aset + bukti | `007733ed` |
| 6j | gerbang 8/8 + alat repo | `19f2b4b5` |
| 6k | paritas-fase + MAE_F1 + gerbang produksi | `2c1f24a8` |
| **6l** | **kode APEX final + 10 plate + 10 sidik asli + alat terkoreksi + bukti 2026-11-20 + P-4** | lihat `sha256` di akhir pesan kiriman; ronde rakit sebelumnya dibuang (G4/G7 gagal bila dijalankan di dalam repo penerima) |

## Temuan yang dicatat sekali (tidak ditagihkan ke siapa pun)

- Repo APEX di GitHub masih `49e011dd15`; produksi sudah memakai kode kita. Selisih itu **bukan**
  kelalaian yang perlu ditagih — cukup dicatat sampai paket ini diterapkan dan sha256-nya cocok.
- Repo MIRA `b9761d2663` menerima 6k, tetapi **mengubah aset** ("backdrop-v1 (p13/baru)"). Plate kita
  karena itu **tidak** otomatis setara dengan MIRA; rekonsiliasi aset MIRA masuk paket `6m`.

## Hasil uji penerimaan independen (salinan bersih, 2026-11-20)

- `npm ci` → exit 0; `npm run build` setelah menerapkan hanya `pak6l/niu-humanoid/` → exit 0.
- Bundel: `dist/assets/index-DeDMCu_9.js`, 235 260 B; sha256 `873d3b54ea222267`.
- Seluruh paket diekstrak ke salinan repo yang sama: `python3 tools/uji-gerbang.py` → **7/7**;
  gerbang penuh → **7/7**, lingkungan siap, exit 0. Rincian mesin: `verification/p15/ringkas-2026-11-20-uji-terap.json`.
- SHA-256 zip final: `d2c6fc6530c3f929…` (verifikasi ամբողջան ամբողջ SHA-256 di kiriman).

## Isi paket & sha256 (8 heks pertama) — 58 berkas

| berkas | sha256 | byte |
|---|---|---|
| `niu-humanoid/package.json` | `d8a23b79` | 526 |
| `niu-humanoid/src/App.tsx` | `115a465a` | 1641 |
| `niu-humanoid/src/components/Backdrop.tsx` | `760d44f8` | 10184 |
| `niu-humanoid/src/components/HumanoidMode.tsx` | `44ea66d4` | 24029 |
| `niu-humanoid/src/index.css` | `50c8547b` | 566 |
| `niu-humanoid/src/lib/a11y.ts` | `32991855` | 1156 |
| `niu-humanoid/src/lib/bloomGL.ts` | `e3b527ef` | 20798 |
| `niu-humanoid/src/lib/render.ts` | `c62bea94` | 14080 |
| `niu-humanoid/src/main.tsx` | `3b28e040` | 865 |
| `niu-humanoid/public/humanoid/apex-assembly-25-v1.webp` | `b1028f45` | 125088 |
| `niu-humanoid/public/humanoid/apex-assembly-60-v1.webp` | `7bfabb2e` | 132652 |
| `niu-humanoid/public/humanoid/apex-idle-v1.webp` | `9f7ee35b` | 128238 |
| `niu-humanoid/public/humanoid/apex-listening-v1.webp` | `d1257bc0` | 172594 |
| `niu-humanoid/public/humanoid/apex-speaking-strong-v1.webp` | `fed08d9f` | 155554 |
| `niu-humanoid/public/humanoid/apex-speaking-v1.webp` | `58904374` | 127382 |
| `niu-humanoid/public/humanoid/apex-thinking-v1.webp` | `5c52933a` | 106020 |
| `niu-humanoid/public/humanoid/backdrop-v1.webp` | `35539292` | 447002 |
| `niu-humanoid/public/humanoid/mira-hair-v1.webp` | `6c5e6791` | 93344 |
| `niu-humanoid/public/humanoid/mira-idle-v1.webp` | `8409aa77` | 205698 |
| `tools/gate-provenance.py` | `bc0c38a3` | 10400 |
| `tools/gate-paritas-fase.js` | `9e39ad25` | 8428 |
| `tools/uji-gerbang.py` | `2e7b0412` | 10090 |
| `tools/gerbang-semua.sh` | `66119f54` | 7430 |
| `tools/gate-paritas.js` | `b74d7d03` | 12017 |
| `tools/periksa-penerapan.py` | `f0f2346c` | 10444 |
| `verification/p13/asli-sidik.json` | `d13f78bb` | 1210 |
| `verification/p13/sidik-tabel.json` | `5b094611` | 2138 |
| `verification/gerbang/kontrak.json` | `64174b3c` | 1531 |
| `verification/gerbang/ringkas-2026-11-20-lokal.json` | `08b6ed0a` | 320 |
| `verification/gerbang/uji-gerbang-2026-11-20.json` | `95e2d4f5` | 935 |
| `verification/p15/paritas-fase-apex-2026-11-20.json` | `b61d1332` | 2331 |
| `verification/p15/paritas-fase-mira-2026-11-20.json` | `3f5c38f9` | 2306 |
| `docs/P4-KESIAPAN-REBRANDING.md` | `88822d13` | 4245 |
| `docs/p14/MEMBACA-GERBANG.md` | `be1ea0be` | 3717 |
| `docs/p14/AUDIT-PENERAPAN-3.md` | `d159c041` | 4537 |
| `docs/PETA-KESENJANGAN-P15.md` | `34867f85` | 4210 |
| `verification/gerbang/paritas-2026-11-20.json` | `82e0553d` | 10142 |
| `verification/gerbang/a11y-2026-11-20.json` | `64c7558c` | 2321 |
| `verification/gerbang/aset-layout-2026-11-20.json` | `216c8b76` | 3585 |
| `verification/gerbang/paritas-fase-apex-2026-11-20-satu-pasangan.json` | `b61d1332` | 2331 |
| `verification/gerbang/paritas-fase-mira-2026-11-20-satu-pasangan.json` | `94a7607e` | 1391 |
| `verification/gerbang/ringkas-2026-11-20.json` | `0a8d6301` | 328 |
| `verification/p15/ringkas-2026-11-20-uji-terap.json` | `c1fa54d0` | 328 |
| `docs/P15-KOREKSI-GERBANG.md` | `10d16493` | 7859 |
| `verification/p13/asli/apex-assembly-25-v1.webp` | `907c6623` | 312814 |
| `verification/p13/asli/apex-assembly-60-v1.webp` | `6847445a` | 322748 |
| `verification/p13/asli/apex-idle-v1.webp` | `ba1a6d93` | 300084 |
| `verification/p13/asli/apex-listening-v1.webp` | `333ded16` | 350160 |
| `verification/p13/asli/apex-speaking-strong-v1.webp` | `836c193d` | 327680 |
| `verification/p13/asli/apex-speaking-v1.webp` | `5433add4` | 286100 |
| `verification/p13/asli/apex-thinking-v1.webp` | `64f805cc` | 275616 |
| `verification/p13/asli/backdrop-v1.webp` | `9c5aeae2` | 312166 |
| `verification/p13/asli/mira-hair-v1.webp` | `8dc958e1` | 159716 |
| `verification/p13/asli/mira-idle-v1.webp` | `35911d6e` | 364544 |
| `tools/gate-aset-layout.js` | `2ba21f6d` | 8126 |
| `verification/gerbang/paritas-fase-apex-2026-11-20.json` | `a5bca964` | 2286 |
| `verification/gerbang/paritas-fase-mira-2026-11-20.json` | `5b7bbc0b` | 2313 |
| `BACA-DULU-6l.md` | `d4a8fc38` | 8443 |
