/**
 * miraWaves.ts — port lapisan `waves` (komponen `kk` di bundle live).
 *
 * 3 pita (Qy = 3) melintasi seluruh pemandangan (x −9..9, z −2.2..−2.8), tiap pita = kurva
 * Catmull-Rom sentripetal dari 6–7 titik kendali yang berayun; tiap frame pita "diukir" menjadi
 * Da+1 = 65 ruas × 2 verteks (lebar lokal berdenyut), lalu 168 percikan (56 per pita) menempel
 * di sepanjang kurva.
 *
 *   buildWaveRibbons()      geometri + kurva + seed (statis)
 *   carveRibbon()           posisi verteks per waktu pita
 *   buildWaveSparks()       atribut statis percikan
 *   updateWaveSparks()      posisi percikan per frame
 *   curvePoint()            CatmullRomCurve3 centripetal (getPoint three.js)
 */

export const WAVES_CFG = { ribbons: 3, segs: 64, group: { pos: [0, 0, 0] as const, scale: 0.55 }, sparksPerRibbon: 56, spark: { size: 2.8, seed: 5, color: [0.9, 0.78, 1] as const } }

export type V3 = [number, number, number]

type Ctrl = { base: V3; off: number; freq: number; amp: number; cur: V3 }

export type WaveRibbon = {
  seed: number
  width: number
  pts: Ctrl[]
  position: Float32Array      // (segs+1)*2 verteks × 3
  uv: Float32Array            // (segs+1)*2 verteks × 2
  index: Uint16Array          // segs × 6
}

/** hash sinyal deterministik gN/PT */
const hash = (a: number, b: number, seed: number) => {
  const r = Math.sin(a * 12.9898 + b * 78.233 + seed * 3.7) * 43758.5453
  return r - Math.floor(r)
}

/** `buildWaveRibbons` — 3 pita + kurva kendali (sama seperti `Te.useMemo` di live) */
export function buildWaveRibbons(): WaveRibbon[] {
  const Qy = WAVES_CFG.ribbons
  const Da = WAVES_CFG.segs
  const out: WaveRibbon[] = []
  for (let a = 0; a < Qy; a++) {
    const c = a * 7.31 + 1.7
    const h = 6 + (a % 2)
    const pts: Ctrl[] = []
    const m = -3 + (a / (Qy - 1)) * 6 + Math.sin(c) * 0.8
    const g = Math.sin(c * 1.9) * 0.55
    const v = -2.2 - (a % 3) * 0.6
    for (let I = 0; I < h; I++) {
      const B = I / (h - 1)
      pts.push({
        base: [-9 + B * 18, m + (B - 0.5) * g * 6, v],
        off: c * 3.1 + I * 1.37,
        freq: 0.045 + ((0.025 * ((I * 3 + a) % 5)) / 4),
        amp: 0.9 + 1.3 * (((I * 7 + a * 3) % 6) / 5),
        cur: [0, 0, 0],
      })
    }
    const n = (Da + 1) * 2
    const position = new Float32Array(n * 3)
    const uv = new Float32Array(n * 2)
    const index: number[] = []
    for (let I = 0; I <= Da; I++) {
      uv[I * 2 * 2] = I / Da
      uv[I * 2 * 2 + 1] = 0
      uv[(I * 2 + 1) * 2] = I / Da
      uv[(I * 2 + 1) * 2 + 1] = 1
      if (I < Da) {
        const B = I * 2
        index.push(B, B + 1, B + 2, B + 1, B + 3, B + 2)
      }
    }
    out.push({ seed: c, width: 0.2 + (0.14 * ((a * 5) % 3)) / 2, pts, position, uv, index: Uint16Array.from(index) })
  }
  return out
}

// ---- CatmullRomCurve3 'centripetal' (three.js) ----
function calc(x0: number, x1: number, t0: number, t1: number, t: number) {
  const c0 = x0
  const c1 = t0
  const c2 = -3 * x0 + 3 * x1 - 2 * t0 - t1
  const c3 = 2 * x0 - 2 * x1 + t0 + t1
  return c0 + c1 * t + c2 * t * t + c3 * t * t * t
}
function initNonuniform(x0: number, x1: number, x2: number, x3: number, dt0: number, dt1: number, dt2: number) {
  let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1
  let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2
  t1 *= dt1
  t2 *= dt1
  return { x0: x1, t0: t1, x1: x2, t1: t2 }
}

/** titik kurva Catmull-Rom sentripetal pada t 0..1 (open curve) */
export function curvePoint(points: V3[], t: number): V3 {
  const l = points.length
  const p = (l - 1) * t
  let intPoint = Math.floor(p)
  let weight = p - intPoint
  if (weight === 0 && intPoint === l - 1) {
    intPoint = l - 2
    weight = 1
  }
  let p0: V3
  let p3: V3
  if (intPoint > 0) p0 = points[intPoint - 1]
  else p0 = [points[0][0] * 2 - points[1][0], points[0][1] * 2 - points[1][1], points[0][2] * 2 - points[1][2]]
  const p1 = points[intPoint % l]
  const p2 = points[(intPoint + 1) % l]
  if (intPoint + 2 < l) p3 = points[intPoint + 2]
  else
    p3 = [
      2 * points[l - 1][0] - points[l - 2][0],
      2 * points[l - 1][1] - points[l - 2][1],
      2 * points[l - 1][2] - points[l - 2][2],
    ]
  const d2 = (a: V3, b: V3) => {
    const dx = a[0] - b[0]
    const dy = a[1] - b[1]
    const dz = a[2] - b[2]
    return dx * dx + dy * dy + dz * dz
  }
  const pow = 0.25
  let dt0 = Math.pow(d2(p0, p1), pow)
  let dt1 = Math.pow(d2(p1, p2), pow)
  let dt2 = Math.pow(d2(p2, p3), pow)
  if (dt1 < 1e-4) dt1 = 1
  if (dt0 < 1e-4) dt0 = dt1
  if (dt2 < 1e-4) dt2 = dt1
  const ax = initNonuniform(p0[0], p1[0], p2[0], p3[0], dt0, dt1, dt2)
  const ay = initNonuniform(p0[1], p1[1], p2[1], p3[1], dt0, dt1, dt2)
  const az = initNonuniform(p0[2], p1[2], p2[2], p3[2], dt0, dt1, dt2)
  return [calc(ax.x0, ax.x1, ax.t0, ax.t1, weight), calc(ay.x0, ay.x1, ay.t0, ay.t1, weight), calc(az.x0, az.x1, az.t0, az.t1, weight)]
}

/** `getPoints(Da)` */
export function curvePoints(points: V3[], da: number): V3[] {
  const out: V3[] = []
  for (let i = 0; i <= da; i++) out.push(curvePoint(points, i / da))
  return out
}

/** update titik kendali untuk waktu pita `p`, lalu ukir pita: 65 ruas × 2 verteks */
export function carveRibbon(r: WaveRibbon, p: number, widthDial = 1.6) {
  for (const q of r.pts) {
    const b = p * q.freq
    q.cur = [
      q.base[0] + Math.sin(b * 0.7 + q.off) * q.amp * 0.6,
      q.base[1] + Math.sin(b + q.off) * q.amp + Math.sin(b * 2.3 + q.off * 1.7) * q.amp * 0.35,
      q.base[2] + Math.sin(b * 0.5 + q.off * 0.6) * 0.3,
    ]
  }
  const Da = WAVES_CFG.segs
  const w = curvePoints(r.pts.map((q) => q.cur), Da)
  const M = r.position
  for (let R = 0; R <= Da; R++) {
    const b = w[R]
    const I2 = w[Math.min(R + 1, Da)]
    const B2 = w[Math.max(R - 1, 0)]
    let k = I2[0] - B2[0]
    let N = I2[1] - B2[1]
    const z = Math.hypot(k, N) || 1e-4
    k /= z
    N /= z
    const Z = R / Da
    const L = r.width * widthDial * (0.55 + 0.45 * Math.sin(Z * 6.28 * 1.3 + p * 0.11 + r.seed)) * (0.7 + 0.3 * Math.sin(Z * 6.28 * 0.6 - p * 0.07 + r.seed * 2))
    const D = L * (0.5 + 0.35 * Math.sin(Z * 6.28 * 2.1 + p * 0.09 + r.seed * 1.3))
    const X = L * (0.5 + 0.35 * Math.sin(Z * 6.28 * 1.7 - p * 0.13 + r.seed * 0.7 + 2))
    const j = R * 6
    M[j] = b[0] - -N * D
    M[j + 1] = b[1] - k * D
    M[j + 2] = b[2]
    M[j + 3] = b[0] + -N * X
    M[j + 4] = b[1] + k * X
    M[j + 5] = b[2]
  }
  return M
}

export type WaveSparks = {
  n: number
  perRibbon: number
  position: Float32Array
  aPhase: Float32Array
  aSize: Float32Array
  u: Float32Array
  speed: Float32Array
  v: Float32Array
}

/** `gN(56, 3, {size 2.8, seed 5, color [.9,.78,1]})` — 168 percikan */
export function buildWaveSparks(): WaveSparks {
  const per = WAVES_CFG.sparksPerRibbon
  const ribbons = WAVES_CFG.ribbons
  const size = WAVES_CFG.spark.size
  const seed = WAVES_CFG.spark.seed
  const o = per * ribbons
  const position = new Float32Array(o * 3)
  const aPhase = new Float32Array(o)
  const aSize = new Float32Array(o)
  const u = new Float32Array(o)
  const speed = new Float32Array(o)
  const v = new Float32Array(o)
  for (let w = 0; w < o; w++) {
    u[w] = hash(w, 1, seed)
    speed[w] = (0.008 + 0.028 * hash(w, 2, seed)) * (hash(w, 3, seed) < 0.5 ? -1 : 1)
    v[w] = hash(w, 4, seed) * 2 - 1
    aPhase[w] = hash(w, 5, seed)
    aSize[w] = size * (0.45 + 1.1 * Math.pow(hash(w, 6, seed), 2.2))
  }
  return { n: o, perRibbon: per, position, aPhase, aSize, u, speed, v }
}

/** `vN` — percikan bergerak sepanjang kurva pita */
export function updateWaveSparks(s: WaveSparks, dt: number, t: number, curveOf: (i: number) => V3[], widthOf: (i: number) => number, spread = 0.8) {
  for (let y = 0; y < s.n; y++) {
    const ri = Math.floor(y / s.perRibbon)
    const pts = curveOf(ri)
    if (!pts) continue
    let E = s.u[y] + s.speed[y] * dt
    E -= Math.floor(E)
    s.u[y] = E
    const P = curvePoint(pts, E)
    const Q = curvePoint(pts, Math.min(E + 0.01, 1))
    let w = Q[0] - P[0]
    let M = Q[1] - P[1]
    const R = Math.hypot(w, M) || 1e-4
    w /= R
    M /= R
    const b = s.v[y] * widthOf(ri) * spread
    const I = y * 3
    s.position[I] = P[0] + -M * b
    s.position[I + 1] = P[1] + w * b
    s.position[I + 2] = P[2]
  }
  void t
  return s.position
}
