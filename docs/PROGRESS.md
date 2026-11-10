# PROGRESS — eksekusi berurutan (tanpa melompati fase)

Terakhir diperbarui: **2026-10-29**. Rujukan rencana: `RENCANA-EKSEKUSI.md`.

| fase | isi | status | artefak utama |
|---|---|---|---|
| **P0** | Normalisasi recon: HTML bersih, patch `verify-spec.py`, audit checksum, catat temuan | ✅ | `recon/*-index.clean.html`, `verify-spec.py`, `REBUILD-LOG.md` |
| **P1** | Fase 0 versi audit: daftar aset + konfirmasi negatif + dimensi | ✅ | `recon/asset-list.*`, `asset-dims.json` |
| **P2** | Fase 1.1–1.2: stack + ekstraksi copy UI berurutan | ✅ | `recon/ui-copy.{apex,mira}.txt`, `ui-copy.json` |
| **P3** | Fase 1.3: ekstraksi + rekonstruksi + klasifikasi shader | ✅ | `recon/shaders/` (150 file), `INDEX.md`, `resolve_shaders.py` |
| **P4** | Fase 1.4–1.5: 82 parameter + semua hook/query param | ✅ | `recon/params-verified.md`, `hooks.json`, `hooks.md` |
| **P5** | Fase 1.6–1.7: audio graph + timing | ✅ | `recon/audio/`, `timings.json` |
| **P6** | Fase 1.8–1.9: DOM runtime, computed style, ground truth (browser + WebGL2) | ✅ | `recon/ground-truth/` (73 artefak, 22 MB) |
| **P7** | Fase 2: arsitektur + peta UNVERIFIED | ✅ | `recon/ARCHITECTURE.md` |
| **P8** | Fase 3: implementasi APEX (8 langkah berurutan) | 🟡 langkah 1–7 lulus · langkah 8 backdrop port ✅, sisa = pipeline partikel GPU (butuh keputusan) | `apex-humanoid-rebuild/`, `verification/` |
| **P9** | Fase 4: Gerbang A/B/C/D | ⬜ | — |
| **P10** | Deliverable + deploy | ⬜ | — |

## Yang sudah bisa dipegang sekarang

1. **`recon/verify-spec.py` → 193/193, exit 0** (`python3 verify-spec.py`).
2. **26 shader aplikasi** tersalin verbatim (APEX 4, MIRA 26 termasuk 11 belum bernama) + 124 blok vendor dipisahkan.
3. **20 query param MIRA + 19 hook APEX** terdokumentasi; dua temuan baru: `?dial.<key>=` dan `?t=<detik>`.
4. **73 artefak ground truth** dari live: entry, birth 4 timestamp, selesai-build, 5 state APEX × 2 viewport, 6 state MIRA × 2 viewport, DOM mode humanoid, uji reproduksibilitas.
5. **Arsitektur + pemilik setiap string** (71 string) + 10 item UNVERIFIED yang eksplisit.

## Keputusan interview (2026-10-29) — FINAL

1. **Target**: APEX dulu, MIRA menyusul.
2. **Panel MIRA**: dibangun **lengkap** (20 seksi, 82 slider, 7 alias, `?dial.<key>=`, localStorage).
3. **Gerbang C**: ambang = **baseline terukur live-vs-live per run**, bukan angka mati.
4. **UNVERIFIED**: tutup dulu yang murah → U-1, U-3, U-4, U-7 **TERTUTUP** (`recon/UNVERIFIED-CLOSED.md`).
5. **Deploy**: saya siapkan repo + `vercel.json` + skrip diff; **kamu** yang `vercel deploy`, lalu saya bandingkan dengan URL-mu.

## Empat keputusan lama (sudah terjawab di atas)

1. **Target P8**: APEX dulu (rekomendasi), atau MIRA, atau keduanya berurutan.
2. **Panel MIRA (U-10)**: live **tidak** merender 82 slider. Bangun **dengan** panel (setia pada SPEC + `mira-params.json`)
   atau **tanpa** panel (setia pada perilaku live)?
3. **Ambang Gerbang C APEX**: pakai baseline terukur live-vs-live (3,06% piksel > 32/255) sebagai ambang lulus,
   atau tetap tuntut 0% dan terima bahwa target itu terbukti mustahil bahkan bagi situs aslinya?
4. **Deploy**: siapa menjalankan `vercel deploy` untuk uji Gerbang C melawan URL produksi.

## 2026-10-30 — langkah 8 selesai (port penuh)

Opsi user: **scope8 = full** + **deploy disiapkan sekarang**. Pipeline figur GPU diport penuh:
`fig.ts` (274.799 titik), `plate.ts`, `bloomGL.ts` (HDR half-float, gain 1/level, tap 2 texel),
`Figure.tsx` (uniform hU + 240 mote fU + bloom dU), shader `aU/lU/uU/cU` verbatim.
Uniform & atribut terbukti identik dengan live; gerbang C 26,16 %/23,92 % → **10,55 %/7,57 %**.
`npm run build` sukses (226 kB / 75,6 kB gzip). Deploy siap: `vercel.json`, `.gitignore`,
`README-DEPLOY.md`, `tools/diff-vs-production.js` — menunggu user menjalankan `vercel deploy`.

**Berikutnya:** (a) kalibrasi kernel bloom (opsional, sisa 10,55 % vs acuan 0,87 %);
(b) mulai fase MIRA (P9): panel 82 slider, 20 seksi, 7 alias, `?dial.<key>=`, localStorage.

## 2026-10-30 (2) — deploy APEX terverifikasi, MIRA dimulai

1. **Deploy APEX** https://niu-humanoid.vercel.app: 17/17 gerbang identik; piksel 10,73 %/11,93 (1440)
   dan 7,71 %/9,01 (390) — sama dengan dev di dalam derau.
2. **MIRA P1.3–P1.5**: `recon/verify-mira.py` → 82/82 param, 20 seksi, 7 alias, 13 query param.
3. **MIRA langkah 1** (entry + baris tombol): Gerbang A **8/8**.
4. **MIRA langkah 7** (panel 82 slider + `?dial.<key>=` + localStorage + alias): Gerbang B **10/10**.
5. Repo `mira-humanoid-rebuild/`, dev server port 5190, `npm run build` sukses (162 kB / 51 kB gzip).

**Berikutnya (MIRA):** langkah 2 aset/mask + ring + mesin garis (wire shader verbatim), 3 ignition,
4 audio, 5 state, 6 hand tracking, 8 bloom + alias hum.glow.*.

## 2026-10-30 (3) — MIRA langkah 2: mesin garis = **IDENTIK LIVE (12/12 buffer)**

1. `src/lib/miraLines.ts` (port `SN`) → `src/lib/miraWire.ts` (port `lF`) → `src/components/LineWeave.tsx`
   (WebGL2 langsung, shader `09-vert`/`10-frag` verbatim di `src/lib/shaders/wire.*.glsl`).
2. `src/lib/miraTimeline.ts`: port `Ud` (mulberry32), `LN`/`DN`/`FN` (jam ignition), palet `Nd` — semua verbatim.
3. **Gerbang angka**: `tools/probe-mira-buffers2.js` menangkap buffer yang diunggah live
   (`recon/ground-truth/mira/wire-buffers/*.bin`), lalu `recon/verify-mira-wire.mjs` membandingkan:
   **position, aDir, uv, aT, aCol, aS, aLen, aId, aSketch, aEnd, aF, index — 12/12 maxdiff 0**.
4. `drawElements` build **22248** = live **22248**; pesan trace (3 outline + 81 garis, 25/34/25) sama.
5. Tiga fakta baru yang dikunci dari bundle (bukan tebakan):
   `aCol = outline ? [.95,.9,1] : palet[kind]·0,6 + col·0,4`;
   `aT = ignite + LN(r)/… − 0,02`, `aF = aT + 0,32` (ignite 6,55; speed = wave·tinggi 1374);
   `aId = Ud(3)()` per garis (deterministik, terbukti sama antar dua tangkapan live).

**Berikutnya (MIRA langkah 2 lanjutan):** `uHeadRows` (rowTexture: centre x, half width, turn weight, depth share),
lapisan gambar `06/07`, rambut `30/31`, ring/orb `26`, latar `01`; lalu langkah 3 (gerak/intensitas).

**Tambahan langkah 2 (masih sesi yang sama):** `src/lib/miraHead.ts` (port `YN`/`ZN`/`QN`) + `uHeadRows`
terpasang nyata di `LineWeave`. `recon/verify-mira-head.mjs`: **rowTexture 1×1374 IDENTIK (maxdiff 0 semua kanal)**,
pivot [571, 557, 23.28] sama. Kunci temuannya: mask kepala dihitung pada 1146×1374 (ukuran `SN.width`), bukan 1145.

## 2026-10-30 (4) — MIRA langkah 2 selesai: gambar jadi tiga lapisan + inventaris draw lengkap

1. **Inventaris draw live** (`tools/probe-mira-draws.js` → `recon/mira-draw-inventory.json`): 19 draw unik,
   tiap draw lengkap (attrib, uniform, blend/depth). Ini peta jalan sisa langkah 2.
2. **Awan titik gambar** (`src/lib/miraPicture.ts`, port `ie`): 103.367 titik, **aRest/aKind/aZ maxdiff 0**.
3. **`MiraStage.tsx`**: satu kanvas WebGL2, urutan lapisan = urutan live; shader `02/03` (sprite),
   `04/05` (isi), `04/06` (warna), `07/08` (titik), `09/10` (garis) — semua verbatim.
4. Dua koreksi render terukur: `UNPACK_FLIP_Y_WEBGL=true` (three default) dan kanvas panggung **rasio 0,7**
   (1007×630) dengan `uRes` = ukuran jendela.

**Selisih frame sekarang 39,7 % > 32/255 (MAE 36,8)** — besar karena latar (`01`), rambut (`30/31`),
materi 54.492 titik, busur, orb, bloom belum ada. **Berikutnya:** materi (`11/12`), rambut (`30/31` + gambar rambut),
latar (`01`), orb (`26`), busur (`15/16`), lalu langkah 3 (jam build) dan 8 (bloom).

**Tambahan:** latar medan nebula (`00/01`) terpasang lewat FBO 0,7 + blit. Tiga cacat render ditemukan lewat
perbandingan potongan 8× dan diperbaiki: tekstur gambar harus `SRGB8_ALPHA8`, harus di-premultiply
(`UNPACK_PREMULTIPLY_ALPHA_WEBGL`), dan kanvas figur `alpha:false`. Selisih piksel turun 39,7 % → **16,4 %**
(MAE 36,8 → 17,3). Berikutnya: rambut `30/31` + gambar rambut, materi `11/12`, busur `15/16`, orb `26`, lalu langkah 3 & 8.

## 2026-10-30 (5) — MIRA: bloom penuh dengan shader live (langkah 8 versi MIRA)

1. `tools/probe-mira-allsrc.js` menangkap **37 sumber shader** live (36 lama + pass komposit `24-frag`).
   Bloom MIRA = `postprocessing` `BloomEffect`: luminansi (0,6/0,9) → 8 mip turun (12 tap) → 8 mip naik
   (radius 0,62) → komposit (`ENCODE_OUTPUT`, `e0Intensity` 0,9 — nilai `hum.glow.strength`, bukan `bloom.strength`).
2. Empat pasang shader itu disalin verbatim ke `src/lib/shaders/{hp,down,up,comp}.*.glsl` dan dirangkai di `MiraStage`:
   latar → kanvas, figur → RT RGBA16F, bloom atas RT, komposit ke kanvas dengan `(ONE, ONE_MINUS_SRC_ALPHA)`.
3. Kecerahan rata-rata 29,2 → **36,6** (live 41,7); glow menyebar di garis seperti live.

**Berikutnya:** rambut (`30-frag`/`31-vert` + gambar rambut 1385×1422 + 2 lapis helai), materi 54.492 titik
(`11-vert`/`12-frag`, `uLifted`), busur inti & mahkota (`13/16`, `15/16`), orb (`25/26`), percikan (`27/28`),
lalu langkah 3 (jam build: `iField/iMatter` ramp, ignition) dan gerbang C.

## 2026-10-30 (6) — MIRA: rambut + koreksi blend → MAE 14,2 (terbaik sejauh ini)

1. **Rambut** (`29-vert` + `30-frag`, citra `mira-hair-v1.webp` 1385×1422) terpasang dengan seluruh uniform terukur
   (`uUp 48`, `uSide 120`, `uMass 0,7`, `uEarY 343,41`, `uTop 0,6`, `uHead [694,79, 322,80]`, `uHairOff [120,48]`).
2. **Koreksi blend penting:** live memakai `srcRGB ONE · dstRGB ONE · srcAlpha ZERO · dstAlpha ONE`
   (`blendFuncSeparate`), bukan `(ONE, ONE)`. Dengan cara lama, alpha ikut menumpuk → kotak hitam besar menutupi latar.
3. Hasil: kecerahan 42,9 (live 36,8) · > 32/255 **20,1 %** · > 8/255 **29,9 %** · **MAE 14,2** (sebelumnya 19,4).

**Catatan terbuka (diukur, bukan ditebak):** kecerahan kini sedikit DI ATAS live. Kandidat: bloom mengenai lapisan
yang di live ada di kanvas terpisah, atau intensitas komposit harus dikalikan `bloom.strength`.
**Berikutnya:** materi 54.492 titik (`11/12` + `uLifted`), 2 lapis helai rambut (`31/32`), busur (`13/16`, `15/16`),
orb (`25/26`), percikan (`33/34`); lalu langkah 3 (jam build) dan gerbang C.

## 2026-10-30 (7) — MIRA langkah 2 lanjut: materi, helai, pita; verifikasi fase-terkunci

1. **Cara ukur baru (penting):** live menerima `?t=` (jam dibekukan) dan `?off=`. Dua tangkapan live pada `t=9,5`
   identik (MAE 0,10–0,12) → semua penilaian sekarang piksel-per-piksel pada fase yang sama, bukan "mirip".
2. **Materi** (`11/12`): 54.500 butir vs live 54.492; `aCol` maxdiff 1/255, `aTurns`/`aSeed` 3·10⁻⁸ (`src/lib/miraMatter.ts`).
3. **Helai rambut** (`31/32`) + **bintik** (`33/34`): 47 helai · 260 bintik · 10.888 verteks · 10.794 segitiga —
   **sama persis** dengan log & buffer live (`src/lib/miraHair.ts`).
4. **Pita `waves`** (25/26 + 27/28): 3 pita × 65 ruas + 168 percikan — inilah garis panjang di latar live
   (`src/lib/miraWaves.ts`). Ditemukan lewat `?off=waves`, bukan tebakan.
5. **Terbuka, dengan angka:** gambar dasar rebuild 2,4× terlalu terang (92,7 vs 38,8) dan bloom rebuild menambah
   8,5 sementara live +41,4. Intensitas bloom live di `t=9,5` ≈ 1,21 (bukan 0,9) — akan dikalibrasi bersama
   penyebab gambar dasar yang terlalu terang.
6. Skor fase-terkunci terakhir: **MAE 12,53** · > 8/255 57,28 % · kecerahan 44,8 vs live 39,6 (`build-stage21.png`).

**Berikutnya:** (a) kalibrasi bloom vs gambar dasar + selidiki garis yang 2,8× terlalu terang; (b) lapisan yang
belum ada: garis glide kepala `13/14` (12 draw, `uTail 150`, `uCol` emas), cincin kejut `35/36` (`uShock`), kuad
"still" rambut `uOn 0`; (c) jam build untuk lapisan figur (sekarang garis/rambut penuh sejak frame pertama,
padahal live baru menggambar setelah `ignite 6,55 s`); (d) gerbang C.

## 2026-10-30 (8) — Backup Drive + rekonsiliasi repo upstream + workspace dirampingkan

1. **Backup penuh** ke Google Drive, folder **niu-humanoid** (dibuat 13:47 UTC): 4 zip = 173 MB
   (`01-Kerja-Arena-recon` 32 MB · `02-…verification-a` 65 MB · `03-…verification-b` 72 MB ·
   `04-apps-tools-docs` 3,9 MB) + `BACKUP-README.txt`. `node_modules/dist/.vite` sengaja tidak disertakan.
2. **Repo upstream ditemukan & diperiksa:** `Niumination/Niu-Humanoid` (commit terakhir `a66f5ad`, 30 Okt 2026,
   "docs: update catatan temuan item 3 (Kerja-Arena → docs/)"). Isi penting: `src/` = aplikasi APEX kita
   (identik dengan `apex-humanoid-rebuild/`), `docs/` = `recon` + `verification` kita, `public/humanoid/` termasuk
   aset MIRA. Repo `mira-humanoid` **belum ada**.
3. **Rekonsiliasi sha256:** 599 berkas (106 MB) **identik** → dihapus dari workspace; 3 berkas **beda**
   (`PROGRESS.md`, `REBUILD-LOG.md`, `verification/VERIFICATION.md` versi lebih baru); 460 berkas **baru**.
   Seluruh `apex-humanoid-rebuild/` (48 berkas) ikut terhapus karena sudah jadi `src/` repo.
4. **Dihapus sesuai pilihan:** `recon/ground-truth/**` (23 MB, buffer mentah live) — ada di zip Drive 01.
   Screenshot lama juga dipangkas: `verification` 61 MB → 11 MB (10 tangkapan kunci dipertahankan).
5. **Ukuran workspace: 267 MB → 78 MB** (Kerja-Arena 184 → 12 MB).
6. **Paket update** `niu-humanoid-belum-terpasang.zip` (64 MB, 370 berkas): `docs/` (md versi baru + recon +
   verification terbaru), `mira-humanoid-rebuild/`, `tools/`, `sync-upstream.sh`, `README-UPDATE.md`,
   `PENGHAPUSAN-2026-10-30.md`. Skrip `sync-upstream.sh` membandingkan sha256 dan bisa menghapus otomatis
   berkas yang sudah masuk repo setelah push.

## 2026-10-30 (9) — Pemeriksaan penerapan Hermes: repo beres, deploy MIRA tidak terbukti

Hasil lengkap: `verification/HASIL-PEMERIKSAAN-PENERAPAN.md`. Ringkas:

1. **Repo:** `Niumination/Niu-Humanoid` (commit `1f2f997`, +283 berkas) dan `Niumination/mira-humanoid`
   (`25fdce58` 65 berkas + `1c4a0af` catatan). **279/279 berkas paket masuk, 277 identik sha256, 0 hilang.**
   `docs/PROGRESS.md` memuat sesi (6)(7)(8), `REBUILD-LOG.md` sampai F-76. Secret-scan bersih.
2. **Build:** klon bersih lulus di keduanya — Niu `index-DyoQ8hKN.js` 226,20 kB (sha256 **sama** dengan yang
   tersaji di `niu-humanoid.vercel.app`), MIRA `index-CgepBFsa.js` 395,39 kB.
3. **Deploy APEX sah:** entry deploy vs produksi **MAE 0,00**; idle MAE **10,92** · kecerahan 19,3 vs 26,0 —
   konsisten dengan `gate-deploy.json` lama (11,93 · 19,2 vs 27,5), bukan regresi.
4. **Deploy MIRA TIDAK terbukti:** `mira-humanoid.vercel.app` menyajikan app **asli** (`index-1PiDnpcG.js`
   1.185.588 B; tanpa `__MIRA_MATTER/WAVES/STRANDS`; ada `mediapipe`; log `hair picture: 47 strands`).
   Piksel: URL itu vs ground truth `live-t95.png` = **MAE 0,61** (app sama), sedangkan build repo kita vs
   ground truth = **MAE 12,52**. 10 kandidat hostname `mira-humanoid-*.vercel.app` → 404.
   **App asli utuh** (tidak tertimpa), tapi **rebuild MIRA belum publik**.
5. **Kode repo = kode workspace:** build repo MIRA vs `build-stage21.png` = **MAE 0,16** (kecerahan 44,8 = 44,8).
6. **Temuan kecil:** `tsconfig.tsbuildinfo` ter-commit di Niu (sudah tercatat di CATATAN-TEMUAN);
   cache `public/humanoid/*` 7 hari tanpa nama ber-hash.

**Perlu dari pengguna:** URL deployment Vercel MIRA yang sebenarnya (atau deploy ulang dengan nama proyek
lain, karena `mira-humanoid.vercel.app` milik app asli) + matikan Deployment Protection untuk production.

## 2026-10-30 (10) — Deploy MIRA sah (mira-humanoid-niu) + langkah 3 bagian 1

1. **URL produksi sah:** `https://mira-humanoid-niu.vercel.app` — 200, publik, judul MIRA Humanoid.
   Bundle `/assets/index-CgepBFsa.js` 395.461 B, sha256 `cbecb4da…` **sama** dengan build ulang repo HEAD
   (`36b6263`); penanda `__MIRA_MATTER/STRANDS/WAVES` ada, `mediapipe` tidak ada.
2. **Gerbang piksel produksi:** vs `build-stage21.png` **MAE 0,14**; vs preview lokal 0,09; vs app asli
   (GT) 12,53 (kecerahan 44,8 vs 39,6). Deploy = repo, bukan regresi.
3. **Langkah 3 bagian 1 — jam build:** `uBT` rambut/helai/bintik diubah dari konstanta 100 → jam build.
   `t=1,89`: MAE 31,61 → **25,14**; `t=9,5` tetap 12,53 (tidak merusak kondisi mapan).
4. **Dua sisa terukur:** (a) `t<6,55` live hampir hitam (mean 3,0 di t=0,3) sementara rebuild 37,5 → latar
   `field` belum punya ramp `iField`; (b) `t=6,8` live 61,2 vs rebuild 45,4 → kilatan ignition + cincin
   kejut `35/36` (`uShock`) belum ada.

**Berikutnya:** ramp `iField`/`iMatter` (latar muncul bersama build), cincin kejut `35/36` + percikan orb
`33/34`, lalu garis glide `13/14`; sesudah itu gerbang C.

## 2026-10-30 (11) — Langkah 3 bagian 2: ramp build, mask reveal, cincin kejut → fase build mendekati live

1. `uBT` = jam build (F-77): `t=1,89` MAE 31,61 → 25,14.
2. Ramp `iField/iMatter` + opacity kanvas latar (F-78) — rumus `Tw` disalin dari live, dan **terbukti** dari
   DOM live (`opacity` kanvas latar 0,064 / 0,604 / 1,0 pada t = 0,3 / 1,89 / 9,5).
3. Akar "figur tampil sejak frame pertama" (F-79): warna lapisan gambar tidak di-mask `filled` karena live
   mengandalkan alpha kanvas. Di kanvas tunggal → kalikan rgb dengan `filled`. `t=0,3`: 18,05 → **3,19**.
4. Cincin kejut ignition `35/36` + `qN` (F-80): `t=6,8` kecerahan 32,4 → 43,2 (live 61,2).
5. Tabel fase terukur (MAE vs app asli): 0,3 → **3,19** · 1,89 → **20,06** · 3,5 → **15,27** · 5,5 → **18,46** ·
   6,8 → **37,25** · 9,5 → **12,53** (tidak berubah = kondisi mapan aman).

**Berikutnya:** lapisan **orb `25/26`** (15 kuad, `uOrbPx/uOrbR/uEnergy/uOpacity`) — inilah terang yang hilang
pada 1,89–5,5; lalu kilatan ignition (`hum.strike.flash` di `13/14`), lalu gerbang C.

## 2026-11-01 (12) — Sinkronisasi workspace ↔ upstream setelah langkah 3

1. **Repo Niu-Humanoid** `784c43e`: hanya `docs/PROGRESS.md` + `docs/REBUILD-LOG.md` (sesi 11, F-77…F-80).
2. **Repo mira-humanoid** `6829d6a`: `src/` langkah 3 (shock.vert/frag.glsl baru + MiraStage/comp/picColor/blit),
   `docs/langkah3/` 12 PNG, `docs/mira/gate-deploy-niu.json`, `VERIFIKASI-DEPLOY.md`, `CATATAN-TEMUAN.md`.
3. **Cocok 100 %:** seluruh `src/` app identik sha256 dengan workspace (66/66), `tools/` 79/79 identik,
   `docs` 135/135 identik, **0 berkas beda**.
4. **Produksi sudah ikut:** `mira-humanoid-niu` menyajikan `index-DZGcjv2t.js` (sha256 = build repo HEAD);
   gerbang piksel produksi vs live: 0,3 → **3,19** · 5,5 → 18,46 · 6,8 → 37,24 · 9,5 → **12,53**;
   produksi vs build lokal ≤ 0,18.
5. **Workspace dirampingkan:** 13 berkas identik dihapus (7,6 MB) → Kerja-Arena 33 → 25 MB; dari repo ditarik
   `VERIFIKASI-DEPLOY.md`, `CATATAN-TEMUAN.md`, `.gitignore` (+`.vercel`, `.env*`).
6. **Sisa yang belum ada di repo (15 berkas, 13,2 MB):** `HASIL-PEMERIKSAAN-PENERAPAN.md`, `LANGKAH3.md`,
   `langkah3/prod-t*.png` (4), `terapan-2026-10-30/*.png` (9) → dibundel jadi `niu-update-sinkron.zip`.

## 2026-11-01 (13) — Langkah 3 bagian 3: salinan materi + uSettle (fase build 1,89–5,5)

1. Alat baru `tools/probe-mira-field.js` membaca uniform NYATA app asli per fase (dua konteks WebGL:
   medan `webgl` 1007×630 dan figur `webgl2` 1440×900). Data tersimpan di `/tmp/g-<t>.json` saat dijalankan.
2. Temuan (F-81): rebuild hanya menggambar **satu salinan jejak** (lag 0,025 · trail 0,55) — salinan utama
   (lag 0 · trail 1) dan dua salinan `eF` lain tidak ada; `uSettle` juga konstanta padahal live
   `0,75 − 0,4·smoothstep(t; 0,9; 6)`; setelah `last + 0,5 s` live menggambar hanya `nStay` titik.
3. Hasil (MAE vs app asli): 1,89 **20,06 → 13,92** · 3,5 **15,27 → 9,14** · 5,5 **18,46 → 14,30** ·
   6,8 37,25 → 35,45 · 9,5 12,53 → 12,89 · 0,3 3,19 → 4,30 (kecerahan 6,3 vs 3,0 — perlu ditelusuri).
4. Sisa: **6,8** (live 61,2 vs kita 36,8) = kilatan ignition `13/14` + percikan `33/34`; lalu gerbang C.

## 2026-11-01 (14) — Langkah 3 bagian 4: empat jam + parameter orb/gain

1. **Sinkron upstream dicek:** Niu `b4617b6`, mira `4b7bde3`; `src/` identik (68/68), `tools/probe-mira-field.js`
   sudah di repo, 0 berkas kode beda. Produksi `index-p8VjQZkw.js` sha256 = build repo HEAD.
   Workspace: `CATATAN-TEMUAN.md` ditarik dari repo, 6 PNG `build7` dihapus (identik, 4,2 MB).
2. **Temuan besar (F-82):** jam medan nebula di live saat `?t=` dipin adalah **0,150**, bukan jam build.
   Diperbaiki → 9,5 MAE 12,89 → **9,89**; 6,8 35,45 → 34,87.
3. Jam rambut/helai/bintik dan jam wajah dipisah (jam sendiri, tak ikut dipin) — sesuai ukur 0,045–0,2.
4. Orb: `uOpacity = matter·0,3`, `uOrbPx/uOrbR` dari `iCenter/iRing` (721,35/622,08/111,47 @1440×900) →
   mask "di belakang cincin" hidup lagi. Garis: `uGain = 0,95·(1+1,1·e^(−(t−6,55)/1,9))`.
5. MAE terkini vs app asli: 0,3 **3,46** · 1,89 **13,45** · 3,5 **8,55** · 5,5 **13,72** · 6,8 **34,87** · 9,5 **9,89**.
6. Sisa: (a) 6,8 = kilatan ignition `13/14`/`33/34` (live 61,2 vs kita 36,7); (b) kelebihan terang 9,5
   +7,1 dari lapisan gambar/garis/rambut (cakupan piksel, bukan uniform).

## 2026-11-02 (15) — Pemeriksaan upstream setelah langkah 3c

1. **Repo:** Niu `57d548e` (docs PROGRESS + REBUILD-LOG sesi 14, F-82), mira `4ecc57c` (src langkah 3c +
   `docs/langkah3/build9-*.png` 7 + `LANGKAH3.md` bagian 3–4 + `tools/probe-mira-field.js`).
2. **Kode identik 100 %:** `src/` 69/69 berkas sama sha256, **0 beda**; `tools/` 79/79; docs 149/149
   (kecuali satu, lihat butir 4).
3. **Produksi sudah ikut:** `index-DjYtq9fQ.js` 402.410 B, sha256 `55940d22f65d8c4d635d…` = build repo HEAD.
   Gerbang piksel produksi: 1,89 → **13,45** · 6,8 → **34,87** · 9,5 → **9,89**; produksi vs build lokal ≤ 0,17.
4. **Satu ketidakcocokan docs:** `Niu-Humanoid/docs/verification/langkah3/LANGKAH3.md` masih versi lama
   (3.052 B, hanya bagian 1–2); versi lengkap (5.035 B, bagian 1–4) ada di `mira-humanoid/docs/langkah3/`
   dan di workspace. Perlu ditimpa → paket `niu-update-koreksi-docs.zip`.
5. **Workspace dirampingkan:** 7 PNG `build9` identik dihapus (4,6 MB) + 4 PNG `prod-t` lama diganti
   `prod3-t` → Kerja-Arena ±24 MB.

## Sesi 15 (2026-11-02) — langkah 3 MIRA, sasaran: sprite & sebaran cahaya

- **F-83 (bug):** `drawSprite` mengirim skala hanya lewat `modelViewMatrix`; `SpriteMaterial` mengambil
  ukuran dari `modelMatrix` → kuad selalu 1 unit, sprite haze tak pernah terlihat. Diperbaiki +
  blending disamakan dengan three.js `AdditiveBlending` `(SRC_ALPHA, ONE)`.
- **F-84:** haze ungu lebar `(0,55; 0,3; 1)` berskala selebar gambar dengan opasitas **berdenyut**
  `1,73·exp(−((t−1,95)/0,75)²) + 3,56·exp(−((t−6,9)/0,75)²)` (live lebih gelap pada 5,5 & 9,5).
- **F-85:** kilatan ignition live diport penuh tetapi net-negatif (MAE 6,8: 30,46 tanpa vs 31,94 penuh);
  tetap ada di balik `?fl=1`.
- Gerbang piksel build11: **3,43 · 7,18 · 8,35 · 12,44 · 30,45 · 9,89** (rata-rata **11,96**, build9 13,99).
- Produksi: `dist/assets/index-B_BjFQWS.js` 403 051 B sha256 `66d5ed1a251e6787…`, build ulang identik
  piksel; konsol bersih (`__MIRA_ERR` null). Paket: `niu-update-langkah3d.zip` (5,2 MB, 76 berkas).

### Pemeriksaan penerapan paket 3d + bersih-bersih (2026-11-02)

- Produksi `index-B_BjFQWS.js` 403 051 B sha256 `66d5ed1a…` = build lokal = **klon segar repo `839a560`**.
- `src/components/MiraStage.tsx` & `LANGKAH3.md` sha256 identik dengan repo; `src/**` 57/57 berkas.
- Render produksi vs tangkapan build11: MAE **0,00** (6,8) · 0,17 (9,5), konsol bersih.
- Workspace 740 MB → 97 MB (rincian di `verification/PERIKSA-langkah3d.md` §5).

### Sesi 16 (2026-11-02) — penyelidikan sisa galat; build tetap build11

- **F-87:** metrik gerbang = RGB; sempat memakai luma dan angka tampak membaik padahal identik. Aturan dicatat.
- **F-88:** hipotesis kamera dolly/zoom **ditolak** — skala terbaik 0,98–1,00 di semua fase.
- **Inventaris sprite live** (alat baru `tools/probe-mira-sprites.js`): 5 sprite/frame; wash kanan-bawah
  live = sprite `p` (skala 6,05 · posisi +1,49/−1,67 · warna ungu ×0,4625 · f = 1,217).
- **F-86:** sprite `p` (6,8: 30,45 → **42,70**) dan `y` (netral) diport tetapi dimatikan; `src/` dikembalikan
  persis ke produksi (`index-B_BjFQWS.js` sha `66d5ed1a…`). Gerbang tetap 3,43 · 7,18 · 8,35 · 12,44 · 30,45 · 9,89.
- Petunjuk berikutnya: aliran `rnd()` sebelum blok busur mahkota (posisi semua busur bergeser).

### Sesi 17 (2026-11-02) — busur dari data live + kilatan `p` → **build13**

- **F-89:** aliran `rnd()` bergeser sebelum blok busur (bukti: vertex pertama beda 5–7 px lalu menyimpang,
  RMS 42 pada 128 verteks pertama — bukan geser/skala). Solusi: geometri busur diambil apa adanya dari live
  (`src/lib/miraArcsLive.ts`, blob 79 KB base64; alat `probe-arc-buffers.js` + `build-arcs-asset.py`).
- **F-90:** sprite `p` (kilatan titik sentuh busur) sekarang bekerja: **6,8: 27,22 → 13,41**.
  Gradien `PREFIX_GLOW` dibuat lebih landai (tepi cakram hilang).
- Gerbang build13: **3,43 · 8,98 · 7,24 · 12,17 · 13,41 · 9,89** (rata-rata **9,19**; build11 11,96).
- Produksi: `index-Du1MXuMO.js` 484 600 B sha `f54625e9…`; klon segar repo + 2 berkas → sha identik.
- Sisa terbesar sekarang: 5,5 (+8,1) · 9,5 (+7,1) · 1,89 (+7,3) — semuanya kelebihan terang, bukan geometri.

### Sesi 18 (2026-11-02) — audit 9,5, alat dipulihkan, dua temuan diparkir

- **F-91:** `e0Intensity` live = 0,9·(1+1,6·q) (terukur 2,1625 @6,8 · 1,2048 @9,5). Dipasang di balik `?bq=1`;
  default tetap 0,9 karena net-negatif selama dasar masih terang (rata-rata 9,19 → 9,23).
- **F-92:** dengan bloom dimatikan, dasar kita +16,1 lebih terang: figur +16,53 vs live +9,45,
  latar kita +3,05 vs live ≈ +16,6 → masalah ada di **bentuk tekstur medan**, bukan alpha.
- **F-93:** urutan perbaikan berikutnya (tekstur medan → turunkan figur → aktifkan F-91).
- Alat: `tools/siapkan-alat.sh` (Playwright + chromium + pustaka + 6 acuan live ke `recon/live-ref/`),
  `tools/probe-bloom.js`.
- Kode **tidak berubah** dari build13 (tangkapan 1,89 & 6,8 identik per piksel dengan build13);
  gerbang tetap 3,43 · 8,98 · 7,24 · 12,17 · 13,41 · 9,89 (rata-rata 9,19).

### Sesi 19 (2026-11-02) — akar masalah blending (F-94) → **build15**

- **F-94:** semua material figur live memakai preset `vr` = CustomBlending (SRC_ALPHA, ONE, ZERO, ONE);
  kode kita memakai (ONE, ONE, ZERO, ONE) → tiap fragmen alpha<1 terlalu terang dan alpha FBO figur
  menumpuk sehingga latar medan tertutup. 13 pemanggilan blending diperbaiki.
- **F-95:** dua tombol yang dulu diparkir kini menguntungkan: `bq` (F-91) diaktifkan, `hz` 1,0 → 0,2.
- Gerbang build15: **1,93 · 3,99 · 5,75 · 9,30 · 10,32 · 6,22** (rata-rata **6,25**; build13 9,19).
- Produksi: `index-BnGAAagM.js` sha `082cd9b3…`; klon segar repo + berkas baru → sha identik.
- Sisa: 5,5 & 3,5 kini **kurang** terang (jadwal kemunculan lapisan gambar/garis/rambut di 3–6 s).

### Sesi 20 (2026-11-02) — bloom tipis (F-96) + uLiveT (F-98) → **build17**

- **F-96:** kontribusi bloom kita hanya ~1/3–1/5 live (3,5: +1,15 vs +6,04 · 5,5: +2,16 vs +9,59 ·
  9,5: +4,50 vs +13,53) dan hampir tanpa warna. Struktur belum terpecahkan (F-97); dipakai pengali
  terkalibrasi `bgK = 2,0 − 0,5·smoothstep(t; 5,8; 7,2)`.
- **F-98:** `uLiveT` materi & gambar disamakan dengan live (0 saat dibekukan); netral metrik.
- Gerbang build17: **1,84 · 3,87 · 5,20 · 8,46 · 10,17 · 6,20** (rata-rata **5,96**; build15 6,25).
- Produksi: `index-YaZi9R6Q.js` sha `61e8f38d…`; klon segar repo `1e08214` + berkas baru → sha identik.

### Sesi 21 (2026-11-02) — SCREEN ditolak, sprite inti y/v diport → **build18**

- **F-97a:** komposit SCREEN (sesuai blendFunction live) diuji dan **ditolak** (semua fase memburuk tipis);
  shader komposit dikembalikan ke ADD.
- **F-97b:** angka "kontribusi bloom live" pada sesi 20 **tidak sah** (off=bloom di live tidak mematikan
  nebula) → kesimpulan "bloom kita terlalu tipis" dicabut; `bgK` tetap dipakai karena terkalibrasi.
- **F-99:** sprite inti `y` + `v` diport penuh (rumus bundle), pengali `cf=0,5` `vf=0,25`.
- Gerbang build18: **2,02 · 3,57 · 4,40 · 8,04 · 10,17 · 6,19** (rata-rata **5,73**; build17 5,96).
- Produksi: `index-DfWtWS5P.js` sha `4e5cd4ce…`; klon segar repo `3272130` + berkas baru → sha identik.
- Berikutnya: ekstraksi peta sprite live (`ae`/`be`) — pengali 0,5/0,25 hanya menambal perbedaan tekstur.

### Sesi 22 (2026-11-02) — F-100 tekstur sprite live prosedural + sRGB → **build19/20**

- **F-100:** peta sprite live dibuat runtime (`createRadialGradient` 128×128), bukan aset. Stop glow kita
  salah (ada stop 0,7 tambahan) dan `colorSpace = SRGB` tidak ditiru → tekstur kini `SRGB8_ALPHA8` + stop
  persis live; pengali `cf`/`vf` kembali 1 / 0,5.
- **F-101:** redaman inti `0,2 + 0,8·smoothstep((t−0,1)/1,3)` untuk t sangat awal.
- Gerbang build20: **2,45 · 2,15 · 3,36 · 7,64 · 8,08 · 6,19** (rata-rata **4,98**; build18 5,73).
- Uji geser waktu di 6,8 membuktikan galat bukan fase; `?fl=1` tetap merugikan.
- Produksi: `index-B0dBMECv.js` sha `e7168bb8…`; klon segar repo `3c29f10` + berkas baru → sha identik.

### Sesi 23 (2026-11-02) — peta selisih 2D + kilatan ignition `m` → **build21**

- Alat baru `tools/diffmap.py` (selisih bertanda per blok 12×8) — metrik global saja tidak cukup.
- **F-102:** di t=6,8 inti kita terlalu gelap (−28) dan sisi kiri terlalu terang (+22). Penyebab: sprite
  kilatan ignition `m` (renderOrder 12) dimatikan. Dipasang dengan `fl=0,5`, `fs=1,0` (skala live 420).
- Gerbang build21: **2,45 · 2,15 · 3,36 · 7,64 · 7,60 · 6,19** (rata-rata **4,90**; build20 4,98).
- Produksi: `index-BA8NBRA8.js` sha `6d20bf9d…`; klon segar repo `9e12bf4` + berkas baru → sha identik.
- Sisa: 5,5 (kita lebih gelap di seluruh tubuh figur — struktur busur/garis), 9,5 (`uIdle` garis), 0,3.

### Sesi 24 (2026-11-03) — app live diperbarui, metrik v2 (UI disembunyikan), acuan baru → **build22**

- **Target bergerak:** live kini `index-Bv2XtaLJ.js` (sha `ae79a3d1…`), acuan kita `recon/mira.js`
  (`8fe5c2f2…`). Konstanta inti tidak berubah; bundel baru disimpan sebagai `recon/mira-2026-11-03.js`.
- **Metrik v1 tidak sah:** selisih acuan lama vs live baru hanya di sudut layar (+11,5 kiri-atas, −8
  kiri-bawah), sama di semua fase, rerata kanal 0 → itu chrome DOM, bukan panggung. Live sendiri
  deterministik (dua muat: MAE 0,12 / 0,00).
- **Metrik v2:** `shot.js` dapat `UIHIDE=1` (sembunyikan DOM selain kanvas) + acuan baru
  `recon/live-ref-v2/` (6 fase dari live terbaru). Baseline build22: **2,42 · 2,13 · 3,32 · 7,61 · 7,38 ·
  5,53 = 4,73** (v1 4,90; selisihnya koreksi pengukuran).
- **F-103 ditolak:** awan titik tubuh (`uOn` setelah ignition+1,6) diuji penuh/50 %/30 % → selalu lebih
  buruk (5,53 → 10,48 / 7,86 / 6,66). Sebaran titik kita salah; lapisan tetap mati, kode gerbangnya ada.
- Produksi: `index-CDFKFb7u.js` sha `88a56596…`; klon segar repo `d7e0efb` + berkas baru → sha identik.
- Arah berikutnya (dari peta v2): t=5,5 defisit −12,1/−10,4 di tubuh atas-kiri; t=9,5 −11,7/−12,8 di
  bawah-tengah; t=3,5 defisit merata 1–7. Semua di **dalam** tubuh → sebaran materi/titik, bukan bloom.

### Sesi 25 (2026-11-03) — F-104 saringan debu terbalik + F-105 inti terlalu besar → **build23–25**

- **Geometri materi kini 100,00 % identik dengan live** (54.492/54.492 titik, sebelumnya 0 %). Penyebab:
  saringan butir debu di `extractLines` dibalik (memilih piksel yang justru gagal uji kontras).
  Efek: t=5,5 7,61 → **2,84**; t=3,5 3,32 → **1,93**.
- **F-105:** inti (`y`/`v`) terlalu besar & redup di detik awal (kontribusi off=core live 1,96 vs kita
  0,46). Koreksi bergantung waktu `cs/cb` (0,5/2,0 → 1,0/1,0 antara 0,9–1,6 s): t=0,3 2,42 → **1,29**.
- **Metrik v3** (`tools/metric.py`): MAE mentah + blur4 + blur10 untuk memisahkan struktur dari tekstur titik.
- Gerbang build25: **1,29 · 2,13 · 1,93 · 2,84 · 6,97 · 5,37 = 3,42** (blur4 2,89 · blur10 2,58).
  Sebelum sesi ini 4,73.
- Produksi: `index-CeJUy6tv.js` sha `8b729496…`; klon segar repo `eae396b` + 2 berkas baru → sha identik.
- Sisa: 6,8 (bentuk sebaran kilatan, blur10 5,09) dan 9,5 (−1,8 terpusat di bawah-tengah).

### Sesi 26 (2026-11-04) — peta kontribusi per lapisan tuntas; F-106 diterima, F-107 ditolak → **build26**

- **F-106:** `uIdle` garis (cahaya berjalan setelah `idle` = ignite+1,4) dipasang: t=9,5 5,37 → **5,20**.
- **F-107 ditolak (dua cara):** latar ikut bloom. Fakta: bloom live +13,48 @9,5 dan +23,79 @6,8, kita
  +2,11 / +8,86; latar live memberi +2,72 pada bloom, kita +0,00. Tetapi (a) latar ke render target figur
  → 8,69 @9,5, (b) latar disuntik ke luminansi bloom → 11,03 @9,5. Mesin bloom kita menyebar di tempat salah.
- **Diagnosis 6,8:** tanpa bloom kita 54,45 vs live 37,70 (+16,8 terlalu terang LANGSUNG), bloom live +23,79
  vs kita +8,86 → terang harus dipindahkan dari lapisan langsung ke bloom, bukan ditambah.
- Gerbang build26: **1,29 · 2,13 · 1,93 · 2,84 · 6,97 · 5,20 = 3,39** (blur4 2,86 · blur10 2,54; build25 3,42).
- Produksi: `index-C2v91iDz.js` sha `622d6240…`; klon segar repo `398e9f1` + 2 berkas → sha identik.

### Sesi 27 (2026-11-04) — bedah t=6,8: 5 percobaan ditolak, peta selisih memberi arah → **build27**

- **Peta selisih blur-8** (`selisih-6.8-blur.jpg`): cincin MERAH di bola ignition (kita terlalu terang),
  interior BIRU (kita terlalu gelap), kepala BIRU. Masalah = bentuk, bukan level.
- Kontribusi lapisan 6,8 (live/kita): pic −1,82/+0,19 · matter +0,59/+2,40 · lines +2,72/+4,53 ·
  hair −1,65/+0,16 · strands −1,72/+0,10 · bloom +23,79/+8,86.
- Ditolak dengan angka: F-107 (latar ikut bloom, dua cara), F-109 (`bt` 0,3/0,15/0,05), F-110 (`fk`
  0,7/1,25), F-111 (pindah terang ke bloom), F-112 (aura kepala: membantu 6,8 tapi merugikan 9,5).
- F-108 ternyata **sia-sia**: shader luminansi kita sudah punya `#define COLOR 1`; build26 dan build27
  menghasilkan PNG identik (md5 sama) → mesin render deterministik.
- Gerbang tetap **1,29 · 2,13 · 1,93 · 2,84 · 6,97 · 5,20 = 3,39**; produksi `index-48aN0FDY.js`
  sha `c70c361a…`; klon segar repo `cad9eab` + berkas baru → sha identik.

### Sesi 28 (2026-11-04) — akar cincin ignition: `reveal.speed`, bukan 1500 → **build28**

- Baca ulang bundle: live memanggil `Zk(Y, M.ignite, e.reveal.speed)`; konstanta 1500 hanyalah **default
  parameter**. Port kita memakai 1500 → cincin meleset +14 % radius, dan itu yang selama ini tampak
  sebagai "cincin terlalu jauh + halo terlalu terang" (bagian 18).
- **F-113 DITERIMA:** `bR = n · reveal[3] · (1 − 0,18·min(1,n/2))`, kekuatan `sh = 0,85` (bus gain
  `hum.build.shock`; kalibrasi 1,00→3,59 · 0,85→**3,42** · 0,75→3,54 · 0,70→3,64).
- **Ditolak:** varian gelombang sentuh (`tsk`, +50…+68 terlalu terang), `sbs=0,94`, `sh=1,00`.
- Profil radial 6,8: cincin 140–190 dari +8…+10 → **+0,8…+3,0**; halo 250–270 dari **+3,8/+3,2** → **−2,5/−1,4**.
- Koreksi pengukuran: kunci `off=` build kita = `picture` (live: `pic`) — semua pengukuran lama `off=pic`
  pada build kita adalah no-op. `off=core`/`off=lights` di live = 0,00 pada 6,8 & 9,5.
- Gerbang build28: **1,29 · 2,13 · 1,93 · 2,84 · 3,42 · 5,20 = 2,80** (blur4 2,30 · blur10 2,12; build27 3,39).
- Berikutnya: (a) interior bola 6,8 masih −10…−17 — bloom kita justru 1,5× live, jadi tambah terang di
  **isi bola**, bukan bloom; (b) 9,5 −5…−10 terpusat di tubuh: kuad gambar kita 1,7× lebih lebar dari live.
- Paket: `niu-update-langkah4a.zip` (4,4 MB, 16 berkas) — `src/components/MiraStage.tsx` +
  `docs/…` + `build28-*.png` + `banding-build28.jpg` + `BACA-DULU.md`. Lokal: `dist/assets/index-BUSc4wVj.js`
  sha `4b7e0a37…`, `MiraStage.tsx` sha `e3f5c9fe…`.

### Sesi 29 (2026-11-04) — penerapan 4a terverifikasi; anatomi 9,5; F-114 diterima → **build29**

- Terverifikasi: produksi `index-BUSc4wVj.js`, repo `e52df4c`, blob `MiraStage.tsx` `144215495f0ca980` =
  lokal; build ulang lokal = `index-BUSc4wVj.js` yang sama.
- Anatomi 9,5 (kunci `off` benar): gambar kita 45,7 vs live 27,3 (r<120); **bloom kita 4,4 vs live 46,5**;
  rambut 11,8 vs 12,3; garis 4,3 vs 4,0. Live menaruh ~50 % cahaya figur di bloom, kita 7 %.
- **F-114 DITERIMA:** gain figur `fg=1,10` (gambar+rambut+helai+twinkle) → 9,5 5,20 → **4,81**.
  Kalibrasi 1,00→5,20 · 1,10→4,81 · 1,15→4,85 · 1,20→5,08 · 1,30→6,06.
- **Ditolak:** F-115 (`pg`=2/4: 9,90/22,41), F-116 (`bq`=3: 42,6 total; `pg`0,6+`bq`6/12: 8,02/7,55;
  `pg`0,8+`bq`6: 6,34). Bloom kita terlalu sempit — menaikkan intensitasnya membakar inti.
- Fakta terkunci: geometri rambut tepat (pusat massa 709,6 vs 710,0), nebula sejajar (20,5 vs 20,5),
  `lines`/`matter`/`waves` dalam ±1 dari live. Sisa selisih 9,5 sebagian dari **posisi pita nebula panjang**.
- Gerbang build29: **1,29 · 2,13 · 1,93 · 2,84 · 3,43 · 4,81 = 2,74** (blur4 2,24 · blur10 2,06).

### Sesi 30 (2026-11-04) — pustaka bloom dibaca ulang; 6 hipotesis ditolak; 2 kalibrasi → **build30**

- Terverifikasi: produksi `index-Dkk8FSYS.js`, repo `073732f`, blob `1d7cdbce82f026e1` = lokal.
- **Temuan metodologis:** di app asli bloom dibungkus `!off.has("bloom") && <EffectComposer>` → `off=bloom`
  mematikan SELURUH composer (kontribusinya bahkan negatif di inti). Semua perbandingan bloom lama tidak sah;
  aturan baru: acuan hanya `off` lapisan non-pembungkus.
- Pustaka bloom live = port kita (down 12-tap, up 9-tap+support, radius 0,62, 8 level, skala 0,5, ADD,
  intensitas 0,9·(1+1,6·P_), P_ = exp(−Δ/1,9)); **satu-satunya beda: luminancePass live di resolusi penuh**.
- Ditolak dengan angka: F-117 (`bl=1` → 5,00), F-118 (`ur` 0,85/1,0 → 8,45/14,87; + figur redup → 6,2–8,9),
  F-119 (`bo`/`bog` → 5,6–10,7), F-120 (`gm` 0,9/1,1 → 6,37/5,70; 6,8 → 8,14/5,71), F-121 (`mg` 0,75 → rata² 2,78).
- **Diterima:** `bq` 1,00 → **0,70** (6,8: 3,43 → 3,18) dan `fg` 1,10 → **1,15** (9,5: 4,78 → 4,76).
- Gerbang build30: **1,29 · 2,13 · 1,93 · 2,84 · 3,18 · 4,76 = 2,69** (blur4 2,19 · blur10 2,02).

### Sesi 31 (2026-11-04) — delapan jalan buntu, satu kalibrasi tipis → **build31**; batas tekstur tercapai

- Terverifikasi: produksi `index-CJC1GFCh.js`, repo `a3e77b9`, blob `MiraStage` `a1c3e404…` + `comp.frag` `1f7cfc72…` = lokal.
- **Defisit kepala t=6,8 (−6,1) bukan milik lapisan mana pun**: matter 12,94 (live) vs 12,95 (kita), hair/pic/strands ±0,1,
  lines 0,67 vs 1,32. Sisa yang tak bisa diablasi di live = bloom → ini soal sebaran bloom.
- Ditolak (angka): `bt` 0,45/0,35 (9,5 → 5,51/6,46) · `hz` 0,7/0,5 (9,5 nol, 6,8 → 4,80/4,15) · `pg` 0,85/0,92 · `lb=1` (9,5 → 5,13)
  · `hg` 2/3 (6,8 → 10,00/13,44; 9,5 → 16,09/27,65) · awan titik tubuh semua ukuran/gain (9,5 → 5,03…10,73; 6,8 tidak berubah karena
  live baru menyalakannya di 8,15) · **geser kuad gambar ±10 px (9,5 → 8,44/8,48; dasar 4,76)**.
- **Diterima:** `bb` 1,00 → 0,90 dan `bq` 0,70 → 0,85 (semua fase membaik/tertahan; 2,688 → 2,666).
- Gerbang build31: **1,28 · 2,07 · 1,91 · 2,84 · 3,18 · 4,71 = 2,67** (blur4 2,17 · blur10 1,99).
- Kesimpulan: sisa galat = detail frekuensi tinggi (butir/kilau/tekstur). `blur10` 1,99 = struktur besar sudah dekat.

### Sesi 32 (2026-11-04) — sapuan 21 fase: galat terkonsentrasi di ignition (6,0–8,0); gerbang 6 fase terlalu sempit

- Terverifikasi penuh paket 4d: produksi `index-B3kfpwXh.js`, repo `b703d26`, **225 berkas repo = 0 berbeda**.
- Acuan baru **`recon/live-ref-v3/` (21 fase)** + render kita; alat: `tools/shot.js` seperti biasa.
- Hasil: rata² 21 fase **5,43**; fase terbaik 3,0 (1,35); **terburuk 7,5 (29,70)**; 6,5 = 7,49; 8,0 = 10,28.
  Enam fase gerbang lama semuanya 1,3–4,7 → gerbang lama tidak pernah melihat zona terburuk.
- t=7,5: semua lapisan yang bisa diablasi hampir sama dengan live (pic 13,48/11,10 · hair 8,04/7,51 ·
  lines 6,38/7,82 · arcs 0,00/0,00) tetapi rata bingkai 84,45 vs 57,50 → **kilatan ignition = peristiwa bloom**.
  `bq=2,0` → 29,70 → 28,05 (belum cukup).
- t=6,5: kita 13,45 vs live 7,00 (nebula 6,60 + materi 3,44); mematikan keduanya memburuk (7,78/8,82) →
  masalahnya **kurva waktu**, bukan kelebihan salah satu lapisan.
- Langkah berikut: gerbang diperluas ke 21 fase; sasaran utama 7,5 & 6,5 (bloom + kurva waktu).

### Sesi 33 (2026-11-04) — gerbang 21 fase membuahkan dua perbaikan besar → **build32**

- **F-129 DITERIMA (akar t=7,5):** live membuat cincin kejut dari `new PlaneGeometry(E*9,E*9)` yang digeser ke
  titik bintang → bidang 9× gambar menutupi seluruh layar. Port kita memakai kuad seukuran gambar, jadi
  gelombangnya TERPOTONG di tepi gambar (yang tampak: kotak terang). Setelah diperbaiki + kekuatan `rg=1,15`:
  7,0 6,12→3,79 · **7,5 29,70→5,28** · 8,0 10,28→5,38 · 8,5 6,00→4,65 · 9,0 5,11→4,78.
- **F-130 DITERIMA (akar t=6,5):** denyut haze 6,9 masih 64 % pada 6,4 (live 7,0 vs kita 12,9). Haze memang ada
  di 5,5/6,0 (mematikannya memburuk), jadi bentuknya TAKIKAN sempit 5,75–6,15 sampai ignition:
  6,0 3,74→2,34 · 6,5 7,49→**1,50** · 5,5 tetap 2,84.
- Gerbang 21 fase: rata² **5,43 → 3,49**. Gerbang 6 fase: **1,28 · 2,07 · 1,91 · 2,84 · 3,05 · 4,71 = 2,64**
  (blur4 2,15 · blur10 1,97), tanpa fase yang memburuk.

### Sesi 34 (2026-11-04) — ledakan awal t≈0,8–1,2 diperbaiki → **build33**

- Terverifikasi paket 4f: produksi `index-K2P1iKLh.js`, repo `99a091e`, blob `082271ad…` = lokal.
- Profil radial t=1,0: kita KURANG terang menyeluruh (−32 di r 40-60 · −43 di 60-80 · −45 di 80-100 · −8 di 300-360).
- **F-131 DITERIMA:** denyut haze khusus di 0,95 (`hp=0,7`, lebar 0,35). Penyapu `hz=2` memperbaiki 1,0 tapi
  merusak 1,2–2,5 (1,5: 1,44 → 8,98) → bentuk yang benar = denyut tambahan, bukan skala global.
- **F-131b DITERIMA:** sprite haze 1,3× selama ledakan awal lalu menyusut ke 1,0× sesudah t≈1,35
  (`hs=1,3`: 0,8 → 1,93 · 1,0 → 2,82 · 1,2 → 1,63, tetapi 1,5 → 2,16 bila dipakai terus).
- Ditolak: `bq=1,6`, `fl=1,3` (inert), `hz=0`, `lg=0,9` (bantu 11,0/12,0 tipis tetapi merusak 7,5: 5,28 → 5,77).
- Gerbang 6 fase **1,14 · 2,07 · 1,91 · 2,84 · 3,05 · 4,71 = 2,62** (blur4 2,12 · blur10 1,95); 24 fase **3,56 → 3,22**.
- Acuan fase awal 0,7–1,3 ditambahkan ke `recon/live-ref-v3/` (total 27 fase).
- Sisa terburuk sekarang: 8,0 (5,38) · 7,5 (5,28) · 11,0 (4,96) · 12,0 (4,94) · 11,5 (4,88) — semuanya wilayah
  dada/tepi (peta selisih 11,0: +15,5 di blok dada kiri-tengah).


### Sesi 35 (2026-11-06) — verifikasi 4g + diagnosis dada/torso → **build34**

- **Verifikasi paket 4g LULUS:** produksi `assets/index-Er3c1CLa.js`; repo head `d534b49`; blob
  `MiraStage.tsx` = `e33acf06556a164d` (82 843 B) = lokal; `npm ci` + `npm run build` → berkas **identik byte**
  (sha256 `8ace0810…` di kedua sisi).
- Tiga pemeriksaan dasar untuk t=11,0: **tidak ada** pergeseran waktu (10,9/11,05/11,1 → 4,72/4,79/5,01),
  acuan live **deterministik** (live-vs-live MAE 0,08), dan geometri **tepat** (optimum skala 1,00 geser 0,0).
- Ablasi lapisan kita & live pada 11,0. Temuan penting: **`?off=bloom` di live membuang seluruh composer** →
  kontribusi bloom live harus diukur dengan dial resmi `?dial.hum.glow.strength=0` (+4,94 dada, bukan +43,33).
- Diagnosis: **pembagian beban lapisan berbeda** — gambar kita +30 terlalu terang di dada, rambut kita −8
  terlalu lemah, bloom kita 1,6× terlalu kuat; totalnya hanya +9,96 karena dua kesalahan pertama saling menutupi.
- **F-133 (ditambah, default MATI):** koreksi tonal gambar (`?pgg=` pow, `?pge=1` EOTF sRGB eksak). Di harness
  gambar-saja EOTF eksak menurunkan MAE dada **8,19 → 2,08** (dada 77,5 → 46,3 vs live 47,2), tetapi di
  tumpukan penuh menjadi 9,35 → **ditolak sebagai default**, disimpan sebagai knob riset.
- Ditolak juga: `nm=1` (5,29), `bo=1` (10,13), `bb=2,5/4,0` (7,78/10,28), `bb=4,0&bt=1,2` (7,5 → 7,12),
  `ur=0,5&bb=0,75` (11,0 4,68 ✓ tetapi 7,5 8,25 ✗), `hgg=1,4`+`pge=1` (10,74).
- **F-134 DITERIMA:** plato akhir `bgK` 1,50 → 1,35 mulai t≈10,2 (bergerbang waktu, bukan skala global):
  10,5 4,64→**4,53** · 11,0 4,96→**4,82** · 11,5 4,88→**4,74** · 12,0 4,94→**4,79**; fase 7,5/8,0/9,0/9,5
  **tidak berubah sama sekali**.
- **Gerbang build34:** 6 fase 1,14 · 2,07 · 1,91 · 2,84 · 3,05 · 4,71 = **2,62** (identik, tanpa regresi);
  24 fase **3,22 → 3,20**. Alat baru `tools/metric3.py` (acuan v3 + jatuh ke v2 + `--grid`).
- Paket **`niu-update-langkah4h.zip`** (kode + shader + docs + PNG + acuan).
- Berikutnya: menyeimbangkan **tiga lapisan sekaligus** (gambar −, rambut +, bloom −) dengan sasaran terukur
  per lapisan; fase terburuk 8,0 (5,38) dan 7,5 (5,28) justru berada di wilayah yang sebaliknya (kita terlalu gelap).


### Sesi 36 (2026-11-06) — profil bloom terhadap waktu → **build35**

- **Verifikasi paket 4h LULUS:** produksi `index-CWsd9OOS.js`, repo `4fcba39`, blob `MiraStage.tsx`
  `66731b32d7dd79bd` (83 986 B) & `picColor.frag.glsl` `4f94c7632488c4b1` = lokal; build ulang **identik byte**
  (sha256 `cf240796…`).
- Catatan alat: `/tmp` (playwright) hilang antar-sesi → jalankan `bash tools/siapkan-alat.sh` dan
  `vite preview` lagi; **dua proses chromium paralel saling mematikan** (swiftshader) → sapuan render harus
  **berurutan**. Glitch snapshot juga menghapus `LANGKAH3.md` Bagian 25 + 12 PNG build34 dari workspace →
  dipulihkan dari paket 4h.
- Hipotesis amplop surge **gugur**: rumus live `P_(i,e,1.9)=exp(−(i−e)/1,9)` identik dengan kita.
- Ablasi t=8,0 (figur 200–700 × 450–1000): live 106,30 vs kita 102,30. Semua lapisan setara **kecuali bloom**
  (live +13,55 vs kita +10,54) — sedangkan pada 11,0 bloom kita justru lebih (+7,99 vs +4,94).
- **F-135 DITERIMA:** bump bloom bergerbang waktu `kabut = 0,85·exp(−((t−8,1)/0,68)²)` ditambahkan ke `bgK`.
  Kalibrasi: 0,4 → 7,5 4,80 · 0,7 → 4,65/8,0 4,90 · 1,0 → 4,68/4,85 · **1,4 → memburuk (4,88)**;
  lebar 0,9 merusak 7,0 (3,96) → lebar **0,68** dengan pusat 8,1.
- **Gerbang build35:** 6 fase 1,14 · 2,07 · 1,91 · 2,84 · 3,06 · 4,72 = **2,62** (blur4 2,12 · blur10 1,95);
  24 fase **3,20 → 3,15**, dengan 7,5 **5,28 → 4,65** dan 8,0 **5,38 → 4,86**; kerugian maksimum +0,02.
- Paket **`niu-update-langkah4i.zip`**.
- Berikutnya: enam fase sisa (8,0 · 11,0 · 9,0 · 12,0 · 11,5 · 9,5 ≈ 4,6–4,9) selisih terang totalnya hanya
  +1…+2 → sisa galat adalah soal **sebaran**, bukan jumlah cahaya.


### Sesi 37 (2026-11-06) — strands + koreksi cara ukur → **build36**

- **Verifikasi paket 4i LULUS:** produksi `index-laJDkWl3.js` (sha256 `352fd7e0…` = build lokal), repo `33b2817`,
  blob `MiraStage.tsx` `342212a1fbcc90ce` (84 581 B) = lokal.
- **KOREKSI METODOLOGI:** angka sesi 35 "gambar kita +20 lebih terang di dada" adalah **artefak** (`off=bloom`
  di live membuang seluruh composer). Pembanding adil (`dial.hum.glow.strength=0` vs `off=bloom`):
  dada **+7,87**, seluruh bingkai **+0,94**. Kesimpulan itu dibatalkan; F-133 tetap default MATI.
  `pgg` (kurva tonal) juga ditolak di harness adil: dada +7,9 → +4,2 tetapi MAE total 3,10 → 3,87.
- **F-136b:** knob `?stg=` khusus lapisan helai rambut (sebelumnya menempel pada `?fg=`).
- **F-136 DITERIMA:** helai rambut terlalu terang setelah figur tenang. `stg=0,3` tetap: 11,0 4,82→4,50 ·
  12,0 4,79→4,40 · 9,5 4,72→4,55 **tetapi** 8,0 4,86→4,95. Dipakai **gerbang waktu**
  `stgK = 1 − 0,7·xs(t; 8,6; 9,6)` → fase < 8,6 tak tersentuh.
- **Gerbang build36:** 6 fase 1,14 · 2,07 · 1,91 · 2,84 · 3,06 · **4,54** = **2,59** (blur4 **2,05** · blur10 **1,88**);
  24 fase **3,15 → 3,08** (blur4 2,50 · blur10 2,28), tanpa regresi. Perbaikan besar: 10,0 4,57→**4,28** ·
  10,5 4,53→**4,23** · 11,0 4,82→**4,50** · 11,5 4,74→**4,36** · 12,0 4,79→**4,40**.
- Paket **`niu-update-langkah4j.zip`**.
- Berikutnya: sisa terburuk ada di jendela ignition (8,0 4,86 · 9,0 4,71 · 7,5 4,65 · 8,5 4,62) dan **lonjakan
  7,0 (3,81** vs tetangga 6,8 = 3,06) → perlu peta selisih 7,0 sendiri.


### Sesi 38 (2026-11-06) — aura kepala + jendela ignition → **build37**

- **Verifikasi paket 4j LULUS:** produksi `index-re72jnYx.js` (sha256 `76131240…` = build lokal), repo `51e9913`,
  blob `MiraStage.tsx` `eb65e850c75f12f1` (85 082 B) = lokal. (Workspace sempat kehilangan PNG build36 lagi →
  dipulihkan dari paket.)
- Peta selisih t=7,0: **kepala −17,4/−16,6** (kita gelap) dan tepi bawah **+11,1/+10,6** (kita terang).
- Ablasi t=7,0: total kepala live 75,08 vs kita 55,43; setelah semua lapisan dikurangi **dasar kepala live ≈52
  vs kita ≈26** → yang hilang bukan milik lapisan terukur mana pun, melainkan **sprite aura violet** (F-110)
  yang di build kita dimatikan sejak dulu.
- **F-137 (INERT, dicatat):** `?uh=` (kekuatan penekan `underHair`) disapu 1,0/0,7/0,4 → hasil identik
  (55,43 · MAE 3,81). `underHair` hanya bekerja pada piksel terang; yang hilang adalah pendar lembut → bukan itu.
- **F-138 DITERIMA:** aura dinyalakan dengan **gerbang sempit** `auWin = 1 − xs(t; 7,1; 7,5)`.
  Penuh `au=1`: 6,8 3,06→**2,80** · 7,0 3,81→**3,27** (kepala 55,4→74,5 vs live 75,1) tetapi 7,5 5,02 · 8,0 5,46 ·
  9,5 5,27 → digerbangi. Hasil: 6,8 **2,80** · 7,0 **3,27** · 7,5/8,0/9,5 **tidak berubah**.
- **Gerbang build37:** 6 fase 1,14 · 2,07 · 1,91 · 2,84 · **2,80** · 4,54 = **2,55** (blur4 **2,01** · blur10 **1,84**);
  24 fase **3,08 → 3,06**. Seluruh 24 fase dirender ulang penuh (render lama hilang oleh glitch snapshot).
- Paket **`niu-update-langkah4k.zip`**.
- Berikutnya: `lines` **+12 terlalu kuat di bahu** pada t=7,0 (live +36,2 vs kita +48,2) → kandidat gain
  `lines`/`wire` yang digerbangi waktu; sisa terburuk 8,0 (4,86) · 9,0 (4,71) · 7,5 (4,65) · 8,5 (4,62).


### Sesi 39 (2026-11-06) — Gerbang A & B (P9) + gerbang dari produksi → **tanpa perubahan piksel**

- **Verifikasi paket 4k LULUS:** produksi `index-B2KyDmhD.js` (sha256 `bca27438…` = build lokal), repo `aa05d21`,
  blob `MiraStage.tsx` `4090892cb76dc049` (85 699 B) = lokal.
- **Gerbang diukur dari URL PRODUKSI:** 1,14 · 2,07 · 1,91 · 2,84 · 2,80 · 4,55 = **2,55** — sama persis dengan
  lokal (selisih 0,01 di 9,5 = derau render) → tidak ada penyimpangan build/deploy.
- **Ditutup:** `lg` (gain garis) — 0,85 → 7,0 3,30 · 8,0 5,00; 0,7 → 3,54 · 5,15, keduanya lebih buruk dari
  dasar (3,27/4,86) → kelebihan di bahu bukan dari `lines`.
- **Ditutup:** aura kepala sesudah 7,5 — skala diperkecil 0,6 → 8,0 5,17 · 0,4 → 8,0 5,03 & 9,0 4,90,
  semuanya lebih buruk dari dasar (4,86 / 4,71). Aura hanya benar di jendela ≤7,5.
- **Aturan metrik baru:** `off=` di live tidak setara untuk lapisan berpartikel (`off=hair,matter` justru
  menaikkan galat 4,86 → 5,29) → `off=` hanya untuk ablasi satu sisi, bukan pembanding dua implementasi.
- **`recon/mira-params.json` hilang oleh glitch snapshot** → direkonstruksi dari bundle live: 82 dial unik + 7 `stands`.
- **Gerbang A: 8/8 lolos** · **Gerbang B: 10/10 lolos** (`verification/mira/gate-{a,b}.json`). Alat gerbang B
  diperbaiki (`ensurePanel()`) karena menggantung bila panel sudah terbuka.
- **P9 🟡:** A & B lulus; C (ambang live-vs-live) dan D masih terbuka.
- Paket **`niu-update-langkah4l.zip`** — isinya **dokumen + alat + spesifikasi dial**, BUKAN kode panggung
  (tidak ada perubahan piksel sesi ini).

### Sesi 40 (2026-10-29) — **langkah 4 MIRA: mesin audio penuh** (graph + 8 cue + skor adegan + bolt)

- **Verifikasi paket 4l LULUS:** produksi masih `index-B2KyDmhD.js` (sha256 `bca27438…` = build37),
  repo head `51edcaa` — sesuai karena 4l hanya dokumen/alat, tanpa kode panggung.
  Glitch snapshot ke-5 (LANGKAH3.md kehilangan Bagian 29) dipulihkan dari zip 4l.
- **Lantai derau Gerbang C MIRA diukur** (`shot.js` @8,0/9,5 + pembanding live): t=8,0 **MAE 0,00** ·
  9,5 **0,55** · 11,0 **0,08** → ambang Gerbang C hampir nol; kita masih 4,50–4,86 di fase itu.
  Ditulis `STATUS-ROADMAP.md` (P0–P10, 24/30 ≈ 80 %).
- **Langkah 4 (audio) selesai dan diuji.** Region audio live (20 291 B di `recon/mira-2026-11-03.js`,
  arsip `recon/audio-region.js`) diport verbatim ke `src/lib/miraAudio.ts` +
  `src/lib/miraSoundCues.ts`:
  graph `rh` (comp −8/12/3,5/0,006/0,25 · `hg=vN·0,62` · reverb 3,2 s/exp 2,4 & 6,0 s/exp 1,7 ·
  send `gN`/`gN·1,15` · noise loop 2 s), primitif `oc/_o/U_/Vw`, drone `xN/_N/yN`,
  8 cue `LN`, dua voice `EN`, ignition `DN`, **synth buffer prosedural `mo`** (6 strike · burst ·
  thunder · boom · sizzle · hum), player `wi/Pl/xd`, **8 jenis cue skor `qw`**, track `FN/FT`,
  bolt `kN`, unlock iOS `ON/Pg`.
- **Temuan yang mengubah rencana:** (a) graph live **tidak** punya `createAnalyser` → butir rencana
  “analyser→uEnergy” dibatalkan; (b) MIRA **tidak** memancarkan `MIRA_ENTER`/`ASSEMBLY` — bunyi masuk
  berasal dari skor cue (`MIRA_BUILD`) + `MIRA_BOLT` per klik; (c) label tombol SOUND = **status**
  (`SOUND ON` + `aria-pressed=true` sebagai default) — versi kita sebelumnya terbalik, dibetulkan;
  (d) `Vk` memakai **lebar citra** sebagai skala pan.
- **Penyambungan:** `MiraStage` membangun skor setelah `buildMatter` (36 cue, panjang **12,550 s**);
  `HumanoidMode` menangani unlock (`Pg`), skor tunggu-gestur (`w.current`), SOUND ON/OFF
  (`localStorage.apex_sound_off`), dan bolt pada `pointerdown` (pan `x·0,8`, ambang 150 ms).
- **Gerbang D:** D1 paritas pemanggilan **31/31** (node/sambungan/start-stop/**multiset nilai
  AudioParam** identik: 194 osc · 773 gain · 119 bufferSource · 96 panner · 54 biquad · 25 shaper ·
  1 709 sambungan · 604 start/stop · 777 penjadwalan) · D2 spektrum `OfflineAudioContext`
  **27/27 sampel-identik (MAE 0,0000 %, korelasi pita 1,000000)** · D3 audio hidup di aplikasi
  **9/9** (RMS 2,55·10⁻² → SOUND OFF 0,00 → ON 1,01·10⁻¹; bolt 2,26·10⁻²) · D4 regresi piksel
  t=8,0 **MAE 0,0000**.
- Paket **`niu-update-langkah4m.zip`**.
- Berikutnya (langkah 5): state machine penuh + 4 param *Her states* (`?state=`), SPEED/REPLAY
  menggeser jam panggung, lalu langkah 6 (MediaPipe: `hum.touch.wave`, MIC) dan gerbang C/D + viewport 390.
