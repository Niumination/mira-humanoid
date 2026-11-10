# Langkah 6 MIRA — tangan MediaPipe + mikrofon nyata

Status: **selesai, terukur** · build `dist/assets/index-DimN9-5N.js` sha256 `bc3c1ef0…`
Gerbang D langkah 6: **modul 8/8** (`gate-step6a.json`) · **aplikasi 6/6** (`gate-step6.json`)
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
