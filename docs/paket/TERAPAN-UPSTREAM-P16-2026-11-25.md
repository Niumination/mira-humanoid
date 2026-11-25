# TERAPAN — paket UPSTREAM-P16-FINAL (2026-11-25)

Paket gabungan (MANIFEST 19/19 ✅) dari dua zip P16 yang berisisama di Drive.
Lingkup: patch runtime APEX `src/components/Figure.tsx` + docs paritas + kit ukur
`tools/paritas/` (kedua repo). MIRA: docs+tools saja (tanpa patch kode).

## Dua patch runtime APEX
1. **Jam dinding untuk napas** — asli pakai `clock.elapsedTime` tanpa cap utk uBreathe/uBreathY/z;
   klon pakai satu jam ber-cap → di mesin lambat figur berhenti bernapas (0 px vs ±2 px).
   Fix: `wallT = (performance.now()-wall0)/1000` hanya di 3 uniform itu; integrator tetap dt ber-cap.
2. **`listening` dipisah dari `thinking`** — tabel laju edge-boil/vein kini dari string state
   mentah (idle=1,0, bukan 1,5).

## Verifikasi sendiri
- `Figure.tsx` main sha `de3eb5e4…` = persis dasar patch (dibuktikan via GitHub raw).
- Build: `index-94lMNXDT.js` (sha `4bd7f8b5d4e18a69…`) — **cocok klaim paket**; CSS tak berubah.
- Perilaku: jitter frame preview P16 **4,72** vs pra-P16 **0,00** → napas/jam dinding hidup ✅.
- Klaim MAE paket (7,500→6,723) **belum direplikasi** di pengukuran kit paritas di sini:
  live pra-P16 = 7,31/8,24; P16 preview = 7,68/9,34 (metode & timing capture berbeda dari
  penyusun paket — live pakai time-window asli vs preview; angka paket dipertahankan sbg
  klaim upstream, bukan bukti lokal). Peta blok: kepala 10,7 vs paket 6,4 — selisih sisa
  konsisten dgn catatan paket bahwa sisa terbesar kini di latar/lantai (P17/P18).

## Adaptasi alat (sudah dikenal, pola DEVIASI-ALAT)
- `tangkap.js`/`probe-dom.js` → `.cjs` (repo `"type":"module"`, pola sama dgn 6l).
- `gerbang-paritas.sh`: python3 → `/usr/bin/python3` (numpy), chromium launch via `CHROME_BIN`.
- Kit butuh playwright-core lokal (dipasang di /tmp/pw v1.55 + browser 1255 yang ada).

## Setelah ini (ROADMAP-PARITAS)
P17 jalur aditif figur (lantai terang), P18 backdrop lereng, P19 rambut MIRA,
P20 cakupan state, P21 pagar `?t=`, P22 gerbang akhir (APEX ≤5,0/≤6,0).
