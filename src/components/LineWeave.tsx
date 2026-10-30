/**
 * LineWeave — mesin garis MIRA di WebGL2 langsung.
 *
 * Alur (sama dengan bundle):
 *   <img mira-idle-v1.webp> → kanvas 573×687 (0,5×, seperti bundle `c=.5`) → getImageData
 *   → extractLines()            [lib/miraLines, port verbatim SN()]
 *   → buildWireMesh()           [lib/miraWire, port verbatim lF()]
 *   → shader wire 09-vert/10-frag  [VERBATIM dari GLSL final live, recon/shaders/mira-live]
 *
 * Semua uniform diset ke nilai TERUKUR dari live (tools/probe-mira-wire.js →
 * recon/mira-wire-draws.json) sehingga langkah ini bisa dibandingkan angka-per-angka:
 *   uHalfPx 8,2 · uCorePx 0,6 · uSoftLine/SoftSketch 3 · uGlowLine/GlowSketch 1
 *   uRest 0,15 (hum.lines.bright) · uSettle 1 · uHot 3,2 · uGain 0,95 · uIdle 0
 *   uPulse 0,7 · uPulseSpeed 1 · uSketchBright 1 · uFade 1 · uTaper 26 · uShockW 9
 *   uHz [575.292, 295.41, 22, 1] · uHzSkull [179.922, 274.8, 217.092]
 *   uHzInner [158.148, 302.28, 136.026] · uFace [575.292, 359.988, 112.308, 222.588]
 *   uFaceA [0,0,0,0] (diam) · uHeadPose [0,0,0,0] · uHeadPivot [571, 557, 23.28]
 *   modelViewMatrix terukur: skala 0,00293224, ty 1,7906214
 *
 * BELUM (langkah 3–8): ignition `lib/miraBuild` (uTime maju per titik), head turn nyata
 * (uHeadRows masih tekstur nol → garis datar), hair/picture/matter/field/bloom.
 */
import { useEffect, useRef, useState } from 'react'
import rawVert from '../lib/shaders/wire.vert.glsl?raw'
import rawFrag from '../lib/shaders/wire.frag.glsl?raw'
import { extractLines, type MiraPicture } from '../lib/miraLines'
import { buildHead } from '../lib/miraHead'
import { buildWireMesh, pictureToWire } from '../lib/miraWire'

/** nilai terukur dari live (1440×900, dpr 1) */
export const MEASURED = {
  halfPx: 8.2,
  corePx: 0.6,
  softLine: 3,
  softSketch: 3,
  glowLine: 1,
  glowSketch: 1,
  rest: 0.15,
  settle: 1,
  hot: 3.2,
  gain: 0.95,
  idle: 0,
  pulse: 0.7,
  pulseSpeed: 1,
  sketchBright: 1,
  fade: 1,
  taper: 26,
  shockW: 9,
  hz: [575.292, 295.41, 22, 1] as const,
  hzSkull: [179.922, 274.8, 217.092] as const,
  hzInner: [158.148, 302.28, 136.026] as const,
  face: [575.292, 359.988, 112.308, 222.588] as const,
  faceA: [0, 0, 0, 0] as const,
  faceSize: 1,
  headPivot: [571, 557, 23.28] as const,
  headPose: [0, 0, 0, 0] as const,
  scale: 0.002932240255177021,
  ty: 1.7906213998794556,
  fit: 0.9,
  fov: 50,
  camZ: 4.8,
}

const CAM_NEAR = 0.1
const CAM_FAR = 2000

/** matriks proyeksi perspektif (kolom-mayor), identik dengan three PerspectiveCamera */
function perspective(fovDeg: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360)
  const nf = 1 / (near - far)
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ])
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s)
    gl.deleteShader(s)
    throw new Error('wire shader: ' + log)
  }
  return s
}

export function LineWeave({
  onTrace,
  onError,
}: {
  onTrace?: (p: MiraPicture) => void
  onError?: (m: string) => void
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false })
    if (!gl) return onError?.('webgl2')

    let prog: WebGLProgram
    try {
      prog = gl.createProgram()!
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, rawVert))
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, rawFrag))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link')
    } catch (e) {
      onError?.(String(e).slice(0, 300))
      return
    }
    gl.useProgram(prog)

    const img = new Image()
    img.src = '/humanoid/mira-idle-v1.webp'
    img.onerror = () => onError?.('asset')
    const run = () => {
      if (!img.width) return setReady(true)
      const s = 0.5
      const cv = document.createElement('canvas')
      cv.width = Math.round(img.width * s)
      cv.height = Math.round(img.height * s)
      const g2 = cv.getContext('2d', { willReadFrequently: true })!
      g2.drawImage(img, 0, 0, cv.width, cv.height)
      const tTrace = performance.now()
      const pic = extractLines(g2.getImageData(0, 0, cv.width, cv.height), { scale: s })
      const dt = Math.round(performance.now() - tTrace)
      // pesan ini SAMA PERSIS dengan yang dicetak live — dipakai sebagai gerbang teks
      console.log(
        `[mira] humanoid: traced ${pic.counts.outline} outline + ${pic.counts.inner} inner lines (${pic.counts.white} white / ${pic.counts.violet} violet / ${pic.counts.gold} gold), ${pic.counts.dust} dust grains in ${dt} ms`
      )
      onTrace?.(pic)
      setReady(true)

      // waktu, warna, dan id per garis dihitung PERSIS seperti FN() di bundle
      const wire = pictureToWire(pic)
      const mesh = buildWireMesh(wire)
      ;(window as any).__MIRA_WIRE = { indexCount: mesh.indexCount, vertexCount: mesh.vertexCount, lines: pic.lines.length }

      const vao = gl.createVertexArray()!
      gl.bindVertexArray(vao)
      const attr = (name: string, data: Float32Array, size: number) => {
        const loc = gl.getAttribLocation(prog, name)
        if (loc < 0) return
        const b = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, b)
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
      }
      attr('position', mesh.position, 3)
      attr('aDir', mesh.aDir, 3)
      attr('uv', mesh.uv, 2)
      attr('aT', mesh.aT, 1)
      attr('aCol', mesh.aCol, 3)
      attr('aS', mesh.aS, 1)
      attr('aLen', mesh.aLen, 1)
      attr('aId', mesh.aId, 1)
      attr('aSketch', mesh.aSketch, 1)
      attr('aEnd', mesh.aEnd, 1)
      attr('aF', mesh.aF, 1)
      const ibo = gl.createBuffer()!
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.index, gl.STATIC_DRAW)

      // ---- kepala: mask gambar ukuran EKSTRAKSI (1146×1374, bukan 1145×1374 asli) ----
      // Bundle: kanvas px.width = SN.width, px.height = SN.height lalu drawImage(img,0,0,width,height)
      // → gambar 1145 diperlebar 1 px. Itu yang membuat cx/hw live bergeser ~0,5 px dari gambar asli.
      const fw = pic.width
      const fh = pic.height
      const fc = document.createElement('canvas')
      fc.width = fw
      fc.height = fh
      const fg = fc.getContext('2d', { willReadFrequently: true })!
      fg.drawImage(img, 0, 0, fw, fh)
      const head = buildHead(fg.getImageData(0, 0, fw, fh).data, fw, fh)
      ;(window as any).__MIRA_ROWS = head.rows
      ;(window as any).__MIRA_HEAD = { pivot: head.model.pivot, neckY: head.model.neckY, neckW: head.model.neckW, H: fh }

      const rowsTex = gl.createTexture()!
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, rowsTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, fh, 0, gl.RGBA, gl.FLOAT, head.rows)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      const U = (n: string) => gl.getUniformLocation(prog, n)
      const M = MEASURED
      let raf = 0
      const t0 = performance.now()
      const draw = () => {
        raf = requestAnimationFrame(draw)
        const w = canvas.clientWidth || 1
        const h = canvas.clientHeight || 1
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
        const pw = Math.max(1, Math.round(w * dpr))
        const ph = Math.max(1, Math.round(h * dpr))
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width = pw
          canvas.height = ph
        }
        gl.viewport(0, 0, pw, ph)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        const t = (performance.now() - t0) / 1000
        gl.uniformMatrix4fv(U('projectionMatrix'), false, perspective(M.fov, pw / ph, CAM_NEAR, CAM_FAR))
        gl.uniformMatrix4fv(U('modelViewMatrix'), false, new Float32Array([
          M.scale, 0, 0, 0,
          0, -M.scale, 0, 0,
          0, 0, 1, 0,
          -(pic.width / 2) * M.scale, M.ty, -M.camZ, 1,
        ]))
        gl.uniform1i(U('uHeadRows'), 0)
        gl.uniform1f(U('uTime'), t)
        // uRes = ukuran kanvas (dipakai untuk lebar strip dalam piksel) — sama dengan live
        gl.uniform2f(U('uRes'), pw, ph)
        // ketebalan: uCorePx = .6·dpr, uHalfPx = core + soft·2.2 + 1 (rumus terukur dari live)
        const glow = M.rest === 0 ? 0 : 1 // hum.lines.glow default 1
        const core = 0.6 * dpr
        const soft = glow * 3 * dpr
        gl.uniform1f(U('uCorePx'), core)
        gl.uniform1f(U('uSoftLine'), soft)
        gl.uniform1f(U('uSoftSketch'), soft)
        gl.uniform1f(U('uGlowLine'), glow)
        gl.uniform1f(U('uGlowSketch'), glow)
        gl.uniform1f(U('uHalfPx'), core + soft * 2.2 + 1)
        gl.uniform1f(U('uRest'), M.rest)
        gl.uniform1f(U('uSettle'), M.settle)
        gl.uniform1f(U('uHot'), M.hot)
        gl.uniform1f(U('uGain'), M.gain)
        gl.uniform1f(U('uIdle'), M.idle)
        gl.uniform1f(U('uPulse'), M.pulse)
        gl.uniform1f(U('uPulseSpeed'), M.pulseSpeed)
        gl.uniform1f(U('uSketchBright'), M.sketchBright)
        gl.uniform1f(U('uFade'), M.fade)
        gl.uniform1f(U('uTaper'), M.taper)
        gl.uniform1f(U('uLiveT'), t)
        gl.uniform4f(U('uShock'), 574, 1008, 0, 0)
        gl.uniform1f(U('uShockW'), M.shockW)
        gl.uniform4f(U('uHz'), M.hz[0], M.hz[1], M.hz[2], M.hz[3])
        gl.uniform3f(U('uHzSkull'), M.hzSkull[0], M.hzSkull[1], M.hzSkull[2])
        gl.uniform3f(U('uHzInner'), M.hzInner[0], M.hzInner[1], M.hzInner[2])
        gl.uniform4f(U('uFace'), M.face[0], M.face[1], M.face[2], M.face[3])
        gl.uniform4f(U('uFaceA'), 0, 0, 0, 0)
        gl.uniform1f(U('uFaceSize'), M.faceSize)
        gl.uniform4f(U('uHeadPose'), 0, 0, 0, 0)
        gl.uniform3f(U('uHeadPivot'), head.model.pivot[0], head.model.pivot[1], head.model.pivot[2])
        gl.uniform1f(U('uHeadH'), fh)

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE) // additive (bundle: ...vr di material wire)
        gl.disable(gl.DEPTH_TEST)
        gl.bindVertexArray(vao)
        gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_INT, 0)
      }
      draw()
    }
    if (img.complete) run()
    else img.onload = run
    return () => {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={ref}
      data-testid="mira-line-weave"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
    />
  )
}
