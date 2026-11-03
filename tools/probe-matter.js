/**
 * probe-matter.js — rekam uniform + jumlah titik pada program materi (punya uDense/uMatter/uPx).
 * Pakai: BASE=... Q="?auto=1&t=5.5" OUT=/tmp/mat.json node probe-matter.js
 */
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
const fs = require('fs')

const INIT = () => {
  const PROTO = [WebGLRenderingContext.prototype, (window.WebGL2RenderingContext || {}).prototype].filter(Boolean)
  const srcs = new Map()
  PROTO.forEach((P) => {
    const oAttach = P.attachShader
    P.attachShader = function (p, s) {
      const src = this.getShaderSource(s) || ''
      srcs.set(p, (srcs.get(p) || '') + '\n' + src)
      return oAttach.apply(this, arguments)
    }
    const read = (gl, prog) => {
      const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS)
      const out = {}
      for (let i = 0; i < n; i++) {
        const u = gl.getActiveUniform(prog, i)
        const loc = gl.getUniformLocation(prog, u.name)
        if (!loc) continue
        if (u.type === gl.FLOAT) out[u.name] = +gl.getUniform(prog, loc).toFixed(4)
      }
      return out
    }
    const oUse = P.useProgram
    P.useProgram = function (p) { window.__PM = p; return oUse.apply(this, arguments) }
    const oDA = P.drawArrays
    P.drawArrays = function (mode, first, count) {
      const src = srcs.get(window.__PM) || ''
      if (/uDense/.test(src)) {
        const k = (window.__MAT = window.__MAT || [])
        if (k.length < 12) k.push({ count, mode, uniforms: read(this, window.__PM) })
      }
      return oDA.apply(this, arguments)
    }
  })
}

;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto((process.env.BASE || 'https://mira-humanoid.vercel.app/') + (process.env.Q || '?auto=1&t=5.5'), { waitUntil: 'load', timeout: 90000 })
  await p.waitForTimeout(Number(process.env.WAIT || 3500))
  const list = await p.evaluate(() => window.__MAT || [])
  fs.writeFileSync(process.env.OUT || '/tmp/mat.json', JSON.stringify(list, null, 1))
  list.slice(0, 4).forEach((x, i) => console.log(i, 'count', x.count, JSON.stringify(x.uniforms)))
  await b.close()
})()
