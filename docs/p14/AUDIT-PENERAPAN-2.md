# AUDIT PENERAPAN KEDUA — 2026-11-18 (setelah paket 5z–6c)

Ditulis setelah klaim "semua paket terbaru sudah diterapkan". Diuji lagi, tidak dipercaya.
Alat: `tools/periksa-penerapan.py` (kini dengan **lapis produksi** yang tidak butuh build).
Bukti: `verification/penerapan/penerapan-2026-11-18b.json`.

## 1. Putusan

| aplikasi | repo (commit) | produksi (aset) | putusan |
|---|---|---|---|
| **MIRA** | `1b5837cd` — memuat 5z? **tidak**, 6a/6b sebagian, 6c sebagian | `index-BiuEEVDg.js` `17fc09d82f4fd52c` — **sama** dengan build repo | **P14 aktif, paket 5z–6c BELUM masuk di repo** |
| **APEX** | `49e011dd` — **tidak berubah** sejak 5y | `index-Ddu4_X7n.js` `767902d865fcaaee` — **build 5x** | **5x aktif di produksi, tetapi 5z–6c belum masuk di repo maupun produksi** |

Bukti bahwa 5x aktif di produksi APEX (dibaca dari bundel yang benar-benar disajikan browser):

| penanda di `index-Ddu4_X7n.js` | ada? |
|---|---|
| `sr-only` (judul aksesibel) | **ya** |
| `calc(100vw - 16px)` (perbaikan bar debug ponsel) | **ya** |
| `data-reduced-motion` | **ya** |

Dan plate produksi APEX sudah milik kita: `apex-idle-v1` `9f7ee35b7a61` · `backdrop-v1` `35539292a3b9` ·
`mira-idle-v1` `8409aa77647e` · `mira-hair-v1` `6c5e6791e3a5` — semuanya ada di tabel sidik `p13/baru`.
Jadi **P13 di produksi APEX sudah benar**, walaupun **repo APEX masih menyimpan plate asli**.

## 2. Rincian yang belum masuk per repo

| paket | APEX (`Niu-Humanoid`) | MIRA (`mira-humanoid`) |
|---|---|---|
| 5z | `periksa-penerapan.py`, `AUDIT-PENERAPAN.md`, `verification/penerapan/*` **tidak ada**; `HumanoidMode.tsx` beda | idem |
| 6a | `gate-provenance.py` **tidak ada** | **ada** (versi sedikit berbeda; lokal punya `--live`, `--larang-dari`) |
| 6b | `ukur-build.py`, `ukur-viewport.py`, `PETA-REGRESI.md`, `verification/riwayat/*` **tidak ada**; `gate-paritas.js` = v2 | alat ada; `riwayat` sebagian (`ukur.json` tidak ada) |
| 6c | `BINGKAI-RESPONSIF.md`, bukti `verification/p14/*` **tidak ada**; `gate-paritas.js` = v2; `STATUS-ROADMAP.md` beda | `gate-paritas.js` = v2 (belum v4); bukti `p14` tidak ada |

Berkas `tools/gate-paritas.js` di kedua repo masih **v2** (8 360 B, tanpa `JANGKAR`/`TUNGGU_MS`, masih
`waitForTimeout(2600)`). Versi lokal v4 = 10 336 B.

## 3. Koreksi angka: P13 di produksi SUDAH 10/10, tetapi gerbang lokal bilang 0/10

`gate-provenance.py` memeriksa **berkas di direktori lokal**. Karena workspace saya dipulihkan ke keadaan
repo APEX (yang masih berisi plate asli, lihat audit pertama), gerbangnya melaporkan **0/10** — benar untuk
repo, **menyesatkan untuk produksi**.

| yang diperiksa | APEX | MIRA |
|---|---|---|
| berkas di repo upstream | **0/10** milik kita (10 salinan asli) | 2/2 milik kita |
| berkas yang **disajikan produksi** | **4/4 diperiksa → semua milik kita** | 2/2 milik kita |

Karena itu paket berikutnya menambahkan `--live` sebagai butir gerbang (bukan hanya opsi), dan **memisahkan
putusan "repo" dan "produksi"** supaya tidak ada lagi satu angka yang bisa dibaca dua arah.

## 4. Kesalahan proses yang saya akui

Paket 5z–6c saya susun dan sudah saya nyatakan "siap terap" **sebelum** penerapannya terjadi. Akibatnya:
- commit MIRA `1b5837cd` hanya memuat sebagian (nama commit menyebut "6a-6c", isinya belum lengkap);
- repo APEX tidak berubah sama sekali;
- saya hampir melaporkan "sudah selesai" berdasarkan klaim, bukan bukti — yang justru pola yang audit
  pertama saya kritik sendiri.

Perbaikan proses: **paket yang menyentuh `src/` dan `tools/` diverifikasi terhadap produksi lebih dulu**
(lapis penanda bundel), dan status tiap paket punya tiga kolom: lokal · repo · produksi.

## 5. Yang masih terbuka setelah audit ini

1. Paket 5z–6c perlu diterapkan **ulang dan lengkap** ke APEX dan MIRA (paket 6d membawa yang kurang).
2. `?t=` untuk APEX belum ada → gerbang APEX masih bergantung waktu tunggu 9 s (paket 6e).
3. Bukti produksi harus diukur langsung di URL produksi (paket 6f).

## 6. Koreksi: ketiga butir di atas sudah dikerjakan di paket 6d (2026-11-18)

Bagian 5 ditulis sebagai rencana; bagian ini mencatat hasilnya supaya dokumen tidak berhenti pada janji.

| butir terbuka | hasil |
|---|---|
| 1. paket 5z–6c diterapkan ulang | menjadi paket **6d** (11 berkas) — dimuat di `paket/BACA-DULU-6d.md` |
| 2. `?t=` untuk APEX | **selesai**: `src/App.tsx` + `src/components/HumanoidMode.tsx`; `?t=9` → MAE diri 4,05/2,76/2,82 · Δ cakupan 0,0475 → **0,0048** |
| 3. bukti produksi | **selesai**: `gate-aset-layout` (urutan pengganti: `SUMBER=produksi`) **34/34** sudah mencakup produksi; a11y produksi **16/16**; provenance produksi APEX 10/10 · MIRA 2/2 |

Dua butir a11y APEX yang dulu gagal kini lulus di **repo dan produksi**:

| butir | repo sebelum | repo sesudah | produksi |
|---|---|---|---|
| A4 landmark `<main>` | gagal | **PASS** | PASS |
| A7 reduced-motion | gagal (`null`, 2 beranimasi) | **PASS** (`=1`, 0 beranimasi) | PASS |

Penyebab A7: `src/lib/a11y.ts` **ada** tetapi tidak pernah dipanggil, dan `src/index.css` tidak memuat blok
`@media (prefers-reduced-motion)`. Pernyataan lama "APEX belum punya `a11y.ts`" salah — dikoreksi di sini.

**Peringatan yang tetap berlaku:** produksi yang diukur ronde ini adalah bundel `index-Ddu4_X7n.js`
(`767902d865fcaaee`), sedangkan repo sekarang menghasilkan `index-ffx1NC0u.js` (`7daca178a692f337`). Hasil
produksi di atas adalah bukti "yang tayang", bukan bukti "repo sekarang".
