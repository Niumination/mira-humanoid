#!/usr/bin/env node
/**
 * ⚠ DIPENSIUNKAN 2026-11-17 — JANGAN dipakai sebagai bukti mutu.
 * Alat ini mengukur MAE piksel aplikasi APEX kita terhadap situs produksi asli. Sejak P13 langkah 2–4
 * plate & latar adalah karya sendiri, dan acuan itu sendiri tidak stabil (MAE diri 8,80 pada 1440,
 * 16,06 pada 390 — lihat verification/kalibrasi/). Pengganti: tools/gate-paritas.js (v2),
 * tools/gate-aset-layout.js, tools/gate-a11y.js. Alat ini dipertahankan hanya untuk arsip angka.
 */
/**
 * gate-apex.js — ukur paritas piksel APEX: LIVE (produk asli) vs BUILD kita, dua viewport.
 *
 * Protokol identik dengan tools/gate-deploy.js supaya angkanya sebanding:
 *   `?auto=1&state=idle&surge=1.5` + `window.__HUM_BG_T = 3.0`, tunggu 13 s.
 * Derau live diukur dengan menangkap LIVE DUA KALI pada sesi yang sama.
 *
 * Pakai:
 *   node tools/gate-apex.js --ours http://127.0.0.1:8805/ [--q "bpl=8&bpk=1"] \
 *        [--vp 1440x900] [--vp 390x844] [--json out.json] [--wait 13000]
 *
 * Keluaran per viewport: MAE, % piksel >32, rerata, derau live-vs-live, bias per pita luma.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const ARG = process.argv.slice(2)
const getArg = (n, d) => (ARG.indexOf(n) >= 0 ? ARG[ARG.indexOf(n) + 1] : d)
const LIVE = getArg('--live', 'https://apex-humanoid.vercel.app/')
const OURS = getArg('--ours', 'http://127.0.0.1:8805/')
const Q = getArg('--q', '')
const WAIT = Number(getArg('--wait', '13000'))
const JSON_OUT = getArg('--json', '')
// --frames N: ambil N tangkapan berjarak --gap ms lalu pakai MEDIAN piksel per situs.
// Alasannya terukur: dua tangkapan LIVE berjarak 1,2 s berbeda MAE 5,41 (animasi figur tidak
// bisa dibekukan dari luar di situs live). Median meredam fase animasi itu sehingga angka
// "kita vs live" tidak lagi bercampur derau fase.
const FRAMES = Math.max(1, Number(getArg('--frames', '1')))
const GAP = Number(getArg('--gap', '400'))
const VPS = (() => {
  const v = []
  ARG.forEach((a, i) => { if (a === '--vp') v.push(ARG[i + 1]) })
  return (v.length ? v : ['1440x900', '390x844']).map((s) => {
    const [w, h] = s.split('x').map(Number)
    return { w, h, tag: s }
  })
})()
const SHOTS = '/tmp/gateapex'

const ARGS = [
  '--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
  '--disable-dev-shm-usage', '--mute-audio',
]
const FREEZE = `(() => { window.__HUM_BG_T = 3.0; })();`

const py = `
import sys, json
import numpy as np
from PIL import Image
A = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
B = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
band = []
for lo, hi in [(0,20),(20,60),(60,120),(120,200),(200,256)]:
    m = (B.mean(2) >= lo) & (B.mean(2) < hi)
    if m.sum() < 200: band.append([lo, hi, 0, 0.0, 0.0]); continue
    band.append([lo, hi, int(m.sum()), float((A.mean(2)-B.mean(2))[m].mean()), float(np.abs(A.mean(2)-B.mean(2))[m].mean())])
print(json.dumps({'mae': float(np.abs(A-B).mean()), 'over32': float((np.abs(A-B).mean(2) > 32).mean()*100),
 'meanA': float(A.mean()), 'meanB': float(B.mean()), 'band': band}))
`

// median piksel dari N tangkapan (meredam fase animasi figur)
const pyMedian = `
import sys
import numpy as np
from PIL import Image
files = sys.argv[2:]
st = np.stack([np.asarray(Image.open(f).convert('RGB')).astype(np.float32) for f in files])
med = np.median(st, axis=0)
Image.fromarray(med.astype(np.uint8)).save(sys.argv[1])
print(len(files))
`

;(async () => {
  fs.mkdirSync(SHOTS, { recursive: true })
  const browser = await chromium.launch({ args: ARGS })
  const out = { when: new Date().toISOString(), ours: OURS, q: Q, frames: FRAMES, gap: GAP, viewports: [] }
  for (const vp of VPS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 })
    const shoot = async (base, extra, tag) => {
      const p = await ctx.newPage()
      await p.addInitScript(FREEZE)
      await p.goto(base + '?auto=1&state=idle&surge=1.5' + extra, { waitUntil: 'networkidle', timeout: 120000 })
      await p.waitForTimeout(WAIT)
      const files = []
      for (let i = 0; i < FRAMES; i++) {
        const f = path.join(SHOTS, `${vp.tag}-${tag}${FRAMES > 1 ? '-' + i : ''}.png`)
        await p.screenshot({ path: f })
        files.push(f)
        if (i < FRAMES - 1) await p.waitForTimeout(GAP)
      }
      await p.close()
      if (files.length === 1) return files[0]
      const f = path.join(SHOTS, `${vp.tag}-${tag}-median.png`)
      execFileSync('python3', ['-c', pyMedian, f, ...files])
      return f
    }
    const liveA = await shoot(LIVE, '', 'live')
    const liveB = await shoot(LIVE, '', 'live2')
    const ours = await shoot(OURS, Q ? '&' + Q : '', 'ours')
    const noise = JSON.parse(execFileSync('python3', ['-c', py, liveA, liveB]).toString())
    const r = JSON.parse(execFileSync('python3', ['-c', py, ours, liveA]).toString())
    out.viewports.push({ vp: vp.tag, noise, ours: r })
    console.log(`\n== ${vp.tag}`)
    console.log(`derau live-vs-live : MAE ${noise.mae.toFixed(2)} · over32 ${noise.over32.toFixed(2)} %`)
    console.log(`deploy vs live     : MAE ${r.mae.toFixed(2)} · over32 ${r.over32.toFixed(2)} % · rerata ${r.meanA.toFixed(1)} vs ${r.meanB.toFixed(1)}${FRAMES > 1 ? `  (median ${FRAMES} bingkai)` : ''}`)
    console.log('pita luma (live)   : ' + r.band.map((b) => `${b[0]}-${b[1]}: Δ${b[3].toFixed(1)} (n=${b[2]})`).join(' · '))
    await ctx.close()
  }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1))
  await browser.close()
})()
