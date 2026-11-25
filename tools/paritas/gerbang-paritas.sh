#!/usr/bin/env bash
# gerbang-paritas.sh — ukur paritas satu situs klon terhadap domain aslinya.
# Tidak menyentuh git, tidak deploy. Hanya membuka browser, menangkap, dan mencetak angka.
#
#   ./gerbang-paritas.sh apex            # apex-humanoid.vercel.app  vs niu-humanoid.vercel.app
#   ./gerbang-paritas.sh mira            # mira-humanoid.vercel.app  vs mira-humanoid-niu.vercel.app
#   KLON=http://localhost:5173 ./gerbang-paritas.sh apex   # uji build lokal
#
# Prasyarat: node + playwright (atau env PLAYWRIGHT_MODULE), python3 + numpy + pillow.
set -euo pipefail

SITUS="${1:-apex}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${OUT:-/tmp/paritas-cap}"
FRAMES="${FRAMES:-9}"
GAP="${GAP:-400}"

case "$SITUS" in
  apex)
    ASLI="${ASLI:-https://apex-humanoid.vercel.app/?auto=1}"
    KLON="${KLON:-https://niu-humanoid.vercel.app/?auto=1}"
    WAIT="${WAIT:-11000}"
    ;;
  mira)
    ASLI="${ASLI:-https://mira-humanoid.vercel.app/?auto=1&t=9}"
    KLON="${KLON:-https://mira-humanoid-niu.vercel.app/?auto=1&t=9}"
    WAIT="${WAIT:-9000}"
    ;;
  *) echo "pakai: ./gerbang-paritas.sh [apex|mira]"; exit 2 ;;
esac

# jika KLON diisi tanpa query, tambahkan query yang sama dengan acuan
case "$KLON" in *\?*) ;; *) KLON="$KLON/?${ASLI#*\?}" ;; esac

mkdir -p "$OUT"
echo "== tangkap acuan: $ASLI"
node "$HERE/tangkap.js" --url "$ASLI" --out "$OUT" --prefix "$SITUS-asli" --wait "$WAIT" --frames "$FRAMES" --gap "$GAP"
echo "== tangkap klon : $KLON"
node "$HERE/tangkap.js" --url "$KLON" --out "$OUT" --prefix "$SITUS-klon" --wait "$WAIT" --frames "$FRAMES" --gap "$GAP"

echo "== ukur"
python3 "$HERE/ukur-tangkap.py" --dir "$OUT" --acuan "$SITUS-asli" --uji "$SITUS-klon"

echo "== peta blok 12x8 (lokasi error)"
python3 "$HERE/peta-blok.py" "$OUT/median-$SITUS-asli.png" "$OUT/median-$SITUS-klon.png"

cat <<TXT

Gerbang yang diusulkan (lihat docs/ROADMAP-PARITAS.md bagian 2, tahap P22):
  APEX  MAE penuh <= 5,0   MAE tengah <= 6,0    tidak ada blok > 12
  MIRA  MAE penuh <= 5,0   MAE tengah <= 10,0   tidak ada blok > 15
Lantai derau capture: APEX 3,62 · MIRA 3,58 — angka di bawah ini tidak mungkin dicapai.
TXT
