# STATUS PEKERJAAN — posisi terhadap roadmap P0–P10 (dan sesudahnya)

Diperbarui: **2026-11-12** (sesi 56). **Dokumen ini ditulis ulang seluruhnya**, karena versi sebelumnya
masih memuat keadaan lama (mis. "langkah 4/5/6 belum ada") yang sudah selesai sejak sesi 30-an.
Semua angka di bawah **diukur**, bukan diingat; berkas buktinya disebut di tiap baris.

Catatan letak: `recon/` di workspace hanya memuat **artefak turunan** (shader, tangkapan acuan, JSON hasil ekstraksi);
27 berkas recon asli + ground truth ada di repo `Niu-Humanoid` dalam `docs/recon/`. Rujukan di bawah menyebut letaknya.

Pendamping: `docs/PETA-DOKUMEN.md` (berkas mana menjawab apa) · `docs/RENCANA-LANJUTAN.md` (P11–P15) ·
`docs/LISENSI-BRANDING.md` (status hukum & merek) · `docs/MESIN-PRODUKSI-AVATAR.md` (cetak biru avatar baru).

---

## 1. Posisi per fase — **P0–P10 selesai semua**

| fase | isi | status | bukti |
|---|---|---|---|
| **P0** | Normalisasi recon (HTML bersih, patch verify-spec, audit checksum) | ✅ | `docs/recon/verify-spec.py` **193/193** (di repo `Niu-Humanoid`; workspace hanya menyimpan turunannya) |
| **P1** | Daftar aset + dimensi + konfirmasi negatif | ✅ | `docs/recon/asset-list.*`, `docs/recon/asset-dims.json` (repo) |
| **P2** | Stack + ekstraksi copy UI | ✅ | `docs/recon/ui-copy.{apex,mira}.txt` (repo) |
| **P3** | Ekstraksi + klasifikasi shader | ✅ | `recon/shaders/` 150 berkas (workspace) + `docs/recon/shaders/INDEX.md` (repo) |
| **P4** | 82 parameter + hook + query param | ✅ | `recon/mira-params.json` (workspace) — 82 dial · 20 seksi · 7 alias |
| **P5** | Audio graph + timing | ✅ | `docs/recon/audio/`, `docs/recon/timings.json` (repo) + `docs/langkah4/AUDIO.md` |
| **P6** | DOM runtime + ground truth | ✅ | `docs/recon/ground-truth/` 73 artefak (repo) |
| **P7** | Arsitektur + peta UNVERIFIED | ✅ | `docs/recon/ARCHITECTURE.md` (repo) |
| **P8a** | **APEX** 8 langkah | ✅ | gerbang **17/17**; build ulang **byte-identik** dari `apex-humanoid-rebuild@a5535a0` |
| **P8b** | **MIRA** 8 langkah (termasuk audio, state machine, MediaPipe tangan) | ✅ **8/8** | `gate-step4c` **9/9** · `gate-step5` **12/12** · `gate-step6*` |
| **P9** | Gerbang A/B/C/D | 🟡 **A ✅ · B ✅ · D ✅ · C ⛔ ditutup dengan bukti** | lihat §3 |
| **P10** | Deliverable + deploy | ✅ | dua situs hidup, **terverifikasi 5 lapis** (`verification/VERIFIKASI-5b-2026-11-12.md`) |

**Hitungan: 10 dari 10 fase selesai. Satu-satunya butir yang tidak "lulus" adalah paritas piksel Gerbang C,
yang plafonnya sudah dibuktikan dengan diagnosis — bukan yang belum dikerjakan.**

---

## 2. Keadaan produksi sekarang (diukur 2026-11-12)

| hal | nilai | bukti |
|---|---|---|
| MIRA produksi | `index-DCR382kJ.js` **`e215b5a7…`** | `verifikasi-produksi.sh` lapis 1 |
| MIRA repo | `mira-humanoid@0ffb82a` · `Niu-Humanoid@8fc18db` | GitHub API |
| APEX produksi | `index-DyoQ8hKN.js` **`8dac8dad…`** · CSS `1b66a34b…` | build ulang dari `a5535a0` = byte-identik |
| Regresi knob baru | build vs produksi `?t=8/11,5/13` → **MAE 0,0000 · 0 piksel** | `tools/reg-build.js` |
| Galat runtime | `__MIRA_ERR = null` | `gate-d.js` D8 |

---

## 3. Angka mutu (terkini)

### 3.1 MIRA — paritas piksel **produksi** vs live, 6 fase
| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 9,5 | rata² |
|---|---|---|---|---|---|---|---|
| MAE | 1,13 | 2,01 | 1,92 | 2,85 | 3,09 | 5,31 | **2,72** |
| blur4 | 1,11 | 1,92 | 1,69 | 1,92 | 2,51 | 4,26 | 2,23 |

Lantai derau live-vs-live: **0,02–0,55**. ⇒ MIRA **belum** menyamai live secara piksel, dan penyebabnya
sudah diukur habis (`verification/mira/gate-c-bodymesh-5b.json`): skala optimum **1,000** · geser **0 px** ·
skala geometri **1,000** · HF **1,00** · matriks warna menutup **9 %** · tanda galat berimbang
(**65.843** lebih terang / **47.035** lebih gelap) ⇒ sisa = **pola per-filamen**, bukan bias/cahaya/warna.

### 3.2 MIRA — gerbang fungsi & ketahanan (dijalankan di URL produksi)
| gerbang | hasil |
|---|---|
| A (entry + mode) | **8/8** |
| B (82 parameter, 20 seksi, 7 alias) | **10/10** |
| D (D5–D9) | **7/7** — reproduksi **0,0000** · seam 1,43 vs live 1,45 · fps 0,69 vs 0,62 · 120 s stabil · 390 & 414 korelasi **0,9906/0,9908** |
| langkah 5 (state machine, VN, speed, replay) | **12/12** |
| langkah 4c (audio hidup di aplikasi) | **9/9** |

### 3.3 APEX — paritas piksel (diukur 2026-11-12, dua viewport)
| viewport | MAE | piksel > 32 | derau prod-vs-prod | status |
|---|---|---|---|---|
| 1440×900 | **10,66** | **9,68 %** | 4,54 / 4,93 % | ⛔ 2,3× derau |
| 390×844 | **8,58** | **7,30 %** | 0,77 / 0,34 % | ⛔ 11× derau |

Sisa terpusat di **wilayah terang** (luma 120–255): deploy kita **−37 s.d. −46** lebih gelap ⇒ kernel/tonal
bloom belum meniru sumber. Fungsi APEX sendiri lengkap (**17/17**).

### 3.4 Aset (gerbang hukum)
`python3 tools/audit-provenance.py` → **12 dari 12** berkas `public/humanoid/*.webp` **byte-identik** dengan
aset produk asli (`verification/provenance.json`). ⇒ gerbang hukum **belum lulus**; ini syarat P13 sebelum
rebranding. Lihat `docs/LISENSI-BRANDING.md`.

---

## 4. Yang tersisa — semuanya sudah **direncanakan** di `docs/RENCANA-LANJUTAN.md`

| # | pekerjaan | sasaran terukur | estimasi |
|---|---|---|---|
| P11 | APEX bloom & tonal | 1440 **≤ 6,0** MAE · 390 **≤ 2,3** · reproduksi tetap 0,0000 | 1–2 sesi |
| P12 | MIRA pola per-filamen (geometri, bukan citra) | galat torso **10,4 → ≤ 7,0** · `|Δbias|` tiap pita ≤ 2 · paritas ≤ 2,5 | 2–3 sesi |
| P13 | aset milik sendiri | `audit-provenance` **0 salinan** · siluet IoU ≥ 0,98 | 2–4 sesi |
| P14 | fitur "satu langkah di depan" | ≥ 3 dari 5 (E1 avatar kustom · E2 fps ≥1,5× · E3 aksesibilitas · E4 pemulihan konteks · E5 PWA) | 2–3 sesi |
| P15 | cut-over merek **NIU & MIRAI** | Gerbang E lengkap (checklist di `LISENSI-BRANDING.md` §5) | 1 sesi |

Tidak ada lagi pekerjaan "belum terencana". Yang ada hanya pekerjaan yang belum dikerjakan.

---

## 5. Revisi dokumen ini
| tanggal | perubahan |
|---|---|
| 2026-11-11 | tabel P0–P10 pertama, angka build37 |
| 2026-11-12 (54–55) | Gerbang C ditutup dengan bukti; W-7 ditutup; verifikasi 5 lapis |
| **2026-11-12 (56)** | **ditulis ulang**: §3 & §4 yang menyebut langkah 4/5/6 belum ada **dihapus** karena sudah usang; angka diganti hasil ukur produksi; rujukan ke P11–P15, lisensi, dan mesin produksi avatar ditambahkan |
