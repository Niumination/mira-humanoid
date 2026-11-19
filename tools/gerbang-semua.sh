#!/usr/bin/env bash
# gerbang-semua.sh — menjalankan SEMUA gerbang berangka dengan satu perintah, lalu menulis ringkasan JSON.
#
# Kenapa ada: pada 2026-11-18/19 gerbang dijalankan satu per satu secara manual; akibatnya beberapa ronde
# melaporkan "sudah lulus" padahal hanya sebagian gerbang yang dijalankan. Skrip ini menutup celah itu:
#   * setiap gerbang WAJIB memberi putusan berangka,
#   * gerbang yang tidak bisa dijalankan (mis. lingkungan Chromium hilang) dihitung GAGAL, bukan dilewati,
#   * ringkasan ditulis ke verification/gerbang/ringkas-<tanggal>.json,
#   * keluar 1 bila ada satu gerbang pun yang gagal.
#
# Pakai:
#   bash tools/gerbang-semua.sh                 # lokal (repo kerja di /home/user/{apex,mira}-humanoid-rebuild)
#   SUMBER=produksi bash tools/gerbang-semua.sh # memeriksa URL produksi
#   HANYA=a11y bash tools/gerbang-semua.sh      # satu gerbang saja (diagnosis)
set -uo pipefail

TOOLS_DIR="$(cd "$(dirname "$0")" && pwd)"
K="${KERJA_ARENA:-$(dirname "$TOOLS_DIR")}"
TOOLS="${TOOLS:-$TOOLS_DIR}"
APEX="${APEX:-http://127.0.0.1:8807/}"
MIRA="${MIRA:-http://127.0.0.1:8804/}"
SUMBER="${SUMBER:-repo}"
HANYA="${HANYA:-semua}"
TGL="$(date +%Y-%m-%d)"
OUT="$K/verification/gerbang"
mkdir -p "$OUT"

export KERJA_ARENA="$K"
export PW_TIMEOUT="${PW_TIMEOUT:-300000}"

jalankan() {           # $1 = nama, sisanya = perintah
  nama="$1"; shift
  if [ "$HANYA" != "semua" ] && [ "$HANYA" != "$nama" ]; then return 0; fi
  printf '\n=== %s ===\n' "$nama"
  if "$@"; then
    printf '%s: LULUS\n' "$nama"
    echo "$nama lulus" >> "$OUT/.hasil"
  else
    printf '%s: GAGAL\n' "$nama"
    echo "$nama gagal" >> "$OUT/.hasil"
  fi
}

lingkungan() {
  if [ ! -d "${PW_LINGKUNGAN:-/home/user/pw}/node_modules/playwright" ] && [ ! -f "${TOOLS_DIR}/pw-shim.js" ]; then
    echo "lingkungan gerbang belum dipasang: jalankan bash tools/gerbang-lingkungan.sh lalu playwright install chromium"
    return 1
  fi
  if [ -f /home/user/.gerbang-env ]; then
    # shellcheck disable=SC1091
    . /home/user/.gerbang-env
  fi
  export PW="${PW:-${TOOLS_DIR}/pw-shim.js}"
  return 0
}

: > "$OUT/.hasil"

jalankan lingkungan lingkungan || true

# prasyarat: server pratinjau harus hidup — tanpa ini gerbang Chromium gagal karena sebab yang salah
prasyarat_server() {
  for u in "$APEX" "$MIRA"; do
    if ! curl -sf -o /dev/null --max-time 10 "${u%%\?*}"; then
      echo "server pratinjau tidak menjawab: $u"
      echo "  jalankan: (cd <repo> && npm run build && npx vite preview --host 0.0.0.0 --port <n> &)"
      return 1
    fi
  done
  echo "server pratinjau hidup: $APEX · $MIRA"
}
jalankan server prasyarat_server || true

APEX_AKAR="${APEX_AKAR:-$K/public/humanoid}"
MIRA_AKAR="${MIRA_AKAR:-$K/public/humanoid}"

jalankan provenance bash -c '
  set -e
  if [ "$SUMBER" = produksi ]; then
    python3 "$0/gate-provenance.py" --live "$APEX" --akar "${APEX_AKAR}" --pola "apex-*"     >/dev/null
    python3 "$0/gate-provenance.py" --live "$APEX" --akar "${APEX_AKAR}" --pola "backdrop-*" >/dev/null || true
    python3 "$0/gate-provenance.py" --live "$MIRA" --akar "${MIRA_AKAR}" --pola "mira-*"      >/dev/null
  else
    python3 "$0/gate-provenance.py" --statis --akar "${APEX_AKAR}" --pola "apex-*"
    python3 "$0/gate-provenance.py" --statis --akar "${APEX_AKAR}" --pola "backdrop-*" || true
    python3 "$0/gate-provenance.py" --statis --akar "${MIRA_AKAR}" --pola "mira-*"
  fi
' "$TOOLS" "$APEX_AKAR" "$MIRA_AKAR" || true

jalankan aset-layout node "${GATE_ASET_LAYOUT:-$TOOLS/gate-aset-layout.cjs}" --json "$OUT/aset-layout-$TGL.json" || true

jalankan a11y node "${GATE_A11Y:-$TOOLS/gate-a11y.cjs}" --json "$OUT/a11y-$TGL.json" || true

jalankan paritas node "${GATE_PARITAS:-$TOOLS/gate-paritas.cjs}" --json "$OUT/paritas-$TGL.json" || true

lulus=$(grep -c ' lulus$' "$OUT/.hasil" 2>/dev/null); lulus=${lulus:-0}
gagal=$(grep -c ' gagal$'  "$OUT/.hasil" 2>/dev/null); gagal=${gagal:-0}
lulus=$(printf '%s' "$lulus" | tr -dc '0-9'); gagal=$(printf '%s' "$gagal" | tr -dc '0-9')
lulus=${lulus:-0}; gagal=${gagal:-0}
total=$((lulus + gagal))

python3 - "$OUT" "$TGL" "$SUMBER" "$lulus" "$gagal" <<'PY'
import json, os, sys
out, tgl, sumber, lulus, gagal = sys.argv[1:6]
hasil = [b.split(' ')[0] for b in open(os.path.join(out, '.hasil')) if b.strip()]
lulus_n, gagal_n = int(lulus), int(gagal)
d = {'tanggal': tgl, 'sumber': sumber, 'lulus': lulus_n, 'gagal': gagal_n,
     'total': lulus_n + gagal_n,
     'putusan': 'LULUS' if gagal_n == 0 and lulus_n > 0 else 'GAGAL',
     'gerbang': hasil,
     'catatan': 'gerbang yang tidak bisa dijalankan dihitung GAGAL, bukan dilewati'}
p = os.path.join(out, f'ringkas-{tgl}.json')
json.dump(d, open(p, 'w'), indent=1)
print(f'\nRINGKAS: {d["putusan"]} · {lulus_n}/{d["total"]} gerbang lulus → {p}')
sys.exit(0 if d['putusan'] == 'LULUS' else 1)
PY
