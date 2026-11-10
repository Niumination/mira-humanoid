#!/usr/bin/env python3
"""Rekonstruksi harness audio LIVE dari bundle: `verification/mira/audio-live.mjs`.

Mengambil region audio utuh (graph + primitif + cue + synth buffer + player + bolt) dari
`recon/mira-2026-11-03.js`, menambahkan stub `YU`/`jU` (didefinisikan lebih awal di bundle)
dan mengekspor setiap fungsi supaya bisa dipanggil harness Node.

Dipakai oleh `tools/gate-step4.js` (paritas pemanggilan) dan `tools/gate-step4b.js` (spektrum).
"""
import re
import sys
from pathlib import Path

RECON = Path('/home/user/Kerja-Arena/recon/mira-2026-11-03.js')
OUT = Path('/home/user/Kerja-Arena/verification/mira/audio-live.mjs')


def brace_slice(s: str, start: int) -> str:
    """kembalikan teks dari `start` sampai kurung kurawal seimbang."""
    depth = 0
    i = start
    started = False
    while i < len(s):
        ch = s[i]
        if ch == '{':
            depth += 1
            started = True
        elif ch == '}':
            depth -= 1
            if started and depth == 0:
                return s[start:i + 1]
        i += 1
    raise SystemExit('kurung tidak seimbang')


def main() -> None:
    s = RECON.read_text()
    a = s.index('const gN=.75;')
    b = s.index('const Ed={pos:new j', a)
    region = s[a:b]

    # `Vk()` (pembangun skor cue) berada sesudah region
    vk_at = s.index('function Vk(')
    vk_body = s.index('){', vk_at) + 1
    vk = s[vk_at:vk_body] + brace_slice(s, vk_body)
    gk_at = s.index('const Gk=', vk_at)
    gk = s[gk_at:s.index('function Wk(', gk_at)]

    head = """// ── harness audio LIVE (dibuat oleh tools/ekstrak-audio-live.py) ──────────────────────────
// Kode di bawah ini VERBATIM dari bundle live; hanya stub `YU`/`jU` (didefinisikan lebih awal
// di bundle) dan blok `export` di akhir yang ditambahkan.
const YU = {full:{con:.34, chk:1.55, thr:5.35, call:5.92, set:10.1, end:13.1}};
const jU = {total:7.4, ignition:6.2, hornPeak:6.2+3.2*.19};
// stub sistem "aura"/moment (registrasi plugin `apexSound` di ekor region tidak dipakai)
const KU = () => () => {};
const Tw = {WORKING:'working'};
const _s = {READY:'ready', ASSEMBLY:'assembly', NEEDS_YOU:'needs_you', ALERT:'alert', FAILED:'failed',
  MIRA_ENTER:'mira_enter', MIRA_EXIT:'mira_exit', MIRA_BUILD:'mira_build', MIRA_BOLT:'mira_bolt'};
"""
    tail = """

// ── tambahan harness (bukan bagian bundle) ──────────────────────────────────────────────
// `Vk` dan `Gk` diambil dari posisi aslinya di bundle (dipakai pembangun adegan Hk).
""" + vk + "\n" + gk + """

export {
  rh, Hw, rv, hc, Yo, Nr, oc, _o, U_, Vw, yN, xN, _N, SN, wN, MN, EN, TN, AN, bN, RN, CN, PN, IN,
  LN, yd, NT, DN, Gw, Dr, mo, wi, Pl, xd, qw, kN, NN, FT, FN, ON, Od, Pg, Vk, Gk,
  gN, vN,
};
export const liveState = () => ({ qe, Jy, Rg, fp, mg });
export const setReset = () => { /* reset tidak tersedia di live (modul sekali pakai) */ };
"""
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(head + region + tail)
    print(f'{OUT}  ({OUT.stat().st_size} B)  region {len(region)} B  Vk {len(vk)} B')


if __name__ == '__main__':
    sys.exit(main())
