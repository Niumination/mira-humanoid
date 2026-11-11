#!/usr/bin/env node
/**
 * sweep-knob.js — sapu satu/dua knob URL terhadap live, sekaligus penilaian per wilayah.
 *
 * Pakai:
 *   node tools/sweep-knob.js --knobs "pg=1,1.2,1.4" --t 9.5 [--t 11] [--fixed "uh=1"]
 *
 * Keluaran: baris per nilai knob (MAE + Δ per wilayah) dan JSON opsional.
 * Catatan metodologi (WAJIB): acuan live bergeser 0,408 antara dua waktu tunggu berbeda —
 * jangan mengklaim perbaikan bila selisih MAE < 0,4 (lihat ANALISIS-GERBANG-C §4).
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const ARG = process.argv.slice(2)
const getArg = (n, d) => (ARG.indexOf(n) >= 0 ? ARG[ARG.indexOf(n) + 1] : d)
const BUILD = getArg('--build', 'http://127.0.0.1:8804/')
const LIVE = getArg('--live', 'https://mira-humanoid.vercel.app/')
const TS = (() => {
  // `--t` boleh diulang: --t 9.5 --t 11 --t 6.8
  const v = []
  ARG.forEach((a, i) => { if (a === '--t') v.push(ARG[i + 1]) })
  return (v.length ? v : ['9.5']).flatMap((x) => x.split(',')).map((x) => x.trim())
})()
const SPEC = getArg('--knobs', '')
const FIXED = getArg('--fixed', '')
const OUT = getArg('--json', '')
const SHOTS = '/tmp/sweepknob'

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
       'lengan': (slice(int(H*0.42),int(H*0.85)), slice(int(W*0.26),int(W*0.36)))}
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
  const [knob, vals] = SPEC.split('=')
  const values = vals.split(',')
  const out = { when: new Date().toISOString(), knob, fixed: FIXED, phases: [] }
  for (const t of TS) {
    const ref = await shoot(`${LIVE}?auto=1&t=${t}`, `live-${t}`)
    const rows = []
    for (const v of values) {
      const q = `?auto=1&t=${t}${FIXED ? '&' + FIXED.split(' ').join('&') : ''}&${knob}=${v}`
      const f = await shoot(BUILD + q, `ours-${t}-${v}`)
      const r = analyze(f, ref)
      rows.push({ v: Number(v), ...r })
      console.log(`t=${t} ${knob}=${v}: MAE ${r.mae.toFixed(3)} · rerata ${r.meanA.toFixed(2)} vs ${r.meanB.toFixed(2)} · Δ kepala ${r.w.kepala.toFixed(2)} torso ${r.w.torso.toFixed(2)} lengan ${r.w.lengan.toFixed(2)}`)
    }
    out.phases.push({ t: Number(t), rows })
  }
  // ringkasan rata-rata lintas fase
  const avg = values.map((v, i) => ({ v: Number(v), mae: out.phases.reduce((s, p) => s + p.rows[i].mae, 0) / out.phases.length }))
  avg.sort((a, b) => a.mae - b.mae)
  console.log('\nterbaik:', avg.map((a) => `${a.v}=${a.mae.toFixed(3)}`).join(' · '))
  out.avg = avg
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
  await browser.close()
})()
