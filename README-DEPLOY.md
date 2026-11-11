# MIRA Humanoid — rebuild

Aplikasi produksi: **https://mira-humanoid-niu.vercel.app/** (acuan live: https://mira-humanoid.vercel.app/)

```bash
npm ci
npm run dev         # http://localhost:5190
npm run build       # dist/
vercel deploy       # lalu kirim URL-nya
```

## Status (2026-11-11)

| bagian | isi | status |
|---|---|---|
| P1.3–P1.5 | verifikasi 82 parameter / 20 seksi / 7 alias / 13 query param vs bundle live | ✅ 82/82 |
| 1 | entry screen + seluruh baris tombol | ✅ Gerbang A 8/8 (di produksi) |
| 2 | mesin garis (wire shader) + ignition | ✅ |
| 3 | kuad gambar + gamma/underHair | ✅ |
| 4 | mesin audio verbatim | ✅ 9/9 (di produksi) |
| 5 | aura / Her states / SPEED / REPLAY | ✅ 6/6 (di produksi) |
| 6 | tangan MediaPipe + MIC nyata | ✅ 8/8 (di produksi) |
| 7 | panel 82 slider + `?dial.<key>=` + localStorage + 7 alias | ✅ Gerbang B 10/10 (di produksi) |
| 8 | bloom (luminansi → 8 mip → komposit) | ✅ |

Gerbang D (handoff + viewport): **7/7 di produksi** — reproduktibilitas 0,0000 · seam 1,50 (live 1,48) ·
fps 0,95 vs live 0,52 · stabil 120 s · ponsel 390 korelasi **0,9912**, 414 **0,9913**.

Batas yang diketahui: paritas piksel rata-rata **2,76** pada 6 fase acuan (live 0,00–0,55); sisa terpusat
di torso dan berbentuk detail halus. Rincian: `docs/langkah6/ANALISIS-GERBANG-C.md`.

Deploy APEX yang sudah live: https://niu-humanoid.vercel.app — **sumbernya terpisah** (lihat W-7 di
`DELIVERABLE.md`; repo root ini hanya MIRA).
