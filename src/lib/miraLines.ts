/**
 * lib/miraLines — MESIN GARIS MIRA: ekstraksi garis dari artwork.
 *
 * Port VERBATIM dari bundle live `SN()` + pembantunya. Urutannya sama persis:
 *   alpha>128 → mask · brightness>200 → kanal terang
 *   → blur kotak 1 px dan 7 px (integral image) → R = blur1 − blur7  (diferensiasi lokal)
 *   → ambang persentil 84 → mask garis → dilate 1 px → THINNING (Zhang–Suen) `Pw`
 *   → tracing kontur `Iw` → jalur titik + warna `Lw`
 *   → outline dari tepi siluet (blur 10) · jalur dalam digabung `Dw` kalau ujungnya berdekatan
 *   → penghalusan `bT` (3×) lalu resample `RT` (tiap 2,5 px gambar)
 *   → `xN` panjang kumulatif · `_N` klasifikasi warna (gold / white / violet)
 *   → debu: piksel terang yang BUKAN garis, diambil acak ber-seed `yN`
 *
 * Semua koordinat keluaran dalam **piksel gambar** (skala `1/opts.scale`, default 0,5),
 * sehingga `width/height` = 2× dimensi aset. Itu yang dipakai shader (`uRes`, `uHeadH`).
 *
 * Verifikasi: `recon/verify-mira-lines.mjs` membandingkan jumlah garis/titik/index dengan
 * angka terukur dari live (`drawElements(…, 22248, …)`).
 */

export type Pt = [number, number]

export interface MiraLine {
  pts: Pt[]
  col: [number, number, number]
  weight: number
  kind?: 'gold' | 'white' | 'violet'
  outline?: boolean
  cum?: number[]
  len?: number
}

export interface MiraPicture {
  width: number
  height: number
  lines: MiraLine[]
  star: { x: number; y: number }
  crown: { x: number; y: number }
  dust: Float32Array
  counts: Record<string, number>
}

/** clamp 0..1 */
const clamp01 = (i: number) => (i < 0 ? 0 : i > 1 ? 1 : i)

/** LP(i, a, b) — smoothstep dari a ke b (bundle: `lp`) */
export const smoothstepRange = (a: number, b: number, i: number) => {
  const n = clamp01((i - a) / (b - a))
  return n * n * (3 - 2 * n)
}

/** yN/Ud(i) — LCG 32-bit yang sama dengan bundle */
export function rng(seed: number): () => number {
  let e = seed | 0
  return () => {
    e = (e + 1831565813) | 0
    let t = Math.imul(e ^ (e >>> 15), 1 | e)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Bf — rata-rata kotak (2n+1)×(2n+1) lewat integral image */
export function boxBlur(src: Float32Array, w: number, h: number, n: number): Float32Array {
  const r = new Float64Array((w + 1) * (h + 1))
  for (let a = 0; a < h; a++) {
    let c = 0
    for (let x = 0; x < w; x++) {
      c += src[a * w + x]
      r[(a + 1) * (w + 1) + x + 1] = r[a * (w + 1) + x + 1] + c
    }
  }
  const o = new Float32Array(w * h)
  for (let a = 0; a < h; a++)
    for (let c = 0; c < w; c++) {
      const h0 = Math.max(0, c - n)
      const p = Math.min(w, c + n + 1)
      const m = Math.max(0, a - n)
      const g = Math.min(h, a + n + 1)
      o[a * w + c] =
        (r[g * (w + 1) + p] - r[m * (w + 1) + p] - r[g * (w + 1) + h0] + r[m * (w + 1) + h0]) /
        ((p - h0) * (g - m))
    }
  return o
}

/** Pw — thinning Zhang–Suen (dua sub-iterasi), verbatim */
export function thin(img: Uint8Array, w: number, h: number): void {
  let changed = true
  const del: number[] = []
  while (changed) {
    changed = false
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0
      for (let a = 1; a < h - 1; a++)
        for (let c = 1; c < w - 1; c++) {
          const i = a * w + c
          if (!img[i]) continue
          const p2 = img[i - w]
          const p3 = img[i - w + 1]
          const p4 = img[i + 1]
          const p5 = img[i + w + 1]
          const p6 = img[i + w]
          const p7 = img[i + w - 1]
          const p8 = img[i - 1]
          const p9 = img[i - w - 1]
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
          const A =
            (!p2 && p3 ? 1 : 0) + (!p3 && p4 ? 1 : 0) + (!p4 && p5 ? 1 : 0) + (!p5 && p6 ? 1 : 0) +
            (!p6 && p7 ? 1 : 0) + (!p7 && p8 ? 1 : 0) + (!p8 && p9 ? 1 : 0) + (!p9 && p2 ? 1 : 0)
          if (B < 2 || B > 6 || A !== 1) continue
          if (pass === 0) {
            if ((p2 && p4 && p6) || (p4 && p6 && p8)) continue
          } else if ((p2 && p4 && p8) || (p2 && p6 && p8)) continue
          del.push(i)
        }
      for (const i of del) img[i] = 0
      if (del.length) changed = true
    }
  }
}

/** Iw — trace jalur dari mask garis (8-konektivitas, mulai dari ujung) */
export function tracePaths(img: Uint8Array, w: number, h: number, minLen: number): number[][] {
  const used = new Uint8Array(w * h)
  const o = [-w, 1, w, -1, -w - 1, -w + 1, w + 1, w - 1]
  const a = [-w, -w + 1, 1, w + 1, w, w - 1, -1, -w - 1]
  const neighbours = (v: number) => {
    let y = 0
    for (let S = 0; S < 8; S++) if (!img[v + a[S]] && img[v + a[(S + 1) % 8]]) y++
    return y
  }
  const inside = (v: number) => {
    const x = v % w
    const y = (v / w) | 0
    return x > 0 && y > 0 && x < w - 1 && y < h - 1
  }
  const walk = (path: number[]) => {
    for (;;) {
      const last = path[path.length - 1]
      let next = -1
      for (const E of o) {
        const p = last + E
        if (img[p] && !used[p] && inside(p)) {
          next = p
          break
        }
      }
      if (next < 0) return
      path.push(next)
      if (neighbours(next) >= 3) return
      used[next] = 1
    }
  }
  const out: number[][] = []
  const start = (v: number) => {
    used[v] = 1
    const path = [v]
    walk(path)
    path.reverse()
    walk(path)
    if (path.length >= minLen) out.push(path)
  }
  for (let v = 0; v < w * h; v++) if (img[v] && !used[v] && inside(v) && neighbours(v) === 1) start(v)
  for (let v = 0; v < w * h; v++) if (img[v] && !used[v] && inside(v) && neighbours(v) < 3) start(v)
  return out
}

/** Lw — jalur piksel → titik [x,y] (dibagi scale) + warna rata-rata ternormalisasi */
export function pathToLine(path: number[], w: number, rgba: Uint8Array | Uint8ClampedArray, scale: number): MiraLine | null {
  if (path.length < 2) return null
  const pts: Pt[] = path.map((m) => [((m % w) / scale) as number, (((m / w) | 0) / scale) as number])
  let r = 0
  let g = 0
  let b = 0
  for (const m of path) {
    r += rgba[m * 4]
    g += rgba[m * 4 + 1]
    b += rgba[m * 4 + 2]
  }
  const n = path.length
  const p = Math.max(r, g, b) / n || 1
  return { pts, col: [r / n / p, g / n / p, b / n / p], weight: n }
}

/** RT — resample jalur dengan jarak tetap `step` */
export function resample(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = [pts[0]]
  let carry = 0
  for (let a = 1; a < pts.length; a++) {
    const [c, h] = pts[a - 1]
    const [p, m] = pts[a]
    const g = Math.hypot(p - c, m - h)
    let v = step - carry
    while (v <= g) {
      const y = v / g
      out.push([c + (p - c) * y, h + (m - h) * y])
      v += step
    }
    carry = g - (v - step)
  }
  const last = pts[pts.length - 1]
  const tail = out[out.length - 1]
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > step * 0.35) out.push(last)
  else out[out.length - 1] = last
  return out
}

/** bT — penghalusan (1,2,1)/4 diulang `n` kali */
export function smoothPath(pts: Pt[], n = 4): Pt[] {
  let t = pts
  for (let k = 0; k < n; k++) {
    const r: Pt[] = [t[0]]
    for (let o = 1; o < t.length - 1; o++)
      r.push([(t[o - 1][0] + 2 * t[o][0] + t[o + 1][0]) / 4, (t[o - 1][1] + 2 * t[o][1] + t[o + 1][1]) / 4])
    r.push(t[t.length - 1])
    t = r
  }
  return t
}

/** xN — panjang kumulatif + panjang total */
export function cumulative(line: MiraLine): MiraLine {
  const cum = [0]
  for (let t = 1; t < line.pts.length; t++)
    cum.push(cum[t - 1] + Math.hypot(line.pts[t][0] - line.pts[t - 1][0], line.pts[t][1] - line.pts[t - 1][1]))
  line.cum = cum
  line.len = cum[cum.length - 1]
  return line
}

/** _N — gold / white / violet dari warna garis */
export function kindOf(col: [number, number, number], opts: { goldRatio?: number; whiteSat?: number } = {}): MiraLine['kind'] {
  const { goldRatio = 1.15, whiteSat = 0.36 } = opts
  const [n, r, o] = col
  if (n > o * goldRatio) return 'gold'
  const a = Math.max(n, r, o)
  const c = Math.min(n, r, o)
  return (a - c) / (a || 1) < whiteSat ? 'white' : 'violet'
}

/** Dw — gabungkan jalur yang ujungnya berdekatan & searah (gap px, maxAngle deg) */
export function joinPaths(lines: MiraLine[], { gap = 16, maxAngle = 42 }: { gap?: number; maxAngle?: number } = {}): MiraLine[] {
  const cosLimit = Math.cos((maxAngle * Math.PI) / 180)
  const endInfo = (a: MiraLine, atEnd: boolean) => {
    const h = a.pts.length
    const p = Math.min(h - 1, 6)
    const m = atEnd ? a.pts[h - 1] : a.pts[0]
    const g = atEnd ? a.pts[h - 1 - p] : a.pts[p]
    const v = m[0] - g[0]
    const y = m[1] - g[1]
    const S = Math.hypot(v, y) || 1
    return { p: m, d: [v / S, y / S] as Pt }
  }
  const out = lines.slice()
  for (;;) {
    let best: { i: number; j: number; ai: boolean; bj: boolean; score: number } | null = null
    for (let y = 0; y < out.length; y++)
      for (let S = y + 1; S < out.length; S++) {
        const E = out[y]
        const w = out[S]
        if (E.kind !== w.kind || !!E.outline !== !!w.outline) continue
        for (const M of [false, true])
          for (const R of [false, true]) {
            const b = endInfo(E, M)
            const I = endInfo(w, R)
            const dist = Math.hypot(b.p[0] - I.p[0], b.p[1] - I.p[1])
            if (dist > gap) continue
            const k = -(b.d[0] * I.d[0] + b.d[1] * I.d[1])
            if (k < cosLimit) continue
            const score = dist + (1 - k) * 30
            if (!best || score < best.score) best = { i: y, j: S, ai: M, bj: R, score }
          }
      }
    if (!best) return out
    const c = out[best.i]
    const h = out[best.j]
    const p = best.ai ? c.pts : c.pts.slice().reverse()
    const m = best.bj ? h.pts.slice().reverse() : h.pts
    const gw = c.weight || 1
    const vw = h.weight || 1
    out[best.i] = {
      ...c,
      pts: p.concat(m),
      weight: gw + vw,
      col: [0, 1, 2].map((y) => ((c.col as number[])[y] * gw + (h.col as number[])[y] * vw) / (gw + vw)) as unknown as [number, number, number],
    }
    out.splice(best.j, 1)
  }
}

export interface ExtractOpts {
  scale?: number
  pct?: number
  minLen?: number
  dustMax?: number
  seed?: number
  whiteSat?: number
  step?: number
  join?: number
  minKeep?: number
}

/**
 * SN(i, opts) — ekstraksi lengkap. `i` = { data: RGBA, width, height }.
 * Semua default di bawah disalin dari bundle.
 */
export function extractLines(
  img: { data: Uint8Array | Uint8ClampedArray; width: number; height: number },
  opts: ExtractOpts = {}
): MiraPicture {
  const {
    scale: e = 0.5,
    pct: t = 0.84,
    minLen: n = 18,
    dustMax: r = 4500,
    seed: o = 11,
    whiteSat: a = 0.36,
    step: c = 2.5,
    join: h = 8,
    minKeep: p = 20,
  } = opts
  const { data: m, width: g, height: v } = img
  const y = g * v
  const S = new Float32Array(y)
  const E = new Uint8Array(y)
  for (let Y = 0; Y < y; Y++) {
    const ce = m[Y * 4 + 3]
    E[Y] = ce > 128 ? 1 : 0
    S[Y] = ce > 200 ? (m[Y * 4] + m[Y * 4 + 1] + m[Y * 4 + 2]) / 3 : 0
  }
  const w = boxBlur(S, g, v, 1)
  const M = boxBlur(S, g, v, 7)
  const R = new Float32Array(y)
  const b: number[] = []
  for (let Y = 0; Y < y; Y++)
    if (E[Y]) {
      R[Y] = w[Y] - M[Y]
      b.push(R[Y])
    }
  b.sort((Y, ce) => Y - ce)
  const I = b.length ? b[Math.floor(b.length * t)] : 0
  let B = new Uint8Array(y)
  for (let Y = 0; Y < y; Y++) if (E[Y] && R[Y] > I && w[Y] > 45) B[Y] = 1
  const k = new Uint8Array(y)
  for (let Y = 1; Y < v - 1; Y++)
    for (let ce = 1; ce < g - 1; ce++) {
      const we = Y * g + ce
      if (B[we] || B[we - 1] || B[we + 1] || B[we - g] || B[we + g]) k[we] = E[we]
    }
  B = k
  const N = B.slice()
  thin(B, g, v)
  const z = new Uint8Array(y)
  for (let Y = 2; Y < v - 3; Y++)
    for (let ce = 3; ce < g - 3; ce++) {
      const we = Y * g + ce
      if (E[we] && (!E[we - 1] || !E[we + 1] || !E[we - g] || !E[we + g])) z[we] = 1
    }
  thin(z, g, v)
  const finish = (Y: MiraLine) => cumulative({ ...Y, pts: resample(smoothPath(Y.pts, 4), c / e) })
  const L = tracePaths(B, g, v, n).map((Y) => pathToLine(Y, g, m, e)).filter(Boolean) as MiraLine[]
  L.forEach((Y) => {
    Y.kind = kindOf(Y.col, { whiteSat: a })
  })
  const D = tracePaths(z, g, v, 10).map((Y) => pathToLine(Y, g, m, e)).filter(Boolean) as MiraLine[]
  D.forEach((Y) => {
    Y.kind = 'white'
    Y.outline = true
    Y.col = [0.92, 0.86, 1]
  })
  const X = joinPaths(L, { gap: h / e })
    .map(finish)
    .filter((Y) => (Y.len ?? 0) >= p / e)
  const j = joinPaths(D, { gap: h / e }).map(finish)
  const J = boxBlur(S, g, v, 2)
  let se = -1
  let ie = g / 2
  let me = v * 0.7
  for (let Y = Math.round(v * 0.6); Y < v * 0.8; Y++)
    for (let ce = Math.round(g * 0.42); ce < g * 0.58; ce++) {
      const we = J[Y * g + ce]
      if (we > se) {
        se = we
        ie = ce
        me = Y
      }
    }
  let V = { x: g / 2 / e, y: 0 }
  for (let Y = 0; Y < v; Y++) {
    const ce = Y * g + Math.round(g / 2)
    if (E[ce]) {
      V = { x: g / 2 / e, y: Y / e }
      break
    }
  }
  const ne = rng(o)
  const te: number[] = []
  const W = boxBlur(S, g, v, 2)
  for (let Y = 2; Y < v - 2; Y++)
    for (let ce = 2; ce < g - 2; ce++) {
      const we = Y * g + ce
      if (!E[we] || N[we] || (S[we] > 70 && S[we] - W[we] > 16)) continue
      te.push(we)
    }
  const ae = Math.min(r, te.length)
  const be = new Float32Array(ae * 5)
  for (let Y = 0; Y < ae; Y++) {
    const ce = Y + Math.floor(ne() * (te.length - Y))
    const tmp = te[Y]
    te[Y] = te[ce]
    te[ce] = tmp
    const Ae = te[Y]
    const ze = Math.max(m[Ae * 4], m[Ae * 4 + 1], m[Ae * 4 + 2]) || 1
    be.set(
      [
        ((Ae % g) + ne() - 0.5) / e,
        (((Ae / g) | 0) + ne() - 0.5) / e,
        m[Ae * 4] / ze,
        m[Ae * 4 + 1] / ze,
        m[Ae * 4 + 2] / ze,
      ],
      Y * 5
    )
  }
  const all = [...j, ...X]
  const counts: Record<string, number> = { outline: j.length, inner: X.length, white: 0, violet: 0, gold: 0, dust: ae }
  for (const Y of all) counts[Y.kind as string]++
  return { width: g / e, height: v / e, lines: all, star: { x: ie / e, y: me / e }, crown: V, dust: be, counts }
}
