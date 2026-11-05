# Langkah 3 — jam build MIRA (bagian 1–2)

Tanggal: 2026-10-30. Semua angka = `?auto=1&t=<detik>` 1440×900, dibandingkan dengan **app MIRA asli**
(`https://mira-humanoid.vercel.app`, dipakai sebagai ground truth karena itu yang direkam di `recon/`).

## Yang dikerjakan

| # | perubahan | bukti/asal |
|---|---|---|
| 1 | `uBT` rambut/helai/bintik = **jam build** (dulu konstanta 100) | uniform live `uBT 0,9071` pada t≈1,89 |
| 2 | ramp build `iField`/`iMatter` (dulu konstanta 1) | `Tw({waves, matter, orb})` di bundle live |
| 3 | opacity kanvas latar = `min(1, waves·1,6)` | DOM live: 0,064 / 0,604 / 1,0 pada t 0,3 / 1,89 / 9,5 |
| 4 | warna lapisan gambar dikali `filled` (mask reveal) | lihat “akar masalah” |
| 5 | cincin kejut ignition `35/36` + `qN(t)` | uniform live `uShock [574,1008,2204·,0,115]` |

### Akar masalah “figur tampil sejak frame pertama”
Di live, `06-frag` (lapisan gambar) hanya mengalikan **alpha** dengan `filled`; warna tetap keluar. Yang
membuatnya tak terlihat sebelum gelombang reveal adalah **komposisi kanvas ber-alpha (premultiplied)** oleh
browser. Rebuild memakai satu kanvas opaque → warna additive tetap menyembur sejak frame pertama.
Eksperimen yang membuktikan: membaca alpha RT figur lewat `?dbgalpha=1` → alpha ≈ 0 di semua fase
(2/255), jadi meniru premultiply di kanvas tidak menolong (`t=9,5` malah jadi 18,3). Perbaikan yang dipakai:
kalikan **rgb** dengan `filled` di `picColor.frag`.

## Hasil terukur per fase

| t (s) | MAE sebelum | MAE sesudah | >8/255 sesudah | kecerahan build / live |
|---|---|---|---|---|
| 0,3 | 18,05 | **3,19** | 3,6 % | 2,0 / 3,0 |
| 1,89 | 31,61 | **20,06** | 21,4 % | 3,2 / 21,7 |
| 3,5 | 25,12 | **15,27** | 17,9 % | 10,2 / 23,0 |
| 5,5 | 27,16 | **18,46** | 20,3 % | 8,0 / 22,5 |
| 6,8 | 36,52 | **37,25** | 43,1 % | 32,4 / 61,2 |
| 9,5 | **12,53** | **12,53** | 57,2 % | 44,8 / 39,6 |

Tidak ada fase yang memburuk; kondisi mapan (9,5) tidak berubah.

## Sisa yang terukur (pekerjaan berikutnya)

1. **Orb `25/26` (15 kuad) belum ada** — pada 1,89–5,5 live terang (21,7–23,0) sementara rebuild 3–10.
   Ini benda terang yang berpusar sebelum ignition; tanpa lapisan ini fase build selalu gelap.
2. **Kilatan ignition** pada 6,8: live 61,2 vs rebuild 32,4. `qN` sudah masuk; yang belum: `hum.strike.flash`
   pada garis glide `13/14` + percikan orb `33/34`.
3. Sesudah itu: gerbang C (baseline terukur per run).

Berkas gambar: `live-t*.png` (app asli) dan `build6-t*.png` (rebuild) di folder ini.

## Verifikasi di produksi (`mira-humanoid-niu.vercel.app`) — 1 Nov

Bundle produksi `index-DZGcjv2t.js` 401.882 B, sha256 `68b1b5e0a7e7b567…` = build repo HEAD `6829d6a`.

| t (s) | produksi vs live (GT) | produksi vs `build6` (lokal) |
|---|---|---|
| 0,3 | 3,19 (2,0 / 3,0) | **0,00** |
| 5,5 | 18,46 (8,0 / 22,5) | 0,08 |
| 6,8 | 37,24 (32,4 / 61,2) | 0,18 |
| 9,5 | 12,53 (44,8 / 39,6) | 0,14 |

Jadi produksi = kode repo = kondisi kerja (selisih ≤ 0,18 dari tangkapan lokal). Angka terhadap app asli
sama dengan tabel di atas.

## Bagian 3 — salinan materi & `uSettle` (F-81)

Dibaca dari program materi app asli dengan `tools/probe-mira-field.js` (dua konteks WebGL: medan `webgl`
1007×630, figur `webgl2` 1440×900). Nilai live vs rebuild:

| uniform | live | rebuild sebelum | sekarang |
|---|---|---|---|
| salinan utama `uLag`/`uTrail` | 0 / **1** | — (tidak ada salinan utama) | 0 / 1 |
| salinan jejak | 3 × `[0,025·0,55] [0,05·0,32] [0,08·0,16]` | 1 × (0,025·0,55) | 3 × |
| `uSettle` | `0,75 − 0,4·smoothstep(t;0,9;6)` | 0,7109 (konstanta) | rumus live |
| `uLiveT` | = jam build | 0 | = jam build |
| setelah `last+0,5 s` | `drawRange(0, nStay)`, jejak disembunyikan | tidak ada | ada |

| t | MAE sebelum | MAE sesudah | kecerahan build/live |
|---|---|---|---|
| 0,3 | 3,19 | 4,30 | 6,3 / 3,0 |
| 1,89 | 20,06 | **13,92** | 9,6 / 21,7 |
| 3,5 | 15,27 | **9,14** | 22,6 / 23,0 |
| 5,5 | 18,46 | **14,30** | 27,4 / 22,5 |
| 6,8 | 37,25 | **35,45** | 36,8 / 61,2 |
| 9,5 | 12,53 | 12,89 | 45,2 / 39,6 |

## Bagian 4 — empat jam terpisah + orb/gain (F-82)

| hal | live (terukur) | sebelumnya |
|---|---|---|
| jam medan `iTime` saat `?t=` dipin | **0,150** | = jam build |
| jam rambut/helai/bintik | 0,045–0,2 (sendiri) | = jam build |
| jam wajah `uFaceA.z` | 0,2 | 0 |
| orb `uOpacity` | `matter·0,3` | 0,36 tetap |
| orb `uOrbPx`/`uOrbR` | 721,35 / 622,08 · 111,47 @1440×900 | (−9999,−9999) · 1 |
| garis `uGain` | `0,95·(1+1,1·e^(−Δ/1,9))` = 1,1712 @9,5 | 0,95 |

| t | MAE sebelum | sesudah | kecerahan build/live |
|---|---|---|---|
| 0,3 | 4,30 | **3,46** | 5,5 / 3,0 |
| 1,89 | 13,92 | **13,45** | 8,8 / 21,7 |
| 3,5 | 9,14 | **8,55** | 22,1 / 23,0 |
| 5,5 | 14,30 | **13,72** | 26,8 / 22,5 |
| 6,8 | 35,45 | **34,87** | 36,7 / 61,2 |
| 9,5 | 12,89 | **9,89** | 46,7 / 39,6 |

Kelebihan terang pada 9,5 (+7,1) menurut uji `off=…`: gambar 10,0 · garis 6,5 · rambut 5,8 · bloom 4,5 ·
materi 0,4 · pita 0,8 → soal cakupan/komposisi, bukan nilai uniform.

## Bagian 5 — bug `modelMatrix` pada sprite + haze lebar (F-83, F-84, F-85)

### F-83 — `drawSprite` mengirim skala di matriks yang salah (bug, ditemukan lewat shader)

`src/lib/shaders/sprite.vert.glsl` (three.js `SpriteMaterial`) mengambil **ukuran** dari `modelMatrix`
(`length(modelMatrix[0].xyz)`, `length(modelMatrix[1].xyz)`) dan **posisi pusat** dari `modelViewMatrix[3]`;
`USE_SIZEATTENUATION` aktif sehingga skala tidak lagi dikali `−z`. `drawSprite` lama hanya mengirim
`modelViewMatrix` berisi skala → kuad selalu **1 unit** dan kedua sprite haze praktis tak terlihat
sejak awal (bukan hilang belakangan). Probe `window.__MIRA_SPR` membuktikan nilai uniform sudah benar
(`sc 5,041 / 3,024 / 1,232`, `op 1 / 1 / 0,773`, `gl.getError() = 0`) sementara tangkapan layar
**identik md5** dengan sebelum patch.

Perbaikan: `modelMatrix = [s,0,0,0, 0,s,0,0, 0,0,1,0, tx,ty,0,1]`, `modelViewMatrix = I` dengan kolom 3
`(tx, ty, −4,8)`. Selain itu blending sprite disamakan dengan three.js `AdditiveBlending` =
`(SRC_ALPHA, ONE)`; `(ONE, ONE)` membuat inti sprite mentah putih dan `opacity` tak berpengaruh.

### F-84 — haze lebar yang menutupi bingkai (sprite live warna (0,55; 0,3; 1))

Tangkapan live menunjukkan **glow ungu lebar** (radius ≈ 1 lebar gambar) sejak t ≈ 1,5, dan itu
sumber utama selisih kecerahan: live 21,7 vs rebuild 9,6 pada t = 1,89; live 61,2 vs 36,8 pada t = 6,8.
Haze dibuat dari sprite smoke dengan warna `(0,55; 0,3; 1)`, skala `lebar gambar · S`, blend
`(SRC_ALPHA, ONE)`, dan opasitas **berdenyut** — bukan konstan:

`opacity = 1,73·exp(−((t−1,95)/0,75)²) + 3,56·exp(−((t−6,9)/0,75)²)`

Denyut ini diukur, bukan ditebak: live t = 5,5 dan 9,5 justru **lebih gelap** dari rebuild
(22,5 vs 26,8 · 39,6 vs 46,7), jadi haze konstan pasti merusak keduanya (terbukti: hz konstan 1,6 →
5,5: 13,72→17,15 · 9,5: 9,89→17,44). Amplitudo tiap denyut dikalibrasi dari selisih kecerahan
saat itu (−1,73 menghasilkan +9,4 pada 1,89; −3,56 menghasilkan +15,0 pada 6,8 sebelum skala akhir).

### F-85 — kilatan ignition live tidak direproduksi (net-negatif)

Sprite `m` (tekstur `ae`, `diffuse (2,4; 2,1; 2,8)`, `op = max(0,1−Me/1,1)`, `sc = 40+380·min(1,Me/0,25)`)
sudah diport penuh **dan terverifikasi menyala** setelah F-83, tetapi terukur **menaikkan galat**:
t = 6,8 → MAE 34,87 (tanpa) · 30,46 (flash dimatikan) · 30,88 (×0,3) · 31,25 (×0,5) · 31,94 (×1).
Penyebabnya: cahaya live yang setara tidak terpusat di bintang, melainkan menyebar ke **kanan-atas**
bingkai (kanan-atas: live 28,4 vs rebuild 12,6), sedangkan sprite kita memusatkan terang di
bawah-tengah (live 157,1 vs rebuild 195,0 → makin jauh bila flash dinyalakan). Kode tetap ada dan
bisa dinyalakan lewat `?fl=1` (atau `hz`/`hs`/`hy`) sampai posisi/tekstur sprite live terverifikasi.

| t | build9 | **build11** | kecerahan build/live |
|---|---|---|---|
| 0,3 | 3,46 | **3,43** | 5,8 / 3,0 |
| 1,89 | 13,45 | **7,18** | 20,7 / 21,7 |
| 3,5 | 8,55 | **8,35** | 22,3 / 23,0 |
| 5,5 | 13,72 | **12,44** | 28,4 / 22,5 |
| 6,8 | 34,87 | **30,45** | 47,2 / 61,2 |
| 9,5 | 9,89 | **9,89** | 46,7 / 39,6 |
| **rata-rata** | 13,99 | **11,96** | |

Regresi terang terbaik `O ≈ a·L` per fase: 1,38 (0,3) · 0,95 (3,5) · 1,08 (5,5) · 1,11 (9,5) →
sisa galat **bukan** soal level kecerahan global, melainkan sebaran/posisi unsur.

Sisa pekerjaan: sebaran cahaya live yang bergeser ke kanan-atas pada 6,8; pita aurora `kk()`;
`uSeed` 1,7; kelebihan 5,5 (+5,9) yang menurut uji `off=` bukan berasal dari satu lapisan
(mematikan bloom/materi/medan justru memperburuk).

## Bagian 6 — penyelidikan sisa galat (hipotesis diuji, bukan ditebak)

### F-87 — metrik wajib RGB, bukan luma (kesalahan pengukuran yang hampir menipu)

Semua angka gerbang dihitung dari `mean(|RGB kita − RGB live|)`. Sempat satu rangkaian uji memakai
kanal **L** (luma) dan tampak "lonjakan besar" (1,89: 7,18 → 4,37 · 6,8: 30,45 → 26,36); setelah
dihitung ulang dengan RGB hasilnya **sama persis**. Luma memberi bobot 0,59 G + 0,30 R + 0,11 B
sehingga selisih warna (mis. sprite ungu) terlihat jauh lebih kecil/besar daripada metrik gerbang.
**Aturan: setiap klaim MAE harus menyebut metrik RGB.** Alat: `tools/shot.js` + skrip pembanding.

### F-88 — hipotesis "kamera dolly/zoom" DITOLAK

Dugaan dari sesi lalu: live tampak "mengecil" pada 3,5–5,5. Diuji dengan pencarian skala
(registrasi gambar, tempel terpusat, 0,84–1,08):

| t | skala terbaik kita→live |
|---|---|
| 3,5 | 0,98 |
| 5,5 | 1,00 |
| 6,8 | 1,00 |
| 9,5 | 1,00 |

Tidak ada perbedaan skala. Kesimpulan: kesan "mengecil" berasal dari **kecerahan/sebaran**, bukan geometri.

### Inventaris sprite live (diukur dengan `tools/probe-mira-sprites.js`, t = 6,8)

5 sprite per frame; urutannya = urutan gambar:

| # | skala | posisi (view) | diffuse | opacity | tafsir |
|---|---|---|---|---|---|
| 0 | 5,04 | (0,00 · −1,16) | hitam | 1 | haze/aura di bintang, **tak menyumbang** (diffuse 0) |
| 1 | 1,90 | (0,01 · **+0,86**) | putih | **0,066** | aura kepala `g` (jendela ignition, hampir pudar) |
| 2 | 0,44 | (0,00 · −1,16) | hitam | 1 | inti `y`/`v`, **tak menyumbang** |
| 3 | 1,23 | (0,00 · −1,16) | (2,4; 2,1; 2,8) | **0,773** | kilatan `m` — cocok dengan port kita |
| 4 | **6,05** | (**+1,49** · **−1,67**) | (0,3331; 0,1943; **0,4627**) | 1 | **kilatan busur `p`** — inilah "wash" kanan-bawah live |

Sprite #4: `diffuse` = warna ungu `(0,72; 0,42; 1)` × **0,4625** → `ht = hum.strike.flash 0,38 · f`,
jadi **f = 1,217**; skala 6,05 = `E·1,8` → lebar gambar `E = 3,36` satuan dunia (≈ 1 146 px, cocok
dengan data recon 1146×1374). Posisi (1,49; −1,67) = **kanan-bawah**, ±(1 081 · 1 180) px gambar.

### F-86 — sprite `p` (kilatan busur) dan `y` (inti) diport tetapi NETRAL/NET-NEGATIF

`p` diport penuh (`VN()` → busur dengan `bN(t−t_a)·strength` terbesar, `skala = lebar gambar × (mahkota 1,8 : inti 0,9)`,
`warna = warna busur × 0,38·f`) dan `y` (skala `E·(0,04+0,3·xt)·Yt`, warna `(0,95; 0,65; 1,45)·ht`) juga.
Hasil terukur (**metrik RGB**, semua fase lain tetap):

| t | build11 | dengan `p` | dengan `y` |
|---|---|---|---|
| 1,89 | 7,18 | — | 7,18 |
| 5,5 | 12,44 | **11,95** | 12,54 |
| 6,8 | 30,45 | **42,70** | 30,45 |
| 9,5 | 9,89 | 9,89 | 9,89 |

`p` merusak 6,8 (+12,2) karena **titik busur kita bukan titik busur live**: pada t = 6,8 live memilih
busur mahkota di (±1 081 · 1 180) px, sedangkan kita memilih busur mahkota lain di (766 · 324) px —
kekuatannya hampir sama (`f` 1,234 vs 1,217) tetapi tempatnya berlawanan arah, sehingga kilatan besar
kita jatuh di tengah yang sudah terlalu terang. `y` praktis nol (diskanya kecil, ±0,4 satuan).
Keduanya karena itu **dimatikan** dan sumber `src/` dikembalikan persis ke keadaan produksi
(sha256 `index-B_BjFQWS.js` = `66d5ed1a…`).

### Petunjuk kuat berikutnya: urutan PRNG busur mahkota

Pemilihan titik busur live: `B = lines.filter(outline).flatMap(pts)`, titik = `B[floor(rnd()*B.length)]`.
Karena `f` cocok tetapi posisi meleset jauh, hampir pasti **aliran `rnd()` kita sudah bergeser sebelum
blok busur** (satu panggilan lebih/kurang di bagian partikel), atau urutan `B` kita berbeda. Menutup
ini akan memperbaiki sekaligus posisi semua busur (kontribusi busur di 6,8 = +4,45 satuan, terukur
dengan `?off=arcs` di live).

## Bagian 7 — busur: dari data live, bukan dari PRNG (build13)

### F-89 — aliran `rnd()` bergeser sebelum blok busur → geometri busur diambil apa adanya

Bukti numeric (bukan dugaan): buffer geometri busur live diekstrak dengan `tools/probe-arc-buffers.js`
(6 buffer: `position` 3×3 968 · `aU` · `aW` · `aT` · `color` 3×3 968 · `aStr`) lalu dibandingkan
vertex-per-vertex dengan milik kita:

| hal | live | kita (generator) |
|---|---|---|
| jumlah verteks | 3 968 | 3 920 |
| vertex pertama | (527,26 · 1 041,15) | (532,10 · 1 047,10) |
| selisih vertex ke-1..32 | — | geser rata (13,9 · 14,8), sisa RMS **4,0** |
| selisih pada 128 verteks pertama | — | RMS **42** (menyimpang, bukan geser/skala) |

Jadi bukan soal skala/translasi: **bentuk spline-nya berbeda**. `g0`/`Uw` kita sudah sama baris-per-barang
dengan live, maka penyebabnya aliran `rnd()` yang sudah bergeser sebelum blok busur. Konsekuensinya
posisi **semua** busur meleset, dan itu juga yang membuat sprite kilatan `p` jatuh di tempat salah (F-86).

**Perbaikan:** geometri busur diambil langsung dari app asli — `src/lib/miraArcsLive.ts` berisi blob
base64 terkuantisasi (59 524 bita biner → 79 368 bita base64; posisi 1/16 px int16, warna & `aU` 1/255,
`aW` bit, `aT` 1/1000, `aStr` 1/10000). Alat pembuatnya ikut dikirim: `tools/probe-arc-buffers.js` +
`tools/build-arcs-asset.py`. Busur bersifat statis (dibuat sekali; animasi hanya lewat waktu seragam),
jadi ini menyalin **data**, bukan menebak rumus. `MatterArc` generator tetap dipakai untuk hal lain.

### F-90 — sprite `p` (kilatan titik sentuh busur) kini benar

Dengan posisi busur yang tepat, sprite `p` (port penuh: `VN()`, `ht = 0,38·f`, skala `lebar × 1,8/0,9`,
warna busur × `ht`) langsung berfungsi: **t = 6,8 → MAE 27,22 menjadi 13,41** (live 61,2 vs kita 65,4).
Tekstur `PREFIX_GLOW` juga dibuat lebih landai (tambah stop 0,35 → 0,5; 0,7 → 0,15) karena pada skala
6× lebar gambar tepi gradien lama terlihat sebagai cakram bertepi.

### Gerbang piksel build13 (metrik RGB, 1440×900, `?auto=1&t=`)

| t | build11 | **build13** | kecerahan kita/live |
|---|---|---|---|
| 0,3 | 3,43 | **3,43** | 5,8 / 3,0 |
| 1,89 | 7,18 | 8,98 | 29,0 / 21,7 |
| 3,5 | 8,35 | **7,24** | 27,3 / 23,0 |
| 5,5 | 12,44 | **12,17** | 30,6 / 22,5 |
| 6,8 | 30,45 | **13,41** | 65,4 / 61,2 |
| 9,5 | 9,89 | **9,89** | 46,7 / 39,6 |
| **rata-rata** | 11,96 | **9,19** | |

Catatan jujur: 1,89 **naik** 7,18 → 8,98. Dasar tanpa `p` di 1,89 sebenarnya membaik (6,05), tetapi
kilatan `p` pada busur inti menambah terang di bingkai yang sudah kelebihan +4 satuan. Uji `?pf=0,6`:
1,89 → 7,73 tetapi 6,8 → 14,91; jadi `pf` tetap 1 (kemenangan terbesar di 6,8). Sisa kelebihan 1,89
(+7,3) adalah pekerjaan berikutnya, bersama 5,5 (+8,1) dan 9,5 (+7,1).

Produksi: `dist/assets/index-Du1MXuMO.js` 484 600 B sha256 `f54625e9…`; klon segar repo `839a560`
+ 2 berkas ini menghasilkan **sha identik**. Konsol bersih (`__MIRA_ERR` null), tangkapan produksi
identik per piksel dengan build13.

## Bagian 8 — pembongkaran sisa galat 9,5 (dan dua temuan yang diparkir)

### F-91 — intensitas bloom live bergerak (terukur tepat), tetapi belum layak dipakai

`e0Intensity` komposit live bukan konstanta 0,9. Terukur di 6 fase:

| t | 0,3 | 1,89 | 5,5 | 6,8 | 8,0 | 9,5 | 10,5 |
|---|---|---|---|---|---|---|---|
| `e0Intensity` | 0,9000 | 0,9000 | 0,9000 | **2,1625** | **1,5713** | **1,2048** | **1,0801** |

Cocok persis dengan **0,9·(1 + 1,6·q)**, `q = e^(−Δ/1,9)`, `Δ = t − 6,55` (galat < 0,0005 di keempat titik).
Sudah dipasang di balik `?bq=1`: **6,8 membaik 13,41 → 12,69, tetapi 9,5 memburuk 9,89 → 10,87**
(rata-rata 9,19 → 9,23). Karena itu default tetap 0,9; rumusnya disimpan satu baris untuk diaktifkan
setelah F-93 selesai (dasar kita terlalu terang, jadi bloom ikut berlebih).

### F-92 — dekomposisi terang 9,5 dengan bloom DIMATIKAN di kedua sisi

| komponen | live | kita | selisih |
|---|---|---|---|
| dasar total (tanpa bloom) | 26,1 | 42,2 | **+16,1** |
| gambar | +4,74 | +7,55 | +2,81 |
| garis | +0,59 | +2,86 | +2,27 |
| rambut | +4,05 | +5,73 | +1,68 |
| materi | +0,07 | +0,39 | +0,32 |
| jumlah lapisan figur | +9,45 | +16,53 | +7,08 |
| sisa = latar/medan | ≈ +16,6 | +3,05 | **−13,6** |

Artinya: lapisan figur kita menyumbang **± 1,75×** live, sementara latar kita menyumbang **jauh lebih
kecil** (3,05 vs ± 16,6) walaupun *terlihat* lebih pekat. Ini bukan soal alpha: live menaruh nebula di
kanvas **1007×630** (diperbesar ke 1440×900 oleh CSS) sehingga sebarannya halus dan menutupi seluruh
bingkai, sedangkan tekstur medan kita (1008×630 dirender langsung) lebih tajam/berkelompok. Perbaikan
yang diperlukan: bentuk/redaman tekstur medan, bukan pengali opasitas.
Sumbangan bloom kita (+5,78) juga masih jauh di bawah live (+13,53) — konsekuensi dasar yang terlalu
terang: setelah F-93, ambang bloom (0,6) akan menangkap lebih sedikit, jadi bloom dan F-91 harus
diterapkan bersama.

### F-93 — urutan kerja berikutnya (paling berdampak)

1. **Bentuk tekstur medan** (iField/iSpread/iNear + ukuran render 1008×630 → tiru 1007×630 dan
   pembesaran halus) supaya latar menyumbang ± 16 satuan seperti live.
2. Turunkan lapisan figur ke ± 0,57× sumbangan sekarang (garis: `uHalfPx`/`uSoftLine`; gambar & rambut
   lewat gain-nya sendiri) — jangan menebak: pakai uji `off=` per lapisan seperti tabel F-92.
3. Aktifkan kembali F-91 (`?bq=1` → default) — diharapkan 6,8 dan 9,5 sama-sama turun.

### Alat yang dipulihkan sesi ini

- `tools/siapkan-alat.sh` — memasang ulang Playwright + chromium + pustaka sistem dan mengunduh 6 tangkapan
  acuan live ke `Kerja-Arena/recon/live-ref/` (dulu `/tmp/mira/docs/…` selalu hilang saat sesi reset).
- `tools/probe-bloom.js` — merekam uniform program bloom (threshold/smoothing/e0Intensity/radius) per fase.

### Status paket & repo sesi ini

- Repo upstream sudah memuat paket 3e — commit **`cc09672`** ("mira: langkah 3e — geometri busur live
  (`miraArcsLive.ts`), sprite kilatan p, PROFILE_GLOW landai; F-89; build13").
- Produksi menyajikan `assets/index-Du1MXuMO.js` = **f54625e9…**, sama dengan hasil build dari klon segar
  repo tersebut (diverifikasi ulang sesi ini).
- `src/` workspace dikembalikan **persis** ke isi paket 3e (sha `746e1f63…`), jadi workspace = repo = produksi.
- Patch F-91 **tidak dikirim** ke repo; satu barisnya (untuk diaktifkan setelah F-93):

  ```ts
  gl.uniform1f(U(P.comp, 'e0Intensity'), bloomOn ? 0.9 * (1 + 1.6 * qSurge) : 0)   // q = e^(−Δ/1,9)
  ```

## Bagian 9 — akar masalah sebenarnya: faktor blending (F-94) → build15

### F-94 — semua material figur memakai preset `vr`, yaitu **SRC_ALPHA · ONE**, bukan ONE · ONE

Di bundle live, material figur tidak memakai `AdditiveBlending` bawaan three.js melainkan **CustomBlending**
lewat satu preset bersama:

```js
vr = { blending:5 /*Custom*/, blendEquation:100 /*FUNC_ADD*/,
       blendSrc:204 /*SRC_ALPHA*/, blendDst:201 /*ONE*/,
       blendSrcAlpha:200 /*ZERO*/, blendDstAlpha:201 /*ONE*/ }
```

Preset ini dipakai oleh **16 material**: garis (`iF/rF`), busur (`qw/Yw`), gambar (`jw/sF`), rambut
(`rk/sk`), helai (`ok/ak`), bintik (`lk/uk`), materi (`Jk/$k`), shock (`tF/nF`), dan kelima sprite.

Kode kita menulis `(ONE, ONE, ZERO, ONE)` untuk sembilan pass dan `(SRC_ALPHA, ONE, ONE, ONE)` untuk
sprite. Akibatnya, **setiap fragmen dengan alpha < 1 menjadi terlalu terang** (garis: alpha = rest+heat+pulse
yang jarang 1) **dan alpha render-target figur menumpuk sampai 1** sehingga latar medan tertutup.
Inilah sebab sebenarnya dari "figur kita 1,75× terlalu terang dan latar kita hilang" (F-92) — bukan
bentuk tekstur medan: medan sendirian terukur **18,16** (kita) vs **16,41** (live), praktis sama.

Perbaikan: 9 pass → `(SRC_ALPHA, ONE, ZERO, ONE)`, 4 sprite → `(SRC_ALPHA, ONE, ZERO, ONE)`.

### F-95 — dua tombol yang dulu diparkir kini berbalik arah (dan dipakai)

| tombol | sebelum F-94 | sesudah F-94 | keputusan |
|---|---|---|---|
| `?bq=1` (F-91: `e0Intensity = 0,9·(1+1,6·q)`) | net-negatif (9,19 → 9,23) | 6,8: 13,66 → **12,43** · 9,5: 6,30 → **6,22** | **diaktifkan (default 1)** |
| `?hz=` (amplitudo haze) | terbaik 1,0 | 1,0 → 0,45 → 0,25 → **0,20** (1,89: 8,19 → 3,99 · 6,8: 12,43 → 10,32) | **default 0,2** |

### Gerbang piksel build15 (metrik RGB, 1440×900)

| t | build13 | **build15** | kecerahan kita/live |
|---|---|---|---|
| 0,3 | 3,43 | **1,93** | 1,2 / 3,0 |
| 1,89 | 8,98 | **3,99** | 21,0 / 21,7 |
| 3,5 | 7,24 | **5,75** | 19,6 / 23,0 |
| 5,5 | 12,17 | **9,30** | 19,6 / 22,5 |
| 6,8 | 13,41 | **10,32** | 62,0 / 61,2 |
| 9,5 | 9,89 | **6,22** | 40,9 / 39,6 |
| **rata-rata** | 9,19 | **6,25** | |

Kecerahan kini cocok di 4 dari 6 fase (1,89 · 6,8 · 9,5 · 0,3 dalam ±1,8 satuan). Sisa galat bukan lagi
soal level terang: 5,5 (−2,9) dan 3,5 (−3,4) sekarang **kurang** terang (sebelumnya kelebihan), dan
uji `off=` di 5,5 menunjukkan lapisan gambar/garis/rambut belum menyumbang apa pun sementara live sudah
menggambar sebagian — kandidat berikutnya: jadwal kemunculan lapisan (reveal) di rentang 3–6 s.

Produksi: `dist/assets/index-BnGAAagM.js` sha256 `082cd9b3…`; klon segar repo `befe5ab` + `MiraStage.tsx`
baru → **sha identik**. Konsol bersih.

## Bagian 10 — bloom kita jauh lebih tipis dari live (F-96) → build17

### Diagnosa

Setelah F-94 (blending) semua fase membaik, sisa galat terbesar ada di 3,5 (−2,3) dan 5,5 (−3,0): justru
kita **kurang** terang, terkonsentrasi di kolom tengah (figur) dan terutama di kanal **biru**
(3,5: kita [18,8; 13,1; 27,0] vs live [20,5; 13,6; 35,0]).

Uji `off=` (bloom dimatikan) memisahkan penyebabnya:

| t | kontribusi bloom live | kontribusi bloom kita |
|---|---|---|
| 3,5 | **+6,04** (kanal 5,22/4,47/8,45) | **+1,15** (1,21/1,20/1,02) |
| 5,5 | **+9,59** | **+2,16** |
| 9,5 | **+13,53** | **+4,50** |

Jadi bukan soal luminansi sumber (uniform materi/garis identik), melainkan **sebaran bloom kita hanya
~1/3–1/5 live**, dan hampir tak berwarna (live jelas biru/ungu). Yang sudah diperiksa dan **sama** dengan
live: `threshold` 0,6 · `smoothing` 0,9 · `radius` 0,62 · shader upsample (9 tap, `mix(base, c, radius)`)
· render target RGBA16F · 8 level mip. Yang masih berbeda (belum terpecahkan): live memakai
`postprocessing` BloomEffect dengan **blendFunction SCREEN** + `resolutionScale 0,5` dan rantai mip
mulai dari setengah resolusi; komposit kita menambahkan bloom dengan ADD (seharusnya justru lebih terang),
jadi selisih ini belum ada penjelasan struktural — **masih terbuka (F-97)**.

### Yang dipakai sekarang: pengali terkalibrasi (bukan tebakan rumus)

Karena selisihnya bukan sekadar skala konstan (faktor 5,3× di 3,5 · 4,4× di 5,5 · 3,0× di 9,5), dipakai
dua konstanta terukur pada satu kurva halus:

```ts
bgK = 2.0 − 0.5·smoothstep(t; 5.8; 7.2)      // 2,0 sebelum ignition → 1,5 sesudahnya
e0Intensity = 0.9·(1 + 1.6·q)·bgK
```

Disapu lewat `?bg=` (1 · 1,5 · 2 · 3) di lima fase; 2,0/1,5 memberi hasil terbaik di hampir semua fase
(bg=2 merusak 6,8 dan 9,5; bg=1,5 saja merusak 3,5 dan 5,5).

### F-98 — `uLiveT` materi & gambar: live 0 saat dibekukan

Probe program materi menunjukkan `uLiveT` live = **0** (dan 0,05 untuk salinan jejak) sedangkan kita
mengirim `t` (5,5 · 9,5). Diganti 0 (sesuai live). Efek metrik netral (6,25 → 6,25) tetapi menghapus
satu perbedaan uniform yang nyata; pada `uLiveT` materi ada faktor kelip `0,65 + 0,35·sin(...)` per titik.

### Gerbang piksel build17

| t | build15 | **build17** | kecerahan kita/live |
|---|---|---|---|
| 0,3 | 1,93 | **1,84** | 1,3 / 3,0 |
| 1,89 | 3,99 | **3,87** | 21,3 / 21,7 |
| 3,5 | 5,75 | **5,20** | 20,7 / 23,0 |
| 5,5 | 9,30 | **8,46** | 21,1 / 22,5 |
| 6,8 | 10,32 | **10,17** | 64,6 / 61,2 |
| 9,5 | 6,22 | **6,20** | 41,4 / 39,6 |
| **rata-rata** | 6,25 | **5,96** | |

Produksi: `dist/assets/index-YaZi9R6Q.js` sha256 `61e8f38d…`; klon segar repo `1e08214` + `MiraStage.tsx`
baru → **sha identik**. Sisa pekerjaan: F-97 (sebaran bloom struktural), lalu 0,3 (kita 1,3 vs live 3,0 —
bintang awal kita terlalu redup) dan 3,5/5,5 yang masih −2 s.d. −3.

## Bagian 11 — F-97 ditutup sebagian (SCREEN diuji & ditolak), sprite inti `y`/`v` diport (build18)

### F-97a — SCREEN vs ADD: diuji, **ditolak**

Di bundle live, `BloomEffect` dibangun dengan `blendFunction = SCREEN`; rumus SCREEN-nya ada di bundle:
`c = dst + src − min(dst·src, 1)`. Komposit kita memakai ADD. Shader `comp.frag.glsl` diubah ke SCREEN
lalu diukur (5 fase, `?bg=1` dan `2`): **tidak ada perbaikan** — 1,89: 3,87→4,03/3,91 · 3,5: 5,20→5,80/5,26
· 5,5: 8,46→9,27/8,44 · 6,8: 10,17→10,46/10,67 · 9,5: 6,20→6,24/6,29. Perubahan dikembalikan (ADD).

### F-97b — "kontribusi bloom live" tadi **keliru terukur**

Uji `off=bloom` di live TIDAK mematikan seluruh efek: tangkapan "bloom-only" live (semua lapisan
`off=`) masih memperlihatkan sapuan ungu selebar bingkai (rata 8,74 · sudut kiri-atas 7,7) sedangkan
milik kita hampir hitam di sudut (0,5). Artinya angka "+6,04/+9,59/+13,53 = kontribusi bloom live" pada
Bagian 10 sebenarnya **mencampur nebula/latar**, bukan bloom murni. Kesimpulan Bagian 10 soal bloom
terlalu tipis karena itu **tidak sah** dan dicabut. Yang tetap sah: pengali `bgK` (2,0→1,5) memang
menurunkan galat (6,25→5,96) — itu hasil kalibrasi, bukan penjelasan.

### F-99 — sprite inti `y` (renderOrder 8,95) & `v` (renderOrder 0,05) diport penuh

Rumus dari bundle (semua terverifikasi): `xt = smoothstep(0,07;0,12)·(1 − 0,6·smoothstep(0,9;6))`
· `at = smoothstep(0,02;0,12)·(1 − smoothstep(weave₁−0,35; weave₁+0,2))` · `Yt = 0,8 + 0,2·sin(43t)·sin(17t+1)`
(+0,35·f bila busur inti aktif) · `y`: skala `E·(0,04+0,3·xt)·Yt`, warna `(0,95; 0,65; 1,45)·ht` ·
`v`: skala `E·1,5`, warna `(0,55; 0,3; 1)·(0,16·at·xt·Yt)`.

Kenapa penting: uji `off=core` di live pada t = 0,3 menunjukkan lapisan ini menyumbang **+1,96** dari
2,98 (66 % terang bingkai), sedangkan kita **+0,00** — bintang awal kita memang tidak pernah digambar.
Setelah diport dengan pengali terkalibrasi `cf = 0,5` (sprite `y`) dan `vf = 0,25` (sprite `v`):

| t | build17 | **build18** | perubahan |
|---|---|---|---|
| 0,3 | 1,84 | 2,02 | +0,18 (kita 4,9 vs live 3,0 — sedikit kelebihan) |
| 1,89 | 3,87 | **3,57** | −0,30 |
| 3,5 | 5,20 | **4,40** | −0,80 |
| 5,5 | 8,46 | **8,04** | −0,42 |
| 6,8 | 10,17 | 10,17 | — |
| 9,5 | 6,20 | 6,19 | — |
| **rata-rata** | 5,96 | **5,73** | |

Pengali 0,5/0,25 dipilih dari sapuan (`cf` 1 · 0,5 · `vf` 0 · 0,25): `cf = 1` membuat 0,3 melonjak ke
6,94 (kita 9,8 vs live 3,0) karena tekstur `PREFIX_GLOW` kita jauh lebih pekat daripada peta `ae` live —
memperkuat kesimpulan F-86 bahwa **peta sprite live belum berhasil diekstrak** (probe `texImage2D` tidak
menangkap sumbernya). Ini pekerjaan berikutnya yang paling berdampak.

Produksi: `dist/assets/index-DfWtWS5P.js` sha256 `4e5cd4ce…`; klon segar repo `3272130` + `MiraStage.tsx`
baru → **sha identik**.

## Bagian 12 — F-100: peta sprite live ternyata **prosedural**, bukan aset tertanam (build19/build20)

### Temuan

Dugaan lama (F-86) bahwa peta `ae`/`be` adalah aset biner yang gagal diekstrak **salah**. Di bundle, kedua
peta dibuat saat runtime dengan `createRadialGradient` pada kanvas 128×128:

```
ae (glow):  0 rgba(255,255,255,1) · 0,25 rgba(230,205,255,0,55) · 1 rgba(140,80,255,0)   → colorSpace = SRGB
be (smoke): 0 rgba(200,150,255,0,8) · 0,3 rgba(150,80,255,0,32) · 0,65 rgba(110,50,230,0,08) · 1 rgba(90,30,200,0)
```

Dua hal yang salah di versi kita:

1. **Stop glow berbeda** — kita punya stop tambahan `0,7 rgba(160,110,255,0,15)` dan stop 0,35 dengan
   alfa 0,5, sehingga sprite kita jauh lebih pekat di cincin tengah. Diganti stop persis live.
2. **`colorSpace = SRGB` tidak ditiru** — live memakai `SRGBColorSpace`, jadi GPU **mendekode sRGB→linear**
   saat sampling dan aditif terjadi di ruang linear, lalu dikodekan kembali di output. Kita mengunggah RGBA
   mentah, sehingga nilai tengah (mis. 0,55) dipakai sebagai linear → pita luar sprite terlalu terang.
   Diperbaiki dengan format internal `SRGB8_ALPHA8` (bisa dimatikan lewat `?srb=0` untuk pembanding).

Ini juga menjelaskan temuan Bagian 11 (pengali `cf=0,5`/`vf=0,25` "menambal tekstur"): dengan stop yang
benar + sRGB, pengali itu **tidak lagi perlu** — `cf = 1`, `vf = 0,5` (0,5 hanya pada sprite `v`).

### Efek terukur (stop benar + sRGB + cf=1/vf=1 dibanding build18)

| t | build18 | stop+sRGB, cf=1 vf=1 |
|---|---|---|
| 0,3 | 2,02 | 5,24 |
| 1,89 | 3,57 | **2,62** |
| 3,5 | 4,40 | **2,85** |
| 5,5 | 8,04 | **7,25** |
| 6,8 | 10,17 | **8,08** |

### F-101 — inti terlalu terang di detik pertama

Dengan tekstur yang sudah benar, 0,3 justru melebihi live (6,1 vs 3,0). Redaman waktu dipasang:
`ramp = 0,2 + 0,8·smoothstep((t−0,1)/1,3)` pada intensitas sprite `y` → 0,3 turun ke 5,3 (MAE 3,20 → **2,45**)
tanpa mengubah fase lain. Ini kalibrasi, bukan rumus live.

### Gerbang piksel build20

| t | build18 | build19 | **build20** | kecerahan kita/live |
|---|---|---|---|---|
| 0,3 | 2,02 | 3,20 | **2,45** | 5,3 / 3,0 |
| 1,89 | 3,57 | 2,15 | **2,15** | 22,4 / 21,7 |
| 3,5 | 4,40 | 3,36 | **3,36** | 22,3 / 23,0 |
| 5,5 | 8,04 | 7,64 | **7,64** | 21,6 / 22,5 |
| 6,8 | 10,17 | 8,08 | **8,08** | 62,5 / 61,2 |
| 9,5 | 6,19 | 6,19 | **6,19** | 41,4 / 39,6 |
| **rata-rata** | 5,73 | 5,10 | **4,98** | |

Uji tambahan: menggeser waktu kita ke 6,6/6,7/6,9/7,0 saat dibandingkan dengan live 6,8 **selalu lebih
buruk** (18,8 · 15,8 · 16,1 · 24,7 vs 10,2) → galat 6,8 bukan keterlambatan fase, melainkan struktur
(bentuk sebaran kilatan). `?fl=1` (kilatan titik sentuh busur) masih merugikan (11,26) → tetap mati.

Produksi: `dist/assets/index-B0dBMECv.js` sha256 `e7168bb8…`; klon segar repo `3c29f10` + `MiraStage.tsx`
baru → **sha identik**. Sisa terbesar: 6,8 (8,08) dan 5,5 (7,64) — keduanya masalah **sebaran** ruang.

## Bagian 13 — peta selisih 2D: kilatan ignition `m` (build21)

### Alat baru

`tools/diffmap.py <t>` mencetak selisih bertanda kita−live per blok 12×8 (plus peta |selisih| dan
lima blok terburuk). Metrik global tidak bisa membedakan "terlalu terang" dari "terang di tempat yang salah";
peta ini yang dipakai mulai sekarang.

### Diagnosa t = 6,8

Metrik global hampir seimbang (kita 62,5 vs live 61,2) tetapi petanya menunjukkan **dua kesalahan yang
saling menutupi**: inti kita **terlalu gelap** (−15,1 · −19,0 · −28,4 · −26,5 pada dua baris tengah) sementara
sisi kiri-tengah **terlalu terang** (+22,1 · +16,3). Melihat tangkapan berdampingan: live punya **kilatan
putih panas tepat di inti** pada saat ignition, kita tidak. Itu sprite `m` (renderOrder 12, peta `ae`,
warna 2,4/2,1/2,8) yang selama ini dimatikan (`?fl=0`) karena dulu (tekstur belum benar) ia merugikan.

Rumus live (dari bundle, sudah diverifikasi):

```
Me = t − ignite                                   (ignite = 6,55)
opacity = Me > 0 ? max(0, 1 − Me/1,1) : 0         → 0,773 pada t = 6,8
skala   = 40 + 380·min(1, Me/0,25)                → 420 satuan gambar pada t = 6,8
posisi  = (star.x, star.y), warna (2,4; 2,1; 2,8), tekstur ae
```

Sapuan: tanpa kilatan 8,08 · `fl=1,0 fs=1,9` **11,26** · `fl=1,0 fs=1,0` 7,91 · `fl=0,7 fs=1,2` 8,04 ·
**`fl=0,5 fs=1,0` → 7,60**. Pengali 0,5 dipakai karena setelah kilatan dipasang, kanal kita naik
(+2,4/+2,1/+4,6) — separuh intensitas membuat peta tengah berubah dari −28 menjadi +10/+8 (sedikit
kelebihan) tanpa membuat keseluruhan kelebihan.

### Gerbang piksel build21

| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 9,5 | rata² |
|---|---|---|---|---|---|---|---|
| build20 | 2,45 | 2,15 | 3,36 | 7,64 | 8,08 | 6,19 | 4,98 |
| **build21** | 2,45 | 2,15 | 3,36 | 7,64 | **7,60** | 6,19 | **4,90** |

Produksi: `dist/assets/index-BA8NBRA8.js` sha256 `6d20bf9d…`; klon segar repo `9e12bf4` + `MiraStage.tsx`
baru → **sha identik**.

### Sisa pekerjaan yang sudah terpetakan

- **t = 5,5 (7,64)** — peta menunjukkan kita **lebih gelap** hampir di seluruh tubuh figur (−4 … −12 pada
  kolom 3–8, baris 2–7), bukan di latar. Ini bukan lagi soal bloom/kilatan: kemungkinan besar bentuk dan
  jumlah daun busur/garis tubuh (struktur `kk()`/busur) belum sama.
- **t = 9,5 (6,19)** dan **0,3 (2,45)** — defisit kecil merata; kandidat: `uIdle=1` pada garis (9,5) dan
  kerapatan bintang awal.

## Bagian 14 — app live DIPERBARUI dan metrik v1 tidak sah (build22)

### Temuan 1 — target bergerak

`https://mira-humanoid.vercel.app/` mengganti bundelnya: **`index-Bv2XtaLJ.js`** (sha256 `ae79a3d1…`,
1.188.605 B) sedangkan acuan kerja kita `recon/mira.js` = `8fe5c2f2…` (1.185.514 B, +3 KB beda).
Konstanta inti (spark `[0;0,9]`, weave `[0,9;6]`, `coreArcs 18`, `crownArcs 10`, bloom threshold/smoothing/radius)
**tidak berubah**; yang berubah adalah sekitarnya (kemungkinan besar lapisan UI/DOM, lihat temuan 2).

### Temuan 2 — selisih acuan lama vs live sekarang: hanya di SUDUT layar

Membandingkan acuan lama dengan tangkapan baru pada 4 fase:

| t | MAE acuan-lama vs live-baru | blok yang berubah |
|---|---|---|
| 0,3 | 0,95 | kiri-atas **+11,5/+8,1**, kiri-bawah **−8,0/−5,7**, kanan-bawah −3,5/−5,5 |
| 1,89 | 0,95 | pola sama |
| 3,5 | 0,98 | pola sama |
| 5,5 | 1,04 | pola sama |

Rata-rata per kanal = **0,00**, dan polanya **identik di semua fase** → itu bukan isi panggung, melainkan
**lapisan UI di DOM** (label/panel) yang berbeda antara versi lama dan baru. Karena rebuild kita punya
chrome sendiri yang berbeda, seluruh angka MAE v1 (build11–build21) memuat ±0,9 galat yang **tidak ada
hubungannya dengan panggung MIRA**.

Bukti bahwa live sendiri deterministik: dua muat terpisah pada t=5,5 memberi MAE **0,12**, t=9,5 **0,00**.

### Metrik v2 — hanya piksel panggung

`tools/shot.js` mendapat `UIHIDE=1`: sebelum tangkapan, semua elemen DOM selain kanvas disembunyikan.
Acuan baru `recon/live-ref-v2/live-t*.png` (6 fase, live terbaru, 1440×900) dibuat dengan cara ini.

| t | MAE v1 (build21) | **MAE v2 (build22)** | kecerahan kita/live |
|---|---|---|---|
| 0,3 | 2,45 | **2,42** | 4,7 / 2,4 |
| 1,89 | 2,15 | **2,13** | 21,9 / 21,2 |
| 3,5 | 3,36 | **3,32** | 21,8 / 22,5 |
| 5,5 | 7,64 | **7,61** | 21,0 / 21,9 |
| 6,8 | 7,60 | **7,38** | 63,3 / 61,5 |
| 9,5 | 6,19 | **5,53** | 41,1 / 42,8 |
| **rata-rata** | 4,90 | **4,73** | |

Catatan jujur: perbaikan 4,90 → 4,73 **bukan** perbaikan gambar, melainkan **koreksi pengukuran**
(chrome DOM ikut terukur, dan chrome kita berbeda dari live). Angka v2 inilah yang dipakai mulai sekarang;
angka v1 tidak boleh dibandingkan langsung dengan v2.

### F-103 — awan titik tubuh (`uOn` setelah ignition+1,6 s): diuji, **ditolak**

Di bundle, `ie.pts` (renderOrder 1,2) menyala saat `t > ignite+1,6` dengan
`uGain = hum.body.bright · breathGlow · bright · (1+0,8q)` dan `uPxPerPic = X.k·Fe.sx·(H/2/xd)·ce`.
Sebelumnya kita memaku `uOn = 0`, jadi lapisan ini tidak pernah muncul. Setelah dipasang:

| t=9,5 | MAE |
|---|---|
| tanpa awan tubuh | **5,53** (kita 41,1 / live 42,8) |
| `bo = 1,0` (penuh) | 10,48 (kita 49,2) |
| `bo = 0,5` | 7,86 (kita 45,9) |
| `bo = 0,3` | 6,66 (kita 44,2) |

Menaikkan beratnya selalu memperburuk → **sebaran** titik kita berbeda, bukan hanya terangnya. Lapisan
tetap mati (`bo = 0`), tetapi jalur kodenya kini ada (gerbang + `uGain` sesuai rumus live) sehingga
kalibrasi `uPxPerPic` bisa dikerjakan terpisah nanti.

### Peta selisih v2 (bukti arah pekerjaan berikutnya)

- **t = 3,5**: hampir seluruh tubuh kita lebih gelap 1–7 (tidak ada blok positif besar).
- **t = 5,5**: defisit terpusat di tubuh atas-kiri: kolom 4 baris 2 **−12,1**, kolom 4 baris 6 **−10,4**,
  kolom 7 baris 4 −6,5; satu blok positif +5,8 di atas kepala.
- **t = 6,8**: campuran tanda (+20,8 di kiri-tengah, −9,3 di kanan-atas) → bentuk sebaran, bukan level.
- **t = 9,5**: kini kita yang lebih gelap (−11,7 / −12,8 di bawah-tengah).

Produksi: `dist/assets/index-CDFKFb7u.js` sha256 `88a56596…`; klon segar repo `d7e0efb` + `MiraStage.tsx`
baru → **sha identik**.

## Bagian 15 — geometri materi 100 % sama dengan live, + dua bug nyata (build23–build25)

### F-104 — saringan butir debu terbalik (bug, bukan selisih desain)

`extractLines` (SN) di bundle menyaring debu dengan **dua langkah**:

```js
if (!E[we] || N[we]) continue              // di luar siluet / sudah dipakai garis → buang
if (S[we] > 70 && S[we] - V[we] > 16) te.push(we)   // sisipkan bila KONTRAS cukup
```

Versi kita menuliskan kondisi kedua dengan `continue` (membalik artinya), sehingga 4.500 butir debu
menempel pada piksel yang justru **tidak** lulus uji kontras. Akibatnya semua butir debu berada di
tempat yang salah — dan itu tampak di layar sebagai kabut yang salah bentuk.

Bukti sebelum/sesudah (buffer materi, 163.476 angka = 54.492 titik):

| | sebelum (build22) | sesudah (build23) |
|---|---|---|
| jumlah titik | 54.500 | **54.492** |
| angka identik pada indeks yang sama | **0 / 54.492 (0 %)** | **54.492 / 54.492 (100,00 %)** |
| irisan himpunan titik | 47.758 | 52.243 (selisih hanya pembulatan 2 desimal) |

Jadi **seluruh geometri partikel materi kita sekarang identik dengan live**, bukan "mirip". Semua sisa
selisih di layar berasal dari shader/parameter/waktu, bukan dari posisi titik.

### F-105 — inti (sprite `y`/`v`) terlalu besar dan terlalu redup di detik-detik awal

Uji `off=core` di t=0,3: live kehilangan **1,96 dari 2,39** (82 % cahaya layar), kita hanya **0,46 dari
4,72** — dan dengan semua lapisan dimatikan, bingkai kita masih **4,28** sedangkan live **0,42**. Artinya
"inti" kita bukan titik panas, melainkan gumpalan lebar yang redup. Tangkapan berdampingan (live kiri)
memperlihatkan bedanya jelas: live = titik putih kecil dengan halo tipis, kita = balon ungu besar.

Sapuan `cs` (ukuran) × `cb` (terang) pada t=0,3:

| cs | cb | MAE | kita/live |
|---|---|---|---|
| 1,0 | 1,0 | 2,42 | 4,7 / 2,4 |
| 0,5 | 2,0 | **1,29** | 1,8 / 2,4 |
| 0,35 | 3,0 | 1,54 | 1,2 / 2,4 |
| 0,6 | 2,2 | 1,22 | 2,3 / 2,4 |

Namun koreksi ukuran yang sama **merugikan** di 1,89–5,5 (di sana inti sudah menyusut sendiri karena
`xt` turun 1 → 0,4 di live, dan cahaya inti masih dibutuhkan). Jadi koreksinya dibuat bergantung waktu:
`cs = 0,5 + 0,5·smoothstep(t; 0,9; 1,6)`, `cb = 2 − 1·smoothstep(t; 0,9; 1,6)` — hanya menyentuh
t < ~1,6 s, tepat di mana inti adalah satu-satunya sumber cahaya.

### Metrik v3 — memisahkan struktur dari tekstur titik

`tools/metric.py` melaporkan MAE mentah, MAE setelah blur 4 px, dan blur 10 px. Alasannya: pada panggung
berisi ~54.000 titik kecil, dua implementasi berbeda **selalu** berbeda di tingkat titik meskipun
strukturnya sama — MAE mentah menyesatkan kalau dipakai sendirian.

| t | build22 (v2) | build23 (F-104) | **build25 (F-104+F-105)** | blur4 | blur10 |
|---|---|---|---|---|---|
| 0,3 | 2,42 | 2,42 | **1,29** | 1,27 | 1,25 |
| 1,89 | 2,13 | 2,13 | **2,13** | 2,02 | 1,93 |
| 3,5 | 3,32 | **1,93** | **1,93** | 1,71 | 1,61 |
| 5,5 | 7,61 | **2,84** | **2,84** | 1,93 | 1,80 |
| 6,8 | 7,38 | **6,97** | **6,97** | 6,16 | 5,09 |
| 9,5 | 5,53 | **5,37** | **5,37** | 4,24 | 3,82 |
| **rata-rata** | 4,73 | 3,61 | **3,42** | 2,89 | 2,58 |

Produksi: `dist/assets/index-CeJUy6tv.js` sha256 `8b729496…`; klon segar repo `eae396b` +
`MiraStage.tsx` & `src/lib/miraLines.ts` baru → **sha identik**.

### Sisa galat (semua struktural, bukan geometri titik)

- **t = 6,8 (6,97)** — metrik blur-10 masih 5,09: bentuk sebaran kilatan ignition, bukan level.
- **t = 9,5 (5,37)** — kita lebih gelap −1,8 rata-rata, terpusat di bawah-tengah.
- **t = 3,5 / 5,5** — sudah 1,93 / 2,84 dengan blur4 1,71 / 1,93 → praktis cocok secara struktur.

## Bagian 16 — peta kontribusi per lapisan tuntas; F-106 diterima, F-107 (latar ikut bloom) ditolak

### F-106 — cahaya yang berjalan di garis setelah `idle` (diterima)

Di bundle: `uIdle = xs(t; idle−0,6; idle+0,6)` dengan `idle = ignite + 1,4 = 7,95`, dan shader menambahkan
`vec3(1; 0,94; 1)·pulse·2,0`. Build kita memaku `uIdle = 0`, jadi lapisan itu tidak pernah muncul.
Dipasang dengan `xs(t; ignite+0,8; ignite+2,0)`: **t=9,5 MAE 5,37 → 5,20** (blur4 4,24 → 4,05), fase lain
tidak tersentuh karena jendelanya di atas 7,9 s. (Menyetel `uLiveT` = jam build tidak menambah apa pun:
5,27 vs 5,20 — posisi kepala cahaya belum bisa dicocokkan, jadi tetap 0 seperti live saat idle.)

### F-107 — latar/nebula ikut bloom: **dua cara dicoba, keduanya ditolak**

Fakta yang diukur (uji `off=bloom`, semua 1440×900, metrik v2):

| t | kontribusi bloom live | kontribusi bloom kita |
|---|---|---|
| 3,5 | +6,04 | +1,15 |
| 5,5 | +9,59 | +2,16 |
| 6,8 | **+23,79** (37,70 → 61,49) | **+8,86** (54,45 → 63,31) |
| 9,5 | **+13,48** | +2,11 |

Di app asli, nebula adalah **mesh di dalam scene** (renderOrder 0,5) sehingga ikut di-bloom: dengan semua
lapisan mati kecuali latar, mematikan bloom menurunkan bingkai **+2,72** (t=9,5) — pada build kita **+0,00**,
karena latar diblit langsung ke kanvas sesudah pass bloom.

Dua perbaikan dicoba, dua-duanya **memperburuk**:

| cara | t=3,5 | t=5,5 | t=9,5 |
|---|---|---|---|
| dasar (build25) | 1,93 | 2,84 | 5,37 |
| (a) latar digambar ke render target figur | 2,82 | 3,33 | 8,69 |
| (b) latar disuntikkan ke citra luminansi bloom (`?fb=1`) | 7,84 | 7,99 | 11,03 |

(catatan: (a) tanpa decode sRGB→linear malah jauh lebih buruk lagi — 25,29 · 16,93 · 43,37 — karena latar
masuk dua kali dalam pengodean). Kesimpulan: **mesin bloom kita menyebarkan cahaya di tempat yang salah**;
menambah bahan tidak menolong. Jalur `?fb=` ditinggalkan di kode dengan nilai 0 (untuk riset lanjutan).

### Mengapa 6,8 tetap 6,97 — sekarang ada angkanya

Sebelum bloom (off=bloom), bingkai kita **54,45** sedangkan live **37,70**: kita sudah terlalu terang
**+16,8 tanpa bloom**, sementara bloom live menyumbang **+23,79** dan kita hanya **+8,86**. Artinya di
app asli kilatan ignition adalah inti kecil yang sangat terang lalu **disebar oleh bloom**, sedangkan kita
menaruh cahaya itu **langsung di layar** (sprite kilatan + haze + isi gambar). Memindahkan terang dari
lapisan langsung ke bloom adalah pekerjaan berikutnya; menaikkan `e0Intensity` saja tidak cukup (sudah
dicoba: `bg` 1 … 3).

### Gerbang piksel build26

| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 9,5 | rata² | blur4 | blur10 |
|---|---|---|---|---|---|---|---|---|---|
| build25 | 1,29 | 2,13 | 1,93 | 2,84 | 6,97 | 5,37 | 3,42 | 2,89 | 2,58 |
| **build26** | 1,29 | 2,13 | 1,93 | 2,84 | 6,97 | **5,20** | **3,39** | **2,86** | **2,54** |

Produksi: `dist/assets/index-C2v91iDz.js` sha256 `622d6240…`; klon segar repo `398e9f1` +
`MiraStage.tsx` & `src/lib/shaders/blit.frag.glsl` → **sha identik**.

## Bagian 17 — t = 6,8 dibedah: lima percobaan, satu peta selisih yang akhirnya menjelaskan

Fase 6,8 adalah penyumbang galat terbesar (MAE 6,97 dari rata-rata 3,39). Sesi ini seluruhnya diarahkan
ke sana. Hasilnya **bukan** perbaikan angka, melainkan **penjelasan yang bisa dipakai** — dan itu
disertai lima percobaan yang diukur lalu ditolak.

### Peta selisih setelah blur 8 px (`verification/langkah3/selisih-6.8-blur.jpg`)

Tiga panel: live · kita · peta selisih (merah = kita terlalu terang, biru = kita terlalu gelap).
Polanya sangat tegas:

- **cincin MERAH** tepat di lingkaran bola ignition → garis/lingkar kita **terlalu terang** (± +40 tingkat
  pada tepinya);
- **bagian dalam bola BIRU** → interior kita **terlalu gelap**;
- **kepala BIRU** → area kepala/pundak kita lebih gelap.

Jadi di app asli, ignition adalah **isi yang menyala dari dalam dengan tepi lembut**, sedangkan build kita
menggambar **cincin tajam yang terang** dengan interior gelap. Ini soal distribusi, bukan level.

### Kontribusi per lapisan pada t = 6,8 (uji `off=`, terukur)

| lapisan | live | kita |
|---|---|---|
| pic/picture | −1,82 | +0,19 |
| matter | +0,59 | +2,40 |
| lines | +2,72 | +4,53 |
| hair | −1,65 | +0,16 |
| strands | −1,72 | +0,10 |
| bloom | +23,79 | +8,86 |

(live menurunkan bingkai saat lapisan gambar/rambut dimatikan karena kilatan di app asli tersebar lewat
bloom; kita tidak.)

### Lima percobaan (semua diukur, semua ditolak)

| percobaan | hasil pada 6,8 | 9,5 |
|---|---|---|
| **F-107** latar ikut di-bloom (dua cara: ke render target figur, atau disuntik ke luminansi) | 7,84 / 11,03 | 8,69 / 11,03 |
| **F-108** menambah `defines COLOR`/`THRESHOLD` pada shader luminansi | **tanpa perubahan satu piksel** (shader kita sudah memuat `#define COLOR 1` di baris 37) — percobaan ini ternyata sia-sia | — |
| **F-109** menurunkan ambang bloom (`?bt=0,3 · 0,15 · 0,05`) | 8,50 · 9,78 · 11,38 | 5,81 · 7,51 · 9,16 |
| **F-110** menaikkan kecerahan nebula (`?fk=0,7 · 1,25`) | 7,85 · 8,47 | 9,24 · 7,08 |
| **F-111** memindahkan terang ke bloom (`?fl=0&hz=0`, lalu `bg=2,6`) | 7,85 · 9,20 | — |
| **F-112** sprite aura kepala (layer live `g`, renderOrder 0,1) — belum pernah ada di build kita | membantu: 6,97 → **6,76** (`au=1`) | **merugikan**: 5,20 → 5,77 (au=1) · 6,21 (au=0,7, skala 1,4) · 7,44 (au=0,55, skala 1,9) |

Catatan penting dari F-108: build26 dan build27 menghasilkan PNG yang **identik byte-per-byte**
(md5 `92289288…` untuk t=6,8 pada build26, build27, dan ulangan) → mesin render kita **deterministik**,
jadi setiap perubahan angka memang berasal dari kode, bukan dari noise.

### Kenapa tidak ada perbaikan angka sesi ini

Semua cara "menambah/mengurangi cahaya" gagal karena masalahnya **bentuk**: cincin terang + interior gelap.
Yang dibutuhkan adalah perubahan struktur lapisan ignition (bagaimana garis bola, materi di dalamnya, dan
kilatan berbagi terang), bukan pengali. Itu pekerjaan paket berikutnya, dan sekarang arahnya jelas dari
peta selisih — bukan tebakan.

### Gerbang piksel build27

| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 9,5 | rata² | blur4 | blur10 |
|---|---|---|---|---|---|---|---|---|---|
| build26 | 1,29 | 2,13 | 1,93 | 2,84 | 6,97 | 5,20 | 3,39 | 2,86 | 2,54 |
| **build27** | 1,29 | 2,13 | 1,93 | 2,84 | 6,97 | 5,20 | **3,39** | 2,86 | 2,54 |

Build27 = build26 secara tampilan; yang bertambah hanya tombol riset (`?au= ?as= ?bt= ?bs= ?fk=` yang
semuanya default netral) dan komentar penjelasan. Produksi: `dist/assets/index-48aN0FDY.js` sha256
`c70c361a…`; klon segar repo `cad9eab` + `MiraStage.tsx` → **sha identik**.

---

## Bagian 18 — Akar masalah cincin ignition ditemukan: `reveal.speed` dipakai sebagai jari-jari (build28)

Bagian 17 berhenti dengan diagnosis: cincin kita **terlalu jauh** (puncak r≈165 px vs live r≈145 px) dan
halo 200–280 px terlalu terang, interior bola terlalu gelap. Sesi 27 mencoba menambal dengan pengali dan
gagal semua. Bagian ini menutupnya dengan **satu baris rumus**.

### 18.1 Pembacaan ulang pemanggilan di bundle live

Di bundle live, gelombang kejut build dipanggil sebagai

```js
const Zt = Zk(Y, M.ignite, e.reveal.speed)      // argumen ketiga = KECEPATAN, bukan konstanta
```

`Zk(n, t0, speed)` menghitung `n = t − t0` lalu `r = n · speed · (1 − 0,18·min(1, n/2))`.
Port kita selama ini menulis `r = n · 1500 · (1 − 0,18·min(1, n/2))` — **angka 1500 itu konstanta bawaan
(default) parameter fungsi**, sedangkan live selalu mengisinya dengan `reveal.speed`.

Di app asli `reveal.speed` = **tinggi gambar** (`pic.height`, ≈718 px), jadi jari-jari cincin live
= `n · 718`, bukan `n · 1500`. Akibatnya cincin kita meleset **±14 %** lebih jauh — persis angka yang
diukur profil radial di Bagian 17 (+18 pada r 160–190, live memuncak di r≈145). Kesalahan radius ini
juga menyeret seluruh halo keluar, sehingga r 260–280 tampak terlalu terang (+29): itu bukan halo
terpisah, itu **cincin kita yang tumpah ke luar**.

### 18.2 Perbaikan (F-113 diterima, versi build sahaja)

```ts
// live memanggil `Zk(Y, M.ignite, e.reveal.speed)` — jadi kecepatan = tinggiGambar,
// BUKAN 1500 seperti konstanta bawaan fungsi di bundle.
const bR = n * reveal[3] * (1 - 0.18 * Math.min(1, n / 2)) * tune('sbs', 1)
const bK = xs(n, 0, 0.04) * Math.exp(-n / 0.9) * tune('sh', 0.85)
```

- Radius: `1500 → reveal[3]` (tinggi gambar).
- Kekuatan: **`sh = 0,85`**, yaitu taksiran bus gain `hum.build.shock` di live (kopling `Zt.k · zt("hum.build.shock")`).
  Kalibrasi: `sh` 1,00 → 3,59 · 0,85 → **3,42** · 0,80 → 3,47 · 0,75 → 3,54 · 0,70 → 3,64 (MAE t=6,8).
- Varian **gelombang sentuh** (`jk`, `hum.touch.wave`, lebar 42) tetap ada di kode tapi **default `tsk = 0`**:
  dengan `e = pic.height` hasilnya +50…+68 terlalu terang di r 90–260 (lihat 18.4).

### 18.3 Bukti: profil radial t=6,8 sesudah perbaikan

Pusat bola (771, 662). "sebelum" = build27, "sesudah" = build28.

| radius px | live | build27 | build28 |
|---|---|---|---|
| 140–150 | 182,4 | 190,4 (+8,0) | **183,2 (+0,8)** |
| 160–170 | 166,6 | 176,6 (+10,1) | **169,6 (+3,0)** |
| 180–190 | 149,9 | 159,1 (+9,2) | **152,7 (+2,8)** |
| 250–260 | 136,7 | 140,5 (+3,8) | 134,3 (−2,5) |
| 260–270 | 118,0 | 121,2 (+3,2) | 116,6 (−1,4) |

Puncak cincin kini **di radius yang benar**; sisa galat hanya ±3 pada kaki cincin dan −2 pada halo.
Halo luar yang tadinya **+29,0** di r 260–270 sekarang **−1,4** — hilang sama sekali, karena memang
itu ekor cincin yang salah radius.

### 18.4 Yang diuji dan ditolak (angka)

| percobaan | hasil |
|---|---|
| **F-113a** gelombang sentuh `jk` dengan `e = pic.height` (`?tsk=1`) | profil radial +50…+68 di r 90–260 → **ditolak**, default `tsk=0` |
| **F-113b** `sbs = 0,94` (radius diperkecil 6 %) | cincin jadi terlalu dekat: 240–260 −7,4 / −14,1 → **ditolak** |
| **F-113c** `sh = 1,00` (tanpa gain bus) | 3,59 vs 3,42 → gain 0,85 dipakai |

### 18.5 Lapisan lain: dua pengukuran yang mengoreksi catatan lama

1. **Kunci `off=` di build kita berbeda dari live.** Build kita memakai `picture`, live memakai `pic`;
   `core` dan `lights` tidak ada di build kita. Semua pengukuran "kontribusi lapisan" lama yang memakai
   `off=pic` pada build kita sebenarnya **no-op** (selisih 0,00). Sudah dikoreksi di sesi ini.
2. **Live `off=core` dan `off=lights` = 0,00** pada t=6,8 dan t=9,5 → dua lapisan itu tidak menyumbang
   apa pun di fase ini; jangan dikejar lagi.
3. **Bloom kita pada 6,8 justru lebih kuat dari live** (bloom-saja: kita 72,5 vs live 49,2; r 40–140
   kita 218 vs live 150). Jadi kekurangan terang di interior **bukan** karena bloom kurang — sumber
   interiornya (isi bola) yang kurang terang. Ini kebalikan dari catatan Bagian 17 dan menjadi pekerjaan
   berikutnya.
4. `?bq` (pengali intensitas bloom) pada 9,5: 1,5 → 5,15 · 2,5 → 5,15 (dasar 5,20) → **bukan pengali**.
   Sisa galat 9,5 (−5…−10 terpusat di tubuh, sementara lapisan gambar kita justru 1,7× lebih lebar dari
   live: kontribusi `pic` 51/47/40 vs live 27/31/8 pada r<40/40–140/>140) = **bentuk kuad gambar**,
   berikutnya.

### 18.6 Gerbang piksel build28

| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 9,5 | rata² | blur4 | blur10 |
|---|---|---|---|---|---|---|---|---|---|
| build27 | 1,29 | 2,13 | 1,93 | 2,84 | 6,97 | 5,20 | 3,39 | 2,86 | 2,54 |
| **build28** | 1,29 | 2,13 | 1,93 | 2,84 | **3,42** | 5,20 | **2,80** | **2,30** | **2,12** |

t=6,8 turun **6,97 → 3,42** (−51 %), rata-rata **3,39 → 2,80** (−17 %), blur4 2,86 → 2,30, blur10 2,54 → 2,12.
Lima fase lain **identik sampai ke byte** (perubahan hanya menyentuh gelombang kejut, yang nol di fase itu).

Bukti visual: `banding-build28.jpg` (live · kita · peta |selisih|×3 untuk enam fase) dan
`radial.py 6.8` (tabel 18.3).

---

## Bagian 19 — Anatomi t=9,5: bloom kita hanya membawa 7 % cahaya figur (live 50 %) (build29)

Pemeriksaan penerapan paket 4a: produksi menyajikan `index-BUSc4wVj.js`, blob `MiraStage.tsx` di repo
(`e52df4c`) = **`144215495f0ca980`**, identik dengan lokal; build ulang lokal menghasilkan `index-BUSc4wVj.js`
yang sama → **paket 4a terverifikasi**.

Fokus sesi ini: t=9,5 (5,20), fase terburuk yang tersisa.

### 19.1 Dua koreksi pengukuran yang mengubah gambaran

1. **Kunci `off=` build kita = `picture`** (live: `pic`). Semua angka "kontribusi lapisan" sebelum ini yang
   memakai `off=pic` pada build kita adalah **no-op**. Diukur ulang (t=9,5, r<120 / 120–260 / 260+):

   | lapisan | live | kita (kunci benar) |
   |---|---|---|
   | gambar (`pic`/`picture`) | 27,3 / 31,3 / 8,2 | **45,7 / 38,0 / 4,2** |
   | rambut (`hair`) | 12,3 / 24,9 / 7,8 | 11,8 / 23,3 / 7,5 |
   | garis (`lines`) | 4,0 / 3,0 / 2,0 | 4,3 / 3,9 / 2,0 |
   | **bloom** | **46,5 / 43,1 / 13,4** | **4,4 / 7,7 / 1,2** |
   | twinkles | — | 0,14 / 0,29 / 0,10 |

2. **`off=core` dan `off=lights` di live = 0,00** pada t=6,8 maupun 9,5 → dua lapisan itu tidak menyumbang
   apa pun; tidak perlu dikejar.

Kesimpulan besar: pada 9,5 live memindahkan hampir separuh cahaya figur ke **bloom** (46 dari total 108),
sedangkan kita hanya 4 (dari 103). Gambar langsung kita **1,7× lebih terang** dari live dan bloom kita
**10× lebih lemah**. Bentuk totalnya mirip (103 vs 108) tetapi pembagian tugasnya salah.

### 19.2 Yang dicoba dan ditolak (semua diukur pada t=9,5)

| percobaan | hasil | putusan |
|---|---|---|
| **F-115a** gain gambar `pg=2` (HDR di render target) | 9,90 (kita 137,7 vs live 108,6 di r<120) | ditolak — gambar langsung jebol, bloom tidak ikut naik |
| **F-115b** `pg=4` / `pg=4&bq=0,5` | 22,41 / 20,94 | ditolak |
| **F-116a** `bq=3` (intensitas bloom 3×) | bloom jadi 6,3/10,8/1,8 (dari 4,4/7,7/1,2) — sublinear; total 42,6, MAE lebih buruk | ditolak |
| **F-116b** `pg=0,6 + bq=6` dan `+bq=12` | 8,02 / 7,55 | ditolak — bloom kita terlalu sempit: menaikkannya membakar inti, bukan menyebar |
| **F-116c** `pg=0,8 + bq=6` | 6,34 | ditolak |
| **F-114** gain figur `fg=1,10` (gambar + rambut + helai + twinkle) | 9,5 **5,20 → 4,81**; lima fase lain bergeser ≤ 0,02 | **DITERIMA** |

Kalibrasi `fg` (t=9,5): 1,00 → 5,20 · **1,10 → 4,81** · 1,15 → 4,85 · 1,20 → 5,08 · 1,30 → 6,06.
Angka 1,10 masuk akal: kontribusi rambut kita memang ~5 % di bawah live (11,8/23,3/7,5 vs 12,3/24,9/7,8).

### 19.3 Fakta lain yang dikunci sesi ini

- **Geometri rambut benar.** Overlay `hair`-only (live vs kita) memberi pusat massa 709,6 vs 710,0 dan
  siluet yang sama; kekurangan hanya pada kecerahan (rata-rata 13,5 vs 30,6 karena bidang nebula di
  bingkai live ikut terukur — dengan `off` semua lapisan lain selisihnya tinggal 25,9 vs 30,6).
- **Nebula sudah sejajar**: pojok kiri-atas 20,5 vs 20,5, tengah-atas 28,1 vs 30,9.
- **Pantulan/kilau garis** (`lines`), `matter`, `waves` sudah dalam ±1 dari live di semua radius.
- **Latar** sudah sama; selisih t=9,5 bukan soal latar.
- Yang belum tersentuh dan tampak di peta selisih 10 px: **posisi pita nebula panjang** (lengkung tipis
  merah/biru berselang-seling di langit) — energinya sama, tempatnya bergeser. Ini urusan geometri
  `waves`/`field`, bukan kecerahan, dan menjadi kandidat kuat berikutnya.

### 19.4 Gerbang piksel build29

| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 9,5 | rata² | blur4 | blur10 |
|---|---|---|---|---|---|---|---|---|---|
| build27 | 1,29 | 2,13 | 1,93 | 2,84 | 6,97 | 5,20 | 3,39 | 2,86 | 2,54 |
| build28 | 1,29 | 2,13 | 1,93 | 2,84 | 3,42 | 5,20 | 2,80 | 2,30 | 2,12 |
| **build29** | 1,29 | 2,13 | 1,93 | 2,84 | 3,43 | **4,81** | **2,74** | **2,24** | **2,06** |

Bukti visual: `banding-build29.jpg`.

---

## Bagian 20 — Bloom: satu temuan metodologis, lima hipotesis ditolak, dua kalibrasi diterima (build30)

Pemeriksaan penerapan 4b: produksi menyajikan `index-Dkk8FSYS.js`; repo `073732f`; blob `MiraStage.tsx`
`1d7cdbce82f026e1` = lokal (78 487 B) → **paket 4b terverifikasi**.

### 20.1 Pembacaan ulang pustaka bloom di bundle live (bukan tebakan)

| hal | nilai live (dari bundle) | build kita |
|---|---|---|
| shader down 12-tap | `WEIGHT_INNER 0.125`, `WEIGHT_OUTER 0.05556`, `clampToBorder` | **identik** |
| shader up 9-tap + support | tent 0,0625/0,125/0,25 lalu `mix(support, c, radius)` | **identik** |
| `radius` (up) | 0,62 (`hum.glow.radius` def .62) | 0,62 |
| `levels` / `resolutionScale` | 8 / 0,5 | 8 / 0,5 |
| fungsi campur | `blendFunction: sn.ADD` | ADD (`blend0`) |
| intensitas | `0.9·(1 + 1.6·P_(t, ignite))`, `P_ = exp(−Δ/1,9)` untuk Δ∈[0,8), 0 di luar | sama (`?bq=` pengali) |
| **resolusi pass luminansi** | **resolusi penuh** (1440×900), lalu 13-tap menurunkan ke mip 0 (720×450) | mip 0 (720×450) langsung |

### 20.2 Temuan metodologis: `off=bloom` di app asli BUKAN ablasi bloom

Di app asli, efek bloom dibungkus `!Ur.has("bloom") && <EffectComposer>…` — mematikan bloom berarti
**seluruh EffectComposer tidak dipasang**, jadi jalur render-nya berubah total, bukan sekadar "tanpa bloom".
Buktinya angka: kontribusi `off=bloom` di live **negatif** di sekitar inti (−2,9 pada r 30–60) dan memuncak
di r 180–240 (+21), sementara build kita monoton turun dari inti. Semua perbandingan "bloom live vs kita"
sebelum Bagian 20 ini karena itu **tidak sah** — dan itu menjelaskan kenapa lima percobaan sebelumnya
(F-107, F-109, F-111, F-115, F-116) selalu gagal.
**Aturan baru: jangan pakai `off=bloom` di live sebagai acuan; acuan hanya `off` pada lapisan yang
bukan pembungkus composer (pic, hair, lines, matter, strands, waves, arcs).**

### 20.3 Lima hipotesis bloom — semuanya diukur, semuanya ditolak

| hipotesis | knob | hasil t=9,5 | putusan |
|---|---|---|---|
| **F-117** luminansi di resolusi penuh (seperti live) | `?bl=1` | 5,00 (dasar 4,81); bloom naik +2,8 rata bingkai | ditolak — menambah terang, bukan bentuk; default `bl=0`, knob disimpan |
| **F-118a** radius up 0,85 / 1,00 (bloom lebih lebar) | `?ur=` | 8,45 / 14,87 | ditolak |
| **F-118b** bloom lebar + figur diredupkan | `ur=0,85·fg=0,6` dsb. | 8,85 / 7,21 / 6,22 | ditolak |
| **F-119a** awan titik tubuh (`points`) dinyalakan | `?bo=1` | 10,73 | ditolak |
| **F-119b** awan titik tubuh diredupkan | `?bog=0,15/0,3/0,5` | 5,62 / 6,68 / 7,96 | ditolak (sebarannya salah, bukan levelnya) |
| **F-120** kurva nada komposit | `?gm=0,9/1,1` | 6,37 / 5,70 (6,8: 8,14 / 5,71) | ditolak — kurva kita **sudah** sama dengan live |
| **F-121** redam materi | `?mg=0,75/0,85` | 1,89 2,12 · 6,8 3,38 · 9,5 4,80 **tetapi** 3,5 1,94 · 5,5 3,13 | ditolak — rata² memburuk (2,78 vs 2,74) |

Kesimpulan jujur: untuk struktur lapisan yang ada sekarang, kita **sudah di titik optimum**; semua
penambahan/pengurangan cahaya per lapisan memperburuk salah satu fase lain.

### 20.4 Dua kalibrasi yang diterima

1. **`bq` (pengali lonjakan bloom) 1,00 → 0,70.** Penyapuan: 6,8 → 3,43 · 0,85 → 3,23 · **0,70 → 3,18** ·
   0,55 → 3,38; 9,5 → 4,81 · 0,85 → 4,79 · **0,70 → 4,78** · 0,55 → 4,76.
2. **`fg` (gain figur) 1,10 → 1,15.** Dengan `bq=0,70`: 9,5 4,78 → **4,76**; 6,8 tetap 3,18.

### 20.5 Gerbang piksel build30

| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 9,5 | rata² | blur4 | blur10 |
|---|---|---|---|---|---|---|---|---|---|
| build28 | 1,29 | 2,13 | 1,93 | 2,84 | 3,42 | 5,20 | 2,80 | 2,30 | 2,12 |
| build29 | 1,29 | 2,13 | 1,93 | 2,84 | 3,43 | 4,81 | 2,74 | 2,24 | 2,06 |
| **build30** | 1,29 | 2,13 | 1,93 | 2,84 | **3,18** | **4,76** | **2,69** | **2,19** | **2,02** |

Knob riset baru (semua default netral/kalibrasi): `?bl= ?ur= ?bo= ?bog= ?gm= ?lg= ?mg=`.
Bukti visual: `banding-build30.jpg`.
