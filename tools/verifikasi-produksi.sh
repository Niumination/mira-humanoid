#!/usr/bin/env bash
# verifikasi-produksi.sh — rantai verifikasi 4 lapis untuk paket yang SUDAH DITERAPKAN.
#
# Pola yang dipakai sejak sesi 50 dan tidak pernah gagal menemukan masalah:
#   lapis 1  aset produksi  : unduh HTML produksi → nama aset → sha256 aset
#   lapis 2  blob repo      : unduh tarball commit repo upstream → sha256 berkas sumber
#   lapis 3  build bersih   : `npm ci` + `tsc` + `vite build` dari workspace → harus BYTE-IDENTIK
#            dengan aset produksi (lapis 1), dan berkas sumber workspace harus sama dengan repo (lapis 2)
#   lapis 4  gerbang di URL produksi (opsional, lambat): D, A, B, step5, step4c
#
# Pakai:
#   bash tools/verifikasi-produksi.sh                 # lapis 1–3 saja (cepat, ±1 menit)
#   bash tools/verifikasi-produksi.sh --gates         # + lapis 4 (±12 menit, satu chrome sekaligus)
#   bash tools/verifikasi-produksi.sh --commit <sha>  # periksa commit tertentu (bawaan: main)
#
# Prasyarat: `bash tools/siapkan-alat.sh` (playwright di /tmp/pw) untuk --gates.
set -u
PROD=${PROD:-https://mira-humanoid-niu.vercel.app/}
PROD=${PROD%/}   # tanpa garis miring di ujung: `//assets/...` dijawab Vercel dengan redirect 15 byte
REPO=${REPO:-Niumination/mira-humanoid}
SRC=/home/user/mira-humanoid-rebuild
FILES=("src/components/MiraStage.tsx" "src/lib/shaders/bodymesh.frag.glsl" "src/lib/shaders/occluder.frag.glsl")
TMP=/tmp/verprod
COMMIT=main
GATES=0
while [ $# -gt 0 ]; do
  case "$1" in
    --gates) GATES=1 ;;
    --commit) COMMIT=$2; shift ;;
    *) echo "argumen tak dikenal: $1"; exit 2 ;;
  esac
  shift
done

rm -rf "$TMP"; mkdir -p "$TMP"; cd "$TMP" || exit 1
fail=0
say() { printf '%s\n' "$*"; }
bad() { printf '❌ %s\n' "$*"; fail=1; }
good() { printf '✅ %s\n' "$*"; }

say "=== lapis 1 · aset produksi"
ASSET=$(curl -s "$PROD" | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -1)
[ -n "$ASSET" ] || { bad "tidak menemukan aset js di $PROD"; exit 1; }
curl -sL -o prod.js "$PROD/assets/$ASSET"
[ "$(wc -c < prod.js)" -gt 10000 ] || { bad "unduhan aset terlalu kecil ($(wc -c < prod.js) byte) — mungkin halaman redirect"; exit 1; }
H_PROD=$(sha256sum prod.js | cut -d' ' -f1)
say "aset    : $ASSET"
say "sha256  : $H_PROD"

say ""
say "=== lapis 2 · blob repo ($REPO@$COMMIT)"
if [ "$COMMIT" = "main" ]; then
  SHA=$(curl -s "https://api.github.com/repos/$REPO/commits/main" | python3 -c "import json,sys;print(json.load(sys.stdin)['sha'])")
else
  SHA=$COMMIT
fi
say "commit  : $SHA"
curl -sL -o repo.tgz "https://codeload.github.com/$REPO/tar.gz/$SHA" && tar xzf repo.tgz || { bad "unduh/tarik tarball gagal"; exit 1; }
DIR=$(ls -d */ | head -1)
for f in "${FILES[@]}"; do
  if [ ! -f "$DIR$f" ]; then bad "repo tidak punya $f"; continue; fi
  a=$(sha256sum "$DIR$f" | cut -d' ' -f1)
  b=$(sha256sum "$SRC/$f" 2>/dev/null | cut -d' ' -f1)
  if [ "$a" = "$b" ]; then good "$f sama dengan repo"; else bad "$f BEDA (repo ${a:0:16} · workspace ${b:0:16})"; fi
done

say ""
say "=== lapis 3 · build bersih dari workspace"
cd "$SRC" || exit 1
npm ci --no-audit --no-fund >/dev/null 2>&1 || { bad "npm ci gagal"; exit 1; }
npx tsc --noEmit || bad "tsc gagal"
rm -rf dist && npx vite build >/dev/null 2>&1 || bad "vite build gagal"
LOCAL=$(ls dist/assets/index-*.js | head -1)
if [ "$(basename "$LOCAL")" != "$ASSET" ]; then
  bad "nama aset lokal $(basename "$LOCAL") ≠ produksi $ASSET"
else
  good "nama aset sama: $ASSET"
fi
if cmp -s "$LOCAL" "$TMP/prod.js"; then
  good "build bersih BYTE-IDENTIK dengan produksi"
else
  bad "build bersih BEDA dari produksi (isinya berbeda)"
fi

if [ "$GATES" = "1" ]; then
  say ""
  say "=== lapis 4 · gerbang di URL produksi"
  cd /home/user || exit 1
  if [ ! -d /tmp/pw/node_modules/playwright ]; then say "playwright belum ada → jalankan tools/siapkan-alat.sh"; exit 1; fi
  pkill -f "chrome[-]linux" 2>/dev/null
  PW=/tmp/pw/node_modules/playwright
  node tools/gate-d.js --ours "$PROD/" 2>&1 | tail -3
  pkill -f "chrome[-]linux"; sleep 1
  PW=$PW node tools/gate-mira-a.js "$PROD/" 2>&1 | tail -2; pkill -f "chrome[-]linux"; sleep 1
  PW=$PW node tools/gate-mira-b.js "$PROD/" 2>&1 | tail -2; pkill -f "chrome[-]linux"; sleep 1
  BASE=$PROD/ PW=/tmp/pw/node_modules/playwright/index.js node tools/gate-step5.js 2>&1 | tail -2; pkill -f "chrome[-]linux"; sleep 1
  BASE=$PROD/ PW=/tmp/pw/node_modules/playwright/index.js node tools/gate-step4c.js 2>&1 | tail -2; pkill -f "chrome[-]linux"
fi

say ""
if [ "$fail" = "0" ]; then say "SEMUA LAPIS LULUS"; else say "ADA LAPIS YANG GAGAL — jangan deploy / laporkan dulu"; fi
exit $fail
