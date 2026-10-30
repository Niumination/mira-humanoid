/**
 * lib/miraWire — perakit mesh garis (port VERBATIM `lF()` dari bundle).
 *
 * Satu BufferGeometry ter-index memuat SEMUA garis sebagai strip segitiga:
 *   2 verteks per titik (uv.y = ±1 = sisi strip), 6 indeks per segmen.
 * Atribut per-verteks: position, aDir (titik ±2 → orientasi strip), uv (x = t, y = sisi),
 * aT (waktu muncul), aCol, aS (jarak kumulatif), aLen, aId, aSketch, aEnd, aF.
 */
import type { MiraLine, MiraPicture } from './miraLines'
import { IGNITE_CFG, makeIgnite, mulberry32, revealAt, wireColour } from './miraTimeline'

export interface WireGeom {
  position: Float32Array
  aDir: Float32Array
  uv: Float32Array
  aT: Float32Array
  aCol: Float32Array
  aS: Float32Array
  aLen: Float32Array
  aId: Float32Array
  aSketch: Float32Array
  aEnd: Float32Array
  aF: Float32Array
  index: Uint32Array
  vertexCount: number
  indexCount: number
}

/** masukan lF: tiap garis butuh pts + cum + len + id (+ time/col/sketch/fill) */
export interface WireLineIn {
  pts: [number, number][]
  cum: number[]
  len: number
  id: number
  time: number[]
  col: [number, number, number]
  sketch: number
  fill?: number[]
}

export function buildWireMesh(lines: WireLineIn[]): WireGeom {
  let vertCount = 0
  let idxCount = 0
  for (const R of lines) {
    vertCount += R.pts.length * 2
    idxCount += (R.pts.length - 1) * 6
  }
  const n = new Float32Array(vertCount * 3)
  const r = new Float32Array(vertCount * 3)
  const o = new Float32Array(vertCount * 2)
  const a = new Float32Array(vertCount)
  const c = new Float32Array(vertCount * 3)
  const h = new Float32Array(vertCount)
  const p = new Float32Array(vertCount)
  const m = new Float32Array(vertCount)
  const g = new Float32Array(vertCount)
  const v = new Float32Array(vertCount)
  const y = new Float32Array(vertCount)
  const S = new Uint32Array(idxCount)
  let E = 0
  let w = 0
  for (const R of lines) {
    const b = R.pts.length
    const base = E
    for (let B = 0; B < b; B++) {
      const k = R.pts[Math.max(0, B - 2)]
      const N = R.pts[Math.min(b - 1, B + 2)]
      const z = R.pts[B]
      for (const Z of [-1, 1]) {
        n[E * 3] = z[0]
        n[E * 3 + 1] = z[1]
        r[E * 3] = N[0] - k[0]
        r[E * 3 + 1] = N[1] - k[1]
        o[E * 2] = B / (b - 1)
        o[E * 2 + 1] = Z
        a[E] = R.time[B]
        c.set(R.col, E * 3)
        h[E] = R.cum[B]
        p[E] = R.len
        m[E] = R.id
        g[E] = R.sketch
        v[E] = Math.min(R.cum[B], R.len - R.cum[B])
        y[E] = R.fill ? R.fill[B] : 0
        E++
      }
      // 6 indeks per segmen: (0,1,2)(1,3,2) — ditulis SEKALI per titik (bukan per sisi)
      if (B < b - 1) {
        const Z = base + B * 2
        S[w] = Z
        S[w + 1] = Z + 1
        S[w + 2] = Z + 2
        S[w + 3] = Z + 1
        S[w + 4] = Z + 3
        S[w + 5] = Z + 2
        w += 6
      }
    }
  }
  return {
    position: n, aDir: r, uv: o, aT: a, aCol: c, aS: h, aLen: p,
    aId: m, aSketch: g, aEnd: v, aF: y, index: S,
    vertexCount: vertCount, indexCount: idxCount,
  }
}

/**
 * kemas MiraPicture → WireLineIn, SAMA dengan FN(): jam dari bintang, warna palet,
 * `id` dari PRNG ber-seed 3 (berurutan sesuai urutan garis).
 */
export function pictureToWire(
  pic: MiraPicture,
  opts: { now?: number; seed?: number; cfg?: typeof IGNITE_CFG } = {}
): WireLineIn[] {
  const { seed = 3, cfg = IGNITE_CFG } = opts
  const s = makeIgnite(pic.star, pic.height, cfg)
  const rnd = mulberry32(seed)
  return pic.lines.map((l) => {
    const t = l.pts.map(([x, y]) => revealAt(x, y, s))
    return {
      pts: l.pts,
      cum: l.cum as number[],
      len: l.len as number,
      id: rnd(),
      time: t.map((v) => v - 0.02),
      col: wireColour(l),
      sketch: 0,
      fill: t.map((v) => v + 0.3),
    }
  })
}
