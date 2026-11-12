# PETA DOKUMEN — satu halaman untuk tahu "berkas mana menjawab pertanyaan apa"

Diperbarui: **2026-11-12** (sesi 56). Semua dokumen di `Kerja-Arena/` dan isinya konsisten dengan
angka terakhir yang **diukur**, bukan yang diingat. Kalau kamu hanya punya waktu membaca satu berkas,
baca tabel di bawah lalu pilih.

## 1. Empat dokumen inti

| pertanyaan | dokumen | isi |
|---|---|---|
| "Di mana posisi proyek sekarang?" | **`STATUS-ROADMAP.md`** | tabel P0–P10 + status tiap gerbang + angka mutu **terkini** (§2 ditulis ulang sesi 56) |
| "Apa hasil akhirnya, dan apa batasnya?" | **`DELIVERABLE.md`** | dua URL produksi, angka mutu, cara bangun ulang dari nol, **batas yang diketahui**, peta berkas |
| "Bagaimana membangunnya ulang / memverifikasi?" | **`DELIVERABLE.md` §3 & §3b** + `tools/verifikasi-produksi.sh` | 5 lapis verifikasi, satu perintah |
| "Ke mana arah pengembangan berikutnya?" | **`docs/RENCANA-LANJUTAN.md`** | fase **P11–P15**, gerbang kelayakan rebrand (**Gerbang E**), aturan anti-lari-dari-benang-merah |
| "Bagaimana status hukum & merek?" | **`docs/LISENSI-BRANDING.md`** | asal-usul aset, tiga lapis lisensi, risiko sekarang, checklist cut-over ke **NIU & MIRAI** |
| "Bagaimana membangun avatar BARU dari nol?" | **`docs/MESIN-PRODUKSI-AVATAR.md`** | cetak biru pipeline, kontrak aset, harness gerbang, 10 langkah onboarding, jebakan W-1…W-10 |

## 2. Dokumen kerja (kronologis — "kenapa" di balik tiap angka)

| dokumen | peran |
|---|---|
| `PROGRESS.md` (72 KB) | log **keputusan & temuan** per sesi; tempat pertama mencari "kenapa dulu diputuskan begitu" |
| `REBUILD-LOG.md` (72 KB) | log **eksekusi** per sesi: perintah, hasil, jebakan |
| `docs/RENCANA-EKSEKUSI.md` | rencana asli **P0–P10** (dari artefak `recon/`) — historis, jangan diedit lagi |
| `docs/MANIFEST.md` | daftar berkas `recon/` di Google Drive (27 berkas, ukuran, peran) — **arsip asli ada di repo `Niu-Humanoid/docs/recon/`**, workspace hanya menyimpan turunannya |
| `docs/langkah6/STATE.md` (45 KB) | state mesin MIRA per langkah, dengan **§15–§17** = sesi 53–55 |
| `docs/langkah6/ANALISIS-GERBANG-C.md` | analisis mendalam sisa galat MIRA, termasuk hipotesis yang gugur |
| `docs/langkah4/AUDIO.md`, `docs/langkah5/STATE.md` | spesifikasi audio & state machine |
| `verification/VERIFICATION.md` (32 KB) | riwayat hasil gerbang per fase |
| `verification/langkah3/LANGKAH3.md` (78 KB) | catatan langkah 3 (figur, rambut, bloom) + semua F-* yang gugur |
| `verification/VERIFIKASI-5b-2026-11-12.md` | bukti penerapan paket 5a+5b (5 lapis) |
| `verification/provenance.json` | **hasil audit asal-usul aset** (12/12 masih salinan verbatim) |
| `paket/BACA-DULU.md` | surat pengantar paket terakhir yang dikirim |

## 3. Bukti terukur (JSON — jangan diringkas, dipakai apa adanya)

| berkas | isi |
|---|---|
| `verification/mira/gate-c-bodymesh-5b.json` | diagnosis penutup Gerbang C: skala 1,000 · geser 0 · HF 1,00 · tanda galat berimbang |
| `verification/mira/gate-{d,a,b,step5,step4c}-prod5b.json` | gerbang yang dijalankan **di URL produksi** 2026-11-12 |
| `verification/mira/gate-c-occluder-final.json` | F-148 (penutup badan) lengkap dengan angka |
| `verification/deploy/gate-deploy.json` + `*.png` | APEX: produksi asli vs deploy, dua viewport, + tangkapan untuk hitung ulang |
| `verification/provenance.json` | sha256 aset kita vs aset produk asli |
| `verification/langkah3/b5a-*`, `b5b-*`, `prod5b-*` | tangkapan 6 fase: build lokal, build 5b, **produksi** |

## 4. Aturan dokumentasi (supaya tidak membusuk)
1. **Setiap klaim angka wajib punya berkas bukti** (JSON/PNG) di `verification/` — bukan hanya di prosa.
2. **Satu sesi = satu entri** di `PROGRESS.md` (keputusan) dan `REBUILD-LOG.md` (eksekusi), lalu
   `STATUS-ROADMAP.md` §2 diperbarui **pada sesi yang sama** kalau ada angka baru. Angka basi = bug.
3. **Rencana yang sudah selesai tidak diedit** (`docs/RENCANA-EKSEKUSI.md`); rencana baru ditulis di
   `docs/RENCANA-LANJUTAN.md` supaya jejak keputusan tetap terbaca.
4. **Dokumen hukum (`LICENSE`, `NOTICE`, `docs/LISENSI-BRANDING.md`) hanya diubah bersama**, karena
   ketiganya saling merujuk.
