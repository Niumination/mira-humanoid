#!/usr/bin/env node
/**
 * gate-step4c.js — GERBANG D langkah 4 (bagian 3): AUDIO HIDUP DI APLIKASI.
 *
 * Membuka build lokal MIRA di Chromium (autoplay dilonggarkan, meniru pengunjung yang sudah
 * menekan ENTER) dan memeriksa bahwa mesin audio benar-benar berbunyi di dalam aplikasi —
 * bukan hanya lulus di tingkat modul:
 *
 *   1. `__MIRA_AUDIO()`: state `running`, `cues > 0`, `started`, `scoreLength ≈ 12,55 s`
 *   2. RMS bus master (dengan tuner `AnalyserNode` yang dipasang pada `destination` lewat init
 *      script) > 1e-4 selama skor adegan berbunyi
 *   3. SOUND OFF → RMS < 5 % nilai semula; SOUND ON → pulih
 *   4. klik panggung → bunyi bolt
 *
 * Pakai: node tools/gate-step4c.js [--json out.json]
 */
import { writeFileSync } from 'node:fs'

const PW = process.env.PW || '/tmp/pw/node_modules/playwright/index.js'
const pw = await import(PW)
const chromium = pw.chromium || pw.default?.chromium
const BASE = process.env.BASE || 'http://127.0.0.1:8802/'
const ARG = process.argv.slice(2)
const OUT = ARG.includes('--json') ? ARG[ARG.indexOf('--json') + 1] : null

const browser = await chromium.launch({
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.addInitScript(() => {
  const Orig = window.AudioContext
  window.__CTX = []
  window.AudioContext = function (...a) {
    const c = new Orig(...a)
    window.__CTX.push(c)
    return c
  }
  window.AudioContext.prototype = Orig.prototype

  // tap bus master: setiap connect ke destination juga disalin ke AnalyserNode
  const origConnect = AudioNode.prototype.connect
  AudioNode.prototype.connect = function (dst, ...rest) {
    if (dst && this.context && dst === this.context.destination) {
      const ctx = this.context
      if (!ctx.__tap) {
        const an = ctx.createAnalyser()
        an.fftSize = 2048
        origConnect.call(this, an)
        ctx.__tap = an
        ctx.__tapBuf = new Float32Array(an.fftSize)
      }
    }
    return origConnect.call(this, dst, ...rest)
  }
  window.__rms = () => {
    const ctx = window.__CTX && window.__CTX[0]
    if (!ctx || !ctx.__tap) return -1
    ctx.__tap.getFloatTimeDomainData(ctx.__tapBuf)
    let s = 0
    for (let i = 0; i < ctx.__tapBuf.length; i++) s += ctx.__tapBuf[i] * ctx.__tapBuf[i]
    return Math.sqrt(s / ctx.__tapBuf.length)
  }
})

const rows = []
const check = (name, ok, detail) => {
  rows.push({ name, ok, detail })
  console.log(`${ok ? 'LULUS ' : 'GAGAL '} ${name}${detail ? ` — ${detail}` : ''}`)
}
const series = async (n, gap = 200) => {
  const out = []
  for (let i = 0; i < n; i++) {
    out.push(await page.evaluate(() => window.__rms()))
    await page.waitForTimeout(gap)
  }
  return out
}

await page.goto(`${BASE}?auto=1`, { waitUntil: 'load' })
await page.waitForFunction(() => document.querySelectorAll('canvas').length >= 2, { timeout: 30000 })
await page.waitForFunction(() => typeof window.__MIRA_AUDIO === 'function', { timeout: 30000 })
await page.waitForTimeout(5000)

const info = await page.evaluate(() => window.__MIRA_AUDIO())
check('mesin audio hidup', info.state === 'running', `state ${info.state}`)
check('skor cue terbangun', info.cues > 0, `${info.cues} cue`)
check('skor dijalankan', info.started === true, `started ${info.started}`)
check('panjang skor ≈ 12,55 s', Math.abs(info.scoreLength - 12.55) < 0.3, `${info.scoreLength.toFixed(3)} s`)

const on = await series(10)
const rmsOn = Math.max(...on)
check('keluaran berbunyi (RMS bus master)', rmsOn > 1e-4, `RMS maks ${rmsOn.toExponential(2)}`)

await page.click('[data-testid="mira-humanoid-sound"]')
await page.waitForTimeout(600)
const off = await series(8)
const rmsOff = Math.max(...off)
check('SOUND OFF membungkam master', rmsOff < rmsOn * 0.05, `RMS ${rmsOff.toExponential(2)} vs ${rmsOn.toExponential(2)}`)

await page.click('[data-testid="mira-humanoid-sound"]')
await page.waitForTimeout(900)
const again = await series(8)
const rmsAgain = Math.max(...again)
check('SOUND ON menyalakan lagi', rmsAgain > rmsOn * 0.2, `RMS ${rmsAgain.toExponential(2)}`)

await page.mouse.click(700, 420)
await page.waitForTimeout(120)
const boltRms = await page.evaluate(() => window.__rms())
check('klik panggung memicu bolt', boltRms > 0, `RMS ${boltRms.toExponential(2)}`)

check('tanpa error halaman', errors.length === 0, errors.slice(0, 2).join(' | '))

const pass = rows.filter((r) => r.ok).length
console.log('─'.repeat(70))
console.log(`SKOR: ${pass}/${rows.length}`)
if (OUT) {
  writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), base: BASE, score: `${pass}/${rows.length}`, info, rmsOn, rmsOff, rmsAgain, boltRms, rows }, null, 2))
  console.log(`→ ${OUT}`)
}
await browser.close()
process.exit(pass === rows.length ? 0 : 1)
