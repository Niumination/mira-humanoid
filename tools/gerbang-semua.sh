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
# Akar Kerja-Arena (tempat verification/). Di repo, alat tinggal di <repo>/tools sehingga induknya sudah
# benar; di workspace kerja, alat tinggal di /home/user/tools sedangkan verification/ ada di
# /home/user/Kerja-Arena. Tanpa deteksi ini seluruh gerbang berbasis tabel sidik gagal karena mencari
# /home/user/verification/p13 (2026-11-20: uji-alat 3/7, provenance FATAL — salah alamat, bukan salah kode).
if [ -n "${KERJA_ARENA:-}" ]; then
  K="$KERJA_ARENA"
elif [ -d "$(dirname "$TOOLS_DIR")/Kerja-Arena/verification" ]; then
  # workspace kerja: /home/user/tools + /home/user/Kerja-Arena/verification
  K="$(dirname "$TOOLS_DIR")/Kerja-Arena"
elif [ -d "$(dirname "$TOOLS_DIR")/verification" ]; then
  K="$(dirname "$TOOLS_DIR")"
else
  K="$(dirname "$TOOLS_DIR")"
fi
TOOLS="${TOOLS:-$TOOLS_DIR}"
SUMBER="${SUMBER:-repo}"
HANYA="${HANYA:-semua}"
TGL="${TGL:-$(date +%Y-%m-%d)}"
OUT="$K/verification/gerbang"
mkdir -p "$OUT"

export KERJA_ARENA="$K"
export PW_TIMEOUT="${PW_TIMEOUT:-300000}"
# alat gerbang membaca env APEX/MIRA; tanpa export, alat jatuh ke port bawaannya (8805) dan gagal
APEX="${APEX:-http://127.0.0.1:8807/}"
MIRA="${MIRA:-http://127.0.0.1:8804/}"
# TOOLS harus di-export: `uji-gerbang.py` membaca env TOOLS (bawaan /home/user/tools). Tanpa export, saat
# gerbang dijalankan pada SALINAN repo hasil penerapan paket, uji G7 membandingkan alat di workspace kita
# dengan zip — bukan alat yang benar-benar ada di repo yang diuji (2026-11-20: laporan "beda:
# gerbang-semua.sh" padahal yang diperiksa bukan berkas repo).
export APEX MIRA SUMBER TOOLS

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

pasang_lingkungan() {
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

# `lingkaran` = prasyarat lingkungan (Playwright + shim + pustaka sistem). Ia diperiksa di luar hitungan,
# lalu dicatat sebagai baris pada ringkasan JSON (butir `lingkungan`) supaya lingkungan yang belum siap
# tidak tampil sebagai "8/8 lulus".
LINGKUNGAN="belum diperiksa"
if pasang_lingkungan; then LINGKUNGAN="siap"; else LINGKUNGAN="belum siap"; fi
echo "lingkungan: $LINGKUNGAN"
export LINGKUNGAN

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

# Folder aset: milik REPO KERJA (bukan Kerja-Arena). Versi repo memakai $K/public/humanoid yang di sini salah.
APEX_AKAR="${APEX_AKAR:-${APEX_WS:-$K/public/humanoid}}"
MIRA_AKAR="${MIRA_AKAR:-${MIRA_WS:-$K/public/humanoid}}"

jalankan uji-alat python3 "$TOOLS/uji-gerbang.py" || true

periksa_provenance() {
  # Tiap pola WAJIB lulus. Tanpa `|| true`: kegagalan satu pola = gerbang gagal.
  lokal=0
  for pola in "apex-*" "backdrop-*"; do
    python3 "$TOOLS/gate-provenance.py" --statis --akar "$APEX_AKAR" --pola "$pola" || lokal=1
  done
  python3 "$TOOLS/gate-provenance.py" --statis --akar "$MIRA_AKAR" --pola "mira-*" || lokal=1
  if [ "$SUMBER" = produksi ]; then
    for pola in "apex-*" "backdrop-*"; do
      python3 "$TOOLS/gate-provenance.py" --live "$APEX" --pola "$pola" || lokal=1
    done
    python3 "$TOOLS/gate-provenance.py" --live "$MIRA" --pola "mira-*" || lokal=1
  fi
  return $lokal
}
jalankan provenance periksa_provenance || true

# AKAR_* mengarahkan S1 ke folder aset repo yang SEDANG diuji (salinan penerapan), bukan repo kerja kita.
export AKAR_APEX="${AKAR_APEX:-$APEX_AKAR}" AKAR_MIRA="${AKAR_MIRA:-$MIRA_AKAR}"
jalankan aset-layout node "${GATE_ASET_LAYOUT:-$TOOLS/gate-aset-layout.cjs}" --json "$OUT/aset-layout-$TGL.json" || true

jalankan a11y node "${GATE_A11Y:-$TOOLS/gate-a11y.cjs}" --json "$OUT/a11y-$TGL.json" || true

jalankan paritas node "${GATE_PARITAS:-$TOOLS/gate-paritas.cjs}" --json "$OUT/paritas-$TGL.json" || true

# paritas fase: banyak titik waktu (APEX kelahiran 7,4 s; MIRA 11,5 s) — menangkap bug yang hanya
# muncul di detik tertentu, yang tidak terlihat oleh satu-bingkai paritas.
periksa_fase() {
  local rc=0
  node "$TOOLS/gate-paritas-fase.cjs" --app apex --url "$APEX" --titik 3,5,7,9,11 \
       --json "$OUT/paritas-fase-apex-$TGL.json" || rc=1
  node "$TOOLS/gate-paritas-fase.cjs" --app mira --url "$MIRA" --titik 4,8,11.5,12.5,13.5 \
       --json "$OUT/paritas-fase-mira-$TGL.json" || rc=1
  return $rc
}
jalankan paritas-fase periksa_fase || true

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
d = {'tanggal': tgl, 'sumber': sumber, 'lingkungan': os.environ.get('LINGKUNGAN', 'belum diperiksa'),
     'lulus': lulus_n, 'gagal': gagal_n,
     'total': lulus_n + gagal_n,
     'putusan': 'LULUS' if gagal_n == 0 and lulus_n > 0 else 'GAGAL',
     'gerbang': hasil,
     'catatan': 'gerbang yang tidak bisa dijalankan dihitung GAGAL, bukan dilewati'}
p = os.path.join(out, f'ringkas-{tgl}.json')
json.dump(d, open(p, 'w'), indent=1)
print(f'\nRINGKAS: {d["putusan"]} · {lulus_n}/{d["total"]} gerbang lulus → {p}')
sys.exit(0 if d['putusan'] == 'LULUS' else 1)
PY
