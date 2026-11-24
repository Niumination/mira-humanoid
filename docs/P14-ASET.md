# P14 — Regenerasi aset plate (pengganti P13)

## Ringkas
Seluruh plate `public/humanoid/*.webp` dibangkitkan ulang dengan generator baru
`tools/p14-plate.py`, dan gerbang penerimaan aset diganti dari gerbang P13 ke
`tools/gerbang-p14.py`.

**Tidak ada perubahan kode runtime.** Hanya berkas aset + 2 alat di `tools/`.
Hash bundel JS tidak berubah saat dibangun ulang.

## Kenapa

Gerbang P13 hanya mengukur **siluet** dan **luma pita**. Plate P13 lulus pada yang
diukurnya, tetapi isi di dalam siluet praktis tidak berkorelasi dengan rujukan —
dan itulah yang terlihat mata. Diukur ulang, **10 dari 10** plate yang sekarang
terbit gagal pada gerbang baru:

| plate (P13, terbit sekarang) | mae_sil | IoU | r_grad | luma |
|---|---:|---:|---:|---:|
| apex-idle-v1 | 41,65 | 0,981 | 0,395 | 0,973 |
| apex-listening-v1 | 31,81 | 0,992 | 0,161 | 0,981 |
| apex-thinking-v1 | 35,64 | 0,982 | 0,429 | 0,969 |
| apex-speaking-v1 | 40,78 | 0,981 | 0,417 | 0,975 |
| apex-speaking-strong-v1 | 48,27 | 0,979 | 0,396 | 0,957 |
| apex-assembly-25-v1 | 36,32 | 0,979 | 0,370 | 0,965 |
| apex-assembly-60-v1 | 42,73 | 0,978 | 0,403 | 0,969 |
| backdrop-v1 | 31,96 | 0,603 | 0,181 | 0,795 |
| mira-hair-v1 | 70,12 | 0,628 | 0,300 | 0,816 |
| mira-idle-v1 | 69,07 | 0,987 | 0,195 | 0,890 |

Sesudah P14, **10 dari 10 lulus**:

| plate (P14) | mae_sil | IoU | r_grad | luma | anggaran param |
|---|---:|---:|---:|---:|---:|
| apex-idle-v1 | 8,45 | 0,989 | 0,935 | 0,999 | 80,8 % |
| apex-listening-v1 | 7,41 | 0,994 | 0,880 | 0,996 | 80,9 % |
| apex-thinking-v1 | 7,61 | 0,983 | 0,936 | 1,002 | 80,8 % |
| apex-speaking-v1 | 7,57 | 0,988 | 0,934 | 1,001 | 81,0 % |
| apex-speaking-strong-v1 | 8,40 | 0,986 | 0,932 | 0,999 | 80,8 % |
| apex-assembly-25-v1 | 7,60 | 0,986 | 0,926 | 1,002 | 78,4 % |
| apex-assembly-60-v1 | 8,43 | 0,988 | 0,932 | 1,002 | 78,4 % |
| backdrop-v1 | 8,05 | 0,988 | 0,909 | 0,997 | 88,0 % |
| mira-hair-v1 | 8,33 | 0,978 | 0,939 | 0,998 | 88,1 % |
| mira-idle-v1 | 7,99 | 0,998 | 0,764 | 0,994 | 86,3 % |

## Bukti di layar (preview lokal, bukan produksi)

1440×900, DPR 1, median 5 frame jarak 400 ms, UI overlay disembunyikan.
APEX `?auto=1` (tunggu 11 s), MIRA `?auto=1&t=9`.

| | MAE penuh | MAE tengah |
|---|---:|---:|
| APEX terbit sekarang (P13) | 25,92 | 30,27 |
| **APEX P14** | **8,42** | **11,22** |
| MIRA terbit sekarang (P13) | 22,38 | 53,66 |
| **MIRA P14** | **8,41** | **15,74** |

## Gerbang baru — `tools/gerbang-p14.py`

| syarat | ambang | yang ditangkap |
|---|---|---|
| `mae_sil` | ≤ 12,0 | beda warna DI DALAM siluet (dulu tidak diukur) |
| `r_grad` | ≥ 0,75 | korelasi struktur garis (dulu tidak diukur) |
| `iou` | ≥ 0,95 | siluet (syarat lama) |
| `luma_ratio` | 0,98–1,02 | plate tidak boleh lebih gelap/terang |
| anggaran param | ≤ 90 % piksel | pagar ke arah sebaliknya, lihat bagian lisensi |

Jalankan:
```
python3 tools/gerbang-p14.py --asli <DIR_RUJUKAN> --kandidat public/humanoid
```
Keluar dengan kode 1 bila ada yang gagal, sehingga bisa dipakai di CI.

## Lisensi & provenance — baca sebelum merge

Plate P14 adalah **keluaran model parametrik**, bukan salinan berkas. Yang disimpan
hanya koefisien: kisi interior `KU×KV`, haze eksterior `GE×GE`, dan `2×N_SPAN`
koefisien DCT siluet; render memakai interpolasi bicubic.

Namun model tersebut **dipasang (fit) terhadap aset rujukan**. Karena itu anggaran
parameter dipagari **≤ 90 % jumlah piksel** dan dicatat per berkas: makin tinggi
anggaran, makin dekat ke salinan terkompresi dan makin lemah klaim
`lisensi.aset = "milik-sendiri"`. Konfigurasi di sini dipilih pada anggaran paling
besar yang masih di bawah pagar (78–88 %).

**Ini keputusan pemilik, bukan keputusan alat.** Bila klaim "milik sendiri" harus
lebih kuat, turunkan `--ku` (mis. 96 → ±20–26 % anggaran) dan terima `mae_sil`
yang lebih tinggi; angka trade-off lengkapnya ada di laporan P14.

## Reproduksi

Semua keluaran deterministik. Dari direktori rujukan `<DIR_RUJUKAN>`:

```
python3 tools/p14-plate.py <REF>/apex-idle-v1.webp            public/humanoid/apex-idle-v1.webp            --ku 320 --kv 1295 --ge 96 --span 600
python3 tools/p14-plate.py <REF>/apex-listening-v1.webp       public/humanoid/apex-listening-v1.webp       --ku 320 --kv 1295 --ge 96 --span 600
python3 tools/p14-plate.py <REF>/apex-thinking-v1.webp        public/humanoid/apex-thinking-v1.webp        --ku 320 --kv 1295 --ge 96 --span 600
python3 tools/p14-plate.py <REF>/apex-speaking-v1.webp        public/humanoid/apex-speaking-v1.webp        --ku 320 --kv 1296 --ge 96 --span 600
python3 tools/p14-plate.py <REF>/apex-speaking-strong-v1.webp public/humanoid/apex-speaking-strong-v1.webp --ku 320 --kv 1293 --ge 96 --span 600
python3 tools/p14-plate.py <REF>/apex-assembly-25-v1.webp     public/humanoid/apex-assembly-25-v1.webp     --ku 320 --kv 1254 --ge 96 --span 600
python3 tools/p14-plate.py <REF>/apex-assembly-60-v1.webp     public/humanoid/apex-assembly-60-v1.webp     --ku 320 --kv 1254 --ge 96 --span 600
python3 tools/p14-plate.py <REF>/backdrop-v1.webp             public/humanoid/backdrop-v1.webp             --ku 480 --kv  941 --ge 96 --span 600
python3 tools/p14-plate.py <REF>/mira-hair-v1.webp            public/humanoid/mira-hair-v1.webp            --ku 400 --kv 1422 --ge 96 --span 600
python3 tools/p14-plate.py <REF>/mira-idle-v1.webp            public/humanoid/mira-idle-v1.webp            --ku 240 --kv 1374 --ge 96 --span 600 --mode alpha
```

Kebutuhan: python3 + numpy, scipy, pillow.

## Sisa yang BELUM beres (jangan diklaim selesai)

- MIRA masih menyisakan selisih di puncak rambut (±29) dan tepi figur (±22) yang
  **tidak** turun walau anggaran dinaikkan → penyebabnya komposisi/kode, bukan aset.
- Tercatat: situs rujukan MIRA merender **3** kanvas (`1007×630`, `1145×1374`,
  `1440×900`); build ini hanya **2** (`1440×900`, `1007×630`). Kanvas `1145×1374`
  persis seukuran plate idle. Ini kandidat penyebab utama dan perlu perbaikan kode.
- Rujukan MIRA tetap beranimasi pada `?t=9`, build ini membeku. Tafsir jangkar waktu
  `?t=` berbeda.
