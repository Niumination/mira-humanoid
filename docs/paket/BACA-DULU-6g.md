# BACA-DULU-6g — paket besar: kode APEX **dan** seluruh plate, sekaligus

tanggal: 2026-11-18 · menggantikan 6e/6f (yang hanya berisi kode, tanpa aset)

## 1. Apa yang diaudit dan apa hasilnya

| | repo `main` | produksi (URL) |
|---|---|---|
| APEX kode `src/` | **23 sama · 9 beda/hilang** (masih commit 5y `49e011dd15`) | `index-ffx1NC0u.js` `7daca178a692f337` = **build kita** |
| APEX aset | **0/10 — semuanya masih ASLI** | **10/10 plate kita** |
| MIRA kode | 67/67 sama | `index-BiuEEVDg.js` = build repo |
| MIRA aset | 2/2 plate kita | 2/2 plate kita |

Artinya: kode APEX tayang dari sumber yang tidak ada di repo, dan aset APEX di repo masih milik pihak lain.
**Karena itu paket ini memuat kode dan aset bersama** — kalau hanya kode, deploy dari repo akan mengembalikan
aset asli ke produksi.

## 2. Isi paket (36 berkas)

### 2.1 Kode APEX (9) — wajib bersama

`package.json` · `src/App.tsx` · `src/components/Backdrop.tsx` · `src/components/HumanoidMode.tsx` ·
`src/index.css` · `src/lib/a11y.ts` (**baru**) · `src/lib/bloomGL.ts` · `src/lib/render.ts` · `src/main.tsx`

### 2.2 Aset plate (10) → `public/humanoid/`

`apex-assembly-25-v1` · `apex-assembly-60-v1` · `apex-idle-v1` · `apex-listening-v1` ·
`apex-speaking-v1` · `apex-speaking-strong-v1` · `apex-thinking-v1` · `backdrop-v1` · `mira-idle-v1` ·
`mira-hair-v1` — semuanya berukuran 93–447 kB (bukan placeholder 79 B/646 B).

### 2.3 Alat (4)

`tools/gate-provenance.py` (v5: `--pola`, live tanpa `--akar`, 0 berkas = FATAL, gagal repo vs produksi
dipisah) · `tools/periksa-penerapan.py` (portabel, `KERJA_ARENA`/`APEX_WS`/`MIRA_WS`) · `tools/ukur-viewport.py`
· `tools/gate-paritas.js` **v4** (repo MIRA masih v2 8 360 B → ini 11 976 B).

### 2.4 Tabel sidik + bukti + dokumen (13)

`verification/p13/asli-sidik.json` (10 sha256 **penuh**, dibangkitkan dari `public/humanoid` repo APEX
`49e011dd15`) · `verification/p13/sidik-tabel.json` · `verification/p14/{gp-apex-repo,gp-apex-live,gp-mira-live,
gate-paritas-2026-11-18c,gate-a11y-6e,gate-aset-layout-6e}.json` · `docs/p14/{AUDIT-PENERAPAN-3,TEMUAN-P15,
JANGKAR-WAKTU,GERBANG-PRODUKSI,BINGKAI-RESPONSIF}.md`.

## 3. Peringatan: `asli-sidik.json` yang ada di repo MIRA sekarang SALAH

Berkas `verification/p13/asli-sidik.json` di `mira-humanoid@main` menyebut **hash plate kita** sebagai "asli"
(8 dari 10 baris). Efeknya: `gate-provenance.py` akan melaporkan plate kita sebagai salinan asli.
Versi di paket ini diganti dengan tabel yang benar (asli = `public/humanoid` repo APEX 5y).

## 4. Uji terapkan (dilakukan sebelum zip dikirim)

Salinan repo `Niu-Humanoid@49e011dd15` + isi paket → `tsc -b` → `vite build`:

| uji | hasil |
|---|---|
| `tsc -b` | bersih |
| `vite build` | sukses → `index-ffx1NC0u.js` **`7daca178a692f337`** 235,12 kB · gzip 78,15 kB (= build workspace) |
| aset pasca-terap | provenance `--pola 'apex-*'` **7/7 lulus** (sebelum paket: 0/7) |

## 5. Cara menerapkan

```bash
unzip niu-update-langkah6g.zip
cp -r pak6g/niu-humanoid/*  <repo Niu-Humanoid>/          # src + public/humanoid + package.json
cp -r pak6g/tools/*         <repo Niu-Humanoid>/tools/
cp -r pak6g/verification/*  <repo Niu-Humanoid>/verification/
cp -r pak6g/docs/*          <repo Niu-Humanoid>/docs/
cd <repo> && npm ci && npm run build && npx vercel deploy --prod
```

Sesudah deploy, jalankan ulang: `gate-provenance --live --pola 'apex-*'` (harus 7/7) dan bandingkan
`sha256` bundel produksi dengan `7daca178a692f337`.

## 6. Untuk MIRA (paket 6h menyusul)

`tools/gate-paritas.js` v2 → v4 · `tools/gate-provenance.py` (tabel pembanding yang benar) ·
`verification/p13/asli-sidik.json` · `src/main.tsx` (judul h1 masih "Apex Humanoid").

## Isi paket & sha256 (8 heks pertama) — 37 berkas

| berkas | sha256 | byte |
|---|---|---|
| `niu-humanoid/package.json` | `d8a23b79` | 526 |
| `niu-humanoid/src/App.tsx` | `115a465a` | 1641 |
| `niu-humanoid/src/components/Backdrop.tsx` | `760d44f8` | 10184 |
| `niu-humanoid/src/components/HumanoidMode.tsx` | `313807d2` | 22974 |
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
| `tools/gate-provenance.py` | `cef0625d` | 9858 |
| `tools/periksa-penerapan.py` | `f0f2346c` | 10444 |
| `tools/ukur-viewport.py` | `1a9f988b` | 5333 |
| `tools/gate-paritas.js` | `3097aa71` | 11976 |
| `verification/p13/asli-sidik.json` | `d13f78bb` | 1210 |
| `verification/p13/sidik-tabel.json` | `5b094611` | 2138 |
| `docs/p14/AUDIT-PENERAPAN-3.md` | `d159c041` | 4537 |
| `docs/p14/TEMUAN-P15.md` | `0312e763` | 2837 |
| `docs/p14/JANGKAR-WAKTU.md` | `644de3e4` | 2724 |
| `docs/p14/GERBANG-PRODUKSI.md` | `ddd57d42` | 3303 |
| `docs/p14/BINGKAI-RESPONSIF.md` | `2323a9ca` | 3724 |
| `verification/p14/gp-apex-repo.json` | `60f53516` | 1770 |
| `verification/p14/gp-apex-live.json` | `34ca21ba` | 2147 |
| `verification/p14/gp-mira-live.json` | `763211b7` | 869 |
| `verification/p14/gate-paritas-2026-11-18c.json` | `2697a139` | 10143 |
| `verification/p14/gate-a11y-6e.json` | `8b69de96` | 2336 |
| `verification/p14/gate-aset-layout-6e.json` | `ad58ac20` | 3600 |
| `paket/BACA-DULU-6g.md` | `a729bb0d` | 3720 |
