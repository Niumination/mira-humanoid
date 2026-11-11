# Analisis Gerbang C — ke mana sisa +3,3 satuan itu pergi

Tanggal: 2026-11-11 · build 4t (dari 4s) · `?t=9,5`, viewport 1440×900, kedua aplikasi diukur di mesin yang sama.
Acuan kebenaran: `https://mira-humanoid.vercel.app/` · build: `http://127.0.0.1:8804/`.

## 0. Ringkas

| keadaan | kita | live | Δ | MAE |
|---|---|---|---|---|
| penuh | **42,62** | **39,33** | **+3,28** | 6,50 |
| figur di atas HITAM (`off=fog` di kedua sisi) | 25,16 | 25,32 | −0,16 | **3,79** |
| tanpa lapisan figur (lihat §2 — tidak setara) | 18,82 | 18,83 | −0,01 | 8,24 |

**Kesimpulan:** sisa selisih **bukan** kesalahan skala global, **bukan** jam medan, **bukan** bloom.
Ia **terpusat di badan** (peta selisih: pita merah pekat x≈600–800, y≈360–760 = batang tubuh) dan
strukturnya: live punya **mesh 3D yang menutupi latar**, build kita menggambar badan dari kuad tekstur.

## 1. Ablasi per lapisan figur di atas latar menyala

`tools/gate-c-layer.js`, latar dimatikan di kedua sisi (`off=fog`), lalu tiap sub-lapisan dimatikan.

| wilayah | Δ total | penyumbang terbesar |
|---|---|---|
| kepala + rambut | −0,90 | `hair` +1,05 · `lines` +0,64 · `strands` +0,44 · `twinkles` +0,56 |
| **dada/torso** | **+1,22** | **`pic` +7,96** · `strands` +1,80 · `lines` +0,64 |
| lengan | +0,42 | `pic` −1,24 (kita kurang) · `lines` +0,98 · `strands` +0,77 |
| bawah | −0,29 | `waves` +0,97 · `pic` −0,98 |

Kepala dan bawah **sudah setara**. Kelebihan duduk di **`pic` (kuad warna gambar) pada torso**: kita
menambah 46,69 satuan di wilayah itu, live hanya 38,73.

## 2. Kenapa "tanpa figur" tidak bisa dipakai sebagai pembanding

Menjalankan `?off=figure` di live menghasilkan **layar hitam (rerata 0,00)** — flag itu mematikan medan
juga. Sapuan flag lain di live (`?t=9,5`):

| flag | rerata |
|---|---|
| `off=core` | 39,29 (tidak berubah) |
| `off=lights` | 39,29 (tidak berubah) |
| `off=head3d` | 39,46 (+0,17) |
| `off=cutwhite` | **76,65** (naik 37 — ikut mematikan tone-mapping) |
| `off=figure` | **0,00** (seluruh layar mati) |

Jadi satu-satunya keadaan yang **setara** di kedua aplikasi adalah **`off=fog`** (figur di atas hitam),
dan di situlah angkanya cocok: 25,16 vs 25,32.

Perbandingan "latar saja" (kita semua lapisan figur off vs live `pic,hair,lines,matter,arcs,waves` off)
memberi MAE **8,24** — lebih besar dari selisih gambar penuh (6,50) — karena di live mesh kepala dan
badan **masih ada** dan menutupi nebula (lihat `verification/mira/latar-bgonly-t95.png`: badan live
hitam pekat, badan kita transparan sehingga nebula menembus). **Jangan pakai angka 8,24 sebagai skor
latar**; itu mengukur dua hal berbeda.

## 3. Hipotesis yang diuji lalu gugur (semua dengan angka)

| hipotesis | uji | hasil |
|---|---|---|
| bloom kurang/lebih kuat | sapu `?bb=` (intensitas komposit) | 0,9 → 2,80/4,47 · 1,2 → 3,79/4,54 · 1,6 → 5,50/4,88 · 2,2 → 8,08/5,63 ⇒ **makin besar makin buruk** |
| gain global `fg` | sapu 0,9–1,3 pada 6 fase | optimum 1,2 = 2,53 vs bawaan 1,15 = 2,54 ⇒ **Δ0,01** |
| salah uniform medan (`iCenter`/`iRing`/`iSpread`/`iNear`/`iClear`/opacity) | `tools/fit-field.js`, koordinat-turun 2 putaran, 7 knob | **tidak ada perbaikan**: 8,114 → 8,114; nilai bawaan ternyata sudah optimum (mis. `fcy` 0,69 terbaik dari 0,31–0,74; `frig` 0,124 terbaik dari 0,08–0,20) |
| jam medan saat `?t` dipin salah | sapu `?ft=` 0–6 | optimum 0,5 (8,213) vs bawaan 0,15 (8,243) ⇒ **Δ0,03**, di bawah derau |
| kurva respons (kita terlalu "linear") | dekomposisi per piksel `T = B + k·F`: k kita **0,923** vs live **0,789** | menerapkan kurva live: MAE 6,50 → **6,18** ⇒ Δ0,32, **di bawah ambang derau 0,4** |

## 4. Kenapa ambang derau 0,4

| uji | MAE |
|---|---|
| live vs live, dua tangkapan 3,2 s | 0,017 |
| live 3,2 s vs live 7,0 s | **0,408** |
| kita vs kita | 0,022 |

Acuan live stabil untuk dua tangkapan berurutan, tetapi **bergeser 0,4** bila waktu tunggu berbeda
(animasi mikro). Karena itu perbaikan < 0,4 **tidak boleh** diklaim sebagai perbaikan.

## 5. Yang tersisa: beda struktur, bukan beda angka

Dari `banding-t95.png` + `peta-selisih-t95.png` + `latar-bgonly-t95.png`:

1. Di live, badan dan kepala adalah **mesh 3D** (`core`/`head3d`) yang **menutupi latar** dan tampil
   gelap; cahaya badan datang dari tepi (rim) dan dari kuad gambar.
2. Di build kita, badan digambar oleh **kuad tekstur** dengan alpha parsial ⇒ nebula masih menembus dan
   kuad menambah cahaya di atasnya. Karena itu torso kita **+8** relatif live pada komponen `pic`,
   sementara lengan dan bawah justru **−1**.
3. Akibatnya memperbesar/mengecilkan gain global **tidak bisa** menutup selisih: satu wilayah butuh
   dikurangi, wilayah lain butuh ditambah. Itu sebabnya `?fg=` dan `?bb=` mendatar/memburuk.

**Langkah berikutnya (paket lebih besar):** tambahkan pass **mesh penutup badan + kepala** (siluet gelap
opak, dirender sebelum lapisan tepi) sehingga latar tidak menembus badan, lalu kalibrasi ulang `pic` pada
torso saja. Ini pekerjaan satu langkah penuh (mendekati langkah 8: port pipeline GPU), bukan satu knob.

## 6. Alat baru yang lahir dari analisis ini

| alat | fungsi |
|---|---|
| `tools/gate-c-layer.js` | ablasi per sub-lapisan **dengan latar menyala** + peta selisih per wilayah 3×3 & hotspot |
| `tools/fit-field.js` | koordinat-turun knob medan (`?fcx ?fcy ?frig ?fspread ?fnear ?fclr ?fk ?ft`) terhadap MAE latar vs live |
| knob baru di `MiraStage.tsx` | F-140 (semua uniform medan bisa disapu lewat URL) · F-141 (`?ft=` jam medan) — bawaan **tidak berubah**, jadi gambar identik (lihat §7) |

## 7. Tanpa regresi

Build 4t vs produksi 4s: `?t=8,0` dan `?t=11,5` → **MAE 0,0000 · 0 piksel** (knob baru hanya aktif bila
parameter URL diberikan; default-nya sama persis).

## 8. Tindak lanjut paket 4u — +3,3 hampir tertutup

Dua koreksi atas §5 di atas, sesudah diukur:

1. **"Badan kita transparan" tidak benar.** Itu artefak `off=pic`: di build kita flag itu ikut mematikan
   penutup (`fill`). Penutupnya sendiri bekerja penuh — mematikannya hanya mengubah MAE 6,509 → 6,533.
2. **Penutup badan bukan tuasnya.** `?mk=` (kekuatan) 0,6/0,8/1,0 → 6,520/6,515/6,509 (alfa tekstur sudah ~1
   di badan) dan `?mc=` (kelabu penutup) 0,02/0,05/0,1 → **6,692/9,635/13,421**: menambah terang penutup
   memperburuk, jadi masalahnya badan kita **terlalu terang**, bukan kekurangan penutup.

Tuas yang benar ternyata **lengkung tonal kuad gambar**. `?pgg=` (gamma kuad gambar, uniform `uPG`):

| t | 6,8 | 8 | 9,5 | 10 | 11 | 11,5 | 12 | 13 |
|---|---|---|---|---|---|---|---|---|
| pgg=1 | 3,001 | 5,888 | 6,455 | 6,793 | 6,909 | 7,418 | 7,276 | 7,963 |
| **pgg=1,25** | 3,010 | 5,533 | **5,105** | **5,158** | **4,935** | **5,428** | **5,159** | **5,882** |

Δ wilayah pada t=9,5: kepala **+4,57 → +1,22** · torso **+14,39 → +5,79** · lengan **+6,33 → +2,70**.
Rata-rata t≥8: **7,04 → 5,35**. Fase sebelum ignition (0,3/1,89/3,5/5,5) tidak berubah (≤0,001).

**Sisa sekarang:** torso masih **+5,8** dan kepala **+1,2** pada t=9,5. Bentuk sisa ini (torso kelebihan,
lengan hampir pas) tetap menunjuk pada perbedaan sumber cahaya tubuh (mesh 3D live vs kuad gambar kita),
jadi langkah berikutnya masih pass mesh — tetapi sekarang dengan titik awal MAE **5,1**, bukan 6,5.
