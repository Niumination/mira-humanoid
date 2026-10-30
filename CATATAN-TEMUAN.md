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
