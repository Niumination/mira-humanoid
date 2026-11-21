# DEVIASI ALAT vs PAKET 6L — deviasi sadar, terdokumentasi

Repo memakai adaptasi portabel (.cjs + env-aware). G7 membandingkan hanya alat yang byte-identik;
alat di bawah ini dikecualikan karena perubahan sadar (lihat TERAPAN-6l):

| alat paket | di repo | alasan |
|---|---|---|
| `gate-aset-layout.js` | `gate-aset-layout.cjs` | env-aware + .cjs (patch 6a–6k dipertahankan) |
| `gate-paritas-fase.js` | `gate-paritas-fase.cjs` | fix bug paket: bingkai pertama (f1) tak pernah di-screenshot sebelum pengukuran pertama — ditambah screenshot f1+f2 di iterasi 0 |
| `gerbang-semua.sh` | `gerbang-semua.sh` | env-aware + .cjs (patch 6a–6k dipertahankan) |
| `uji-gerbang.py` | `uji-gerbang.py` | env-aware + .cjs (patch 6a–6k dipertahankan) |
