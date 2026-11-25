# APEX — Diagnosa P16: dari mana sisa selisih 7,29 berasal

Tanggal: 2026-11-25 · Acuan: `https://apex-humanoid.vercel.app`
Uji: `https://niu-humanoid.vercel.app` (kondisi live setelah P14)

## 1. Prosedur ukur

- Viewport **1440×900, DPR 1**, Chromium headless (ANGLE/SwiftShader), audio mati.
- URL `?auto=1`, tunggu **11 detik** agar transisi masuk selesai, lalu ambil **9 frame** jarak 400 ms.
- Semua elemen UI `position: fixed|absolute` yang bukan kanvas/gambar disembunyikan.
- Frame digabung dengan **median** per piksel → menekan animasi acak.
- MAE dihitung pada RGB 0–255; kotak "tengah" = `x 420..1020, y 90..810`.
- **Lantai derau**: median-vs-frame pada situs asli = **3,62**. MAE di bawah ini mustahil.

## 2. Hasil

| Varian | MAE penuh | MAE tengah | luma |
|---|---:|---:|---:|
| klon live (apa adanya) | **7,290** | **8,863** | 23,92 (asli 22,68) |
| klon + `mixBlendMode: normal` dipaksa pada kanvas latar | 8,030 | 8,981 | 21,83 |
| klon, **latar saja** (kanvas figur 900×900 disembunyikan, 5 frame) | **5,236** | 4,032 | 17,75 (asli 17,90) |

### Peta blok 12×8 — latar saja

Tengah bidang nyaris sempurna (**0,3–0,6**). Error terpusat di **lereng gunung kiri dan kanan**:
blok **14,7 · 15,7 · 14,2 · 18,5 · 20,3**. Pola ini khas **selisih bentuk/kontur**, bukan selisih warna
(selisih luma latar hanya 0,15).

### Scene penuh

Kelebihan terang di **lantai tengah-bawah**: **+3,7…+6,3** pada `y > 720`, puncak **+9,3** pada `x 600–840`.
Karena varian "latar saja" tidak memilikinya, kelebihan ini **berasal dari lapisan figur**.

Tersangka kode (repo `Niu-Humanoid`):
- `src/components/Figure.tsx` — `gl.blendFunc(gl.SRC_ALPHA, gl.ONE)` (pass aditif/bloom).
- `src/lib/render.ts` — enam titik `globalCompositeOperation = 'lighter'`.

Keduanya menumpuk cahaya; halo bawah figur jatuh tepat di area lantai yang kelebihan terang.
**Belum diubah** — perlu sapuan terukur (dijadwalkan P17).

## 3. Hipotesis yang sudah DIBATALKAN

Jangan diulang; semuanya sudah diuji dengan angka.

1. **Kanvas ke-3 MIRA (1145×1374) hilang di klon** → ternyata kanvas tersembunyi
   (`width: 0; opacity: 0`) berisi mask siluet; nol piksel tampil. Bukan penyebab.
2. **Gain/offset global APEX** → gain optimal 0,9366 justru **menaikkan** MAE (7,29 → 7,38).
   Artinya selisih bersifat lokal, bukan skala global.
3. **`mixBlendMode: normal` pada kanvas 1440×900 klon** → **memperburuk** (7,29 → 8,03).
   CSS asli memang `normal`, tetapi komposit internalnya aditif.
4. **`<img backdrop-v1.webp>` dengan opacity 0 di situs asli** → hanya artefak transisi 900 ms;
   pada ≥ 12 detik opacity = 1 di kedua situs. Geometri `img`/`canvas` identik.
5. **Token `floor` / `ground` / `reflect` di bundel asli** → noise dari three.js, bukan fitur lantai.

## 4. Deviasi perilaku yang diketahui (bukan bug tampilan)

Klon APEX mengenal parameter `?t=` yang **membekukan `dt = 0`**
(`src/components/HumanoidMode.tsx`, sekitar baris 144, 228, 258, 262, 282).
Bundel asli **tidak memiliki** `get("t")`. Parameter ini sengaja ditambahkan agar gerbang/capture
bersifat deterministik dan **tidak memengaruhi pengukuran di atas** (semua capture APEX memakai `?auto=1`).
Rekomendasi: pertahankan, dokumentasikan, dan pagari dengan flag build gerbang (lihat roadmap P21).

## 5. Bundel yang dibandingkan

| Situs | Bundel |
|---|---|
| APEX asli | `index-BD7VNgkM.js` |
| APEX klon | `index-DeDMCu_9.js` |
| MIRA asli | `index-xg1U0Foi.js` |
| MIRA klon | `index-DijfMHLM.js` (= build P15, terverifikasi byte-identik) |
