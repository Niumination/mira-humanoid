# STATUS PEKERJAAN — posisi terhadap roadmap P0–P10

Diperbarui: **2026-11-06** (sesudah paket 4k / build37 terverifikasi di produksi).
Rujukan rencana: tabel fase **P0–P10** di `PROGRESS.md` + keputusan interview 2026-10-29.

---

## 1. Posisi per fase

| fase | isi | status | bukti / angka |
|---|---|---|---|
| **P0** | Normalisasi recon (HTML bersih, patch verify-spec, audit checksum) | ✅ **selesai** | `recon/verify-spec.py` **193/193** exit 0 |
| **P1** | Daftar aset + dimensi + konfirmasi negatif | ✅ **selesai** | `recon/asset-list.*`, `asset-dims.json` |
| **P2** | Stack + ekstraksi copy UI | ✅ **selesai** | `recon/ui-copy.{apex,mira}.txt` |
| **P3** | Ekstraksi + klasifikasi shader | ✅ **selesai** | `recon/shaders/` 150 file + INDEX.md |
| **P4** | 82 parameter + hook + query param | ✅ **selesai** | `recon/mira-params.json` (82 dial, 7 alias) |
| **P5** | Audio graph + timing | ✅ **selesai** (recon) | `recon/audio/`, `timings.json` |
| **P6** | DOM runtime + ground truth | ✅ **selesai** | `recon/ground-truth/` 73 artefak, 22 MB |
| **P7** | Arsitektur + peta UNVERIFIED | ✅ **selesai** | `recon/ARCHITECTURE.md` |
| **P8a** | **APEX** 8 langkah implementasi | ✅ **selesai** | gerbang **17/17** identik; piksel **10,73 %/11,93 %** (1440) · **7,71 %/9,01 %** (390) |
| **P8b** | **MIRA** 8 langkah implementasi | 🟡 **6 dari 8** | langkah 1,2,3,**4 (audio: paritas pemanggilan 31/31 · spektrum 27/27 sampel-identik · hidup 9/9)**,7,8 ✅ · langkah **5 (state penuh), 6 (hand tracking) ⬜** |
| **P9** | Gerbang A/B/C/D | 🟡 **2 dari 4** | **A ✅** (APEX semua · MIRA 8/8) · **B ✅** (APEX 18/18 hook · MIRA 10/10) · **C 🟡** (lantai derau 0,00–0,55; kita 4,50–4,86) · **D 🟡** — **audio lolos penuh (D1–D4 sekaligus)**; reproduktibilitas/seam/fps belum |
| **P10** | Deliverable + deploy | 🟡 **1 dari 2** | deploy ✅ berjalan & diverifikasi tiap paket (dua situs hidup) · deliverable akhir ⬜ |

**Hitungan item: 26 dari 30 selesai ≈ 87 %.**
Tetapi 6 item sisanya justru yang terberat: 3 fitur interaktif MIRA + paritas piksel + 2 gerbang penilai.

---

## 2. Angka mutu sekarang

### MIRA — gerbang piksel (1440×900, acuan `recon/live-ref-v3`)
| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 9,5 | rata² | blur4 | blur10 |
|---|---|---|---|---|---|---|---|---|---|
| build32 (awal penilaian) | 1,28 | 2,07 | 1,91 | 2,84 | 3,05 | 4,71 | 2,64 | 2,15 | 1,97 |
| **build37 (sekarang)** | **1,14** | 2,07 | 1,91 | 2,84 | **2,80** | 4,54 | **2,55** | **2,01** | **1,84** |

24 fase: **5,43 → 3,06** (turun **44 %**). Fase terburuk sekarang: 8,0 (4,86) · 9,0 (4,71) · 7,5 (4,65) · 8,5 (4,62).

### Lantai derau live-vs-live MIRA (dasar Gerbang C — diukur ulang hari ini)
| t | 8,0 | 9,5 | 11,0 |
|---|---|---|---|
| MAE dua run live | **0,00** | 0,55 | 0,08 |

⚠️ **Konsekuensi jujur:** menurut aturan Gerbang C (ambang = baseline live-vs-live), live MIRA praktis
**deterministik (0,00–0,55)** sedangkan kita 4,5–4,9 → **Gerbang C MIRA belum lulus**. Yang sudah dicapai
adalah "sangat mirip secara visual", bukan "identik secara terukur". Ini berbeda dari APEX entry yang 0,0000.

### APEX
| metrik | hasil | acuan |
|---|---|---|
| gerbang fungsional | 17/17 identik | — |
| piksel 1440×900 | 10,73 % / 11,93 % | derau 0,87 % / 1,48 % |
| piksel 390×844 | 7,71 % / 9,01 % | — |

Sisa APEX **hanya satu**: profil kernel bloom (fitur sudah lengkap, uniform/atribut identik 16 digit).

---

## 3. Yang masih harus diselesaikan

### A. Fitur MIRA yang belum ada (3 langkah, belum tersentuh)
1. **Langkah 4 — audio graph**: 16 oscillator + 36 gain + analyser → `uEnergy` (menggerakkan pita & garis).
   Sekarang: **0 %** (tidak ada `AudioContext` sama sekali di `src/`).
2. **Langkah 5 — state machine penuh** + 4 parameter *Her states* (`talkSpeed`, `talkBright`,
   `listenSpeed`, `listenBright`). Sekarang: tombol IDLE/LISTENING/TALKING ada, tetapi **belum mengubah perilaku**.
3. **Langkah 6 — hand tracking MediaPipe** → `hum.touch.wave` + `touchWave`. Sekarang: **0 %**.

### B. Gerbang penilai yang belum dijalankan
4. **Gerbang C MIRA (formal)**: ukur baseline live-vs-live untuk 24 fase, tetapkan protokol lulus/gagal,
   lalu jalankan. (Baseline 3 titik sudah ada; lulusnya belum.)
5. **Viewport 390×844 untuk MIRA**: **belum pernah diukur** — seluruh 24 fase kita hanya 1440×900.
6. **Gerbang D MIRA**: reproduktibilitas antar-render, seam/jam, performa (fps).

### C. Penyempurnaan piksel (opsional tapi terukur)
7. 4 fase ignition terburuk (8,0 · 9,0 · 7,5 · 8,5 = 4,6–4,9). Jalur `lg` dan aura sudah ditutup dengan angka;
   sisanya butuh pendekatan baru (rongga kepala & tepi bahu saling bertentangan).
8. **APEX**: kalibrasi kernel bloom 10,55 % → target ≤ 3,06 % (baseline terukur).

### D. Penutupan program
9. **Deliverable akhir (P10)**: ringkasan serah-terima, daftar artefak, cara deploy & cara mengukur ulang.
10. Pembersihan workspace (`Kerja-Arena` 152 MB · `mira-humanoid-rebuild` 69 MB) + arsip paket.

---

## 4. Perkiraan besar sisa pekerjaan

| kelompok | item | bobot | perkiraan |
|---|---|---|---|
| Fitur MIRA (audio · state · hand) | 3 | besar | ~60 % dari sisa |
| Gerbang C/D + viewport 390 | 3 | sedang | ~20 % |
| Penyempurnaan piksel (MIRA + APEX bloom) | 2 | sedang–besar | ~15 % |
| Deliverable + pembersihan | 2 | kecil | ~5 % |
| **total** | **10 pekerjaan** | | **≈87 % selesai · ≈13 % sisa** |

Catatan: 20 % ini **bukan** sisa yang mudah — tiga fitur interaktif itu belum ada baris kodenya, dan
paritas piksel MIRA masih 10–50× di atas lantai derau.

---

## 5. Definisi "selesai" yang saya pakai

1. Semua langkah P8 (APEX **dan** MIRA) tuntas tanpa langkah yang dilompati.
2. Gerbang A/B/C/D dijalankan dengan angka dan lulus menurut ambang yang disepakati
   (baseline live-vs-live untuk C).
3. Produksi terverifikasi: produksi → repo → blob → build-hash, tiga lapis cocok.
4. Ada paket serah-terima yang bisa dijalankan orang lain tanpa saya.
