#!/usr/bin/env node
/**
 * sweep-matte.js — kalibrasi penutup badan (F-142) terhadap live.
 *
 * Latar: di live badan/kepala adalah mesh 3D gelap yang MENUTUPI latar; di build kita penutupnya
 * kuad citra (`fill`) dengan alfa tekstur. Skrip ini menyapu `?mk=` (kekuatan penutup) dan `?mc=`
 * (kelabu penutup) lalu menilai: MAE seluruh bingkai + selisih rerata per wilayah (torso/lengan/kepala)
 * terhadap live pada `?t=` yang sama.
 *
 * Pakai: node tools/sweep-matte.js [--t 9.5] [--json out.json]
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
const OUT = getArg('--json', '/home/user/Kerja-Arena/verification/mira/gate-c-matte-sweep.json')
const SHOTS = '/tmp/sweepmatte'

// kandidat: [mk, mc]
const GRID = [
  [1, 0], // bawaan (penutup lama)
  [0.6, 0],
  [0.8, 0],
  [1, 0.02],
  [1, 0.05],
  [1, 0.1],
  [0.8, 0.05],
]
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
reg = {'kepala': (slice(0,int(H*0.42)), slice(int(W*0.40),int(W*0.60))),
       'torso':  (slice(int(H*0.42),int(H*0.85)), slice(int(W*0.36),int(W*0.61))),
       'lengan': (slice(int(H*0.42),int(H*0.85)), slice(int(W*0.26),int(W*0.36))),
       'latar':  (slice(0,int(H*0.35)), slice(0,int(W*0.25)))}
d = A - B
print(json.dumps({'mae': float(np.abs(d).mean()), 'meanA': float(A.mean()), 'meanB': float(B.mean()),
  'w': {k: float(d[v].mean()) for k, v in reg.items()}}))
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
  const rows = []
  for (const [mk, mc] of GRID) {
    const f = await shoot(`${BUILD}?auto=1&t=${T}&mk=${mk}&mc=${mc}`, `ours-${mk}-${mc}`)
    const r = analyze(f, ref)
    rows.push({ mk, mc, ...r })
    console.log(`mk=${mk} mc=${mc}: MAE ${r.mae.toFixed(3)} · rerata ${r.meanA.toFixed(2)} vs ${r.meanB.toFixed(2)} · Δ kepala ${r.w.kepala.toFixed(2)} torso ${r.w.torso.toFixed(2)} lengan ${r.w.lengan.toFixed(2)} latar ${r.w.latar.toFixed(2)}`)
  }
  // ablasi penutup saja (kuad warna tetap mati)
  for (const off of ['fill', 'pic']) {
    const f = await shoot(`${BUILD}?auto=1&t=${T}&off=${off}`, `ours-off-${off}`)
    const r = analyze(f, ref)
    rows.push({ off, ...r })
    console.log(`off=${off}: MAE ${r.mae.toFixed(3)} · rerata ${r.meanA.toFixed(2)} · Δ torso ${r.w.torso.toFixed(2)}`)
  }
  const lf = await shoot(`${LIVE}?auto=1&t=${T}&off=pic`, `live-off-pic`)
  const lr = analyze(lf, ref)
  rows.push({ live_off_pic: true, ...lr })
  console.log(`live off=pic: rerata ${lr.meanA.toFixed(2)} (kita full ${rows[0].meanA.toFixed(2)})`)
  fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), t: T, rows }, null, 1))
  console.log(`→ ${OUT}`)
  await browser.close()
})()
