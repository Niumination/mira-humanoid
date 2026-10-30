# Verifikasi Deploy MIRA (rebuild) — 2026-10-30

## Temuan arena.ai (benar)
`mira-humanoid.vercel.app` BUKAN milik proyek kita — subdomain global first-come-first-served,
sudah dipakai app MIRA asli (bundle `index-1PiDnpcG.js`, 1.185.588 B, MediaPipe).

## Deployment rebuild kita yang sah
- Project Vercel: `mira-humanoid-niu` (akun archk4lis-projects)
- **URL produksi: https://mira-humanoid-niu.vercel.app** — publik, TANPA Deployment Protection

## Bukti bundle identik (sha256)
- Produksi `assets/index-CgepBFsa.js` = `cbecb4dad826122e8bf127f546b13519c04a26bd7e6a064a1b54260556dcc89a`
- Build repo HEAD (25fdce5) = sha256 sama persis
- Penanda rebuild di bundle produksi: `__MIRA_MATTER`, `__MIRA_STRANDS`, `__MIRA_WAVES` ✓
- Tidak ada `mediapipe` / `hand_landmarker` ✓ (app asli punya, rebuild tidak)

## Catatan deploy lama
- Deployment pertama di project `mira-humanoid` (lsa6f5u6k) Ready tapi kena Deployment
  Protection (SSO) — 200 lewat CLI tapi publik diblokir. Tidak dipakai.
- Gerbang piksel penuh bisa dijalankan terhadap URL di atas.
