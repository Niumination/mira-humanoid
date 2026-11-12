# LISENSI & BRANDING — status sekarang, risiko, dan jalur cut-over ke NIU & MIRAI

Ditulis: **2026-11-12** (sesi 56). Dokumen ini **bukan nasihat hukum**; ia catatan teknis + rencana.
Sebelum rilis komersial, wajib kajian pengacara.

## 0. Ringkas tiga kalimat
1. **Kode** di repo ini ditulis ulang oleh kita (port per rumus, bukan salinan berkas) — kode itu bisa
   kita lisensikan.
2. **Aset gambar** ternyata **12 dari 12 byte-identik** dengan aset produk asli (`verification/provenance.json`)
   — itu karya pihak lain dan **tidak boleh** diberi merek sendiri.
3. **Nama “APEX” dan “MIRA”** milik pembuat aslinya; selama kita belum lulus **Gerbang E**
   (`docs/RENCANA-LANJUTAN.md` §6), semua tulisan “NIU & MIRAI” tetap **rencana**, bukan merek aktif.

## 1. Tiga lapis yang harus dipisahkan (jangan dicampur)

| lapis | contoh | siapa pemiliknya | boleh dipakai merek sendiri? |
|---|---|---|---|
| **A. Kode** | `src/components/MiraStage.tsx`, `src/lib/shaders/*.glsl` (hasil port), 60+ alat gerbang | **kita** (karya turunan dari pengamatan, ditulis ulang) | ✅ setelah Gerbang E |
| **B. Aset** | `public/humanoid/*.webp` (12 berkas), tipografi, ikon | **pihak asli** (salinan verbatim) | ❌ **belum** — harus diganti (P13) |
| **C. Merek** | kata “APEX”, “MIRA”, domain, judul halaman | **pihak asli** | ❌ tidak, kecuali sebagai rujukan deskriptif |

Catatan lapis A: kode hasil *reverse engineering* tetap karya kita dalam hak cipta, tetapi **tidak** memberi
hak atas aset atau merek. Karena itu A ≠ izin untuk B dan C.

## 2. Status hukum hari ini (jujur)

| hal | keadaan | risiko |
|---|---|---|
| Aplikasi kita memuat 12 aset salinan | ya (`audit-provenance.py`: 12/12 SALINAN) | **tinggi** bila dipublikasikan sebagai produk |
| Situs produksi dapat diakses publik (`mira-humanoid-niu.vercel.app`, `niu-humanoid.vercel.app`) | ya | **sedang** — anggap sebagai *verifikasi*, bukan rilis |
| Nama merek asli dipakai di judul/`aria-label` | ya (lihat §3) | **sedang** — deskriptif untuk pembandingan, bukan klaim |
| `LICENSE` di repo | **tidak ada** | **rendah** tapi harus segera ditutup |

**Rekomendasi segera (sebelum sesi berikutnya):**
1. Pasang **`LICENSE` (All Rights Reserved)** + **`NOTICE`** di kedua repo — sudah disiapkan di paket ini.
2. Batasi akses situs verifikasi (Vercel *Deployment Protection* / *password protection*), atau beri
   keterangan jelas “build verifikasi, bukan produk”.
3. Jangan memasang logo/merek turunan pihak asli di materi promosi apa pun.

## 3. Inventaris merek (diukur, bukan dikira)

| tempat | jumlah | contoh | sifat |
|---|---|---|---|
| `<title>` halaman | 2 | `MIRA Humanoid`, `Apex Humanoid` | **terlihat pengguna** |
| `aria-label` / `alt` | 4 | `aria-label="mira humanoid"`, `Animated cyan and gold Apex humanoid` | **terlihat pembaca layar** |
| teks UI | 0 | — (copy UI tidak memuat merek) | — |
| nama berkas aset | 12 | `apex-idle-v1.webp`, `mira-hair-v1.webp` | internal + URL |
| nama modul/identifier | 14 | `miraDial.ts`, `miraStage`, `MiraStage.tsx` | internal |
| kelas CSS / `data-testid` | 20+ | `mira-btn`, `mira-enter`, `apex-gesture-snap` | internal |
| kunci penyimpanan | 1 | `apex_sound_off` | internal (pengguna tak melihat) |
| nama paket/repo/domain | 6 | `mira-humanoid-rebuild`, `Niumination/mira-humanoid`, `mira-humanoid-niu.vercel.app` | publik |

Total titik sentuh: **≈ 45**. Semuanya mekanis; tidak ada yang tersembunyi di bundel terkompilasi
(karena `dist/` dibangun dari sumber yang sama).

## 4. Definisi "sudah menyamai produk asli" (supaya tidak ambigu)

| dimensi | ukuran | sekarang | menyamai? |
|---|---|---|---|
| **Fungsi** | gerbang A/B/D/langkah 5/step4c, 17/17 APEX | MIRA **8/8·10/10·7/7·12/12·9/9**, APEX 17/17 | ✅ **ya** |
| **Kesetiaan piksel** | MAE vs live, ambang derau | MIRA **2,72** (derau 0,02–0,55) · APEX **10,66 / 8,58** (derau 4,54 / 0,77) | ⛔ **belum** (MIRA plafon terbukti, APEX 2–11× derau) |
| **Reprodusibilitas** | build ulang = byte-identik | MIRA ✅ · APEX ✅ | ✅ **ya** |
| **Kepemilikan aset** | salinan verbatim | **12/12** | ❌ **belum** |

Jadi jawaban jujur atas pertanyaan "apakah proyek ini sudah menyamai produk asli?": **secara fungsi ya,
secara piksel belum, secara kepemilikan aset belum.** Ketiganya harus terpenuhi sebelum rebranding.

## 5. Jalur cut-over ke NIU & MIRAI (checklist mekanis)

Syarat: **Gerbang E** lulus (`RENCANA-LANJUTAN.md` §6). Urutan kerja:

1. **Aset** — ganti 12 berkas `public/humanoid/*.webp` dengan karya sendiri (P13). Bukti:
   `python3 tools/audit-provenance.py` → **0 SALINAN**.
2. **Nama berkas aset** — `apex-idle-v1.webp` → `niu-idle-v1.webp`, `mira-hair-v1.webp` → `mirai-hair-v1.webp`;
   perbarui `src/lib/assets.ts` (dan referensi di `recon/` **tidak** disentuh, itu arsip).
3. **Judul & teks** — `<title>NIU Humanoid</title>` / `<title>MIRAI Humanoid</title>`; `aria-label` & `alt`
   ikut diganti; periksa kontras & makna untuk pembaca layar.
4. **Identifier internal** — `miraDial.ts` → `miraiDial.ts` (14 modul), `MiraStage` → `MiraiStage`,
   kelas CSS `mira-*` → `mirai-*`, `apex-*` → `niu-*`; lakukan dengan `git mv` supaya riwayat terjaga.
5. **Kunci penyimpanan** — `apex_sound_off` → `niu_sound_off` **dengan migrasi** (baca kunci lama sekali,
   pindahkan, hapus) agar preferensi pengguna tidak hilang.
6. **Paket & repo** — `package.json` name, lalu repositori baru (`Niumination/niu-humanoid`,
   `Niumination/mirai-humanoid`); jangan hapus repo lama sebelum aset diganti (bukti historis).
7. **Domain** — daftarkan domain baru; jangan memakai subdomain yang memuat merek pihak lain.
8. **Dokumen** — `LICENSE` + `NOTICE` baru; `DELIVERABLE.md`, `STATUS-ROADMAP.md`, `PETA-DOKUMEN.md`
   diperbarui; simpan tangkapan "sebelum/sesudah" sebagai bukti.
9. **Merek dagang** — sebelum dipakai komersial, lakukan **penelusuran merek** untuk "NIU" dan "MIRAI"
   di kelas yang relevan (perangkat lunak/avatar). Ini pekerjaan hukum, bukan pekerjaan repo.

## 6. Lisensi yang dipakai sekarang (bertahap, tanpa janji berlebih)

| tahap | kode (A) | dokumen | aset (B) |
|---|---|---|---|
| **sekarang** (sebelum Gerbang E) | **All Rights Reserved** (proprietary, internal) | boleh dibaca; dilarang didistribusikan ulang tanpa izin | milik pihak asli — **tidak dilisensikan** ke siapa pun oleh kita |
| **setelah P13** | tetap proprietary, atau dibuka (MIT/Apache-2.0) bila kamu mau | CC BY 4.0 bila dibuka | **milik kita**, lisensi mengikuti kode |
| **setelah Gerbang E + rebrand** | lisensi final dipilih di P15 | — | milik kita |

Alasan memilih **All Rights Reserved sekarang**: repo masih memuat aset pihak lain; lisensi terbuka akan
menyiratkan izin atas aset yang bukan hak kita.

## 7. Yang harus dilakukan pemilik proyek (bukan saya)
- [ ] Tinjauan hukum sebelum rilis komersial (aset, merek, klaim "rekonstruksi").
- [ ] Batasi akses situs verifikasi atau beri label tegas.
- [ ] Putuskan lisensi akhir P15 (proprietary vs terbuka).
- [ ] Daftarkan merek NIU & MIRAI bila akan dipakai komersial.
