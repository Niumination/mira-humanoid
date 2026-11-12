# MESIN PRODUKSI AVATAR — cetak biru membangun avatar baru (NIU, MIRAI, dan seterusnya) dari nol

Ditulis: **2026-11-12** (sesi 56). Dokumen ini mengubah pengalaman dua proyek (APEX & MIRA) menjadi
**mesin yang bisa diulang**: kalau besok kita membuat avatar ketiga dengan karakteristik berbeda, ikuti
dokumen ini dan hasilnya punya mutu serta bukti yang sama.

Prinsipnya satu kalimat: **kontrak dulu, gerbang menyusul, baru seni.** Aset tanpa kontrak = tidak bisa
diuji; aset tanpa gerbang = tidak bisa dipercaya.

---

## 1. Arsitektur delapan lapisan (yang sudah terbukti di MIRA)

Gambar satu frame avatar adalah **komposisi delapan lapisan**; masing-masing punya kontrak sendiri.

| # | lapisan | peran | contoh nyata di repo | kontrak |
|---|---|---|---|---|
| 1 | **Entry** | layar masuk, satu tombol, copy | `src/components/EntryScreen.tsx` | teks = satu sumber; tidak ada gambar latar berat |
| 2 | **Medan (field)** | nebula/atmosfer, satu shader layar penuh | `field.frag`, `blit.frag` di `MiraStage.tsx` | shader tanpa state antar-frame; semua waktu dari `uTime` |
| 3 | **Plate figur** | citra tokoh per state | `picFill`/`picColor` + `public/humanoid/*.webp` | daftar state tetap, dimensi sama, alfa kanal A |
| 4 | **Penutup & permukaan** | badan opak + pencahayaan (rim/diffuse) | `occluder.frag`, `bodymesh.frag` | masker siluet + medan tinggi; knob bawaan **0** |
| 5 | **Rambut & helai** | kuad rambut + pita helai + bintik | `hair.frag`, `strands.frag`, `twinkles.frag` | titik pivot & offset terukur, bukan dikira |
| 6 | **Partikel** | awan titik tubuh, busur, percikan | `pts.*`, `sprite.*`, `waves.*`, `shock.*` | buffer deterministik: semua acak dari seed, bukan `Math.random()` |
| 7 | **Post** | bloom 8 mip + komposit + encode sRGB | `blit`, `up`, `hp`, `comp` | urutan pass tetap, radius & bobot dari sumber |
| 8 | **Otak** | state machine, audio, aura, tangan/MIC | `miraAura.ts`, `miraAudio.ts`, `miraHand.ts` | perilaku waktu-diskret, bisa dipin `?t=`, `?talk=` |

**Aturan emas:** lapisan **3, 5, 6** adalah yang paling mahal untuk ditiru dan paling mudah salah.
Kerjakan berurutan 2 → 3 → 7 dulu (medan, plate, post), baru 4 → 5 → 6 (bagian halus), lalu 8 (otak).

---

## 2. Kontrak aset (`avatar.manifest.json`)

Setiap avatar punya satu manifest. Tanpa manifest, tidak ada gerbang. Contoh lengkap ada di
`templates/avatar.manifest.json`; ringkasnya:

```json
{
  "id": "mirai",
  "nama": "MIRAI",
  "kanvas": { "lebar": 1440, "tinggi": 900, "plate": [1145, 1374] },
  "state": ["idle", "listening", "thinking", "speaking", "speaking-strong"],
  "plate": { "idle": "public/humanoid/mirai-idle-v1.webp", "...": "..." },
  "rambut": { "berkas": "...", "lebar": 1385, "tinggi": 1422, "offset": [120, 48], "pivot": [694.79, 322.8] },
  "siluet": { "sumber": "alfa-plate", "blur": 9, "ambang": 0.06 },
  "waktu": { "ignite": 6.55, "kecepatan_gelombang": 1060, "titik": [x, y] },
  "dial": { "jumlah": 82, "berkas": "src/lib/miraDial.ts" },
  "warna": { "utama": "#cfc9ff", "aksen": "#f0c46a", "badan": "#0d0918" },
  "lisensi": { "aset": "milik-sendiri", "kode": "proprietary" }
}
```

**Wajib benar:**
- `plate` semua state **dimensi identik** — kalau tidak, geometri bergeser per state dan gerbang piksel
  akan mengukur kesalahan yang tidak ada.
- `siluet.sumber` menentukan cara menutup badan: `alfa-plate` (paling murah) atau `mesh` (paling setia).
- `lisensi.aset` **harus** `milik-sendiri` untuk avatar yang akan dipublikasikan (lihat
  `docs/LISENSI-BRANDING.md`).

---

## 3. Kontrak parameter (dial)

- **Semua** tombol/slider panel berasal dari satu daftar (di MIRA: 82 parameter, 20 seksi, 7 alias).
- Tiga jalur masuk, satu sumber kebenaran: panel UI → `localStorage` → URL `?dial.<seksi>.<nama>=`.
- Konvensi **knob riset**: parameter yang hanya untuk eksperimen diberi nama pendek (`?ock`, `?bmk`,
  `?pgg`) dan **bawaannya harus membuat gambar identik dengan sebelumnya**. Ini bukan formalitas: itu yang
  membuat regresi bisa dibuktikan **0,0000 · 0 piksel**.
- Konvensi **ablasi**: `?off=<lapisan>` mematikan satu lapisan untuk mengukur kontribusinya. Tanpa `off=`,
  setiap analisis lapisan akan menebak.

---

## 4. Kontrak waktu & determinisme

1. Satu jam: `t` (detik) — dipin lewat `?t=` untuk gerbang. Tidak ada animasi yang memakai `Date.now()`
   langsung di shader.
2. Peluncuran (ignition) adalah **gelombang**: `revealAt(p) = ignite + f(jarak ke titik)`. Semua lapisan
   memakai fungsi yang sama, kalau tidak, rambut muncul sebelum badan.
3. Aturan reproduksibilitas: **dua tangkapan pada `?t=` sama harus 0,0000**. Kalau tidak, ada `Math.random()`
   atau jam berbasis jumlah frame (pelajaran W-8: jangan simpulkan dari 2 tangkapan; ambil 3 termasuk cold start).

---

## 5. Harness gerbang — yang wajib dibangun untuk SETIAP avatar baru

| gerbang | pertanyaan | alat contoh | lulus bila |
|---|---|---|---|
| **A** | layar masuk & mode humanoid sama? | `gate-mira-a.js` | 8/8 butir |
| **B** | parameter & urutan seksi lengkap? | `gate-mira-b.js` | 10/10 butir |
| **C** | seberapa dekat gambarnya? | `metric3.py` + `sweep-knob.js` | laporkan MAE **dan** peta selisih; jangan "kelihatan mirip" |
| **D** | tahan banting? | `gate-d.js` (D5–D9) | reproduksi 0,0000 · tanpa seam · fps ≥ 0,8× acuan · 120 s stabil · viewport 390 |
| **deploy** | yang hidup = yang kita bangun? | `verifikasi-produksi.sh` | aset produksi = build **byte-identik** |
| **hukum** | aset milik sendiri? | `audit-provenance.py` | **0 salinan verbatim** |

Urutan menjalankan setiap kali ada perubahan:

```
npx tsc --noEmit && npx vite build          # 1. jangan pernah mengukur build yang gagal
node tools/reg-build.js --t 8 --t 11.5      # 2. knob baru wajib 0,0000 · 0 piksel
node tools/capture.js --prefix xxx --t 0.3,1.89,3.5,5.5,6.8,9.5   # 3. tangkap 6 fase
python3 tools/metric3.py xxx 0.3 1.89 3.5 5.5 6.8 9.5            # 4. paritas + peta selisih
bash tools/verifikasi-produksi.sh --gates   # 5. lima lapis sebelum rilis
python3 tools/audit-provenance.py           # 6. gerbang hukum
```

---

## 6. Anggaran mutu & performa (diukur, bukan diharapkan)

| metrik | ambang | cara mengukur |
|---|---|---|
| reproduksibilitas `?t=` | **0,0000** | `gate-d.js` D5 |
| fps (di lingkungan uji swiftshader) | ≥ 0,8× acuan | `gate-d.js` D7 |
| stabilitas 120 s | 0 galat, konteks hidup | `gate-d.js` D8 |
| mobile 390×844 | korelasi profil ≥ 0,95 | `gate-d.js` D9 |
| paritas piksel | laporkan apa adanya + peta selisih | `metric3.py --grid` |
| ukuran bundel JS | ≤ 600 KB (MIRA sekarang 530 KB) | `ls dist/assets` |

---

## 7. Karakteristik berbeda — bagian mana yang diparametrisasi

Avatar baru tidak harus mirip MIRA. Yang **tetap** adalah mesinnya; yang **berubah** adalah:

| dimensi karakter | pilihan yang tersedia | efek teknis |
|---|---|---|
| **silhouette** | plate (murah, setia) · mesh prosedural (milik sendiri, bisa dianimasikan) | lapisan 3/4; mesh menuntut normal + material |
| **bentuk medan** | nebula cincin · kabut horizontal · partikel 3D | lapisan 2: uniform `iCenter/iRing/iSpread/iNear/iClear` |
| **palet** | 2 warna + 1 aksen; semua warna diturunkan dari manifest | hemat waktu kalibrasi; hindari warna acak per shader |
| **gerak** | napas, gelombang, kepala menoleh, tangan | lapisan 5/6: amplitudo & fase, bukan kode baru |
| **suara & bicara** | cue audio per state, level MIC → bentuk mulut | lapisan 8: `miraAura`/`miraAudio` sebagai cetakan |
| **kecerdasan** | skrip cue · reaktif MIC · (nanti) model bahasa | jangan campur: satu sumber per state |
| **jumlah state** | 5 (MIRA/APEX) atau lebih | semua plate wajib dimensi sama |

---

## 8. Sepuluh langkah membuat avatar baru

1. **Isi manifest** dari `templates/avatar.manifest.json`; tentukan id, state, palet, dimensi.
2. **Siapkan plat** (milik sendiri!) untuk setiap state; jaga dimensi identik; buang latar dengan alfa.
3. **Bangun lapisan 2 (medan)** lebih dulu dan ukur: `?off=` semua lapisan lain → bandingkan dengan acuan
   medan; ini menentukan "suasana" avatar.
4. **Pasang lapisan 3 (plate)** + `revealAt` (ignition). Uji `?t=` 0,3 · 1,89 · 3,5 · 5,5 · 6,8 · 9,5.
5. **Pasang lapisan 7 (bloom)**; ukur profil radial titik terang, bukan hanya MAE.
6. **Pasang lapisan 4 (penutup/permukaan)** kalau medan menembus badan (gejala: wilayah gelap terlalu terang).
7. **Pasang lapisan 5–6 (rambut, partikel)** dengan pivot/offset **terukur** dari acuan, bukan dikira.
8. **Pasang lapisan 8 (otak)**: state machine, audio, tangan/MIC; semua perilaku bisa dipin dari URL.
9. **Bangun gerbang A–D** + `verifikasi-produksi.sh`; simpan hasil ke `verification/`.
10. **Audit hukum** (`audit-provenance.py`) dan **perbarui dokumen** (`PETA-DOKUMEN.md`, `STATUS-ROADMAP.md`).

---

## 9. Jebakan yang sudah dibayar mahal (jangan diulang)

| kode | jebakan | akibat | cara mencegah |
|---|---|---|---|
| **W-9b** | `bindVertexArray(vao)` tanpa `.v` | **seluruh loop gambar melempar galat**; hasilnya *tampak* seperti eksperimen sukses | selalu cek `window.__MIRA_ERR` sebelum menyimpulkan angka |
| **W-9** | tekstur siluet di unit 0 | kuad gambar ikut memakainya → badan hitam total | unit tekstur didokumentasikan per pass |
| **W-9c** | berkas lokal menyimpang dari repo (blok terduplikasi) | build "tidak berubah" tanpa sebab | pulihkan dari tarball commit terverifikasi + assert `count==1` tiap anchor |
| **W-9d** | penutup digambar ke FBO figur, bukan kanvas | kanvas tetap terang, tidak berpengaruh | gambar ke kanvas sesudah blit latar |
| **W-10** | `curl` ke URL bergaris-miring ganda | menerima halaman redirect 15 byte → verifikasi salah menyimpulkan | `PROD=${PROD%/}` · `curl -sL` · tolak < 10 KB |
| **W-8** | menyimpulkan reproduksibilitas dari 2 tangkapan | jam animasi berbeda → kesimpulan palsu | 3 tangkapan termasuk cold start |
| **F-148/149** | menyapu knob saat masalahnya **struktur** | bias membaik, MAE memburuk, waktu habis | diagnosis dulu: skala, geser, HF, tanda galat, matriks warna |
| **GLSL3** | shader baru tanpa plumbing | gagal senyap / galat kompilasi | `#version 300 es`, `layout(...) out`, `texture()` |
| **tmpfs** | `/tmp` hilang antar sesi | alat hilang | alat penting disimpan di `tools/`, dipasang ulang lewat `siapkan-alat.sh` |

---

## 10. Alat yang sudah tersedia (peta cepat)

| kebutuhan | alat |
|---|---|
| tangkap 6 fase | `tools/capture.js` |
| paritas + peta selisih | `tools/metric3.py`, `tools/diffmap.py` |
| sapu knob / ablasi | `tools/sweep-knob.js`, `tools/gate-c-layer.js`, `tools/gate-c-ablation.js` |
| gerbang fungsi & ketahanan | `gate-mira-a/b.js`, `gate-d.js`, `gate-step5.js`, `gate-step4c.js` |
| regresi build vs produksi | `tools/reg-build.js` |
| lima lapis verifikasi | `tools/verifikasi-produksi.sh` |
| gerbang hukum aset | `tools/audit-provenance.py` |
| scaffold avatar baru | `tools/avatar-baru.py <id>` (membuat kerangka manifest + README + daftar gerbang) |

---

## 11. Definisi "selesai" untuk sebuah avatar baru

- [ ] manifest lengkap & valid (`tools/avatar-baru.py --periksa <id>`)
- [ ] gerbang **A** dan **B** lulus penuh
- [ ] gerbang **C** dilaporkan dengan angka + peta selisih (bukan kata "mirip")
- [ ] gerbang **D** 7/7 (reproduksi 0,0000 · tanpa seam · fps · 120 s · dua viewport)
- [ ] `verifikasi-produksi.sh --gates` lulus (aset produksi = build byte-identik)
- [ ] `audit-provenance.py` → **0 salinan**
- [ ] dokumen diperbarui pada sesi yang sama (`PETA-DOKUMEN.md`, `STATUS-ROADMAP.md`)
