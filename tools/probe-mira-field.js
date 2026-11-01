/**
 * probe-mira-field.js — rekam uniform per-program pada app MIRA ASLI untuk satu fase.
 * Fokus: medan nebula (iField/iMatter/iSpread/iAlpha), orb (uOpacity/uOrbPx/uOrbR/uSeed),
 * shader yang punya uShock, dan opacity kanvas (CSS).
 *
 * Pakai: Q="?auto=1&t=1.89" OUT=/tmp/field-189.json node probe-mira-field.js
 */
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
const fs = require('fs')

const INIT = () => {
 const PROTO = [WebGLRenderingContext.prototype, (window.WebGL2RenderingContext || {}).prototype].filter(Boolean)
 const hook = (P) => {
  const progInfo = new Map()
  const state = { prog: null }
  const snap = (window.__SNAP = window.__SNAP || {}) // dipakai bersama kedua konteks (webgl1 medan + webgl2 figur)
  const oAttach = P.attachShader
  P.attachShader = function (p, s) {
    const src = this.getShaderSource(s) || ''
    const inf = progInfo.get(p) || {}
    if (this.getShaderParameter(s, this.SHADER_TYPE) === this.VERTEX_SHADER) inf.v = src
    else inf.f = src
    progInfo.set(p, inf)
    return oAttach.apply(this, arguments)
  }
  const oUse = P.useProgram
  P.useProgram = function (p) { state.prog = p; return oUse.apply(this, arguments) }
  const oGet = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (t, o) {
    const c = oGet.apply(this, arguments)
    if (c && (t === 'webgl2' || t === 'webgl')) window.__GL = window.__GL || c
    return c
  }
  const rec = (gl) => {
    const p = state.prog
    if (!p || !gl) return
    const info = progInfo.get(p) || {}
    const key = (info.v || '').length + '/' + (info.f || '').length
    const uniforms = {}
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < n; i++) {
      const u = gl.getActiveUniform(p, i)
      const loc = gl.getUniformLocation(p, u.name)
      if (!loc) continue
      const t = u.type
      try {
        if (t === gl.FLOAT) uniforms[u.name] = gl.getUniform(p, loc)
        else if (t === gl.FLOAT_VEC2) uniforms[u.name] = Array.from(gl.getUniform(p, loc))
        else if (t === gl.FLOAT_VEC3) uniforms[u.name] = Array.from(gl.getUniform(p, loc))
        else if (t === gl.FLOAT_VEC4) uniforms[u.name] = Array.from(gl.getUniform(p, loc))
      } catch (e) {}
    }
    snap[key] = snap[key] || { uniforms, count: 0 }
    snap[key].uniforms = uniforms
    snap[key].count++
  }
  const oDA = P.drawArrays
  P.drawArrays = function () { rec(this); return oDA.apply(this, arguments) }
  const oDE = P.drawElements
  P.drawElements = function () { rec(this); return oDE.apply(this, arguments) }
 }
 PROTO.forEach(hook)
}

;(async () => {
  const q = process.env.Q || '?auto=1&t=1.89'
  const out = process.env.OUT || '/tmp/probe.json'
  const url = (process.env.BASE || 'https://mira-humanoid.vercel.app/') + q
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.addInitScript(INIT)
  await p.goto(url, { waitUntil: 'load', timeout: 90000 })
  await p.waitForTimeout(Number(process.env.WAIT || 3000))
  const r = await p.evaluate(() => ({
    cvs: [...document.querySelectorAll('canvas')].map((c) => ({ w: c.width, h: c.height, opacity: c.style.opacity })),
    snap: window.__SNAP || null,
  }))
  r.q = q
  fs.writeFileSync(out, JSON.stringify(r, null, 1))
  const keys = Object.keys(r.snap || {})
  const want = keys.filter((k) => JSON.stringify(r.snap[k].uniforms).match(/iField|uOrbPx|uShock|uOpacity/))
  for (const k of want) {
    const u = r.snap[k].uniforms
    const pick = {}
    for (const n of ['iField', 'iMatter', 'iSpread', 'iAlpha', 'iNear', 'iRing', 'uOpacity', 'uOrbPx', 'uOrbR', 'uSeed', 'uShock', 'uShockW', 'uGain', 'uOn']) if (n in u) pick[n] = u[n]
    console.log(k, JSON.stringify(pick))
  }
  console.log('canvas:', JSON.stringify(r.cvs))
  await b.close()
})()
