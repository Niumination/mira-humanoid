# DELIVERABLE — APEX & MIRA humanoid (rebuild)

Diperbarui: **2026-11-12** (sesi 55 — penerapan 5a+5b diverifikasi 5 lapis). Semua angka di bawah diukur di mesin yang sama (Chromium headless,
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

## 3b. Memverifikasi paket yang SUDAH diterapkan (5 lapis, satu perintah)
```
bash tools/verifikasi-produksi.sh            # aset produksi → blob repo → build bersih byte-identik (±15 s)
bash tools/verifikasi-produksi.sh --gates    # + gerbang D/A/B/langkah5/step4c di URL produksi (±12 menit)
```
Lapis 1–3 menangkap: repo tidak memuat perubahan, build tidak reprodusibel, aset produksi bukan build kita.
Lapis 4 menangkap: deploy memuat bundel lain. Terakhir dijalankan 2026-11-12 → **semua lapis lulus**.

## 4. Batas yang diketahui (jujur)

| # | hal | status |
|---|---|---|
| W-7 | Sumber APEX **tertimpa** MIRA di repo `Niu-Humanoid`; kini hanya ada di commit `369c8f5`. Sudah dipulihkan ke `apex-humanoid-rebuild/` dan build-nya = produksi byte-identik. **Perlu repo terpisah atau folder `apex/`** supaya tidak hilang lagi. | ⚠️ butuh tindakan Hermes |
| C | Paritas piksel MIRA rata-rata **2,72** (live 0,00–0,55). **Ditutup dengan bukti batas**, bukan lulus: semua tuas sisi-render disapu (bloom, gambar, rambut, medan, gamma, penutup badan F-148, pencahayaan permukaan F-149) dan sebuah diagnosis langsung menunjukkan sisa galat **bukan** bias (skala optimum **1,000**), **bukan** posisi (geser optimum **0 px**, skala-geometri **1,000**), **bukan** ketajaman (HF **1,00**), **bukan** warna (matriks 3×4 hanya menutup **9 %**). Tanda galat berimbang (65,8k lebih terang / 47,0k lebih gelap di torso) ⇒ sisa = **pola per-filamen live**. | ⛔ ditutup dengan bukti (`gate-c-bodymesh-5b.json`) |
| — | **APEX direproduksi byte-identik dari repo sendiri** (`apex-humanoid-rebuild@a5535a0` → `8dac8dad…` + `1b66a34b…`); gerbang piksel deploy diukur ulang hari ini **10,66/9,68** (1440, derau 4,54) · **8,58/7,30** (390, derau 0,77) ⇒ **sama dengan P8a, tanpa regresi**. Sisa terbesar: wilayah terang produksi asli di deploy kita **−37 s.d. −46** (bloom/tonal belum meniru sumber). | 🟡 diketahui, proyek lanjutan |
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

## 6. Lisensi, merek, dan asal-usul aset (status 2026-11-12)
- **Kode**: ditulis ulang oleh kita; sekarang **`LICENSE` = All Rights Reserved** (proprietary, tahap verifikasi)
  di kedua repo, dengan `NOTICE` yang menyebut asal-usul pengamatan dan komponen pihak ketiga.
- **Aset**: `public/humanoid/*.webp` masih **12/12 salinan verbatim** aset produk asli
  (`python3 tools/audit-provenance.py` → `verification/provenance.json`). Aset itu **tidak ikut** lisensi kita
  dan wajib diganti sebelum rilis dengan merek apa pun (fase **P13**).
- **Merek**: "APEX"/"MIRA" dipakai deskriptif sebagai objek rekonstruksi; merek **NIU & MIRAI** baru dipakai
  setelah **Gerbang E** lulus. Rincian & checklist cut-over: `docs/LISENSI-BRANDING.md`.
- **Catatan**: dokumen ini bukan nasihat hukum; kajian pengacara tetap perlu sebelum rilis komersial.

## 7. Dokumen pendamping
| kebutuhan | dokumen |
|---|---|
| peta seluruh dokumen | `docs/PETA-DOKUMEN.md` |
| rencana lanjutan (P11–P15) & Gerbang E | `docs/RENCANA-LANJUTAN.md` |
| lisensi, merek, asal-usul aset | `docs/LISENSI-BRANDING.md` |
| cetak biru avatar baru (NIU/MIRAI) | `docs/MESIN-PRODUKSI-AVATAR.md` |
| status per fase & angka mutu | `STATUS-ROADMAP.md` |
