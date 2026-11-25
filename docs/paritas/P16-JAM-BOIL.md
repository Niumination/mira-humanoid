# P16 — APEX: jam dinding untuk napas, dan laju edge-boil per-state

Tanggal: 2026-11-25 · Repo: `Niumination/Niu-Humanoid` · Berkas: `src/components/Figure.tsx`

Acuan absolut: `https://apex-humanoid.vercel.app` (tidak pernah dibandingkan dengan MIRA).
Semua angka diukur 1440×900 DPR1, `?auto=1`, median 9 frame, kotak "tengah" = x 420–1020, y 90–810.
Jitter acuan terhadap dirinya sendiri: 3,41 — itu lantai kebisingan pengukuran.

## 1. Patch 1 — figur memakai dua jam, bukan satu

**Temuan di bundel asli.** Loop render asli memakai dua sumber waktu:

- `A = clock.elapsedTime` (jam dinding three.js, **tanpa cap**) untuk napas dan denyut plate:
  `uBreathe = 1 + sin(A·0,9)·0,004`, `uBreathY = 0,012·sin(A·1,37)`, `z = 1 + 0,02·sin(A·2,1)`;
- `E = min(0,05, delta)` (delta ber-cap) hanya untuk **integrator**: edge-boil, vein, wave,
  pelunakan lean, dan progres blend state.

**Perilaku klon sebelum P16.** Satu jam saja: `elapsed += min(0,05, dt)` dipakai untuk semuanya.
Di mesin cepat selisihnya kecil, tetapi di mesin lambat (SwiftShader ±3 fps, yaitu kondisi
pengukuran dan juga banyak perangkat pengunjung) jam itu merayap ±5× lebih lambat dari waktu
nyata. Akibatnya figur praktis berhenti bernapas: tergeser tegak ±2 px per 400 ms di asli,
**0 px** di klon.

**Perbaikan.** Tambah `wall0 = performance.now()` sebelum loop, hitung `wallT = (now - wall0)/1000`
di tiap frame, dan pakai `wallT` hanya di tiga tempat: `z` (denyut plate), `uBreathe`, `uBreathY`.
Semua integrator tetap memakai `dt` ber-cap — tidak ada perubahan di sana.

## 2. Patch 2 — listening dipisah dari thinking

**Temuan di bundel asli.** Laju edge-boil dan vein dipilih dari **string state mentah**
(`C.includes("listen")`), bukan dari indeks blend:

| state | edge-boil | vein | uVein |
|---|---:|---:|---:|
| speaking | 2,6 + E·3 | 0,55 | 0,85 + E·0,55 |
| listening | 2 | 0,45 | 1,05 |
| thinking | 1,5 | 0,25 | 1 |
| idle | 1 | 0,25 | 1 |

**Perilaku klon sebelum P16.** `listening` dipetakan ke cabang `isThink`, sehingga tabelnya
tergeser satu baris: idle memakai **1,5** (laju thinking milik asli) alih-alih 1,0, dan
`uVein` idle ikut salah. Hasilnya figur bergolak ~50 % lebih cepat saat diam —
terukur sebagai jitter blok tubuh 18,4 di klon vs 12,6 di asli.

**Perbaikan.** Tambah `isListen = String(stateRef.current || '').includes('listen')` dan pakai
tabel di atas apa adanya. Tidak ada state baru, tidak ada perubahan mesin state.

## 3. Angka

| Varian | MAE penuh | MAE tengah | >8 penuh | >8 tengah |
|---|---:|---:|---:|---:|
| `apex-niu9` — bundel live sekarang | 7,500 | 9,345 | 34,26 % | 46,66 % |
| patch 1 saja | 7,025 | 8,063 | 32,81 % | 42,80 % |
| **P16 = patch 1 + 2** | **6,723** | **7,230** | **31,32 %** | **38,70 %** |

Peta blok 12×8 (MAE per blok), baris 1–3 = kepala & tanduk:

```
sebelum                                     sesudah P16
 0.1  0.1  0.3  0.5  0.7  7.6  6.3 ...       0.1  0.1  0.3  0.5  0.7  4.0  3.5 ...
 0.6  0.7  0.6  0.6  4.8 16.4 16.2 ...       0.6  0.7  0.6  0.6  2.8  6.4  6.4 ...
 3.9  6.4  0.8  0.4  7.2  9.1  8.9 ...       3.8  6.4  0.8  0.4  3.6  4.4  4.5 ...
```

Blok kepala 16,4/16,2 → 6,4/6,4; blok tanduk 7,6/6,3 → 4,0/3,5; blok badan 9,1/8,9 → 4,4/4,5.

## 4. Sisa selisih — bukan bagian P16

Setelah P16, selisih terbesar pindah ke **latar dan lantai**, bukan figur:
baris 4 kolom 1–2 (14,0/14,6) dan 11–12 (13,6/16,6), baris 5 kolom 11 (18,2),
dan baris 8 kolom 6 (22,6, lantai bawah-tengah). Angka blok latar ini **tidak berubah**
antara sebelum dan sesudah P16 (mis. 13,9→14,0; 22,7→22,6), jadi penyebabnya terpisah
dan sedang diselidiki. Yang sudah dicek dan **cocok** dengan asli: struktur kanvas
(`1440×900, 900×900, 900×900` + `backdrop-v1.webp`), `uRest = 0,22`, `uPulse = 2,6`,
dan jam latar `uT += min(0,05, delta)` (latar memang ber-cap, bukan jam dinding).

## 5. Provenance & cara verifikasi ulang

```bash
# 1. berkas "sebelum" = persis isi main
curl -s https://raw.githubusercontent.com/Niumination/Niu-Humanoid/main/src/components/Figure.tsx \
  | sha256sum        # de3eb5e403ab6225c9941a96af148403ae043f528446d1bf6b2803d8868c64c2

# 2. build dari berkas itu menghasilkan bundel yang SEDANG TAYANG, byte-identik
npm run build        # dist/assets/index-DeDMCu_9.js
curl -s https://niu-humanoid.vercel.app/assets/index-DeDMCu_9.js | sha256sum
                     # 873d3b54ea222267e82ee476e38b0105ac7acbf636978dbcfd6d40859d6e1110

# 3. setelah patch
npm run build        # dist/assets/index-94lMNXDT.js
                     # 4bd7f8b5d4e18a69255aef5b4d573b5290119fb249aa2d48e618a98abf5b503a
                     # CSS tidak berubah: index-6uyipbpF.css
```

## 6. Risiko & rollback

- Perubahan terbatas pada 3 uniform napas/denyut dan 3 ekspresi laju; tidak menyentuh shader,
  geometri, aset, mesin state, atau hook `window.__HUM_*`.
- `__HUM_FREEZE_T` tetap menang atas kedua jam, jadi mode beku untuk pengukuran tidak berubah.
- Rollback = kembalikan satu berkas (`Figure.tsx.sebelum-p16` yang dibuat `terapkan.sh`),
  atau `git revert` commit penerapan.
