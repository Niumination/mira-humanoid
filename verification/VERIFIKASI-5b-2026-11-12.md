# Verifikasi penerapan paket 5a + 5b — 2026-11-12 (sesi 55)

Acuan: `https://mira-humanoid-niu.vercel.app/` · viewport 1440×900 untuk gerbang piksel.

## 0. Ringkas

| lapis | yang diperiksa | hasil |
|---|---|---|
| 1 | aset produksi | `index-DCR382kJ.js` **`e215b5a7…4a203`** (530.510 byte) |
| 2 | blob repo `mira-humanoid@367acf2` | `MiraStage.tsx` `ac80e448…` · `bodymesh.frag.glsl` `4fec2e10…` · `occluder.frag.glsl` `dfb5910c…` — **ketiganya sama dengan workspace** |
| 3 | build bersih dari workspace (`npm ci` + `tsc` + `vite build`) | nama aset **sama** dan **BYTE-IDENTIK** dengan produksi |
| 4 | gerbang di URL produksi | D **7/7** · A **8/8** · B **10/10** · langkah 5 **12/12** · step4c **9/9** |
| 5 | paritas piksel produksi (6 fase) | **2,72** — persis sama dengan build lokal 5b |

Repo `Niu-Humanoid` head **`3e543ea`** (dokumen 5b). Tidak ada regresi gambar: paritas produksi = paritas
build = **2,72**, dan gerbang D5 (reproduktibilitas) kita **0,0000** pada dua fase.

## 1. Gerbang D pada build produksi

| butir | hasil |
|---|---|
| D5 @t=8 | kita **MAE 0,0000 (0 px)** · live 0,7617 |
| D5 @t=11,5 | kita **MAE 0,0000 (0 px)** · live 0,6743 |
| D6 seam | kita rasio **1,43** (baris 547) vs live **1,45** (baris 529) |
| D7 fps | kita **0,69 fps** vs live 0,62 fps (rasio 1,11 ≥ 0,8) |
| D8 stabil 120 s | frame 7 → 127 · konteks hilang **false** · `__MIRA_ERR` **0** |
| D9 390×844 | reproduktif **0,0000** · korelasi profil **0,9906** · MAE 8,87 |
| D9 414×896 | reproduktif **0,0000** · korelasi profil **0,9908** · MAE 8,68 |

## 2. APEX — W-7 ditutup dengan verifikasi, bukan dengan klaim
Repo `Niumination/apex-humanoid-rebuild` **`a5535a0`** ternyata **lengkap** (47 berkas: `src/`, `public/`,
`vite.config.ts`, `vercel.json`, `package-lock.json`). Tarball → `npm ci` → `vite build`:

| aset | produksi | hasil build ulang |
|---|---|---|
| `index-DyoQ8hKN.js` | `8dac8dad…58a0` | **`8dac8dad…58a0`** ✅ |
| `index-WDCbnnbD.css` | `1b66a34b…3192` | **`1b66a34b…3192`** ✅ |

⇒ APEX **reproduktif byte-identik dari repo sendiri**; sumbernya tidak lagi bergantung pada repo MIRA.
Gerbang piksel deploy APEX diukur ulang hari ini: **MAE 10,66 · 9,68 % piksel >32** (1440×900, derau
prod-vs-prod 4,54 · 4,93 %) dan **8,58 · 7,30 %** (390×844, derau 0,77 · 0,34 %) — **sama dengan angka
P8a yang tercatat** (10,73/11,93 dan 7,71/9,01), jadi tidak ada regresi. Sisa ini sudah dicoba ditutup
berkali-kali (F-119a, F-125, dst.) dan tetap **struktural**; yang paling menonjol: wilayah terang
produksi asli (luma 120–255) di deploy kita **−37 s.d. −46** lebih gelap, artinya bloom/tonal APEX belum
meniru sumbernya. Itu proyek tersendiri, bukan tindakan paket ini.

## 3. Koreksi yang lahir di putaran ini (W-10)
Skrip verifikasi baru sempat melaporkan **“build bersih BEDA dari produksi”** — ternyata **salah alat**,
bukan salah build: `curl` ke `https://mira-humanoid-niu.vercel.app//assets/...` (garis miring ganda)
dijawab Vercel dengan halaman redirect 15 byte `Redirecting...`, lalu sha256-nya dibandingkan dengan itu.
Perbaikan: `PROD=${PROD%/}`, `curl -sL`, dan penjaga ukuran (`< 10 KB` = curiga redirect).

## 4. Alat baru
`tools/verifikasi-produksi.sh` — menjalankan kelima lapis di atas berurutan dan berhenti dengan status
gagal bila ada yang meleset:

```
bash tools/verifikasi-produksi.sh            # lapis 1–3 (±15 s)
bash tools/verifikasi-produksi.sh --gates    # + lapis 4 pada URL produksi (±12 menit)
```
