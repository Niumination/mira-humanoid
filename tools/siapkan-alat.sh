#!/usr/bin/env bash
# siapkan-alat.sh — pasang ulang alat luar-sandbox yang hilang saat sesi ter-reset.
# Playwright TIDAK ikut snapshot (node_modules dikecualikan), jadi skrip ini yang memulihkannya.
# Pakai: bash tools/siapkan-alat.sh
set -e
PW=${PW:-/tmp/pw}
if [ ! -d "$PW/node_modules/playwright" ]; then
  echo "→ pasang playwright 1.47.2 di $PW"
  mkdir -p "$PW" && cd "$PW"
  npm i --silent playwright@1.47.2
fi
if [ ! -d "$HOME/.cache/ms-playwright/chromium-1134" ]; then
  echo "→ unduh chromium"
  cd "$PW" && npx playwright install chromium
fi
# pustaka sistem (install-deps chromium gagal karena paket font lama; ini daftar minimal yang cukup)
sudo apt-get install -y -qq libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libasound2t64 libatspi2.0-0 libx11-xcb1 libxcb-dri3-0 >/dev/null 2>&1 || true
# acuan live + bundel + buffer busur (disimpan di workspace supaya tak perlu jaringan)
REF=${REF:-/home/user/Kerja-Arena/recon/live-ref}
mkdir -p "$REF"
for t in 0.3 1.89 3.5 5.5 6.8 9.5; do
  [ -f "$REF/live-t$t.png" ] || curl -sfL -o "$REF/live-t$t.png" \
    "https://raw.githubusercontent.com/Niumination/mira-humanoid/main/docs/langkah3/live-t$t.png"
done
echo "siap: playwright $PW · acuan $REF"
