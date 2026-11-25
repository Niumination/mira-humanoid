# TERAPAN — paket UPSTREAM-P15 (2026-11-25)

Paket `UPSTREAM-P15.zip` (7 berkas; MANIFEST 6/6 sha256 terverifikasi). Lingkup: repo MIRA,
satu berkas sumber `src/components/MiraStage.tsx`. Hipotesis "kanvas ke-3" P14 **dibatalkan**
oleh paket (kanvas itu width:0/opacity:0 — diagnostik, bukan penyebab) — terima dan catat.

## Diterapkan
- `src/components/MiraStage.tsx` ← versi P15 (cadangan: `.sebelum-p15`).
- `docs/P15-JAM-NAPAS.md`, `docs/banding-mira-p15.png`.

## Verifikasi sendiri (live, preview lokal 1440×900, ?auto=1&t=9)
- Build bersih exit 0 → bundel baru `index-DijfMHLM.js` 534 555 B (sha `57c123ced396e6e7`) — src memang berubah.
- **Jitter (gerak antar-frame)**: P15 default **1,6** vs perilaku lama **0,00** (`?ft=0.15&ac=0.1&bs=0`
  tetap mereproduksi perilaku lama — rollback tanpa rollback ✅). Jam sekunder hidup; napas aktif.
- Klaim paket (MAE penuh 8,257→6,396 vs rujukan legacy) tidak diukur ulang penuh di sini;
  verifikasi perilaku (jitter) sudah membuktikan perubahan inti diterapkan.

## Deploy
- Commit/push → git-link Vercel deploy otomatis (project mira-humanoid-niu).
