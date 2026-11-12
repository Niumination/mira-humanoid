# Langkah 6 MIRA — tangan MediaPipe + mikrofon nyata

Status: **selesai, terukur, + empat revisi** · build **`dist/assets/index-B4pxZZJw.js` sha256 `1bb6e4c0…`** (revisi 4s)
· 4r: `index-BZ3xQRZB.js` `a3b71641…`
· 4q: `index-C7tk2IC6.js` `b9087a0c…` · 4p: `index-6z8R68bj.js` `84655131…` · 4o: `index-DimN9-5N.js` `bc3c1ef0…`
Gerbang D langkah 6: **modul 8/8** (`gate-step6a.json`) · **aplikasi 8/8** (`gate-step6.json`, revisi 4p menambah B7/B8)
· **MediaPipe asli 12/12** di live dan di produksi (`gate-step6-real-{live,prod}.json`)
Regresi: build 6 vs build 5 (knob kepala nol) **MAE 0,0000** dua fase · efek kepala **MAE 3,7271**

---

## 1. Apa yang dipasang

| berkas | isi | asal di bundel live |
|---|---|---|
| `src/lib/miraHand.ts` (baru, 8,1 kB) | `HAND` (konstanta MediaPipe), `HAND_WORKER_SOURCE` (`ZN`), `updateHead` (`YN`), `headParams` (`jN`), `backK` (`$k`), `handLandmarks` (`G`), `snapHit` (`V`), `miraBody`/`lastBody` (`XN`/`qN`), `startSpeech` (`CF`), `SPEECH_COMMANDS`/`matchSpeech` (`bF`/`RF`), `attentionOverride`/`boltOverride`/`boltAge` (`VT('attn')`/`VT('bolt')`), `LOOK_HOLD_MS` (`WN`) | ≈ 1 129 300 – 1 134 800 & 1 138 000 |
| `src/components/HandTracker.tsx` (baru, 9 kB) | komponen `QN`: `getUserMedia` 320×240 (+audio, fallback video saja), `<video>` 1×1 tak terlihat, analiser 1024 untuk tepuk tangan, worker `Blob` + `type:'module'`, fallback MediaPipe di thread utama (GPU→CPU, 125 ms), kanvas 256×192 tiap 40 ms (jarak ≥ 80 ms), status berwarna `#19ddff` | `QN` ≈ 1 131 286 – 1 136 120 |
| `src/components/HumanoidMode.tsx` | tombol `data-testid="mira-humanoid-camera"` (`ENABLE CAMERA`/`CAMERA OFF`, `aria-pressed`, `aria-label`), titik merah 14 px `#ff4444`, `<HandTracker … onPinch={(x,y)=>boltPress(x,y)} onPalm={()=>onState('idle')} onSnap={()=>onState('listening')}>`, MIC nyata (analiser 512, level `min(1,√rata²·6)`), baris `mira-heard`, `mira-body` → perhatian, `?attn=` | `AF`/`IF` ≈ 1 183 300 – 1 187 600 |
| `src/components/MiraStage.tsx` | prop `attention`; tiap frame: `updateHead` → `uHeadPose` (hair, strands, twinkles, points, matter, wire) + `uBackK = backK(yaw,pitch)`; `?attn=x,y` mengalahkan perhatian penunjuk | `eF`/`YN`/`$k` ≈ 1 166 956 & 1 172 000 |

### Keputusan yang diambil (dan alasannya)

1. **Logika landmark dipisah jadi fungsi murni** `handLandmarks()` — isinya sama baris-per-baris dengan `G`
   di live, tetapi bisa diuji tanpa kamera. Komponen hanya meneruskan frame. Ini yang membuat paritas
   `G` bisa diuji 800 frame dengan **0 selisih** (bukan "kelihatan mirip").
2. **`?bolt` dibetulkan semantiknya.** Di build sebelumnya perhatian di-seed dari `?bolt`; di live
   `?bolt=x,y` adalah **posisi percikan** (`ix`, dipakai efek bolt) sedangkan **arah perhatian** memakai
   `?attn=x,y` (`eF`). Sekarang: `MiraStage` memakai `?attn`, `HumanoidMode` tidak lagi men-seed perhatian
   dari `?bolt`. Akibatnya uji kepala memakai `?attn=` (lihat B6).
3. **Satu jalur bolt** untuk klik dan pinch (`boltPress`, ambang 150 ms, `id` bertambah, `pan = x·0,8`)
   persis `B(x,y)` di live; posisi terakhir disimpan di `boltRef` untuk efek partikel langkah 8.
4. **Diagnostik baru** (pola `__MIRA_*` yang sudah dipakai): `__MIRA_HAND` (keadaan `L,D,X,J,M,Z,K`
   antar-frame), `__MIRA_MIC()` (`{on, level, heard, speech, camera, attention, bolt, palms}`),
   `__MIRA_HEAD` (`{yaw,pitch,roll,on,x,y,idle}`). Alat gerbang membaca ini, bukan menebak.
5. **MIC memakai mikrofon nyata**, bukan level prosedural: `PF()` hanya dipakai bila mikrofon mati
   (persis `$U('output', c.current ? c.current.level() : PF(t))`).

---

## 2. Angka gerbang D langkah 6

### BAGIAN A — paritas modul terhadap bundel live (`tools/gate-mira6.js A`)
| # | uji | hasil |
|---|---|---|
| A1 | worker `ZN` verbatim | **884 char, selisih 0** (spasi diabaikan) |
| A2 | konstanta `HAND` vs live (`OT/BT/zT/KN/vg/yg`, irama frame, SNAP, PINCH, `Cl`, `WN`) | **10/10 sama** |
| A3 | `YN` / `updateHead` | **6 000 kombinasi, max\|Δ\| = 0,00e+0** |
| A4 | `jN` / `headParams` | sama (`{follow, life, speed}`) |
| A5 | `$k` / `backK` | **1 681 kombinasi, max\|Δ\| = 0,00e+0** |
| A6 | `G` / `handLandmarks` | **800 frame: 684 status, pinch 167/167, palm 2/2, perhatian & keadaan antar-frame identik** |
| A7 | `V` / `snapHit` | **700 kombinasi, selisih 0** |
| A8 | `RF` / `matchSpeech` | **30 kalimat, selisih 0** |

### BAGIAN B — aplikasi (kamera palsu Chromium + MediaPipe tiruan lewat `page.route`)
| # | uji | hasil |
|---|---|---|
| B1 | label/aria awal | `ENABLE CAMERA`, `aria-pressed=false`, titik 0 |
| B2 | klik → menyala | `CAMERA OFF`, `aria-pressed=true`, titik **14 px `rgb(255,68,68)`** |
| B3 | status pipeline | `camera on - show your hand` → `hand found - point, pinch to touch her` |
| B4 | landmark → gerak | perhatian Δx **0,256** · yaw Δ **0,057** · pinch → bolt **3** · telapak → `idle` **true** |
| B5 | MIC nyata | `on=true`, puncak level **0,03–0,87**, `mira-heard` ada, state sempat `talking` |
| B6 | `?attn=` → kepala | kanan x 0,800 yaw **+0,2419** · kiri yaw **−0,2701** · `?attn=1,1` \|yaw\|max **0,3059** ≤ batas **0,416** |

Catatan jujur soal lingkungan uji:

- Panggung berjalan **≈1 fps** di SwiftShader, jadi MediaPipe asli (butuh esm.sh + jsdelivr +
  storage.googleapis.com) tidak bisa dimuat di sandbox. Yang diuji adalah **kabelnya**: worker `ZN`
  (byte-identik dengan live) → `{type:'ready'|'fail'|'lm'}` → `handLandmarks`, ditambah fallback
  thread-utama (GPU→CPU) yang diuji lewat jalur tiruan. Isi deteksi (model) tidak diuji di sini —
  itu hanya bisa diuji di browser sungguhan.
- Untuk alasan yang sama, tangan tiruan digerakkan **per frame** (siklus 6 frame: kepalan → 4 frame
  telapak diam → pinch), bukan per detik: 4 frame berturut-turut tak akan pernah terkumpul kalau
  dijadwalkan berdasarkan waktu.

### Regresi & efek visual (`verification/mira/gate-step6-visual.json`, `shots6/`)
| uji | hasil |
|---|---|
| build 6 vs build 5 (langkah 5) @t=8,0 · knob `dial.hum.head.life=0&dial.hum.head.follow=0` | **MAE 0,0000 · 0 piksel beda** (PNG identik, sha `6b720824`) |
| build 6 vs build 5 @t=11,5 · knob sama | **MAE 0,0000 · 0 piksel beda** |
| efek arah kepala @t=11,5 · `?attn=-1,0` vs `?attn=1,0` | **MAE 3,7271 · 128 608 piksel (≈10 %)** |

Tanpa knob nol, build 6 memang **berbeda** dari build 5 — itu memang tujuannya: live punya gerak kepala
bawaan (`hum.head.life`) + arah perhatian (`?attn`). Knob nol mengisolasi "tidak ada perubahan lain",
dan hasilnya 0,0000.

---

## 3. Cara menjalankan ulang

```bash
# modul (tanpa browser)
node tools/gate-mira6.js A --json

# aplikasi: panggung di :8804
cd /home/user/mira-humanoid-rebuild && npx vite preview --host 0.0.0.0 --port 8804 --strictPort
node tools/gate-mira6.js B http://127.0.0.1:8804/

# regresi piksel (acuan langkah 5 dibangun ulang dari paket 4n → sha ba48a373…)
BASE=http://127.0.0.1:8805/ TS="8,11.5" PREFIX=b5 OUTDIR=/tmp/shots6 \
  EXTRA="&dial.hum.head.life=0&dial.hum.head.follow=0" UIHIDE=1 node tools/shot.js
BASE=http://127.0.0.1:8804/ TS="8,11.5" PREFIX=b6 OUTDIR=/tmp/shots6 \
  EXTRA="&dial.hum.head.life=0&dial.hum.head.follow=0" UIHIDE=1 node tools/shot.js
```

---

## 4. Yang belum (dan kenapa)

- **Model MediaPipe sungguhan** — perlu jaringan + kamera nyata; di paket ini yang dijamin adalah
  sumber worker identik + jalur data identik. Sisi ini diverifikasi di browser pengguna.
- **Efek partikel bolt** (posisi `?bolt`/pinch → percikan) baru dipakai di langkah 8; `boltRef` sudah
  menyimpan `{x,y,id,when}` supaya tinggal disambung.
- **Gerbang C** (paritas piksel) tetap seperti catatan STATUS-ROADMAP: live deterministik
  0,00–0,55 sedangkan kita 4,5–4,9 — belum lulus, dan bukan lingkup langkah ini.


---

## 5. Revisi paket 4p — hasil pemeriksaan produksi 4o

### 5.1 Produksi 4o terverifikasi (tiga lapis)
| lapis | hasil |
|---|---|
| produksi | `assets/index-DimN9-5N.js` sha256 `bc3c1ef077d81dd6830c8828ef215e0431ad47f095d8f00a62c18aa74baf9060` |
| repo | head `d20d76f` · 5 blob (`miraHand`, `HandTracker`, `HumanoidMode`, `MiraStage`, `miraAura`) **identik** dengan workspace |
| build | tarball repo → `npm ci` → `vite build` → **sha identik** (reproduktif) |

Gerbang di produksi: hand **6/6** · audio aplikasi **9/9** (36 cue, RMS 1,55·10⁻¹) · langkah 5 B **6/6** ·
Gerbang A **8/8** · Gerbang B **10/10**.

### 5.2 Temuan yang mengubah pemahaman (H-6)
**Worker `ZN` selalu gagal — di aplikasi live juga.** Penyebab terukur:

```
TypeError: Failed to execute 'importScripts' on 'WorkerGlobalScope':
           Module scripts don't support importScripts()
    at FilesetResolver.forVisionTasks (tasks-vision.mjs)
```

Live: `worker {created:1, ready:0, fail:1, lm:0}` + 4 impor `esm.sh` di thread utama.
Produksi 4o: **angka yang sama persis**. Artinya deteksi tangan **selalu** berjalan di jalur cadangan
thread-utama (GPU→CPU, 125 ms) — di live maupun di rebuild. Ini **paritas**, bukan cacat port; jangan
"diperbaiki" sepihak karena akan menyimpang dari live.

### 5.3 Lima divergensi yang diperbaiki
| # | bug di 4o | bukti sebelum → sesudah |
|---|---|---|
| 1 | `HandLandmarker.close()` tidak dipanggil saat kamera OFF (bocor) | `close=0` → **`close=1`** (B7) |
| 2 | Klik panggung tidak memicu bolt saat SOUND OFF (live: selalu) | `id 12 → 12` → **`id 10 → 11`** (B8) |
| 3 | MIC OFF tidak menghentikan `SpeechRecognition` | sekarang `speechRef.stop()` + `null` |
| 4 | `Od()` / sesi audio `play-and-record` tidak pernah dipanggil | `setRecording(true/false)` di kamera & MIC |
| 5 | Perintah suara terakhir tidak dipulihkan saat humanoid dibuka | `lastBody('look')` saat mount |

### 5.4 Gerbang setelah revisi (build 4p)
| bagian | hasil |
|---|---|
| modul (`gate-step6a.json`) | **8/8** (tidak berubah) |
| aplikasi (`gate-step6.json`) | **8/8** — B7 & B8 baru; **keduanya GAGAL di produksi 4o**, lulus di 4p |
| MediaPipe asli (`gate-mira6-real.js`) | **12/12** lokal · **12/12** produksi · **12/12** live |
| regresi piksel 4p vs 4o | **MAE 0,0000 · 0 piksel** (`?t=8,0` & `?t=11,5`, knob kepala nol) |
| gerbang lama | langkah 5 B **6/6** · audio D1 **31/31** · audio aplikasi **9/9** · A **8/8** · B **10/10** |

Alat baru: `tools/gate-mira6-real.js` (MediaPipe asli, 4 skenario × 3 uji) dan
`tools/probe-worker-live.js` (instrumen `Worker`, dipakai membandingkan live vs produksi).


---

## 6. Gerbang D sisa + viewport 390 (paket 4q)

### 6.1 Bug yang ditemukan di layar ponsel (W-1)
Panggung MIRA **tidak pernah menyesuaikan ukuran gambar terhadap bentuk layar**: matriks & geseran memakai
angka tetap hasil pengukuran di 1440×900. Di 390×844 akibatnya gambar **terlalu besar** (figur mengisi
seluruh layar, MAE vs live **70,6**).

Port dari live (`X` di komponen panggung):

```
D0   = HT·tan25° = 4,8·0,46631 = 2,2383          // jarak bidang pada z=0
fh0  = 2·D0·fit  = 3,96·1,01… (fit 0,9) ≈ 4,029   // tinggi gambar penuh
fw0  = fh0·(lebar/tinggi gambar)                  // gambar 1145×1374 → 0,833
bila fw0 > 2·halfW·0,94  →  fh = 2·halfW·0,94  dan  fw = fh·(tinggi/lebar)
   (halfW = D0·aspect layar)                        // potong lebar, gambar menempel di dasar layar
t = fh / fh0   →  semua matriks kini berskala S·t, TY = −D0 + fh0·t, offset z dipetakan (−D0 + (z+D0)·t)
```

Di 1440×900 (aspect 1,6) `t = 1` → **piksel tidak berubah** (regresi 0,0000). Di 390×844 `t = 0,5786`
(sebelumnya `t = 1`) → figur kini duduk di dasar layar seperti live. Ada knob kalibrasi `?fitk=` (default 1).

### 6.2 Baris tombol menempel di atas (W-2)
CSS live menaruh `mira-own-row` (REPLAY/SPEED/SOUND) di **72 px dari atas, kiri 18** dan `mira-page-row`
(IDLE/LISTENING/TALKING/MIC) di **124 px**, dengan media query ≤720 px (padding tombol 8×11, font 11 px,
kiri 12). Port kita sebelumnya menaruhnya di **bawah**. Sekarang `src/index.css` disamakan dengan live
(termasuk `--mira-status-top: 176px`, sehingga status kamera tidak menimpa tombol).

### 6.3 Angka (build 4q)
| uji | hasil |
|---|---|
| D5 reproduktibilitas @t=8 & t=11,5 | kita **MAE 0,0000** / 0,0492 · live 0,3135 / 0,0014 (**kita lebih stabil**) |
| D6 seam (lonjakan baris) | kita rasio **1,46** baris 548 · live **1,45** baris 529 |
| D7 fps (lingkungan sama) | kita **0,78 fps** · live 0,73 fps |
| D8 stabil 120 s | frame 7 → **153**, konteks WebGL hidup, 0 error, jam naik |
| D9 390×844 | reproduktif **0,0474** (live 0,1729) · **korelasi profil 0,9887** · MAE 10,84 |
| D9 414×896 | reproduktif **0,0000** (live 0,5605) · **korelasi profil 0,9886** · MAE 10,64 |
| regresi piksel 4q vs 4p | **MAE 0,0000 · 0 piksel** (`?t=8,0` & `?t=11,5`) |
| paritas 1440 (6 fase acuan) | rata-rata **2,54** (build37: 2,55) — tidak berubah |
| gerbang lama | A **8/8** · B **10/10** · langkah 5 B **6/6** · audio aplikasi **9/9** · hand **8/8** |

Sisa selisih di ponsel **bukan geometri** (korelasi 0,9887; posisi baris puncak sama) melainkan
**kecerahan**: kita 47,6 vs live 40,7 (≈ +17 %). Ini kandidat berikutnya, bukan cacat tata letak.

### 6.4 Alat
- `tools/gate-d.js` — D5…D9 sekaligus (reproduktibilitas, seam, fps, stabilitas 120 s, viewport 390 & 414),
  keluaran `verification/mira/gate-d.json`. Metrik D9 memakai **korelasi profil baris** karena MAE
  didominasi kecerahan (state animasi tak bisa dipin di lingkungan ~1 fps).
- `tools/gate-mira6.js` BAGIAN B kini memakai **satu halaman** untuk B2…B8 (sandbox ~2 GB: beberapa
  konteks WebGL sekaligus membuat target crash), plus `--renderer-process-limit=1`.


---

## 7. Revisi 4r — produksi 4q diperiksa, satu bug tata letak tersisa + Gerbang C dimulai

### 7.1 Produksi 4q terverifikasi, tetapi D9 gagal di produksi
`index-C7tk2IC6.js` `b9087a0c…` = repo `19751da` = build ulang (3 lapis) · CSS `index-DQPaiuOr.css`
`6ad9d68a…`. Gerbang D dijalankan **terhadap produksi**: D5/D6/D7/D8 lulus, tetapi **D9 gagal**:
korelasi profil **0,714** (bukan 0,9887 seperti di lokal), terang kita **69,0** vs live 40,7.

### 7.2 Bug W-3: matriks kuad dibuat sekali saat init
`mvQuad` dan `mvPoints` disusun **satu kali** saat init — sebelum blok "faktor kecocokan gambar"
(di dalam loop) menghitung `S`, `TY`, `QUAD_TY`. Akibatnya lapisan yang matriksnya per-frame
(rambut/helai/bintik/poin) mengecil, sedangkan **kuad gambar & awan titik tetap besar**. Di lokal
campuran itu kebetulan mendekati live (0,9887) karena ada remount yang membuat init memakai `S` sisa
frame sebelumnya; di produksi tidak ada remount → gambar tetap besar (69,0).
**Perbaikan:** `quadMv()` dan `mkPointsMv()` membuat matriks **per frame** dari `S/TY/QUAD_TY/FIT_T`
terkini. Hasil: 390×844 **0,9887**, 414×896 **0,9886**, reproduktif **0,0000**, dan di 1440×900
(`t = 1`) **tidak berubah sama sekali** (4r vs 4q **MAE 0,0000 · 0 piksel**).

### 7.3 Kosakata `?off=` disamakan dengan live
Flag live: `arcs, bloom, core, cutwhite, figure, fog, hair, head3d, lights, lines, matter, pic, waves`.
Flag kita sebelumnya: `picture, strands, twinkles, field, …` — **URL yang sama memberi hasil berbeda**.
Sekarang ada alias: `pic → picture`, `fog → field`, `figure → semua lapisan termasuk field/waves/bloom`.
Bukti: `&off=figure` di kedua aplikasi → **layar hitam, MAE 0,0000** (sebelumnya live 0,0 vs kita 18,6).

### 7.4 Gerbang C dimulai — ablasi lapisan (`tools/gate-c-ablation.js`, t = 9,5)
| lapisan dimatikan | MAE(4r vs live) | terang kita / live | bobot lapisan pada gambar kita |
|---|---|---|---|
| — (penuh) | **6,7512** | 42,6 / 39,3 | — |
| `figure` | **0,0000** | 0,0 / 0,0 | 42,62 → **latar (nebula+fog) sudah identik** |
| `waves` | 5,5123 | 42,0 / 38,7 | 0,63 |
| `lines` | 6,3840 | 41,0 / 37,8 | 1,58 |
| `hair` | 6,7030 | 35,4 / 32,2 | 7,21 |
| `matter` | 6,7235 | 42,5 / 39,2 | 0,11 |
| `arcs` | 6,7505 | 42,6 / 39,3 | 0,00 |
| `pic` | 8,6937 | 31,4 / 30,5 | 11,28 |
| `bloom` | 15,5355 | 40,4 / **25,8** | 2,26 (live: −13,5) |
| `fog` | 17,0953 | 41,0 / **25,4** | 1,60 (live: −13,9) |

**Tiga kesimpulan terukur:**
1. **Latar (medan nebula + fog) sudah identik** — dengan `off=figure` selisih **0,0000**; sudut-sudut
   gambar pun berbeda 0,1–0,3 satuan.
2. Sisa selisih **terpusat di tubuh figur**: grid 6×4 menunjukkan sel tengah-bawah **+7,0 … +14,8**
   sedangkan tepi **±0,3**.
3. **Bloom kita jauh lebih lemah** daripada live: mematikan bloom menurunkan live **13,5** satuan tetapi
   kita hanya **2,2**. Sebagian energi yang di live lewat bloom, di kita keluar sebagai warna langsung —
   itu menjelaskan tubuh yang lebih terang tanpa bloom yang setara.
4. Kalibrasi `fg` bukan penyebab utama: sweep `?fg=` 1,00 → MAE **6,353**, 1,05 → 6,380, 1,10 → 6,502,
   1,15 → 6,739 (default 1,15). Arah perbaikan benar tapi kecil (0,39); perlu uji multi-fase sebelum diubah.

### 7.5 Langkah berikutnya untuk Gerbang C (rencana konkret)
1. **Bloom**: samakan kernel/intensitas dengan live (bobot 2,2 → ~13,5) memakai fase terkunci
   (`?t=`) + ukur ulang ablasi; ini kandidat terbesar.
2. **Tubuh**: setelah bloom seimbang, ulangi grid 6×4 untuk melihat sisa energi langsung (diduga
   `uGain` lapisan gambar + helai).
3. Kalibrasi `fg`/`pg`/`hg` baru dilakukan **setelah** bloom setara, dengan rata-rata 6 fase acuan.


---

## 8. Revisi 4s — produksi 4r lulus, satu alat ukur ternyata bohong (W-5)

### 8.1 Produksi 4r terverifikasi dan D9 kini lulus DI PRODUKSI
`index-BZ3xQRZB.js` `a3b71641…` = repo `8fce51d` = build ulang. Gerbang D dijalankan terhadap
**https://mira-humanoid-niu.vercel.app/**: **7/7**, dengan D9 390×844 **korelasi 0,9886** dan
414×896 **0,9883** (sebelumnya 0,714). Jadi perbaikan W-3 memang yang diperlukan.

### 8.2 W-5: `?off=field` tidak pernah mematikan latar
Cabang `off=field` hanya **melewati render ke FBO**, sedangkan **blit latar tetap memakai tekstur isi
frame sebelumnya** → latar tidak pernah hilang. Terukur: `?off=field` menurunkan terang kita hanya
**1,6** satuan, sedangkan flag kembarannya di live (`off=fog`) menurunkan **13,9**.

Konsekuensi: **seluruh kesimpulan ablasi di §7.4 tidak sah** (tabel "bloom kita 2,2 vs live 13,5",
"fog kita 1,6 vs live 13,9"). Sudah dibetulkan: `off=field` kini juga melewati blit latar dan mengisi
kanvas hitam.

### 8.3 Angka setelah perbaikan (t = 9,5)
| keadaan | kita | live | selisih |
|---|---|---|---|
| penuh | 42,62 | 39,33 | +3,29 |
| `off=fog` (latar dimatikan) | **25,16** | **25,40** | **−0,24** |
| `off=figure` | **0,00** | **0,00** | **0,0000** |

Artinya: **latar (medan nebula/fog) setara dalam 0,24 satuan** dan kontribusi lapisan figur di atas latar:
kita **17,46** vs live **13,93** → kelebihan **+3,5** satuan, terpusat di tubuh (grid 6×4: sel tengah
+7 … +14,8; tepi ±0,3).

### 8.4 Dua hipotesis yang diuji dan GUGUR
| hipotesis | uji | hasil |
|---|---|---|
| "bloom kita kurang kuat" | sapu `?bb=` (intensitas komposit) pada t=6,8 & 9,5 | **makin kuat makin buruk**: 0,9 → **2,80 / 4,47**; 1,2 → 3,79 / 4,54; 1,6 → 5,50 / 4,88; 2,2 → 8,08 / 5,63 |
| "`fg` (gain gambar) terlalu besar" | sapu `?fg=` 0,9–1,3, 6 fase acuan | minimum di **1,2** (2,53) vs default 1,15 (2,54) — **selisih 0,01**, bukan penyebab |

Catatan hati-hati: `off=bloom` di live menurunkan terang sampai 25,8 (bukan 40,4 seperti di kita) —
kemungkinan besar flag itu juga mematikan pass encode sRGB di live, sehingga **tidak bisa dipakai sebagai
pembanding bobot bloom**. Karena itu penilaian bloom sekarang memakai sapu `?bb=` (di atas), bukan selisih
`off=bloom`.

### 8.5 Regresi & gerbang lain (build 4s)
| uji | hasil |
|---|---|
| 4s vs produksi (4r), `?t=8,0` & `?t=11,5`, knob kepala nol | **MAE 0,0000 · 0 piksel** |
| paritas 1440, 6 fase acuan | rata-rata **2,54** (tidak berubah) |
| Gerbang D 1440 | **7/7** |
| Gerbang A · B | **8/8** · **10/10** |
| langkah 5 BAGIAN B · hand BAGIAN B | **6/6** · **8/8** |
| audio aplikasi | **9/9** |

### 8.6 Perbaikan alat
`tools/gate-step4c.js` memakai `page.evaluate(el.click())` (temuan S-4: panggung ~1 fps membuat
`page.click` habis waktu 30 s → gerbang audio sempat "4/9" palsu). Setelah itu **9/9**.

### 8.7 Sisa Gerbang C (untuk paket berikutnya)
Target tinggal **satu angka**: kelebihan **+3,5** satuan pada lapisan figur di atas latar (kita 17,46 vs
live 13,93). Urutan kerja yang masuk akal: (a) bandingkan kontribusi tiap lapisan figur **setelah** latar
dinyalakan (ablasi ulang dengan W-5 dibetulkan) untuk menemukan lapisan penyumbang; (b) baru sesuaikan
gain lapisan itu; (c) uji pada 6 fase acuan, bukan satu fase.

## 9. Revisi 4t — produksi 4s terverifikasi, dan Gerbang C dibongkar sampai akar

### 9.1 Produksi 4s lulus 3 lapis
Produksi `assets/index-B4pxZZJw.js` **`1bb6e4c0…`** · CSS `index-DQPaiuOr.css` **`6ad9d68a…`** ·
repo head **`c363154`** · `npm ci` + `vite build` di tarball repo → **byte-identik**. Sumber repo =
workspace (`MiraStage.tsx 005c8081…`, `gate-c-ablation.js 0cabb13e…`, `gate-step4c.js a65ce213…`,
`gate-d.js 0dba1624…`).

**Gerbang D di produksi 4s = 7/7** (`verification/mira/gate-d-prod4s.json`): D5 reprod 0,0000 (live 0,826/0,020),
D6 rasio seam 1,46 vs live 1,52, D7 0,64 fps vs live 0,35, D8 7→71 frame err 0,
D9 390×844 korelasi **0,9884** (MAE 10,70; 47,6 vs 40,6), 414×896 **0,9881** (10,33; 47,3 vs 40,3).

### 9.2 Gerbang C: satu klaim sesi 46 perlu dikoreksi
"Latar setara 0,24" benar **sebagai rerata**, tetapi menyesatkan: `off=fog` menghasilkan rerata yang sama
sementara **sebarannya berbeda** (std kita 10,7 vs live 22,4). MAE latar **tidak bisa** diukur dengan flag
live, sebab `off=figure` = layar hitam (0,00) dan `off=pic,…` menyisakan mesh kepala/badan yang menutupi
nebula (MAE 8,24 — mengukur dua hal berbeda). Angka yang sah: **figur di atas hitam MAE 3,79**.

### 9.3 Penyumbang +3,3 ditemukan: kuad `pic` pada torso
Ablasi per wilayah (latar menyala, `gate-c-layer.json`): torso Δ **+1,22** dengan `pic` **+7,96** (kita
menambah 46,69 vs live 38,73); lengan Δ +0,42 dengan `pic` **−1,24**; kepala −0,90; bawah −0,29.
⇒ satu knob global **tidak mungkin** menutup selisih (sebagian wilayah harus turun, sebagian naik).

### 9.4 Empat hipotesis gugur dengan angka
`?bb=` monoton memburuk · `?fg=` optimum 1,2 hanya Δ0,01 · 7 uniform medan di-*fit* koordinat-turun
**8,114 → 8,114** (bawaan sudah optimum) · `?ft=` optimum 0,5 hanya Δ0,03 · kurva respons live
(k 0,923 vs 0,789) hanya menurunkan MAE 6,50 → 6,18 (derau acuan 0,408).

### 9.5 Akar masalahnya struktural
Live menutupi latar dengan **mesh 3D badan/kepala** yang gelap opak; kita menggambar badan dari kuad
tekstur alpha-parsial sehingga nebula menembus dan kuad menambah cahaya. Bukti: `latar-bgonly-t95.png`
(badan live hitam pekat, badan kita transparan). Perbaikan yang benar = pass mesh penutup (satu langkah
penuh), bukan knob. Rincian: `docs/langkah6/ANALISIS-GERBANG-C.md`.

### 9.6 Alat & knob baru (bawaan tidak berubah)
`tools/gate-c-layer.js` · `tools/fit-field.js` · F-140 (uniform medan bisa disapu) · F-141 (`?ft=`).
Build 4t (`index-D3XcAeJi.js` `df3071b7…`) vs produksi 4s @8 & @11,5 → **MAE 0,0000 · 0 piksel**.

## 10. Revisi 4u — produksi 4t terverifikasi, W-6 (acuan paritas basi), dan +3,3 hampir tertutup

### 10.1 Produksi 4t lulus 3 lapis
Produksi `assets/index-D3XcAeJi.js` **`df3071b7…`** · CSS `index-DQPaiuOr.css` **`6ad9d68a…`** · repo head
**`5448da1`** · `npm ci` + `vite build` di tarball repo → **byte-identik**; sumber repo = workspace
(`MiraStage.tsx cf02193a…`, `gate-c-layer.js 26330a2c…`, `fit-field.js 406442a5…`).
**Gerbang D di produksi = 7/7** (`verification/mira/gate-d-prod4t.json`): D5 0,0000 (live 0,7946/0,4713) ·
D6 1,46 vs live 1,48 · D7 **0,90 fps** vs live 0,51 · D8 4→95 frame err 0 · D9 390 **0,9886** · 414 **0,9883**.

### 10.2 W-6: acuan paritas kita sendiri sudah basi
`tools/metric3.py` memilih `recon/live-ref-v3` lalu **`live-ref-v2`** — dan set v3 tidak memuat fase acuan
kita (0,3 · 1,89 · 3,5 · 5,5 · 6,8 · 9,5), jadi selama ini yang dipakai v2. Dibanding live **hari ini**:

| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | **9,5** |
|---|---|---|---|---|---|---|
| MAE v2 vs live sekarang | 0,03 | 0,29 | 0,04 | 0,03 | 0,55 | **3,83** |

⇒ angka paritas "2,54" buta terhadap perubahan di fase lambat. Set baru **`recon/live-ref-v4`** (6 fase,
diambil hari ini) + urutan acuan metric3 diubah (v4 → v3 → v2) dan v2 dihapus (5,4 MB).

### 10.3 Dua koreksi atas analisis 4t
1. **"Badan kita transparan" — salah.** Itu artefak `off=pic`, yang di build kita ikut mematikan **penutup**
   (`fill`). Penutupnya sendiri bekerja penuh: `off=fill` hanya mengubah MAE 6,509 → 6,533.
2. **Penutup badan bukan tuasnya.** Disapu: `?mk=` 0,6/0,8/1,0 → 6,520/6,515/6,509 (alfa tekstur sudah ~1 di
   badan, tidak bisa lebih kuat); `?mc=` kelabu 0,02/0,05/0,1 → **6,692/9,635/13,421** (semakin terang
   penutup semakin buruk, jadi badan kita memang sudah terlalu terang, bukan terlalu transparan).
   Knob `?mk=`/`?mc=` tetap disimpan (F-142) tetapi **bawaan tidak berubah**.

### 10.4 F-143: lengkung tonal gambar — penyumbang terbesar yang masih tersisa
`?pgg=` (eksponen gamma kuad gambar, sudah ada sejak F-133 tetapi bawaannya 1,0) disapu pada **12 fase**:

| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 8 | 9,5 | 10 | 11 | 11,5 | 12 | 13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pgg=1 | 1,123 | 1,894 | 1,721 | 2,814 | 3,001 | 5,888 | 6,455 | 6,793 | 6,909 | 7,418 | 7,276 | 7,963 |
| **pgg=1,25** | 1,123 | 1,895 | 1,721 | 2,814 | 3,010 | **5,533** | **5,105** | **5,158** | **4,935** | **5,428** | **5,159** | **5,882** |

Rata-rata t≥8: **7,041 → 5,349**. Fase sebelum ignition tidak tersentuh (≤0,001), t=6,8 dalam derau.
`pgg=1,4` menang hanya di t=13 (5,562 vs 5,675) tetapi kalah di t=9,5 (5,516 vs 5,105) dan t=11 (5,468 vs
5,343) → **dipilih 1,25** dan dijadikan bawaan.

Efek pada wilayah (t=9,5): kepala +4,57 → **+1,22** · torso **+14,39 → +5,79** · lengan +6,33 → **+2,70**.

### 10.5 Paritas terhadap acuan segar
| | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 9,5 | rata-rata |
|---|---|---|---|---|---|---|---|
| produksi 4t | 1,13 | 2,01 | 1,92 | 2,85 | 3,09 | 6,58 | **2,93** |
| build 4u | 1,13 | 2,01 | 1,92 | 2,85 | 3,10 | **5,56** | **2,76** |

### 10.6 Gerbang lain (build 4u)
A **8/8** · B **10/10** · langkah 5 BAGIAN B **6/6** · hand BAGIAN B **8/8** · audio **9/9**.
Gerbang D **lokal** sengaja belum dijalankan ulang untuk 4u (akan dijalankan **terhadap produksi** setelah
paket terpasang — pelajaran W-3/W-4: validasi lokal saja menyesatkan).

### 10.7 Alat
- **S-6:** gerbang A/B/langkah5/langkah4c masih menunjuk port dev lama (5190/8802) → gagal
  "connection refused"; bawaannya kini `http://127.0.0.1:8804` (bisa ditimpa `BASE=`).
- `tools/sweep-knob.js` — sapu knob vs live + penilaian per wilayah, `--t` boleh diulang.
- `tools/sweep-matte.js` — kalibrasi penutup badan (F-142).
- `tools/metric3.py` — urutan acuan v4 → v3 → v2.

## 11. Revisi 4v — produksi 4u terverifikasi, gerbang dijalankan DI PRODUKSI, dan W-7 (sumber APEX hilang)

### 11.1 Produksi 4u lulus 3 lapis
Produksi `assets/index-DRPy0tD2.js` **`68e0b85c…`** · CSS `index-DQPaiuOr.css` **`6ad9d68a…`** · repo
`Niumination/mira-humanoid` head **`2fb3ed9`** · `npm ci` + `vite build` di tarball repo → **byte-identik**;
sumber repo = workspace (`MiraStage.tsx 714622f6…`, `picFill.frag.glsl f22e2a27…`, `sweep-knob.js 53df9d2e…`,
`metric3.py 00897957…`).

### 11.2 Semua gerbang dijalankan terhadap **URL produksi** (bukan lokal)
| gerbang | hasil di produksi 4u |
|---|---|
| D (D5–D9) | **7/7** — D5 reprod **0,0000** (live 0,0004/0,0128) · D6 1,50 vs live 1,48 · D7 **0,95 fps** vs live 0,52 · D8 4→92 frame err 0 · D9 390 **0,9912** (MAE 8,91) · 414 **0,9913** (8,70) |
| A (mode/entry) | **8/8** |
| B (82 slider/alias/localStorage) | **10/10** |
| langkah 5 B (aura/state/speed/replay) | **6/6** |
| langkah 6 B (tangan MediaPipe + MIC) | **8/8** |
| audio aplikasi | **9/9** |

Perhatikan D9: korelasi naik **0,9886 → 0,9912** dan MAE ponsel **10,80 → 8,91** — efek F-143 ikut terasa di
viewport ponsel. Ini bukti tambahan bahwa gamma 1,25 bukan sekadar mengejar satu angka desktop.

### 11.3 W-7: sumber APEX hanya tinggal di satu commit lama
`https://niu-humanoid.vercel.app/` masih hidup dan menyajikan `index-DyoQ8hKN.js` **`8dac8dad…`** +
`index-WDCbnnbD.css`, tetapi repo `Niu-Humanoid` **HEAD (`c370d66`) berisi aplikasi MIRA**, bukan APEX.
Penelusuran: berkas `public/humanoid/apex-idle-v1.webp` hanya disentuh **satu** commit — `369c8f5`
("Initial commit: APEX humanoid rebuild", 2026-10-29). Sejak MIRA masuk, sumber APEX **tertimpa**.

**Tindakan:** sumber APEX dipulihkan dari `369c8f5` ke `apex-humanoid-rebuild/` (3,2 MB, tanpa node_modules)
dan diverifikasi 3 lapis:

| lapis | hasil |
|---|---|
| produksi | `index-DyoQ8hKN.js` **`8dac8dad…`** · `index-WDCbnnbD.css` `1b66a34b…` |
| repo | commit **`369c8f5`** |
| build ulang | `npm ci` + `vite build` → **byte-identik** (kedua aset) |

⇒ **situs APEX masih bisa dibangun ulang**, asalkan paket ini dipakai untuk mengembalikan sumbernya
(saran: repo terpisah atau folder `apex/` — jangan menimpa root lagi).

### 11.4 Perbaikan alat
**S-7:** `gate-step5.js` memakai `page.waitForFunction(fn, {timeout: 90000})` — argumen kedua adalah
*argumen fungsi*, bukan opsi, jadi batas waktunya tetap 30 s dan uji pin `?talk/&listen/&voice` gagal di
produksi Vercel yang lebih lambat. Diperbaiki (`null, {timeout: 90000}`) → **6/6 di produksi**.

## 12. Revisi 4w — laporan Hermes diverifikasi, dan Gerbang C sisa torso dikejar dengan dua tuas baru

### 12.1 Klaim Hermes diperiksa satu per satu (semua LULUS)
| klaim | cara saya periksa | hasil |
|---|---|---|
| repo baru `Niumination/apex-humanoid-rebuild` dibuat, commit `a5535a0` | `GET /repos/...` + tarball commit itu | ada, dibuat 2026-11-11T18:03Z, 12 berkas kunci **sha256 sama** dengan `apex-humanoid-rebuild/` di workspace |
| "clone fresh + build → `index-DyoQ8hKN.js` `8dac8dad…`" | `npm ci && vite build` di tarball commit `a5535a0` | **`8dac8dad…`** + CSS **`1b66a34b…`** = produksi `niu-humanoid.vercel.app` ⇒ byte-identik |
| MIRA repo `3d3abcb`, Niu repo `eb4144b` | API + tarball | `MiraStage.tsx 714622f6…`, `gate-step5.js 854d2f38…` (memuat S-7), `DELIVERABLE.md 4b5318dc…` = workspace |
| "gambar tak berubah, tanpa deploy" | `curl` kedua situs + sha256 aset | MIRA `index-DRPy0tD2.js` `68e0b85c…` · APEX `index-DyoQ8hKN.js` `8dac8dad…` — tidak berubah |

### 12.2 Tuas baru #1: F-145 — tekstur rambut tanpa mipmap
Alasan: detail frekuensi tinggi di crop torso kita **22,2** vs live **25,5** (rerata |Laplacian|), jadi selisihnya
bukan hanya terang. `?nh=1` (rambut & tekstur terangkat tanpa mipmap) diuji pada **5 fase**:

| t | 6,8 | 8 | 9,5 | 11 | 13 |
|---|---|---|---|---|---|
| `nh=0` | 2,959 | 5,755 | 5,298 | 5,488 | 5,853 |
| **`nh=1`** | **2,948** | **5,681** | **5,210** | **5,424** | **5,806** |
| detail kita (nh=1) vs live | 26,2 / 23,6 | 23,1 / 23,8 | 25,9 / 25,5 | 26,4 / 25,9 | 26,5 / 25,9 |

Menang di **5 dari 5 fase** (tanda seragam ⇒ bukan derau) ⇒ dijadikan **bawaan**.

### 12.3 Tuas baru #2: F-146 — potongan bloom fase lambat bisa disapu (`?blt=`)
Kelebihan torso kita **tumbuh terhadap waktu** (Δtorso: 6,8 → +2,6 · 8 → +4,3 · 9,5 → +3,4 · 11 → +6,5 · 13 → +8,3)
dan menurunkan plato `?bg=` menolong **hanya** sesudah t>10 (t=9,5: bg 1,5 → 5,291 vs bg 0,7 → 5,491 = memburuk).
Jadi potongan fase lambat (dulu tetap 0,15) dibuat bisa disapu:

| `?blt=` | 0,15 | 0,35 | 0,55 | **0,8** | 1,1 | 1,5 |
|---|---|---|---|---|---|---|
| t=11 | 5,268 | 5,183 | 5,134 | **5,090** | 5,172 | — |
| t=13 | 5,853 | 5,749 | 5,660 | **5,567** | 5,567 | 5,628 |
| t=10 | 5,083 | — | — | 5,083 | 5,088 | — (gerbang 10,2 ⇒ tidak tersentuh) |

Dipilih **0,8** (1,1 seri di t=13 tetapi kalah di t=11).

### 12.4 Hasil paket 4w
| ukuran | produksi 4u | build 4w |
|---|---|---|
| paritas 6 fase (acuan v4) | 2,76 | **2,74** (t=9,5 5,56 → **5,45**) |
| t=11 | 5,488 | **5,090** (−0,40) |
| t=13 | 5,853 | **5,567** (−0,29) |
| Gerbang D lokal | 7/7 | **7/7** (D6 1,43 vs live 1,46 · D9 390 **0,9906**, 414 **0,9908** · MAE 8,79/8,51) |
| A · B · langkah 5 · audio | 8/8 · 10/10 · 6/6 · 9/9 | **8/8 · 10/10 · 6/6 · 9/9** |

### 12.5 Catatan kejujuran
- Dua tuas ini **tidak** menutup torso; sisa Δtorso masih +2,0…+8,0 tergantung fase. Yang berubah: detail
  kita kini setara live dan kelebihan fase lambat berkurang.
- Gerbang D di atas dijalankan **lokal** untuk build 4w; setelah paket terpasang saya jalankan **di produksi**
  (aturan W-3/W-4).

## 13. Revisi 4x — W-8: gambar kita TIDAK benar-benar deterministik saat `?t=` dipin

### 13.1 Produksi 4w lulus 3 lapis + gerbang produksi
Produksi `assets/index-H7qR2EeI.js` **`9c31ce15…`** · CSS `6ad9d68a…` · repo `4b9d7a2` · build ulang di tarball
repo = **byte-identik**; `MiraStage.tsx dbabdf5f…`, `capture.js aa21290c…`, `sweep-torso.js e86b8188…` = workspace.
Gerbang D di produksi **7/7** — tetapi D5 t=11,5 keluar **0,1165 (20.432 piksel)** padahal sebelumnya 0,0000.

### 13.2 W-8: tiga sumber ketergantungan-jumlah-frame
Gerbang D lolos ambang, tetapi klaim "reprodusitas 0,0000" **tidak sah** kalau nilainya berubah-ubah. Terukur
berturut-turut pada build 4w: t=11,5 → 0,1165 · 0,0699 · 0,0000; D9 414 → 0,3181. Penyebabnya tiga hal yang
masih bergerak tiap frame saat `?t=` dipin:

| # | sumber | bukti | perbaikan |
|---|---|---|---|
| W-8a | jam sekunder `animClock = min(animT, 0,2)` — `animT` **dihitung dari jumlah frame** | diganti `?ac=` → 0,1 terbaik (t=11,5 5,198→5,175 · t=9,5 5,051→5,020), bawaan 0,1 | konstan saat dipin |
| W-8b | percikan pita `updateWaveSparks(…, 0,0166, …)` tetap maju 16,6 ms tiap frame | `?sd=` → 0 saat dipin | dibekukan saat dipin |
| W-8c | pose kepala dihaluskan dari 0 tiap frame | tangkapan **pertama** 0,0553 vs berikutnya 0,0000 | dihangatkan 240 iterasi saat frame pertama bila dipin |

### 13.3 Hasil
| uji | sebelum | sesudah |
|---|---|---|
| reprod t=11,5 (3 tangkapan, termasuk cold start) | 0,1165 / 0,0699 / 0,0553 | **0,0000 / 0,0000 / 0,0000** |
| reprod t=9,5 · t=8 | 0,0000 | **0,0000** |
| D9 390 / 414 reprod | 0,0000 / 0,3181 | **0,0000 / 0,0000** |
| paritas 6 fase | 2,74 | **2,72** (t=9,5 5,45 → **5,31**) |
| Gerbang D lokal | 7/7 | **7/7** |
| A · B · langkah 5 · audio | — | **8/8 · 10/10 · 6/6 · 9/9** |

**Pelajaran metodologi baru:** gerbang reproduktibilitas harus dijalankan **tiga kali termasuk cold start** —
dua tangkapan berurutan bisa sama karena cache hangat, menyembunyikan transien.

## 14. Revisi 4y — produksi 4x diverifikasi penuh, dan Gerbang C akhirnya terjelaskan angka

### 14.1 Produksi 4x lulus 3 lapis + semua gerbang DI PRODUKSI
Aset `assets/index-BSvMDaTx.js` **`d6d6b2e5…`** · CSS `6ad9d68a…` · repo **`9a2d8db`** · build ulang di tarball
repo = **byte-identik**. Gerbang dijalankan terhadap URL produksi:

| gerbang | hasil |
|---|---|
| D (D5–D9) | **7/7** — D5 t=8 **0,0000** · t=11,5 **0,0000** · D6 1,43 (live 1,46) · D7 0,80 fps (live 0,51) · D8 3→93 frame err 0 · D9 390 **0,9904** MAE 8,73 · 414 **0,9906** MAE 8,55 — **reprod 0,0000 di semua viewport** (sebelumnya 414 pernah 0,3181) ⇒ W-8 terbukti di produksi |
| A · B · langkah 5 · langkah 6 · audio | **8/8 · 10/10 · 6/6 · 8/8 · 9/9** |

### 14.2 Di mana sebenarnya sisa selisih torso berada (analisis piksel)
Crop torso t=9,5 (ambang sama di kedua aplikasi):

| ukuran | nilai |
|---|---|
| korelasi kita vs live | **0,969** · kemiringan regresi 0,987 |
| MAE torso | 9,34 · rerata Δ **+3,26** · simpangan 16,55 |
| piksel yang di live **gelap (<20)** | 16 % piksel, kita **+9,2** lebih terang |
| piksel yang di live **terang (>180)** | kita **−1,9** lebih gelap |

⇒ kita tidak "terlalu terang" merata: kita **kehilangan kontras di celah gelap** dan sedikit kurang di puncak.
Ablasi per lapisan untuk celah gelap: `off=hair` +7,7 · `off=lines` +8,7 · `off=matter` +9,2 · `off=waves` +8,7 —
**tidak ada satu lapisan pun** yang menjadi sumbernya (`off=bloom` di live tidak bisa dipakai: mengubah seluruh
encode, MAE 36).

### 14.3 Tiga tuas diuji, tiga-tiganya GUGUR (dengan angka)
| tuas | uji | hasil |
|---|---|---|
| F-147 peredupan torso bergerbang waktu `?tv=` | t=11,5: 0 / 0,2 / 0,35 / 0,5 | Δtorso turun (4,78 → 0,96) **tetapi MAE naik** (5,359 → 5,758) ⇒ yang salah bukan kecerahan |
| kecerahan seluruh figur `?gm=` (gamma komposit) | t=9,5: 1 / 1,1 / 1,2 / 1,35 | MAE 4,89 → 5,48 → 6,48 → 7,91 ⇒ **memburuk** |
| **F-148 penutup siluet** (occluder dari alfa citra, blur+ambang) | t=9,5: `?ock=` 0 / 0,4 / 0,7 / 1,0 | torso kita jatuh ke **16,9** padahal live **80,0** |

**Kesimpulan besar dari F-148:** terang torso kita **~80 % berasal dari nebula yang menembus badan**, bukan dari
gambar. Begitu latar ditutup, badan kita tinggal 17 dari 80. Artinya live menerangi badan dengan **mesh 3D**-nya
sendiri (permukaan gelap + rim + bloom), dan itulah bagian yang belum kita port. Ini bukan lagi soal knob —
ini **langkah 8 lanjutan: port mesh badan**.

### 14.4 W-9 (jebakan alat, bukan bug produk)
Saat menguji F-148: siluet diikat ke unit tekstur 0 membuat **seluruh badan hitam**, karena pass kuad warna gambar
memakai tekstur yang masih terikat di unit 0. Siluet harus di unit 1. (Kode uji sudah dibuang; `dist` dikembalikan
**byte-identik** dengan produksi `d6d6b2e5…`.)

### 14.5 Usulan langkah berikutnya (satu langkah penuh, bukan knob)
Port **mesh badan + kepala** dari live: siluet gelap bertekstur (occluder sudah siap sebagai basis), rim-light
dari tepi, lalu bloom di atasnya. Target terukur: piksel gelap torso dari +9,2 → ≤ +2, piksel terang dari −1,9 → ±0.
