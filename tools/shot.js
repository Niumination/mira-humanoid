/**
 * shot.js — tangkap layar beberapa fase sekaligus.
 * Pakai (env): BASE=http://127.0.0.1:5199/ TS="0.3,1.89,3.5,5.5,6.8,9.5" PREFIX=h OUTDIR=/tmp
 * Hasil: $OUTDIR/$PREFIX-<t>.png
 * Catatan: Playwright dipasang di /tmp/pw (tidak persist); skrip ini murni ada di workspace.
 */
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

;(async () => {
  const base = process.env.BASE || 'http://127.0.0.1:5199/'
  const ts = (process.env.TS || '9.5').split(',')
  const prefix = process.env.PREFIX || 'shot'
  const out = process.env.OUTDIR || '/tmp'
  const wait = Number(process.env.WAIT || 3200)
  const extra = process.env.EXTRA || ''
  const b = await chromium.launch({
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  })
  for (const t of ts) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    const errs = []
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)))
    await p.goto(`${base}?auto=1&t=${t}${extra}`, { waitUntil: 'load', timeout: 90000 })
    await p.waitForTimeout(wait)
    const marks = await p.evaluate(() => ({ ramp: window.__MIRA_RAMP || null, err: window.__MIRA_ERR || null }))
    await p.screenshot({ path: `${out}/${prefix}-${t}.png` })
    await p.close()
    console.log(t, JSON.stringify(marks), errs.join('|'))
  }
  await b.close()
})()
