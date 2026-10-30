/**
 * lib/miraMatter — port VERBATIM generator materi, busur, dan timeline build.
 *
 * Sumber bundle:
 *   Nw()          sampling titik materi dari citra (alpha > 128, ditolak menurut luminansi)
 *   RN()          "reach" per bin sudut dari inti (jari-jari terjauh yang pernah dicapai)
 *   CN()/PN()/IN() kurva jarak→waktu kedatangan (spiral, arms, twist, spin)
 *   Uw()/g0()     spline acak + cabang (dipakai busur inti & mahkota)
 *   FN()          perakitan: particles (materi), lines (jam per titik), arcs, timeline
 *
 * Pemanggilan di bundle (≈1177611):
 *   const D = Ud(seed*31 + 1)                       // seed = 7 → Ud(218)
 *   const X = Nw(px, 1146, 1374, 36000, D)          // kursi materi dari citra
 *   const j = Nw(hairPx, 1385, 1422, 14000, D, { minLum: .12, dx: -120, dy: -48 })
 *   FN(picture, X.concat(j), seed)                  // seed 7
 *
 * Terverifikasi terhadap buffer live: lihat recon/verify-mira-matter.mjs.
 */
import type { MiraLine, MiraPicture } from './miraLines'
import { IGNITE_CFG, mulberry32, wireColour } from './miraTimeline'

/** `IT` — clamp 0..1 */
const IT = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** `zf` */
const zf = 2 * Math.PI
/** `lp` — smoothstep */
export const lp = (a: number, b: number, t: number) => {
  const n = IT((t - a) / (b - a))
  return n * n * (3 - 2 * n)
}

/** `Uw` — satu lintasan acak (subdivisi titik tengah dengan simpangan mengecil) */
export function uw(rnd: () => number, x0: number, y0: number, x1: number, y1: number, jitter: number, depth: number) {
  let c: [number, number][] = [[x0, y0], [x1, y1]]
  let h = Math.hypot(x1 - x0, y1 - y0) * jitter
  for (let d = 0; d < depth; d++) {
    const m: [number, number][] = [c[0]]
    for (let i = 0; i < c.length - 1; i++) {
      const [vx, vy] = c[i]
      const [sx, sy] = c[i + 1]
      const wx = sx - vx, wy = sy - vy
      const rl = Math.hypot(wx, wy) || 1
      const b = (rnd() * 2 - 1) * h
      m.push([(vx + sx) / 2 - (wy / rl) * b, (vy + sy) / 2 + (wx / rl) * b], c[i + 1])
    }
    c = m
    h *= 0.55
  }
  return c
}

/** `g0` — lintasan + cabang; tiap segmen [x0,y0,x1,y1,t,w] */
export function g0(
  rnd: () => number,
  x0: number, y0: number, x1: number, y1: number,
  { branches = [2, 5], depth = 6 }: { branches?: [number, number] | number[]; depth?: number } = {}
): number[][] {
  const c = uw(rnd, x0, y0, x1, y1, 0.2, depth)
  const out: number[][] = []
  for (let i = 0; i < c.length - 1; i++) out.push([...c[i], ...c[i + 1], i / (c.length - 1), 1])
  const n = branches[0] + Math.floor(rnd() * (branches[1] - branches[0] + 1))
  for (let k = 0; k < n; k++) {
    const gi = Math.floor(c.length * (0.15 + rnd() * 0.6))
    const [vx, vy] = c[gi]
    const ang = Math.atan2(y1 - y0, x1 - x0) + (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.7)
    const len = Math.hypot(x1 - x0, y1 - y0) * (0.1 + rnd() * 0.25)
    const w = uw(rnd, vx, vy, vx + Math.cos(ang) * len, vy + Math.sin(ang) * len, 0.3, Math.max(3, depth - 2))
    const m = gi / (c.length - 1)
    for (let i = 0; i < w.length - 1; i++) out.push([...w[i], ...w[i + 1], m + (i / w.length) * 0.15, 0.45])
  }
  return out
}

/** `Nw` — sampling kursi materi dari citra (alpha > 128, ambang luminansi opsional) */
export function nw(
  px: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  count: number,
  rnd: () => number,
  { minLum = 0, dx = 0, dy = 0 }: { minLum?: number; dx?: number; dy?: number } = {}
): number[] {
  const out: number[] = []
  for (let tries = 0; out.length < count * 5 && tries < count * 60; tries++) {
    const x = Math.floor(rnd() * w)
    const y = Math.floor(rnd() * h)
    const o = (y * w + x) * 4
    if (px[o + 3] < 128) continue
    const r = px[o] / 255
    const g = px[o + 1] / 255
    const b = px[o + 2] / 255
    const lum = Math.max(r, g, b)
    if (lum < minLum) continue
    if (rnd() > 0.08 + 0.92 * Math.pow(lum, 1.6)) continue
    out.push(x + dx, y + dy, r, g, b)
  }
  return out
}

/** `RN` — jari-jari terjauh per bin sudut, dihaluskan */
export function reachBins(pts: number[], cx: number, cy: number, bins = IGNITE_CFG.reachBins): Float32Array {
  const n = bins
  const r = new Float32Array(n)
  for (let i = 0; i < pts.length; i += 2) {
    const dx = pts[i] - cx
    const dy = pts[i + 1] - cy
    const d = Math.hypot(dx, dy)
    const bin = ((Math.floor(((Math.atan2(dy, dx) + Math.PI) / zf) * n) % n) + n) % n
    if (d > r[bin]) r[bin] = d
  }
  let max = 0
  for (const v of r) max = Math.max(max, v)
  const a = Float32Array.from(r, (v, i) => {
    let m = 0
    for (let k = -3; k <= 3; k++) m = Math.max(m, r[(i + k + n) % n])
    return Math.max(m, 0.15 * max, 1)
  })
  return Float32Array.from(a, (v, i) => {
    let s = 0
    for (let k = -2; k <= 2; k++) s += a[(i + k + n) % n]
    return s / 5
  })
}

/** `CN` — sampel reach pada sudut tertentu */
export function reachAt(bins: Float32Array, angle: number): number {
  const t = bins.length
  const n = ((angle + Math.PI) / zf) * t - 0.5
  const i = Math.floor(n)
  const f = n - i
  return bins[((i % t) + t) % t] * (1 - f) + bins[(((i + 1) % t) + t) % t] * f
}

export interface Arrive {
  cx: number
  cy: number
  reach: Float32Array
  phase: number
}

/** `PN` — 0..1 seberapa "dalam" titik itu di pola spiral */
export function pn(x: number, y: number, a: Arrive, r = IGNITE_CFG): number {
  const dx = x - a.cx
  const dy = y - a.cy
  const ang = Math.atan2(dy, dx)
  const c = Math.min(1, Math.hypot(dx, dy) / reachAt(a.reach, ang))
  const h = 4 * c * (1 - c) * r.spin
  return IT(Math.pow(Math.max(c, 1e-6), 0.85) * (1 - h) + h * (0.5 + 0.5 * Math.sin(r.arms * ang - c * r.twist + a.phase)))
}

/** `IN` — waktu kedatangan titik (jam weave) */
export function weaveAt(x: number, y: number, a: Arrive, r = IGNITE_CFG): number {
  return r.weave[0] + (r.weave[1] - r.weave[0]) * Math.pow(Math.max(pn(x, y, a, r), 1e-6), r.accel)
}

export interface MatterParticle {
  seat: [number, number]
  col: [number, number, number]
  tArr: number
  fly: number
  turns: number
  seed: number
  stay: number
  tRev: number
}

export interface MatterArc {
  kind: 'core' | 'crown'
  t: number
  segs: number[][]
  color: readonly number[]
  strength: number
  x: number
  y: number
}

export interface BuildResult {
  particles: MatterParticle[]
  arcs: MatterArc[]
  arrive: Arrive
  reveal: { cx: number; cy: number; ignite: number; speed: number }
  ignite: number
  star: { x: number; y: number }
  lastReveal: number
}

/**
 * `FN` — rakit particles + arcs + timeline.
 * `seats` = hasil `nw(...)` (data citra) untuk materi, sudah digabung dengan kursi rambut.
 */
export function buildMatter(
  pic: MiraPicture,
  seats: number[],
  seedState = 7,
  cfg = IGNITE_CFG,
  opts: { hairSeats?: number[] } = {}
): BuildResult {
  void opts
  const rnd = mulberry32(seedState)
  const star = pic.star
  const pts: number[] = []
  for (let i = 0; i < seats.length; i += 5) pts.push(seats[i], seats[i + 1])
  for (let i = 0; i < pic.dust.length; i += 5) pts.push(pic.dust[i], pic.dust[i + 1])
  for (const l of pic.lines) for (const [x, y] of l.pts) pts.push(x, y)

  const arrive: Arrive = { cx: star.x, cy: star.y, reach: reachBins(pts, star.x, star.y, cfg.reachBins), phase: rnd() * Math.PI * 2 }
  const ignite = cfg.weave[1] + cfg.hush
  const reveal = { cx: star.x, cy: star.y, ignite, speed: cfg.wave * pic.height }

  const particles: MatterParticle[] = []
  const push = (x: number, y: number, r: number, g: number, b: number, stay: number) => {
    const tArr = weaveAt(x, y, arrive, cfg)
    const k = (tArr - cfg.weave[0]) / (cfg.weave[1] - cfg.weave[0])
    const fly = Math.min((cfg.flight[0] + (cfg.flight[1] - cfg.flight[0]) * k) * (0.85 + 0.3 * rnd()), tArr - cfg.launch)
    particles.push({
      seat: [x, y],
      col: [r, g, b],
      tArr,
      fly,
      turns: cfg.turns[0] + rnd() * (cfg.turns[1] - cfg.turns[0]),
      seed: rnd(),
      stay,
      tRev: reveal.ignite + waveT(Math.hypot(x - reveal.cx, y - reveal.cy), reveal.speed),
    })
  }
  for (let i = 0; i < pic.dust.length; i += 5) push(pic.dust[i], pic.dust[i + 1], pic.dust[i + 2], pic.dust[i + 3], pic.dust[i + 4], 1)
  for (let i = 0; i < seats.length; i += 5) push(seats[i], seats[i + 1], seats[i + 2], seats[i + 3], seats[i + 4], 0)

  let lastReveal = ignite
  for (let i = 0; i < pts.length; i += 2) lastReveal = Math.max(lastReveal, reveal.ignite + waveT(Math.hypot(pts[i] - reveal.cx, pts[i + 1] - reveal.cy), reveal.speed))

  // busur inti (mengelilingi bintang) & mahkota (dari garis siluet)
  const arcs: MatterArc[] = []
  const W = pic.width
  for (let i = 0; i < cfg.coreArcs; i++) {
    const z = Math.pow(i / cfg.coreArcs, 1.4)
    const t = 0.45 + z * (cfg.weave[1] - 0.75) + rnd() * 0.06
    const ang = rnd() * Math.PI * 2
    const rad = cfg.coreR * W * (1 - 0.6 * z)
    const len = (0.07 + rnd() * 0.16) * W * (1 - 0.5 * z)
    const x = star.x + Math.cos(ang) * rad
    const y = star.y + Math.sin(ang) * rad
    arcs.push({
      kind: 'core', t, x, y,
      segs: g0(rnd, x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, { branches: [1, 3], depth: 5 }),
      color: rnd() < 0.6 ? [0.72, 0.42, 1] : [1, 0.95, 1],
      strength: 0.55 + rnd() * 0.35,
    })
  }
  const outlinePts = pic.lines.filter((l: MiraLine) => l.outline).flatMap((l) => l.pts as [number, number][])
  for (let i = 0; i < cfg.crownArcs && outlinePts.length; i++) {
    const [x, y] = outlinePts[Math.floor(rnd() * outlinePts.length)]
    const dx = x - star.x, dy = y - star.y
    const d = Math.hypot(dx, dy) || 1
    const len = (0.14 + rnd() * 0.22) * W
    arcs.push({
      kind: 'crown', t: ignite + rnd() * 0.28, x, y,
      segs: g0(rnd, x, y, x + (dx / d) * len, y + (dy / d) * len, { branches: [2, 4], depth: 6 }),
      color: rnd() < 0.5 ? [1, 0.95, 1] : [0.72, 0.42, 1],
      strength: 0.9 + rnd() * 0.35,
    })
  }
  arcs.sort((a, b) => a.t - b.t)

  return { particles, arcs, arrive, reveal, ignite, star: pic.star, lastReveal }
}

/** `LN` — jarak → waktu (dipakai juga oleh reveal) */
export function waveT(r: number, speed: number): number {
  if (r <= 0) return 0
  if (r <= 1.64 * speed) return (1 - Math.sqrt(Math.max(0, 1 - (0.36 * r) / speed))) / 0.18
  return r / (0.82 * speed)
}

export { wireColour }
