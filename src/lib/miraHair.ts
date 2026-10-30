/**
 * miraHair.ts — port verbatim ekstraksi helai rambut dari bundle live (`mira.js`).
 *
 *   `MN`/`PT`      pecahan & hash deterministik
 *   `Bf`           box blur via integral image
 *   `RT`/`bT`      resample polyline per jarak + pelunakan
 *   `EN`           lacak helai: ridge luminansi citra rambut → polyline (pts, len, seed)
 *   `AN`           bintik berkilau: puncak lokal luminansi (x, y, r, g, b)
 *   `TN`           dua tekstur citra: `still` (garis helai dipertajam) & `lifted` (selisih = helai terangkat)
 *   `strandGeometry`  pita 2 verteks/helai-vertex (positions, aRest, aS, aSeed, aLen, indices)
 *
 * Ukuran: citra rambut 1385×1422 (`uSize` live); pts dalam piksel citra penuh.
 */

/** `MN` — bagian pecahan */
export const MN = (i: number) => i - Math.floor(i)

/** `PT(i, e)` — hash deterministik 0..1 */
export const PT = (i: number, e: number) => MN(Math.sin(i * 12.9898 + e * 78.233 + 4.1) * 43758.5453)

/** `Bf(i, e, t, n)` — box blur jendela (2n+1) via integral image */
export function Bf(i: Float32Array, e: number, t: number, n: number): Float32Array {
  const r = new Float64Array((e + 1) * (t + 1))
  for (let a = 0; a < t; a++) {
    let c = 0
    for (let h = 0; h < e; h++) {
      c += i[a * e + h]
      r[(a + 1) * (e + 1) + h + 1] = r[a * (e + 1) + h + 1] + c
    }
  }
  const o = new Float32Array(e * t)
  for (let a = 0; a < t; a++)
    for (let c = 0; c < e; c++) {
      const h = Math.max(0, c - n)
      const p = Math.min(e, c + n + 1)
      const m = Math.max(0, a - n)
      const g = Math.min(t, a + n + 1)
      o[a * e + c] =
        (r[g * (e + 1) + p] - r[m * (e + 1) + p] - r[g * (e + 1) + h] + r[m * (e + 1) + h]) / ((p - h) * (g - m))
    }
  return o
}

export type Pt = [number, number]

/** `RT` — resample polyline: titik tiap `e` px panjang */
export function RT(i: Pt[], e: number): Pt[] {
  const t: Pt[] = [i[0]]
  let n = 0
  for (let a = 1; a < i.length; a++) {
    const [c, h] = i[a - 1]
    const [p, m] = i[a]
    const g = Math.hypot(p - c, m - h)
    let v = e - n
    for (; v <= g; ) {
      const y = v / g
      t.push([c + (p - c) * y, h + (m - h) * y])
      v += e
    }
    n = g - (v - e)
  }
  const r = i[i.length - 1]
  const o = t[t.length - 1]
  if (Math.hypot(r[0] - o[0], r[1] - o[1]) > e * 0.35) t.push(r)
  else t[t.length - 1] = r
  return t
}

/** `bT` — pelunakan polyline (rerata bertetangga, `e` iterasi) */
export function bT(i: Pt[], e = 4): Pt[] {
  let t = i
  for (let n = 0; n < e; n++) {
    const r: Pt[] = [t[0]]
    for (let o = 1; o < t.length - 1; o++) r.push([(t[o - 1][0] + 2 * t[o][0] + t[o + 1][0]) / 4, (t[o - 1][1] + 2 * t[o][1] + t[o + 1][1]) / 4])
    r.push(t[t.length - 1])
    t = r
  }
  return t
}

export type HairStrand = { pts: Pt[]; len: number; seed: number }

export type HairImage = { data: Uint8ClampedArray; width: number; height: number }

/** `EN` — lacak helai rambut dari citra (ridge maksimum lokal, dua arah dari titik benih) */
export function EN(
  i: HairImage,
  {
    scale = 0.5,
    minLen = 70,
    fromY = 0.18,
    toY = 0.98,
    spacing = 3,
    step = 2,
    seedRows = 3,
    seedK = 1,
    overlap = 0.6,
    mark = 1,
    thrK = 0.35,
  }: {
    scale?: number
    minLen?: number
    fromY?: number
    toY?: number
    spacing?: number
    step?: number
    seedRows?: number
    seedK?: number
    overlap?: number
    mark?: number
    thrK?: number
  } = {}
): HairStrand[] {
  const { data: v, width: y, height: S } = i
  const E = y * S
  const w = new Float32Array(E)
  for (let J = 0; J < E; J++) w[J] = Math.max(v[J * 4], v[J * 4 + 1], v[J * 4 + 2])
  const M = Bf(w, y, S, 1)
  const R = Bf(w, y, S, 4)
  const b = new Float32Array(E)
  const I: number[] = []
  for (let J = 0; J < E; J++) {
    b[J] = M[J] > 40 ? M[J] - R[J] : 0
    if (b[J] > 0) I.push(b[J])
  }
  I.sort((J, se) => J - se)
  const B = I.length ? Math.max(4, thrK * I[Math.floor(I.length * 0.95)]) : 1e9
  const k = (J: number, se: number) => (J < 1 || se < 0 || J >= y - 1 || se >= S ? -1e9 : b[se * y + J])
  const N = (J: number, se: number, ie: number, me: number): Pt[] => {
    const V: [number, number, number][] = []
    let ne = J
    let te = 0
    let W = 0
    for (let ae = se + ie; ie > 0 ? ae < me : ae >= me; ae += ie) {
      const be = ne + te
      let $ = -1
      let re = -1e9
      for (let Y = -2; Y <= 2; Y++) {
        const ce = Math.round(be) + Y
        const we = k(ce, ae) - 0.25 * B * Math.abs(ce - be)
        if (we > re) {
          re = we
          $ = ce
        }
      }
      if (k($, ae) < B * 0.6) {
        if (++W > 4) break
        ne = be
        V.push([ne, ae, 0])
        continue
      }
      W = 0
      te = 0.75 * te + 0.25 * ($ - ne)
      ne = $
      V.push([ne, ae, 1])
    }
    for (; V.length && !V[V.length - 1][2]; ) V.pop()
    return V.map(([x, yy]) => [x, yy] as Pt)
  }
  const z = Math.round(fromY * S)
  const Z = Math.round(toY * S)
  const L: Pt[][] = []
  for (let J = z; J < Math.round(0.8 * S); J += seedRows)
    for (let se = 2; se < y - 2; se++) {
      const ie = b[J * y + se]
      if (ie < B * seedK || ie < b[J * y + se - 1] || ie < b[J * y + se + 1]) continue
      const me = N(se, J, -1, z).reverse()
      const V = N(se, J, 1, Z)
      const ne: Pt[] = [...me, [se, J], ...V]
      if (ne.length * (1 / scale) < minLen) continue
      L.push(ne)
    }
  L.sort((J, se) => se.length - J.length)
  const D = new Uint8Array(E)
  const X: HairStrand[] = []
  for (const J of L) {
    let se = 0
    for (const [V, ne] of J) if (D[ne * y + Math.round(V)]) se++
    if (se > overlap * J.length) continue
    for (const [V, ne] of J) for (let te = -mark; te <= mark; te++) {
      const W = Math.round(V) + te
      if (W >= 0 && W < y) D[ne * y + W] = 1
    }
    const ie = RT(
      bT(J.map(([V, ne]) => [V / scale, ne / scale] as Pt), 6),
      step
    )
    let me = 0
    for (let V = 1; V < ie.length; V++) me += Math.hypot(ie[V][0] - ie[V - 1][0], ie[V][1] - ie[V - 1][1])
    X.push({ pts: ie, len: me, seed: 0 })
  }
  const j: HairStrand[] = []
  for (const J of X) {
    const se = J.pts[J.pts.length >> 1]
    if (j.some((ie) => ie.pts.some((me) => Math.hypot(me[0] - se[0], me[1] - se[1]) < spacing))) continue
    j.push(J)
  }
  return j.map((J, se) => ({ ...J, seed: PT(se + 1, 3) }))
}

export type HairTwinkle = [number, number, number, number, number]

/** `AN` — bintik berkilau: puncak lokal luminansi (x, y, r, g, b) */
export function AN(i: HairImage, { scale = 0.5, n = 260, min = 170 }: { scale?: number; n?: number; min?: number } = {}): HairTwinkle[] {
  const { data: r, width: o, height: a } = i
  const c: HairTwinkle[] = []
  for (let p = 2; p < a - 2; p++)
    for (let m = 2; m < o - 2; m++) {
      const g = (p * o + m) * 4
      const v = Math.max(r[g], r[g + 1], r[g + 2])
      if (v < min) continue
      let y = true
      for (let S = -2; S <= 2 && y; S++)
        for (let E = -2; E <= 2; E++) {
          if (!E && !S) continue
          const w = ((p + S) * o + m + E) * 4
          if (Math.max(r[w], r[w + 1], r[w + 2]) > v) {
            y = false
            break
          }
        }
      if (y) c.push([m / scale, p / scale, r[g] / v, r[g + 1] / v, r[g + 2] / v])
    }
  const h: HairTwinkle[] = []
  for (let p = 0; p < c.length && h.length < n; p++) if (PT(p + 7, 5) < (n / c.length) * 1.15) h.push(c[p])
  return h
}

/**
 * `TN` — dua citra: `still` (warna tergelap di sekitar tiap piksel helai → garis helai) dan
 * `lifted` (selisih citra asli − still = bagian yang bisa terangkat).
 */
export function TN(i: Uint8ClampedArray, e: number, t: number, n: HairStrand[], r = 2) {
  const o = new Uint8ClampedArray(i)
  const a = new Uint8ClampedArray(i.length)
  const c = new Uint8Array(e * t)
  for (const p of n)
    for (const [m, g] of p.pts) {
      const v = Math.round(m)
      const y = Math.round(g)
      for (let S = -r; S <= r; S++)
        for (let E = -r; E <= r; E++) {
          if (E * E + S * S > r * r + 1) continue
          const w = v + E
          const M = y + S
          if (w >= 0 && M >= 0 && w < e && M < t) c[M * e + w] = 1
        }
    }
  const h = r + 2
  for (let p = 0; p < e * t; p++) {
    if (!c[p]) continue
    const m = p % e
    const g = p / e | 0
    let v = 255
    let y = 255
    let S = 255
    for (let w = -h; w <= h; w++)
      for (let M = -h; M <= h; M++) {
        const R = m + M
        const b = g + w
        if (R < 0 || b < 0 || R >= e || b >= t) continue
        const I = (b * e + R) * 4
        if (i[I] < v) v = i[I]
        if (i[I + 1] < y) y = i[I + 1]
        if (i[I + 2] < S) S = i[I + 2]
      }
    const E = p * 4
    o[E] = v
    o[E + 1] = y
    o[E + 2] = S
    a[E] = i[E] - v
    a[E + 1] = i[E + 1] - y
    a[E + 2] = i[E + 2] - S
    a[E + 3] = 255
  }
  return { still: o, lifted: a }
}

/** pita helai: 2 verteks per titik (lebar `width`), aS = panjang busur, aLen = panjang helai */
export function strandGeometry(strands: HairStrand[], width = 3.5) {
  const R = width
  const position: number[] = []
  const aRest: number[] = []
  const aS: number[] = []
  const aSeed: number[] = []
  const aLen: number[] = []
  const index: number[] = []
  let Z = 0
  for (const me of strands) {
    const V = me.pts
    const ne = V.length
    let te = 0
    for (let W = 0; W < ne; W++) {
      if (W) te += Math.hypot(V[W][0] - V[W - 1][0], V[W][1] - V[W - 1][1])
      const ae = V[Math.max(0, W - 1)]
      const be = V[Math.min(ne - 1, W + 1)]
      const $ = be[0] - ae[0]
      const re = be[1] - ae[1]
      const Y = Math.hypot($, re) || 1
      for (const ce of [-1, 1]) {
        const we = V[W][0] - (re / Y) * R * ce
        const Ae = V[W][1] + ($ / Y) * R * ce
        position.push(we, Ae, 0)
        aRest.push(we, Ae)
        aS.push(te)
        aSeed.push(me.seed)
        aLen.push(me.len)
      }
      if (W < ne - 1)
        index.push(Z + W * 2, Z + W * 2 + 1, Z + W * 2 + 2, Z + W * 2 + 1, Z + W * 2 + 3, Z + W * 2 + 2)
    }
    Z += ne * 2
  }
  return {
    position: Float32Array.from(position),
    aRest: Float32Array.from(aRest),
    aS: Float32Array.from(aS),
    aSeed: Float32Array.from(aSeed),
    aLen: Float32Array.from(aLen),
    index: Uint16Array.from(index),
    verts: position.length / 3,
  }
}
