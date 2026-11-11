#!/usr/bin/env node
/**
 * gate-mira6.js — Gerbang D langkah 6 (tangan MediaPipe + MIC nyata).
 *
 * BAGIAN=A  paritas modul terhadap bundel live (`Kerja-Arena/recon/mira-2026-11-03.js`)
 *           A1 worker `ZN` verbatim            A2 konstanta HAND
 *           A3 `YN`/updateHead 0 selisih       A4 `jN`/headParams
 *           A5 `$k`/backK 0 selisih            A6 `G`/handLandmarks 0 selisih (+ status, pinch, palm, state)
 *           A7 `V`/snapHit 0 selisih           A8 `RF`/matchSpeech 0 selisih
 *
 * BAGIAN=B  aplikasi (kamera palsu Chromium, MediaPipe diganti tiruan lewat page.route)
 *           B1 label/aria tombol kamera awal   B2 klik → CAMERA OFF + titik merah
 *           B3 status jadi "camera on - show your hand"
 *           B4 landmark → perhatian & kepala bergerak, pinch = bolt, telapak = idle
 *           B5 MIC nyata: level > 0, baris `mira-heard`, state talking
 *           B6 `?bolt=` mengarahkan kepala, jepit ±0,416
 *
 * Pakai: node tools/gate-mira6.js A|B [URL] [--json]
 *        B default URL http://127.0.0.1:8804/
 */
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execFileSync } = require('child_process')

const RECON = '/home/user/Kerja-Arena/recon/mira-2026-11-03.js'
const REBUILD = '/home/user/mira-humanoid-rebuild'
const OUT = process.env.OUT_DIR || '/home/user/Kerja-Arena/verification/mira'
const ARGV = process.argv.slice(2)
const PART = (ARGV[0] || 'A').toUpperCase()
const JSON_OUT = ARGV.includes('--json')
const URL_ARG = ARGV.slice(1).find((a) => a.startsWith('http')) || 'http://127.0.0.1:8804/'

const rows = []
const add = (id, name, ok, detail) => {
  rows.push({ id, name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${name}  ${detail ?? ''}`)
}
const n = (v) => (typeof v === 'number' ? (Math.abs(v) < 1e-12 ? 0 : Number(v.toFixed(12))) : v)

/** ambil teks seimbang mulai dari indeks `i` (kurung kurawal) */
function brace(s, i) {
  const a = s.indexOf('{', i)
  let d = 0
  for (let k = a; k < s.length; k++) {
    if (s[k] === '{') d++
    else if (s[k] === '}') {
      d--
      if (d === 0) return s.slice(i, k + 1)
    }
  }
  throw new Error('kurung tidak seimbang di ' + i)
}
function bracket(s, i) {
  const a = s.indexOf('[', i)
  let d = 0
  for (let k = a; k < s.length; k++) {
    if (s[k] === '[') d++
    else if (s[k] === ']') {
      d--
      if (d === 0) return s.slice(i, k + 1)
    }
  }
  throw new Error('kurung siku tidak seimbang di ' + i)
}

async function loadOurs() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g6-'))
  const outFile = path.join(dir, 'miraHand.mjs')
  execFileSync(path.join(REBUILD, 'node_modules/.bin/esbuild'), [
    path.join(REBUILD, 'src/lib/miraHand.ts'),
    '--bundle',
    '--format=esm',
    '--platform=browser',
    `--outfile=${outFile}`,
  ])
  return import('file://' + outFile)
}

function loadLive() {
  const s = fs.readFileSync(RECON, 'utf8')
  // konstanta
  const grab = (pat, end) => {
    const i = s.indexOf(pat)
    if (i < 0) throw new Error('tak ada ' + pat)
    const j = s.indexOf(end, i)
    return s.slice(i, j)
  }
  const yi = s.indexOf('function YN(')
  const consts = new Function(grab('const Cl=', ';function YN(') + ';' + brace(s, yi) + ';return {Cl,jw,nx,YN}')()
  const jN = new Function('const ' + grab('const jN=', ',OT=').slice(6) + ';return jN')()
  const backK = new Function('return ' + grab('const $k=', ',Bw=').slice(6))()
  const speech = new Function(grab('const bF=', 'function CF(') + ';return {bF,RF}')()
  // ZN (template literal)
  const zi = s.indexOf('ZN=`')
  const zj = s.indexOf('`;', zi)
  const ZN = new Function(
    `const OT=${JSON.stringify(s.slice(s.indexOf('OT="') + 4, s.indexOf('",BT=')))};` +
      `const BT=${JSON.stringify(s.slice(s.indexOf('BT="') + 4, s.indexOf('",zT=')))};` +
      `const zT=${JSON.stringify(s.slice(s.indexOf('zT="') + 4, s.indexOf('",KN=')))};` +
      'return ' +
      s.slice(zi + 3, zj + 1)
  )()
  // `G` (di dalam QN): dari `let g=!0` sampai akhir `G`
  const gi = s.indexOf('let g=!0,v=0')
  const meI = s.indexOf('const me=', gi)
  const gI = s.indexOf(',G=(', meI) + 1
  const gSrc = s.slice(gi, gI) + brace(s, gI)
  const makeG = new Function(
    '__push',
    '__attentionRef',
    '__hooks',
    'window',
    'const p=__push,i=__attentionRef,m=__hooks;' + gSrc + ';return {G,snap:()=>({D,X,K,J,M,L,Z}),alive:()=>g}'
  )
  return { consts, jN, backK, speech, ZN, makeG, src: s }
}

/* ───────────────────────────── BAGIAN A ───────────────────────────── */

async function partA() {
  const ours = await loadOurs()
  const live = await loadLive()
  const { Cl, YN, jw, nx } = live.consts

  // A1 — worker verbatim
  {
    const strip = (t) => t.replace(/\s+/g, '')
    const a = strip(live.ZN)
    const b = strip(ours.HAND_WORKER_SOURCE)
    let diff = 0
    let first = -1
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        diff++
        if (first < 0) first = i
      }
    }
    add('A1', 'worker ZN verbatim', diff === 0, `${a.length} char, selisih ${diff}${first >= 0 ? ` @${first}` : ''}`)
  }

  // A2 — konstanta
  {
    const H = ours.HAND
    const checks = [
      [H.VISION === 'https://esm.sh/@mediapipe/tasks-vision@0.10.14', 'VISION'],
      [H.WASM === 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm', 'WASM'],
      [H.MODEL === live.src.slice(live.src.indexOf('zT="') + 4, live.src.indexOf('",KN=')), 'MODEL'],
      [H.COLOR === '#19ddff', 'COLOR'],
      [H.W === 256 && H.H === 192, 'W/H'],
      [H.FRAME_MS === 40 && H.FRAME_GAP_MS === 80 && H.DETECT_MS === 125, 'irama frame'],
      [JSON.stringify(H.SNAP) === JSON.stringify({ peak: 0.22, ratio: 5, cooldownMs: 1000, windowMs: 1500 }), 'SNAP'],
      [JSON.stringify(H.PINCH) === JSON.stringify({ close: 0.32, open: 0.5, palmFrames: 4, palmCooldownMs: 1500, still: 0.025 }), 'PINCH'],
      [JSON.stringify(ours.HEAD) === JSON.stringify(Cl), 'Cl'],
      [ours.LOOK_HOLD_MS === 8000, 'WN'],
    ]
    const bad = checks.filter(([ok]) => !ok).map(([, k]) => k)
    add('A2', 'konstanta HAND vs live', bad.length === 0, bad.length ? 'beda: ' + bad.join(',') : '10/10 sama')
  }

  // A3 — YN
  {
    let max = 0
    let cases = 0
    const rs = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const R = rs(12345)
    const pick = (a) => a[Math.floor(R() * a.length)]
    const interp = (t, life) => ({ follow: pick([0, 0.5, 1, 1.4]), life, speed: pick([0.3, 1, 2]) })
    for (let i = 0; i < 6000; i++) {
      const head = { yaw: R() * 0.9 - 0.45, pitch: R() * 0.5 - 0.25, roll: R() * 0.12 - 0.06 }
      const att = { x: R() * 2 - 1, y: R() * 2 - 1, idle: pick([0, 3, 5.9, 6.5, 9]) }
      const aura = { talk: pick([0, 0.4, 1]), listen: pick([0, 0.6, 1]), voice: pick([0, 0.5, 1]) }
      const time = R() * 20
      const dt = pick([0.008, 0.016, 0.05])
      const o = interp(time, pick([0, 0.5, 1]))
      const a = YN(head, att, aura, time, dt, o)
      const b = ours.updateHead(head, att, aura, time, dt, o)
      max = Math.max(max, Math.abs(a.yaw - b.yaw), Math.abs(a.pitch - b.pitch), Math.abs(a.roll - b.roll))
      cases++
    }
    add('A3', 'YN / updateHead', max === 0, `${cases} kombinasi, max|Δ| = ${max.toExponential(2)}`)
  }

  // A4 — jN
  {
    const get = (k) => ({ 'hum.head.follow': 0.7, 'hum.head.life': 0.55, 'hum.head.speed': 1.3 })[k]
    const a = JSON.stringify(live.jN(get))
    const b = JSON.stringify(ours.headParams(get))
    add('A4', 'jN / headParams', a === b, `${a}`)
  }

  // A5 — $k
  {
    let max = 0
    let cases = 0
    for (let i = -20; i <= 20; i++) {
      for (let j = -20; j <= 20; j++) {
        const yaw = i / 20
        const pitch = j / 20
        max = Math.max(max, Math.abs(live.backK(yaw, pitch) - ours.backK(yaw, pitch)))
        cases++
      }
    }
    add('A5', '$k / backK', max === 0, `${cases} kombinasi, max|Δ| = ${max.toExponential(2)}`)
  }

  // A6 — G / handLandmarks
  {
    const win = { __HUM_ATTN: 0 }
    let statusesL = []
    let statusesO = []
    let callsL = { pinch: [], palm: [] }
    let callsO = { pinch: [], palm: [] }
    const attL = { x: 0, y: 0 }
    const attO = { x: 0, y: 0 }
    const ref = { current: attL }
    const hooks = { current: { onPinch: (x, y) => callsL.pinch.push([x, y]), onPalm: () => callsL.palm.push(1) } }
    const mk = live.makeG(
      (s) => statusesL.push(s),
      ref,
      hooks,
      win
    )
    const stO = ours.handRuntime()
    const hooksO = { onPinch: (x, y) => callsO.pinch.push([x, y]), onPalm: () => callsO.palm.push(1) }
    let seed = 987654321
    const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    /** tangan sintetis: mode 0 acak, 1 pinch, 2 telapak terbuka */
    const hand = (mode) => {
      const wrist = { x: 0.45 + R() * 0.1, y: 0.7 + R() * 0.05 }
      const lm = []
      for (let i = 0; i < 21; i++) lm.push({ x: wrist.x + (R() - 0.5) * 0.1, y: wrist.y - R() * 0.1 })
      lm[0] = { ...wrist }
      lm[9] = { x: wrist.x + 0.02, y: wrist.y - 0.2 } // span ≈ 0,2
      const dirs = [
        [-0.16, -1],
        [-0.05, -1],
        [0.04, -1],
        [0.12, -0.95],
        [0.2, -0.8],
      ]
      const pips = [5, 9, 13, 17]
      const tips = [8, 12, 16, 20]
      dirs.forEach(([dx, dy], f) => {
        const base = { x: wrist.x + dx * 0.5, y: wrist.y + dy * 0.25 }
        const far = mode === 2 ? 0.34 : 0.12
        const near = mode === 2 ? 0.08 : 0.06
        pips[f] && (lm[pips[f]] = { x: base.x + dx * near, y: base.y + dy * near })
        lm[tips[f]] = { x: base.x + dx * far, y: base.y + dy * far }
      })
      lm[4] = { x: wrist.x - 0.12 + R() * 0.02, y: wrist.y - 0.1 }
      lm[8] = mode === 1 ? { x: lm[4].x + 0.01, y: lm[4].y + 0.01 } : { x: wrist.x - 0.05, y: wrist.y - 0.34 }
      lm[6] = { x: wrist.x - 0.07, y: wrist.y - 0.2 }
      lm[10] = { x: wrist.x - 0.02, y: wrist.y - 0.18 }
      lm[14] = { x: wrist.x + 0.03, y: wrist.y - 0.18 }
      lm[18] = { x: wrist.x + 0.08, y: wrist.y - 0.16 }
      if (mode === 0) for (const i of tips) lm[i] = { x: lm[i].x + (R() - 0.5) * 0.06, y: lm[i].y + (R() - 0.5) * 0.06 }
      return lm
    }
    let now = 1000
    for (let f = 0; f < 800; f++) {
      now += 60
      const r = R()
      const mode = r < 0.15 ? -1 : r < 0.45 ? 1 : r < 0.75 ? 2 : 0
      const lm = mode === -1 ? null : hand(mode)
      if (lm && mode === 2) for (let k = 0; k < 21; k++) lm[k] = { ...hand(2)[k], x: 0.5 + (R() - 0.5) * 0.004 } // diam
      const hum = R() < 0.05 ? 1 : 0
      win.__HUM_ATTN = hum
      mk.G(lm, now)
      const s = ours.handLandmarks(stO, lm, now, attO, hooksO, !!hum)
      if (s) statusesO.push(s)
    }
    const st = mk.snap()
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
    const parts = {
      status: same(statusesL, statusesO),
      attention: n(attL.x) === n(attO.x) && n(attL.y) === n(attO.y),
      pinch: same(callsL.pinch.map((p) => p.map(n)), callsO.pinch.map((p) => p.map(n))),
      palm: same(callsL.palm.length, callsO.palm.length),
      state: same(
        [st.D, st.X, st.M, st.L, n(st.K), n(st.Z)],
        [stO.palmFrames, stO.palmLocked, stO.lastHandAt, stO.pinchClosed, n(stO.lastPalm), n(stO.lastSnap)]
      ),
    }
    const bad = Object.entries(parts).filter(([, ok]) => !ok).map(([k]) => k)
    add(
      'A6',
      'G / handLandmarks',
      bad.length === 0,
      `${statusesL.length} status · pinch ${callsL.pinch.length}/${callsO.pinch.length} · palm ${callsL.palm.length}/${callsO.palm.length}${bad.length ? ' · beda: ' + bad.join(',') : ''}`
    )
  }

  // A7 — V / snapHit
  {
    const win = { __HUM_ATTN: 0 }
    const mk = live.makeG(() => {}, { current: { x: 0, y: 0 } }, { current: {} }, win)
    void mk
    let diff = 0
    let cases = 0
    // live: `const Y=ie>.22&&ie>z*5&&Q-Z>1e3&&Q-M<1500`
    for (const peak of [0, 0.1, 0.219, 0.22, 0.221, 0.5, 0.9]) {
      for (const avg of [0, 0.01, 0.05, 0.2]) {
        for (const dSnap of [0, 500, 1000, 1001, 5000]) {
          for (const dHand of [0, 1400, 1500, 1600, 9000]) {
            const now = 10000
            const liveHit = peak > 0.22 && peak > avg * 5 && now - (now - dSnap) > 1000 && now - (now - dHand) < 1500
            const st = { ...ours.handRuntime(), lastSnap: now - dSnap, lastHandAt: now - dHand }
            const ourHit = ours.snapHit(peak, avg, now, st)
            if (!!liveHit !== !!ourHit) diff++
            cases++
          }
        }
      }
    }
    add('A7', 'V / snapHit', diff === 0, `${cases} kombinasi, selisih ${diff}`)
  }

  // A8 — RF / matchSpeech
  {
    const corpus = [
      'look left', 'look right', 'look up', 'look down', 'look at me', 'face me', 'center',
      'turn left', 'head up', 'eyes down', 'follow me', 'stop looking', 'look around',
      'move right', 'follow my finger', 'look upwards', 'look downwards', 'look here',
      'left', 'right', 'up', 'down', 'hello there', 'what is your name', 'please look left now',
      'can you see me', 'turn the other way', 'Mira look up', 'above', 'below',
    ]
    let diff = 0
    const detail = []
    for (const t of corpus) {
      const a = live.speech.RF(t)
      const b = ours.matchSpeech(t)
      const A = a ? JSON.stringify([a.send, a.say]) : 'null'
      const B = b ? JSON.stringify([b.send, b.say]) : 'null'
      if (A !== B) {
        diff++
        detail.push(`${t}`)
      }
    }
    add('A8', 'RF / matchSpeech', diff === 0, `${corpus.length} kalimat, selisih ${diff}${detail.length ? ' · ' + detail.slice(0, 3).join(' | ') : ''}`)
  }

  return finish('A')
}

/* ───────────────────────────── BAGIAN B ───────────────────────────── */

const STUB = `
export const FilesetResolver = { forVisionTasks: async () => ({ kind: 'stub' }) }
// Tangan tiruan digerakkan per FRAME (bukan per waktu): di SwiftShader panggung ~1 fps sehingga
// jadwal berbasis waktu tak pernah memberi 4 frame telapak berturut-turut.
// siklus 6 frame: 0 kepalan bergerak · 1–4 telapak terbuka & diam · 5 pinch
let g6n = 0
const synth = () => {
  const k = g6n++ % 6
  const openPhase = k >= 1 && k <= 4
  const pinch = k === 5
  const wrist = { x: openPhase ? 0.5 : 0.5 + 0.25 * Math.sin(k * 1.7), y: 0.72 }
  const lm = []
  for (let i = 0; i < 21; i++) lm.push({ x: wrist.x, y: wrist.y - 0.05 })
  lm[0] = { x: wrist.x, y: wrist.y }
  lm[9] = { x: wrist.x, y: wrist.y - 0.2 }
  lm[4] = { x: wrist.x - 0.1, y: wrist.y - 0.12 }
  lm[6] = { x: wrist.x - 0.06, y: wrist.y - 0.18 }
  lm[8] = pinch ? { x: lm[4].x + 0.005, y: lm[4].y + 0.005 } : { x: wrist.x - 0.05, y: wrist.y - (openPhase ? 0.34 : 0.12) }
  const pip = [10, 14, 18], tip = [12, 16, 20]
  pip.forEach((p, i) => { lm[p] = { x: wrist.x + 0.02 * i - 0.01, y: wrist.y - 0.2 } })
  tip.forEach((p, i) => { lm[p] = { x: wrist.x + 0.02 * i - 0.01, y: wrist.y - (openPhase ? 0.34 : 0.12) } })
  return lm
}
export const HandLandmarker = {
  createFromOptions: async () => ({
    detectForVideo: () => ({ landmarks: [synth()] }),
    close() { window.__STUB_CLOSE = (window.__STUB_CLOSE || 0) + 1 },
  }),
}
`

async function partB() {
  const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
  const ARGS = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
  ]
  const browser = await chromium.launch({ args: ARGS })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] })
  const page = await ctx.newPage()
  const stub = async (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: STUB })
  await page.route('https://esm.sh/**', stub)
  await page.route('https://cdn.jsdelivr.net/**', stub)
  await page.route('https://storage.googleapis.com/**', (r) => r.fulfill({ status: 200, body: 'x' }))
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))

  await page.goto(URL_ARG + '?auto=1&t=8', { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction(
    () => typeof window.__MIRA_AUDIO === 'function' && typeof window.__MIRA_MIC === 'function',
    undefined,
    { timeout: 120000 }
  )
  await page.waitForTimeout(1500)

  const cam = page.locator('[data-testid="mira-humanoid-camera"]')
  /** klik lewat DOM: panggung ~1 fps membuat `page.click` sering kena timeout actionability */
  const clickId = (id) => page.evaluate((sel) => document.querySelector(sel)?.click(), `[data-testid="${id}"]`)
  // B1
  {
    const label = (await cam.textContent())?.trim()
    const pressed = await cam.getAttribute('aria-pressed')
    const dot = await page.locator('[data-testid="mira-camera-dot"]').count()
    add('B1', 'tombol kamera awal', label === 'ENABLE CAMERA' && pressed === 'false' && dot === 0, `"${label}" aria-pressed=${pressed} titik=${dot}`)
  }

  // B2
  await clickId('mira-humanoid-camera')
  await page.waitForTimeout(600)
  {
    const label = (await cam.textContent())?.trim()
    const pressed = await cam.getAttribute('aria-pressed')
    const dot = await page.locator('[data-testid="mira-camera-dot"]').evaluate((el) => {
      const s = getComputedStyle(el)
      return { bg: s.backgroundColor, w: el.getBoundingClientRect().width }
    })
    add('B2', 'klik → CAMERA OFF + titik merah', label === 'CAMERA OFF' && pressed === 'true' && Math.round(dot.w) === 14 && /255, 68, 68/.test(dot.bg), `"${label}" ${dot.w}px ${dot.bg}`)
  }

  // B3
  {
    let status = ''
    try {
      await page.waitForFunction(
        () => /^(camera on|hand found)/.test(document.querySelector('[data-testid="mira-camera-status"]')?.textContent || ''),
        undefined,
        { timeout: 60000 }
      )
      status = await page.locator('[data-testid="mira-camera-status"]').textContent()
    } catch {
      status = (await page.locator('[data-testid="mira-camera-status"]').textContent().catch(() => '')) || '(kosong)'
    }
    add('B3', 'status pipeline kamera hidup', /^(camera on|hand found)/.test(status.trim()), `"${status.trim()}"`)
  }

  // B4 — perhatian & kepala bergerak, pinch = bolt, telapak = idle
  {
    const samples = []
    for (let i = 0; i < 20; i++) {
      samples.push(await page.evaluate(() => ({ mic: window.__MIRA_MIC(), head: window.__MIRA_HEAD })))
      await page.waitForTimeout(900)
    }
    const attn = samples.map((s) => s.mic.attention.x)
    const spread = Math.max(...attn) - Math.min(...attn)
    const yaws = samples.map((s) => s.head?.yaw ?? 0)
    const yawSpread = Math.max(...yaws) - Math.min(...yaws)
    const stateBtn = async (id) => (await page.locator(`[data-testid="mira-state-${id}"]`).getAttribute('aria-pressed')) === 'true'
    // pinch (fase 8–8,6 pada tiruan) → bolt; telapak terbuka & diam → state idle
    const bolts = samples.map((s) => s.mic.bolt?.id || 0)
    const boltCount = Math.max(...bolts) - (bolts[0] || 0)
    await clickId('mira-state-talking')
    let backIdle = false
    try {
      await page.waitForFunction(
        () => document.querySelector('[data-testid="mira-state-idle"]')?.getAttribute('aria-pressed') === 'true',
        undefined,
        { timeout: 60000 }
      )
      backIdle = true
    } catch {
      backIdle = await stateBtn('idle')
    }
    add(
      'B4',
      'landmark → perhatian & kepala; pinch → bolt; telapak → idle',
      spread > 0.05 && yawSpread > 0.002 && backIdle && boltCount >= 1,
      `perhatian Δx=${spread.toFixed(3)} · yaw Δ=${yawSpread.toFixed(4)} · bolt=${boltCount} · palm→idle=${backIdle}`
    )
  }

  // B5 — MIC nyata
  {
    await clickId('mira-mic')
    // state talking diperiksa cepat (gesture tiruan bisa langsung mengembalikannya ke idle/listening)
    const seen = new Set()
    for (let i = 0; i < 14; i++) {
      seen.add(
        await page.evaluate(
          () => [...document.querySelectorAll('[data-testid^="mira-state-"]')].find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.testid
        )
      )
      await page.waitForTimeout(90)
    }
    const stateSoon = seen.has('mira-state-talking') ? 'mira-state-talking' : [...seen].join('/')
    await page.waitForTimeout(700)
    const r = await page.evaluate(async () => {
      const vals = []
      for (let i = 0; i < 12; i++) {
        vals.push(window.__MIRA_MIC())
        await new Promise((res) => setTimeout(res, 120))
      }
      return {
        on: vals[vals.length - 1].on,
        peak: Math.max(...vals.map((v) => v.level)),
        heard: vals[vals.length - 1].heard,
        state: [...document.querySelectorAll('[data-testid^="mira-state-"]')].find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.testid,
      }
    })
    const heardVisible = await page.locator('[data-testid="mira-heard"]').count()
    add(
      'B5',
      'MIC: level > 0, mira-heard, state talking',
      r.on && r.peak > 0.001 && heardVisible === 1 && stateSoon === 'mira-state-talking',
      `on=${r.on} peak=${r.peak.toFixed(4)} heard=${heardVisible} state(400ms)=${stateSoon} state(1,3s)=${r.state} teks="${String(r.heard).slice(0, 40)}"`
    )
  }

  // B6 — ?bolt= mengarahkan kepala + jepit
  {
    const probe = async (q) => {
      const b2 = await chromium.launch({ args: ARGS })
      const c2 = await b2.newContext({ viewport: { width: 1440, height: 900 } })
      const p2 = await c2.newPage()
      await p2.route('https://esm.sh/**', stub)
      await p2.route('https://cdn.jsdelivr.net/**', stub)
      await p2.goto(URL_ARG + `?auto=1&t=11${q}`, { waitUntil: 'load', timeout: 120000 })
      await p2.waitForFunction(() => typeof window.__MIRA_AUDIO === 'function', undefined, { timeout: 120000 })
      await p2.waitForFunction(() => !!window.__MIRA_HEAD, undefined, { timeout: 120000 })
      const vals = []
      for (let i = 0; i < 12; i++) {
        vals.push(await p2.evaluate(() => window.__MIRA_HEAD))
        await p2.waitForTimeout(200)
      }
      await b2.close()
      const last = vals[vals.length - 1]
      return { x: last.x, yaw: last.yaw, yawMax: Math.max(...vals.map((v) => Math.abs(v.yaw))) }
    }
    const right = await probe('&attn=0.8,0')
    const left = await probe('&attn=-0.8,0')
    const full = await probe('&attn=1,1')
    const lim = 0.32 * 1.3 + 1e-9
    const ok = right.yaw > 0.05 && left.yaw < -0.05 && right.x > 0.5 && left.x < -0.5 && full.yawMax <= lim && full.x <= 1.0001
    add(
      'B6',
      '?attn= mengarahkan kepala (jepit ±0,416)',
      ok,
      `kanan x=${right.x.toFixed(3)} yaw=${n(right.yaw).toFixed(4)} · kiri x=${left.x.toFixed(3)} yaw=${n(left.yaw).toFixed(4)} · penuh |yaw|max=${full.yawMax.toFixed(4)} (batas ${lim.toFixed(3)})`
    )
  }

  // B7 — mematikan kamera membersihkan semuanya (live `w?.close()`, `_.terminate()`, track.stop())
  {
    const b3 = await chromium.launch({ args: ARGS })
    const c3 = await b3.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] })
    const p3 = await c3.newPage()
    // paksa jalur thread-utama supaya `close()` landmarker benar-benar dipanggil
    await p3.addInitScript(() => {
      const W = window.Worker
      window.Worker = function (url, opts) {
        if (String(url).startsWith('blob:')) throw new Error('worker blocked for cleanup test')
        return new W(url, opts)
      }
    })
    await p3.route('https://esm.sh/**', stub)
    await p3.route('https://cdn.jsdelivr.net/**', stub)
    await p3.route('https://storage.googleapis.com/**', (r) => r.fulfill({ status: 200, body: 'x' }))
    await p3.goto(URL_ARG + '?auto=1&t=8', { waitUntil: 'load', timeout: 120000 })
    await p3.waitForFunction(() => typeof window.__MIRA_MIC === 'function', undefined, { timeout: 120000 })
    await p3.evaluate(() => document.querySelector('[data-testid="mira-humanoid-camera"]')?.click())
    let ranBefore = false
    try {
      await p3.waitForFunction(
        () => (window.__MIRA_HAND && window.__MIRA_HAND.lastHandAt) > 0,
        undefined,
        { timeout: 90000 }
      )
      ranBefore = true
    } catch {
      ranBefore = false
    }
    await p3.evaluate(() => document.querySelector('[data-testid="mira-humanoid-camera"]')?.click())
    await p3.waitForTimeout(1500)
    const st = await p3.evaluate(() => ({
      closed: window.__STUB_CLOSE || 0,
      dot: document.querySelectorAll('[data-testid="mira-camera-dot"]').length,
      status: document.querySelectorAll('[data-testid="mira-camera-status"]').length,
      pressed: document.querySelector('[data-testid="mira-humanoid-camera"]')?.getAttribute('aria-pressed'),
    }))
    await b3.close()
    add(
      'B7',
      'kamera OFF → landmarker ditutup, titik & status hilang',
      ranBefore && st.closed >= 1 && st.dot === 0 && st.status === 0 && st.pressed === 'false',
      `deteksi jalan=${ranBefore} close=${st.closed} titik=${st.dot} status=${st.status} aria-pressed=${st.pressed}`
    )
  }

  // B8 — klik panggung tetap memicu bolt walau SOUND OFF (live `B()` tidak melihat saklar suara)
  {
    const p4 = page
    await p4.evaluate(() => {
      const b = document.querySelector('[data-testid="mira-humanoid-sound"]')
      if (b && b.getAttribute('aria-pressed') === 'true') b.click() // matikan suara
    })
    await p4.waitForTimeout(400)
    const soundOff = await p4.evaluate(() => document.querySelector('[data-testid="mira-humanoid-sound"]')?.getAttribute('aria-pressed'))
    const before = await p4.evaluate(() => window.__MIRA_MIC().bolt?.id || 0)
    await p4.mouse.click(700, 700)
    await p4.waitForTimeout(600)
    const after = await p4.evaluate(() => window.__MIRA_MIC().bolt?.id || 0)
    add('B8', 'SOUND OFF tetap memicu bolt saat panggung diklik', soundOff === 'false' && after > before, `sound=${soundOff} id ${before} → ${after}`)
  }

  if (errs.length) add('B0', 'tanpa error halaman', false, errs.slice(0, 2).join(' | '))
  await browser.close()
  return finish('B')
}

function finish(part) {
  const pass = rows.filter((r) => r.ok).length
  const res = { part, ok: pass === rows.length, pass, total: rows.length, rows }
  fs.mkdirSync(OUT, { recursive: true })
  const file = path.join(OUT, process.env.OUT_NAME || (part === 'A' ? 'gate-step6a.json' : 'gate-step6.json'))
  fs.writeFileSync(file, JSON.stringify(res, null, 2))
  if (JSON_OUT) console.log(JSON.stringify(res))
  else console.log(`\n${part}: ${pass}/${rows.length}  →  ${file}`)
  process.exit(res.ok ? 0 : 1)
}

;(PART === 'A' ? partA() : partB()).catch((e) => {
  console.error('ERROR', e)
  process.exit(2)
})
