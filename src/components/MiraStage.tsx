/**
 * MiraStage — satu kanvas WebGL2, semua lapisan MIRA digambar dengan shader VERBATIM dari live.
 *
 * Urutan gambar = urutan live (inventaris: recon/mira-draw-inventory.json):
 *   [0] sprite cahaya latar (5,04)            sprite.vert/frag
 *   [16] sprite kabut (3,02)                  sprite.vert/frag
 *   [2] kuad ISI gambar (alpha)               quad.vert + picFill.frag   blend (ZERO, 1-SRC_ALPHA)
 *   [3] kuad WARNA gambar                     quad.vert + picColor.frag  blend (ONE, ONE)
 *   [4] awan titik gambar (103.367 titik)     pts.vert + pts.frag        (uOn = 0 saat idle)
 *   [5] garis (22.248 indeks)                 wire.vert + wire.frag      blend (ONE, ONE)
 *
 * Semua uniform diisi nilai TERUKUR (recon/mira-draw-inventory.json). Geometri yang sudah
 * diverifikasi byte-identik dengan live: garis (12/12 buffer), rowTexture kepala (4/4 kanal),
 * awan titik (aRest/aKind/aZ) — lihat recon/verify-mira-*.mjs.
 *
 * Bloom (langkah 8) memakai shader postprocessing yang SAMA dengan live (17/18 luminansi,
 * 19/20 downsample 12-tap, 21/22 upsample 9-tap, 23/24 komposit): threshold 0,6 · smoothing 0,9 ·
 * radius 0,62 · intensitas 0,9 — nilai `hum.glow.*` yang terukur di live.
 *
 * BELUM (langkah 2 lanjutan): materi 54.492 titik, busur inti/mahkota, gambar rambut + 2 lapis
 * helai rambut, orb, percikan. Jam build (langkah 3) belum ada: uTime dimulai pada 60 s supaya
 * fase ignition sudah lewat dan semua lapisan terlihat.
 */
import { useEffect, useRef } from 'react'
import wireVert from '../lib/shaders/wire.vert.glsl?raw'
import wireFrag from '../lib/shaders/wire.frag.glsl?raw'
import quadVert from '../lib/shaders/quad.vert.glsl?raw'
import picFillFrag from '../lib/shaders/picFill.frag.glsl?raw'
import picColorFrag from '../lib/shaders/picColor.frag.glsl?raw'
import ptsVert from '../lib/shaders/pts.vert.glsl?raw'
import ptsFrag from '../lib/shaders/pts.frag.glsl?raw'
import fieldVert from '../lib/shaders/field.vert.glsl?raw'
import matterVert from '../lib/shaders/matter.vert.glsl?raw'
import matterFrag from '../lib/shaders/matter.frag.glsl?raw'
import arcsVert from '../lib/shaders/arcs.vert.glsl?raw'
import arcsFrag from '../lib/shaders/arcs.frag.glsl?raw'
import strandsVert from '../lib/shaders/strands.vert.glsl?raw'
import strandsFrag from '../lib/shaders/strands.frag.glsl?raw'
import twinklesVert from '../lib/shaders/twinkles.vert.glsl?raw'
import twinklesFrag from '../lib/shaders/twinkles.frag.glsl?raw'
import wavesVert from '../lib/shaders/waves.vert.glsl?raw'
import wavesFrag from '../lib/shaders/waves.frag.glsl?raw'
import wavesparkVert from '../lib/shaders/wavespark.vert.glsl?raw'
import wavesparkFrag from '../lib/shaders/wavespark.frag.glsl?raw'
import hairVert from '../lib/shaders/hair.vert.glsl?raw'
import hairFrag from '../lib/shaders/hair.frag.glsl?raw'
import hpVert from '../lib/shaders/hp.vert.glsl?raw'
import hpFrag from '../lib/shaders/hp.frag.glsl?raw'
import downVert from '../lib/shaders/down.vert.glsl?raw'
import downFrag from '../lib/shaders/down.frag.glsl?raw'
import upVert from '../lib/shaders/up.vert.glsl?raw'
import upFrag from '../lib/shaders/up.frag.glsl?raw'
import compVert from '../lib/shaders/comp.vert.glsl?raw'
import compFrag from '../lib/shaders/comp.frag.glsl?raw'
import blitVert from '../lib/shaders/blit.vert.glsl?raw'
import blitFrag from '../lib/shaders/blit.frag.glsl?raw'
import fieldFrag from '../lib/shaders/field.frag.glsl?raw'
import spriteVert from '../lib/shaders/sprite.vert.glsl?raw'
import spriteFrag from '../lib/shaders/sprite.frag.glsl?raw'
import { extractLines } from '../lib/miraLines'
import { buildHead } from '../lib/miraHead'
import { buildPicturePoints, quadGeometry, spriteGeometry } from '../lib/miraPicture'
import { buildWireMesh, pictureToWire } from '../lib/miraWire'
import { buildMatter, nw } from '../lib/miraMatter'
import { mulberry32 } from '../lib/miraTimeline'
import { AN, EN, TN, strandGeometry } from '../lib/miraHair'
import { buildWaveRibbons, buildWaveSparks, carveRibbon, updateWaveSparks } from '../lib/miraWaves'

/** skala dunia per piksel gambar (modelViewMatrix live, terbaca dari buffer) */
const S = 0.002932240255177021
const TX = 0.002932240255177021
const TY = 1.7906213998794556
const QUAD_TY = -0.22382767498493195
const FOV = 50
const NEAR = 0.1
const FAR = 2000
/** jam: mulai setelah ignition (6,55 s) supaya semua lapisan tampak (langkah 3 akan menggantinya) */
const CLOCK0 = 60

/** `?off=garis,gambar` — parameter live yang sama (`?off=`), dipakai untuk memisahkan lapisan saat membandingkan. */
const OFF = (() => {
  try {
    const v = new URLSearchParams(window.location.search).get('off')
    return new Set(v ? v.split(',').map((x) => x.trim()) : [])
  } catch {
    return new Set<string>()
  }
})()

const PREFIX_GLOW = [
  [0, 'rgba(255,255,255,1)'],
  [0.25, 'rgba(230,205,255,0.55)'],
  [1, 'rgba(140,80,255,0)'],
] as const
const PREFIX_SMOKE = [
  [0, 'rgba(200,150,255,0.8)'],
  [0.3, 'rgba(150,80,255,0.32)'],
  [0.65, 'rgba(110,50,230,0.08)'],
  [1, 'rgba(90,30,200,0)'],
] as const

function radialTexture(gl: WebGL2RenderingContext, stops: readonly (readonly [number, string])[]) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  for (const [at, col] of stops) grd.addColorStop(at, col)
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  const t = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return t
}

function compile(gl: WebGL2RenderingContext, type: number, src: string, tag: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s) || ''
    gl.deleteShader(s)
    throw new Error(`${tag}: ${log.slice(0, 400)}`)
  }
  return s
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string, tag: string) {
  const p = gl.createProgram()!
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs, tag + '.vert'))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs, tag + '.frag'))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`${tag} link: ${(gl.getProgramInfoLog(p) || '').slice(0, 400)}`)
  return p
}

function perspective(fovDeg: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360)
  const nf = 1 / (near - far)
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
}

export function MiraStage({ onTrace, onError }: { onTrace?: (m: string) => void; onError?: (m: string) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let dead = false
    let raf = 0
    const img = new Image()
    img.decoding = 'async'
    img.src = '/humanoid/mira-idle-v1.webp'
    img.onerror = () => onError?.('asset')
    const hairImg = new Image()      // citra rambut (kursi materi hairSeats + tekstur kuad rambut)
    hairImg.decoding = 'async'
    hairImg.src = '/humanoid/mira-hair-v1.webp'
    hairImg.onerror = () => onError?.('asset-hair')

    const run = () => {
      if (dead || !img.width) return
      // three.js WebGLRenderer default: alpha true + premultipliedAlpha true. Dengan false, warna additive di
      // piksel yang alpha-nya ~0 (tepi siluet) tetap tampil sebagai pinggiran magenta/merah — cacat yang hilang
      // setelah flag ini disamakan dengan live.
      // kanvas ini sudah opaque (latar medan mengisi seluruh layar), jadi alpha dimatikan: warna additive di piksel
      // ber-alpha rendah tidak lagi tampil sebagai pinggiran magenta/merah saat dikomposit ke halaman.
      const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, premultipliedAlpha: true })
      if (!gl) return onError?.('webgl2')
      ;(window as any).__MIRA_GL = gl

      // ---------- 1. gambar → garis + model kepala + awan titik ----------
      const t0 = performance.now()
      const s = 0.5
      const cv = document.createElement('canvas')
      cv.width = Math.round(img.width * s)
      cv.height = Math.round(img.height * s)
      const g2 = cv.getContext('2d', { willReadFrequently: true })!
      g2.drawImage(img, 0, 0, cv.width, cv.height)
      const pic = extractLines(g2.getImageData(0, 0, cv.width, cv.height), { scale: s })

      // mask kepala: kanvas selebar SN.width (1146), gambar 1145 diperlebar (lihat REBUILD-LOG F-59)
      const fw = pic.width
      const fh = pic.height
      const fc = document.createElement('canvas')
      fc.width = fw
      fc.height = fh
      const fg = fc.getContext('2d', { willReadFrequently: true })!
      fg.drawImage(img, 0, 0, fw, fh)
      const maskPx = fg.getImageData(0, 0, fw, fh).data
      const head = buildHead(maskPx, fw, fh)
      const pts = buildPicturePoints(maskPx, head.model, fw, fh)

      // materi + busur + timeline build (port Nw/FN): kursi dari citra + kursi rambut, PRNG Ud(7·31+1) & Ud(7)
      const hairPx = (() => {
        if (!hairImg.width) return { px: new Uint8ClampedArray(0), w: 1385, h: 1422 }
        const hc = document.createElement('canvas')
        hc.width = 1385
        hc.height = 1422
        const hg = hc.getContext('2d', { willReadFrequently: true })!
        hg.drawImage(hairImg, 0, 0)
        return { px: hg.getImageData(0, 0, 1385, 1422).data, w: 1385, h: 1422 }
      })()
      const seatRnd = mulberry32(7 * 31 + 1)
      const seats = nw(maskPx, fw, fh, 36000, seatRnd)
      const hairSeats = nw(hairPx.px, hairPx.w, hairPx.h, 14000, seatRnd, { minLum: 0.12, dx: -120, dy: -48 })
      const matter = buildMatter(pic, seats.concat(hairSeats), 7)

      // pita `waves`: 3 pita melintasi pemandangan (Qy=3) + 168 percikan (56/pita)
      const waveRibbons = buildWaveRibbons()
      const waveSparks = buildWaveSparks()
      for (let i = 0; i < waveRibbons.length; i++) carveRibbon(waveRibbons[i], 0, 1.6)

      // helai rambut: lacak dari citra setengah resolusi (EN/AN), lalu tekstur still+lifted (TN)
      const tHair = performance.now()
      const hairHalf = (() => {
        const hc = document.createElement('canvas')
        hc.width = Math.round(1385 / 2)
        hc.height = Math.round(1422 / 2)
        hc.getContext('2d', { willReadFrequently: true })!.drawImage(hairImg, 0, 0, hc.width, hc.height)
        return hc.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, hc.width, hc.height)
      })()
      const allStrands = EN(hairHalf, { scale: 0.5, fromY: (0.18 * (1422 - 48) + 48) / 1422 })
      const strandUse = allStrands.slice(0, 60)
      const twinklesPx = AN(hairHalf, { scale: 0.5 })
      const hairTex = TN(hairPx.px, 1385, 1422, strandUse)
      const strandMesh = strandGeometry(strandUse, 3.5)
      console.log(
        `[mira] humanoid: ${allStrands.length} strands can move, ${twinklesPx.length} twinkles in ${Math.round(performance.now() - tHair)} ms`
      )
      const dt = Math.round(performance.now() - t0)
      const msg = `[mira] humanoid: traced ${pic.counts.outline} outline + ${pic.counts.inner} inner lines (${pic.counts.white} white / ${pic.counts.violet} violet / ${pic.counts.gold} gold), ${pic.counts.dust} dust grains in ${dt} ms`
      console.log(msg)
      onTrace?.(msg)
      ;(window as any).__MIRA_ROWS = head.rows
      ;(window as any).__MIRA_HEAD = { pivot: head.model.pivot, H: fh, base: head.model.base, chin: head.model.chin }
      ;(window as any).__MIRA_POINTS = pts
      ;(window as any).__MIRA_WIRE = { lines: pic.lines.length, indexCount: 0 }

      // ---------- 2. program & geometri ----------
      let P: Record<string, WebGLProgram>
      try {
        P = {
          wire: program(gl, wireVert, wireFrag, 'wire'),
          fill: program(gl, quadVert, picFillFrag, 'fill'),
          pic: program(gl, quadVert, picColorFrag, 'pic'),
          points: program(gl, ptsVert, ptsFrag, 'points'),
          sprite: program(gl, spriteVert, spriteFrag, 'sprite'),
          field: program(gl, fieldVert, fieldFrag, 'field'),
          blit: program(gl, blitVert, blitFrag, 'blit'),
          hair: program(gl, hairVert, hairFrag, 'hair'),
          matter: program(gl, matterVert, matterFrag, 'matter'),
          waves: program(gl, wavesVert, wavesFrag, 'waves'),
          wavespark: program(gl, wavesparkVert, wavesparkFrag, 'wavespark'),
          strands: program(gl, strandsVert, strandsFrag, 'strands'),
          twinkles: program(gl, twinklesVert, twinklesFrag, 'twinkles'),
          arcs: program(gl, arcsVert, arcsFrag, 'arcs'),
          hp: program(gl, hpVert, hpFrag, 'hp'),
          down: program(gl, downVert, downFrag, 'down'),
          up: program(gl, upVert, upFrag, 'up'),
          comp: program(gl, compVert, compFrag, 'comp'),
        }
      } catch (e) {
        return onError?.(String(e).slice(0, 400))
      }

      const vao = (attrs: [string, Float32Array, number][], index?: Uint32Array | Uint16Array) => {
        const v = gl.createVertexArray()!
        gl.bindVertexArray(v)
        for (const [name, data, size] of attrs) {
          const loc = gl.getAttribLocation(progNow!, name)
          if (loc < 0) continue
          const b = gl.createBuffer()!
          gl.bindBuffer(gl.ARRAY_BUFFER, b)
          gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
          gl.enableVertexAttribArray(loc)
          gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
        }
        let count = 0
        if (index) {
          const ib = gl.createBuffer()!
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW)
          count = index.length
        }
        gl.bindVertexArray(null)
        return { v, count }
      }
      // vao() butuh program aktif untuk mencari lokasi atribut
      let progNow: WebGLProgram | null = null
      const mk = (p: WebGLProgram | null, attrs: [string, Float32Array, number][], index?: Uint32Array | Uint16Array) => {
        progNow = p
        const r = vao(attrs, index)
        progNow = null
        return r
      }

      // latar: medan nebula dirender ke FBO beresolusi kerja 0,7 (terukur 1007×630) lalu di-blit
      // ke kanvas figur dengan penyaring LINEAR — persis alur live (kanvas latar terpisah 0,7).
      const fieldVao = mk(P.field, [['a', new Float32Array([-1, -1, 3, -1, -1, 3]), 2]])
      const blitVao = mk(P.blit, [['a', new Float32Array([-1, -1, 3, -1, -1, 3]), 2]])
      const fieldTex = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, fieldTex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      const fieldFbo = gl.createFramebuffer()!

      // materi: 54.492 titik (position dihitung di shader; atribut kursi/waktu dari buildMatter)
      const mp = matter.particles
      const matterVao = mk(P.matter, [
        ['position', Float32Array.from(mp.flatMap((q) => [q.seat[0], q.seat[1], 0])), 3],
        ['aCol', Float32Array.from(mp.flatMap((p) => p.col)), 3],
        ['aTArr', Float32Array.from(mp.map((p) => p.tArr)), 1],
        ['aFly', Float32Array.from(mp.map((p) => p.fly)), 1],
        ['aTurns', Float32Array.from(mp.map((p) => p.turns)), 1],
        ['aSeed', Float32Array.from(mp.map((p) => p.seed)), 1],
        ['aStay', Float32Array.from(mp.map((p) => p.stay)), 1],
        ['aTRev', Float32Array.from(mp.map((p) => p.tRev)), 1],
      ])

      // busur inti & mahkota: tiap segmen → 2 verteks (posisi, aU, aW, aT, aCol, aStr)
      const arcPos: number[] = []
      const arcU: number[] = []
      const arcW: number[] = []
      const arcT: number[] = []
      const arcCol: number[] = []
      const arcStr: number[] = []
      for (const a of matter.arcs) {
        for (const [x0, y0, x1, y1, t, w] of a.segs) {
          arcPos.push(x0, y0, 0, x1, y1, 0)
          arcU.push(t, t)
          arcW.push(w, w)
          arcT.push(a.t, a.t)
          arcCol.push(a.color[0], a.color[1], a.color[2], a.color[0], a.color[1], a.color[2])
          arcStr.push(a.strength, a.strength)
        }
      }
      const arcsVao = mk(P.arcs, [
        ['position', Float32Array.from(arcPos), 3],
        ['aU', Float32Array.from(arcU), 1],
        ['aW', Float32Array.from(arcW), 1],
        ['aT', Float32Array.from(arcT), 1],
        ['aCol', Float32Array.from(arcCol), 3],
        ['aStr', Float32Array.from(arcStr), 1],
      ])
      ;(window as any).__MIRA_MATTER = { particles: mp.length, arcs: matter.arcs.length, segs: arcPos.length / 6 }

      // rambut: satu kuad selebar citra rambut (1385×1422 = uSize live), posisi = piksel citra
      const HW = 1385
      const HH = 1422
      const hairQuad = {
        position: new Float32Array([0, 0, 0, HW, 0, 0, 0, HH, 0, HW, HH, 0]),
        index: new Uint16Array([0, 2, 1, 2, 3, 1]),
      }
      const hairVao = mk(P.hair, [['position', hairQuad.position, 3]], hairQuad.index)

      // helai rambut: pita 2 verteks/titik (32.382 indeks live)
      // pita & percikan: posisi diperbarui tiap frame (DYNAMIC_DRAW)
      const waveVaos = waveRibbons.map((r) => {
        progNow = P.waves
        const v = gl.createVertexArray()!
        gl.bindVertexArray(v)
        const pb = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, pb)
        gl.bufferData(gl.ARRAY_BUFFER, r.position, gl.DYNAMIC_DRAW)
        const pl = gl.getAttribLocation(P.waves, 'position')
        gl.enableVertexAttribArray(pl)
        gl.vertexAttribPointer(pl, 3, gl.FLOAT, false, 0, 0)
        const ub = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, ub)
        gl.bufferData(gl.ARRAY_BUFFER, r.uv, gl.STATIC_DRAW)
        const ul = gl.getAttribLocation(P.waves, 'uv')
        gl.enableVertexAttribArray(ul)
        gl.vertexAttribPointer(ul, 2, gl.FLOAT, false, 0, 0)
        const ib = gl.createBuffer()!
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, r.index, gl.STATIC_DRAW)
        gl.bindVertexArray(null)
        progNow = null
        return { v, pb, count: r.index.length }
      })
      const sparksVao = (() => {
        progNow = P.wavespark
        const v = gl.createVertexArray()!
        gl.bindVertexArray(v)
        const pb = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, pb)
        gl.bufferData(gl.ARRAY_BUFFER, waveSparks.position, gl.DYNAMIC_DRAW)
        const pl = gl.getAttribLocation(P.wavespark, 'position')
        gl.enableVertexAttribArray(pl)
        gl.vertexAttribPointer(pl, 3, gl.FLOAT, false, 0, 0)
        for (const [name, data, size] of [['aPhase', waveSparks.aPhase, 1], ['aSize', waveSparks.aSize, 1]] as [string, Float32Array, number][]) {
          const loc = gl.getAttribLocation(P.wavespark, name)
          if (loc < 0) continue
          const b = gl.createBuffer()!
          gl.bindBuffer(gl.ARRAY_BUFFER, b)
          gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
          gl.enableVertexAttribArray(loc)
          gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
        }
        gl.bindVertexArray(null)
        progNow = null
        return { v, pb }
      })()
      let waveClock = 0
      ;(window as any).__MIRA_WAVES = { ribbons: waveRibbons.length, segs: waveRibbons[0].index.length / 6, sparks: waveSparks.n }

      const strandsVao = mk(P.strands, [
        ['position', strandMesh.position, 3],
        ['aRest', strandMesh.aRest, 2],
        ['aS', strandMesh.aS, 1],
        ['aSeed', strandMesh.aSeed, 1],
        ['aLen', strandMesh.aLen, 1],
      ], strandMesh.index)
      ;(window as any).__MIRA_STRANDS = { strands: allStrands.length, used: strandUse.length, verts: strandMesh.verts, tris: strandMesh.index.length / 3, twinkles: twinklesPx.length }

      // bintik rambut: satu titik per twinkle (aCol + aTw)
      const twPos = new Float32Array(twinklesPx.length * 3)
      const twCol = new Float32Array(twinklesPx.length * 3)
      const twTw = new Float32Array(twinklesPx.length)
      twinklesPx.forEach((tw, i) => {
        twPos[i * 3] = tw[0]
        twPos[i * 3 + 1] = tw[1]
        twCol[i * 3] = tw[2]
        twCol[i * 3 + 1] = tw[3]
        twCol[i * 3 + 2] = tw[4]
        twTw[i] = ((i * 0.6180339) % 1 + 1) % 1
      })
      const twinklesVao = mk(P.twinkles, [
        ['position', twPos, 3],
        ['aCol', twCol, 3],
        ['aTw', twTw, 1],
      ])

      // gambar
      const quad = quadGeometry(fw, fh)
      const fillVao = mk(P.fill, [['position', quad.position, 3], ['uv', quad.uv, 2]], quad.index)
      const picVao = mk(P.pic, [['position', quad.position, 3], ['uv', quad.uv, 2]], quad.index)

      // awan titik
      const ptsVao = mk(P.points, [
        ['position', new Float32Array(pts.count * 3), 3],
        ['aRest', pts.aRest, 2],
        ['aKind', pts.aKind, 1],
        ['aZ', pts.aZ, 1],
      ])
      ;(window as any).__MIRA_WIRE.indexCount = pts.count

      // garis
      const mesh = buildWireMesh(pictureToWire(pic))
      const wireVao = mk(P.wire, [
        ['position', mesh.position, 3], ['aDir', mesh.aDir, 3], ['uv', mesh.uv, 2],
        ['aT', mesh.aT, 1], ['aCol', mesh.aCol, 3], ['aS', mesh.aS, 1], ['aLen', mesh.aLen, 1],
        ['aId', mesh.aId, 1], ['aSketch', mesh.aSketch, 1], ['aEnd', mesh.aEnd, 1], ['aF', mesh.aF, 1],
      ], mesh.index)

      // sprite (posisi+uv interleaved, stride 20)
      const sp = spriteGeometry()
      const spriteVaoFor = (p: WebGLProgram) => {
        const v = gl.createVertexArray()!
        gl.bindVertexArray(v)
        const b = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, b)
        gl.bufferData(gl.ARRAY_BUFFER, sp.interleaved, gl.STATIC_DRAW)
        for (const [name, size, off] of [['position', 3, 0], ['uv', 2, 12]] as [string, number, number][]) {
          const loc = gl.getAttribLocation(p, name)
          if (loc < 0) continue
          gl.enableVertexAttribArray(loc)
          gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 20, off)
        }
        const ib = gl.createBuffer()!
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sp.index, gl.STATIC_DRAW)
        gl.bindVertexArray(null)
        return v
      }
      const spriteVao = spriteVaoFor(P.sprite)

      // ---------- 3. tekstur ----------
      const texPic = gl.createTexture()!          // gambar (uMap) — 1145×1374 seperti live
      gl.bindTexture(gl.TEXTURE_2D, texPic)
      // three.js mengunggah gambar dengan UNPACK_FLIP_Y_WEBGL = true (default Texture.flipY); tanpa ini
      // gambarnya terbalik vertikal vs garis/kepala.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      // live memakai tekstur SRGB8_ALPHA8 (terukur dari texStorage2D: format 35907) → GPU mendekode sRGB→linear
      // premultiply: webp ini menyimpan warna terang (sampai 255) di piksel alpha < 40 (64.335 piksel).
      // Dengan blend ONE/ONE warna itu muncul sebagai pinggiran magenta/merah; live tidak menampilkannya.
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      const texRows = gl.createTexture()!         // rowTexture kepala 1×H RGBA32F
      gl.bindTexture(gl.TEXTURE_2D, texRows)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, fh, 0, gl.RGBA, gl.FLOAT, head.rows)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      // ---------- render target + rantai mip bloom ----------
      // postprocessing BloomEffect: renderTarget RGBA16F penuh, lalu 8 level mulai dari 0,5 resolusi
      const hdr = !!gl.getExtension('EXT_color_buffer_float')
      const RT_FMT = hdr ? gl.RGBA16F : gl.RGBA8
      const RT_TYPE = hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE
      const mkTarget = (w: number, h: number) => {
        const tex = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, RT_FMT, w, h, 0, gl.RGBA, RT_TYPE, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        const fbo = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        return { tex, fbo, w, h }
      }
      let figure = mkTarget(1, 1)
      const LEVELS = 8
      let mips: ReturnType<typeof mkTarget>[] = []
      let ups: ReturnType<typeof mkTarget>[] = []
      let chainFor = ''
      const ensureChain = (cw: number, ch: number) => {
        const key = `${cw}x${ch}`
        if (chainFor === key) return
        chainFor = key
        if (figure.w !== cw || figure.h !== ch) figure = mkTarget(cw, ch)
        mips = []
        ups = []
        let w = Math.max(1, Math.round(cw * 0.5))   // resolutionScale 0,5 (terukur: 720×450)
        let h = Math.max(1, Math.round(ch * 0.5))
        for (let i = 0; i < LEVELS; i++) {
          mips.push(mkTarget(w, h))
          ups.push(mkTarget(w, h))
          w = Math.max(1, Math.round(w * 0.5))
          h = Math.max(1, Math.round(h * 0.5))
        }
      }
      // kuad layar penuh untuk pass bloom (posisi ±1, uv dihitung di vertex shader)
      const fullVao = (p: WebGLProgram) => {
        const v = gl.createVertexArray()!
        gl.bindVertexArray(v)
        const b = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, b)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), gl.STATIC_DRAW)
        const loc = gl.getAttribLocation(p, 'position')
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0)
        gl.bindVertexArray(null)
        return v
      }
      const hpVaoF = fullVao(P.hp)
      const downVaoF = fullVao(P.down)
      const upVaoF = fullVao(P.up)
      const compVaoF = fullVao(P.comp)

      const texHair = gl.createTexture()!     // citra rambut 1385×1422 (uSize live)
      {
        {
          gl.bindTexture(gl.TEXTURE_2D, texHair)
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)   // shader memakai uv = posisi/uSize (y turun)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, hairImg)
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
          gl.generateMipmap(gl.TEXTURE_2D)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        }
      }

      // tekstur helai: lifted (dipakai strands) & still (dipakai kuad tetap bila perlu)
      const texLifted = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, texLifted)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, 1385, 1422, 0, gl.RGBA, gl.UNSIGNED_BYTE, hairTex.lifted)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)

      const texGlow = radialTexture(gl, PREFIX_GLOW)
      const texSmoke = radialTexture(gl, PREFIX_SMOKE)

      // ---------- 4. uniform tetap (terukur) ----------
      const star = pic.star
      const reveal = [star.x, star.y, 6.55, fh]
      const hz = [575.2919921875, 295.4100036621094, 22, 1]
      const hzSkull = [179.9219970703125, 274.79998779296875, 217.0919952392578]
      const hzInner = [158.1479949951172, 302.2799987792969, 136.0260009765625]
      const face = [575.2919921875, 359.9880065917969, 112.30799865722656, 222.58799743652344]
      const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n)

      const mvQuad = new Float32Array([S, 0, 0, 0, 0, S, 0, 0, 0, 0, 1, 0, 0, QUAD_TY, -4.8, 1])
      const mvPoints = new Float32Array([S, 0, 0, 0, 0, -S, 0, 0, 0, 0, 1, 0, -1.680173635482788, TY, -4.8, 1])

      // live: dt = min(0,05 s, dt asli) → jam build ikut lambat bila fps rendah (terukur: ~0,1 s/s di SwiftShader)
      let clockT = 0
      let lastNow = performance.now()
      // `?t=` = jam dibekukan (sama seperti live: `pinTime`), supaya frame bisa dibandingkan fase-per-fase
      const pin = (() => {
        try {
          const v = new URLSearchParams(window.location.search).get('t')
          return v === null ? null : Number(v)
        } catch {
          return null
        }
      })()
      const tick = () => {
        if (pin !== null && Number.isFinite(pin)) return pin
        const now = performance.now()
        clockT += Math.min(0.05, (now - lastNow) / 1000)
        lastNow = now
        return clockT
      }

      ;(window as any).__MIRA_ERR = null
      const draw = () => {
        if (dead) return
        raf = requestAnimationFrame(draw)
        try {
        ;(window as any).__MIRA_FRAMES = ((window as any).__MIRA_FRAMES || 0) + 1
        const cw = canvas.clientWidth || 1
        const ch = canvas.clientHeight || 1
        // live: kanvas FIGUR penuh (1440×900 di jendela 1440×900, dpr 1); medan nebula punya kanvas
        // sendiri beresolusi kerja 0,7 (lihat REBUILD-LOG F-66)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const pw = Math.max(1, Math.round(cw * dpr))
        const ph = Math.max(1, Math.round(ch * dpr))
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width = pw
          canvas.height = ph
        }
        ensureChain(pw, ph)
        gl.bindFramebuffer(gl.FRAMEBUFFER, figure.fbo)
        gl.viewport(0, 0, pw, ph)
        gl.clearColor((window as any).__MIRA_RED ? 1 : 0, (window as any).__MIRA_RED ? 0 : 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        const t = tick()
        const proj = perspective(FOV, pw / ph, NEAR, FAR)
        gl.disable(gl.DEPTH_TEST)

        // ---- latar: 01-frag ke FBO 0,7 lalu blit (opaque, tanpa blend) ----
        const fw2 = Math.max(1, Math.round(cw * 0.7))
        const fh2 = Math.max(1, Math.round(ch * 0.7))
        if (!OFF.has('field')) {
          gl.bindTexture(gl.TEXTURE_2D, fieldTex)
          if ((fieldTex as any).__w !== fw2 || (fieldTex as any).__h !== fh2) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, fw2, fh2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
            ;(fieldTex as any).__w = fw2
            ;(fieldTex as any).__h = fh2
          }
          gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFbo)
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0)
          gl.viewport(0, 0, fw2, fh2)
          gl.disable(gl.BLEND)
          gl.disable(gl.DEPTH_TEST)
          gl.useProgram(P.field)
          gl.bindVertexArray(fieldVao.v)
          gl.uniform2f(U(P.field, 'iRes'), fw2, fh2)
          gl.uniform1f(U(P.field, 'iTime'), t)
          gl.uniform1f(U(P.field, 'iField'), 1)        // terukur: ramp 0→1 dalam 0,35 s lalu tetap 1
          gl.uniform1f(U(P.field, 'iMatter'), 1)
          gl.uniform2f(U(P.field, 'iCenter'), 0.5009382963180542, 0.6912000179290771)
          gl.uniform1f(U(P.field, 'iRing'), 0.12385807931423187)
          gl.uniform1f(U(P.field, 'iClear'), 0)
          gl.uniform1f(U(P.field, 'iSpread'), 0.85)
          gl.uniform1f(U(P.field, 'iState'), 0)
          gl.uniform1f(U(P.field, 'iEnergy'), 0)
          gl.uniform1f(U(P.field, 'iDebug'), 0)
          gl.uniform1f(U(P.field, 'iAlpha'), 1)
          gl.uniform1f(U(P.field, 'iNear'), 1.45)
          gl.uniform1f(U(P.field, 'iHotLo'), 0.5)
          gl.drawArrays(gl.TRIANGLES, 0, 3)

          // blit ke KANVAS (latar tidak ikut di-bloom — di live latar punya kanvas sendiri)
          gl.bindFramebuffer(gl.FRAMEBUFFER, null)
          gl.viewport(0, 0, pw, ph)
          gl.disable(gl.BLEND)
          gl.useProgram(P.blit)
          gl.bindVertexArray(blitVao.v)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, fieldTex)
          gl.uniform1i(U(P.blit, 'uTex'), 0)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        // lapisan figur digambar ke render target (latar sudah ada di kanvas)
        gl.bindFramebuffer(gl.FRAMEBUFFER, figure.fbo)
        gl.viewport(0, 0, pw, ph)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        // ---- pita `waves` (renderOrder −10/−9 live → paling belakang di antara lapisan figur) ----
        if (!OFF.has('waves')) {
          // saat jam dibekukan (`?t=`), delta frame = 0 di live → jam pita juga berhenti
          if (pin === null) waveClock += 0.0166 * 3          // waves.speed = 3
          const mvWave = new Float32Array([0.55, 0, 0, 0, 0, 0.55, 0, 0, 0, 0, 0.55, 0, 0, 0, -4.8, 1])
          gl.useProgram(P.waves)
          gl.enable(gl.BLEND)
          gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
          for (let i = 0; i < waveRibbons.length; i++) {
            const r = waveRibbons[i]
            const pos = carveRibbon(r, waveClock, 1.6)
            const wv = waveVaos[i]
            gl.bindVertexArray(wv.v)
            gl.bindBuffer(gl.ARRAY_BUFFER, wv.pb)
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos)
            gl.uniformMatrix4fv(U(P.waves, 'modelViewMatrix'), false, mvWave)
            gl.uniformMatrix4fv(U(P.waves, 'projectionMatrix'), false, proj)
            gl.uniform1f(U(P.waves, 'uTime'), waveClock)
            gl.uniform1f(U(P.waves, 'uOpacity'), 0.36)
            gl.uniform1f(U(P.waves, 'uEnergy'), 0)
            gl.uniform1f(U(P.waves, 'uSeed'), r.seed)
            gl.uniform2f(U(P.waves, 'uOrbPx'), -9999, -9999)
            gl.uniform1f(U(P.waves, 'uOrbR'), 1)
            gl.drawElements(gl.TRIANGLES, wv.count, gl.UNSIGNED_SHORT, 0)
          }
          // percikan pita (168 titik, gN)
          updateWaveSparks(waveSparks, 0.0166, waveClock, (i) => waveRibbons[i].pts.map((q) => q.cur), (i) => waveRibbons[i].width, 0.8)
          gl.useProgram(P.wavespark)
          gl.bindVertexArray(sparksVao.v)
          gl.bindBuffer(gl.ARRAY_BUFFER, sparksVao.pb)
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, waveSparks.position)
          gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE)
          gl.uniformMatrix4fv(U(P.wavespark, 'modelViewMatrix'), false, mvWave)
          gl.uniformMatrix4fv(U(P.wavespark, 'projectionMatrix'), false, proj)
          gl.uniform1f(U(P.wavespark, 'uTime'), waveClock)
          gl.uniform1f(U(P.wavespark, 'uPx'), 1)
          gl.uniform1f(U(P.wavespark, 'uOpacity'), 0.252)
          gl.uniform3f(U(P.wavespark, 'uColor'), 0.9, 0.78, 1)
          gl.drawArrays(gl.POINTS, 0, waveSparks.n)
        }

        // ---- [0] & [16] sprite cahaya latar ----
        gl.useProgram(P.sprite)
        gl.bindVertexArray(spriteVao)
        gl.enable(gl.BLEND)
        // terukur di live: srcRGB ONE · dstRGB ONE · srcA ZERO · dstA ONE → alpha latar dipertahankan
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE)
        const drawSprite = (scale: number, tx: number, ty: number, diffuse: number[], tex: WebGLTexture) => {
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, tex)
          gl.uniformMatrix4fv(U(P.sprite, 'modelViewMatrix'), false,
            new Float32Array([scale, 0, 0, 0, 0, -scale, 0, 0, 0, 0, 1, 0, tx, ty, -4.8, 1]))
          gl.uniformMatrix4fv(U(P.sprite, 'projectionMatrix'), false, proj)
          gl.uniform1f(U(P.sprite, 'rotation'), 0)
          gl.uniform2f(U(P.sprite, 'center'), 0.5, 0.5)
          gl.uniformMatrix3fv(U(P.sprite, 'mapTransform'), false, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]))
          gl.uniform3f(U(P.sprite, 'diffuse'), diffuse[0], diffuse[1], diffuse[2])
          gl.uniform1f(U(P.sprite, 'opacity'), 1)
          gl.uniform1i(U(P.sprite, 'map'), 0)
          gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
        }
        drawSprite(5.040521144866943, TX, -1.1650768518447876, [0.07934960722923279, 0.04328160360455513, 0.14427201449871063], texSmoke)
        drawSprite(3.024312734603882, -0.02353944443166256, -1.3037199974060059, [0.28671565651893616, 0.2723798453807831, 0.28671565651893616], texSmoke)

        // ---- [2] kuad isi gambar ----
        gl.useProgram(P.fill)
        gl.bindVertexArray(fillVao.v)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texPic)
        gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE)
        gl.uniformMatrix4fv(U(P.fill, 'modelViewMatrix'), false, mvQuad)
        gl.uniformMatrix4fv(U(P.fill, 'projectionMatrix'), false, proj)
        gl.uniform1f(U(P.fill, 'uFill'), 1)
        gl.uniform2f(U(P.fill, 'uSize'), fw, fh)
        gl.uniform1f(U(P.fill, 'uTime'), t)
        gl.uniform4f(U(P.fill, 'uReveal'), reveal[0], reveal[1], reveal[2], reveal[3])
        gl.uniform1i(U(P.fill, 'uMap'), 0)
        if (!OFF.has('picture')) gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)

        // ---- [3] kuad warna gambar ----
        gl.useProgram(P.pic)
        gl.bindVertexArray(picVao.v)
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE)
        gl.uniformMatrix4fv(U(P.pic, 'modelViewMatrix'), false, mvQuad)
        gl.uniformMatrix4fv(U(P.pic, 'projectionMatrix'), false, proj)
        gl.uniform1f(U(P.pic, 'uFill'), 1)
        gl.uniform1f(U(P.pic, 'uGain'), 1)
        gl.uniform2f(U(P.pic, 'uSize'), fw, fh)
        gl.uniform1f(U(P.pic, 'uTime'), t)
        gl.uniform1f(U(P.pic, 'uHeadOn'), 0)
        gl.uniform1f(U(P.pic, 'uHeadCut'), head.model.base)
        gl.uniform4f(U(P.pic, 'uHz'), hz[0], hz[1], hz[2], hz[3])
        gl.uniform3f(U(P.pic, 'uHzSkull'), hzSkull[0], hzSkull[1], hzSkull[2])
        gl.uniform3f(U(P.pic, 'uHzInner'), hzInner[0], hzInner[1], hzInner[2])
        gl.uniform4f(U(P.pic, 'uReveal'), reveal[0], reveal[1], reveal[2], reveal[3])
        gl.uniform4f(U(P.pic, 'uFace'), face[0], face[1], face[2], face[3])
        gl.uniform4f(U(P.pic, 'uFaceA'), 0, 0, 0, 0)
        gl.uniform1f(U(P.pic, 'uFaceSize'), 1)
        gl.uniform4f(U(P.pic, 'uShock'), star.x, star.y, 0, 0)
        gl.uniform1f(U(P.pic, 'uShockW'), 9)
        gl.uniform1f(U(P.pic, 'uLiveT'), t)
        gl.uniform1i(U(P.pic, 'uMap'), 0)
        if (!OFF.has('picture')) gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)

        // ---- rambut: kuad citra rambut (29-vert + 30-frag), additive ----
        if (!OFF.has('hair')) {
          gl.useProgram(P.hair)
          gl.bindVertexArray(hairVao.v)
          gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE)
          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, texRows)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, texHair)
          // modelView rambut: skala S, y dibalik, geser (-2,0320425, 1,9313689) — terukur dari live
          gl.uniformMatrix4fv(U(P.hair, 'modelViewMatrix'), false,
            new Float32Array([S, 0, 0, 0, 0, -S, 0, 0, 0, 0, 1, 0, -2.0320425033569336, 1.9313689470291138, -4.8, 1]))
          gl.uniformMatrix4fv(U(P.hair, 'projectionMatrix'), false, proj)
          gl.uniform2f(U(P.hair, 'uSize'), HW, HH)
          gl.uniform1f(U(P.hair, 'uGain'), 1)
          gl.uniform1f(U(P.hair, 'uOn'), 1)
          gl.uniform4f(U(P.hair, 'uReveal'), reveal[0], reveal[1], reveal[2], reveal[3])
          gl.uniform1f(U(P.hair, 'uBT'), 100)          // ignition rambut sudah lewat (langkah 3 akan memakai jam)
          gl.uniform1f(U(P.hair, 'uUp'), 48)
          gl.uniform1f(U(P.hair, 'uSide'), 120)
          gl.uniform1f(U(P.hair, 'uClock'), t)
          gl.uniform1f(U(P.hair, 'uMass'), 0.7)
          gl.uniform1f(U(P.hair, 'uEarY'), 343.4100036621094)
          gl.uniform1f(U(P.hair, 'uTop'), 0.6)
          gl.uniform2f(U(P.hair, 'uHead'), 694.7899780273438, 322.79998779296875)
          gl.uniform2f(U(P.hair, 'uHairOff'), 120, 48)
          gl.uniform1f(U(P.hair, 'uHeadH'), fh)
          gl.uniform4f(U(P.hair, 'uHeadPose'), 0, 0, 0, 0)
          gl.uniform3f(U(P.hair, 'uHeadPivot'), head.model.pivot[0], head.model.pivot[1], head.model.pivot[2])
          gl.uniform1i(U(P.hair, 'uMap'), 0)
          gl.uniform1i(U(P.hair, 'uHeadRows'), 1)
          gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
          gl.activeTexture(gl.TEXTURE0)
        }

        // ---- helai rambut (31/32): pita helai terangkat, uLifted di unit 1 ----
        if (!OFF.has('strands')) {
          gl.useProgram(P.strands)
          gl.bindVertexArray(strandsVao.v)
          gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, texRows)
          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, texLifted)
          gl.uniformMatrix4fv(U(P.strands, 'modelViewMatrix'), false,
            new Float32Array([S, 0, 0, 0, 0, -S, 0, 0, 0, 0, 1, 0, -2.0320425033569336, 1.9313689470291138, -4.8, 1]))
          gl.uniformMatrix4fv(U(P.strands, 'projectionMatrix'), false, proj)
          gl.uniform2f(U(P.strands, 'uSize'), HW, HH)
          gl.uniform1f(U(P.strands, 'uGain'), 1)
          gl.uniform1f(U(P.strands, 'uOn'), 1)
          gl.uniform4f(U(P.strands, 'uReveal'), reveal[0], reveal[1], reveal[2], reveal[3])
          gl.uniform1f(U(P.strands, 'uBT'), 100)
          gl.uniform1f(U(P.strands, 'uUp'), 48)
          gl.uniform1f(U(P.strands, 'uSide'), 120)
          gl.uniform1f(U(P.strands, 'uClock'), t)
          gl.uniform1f(U(P.strands, 'uTime'), t)
          gl.uniform1f(U(P.strands, 'uSway'), 0.6)
          gl.uniform1f(U(P.strands, 'uMass'), 0.7)
          gl.uniform1f(U(P.strands, 'uEarY'), 343.4100036621094)
          gl.uniform1f(U(P.strands, 'uTop'), 0.6)
          gl.uniform2f(U(P.strands, 'uHead'), 694.7899780273438, 322.79998779296875)
          gl.uniform2f(U(P.strands, 'uHairOff'), 120, 48)
          gl.uniform1f(U(P.strands, 'uHeadH'), HH - 48)
          gl.uniform4f(U(P.strands, 'uHeadPose'), 0, 0, 0, 0)
          gl.uniform3f(U(P.strands, 'uHeadPivot'), head.model.pivot[0], head.model.pivot[1], head.model.pivot[2])
          gl.uniform1f(U(P.strands, 'uPulse'), 0.6)
          gl.uniform1f(U(P.strands, 'uPulseSpeed'), 1)
          gl.uniform1i(U(P.strands, 'uHeadRows'), 0)
          gl.uniform1i(U(P.strands, 'uLifted'), 1)
          gl.drawElements(gl.TRIANGLES, strandMesh.index.length, gl.UNSIGNED_SHORT, 0)
          gl.activeTexture(gl.TEXTURE0)
        }

        // ---- bintik rambut (33/34): 260 titik berkilau ----
        if (!OFF.has('twinkles') && twinklesPx.length) {
          gl.useProgram(P.twinkles)
          gl.bindVertexArray(twinklesVao.v)
          gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, texRows)
          gl.uniformMatrix4fv(U(P.twinkles, 'modelViewMatrix'), false,
            new Float32Array([S, 0, 0, 0, 0, -S, 0, 0, 0, 0, 1, 0, -2.0320425033569336, 1.9313689470291138, -4.8, 1]))
          gl.uniformMatrix4fv(U(P.twinkles, 'projectionMatrix'), false, proj)
          gl.uniform1f(U(P.twinkles, 'uTime'), t)
          gl.uniform1f(U(P.twinkles, 'uPx'), 1)
          gl.uniform1f(U(P.twinkles, 'uOn'), 1)
          gl.uniform1f(U(P.twinkles, 'uSpark'), 0.6)
          gl.uniform2f(U(P.twinkles, 'uSize'), HW, HH)
          gl.uniform1f(U(P.twinkles, 'uGain'), 1)
          gl.uniform4f(U(P.twinkles, 'uReveal'), reveal[0], reveal[1], reveal[2], reveal[3])
          gl.uniform1f(U(P.twinkles, 'uBT'), 100)
          gl.uniform1f(U(P.twinkles, 'uUp'), 48)
          gl.uniform1f(U(P.twinkles, 'uSide'), 120)
          gl.uniform1f(U(P.twinkles, 'uClock'), t)
          gl.uniform1f(U(P.twinkles, 'uMass'), 0.7)
          gl.uniform1f(U(P.twinkles, 'uEarY'), 343.4100036621094)
          gl.uniform1f(U(P.twinkles, 'uTop'), 0.6)
          gl.uniform2f(U(P.twinkles, 'uHead'), 694.7899780273438, 322.79998779296875)
          gl.uniform2f(U(P.twinkles, 'uHairOff'), 120, 48)
          gl.uniform1f(U(P.twinkles, 'uHeadH'), HH - 48)
          gl.uniform4f(U(P.twinkles, 'uHeadPose'), 0, 0, 0, 0)
          gl.uniform3f(U(P.twinkles, 'uHeadPivot'), head.model.pivot[0], head.model.pivot[1], head.model.pivot[2])
          gl.uniform1i(U(P.twinkles, 'uHeadRows'), 0)
          gl.drawArrays(gl.POINTS, 0, twinklesPx.length)
          gl.activeTexture(gl.TEXTURE0)
        }

        // ---- [4] awan titik gambar (uOn = 0 saat idle, sama seperti live) ----
        gl.useProgram(P.points)
        gl.bindVertexArray(ptsVao.v)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, texPic)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texRows)
        gl.uniformMatrix4fv(U(P.points, 'modelViewMatrix'), false, mvPoints)
        gl.uniformMatrix4fv(U(P.points, 'projectionMatrix'), false, proj)
        gl.uniform1f(U(P.points, 'uStep'), 1.5)
        gl.uniform1f(U(P.points, 'uPxPerPic'), 0.5895196795463562)
        gl.uniform1f(U(P.points, 'uBackK'), 0)
        gl.uniform1f(U(P.points, 'uRim'), 0.9)
        gl.uniform1f(U(P.points, 'uOn'), 0)
        gl.uniform1f(U(P.points, 'uZRef'), 164.86306762695312)
        gl.uniform4f(U(P.points, 'uFace'), face[0], face[1], face[2], face[3])
        gl.uniform4f(U(P.points, 'uFaceA'), 0, 0, 0, 0)
        gl.uniform1f(U(P.points, 'uFaceSize'), 1)
        gl.uniform1f(U(P.points, 'uHeadH'), fh)
        gl.uniform4f(U(P.points, 'uHeadPose'), 0, 0, 0, 0)
        gl.uniform3f(U(P.points, 'uHeadPivot'), head.model.pivot[0], head.model.pivot[1], head.model.pivot[2])
        gl.uniform2f(U(P.points, 'uSize'), fw, fh)
        gl.uniform1f(U(P.points, 'uGain'), 1)
        gl.uniform4f(U(P.points, 'uHz'), hz[0], hz[1], hz[2], hz[3])
        gl.uniform3f(U(P.points, 'uHzSkull'), hzSkull[0], hzSkull[1], hzSkull[2])
        gl.uniform3f(U(P.points, 'uHzInner'), hzInner[0], hzInner[1], hzInner[2])
        gl.uniform1i(U(P.points, 'uHeadRows'), 0)
        gl.uniform1i(U(P.points, 'uMap'), 1)
        gl.drawArrays(gl.POINTS, 0, pts.count)

        // ---- busur inti & mahkota (15/16) ----
        if (!OFF.has('arcs')) {
          gl.useProgram(P.arcs)
          gl.bindVertexArray(arcsVao.v)
          gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE)
          gl.uniformMatrix4fv(U(P.arcs, 'modelViewMatrix'), false, mvPoints)
          gl.uniformMatrix4fv(U(P.arcs, 'projectionMatrix'), false, proj)
          gl.uniform1f(U(P.arcs, 'uTime'), t)
          gl.uniform1f(U(P.arcs, 'uBright'), 1)
          gl.drawArrays(gl.LINES, 0, arcPos.length / 3)
        }

        // ---- materi 54.492 titik (11/12) ----
        if (!OFF.has('matter')) {
          gl.useProgram(P.matter)
          gl.bindVertexArray(matterVao.v)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, texRows)
          gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE)
          gl.uniformMatrix4fv(U(P.matter, 'modelViewMatrix'), false, mvPoints)
          gl.uniformMatrix4fv(U(P.matter, 'projectionMatrix'), false, proj)
          gl.uniform1f(U(P.matter, 'uTime'), t)
          gl.uniform1f(U(P.matter, 'uPx'), 1)
          gl.uniform1f(U(P.matter, 'uSettle'), 0.71089106798172)
          gl.uniform1f(U(P.matter, 'uLiveT'), 0)
          gl.uniform1f(U(P.matter, 'uBright'), 1)
          gl.uniform1f(U(P.matter, 'uMatter'), 1)
          gl.uniform1f(U(P.matter, 'uCoreA'), 0.22)
          gl.uniform1f(U(P.matter, 'uLag'), 0.025)
          gl.uniform1f(U(P.matter, 'uTrail'), 0.55)
          gl.uniform1f(U(P.matter, 'uDense'), 0.32)
          gl.uniform4f(U(P.matter, 'uCoreT'), 0, 0.9, 0.9, 6)
          gl.uniform3f(U(P.matter, 'uCore'), matter.star.x, matter.star.y, 0.05 * fw)
          gl.uniform4f(U(P.matter, 'uShock'), matter.star.x, matter.star.y, 0, 0)
          gl.uniform1f(U(P.matter, 'uShockW'), 9)
          gl.uniform4f(U(P.matter, 'uFace'), face[0], face[1], face[2], face[3])
          gl.uniform4f(U(P.matter, 'uFaceA'), 0, 0, 0, 0)
          gl.uniform1f(U(P.matter, 'uFaceSize'), 1)
          gl.uniform1f(U(P.matter, 'uHeadH'), fh)
          gl.uniform4f(U(P.matter, 'uHeadPose'), 0, 0, 0, 0)
          gl.uniform3f(U(P.matter, 'uHeadPivot'), head.model.pivot[0], head.model.pivot[1], head.model.pivot[2])
          gl.uniform1i(U(P.matter, 'uHeadRows'), 0)
          gl.drawArrays(gl.POINTS, 0, mp.length)
        }

        // ---- [5] garis ----
        gl.useProgram(P.wire)
        gl.bindVertexArray(wireVao.v)
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE)
        gl.uniformMatrix4fv(U(P.wire, 'projectionMatrix'), false, proj)
        gl.uniformMatrix4fv(U(P.wire, 'modelViewMatrix'), false, mvPoints)
        gl.uniform1i(U(P.wire, 'uHeadRows'), 0)
        gl.uniform1f(U(P.wire, 'uTime'), t)
        gl.uniform2f(U(P.wire, 'uRes'), pw, ph)
        const glow = 1
        const core = 0.6 * dpr
        const soft = glow * 3 * dpr
        gl.uniform1f(U(P.wire, 'uCorePx'), core)
        gl.uniform1f(U(P.wire, 'uSoftLine'), soft)
        gl.uniform1f(U(P.wire, 'uSoftSketch'), soft)
        gl.uniform1f(U(P.wire, 'uGlowLine'), glow)
        gl.uniform1f(U(P.wire, 'uGlowSketch'), glow)
        gl.uniform1f(U(P.wire, 'uHalfPx'), core + soft * 2.2 + 1)
        gl.uniform1f(U(P.wire, 'uRest'), 0.15)
        gl.uniform1f(U(P.wire, 'uSettle'), 1)
        gl.uniform1f(U(P.wire, 'uHot'), 3.2)
        gl.uniform1f(U(P.wire, 'uGain'), 0.95)
        gl.uniform1f(U(P.wire, 'uIdle'), 0)
        gl.uniform1f(U(P.wire, 'uPulse'), 0.7)
        gl.uniform1f(U(P.wire, 'uPulseSpeed'), 1)
        gl.uniform1f(U(P.wire, 'uSketchBright'), 1)
        gl.uniform1f(U(P.wire, 'uFade'), 1)
        gl.uniform1f(U(P.wire, 'uTaper'), 26)
        // live: `uLiveT` = jam langkah bicara/dengar (0 saat idle) — bukan jam build
        gl.uniform1f(U(P.wire, 'uLiveT'), 0)
        gl.uniform4f(U(P.wire, 'uShock'), star.x, star.y, 0, 0)
        gl.uniform1f(U(P.wire, 'uShockW'), 9)
        gl.uniform4f(U(P.wire, 'uHz'), hz[0], hz[1], hz[2], hz[3])
        gl.uniform3f(U(P.wire, 'uHzSkull'), hzSkull[0], hzSkull[1], hzSkull[2])
        gl.uniform3f(U(P.wire, 'uHzInner'), hzInner[0], hzInner[1], hzInner[2])
        gl.uniform4f(U(P.wire, 'uFace'), face[0], face[1], face[2], face[3])
        gl.uniform4f(U(P.wire, 'uFaceA'), 0, 0, 0, 0)
        gl.uniform1f(U(P.wire, 'uFaceSize'), 1)
        gl.uniform4f(U(P.wire, 'uHeadPose'), 0, 0, 0, 0)
        gl.uniform3f(U(P.wire, 'uHeadPivot'), head.model.pivot[0], head.model.pivot[1], head.model.pivot[2])
        gl.uniform1f(U(P.wire, 'uHeadH'), fh)
        if (!OFF.has('lines')) gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_INT, 0)

        // ---- bloom (langkah 8): luminansi → 8 mip turun → 8 mip naik → komposit ----
        // `?off=bloom` tetap menjalankan komposit dengan intensitas 0, supaya yang diukur benar-benar
        // "gambar dasar + encode sRGB" (di live pun begitu) — bukan layar tanpa figur.
        const bloomOn = !OFF.has('bloom')
        if (bloomOn) {
          gl.disable(gl.BLEND)
          // 1) luminansi (17/18): threshold 0,6 · smoothing 0,9
          gl.bindFramebuffer(gl.FRAMEBUFFER, mips[0].fbo)
          gl.viewport(0, 0, mips[0].w, mips[0].h)
          gl.useProgram(P.hp)
          gl.bindVertexArray(hpVaoF)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, figure.tex)
          gl.uniform1i(U(P.hp, 'inputBuffer'), 0)
          gl.uniform1f(U(P.hp, 'threshold'), 0.6)
          gl.uniform1f(U(P.hp, 'smoothing'), 0.9)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
          // 2) turun (19/20): 12 tap, texelSize = 1/ukuran sumber
          gl.useProgram(P.down)
          gl.bindVertexArray(downVaoF)
          gl.uniform1i(U(P.down, 'inputBuffer'), 0)
          for (let i = 1; i < LEVELS; i++) {
            const src = mips[i - 1]
            gl.bindFramebuffer(gl.FRAMEBUFFER, mips[i].fbo)
            gl.viewport(0, 0, mips[i].w, mips[i].h)
            gl.bindTexture(gl.TEXTURE_2D, src.tex)
            gl.uniform2f(U(P.down, 'texelSize'), 1 / src.w, 1 / src.h)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
          }
          // 3) naik (21/22): 9 tap, campur dengan mip pasangannya menurut radius 0,62
          gl.useProgram(P.up)
          gl.bindVertexArray(upVaoF)
          gl.uniform1i(U(P.up, 'inputBuffer'), 0)
          gl.uniform1i(U(P.up, 'supportBuffer'), 1)
          gl.uniform1f(U(P.up, 'radius'), 0.62)
          let acc = mips[LEVELS - 1]
          for (let i = LEVELS - 2; i >= 0; i--) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, ups[i].fbo)
            gl.viewport(0, 0, ups[i].w, ups[i].h)
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, acc.tex)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, mips[i].tex)
            gl.uniform2f(U(P.up, 'texelSize'), 1 / acc.w, 1 / acc.h)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
            acc = ups[i]
          }
          // 4) komposit (23/24): gambar + bloom · intensitas 0,9 (hum.glow.strength)
          gl.bindFramebuffer(gl.FRAMEBUFFER, null)
          gl.viewport(0, 0, pw, ph)
          gl.useProgram(P.comp)
          gl.bindVertexArray(compVaoF)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, figure.tex)
          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, acc.tex)
          gl.uniform1i(U(P.comp, 'inputBuffer'), 0)
          gl.uniform1i(U(P.comp, 'e0Map'), 1)
          gl.uniform1f(U(P.comp, 'e0Intensity'), bloomOn ? 0.9 : 0)
          gl.uniform1f(U(P.comp, 'e0BlendOpacity'), 1)
          gl.enable(gl.BLEND)
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)   // figur di atas latar, memakai alpha figur
          gl.activeTexture(gl.TEXTURE0)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
        } else {
          // tanpa bloom: komposit tetap jalan (encode sRGB) dengan intensitas 0 — seperti live `off=bloom`
          gl.bindFramebuffer(gl.FRAMEBUFFER, null)
          gl.viewport(0, 0, pw, ph)
          gl.useProgram(P.comp)
          gl.bindVertexArray(compVaoF)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, figure.tex)
          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, figure.tex)
          gl.uniform1i(U(P.comp, 'inputBuffer'), 0)
          gl.uniform1i(U(P.comp, 'e0Map'), 1)
          gl.uniform1f(U(P.comp, 'e0Intensity'), 0)
          gl.uniform1f(U(P.comp, 'e0BlendOpacity'), 1)
          gl.enable(gl.BLEND)
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        } catch (e) {
          ;(window as any).__MIRA_ERR = String(e).slice(0, 400)
        }
      }
      draw()
    }
    const ready = () => {
      if (dead) return
      if (img.complete && img.width && (hairImg.complete || !hairImg.src)) run()
    }
    img.onload = ready
    hairImg.onload = ready
    ready()
    return () => {
      dead = true
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={ref}
      data-testid="mira-stage"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
    />
  )
}
