#!/usr/bin/env node
/**
 * capture.js — tangkap layar `?auto=1&t=<fase>` dari satu URL (panggung saja, UI disembunyikan).
 *
 * Dulu skrip ini selalu ditulis ulang di /tmp dan hilang setiap sesi direset — sekarang jadi alat
 * tetap di `tools/`.
 *
 * Pakai:
 *   node tools/capture.js --base http://127.0.0.1:8804/ --prefix b4w --out DIR --t 0.3,1.89,3.5,5.5,6.8,9.5
 *   node tools/capture.js --base https://mira-humanoid.vercel.app/ --prefix live --out DIR --t 9.5 --wait 3200
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const ARG = process.argv.slice(2)
const getArg = (n, d) => (ARG.indexOf(n) >= 0 ? ARG[ARG.indexOf(n) + 1] : d)
const BASE = getArg('--base', 'http://127.0.0.1:8804/')
const PREFIX = getArg('--prefix', 'cap')
const OUT = getArg('--out', '/tmp/caps')
const WAIT = Number(getArg('--wait', '3400'))
const TS = getArg('--t', '9.5').split(',')
const EXTRA = getArg('--q', '')            // parameter tambahan, mis. "off=fog"
const ARGS = [
  '--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required', '--renderer-process-limit=1',
]

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ args: ARGS })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  for (const t of TS) {
    const q = `?auto=1&t=${t}${EXTRA ? '&' + EXTRA : ''}`
    await page.goto(BASE + q, { waitUntil: 'load', timeout: 120000 })
    await page.waitForTimeout(WAIT)
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
    await page.waitForTimeout(250)
    const f = path.join(OUT, `${PREFIX}-${t}.png`)
    await page.screenshot({ path: f })
    console.log(`${PREFIX} t=${t} → ${f}`)
  }
  await browser.close()
})()
