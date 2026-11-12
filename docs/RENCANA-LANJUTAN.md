# RENCANA LANJUTAN — setelah P0–P10 selesai (fase P11–P15)

Ditulis: **2026-11-12** (sesi 56). Rencana asli **P0–P10** ada di `docs/RENCANA-EKSEKUSI.md` dan **sudah
selesai**; dokumen ini melanjutkannya tanpa mengubah yang lama, supaya jejak keputusan tetap terbaca.

## 0. Benang merah (yang tidak boleh dilupakan)

> **Meniru dulu sampai terukur, baru melebihi, baru berganti nama.**
> Setiap langkah wajib punya gerbang berangka dan artefak bukti. Tidak ada klaim "kelihatan mirip".

Empat aturan turunan yang dipakai sejak sesi 50 dan **tidak boleh dilanggar**:
1. **Angka atau tidak ada.** Perubahan tanpa MAE/gerbang = belum dikerjakan.
2. **Ambang derau.** Perbaikan < 0,4 (MIRA) / < 1,5 (APEX 1440) dianggap **derau**, bukan perbaikan.
3. **Knob tanpa diagnosis = gugur.** Kalau knob membaikkan bias tetapi menaikkan MAE, hentikan knob dan
   cari **mekanisme** (contoh: F-148 → F-149 → diagnosis penutup).
4. **Hukum mendahului estetika.** Selama aset masih salinan verbatim, produk tidak boleh diberi merek sendiri.

## 1. Posisi terukur sekarang (titik awal rencana)

| hal | angka | ambang/derau | status |
|---|---|---|---|
| MIRA paritas piksel produksi (6 fase) | **2,72** | derau live 0,02–0,55 | ⛔ plafon arsitektur terbukti (`gate-c-bodymesh-5b.json`) |
| MIRA fungsi (A/B/D/langkah 5/step4c) | **8/8 · 10/10 · 7/7 · 12/12 · 9/9** | — | ✅ |
| APEX paritas piksel 1440×900 | **10,66 · 9,68 %** | derau 4,54 · 4,93 % | ⛔ 2,3× derau |
| APEX paritas piksel 390×844 | **8,58 · 7,30 %** | derau 0,77 · 0,34 % | ⛔ 11× derau |
| APEX fungsi | 17/17 + build byte-identik | — | ✅ |
| **Aset publik** | **12 dari 12 salinan verbatim** | harus 0 | ❌ **gerbang hukum belum lulus** |

## 2. P11 — APEX: bloom & tonal (sinyal terbesar yang masih tersisa)

**Kenapa ini dulu:** APEX punya jarak terukur **2,3× derau** (1440) dan **11× derau** (390) — paling besar
di seluruh proyek, dan penyebabnya sudah sempit: profil kernel bloom. Wilayah terang produksi asli di deploy
kita **−37 s.d. −46** satuan (luma 120–255), wilayah gelap hampir pas.

| butir | isi |
|---|---|
| masuk | build APEX byte-identik (`a5535a0`), harness `gate-deploy.js`, tangkapan `verification/deploy/*.png` |
| pekerjaan | 1) ekstrak rantai bloom APEX asli dari `recon/apex.js` (`bloomGL.ts` kita vs sumber): jumlah mip, radius, bobot, `e0Intensity`, encode<br>2) bandingkan **profil radial** bloom (bukan MAE saja) pada satu titik terang<br>3) perbaiki kernel/urutan mip, kalibrasi **satu** parameter, ukur ulang |
| keluar (angka) | MAE 1440 **≤ 6,0** (≤1,5× derau) dan `over32` **≤ 5 %** · MAE 390 **≤ 2,3** (≤3× derau) · reproduktibilitas tetap **0,0000** |
| jangan | menyapu knob bloom lama (`?bb`, `?bg`) — sudah dicoba dan mendatar; harus beda **mekanisme** |
| risiko | bloom sumber memakai prefilter berbeda → mungkin perlu port penuh `UnrealBloomPass` yang dipakai live |
| estimasi | 1–2 sesi |

## 3. P12 — MIRA: pola per-filamen (bukan lagi knob)

**Kenapa:** diagnosis penutup membuktikan sisa galat **bukan** bias/gain/warna/posisi/ketajaman, melainkan
**pola** (skala optimum 1,000 · geser 0 px · HF 1,00 · tanda galat berimbang 65,8k/47,0k).

| butir | isi |
|---|---|
| masuk | `gate-c-bodymesh-5b.json`, `ANALISIS-GERBANG-C.md`, shader live `recon/shaders/mira-live/` |
| pekerjaan | 1) petakan **pola garis tubuh** live (bukan citra): ekstrak setiap pita/lengkung yang menyusun torso dari bundle live<br>2) ganti kuad citra torso dengan **geometri** (pita + garis) supaya pola dihasilkan, bukan disalin<br>3) cocokkan posisi tiap pita (uji geser per-pita, bukan global) |
| keluar (angka) | galat torso t=9,5 **10,4 → ≤ 7,0** · bias tiap pita luma `|Δ| ≤ 2` (sekarang 0–20 = +11,6) · 5 fase lain **tidak naik > 0,3** · paritas 6 fase **≤ 2,5** |
| catatan jujur | ini **tidak** akan mencapai derau 0,55 tanpa menyalin citra; tujuannya menurunkan galat **struktural** dan sekaligus membuat pola ini **milik kita** (menyiapkan P13) |
| estimasi | 2–3 sesi |

## 4. P13 — Aset milik sendiri (gerbang hukum)

**Kenapa wajib sebelum rebranding:** `verification/provenance.json` menunjukkan **12 dari 12** berkas
`public/humanoid/*.webp` byte-identik dengan aset produk asli. Aset itu milik pihak lain; mengganti merek
tanpa mengganti aset = mengambil karya orang dan memberi nama sendiri. Itu bukan "satu langkah di depan",
itu risiko hukum.

| butir | isi |
|---|---|
| masuk | `python3 tools/audit-provenance.py` (gerbang otomatis) |
| pekerjaan | ganti tiap plate dengan karya sendiri: **render prosedural** (mesh + pencahayaan, memakai mesin F-149 yang sudah ada) atau **digambar ulang** oleh seniman/alat kita; simpan berkas sumber (skrip/blend) di repo<br>logo, tipografi, dan ikon juga harus orisinal |
| keluar (angka) | `audit-provenance.py` → **SALINAN 0 / 12** · siluet baru vs lama **IoU ≥ 0,98** (bentuk tetap sama, materi milik kita) · timing state machine identik (gerbang A/B/langkah 5 tetap lulus) |
| konsekuensi yang harus diterima | **paritas piksel vs live akan turun** (karena gambar kita beda). Sejak P13, "menyamai" diukur dengan **paritas struktur** (siluet IoU, timing, gerbang fungsi), bukan MAE piksel. Ini keputusan sadar, bukan kemunduran. |
| estimasi | 2–4 sesi |

## 5. P14 — Satu langkah di depan (syarat isi untuk rebranding)

"Di depan" harus bisa dihitung, bukan dirasa. Usul definisi (**Gerbang E isi**), minimal 3 dari 5:

| # | kapabilitas | ukuran "di depan" |
|---|---|---|
| E1 | **Avatar kustom** | pengguna bisa memuat karakter sendiri (manifest + plate) tanpa mengubah kode — live tidak punya |
| E2 | **Performa** | fps ≥ 1,5× live pada perangkat yang sama (live 0,62 fps di lingkungan uji; harness `gate-d.js` D7) |
| E3 | **Aksesibilitas** | `prefers-reduced-motion`, navigasi papan tuntas, kontras ≥ 4,5:1 — diukur dengan skrip, bukan diklaim |
| E4 | **Ketahanan** | 120 s tanpa galat + pemulihan konteks WebGL yang hilang (live tidak memulihkan) |
| E5 | **Offline/instal** | PWA: muat penuh tanpa jaringan setelah kunjungan pertama |

## 6. P15 — Cut-over merek **NIU & MIRAI** (mekanis, hanya setelah Gerbang E)

**Gerbang E (semua wajib):**
- [ ] `audit-provenance.py` → **0 salinan**
- [ ] paritas struktur P13 lulus (siluet IoU ≥ 0,98, gerbang fungsi tetap lulus)
- [ ] minimal **3 dari 5** kapabilitas E1–E5 terukur lulus
- [ ] tidak ada string merek lama di UI, judul, `alt`, `aria-label`, nama paket, nama repo, nama domain
- [ ] `LICENSE` + `NOTICE` baru terpasang, menyebut secara jujur asal-usul proyek
- [ ] tangkapan layar "sebelum/sesudah rebrand" tersimpan sebagai bukti

**Langkah mekanis** (daftar kerja lengkap di `docs/LISENSI-BRANDING.md` §5): judul halaman → teks UI →
`aria-label`/`alt` → nama berkas & identifier internal (`miraDial.ts` → `miraiDial.ts`) → nama aset →
nama paket & repo → domain → dokumen.

## 7. Urutan & ketergantungan

```
P11 (APEX bloom) ──┐
P12 (MIRA pola) ───┼──► P13 (aset milik sendiri) ──► P14 (fitur unggul) ──► [Gerbang E] ──► P15 (rebrand)
                   │        (wajib sebelum P14 dinilai "di depan")
P14 bisa jalan paralel untuk E2/E3/E5 (tidak bergantung aset)
```

P11 dan P12 boleh dikerjakan dalam urutan apa pun; **P13 tidak boleh ditunda melewati P15**, dan **P15
tidak boleh dimulai** sebelum semua butir Gerbang E tercentang.

## 8. Risiko & mitigasi

| risiko | dampak | mitigasi |
|---|---|---|
| P13 menurunkan MAE vs live | laporan "kemunduran" | ganti **definisi** gerbang (struktur vs piksel) **sebelum** P13 dimulai, tulis di `DELIVERABLE.md` |
| aset orisinal tidak sebaik aslinya secara visual | kualitas turun | jaga IoU ≥ 0,98 dan ulangi pinggiran halus (rim/rambut) dengan mesin F-149 |
| rebranding menabrak klaim pihak lain | hukum | audit provenance + kajian hukum sebelum rilis komersial (bukan pengganti nasihat pengacara) |
| knobs menumpuk lagi | kompleksitas | setiap knob baru wajib punya nilai bawaan = perilaku lama dan entri di tabel knob |
| dokumen membusuk | keputusan salah | aturan dokumentasi `docs/PETA-DOKUMEN.md` §4 |

## 9. Yang **tidak** akan dikerjakan (supaya tidak melenceng)
- Mengejar MAE 0,00 terhadap citra live dengan **menyalin** citra live — itu bukan rekonstruksi.
- Menyalin kode sumber produk asli secara utuh ke repo kita tanpa pemahaman (sudah dihindari: port per rumus).
- Menambah fitur sebelum P11–P13 selesai, kecuali E2/E3/E5 di P14 yang tidak bergantung aset.
- Mengganti nama/merek lebih awal dari Gerbang E.
