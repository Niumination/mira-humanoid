# Langkah 5 — state machine, *Her states*, SPEED & REPLAY (sesi 41)

Verifikasi paket 4m lebih dulu, lalu langkah 5 diport dan diuji. Semua angka di bawah keluaran
alat (`tools/gate-step5.js`).

## 0. Verifikasi paket 4m (klaim “sudah diterapkan”)

| yang diperiksa | hasil |
|---|---|
| situs produksi | menyajikan `assets/index-nbTSOwn5.js` |
| `sha256` berkas produksi | **`feaaf85acd203afb51efb81a844d4fc953b8ce3d7323fe892cc28f7ca8c3b50f`** = build 4m lokal (identik) |
| head repo `Niumination/mira-humanoid` | **`334f054`** — “langkah 4m (sesi 40): mesin audio MIRA diport verbatim” |
| blob 4 berkas di repo | `miraAudio.ts 1f4677b…` · `miraSoundCues.ts d453dbb…` · `MiraStage.tsx ac6cc05…` · `HumanoidMode.tsx e90d712…` — **semuanya identik** dengan workspace |
| audio di **produksi** (`tools/gate-step4c.js BASE=https://mira-humanoid-niu.vercel.app/`) | **9/9** — state `running` · 36 cue · skor 12,550 s · RMS master 1,85·10⁻¹ · SOUND OFF → 0,00 · ON → 1,26·10⁻¹ · bolt 1,51·10⁻¹ |

## 1. Yang diport (`src/lib/miraAura.ts`)

| live | kita | isi |
|---|---|---|
| `Rn` / `Ul()` | `aura()` | `{mira, orb, matter, routes, live, voice, talk, listen, pace}` |
| `Aw()` | `setPace()` | pace hanya 0,2…6 selain itu 1 |
| `QU()` | `updateAura()` | pelunakan per detik dengan koefisien verbatim: voice 28/7 · talk 10/2,2 · listen 4 · `dt` dijepit 0,1 · nilai < 0,01 → 0 |
| `bw()` | `pinAura()` | pin dari URL `?talk=`/`?listen=`/`?voice=` |
| `Rw()` | `setPresence()` | `mira/orb/matter` dijepit 0…1; `null` hanya mengosongkan bila sebelumnya pernah diisi (flag `qy`) |
| `up`/`$U`/`A_`/`Cw` | `setLevel`/`level`/`clearLevel` | kanal level keluaran (mic/voice) |
| `GN()` | `herStateParams()` | pembaca 4 param *Her states* |
| `tx()`/`VN()` | `herSpeedBright()` | `speed = 1+(talkSpeed−1)·t+(listenSpeed−1)·n` · `bright = 1+(talkBright−1)·t·(0,7+0,6·voice)+(listenBright−1)·n`, `n = listen·(1−t)` |
| `Kk()` | `touchRate()` | sentuhan: `1+1,5·e^{−Δ/0,6}` untuk Δ∈[0,3) |
| `PF()` | `talkLevel()` | level bicara prosedural (dipakai bila MIC mati) |

**4 param *Her states*** (dari `recon/mira-params.json`, grup “Her states”):

| key | min | maks | step | default |
|---|---|---|---|---|
| `hum.state.talkSpeed` | 1 | 4 | 0,05 | **2** |
| `hum.state.talkBright` | 1 | 2,5 | 0,05 | **1,35** |
| `hum.state.listenSpeed` | 1 | 4 | 0,05 | **1,5** |
| `hum.state.listenBright` | 1 | 2,5 | 0,05 | **1,15** |

## 2. Penyambungan ke aplikasi

`MiraStage` (prop baru `state`, `dial`, `speed`, `replayKey`, `pinTime`):
* tiap frame: status + level → `updateAura` (di `HumanoidMode`), lalu `herSpeedBright` → `Ee`;
  `setPace(Ee.speed)`; `setPresence(ramp)` (sumber sama dengan `rampAt`).
* jam: `clockT += dt · Ee.speed · touchRate(...)`; `t` = `clockT · speed` (SPEED).
* `Ee.bright` mengalikan: `uGain`/`uPulse` garis (`×0,95`, `×0,7`), `uGain` gambar, `uPulse` helai.

`HumanoidMode`:
* loop RAF: `state==='talking'` → `setLevel('output', …)`, selain itu `clearLevel` → `updateAura(dt,{energy,speaking,listening})`.
  MIC ON memakai level mikrofon nyata; MIC OFF memakai `talkLevel(t)` prosedural (persis live `PF`).
* penjepit `micOn`/`state` dirapikan: `useEffect` lama diganti loop ini.
* **SPEED** → mengalikan jam panggung; setiap perubahan memanggil `stopCues()` (live: `vd(MIRA_BUILD,{stop:true})`).
* **REPLAY** → `replayKey+1` (jam mulai ulang) + skor cue diputar dari 0.
* `?t=` diteruskan ke panggung sebagai `pinTime`.

## 3. Gerbang D langkah 5 (`tools/gate-step5.js`)

### A. Paritas modul vs live (Node, `aura-live.mjs` diekstrak verbatim oleh `tools/ekstrak-audio-live.py`)

| # | pemeriksaan | hasil |
|---|---|---|
| 1 | respons aura talk/listen/voice (5 rangkaian langkah, 205 langkah total) | selisih maks **0,00e+0** |
| 2 | pemusnahan nilai < 0,01 | live `0,000000/0,913648` = kita `0,000000/0,913648` |
| 3 | pin URL (`bw`) & pace (`Aw`: 0,1→1 · 3→3 · 9→1) | sama |
| 4 | `Rw`: jepit 0…1 (`0,4/1,7/−1` → **0,4/1/0** kedua sisi) + aturan `qy` (`null` sebelum diisi tidak mengubah apa pun) | sama |
| 5 | `VN()` — **486 kombinasi** (3·3·3·3 param × 6 status) | selisih maks **0,00e+0** |
| 6 | `Kk()` sentuhan & `PF()` level bicara | **0,00e+0** |

**6/6 LULUS** · jejak lengkap: `verification/mira/gate-step5-trace.json`

### B. Di aplikasi (Chromium, build lokal)

| # | pemeriksaan | hasil |
|---|---|---|
| 1 | TALKING menaikkan `talk` | 0,000 → **1,000** |
| 2 | LISTENING menaikkan `listen` | 0,000 → **0,417** |
| 3 | pin `?talk=0,8&listen=0,25&voice=0,6` | dipakai apa adanya (0,8 / 0,25 / 0,6) |
| 4 | SPEED 0,3× memperlambat jam | Δ1× 0,150 s vs Δ0,3× 0,045 s → **rasio 0,300** |
| 5 | REPLAY mengulang jam dari 0 | t 0,05 → 0,10 |
| 6 | tanpa error halaman | ✅ |

**6/6 LULUS**

### C. Efek visual terukur (bukan “kelihatan lebih terang”)

| pengukuran (build lokal, `?t=8,0`) | angka |
|---|---|
| idle vs `?state=talking` | MAE **4,61** · puncak 141 · **539 266** piksel berubah · terang 53,16 → **57,61** (+8,4 %) |
| `talkBright=1,0` vs `2,5` saat berbicara | MAE **18,34** · terang 53,19 → **71,52** (+34 %) |

### D. Tidak ada regresi

| pemeriksaan | hasil |
|---|---|
| build langkah 5 vs build 4m (sumber lokal, dua-duanya dirender sendiri) `?t=8,0` & `?t=11,5` | **MAE 0,0000** (identik) |
| gerbang audio D1 (`tools/gate-step4.js`) | **31/31** tetap lulus |
| Gerbang A (`gate-mira-a.js`) | **8/8** |
| Gerbang B (`gate-mira-b.js`) | **10/10** |

Catatan pengukuran: selisih yang tampak saat membandingkan **produksi** (0,039) ternyata derau
lingkungan — produksi lawan dirinya sendiri pun berbeda **0,037** antar dua render, sedangkan
render lokal deterministik (0,0000). Jadi bukan regresi.

## 4. Catatan lingkungan (penting untuk angka fps)

Chromium SwiftShader di sandbox menjalankan panggung **≈1 fps**. Karena live sendiri menjepit
`dt` per frame ke 0,05 s, jam build hanya maju ≈0,04–0,05 s per detik nyata di sini
(Δ 0,150 s per 4 s pada uji SPEED). Itu sebabnya uji SPEED diukur sebagai **rasio** dua jendela,
bukan laju absolut. Di peramban sungguhan angka ini 1,0 s/s.

## 5. Yang belum (langkah 6 dan sesudahnya)

* MediaPipe tangan: `hum.touch.wave`, `touchRate` (sudah diport & diuji secara fungsi, tetapi
  `touchT0` masih `−1e9` karena belum ada masukan sentuhan) — langkah 6.
* Mikrofon: tombol MIC sudah memakai level nyata bila diizinkan, tetapi pengenalan suara
  (`SpeechRecognition`, `mira-heard`) → langkah 6.
* `?listen`/`?talk` sudah ada (pin aura), `?state=` sudah ada; `?dial.` tetap jalan.
