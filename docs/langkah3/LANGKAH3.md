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
