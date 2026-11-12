#!/usr/bin/env node
/**
 * sweep-torso.js — GERBANG C sisa: torso (+4,1 satuan pada t=9,5).
 *
 * Kami sudah tahu rerata torso kita lebih terang, TETAPI MAE-nya 9,9 — artinya bukan sekadar
 * "terlalu terang": live punya detail halus (kilau/partikel) yang kita tidak punya. Skrip ini
 * menilai tiga hal sekaligus di dalam crop torso:
 *   1. MAE crop   — selisih per piksel
 *   2. Δ rerata   — terang
 *   3. energi frekuensi tinggi (rerata |Laplacian|) — banyak/sedikitnya detail
 *
 * Pakai: node tools/sweep-torso.js --knobs "nm=0,1" [--knobs "bt=0.6,0.4"] --t 9.5 [--fixed "a=1"]
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
const OUT = getArg('--json', '')
const SHOTS = '/tmp/sweeptorso'
// semua spesifikasi --knobs (boleh diulang)
const SPECS = ARG.map((a, i) => (a === '--knobs' ? ARG[i + 1] : null)).filter(Boolean)

const ARGS = [
  '--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required', '--renderer-process-limit=1',
]
const py = `
import sys, json
import numpy as np
from PIL import Image
A = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float).mean(axis=2)
B = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float).mean(axis=2)
H, W = A.shape
y0,y1,x0,x1 = int(H*0.37), int(H*0.88), int(W*0.30), int(W*0.70)   # crop torso
def hf(a):
    l = a[y0:y1, x0:x1]
    lap = np.abs(4*l[1:-1,1:-1] - l[:-2,1:-1] - l[2:,1:-1] - l[1:-1,:-2] - l[1:-1,2:])
    return float(lap.mean())
def mean(a): return float(a[y0:y1, x0:x1].mean())
d = A - B
print(json.dumps({
  'mae': float(np.abs(d).mean()),
  'maeTorso': float(np.abs(d[y0:y1, x0:x1]).mean()),
  'dTorso': float(d[y0:y1, x0:x1].mean()),
  'meanA': float(A.mean()), 'meanB': float(B.mean()),
  'hfA': hf(A), 'hfB': hf(B), 'torsoA': mean(A), 'torsoB': mean(B)}))
`
const analyze = (a, b) => JSON.parse(execFileSync('python3', ['-c', py, a, b]).toString())

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
  const ref = await shoot(`${LIVE}?auto=1&t=${T}`, `live-${T}`)
  const r0 = analyze(ref, ref)
  console.log(`LIVE: torso ${r0.torsoB.toFixed(2)} · detail(HF) ${r0.hfB.toFixed(2)}`)
  const out = { when: new Date().toISOString(), t: Number(T), live: { torso: r0.torsoB, hf: r0.hfB }, runs: [] }
  for (const spec of SPECS) {
    const [knob, vals] = spec.split('=')
    for (const v of vals.split(',')) {
      const f = await shoot(`${BUILD}?auto=1&t=${T}&${knob}=${v}`, `ours-${knob}-${v}`)
      const r = analyze(f, ref)
      out.runs.push({ knob, v: Number(v), ...r })
      console.log(`${knob}=${v}: MAE ${r.mae.toFixed(3)} · torso MAE ${r.maeTorso.toFixed(2)} · Δtorso ${r.dTorso.toFixed(2)} · detail kita ${r.hfA.toFixed(2)} vs live ${r.hfB.toFixed(2)}`)
    }
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
  await browser.close()
})()
