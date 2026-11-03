/**
 * probe-reveal.js — rekam uniform `uReveal` (dan `uFill`/`uGain`) tiap program yang memakainya,
 * pada app live atau rebuild, untuk satu fase.
 *
 * Pakai: BASE=... Q="?auto=1&t=5.5" OUT=/tmp/rev.json node probe-reveal.js
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
    const rec = (gl, prog) => {
      const src = srcs.get(prog) || ''
      if (!/uReveal/.test(src)) return
      const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS)
      const out = {}
      for (let i = 0; i < n; i++) {
        const u = gl.getActiveUniform(prog, i)
        const loc = gl.getUniformLocation(prog, u.name)
        if (!loc) continue
        if (u.type === gl.FLOAT) out[u.name] = +gl.getUniform(prog, loc).toFixed(4)
        else if (u.type === gl.FLOAT_VEC4) out[u.name] = Array.from(gl.getUniform(prog, loc)).map((v) => +v.toFixed(3))
        else if (u.type === gl.FLOAT_VEC2) out[u.name] = Array.from(gl.getUniform(prog, loc)).map((v) => +v.toFixed(3))
      }
      const seen = (window.__REV = window.__REV || [])
      const key = (src.match(/varying[^;]*;/g) || []).join('|').length + ':' + Object.keys(out).sort().join(',')
      if (!seen.some((x) => x.key === key)) seen.push({ key, uniforms: out })
    }
    const oUse = P.useProgram
    P.useProgram = function (p) { window.__PROG2 = p; return oUse.apply(this, arguments) }
    const oDE = P.drawElements
    P.drawElements = function () { if (window.__PROG2) rec(this, window.__PROG2); return oDE.apply(this, arguments) }
  })
}

;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto((process.env.BASE || 'https://mira-humanoid.vercel.app/') + (process.env.Q || '?auto=1&t=5.5'), { waitUntil: 'load', timeout: 90000 })
  await p.waitForTimeout(Number(process.env.WAIT || 3500))
  const list = await p.evaluate(() => window.__REV || [])
  fs.writeFileSync(process.env.OUT || '/tmp/rev.json', JSON.stringify(list, null, 1))
  list.forEach((x, i) => console.log(i, JSON.stringify(x.uniforms)))
  await b.close()
})()
