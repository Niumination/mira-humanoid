/**
 * probe-buffers.js — rekam semua bufferData/bufferSubData (Float32Array) pada app live/rebuild,
 * lalu cetak kandidat berukuran tertentu + sampel isinya. Dipakai membandingkan geometri busur.
 *
 * Pakai: BASE=... Q="?auto=1&t=6.8" LEN=11760 OUT=/tmp/bufs.json node probe-buffers.js
 */
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
const fs = require('fs')

const INIT = (want) => {
  window.__WANT = want;
  const PROTO = [WebGLRenderingContext.prototype, (window.WebGL2RenderingContext || {}).prototype].filter(Boolean)
  const hook = (P) => {
    const o = P.bufferData
    P.bufferData = function (target, data, usage) {
      try {
        if (data && data.length && (target === this.ARRAY_BUFFER)) {
          const k = (window.__BUF = window.__BUF || [])
          const want = window.__WANT || null
          const keep = want ? data.length === want : k.length < 120
          if (keep) {
            const n = Math.min(data.length, 12)
            k.push({ len: data.length, head: Array.from(data.slice(0, n)).map((v) => +v.toFixed(2)), all: want ? Array.from(data).map((v) => +v.toFixed(2)) : null })
          }
        }
      } catch (e) {}
      return o.apply(this, arguments)
    }
  }
  PROTO.forEach(hook)
}

;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT, process.env.WANTLEN ? +process.env.WANTLEN : null)
  await p.goto((process.env.BASE || 'https://mira-humanoid.vercel.app/') + (process.env.Q || '?auto=1&t=6.8'), { waitUntil: 'load', timeout: 90000 })
  await p.waitForTimeout(Number(process.env.WAIT || 3000))
  const bufs = await p.evaluate(() => window.__BUF || [])
  fs.writeFileSync(process.env.OUT || '/tmp/bufs.json', JSON.stringify(bufs, null, 1))
  const hist = {}
  for (const x of bufs) hist[x.len] = (hist[x.len] || 0) + 1
  console.log('jumlah buffer ARRAY_BUFFER:', bufs.length)
  console.log('histogram panjang:', JSON.stringify(hist))
  if (process.env.LEN) for (const x of bufs) if (x.len === +process.env.LEN) console.log('cocok', JSON.stringify(x.head))
  await b.close()
})()
