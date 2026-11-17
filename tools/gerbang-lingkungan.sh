#!/usr/bin/env bash
# gerbang-lingkungan.sh — siapkan lingkungan Chromium TANPA root (apt tidak bisa dipakai).
#
# Masalah: sandbox kerja P13 tidak punya libnspr4/libnss3 dan pengguna bukan root, sehingga Chromium
# tidak bisa diluncurkan. Solusi: unduh paket .deb yang diperlukan, ekstrak ke sysroot lokal dengan
# `dpkg -x` (tidak butuh root), lalu jalankan Chromium dengan LD_LIBRARY_PATH ke sysroot itu.
#
# Pakai:  tools/gerbang-lingkungan.sh            # siapkan (idempoten)
#         source /home/user/.gerbang-env         # muat variabel lingkungan
# Keluaran: /home/user/sysroot (pustaka) · /home/user/pw (playwright) · /home/user/.gerbang-env
set -u
SYSROOT=/home/user/sysroot
PWROOT=/home/user/pw
DEBS=/tmp/debs-gerbang
LIBDIR=$SYSROOT/usr/lib/x86_64-linux-gnu

PAKET="libnspr4 libnss3 libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 \
libxkbcommon0 libxdamage1 libdbus-1-3 libudev1"

echo "== 1. pustaka sistem (dpkg -x ke $SYSROOT, tanpa root)"
mkdir -p "$DEBS" "$SYSROOT"
( cd "$DEBS" && apt-get download $PAKET >/dev/null 2>&1 )
for d in "$DEBS"/*.deb; do dpkg -x "$d" "$SYSROOT"; done
ls "$LIBDIR" | grep -cE "libnspr4|libnss3|libatk|libasound|libxkbcommon|libXdamage" | \
  xargs -I{} echo "   pustaka hasil ekstrak: {} berkas"

echo "== 2. Playwright + Chromium"
mkdir -p "$PWROOT"
( cd "$PWROOT" && npm init -y >/dev/null 2>&1 && npm i playwright --no-audit --no-fund >/dev/null 2>&1 )
PLAYWRIGHT_BROWSERS_PATH=/home/user/pw-browsers npx --prefix "$PWROOT" playwright install chromium >/dev/null 2>&1
ls /home/user/pw-browsers 2>/dev/null | sed 's/^/   /'

cat > /home/user/.gerbang-env <<EOF
# dimuat oleh tools/gerbang-semua.sh (jangan di-commit ke repo)
export LD_LIBRARY_PATH=$LIBDIR\${LD_LIBRARY_PATH:+:\$LD_LIBRARY_PATH}
export PLAYWRIGHT_BROWSERS_PATH=/home/user/pw-browsers
export PW=/home/user/tools/pw-shim.js
export PW_ASLI=$PWROOT/node_modules/playwright/index.js
EOF

echo "== 3. uji luncur"
( . /home/user/.gerbang-env
  node -e "
const {chromium}=require('$PWROOT/node_modules/playwright');
chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']})
 .then(async b=>{const p=await b.newPage();await p.goto('data:text/html,<h1>ok</h1>');
  console.log('   Chromium HIDUP ·', await p.textContent('h1'));await b.close()})
 .catch(e=>{console.log('   GAGAL:', e.message.split('\n')[0]);process.exit(1)})
" )
echo "selesai. Muat lingkungan:  source /home/user/.gerbang-env"
