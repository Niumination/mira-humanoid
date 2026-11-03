/**
 * probe-bloom.js — rekam uniform tiap program yang punya pola nama bloom
 * (threshold/smoothing/intensity/radius/e0/texelSize) pada app live atau rebuild.
 *
 * Pakai: BASE=... Q="?auto=1&t=9.5" OUT=/tmp/bloom.json node probe-bloom.js
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
      const cur = srcs.get(p) || ''
      srcs.set(p, cur + '\n' + src)
      return oAttach.apply(this, arguments)
    }
    const rec = (gl, prog) => {
      const src = srcs.get(prog) || ''
      if (!/threshold|intensity|smoothing|e0|texelSize|radius/i.test(src)) return
      const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS)
      const out = {}
      for (let i = 0; i < n; i++) {
        const u = gl.getActiveUniform(prog, i)
        const loc = gl.getUniformLocation(prog, u.name)
        if (!loc) continue
        if (u.type === gl.FLOAT) out[u.name] = +gl.getUniform(prog, loc).toFixed(4)
        else if (u.type === gl.FLOAT_VEC2) out[u.name] = Array.from(gl.getUniform(prog, loc)).map((v) => +v.toFixed(4))
      }
      const key = Object.keys(out).sort().join(',')
      const seen = (window.__BL = window.__BL || [])
      if (seen.length < 60 && !seen.some((x) => JSON.stringify(x.uniforms) === JSON.stringify(out))) seen.push({ key, uniforms: out })
    }
    const oUse = P.useProgram
    P.useProgram = function (p) { window.__PROG = p; return oUse.apply(this, arguments) }
    const oDA = P.drawArrays
    P.drawArrays = function () { if (window.__PROG) rec(this, window.__PROG); return oDA.apply(this, arguments) }
    const oDE = P.drawElements
    P.drawElements = function () { if (window.__PROG) rec(this, window.__PROG); return oDE.apply(this, arguments) }
  })
}

;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto((process.env.BASE || 'https://mira-humanoid.vercel.app/') + (process.env.Q || '?auto=1&t=9.5'), { waitUntil: 'load', timeout: 90000 })
  await p.waitForTimeout(Number(process.env.WAIT || 3500))
  const list = await p.evaluate(() => window.__BL || [])
  fs.writeFileSync(process.env.OUT || '/tmp/bloom.json', JSON.stringify(list, null, 1))
  list.forEach((x, i) => console.log(i, JSON.stringify(x.uniforms)))
  await b.close()
})()
