/**
 * miraHand — port jalur "tangan & kepala" live (bundle ≈ 1 129 300 – 1 134 800 dan 1 183 300).
 *
 *   OT/BT/zT     = URL MediaPipe tasks-vision 0.10.14 (esm.sh), WASM, model hand_landmarker float16/1
 *   KN           = "#19ddff"   ·  vg,yg = 256 × 192 (kanvas frame yang dikirim ke worker)
 *   ZN           = sumber worker (verbatim, lihat HAND_WORKER_SOURCE)
 *   XN / qN      = kirim & baca event `mira-body`  → miraBody() / lastBody()
 *   Cl           = {yaw:0,32, pitch:0,16, roll:0,05, lag:4,2, idleAfter:6}
 *   jw / nx      = jepit ±1 / 0..1
 *   YN           = pembaru arah kepala            → updateHead()
 *   jN           = 3 param dial kepala            → headParams()
 *   $k           = gerbang `uBackK`               → backK()
 *   bF / RF      = tabel perintah suara + pencocok → SPEECH_COMMANDS / matchSpeech()
 *   CF           = SpeechRecognition              → startSpeech()
 *   VT('attn')   = `?attn=x,y` · `?bolt=x,y` · `?boltAge` (default 0,02)
 */

export const HAND = {
  VISION: 'https://esm.sh/@mediapipe/tasks-vision@0.10.14',
  WASM: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  MODEL:
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  COLOR: '#19ddff',
  W: 256,
  H: 192,
  /** interval kirim frame (ms) · jarak minimum antar-frame (ms) · interval deteksi fallback (ms) */
  FRAME_MS: 40,
  FRAME_GAP_MS: 80,
  DETECT_MS: 125,
  /** deteksi tepuk tangan: puncak > 0,22 · puncak > rata-rata·5 · jeda ≥ 1000 ms · dalam 1500 ms sejak aktivitas */
  SNAP: { peak: 0.22, ratio: 5, cooldownMs: 1000, windowMs: 1500 },
  /** ambang pinch / palm / jeda sentuhan (QN) */
  PINCH: { close: 0.32, open: 0.5, palmFrames: 4, palmCooldownMs: 1500, still: 0.025 },
} as const

/** `Zn` — sumber worker, verbatim dari bundle */
export const HAND_WORKER_SOURCE = `
const VISION = '${HAND.VISION}'
const WASM = '${HAND.WASM}'
const MODEL = '${HAND.MODEL}'
let landmarker = null
self.onmessage = async (e) => {
  const d = e.data
  if (d.type === 'init') {
    try {
      const vision = await import(VISION)
      const resolver = await vision.FilesetResolver.forVisionTasks(WASM)
      landmarker = await vision.HandLandmarker.createFromOptions(resolver, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 1,
      })
      self.postMessage({ type: 'ready' })
    } catch { self.postMessage({ type: 'fail' }) }
  } else if (d.type === 'frame') {
    let lm = null
    try {
      const img = new ImageData(new Uint8ClampedArray(d.buf), d.w, d.h)
      const res = landmarker.detectForVideo(img, d.t)
      lm = (res && res.landmarks && res.landmarks[0]) || null
    } catch {}
    self.postMessage({ type: 'lm', lm })
  }
}
`

/* ───────────────────────── bus `mira-body` ───────────────────────── */

export interface MiraBody {
  kind?: string
  x?: number
  y?: number
  release?: boolean
  at?: number
}

const WN = 8000
let Zu: (MiraBody & { at: number }) | null = null

/** `XN` */
export function miraBody(detail: MiraBody) {
  Zu = { ...detail, at: Date.now() }
  try {
    window.dispatchEvent(new CustomEvent('mira-body', { detail: Zu }))
  } catch { /* abaikan */ }
  return Zu
}

/** `qN` */
export function lastBody(kind: string, maxAge = 4000) {
  return Zu && Zu.kind === kind && Date.now() - Zu.at < maxAge ? Zu : null
}

export const LOOK_HOLD_MS = WN

/* ───────────────────────── kepala ───────────────────────── */

/** `Cl` */
export const HEAD = { yaw: 0.32, pitch: 0.16, roll: 0.05, lag: 4.2, idleAfter: 6 }

const jw = (i: number) => Math.max(-1, Math.min(1, i || 0))
const nx = (i: number) => Math.max(0, Math.min(1, i || 0))

export interface HeadPose { yaw: number; pitch: number; roll: number }
export interface Attention { x: number; y: number; at?: number; fingerHold?: number; voice?: { x: number; y: number; until: number } | null; idle?: number }

/** `jN` */
export const headParams = (get: (k: string) => number) => ({
  follow: get('hum.head.follow'),
  life: get('hum.head.life'),
  speed: get('hum.head.speed'),
})

/** `YN` */
export function updateHead(
  i: HeadPose,
  e: { x?: number; y?: number; idle?: number },
  t: { talk?: number; listen?: number; voice?: number },
  n: number,
  r: number,
  o: { follow: number; life: number; speed: number }
): HeadPose {
  const a = nx(t.talk || 0)
  const c = nx(t.listen || 0) * (1 - a)
  const h = nx(t.voice || 0)
  const p = Math.max(0, Math.min(1, ((e.idle || 0) - HEAD.idleAfter) / 2))
  const m = o.follow * (1 - 0.4 * a) * (1 + 0.1 * c) * (1 - p)
  const g = o.life
  const v = jw(e.x || 0) * HEAD.yaw * m + g * (0.05 * Math.sin(n * 0.31) + 0.03 * Math.sin(n * 0.17 + 1.3))
  const y = jw(e.y || 0) * HEAD.pitch * m + g * 0.025 * Math.sin(n * 0.23 + 0.7) + a * h * 0.06 * g
  const _ = -v * 0.12 + c * HEAD.roll * 0.9 + a * g * 0.015 * Math.sin(n * 1.3)
  const E = 1 - Math.exp(-Math.max(0, r) * HEAD.lag * o.speed)
  const w = (M: number, R: number) => Math.max(-R, Math.min(R, M))
  return {
    yaw: w(i.yaw + (v - i.yaw) * E, HEAD.yaw * 1.3),
    pitch: w(i.pitch + (y - i.pitch) * E, HEAD.pitch * 1.4),
    roll: w(i.roll + (_ - i.roll) * E, HEAD.roll * 1.2),
  }
}

/** `$k` — gerbang `uBackK` */
export const backK = (yaw: number, pitch: number) =>
  Math.min(1, Math.max(0, (Math.abs(yaw) + Math.abs(pitch) - 0.09) / 0.24))

/** `VT` */
function pair(name: string): [number, number] | null {
  try {
    const e = new URLSearchParams(window.location.search).get(name)
    if (!e) return null
    const [t, n] = e.split(',').map(Number)
    return Number.isFinite(t) && Number.isFinite(n) ? [t, n] : null
  } catch {
    return null
  }
}

/** `eF` */
export const attentionOverride = (): [number, number] | null => (typeof window !== 'undefined' ? pair('attn') : null)
/** `ix` */
export const boltOverride = (): [number, number] | null => (typeof window !== 'undefined' ? pair('bolt') : null)
/** `tF` */
export const boltAge = (() => {
  try {
    const i = new URLSearchParams(window.location.search).get('boltAge')
    return i === null ? 0.02 : Number(i)
  } catch {
    return 0.02
  }
})()

/* ───────────────────────── landmark tangan (live `G`) ───────────────────────── */

export type Landmark = { x: number; y: number }

/** keadaan yang dibawa antar-frame (live: `L,D,X,J,M,Z,K`) */
export interface HandRuntime {
  pinchClosed: boolean
  palmFrames: number
  palmLocked: boolean
  lastPoint: Landmark | null
  lastHandAt: number
  lastSnap: number
  lastPalm: number
}

export const handRuntime = (): HandRuntime => ({
  pinchClosed: true,
  palmFrames: 0,
  palmLocked: false,
  lastPoint: null,
  lastHandAt: 0,
  lastSnap: 0,
  lastPalm: 0,
})

export interface HandHooks {
  onPinch?: (x: number, y: number) => void
  onPalm?: () => void
  onSnap?: () => void
}

const me = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * `G` — satu frame landmark → perhatian, pinch, telapak.
 * Mengembalikan status yang harus ditampilkan (atau `null` bila tak berubah).
 */
export function handLandmarks(
  st: HandRuntime,
  lm: Landmark[] | null,
  now: number,
  attention: Attention,
  hooks: HandHooks,
  humAttn = false
): string | null {
  if (!lm) {
    st.palmFrames = 0
    return now - st.lastHandAt > 1500 ? 'camera on - show your hand' : null
  }
  st.lastHandAt = now
  const status = 'hand found - point, pinch to touch her'
  const wrist = lm[0]
  const thumb = lm[4]
  const idx = lm[8]
  const span = me(wrist, lm[9]) || 0.001
  if (!humAttn) {
    const hx = Math.max(-1, Math.min(1, ((1 - idx.x) * 2 - 1) * 1.6))
    const hy = Math.max(-1, Math.min(1, (idx.y * 2 - 1) * 1.6))
    attention.x += (hx - attention.x) * 0.5
    attention.y += (hy - attention.y) * 0.5
    attention.fingerHold = now
  }
  const pinch = me(thumb, idx)
  if (st.pinchClosed && pinch < span * 0.32) {
    st.pinchClosed = false
    const px = Math.max(-1, Math.min(1, ((1 - (thumb.x + idx.x) / 2) * 2 - 1) * 1.6))
    const py = Math.max(-1, Math.min(1, (((thumb.y + idx.y) / 2) * 2 - 1) * 1.6))
    hooks.onPinch?.(px, py)
  } else if (!st.pinchClosed && pinch > span * 0.5) st.pinchClosed = true
  const open = ([[8, 6], [12, 10], [16, 14], [20, 18]] as const).every(
    ([tip, pip]) => me(lm[tip], wrist) > me(lm[pip], wrist) * 1.12
  )
  const still = st.lastPoint ? me(wrist, st.lastPoint) < 0.025 : false
  st.lastPoint = { x: wrist.x, y: wrist.y }
  if (open && still && pinch > span * 0.5) {
    st.palmFrames++
    if (st.palmFrames >= HAND.PINCH.palmFrames && !st.palmLocked && now - st.lastPalm > HAND.PINCH.palmCooldownMs) {
      st.palmLocked = true
      st.lastPalm = now
      hooks.onPalm?.()
    }
  } else {
    st.palmFrames = 0
    if (!open) st.palmLocked = false
  }
  return status
}

/** `V` di live — deteksi tepuk, dipakai loop analiser */
export function snapHit(peak: number, avg: number, now: number, st: HandRuntime) {
  return peak > HAND.SNAP.peak && peak > avg * HAND.SNAP.ratio && now - st.lastSnap > HAND.SNAP.cooldownMs && now - st.lastHandAt < HAND.SNAP.windowMs
}

/* ───────────────────────── perintah suara ───────────────────────── */

/** `bF` */
export const SPEECH_COMMANDS: { test: RegExp; send: MiraBody; say: string }[] = [
  { test: /\b(follow (me|the mouse|my finger)|stop looking|look around)\b/, send: { kind: 'look', release: true }, say: 'following you' },
  { test: /\b(at me|look here|face me|center)\b/, send: { kind: 'look', x: 0, y: 0 }, say: 'looking at you' },
  { test: /\bleft\b/, send: { kind: 'look', x: 0.85, y: 0 }, say: 'looking left' },
  { test: /\bright\b/, send: { kind: 'look', x: -0.85, y: 0 }, say: 'looking right' },
  { test: /\b(up|upwards|above)\b/, send: { kind: 'look', x: 0, y: -0.8 }, say: 'looking up' },
  { test: /\b(down|downwards|below)\b/, send: { kind: 'look', x: 0, y: 0.8 }, say: 'looking down' },
]

/** `RF` */
export function matchSpeech(text: unknown) {
  const e = String(text || '').toLowerCase()
  const looks = /\b(look|turn|move|head|face|eyes|follow|stop looking)\b/.test(e) || e.split(/\s+/).filter(Boolean).length <= 3
  return (looks && SPEECH_COMMANDS.find((n) => n.test.test(e))) || null
}

/** `CF` */
export function startSpeech(onResult?: (text: string, cmd: { send: MiraBody; say: string } | null) => void) {
  const W = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition
  if (!Ctor) return null
  let live = true
  const rec = new Ctor()
  rec.lang = 'en-US'
  rec.continuous = true
  rec.interimResults = false
  rec.onresult = (r: SpeechResults) => {
    for (let o = r.resultIndex; o < r.results.length; o++) {
      if (!r.results[o].isFinal) continue
      const text = r.results[o][0].transcript.trim()
      const cmd = matchSpeech(text)
      if (cmd) miraBody(cmd.send)
      onResult?.(text, cmd)
    }
  }
  rec.onend = () => {
    if (live) setTimeout(() => { if (live) try { rec.start() } catch { /* abaikan */ } }, 250)
  }
  rec.onerror = (ev: { error?: string }) => {
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') live = false
  }
  try {
    rec.start()
  } catch {
    return null
  }
  return {
    stop() {
      live = false
      try { rec.stop() } catch { /* abaikan */ }
    },
  }
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((r: SpeechResults) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
  start(): void
  stop(): void
}
interface SpeechResults {
  resultIndex: number
  results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } }
}
