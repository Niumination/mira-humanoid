# Gerbang produksi sebagai bukti rutin — cara menjalankan, cara membaca, kapan berhenti

Sejak P15, gerbang tidak hanya dijalankan pada repo lokal. Yang menentukan pengguna melihat apa adalah
**produksi**. Karena itu setiap ronde verifikasi sekarang punya dua medan:

| medan | alat | pertanyaan yang dijawab |
|---|---|---|
| repo (lokal) | `gate-paritas`, `gate-aset-layout`, `gate-a11y`, `gate-provenance --statis` | apakah kode di repo lulus |
| **produksi (URL)** | `gate-aset-layout SUMBER=produksi`, `gate-a11y`, `gate-provenance --live` | apakah yang **disajikan** lulus |

## 1. Hasil ronde ini (2026-11-18, produksi)

| gerbang | APEX (`niu-humanoid.vercel.app`) | MIRA (`mira-humanoid-niu.vercel.app`) |
|---|---|---|
| aset & tata letak | 12/20 → **20/20** setelah `SUMBER=produksi` | 14/14 |
| a11y | **8/8** (dulu A4 & A7 gagal) | 8/8 |
| provenance aset | **10/10** | 2/2 |
| penanda bundel | 5/15 (bundel produksi lebih lama dari repo) | 6/6 |

## 2. Kenapa `SUMBER=produksi` perlu

Gerbang aset mula-mula membandingkan `sha256` aset di halaman dengan `sha256` **berkas di repo lokal**. Itu
benar untuk "repo sudah memuat paket aset", tetapi **salah** sebagai putusan produksi: repo APEX belum memuat
paket aset, jadi 8 plate dilaporkan "beda" padahal yang disajikan produksi justru milik kita.

Perbaikan: `SUMBER=produksi` membandingkan `sha256` halaman dengan **tabel sidik P13**
(`verification/p13/asli` vs `verification/p13/baru`). Hasil: **20/20** — delapan plate yang sama memang milik
kita.

## 3. Perintah (lengkap, urut)

```bash
# 0. lingkungan (WAJIB dua langkah; tanpa ini alat keluar 0 dengan {"tersedia": false})
bash tools/gerbang-lingkungan.sh
source /home/user/.gerbang-env
/home/user/pw/node_modules/.bin/playwright install --force chromium

# 1. jangan bersihkan workspace di tengah gerbang (pernah mematikan gate-a11y)

# 2. gerbang produksi
export PW_TIMEOUT=300000
cd /home/user/Kerja-Arena/verification/produksi-gate
MIRA=https://mira-humanoid-niu.vercel.app/ APEX=https://niu-humanoid.vercel.app/ \
  SUMBER=produksi node /home/user/tools/gate-aset-layout.js --json gate-aset-layout-produksi-2.json
MIRA=... APEX=... node /home/user/tools/gate-a11y.js --json gate-a11y-produksi.json
node /home/user/tools/gate-provenance.py --live https://niu-humanoid.vercel.app/ --json …
```

## 4. Kapan gerbang produksi berhenti menjadi bukti

1. **Kalau repo dan produksi berbeda build.** Selalu catat `sha256` bundel produksi (`index-*.js`). Ronde ini:
   produksi APEX `index-Ddu4_X7n.js` (`767902d865fcaaee`), sedangkan repo sekarang menghasilkan
   `index-ffx1NC0u.js` (`7daca178a692f337`). Artinya gerbang produksi menguji **versi lebih lama** — tetap
   sah sebagai bukti "yang tayang sekarang", bukan bukti "repo sekarang".
2. **Kalau CDN menyajikan berkas lain.** `vercel` memberi nama ber-hash; hash nama = isi, jadi cukup catat.
3. **Kalau gerbang dijalankan tanpa `PW_TIMEOUT`.** Di 390/414 tangkapan bisa melewati 120 s dan gagal palsu.

## 5. Aturan putusan (jangan dilonggarkan)

* Gerbang produksi **tidak boleh** menjadi alasan menunda penerapan repo, dan sebaliknya lulusnya repo tidak
  membuktikan produksi sudah diperbarui. Dua kolom, dua putusan.
* Bila hasil produksi dan repo berbeda, laporkan **keduanya** dengan hash bundel masing-masing.
