# Catatan Temuan — mira-humanoid (paket update 2026-10-30)

> Catatan saja, BELUM dieksekusi. Repo dibuat tanpa perubahan kode.

## Temuan untuk ditindaklanjuti (opsional)

1. **`PENGHAPUSAN-2026-10-30.md`, `sync-upstream.sh`, `BACKUP-README.txt`, `README-UPDATE.md`** ada di paket root (di luar folder app) — tidak ikut repo. Isinya instruksi update + penghapus otomatis workspace; simpan di luar repo sudah tepat, tapi catat bahwa `sync-upstream.sh` belum dijalankan untuk verifikasi kesamaan pasca-push.
2. **Vercel deploy pertama "Blocked"** (Deployment Protection/SSO akun hobby) — deploy kedua Ready & ter-alias `mira-humanoid.vercel.app` (200 publik). Pola sama dengan Niu-Humanoid.
3. **Build config**: `tsc --noEmit && vite build` — lulus di Vercel (9s). `vercel.json` framework vite + SPA rewrite.
4. **Paket menyebut "repo mira-humanoid belum dibuat"** — kini sudah dibuat: `Niumination/mira-humanoid` (private).
5. **Docs & tools update masuk ke repo Niu-Humanoid** (bukan ke sini): `docs/` (recon MIRA, verifikasi step2b/live-t95/build-stage16..21) + `tools/` (skrip Playwright) — commit `1f2f997`.

## Status deploy
- Repo: `Niumination/mira-humanoid` (private), commit awal tanpa perubahan kode
- Vercel: project `mira-humanoid`, production Ready
- URL: https://mira-humanoid.vercel.app

## Langkah 3 (paket niu-update-langkah3.zip, 1 Nov) — DITERAPKAN
- `src/`: shock shader baru (shock.frag/vert.glsl) + update MiraStage, comp, picColor, blit — tanpa perubahan manual
- `docs/langkah3/`: 12 PNG verifikasi (build6 vs live, t=0.3..9.5) + `docs/mira/gate-deploy-niu.json`
- Build lokal lulus: bundle baru `index-DZGcjv2t.js` 401,81 kB (gzip 94,14 kB)
- Deploy: https://mira-humanoid-niu.vercel.app — sha256 bundle produksi = build lokal (68b1b5e0a7e7b567…), penanda "shock" ada di bundle ✅
- `docs/PROGRESS.md` & `REBUILD-LOG.md` versi baru → repo Niu-Humanoid (commit terpisah)

## Langkah 3b (paket niu-update-langkah3b.zip, 1 Nov) — DITERAPKAN
- `src/`: update `MiraStage.tsx` + `miraMatter.ts` (2 file) — tanpa perubahan manual
- `docs/langkah3/`: build7 tangkapan (6 png, t=0.3→9.5) + `tools/probe-mira-field.js`
- Build lokal lulus: bundle `index-p8VjQZkw.js` 402,08 kB
- Deploy: https://mira-humanoid-niu.vercel.app — sha256 produksi = build lokal (d3dc9a0501e0c61d…) ✅
- `PROGRESS.md` & `REBUILD-LOG.md` versi 3b → repo Niu-Humanoid
