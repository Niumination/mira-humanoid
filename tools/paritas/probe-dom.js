/** probe-dom.js — cetak geometri & gaya elemen visual (canvas/img) satu halaman. */
// playwright bisa dari node_modules repo, atau lewat env PLAYWRIGHT_MODULE
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const ARG = process.argv.slice(2)
const get = (n, d) => (ARG.indexOf(n) >= 0 ? ARG[ARG.indexOf(n) + 1] : d)
const URL_ = get('--url', '')
const WAIT = Number(get('--wait', '9000'))
const ARGS = ['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required','--mute-audio','--force-device-scale-factor=1','--hide-scrollbars']
;(async () => {
  const browser = await chromium.launch({ args: ARGS })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await page.goto(URL_, { waitUntil: 'load', timeout: 120000 })
  await page.waitForTimeout(WAIT)
  const info = await page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('canvas,img')) {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el)
      out.push({
        tag: el.tagName, buf: el.tagName === 'CANVAS' ? `${el.width}x${el.height}` : (el.currentSrc || el.src).split('/').pop(),
        rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        z: s.zIndex, op: s.opacity, blend: s.mixBlendMode, filter: s.filter,
        fit: s.objectFit, pos: s.position, transform: s.transform,
      })
    }
    return out
  })
  console.log(JSON.stringify(info, null, 1))
  await browser.close()
})()
