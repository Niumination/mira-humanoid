/**
 * probe-mira-sprites.js — rekam SEMUA draw sprite (program yang punya uniform `rotation`,
 * penanda SpriteMaterial) pada satu fase: matriks ukuran (modelMatrix), posisi (modelViewMatrix[3]),
 * diffuse, opacity. Dipakai untuk mencocokkan sprite live (g/y/v/m/p) dengan rebuild.
 *
 * Pakai: BASE=https://mira-humanoid.vercel.app/ Q="?auto=1&t=6.8" OUT=/tmp/spr-68.json node probe-mira-sprites.js
 */
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
const fs = require('fs')

const INIT = () => {
  const PROTO = [WebGLRenderingContext.prototype, (window.WebGL2RenderingContext || {}).prototype].filter(Boolean)
  const hook = (P) => {
    const info = new Map() // program → {names:Set}
    const st = { prog: null, scale: 1, pos: [0, 0], diffuse: [0, 0, 0], opacity: 1 }
    const oAttach = P.attachShader
    P.attachShader = function (p, s) {
      const src = this.getShaderSource(s) || ''
      const inf = info.get(p) || new Set()
      if (src.includes('rotation') || src.includes('mapTransform')) inf.add('sprite')
      info.set(p, inf)
      return oAttach.apply(this, arguments)
    }
    const oUse = P.useProgram
    P.useProgram = function (p) { st.prog = p; return oUse.apply(this, arguments) }
    const mat = (gl, p, loc) => {
      try {
        const v = gl.getUniform(p, loc)
        if (v && v.length === 16) return Array.from(v)
      } catch (e) {}
      return null
    }
    const rec = (gl) => {
      const p = st.prog
      if (!p || !gl || !(info.get(p) || new Set()).has('sprite')) return
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
      const out = {}
      for (let i = 0; i < n; i++) {
        const u = gl.getActiveUniform(p, i)
        const loc = gl.getUniformLocation(p, u.name)
        if (!loc) continue
        if (u.type === gl.FLOAT_MAT4) out[u.name] = mat(gl, p, loc)
        else if (u.type === gl.FLOAT) out[u.name] = gl.getUniform(p, loc)
        else if (u.type === gl.FLOAT_VEC3) out[u.name] = Array.from(gl.getUniform(p, loc))
        else if (u.type === gl.FLOAT_VEC4) out[u.name] = Array.from(gl.getUniform(p, loc))
      }
      const mm = out.modelMatrix
      const mv = out.modelViewMatrix
      const k = (window.__SPR = window.__SPR || [])
      if (k.length < 40 && mm && mv) {
        k.push({
          scale: +Math.hypot(mm[0], mm[1], mm[2]).toFixed(2),
          pos: [+mv[12].toFixed(2), +mv[13].toFixed(2)],
          diffuse: (out.diffuse || []).map((v) => +v.toFixed(4)),
          opacity: +(out.opacity ?? -1).toFixed(3),
        })
      }
    }
    const oDE = P.drawElements
    P.drawElements = function () { rec(this); return oDE.apply(this, arguments) }
    const oDA = P.drawArrays
    P.drawArrays = function () { rec(this); return oDA.apply(this, arguments) }
  }
  PROTO.forEach(hook)
}

;(async () => {
  const q = process.env.Q || '?auto=1&t=6.8'
  const out = process.env.OUT || '/tmp/spr.json'
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto((process.env.BASE || 'https://mira-humanoid.vercel.app/') + q, { waitUntil: 'load', timeout: 90000 })
  await p.waitForTimeout(Number(process.env.WAIT || 3000))
  const spr = await p.evaluate(() => window.__SPR || [])
  fs.writeFileSync(out, JSON.stringify(spr, null, 1))
  spr.forEach((s, i) => console.log(i, JSON.stringify(s)))
  await b.close()
})()
