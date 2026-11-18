# BACA-DULU-6c — Jawa: bingkai responsif yang bisa dipertanggungjawabkan + bukti gerbang P14 di upstream apa adanya

tanggal: 2026-11-18 · dasar: paket 6b

## 1. Kenapa paket ini ada

Dua angka yang selama sesi ini dianggap "temuan" ternyata **artefak cara mengukur** — dan itu harus
ditulis sebagai koreksi, bukan dihapus:

1. "MIRA patah di 414×896 (cakupan 4,1 %)" → tangkapan diambil pada **2,6 s**, saat animasi kelahiran belum
   selesai di sandbox SwiftShader (±2,5 fps). Setelah keadaan dipaku: cakupan **0,264**.
2. "MIRA 1440×900 cakupan 0,507, MAE diri 48,63" (run penuh pertama v3) → renderer **membeku** karena
   kelaparan frame; dua tangkapan berurutan jadi sama padahal adegan masih bergerak.

Perbaikannya bukan menambal tata letak, tetapi **memaku keadaan yang diukur**.

## 2. Jangkar waktu (dipakai mulai paket ini)

| jangkar | aplikasi | MAE diri (2 run) | cakupan 2 run | Δ |
|---|---|---|---|---|
| `?t=11.5` | MIRA 1440×900 | 0,00 · 2,10 | 0,4843 · 0,4815 | 0,0028 |
| `?t=11.5` | MIRA 390×844 | 3,33 · 3,22 | 0,5019 · 0,5020 | 0,0001 |
| `?auto=1` | APEX 1440×900 | 2,82 · 2,81 | 0,3237 · 0,3237 | **0,0000** |
| `?auto=1` | APEX 390×844 | 1,63 · 1,68 | 0,3303 · 0,3301 | 0,0002 |

Pembanding cara lama (MIRA `?auto=1` @414): cakupan **0,042 – 0,507** — rentang 0,465, cukup untuk membuat
gerbang lulus/gagal secara acak.

## 3. Hasil gerbang penuh 2026-11-18 (Chromium headless-shell, upstream apa adanya)

| gerbang | hasil | angka |
|---|---|---|
| `gate-paritas` **v4** | **24/24** | MIRA MAE diri **0,00** (ketiga viewport) · cakupan 0,487 / 0,506 / 0,509 · APEX MAE diri 4,47 / 2,78 / 3,22 · cakupan 0,338 / 0,334 / 0,338 |
| `gate-aset-layout` | **34/34** | 10 plate ber-SHA-256 sama dengan berkas workspace + 24 butir tata letak |
| `gate-a11y` | **14/16** | MIRA **8/8** · APEX **6/8** — A4 `<main>` dan A7 `prefers-reduced-motion` **gagal**, karena perubahan 5x belum masuk ke repo APEX (lihat paket 5z) |
| `gate-provenance` | MIRA **2/2** · APEX **0/10** | 10 plate APEX masih salinan asli produksi |

Artinya konsisten: **MIRA sudah P14, APEX belum.** Gerbang aksesibilitas menunjuk berkas yang sama dengan
audit 5z — dua alat berbeda, satu kesimpulan.

## 4. Isi paket

| berkas | isi |
|---|---|
| `docs/p14/BINGKAI-RESPONSIF.md` | angka stabil per viewport, pola bingkai MIRA vs APEX, aturan keputusan (kapan bingkai disebut cacat vs sifat desain), tiga pekerjaan P15 dengan angka awal |
| `tools/gate-paritas.js` | **v4**: jangkar `MIRA_JANGKAR`/`APEX_JANGKAR`, `TUNGGU_MS`, batas tangkapan 300 s, `HANYA=<vp>`, `SHOTS_DIR` |
| `verification/p14/gate-paritas-2026-11-18.json` | bukti 24/24 |
| `verification/p14/gate-aset-layout-2026-11-18.json` | bukti 34/34 |
| `verification/p14/gate-a11y-2026-11-18.json` | bukti 14/16 + butir yang gagal dan sebabnya |

## 5. Aturan baru yang dikunci

> **Gerbang yang memakai waktu wajib memaku keadaan.** Kalau aplikasi punya parameter waktu (`?t=`), pakai
> itu. Kalau tidak, syarat "sudah tenang" tidak boleh bisa dipenuhi renderer yang membeku: minimal harus
> lewat durasi animasi **dan** tiga pembacaan berurutan saling cocok.

Tanpa aturan ini, dua gerbang bisa memberi putusan berlawanan pada aplikasi yang sama hanya karena
tangkapan diambil pada detik berbeda — dan itu sudah terjadi dua kali dalam sesi ini.

## 6. Batas yang masih terbuka

* APEX belum punya `?t=`; gerbangnya masih bergantung waktu tunggu 9 s (walau Δ cakupan 0,0000). Menambah
  `?t=` di APEX masuk P15.
* Semua angka dari sandbox 2 vCPU + SwiftShader: sah untuk **perbandingan di lingkungan yang sama**, tidak
  untuk klaim fps absolut.

## Isi paket & sha256 (8 heks pertama) — 6 berkas

| berkas | sha256 | byte |
|---|---|---|
| `docs/p14/BINGKAI-RESPONSIF.md` | `2323a9ca` | 3724 |
| `tools/gate-paritas.js` | `8005b6db` | 11841 |
| `verification/p14/gate-paritas-2026-11-18.json` | `d756510c` | 10115 |
| `verification/p14/gate-aset-layout-2026-11-18.json` | `5d0912c9` | 3566 |
| `verification/p14/gate-a11y-2026-11-18.json` | `6842ee57` | 2349 |
| `STATUS-ROADMAP.md` | `c686615b` | 8340 |
