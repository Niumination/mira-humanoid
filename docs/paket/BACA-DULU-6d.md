# BACA-DULU-6d — APEX mendapat jangkar waktu `?t=` (dan mengapa itu perlu)

tanggal: 2026-11-18 · dasar: paket 6c

## 1. Apa yang salah sebelum paket ini

Gerbang APEX mengukur dengan `?auto=1` + tunggu 9 detik. Diukur dua run pada 1440×900:

| ukuran | nilai |
|---|---|
| MAE diri | 17,40 dan 12,63 |
| Δ cakupan antar run | **0,0475** |

Angka itu terlalu goyah untuk dipakai sebagai kriteria lulus/gagal — persoalannya sama dengan MIRA sebelum
memakai `?t=` (cakupan MIRA bisa 0,042 atau 0,507 hanya karena detik tangkapan berbeda).

## 2. Yang dilakukan

APEX **belum** punya parameter waktu lewat URL. Sekarang punya:

| berkas | perubahan |
|---|---|
| `src/App.tsx` | `?t=` ikut memicu masuk mode humanoid (dulu hanya `?auto`) |
| `src/components/HumanoidMode.tsx` | `tPin` dibaca dari URL; `t0` dimundurkan `tPin` detik; jalur "sudah lahir" dipakai; jam steady dikunci `tPin + 0,35` |

Tanpa `?t=`, **tidak ada satu pun cabang yang aktif** → perilaku lama utuh (dibuktikan: `?auto=1` masih
memberi `__HUM_FADE.p = 1` dan tangkapan normal).

## 3. Hasil (1440×900, dua run)

| ukuran | sebelum `?auto=1` | sesudah `?t=9` |
|---|---|---|
| MAE diri | 17,40 · 12,63 | **6,47 · 6,19** |
| Δ cakupan antar run | 0,0475 | **0,0048** |

`gate-paritas.js` sekarang memakai `APEX_JANGKAR=?t=9` (bisa diubah lewat env).

## 4. Kenapa 0,35 s

`tPin + 0,35` membuat `drawSteady` melihat `t > TIMELINE.total` (7,4 s) **dan** umpan silang state pertama
(durasi pendek) sudah selesai. Diverifikasi langsung: `window.__HUM_FADE.p = 1` pada 5 cuplikan berturut-turut
pada `?t=9`.

## 5. Batas

* Jangkar memaku **fase**, bukan denyut/partikel: sisa derau Δ cakupan 0,0048 berasal dari itu.
* Baru diukur di 1440×900. 390/414 menyusul.
* `?t=` adalah lapisan tambahan; hook `__HUM_FREEZE_T` / `__HUM_ASM_EL` tetap didahulukan.

## 6. Bonus yang ikut di paket ini: a11y APEX 14/16 → 16/16

Dua kegagalan a11y APEX selama ini adalah **lubang nyata di repo**, dan keduanya terbukti bukan sekadar
"gerbang rewel":

| butir | sebelumnya | sesudah | perubahan |
|---|---|---|---|
| A4 landmark `main` | gagal | **PASS** | `src/main.tsx`: `<main>` membungkus `<App/>` |
| A7 reduced-motion | gagal (`data-reduced-motion=null`, 2 elemen beranimasi) | **PASS** (`=1`, 0 elemen) | `src/lib/a11y.ts` dipanggil + blok `@media (prefers-reduced-motion)` di `src/index.css` |

`a11y.ts` **sudah ada** di repo APEX tetapi tidak pernah dipanggil — itu sebab `data-reduced-motion` kosong.
Catatan: berkas ini ternyata sudah ada sejak awal; pernyataan lama "APEX belum punya a11y.ts" salah dan
dibatalkan di sini.

Hasil gerbang pada build `index-ffx1NC0u.js` (235 200 B, gzip 78,15 kB) setelah perubahan:
**a11y 16/16 · aset-layout 34/34 · paritas 24/24**.

## Isi paket & sha256 (8 heks pertama) — 14 berkas

| berkas | sha256 | byte |
|---|---|---|
| `niu-humanoid/src/App.tsx` | `115a465a` | 1641 |
| `niu-humanoid/src/components/HumanoidMode.tsx` | `313807d2` | 22974 |
| `niu-humanoid/src/main.tsx` | `3b28e040` | 865 |
| `niu-humanoid/src/index.css` | `50c8547b` | 566 |
| `docs/p14/JANGKAR-WAKTU.md` | `644de3e4` | 2724 |
| `docs/p14/GERBANG-PRODUKSI.md` | `ddd57d42` | 3303 |
| `verification/p14/gate-paritas-2026-11-18c.json` | `2697a139` | 10143 |
| `verification/p14/gate-a11y-2026-11-18b.json` | `bd06bcdd` | 2335 |
| `verification/produksi-gate/gate-aset-layout-produksi-2.json` | `fcb0de30` | 3496 |
| `verification/produksi-gate/gate-a11y-produksi.json` | `d0be5454` | 2346 |
| `verification/penerapan/penerapan-2026-11-18b.json` | `cddc3340` | 5890 |
| `docs/p14/AUDIT-PENERAPAN-2.md` | `0f0df88e` | 5452 |
| `STATUS-ROADMAP.md` | `63c6173c` | 8757 |
| `paket/BACA-DULU-6d.md` | `a4554771` | 2751 |
