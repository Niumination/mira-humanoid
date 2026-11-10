#!/usr/bin/env node
/**
 * gate-step4.js — GERBANG D langkah 4 (bagian 1): PARITAS PEMANGGILAN AUDIO.
 *
 * Menjalankan kode audio LIVE (`verification/mira/audio-live.mjs`, verbatim dari bundle) dan
 * port kita (`verification/mira/audio-ours.mjs`, hasil `esbuild src/lib/miraAudio.ts`) di atas
 * `AudioContext` tiruan yang mencatat setiap node/AudioParam, lalu membandingkan SIDIK JARI
 * keduanya skenario per skenario.
 *
 * Lulus bila untuk SEMUA skenario: jenis+jumlah node sama, jumlah sambungan sama, jumlah
 * start/stop sama, dan multiset (nama param · metode · nilai) sama persis — yaitu tidak ada
 * konstanta yang salah, tidak ada send reverb yang tertukar, tidak ada jadwal yang bergeser.
 *
 * Pakai:  node tools/gate-step4.js [--json out.json] [-v]
 */
import { writeFileSync } from 'node:fs'
import { installMock } from './audio-mock.mjs'

const ARG = process.argv.slice(2)
const OUT = ARG.includes('--json') ? ARG[ARG.indexOf('--json') + 1] : null
const VERBOSE = ARG.includes('-v')

const mock = installMock()
const { default: _l } = { default: null }
const LIVE = await import('/home/user/Kerja-Arena/verification/mira/audio-live.mjs')
const OURS = {
  ...(await import('/home/user/Kerja-Arena/verification/mira/audio-ours.mjs')),
  ...(await import('/home/user/Kerja-Arena/verification/mira/audio-ours-cues.mjs')),
}

// cue adegan contoh — dipakai untuk setiap jenis cue supaya kedua sisi menerima input identik
const CUES = {
  hum: { kind: 'hum', t: 0.3, dur: 5.7 },
  strike: { kind: 'strike', t: 1.2, dur: 0.35, strength: 0.77, pan: -0.53 },
  strikeBig: { kind: 'strike', t: 2.0, dur: 0.35, strength: 1.1, pan: 0.53 },
  gather: { kind: 'gather', t: 3.8, dur: 2.2 },
  boil: { kind: 'boil', t: 0.7, dur: 5.3 },
  needle: { kind: 'needle', t: 0.9, dur: 5.1, step: 0.05, busy: Array.from({ length: 102 }, (_, i) => Math.sqrt((i % 7) / 7)) },
  release: { kind: 'release', t: 6.55, dur: 6 },
  fill: { kind: 'fill', t: 6.75, dur: 1.4 },
  ignite: { kind: 'ignite', t: 6.6, dur: 3 },
}

const TRACK = [
  CUES.gather, CUES.hum, CUES.boil, CUES.needle,
  { ...CUES.strike }, { ...CUES.strikeBig }, { ...CUES.gather, t: 3.8 },
  CUES.release, CUES.ignite, CUES.fill,
]

/** tiga himpunan data adegan sintetis untuk membandingkan pembangun skor (`Vk`) */
const SCENES = [
  {
    name: 'adegan kecil (2 busur, 5 titik)',
    arcs: [{ kind: 'core', t: 1.2, strength: 0.7, x: 100 }, { kind: 'crown', t: 2.0, strength: 1.0, x: 900 }],
    particles: [{ tArr: 1.0 }, { tArr: 1.05 }, { tArr: 3.3 }, { tArr: 5.9 }, { tArr: 0.95 }],
    width: 1000,
    star: { x: 500, y: 400 },
  },
  {
    name: 'adegan sedang (12 busur, 400 titik)',
    arcs: Array.from({ length: 12 }, (_, i) => ({ kind: i % 2 ? 'crown' : 'core', t: 1 + i * 0.4, strength: 0.5 + (i % 5) * 0.2, x: 80 + i * 70 })),
    particles: Array.from({ length: 400 }, (_, i) => ({ tArr: 0.9 + (i / 400) * 5.1 })),
    width: 1146,
    star: { x: 573, y: 512 },
  },
  {
    name: 'adegan besar (28 busur, 3000 titik)',
    arcs: Array.from({ length: 28 }, (_, i) => ({ kind: i < 18 ? 'core' : 'crown', t: 1.5 + i * 0.17, strength: 0.55 + (i % 7) * 0.09, x: 40 + i * 40 })),
    particles: Array.from({ length: 3000 }, (_, i) => ({ tArr: 0.9 + ((i * 7919) % 5100) / 1000 })),
    width: 1146,
    star: { x: 573, y: 512 },
  },
]

/** skenario: [nama, jalankan live, jalankan kita] */
const SCEN = [
  ['graph (rh/ensureAudio)', () => LIVE.rh(), () => OURS.ensureAudio()],
  ['synth buffer (mo/syn)', () => LIVE.mo(), () => OURS.syn()],
  ['cue hum', () => LIVE.qw.hum(CUES.hum, 0.03, 0), () => OURS.CUE_KINDS.hum(CUES.hum, 0.03, 0)],
  ['cue strike', () => LIVE.qw.strike(CUES.strike, 0.03, 0), () => OURS.CUE_KINDS.strike(CUES.strike, 0.03, 0)],
  ['cue strike>1.05 (thunder)', () => LIVE.qw.strike(CUES.strikeBig, 0.03, 0), () => OURS.CUE_KINDS.strike(CUES.strikeBig, 0.03, 0)],
  ['cue gather', () => LIVE.qw.gather(CUES.gather, 0.03, 0), () => OURS.CUE_KINDS.gather(CUES.gather, 0.03, 0)],
  ['cue boil', () => LIVE.qw.boil(CUES.boil, 0.03, 0), () => OURS.CUE_KINDS.boil(CUES.boil, 0.03, 0)],
  ['cue needle', () => LIVE.qw.needle(CUES.needle, 0.03, 0), () => OURS.CUE_KINDS.needle(CUES.needle, 0.03, 0)],
  ['cue release', () => LIVE.qw.release(CUES.release, 0.03, 0), () => OURS.CUE_KINDS.release(CUES.release, 0.03, 0)],
  ['cue fill', () => LIVE.qw.fill(CUES.fill, 0.03, 0), () => OURS.CUE_KINDS.fill(CUES.fill, 0.03, 0)],
  ['cue ignite', () => LIVE.qw.ignite(CUES.ignite, 0.03, 0), () => OURS.CUE_KINDS.ignite(CUES.ignite, 0.03, 0)],
  ['skor penuh (FN/playCues)', () => LIVE.FN(TRACK, 0), () => OURS.playCues(TRACK, 0)],
  ['bolt (kN)', () => LIVE.kN({ pan: 0.4 }), () => OURS.bolt({ pan: 0.4 })],
  ['fmBlip default (oc)', () => LIVE.oc({}), () => OURS.fmBlip({})],
  ['thump default (_o)', () => LIVE._o({}), () => OURS.thump({})],
  ['noiseSweep default (U_)', () => LIVE.U_({}), () => OURS.noiseSweep({})],
  ['voice A Tripod (Vw/EN[0])', () => LIVE.EN[0].play(3.2, 0), () => OURS.VOICES[0].play(3.2, 0)],
  ['voice B Leviathan (Vw/EN[1])', () => LIVE.EN[1].play(3.2, 0), () => OURS.VOICES[1].play(3.2, 0)],
  ['voice shimmer', () => LIVE.Vw({ shimmer: true }), () => OURS.voice({ shimmer: true })],
  ['cue alert (wN)', () => LIVE.wN(), () => OURS.cue('alert')],
  ['cue loading (_N)', () => LIVE._N(0.34, 0.009), () => OURS.cue('loading')],
  ['cue ready (RN)', () => LIVE.RN(), () => OURS.cue('ready')],
  ['cue needsYou (CN)', () => LIVE.CN(), () => OURS.cue('needsYou')],
  ['cue failed (MN)', () => LIVE.MN(), () => OURS.cue('failed')],
  ['cue miraEnter (PN)', () => LIVE.PN(), () => OURS.cue('miraEnter')],
  ['cue miraExit (IN)', () => LIVE.IN(), () => OURS.cue('miraExit')],
  ['call riser (bN)', () => LIVE.bN(0), () => OURS.callRiser(0)],
  ['assembly (DN)', () => LIVE.DN(), () => OURS.assembly()],
]

// skor cue (`Vk`): bandingkan DAFTAR cue yang dihasilkan, bukan pemanggilan audio
const VK_ROWS = []

function run(fn) {
  mock.reset()
  try {
    fn()
  } catch (e) {
    return { error: String(e && e.message ? e.message : e) }
  }
  return mock.fingerprint()
}

function diff(a, b) {
  const out = []
  const kinds = new Set([...Object.keys(a.nodes || {}), ...Object.keys(b.nodes || {})])
  for (const k of kinds) {
    const x = (a.nodes || {})[k] || 0
    const y = (b.nodes || {})[k] || 0
    if (x !== y) out.push(`node ${k}: live ${x} vs kita ${y}`)
  }
  if (a.connects !== b.connects) out.push(`sambungan: live ${a.connects} vs kita ${b.connects}`)
  if (a.src !== b.src) out.push(`start/stop: live ${a.src} vs kita ${b.src}`)
  const keys = new Set([...Object.keys(a.params || {}), ...Object.keys(b.params || {})])
  const paramDiff = []
  for (const k of keys) {
    const x = (a.params || {})[k] || 0
    const y = (b.params || {})[k] || 0
    if (x !== y) paramDiff.push(`${k}: live ${x} vs kita ${y}`)
  }
  if (paramDiff.length) out.push(`param beda ${paramDiff.length}: ${paramDiff.slice(0, 6).join(' · ')}`)
  if (JSON.stringify(a.buffers) !== JSON.stringify(b.buffers)) out.push(`buffer beda: live ${a.buffers.join(',')} vs kita ${b.buffers.join(',')}`)
  return out
}

const rows = []
for (const [name, liveFn, ourFn] of SCEN) {
  const a = run(liveFn)
  const b = run(ourFn)
  if (a.error || b.error) {
    rows.push({ name, ok: false, problems: [a.error ? `live: ${a.error}` : null, b.error ? `kita: ${b.error}` : null].filter(Boolean) })
    continue
  }
  const problems = diff(a, b)
  rows.push({
    name,
    ok: problems.length === 0,
    problems,
    live: { nodes: a.nodes, connects: a.connects, src: a.src, paramCount: a.paramCount },
    ours: { nodes: b.nodes, connects: b.connects, src: b.src, paramCount: b.paramCount },
  })
}

// ── paritas pembangun skor (`Vk`) ────────────────────────────────────────────────
const vkRows = SCENES.map((sc) => {
  const tl = { spark: [0, 0.9], weave: [0.9, 6], ignite: 6.55, corner: [sc.star.x, sc.star.y] }
  const a = LIVE.Vk({ arcs: sc.arcs, particles: sc.particles, tl }, sc.width)
  const b = OURS.buildCueTracks({ arcs: sc.arcs, particles: sc.particles, star: sc.star, width: sc.width })
  const norm = (list) =>
    list.map((c) =>
      [c.kind, +c.t.toFixed(6), +c.dur.toFixed(6), c.strength === undefined ? '' : +c.strength.toFixed(6), c.pan === undefined ? '' : +c.pan.toFixed(6), c.step === undefined ? '' : c.step, c.busy ? c.busy.length : ''].join('/')
    )
  const A = norm(a)
  const B = norm(b)
  const same = A.length === B.length && A.every((x, i) => x === B[i])
  const lenA = LIVE.Gk(a)
  const lenB = OURS.cuesLength(b)
  return {
    name: `skor adegan: ${sc.name}`,
    ok: same && Math.abs(lenA - lenB) < 1e-9,
    problems: same ? [] : [`cues beda: live ${A.length} vs kita ${B.length}`].concat(A.filter((x, i) => x !== B[i]).slice(0, 3).map((x, i) => `live ${x} ≠ kita ${B[i]}`)),
    detail: `${A.length} cue · panjang ${lenA.toFixed(3)} s`,
  }
})
for (const r of vkRows) {
  rows.push(r)
  console.log(`${r.ok ? 'LULUS ' : 'GAGAL '} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
  if (!r.ok) r.problems.forEach((p) => console.log(`        ↳ ${p}`))
}
void VK_ROWS

const pass = rows.filter((r) => r.ok).length
console.log('GERBANG D · langkah 4 · paritas pemanggilan audio (mock AudioContext)')
console.log('─'.repeat(78))
for (const r of rows) {
  console.log(`${r.ok ? 'LULUS ' : 'GAGAL '} ${r.name}`)
  if (!r.ok) r.problems.forEach((p) => console.log(`        ↳ ${p}`))
  else if (VERBOSE) {
    const n = Object.entries(r.live.nodes).map(([k, v]) => `${k}:${v}`).join(' ')
    console.log(`        nodes ${n} · sambungan ${r.live.connects} · start/stop ${r.live.src} · param ${r.live.paramCount}`)
  }
}
console.log('─'.repeat(78))
console.log(`SKOR: ${pass}/${rows.length}`)

const totals = rows.reduce((acc, r) => {
  if (!r.live) return acc
  for (const [k, v] of Object.entries(r.live.nodes)) acc.nodes[k] = (acc.nodes[k] || 0) + v
  acc.connects += r.live.connects
  acc.src += r.live.src
  acc.paramCount += r.live.paramCount
  return acc
}, { nodes: {}, connects: 0, src: 0, paramCount: 0 })
console.log(`total live: ${Object.entries(totals.nodes).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
console.log(`            sambungan ${totals.connects} · start/stop ${totals.src} · penjadwalan param ${totals.paramCount}`)

if (OUT) {
  writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), score: `${pass}/${rows.length}`, totals, rows }, null, 2))
  console.log(`→ ${OUT}`)
}
process.exit(pass === rows.length ? 0 : 1)
