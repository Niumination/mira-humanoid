#!/usr/bin/env node
/**
 * fit-field.js — cari nilai uniform medan (latar nebula) yang paling cocok dengan live.
 *
 * Alasan: dengan figur dimatikan di KEDUA aplikasi (`off=pic,hair,lines,matter,arcs,waves`),
 * MAE latar kita vs live = 8,10 pada `?t=9,5` — lebih besar dari seluruh selisih gambar penuh (6,50).
 * Artinya sisa selisih terbesar BUKAN di figur, melainkan di medan latar.
 *
 * Cara: koordinat-turun (coordinate descent) pada knob `?fcx ?fcy ?frig ?fspread ?fnear ?fclr ?fk`
 * yang baru diekspos di MiraStage (F-140), dinilai dengan MAE latar-saja terhadap live.
 *
 * Pakai: node tools/fit-field.js [--t 9.5] [--json hasil.json] [--rounds 2]
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const ARG = process.argv.slice(2)
const getArg = (n, d) => (ARG.indexOf(n) >= 0 ? ARG[ARG.indexOf(n) + 1] : d)
const BUILD = getArg('--build', 'http://127.0.0.1:8804/')
const LIVE = getArg('--live', 'https://mira-humanoid.vercel.app/')
const T = getArg('--t', '9.5')
const ROUNDS = Number(getArg('--rounds', '2'))
const OUT = getArg('--json', '')
const SHOTS = '/tmp/fitfield'
const BG = 'pic,hair,lines,matter,arcs,waves' // figur mati, bloom tetap (sama di kedua app)

const ARGS = [
  '--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required', '--renderer-process-limit=1',
]

// kandidat per knob (koordinat-turun)
const SPACE = {
  fcy: [0.31, 0.40, 0.48, 0.55, 0.62, 0.69, 0.74],
  fcx: [0.46, 0.50, 0.54],
  frig: [0.08, 0.124, 0.16, 0.20],
  fspread: [0.3, 0.55, 0.85, 1.0],
  fnear: [0.0, 0.5, 1.0, 1.45, 2.0],
  fclr: [0, 1],
  fk: [0.75, 0.85, 0.95, 1.05],
}
const START = { fcx: 0.5009382963180542, fcy: 0.6912000179290771, frig: 0.12385807931423187, fspread: 0.85, fnear: 1.45, fclr: 0, fk: 1 }

const pyMAE = `
import sys, json
import numpy as np
from PIL import Image
A = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
B = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
print(json.dumps({'mae': float(np.abs(A-B).mean()), 'mA': float(A.mean()), 'mB': float(B.mean())}))
`
const mae = (a, b) => JSON.parse(execFileSync('python3', ['-c', pyMAE, a, b]).toString())

;(async () => {
  fs.mkdirSync(SHOTS, { recursive: true })
  const browser = await chromium.launch({ args: ARGS })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const shoot = async (url, tag) => {
    await page.goto(url, { waitUntil: 'load', timeout: 120000 })
    await page.waitForTimeout(3200)
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        const s = getComputedStyle(el)
        if (el.tagName === 'CANVAS' || el.tagName === 'IMG') continue
        if (s.position === 'fixed' || s.position === 'absolute') {
          if (el.querySelector('canvas')) continue
          el.style.visibility = 'hidden'
        }
      }
    })
    await page.waitForTimeout(200)
    const f = path.join(SHOTS, `${tag}.png`)
    await page.screenshot({ path: f })
    return f
  }
  const q = (o) => Object.keys(o).map((k) => `&${k}=${o[k]}`).join('')
  console.log(`→ acuan live (latar saja) @t=${T}`)
  const ref = await shoot(`${LIVE}?auto=1&t=${T}&off=${BG}`, `live-${T}`)
  let cur = { ...START }
  const score = async (o) => {
    const f = await shoot(`${BUILD}?auto=1&t=${T}&off=${BG}${q(o)}`, 'ours')
    return mae(f, ref).mae
  }
  let best = await score(cur)
  console.log(`awal: MAE latar ${best.toFixed(3)}\n`)
  const log = [{ round: 0, knobs: { ...cur }, mae: best }]
  for (let r = 1; r <= ROUNDS; r++) {
    for (const k of Object.keys(SPACE)) {
      const base = cur[k]
      let bk = base, bv = best
      for (const v of SPACE[k]) {
        if (v === base) continue
        const s = await score({ ...cur, [k]: v })
        process.stdout.write(`  [r${r}] ${k}=${v} → ${s.toFixed(3)}${s < bv ? ' *' : ''}\n`)
        if (s < bv - 0.02) { bv = s; bk = v }
      }
      if (bk !== base) { cur[k] = bk; best = bv; console.log(`  → ${k} = ${bk} (MAE ${best.toFixed(3)})`) }
    }
    log.push({ round: r, knobs: { ...cur }, mae: best })
  }
  // tulis ringkasan knob yang berubah saja
  const delta = {}
  for (const k of Object.keys(START)) if (cur[k] !== START[k]) delta[k] = cur[k]
  console.log(`\nMAE latar: ${log[0].mae.toFixed(3)} → ${best.toFixed(3)}`)
  console.log('knob berubah:', JSON.stringify(delta))
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), t: T, start: START, best: cur, delta, maeStart: log[0].mae, maeBest: best, log }, null, 1))
  await browser.close()
})()
