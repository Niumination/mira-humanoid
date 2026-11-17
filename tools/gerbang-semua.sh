#!/usr/bin/env bash
# gerbang-semua.sh — jalankan SEMUA gerbang fase dengan satu perintah dan simpan buktinya.
#
# Lingkungan Chromium disiapkan lebih dulu oleh tools/gerbang-lingkungan.sh (tanpa root: .deb
# diekstrak ke sysroot lokal). Kalau lingkungan belum ada, skrip ini menyiapkannya sendiri.
#
# Pakai:
#   tools/gerbang-semua.sh                # siapkan (bila perlu) + jalankan semua gerbang
#   tools/gerbang-semua.sh --siapkan      # hanya menyiapkan lingkungan
#   PORT_MIRA=8804 PORT_APEX=8805 tools/gerbang-semua.sh
# Hasil: verification/gerbang-<YYYY-MM-DD>/<gerbang>.txt + RINGKAS.md
set -u
TOOLS="$(cd "$(dirname "$0")" && pwd)"   # berkas alat
KERJA="${KERJA:-/home/user/Kerja-Arena}"  # tempat repo rebuild + verification
OUT_REPO="$KERJA/verification"
TGL="$(date +%F)"
OUT="$OUT_REPO/gerbang-$TGL"
PORT_MIRA="${PORT_MIRA:-8804}"
PORT_APEX="${PORT_APEX:-8805}"

# --- lingkungan ---------------------------------------------------------------
if [ ! -f /home/user/.gerbang-env ]; then
  echo "== lingkungan Chromium belum ada → menyiapkan"
  bash "$TOOLS/gerbang-lingkungan.sh" || { echo "!! gagal menyiapkan lingkungan"; exit 1; }
fi
# shellcheck disable=SC1091
. /home/user/.gerbang-env
export PW="${PW:-/home/user/tools/pw-shim.js}"
mkdir -p "$OUT"

if [ "${1:-}" = "--siapkan" ]; then echo "lingkungan siap: $PW"; exit 0; fi

# --- server -------------------------------------------------------------------
hidupkan() {   # $1=port $2=dir
  if ! curl -sf -o /dev/null "http://127.0.0.1:$1/"; then
    echo "== menyalakan preview di $1"
    ( cd "$2" && npx vite preview --host 0.0.0.0 --port "$1" --strictPort >"$OUT/preview-$1.log" 2>&1 & )
    for _ in $(seq 1 60); do curl -sf -o /dev/null "http://127.0.0.1:$1/" && break; sleep 0.5; done
  fi
}

napak() {     # $1=nama $2...=perintah
  local nama="$1"; shift
  echo "== $nama"
  ( "$@" ) >"$OUT/$nama.txt" 2>&1
  local rc=$?
  if grep -qE "libnspr4|Cannot find module|ERR_MODULE_NOT_FOUND|browserType.launch" "$OUT/$nama.txt"; then
    echo "BELUM DIUJI (Chromium/Playwright tidak tersedia)"
  elif [ $rc -ne 0 ]; then
    echo "GAGAL (keluar $rc)"
  else
    grep -E "LULUS|GAGAL|SKOR|GERBANG|paritas|lolos|MAE" "$OUT/$nama.txt" | tail -3
  fi
}

hidupkan "$PORT_MIRA" "/home/user/mira-humanoid-rebuild"
hidupkan "$PORT_APEX" "/home/user/apex-humanoid-rebuild"

export BASE="http://127.0.0.1:$PORT_MIRA/"
napak gate-mira-a      node "$TOOLS/gate-mira-a.js"  "http://127.0.0.1:$PORT_MIRA"
napak gate-mira-b      node "$TOOLS/gate-mira-b.js"  "http://127.0.0.1:$PORT_MIRA"
napak gate-d           node "$TOOLS/gate-d.js"
napak gate-step4c      node "$TOOLS/gate-step4c.js"
napak gate-step5       node "$TOOLS/gate-step5.js"
napak gate-step5-node  env BAGIAN=A node "$TOOLS/gate-step5.js"
napak probe-listen     node "$TOOLS/probe-listen-frame.js"
napak gate-paritas     node "$TOOLS/gate-paritas.js" --json "$OUT_REPO/gate-paritas-$TGL.json"
napak gate-aset-layout node "$TOOLS/gate-aset-layout.js" --json "$OUT_REPO/gate-aset-layout-$TGL.json"
napak gate-a11y        node "$TOOLS/gate-a11y.js" --json "$OUT_REPO/gate-a11y-$TGL.json"
# gate-apex (MAE piksel vs produksi asli) DIPENSIONSI: acuan itu sendiri memberi MAE diri 8,80 (1440)
# dan 16,06 (390), jadi ambangnya mustahil — lihat tools/kalibrasi-paritas.js + verification/kalibrasi/.
# Penggantinya: gate-aset-layout (aset = berkas kita) + gate-paritas v2 (reprodusibilitas & presentasi).

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
      s="$(grep -E 'SKOR|LULUS|GAGAL|GERBANG|lolos|korelasi' "$f" | tail -1 | cut -c1-110)"
      s="${s:-?}"
    fi
    echo "| $n | $s | \`verification/gerbang-$TGL/$(basename "$f")\` |"
  done
} > "$OUT/RINGKAS.md"
echo
echo "bukti: $OUT/RINGKAS.md"
