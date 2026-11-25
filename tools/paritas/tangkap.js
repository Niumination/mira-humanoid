/**
 * tangkap.js — tangkap N frame 1440x900 DPR1 dari satu URL (panggung saja, UI disembunyikan).
 *
 * Pakai:
 *   node tools/tangkap.js --url https://apex-humanoid.vercel.app/?auto=1 \
 *        --out /home/user/workspace/work/cap --prefix apex-asli --wait 11000 --frames 5 --gap 400
 */
const fs = require('fs')
const path = require('path')
// playwright bisa dari node_modules repo, atau lewat env PLAYWRIGHT_MODULE
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

const ARG = process.argv.slice(2)
const get = (n, d) => (ARG.indexOf(n) >= 0 ? ARG[ARG.indexOf(n) + 1] : d)
const URL_ = get('--url', '')
const OUT = get('--out', '/home/user/workspace/work/cap')
const PREFIX = get('--prefix', 'cap')
const WAIT = Number(get('--wait', '11000'))
const FRAMES = Number(get('--frames', '5'))
const GAP = Number(get('--gap', '400'))
const PATCH = get('--patch', '')   // berkas JS opsional, dieksekusi di halaman sebelum frame diambil

const ARGS = [
  '--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--renderer-process-limit=1',
  '--force-device-scale-factor=1', '--hide-scrollbars',
]

const SEMBUNYIKAN = () => {
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el)
    if (el.tagName === 'CANVAS' || el.tagName === 'IMG') continue
    if (s.position === 'fixed' || s.position === 'absolute') {
      if (el.querySelector('canvas')) continue
      el.style.visibility = 'hidden'
    }
  }
}

;(async () => {
  if (!URL_) { console.error('butuh --url'); process.exit(2) }
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ args: ARGS })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 160)))
  await page.goto(URL_, { waitUntil: 'load', timeout: 120000 })
  await page.waitForTimeout(WAIT)
  await page.screenshot({ path: path.join(OUT, `${PREFIX}-raw.png`) })
  if (PATCH) {
    await page.evaluate(fs.readFileSync(PATCH, 'utf8'))
    await page.waitForTimeout(300)
  }
  await page.evaluate(SEMBUNYIKAN)
  await page.waitForTimeout(250)
  for (let i = 0; i < FRAMES; i++) {
    await page.screenshot({ path: path.join(OUT, `${PREFIX}-f${i}.png`) })
    if (i < FRAMES - 1) await page.waitForTimeout(GAP)
  }
  const info = await page.evaluate(() => ({
    canvas: [...document.querySelectorAll('canvas')].map((c) => `${c.width}x${c.height}`),
    imgs: [...document.querySelectorAll('img')].map((i) => (i.currentSrc || i.src).split('/').pop()),
    dpr: window.devicePixelRatio,
  }))
  console.log(PREFIX, JSON.stringify(info))
  await browser.close()
})()
