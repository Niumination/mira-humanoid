/**
 * miraAura — port sistem "aura/state" live (bundle ≈ 1 030 070 & 1 126 500 & 1 166 500).
 *
 *   `Rn`  = {mira, orb, matter, routes, live, voice, talk, listen, pace}   → `aura()`
 *   `Ul()`= Rn                                                            → `aura()`
 *   `Aw()`= pace clamp 0,2..6                                             → `setPace()`
 *   `QU()`= pelunakan voice/talk/listen per detik                         → `updateAura()`
 *   `bw()`= pin aura (dipakai `?listen`/`?talk`/`?voice`)                  → `pinAura()`
 *   `Rw()`= set mira/orb/matter (0..1)                                    → `setPresence()`
 *   `up`/`$U`/`A_`/`Cw` = kanal level keluaran (mic/voice)                → `setLevel`/`level`/`clearLevel`
 *   `VN(i,e)` = {speed, bright} dari aura + 4 param *Her states*           → `herSpeedBright()`
 *   `GN(i)`   = pembaca 4 param yang sama                                  → `herStateParams()`
 *
 * Angka koefisien (verbatim):
 *   voice  : += (target − voice ) · min(1, r · (naik ? 28 : 7))
 *   talk   : += (target − talk  ) · min(1, r · (naik ? 10 : 2,2))
 *   listen : += (target − listen) · min(1, r · 4)
 *   r = clamp(dt, 0, 0,1) · nilai < 0,01 dijadikan 0
 *
 * Pemakaian di panggung (sama seperti live):
 *   `speed` mengalikan jam build & jam napas; `bright` mengalikan `uGain`/`uPulse`/`uBright`
 *   garis, gambar, aura, dan lampu.
 */

export interface AuraState {
  mira: number
  orb: number
  matter: number
  routes: number
  live: boolean
  voice: number
  talk: number
  listen: number
  pace: number
}

let presenceSet = false
const up: Record<string, number> = { input: 0, output: 0 }

const Rn: AuraState = { mira: 0, orb: 0, matter: 0, routes: 1, live: false, voice: 0, talk: 0, listen: 0, pace: 1 }

/** `Ul` */
export const aura = (): AuraState => Rn

/** reset penuh (dipakai alat gerbang; tidak ada di live karena modulnya sekali pakai) */
export function clearAura() {
  presenceSet = false
  pinned = null
  for (const k of ['mira', 'orb', 'matter', 'voice', 'talk', 'listen'] as const) Rn[k] = 0
  Rn.routes = 1
  Rn.live = false
  Rn.pace = 1
  up.input = 0
  up.output = 0
}

/** `Aw` */
export function setPace(i: number) {
  Rn.pace = i > 0.2 && i < 6 ? i : 1
}

/** `bw` — pin nilai aura (tanpa pelunakan); `null` = lepas pin */
export function pinAura(i: { voice?: number; talk?: number; listen?: number } | null) {
  pinned = i
  Rn.voice = i ? i.voice ?? 0 : 0
  Rn.talk = i ? i.talk ?? 0 : 0
  Rn.listen = i ? i.listen ?? 0 : 0
}

let pinned: { voice?: number; talk?: number; listen?: number } | null = null

/** `QU` */
export function updateAura(dt: number, { energy = 0, speaking = false, listening = false } = {}) {
  if (pinned) {
    Rn.voice = pinned.voice ?? 0
    Rn.talk = pinned.talk ?? 0
    Rn.listen = pinned.listen ?? 0
    return Rn
  }
  const r = Math.min(Math.max(dt || 0, 0), 0.1)
  const o = speaking ? Math.min(1, Math.max(0, energy)) : 0
  Rn.voice += (o - Rn.voice) * Math.min(1, r * (o > Rn.voice ? 28 : 7))
  const a = speaking ? 1 : 0
  Rn.talk += (a - Rn.talk) * Math.min(1, r * (a > Rn.talk ? 10 : 2.2))
  const c = listening && !speaking ? 1 : 0
  Rn.listen += (c - Rn.listen) * Math.min(1, r * 4)
  if (Rn.voice < 0.01) Rn.voice = 0
  if (Rn.talk < 0.01) Rn.talk = 0
  if (Rn.listen < 0.01) Rn.listen = 0
  return Rn
}

const Xy = (i: number) => (i < 0 ? 0 : i > 1 ? 1 : i)

/** `Rw` — jepit 0..1; `null` hanya mengosongkan bila sebelumnya pernah diisi (`qy`) */
export function setPresence(i: { waves?: number; orb?: number; matter?: number } | null) {
  if (!i) {
    if (!presenceSet) return
    presenceSet = false
    Rn.mira = 0
    Rn.orb = 0
    Rn.matter = 0
    return
  }
  presenceSet = true
  Rn.mira = Xy(i.waves ?? 0)
  Rn.orb = Xy(i.orb ?? 0)
  Rn.matter = Xy(i.matter ?? 0)
}

/* ── kanal level (`up`, `$U`, `A_`, `Cw`) ───────────────────────────────────── */

const JU = (i: unknown) => Math.max(0, Math.min(1, Number(i) || 0))

export function setLevel(name: 'input' | 'output', v: unknown) {
  if (name in up) up[name] = JU(v)
}

export function level(name: 'input' | 'output') {
  return up[name] || 0
}

export function clearLevel(name: 'input' | 'output') {
  if (name in up) up[name] = 0
}

/* ── 4 param *Her states* ───────────────────────────────────────────────────── */

export interface HerStates {
  talkSpeed: number
  talkBright: number
  listenSpeed: number
  listenBright: number
}

/** `GN` */
export const herStateParams = (get: (key: string) => number): HerStates => ({
  talkSpeed: get('hum.state.talkSpeed'),
  talkBright: get('hum.state.talkBright'),
  listenSpeed: get('hum.state.listenSpeed'),
  listenBright: get('hum.state.listenBright'),
})

const tx = (i: number) => Math.max(0, Math.min(1, i || 0))

/** `VN` */
export function herSpeedBright(
  s: { talk?: number; listen?: number; voice?: number },
  p: HerStates
): { speed: number; bright: number } {
  const t = tx(s.talk || 0)
  const n = tx(s.listen || 0) * (1 - t)
  const r = tx(s.voice || 0)
  return {
    speed: 1 + (p.talkSpeed - 1) * t + (p.listenSpeed - 1) * n,
    bright: 1 + (p.talkBright - 1) * t * (0.7 + 0.6 * r) + (p.listenBright - 1) * n,
  }
}

/** `Kk` — pengali jam saat sentuhan (`tv.quicken = 1,5`); tanpa sentuhan `touchT0 = −1e9` → 1 */
export const TOUCH = { quicken: 1.5 }
export function touchRate(ht: number) {
  return ht >= 0 && ht < 3 ? 1 + TOUCH.quicken * Math.exp(-ht / 0.6) : 1
}

/** `PF` — level bicara prosedural (dipakai bila mikrofon mati) */
export function talkLevel(t: number) {
  if ((t / 1.9) % 1 > 0.78) return 0.04
  const d = Math.max(0, Math.sin(t * 2 * Math.PI * 4.1))
  return Math.min(1, 0.15 + 0.85 * Math.pow(d, 1.4) * (0.65 + 0.35 * Math.sin(t * 1.7)))
}
