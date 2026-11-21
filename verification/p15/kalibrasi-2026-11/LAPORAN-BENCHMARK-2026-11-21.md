# P15 — HASIL BENCHMARK 3 COLD-RUN (v1, 2026-11-21)

Harness: `tools/benchmark-p15.cjs` (scene-ready + cold-context per run + 8 sampel × 250 ms).
Matriks: 4 target × 3 viewport (1440×900, 414×896, 390×844) × 3 run. DPR 1, SwiftShader, cache baru.
Metode per target: APEX asli = **time-windowed** (bundle asli TIDAK punya `get("t")` — dibuktikan dari
`index-BD7VNgkM.js`); tiga lainnya = **exact-anchor** (`?auto=1&t=…`).

## Angka: cakupan layar median 3 run (rentang antar-run) — mask seluruh layar L>20, BUKAN mask figur

| target | 1440×900 | 414×896 | 390×844 | animasi maks | muat median |
|---|---|---|---|---|---|
| APEX asli (t akhir window) | 14,5% (14,4–14,6) | 11,2% (11,0–11,4) | 11,3% (11,2–11,9) | 0,074–0,116 | 5–6 s |
| APEX rekon (t=9) | 34,2% (0,3423) | 27,4% (0,2744) | 27,7% (0,2766) | 0,005–0,038 | 35–58 s |
| MIRA legacy (t=11,5) | 47,3% (47,2–47,3) | 44,9% (44,7–44,9) | 45,0% (44,8–45,0) | 0,014–0,020 | 43–103 s |
| MIRA rekon (t=11,5) | 48,4% (0,4844) | 50,2% (0,5019) | 50,4% (0,5043) | 0,000 | 28–64 s |

Semua run 3/3 scene-ready. Validasi viewport per file PNG: ukuran piksel sesuai (1440×900 / 414×896 / 390×844).

## Interpretasi — tetap DIAGNOSTIK, bukan putusan setara

1. **MIRA rekon vs legacy: selisih kecil & konsisten** — 48,4 vs 47,3 (desktop), 50,2 vs 44,9 / 50,4 vs 45,0
   (ponsel). Selisih +2,7 s.d. +5,5 poin persentase. Konsisten dengan probe arena.ai (48,7 vs 46,1).
   Dengan label legacy tetap terpasang, ini **petunjuk kedekatan**, bukan bukti kesetaraan.
2. **APEX: selisih besar (2–3×)** — tapi dua sebab metodologis belum dipisah:
   (a) metode beda: asli time-windowed (animasi masih berjalan, cakupan tumbuh 4→14% dalam 2 s) vs rekon
   exact-frame beku; (b) mask seluruh layar memasukkan glow/backdrop — dan backdrop rekonstruksi jauh lebih
   terang/penuh (temuan probe sebelumnya). **Mask figur tervalidasi wajib sebelum ada putusan.**
3. **Reproduksibilitas**: rentang antar-run sangat sempit (≤0,001 rekon & MIRA; ≤0,006 asli) → harness andal.
4. **Aneh tercatat**: muat rekon APEX jauh lebih lama (35–58 s) dibanding asli (5–6 s) — jaringan/dns atau
   bundle yang lebih berat di cold-load. Perlu diuji ulang di luar benchmark sebelum ditafsirkan.
5. **Aneh tercatat 2**: MIRA legacy muat 103 s di desktop (vs 43–46 s ponsel) — domain legacy lambat;
   mendukung keputusan menjauhinya dari deploy resmi.

## Kesenjangan menuju putusan (protokol v1)

- [ ] Mask figur tervalidasi (anotasi manual + IoU antar penilai) → memisahkan figur vs glow.
- [ ] Penyamaan keadaan semantik utk APEX: pilih window waktu yang benar-benar sepadan dengan t=9.
- [ ] Uji E1/E2/E4/E5 (3/5 masih jauh: baru E3 terbukti).
- [ ] (pemilik) konfirmasi status `mira-humanoid.vercel.app` bila ingin mengangkat label legacy.

**Putusan tetap: belum final.** Bukti: JSON per-run di folder ini + PNG sampel (run 0, frame akhir).
