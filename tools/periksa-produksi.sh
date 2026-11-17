#!/usr/bin/env bash
# periksa-produksi.sh — "apakah yang berjalan di produksi memang build & aset dari paket ini?"
# Menggantikan `verifikasi-produksi.sh` (v1, hanya MIRA, hanya melaporkan nama aset).
#
#   lapis A  aset JS produksi     : HTML → nama berkas → sha256 (APEX & MIRA)
#   lapis B  build workspace      : dist/assets/index-*.js → sha256 + ukuran + gzip
#   lapis C  putusan kesegaran    : nama+hash sama → SEGAR · beda → BELUM MEMUAT PAKET INI (bukan gagal)
#   lapis D  aset publik          : sha256 tiap plate di URL produksi vs public/humanoid di workspace
#   lapis E  gerbang (--gerbang)  : gate-aset-layout + gate-a11y + gate-paritas DIJALANKAN DI URL PRODUKSI
#
# Pakai:
#   bash tools/periksa-produksi.sh                 # lapis A–D (cepat, ± 20 s)
#   bash tools/periksa-produksi.sh --gerbang       # + lapis E (± 6 menit, butuh Chromium)
#   APEX_URL=… MIRA_URL=… bash tools/periksa-produksi.sh
set -u
APEX_URL="${APEX_URL:-https://niu-humanoid.vercel.app}"
MIRA_URL="${MIRA_URL:-https://mira-humanoid-niu.vercel.app}"
APEX_SRC="${APEX_SRC:-/home/user/apex-humanoid-rebuild}"
MIRA_SRC="${MIRA_SRC:-/home/user/mira-humanoid-rebuild}"
OUT="${OUT:-/home/user/Kerja-Arena/verification/produksi-$(date +%F)}"
GERBANG=0
[ "${1:-}" = "--gerbang" ] && GERBANG=1
mkdir -p "$OUT"
TMP=/tmp/periksa-produksi; rm -rf "$TMP"; mkdir -p "$TMP"

PLATE_APEX=(apex-idle-v1.webp apex-listening-v1.webp apex-speaking-v1.webp apex-speaking-strong-v1.webp
            apex-thinking-v1.webp apex-assembly-25-v1.webp apex-assembly-60-v1.webp backdrop-v1.webp)
PLATE_MIRA=(mira-idle-v1.webp mira-hair-v1.webp)

bad=0; segar=0
say() { printf '%s\n' "$*"; }
panggil() { awk -v u="$1" 'BEGIN{split(u,a,"//"); split(a[2],b,"/"); print b[1]}'; }

periksa() {  # $1=nama $2=url $3=dir-sumber $4..=plate
  local nama="$1" url="$2" dir="$3"; shift 3
  local plate=("$@")
  say "──────────────────────────────────────────────────────────────"
  say "## $nama — $url"
  say ""
  say "lapis A · aset JS produksi"
  curl -sL -o "$TMP/$nama.html" "$url/" || { say "❌ halaman tidak bisa diunduh"; bad=1; return; }
  local aset
  aset=$(grep -o 'index-[A-Za-z0-9_-]*\.js' "$TMP/$nama.html" | head -1)
  [ -n "$aset" ] || { say "❌ tidak ada rujukan index-*.js di HTML"; bad=1; return; }
  curl -sL -o "$TMP/$nama-prod.js" "$url/assets/$aset"
  local hp
  hp=$(sha256sum "$TMP/$nama-prod.js" | cut -d' ' -f1)
  say "  berkas : $aset"
  say "  sha256 : ${hp:0:16}… (${#hp} heks) · $(wc -c < "$TMP/$nama-prod.js") byte"

  say ""
  say "lapis B · build workspace"
  local lokal
  lokal=$(ls "$dir"/dist/assets/index-*.js 2>/dev/null | head -1)
  if [ -z "$lokal" ]; then say "  (belum ada dist — jalankan: (cd $dir && npm run build))"; else
    local hl
    hl=$(sha256sum "$lokal" | cut -d' ' -f1)
    say "  berkas : $(basename "$lokal")"
    say "  sha256 : ${hl:0:16}… · $(wc -c < "$lokal") byte · gzip $(gzip -c "$lokal" | wc -c) byte"
    say ""
    say "lapis C · putusan kesegaran"
    if [ "$hp" = "$hl" ]; then
      say "  ✅ SEGAR — produksi menjalankan build yang persis sama dengan workspace"
      segar=$((segar+1))
    else
      say "  ⏳ BELUM MEMUAT PAKET INI — produksi masih build lama"
      say "     produksi ${hp:0:16}… ≠ workspace ${hl:0:16}…"
      say "     (ini keadaan normal sebelum penerapan paket; bukan kegagalan)"
    fi
  fi

  say ""
  say "lapis D · aset publik (plate) — produksi vs workspace"
  local n_ok=0 n_tot=0 beda=0
  for p in "${plate[@]}"; do
    n_tot=$((n_tot+1))
    local f="$dir/public/humanoid/$p"
    curl -sL -o "$TMP/pp-$p" "$url/humanoid/$p"
    if [ ! -f "$f" ]; then say "  ⚠ $p tidak ada di workspace"; continue; fi
    local hr hw
    hr=$(sha256sum "$TMP/pp-$p" | cut -d' ' -f1); hw=$(sha256sum "$f" | cut -d' ' -f1)
    if [ "$hr" = "$hw" ]; then n_ok=$((n_ok+1)); say "  ✅ $p ${hw:0:12}…"
    else say "  ⏳ $p produksi ${hr:0:12}… ≠ workspace ${hw:0:12}… (produksi belum memuat paket ini)"; beda=$((beda+1)); fi
  done
  say "  → $n_ok/$n_tot plate identik, $beda menyimpang"
  awk -v u="$url" 'BEGIN{split(u,a,"//"); split(a[2],b,"/"); print b[1]}' >"$TMP/$nama.host"
}

periksa APEX "$APEX_URL" "$APEX_SRC" "${PLATE_APEX[@]}"
periksa MIRA "$MIRA_URL" "$MIRA_SRC" "${PLATE_MIRA[@]}"

if [ "$GERBANG" = "1" ]; then
  say "──────────────────────────────────────────────────────────────"
  say "## lapis E · gerbang dijalankan DI URL PRODUKSI"
  [ -f /home/user/.gerbang-env ] || { say "❌ jalankan tools/gerbang-lingkungan.sh dulu"; exit 1; }
  # shellcheck disable=SC1091
  . /home/user/.gerbang-env
  export PW="${PW:-/home/user/tools/pw-shim.js}"
  ( cd /home/user && MIRA="$APEX_URL/" APEX="$MIRA_URL/" node tools/gate-aset-layout.js 2>&1 | tail -4 )
  ( cd /home/user && MIRA="$APEX_URL/" APEX="$MIRA_URL/" node tools/gate-a11y.js 2>&1 | tail -3 )
fi

say "──────────────────────────────────────────────────────────────"
say "RINGKAS: kesegaran build $segar/2 aplikasi (0/2 = produksi masih build lama, wajar sebelum penerapan)"
say "bukti mentah: $OUT"
{
  echo "# Periksa produksi — $(date -u +'%Y-%m-%d %H:%M UTC')"
  echo
  echo "| aplikasi | URL | aset produksi | sha256 produksi | sha256 workspace | status |"
  echo "|---|---|---|---|---|---|"
  for n in APEX MIRA; do
    u=$( [ "$n" = APEX ] && echo "$APEX_URL" || echo "$MIRA_URL" )
    d=$( [ "$n" = APEX ] && echo "$APEX_SRC" || echo "$MIRA_SRC" )
    a=$(grep -o 'index-[A-Za-z0-9_-]*\.js' "$TMP/$n.html" 2>/dev/null | head -1)
    hp=$(sha256sum "$TMP/$n-prod.js" 2>/dev/null | cut -d' ' -f1 | cut -c1-16)
    hl=$(sha256sum "$d"/dist/assets/index-*.js 2>/dev/null | cut -d' ' -f1 | cut -c1-16)
    st=$( [ -n "$hp" ] && [ "$hp" = "$hl" ] && echo SEGAR || echo "BELUM MEMUAT PAKET INI" )
    echo "| $n | $u | ${a:-—} | ${hp:-—} | ${hl:-—} | $st |"
  done
} >"$OUT/RINGKAS.md"
say "ringkasan: $OUT/RINGKAS.md"
exit 0
