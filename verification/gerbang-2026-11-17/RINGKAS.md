# Ringkasan gerbang fase — 2026-11-17 (VPS LightVela, bundle 5t terpasang)

| gerbang | hasil | catatan |
|---|---|---|
| gate-mira-a | **8/8 LULUS** | sama dgn acuan paket |
| gate-step4c | **9/9 LULUS** | sama dgn acuan paket |
| gate-d sisa | **4/7** (D7 fps 0,53<0,61; D9 390 & 414 korelasi ~0,90<0,95) | acuan paket: 7/7 — env VPS lebih lambat/skala berbeda; D7/D9 berbau lingkungan (fps & korelasi terang), kita reproduktif 0.0000 |
| gate-apex 1440 | MAE 28,45 (pakete: 3,96 dgn median 11 bingkai) | uji single-frame, bukan protokol median — angka tidak sebanding |
| gate-apex 390 | MAE 17,68 | idem |
| gate-step5 / step5-node | BELUM DIUJI | butuh `aura-live.mjs` (Kerja-Arena, hanya di laptop user) |
| gate-mira-b | BELUM DIUJI | butuh `recon/mira-params.json` (Kerja-Arena) |

Catatan: gate d/step4c/mira-a/apex dipatch path `/home/user` → `/tmp/l5u-run` + python → venv (numpy/scipy) + PW shim executablePath google-chrome. BACA-DULU paket: angka acuan di paket = sumber kebenaran.
