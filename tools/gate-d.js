#!/usr/bin/env node
/**
 * gate-d.js — GERBANG D sisa (proyek): reproduktibilitas, seam, fps, stabilitas, viewport 390.
 *
 * D5 reproduktibilitas : dua run terpisah pada `?t=` sama → MAE (kita vs kita, live vs live)
 * D6 seam              : lonjakan baris tiba-tiba (batas dua lapisan) → skor & baris puncak
 * D7 fps               : frame/detik dari rAF di lingkungan yang SAMA untuk live & kita
 * D8 stabilitas        : 120 s berjalan — error halaman, konteks WebGL, jumlah frame
 * D9 viewport 390×844  : reproduktibilitas + MAE kita vs live di layar ponsel
 *
 * Pakai: node tools/gate-d.js [--build URL] [--live URL] [--json]
 *        default build http://127.0.0.1:8804/ · live https://mira-humanoid.vercel.app/
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const ARG = process.argv.slice(2)
const getArg = (name, dflt) => {
  const i = ARG.indexOf(name)
  return i >= 0 ? ARG[i + 1] : dflt
}
const BUILD = getArg('--build', 'http://127.0.0.1:8804/')
const LIVE = getArg('--live', 'https://mira-humanoid.vercel.app/')
const OUT = '/home/user/Kerja-Arena/verification/mira/gate-d.json'
const SHOTS = '/tmp/gated'

const ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--autoplay-policy=no-user-gesture-required',
]

const rows = []
const add = (id, name, ok, detail) => {
  rows.push({ id, name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${name}  ${detail ?? ''}`)
}

/** satu tangkapan layar; UI disembunyikan supaya yang diukur benar-benar piksel panggung */
async function shoot(base, t, { vp = { width: 1440, height: 900 }, wait = 3200, extra = '', hide = true } = {}) {
  const b = await chromium.launch({ args: ARGS })
  const p = await b.newPage({ viewport: vp })
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 140)))
  await p.goto(`${base}?auto=1&t=${t}${extra}`, { waitUntil: 'load', timeout: 120000 })
  await p.waitForTimeout(wait)
  if (hide) {
    await p.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        const s = getComputedStyle(el)
        if (el.tagName === 'CANVAS' || el.tagName === 'IMG') continue
        if (s.position === 'fixed' || s.position === 'absolute') {
          if (el.querySelector('canvas')) continue
          el.style.visibility = 'hidden'
        }
      }
    })
    await p.waitForTimeout(300)
  }
  const file = path.join(SHOTS, `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${t}.png`)
  await p.screenshot({ path: file })
  await b.close()
  return { file, errs }
}

function mae(a, b) {
  const py = `
import sys, json
import numpy as np
from PIL import Image
A = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
B = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
h = min(A.shape[0], B.shape[0]); w = min(A.shape[1], B.shape[1])
A, B = A[:h, :w], B[:h, :w]
d = np.abs(A - B)
print(json.dumps({'mae': float(d.mean()), 'n': int((d.max(axis=2) > 2).sum()), 'h': int(h), 'w': int(w), 'meanA': float(A.mean()), 'meanB': float(B.mean())}))
`
  return JSON.parse(execFileSync('python3', ['-c', py, a, b]).toString())
}

/** skor seam: lonjakan rata-rata |baris(y) − baris(y−1)| dibanding tetangganya */
function seam(file) {
  const py = `
import sys, json
import numpy as np
from PIL import Image
A = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float).mean(axis=2)
h = A.shape[0]
rows = np.abs(np.diff(A, axis=0)).mean(axis=1)      # row[y] = |baris y+1 − baris y|
base = np.median(rows)
lo, hi = int(h * 0.25), int(h * 0.95)
seg = rows[lo:hi]
peak = int(np.argmax(seg)) + lo
# lonjakan = puncak / median lokal (jendela ±40 baris, tanpa baris puncak)
nb = np.concatenate([rows[max(lo, peak - 40):peak], rows[peak + 1:peak + 41]])
local = float(np.median(nb)) if nb.size else float(base)
print(json.dumps({'peakRow': peak, 'peakVal': float(seg.max()), 'median': float(base), 'local': local,
                  'ratio': float(seg.max() / local) if local > 0 else 0.0, 'h': int(h)}))
`
  return JSON.parse(execFileSync('python3', ['-c', py, file]).toString())
}

/** korelasi profil baris (tahan-terhadap-kecerahan): mengukur KECOCOKAN GEOMETRI, bukan terang */
function corr(fileA, fileB) {
  const py = `
import sys, json
import numpy as np
from PIL import Image
def prof(p):
    a = np.asarray(Image.open(p).convert('RGB')).astype(float).mean(axis=2)
    r = a.mean(axis=1)
    return (r - r.mean()) / (r.std() + 1e-9)
print(json.dumps({'corr': float(np.corrcoef(prof(sys.argv[1]), prof(sys.argv[2]))[0, 1])}))
`
  return JSON.parse(execFileSync('python3', ['-c', py, fileA, fileB]).toString()).corr
}

/** ukur fps dari rAF (lingkungan sama untuk kedua aplikasi) */
async function fps(base, seconds = 10) {
  const b = await chromium.launch({ args: ARGS })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto(`${base}?auto=1&t=8`, { waitUntil: 'load', timeout: 120000 })
  await p.waitForTimeout(2500)
  const r = await p.evaluate(
    (sec) =>
      new Promise((res) => {
        let n = 0
        const t0 = performance.now()
        const step = () => {
          n++
          if (performance.now() - t0 < sec * 1000) requestAnimationFrame(step)
          else res({ frames: n, sec: (performance.now() - t0) / 1000, fps: n / ((performance.now() - t0) / 1000) })
        }
        requestAnimationFrame(step)
      }),
    seconds
  )
  await b.close()
  return r
}

/** 120 s berjalan: error, konteks WebGL, frame */
async function stability(base, seconds = 120) {
  const b = await chromium.launch({ args: ARGS })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 140)))
  p.on('console', (m) => {
    const t = m.text()
    if (/context lost|CONTEXT_LOST|Out of memory|GL_OUT_OF_MEMORY/i.test(t)) errs.push(t.slice(0, 140))
  })
  await p.goto(`${base}?auto=1`, { waitUntil: 'load', timeout: 120000 })
  await p.waitForTimeout(2500)
  const t0 = Date.now()
  const f0 = await p.evaluate(() => window.__MIRA_FRAMES || 0)
  await p.waitForTimeout(seconds * 1000)
  const s = await p.evaluate(() => ({
    frames: window.__MIRA_FRAMES || 0,
    ramp: window.__MIRA_RAMP ? window.__MIRA_RAMP.t : null,
    err: window.__MIRA_ERR || null,
    lost: (() => {
      const c = document.querySelector('canvas')
      const gl = c && (c.getContext('webgl2') || c.getContext('webgl'))
      return gl ? !!gl.isContextLost() : null
    })(),
    audio: typeof window.__MIRA_AUDIO === 'function' ? window.__MIRA_AUDIO() : null,
  }))
  await b.close()
  return { ...s, errs, sec: (Date.now() - t0) / 1000, frames0: f0 }
}

;(async () => {
  fs.mkdirSync(SHOTS, { recursive: true })

  // ── D5 reproduktibilitas ────────────────────────────────────────────────
  for (const t of [8, 11.5]) {
    const b1 = await shoot(BUILD, t)
    const b2 = await shoot(BUILD, t)
    const ours = mae(b1.file, b2.file)
    const l1 = await shoot(LIVE, t)
    const l2 = await shoot(LIVE, t)
    const live = mae(l1.file, l2.file)
    add(
      'D5',
      `reproduktibilitas @t=${t} (kita vs live)`,
      ours.mae <= Math.max(0.55, live.mae) + 1e-9,
      `kita MAE ${ours.mae.toFixed(4)} (${ours.n} px) · live MAE ${live.mae.toFixed(4)} (${live.n} px)`
    )
  }

  // ── D6 seam ────────────────────────────────────────────────────────────
  {
    const tb = await shoot(BUILD, 11.5)
    const tl = await shoot(LIVE, 11.5)
    const sb = seam(tb.file)
    const sl = seam(tl.file)
    add(
      'D6',
      'tanpa seam buatan (lonjakan baris ≤ live)',
      sb.ratio <= sl.ratio * 1.5 + 0.5,
      `kita rasio ${sb.ratio.toFixed(2)} (baris ${sb.peakRow}, ${sb.peakVal.toFixed(2)} vs lokal ${sb.local.toFixed(2)}) · live ${sl.ratio.toFixed(2)} (baris ${sl.peakRow})`
    )
  }

  // ── D7 fps ─────────────────────────────────────────────────────────────
  {
    const fb = await fps(BUILD)
    const fl = await fps(LIVE)
    add(
      'D7',
      'fps di lingkungan yang sama (kita ≥ 0,8× live)',
      fb.fps >= fl.fps * 0.8,
      `kita ${fb.fps.toFixed(2)} fps (${fb.frames} frame/${fb.sec.toFixed(1)} s) · live ${fl.fps.toFixed(2)} fps`
    )
  }

  // ── D8 stabilitas 120 s ────────────────────────────────────────────────
  {
    const st = await stability(BUILD, 120)
    const grew = st.frames > st.frames0
    add(
      'D8',
      'stabil 120 s (tanpa error, konteks hidup, frame bertambah)',
      st.errs.length === 0 && st.lost === false && grew && st.err === null,
      `frame ${st.frames0} → ${st.frames} · konteks hilang=${st.lost} · err=${st.errs.length} · jam ${st.ramp?.toFixed?.(2)}`
    )
  }

  // ── D9 viewport 390×844 (dan 414×896 sebagai pembanding) ────────────────
  {
    for (const [w, h] of [[390, 844], [414, 896]]) {
      const vp = { width: w, height: h }
      const b1 = await shoot(BUILD, 11.5, { vp, wait: 5000 })
      const b2 = await shoot(BUILD, 11.5, { vp, wait: 5000 })
      const rep = mae(b1.file, b2.file)
      const l1 = await shoot(LIVE, 11.5, { vp, wait: 5000 })
      const l2 = await shoot(LIVE, 11.5, { vp, wait: 5000 })
      const repLive = mae(l1.file, l2.file)
      const cross = mae(b1.file, l1.file)
      const c = corr(b1.file, l1.file)
      add(
        'D9',
        `viewport ${w}×${h}: reproduktif & geometri cocok (korelasi ≥ 0,95)`,
        rep.mae <= Math.max(0.55, repLive.mae) + 1e-9 && c >= 0.95,
        `kita reproduktif MAE ${rep.mae.toFixed(4)} · live ${repLive.mae.toFixed(4)} · korelasi profil ${c.toFixed(4)} · MAE ${cross.mae.toFixed(2)} (terang: kita ${cross.meanA.toFixed(1)} vs live ${cross.meanB.toFixed(1)})`
      )
    }
  }

  const pass = rows.filter((r) => r.ok).length
  const res = { when: new Date().toISOString(), build: BUILD, live: LIVE, ok: pass === rows.length, pass, total: rows.length, rows }
  fs.writeFileSync(OUT, JSON.stringify(res, null, 2))
  console.log(`\nGERBANG D sisa: ${pass}/${rows.length}  →  ${OUT}`)
  process.exit(res.ok ? 0 : 1)
})().catch((e) => {
  console.error('ERROR', e)
  process.exit(2)
})
