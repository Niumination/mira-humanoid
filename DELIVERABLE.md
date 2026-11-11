# DELIVERABLE — APEX & MIRA humanoid (rebuild)

Diperbarui: **2026-11-11** (sesi 49). Semua angka di bawah diukur di mesin yang sama (Chromium headless,
SwiftShader), membandingkan **situs produksi kita** dengan **situs live aslinya**.

---

## 1. Dua aplikasi, dua URL, dua sumber

| | APEX | MIRA |
|---|---|---|
| live asli (acuan) | `https://apex-humanoid.vercel.app/` | `https://mira-humanoid.vercel.app/` |
| produksi kita | `https://niu-humanoid.vercel.app/` | `https://mira-humanoid-niu.vercel.app/` |
| aset produksi sekarang | `assets/index-DyoQ8hKN.js` **`8dac8dad…`** · `index-WDCbnnbD.css` `1b66a34b…` | `assets/index-DRPy0tD2.js` **`68e0b85c…`** · `index-DQPaiuOr.css` `6ad9d68a…` |
| sumber | `apex-humanoid-rebuild/` — **dipulihkan dari commit `369c8f5`** (lihat W-7) | `mira-humanoid-rebuild/` — repo `Niumination/mira-humanoid` head `2fb3ed9` |
| build ulang | `npm ci && npm run build` → **byte-identik** dengan produksi | `npm ci && npm run build` → **byte-identik** dengan produksi |

Verifikasi 3 lapis (aset produksi ↔ isi repo ↔ build ulang) **lulus untuk dua-duanya** pada 2026-11-11.

---

## 2. Angka mutu MIRA (produksi, diukur terhadap live)

### Gerbang D — 7/7 di produksi
| uji | hasil |
|---|---|
| D5 reproduktibilitas (`?t=8` / `?t=11,5`) | kita **0,0000** / **0,0000** (live 0,0004 / 0,0128) |
| D6 tanpa seam buatan | rasio **1,50** vs live 1,48 |
| D7 fps lingkungan sama | **0,95 fps** vs live 0,52 |
| D8 stabil 120 s | frame 4 → **92**, konteks hidup, error 0 |
| D9 ponsel 390×844 | korelasi profil **0,9912**, MAE 8,91 (terang 44,7 vs 40,6) |
| D9 ponsel 414×896 | korelasi profil **0,9913**, MAE 8,70 (44,4 vs 40,3) |

### Gerbang A/B dan uji langkah — 8/8 · 10/10 · 6/6 · 8/8 · 9/9 (di produksi)
A: mode/label/aria · B: 82 slider + 7 alias + localStorage · langkah 5: aura/state/speed/replay ·
langkah 6: tangan MediaPipe + MIC nyata · audio: 9/9.

### Gerbang C — paritas piksel terhadap acuan segar (`recon/live-ref-v4`)
| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 9,5 | rata-rata |
|---|---|---|---|---|---|---|---|
| produksi 4t | 1,13 | 2,01 | 1,92 | 2,85 | 3,09 | 6,58 | 2,93 |
| produksi 4u | 1,13 | 2,01 | 1,92 | 2,85 | 3,10 | **5,56** | **2,76** |

Sisa selisih terpusat di **torso** (Δ rerata +4,1 pada t=9,5; kepala +0,5; lengan +2,0) dan bentuknya
detail halus (partikel/helai), bukan kecerahan menyeluruh — lihat `verification/mira/torso-banding-t95.png`.

---

## 3. Cara membangun ulang & memverifikasi (dari nol)

```bash
bash tools/siapkan-alat.sh            # Playwright + acuan live (perlu sekali per sesi)
cd mira-humanoid-rebuild && npm ci && npm run build && npx vite preview --host 0.0.0.0 --port 8804
```

| tujuan | perintah |
|---|---|
| verifikasi 3 lapis aset produksi | unduh `assets/index-*.js` produksi, `sha256sum`, bandingkan dengan `npm run build` |
| Gerbang D **di produksi** | `node tools/gate-d.js --build https://mira-humanoid-niu.vercel.app/` |
| Gerbang A / B | `node tools/gate-mira-a.js https://mira-humanoid-niu.vercel.app` · `node tools/gate-mira-b.js …` |
| langkah 5 / 6 / audio | `BAGIAN=B BASE=https://… node tools/gate-step5.js` · `node tools/gate-mira6.js B …` · `BASE=… node tools/gate-step4c.js` |
| paritas 6 fase | tangkap `?t=` → `python3 tools/metric3.py <prefix> 0.3 1.89 3.5 5.5 6.8 9.5` |
| ablasi per lapisan | `node tools/gate-c-layer.js --t 9.5` · `node tools/sweep-knob.js --knobs "pgg=1,1.25" --t 9.5 --t 11` |

**Aturan metodologi yang wajib dipatuhi** (semuanya lahir dari kesalahan yang sudah terjadi):
1. Acuan live berderau **0,408** antar waktu tunggu berbeda → jangan klaim perbaikan bila ΔMAE < 0,4.
2. Acuan harus **segar** (W-6): set lama `live-ref-v2` meleset **3,83** pada t=9,5.
3. Flag `off=` yang mematikan lapisan harus benar-benar mematikan **render + blit** (W-5).
4. Gerbang D → **produksi**, bukan lokal (W-3/W-4).
5. Matriks GL yang bergantung `FIT_T` wajib dibuat per frame.

---

## 4. Batas yang diketahui (jujur)

| # | hal | status |
|---|---|---|
| W-7 | Sumber APEX **tertimpa** MIRA di repo `Niu-Humanoid`; kini hanya ada di commit `369c8f5`. Sudah dipulihkan ke `apex-humanoid-rebuild/` dan build-nya = produksi byte-identik. **Perlu repo terpisah atau folder `apex/`** supaya tidak hilang lagi. | ⚠️ butuh tindakan Hermes |
| C | Paritas piksel MIRA rata-rata **2,76** (live 0,00–0,55). Sisa di torso; tuas knob sudah habis (diuji: `?bb=`, `?fg=`, `?mk=`, `?mc=`, `?tv=`, 7 uniform medan, `?ft=` — semuanya tidak menolong atau memperburuk). | 🟡 diketahui |
| — | APEX belum punya gerbang piksel segar sejak 2026-10-29 (gerbang 17/17 & piksel 10,73 %/11,93 % dari sesi itu); build-nya terverifikasi byte-identik, jadi tidak berubah. | 🟡 tercatat |
| — | Semua pengukuran di SwiftShader (±0,5–1 fps); angka fps **relatif**, bukan fps pengguna. | catatan |

---

## 5. Peta berkas penting

| path | isi |
|---|---|
| `mira-humanoid-rebuild/` | aplikasi MIRA (sumber produksi) |
| `apex-humanoid-rebuild/` | aplikasi APEX (**dipulihkan dari `369c8f5`**) |
| `Kerja-Arena/recon/` | hasil recon: bundle live, shader, parameter, acuan (v1/v3/v4), ground truth |
| `Kerja-Arena/verification/` | semua JSON gerbang + tangkapan bukti, per langkah |
| `Kerja-Arena/docs/langkah3…langkah6/` | dokumen per langkah (`STATE.md`, `ANALISIS-GERBANG-C.md`) |
| `Kerja-Arena/{PROGRESS,REBUILD-LOG,STATUS-ROADMAP}.md` | riwayat kerja, temuan (V/W/C/F/S/A/O), posisi roadmap |
| `tools/` | semua alat ukur: gerbang, sweep, metric, probe |
| `niu-update-langkah4v.zip` | paket terakhir siap terap |
