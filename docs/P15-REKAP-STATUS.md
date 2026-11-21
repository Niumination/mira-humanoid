# P15 — rekap aktual setelah 6n dan protokol benchmark

## Putusan ringkas

- **Sinkronisasi repo APEX 6n: terbukti.** `main` = `fb0e0adad48ccad2de9cdaaa82a1b7c8e6bb422c`; tarikan bersih
  `npm ci` + `npm run build` lulus dan menghasilkan `index-DeDMCu_9.js` 235 260 B, SHA-256
  `873d3b54ea222267`, sama dengan APEX produksi.
- **Repo MIRA menerima dokumen protokol:** `main` = `98dbe75b2c3070fa6763a5aac8af8fd3c2ff1c43`, commit
  `P15: protokol benchmark v1 (sinkron APEX)`. Isi `docs/P15-PROTOKOL-BENCHMARK.md` ada di remote.
- **Deploy resmi MIRA masih cocok dengan repo:** `index-BiuEEVDg.js` 533 885 B, SHA-256
  `17fc09d82f4fd52c`; `mira-idle` `8409aa77647ed8d5…`, `mira-hair` `6c5e6791e3a5b9db…`.
- **Domain MIRA legacy berbeda:** `mira-humanoid.vercel.app` masih menyajikan bundel `index-xg1U0Foi.js`
  (1 201 961 B, `ab1c4fbb0fb0e0cb`) serta dua plate lama. Jangan gabungkan hasil ini dengan deploy resmi
  `mira-humanoid-niu.vercel.app` tanpa konfirmasi pemilik domain.
- **Kesetaraan visual belum terbukti; “di depan” belum terbukti.** Gerbang 7/7 dan build-identik menguji
  konsistensi/penerapan, bukan kesetaraan tampilan menyeluruh. Berdasarkan matriks E1–E5, baru E3
  (aksesibilitas 16/16) punya bukti lulus yang cukup; ambang “di depan” ialah 3/5.

## Header dan aset yang diperiksa

| URL | HTTP / hasil |
|---|---|
| `niu-humanoid.vercel.app/` | 200; JS `index-DeDMCu_9.js` 235 260 B / `873d3b54ea222267` |
| `mira-humanoid-niu.vercel.app/` | 200; JS `index-BiuEEVDg.js` 533 885 B / `17fc09d82f4fd52c` |
| APEX `/humanoid/backdrop-v1.webp` | 200 `image/webp`, 447 002 B, `35539292a3b90dbd…` |
| MIRA `/humanoid/mira-idle-v1.webp` | 200 `image/webp`, 205 698 B, `8409aa77647ed8d5…` |
| MIRA `/humanoid/mira-hair-v1.webp` | 200 `image/webp`, 93 344 B, `6c5e6791e3a5b9db…` |
| MIRA resmi `/humanoid/backdrop-v1.webp` | 200 **HTML 646 B**, bukan gambar; tidak ada backdrop statis di MIRA, jadi URL fallback bukan aset yang lulus |

## Probe benchmark — hasil aktual, tapi bukan hasil kelulusan

Probe Chromium menggunakan alat lama `kalibrasi-paritas.js`. Pemeriksaan kode menemukan konstanta `FREEZE`
didefinisikan tetapi tidak digunakan. Capture tanpa anchor MIRA resmi berada di bola/glow awal (coverage desktop
1,45%) sedangkan `?t=11.5` memberi coverage sekitar 48,7%. Maka capture pertama **INVALID** untuk perbandingan
kesetaraan.

Pada probe satu sesi dengan query kandidat:

| | APEX acuan vs rekonstruksi (coverage seluruh layar `L>20`) | MIRA acuan legacy vs rekonstruksi resmi |
|---|---:|---:|
| desktop 1440×900 | 14,26% vs 34,39% | 46,08% vs 48,74% |
| ponsel 414×896 | 12,49% vs 27,49% | 43,12% vs 50,60% |
| ponsel 390×844 | 15,32% vs 27,65% | 43,90% vs 50,88% |

MAE diri pada APEX acuan masih tinggi (12,04–17,76); query waktu belum terbukti dipatuhi sumber. Domain MIRA
acuan berstatus legacy. Coverage juga meliputi glow/backdrop, bukan mask figur. Jadi angka ini hanya petunjuk:
MIRA tampak dekat pada desktop di anchor tersebut; APEX jauh lebih terang/penuh pada mask layar sederhana.
**Tidak** boleh dipakai untuk klaim lulus/gagal. Dibutuhkan mask figur tervalidasi + 3 cold-run.

Artefak lokal yang dihasilkan:
- protokol: `docs/P15-PROTOKOL-BENCHMARK.md`
- ringkasan: `verification/p15/kalibrasi-2026-11/ringkas-probe.json`
- JSON per probe: folder `verification/p15/kalibrasi-2026-11/`

**Kesenjangan jejak audit:** tree GitHub MIRA saat ini memiliki dokumen protokol/status, tetapi belum memuat
folder hasil probe `verification/p15/kalibrasi-2026-11/`. Jangan anggap probe sudah menjadi bukti repo sampai
JSON ringkas dan per-run dikomit.

## Langkah berikut yang konkret

1. Perbaiki harness: `scene-ready` (kanvas/WebGL + avatar terdeteksi), anchor query diuji per bundle, 3 cold-run,
   invalidasi otomatis untuk fase bola/UI/kanvas kosong.
2. Validasi segmentasi/mask avatar manual untuk sumber dan rekonstruksi; ukur IoU, coverage figur, cx/cy, aspect,
   timing/state; simpan capture bersama hash bundle/aset dan log.
3. Konfirmasi domain MIRA sumber berwenang; bila tidak, minta pemilik menetapkan acuan resmi.
4. Uji E1/E2/E4/E5 dengan harness terukur. E2 perlu perangkat/kondisi sama dan ≥3 run × 60 s; E4 butuh recovery
   context WebGL, bukan hanya sesi 120 s.
5. Setelah itu baru beri putusan akhir “setara/di depan” dan pertimbangkan lisensi/rebranding terpisah.
