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
import { MiraStage } from './MiraStage'
import type { Dial } from '../lib/miraDial'
import { ACCENT, STATE_BUTTONS, btnStyle, type MiraState } from '../lib/uiStyle'

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
  const [cameraOn] = useState(false) // langkah 6
  const [micOn, setMicOn] = useState(false) // langkah 4
  const [soundOn, setSoundOn] = useState(false) // bundle: S = !soundOn untuk label "SOUND ON/OFF"
  const [speed, setSpeed] = useState(1)
  const stageRef = useRef<HTMLCanvasElement | null>(null)

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
        <MiraStage onError={(m) => console.warn('mira-stage', m)} />
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
        >
          {cameraOn ? CAMERA_MSG.on : CAMERA_MSG.off}
        </button>
      </div>

      {/* kanan-bawah: REPLAY / SPEED / SOUND */}
      <div
        className="mira-own-row"
        style={{ position: 'absolute', right: 18, bottom: 18, display: 'flex', gap: 8, zIndex: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}
      >
        <button className="mira-btn" style={btnStyle(false)} data-testid="mira-replay">
          REPLAY
        </button>
        <button
          className="mira-btn"
          style={btnStyle(false)}
          onClick={() => setSpeed((s) => (s === 1 ? 0.3 : 1))}
        >
          SPEED {speed}x
        </button>
        <button
          className="mira-btn"
          style={btnStyle(false)}
          data-testid="mira-humanoid-sound"
          aria-pressed={!soundOn}
          onClick={() => setSoundOn((v) => !v)}
        >
          SOUND {soundOn ? 'OFF' : 'ON'}
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
          onClick={() => setMicOn((v) => !v)}
          data-testid="mira-mic"
        >
          MIC {micOn ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* panel 82 slider — tambahan yang disengaja, default tertutup */}
      <div style={{ position: 'absolute', right: 18, top: 18, zIndex: 300, display: 'flex', gap: 8 }}>
        <Panel dial={dial} open={panelOpen} onToggle={() => setPanelOpen((v) => !v)} onClose={() => setPanelOpen(false)} />
      </div>
    </div>
  )
}
