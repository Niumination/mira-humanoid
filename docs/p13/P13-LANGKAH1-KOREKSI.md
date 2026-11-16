# KOREKSI untuk P13-LANGKAH1.md (jangan ubah berkas aslinya)

Berkas `docs/p13/P13-LANGKAH1.md` **sudah dikirim** di paket 5q dan tidak diubah. Yang salah di dalamnya:
definisi mask dan seluruh angka cakupan/IoU yang diturunkan darinya.

- Mask lama: `gaussian(σ=6) luma > 40` → **memotong bahu**. `apex-idle-v1` terukur 22,9 % (bukan 35,7 %).
- Mask baru (dipakai `tools/p13-siluet.py`, `p13-aset.py`, `p13-garis.py`): `gaussian(σ=3) luma > 8`
  (APEX), `luma > 3` (mira-hair), `alfa > 32` (mira-idle).

## Angka pengganti (langkah 1)

| plate | cakupan baru | IoU model (baru) |
|---|---|---|
| apex-idle | 35,66 % | 0,9991 |
| apex-listening | 59,59 % | 0,9998 |
| apex-speaking | 34,49 % | 0,9992 |
| apex-speaking-strong | 38,50 % | 0,9991 |
| apex-thinking | 32,76 % | 0,9993 |
| apex-assembly-25 | 37,13 % | 0,9990 |
| apex-assembly-60 | 37,64 % | 0,9992 |
| mira-idle | 50,85 % | 1,0000 |
| mira-hair | 16,78 % (dengan `luma > 3`; `siluet.json` mencatat 23,6 % karena definisi `gaussian σ3 > 3` dipakai konsisten) | 0,9994 |

**Kesimpulan langkah 1 tetap sama: 9/9 lulus syarat IoU ≥ 0,98.** Yang berubah angkanya.
Angka resmi yang berlaku sekarang: `verification/p13/siluet.json` dan `verification/p13/aset-siluet.json`.
Rincian sebab dan akibat koreksi: `docs/p13/P13-LANGKAH2.md` §1.
