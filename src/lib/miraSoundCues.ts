/**
 * miraSoundCues — port `Vk()` (bundle live ≈ 1 083 075) + `Gk()`.
 *
 * Live memanggil `Vk({arcs, particles, tl}, picture.width)` di dalam pembangun adegan `Hk()`;
 * hasilnya (`sound`) disimpan di adegan lalu dijalankan `FN(cues, at)`.
 *
 * Susunan cue (urutan sama persis dengan live, lalu diurutkan menurut `t`):
 *   gather  t = spark[0]+0,05  dur = spark[1]−spark[0]
 *   hum     t = spark[0]+0,3   dur = weave[1] − spark[0] − 0,3
 *   boil    t = spark[1]−0,2   dur = weave[1] − spark[1] + 0,2
 *   needle  t = weave[0]       dur = h·0,05   (busy = √(n/max), bin 50 ms)
 *   strike  per busur          dur = 0,35 · strength·(core?0,7:1,1) · pan = clamp((x−star.x)/(0,75·W), ±0,9)
 *   gather  t = weave[1]−2,2   dur = 2,2
 *   release t = ignite         dur = 6
 *   ignite  t = ignite+0,05    dur = 3
 *   fill    t = ignite+0,2     dur = 1,4
 */
import type { SoundCue } from './miraAudio'
import { IGNITE_CFG } from './miraTimeline'
import type { MatterArc, MatterParticle } from './miraMatter'

export function buildCueTracks({
  arcs,
  particles,
  star,
  width,
  cfg = IGNITE_CFG,
}: {
  arcs: Pick<MatterArc, 'kind' | 't' | 'strength' | 'x'>[]
  particles: Pick<MatterParticle, 'tArr'>[]
  star: { x: number; y: number }
  width: number
  cfg?: typeof IGNITE_CFG
}): SoundCue[] {
  // live: `r = g => clamp((g - tl.corner[0]) / (0,75 · n), ±0,9)`; corner = titik bintang, n = lebar citra
  const panOf = (x: number) => Math.max(-0.9, Math.min(0.9, (x - star.x) / (0.75 * width)))
  const out: SoundCue[] = []
  const a = cfg.weave[1]

  out.push({ kind: 'gather', t: cfg.spark[0] + 0.05, dur: cfg.spark[1] - cfg.spark[0] })
  out.push({ kind: 'hum', t: cfg.spark[0] + 0.3, dur: a - cfg.spark[0] - 0.3 })
  out.push({ kind: 'boil', t: cfg.spark[1] - 0.2, dur: a - cfg.spark[1] + 0.2 })

  const c = 0.05
  const h = Math.max(1, Math.round((a - cfg.weave[0]) / c))
  const p = new Array(h).fill(0)
  for (const g of particles) {
    const v = Math.floor((g.tArr - cfg.weave[0]) / c)
    if (v >= 0 && v < h) p[v]++
  }
  const m = Math.max(1, ...p)
  out.push({ kind: 'needle', t: cfg.weave[0], dur: h * c, step: c, busy: p.map((g) => Math.sqrt(g / m)) })

  for (const g of arcs) {
    out.push({ kind: 'strike', t: g.t, dur: 0.35, strength: g.strength * (g.kind === 'core' ? 0.7 : 1.1), pan: panOf(g.x) })
  }

  out.push({ kind: 'gather', t: a - 2.2, dur: 2.2 })
  const ignite = a + cfg.hush
  out.push({ kind: 'release', t: ignite, dur: 6 })
  out.push({ kind: 'ignite', t: ignite + 0.05, dur: 3 })
  out.push({ kind: 'fill', t: ignite + 0.2, dur: 1.4 })
  out.sort((g, v) => g.t - v.t)
  return out
}
