# REBUILD-LOG — catatan temuan, koreksi, dan deviasi

Semua yang menyimpang dari spec **dicatat di sini**, tidak disembunyikan.
Tanggal kerja: **2026-10-29** (Asia/Jakarta). Target belum dibangun: dokumen ini baru berisi temuan + keputusan.

---

## 1. Status fase

| fase | status | artefak |
|---|---|---|
| P0 normalisasi recon | ✅ selesai | `recon/*-index.clean.html`, `recon/verify-spec.py` (patch), audit checksum |
| P1 Fase 0 audit | ✅ selesai | `recon/asset-list.json`, `recon/asset-dims.json` |
| P2 Fase 1.1–1.2 | ✅ selesai | `recon/ui-copy.{apex,mira}.txt`, `recon/ui-copy.json`, `recon/css-inline.apex.txt` |
| P3 Fase 1.3 shader | ✅ selesai | `recon/shaders/` (26 APP + 124 vendor), `INDEX.md`, `CLASSIFY.json`, `resolve_shaders.py` |
| P4 Fase 1.4–1.5 | ✅ selesai | `recon/params-verified.md`, `recon/hooks.json`, `recon/hooks.md` |
| P5 Fase 1.6–1.7 | ✅ selesai | `recon/audio/`, `recon/timings.json` |
| P6 Fase 1.8–1.9 | ✅ selesai | `recon/ground-truth/` (73 artefak) + `README.md` |
| P7 Fase 2 | ✅ selesai | `recon/ARCHITECTURE.md` |
| P8 Fase 3 implementasi | ⬜ belum | — |
| P9 Fase 4 verifikasi | ⬜ belum | — |
| P10 deliverable | ⬜ belum | — |

---

## 2. Koreksi terhadap spec (bundle/live menang)

| # | Spec bilang | Kenyataan terukur | Sumber |
|---|---|---|---|
| K-1 | HTML live 646 B | arsip Drive 813 B karena **injeksi Cloudflare Rocket Loader** (`type="<hash>-module"` + `/cdn-cgi/scripts/…`) | `diff` arsip vs live |
| K-2 | `verify-spec.py` → 193/193, exit 0 | crash `NameError: sys`; sebenarnya **191/193** (2 gagal = blok HTML akibat K-1) | eksekusi skrip |
| K-3 | SPEC-APEX mendokumentasikan 18 hook | bundle punya **19**: ada `__HUM_BG_T` | regex `window.__` |
| K-4 | SPEC-MIRA mendokumentasikan 3 hook debug | bundle punya **20 query param APP** (termasuk `?off=`, `?t=`, `?dial.*`) + 2 global | `hooks.json` |
| K-5 | Gerbang B = 82 slider di DOM | **panel tidak dirender** di live (0 `input[type=range]`) | `ground-truth/mira/panel-mira.json` |
| K-6 | `?skip` melewati assembly | `?skip` hanya menggeser `t0`; readout `ASSEMBLING... NN%` tetap muncul | 5 shot state APEX |
| K-7 | `?auto` melewati entry | tidak; entry APEX hanya hilang setelah klik | 5 shot state APEX |
| K-8 | `STATUS: SPEAKING  INTENSITY: HIGH` | runtime: `STATUS: SPEAKING` (tanpa INTENSITY) | `S-speaking.json` |
| K-9 | Ambang Gerbang C 0% piksel > 32/255 | live-vs-live pada kondisi beku: **3,06%**, MAE 3,76 | `_repro-a/b.png` |

## 3. Temuan lapangan

**F-1** arsip HTML tercemar (lihat K-1) — diperbaiki: `*-index.clean.html` (646 B) + `verify-spec.py` dinormalisasi → **193/193, exit 0**.

**F-2** `verify-spec.py` crash (lihat K-2) — diperbaiki: `import sys` + normalisasi HTML.

**F-3** tidak ada drift artefak. `sha256` identik arsip vs live:

```
apex.js  5db1866887110e43b6d56212feb873095d5445fb6572917db942ed7ee17dc294   (1.108.884 B)
mira.js  8fe5c2f2bd861d7f0d022bc640cb06c318ed977bcd101bb0786e9a5e56bbe245   (1.185.588 B)
apex.css 5fb4bccac68818da674027ce742cbb54ef6e3807ecd7a7d5300efb917fab0842   (224 B)
mira.css b40f80353cb5a6fc0b07faca5a5d224ed99b10e6c71b9cc2ce8eef20cead4533   (574 B)
assets/*.webp — 10/10 identik dengan live
```

**F-4** gap dokumentasi MIRA: 20 query param APP vs 3 yang didokumentasikan (lihat K-4). **Ditutup** di `hooks.md`.

**F-5** sandbox tidak punya browser saat audit. **Ditutup**: Chromium 1134 + 9 paket apt dipasang (butuh `sudo`),
SwiftShader WebGL2 berjalan (`WebGL 2.0 (OpenGL ES 3.0 Chromium)`), render visual terbukti benar.

**F-6** `__HUM_BG_T` (lihat K-3). **Ditutup** di `hooks.md`.

**F-7** nol drift (lihat F-3).

**F-8** entry APEX wajib klik (lihat K-7).

**F-9** `?skip` bukan skip (lihat K-6).

**F-10** teks status "INTENSITY: HIGH" belum terbukti muncul (lihat K-8) → **U-1**.

**F-11** panel 82 slider tidak dirender (lihat K-5) → **U-10**, keputusan produk diperlukan.

**F-12** `?dial.<key>=<nilai>` + persistensi localStorage ditemukan. Ini **menambah** kemampuan uji Gerbang B
dan tidak ada di spec mana pun. Bukti: `for (const [X,j] of URLSearchParams) X.startsWith("dial.") && rN(X.slice(5), Number(j))`.

**F-13** `__HUM_FREEZE_T` **tidak** membekukan semua gerak APEX. Dua shot identik: `>8/255 = 5,21%`,
`>32/255 = 3,06%`, MAE 3,76, bbox 400..1132 × 34..862. Penyebab paling mungkin: `uT` dibekukan tapi
`__HUM_BG_T`, `uBoilT/uVeinT/uWaveT`, dan animasi CSS (`humRingBase/Pulse`, `fadeInOut`) tetap berjalan;
plus waktu *load* berbeda (backdrop/tekstur siap pada frame berbeda).
→ **Keputusan:** ambang Gerbang C untuk APEX = **baseline terukur live-vs-live** (bukan 0%). Baseline harus
diukur ulang setiap kali Gerbang C dijalankan, karena bergantung pada frame saat shot.

**F-14** state `strong` tidak bisa dipaksa via `?state=strong`.

**F-15** PRNG: APEX **deterministik** — Lehmer `x = x*16807 % 2147483647` dengan seed
`424171`, `48271`, `977231`, `51733`, `3311` (5 titik). MIRA **tidak**: 43 pemanggilan `Math.random()`,
banyak di region aplikasi → posisi partikel/garis MIRA tidak akan pernah bit-identik.

**F-16** Aset MIRA dipakai sebagai **mask**: `<img>` sumber `mira-idle-v1.webp` ber-`filter: brightness(0)` dan
`opacity: 0`; mesh memakai tekstur yang sama. `?off=cutwhite` mengganti filter ke `brightness(0) invert(1)`.

**F-17** Jumlah shader APP jauh lebih besar dari yang diperkirakan spec (yang hanya menampilkan 1 cuplikan):
APEX **4**, MIRA **26** (+ 11 belum bernama peran). Metode ekstraksi "regex satu template literal" di prompt
**gagal** — shader dirakit lewat konkatenasi (`A+B+C+…`) dan sebagian dihasilkan programatik.
Lihat `recon/resolve_shaders.py`.

**F-18** Timing APEX ditemukan sebagai dua tabel literal: `Rs={total:7.4, ignition:6.2, hornPeak:6.2+3.2*.19}`
dan `TE={full:{con:.34, chk:1.55, thr:5.35, call:5.92, set:10.1, end:13.1}}`.
Crossfade state = **950 ms** (`dur:.95`), bukan 140/900 ms saja.

---

## 4. Deviasi yang diterima (akan dibawa ke `VERIFICATION.md` nanti)

| # | deviasi | alasan | bukti |
|---|---|---|---|
| D-1 | Gerbang C APEX tidak bisa 0% | live sendiri tidak reproducible (F-13) | `_repro-a/b.png` |
| D-2 | Area prosedural MIRA tidak bit-identik | `Math.random()` (F-15) | 43 call-site |
| D-3 | Panel MIRA: keputusan belum diambil | live tidak merender panel (F-11) | DOM runtime |

---

## 5. `// UNVERIFIED` yang masih terbuka

Daftar lengkap: `recon/ARCHITECTURE.md` §11 (U-1 … U-10).
Ringkas: U-1 teks INTENSITY · U-2 state strong · U-3 fungsi persen assembly · U-4 nilai SPEED ·
U-5 11 shader tanpa nama · U-6 arti `?voice/?talk/?listen` · U-7 daftar state valid MIRA ·
U-8 3 class CSS tak terpakai · U-9 PRNG MIRA · U-10 keputusan panel.

---

## 6. Sesi lanjutan — penutupan UNVERIFIED + Fase 3 langkah 1

**U-1, U-3, U-4, U-7 TERTUTUP** (detail: `recon/UNVERIFIED-CLOSED.md`):

- U-1: `STATUS: SPEAKING  INTENSITY: HIGH` muncul hanya bila `state === "speaking"` **dan** energi audio `> 0.58`
  (dipoll tiap 180 ms). Bukan dari `__HUM_ENERGY` → perlu audio nyata.
- U-3: readout awal `ASSEMBLING... 25%`, update tiap **160 ms**, `Math.min(99, Math.round(p*100))`,
  kosong saat p≥1; efek dilewati bila `prefers-reduced-motion: reduce` **atau** `__HUM_SKIP_ASSEMBLY`.
- U-4: `SPEED` hanya dua nilai, **1** ⇄ **0.3**.
- U-7: `Jw = [["idle","IDLE"],["listening","LISTENING"],["talking","TALKING"]]` → 3 state.

**Koreksi kunci waktu (menggantikan F-8/F-9):**

- **F-19** `?skip` **INERT** di build live: `window.__HUM_SKIP_ASSEMBLY` tetap `undefined` sebelum & sesudah klik,
  walaupun baris `i.get("skip")&&(window.__HUM_SKIP_ASSEMBLY=!0)` ada di bundle. `?bgrest` & `?surge` bekerja normal.
  → Rebuild tetap mengimplementasikan perilaku *kode* (bukan bug runtime), dicatat sebagai deviasi perilaku.
- **F-20** `prefers-reduced-motion: reduce` **melewati assembly sepenuhnya** → `STATUS: IDLE` langsung.
  Ini kunci terbersih untuk screenshot state; `?asmel=<t>` terbukti **membekukan** timeline (bukan sekadar memotret).

**Fase 3 langkah 1 (entry screen) — LULUS:**

- Gerbang A: 0 diff teks, 0 diff gaya, 0 diff bbox (>1 px), di 1440×900 dan 390×844.
- Gerbang C: **0% piksel beda > 8/255** dan **MAE 0,0000** di kedua viewport; baseline live-vs-live juga 0.
- Repo: `apex-humanoid-rebuild/` (Vite + React 18.3.1 + TS), `tsc --noEmit` bersih, dev server port 5180.
- Bukti mentah: `verification/entry-report.json`, `verification/entry/<viewport>/{live-a,live-b,live-c,local}.png`.

---

## 7. Sesi lanjutan — Fase 3 langkah 2 (aset + komposisi statis)

**F-21 — geometri komposisi APEX (terukur, bukan asumsi):**
kanvas komposisi live = **900×900 device px** di rect `x=270,y=0,w=900,h=900`, `object-fit: fill`.
Plate internal = **900 × 959** (`round(900 · 1295/1215)`), lalu **di-stretch** ke 900×900.
Uji hipotesis: stretch → `>32 = 0,30 %`; center → 17,15 %; top → 21,96 %; bottom → 22,11 %.
Kode `Im()` hasil ekstraksi cocok dengan pengukuran ini.

**F-22 — backdrop `opacity` = 0 pada state idle/thinking.**
`<img backdrop-v1.webp>` ada di DOM (rect penuh, `object-fit: cover`) tapi transparan; ia menyala hanya
saat energi audio > 0,58 (timer 180 ms yang sama dengan teks `INTENSITY: HIGH`).
Akibat penting: **seluruh HUD APEX tidak tampil** di screenshot live manapun yang kami rekam
(tidak ada `Open hand gesture`, baris state, `MIC/REPLAY/SOUND`, `STATUS`) — termasuk tombol
`Open camera now`/`Close camera`/`Finger tracking is on` yang belum pernah muncul di runtime.

**F-23 — `?skip` di rebuild vs live.** Rebuild mengimplementasikan perilaku *kode* (`__HUM_SKIP_ASSEMBLY`
di-set, assembly dilewati), sedangkan live tidak bereaksi (F-19). Ini deviasi yang **disengaja**:
kita setia pada kode sumber yang terbaca, bukan pada bug runtime. Dicatat di `VERIFICATION.md`.

**F-24 — kunci waktu resmi Gerbang C = `prefers-reduced-motion: reduce` + klik ENTER.**
Bukan `?skip`, bukan `?asmel`. Dipakai di semua shot langkah 2.

**Hasil langkah 2:** geometri identik; `idle` 0,111 % dan `speaking` 0,164 % piksel beda > 32/255
(setelah area HUD dikeluarkan); sisa selisih teratribusi: HUD (langkah 7), animasi partikel (langkah 3),
layer `listeningRings`+`surge` (langkah 3/5).

---

## 8. Langkah 3 — timeline birth (7,4 s)

**File baru:** `src/lib/birth.ts` (sebelumnya; timeline + `CU()`), `src/lib/veins.ts` (`bU()`),
`src/lib/core.ts` (`LU()` + `F()`), `src/lib/edge.ts` (`AU()` + `PU()` + `at()`).

| # | temuan | dampak |
|---|---|---|
| F-25 | `F()` adalah **flare inti dada** (`(W·.5, H·.94)`, radius `min(W,H)·.034`, `lighter`, 240 mote) dan dipanggil **hanya di cabang birth** — bukan saat idle. | t=1 s 1,45 % → 0,56 % |
| F-26 | `CU()` diberi **`bU(idle)`**, bukan webp. `bU()` meredupkan haze (`×.24`) → jumlah piksel `>95` berubah → `m=l.length/f` berubah → deret LCG (seed 977231) bergeser seluruhnya. | t=3 s 5,03 % → 0,88 % |
| F-27 | Napas plate (`1+sin(Pe·.95)·.0035`) + goyangan mote memakai **waktu nyata `Pe`**, tidak ikut beku oleh `__HUM_ASM_EL`. Parameter `t` dan `phase` harus dipisah. | t=6,5 s 3,75 % → 1,43 % |
| F-28 | Edge particles `at()` aktif sejak 60 % timeline (`AU()` 384×384 + `PU()` seed 51733, 380 partikel). Loop build harus tetap menggambar tiap frame saat waktu dibekukan. | paritas fase |
| F-29 | Sisa t=6,5 s (1,06 %) = misregistrasi sub-piksel (blur 1 px → 0,59 %), bukan cacat struktur. | dicatat, bukan disembunyikan |

**Hasil langkah 3:** teks `ASSEMBLING... 14/41/94/99 %` identik di semua titik; kanvas-only `>32` = 0,039 / 0,032 /
0,123 / 1,056 % untuk t = 1 / 3 / 5 / 6,5 s (baseline live-vs-live 0,036 / 0,034 / 0,037 / 0,220 %).

---

## 9. Langkah 4 — audio graph

**File baru:** `src/lib/audio.ts`, `src/lib/cues.ts`. **Deviasi sadar:** `React.StrictMode` dilepas di `main.tsx`.

| # | temuan | dampak |
|---|---|---|
| F-30 | Hook bus APEX setengah mati: `PE()` tidak memasukkan momen ke `d1`, `onEnter` tak pernah dipanggil → `working` loop tak pernah mulai, `bE(false)` tak bisa menghentikan loop. | port setia; bukan "diperbaiki" |
| F-31 | StrictMode (dev-only) menjalankan effect 2× → 2 AudioContext + cue ganda (250 vs 125 osilator). | StrictMode dilepas |
| F-32 | Cue birth dijadwalkan terhadap `TE.full` (`thr 5.35`, `call 5.92`), bukan `Rs.total` (7,4 s). Peluit 2900→3280 berada di 5,35–5,92 s. | jadwal cue benar |

**Hasil langkah 4:** paritas API runtime live vs rebuild **9/9 identik** (125 osilator, 272 gain, 7 filter,
2 buffer, 18 waveshaper, 2 convolver, 3 panner, 0 analyser, 1 compressor); puncak spektrum semua cue
di dalam ±3 % (terbesar 1,9 % pada formant 1150 Hz).

---

## 10. Langkah 5 — state + mic

**File baru:** `src/lib/render.ts`, `src/lib/mic.ts`. **Loop tunggal** di `HumanoidMode` (birth → steady).

| # | temuan | dampak |
|---|---|---|
| F-33 | `r.current.idle` DIGANTI `bU(idle)` → plate steady + dasar `Im()` semua state memakai kanvas haze-redup. | 0,433 % → **0,014–0,024 %** |
| F-34 | `strong` bukan state: `Pm()` memetakannya ke idle; strong hidup hanya lewat `strongMix`. | `?state=strong` = IDLE di kedua sisi |
| F-35 | reduced-motion: `ne.p=1` (tanpa crossfade) + `if (He) return` pada core/edge particle. | dipakai sebagai kunci waktu gerbang C |
| F-36 | `energy *= .92` per frame (bukan per detik) — verbatim, frame-rate dependent. | dipertahankan apa adanya |
| F-37 | `JU()` mengembalikan string mentah; normalisasi di `Pm()`. | alias SPEAK/process benar |

**Hasil langkah 5:** teks state 8/8 identik (termasuk 3 alias); piksel 0,014/0,023/0,024/0,023 %
(baseline live-vs-live 0,000 %); durasi crossfade 950/750/1250 ms vs konstanta 950/700/1200 ms
(semua dalam satu bingkai `dt`-clamp 50 ms).

---

## 11. Langkah 6 — hand tracking

**File baru:** `src/lib/handTracking.ts`, `src/components/HandTracker.tsx`.

| # | temuan | dampak |
|---|---|---|
| F-40 | Dua jalur MediaPipe: worker blob (CPU, frame 256×192, ≥80 ms) lalu fallback `import()` (GPU, 125 ms). Satu-satunya teks galat: `camera unavailable`. | port apa adanya |
| F-41 | Klik kamera bertingkat: klik-1 `oe(!0)` = "menyiapkan" (label → `Open camera now`), klik-2 `re(Q=>!Q)` baru menyalakan. | sempat salah (langsung menyalakan) → dibetulkan |

**Hasil langkah 6:** teks galat identik saat kamera ditolak; label/aria tombol identik;
7/7 uji ambang gesture lulus (pinch rapat/lebar, telapak buka/tutup + jeda 1500 ms, snap dalam/ luar jendela).

## 12. Langkah 7 — HUD + hook

**File baru:** `src/lib/hooks.ts`. **Tambahan HUD:** ring image (`toBlob` listeningRings), glow "horn",
backdrop visibility, debug bar 7 tombol.

| # | temuan | dampak |
|---|---|---|
| F-38 | Hook `__HUM_*` = **18**, bukan 19 (hooks.md salah hitung; `__HUM_FORCE_2D` luput karena angka). | daftar hook = 18, semua terbaca |
| F-39 | `__HUM_FREEZE_T` di bundle hanya mengunci uniform shader. Diperluas (sadar) untuk mengunci seluruh jam animasi 2D. | gerbang C mendapat kunci waktu yang benar-benar deterministik |
| F-42 | 13 dari 18 hook shader-only (tidak punya sasaran di jalur 2D). | didokumentasikan, bukan diabaikan |

**Hasil langkah 7:** label debug bar 7/7 identik dengan live; 18/18 hook terbaca; freeze: selisih bingkai
0,000 vs 4,14 saat dilepas; 0 error konsol.

## 13. Langkah 8 — bloom: scope sebenarnya (temuan besar)

Pengukuran steady-state tanpa reduced-motion: **live vs rebuild 26,46 %**, tetapi **live `?nobg=1` vs
rebuild 3,08 %** (baseline animasi live-vs-live 3,29 %). Jadi 25 % dari selisih itu = **komponen backdrop
WebGL `xU`** (lanskap prosedural + petir + debu; di sanalah `uBloomR`, `uRest/.22`, `uPulse/2.6`,
`uWave`, `uMap` hidup). Bloom **tidak** terpisah dari komponen itu.

Konsekuensi: langkah 8 = port `xU` + bloom-nya. Semua gerbang C sebelumnya lolos karena kunci waktu resmi
(`prefers-reduced-motion`) mematikan komponen itu di live — bukan karena kebetulan.

---

## 14. Langkah 8 — backdrop xU diport; sisa selisih = pipeline partikel GPU

**File baru:** `src/lib/backdrop.ts` (`vU` geometri + shader `mU`/`gU`), `src/components/Backdrop.tsx` (`xU`/`_U`/`yU`).

| # | temuan | dampak |
|---|---|---|
| F-43 | `uSizeK` di bundle `max(.6, r.height/1020)` — `r.height` r3f **bukan** tinggi CSS. Diukur dari uniform live di 3 viewport ⇒ `1,6·min(vw,vh)/1020`. | ukuran titik latar kini identik |
| F-44 | three.js menyuntik `precision` + `<colorspace_fragment>`; di WebGL murni keduanya harus ditulis manual. | shader identik secara numerik |
| F-45 | Figur humanoid di live = **point cloud GPU 274.799 titik** (`drawArrays` 274799) + bloom pass; bukan bagian dari langkah "bloom". | sisa selisih 23–26 % tidak bisa ditutup oleh langkah 8 saja |

**Hasil langkah 8 (backdrop):** jumlah titik live = rebuild = **5.197**; `uSizeK`, `uMap`, `uWaveK`,
`uRest`, `uPulse`, `uPixelRatio` identik; selisih 26,16 % (1440×900) / 23,92 % (390×844) tersebar
merata termasuk area langit → milik lapisan glow/partikel GPU, bukan backdrop.

---

## 15. Langkah 8 lanjutan — port penuh pipeline partikel GPU + bloom (keputusan user `scope8=full`)

User memilih **port penuh** (bukan bloom-2D jalan tengah, bukan berhenti di paritas backdrop).

**File baru:** `src/lib/fig.ts` (port `IU()`), `src/lib/plate.ts` (`Im()`), `src/lib/bloomGL.ts` (WebGL2),
`src/lib/shaders/{aU,lU,uU,cU}.glsl` (verbatim), `src/components/Figure.tsx` (port `pU`+`hU`+`fU`+`dU`).
**File yang diubah:** `HumanoidMode.tsx` (mount `<Figure>` setelah plate 2D), `Backdrop.tsx` (uSizeK + opacity img).

| # | temuan | dampak |
|---|---|---|
| F-43 (revisi) | `uSizeK` backdrop = `max(.6, h/1020)` **faktor 1,0** (1440×900 → 0,88235; 900×1000 → 0,98039). Angka `1,6·min(vw,vh)/1020` adalah milik shader **figur**. | ukuran titik backdrop akhirnya tepat |
| F-46 | Tekstur plate harus **sRGB-decode** (`SRGB8_ALPHA8`); tanpa itu encode tunggal di komposit membuat figur 2,8× terang | luminansi kepala 168,6 → 91,7 |
| F-47 | Up-chain bloom menjumlah 6 level; BloomEffect menjumlah dengan bobot ~1/level ⇒ gain `1/levels` | glow wajar |
| F-48 | Down/up pass 1 texel terlalu sempit (halo 5,6 vs 13,0) ⇒ tap 2 texel, gaussian 9-tap / tent 9-tap | halo 14,3 vs 13,0 |
| F-49 | Urutan DOM: di bundle kanvas WebGL figur **setelah** kanvas 2D dan opak. Salah urutan = figur tertutup plate | struktur DOM 1:1 (`[backdrop gl, plate 2d, figur gl]`) |
| F-50 | `img` backdrop memakai `opacity = (visible || born) ? 1 : 0` — terukur 0 → 1 pada 8–9 s walau energy 0. Sebelumnya rebuild memakai `visible` saja | artwork backdrop muncul |

**Bukti kesetaraan (probe, bukan asumsi):** seluruh uniform saat `drawArrays(n=274799)` identik 16 digit
(`uSize 2.5588235`, `uPatchUV 0.0028431374`, `uPulse 1.4086753`, `uVein 1.4540837`, `uBoilAmp 2.2714345`,
`uSizeK 1.4117647`, palet linear); seluruh `bufferData` identik statistiknya
(`aSize` 1–2 mean 1,065 · `aBright` 0–255 mean 62,846 · `aBucket` 0–3 mean 0,736 · `aKind` 0–5 mean 0,328).

**Hasil:** gerbang C langkah 8 turun dari 26,16 %/28,13 (1440×900) dan 23,92 %/27,12 (390×844) menjadi
**10,55 % / 11,58** dan **7,57 % / 9,02**; acuan derau live-vs-live 0,87 % / 1,48 dan 1,35 % / 1,49.
Backdrop identik (18,9 vs 18,9), kepala 76,3 vs 75,9, badan 35,6 vs 32,9.
Sisa selisih = profil kernel bloom (dikuantifikasi, bukan fitur hilang).

---

## 16. Deploy APEX + mulai MIRA

**Deploy APEX** (user): https://niu-humanoid.vercel.app · `tools/diff-vs-production.js` → 17/17 identik ·
`tools/gate-deploy.js` → 10,73 % / 11,93 (1440×900) dan 7,71 % / 9,01 (390×844), sama dengan dev
(10,55 / 7,57) di dalam derau.

| # | temuan | dampak |
|---|---|---|
| F-51 | Harness gerbang mencatat uniform sebagai "nilai terakhir global"; backdrop & figur sama-sama punya `uSizeK` dengan nilai berbeda → gerbang ⛔ palsu | uniform dibaca per-program saat `drawArrays`; `uT` (akumulator) dikecualikan |
| F-52 | TOMBOL `EXIT` MIRA tidak dirender saat masuk lewat `?auto` (terukur di live) | rebuild mengikuti |
| F-53 | `miraDial` mengubah store tetapi panel tidak re-render (tanpa `useSyncExternalStore`) → alias tampak tidak jalan | `useDialVersion()` |
| F-54 | Bundle menamai default param **`def:`** bukan `default:` | verifikasi param harus memetakan nama field dulu |

**MIRA** dimulai: `recon/verify-mira.py` (82/82), proyek `mira-humanoid-rebuild/`, langkah 1 (entry)
dan langkah 7 (panel 82 slider, `?dial.<key>=`, localStorage, 7 alias) selesai dengan Gerbang A 8/8
dan Gerbang B 10/10.

### F-55 · MIRA: warna garis bukan warna gambar — palet dicampur 60 %
`FN`: `col: N.outline ? [.95,.9,1] : Nd[N.kind].map((z,Z)=> z*.6 + N.col[Z]*.4)` dengan
`Nd = {white:[1,.95,1], violet:[.72,.42,1], gold:[1,.66,.26]}`. Bukti: 84 warna live fit pas (selisih ≤1e-7)
terhadap rumus ini, sementara `col` mentah dari `SN` meleset sampai 0,36.

### F-56 · MIRA: jam ignition tidak perlu disimulasikan — ia fungsi jarak
`FN`: `ignite = weave[1]+hush = 6,55`, `speed = wave·tinggi = 1×1374`, `E(p)=ignite+LN(|p−bintang|,speed)`,
`aT = E − 0,02`, `aF = E + 0,30`. Jadi `aT`/`aF` bisa direproduksi tanpa menjalankan animasi; terbukti identik
byte-per-byte dengan buffer live (`verify-mira-wire.mjs`).

### F-57 · MIRA: `aId` per garis = mulberry32 seed 3 (bukan acak bebas)
`Ud(3)` dibuat sekali lalu dipanggil per garis berurutan (`me = useMemo(()=>{const $=Ud(3); e.lines.map(... id:$())})`).
Dua tangkapan live terpisah menghasilkan `aId` identik → nilai ini bisa (dan sudah) direproduksi persis.

### F-58 · MIRA: `lF` menulis indeks SEKALI per titik, bukan per sisi strip
Jebakan port: menulis 6 indeks di dalam loop `for Z of [-1,1]` menghasilkan 2× indeks → `RangeError: offset is out of bounds`
(`Uint32Array.set`). Yang benar: dua verteks ditulis per titik, indeks `(Z,Z+1,Z+2)(Z+1,Z+3,Z+2)` sesudahnya.

### F-59 · MIRA: mask kepala disiapkan pada ukuran `SN.width`, bukan ukuran gambar asli
`ck()`/loader gambar membuat kanvas `m.width × m.height` (1146×1374 = hasil `round(1145·0,5)/0,5`)
lalu `drawImage(img,0,0,width,height)` — jadi gambar 1145 px **diperlebar 1 px**. Konsekuensinya
`px` (mask kepala) bukan alpha gambar asli: cx/hw bergeser ~0,5 px, `neckY` 557 vs 565.
Setelah ukuran ini dipakai, `rowTexture` 1×1374 RGBA32F rebuild **identik byte-per-byte** dengan live.

### F-60 · MIRA: `uHeadRows` = tekstur `1×H RGBA32F` (bukan RGBA8)
Live: `texStorage2D(TEXTURE_2D, 1, RGBA32F, 1, 1374)` + `texSubImage2D(..., 1, 1374, RGBA, FLOAT, 5496 float)`,
`minFilter = magFilter = NEAREST`. Nilai = (centre x px, half width px, turn weight 0..1, depth share 0..1).

### F-61 · MIRA: DUA kanvas — figur 1007×630 (rasio 0,7), latar 1440×900
Live: `<canvas>` pertama 1007×630 (style fixed, z-index 0, opacity 0,49 transisi) = panggung figur;
kanvas kedua 1440×900 = latar (nebula/asap). Jadi `setPixelRatio` panggung = **0,7**, bukan 1.
`uRes` di shader garis = **[1440, 900]** = ukuran JENDELA, bukan ukuran kanvas (rumus bundle:
`px = gl.domElement.width / window.innerWidth` = 0,7).

### F-62 · MIRA: gambar diunggah dengan `UNPACK_FLIP_Y_WEBGL = true`
three.js `Texture.flipY` default `true`. Tanpa flag ini kuad gambar tampil **terbalik** (kepala di bawah),
sementara garis & awan titik benar — gejala yang sempat muncul dan langsung hilang setelah flag dipasang.

### F-63 · MIRA: gambar digambar DUA kali (lapis isi + lapis warna)
Keduanya kuad yang sama, geometri `±w/2, ±h/2` (`w = SN.width`, `h = SN.height`), UV standar, 6 indeks:
`04-vert` + `05-frag` (`uFill`, `uReveal`; blend **ZERO / ONE_MINUS_SRC_ALPHA** = menutupi latar dengan alpha),
lalu `04-vert` + `06-frag` (`uGain`, `uHeadOn`, `uHz*`, `uFace*`, `uShock`; blend **ONE / ONE**).

### F-64 · MIRA: awan titik gambar = 103.367 titik, geometri IDENTIK live
`aRest/aKind/aZ` rebuild **maxdiff 0** terhadap buffer live (3/3). Urutan array bukan urutan grid:
`[materi belakang (kind 1)…, kepala acak (kind 5) ×6000, grid (kind 0)…]`, PRNG `Ud(29)`, langkah 1,5 px,
alpha > 32. `uPxPerPic` 0,589519679…; `gl_PointSize = uStep·2·cover·uPxPerPic` (`uStep` 1,5).

### F-65 · MIRA: sprite cadangan = gradien radial 128 px, warna "black" tidak menambah cahaya
Dua tekstur sprite dibuat runtime: glow `#fff → rgba(230,205,255,.55) @0,25 → rgba(140,80,255,0)`,
asap `rgba(200,150,255,.8) → (.32) → (.08) → (0)`. Sprite ber-`color:"black"` (opacity 0 saat idle)
tidak menyumbang piksel — aman dilewati sebelum langkah 3.

### F-66 · MIRA: kanvas latar beresolusi kerja 0,7; kanvas figur penuh (1440×900)
Salah baca sebelumnya (F-61 dikoreksi). Bukti dari probe: draw `01-frag` (medan nebula) berjalan di kanvas
**1007×630**, sedangkan SEMUA lapisan figur (garis 22.248, titik 103.367, kuad gambar, materi, rambut)
berjalan di kanvas **1440×900** dengan `uRes = [1440, 900]`, `uHeadRows` di unit 0, `uMap` di unit 1.

Konsekuensi:
1. Kanvas figur memakai **dpr 1** (1440×900 di jendela 1440×900). Merender figur di 0,7 lalu memekarkannya
   ke 1440 menghasilkan tangga piksel 2–3 px bertepi magenta/merah — cacat yang sempat muncul di `build-stage4.png`.
2. Medan nebula memang **dirender rendah (0,7) lalu dimakarkan** — itu sebab kabutnya halus dan lembut;
   `iRes = [1007, 630]` adalah resolusi kerjanya, bukan ukuran jendela.
3. Karena hanya ada SATU kanvas di DOM untuk figur, larutan yang dipakai: medan dirender ke **FBO 1007×630**,
   lalu di-blit (sampler LINEAR) ke kanvas figur — hasilnya sama dengan menumpuk kanvas 0,7 di bawah kanvas penuh.

### F-67 · MIRA: gambar diunggah sebagai sRGB8_ALPHA8 **dan** di-premultiply
`EXT_texture_storage`/three memakai `SRGB8_ALPHA8` (terukur: `texStorage2D` format 35907) → GPU mendekode
sRGB→linear. Selain itu asset `mira-idle-v1.webp` menyimpan warna terang (sampai 255) pada **64.335 piksel
ber-alpha < 40**; dengan blend `ONE/ONE` warna itu tampil sebagai pinggiran magenta/merah yang di live tidak ada.
`UNPACK_PREMULTIPLY_ALPHA_WEBGL = true` + `alpha:false` pada kanvas menghilangkan cacat itu **seluruhnya**
(diverifikasi lewat potongan 8× di bahu: `build-stage9.png` masih bergerigi, `build-stage10.png` mulus).

### F-68 · MIRA: bloom = postprocessing BloomEffect (bukan bloom 2D) — shader ditangkap utuh
Live memakai `postprocessing` dengan `BloomEffect` (bukan `UnrealBloomPass`). Seluruh sumber shader-nya kini
tersimpan di `recon/shaders/mira-allsrc/` (37 berkas; 36 sama dengan `mira-live/`, 1 baru = pass komposit):

| pass | shader | ukuran | catatan |
|---|---|---|---|
| luminansi | `17-vert` + `18-frag` | 1726 / 5485 B | `THRESHOLD`+`COLOR` aktif; `threshold` 0,6 · `smoothing` 0,9 |
| turun | `19-vert` + `20-frag` | 2335 / 3702 B | 12 tap (bobot 0,125 / 0,05556), `texelSize` = 1/ukuran sumber |
| naik | `21-vert` + `22-frag` | 2101 / 3168 B | 9 tap, `mix(baseColor, blur, radius)` · radius 0,62 |
| komposit | `23-vert` + `24-frag` | 1917 / 10857 B | `ENCODE_OUTPUT` aktif → **sRGB encode di shader**; `e0Intensity` 0,9 |

Parameter terukur dari draw live: `e0Intensity = 0,9` = `hum.glow.strength` (bukan `bloom.strength` 1,3 —
dua akar berbeda, alias `hum.glow.*` yang dipakai figur), `e0BlendOpacity 1`, `threshold 0,6`, `radius 0,62`,
mip 8 level mulaidari 0,5 resolusi (720×450 → … → 12×8).

### F-69 · MIRA: latar digambar ke KANVAS, figur ke render target, komposit menimpa
Urutan final yang benar (dua kali salah sebelum ini):
1. medan nebula (`01-frag`) → FBO 0,7 → **blit ke kanvas** (opaque).
2. semua lapisan figur (sprite, kuad isi, kuad warna, titik, garis) → **render target HDR penuh**.
3. bloom atas RT itu (luminansi → 8 mip turun → 8 mip naik), komposit `24-frag` **langsung ke kanvas**
   dengan `blendFunc(ONE, ONE_MINUS_SRC_ALPHA)` supaya figur menimpa latar dan tidak ada halo kotak.
4. komposit meng-encode sRGB sendiri (`ENCODE_OUTPUT`) → kanvas figur tidak boleh punya konversi warna tambahan.

Kesalahan yang sempat terjadi: (a) komposit ditulis ke kanvas dua kali (figur hilang), (b) latar ikut masuk RT
figur sehingga seluruh layar ikut di-bloom (putih susu, MAE 63,8). Setelah (a)+(b) diperbaiki angka "beda vs live"
justru naik 16,4 % → 23,9 % (MAE 17,3 → 19,4) **dan itu wajar**: sebelumnya area cahaya gelap, sekarang menyala.
Yang harus dibandingkan: kecerahan rata-rata naik 29,2 → 36,6 dengan acuan live 41,7. Sisa selisih didominasi
rambut & materi (belum dibuat).

### F-70 · MIRA: rambut = SATU kuad citra 1385×1422 (bukan mesh helai)
Live menggambar rambut dua kali dengan kuad yang sama (`uSize` 1385×1422, 4 verteks, 6 indeks):
draw #29 (`uOn` 1, `uClock`) dan draw #40 (`uOn` 0). Yang terlihat saat idle hanya yang pertama:
`29-vert` + `30-frag` — shader ini memakai `hairSource()`/`hairTurn()` (kepala lembut) dan membaca
`uMap` (citra `mira-hair-v1.webp`). Dua lapis **helai** rambut (`31-vert` + `32-frag`, 32.382 indeks,
atribut `aRest/aS/aSeed/aLen`) dan percikan (`33-vert` + `34-frag`, 260 titik) belum dibuat.

Uniform terukur: `uUp 48` · `uSide 120` · `uMass 0,7` · `uEarY 343,41` · `uTop 0,6` ·
`uHead [694,79, 322,80]` · `uHairOff [120, 48]` · modelView geser `(-2,0320425, 1,9313689)`.
`uBT` = jam build (`b_`) — saat idle bernilai 0,9 s lalu 3,03 s lalu 5,26 s (mengikuti jam, bukan konstan).

### F-71 · MIRA: blend additive yang benar = `blendFuncSeparate(ONE, ONE, ZERO, ONE)`
Terukur di 19 draw live: `srcRGB ONE · dstRGB ONE · srcAlpha ZERO · dstAlpha ONE`. Artinya warna ditambahkan
tetapi **alpha tujuan dibiarkan**. Memakai `blendFunc(ONE, ONE)` (seperti sebelumnya) membuat alpha ikut
bertambah; akibatnya komposit akhir menganggap seluruh kotak kuad gambar/rambut itu "figur" dan menutupi latar
dengan hitam — gejala kotak hitam besar yang sempat muncul di `build-stage14.png`. Setelah semua lapisan figur
memakai `blendFuncSeparate`, kotak itu hilang dan latar menembus di sekitar siluet.

| metrik (1 frame 1440×900) | sebelum rambut | sesudah rambut + blend benar | live |
|---|---|---|---|
| kecerahan rata-rata | 36,6 | **42,9** | 36,8 |
| piksel > 32/255 vs live | 23,9 % | **20,1 %** | — |
| piksel > 8/255 vs live | 32,8 % | **29,9 %** | — |
| MAE | 19,4 | **14,2** | — |

Kecerahan kini sedikit **di atas** live (42,9 vs 36,8) — kandidat penyebab: bloom ikut mengenai lapisan yang di
live berada di kanvas terpisah, dan/atau intensitas komposit perlu dikalikan `bloom.strength`. Ini masuk daftar
pengukuran berikutnya, bukan diakali dengan menurunkan angka secara manual.

### F-72 · MIRA: jam bisa DIBEKUKAN — verifikasi fase-per-fase, bukan perasaan
Live menerima `?t=<detik>` (`pinTime`): jam berhenti di nilai itu, dan `?off=<lapisan>` mematikan lapisan
(`arcs, bloom, core, cutwhite, figure, fog, hair, lights, lines, matter, pic, waves`). Dua tangkapan live
pada `t=9,5` **identik** — MAE 0,10–0,12, piksel > 8/255 0,12–0,14 %, kecerahan 39,6 di ketiganya.
Artinya frame live deterministik dan rebuild boleh dinilai piksel-per-piksel. Rebuild sekarang menerima `?t=`
juga (jam dibekukan, delta pita = 0 seperti live).

### F-73 · MIRA: materi 54.500 titik terpasang dan cocok dengan buffer live
Port `Nw/FN/Uw/g0/RN/CN/PN/IN/LN` (`src/lib/miraMatter.ts`) dijalankan dengan seed `Ud(7·31+1)=Ud(218)`,
`seats 36000` dari citra penuh (1146×1374) + `hairSeats 14000` dari `mira-hair-v1.webp` dengan
`{minLum 0,12, dx −120, dy −48}` → **54.500** butir (live 54.492; selisih 8 dari sampling tepi).

| atribut | live vs rebuild |
|---|---|
| `aCol` | maxdiff 1/255 |
| `aTurns` / `aSeed` | 3·10⁻⁸ (float32 identik) |
| `aStay` | 8 dari 54.492 butir berbeda |
| `aTArr` | rata 4,629 vs 4,620 · median 4,773 vs 4,764 · p90 5,618 vs 5,613 |
| `aFly` / `aTRev` | 0,88 / 0,726 (induk `rnd()` terpakai lebih dulu di jalur kita) |

Busur: 18 inti + 10 mahkota = **1.912 ruas** (live 1.984 ruas dalam satu draw; beda dari pemakaian PRNG).
Di layar materi **memang 0 kontribusi saat idle**: `melt = 1 − smoothstep(aTRev, aTRev+0,35, tm)` mematikan
semua butir setelah gelombang reveal lewat (t ≈ 6,6–7,6 s). Itu perilaku live, bukan bug — terukur sebagai
Δ body 0,0 pada `?off=matter`.

### F-74 · MIRA: helai rambut — angka live dan rebuild sama persis
Port `EN/AN/TN/bT/RT/Bf` (`src/lib/miraHair.ts`) pada citra setengah resolusi (693×711) memberi
**47 helai** dan **260 bintik** — log live: `hair picture: 47 strands can move, 260 twinkles`.
Geometri pita: **10.888 verteks · 10.794 segitiga** (live: `080-Uint16Array-32382` → 10.794 segitiga, 10.888
verteks). Tidak ada parameter yang ditebak: `hum.hair.moving 60` memotong 47 helai yang tersedia.

### F-75 · MIRA: lapisan `waves` (3 pita + 168 percikan) — inilah "streak" panjang di live
Teka-teki garis panjang yang melintasi seluruh layar dipecahkan dengan `?off=`: `off=waves` menghapusnya,
`off=hair`/`off=arcs` tidak. Sumbernya komponen `kk`: **3 pita** (`Qy 3`) masing-masing kurva Catmull-Rom
sentripetal dari 6–7 titik kendali di x −9…9, z −2,2…−2,8, diukir jadi 65 ruas × 2 verteks (`Da 64`), plus
`gN(56,3)` = **168 percikan** yang bergerak sepanjang kurva. Port: `src/lib/miraWaves.ts` (kurva Catmull-Rom
three.js diimplementasikan ulang) + shader `25/26` & `27/28`.

### F-76 · MIRA: bloom dan gambar dasar belum seimbang (angka, bukan kesan)
Karena `?off=bloom` di live tetap mengomposit figur (dengan intensitas 0), jalur rebuild disamakan dulu
(komposit selalu jalan, `e0Intensity = 0` saat `off=bloom`) supaya perbandingan adil. Hasil pada `t=9,5`:

| | kotak badan | dengan bloom | tambahan bloom |
|---|---|---|---|
| live | 38,8 | 80,2 | **+41,4** |
| rebuild | 92,7 | 101,2 | **+8,5** |

Jadi gambar dasar rebuild ≈ 2,4× terlalu terang dan bloom rebuild hanya menambah ~1/5 dari tambahan live.
Live = figur gelap + bloom kuat; rebuild = figur terang + bloom lemah. Kontribusi per lapisan (Δ kotak badan):
garis live −6,0 vs rebuild −16,7 · rambut −8,2 vs −6,0 · helai −2,0 · pita 0,0 · materi 0,0.
Intensitas bloom live saat `t=9,5` bukan 0,9 tapi `0,9·(1+1,6·b_(9,5;6,55)·surge)` ≈ **1,21**
(`b_(i,e,1,9)=exp(−(i−e)/1,9)`), jadi 0,9 di rebuild memang terlalu kecil — tapi selisih 2,4× pada gambar dasar
tetap harus dijelaskan lebih dulu sebelum angkanya dinaikkan.

### F-77 · MIRA: `uBT` = jam build (bukan konstanta) — fase sebelum ignition jadi gelap seperti live
Tiga lapisan rambut memakai `uBT = 100` (selalu tampil), sehingga pada `t = 1,89` rebuild sudah menampilkan
rambut penuh sementara live baru menampilkan percikan. Setelah `uBT = jam build`, `t = 1,89`:
MAE **31,61 → 25,14** dan pada `t = 9,5` tetap 12,53 (kondisi mapan tidak rusak).

### F-78 · MIRA: ramp build `iField`/`iMatter` + opacity kanvas latar (angka live)
`Tw({waves, matter, orb})` di live, disalin apa adanya ke `rampAt(t)`:
`H = 0,04 + 0,2·smoothstep(t, 0,9; 6)`, `F = smoothstep(t, 6,60; 7,65)`, `ge = smoothstep(t, 6,80; 8,05)`,
`waves = max(strike·0,5 ; H+(1−H)F)`, `matter = max(strike·0,4 ; H·0,8+(1−H·0,8)ge)`,
`orb = max(strike·0,25 ; smoothstep(t, 6,55; 7,90))`.
- `iField = waves`, `iMatter = matter` (sebelumnya konstanta 1).
- kanvas latar punya **CSS opacity = min(1, waves·1,6)** di live (terukur di DOM: 0,064 pada t=0,3 ·
  0,604 pada t=1,89 · 1,0 pada t=9,5) → di rebuild jadi `uOpacity` pada blit latar.

### F-79 · MIRA: kenapa live masih gelap sebelum gelombang reveal (akar masalahnya)
Selama ini rebuild menampilkan figur penuh sejak frame pertama. Penyebab terukur: di live kanvas figur
ber-alpha dan lapisan gambar (`06-frag`) hanya mengalikan **alpha** dengan `filled`, bukan warnanya; yang
membuatnya tak tampil adalah komposisi canvas ber-alpha (premultiplied) di browser. Rebuild memakai satu
kanvas opaque, jadi warna additive tetap menyembur. Perbaikan paling setia pada hasil ukur: kalikan juga
**rgb** dengan `filled` di `picColor.frag`. Hasil `t = 0,3`: MAE **18,05 → 3,19**, kecerahan 2,0 vs live 3,0.

### F-80 · MIRA: cincin kejut ignition (`35/36`) + `qN`
`qN(t)`: radius `n·1500·(1−0,18·min(1,n/2))`, kekuatan `smoothstep(n,0;0,04)·e^(−n/0,9)` untuk `0 ≤ n ≤ 2,6`
(n = t − 6,55). Dipasang sebagai satu kuad penuh + `uShock` diteruskan ke materi dan garis (efek "jump & flare").
`t = 6,8`: kecerahan 32,4 → **43,2** (live 61,2); MAE 38,04 → 35,32.

| t | MAE sebelum langkah 3 | MAE sesudah (ramp + fill-mask + shock) | kecerahan build/live |
|---|---|---|---|
| 0,3 | 18,05 | **3,19** | 2,0 / 3,0 |
| 1,89 | 31,61 | **20,06** | 3,2 / 21,7 |
| 3,5 | 25,12 | **15,27** | 10,2 / 23,0 |
| 5,5 | 27,16 | **18,46** | 8,0 / 22,5 |
| 6,8 | 36,52 | **37,25** | 32,4 / 61,2 |
| 9,5 | 12,53 | **12,53** | 44,8 / 39,6 |

Sisa kecerahan pada 1,89–5,5 = **lapisan orb (`25/26`, 15 kuad) belum ada** — di live itulah benda terang
yang terlihat saat materi berpusar sebelum ignition.

### F-81 · MIRA: salinan materi & `uSettle` — sebab sebenarnya fase 1,89–5,5 gelap
Dibaca langsung dari program materi live (`13195/2542`) memakai `tools/probe-mira-field.js`:

| uniform | live | rebuild (sebelum) |
|---|---|---|
| `uTrail` (salinan utama) | **1** | 0,55 |
| `uLag` (salinan utama) | **0** | 0,025 |
| salinan jejak | `eF = [[0,025·0,55],[0,05·0,32],[0,08·0,16]]` → **3 salinan tambahan** | tidak ada |
| `uSettle` | `0,75 − 0,4·smoothstep(t; 0,9; 6)` → 0,7106 @1,89 · 0,3608 @5,5 | konstanta 0,7109 |
| `uLiveT` | sama dengan jam build | 0 |
| setelah `last + 0,5 s` | `drawRange(0, nStay)` + semua jejak disembunyikan | tidak ada |

Perbaikan: satu salinan utama (`lag 0, trail 1`) + tiga salinan jejak, `uSettle` berjalan, dan setelah
`lastReveal + 0,5 s` hanya titik yang menetap (`nStay`) yang digambar tanpa jejak.

| t | MAE sebelum (build6) | MAE sesudah (build7) | kecerahan build / live |
|---|---|---|---|
| 0,3 | 3,19 | 4,30 | 6,3 / 3,0 |
| 1,89 | 20,06 | **13,92** | 9,6 / 21,7 |
| 3,5 | 15,27 | **9,14** | 22,6 / 23,0 |
| 5,5 | 18,46 | **14,30** | 27,4 / 22,5 |
| 6,8 | 37,25 | **35,45** | 36,8 / 61,2 |
| 9,5 | 12,53 | 12,89 | 45,2 / 39,6 |

Tiga angka sebelumnya (1,89 · 3,5 · 5,5) turun 20–40 %; 3,5 kini praktis tepat (22,6 vs 23,0).
Sisa terbesar: **6,8** — live 61,2 vs rebuild 36,8: kilatan ignition (`hum.strike.flash` + `13/14`), belum ada.

### F-82 · MIRA: empat jam berbeda + parameter orb/gain (dari pembacaan uniform app asli)
Semua diukur dengan `tools/probe-mira-field.js` (dua konteks: medan `webgl` 1007×630, figur `webgl2` 1440×900).

| hal | live | rebuild (sebelum) | akibat bila salah |
|---|---|---|---|
| jam medan nebula `iTime` saat `?t=` dipin | **0,150** di keempat fase | = jam build (0,3…9,5) | nebula bergeser jauh → latar gelap; **ini penyebab utama 9,5 (12,89) dan 6,8 (35,45)** |
| rambut/helai/bintik `uClock`/`uTime` | 0,045 – 0,2 (jam sendiri, tak ikut dipin) | = jam build | rambut "bergerak 9,5 s" padahal live baru 0,05 s |
| `uFaceA.z` (jam wajah) | 0,2 | 0 | ekspresi wajah beda fase |
| orb `uOpacity` | `matter · 0,3` (0,0905 @1,89 · 0,30 @9,5) | 0,36 tetap | pita orb terlalu tebal |
| orb `uOrbPx`/`uOrbR` | `iCenter·(w,h)` = 721,35 / 622,08 · `iRing·h` = 111,47 | (−9999,−9999) / 1 | mask "di belakang cincin" mati → pita menembus cincin emas |
| garis `uGain` | `0,95·(1 + 1,1·q)`, `q = hum.build.surge · e^(−(t−6,55)/1,9)` → **1,1712 @9,5** | 0,95 tetap | kilau garis setelah ignition kurang |

Hasil sesudah: **9,5 → 9,89** (dari 12,89), **6,8 → 34,87** (35,45), **0,3 → 3,46** (4,30), 3,5 → 8,55, 5,5 → 13,72, 1,89 → 13,45.

Sisa terukur pada 9,5 (kita 46,7 vs live 39,6, kelebihan +7,1). Kontribusi tiap lapisan (uji `off=…`):
gambar 10,0 · garis 6,5 · rambut 5,8 · bloom 4,5 · materi 0,4 · pita 0,8. Uniform lapisan-lapisan itu
sudah sama dengan live, jadi sisa ini soal **cakupan piksel/komposisi**, bukan nilai uniform — perlu
perbandingan per-lapisan berikutnya (gambar dulu: live menggambar lapisan gambar di dua tahap dengan alpha).
