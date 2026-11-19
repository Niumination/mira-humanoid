# Jangkar waktu `?t=` — kenapa ada, apa yang dijamin, dan batasnya

## 1. Masalah yang ditutup

Gerbang berbasis tangkapan layar mengukur **satu bingkai pada satu detik**. Aplikasi ini beranimasi:
kelahiran (birth) APEX 7,4 s, idle MIRA sampai ±11,5 s, plus denyut dan partikel tanpa henti. Di sandbox
tanpa GPU (SwiftShader ±2,5 fps) selisih waktu tangkapan 1 detik bisa berarti fase animasi yang berbeda
sama sekali.

Bukti angka (MIRA, 414×896, sebelum jangkar):

| waktu tunggu | cakupan siluet |
|---|---|
| 2,6 s | **0,042** |
| 3,5 s | 0,236 |
| 4,4 s | 0,042 |
| 5,3 s | 0,043 |

Rentang 0,2 pada besaran yang dipakai sebagai kriteria lulus/gagal — cukup untuk membuat gerbang memberi
putusan acak pada aplikasi yang sama.

## 2. Solusi

Memakai parameter waktu yang **memang dimiliki aplikasi**:

| aplikasi | jangkar | arti |
|---|---|---|
| MIRA | `?t=11.5` | skor adegan dimulai dari detik 11,5 — dipakai sejak awal (idle penuh) |
| APEX | `?t=9` | **baru di paket ini**; memaku jam adegan ke 9 s (melewati kelahiran 7,4 s) |

### Yang diubah di APEX (paket 6d)

| berkas | perubahan | jaminan |
|---|---|---|
| `src/App.tsx` | `?t=` ikut memicu masuk mode humanoid (sebelumnya hanya `?auto`) | tanpa `?t=`, perilaku lama **utuh** |
| `src/components/HumanoidMode.tsx` | `tPin` dibaca dari URL: (a) `t0` dimundurkan `tPin` detik, (b) jalur "sudah lahir" dipakai, (c) jam steady dikunci `tPin + 0,35` | tanpa `?t=`, ketiga cabang tidak aktif |

`0,35 s` bukan angka sakti: umpan silang state pertama di steady-state memakai durasi pendek itu, jadi jam
di `tPin + 0,35` membuat drawSteady melihat `t > TIMELINE.total` **dan** fade sudah selesai
(diverifikasi: `__HUM_FADE.p = 1` pada 5 cuplikan berturut-turut).

## 3. Hasil terukur

| ukuran (1440×900, 2 run) | sebelum (`?auto=1`) | sesudah (`?t=9`) |
|---|---|---|
| MAE diri | 17,40 · 12,63 | **6,47 · 6,19** |
| Δ cakupan antar run | **0,0475** | **0,0048** |
| fade saat diukur | belum tentu 1 | selalu 1 |

Untuk MIRA (sudah memakai `?t=11.5`): MAE diri **0,00** pada ketiga viewport (bukti di
`verification/p14/gate-paritas-2026-11-18.json`).

## 4. Batas yang jujur

1. `?t=` **tidak** menghentikan denyut/partikel halus; ia hanya memaku **fase** adegan. Sisa derau 0,0048
   pada cakupan berasal dari itu, bukan dari jam.
2. Jangkar APEX baru diuji pada 1440×900 (dua run). Pengukuran 390/414 menyusul di paket berikutnya.
3. Hook `__HUM_ASM_EL` / `__HUM_FREEZE_T` tetap ada dan tetap didahulukan: `?t=` adalah lapisan **tambahan**
   untuk keadaan yang bisa dicapai lewat URL, bukan pengganti hook.
4. Angka fps absolut tidak boleh dibandingkan antar mesin; semua angka di atas dari lingkungan yang sama
   (sandbox 2 vCPU + SwiftShader).
