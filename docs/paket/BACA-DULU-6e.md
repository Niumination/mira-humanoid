# BACA-DULU-6e — paket besar: menyelaraskan APEX sampai bisa di-build

tanggal: 2026-11-18 · menggantikan 6d **untuk APEX** (6d tetap sah untuk MIRA)

## 1. Kenapa paket ini ada

Klaim "6d sudah diterapkan" diuji dan hasilnya: paket 5z–6d masuk APEX **1 berkas dari 41**.
Lebih buruk lagi, menerapkan 6d apa adanya **mematikan build** APEX:

```
src/main.tsx(4,37): error TS2307: Cannot find module './lib/a11y'
Rollup failed to resolve import './lib/a11y' from src/main.tsx
```

Sebabnya: `main.tsx` versi 6d mengimpor `src/lib/a11y.ts` yang **tidak pernah ada di repo APEX**. Selama ini
saya merakit paket dari "berkas yang saya sentuh", bukan dari **delta repo**. Untuk MIRA itu cukup; untuk APEX
tidak, karena repo APEX masih di commit 5y.

## 2. Isi paket (19 berkas)

### 2.1 Delta `src/` + konfigurasi (9 berkas) — semuanya wajib, tidak boleh dipilih sebagian

| berkas | kenapa ikut |
|---|---|
| `src/lib/a11y.ts` | **baru**; tanpa ini build mati |
| `src/main.tsx` | `<main>` + `<h1 class="sr-only">` + `pasangReducedMotion()` (A4, A7) |
| `src/index.css` | blok `@media (prefers-reduced-motion)` + `.sr-only` |
| `src/App.tsx` | `?t=` ikut memicu masuk mode humanoid |
| `src/components/HumanoidMode.tsx` | `tPin`: jangkar waktu `?t=` |
| `src/components/Backdrop.tsx` | F-153: lapisan backdrop tampak (opacity 1), bukti probe-bg2 |
| `src/lib/render.ts` | F-155/F-163/F-164b: mask siluet (1/2 resolusi, sumber art mentah) |
| `src/lib/bloomGL.ts` | F-156: un-premultiply sebelum encode (puncak terang 112,9 → 154,7) |
| `package.json` | `"license": "SEE LICENSE IN LICENSE"` |

### 2.2 Alat gerbang yang belum ada di repo APEX (3)

`tools/periksa-penerapan.py` (L1–L3b, termasuk lapis produksi) · `tools/gate-provenance.py` (`--statis/--live`)
· `tools/ukur-viewport.py`.

### 2.3 Bukti + dokumen (7)

`docs/p14/{JANGKAR-WAKTU,GERBANG-PRODUKSI,BINGKAI-RESPONSIF,AUDIT-PENERAPAN-2,TEMUAN-P15}.md` ·
`verification/p14/{gate-paritas-2026-11-18c,gate-a11y-2026-11-18b}.json`.

## 3. Uji terapkan (dilakukan sebelum zip dibuat)

Salinan `Niu-Humanoid` (commit `49e011dd15`) → timpa isi paket → `npm ci` → `tsc -b` → `vite build`:

| uji | hasil |
|---|---|
| `tsc -b` | **bersih** (0 error) |
| `vite build` | **sukses** → `index-B6FCaXg2.js` 227,51 kB · gzip 76,07 kB · css 0,54 kB |
| tanpa `src/lib/a11y.ts` | `TS2307` + Rollup gagal → **build mati** (bukti bahwa berkas ini wajib) |

Anggaran build tetap: APEX gzip ≤ 90 kB (sekarang 76,07 kB) · mentah ≤ 280 kB (sekarang 227,51 kB).

## 4. Cara menerapkan

```bash
unzip niu-update-langkah6e.zip            # → pak6e/
cp -r pak6e/niu-humanoid/*  <repo Niu-Humanoid>/
cp -r pak6e/{tools,docs,verification}/*  <repo Niu-Humanoid>/
cd <repo Niu-Humanoid> && npm ci && npm run build   # harus lulus
```

**Jangan** menerapkan sebagian: `src/lib/a11y.ts` + `src/main.tsx` adalah pasangan mati-hidup.

## 5. Aturan baru (mulai berlaku)

1. Paket dari **delta repo**, bukan dari berkas yang kebetulan disentuh.
2. Paket **diuji terapkan + build** pada salinan repo upstream sebelum dikirim.
3. Verifikasi memakai **sha256**, bukan penanda teks.

## Isi paket & sha256 (8 heks pertama) — 20 berkas

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
| `tools/periksa-penerapan.py` | `2b02a6d2` | 10309 |
| `tools/gate-provenance.py` | `2651e8ca` | 7235 |
| `tools/ukur-viewport.py` | `1a9f988b` | 5333 |
| `docs/p14/JANGKAR-WAKTU.md` | `644de3e4` | 2724 |
| `docs/p14/GERBANG-PRODUKSI.md` | `ddd57d42` | 3303 |
| `docs/p14/BINGKAI-RESPONSIF.md` | `2323a9ca` | 3724 |
| `docs/p14/AUDIT-PENERAPAN-2.md` | `0f0df88e` | 5452 |
| `docs/p14/TEMUAN-P15.md` | `0312e763` | 2837 |
| `verification/p14/gate-paritas-2026-11-18c.json` | `2697a139` | 10143 |
| `verification/p14/gate-a11y-2026-11-18b.json` | `bd06bcdd` | 2335 |
| `paket/BACA-DULU-6e.md` | `fb6cac9d` | 3135 |
