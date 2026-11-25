# Kit ukur paritas

Alat untuk membuktikan dengan angka seberapa dekat klon dengan domain aslinya.
Semua skrip **hanya membaca** — tidak ada tulis ke repo, tidak ada git, tidak ada deploy.

## Prasyarat

```bash
npm i -D playwright && npx playwright install chromium   # atau: export PLAYWRIGHT_MODULE=/jalur/ke/playwright
pip install numpy pillow scipy
```

## Pakai cepat

```bash
./gerbang-paritas.sh apex          # klon live vs apex-humanoid.vercel.app
./gerbang-paritas.sh mira          # klon live vs mira-humanoid.vercel.app
KLON=http://localhost:5173 ./gerbang-paritas.sh apex    # uji build lokal sebelum deploy
```

Keluaran: tabel MAE penuh / tengah / %piksel>8 / luma, lalu peta blok 12×8 yang menunjukkan
**di mana** selisihnya berada.

## Isi

| Berkas | Fungsi |
|---|---|
| `gerbang-paritas.sh` | satu perintah: tangkap acuan + klon, ukur, cetak gerbang |
| `tangkap.js` | tangkap N frame 1440×900 DPR1, UI disembunyikan. `--patch f.js` menyuntik JS uji sebelum capture (uji hipotesis tanpa build ulang) |
| `probe-dom.js` | cetak geometri, z-index, opacity, `mix-blend-mode`, filter tiap `<canvas>`/`<img>` |
| `ukur-tangkap.py` | median N frame + MAE penuh/tengah + jitter (lantai derau) |
| `peta-blok.py` | peta selisih 12×8 untuk melokalisasi error |
| `banding.py` | gambar banding 4 panel: asli │ sebelum │ sesudah │ peta selisih |
| `p14-plate.py` | generator plate (regenerasi mandiri, bukan salinan aset asli) |
| `gerbang-p14.py` · `ukur-plate.py` · `ukur_plate_lib.py` | gerbang kualitas plate: `mae_sil`, `iou`, `r_grad`, `luma`, `param%` (pagar ≤ 90 %) |

## Aturan ukur yang harus dijaga agar angka bisa dibandingkan

1. Viewport **1440×900 DPR 1**, Chromium headless, audio mati.
2. APEX `?auto=1` + tunggu **11 detik**; MIRA `?auto=1&t=9` + tunggu 9 detik.
3. **Median 9 frame** jarak 400 ms. Frame tunggal tidak sah — animasi membuatnya berisik.
4. Bandingkan klon hanya dengan **domain aslinya sendiri**. APEX tidak pernah diadu dengan MIRA.
5. Catat jitter acuan setiap kali; kalau jitter melonjak, capture tidak valid (mesin terlalu lambat).
