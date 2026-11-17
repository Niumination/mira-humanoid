# Catatan P14 — aksesibilitas, tata letak ponsel, dan gerbang baru

Ditulis: 2026-11-17 (sesi 58) · bukti: `verification/gate-aset-layout-2026-11-17.json`,
`verification/gate-a11y-2026-11-17.json`, `verification/kalibrasi/*`

## 1. Yang berubah di `src/` (kedua aplikasi)

| berkas | perubahan | alasan |
|---|---|---|
| `src/main.tsx` | `<main>` landmark + `<h1 class="sr-only">` (judul aplikasi) | A4 & struktur judul; **tidak mengubah tata letak** karena `#root` sudah `position: fixed; inset: 0` dan `<main>` memakai kotak yang sama |
| `src/lib/a11y.ts` (baru) | `pasangReducedMotion()` menandai `<html data-reduced-motion="1">` saat `prefers-reduced-motion: reduce`; `gerakDikurangi()` untuk pemakaian lain | A7 |
| `src/index.css` | `.sr-only` + blok `@media (prefers-reduced-motion: reduce)` yang mematikan animasi/transisi CSS | A7 |
| `apex …/HumanoidMode.tsx` | bar debug diberi `maxWidth: calc(100vw - 16px)`, `flexWrap: wrap`, `justifyContent: center` | di 390 px bar ini melebar 462 px sehingga **3 tombol keluar layar** (S2 gagal) |

## 2. Angka sebelum → sesudah (Chromium headless-shell nyata)

| ukuran | sebelum | sesudah |
|---|---|---|
| `gate-aset-layout` total | 32/34 | **34/34** |
| APEX 390×844 tombol keluar layar | 3 (`#debug-bar` kiri −36, `idle` kiri −36, `SOUND` kanan 426 vs viewport 390) | **0** |
| APEX 414×896 tombol keluar layar | 3 | **0** |
| `gate-a11y` total | 10/16 | **16/16** |
| MIRA/APEX: `<main>` | tidak ada | ada |
| MIRA/APEX: `data-reduced-motion` | `null` | `1` (elemen beranimasi/transisi di lingkungan reduce: 0) |
| kontras teks terburuk | tidak terukur (alat salah sasaran) | MIRA 12,50:1 · APEX 12,22:1 (ambang 4,5:1) |
| SHA-256 aset di halaman vs di disk | — | **10/10 identik** (8 APEX + 2 MIRA) |

Build setelah perubahan:

| aplikasi | berkas | sha256 (16) | ukuran | gzip |
|---|---|---|---|---|
| APEX | `dist/assets/index-Ddu4_X7n.js` | `767902d865fcaaee` | 234 959 B | 77 853 B |
| MIRA | `dist/assets/index-BiuEEVDg.js` | `17fc09d82f4fd52c` | 533 885 B | 129 779 B |

## 3. Dua koreksi alat (bukan koreksi aplikasi)

1. `tools/gate-a11y.js` A6 v1 mengambil sampel **wadah** penuh layar (`[data-testid=mira-humanoid-mode`)
   sehingga melaporkan kontras 1,00:1 — salah sasaran. v2 hanya menyampel elemen yang **punya teks
   sendiri** (`childNodes` berisi node teks), dan menelusuri leluhur untuk latar efektif.
2. `tools/gate-mira-a.js` membandingkan **semua** node daun dengan live; `<h1 class="sr-only">` baru ikut
   terhitung sehingga 2 butir gagal palsu. Alat sekarang menyaring elemen yang tidak terlihat
   (`class="sr-only"` dan kotak ≤ 1 px) — perbandingan copy tetap visual-vs-visual.

## 4. Temuan yang belum diperbaiki (masuk P15)

1. **MIRA 414×896**: cakupan siluet **4,1 %**, padahal 390×844 = **25,3 %** dan 1440×900 = **19,6 %**
   (acuan pada 414: 23,5 %). Ada titik patah tata letak antara 390 dan 414 px. Diukur `gate-paritas` v2:
   `verification/gate-paritas-2026-11-17.json`. **Koreksi**: catatan awal sesi ini sempat menyebut
   "cakupan MIRA di 1440 hanya 1,5 %" dan "ponsel MIRA jauh lebih besar dari acuan" — keduanya **salah
   ukur** dari v1 dan sudah dibatalkan; lihat `docs/p14/KALIBRASI-PARITAS.md` §4.
2. **Gerak dikurangi pada adegan kanvas** — A7 kini menjamin animasi/transisi CSS mati; gerak di dalam
   kanvas (partikel, bloom, napas figur) belum dikurangi. Perlu keputusan desain, bukan tambal cepat.
3. **APEX tampak lebih luas/terang daripada acuan** di semua viewport (cakupan 24–30 % vs 7–10 %).
   Belum diputuskan apakah itu perbedaan komposisi panggung atau efek ambang luma `L > 20` pada latar
   kita yang baru — perlu satu pengukuran pembanding sebelum diklaim sebagai kelebihan.
