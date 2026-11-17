#!/usr/bin/env node
/**
 * probe-listen-frame.js — bukti bahwa kegagalan "LISTENING menaikkan listen" di sandbox
 * disebabkan KELAPARAN FRAME (SwiftShader ≈2,5 fps), bukan regresi kode.
 *
 * gate-step5.js menekan tombol LISTENING lalu menunggu 2 500 ms dan mensyaratkan listen > 0,05.
 * Aplikasi membatasi dt per frame ke 0,05 s (sama dengan live), jadi pada 2,5 fps jendela 2 500 ms
 * hanya berisi beberapa frame saja. Skrip ini mengukur listen SETELAH tombol ditekan sebagai fungsi
 * dari JUMLAH FRAME (bukan waktu dinding) selama ±30 s.
 *
 * Pakai: PW=/path/playwright BASE=http://127.0.0.1:8804/ node tools/probe-listen-frame.js
 * Keluaran: verification/mira/probe-listen-frame.json
 */
const { chromium } = require(process.env.PW || '/home/user/tools/pw-shim.js')
const fs = require('fs')
const BASE = (process.env.BASE || 'http://127.0.0.1:8804/').replace(/\/?$/, '/')
const OUT = '/home/user/Kerja-Arena/verification/mira/probe-listen-frame.json'

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto(`${BASE}?auto=1`, { waitUntil: 'load' })
  await p.waitForFunction(() => typeof window.__MIRA_RAMP?.t === 'number', null, { timeout: 90000 })
  await p.waitForTimeout(1500)

  // hitung frame: tiap kenaikan window.__MIRA_RAMP.t (dt dibatasi 0,05 s/frame)
  const baca = () => p.evaluate(() => ({
    t: window.__MIRA_RAMP.t,
    listen: window.__MIRA_AUDIO().aura.listen,
    talk: window.__MIRA_AUDIO().aura.talk,
  }))

  const awal = await baca()
  await p.click('[data-testid="mira-state-listening"]')
  const jejak = []
  const t0 = Date.now()
  for (let i = 0; i < 24; i++) {
    await p.waitForTimeout(1250)
    const s = await baca()
    jejak.push({ ms: Date.now() - t0, t: Number(s.t.toFixed(3)), listen: Number(s.listen.toFixed(4)),
                 frame_kira: Math.round((s.t - awal.t) / 0.05) })
  }
  const lulus = jejak.find((x) => x.listen > 0.05)
  const hasil = {
    judul: 'Bukti kelaparan frame pada pemeriksaan LISTENING (gate-step5 bagian B)',
    lingkungan: 'Chromium headless-shell + SwiftShader (tanpa GPU), dt dibatasi 0,05 s/frame',
    awal: { t: Number(awal.t.toFixed(3)), listen: Number(awal.listen.toFixed(4)) },
    jendela_gate_ms: 2500,
    nilai_dalam_jendela_gate: jejak.find((x) => x.ms >= 2000) ?? jejak[1],
    listen_lewat_0_05_pada: lulus ? { ms: lulus.ms, frame: lulus.frame_kira, listen: lulus.listen } : null,
    jejak,
  }
  fs.mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(hasil, null, 1))
  console.log('awal listen', hasil.awal.listen, '· dalam jendela gate 2,5 s:',
    hasil.nilai_dalam_jendela_gate.listen, `(≈${hasil.nilai_dalam_jendela_gate.frame_kira} frame)`,
    '· lewat 0,05 pada', hasil.listen_lewat_0_05_pada)
  console.log('JSON:', OUT)
  await b.close()
})()
