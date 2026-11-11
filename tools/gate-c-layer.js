#!/usr/bin/env node
/**
 * gate-c-layer.js — GERBANG C tahap 2: SIAPA penyumbang kelebihan terang pada lapisan FIGUR?
 *
 * Cara ukur: matikan latar di kedua aplikasi (`off=fog`), lalu untuk tiap sub-lapisan figur
 * ambil selisih terhadap keadaan "figur penuh":
 *     L_F = rerata(off=fog) − rerata(off=fog,F)
 * L_F adalah kontribusi lapisan F **di atas latar** (persisnya yang membuat Δ +3,5).
 * Lalu bandingkan L_F kita vs live → lapisan mana yang kelebihan.
 *
 * Keluaran: verification/mira/gate-c-layer.json + tangkapan di /tmp/gatec2
 * Pakai: node tools/gate-c-layer.js [--t 9.5] [--build URL]
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const ARG = process.argv.slice(2)
const getArg = (n, d) => (ARG.indexOf(n) >= 0 ? ARG[ARG.indexOf(n) + 1] : d)
const BUILD = getArg('--build', 'http://127.0.0.1:8804/')
const LIVE = getArg('--live', 'https://mira-humanoid.vercel.app/')
const T = Number(getArg('--t', '9.5'))
const OUT = '/home/user/Kerja-Arena/verification/mira/gate-c-layer.json'
const SHOTS = '/tmp/gatec2'

// flag yang punya padanan di live; `strands`/`twinkles` hanya ada di kita
const FLAGS = ['pic', 'hair', 'lines', 'matter', 'arcs', 'waves', 'strands', 'twinkles']

const ARGS = [
  '--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required', '--renderer-process-limit=1',
]

async function shoot(base, offs, tag) {
  const b = await chromium.launch({ args: ARGS })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const q = `?auto=1&t=${T}${offs.length ? `&off=${offs.join(',')}` : ''}`
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
  const f = path.join(SHOTS, `${tag}.png`)
  await p.screenshot({ path: f })
  await b.close()
  return f
}

// analisis gambar: rerata, grid 3×3, dan peta selisih
function analyze(a, b) {
  const py = `
import sys, json
import numpy as np
from PIL import Image
A = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float).mean(axis=2)
B = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float).mean(axis=2)
d = A - B
H, W = A.shape
g = [[float(d[i*H//3:(i+1)*H//3, j*W//3:(j+1)*W//3].mean()) for j in range(3)] for i in range(3)]
# puncak: 5 jendela 60×60 dengan selisih rerata terbesar (positif = kita lebih terang)
best = []
bs = 60
for i in range(0, H-bs, 30):
    for j in range(0, W-bs, 30):
        m = d[i:i+bs, j:j+bs].mean()
        best.append((m, j, i))
best.sort(reverse=True)
print(json.dumps({'mae': float(np.abs(A-B).mean()), 'meanA': float(A.mean()), 'meanB': float(B.mean()),
                  'diff': float(d.mean()), 'grid': g, 'hot': best[:5], 'cold': best[-5:]}))
`
  return JSON.parse(execFileSync('python3', ['-c', py, a, b]).toString())
}

function mean1(f) {
  return analyze(f, f)
}

;(async () => {
  fs.mkdirSync(SHOTS, { recursive: true })
  const out = { when: new Date().toISOString(), build: BUILD, live: LIVE, t: T, means: {}, layers: [], diff: null }
  // 1) figur penuh di atas HITAM (latar mati) di kedua aplikasi
  const oursFull = await shoot(BUILD, ['fog'], `ours-fog`)
  const liveFull = await shoot(LIVE, ['fog'], `live-fog`)
  out.means.ours = mean1(oursFull).meanA
  out.means.live = mean1(liveFull).meanA
  out.diff = analyze(oursFull, liveFull)
  // 2) tiap sub-lapisan dimatikan (latar tetap mati)
  for (const F of FLAGS) {
    const o = await shoot(BUILD, ['fog', F], `ours-fog-${F}`)
    const l = await shoot(LIVE, ['fog', F], `live-fog-${F}`)
    out.layers.push({
      flag: F,
      ours: mean1(o).meanA,
      live: mean1(l).meanA,
      contribOurs: out.means.ours - mean1(o).meanA,
      contribLive: out.means.live - mean1(l).meanA,
    })
    console.log(`${F}: kita −${(out.means.ours - mean1(o).meanA).toFixed(2)} · live −${(out.means.live - mean1(l).meanA).toFixed(2)}`)
  }
  out.means.contribOurs = out.means.ours
  out.means.contribLive = out.means.live
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
  console.log(`\nfigur di atas hitam: kita ${out.means.ours.toFixed(2)} · live ${out.means.live.toFixed(2)} · Δ ${out.diff.diff.toFixed(2)}`)
  console.log('grid Δ (baris atas→bawah):', out.diff.grid.map((r) => r.map((v) => v.toFixed(1)).join(' / ')).join(' | '))
  console.log('hotspot Δ:', out.diff.hot.map((h) => `${h[0].toFixed(1)}@${h[1]},${h[2]}`).join(' '))
  console.log(`→ ${OUT}`)
})()
