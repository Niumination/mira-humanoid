/**
 * lib/miraTimeline — jam ignition + warna + seed per garis (port VERBATIM dari bundle).
 *
 * Dari FN() (bundle ≈1081913):
 *   const o = Ud(seed)                      // PRNG mulberry32 ber-seed → id per garis
 *   const y = qo.weave[1] + qo.hush          // 6 + 0,55 = 6,55  (ignite)
 *   const S = {cx: star.x, cy: star.y, ignite: y, speed: qo.wave * height}
 *   const E = (x, y) => DN(x, y, S)          // ignite + LN(radius, speed)
 *   time = E(p) - 0,02
 *   fill = E(p) + 0,30
 *   col  = outline ? [.95,.9,1] : Nd[kind].map((z, i) => z*0,6 + col[i]*0,4)
 *
 * Terverifikasi byte-identik dengan buffer live (lihat recon/verify-mira-wire.mjs).
 */

/** PRNG bundle `Ud` (mulberry32) — dipakai dengan seed 3 untuk `aId`. */
export function mulberry32(seed: number): () => number {
  let e = seed | 0
  return () => {
    e = (e + 1831565813) | 0
    let t = Math.imul(e ^ (e >>> 15), 1 | e)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** config `qo` — hanya bagian yang relevan untuk jam ignition */
export const IGNITE_CFG = {
  spark: [0, 0.9] as const,
  weave: [0.9, 6] as const,
  accel: 0.72,
  arms: 2,
  spin: 0.15,
  twist: 7,
  reachBins: 180,
  flight: [1.5, 0.65] as const,
  launch: 0.75,
  turns: [0.5, 0.68] as const,
  coreSpin: 2.2,
  bulge: 0.14,
  coreR: 0.05,
  hush: 0.55,
  wave: 1,
  coreArcs: 18,
  crownArcs: 10,
  seats: 36e3,
  hairSeats: 14e3,
  matterRef: 16e3,
  view: [-0.9, 1.9, -0.25, 1] as const,
}

/** palet garis yang dipakai build (`Nd`) */
export const WIRE_PALETTE = {
  white: [1, 0.95, 1] as const,
  violet: [0.72, 0.42, 1] as const,
  gold: [1, 0.66, 0.26] as const,
}
export const OUTLINE_COL = [0.95, 0.9, 1] as const

/** warna garis yang benar-benar dikirim ke shader (FN) */
export function wireColour(line: {
  outline?: boolean
  kind?: 'white' | 'violet' | 'gold'
  col: [number, number, number] | number[]
}): [number, number, number] {
  if (line.outline) return [OUTLINE_COL[0], OUTLINE_COL[1], OUTLINE_COL[2]]
  const p = WIRE_PALETTE[line.kind || 'white']
  return [p[0] * 0.6 + line.col[0] * 0.4, p[1] * 0.6 + line.col[1] * 0.4, p[2] * 0.6 + line.col[2] * 0.4]
}

/** `LN` — jarak → waktu (dekat inti lebih lambat, lalu linier) */
export function waveTime(r: number, speed: number): number {
  if (r <= 0) return 0
  if (r <= 1.64 * speed) return (1 - Math.sqrt(Math.max(0, 1 - 0.36 * r / speed))) / 0.18
  return r / (0.82 * speed)
}

export interface Ignite {
  cx: number
  cy: number
  ignite: number
  speed: number
}

/** `DN` — waktu saat gelombang ignition mencapai (x,y) */
export function revealAt(x: number, y: number, s: Ignite): number {
  return s.ignite + waveTime(Math.hypot(x - s.cx, y - s.cy), s.speed)
}

/** `S` dari FN: pusat = bintang (star), ignite = weave[1]+hush, speed = wave·tinggi */
export function makeIgnite(star: { x: number; y: number }, height: number, cfg = IGNITE_CFG): Ignite {
  return { cx: star.x, cy: star.y, ignite: cfg.weave[1] + cfg.hush, speed: cfg.wave * height }
}
