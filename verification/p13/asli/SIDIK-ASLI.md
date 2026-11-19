# Audit asal-usul aset publik (gerbang hukum rebranding)
tanggal: 2026-11-18 (sidik `asli` dibangkitkan dari `verification/provenance.json`)

## 1. Mengapa berkas ini ada

`tools/gate-provenance.py` membaca **tabel sidik** dari dua direktori:

| direktori | arti |
|---|---|
| `verification/p13/asli/` | `sha256` = **salinan asli produksi** (milik pihak lain) → GAGAL |
| `verification/p13/baru/` | `sha256` = **plate milik kita** (P13) → lulus |

Di repo `Niu-Humanoid`, `verification/p13/asli/` **tidak pernah ada** (bukti: `git ls-tree -r HEAD
verification/p13/asli/` → 0 berkas; `find / -name apex-idle-v1.webp` hanya menemukan `public/` dan
`baru/`). Akibatnya `tabel_sidik()` mengembalikan tabel yang hanya memuat `baru`, dan gerbang
melaporkan `FATAL: tabel sidik kosong` — padahal **semua aset yang disajikan produksi sudah milik
kita**.

Karena sidik asli **sudah tercatat lengkap** di `verification/provenance.json` (12 baris, `salinan_verbatim
= 0`), tabel ini dibangkitkan dari sana, bukan dari ingatan.

## 2. Sidik asli (16 heks pertama `sha256`)

| berkas | asli | kita |
|---|---|---|
| `mira-hair-v1.webp` | `8dc958e1750ee348` | `6c5e6791e3a5b9db` |
| `mira-idle-v1.webp` | `35911d6e8517ca75` | `8409aa77647ed8d5` |
| `apex-assembly-25-v1.webp` | `907c6623913c051e` | `b1028f45c4f0e559` |
| `apex-assembly-60-v1.webp` | `6847445a5828af54` | `7bfabb2e46ca8da1` |
| `apex-idle-v1.webp` | `ba1a6d93f39ce84e` | `9f7ee35b7a61462d` |
| `apex-listening-v1.webp` | `333ded16e7244316` | `d1257bc024d03bf0` |
| `apex-speaking-strong-v1.webp` | `836c193d917f2039` | `fed08d9fc7708db8` |
| `apex-speaking-v1.webp` | `5433add40a7b4ee2` | `589043740046a2fc` |
| `apex-thinking-v1.webp` | `64f805cc2f9b95a8` | `5c52933a80a10421` |
| `backdrop-v1.webp` | `9c5eae2f11ea1db` | `35539292a3b90dbd` |

## 3. Cara memakai

```bash
# gerbang provenance (repo + produksi) — K = repo
KERJA_ARENA=/tmp/5z-repo python3 tools/gate-provenance.py \
  --live https://niu-humanoid.vercel.app/ --json verification/p14/gate-provenance-apex-live-2026-11-18.json
```

## 4. Peringatan yang tetap berlaku

Tabel sidik ini **tidak memuat berkas asli** — hanya sidiknya. Kalau nanti ada kecurigaan aset lain
berasal dari produksi, sidik 16 heks di atas yang dipakai, bukan perbandingan berkas.
