/**
 * HandTracker — port VERBATIM komponen `QN` dari bundle live (≈ 1 131 286 – 1 136 120).
 *
 * Alur:
 *   getUserMedia({video:{facingMode:'user',width:320,height:240}, audio:true}) → bila audio gagal,
 *   ulagi tanpa audio · `<video>` 1×1 piksel tak terlihat memutar stream · analiser 1024 untuk
 *   deteksi tepuk tangan · worker (sumber `HAND_WORKER_SOURCE`) memuat MediaPipe hand_landmarker ·
 *   frame 256×192 dikirim tiap 40 ms (jarak ≥ 80 ms) · bila worker gagal → MediaPipe di thread utama
 *   tiap 125 ms (delegate GPU lalu CPU) · landmark → `attentionRef` + onPinch/onPalm/onSnap.
 *
 * Status ditampilkan sebagai satu baris teks berwarna (di live: `#19ddff`), `--mira-status-top` 72 px.
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import {
  HAND,
  HAND_WORKER_SOURCE,
  handLandmarks,
  handRuntime,
  snapHit,
  type HandHooks,
  type Landmark,
} from '../lib/miraHand'

type Handler = HandHooks

export interface AttentionRef {
  x: number
  y: number
  at?: number
  fingerHold?: number
  voice?: { x: number; y: number; until: number } | null
}

export function HandTracker({
  attentionRef,
  onPinch,
  onPalm,
  onSnap,
  color = HAND.COLOR,
}: {
  attentionRef: { current: AttentionRef }
  onPinch?: (x: number, y: number) => void
  onPalm?: () => void
  onSnap?: () => void
  color?: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [status, setStatus] = useState('')
  const lastStatus = useRef('')
  const setStatusOnce = (s: string) => {
    if (lastStatus.current !== s) {
      lastStatus.current = s
      setStatus(s)
    }
  }
  const handlers = useRef<Handler>({})
  handlers.current = { onPinch, onPalm, onSnap }

  useEffect(() => {
    let alive = true
    let raf = 0
    let stream: MediaStream | null = null
    let worker: Worker | null = null
    let workerUrl: string | null = null
    let audioCtx: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let audioBuf: Float32Array<ArrayBuffer> | null = null
    let landmarkerMain: { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks?: Landmark[][] } } | null = null
    let stopInterval: () => void = () => {}
    let hadAudio = false
    let hasAudio = false
    let prevFrameAt = 0
    let workerBusy = false
    let avgPeak = 0.02
    const hand = handRuntime()
    // diagnostik: keadaan antar-frame (live: variabel `L,D,X,J,M,Z,K` di dalam `QN`)
    ;(window as unknown as Record<string, unknown>).__MIRA_HAND = hand

    /** `G` — landmark → perhatian/pinch/palm (logika murni di `miraHand.ts`) */
    const onLandmarks = (lm: Landmark[] | null, now: number) => {
      if (!alive) return
      const status = handLandmarks(
        hand,
        lm,
        now,
        attentionRef.current,
        handlers.current,
        !!((window as unknown as { __HUM_ATTN?: number }).__HUM_ATTN)
      )
      if (status) setStatusOnce(status)
    }

    ;(async () => {
      setStatusOnce('starting the camera')
      hadAudio = true // live memanggil `Od(1)` (audio session "play-and-record")
      try {
        const md = navigator.mediaDevices as MediaDevices | undefined
        if (!md?.getUserMedia) throw new Error('this browser has no camera access here')
        try {
          stream = await md.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: true })
          hasAudio = stream.getAudioTracks().length > 0
        } catch {
          stream = await md.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } })
        }
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current!
        video.srcObject = stream
        await video.play()
        setStatusOnce('loading hand tracking')

        // tepuk tangan (live: analiser 1024, puncak > 0,22 & > rata-rata·5)
        if (hasAudio) {
          try {
            const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            audioCtx = new AC()
            await audioCtx.resume()
            const src = audioCtx.createMediaStreamSource(stream)
            analyser = audioCtx.createAnalyser()
            analyser.fftSize = 1024
            src.connect(analyser)
            audioBuf = new Float32Array(analyser.fftSize)
          } catch {
            hasAudio = false
          }
        }
        const snapLoop = () => {
          if (!alive || (raf = requestAnimationFrame(snapLoop), !analyser)) return
          const now = performance.now()
          analyser.getFloatTimeDomainData(audioBuf!)
          let peak = 0
          for (let i = 0; i < audioBuf!.length; i += 4) {
            const v = Math.abs(audioBuf![i])
            if (v > peak) peak = v
          }
          const hit = snapHit(peak, avgPeak, now, hand)
          avgPeak += (peak - avgPeak) * (peak > avgPeak ? 0.06 : 0.02)
          if (hit) {
            hand.lastSnap = now
            handlers.current.onSnap?.()
          }
        }
        raf = requestAnimationFrame(snapLoop)

        // worker MediaPipe
        const workerReady = await new Promise<boolean>((resolve) => {
          try {
            workerUrl = URL.createObjectURL(new Blob([HAND_WORKER_SOURCE], { type: 'text/javascript' }))
            worker = new Worker(workerUrl, { type: 'module' })
            const timer = setTimeout(() => resolve(false), 20000)
            worker.onmessage = (ev: MessageEvent) => {
              const d = ev.data as { type: string; lm?: Landmark[] | null }
              if (d.type === 'ready') {
                clearTimeout(timer)
                resolve(true)
              } else if (d.type === 'fail') {
                clearTimeout(timer)
                resolve(false)
              } else if (d.type === 'lm') {
                workerBusy = false
                onLandmarks(d.lm ?? null, performance.now())
              }
            }
            worker.onerror = () => {
              clearTimeout(timer)
              resolve(false)
            }
            worker.postMessage({ type: 'init' })
          } catch {
            resolve(false)
          }
        })
        if (!alive) return

        if (workerReady) {
          const cv = document.createElement('canvas')
          cv.width = HAND.W
          cv.height = HAND.H
          const ctx = cv.getContext('2d', { willReadFrequently: true })!
          const id = setInterval(() => {
            if (!alive || workerBusy || !video || video.readyState < 2) return
            const now = performance.now()
            if (now - prevFrameAt < HAND.FRAME_GAP_MS) return
            prevFrameAt = now
            try {
              ctx.drawImage(video, 0, 0, HAND.W, HAND.H)
              const img = ctx.getImageData(0, 0, HAND.W, HAND.H)
              workerBusy = true
              worker!.postMessage({ type: 'frame', buf: img.data.buffer, w: HAND.W, h: HAND.H, t: now }, [img.data.buffer])
            } catch { /* frame gagal */ }
          }, HAND.FRAME_MS)
          stopInterval = () => clearInterval(id)
          setStatusOnce('camera on - show your hand')
        } else {
          // fallback: MediaPipe di thread utama (GPU lalu CPU)
          try {
            ;(worker as Worker | null)?.terminate()
          } catch { /* abaikan */ }
          worker = null
          const vision = (await import(/* @vite-ignore */ HAND.VISION)) as {
            FilesetResolver: { forVisionTasks: (w: string) => Promise<unknown> }
            HandLandmarker: { createFromOptions: (r: unknown, o: unknown) => Promise<typeof landmarkerMain> }
          }
          const resolver = await vision.FilesetResolver.forVisionTasks(HAND.WASM)
          const make = (delegate: string) =>
            vision.HandLandmarker.createFromOptions(resolver, {
              baseOptions: { modelAssetPath: HAND.MODEL, delegate },
              runningMode: 'VIDEO',
              numHands: 1,
            })
          try {
            landmarkerMain = await make('GPU')
          } catch {
            landmarkerMain = await make('CPU')
          }
          if (!alive) return
          setStatusOnce('camera on - show your hand')
          const id = setInterval(() => {
            if (!alive || !video || video.readyState < 2) return
            const now = performance.now()
            let out: { landmarks?: Landmark[][] } | undefined
            try {
              out = landmarkerMain!.detectForVideo(video, now)
            } catch {
              return
            }
            onLandmarks(out?.landmarks?.[0] || null, now)
          }, HAND.DETECT_MS)
          stopInterval = () => clearInterval(id)
        }
      } catch (err) {
        const name = (err as { name?: string })?.name || ''
        if (alive) {
          setStatusOnce(
            name === 'NotAllowedError'
              ? 'camera blocked - allow it in the browser settings'
              : name === 'NotFoundError'
                ? 'no camera found'
                : 'camera unavailable'
          )
        }
      }
    })()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      stopInterval()
      try { worker?.terminate() } catch { /* abaikan */ }
      try { if (workerUrl) URL.revokeObjectURL(workerUrl) } catch { /* abaikan */ }
      try { audioCtx?.close() } catch { /* abaikan */ }
      try { videoRef.current && (videoRef.current.srcObject = null) } catch { /* abaikan */ }
      try { stream?.getTracks().forEach((t) => t.stop()) } catch { /* abaikan */ }
      void hadAudio
    }
  }, [attentionRef])

  return (
    <Fragment>
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      {status && (
        <div
          role="status"
          data-testid="mira-camera-status"
          style={{
            position: 'absolute',
            top: 'var(--mira-status-top, 72px)',
            left: 18,
            zIndex: 2,
            padding: '5px 10px',
            border: `1px solid ${color}33`,
            borderRadius: 7,
            background: 'rgba(0, 10, 14, 0.6)',
            color,
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10.5,
            letterSpacing: '0.08em',
            pointerEvents: 'none',
            opacity: 0.85,
          }}
        >
          {status}
        </div>
      )}
    </Fragment>
  )
}
