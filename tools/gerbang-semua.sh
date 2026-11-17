#!/usr/bin/env bash
# gerbang-semua.sh — jalankan SEMUA gerbang fase dengan satu perintah dan simpan buktinya.
#
# Kenapa ada: gerbang fase butuh Chromium (Playwright). Sandbox kerja P13 (Debian trixie, bukan root)
# tidak punya libnspr4/libnss3 sehingga Chromium tidak bisa diluncurkan. Skrip ini disiapkan supaya
# pembuktian gerbang bisa dijalankan di mesin mana pun yang punya Chromium (laptop pengguna / CI),
# tanpa mengubah apa pun di repo dan dengan angka acuan yang sama.
#
# Pakai:
#   tools/gerbang-semua.sh                 # jalankan semua (MIRA 8804, APEX 8805)
#   tools/gerbang-semua.sh --pasang        # pasang playwright + chromium dulu (butuh root/apt)
#   PW=/path/playwright PORT_MIRA=8804 PORT_APEX=8805 tools/gerbang-semua.sh
#
# Hasil: verification/gerbang-<YYYY-MM-DD>/<gerbang>.txt + RINGKAS.md
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TGL="$(date +%F)"
OUT="$ROOT/verification/gerbang-$TGL"
PORT_MIRA="${PORT_MIRA:-8804}"
PORT_APEX="${PORT_APEX:-8805}"
PW="${PW:-/tmp/pw/node_modules/playwright/index.js}"
mkdir -p "$OUT"

if [ "${1:-}" = "--pasang" ]; then
  echo "== pasang dependensi Chromium (butuh root/apt)"
  ( command -v apt-get >/dev/null && sudo apt-get update -qq && \
    sudo apt-get install -y -qq libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
      libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
      libpango-1.0-0 libcairo2 libasound2 >/dev/null ) || echo "!! apt gagal — pasang manual"
  mkdir -p /tmp/pw && ( cd /tmp/pw && npm init -y >/dev/null 2>&1 && npm i playwright >/dev/null 2>&1 && \
    npx playwright install chromium ) || echo "!! playwright gagal"
fi

hidupkan() {   # $1=port $2=dir
  if ! curl -sf -o /dev/null "http://127.0.0.1:$1/"; then
    echo "== menyalakan preview di $1"
    ( cd "$2" && npx vite preview --host 0.0.0.0 --port "$1" --strictPort >"$OUT/preview-$1.log" 2>&1 & )
    for _ in $(seq 1 40); do curl -sf -o /dev/null "http://127.0.0.1:$1/" && break; sleep 0.5; done
  fi
}

napak() {     # $1=nama $2=perintah...
  local nama="$1"; shift
  echo "== $nama"
  ( "$@" ) >"$OUT/$nama.txt" 2>&1
  local rc=$?
  if grep -qE "libnspr4|Cannot find module|ERR_MODULE_NOT_FOUND|browserType.launch" "$OUT/$nama.txt"; then
    echo "BELUM DIUJI (Chromium/Playwright tidak tersedia)"
  elif [ $rc -ne 0 ]; then
    echo "GAGAL (keluar $rc)"
  else
    grep -E "LULUS|GAGAL|SKOR|paritas|MAE" "$OUT/$nama.txt" | tail -3
  fi
}

hidupkan "$PORT_MIRA" "$ROOT/mira-humanoid-rebuild"
hidupkan "$PORT_APEX" "$ROOT/apex-humanoid-rebuild"

export PW
export BASE="http://127.0.0.1:$PORT_MIRA/"
napak gate-mira-a      node "$ROOT/tools/gate-mira-a.js"  "http://127.0.0.1:$PORT_MIRA"
napak gate-mira-b      node "$ROOT/tools/gate-mira-b.js"  "http://127.0.0.1:$PORT_MIRA"
napak gate-d           node "$ROOT/tools/gate-d.js"
napak gate-step4c      node "$ROOT/tools/gate-step4c.js"
napak gate-step5       node "$ROOT/tools/gate-step5.js"
napak gate-step5-node  env BAGIAN=A node "$ROOT/tools/gate-step5.js"
napak gate-apex        env BASE="http://127.0.0.1:$PORT_APEX/" node "$ROOT/tools/gate-apex.js"

{
  echo "# Ringkasan gerbang fase — $TGL"
  echo
  echo "| gerbang | hasil | berkas |"
  echo "|---|---|---|"
  for f in "$OUT"/*.txt; do
    n="$(basename "$f" .txt)"
    case "$n" in preview-*) continue;; esac
    if grep -qE "libnspr4|Cannot find module|ERR_MODULE_NOT_FOUND|browserType.launch" "$f"; then
      s="BELUM DIUJI (Chromium tidak tersedia)"
    else
      s="$(grep -E 'SKOR|LULUS|GAGAL' "$f" | tail -1 | cut -c1-110)"
      s="${s:-\?}"
    fi
    echo "| $n | $s | \`verification/gerbang-$TGL/$(basename "$f")\` |"
  done
} > "$OUT/RINGKAS.md"
echo
echo "bukti: $OUT/RINGKAS.md"
