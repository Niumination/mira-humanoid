/**
 * HumanoidMode — cangkang mode humanoid MIRA.
 *
 * Yang SUDAH ada (langkah 1 + 7 kerangka):
 *   - latar hitam fixed inset 0, zIndex 75 (bundle §7 di SPEC-MIRA)
 *   - baris tombol status `mira-page-row`: IDLE / LISTENING / TALKING + MIC
 *   - baris tombol milik sendiri `mira-own-row`: REPLAY / SPEED / SOUND  (kanan-bawah)
 *   - EXIT + ENABLE CAMERA (kiri-atas), aria-pressed & aria-label sama
 *   - panel 82 slider (lib/miraDial + Panel)
 *
 * Yang BELUM (langkah 2–8, menyusul berurutan):
 *   - 2 webp sebagai mask (`brightness(0) invert(1)`), ring, mesin garis (wire shader)  ← langkah 2
 *   - timeline ignition `lib/miraBuild` (flicker / touchWave / revealAt)                ← langkah 3
 *   - audio graph 16 osc + 36 gain + analyser→uEnergy                                   ← langkah 4
 *   - state machine penuh + 4 param *Her states*                                        ← langkah 5
 *   - MediaPipe point/pinch → `hum.touch.wave`                                          ← langkah 6
 *   - bloom (bloom.strength/threshold/radius) + alias hum.glow.*                        ← langkah 8
 */
import { useEffect, useRef, useState } from 'react'
import { Panel } from './Panel'
import { HandTracker, type AttentionRef } from './HandTracker'
import { MiraStage } from './MiraStage'
import type { Dial } from '../lib/miraDial'
import { ACCENT, STATE_BUTTONS, btnStyle, type MiraState } from '../lib/uiStyle'
import { boltOverride, boltAge, lastBody, LOOK_HOLD_MS, miraBody, startSpeech } from '../lib/miraHand'
import {
  aura,
  clearLevel,
  level,
  pinAura,
  setLevel,
  talkLevel,
  updateAura,
} from '../lib/miraAura'
import {
  bolt,
  contextState,
  cuesLength,
  playCues,
  primeUnlock,
  setRecording,
  setSoundEnabled,
  stopCues,
  unlockAudio,
  type SoundCue,
} from '../lib/miraAudio'

const CAMERA_MSG = {
  off: 'ENABLE CAMERA',
  on: 'CAMERA OFF',
} as const

export function HumanoidMode({
  state,
  onState,
  dial,
  onExit,
}: {
  state: MiraState
  onState: (s: MiraState) => void
  dial: Dial
  onExit?: () => void
}) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [replayKey, setReplayKey] = useState(0)
  const [cameraOn, setCameraOn] = useState(false)   // tombol ENABLE CAMERA / CAMERA OFF
  const [heard, setHeard] = useState('')            // baris `mira-heard`
  const attentionRef = useRef<AttentionRef>({ x: 0, y: 0, at: 0 })
  const [micOn, setMicOn] = useState(false) // langkah 4
  // live: `S = useState(() => localStorage.apex_sound_off === "1")`, tombol menampilkan SOUND {S ? ON : OFF}
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem('apex_sound_off') !== '1'
    } catch {
      return true
    }
  })
  const [speed, setSpeed] = useState(1)
  const stageRef = useRef<HTMLCanvasElement | null>(null)
  const cuesRef = useRef<SoundCue[] | null>(null)
  const pendingRef = useRef(false)   // live `w.current`: menunggu gestur pertama sebelum cue dijalankan
  const startedRef = useRef(false)

  const pinTime = (() => {
    if (typeof window === 'undefined') return null
    const v = new URLSearchParams(window.location.search).get('t')
    const n = v === null ? NaN : Number(v)
    return Number.isFinite(n) ? n : null
  })()

  /** jalankan skor adegan dari `at` (live `k()` → `vd(MIRA_BUILD,{cues, at})`) */
  const startCues = (from?: number) => {
    const cues = cuesRef.current
    if (!cues) return
    playCues(cues, from ?? pinTime ?? 0)
    startedRef.current = true
  }

  // perhatian dari penunjuk (live `AF`): pointermove/pointerdown → `M.current`;
  // `?attn=x,y` dipakai lapisan gambar (MiraStage, live `eF`), `?bolt=x,y` memaku posisi percikan
  useEffect(() => {
    const norm = (ev: PointerEvent) => ({
      x: Math.max(-1, Math.min(1, (ev.clientX / window.innerWidth) * 2 - 1)),
      y: Math.max(-1, Math.min(1, (ev.clientY / window.innerHeight) * 2 - 1)),
    })
    const held = () => performance.now() - ((attentionRef.current.fingerHold as number) || 0) < 1200
    const onMove = (ev: PointerEvent) => {
      if (held()) return
      Object.assign(attentionRef.current, norm(ev), { at: performance.now() })
    }
    const onDown = (ev: PointerEvent) => {
      const el = ev.target as HTMLElement | null
      if (el?.closest?.('button, input, select, textarea')) return
      const p = norm(ev)
      if (!held()) Object.assign(attentionRef.current, p, { at: performance.now() })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown)
    // `mira-body` (perintah suara / tangan) → arahkan perhatian
    const onBody = (ev: Event) => {
      const d = (ev as CustomEvent).detail as { kind?: string; x?: number; y?: number; release?: boolean }
      if (d?.kind !== 'look') return
      if (d.release) {
        attentionRef.current.voice = null
        return
      }
      attentionRef.current.voice = { x: d.x ?? 0, y: d.y ?? 0, until: performance.now() + LOOK_HOLD_MS }
      attentionRef.current.at = performance.now()
    }
    const recent = lastBody('look') // live: `X=qN("look"); X&&D(X)`
    if (recent && !recent.release) {
      attentionRef.current.voice = { x: recent.x ?? 0, y: recent.y ?? 0, until: performance.now() + LOOK_HOLD_MS }
    }
    window.addEventListener('mira-body', onBody)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('mira-body', onBody)
    }
  }, [])

  // aura (live `MF` + `QU`): status MIRA + level bicara → `RN.talk` / `RN.listen` / `RN.voice`.
  // Level bicara: mikrofon bila MIC ON (level nyata), selain itu `PF(t)` prosedural seperti live.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const t0 = performance.now()
    const loop = () => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      const speaking = state === 'talking'
      if (speaking) setLevel('output', micRef.current ? micRef.current.level() : talkLevel((now - t0) / 1000))
      else clearLevel('output')
      updateAura(dt, { energy: level('output'), speaking, listening: state === 'listening' })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      clearLevel('output')
    }
  }, [state, micOn])

  // pin aura dari URL (live `AF`): `?listen` / `?talk` / `?voice`
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.has('listen') || q.has('talk')) {
      pinAura({
        voice: Number(q.get('voice') || 0),
        talk: Number(q.get('talk') || 0),
        listen: Number(q.get('listen') || 0),
      })
    }
    return () => pinAura(null)
  }, [])

  /** live `y()` — MIC: mikrofon nyata (analiser 512, level = min(1, √rata²·6)) atau mati */
  const micRef = useRef<{ level: () => number; stop: () => void } | null>(null)
  /** live `B(x,y)` — pinch/klik = bolt pada posisi itu (ambang 150 ms, id bertambah) */
  const boltRef = useRef<{ x: number; y: number; id: number; when: number } | null>(null)
  const palmsRef = useRef(0)
  const boltPress = (x: number, y: number) => {
    const prev = boltRef.current
    if (prev && performance.now() - prev.when < 150) return
    boltRef.current = { x, y, id: (prev?.id || 0) + 1, when: performance.now() }
    bolt({ pan: x * 0.8 })
  }
  void boltAge
  void boltOverride

  const toggleMic = async () => {
    if (micRef.current) {
      micRef.current.stop()
      micRef.current = null
      speechRef.current?.stop() // live: `h.current?.stop(); h.current=null`
      speechRef.current = null
      setRecording(false)
      setHeard('')
      setMicOn(false)
      return
    }
    setRecording(true) // live `Od(!0)` sebelum meminta mikrofon
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AC()
      const an = ctx.createAnalyser()
      an.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(an)
      const buf = new Uint8Array(an.fftSize)
      micRef.current = {
        level: () => {
          an.getByteTimeDomainData(buf)
          let sum = 0
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128
            sum += v * v
          }
          return Math.min(1, Math.sqrt(sum / buf.length) * 6)
        },
        stop: () => {
          stream.getTracks().forEach((t) => t.stop())
          ctx.close()
        },
      }
      setMicOn(true)
      onState('talking')
      const rec = startSpeech((text, cmd) => setHeard(cmd ? `heard "${text}" - ${cmd.say}` : `heard "${text}"`))
      setHeard(rec ? 'say "look left", "look right", "look at me" or "follow me"' : 'voice commands are not available in this browser')
      if (rec) speechRef.current = rec
    } catch {
      setRecording(false) // live: `catch { Od(!1) }`
      setMicOn(false)
    }
  }
  const speechRef = useRef<{ stop: () => void } | null>(null)
  const heardRef = useRef('')
  heardRef.current = heard
  const cameraRef = useRef(false)
  cameraRef.current = cameraOn

  // diagnostik (seperti `__MIRA_*` di panggung): status mesin audio untuk alat verifikasi
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__MIRA_AUDIO = () => ({
      state: contextState(),
      cues: cuesRef.current?.length ?? 0,
      started: startedRef.current,
      soundOn,
      scoreLength: cuesRef.current ? cuesLength(cuesRef.current) : 0,
      aura: { ...aura() },
      bright: (window as unknown as { __MIRA_RAMP?: { t: number } }).__MIRA_RAMP?.t ?? null,
    })
    ;(window as unknown as Record<string, unknown>).__MIRA_MIC = () => ({
      on: !!micRef.current,
      level: micRef.current ? micRef.current.level() : 0,
      heard: heardRef.current,
      speech: !!speechRef.current,
      camera: cameraRef.current,
      attention: { ...attentionRef.current },
      bolt: boltRef.current ? { ...boltRef.current } : null,
      palms: palmsRef.current,
    })
  }, [soundOn])

  // unlock: live memanggil `Pg()` saat mount lalu menandai `w.current` bila konteks belum running,
  // dan menyelesaikannya pada `pointerdown`/`keydown` pertama.
  useEffect(() => {
    primeUnlock()
    const st = unlockAudio()
    if (st !== 'running') pendingRef.current = true
    const retry = () => {
      unlockAudio()
      if (pendingRef.current) {
        pendingRef.current = false
        if (cuesRef.current && soundOn) startCues()
      }
    }
    window.addEventListener('pointerdown', retry)
    window.addEventListener('keydown', retry)
    return () => {
      window.removeEventListener('pointerdown', retry)
      window.removeEventListener('keydown', retry)
      stopCues()
      micRef.current?.stop()
      speechRef.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // SOUND ON/OFF: live menyimpan `apex_sound_off` dan mematikan/menyalakan mesin suara.
  useEffect(() => {
    setSoundEnabled(soundOn)
    try {
      localStorage.setItem('apex_sound_off', soundOn ? '0' : '1')
    } catch { /* mode privat */ }
    if (!soundOn) {
      stopCues()
      startedRef.current = false
    } else if (cuesRef.current && speed === 1) startCues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn])

  // skor baru dari panggung: putar bila suara hidup & kecepatan 1 (live: `m !== 1` → hanya `{stop:true}`)
  useEffect(() => {
    if (!soundOn || speed !== 1) return
    if (startedRef.current) return
    if (unlockAudio() === 'running') startCues()
    else pendingRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, soundOn])

  // `MIRA_BOLT`: klik/sentuh → bunyi bolt + pan dari posisi X (live: `pan: x*0,8`, ambang 150 ms,
  // diabaikan bila sasaran ada di dalam button/input/select/textarea)
  useEffect(() => {
    const onDown = (ev: PointerEvent) => {
      const el = ev.target as HTMLElement | null
      if (el?.closest?.('button, input, select, textarea')) return
      const x = Math.max(-1, Math.min(1, (ev.clientX / window.innerWidth) * 2 - 1))
      const y = Math.max(-1, Math.min(1, (ev.clientY / window.innerHeight) * 2 - 1))
      boltPress(x, y)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // kanvas latar sementara (langkah 2 menggantinya dengan WebGL + mesin garis)
  useEffect(() => {
    const c = stageRef.current
    if (!c) return
    c.width = 1007
    c.height = 630
    const g = c.getContext('2d')
    if (!g) return
    g.fillStyle = '#000'
    g.fillRect(0, 0, c.width, c.height)
  }, [])

  return (
    <div
      data-testid="mira-humanoid-mode"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 75,
        background: '#000',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* mesin garis: artwork → garis → mesh wire (langkah 2) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <MiraStage
          state={state}
          dial={dial}
          speed={speed}
          replayKey={replayKey}
          pinTime={pinTime}
          attention={attentionRef}
          onError={(m) => console.warn('mira-stage', m)}
          onCues={(cues) => {
            cuesRef.current = cues
            if (!soundOn || speed !== 1) return
            if (unlockAudio() === 'running') startCues()
            else pendingRef.current = true
          }}
        />
      </div>

      <canvas
        ref={stageRef}
        aria-label="mira humanoid"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          background: 'transparent',
        }}
      />

      {/* kiri-atas: EXIT + ENABLE CAMERA (bundle: dua tombol, minHeight 44) */}
      <div style={{ position: 'absolute', left: 18, top: 18, display: 'flex', gap: 8, alignItems: 'center', zIndex: 2 }}>
        {onExit && (
          <button style={{ ...btnStyle(false), minHeight: 44 }} onClick={onExit} aria-label="Exit" data-testid="mira-exit">
            EXIT
          </button>
        )}
        <button
          style={{
            ...btnStyle(cameraOn),
            minHeight: 44,
            padding: '0 13px',
            color: cameraOn ? '#ffd27a' : ACCENT,
            borderColor: cameraOn ? '#ffd27a88' : `${ACCENT}55`,
          }}
          data-testid="mira-humanoid-camera"
          aria-pressed={cameraOn}
          aria-label="Turn the camera (hand tracking) on or off"
          onClick={() => setCameraOn((v) => !v)}
        >
          {cameraOn ? CAMERA_MSG.on : CAMERA_MSG.off}
        </button>
        {cameraOn && (
          <span
            aria-label="The camera is on"
            title="The camera is on"
            data-testid="mira-camera-dot"
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#ff4444',
              boxShadow: '0 0 10px #ff4444aa',
              animation: 'fadeInOut 1.6s ease infinite',
            }}
          />
        )}
      </div>

      {/* kanan-bawah: REPLAY / SPEED / SOUND */}
      <div
        className="mira-own-row"
        style={{ position: 'absolute', right: 18, bottom: 18, display: 'flex', gap: 8, zIndex: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}
      >
        <button
          className="mira-btn"
          style={btnStyle(false)}
          data-testid="mira-replay"
          onClick={() => {
            setReplayKey((k) => k + 1)
            startedRef.current = false
            if (soundOn && speed === 1) startCues(0)
          }}
        >
          REPLAY
        </button>
        <button
          className="mira-btn"
          style={btnStyle(false)}
          onClick={() => {
            setSpeed((s) => (s === 1 ? 0.3 : 1))
            // live: `vd(MIRA_BUILD,{stop:true})` setiap kali kecepatan berubah
            stopCues()
            startedRef.current = false
          }}
          data-testid="mira-speed"
        >
          SPEED {speed}x
        </button>
        <button
          className="mira-btn"
          style={btnStyle(false)}
          data-testid="mira-humanoid-sound"
          aria-pressed={soundOn}
          onClick={() => setSoundOn((v) => !v)}
        >
          SOUND {soundOn ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* kiri-bawah: status + MIC (bundle: mira-page-row) */}
      <div
        className="mira-page-row"
        style={{ position: 'fixed', left: 18, bottom: 18, zIndex: 200, display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        {STATE_BUTTONS.map(([k, label]) => (
          <button
            key={k}
            className="mira-btn"
            style={btnStyle(state === k)}
            aria-pressed={state === k}
            onClick={() => onState(k)}
            data-testid={`mira-state-${k}`}
          >
            {label}
          </button>
        ))}
        <button
          className="mira-btn"
          style={btnStyle(micOn)}
          aria-pressed={micOn}
          title="While she talks, her voice follows your microphone's loudness"
          onClick={() => toggleMic()}
          data-testid="mira-mic"
        >
          MIC {micOn ? 'ON' : 'OFF'}
        </button>
        {micOn && heard && (
          <div
            className="mira-heard"
            role="status"
            data-testid="mira-heard"
            style={{
              flexBasis: '100%',
              color: ACCENT,
              opacity: 0.8,
              font: "11px 'Share Tech Mono', monospace",
              letterSpacing: '0.06em',
            }}
          >
            {heard}
          </div>
        )}
      </div>

      {/* kamera + tangan (live `QN`) — hanya saat kamera menyala */}
      {cameraOn && (
        <HandTracker
          attentionRef={attentionRef}
          color={ACCENT}
          onPinch={(x, y) => boltPress(x, y)}
          onPalm={() => {
            palmsRef.current++
            onState('idle')
          }}
          onSnap={() => onState('listening')}
        />
      )}

      {/* panel 82 slider — tambahan yang disengaja, default tertutup */}
      <div style={{ position: 'absolute', right: 18, top: 18, zIndex: 300, display: 'flex', gap: 8 }}>
        <Panel dial={dial} open={panelOpen} onToggle={() => setPanelOpen((v) => !v)} onClose={() => setPanelOpen(false)} />
      </div>
    </div>
  )
}
