# Paket langkah 4g — build33

## Isi
Satu berkas kode: `src/components/MiraStage.tsx`.

### F-131 — denyut haze khusus ledakan awal
Denyut haze pertama berpusat di 1,95 (lebar 0,75); pada t=1,0 nilainya tinggal 20 % → build kita
kekurangan cahaya menyeluruh di jendela 0,8–1,2 (profil radial t=1,0: −32 di r 40–60 · −43 di 60–80 ·
−45 di 80–100). Ditambahkan denyut **terpisah** di 0,95 dengan lebar sempit 0,35 dan tinggi `hp = 0,7`.
Penyapu `hz` membuktikan ini bukan soal skala global: `hz=2` memperbaiki t=1,0 tetapi menghancurkan
t=1,5 (1,44 → 8,98).

### F-131b — sprite haze menyusut sesudah t≈1,35
Selama ledakan awal sprite haze diperbesar 1,3× lalu menyusut ke 1,0×
(`hs = 1,0·(1 + 0,3·(1 − smoothstep(t; 1,25; 1,45)))`). Tanpa penyusutan, t=1,5 memburuk (1,47 → 2,16).

Knob riset baru: `?hp=` (tinggi denyut awal, default 0,7), `?hse=` (tambahan skala awal, default 0,3).

## Cara terapkan
```bash
unzip -o niu-update-langkah4g.zip -d <repo-mira-humanoid>
cd <repo-mira-humanoid>
npm ci && npm run build
vercel deploy --prod
```

## Gerbang
6 fase:
| t | 0,3 | 1,89 | 3,5 | 5,5 | 6,8 | 9,5 | rata² |
|---|---|---|---|---|---|---|---|
| sebelum (build32) | 1,28 | 2,07 | 1,91 | 2,84 | 3,05 | 4,71 | 2,64 |
| **sesudah (build33)** | **1,14** | 2,07 | 1,91 | 2,84 | 3,05 | 4,71 | **2,62** |

Jendela yang diperbaiki (sebelum → sesudah):
| t | 0,5 | 0,7 | 0,8 | 0,9 | 1,0 | 1,2 |
|---|---|---|---|---|---|---|
| build32 | 2,56 | 3,76 | 4,27 | 4,14 | 4,84 | 2,74 |
| **build33** | **2,07** | **2,38** | **1,93** | **2,22** | **2,82** | **1,63** |

Rata-rata 24 fase **3,56 → 3,22**; hanya t=1,5 yang bergeser +0,03 (1,44 → 1,47).
Sebutkan nama `dist/assets/index-*.js` hasil build supaya bisa saya verifikasi sha-nya.

## Sisa terbesar (untuk kerja berikutnya)
8,0 (5,38) · 7,5 (5,28) · 11,0 (4,96) · 12,0 (4,94) · 11,5 (4,88). Peta selisih t=11,0 menunjukkan
kelebihan +9…+15 di blok **dada/torso** (garis tengah kita lebih terang), bukan lagi soal tata letak.
