# Paket 6a — Gerbang E dijadikan gerbang yang bisa MENGGAGALKAN (bukan laporan yang bisa dilewati)

tanggal: 2026-11-18 · dasar: paket 5z · **prioritas tertinggi**

## 1. Kenapa paket ini ada

Audit 5z menemukan hal yang seharusnya mustahil: repo APEX berisi **10/10 plate salinan asli produksi**
(`apex-idle-v1.webp` `ba1a6d93f39c` = identik `verification/p13/asli/apex-idle-v1.webp`), **sementara semua
gerbang lain lulus** dan P13 sudah dinyatakan "Gerbang E LULUS (0 salinan)".

Sebabnya bukan kelalaian orang, melainkan **bentuk gerbangnya**: Gerbang E waktu itu berupa laporan
`verification/p13/*.json` yang bisa dibaca, bukan pemeriksa yang bisa **menghentikan** pekerjaan. Selama
tidak ada yang menjalankannya terhadap `public/humanoid` yang sebenarnya, salinan asli bisa masuk kembali
tanpa satu pun angka berubah.

## 2. Yang baru: `tools/gate-provenance.py`

| mode | isi |
|---|---|
| `--statis` (bawaan) | setiap berkas di `public/humanoid` di-hash, lalu dicocokkan ke tabel sidik P13 (`verification/p13/asli/*` = asli produksi, `verification/p13/baru/*` = karya kita). Salinan asli → **GAGAL**. Tak dikenal → **GAGAL**. Berkas < 1 KB → **GAGAL** (placeholder) |
| `--larang-dari <json>` | daftar sidik yang **dilarang muncul lagi**; `--tulis-larangan` membuat daftar itu dari run yang gagal, sehingga aset asli yang pernah tertangkap tidak bisa lolos dengan nama lain |
| `--live URL` | membuktikan yang **disajikan** juga milik kita: unduh tiap plate dari URL produksi, bandingkan sha256 dengan berkas di disk **dan** dengan tabel sidik |
| `--json` | keluaran mesin untuk diarsipkan ke `verification/p14/` |

Keluar dengan kode 1 bila ada satu saja yang gagal → bisa dipakai di CI/pre-commit:
`python3 tools/gate-provenance.py || exit 1`.

## 3. Hasil pemeriksaan hari ini (bukan klaim — dijalankan)

| aplikasi | hasil | rincian |
|---|---|---|
| MIRA (`mira-humanoid-rebuild`) | **2/2 lulus** | `mira-hair-v1` `6c5e6791e3a5` · `mira-idle-v1` `8409aa77647e` — keduanya ada di tabel sidik "kita" |
| APEX (`apex-humanoid-rebuild`) | **0/10 lulus** | 10 berkas, semuanya cocok dengan tabel sidik **asli**; mis. `apex-idle-v1` `ba1a6d93f39c` (300 084 B) |

Bukti: `verification/p14/gate-provenance-{apex,mira}-2026-11-18.json`.

## 4. Cara pakai sesudah menerapkan paket 5z

```bash
# di repo APEX, setelah `python3 tools/p13-aset.py` + `python3 tools/p13-backdrop.py`
python3 tools/gate-provenance.py --json verification/p14/gate-provenance-apex.json
# → harus "10/10 lulus · semua milik kita"

# buktikan juga yang disajikan produksi
python3 tools/gate-provenance.py --live https://niu-humanoid.vercel.app \
        --json verification/p14/gate-provenance-apex-live.json
```

## 5. Batas kejujuran

* Gembok ini **tidak** menilai mutu gambar. Plate yang buruk tetapi dibuat sendiri akan **lulus** — memang
  bukan urusannya; mutu diuji `verification/p13/aset-siluet.json` (IoU ≥ 0,98, hasil 0,9991) dan
  `verification/p13/p13-langkah3.json` (tonal backdrop).
* Tabel sidik berasal dari `verification/p13/{asli,baru}`. Kalau direktori itu hilang, gerbang berhenti
  dengan `FATAL` — sengaja: tanpa tabel sidik, "milik kita" tidak bisa dibuktikan.
* Berkas baru yang sah (plate generasi berikutnya) akan **GAGAL** sebagai "tak dikenal" sampai ditambahkan
  ke tabel `baru/`. Itu perilaku yang diinginkan: setiap aset baru harus punya bukti kelahiran.

## Isi paket & sha256 (8 heks pertama) — 3 berkas

| berkas | sha256 | byte |
|---|---|---|
| `tools/gate-provenance.py` | `32806cdd` | 6206 |
| `verification/p14/gate-provenance-apex-2026-11-18.json` | `05c91dbd` | 2286 |
| `verification/p14/gate-provenance-mira-2026-11-18.json` | `502b92bf` | 485 |
