# RENCANA EKSEKUSI — Rebuild `apex-humanoid` + `mira-humanoid` dari Artefak `recon/`

> Disusun 2026-10-29 dari pembacaan penuh 27 file di `recon/` (17 root + 10 `assets/`) — 12.743 baris teks, 2,44 MB.
> Sumber: Google Drive `Kerja-Arena/recon` (salinan sudah diverifikasi byte-for-byte ke workspace ini).
> Dokumen ini **tidak mengubah apa pun di `recon/`**. Semua tindakan ada di bawah sebagai tugas bernomor.

---

## 0. Ringkasan satu paragraf

Isi `recon/` adalah paket **spec-driven rebuild**: tiga dokumen instruksi berlapis (`PROMPT-MASTER-REBUILD.md` → `SPEC-APEX.md` / `SPEC-MIRA.md` → versi gabungan `PROMPT-SIAP-TEMPEL.md`), lima artefak bukti yang diekstrak dari bundle produksi (`apex.js`, `mira.js`, dua CSS, dua `index.html`, `mira-params.json`, dua file komentar desain, `panel-sections.md`), satu skrip audit (`verify-spec.py`), dan 10 aset gambar. Urutan eksekusi yang tersirat: **ekstraksi dulu (Fase 0–1), arsitektur ditulis (Fase 2), baru implementasi (Fase 3), dan tidak boleh ada klaim "mirip" tanpa angka diff (Fase 4)**. Larangan kerasnya: dilarang menebak angka, salin shader/string/aset apa adanya, bundle live selalu menang atas spec.

---

## 1. Peta inventaris: apa peran tiap file dan kapan dipakai

### 1.1 Dokumen instruksi (3 file, saling tumpang tindih — jangan dipakai semua sekaligus)

| File | Baris | Peran | Dipakai di | Catatan |
|---|---|---|---|---|
| `PROMPT-MASTER-REBUILD.md` | 337 | Metodologi: ROLE + 7 aturan main + Fase 0–4 + definisi 100% + deliverable | **Kontrak kerja utama** | Butuh `SPEC-<TARGET>.md` sebagai lampiran wajib |
| `SPEC-APEX.md` | 212 | Fakta terukur APEX: HTML, copy UI, 8 aset+dimensi, state machine, blend mode, 18 hook | Fase 1.5, 1.7, 2, 3, 4.1 | APEX = 2D-canvas-sentris (`getContext("2d")` 8×), tanpa panel |
| `SPEC-MIRA.md` | 487 | Fakta terukur MIRA: 82 parameter dalam 20 seksi, mesin garis, shader verbatim, 8 modul `lib/`, palet | Fase 1.3–1.4, 2, 3, 4.2B | MIRA = shader-sentris, 42 param `humanoid` + 40 `scene` |
| `PROMPT-SIAP-TEMPEL.md` | 1048 | **Gabungan**: master (baris 1–340) + Lampiran A = SPEC-APEX + Lampiran B = SPEC-MIRA | Dipakai kalau agent pembangun **tidak** bisa membaca file | Isinya redundan dengan 3 file di atas; jangan dipakai bersama mereka |

### 1.2 Artefak bukti (dipakai sebagai *spesifikasi yang bisa dibaca*, bukan sampah)

| File | Ukuran | Isi terbukti | Dipakai di |
|---|---|---|---|
| `apex.js` | 1.108.884 B (4.394 baris) | 156 template literal; **55 blok GLSL-ish** (25 fragmen, 8 vertex); 19 hook `window.__HUM_*`; 13 query param mentah; blend mode JSON, `Math.min(.05, dt)`, ambang `(oe-.34)/.4` | Fase 1.2–1.8, 2, 3, 4.1 |
| `mira.js` | 1.185.588 B (4.880 baris) | 181 template literal; **70 blok GLSL-ish** (34 fragmen, 14 vertex); 3 hook window; 13 query param; komentar niat desain 19 baris | Fase 1.2–1.8, 2, 3, 4.1 |
| `apex.css` | 224 B, 1 baris | `:root --font-ui`, reset, `#root{position:fixed}`, `@keyframes fadeInOut` | Fase 3.2 (salin verbatim) |
| `mira.css` | 574 B, 1 baris | Sama + `@media(max-width:720px)` untuk `.mira-btn`, `.mira-page-row`, `.mira-own-row` | Fase 3.2 |
| `apex-index.html` / `mira-index.html` | 813 B | Shell HTML — **⚠ tercemar injeksi Cloudflare** (lihat temuan F-1) | Fase 3.1 (struktur `<head>`) |
| `mira-params.json` | 16.619 B | **82 entri**, field `key/scope/stands/group/label/min/max/step/default`; 40 `scene` + 42 `humanoid`; 7 alias `stands` | Fase 3.7, Gerbang B |
| `mira-params-table.md` | 187 baris | Bentuk manusiawi dari JSON di atas, dikelompokkan 20 seksi | Review manual, Gerbang B |
| `panel-sections.md` | 21 baris | 20 seksi + scope + jumlah (jumlah per seksi = 82 total) | Fase 3.7, checklist urutan panel |
| `apex-design-comments.txt` | 2 baris | *edge boil / ESCAPE-AND-RETURN*; **"brightens IN ITS OWN HUE — never lifted toward white"** | Fase 3.5 (aturan warna pulse) |
| `mira-design-comments.txt` | 19 baris | Aturan visual: *one bright folding edge*, *no blunt cuts*, *hot then its own colour*, *far side is shadow not smear* | Fase 3.3–3.5 (shader) |
| `verify-spec.py` | 124 baris | Menguji ulang 193 klaim spec terhadap bundle lokal | **Fase 0** (gerbang masuk) dan setelah tiap perubahan spec |

### 1.3 Aset (10 webp, 2,9 MB — harus di-copy byte-for-byte, dilarang generate/re-encode)

| Kelompok | File | Ukuran | Peran |
|---|---|---|---|
| APEX state (5) | `apex-idle`, `apex-listening`, `apex-thinking`, `apex-speaking`, `apex-speaking-strong` | 275–350 KB | Crossfade state via `uTexA/uTexB` |
| APEX timeline (2) | `apex-assembly-25`, `apex-assembly-60` | 312/322 KB | Frame "birth" 25% & 60% |
| APEX latar (1) | `backdrop-v1` | 312 KB | Latar (`uRest 0.22`, `uPulse 2.6`) |
| MIRA mask (2) | `mira-idle-v1`, `mira-hair-v1` | 364/159 KB | **Mask**, bukan gambar jadi (`brightness(0) invert(1)`) |

> Sudah diverifikasi: 10/10 punya header `RIFF…WEBP` valid. Dimensi asli tercatat di kedua SPEC dan harus dipertahankan (state APEX sengaja 1213–1216 × 1293–1296, jangan dinormalisasi).
> ⚠ Lokasi tujuan di build adalah `/humanoid/*.webp` (bukan nama file apa adanya) — beda dengan susunan folder Drive sekarang.

---

## 2. Urutan eksekusi yang tersirat (dependensi, bukan daftar bab)

```
                    ┌──────────────────────────────────────────────┐
                    │ FASE 0  SETUP RECON                          │
   live Vercel ───► │ curl index.html → bundle.js/css → assets     │  (hari ini: TIDAK ADA DRIFT,
                    │ + cek: no sourcemap, no audio, no 3D model   │   bundle identik → audit saja)
                    └───────────────────┬──────────────────────────┘
                                        ▼
                    ┌──────────────────────────────────────────────┐
                    │ FASE 1  BEDAH BUNDLE → artefak di recon/     │
                    │ 1.1 stack → 1.2 copy+urutan → 1.3 shader      │  SEMUA output di sini
                    │ → 1.4 params(82) → 1.5 hooks → 1.6 audio      │  menjadi SATU-SATUNYA
                    │ → 1.7 timing → 1.8 DOM+computedStyle          │  sumber angka di Fase 3
                    │ → 1.9 ground-truth (SS+video, waktu dikunci)  │
                    └───────────────────┬──────────────────────────┘
                                        ▼  (gerbang: semua string UI punya pemilik)
                    ┌──────────────────────────────────────────────┐
                    │ FASE 2  ARCHITECTURE.md                      │
                    │ pohon komponen · state+transisi+durasi ·      │  STOP kalau arsitektur
                    │ urutan layer+blend · uniform→sumber nilai ·   │  belum menjelaskan 100%
                    │ aset→pemakaian · daftar UNVERIFIED            │  string dari 1.2
                    └───────────────────┬──────────────────────────┘
                                        ▼
                    ┌──────────────────────────────────────────────┐
                    │ FASE 3  IMPLEMENTASI (urutan 8 langkah WAJIB) │
                    │ 1 entry statis → 2 aset/geometri diam →       │  bloom SELALU paling akhir
                    │ 3 timeline birth → 4 audio → 5 state+mic →    │  (bloom menutupi
                    │ 6 hand tracking → 7 panel/hook → 8 bloom      │   kesalahan lain)
                    └───────────────────┬──────────────────────────┘
                                        ▼
                    ┌──────────────────────────────────────────────┐
                    │ FASE 4  VERIFIKASI (waktu dikunci dulu!)      │
                    │ A DOM/copy=0 beda · B panel 82/82 ·           │  tanpa freeze clock,
                    │ C piksel (10 timestamp, 2 viewport) ·         │  diff piksel tak berarti
                    │ gerak ≤3px · audio ±3% · fungsi (14 uji)      │
                    └──────────────────────────────────────────────┘
```

**Aturan urutan yang tidak boleh dilanggar (dari master prompt):**
1. Fase 1 dan 2 selesai dan tersimpan **sebelum satu baris kode aplikasi ditulis**.
2. Ekstraksi mendahului arsitektur; arsitektur mendahului kode.
3. Dalam Fase 3: entry screen dulu (diff < 0.5%) → baru aset → baru timeline → audio → state → hand → panel → **bloom terakhir**.
4. Verifikasi butuh **pengunci waktu** (`window.__HUM_FREEZE_T` untuk APEX, freeze clock untuk MIRA) yang justru harus diimplementasikan di Fase 3 — jadi hook ini bukan opsional, ia prasyarat Fase 4.
5. Aset di-copy, bukan digenerate — jadi unduhan aset (Fase 0) harus terjadi sebelum komposisi (Fase 3.2).

---

## 3. Temuan audit pra-eksekusi (dari pemeriksaan hari ini)

Ini yang membuat rencana berbeda dari sekadar "ikuti Fase 0–4".

| ID | Temuan | Bukti | Dampak | Tindakan |
|---|---|---|---|---|
| **F-1** | `apex-index.html` & `mira-index.html` di `recon/` **tercemar Cloudflare Rocket Loader** — tag `<script>` diubah jadi `type="62d093f7…-module"` dan ada injeksi `/cdn-cgi/scripts/…/rocket-loader.min.js` | Lokal 813 B vs live 646 B; `diff` menunjukkan tepat 2 baris berbeda | Gerbang A (DOM 0 beda) **pasti gagal** kalau arsip dipakai sebagai ground truth | Pakai HTML live 646 B sebagai acuan; arsipkan ulang versi bersih. Cloudflare tidak menyuntik untuk User-Agent non-browser — sudah terbukti `curl` dapat 646 B |
| **F-2** | `verify-spec.py` **crash**: `sys.exit(1)` dipakai tapi `import sys` tidak ada; skrip juga melaporkan **191/193**, bukan 193/193 seperti klaim README | Traceback `NameError: name 'sys' is not defined`; 2 gagal = perbandingan blok HTML (akibat F-1) | Klaim "193/193 lolos" di README **tidak akurat hari ini**; kepercayaan pada spec harus dikalibrasi | Perbaiki 2 hal: `import sys`, dan normalisasi HTML (buang atribut `type="<hash>-module"` + script cdn-cgi) sebelum dibandingkan |
| **F-3** | **Tidak ada drift bundle.** Hash file & ukuran byte live == arsip | `index-BD7VNgkM.js` → `content-length: 1108884`; `index-1PiDnpcG.js` → `1185588`; HTML live memuat hash yang sama | Fase 0 bisa dipersingkat jadi **audit checksum**, tidak perlu tarik ulang | Tetap jalankan Fase 0 versi "verify-only": unduh → bandingkan `sha256` → stop kalau sama |
| **F-4** | **Gap dokumentasi MIRA**: bundle punya 13 query param (`state`, `listen`, `talk`, `voice`, `off`, `t`, `hot`, `mira_debug`, `intensity`, `map`, `vertex`, `fragment`, `auto`) dan 2 hook window; SPEC-MIRA hanya mendokumentasikan `mira_debug`, `hot`, `__MIRA_DEBUG` (+`__HUM_ATTN`) | hitung regex `get("…")` pada `mira.js` | Sebagian hook "wajib sama persis" belum punya spesifikasi → risiko `// UNVERIFIED` menumpuk | Fase 1.5 wajib **mendokumentasikan semua 13** dan menandai mana yang benar-benar aktif saat runtime |
| **F-5** | **Tidak ada browser headless/WebGL di sandbox ini** (tidak ada chromium/firefox, tidak ada `playwright`) | `which`/import test; hanya `node v20.20.2`, `npm`, `python3` + PIL/numpy | Gerbang C (diff piksel), ground-truth 1.9, snapshot DOM 1.8 **tidak bisa** jalan tanpa instalasi | Instal `playwright` + Chromium dengan `--enable-unsafe-swiftshader` (SwiftShader = WebGL software). Kalau gagal/lambat, fallback: verifikasi visual manual lewat preview browser user, dan Gerbang C dijalankan di mesin user |
| **F-6** | Spec APEX vs bundle: 19 `window.__HUM_*` di bundle, SPEC-APEX mendokumentasikan 18; `__HUM_BG_T` ada di bundle (dipakai di contoh kode §6) tapi tidak masuk tabel | regex vs tabel §6 | Satu hook `__HUM_BG_T` belum masuk daftar wajib | Tambahkan ke checklist implementasi |

**Kesimpulan audit:** paket ini **layak dieksekusi**, tapi butuh P0 kecil (perbaiki 2 file + arsipkan HTML bersih) sebelum Fase 1, dan Gerbang C butuh instalasi tooling.

---

## 4. Rencana eksekusi bernomor

Estimasi dalam **jam kerja agent** (bukan jam dinding), asumsi tooling tersedia.

### P0 — Normalisasi recon (½ jam) · *blocking, kerjakan pertama*

| # | Tugas | Perintah / output | Selesai bila |
|---|---|---|---|
| P0.1 | Arsipkan HTML bersih dari live | `curl -sL -o recon/apex-index.clean.html https://apex-humanoid.vercel.app/` (+ mira) → 646 B | `wc -c` = 646, tanpa `cdn-cgi` |
| P0.2 | Simpan HTML tercemar sebagai bukti, jangan dihapus | rename jadi `*-index.cloudflare.html` + catat di `REBUILD-LOG.md` | Kedua versi ada, asal-usul tertulis |
| P0.3 | Patch `verify-spec.py`: `import sys`; normalisasi HTML (buang `type="<hash>-module"` & script cdn-cgi) | diff skrip | `python3 verify-spec.py` → **193/193**, exit 0 |
| P0.4 | Audit checksum bundle live vs arsip | `sha256sum` keduanya | Identik → Fase 1 boleh pakai arsip |
| P0.5 | Catat 6 temuan F-1…F-6 ke `REBUILD-LOG.md` | tabel | Ada jejak, tidak ada yang disembunyikan |

### P1 — Fase 0 versi audit (½ jam)
Tarik `index.html`, bundle, dan daftar aset dari live **hanya untuk konfirmasi**; hasilkan `recon/asset-list.txt` + tabel dimensi asli (via `python3 -c "from PIL import Image…"`) untuk 10 webp. **Output:** konfirmasi "no sourcemap / no audio / no 3D model".

### P2 — Fase 1.1–1.2: stack + copy UI (2–3 jam)
- Hitung penanda library (react, R3F, postprocessing, mediapipe 0.10.14, Share Tech Mono).
- Ekstrak string UI **dengan urutan kemunculan** → `recon/ui-copy.txt`; buang noise three.js/React (nama Material/Geometry/Helper/Pass/Event).
- **Exit criteria:** setiap string di `SPEC-*.md` §2 ditemukan di `ui-copy.txt` dengan urutan yang konsisten.

### P3 — Fase 1.3: ekstraksi shader (4–6 jam, pekerjaan terberat)
- 55 blok GLSL-ish (APEX) + 70 (MIRA) → pisahkan **bawaan three.js** (PMREM/cubeUV) dari **custom aplikasi**.
- Custom → `recon/shaders/<target>/block-NNN.glsl`, **verbatim termasuk komentar**; indeks di `recon/shaders/INDEX.md` (nama blok, jenis frag/vert, uniform yang dipakai, modul asal).
- **Exit criteria:** jumlah custom shader terdaftar = jumlah yang dirujuk kode (bukan tebakan); tiap shader punya pemilik di Fase 2.

### P4 — Fase 1.4–1.5: parameter & hook (2–3 jam)
- **MIRA:** verifikasi `mira-params.json` 82/82 terhadap blok `{key:"lines.count"…` di bundle; konfirmasi 7 `stands` alias (`hum.fog.spread→field.spread`, `hum.fog.amount→field.alpha`, `hum.waves.opacity`, `hum.waves.speed`, `hum.glow.strength→bloom.strength`, `hum.glow.threshold`, `hum.glow.radius`); konfirmasi 19 nama grup unik (20 seksi karena "Her hair" 2×).
- **APEX:** daftar 19 hook `window.__HUM_*` (termasuk `__HUM_BG_T` yang belum masuk spec) + 8 query param (`skip asmoff asmel nobg bgrest bgpulse surge state`); buang `auto/map/intensity/vertex/fragment` (= artefak three.js, bukan milik app).
- **MIRA gap (F-4):** dokumentasikan 13 query param, tandai mana aktif.
- **Exit criteria:** `recon/hooks.json` + `recon/params-verified.md`; nol `// UNVERIFIED` di daftar hook.

### P5 — Fase 1.6–1.7: audio graph + timing (3–4 jam)
- Audio: hitung & buka konteks tiap `createOscillator/Gain/BiquadFilter/BufferSource/WaveShaper/Convolver/StereoPanner/Analyser/DynamicsCompressor`. Target terverifikasi (dari `verify-spec.py`): APEX 16/35/7/4/4/2/2/3/1; MIRA 16/36/8/5/4/2/4/3/1. Baca: waveform, freq, Q, cutoff, kurva waveshaper, envelope ADSR, urutan koneksi, RMS→uniform.
- Timing: semua `setTimeout(...,N)`, `transition: opacity 140ms/900ms/.25s linear`, `humRingBase 3.4s`, `humRingPulse 4.55s`, durasi fase state → `recon/timings.json`.
- **Exit criteria:** tiap angka punya `file:offset` sebagai asal, nol tebakan.

### P6 — Fase 1.8–1.9: DOM runtime + ground truth (3–5 jam, **butuh browser**)
- Instal Playwright + Chromium (SwiftShader). Dump `outerHTML` pada 5 momen; `getComputedStyle` untuk tiap node teks & tombol; daftar class (APEX: `apex-finger-track`, `apex-gesture-quiet`, `apex-gesture-snap`, `humanoid-portrait-frame`, `humanoid-mode`; MIRA: 8 class §3).
- Screenshot 1440×900 & 390×844 dengan **waktu dikunci**; rekaman video 20 detik 30 fps klik-ENTER→idle → `recon/ground-truth/`.
- **Exit criteria:** ground truth ada **sebelum** implementasi, dan bisa direproduksi dua kali dengan hasil sama (bukti penguncian waktu bekerja).

### P7 — Fase 2: ARCHITECTURE (3–4 jam)
Isi wajib 6 poin (pohon komponen, state+transisi+durasi, layer+blend APEX 5 mode, uniform→sumber, aset→pemakaian, daftar UNVERIFIED). **Gate:** setiap string dari P2 punya pemilik komponen. Jika belum → kembali ke P2/P3, jangan lanjut P8.

### P8 — Fase 3: implementasi, dua target berurutan (**APEX dulu**, 15–25 jam/target)
Alasan APEX dulu: 224 B CSS tanpa breakpoint, visual dari 8 webp (deterministik), tanpa panel 82 slider, tanpa 8 modul `lib/` — jadi lebih cepat memberi bukti bahwa pipeline 4-gerbang bekerja. MIRA dikerjakan setelah pipeline itu terbukti, karena ia yang punya komponen paling rapuh (shader ribbon, `figureHead3d`, 82 slider + 7 alias).

| Langkah | APEX | MIRA | Gate internal |
|---|---|---|---|
| 1. Entry statis | title, copy, tipografi `clamp(9px,1.05vmin,13px)` | + readout `MIC `/`SOUND `/`SPEED ` | diff piksel < 0.5% |
| 2. Aset/geometri diam | 8 webp, portrait `min(100vw,100vh)` cover, overlay `rgba(0,10,14,.72)`, 5 blend mode | 2 webp sebagai mask (`brightness(0) invert(1)`), ring | side-by-side manual |
| 3. Timeline birth | assembly-25/60, `__HUM_ASM_EL`, dt clamp `Math.min(.05,dt)` | `lib/miraBuild` (flicker, touchWave, revealAt) | durasi ≤ 30 ms |
| 4. Audio | 16 osc + graph lengkap, Analyser→RMS | idem (36 gain, 8 filter) | puncak frekuensi ±3% |
| 5. State + mic | `idle/listening/thinking/speaking/strong`, `(e-.34)/.4`, `__HUM_SPEAK_AMP .55` | `IDLE/LISTENING/TALKING`, 4 param *Her states* | transisi 140/900 ms terukur |
| 6. Hand tracking | MediaPipe 0.10.14, 3 class gesture, 3 pesan error persis | point/pinch → `hum.touch.wave` | tolak kamera → teks identik |
| 7. Panel/hook | 19 hook + 8 query param | 82 slider/20 seksi + 7 alias + `lib/miraDial` | B: 82/82 |
| 8. Bloom | `uBloomR`, threshold | `bloom.*` + `hum.glow.*` (default BEDA: .18 vs .6) | C: seluruh ambang |

### P9 — Fase 4: verifikasi (6–10 jam/target + 2 jam laporan)
Kunci waktu dulu (`__HUM_FREEZE_T`, freeze clock MIRA), lalu jalankan 4 gerbang: **A** DOM/copy 0 beda · **B** panel 82/82 termasuk urutan grup · **C** piksel 10 timestamp × 2 viewport (0% piksel >32/255; ≤0.10% >8/255; MAE ≤1.5/255; bbox ≤1 px; durasi ≤30 ms) · **D** gerak ≤3 px @3 fps, audio ±3%, 14 uji fungsi (autoplay resume, reload→entry, REPLAY, mic, kamera izin/tolak/3 pesan, resize+rotate+720px, `prefers-reduced-motion`, `context lost`, semua hook). Deploy ke Vercel, lalu **ulangi Gerbang C melawan URL live asli dari deployment**, bukan localhost.

### P10 — Deliverable & serah terima (2 jam)
Repo Vite+React+TS + `vercel.json` (SPA fallback, cache header `/assets`), `recon/` lengkap, `VERIFICATION.md` (keluaran mentah per timestamp + tabel pass/fail + screenshot berdampingan), `REBUILD-LOG.md` (deviasi + `// UNVERIFIED`, idealnya kosong), URL deploy.

**Total estimasi:** APEX ≈ 35–45 jam · MIRA ≈ 55–70 jam · bersama (P0–P7 + P10 dipakai dua kali) ≈ **95–120 jam kerja agent**.

---

## 5. Matriks gerbang: apa yang bisa dijalankan di sini vs butuh mesin user

| Gerbang | Metrik | Bisa di sandbox? | Prasyarat |
|---|---|---|---|
| Statik (P0.3, P4) | 193 klaim spec, 82 param, hook | ✅ ya | python3 (ada) |
| A — DOM/copy | 0 beda teks/class/gaya | ⚠ butuh browser | Playwright + Chromium (F-5) |
| B — Panel MIRA | 82/82 + urutan grup | ⚠ butuh browser (DOM panel) | idem; bisa juga lewat render React + jsdom |
| C — Piksel | 10 timestamp × 2 viewport | ⚠ **butuh WebGL** | Chromium `--enable-unsafe-swiftshader`; lambat tapi mungkin |
| D — Gerak/audio | ≤3 px, ±3% frekuensi | ⚠ butuh rekaman | loopback audio / `OfflineAudioContext` |
| Deploy Vercel | URL preview | ❌ tidak (tanpa kredensial) | akun/CLI user |

**Rencana mitigasi:** P6 menguji dulu apakah SwiftShader cukup untuk Gerbang C. Kalau render berbeda > ambang karena software rasterizer, keputusan yang jujur: Gerbang C dijalankan di mesin user (screenshot manual) dan sandbox hanya menjalankan A/B/statik + diff piksel berbasis gambar yang diberikan user.

---

## 6. Risiko & mitigasi

| Risiko | Peluang | Dampak | Mitigasi |
|---|---|---|---|
| Shader 55/70 blok tercampur bawaan three.js → salah salin | Tinggi | Visual melenceng diam-diam | P3 wajib memisahkan berdasarkan nama blok & pemanggil; indeks shader |
| Seed PRNG tidak terekstrak → partikel tak bit-identik | Sedang | Gerbang C gagal di area prosedural | Cari `Math.random`, `hash(`, `*123.34`, `12345.6789`; kalau gagal → deviasi tercatat, bukan disembunyikan |
| `mira.js` 118 `lib/`-comment tapi hanya 8 modul bernama → batas modul kabur | Sedang | Struktur proyek menyimpang | P7 menetapkan batas 8 modul dari bukti, bukan selera |
| Default `hum.*` vs `scene.*` berbeda (7 alias) | Tinggi | Slider menggerakkan nilai salah | P4 mengunci tabel alias; Gerbang B menguji per pasangan |
| Waktu tidak terkunci → diff piksel tak bermakna | Tinggi | Laporan verifikasi palsu | Hook freeze diimplementasikan di Fase 3 langkah 5, dipakai di P9 |
| Tooling WebGL tidak memadai | Sedang | Gerbang C tak bisa otomatis | Uji lebih awal di P6; fallback verifikasi manual user |
| Spec usang karena redeploy | Rendah (hari ini nol drift) | Semua angka bergeser | Cek checksum di awal setiap sesi (P0.4) |

---

## 7. Yang perlu kamu putuskan sebelum P8

1. **Target:** APEX saja, MIRA saja, atau keduanya berurutan (rekomendasi: APEX → MIRA).
2. **Kedalaman:** eksekusi penuh sampai Gerbang C (butuh instalasi browser + kemungkinan deploy), atau berhenti di P7 (arsitektur + artefak ekstraksi lengkap) dulu.
3. **Toleransi deviasi:** apakah deviasi PRNG/software-renderer boleh diterima sebagai "100% terukur dengan pengecualian tercatat" — sesuai semangat README.
4. **Kepemilikan deploy:** siapa yang menjalankan `vercel deploy` untuk uji Gerbang C melawan URL produksi.

---

## 8. Langkah berikutnya (bisa saya jalankan sekarang)

- **P0 lengkap** (perbaiki `verify-spec.py`, arsipkan HTML bersih, tulis temuan F-1…F-6 ke `REBUILD-LOG.md`) — ±30 menit, tidak menyentuh isi `recon/` selain menambah file baru.
- **P2 + P4** (ekstraksi copy UI, verifikasi 82 param, inventaris hook APEX/MIRA) — menghasilkan `recon/ui-copy.txt`, `recon/hooks.json`, `recon/params-verified.md`.
- **P3 sebagian** (penggal shader custom vs bawaan three.js + indeks) — bagian terberat, paling berharga, murni statik.
