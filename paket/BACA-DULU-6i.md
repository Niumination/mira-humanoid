# BACA-DULU-6i — MIRA: alur deploy yang bisa direproduksi dari repo + gerbang satu perintah

tanggal: 2026-11-19 · pasangan 6g (APEX) / 6h (MIRA)

## 1. Apa yang diaudit

| yang diperiksa | hasil |
|---|---|
| `mira-humanoid@44e5da6226` kode `src/` | **67/67 sama** dengan workspace → tidak ada yang perlu dikirim |
| `tools/gate-paritas.js` | **v4** (11 999 B, `JANGKAR` MIRA `?t=11.5` / APEX `?t=9`) ✔ sudah terpasang |
| `tools/gate-provenance.py` | v5 ✔ sudah terpasang (punya `--pola`, 0 berkas = FATAL) |
| `verification/p13/asli-sidik.json` | **sudah benar** (`apex-idle` = `ba1a6d93…` = asli) ✔ |
| plate MIRA di repo | `mira-idle` `8409aa77647ed8d5`, `mira-hair` `6c5e6791e3a5b9db` ✔ |
| `src/main.tsx` judul | `MIRA Humanoid` ✔ (sudah dikoreksi) |
| **`vite.config.ts`, `tsconfig.json`, `vercel.json`, `index.html`, `.gitignore`** | ❌ **tidak ada di repo** |
| `README-DEPLOY.md`, `VERIFIKASI-DEPLOY.md`, `CATATAN-TEMUAN.md`, `LICENSE`, `NOTICE` | ❌ tidak ada di repo |

**Artinya:** repo MIRA tidak bisa di-`npm run build` + `vercel deploy` tanpa menambal lima berkas konfigurasi —
persis masalah yang baru tertutup untuk APEX. Ini yang ditutup paket 6i.

## 2. Isi paket (13 berkas)

### 2.1 Konfigurasi deploy (5) — inilah inti paket

| berkas | isi | kenapa wajib |
|---|---|---|
| `vite.config.ts` | `server.allowedHosts: true`, port dev 5190 | tanpa ini dev server menolak host preview |
| `tsconfig.json` | target ES2020, jsx react-jsx | `tsc -b` gagal tanpa ini |
| `vercel.json` | `framework: vite`, `outputDirectory: dist`, rewrite SPA | tanpa ini deploy bukan SPA |
| `index.html` | judul `MIRA Humanoid`, `#root` | titik masuk build |
| `.gitignore` | `node_modules`, `dist`, `.vercel` | mencegah artefak masuk repo |

### 2.2 Dokumen (5)

`README-DEPLOY.md` (cara build & deploy) · `VERIFIKASI-DEPLOY.md` · `CATATAN-TEMUAN.md` · `LICENSE` ·
`NOTICE` (dokumen hukum; **tidak** mengubah merek — branding tetap APEX/MIRA sesuai keputusan).

### 2.3 Alat & peta kerja (3)

`tools/gerbang-semua.sh` (**baru**, P-3): menjalankan provenance → aset-layout → a11y → paritas dengan satu
perintah, gerbang yang tidak bisa dijalankan dihitung **GAGAL** (bukan dilewati), menulis
`verification/gerbang/ringkas-<tanggal>.json`, keluar 1 bila ada yang gagal.
`docs/PETA-KESENJANGAN-P15.md` (apa yang tersisa setelah P14) · `docs/p14/AUDIT-PENERAPAN-3.md`.

## 3. Uji terapkan

Salinan `mira-humanoid@44e5da6226` + isi paket → `npm ci` → `tsc -b` → `vite build` harus lulus dan menghasilkan
`index-BiuEEVDg.js` `17fc09d82f4fd52c` (bundel yang **sekarang tayang**), sehingga "produksi = repo" bisa
dibuktikan dengan hash.

## 4. Sesudah menerapkan

```bash
npm ci && npm run build                 # harus lulus
npx vercel deploy --prod                # Hermes
python3 tools/gate-provenance.py --live https://mira-humanoid-niu.vercel.app/ --pola 'mira-*'   # 2/2
bash tools/gerbang-semua.sh             # ringkasan 4 gerbang
```
