# Langkah 4 — mesin audio MIRA (sesi 40)

Port **verbatim** mesin audio dari bundle live `recon/mira-2026-11-03.js` (region ≈ 1 102 600–1 123 600,
arsip `recon/audio-region.js`, 20 291 B) ke `src/lib/miraAudio.ts` + `src/lib/miraSoundCues.ts`,
lalu disambungkan ke panggung/layar humanoid.

## 1. Isi yang diport

| Lapisan | Live | Kita | Keterangan |
|---|---|---|---|
| graph | `rh()` | `ensureAudio()` | comp −8/12/3,5/0,006/0,25 · `hg = vN·0,62` · `Dx` dry · `Ag` 3,2 s (exp 2,4) → `dg = gN` · `bg` 6,0 s (exp 1,7) → `pg = gN·1,15` · noise `fp` 2 s |
| kirim | `Yo()` | `bus()` | dry + dua send reverb |
| daftar voice | `Nr()` | `track()` | termasuk daftar khusus track (`_0` → `trackVoices`) |
| primitif | `oc`, `_o`, `U_`, `Vw` | `fmBlip`, `thump`, `noiseSweep`, `voice` | FM blip · thump · sapuan noise · 3 saw + formant + napas + sub + shimmer |
| drone | `xN`, `_N`, `yN` | `drone`, `loadingDrone`, `repeat` | fade 0,4 s saat stop |
| cue tunggal | `RN`, `CN`, `MN`, `PN`, `IN`, `wN`, `SN`, `EN`, `TN`, `AN`, `bN`, `DN` | `cueReady`, `cueNeedsYou`, `cueFailed`, `cueEnter`, `cueExit`, `bell`, `sn`, `VOICES`, `tn`, `swell`, `callRiser`, `assembly` | angka & jadwal sama |
| tabel cue | `LN`/`yd`/`NT` | `LN`/`cue()`/`stopCue()` | `loading`, `working` (2600 ms), `ready`, `needsYou`, `alert`, `failed`, `miraEnter`, `miraExit` |
| synth buffer | `mo`, `gg`, `$y`, `Xw`, `UN`, `Ww` | `syn`, `grains`, `sawSputter`, `swells`, `norm`, `Ww` | 6 strike (0,42 s) · burst 1,6 · thunder 3,2 · boom 6,5 · sizzle 2 · hum 2 |
| player | `wi`, `Pl`, `xd` | `playBuf`, `envPoints`, `cueWindow` | filter/pan/env |
| skor cue | `qw` (8 jenis) | `CUE_KINDS` | `hum`, `strike`, `gather`, `boil`, `needle`, `release`, `fill`, `ignite` |
| track | `FN`, `FT`, `kN`, `NN`, `Gk` | `playCues`, `stopCues`, `bolt`, `enable`, `cuesLength` | |
| unlock iOS | `ON`, `Od`, `Pg` | `primeUnlock`, `setRecording`, `unlockAudio` | WAV senyap 844 B + `audioSession` |
| pembangun skor adegan | `Vk()` | `buildCueTracks()` | `miraSoundCues.ts` |

## 2. Temuan (mengubah rencana lama)

1. **Tidak ada `createAnalyser` di graph audio live.** Satu-satunya analyser di bundle adalah
   analyser *mikrofon kamera* (langkah 6). Jadi butir rencana „audio graph 16 osc + 36 gain +
   analyser→uEnergy“ **dibatalkan**: live tidak punya jalur audio→`uEnergy`.
2. **MIRA tidak memancarkan `MIRA_ENTER`/`ASSEMBLY`.** Aplikasi MIRA hanya memancarkan
   `MIRA_BUILD` (skor cue, `stop` saat mount/unmount) dan `MIRA_BOLT` (klik/sentuh). Karena itu
   bunyi masuk humanoid berasal dari skor cue (gather/hum di t≈0), bukan `PN`/`DN`.
   `miraEnter`/`miraExit`/`assembly` tetap diport karena dipakai aplikasi APEX + diuji gerbang.
3. **Label tombol SOUND** di live = **status**, bukan aksi: `SOUND ${S ? 'OFF' : 'ON'}` dengan
   `aria-pressed = !S`, `S` berasal dari `localStorage.apex_sound_off === '1'`. Jadi default
   (tidak ada kunci) → label **SOUND ON**, `aria-pressed=true`. Sebelumnya kita terbalik; sudah dibetulkan.
4. **`Vk` memakai lebar citra sebagai skala**: `pan = clamp((x − star.x) / (0,75 · lebarCitra), ±0,9)`.
5. `boil`/`needle` bergantung pada `Math.random` → gerbang paritas wajib memakai PRNG ber-seed,
   kalau tidak jumlah node berbeda secara acak (bukan bug port).

## 3. Penyambungan ke aplikasi

`src/components/MiraStage.tsx`
* setelah `buildMatter(...)` → `onCues(buildCueTracks({arcs, particles, star, width: pic.width}))`.

`src/components/HumanoidMode.tsx`
* `primeUnlock()` + `unlockAudio()` saat mount; bila konteks belum `running` → `pendingRef`
  (tiruan `w.current` live) dan skor dijalankan pada `pointerdown`/`keydown` pertama;
* `playCues(cues, ?t= atau 0)` saat skor siap / suara dinyalakan / kecepatan 1;
* `stopCues()` saat unmount, saat SOUND OFF, saat kecepatan ≠ 1;
* `pointerdown` global → `bolt({ pan: x·0,8 })`, ambang 150 ms, diabaikan bila sasaran
  `button/input/select/textarea`;
* `localStorage.apex_sound_off` disimpan/dibaca, master gain di-ramp 0,12 s (`setSoundEnabled`).

## 4. Gerbang

### D1 — paritas pemanggilan (`tools/gate-step4.js`, Node + `AudioContext` tiruan, `tools/audio-mock.mjs`)

Live dan port dijalankan pada `AudioContext` tiruan yang mencatat setiap node, sambungan,
penjadwalan AudioParam, start/stop, dan checksum buffer; PRNG diganti `mulberry32` ber-seed
supaya urutan `Math.random` identik.

**Hasil: 28/28 LULUS** — untuk setiap skenario (graph, synth, 8 jenis cue, skor penuh, bolt,
semua cue tunggal, assembly) jumlah node per jenis, jumlah sambungan, jumlah start/stop, dan
multiset `jenis.namaParam.metode.nilai` **sama persis**.

| total (28 skenario) | live |
|---|---|
| oscillator | 194 |
| gain | 773 |
| bufferSource | 119 |
| stereoPanner | 96 |
| biquad | 54 |
| waveShaper | 25 |
| convolver | 2 |
| compressor | 1 |
| sambungan | 1 709 |
| start/stop | 604 |
| penjadwalan AudioParam | 777 |

### D2 — paritas spektrum (`tools/gate-step4b.js`, Chromium + `OfflineAudioContext`)

Setiap skenario dirender dua kali (live vs kita) dengan PRNG sama, lalu dibandingkan sampel
per sampel dan per pita spektrum (FFT 8192, Hann, 16 pita log).

Ambang lulus: MAE ≤ 1 % puncak · galat maks ≤ 3 % puncak · korelasi pita ≥ 0,999.

Hasil lengkap: `verification/mira/gate-step4b.json`.

| # | skenario | RMS live/kita | MAE | korelasi pita |
|---|---|---|---|---|
| 1 | graph idle | 0 / 0 | 0,0000 % | 1,000000 |
| 2 | synth buffer | 0 / 0 | 0,0000 % | 1,000000 |
| 3 | cue hum | 0,02269 / 0,02269 | 0,0000 % | 1,000000 |
| 4 | cue gather | 0,00031 / 0,00031 | 0,0000 % | 1,000000 |
| 5 | cue boil | 0,01904 / 0,01904 | 0,0000 % | 1,000000 |
| 6 | cue needle | 0,00292 / 0,00292 | 0,0000 % | 1,000000 |
| 7 | cue strike | 0,00564 / 0,00564 | 0,0000 % | 1,000000 |
| 8 | strike besar (thunder) | 0,01216 / 0,01216 | 0,0000 % | 1,000000 |
| 9 | cue release | 0,08414 / 0,08414 | 0,0000 % | 1,000000 |
| 10 | cue ignite | 0,00932 / 0,00932 | 0,0000 % | 1,000000 |
| 11 | cue fill | 0,00027 / 0,00027 | 0,0000 % | 1,000000 |
| 12 | **skor penuh (FN)** | 0,09866 / 0,09866 | **0,0000 %** | **1,000000** |
| 13 | skor penuh dari t=2,5 s | 0,10925 / 0,10925 | 0,0000 % | 1,000000 |
| 14 | bolt (kN) | 0,00651 / 0,00651 | 0,0000 % | 1,000000 |
| 15 | fmBlip default | 0,00364 / 0,00364 | 0,0000 % | 1,000000 |
| 16 | thump default | 0,00444 / 0,00444 | 0,0000 % | 1,000000 |
| 17 | noiseSweep default | 0,00060 / 0,00060 | 0,0000 % | 1,000000 |
| 18 | voice A Tripod | 0,05471 / 0,05471 | 0,0000 % | 1,000000 |
| 19 | voice B Leviathan | 0,05502 / 0,05502 | 0,0000 % | 1,000000 |
| 20 | cue alert | 0,01145 / 0,01145 | 0,0000 % | 1,000000 |
| 21 | cue ready | 0,01160 / 0,01160 | 0,0000 % | 1,000000 |
| 22 | cue needsYou | 0,00516 / 0,00516 | 0,0000 % | 1,000000 |
| 23 | cue failed | 0,00848 / 0,00848 | 0,0000 % | 1,000000 |
| 24 | cue miraEnter | 0,01995 / 0,01995 | 0,0000 % | 1,000000 |
| 25 | cue miraExit | 0,01088 / 0,01088 | 0,0000 % | 1,000000 |
| 26 | call riser (bN) | — | 0,0000 % | 1,000000 |
| 27 | assembly (DN) | 0,04835 / 0,04835 | 0,0000 % | 1,000000 |

**27/27 sampel-identik** (MAE 0,0000 %, galat maks 0,000 %, korelasi pita 1,000000).

Catatan penting: percobaan pertama gagal khusus pada dua skenario *skor penuh* (MAE 12,8 % dan 17,8 %,
korelasi pita 0,9999). Penyebabnya **bukan** port: `FN`/`playCues` milik live sendiri menambahkan
latensi wall-clock `(performance.now() − t)/1e3` ke `at`, sehingga hasilnya bergantung pada kecepatan
mesin. Harness membekukan `performance.now()` (adil untuk kedua sisi) → keduanya identik.
Artinya: pada mesin lambat live memang menggeser awal skor; port kita kini meniru perilaku itu.

### D3 — audio hidup di aplikasi (`tools/gate-step4c.js`, Chromium + build lokal)

| # | pemeriksaan | hasil |
|---|---|---|
| 1 | mesin audio hidup | state **running** |
| 2 | skor cue terbangun | **36 cue** |
| 3 | skor dijalankan | `started true` |
| 4 | panjang skor | **12,550 s** (= `Gk()` live: `ignite 6,55 + release 6`) |
| 5 | keluaran berbunyi (RMS bus master) | **2,55·10⁻²** |
| 6 | SOUND OFF membungkam master | **0,00** (dari 2,55·10⁻²) |
| 7 | SOUND ON menyalakan lagi | **1,01·10⁻¹** |
| 8 | klik panggung memicu bolt | **2,26·10⁻²** |
| 9 | tanpa error halaman | ✅ |

**9/9 LULUS.**

### D4 — tidak ada regresi piksel

`build-audio` vs **produksi build37** (`?t=` dipin): t=8,0 **MAE 0,0000** (identik), t=0,3 **0,0206**
(derau frame awal, di bawah 0,03 yang biasa terukur antar-render).

## 5. Yang belum (di luar langkah 4)

* `hum.touch.wave` (sentuhan memengaruhi suara) → butuh langkah 6 (MediaPipe).
* `SPEED`/`REPLAY` belum menggeser jam panggung → langkah 5.
* Mikrofon (`mira-mic`) → langkah 6; analyser kamera di live memang terpisah dari graph ini.
