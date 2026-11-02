/**
 * probe-arc-buffers.js — ambil SELURUH isi buffer geometri busur dari app live
 * (position 3×N, lalu 4 atribut 1×N: aU/aW/aT/aStr, dan color 3×N).
 *
 * Pakai: LENS=11904,3968 OUT=/tmp/arcbuf.json node probe-arc-buffers.js
 */
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
const fs = require('fs')

const INIT = (lens) => {
  window.__LENS = lens
  const PROTO = [WebGLRenderingContext.prototype, (window.WebGL2RenderingContext || {}).prototype].filter(Boolean)
  PROTO.forEach((P) => {
    const o = P.bufferData
    P.bufferData = function (target, data, usage) {
      try {
        if (data && data.length && target === this.ARRAY_BUFFER && lens.includes(data.length)) {
          const k = (window.__BUF = window.__BUF || [])
          k.push({ len: data.length, all: Array.from(data).map((v) => Math.round(v * 1000) / 1000) })
        }
      } catch (e) {}
      return o.apply(this, arguments)
    }
  })
}

;(async () => {
  const lens = (process.env.LENS || '11904,3968').split(',').map(Number)
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT, lens)
  await p.goto((process.env.BASE || 'https://mira-humanoid.vercel.app/') + (process.env.Q || '?auto=1&t=6.8'), { waitUntil: 'load', timeout: 90000 })
  await p.waitForTimeout(Number(process.env.WAIT || 3500))
  const bufs = await p.evaluate(() => window.__BUF || [])
  const out = process.env.OUT || '/tmp/arcbuf.json'
  fs.writeFileSync(out, JSON.stringify(bufs))
  bufs.forEach((x, i) => {
    const uniq = [...new Set(x.all)].slice(0, 6)
    console.log(i, 'len', x.len, 'min', Math.min(...x.all), 'max', Math.max(...x.all), 'uniq', JSON.stringify(uniq))
  })
  await b.close()
})()
