#!/usr/bin/env node
/**
 * gate-c-ablation.js — GERBANG C: siapa penyumbang sisa selisih piksel?
 *
 * Untuk beberapa fase `?t=`, ambil tangkapan layar tiap aplikasi dengan satu lapisan dimatikan
 * (`?off=<flag>`, kosakata live), lalu hitung:
 *   Δ_total    = MAE(kita, live) tanpa mematikan apa pun
 *   Δ_lapisan  = MAE(kita_off, live_off)  → turun banyak = lapisan itu penyumbang utama
 *   bobot      = MAE(kita, kita_off)      → seberapa besar lapisan itu mengubah gambar KITA
 *
 * Pakai: node tools/gate-c-ablation.js [--t 9.5,8] [--build URL] [--live URL] [--json]
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const ARG = process.argv.slice(2)
const getArg = (n, d) => (ARG.indexOf(n) >= 0 ? ARG[ARG.indexOf(n) + 1] : d)
const BUILD = getArg('--build', 'http://127.0.0.1:8804/')
const LIVE = getArg('--live', 'https://mira-humanoid.vercel.app/')
const TS = getArg('--t', '9.5,8').split(',').map(Number)
const OUT = '/home/user/Kerja-Arena/verification/mira/gate-c-ablation.json'
const SHOTS = '/tmp/gatec'
const FLAGS = ['none', 'fog', 'waves', 'pic', 'figure', 'matter', 'lines', 'bloom', 'hair', 'arcs']

const ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required',
  '--renderer-process-limit=1',
]

async function shoot(base, t, off) {
  const b = await chromium.launch({ args: ARGS })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const q = `?auto=1&t=${t}${off === 'none' ? '' : `&off=${off}`}`
  await p.goto(base + q, { waitUntil: 'load', timeout: 120000 })
  await p.waitForTimeout(3400)
  await p.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el)
      if (el.tagName === 'CANVAS' || el.tagName === 'IMG') continue
      if (s.position === 'fixed' || s.position === 'absolute') {
        if (el.querySelector('canvas')) continue
        el.style.visibility = 'hidden'
      }
    }
  })
  await p.waitForTimeout(250)
  const f = path.join(SHOTS, `${base.includes('vercel') ? 'live' : 'ours'}-${t}-${off}.png`)
  await p.screenshot({ path: f })
  await b.close()
  return f
}

function mae(a, b) {
  const py = `
import sys, json
import numpy as np
from PIL import Image
A = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
B = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
print(json.dumps({'mae': float(np.abs(A - B).mean()), 'meanA': float(A.mean()), 'meanB': float(B.mean())}))
`
  return JSON.parse(execFileSync('python3', ['-c', py, a, b]).toString())
}

;(async () => {
  fs.mkdirSync(SHOTS, { recursive: true })
  const out = { when: new Date().toISOString(), build: BUILD, live: LIVE, phases: [] }
  for (const t of TS) {
    const rows = []
    const cache = {}
    for (const off of FLAGS) {
      const key = `${t}-${off}`
      cache[key] = {
        ours: await shoot(BUILD, t, off),
        live: await shoot(LIVE, t, off),
      }
      const d = mae(cache[key].ours, cache[key].live)
      const base = cache[`${t}-none`]
      const w = off === 'none' ? null : mae(base.ours, cache[key].ours)
      rows.push({ off, total: +d.mae.toFixed(4), meanOurs: +d.meanA.toFixed(2), meanLive: +d.meanB.toFixed(2), weight: w ? +w.mae.toFixed(4) : null })
      console.log(
        `t=${t} off=${off.padEnd(7)} MAE ${d.mae.toFixed(4)} (kita ${d.meanA.toFixed(1)} / live ${d.meanB.toFixed(1)})` +
          (w ? ` · bobot lapisan ${w.mae.toFixed(4)}` : '')
      )
    }
    out.phases.push({ t, rows })
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
  console.log(`\n→ ${OUT}`)
})().catch((e) => {
  console.error('ERROR', e)
  process.exit(2)
})
