# AUDIT KETIGA — apa yang benar-benar sampai ke repo dan ke produksi (2026-11-18/19)

Dokumen ini menggantikan klaim "semua paket sudah diterapkan". Semua angka berasal dari **sha256 isi berkas**,
bukan dari penanda teks dan bukan dari pesan commit.

## 1. Putusan tiga kolom

| | lokal (workspace) | repo (`main`) | produksi (URL) |
|---|---|---|---|
| APEX — kode `src/` | 26 berkas | **23 sama · 9 beda/hilang** (masih 5y) | bundel `index-ffx1NC0u.js` `7daca178a692f337` = **build kita terbaru** |
| APEX — aset `public/humanoid` | plate kita | **0/10 — semuanya masih ASLI** | **10/10 milik kita** |
| MIRA — kode `src/` | 67 berkas | **67 sama · 0 beda** | bundel `index-BiuEEVDg.js` `17fc09d82f4fd52c` = build repo |
| MIRA — aset | plate kita | **2/2 milik kita** (`8409aa77647ed8d5`, `6c5e6791e3a5b9db`) | 2/2 milik kita |

Kesimpulan: **kode APEX tayang dari sumber yang tidak ada di repo**, dan **aset APEX di repo masih milik pihak
lain**. Dua hal itu belum pernah tercatat sebelumnya.

## 2. Bukti aset APEX (sha256 penuh, 10 plate)

| berkas | repo APEX (`49e011dd15`) | produksi & plate kita |
|---|---|---|
| `apex-idle-v1.webp` | `ba1a6d93f39ce84e…` = **asli** | `9f7ee35b7a61462d…` |
| `apex-listening-v1.webp` | `333ded16e7244316…` = **asli** | `d1257bc024d03bf0…` |
| `apex-speaking-v1.webp` | `5433add40a7b4ee2…` = **asli** | `589043740046a2fc…` |
| `apex-speaking-strong-v1.webp` | `836c193d917f2039…` = **asli** | `fed08d9fc7708db8…` |
| `apex-thinking-v1.webp` | `64f805cc2f9b95a8…` = **asli** | `5c52933a80a10421…` |
| `apex-assembly-25-v1.webp` | `907c6623913c051e…` = **asli** | `b1028f45c4f0e559…` |
| `apex-assembly-60-v1.webp` | `6847445a5828af54…` = **asli** | `7bfabb2e46ca8da1…` |
| `backdrop-v1.webp` | `9c5aeae2f11ea1db…` = **asli** | `35539292a3b90dbd…` |
| `mira-idle-v1.webp` | `35911d6e8517ca75…` = **asli** | `8409aa77647ed8d5…` |
| `mira-hair-v1.webp` | `8dc958e1750ee348…` = **asli** | `6c5e6791e3a5b9db…` |

Tabel sidik lengkap: `verification/p13/asli-sidik.json` (asli) · `verification/p13/sidik-tabel.json` (asli+kita).
Irisan hash asli ∩ kita = **0** (tidak ada salinan).

### 2.1 Dua kesalahan saya sendiri yang tertangkap di sini

1. **`verification/p13/asli/` di workspace ternyata berisi plate KITA**, bukan aset asli. Saya sempat
   memasukkannya sebagai acuan; itu membuat gerbang provenance membandingkan kita dengan kita.
   Diperbaiki: `p13/asli/` sekarang diisi dari `public/humanoid` repo APEX `49e011dd15` — dan hasilnya
   `8 plate asli + 2 plate MIRA kita`.
2. **`gate-provenance.py --live` tanpa `--akar` melaporkan "0/0 LULUS"** — lulus palsu karena 0 berkas
   diperiksa. Diperbaiki: 0 berkas = FATAL, daftar berkas diambil dari tabel sidik, `--pola` untuk memisahkan
   milik APEX/MIRA, dan kegagalan repo vs produksi dihitung terpisah.

## 3. Bukti `asli-sidik.json` di repo MIRA salah

`mira-humanoid@main` memuat `verification/p13/asli-sidik.json` yang menyebut **hash plate kita** sebagai "asli"
(`apex-idle-v1` = `907c6623…`, `mira-idle-v1` = `35911d6e…`). Menurut `public/humanoid` repo APEX, yang asli
adalah `ba1a6d93…` dan `35911d6e…` — jadi daftar itu tercampur: 8 baris berisi hash kita, 2 baris berisi hash
asli. Berkas itu dipakai `gate-provenance.py` sebagai *cadangan*, jadi **cadangan itu berbahaya**:
dengan daftar itu, plate kita akan dilaporkan "salinan asli". Sudah diganti di workspace dengan tabel yang benar.

## 4. Gerbang pada keadaan sekarang

| gerbang | hasil |
|---|---|
| provenance APEX **repo** (`--pola apex-*`) | **0/7** → GAGAL (semua plate repo masih asli) |
| provenance APEX **produksi** (`--pola apex-*`, `backdrop-*`) | **7/7 + 1/1** → LULUS |
| provenance MIRA **repo** | **2/2** → LULUS |
| provenance MIRA **produksi** (`--pola mira-*`) | **2/2** → LULUS |
| MIRA production: plate APEX | `apex-idle-v1.webp` disajikan sebagai **placeholder 646 B** (`8352af82…`) — bukan salinan asli, tetapi juga bukan plate kita |

## 5. Yang harus dilakukan (dan sudah dikemas di paket 6g)

1. **APEX**: kirim delta `src/` (9 berkas, termasuk `a11y.ts`) **+ seluruh 10 plate kita**. Tanpa plate,
   penerapan kode saja akan **mengembalikan aset asli** ke produksi.
2. **MIRA**: ganti `tools/gate-paritas.js` v2 → v4, `tools/gate-provenance.py` v4 (cadangan tabel yang benar),
   `p13/asli-sidik.json`, `src/main.tsx` (judul h1 "Apex Humanoid" → "MIRA Humanoid").
3. **Repo MIRA tidak perlu** memuat plate APEX (7 berkas) — hanya 2 plate MIRA yang dipakai.
