#!/usr/bin/env node
/**
 * reg-build.js — regresi build kerja vs PRODUKSI (bukan vs live).
 *
 * Pakai:
 *   node tools/reg-build.js --build http://127.0.0.1:8804/ --prod https://mira-humanoid-niu.vercel.app/ \
 *        --t 8 --t 11.5 --t 13 [--q "bmk=0.8"]
 *
 * Gunanya: membuktikan knob baru yang BAWAANNYA mati tidak mengubah satu piksel pun
 * (MAE 0,0000 · 0 piksel berbeda), dan melaporkan `__MIRA_ERR` (jebakan W-9b: galat GL
 * membuat loop gambar berhenti dan hasilnya *tampak* seperti eksperimen yang berhasil).
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const ARG = process.argv.slice(2)
const getArg = (n, d) => (ARG.indexOf(n) >= 0 ? ARG[ARG.indexOf(n) + 1] : d)
const BUILD = getArg('--build', 'http://127.0.0.1:8804/')
const PROD = getArg('--prod', 'https://mira-humanoid-niu.vercel.app/')
const Q = getArg('--q', '')
const TS = (() => {
  const v = []
  ARG.forEach((a, i) => { if (a === '--t') v.push(ARG[i + 1]) })
  return (v.length ? v : ['8']).flatMap((x) => x.split(',')).map((x) => x.trim())
})()
const SHOTS = '/tmp/regbuild'
const ARGS = [
  '--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required', '--renderer-process-limit=1',
]
const py = `
import sys, numpy as np
from PIL import Image
A = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
B = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
d = np.abs(A - B)
print(f"{d.mean():.4f} {int((d.max(axis=2) > 0).sum())}")
`
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
    const err = await page.evaluate(() => window.__MIRA_ERR || null)
    return { f, err }
  }
  let worst = 0
  for (const t of TS) {
    const qs = `?auto=1&t=${t}${Q ? '&' + Q.split(' ').join('&') : ''}`
    const prod = await shoot(PROD + `?auto=1&t=${t}`, `prod-${t}`)
    const ours = await shoot(BUILD + qs, `ours-${t}`)
    const [mae, px] = execFileSync('python3', ['-c', py, ours.f, prod.f]).toString().trim().split(/\s+/)
    worst = Math.max(worst, Number(mae))
    console.log(`t=${t}  MAE ${mae} · ${px} piksel  ${ours.err ? 'ERR: ' + ours.err : 'err=null'}`)
  }
  console.log(`\nMAE terburuk: ${worst.toFixed(4)}  ${worst === 0 ? '⇒ IDENTIK dengan produksi' : ''}`)
  await browser.close()
})()
