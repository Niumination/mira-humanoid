#!/usr/bin/env node
/**
 * gate-step4b.js — GERBANG D langkah 4 (bagian 2): PARITAS SPEKTRUM.
 *
 * Untuk setiap skenario, kode audio LIVE dan port kita dirender di `OfflineAudioContext`
 * sungguhan (Chromium, 44,1 kHz, 2 kanal) dengan PRNG ber-seed sama, lalu keluaran sampelnya
 * dibandingkan:
 *
 *   RMS total · puncak · MAE sampel (relatif puncak) · galat maksimum
 *   16 pita spektrum (FFT 8192, jendela Hann, rata-rata) → korelasi Pearson + MAE pita
 *
 * Lulus bila MAE ≤ 1 % puncak, galat maks ≤ 3 % puncak, dan korelasi pita ≥ 0,999.
 * Karena kedua sisi memakai urutan `Math.random` yang sama, paritas yang benar menghasilkan
 * selisih ~0 (bukan "mirip").
 *
 * Pakai: node tools/gate-step4b.js [--json out.json] [-v]
 * Prasyarat: `bash tools/siapkan-alat.sh` (playwright di /tmp/pw) dan server statis di $PORT.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { writeFileSync } from 'node:fs'

const PW = process.env.PW || '/tmp/pw/node_modules/playwright/index.js'
const pw = await import(PW)
const chromium = pw.chromium || pw.default?.chromium
const ROOT = '/home/user/Kerja-Arena/verification/mira'
const PORT = Number(process.env.PORT || 8811)
const ARG = process.argv.slice(2)
const OUT = ARG.includes('--json') ? ARG[ARG.indexOf('--json') + 1] : null
const VERBOSE = ARG.includes('-v')

const TYPES = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' }
const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent((req.url || '/').split('?')[0]))
    const body = await readFile(p)
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('no')
  }
})
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))

const SCEN = [
  // [nama, durasi render (s), ekspresi-live, ekspresi-kita]
  ['graph idle (rh)', 0.5, 'L.rh()', 'O.ensureAudio()'],
  ['synth buffer (mo)', 0.5, '(L.rh(), L.mo())', '(O.ensureAudio(), O.syn())'],
  ['cue hum', 7, 'L.qw.hum(C.hum,0.03,0)', 'O.CUE_KINDS.hum(C.hum,0.03,0)'],
  ['cue gather', 8, 'L.qw.gather(C.gather,0.03,0)', 'O.CUE_KINDS.gather(C.gather,0.03,0)'],
  ['cue boil', 7, 'L.qw.boil(C.boil,0.03,0)', 'O.CUE_KINDS.boil(C.boil,0.03,0)'],
  ['cue needle', 7, 'L.qw.needle(C.needle,0.03,0)', 'O.CUE_KINDS.needle(C.needle,0.03,0)'],
  ['cue strike', 2, 'L.qw.strike(C.strike,0.03,0)', 'O.CUE_KINDS.strike(C.strike,0.03,0)'],
  ['cue strike besar (thunder)', 3, 'L.qw.strike(C.strikeBig,0.03,0)', 'O.CUE_KINDS.strike(C.strikeBig,0.03,0)'],
  ['cue release', 13, 'L.qw.release(C.release,0.03,0)', 'O.CUE_KINDS.release(C.release,0.03,0)'],
  ['cue ignite', 10, 'L.qw.ignite(C.ignite,0.03,0)', 'O.CUE_KINDS.ignite(C.ignite,0.03,0)'],
  ['cue fill', 9, 'L.qw.fill(C.fill,0.03,0)', 'O.CUE_KINDS.fill(C.fill,0.03,0)'],
  ['skor penuh (FN)', 14, 'L.FN(T,0)', 'O.playCues(T,0)'],
  ['skor penuh dari t=2,5 s', 12, 'L.FN(T,2.5)', 'O.playCues(T,2.5)'],
  ['bolt (kN)', 2, 'L.kN({pan:0.4})', 'O.bolt({pan:0.4})'],
  ['fmBlip default (oc)', 1, 'L.oc({})', 'O.fmBlip({})'],
  ['thump default (_o)', 1, 'L._o({})', 'O.thump({})'],
  ['noiseSweep default (U_)', 1, 'L.U_({})', 'O.noiseSweep({})'],
  ['voice A Tripod', 4, 'L.EN[0].play(3.2,0)', 'O.VOICES[0].play(3.2,0)'],
  ['voice B Leviathan', 4, 'L.EN[1].play(3.2,0)', 'O.VOICES[1].play(3.2,0)'],
  ['cue alert (wN)', 1.5, 'L.wN()', "O.cue('alert')"],
  ['cue ready (RN)', 2, 'L.RN()', "O.cue('ready')"],
  ['cue needsYou (CN)', 1.5, 'L.CN()', "O.cue('needsYou')"],
  ['cue failed (MN)', 2, 'L.MN()', "O.cue('failed')"],
  ['cue miraEnter (PN)', 3, 'L.PN()', "O.cue('miraEnter')"],
  ['cue miraExit (IN)', 2.5, 'L.IN()', "O.cue('miraExit')"],
  ['call riser (bN)', 9, 'L.bN(0)', 'O.callRiser(0)'],
  ['assembly (DN)', 12, 'L.DN()', 'O.assembly()'],
]

const CUE_DEFS = `
  hum: { kind:'hum', t:0.3, dur:5.7 },
  strike: { kind:'strike', t:1.2, dur:0.35, strength:0.77, pan:-0.53 },
  strikeBig: { kind:'strike', t:2.0, dur:0.35, strength:1.1, pan:0.53 },
  gather: { kind:'gather', t:3.8, dur:2.2 },
  boil: { kind:'boil', t:0.7, dur:5.3 },
  needle: { kind:'needle', t:0.9, dur:5.1, step:0.05, busy:Array.from({length:102},(_, i)=>Math.sqrt((i%7)/7)) },
  release: { kind:'release', t:6.55, dur:6 },
  fill: { kind:'fill', t:6.75, dur:1.4 },
  ignite: { kind:'ignite', t:6.6, dur:3 },
`

const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const SCEN_FILTERED = ONLY.length ? SCEN.filter(([n]) => ONLY.some((o) => n.includes(o))) : SCEN

const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('pageerror:', e.message))
await page.goto(`http://127.0.0.1:${PORT}/audio-live.mjs`)
await page.setContent('<html><body>gate-step4b</body></html>')

const rows = []
let v = 0
for (const [name, dur, liveExpr, ourExpr] of SCEN_FILTERED) {
  const res = await page.evaluate(
    async ({ name, dur, liveExpr, ourExpr, seed, nonce, cueDefs }) => {
      const mulberry32 = (s) => {
        let e = s | 0
        return () => {
          e = (e + 1831565813) | 0
          let t = Math.imul(e ^ (e >>> 15), 1 | e)
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
      }
      const SR = 22050
      const render = async (url, expr) => {
        const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR)
        window.AudioContext = function () { return ctx }
        // `FN`/`playCues` (live) menambahkan latensi wall-clock `(performance.now()-t)/1e3` ke `at`.
        // Itu membuat hasil bergantung pada kecepatan mesin, jadi jamnya dibekukan: kedua sisi adil.
        const fixedNow = 1000
        performance.now = () => fixedNow
        window.webkitAudioContext = window.AudioContext
        Math.random = mulberry32(seed)
        const mod = await import(`${url}?gate=${nonce}`)
        const C = eval(`({${cueDefs}})`)
        const T = [C.gather, C.hum, C.boil, C.needle, C.strike, C.strikeBig, { ...C.gather, t: 3.8 }, C.release, C.ignite, C.fill]
        const L = mod
        const O = mod
        // eslint-disable-next-line no-unused-vars
        // graph selalu dibangun dulu (live: `rh()`, kita: `ensureAudio()`) — sama seperti di app,
        // karena cue memakai `mo()/fp` yang butuh konteks.
        if (typeof mod.rh === 'function') mod.rh()
        if (typeof mod.ensureAudio === 'function') mod.ensureAudio()
        const run = new Function('L', 'O', 'C', 'T', `return (${expr})`)
        run(mod, mod, C, T)
        const buf = await ctx.startRendering()
        return [buf.getChannelData(0), buf.getChannelData(1)]
      }
      const L = await render('/audio-live.mjs', liveExpr)
      const O = await render('/audio-ours.mjs', ourExpr)
      const stats = (chs) => {
        let peak = 0
        let sum = 0
        let n = 0
        for (const ch of chs) for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > peak) peak = a; sum += ch[i] * ch[i]; n++ }
        return { peak, rms: Math.sqrt(sum / n) }
      }
      const sL = stats(L)
      const sO = stats(O)
      let maxAbs = 0
      let sumAbs = 0
      let cnt = 0
      for (let c = 0; c < 2; c++) {
        const a = L[c]
        const b = O[c]
        for (let i = 0; i < a.length; i++) {
          const d = Math.abs(a[i] - b[i])
          if (d > maxAbs) maxAbs = d
          sumAbs += d
          cnt++
        }
      }
      // spektrum: FFT 8192 jendela Hann, rata-rata 16 pita log
      const fft = (re, im) => {
        const n = re.length
        for (let i = 1, j = 0; i < n; i++) {
          let bit = n >> 1
          for (; j & bit; bit >>= 1) j ^= bit
          j ^= bit
          if (i < j) { [re[i], re[j]] = [re[j], re[i]];[im[i], im[j]] = [im[j], im[i]] }
        }
        for (let len = 2; len <= n; len <<= 1) {
          const ang = (-2 * Math.PI) / len
          for (let i = 0; i < n; i += len) {
            for (let k = 0; k < len / 2; k++) {
              const wr = Math.cos(ang * k)
              const wi = Math.sin(ang * k)
              const ur = re[i + k]
              const ui = im[i + k]
              const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi
              const vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr
              re[i + k] = ur + vr; im[i + k] = ui + vi
              re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi
            }
          }
        }
      }
      const N = 8192
      const bands = (chs) => {
        const out = new Float64Array(16)
        let frames = 0
        for (let c = 0; c < 2; c++) {
          const ch = chs[c]
          for (let off = 0; off + N < ch.length; off += N) {
            const re = new Float64Array(N)
            const im = new Float64Array(N)
            for (let i = 0; i < N; i++) re[i] = ch[off + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)))
            fft(re, im)
            for (let i = 1; i < N / 2; i++) {
              const m = Math.hypot(re[i], im[i])
              const f = (i * SR) / N
              const b = Math.min(15, Math.max(0, Math.floor((Math.log2(Math.max(f, 30) / 30) / Math.log2(16000 / 30)) * 16)))
              out[b] += m
            }
            frames++
          }
        }
        const norm = frames * 2 || 1
        const arr = Array.from(out, (x) => x / norm)
        const mx = Math.max(...arr) || 1
        return arr.map((x) => x / mx)
      }
      const bL = bands(L)
      const bO = bands(O)
      let mu = 0
      let nu = 0
      for (let i = 0; i < 16; i++) { mu += bL[i]; nu += bO[i] }
      mu /= 16; nu /= 16
      let cnum = 0; let dv1 = 0; let dv2 = 0; let bmae = 0
      for (let i = 0; i < 16; i++) {
        cnum += (bL[i] - mu) * (bO[i] - nu)
        dv1 += (bL[i] - mu) ** 2
        dv2 += (bO[i] - nu) ** 2
        bmae += Math.abs(bL[i] - bO[i])
      }
      return {
        name,
        rmsLive: sL.rms, rmsOurs: sO.rms, peakLive: sL.peak, peakOurs: sO.peak,
        mae: sumAbs / cnt, maxAbs,
        corr: dv1 > 0 && dv2 > 0 ? cnum / Math.sqrt(dv1 * dv2) : 1,
        bandMae: bmae / 16,
        bandsLive: bL.map((x) => +x.toFixed(4)),
        bandsOurs: bO.map((x) => +x.toFixed(4)),
      }
    },
    { name, dur, liveExpr, ourExpr, seed: 0x5eed + v, nonce: ++v, cueDefs: CUE_DEFS }
  )
  const ref = Math.max(res.peakLive, 1e-9)
  const maeRel = res.mae / ref
  const maxRel = res.maxAbs / ref
  const ok = maeRel <= 0.01 && maxRel <= 0.03 && res.corr >= 0.999
  rows.push({ ...res, maeRel, maxRel, ok })
  console.log(
    `${ok ? 'LULUS ' : 'GAGAL '} ${name.padEnd(28)} rms ${res.rmsLive.toFixed(5)}/${res.rmsOurs.toFixed(5)} · ` +
      `MAE ${(maeRel * 100).toFixed(4)} % · max ${(maxRel * 100).toFixed(3)} % · korelasi pita ${res.corr.toFixed(6)}`
  )
  if (!ok || VERBOSE) {
    console.log(`        puncak ${res.peakLive.toFixed(4)}/${res.peakOurs.toFixed(4)} · pita live ${res.bandsLive.join(',')}`)
    console.log(`                                          pita kita ${res.bandsOurs.join(',')}`)
  }
}

const pass = rows.filter((r) => r.ok).length
console.log('─'.repeat(96))
console.log(`SKOR: ${pass}/${rows.length}`)
console.log(
  `rata-rata MAE ${((rows.reduce((a, r) => a + r.maeRel, 0) / rows.length) * 100).toFixed(4)} % puncak · ` +
    `rata-rata korelasi pita ${(rows.reduce((a, r) => a + r.corr, 0) / rows.length).toFixed(6)}`
)
if (OUT) {
  writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), score: `${pass}/${rows.length}`, rows }, null, 2))
  console.log(`→ ${OUT}`)
}

await browser.close()
server.close()
process.exit(pass === rows.length ? 0 : 1)
