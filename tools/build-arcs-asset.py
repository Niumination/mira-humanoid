#!/usr/bin/env python3
"""build-arcs-asset.py — ubah tangkapan buffer busur live (/tmp/arcbuf-live.json) menjadi
modul TypeScript berisi satu blob base64 terkuantisasi.

Pakai: python3 tools/build-arcs-asset.py /tmp/arcbuf-live.json mira-humanoid-rebuild/src/lib/miraArcsLive.ts
"""
import base64
import json
import struct
import sys

src = sys.argv[1] if len(sys.argv) > 1 else '/tmp/arcbuf-live.json'
dst = sys.argv[2] if len(sys.argv) > 2 else 'mira-humanoid-rebuild/src/lib/miraArcsLive.ts'

bufs = json.load(open(src))
by_len = {}
for b in bufs:
    by_len.setdefault(b['len'], []).append(b['all'])
pos = by_len[11904][0]
col = by_len[11904][1]
ones = by_len[3968]  # 4 atribut 1-komponen
n = len(pos) // 3
assert len(pos) % 3 == 0

def pick(pred):
    for a in ones:
        if pred(a):
            return a
    raise SystemExit('atribut tidak ketemu')

aU = pick(lambda a: max(a) <= 1.0 and min(a) >= 0 and len(set(a)) > 50)
aW = pick(lambda a: set(a) <= {1, 0.45})
aT = pick(lambda a: max(a) > 2.5 and min(a) > 0.2)
aStr = pick(lambda a: 0.4 < min(a) and max(a) < 2.0 and len(set(a)) > 20 and a is not aT and a is not aU)

blob = bytearray()
blob += struct.pack('<I', n)
blob += struct.pack('<%dh' % (n * 3), *[max(-32768, min(32767, round(v * 16))) for v in pos])
blob += struct.pack('<%dB' % (n * 3), *[max(0, min(255, round(v * 255))) for v in col])
blob += struct.pack('<%dB' % n, *[1 if v == 1 else 0 for v in aW])
blob += struct.pack('<%dB' % n, *[max(0, min(255, round(v * 255))) for v in aU])
blob += struct.pack('<%dH' % n, *[max(0, min(65535, round(v * 1000))) for v in aT])
blob += struct.pack('<%dH' % n, *[max(0, min(65535, round(v * 10000))) for v in aStr])

b64 = base64.b64encode(bytes(blob)).decode()
lines = [b64[i:i + 96] for i in range(0, len(b64), 96)]

ts = '''/**
 * miraArcsLive.ts — geometri busur diambil **apa adanya** dari app MIRA asli.
 *
 * Kenapa data, bukan rumus: busur dibuat dari aliran PRNG bersemai (`g0`/`Uw`). Port rumus kita
 * sudah baris-per-baris sama, tetapi aliran `rnd()` bergeser sebelum blok busur sehingga posisi
 * semua busur meleset (lihat LANGKAH3.md F-89: titik awal berbeda 5–20 px lalu menyimpang).
 * Geometri busur bersifat **statis** (dibuat sekali saat muat, animasi hanya lewat waktu seragam),
 * jadi menyalin buffer-nya memberi fidelitas penuh tanpa menebak.
 *
 * Sumber: buffer `ARRAY_BUFFER` live (position 3×N, color 3×N, aW, aU, aT, aStr — 1×N),
 * diambil dengan `tools/probe-arc-buffers.js`, dikemas oleh `tools/build-arcs-asset.py`.
 * Kuantisasi: posisi 1/16 px (int16) · warna & aU 1/255 · aW bit · aT 1/1000 · aStr 1/10000.
 */

export interface LiveArcs {
  n: number
  position: Float32Array
  color: Float32Array
  u: Float32Array
  w: Float32Array
  t: Float32Array
  str: Float32Array
  /** waktu spawn + kekuatan per busur (dipakai ramp `bN`) */
  list: { t: number; strength: number }[]
}

const B64 = `
%s
`

let cached: LiveArcs | null = null

export function liveArcs(): LiveArcs {
  if (cached) return cached
  const bin = atob(B64.replace(/\\s+/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const dv = new DataView(bytes.buffer)
  const n = dv.getUint32(0, true)
  let o = 4
  const position = new Float32Array(n * 3)
  for (let i = 0; i < n * 3; i++, o += 2) position[i] = dv.getInt16(o, true) / 16
  const color = new Float32Array(n * 3)
  for (let i = 0; i < n * 3; i++, o += 1) color[i] = bytes[o] / 255
  const w = new Float32Array(n)
  for (let i = 0; i < n; i++, o += 1) w[i] = bytes[o] ? 1 : 0.45
  const u = new Float32Array(n)
  for (let i = 0; i < n; i++, o += 1) u[i] = bytes[o] / 255
  const t = new Float32Array(n)
  for (let i = 0; i < n; i++, o += 2) t[i] = dv.getUint16(o, true) / 1000
  const str = new Float32Array(n)
  for (let i = 0; i < n; i++, o += 2) str[i] = dv.getUint16(o, true) / 10000

  // busur = rangkaian verteks dengan aT sama; satu simpanan (t, kekuatan) per busur
  const list: { t: number; strength: number }[] = []
  for (let i = 0; i < n; i += 2) {
    const tv = Math.round(t[i] * 1000) / 1000
    if (!list.length || Math.abs(list[list.length - 1].t - tv) > 1e-6) list.push({ t: tv, strength: str[i] })
  }
  cached = { n, position, color, u, w, t, str, list }
  return cached
}
''' % ('\n'.join(lines))

open(dst, 'w').write(ts)
print('tulis', dst, '-', len(blob), 'bita biner,', len(b64), 'bita base64,', n, 'verteks,', len(blob) and 'ok')
