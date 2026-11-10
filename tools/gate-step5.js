#!/usr/bin/env node
/**
 * gate-step5.js — GERBANG D langkah 5: STATE MACHINE + `VN()` + SPEED/REPLAY.
 *
 * Bagian A (Node): membandingkan port `src/lib/miraAura.ts` dengan kode live (`Vk`-style:
 *   `Rn`, `QU`, `bw`, `Rw`, `Aw`, `tx`, `VN`, `GN`, `Kk`) yang diekstrak verbatim dari bundle
 *   oleh `tools/ekstrak-audio-live.py` ke `verification/mira/aura-live.mjs`.
 *   Skenario: respons langkah (talk/listen/voice) per beberapa dt, pemusnahan < 0,01,
 *   pin URL, dan `VN()` untuk 4 param *Her states* di beberapa kombinasi.
 *
 * Bagian B (Chromium): memeriksa aplikasi — status menggerakkan aura, 4 slider mengubah
 *   kecepatan jam secara terukur, SPEED 0,3× memperlambat jam, REPLAY mengulang dari 0.
 *
 * Pakai: node tools/gate-step5.js [--json out.json]   (BAGIAN=B|A untuk satu bagian saja)
 */
import { writeFileSync } from 'node:fs'

const PW = process.env.PW || '/tmp/pw/node_modules/playwright/index.js'
const ARG = process.argv.slice(2)
const OUT = ARG.includes('--json') ? ARG[ARG.indexOf('--json') + 1] : null
const PART = process.env.BAGIAN || 'AB'
const BASE = process.env.BASE || 'http://127.0.0.1:8802/'

const rows = []
const check = (name, ok, detail) => {
  rows.push({ name, ok, detail })
  console.log(`${ok ? 'LULUS ' : 'GAGAL '} ${name}${detail ? ` — ${detail}` : ''}`)
}

/* ───────────────────────── A. paritas modul (Node) ───────────────────────── */
if (PART.includes('A')) {
  const A = await import('/home/user/Kerja-Arena/verification/mira/aura-live.mjs')
  const B = await import('/home/user/Kerja-Arena/verification/mira/aura-ours.mjs')

  // 1. respons langkah talk/listen/voice
  const steps = [
    { dt: 0.016, speaking: true, listening: false, energy: 0.8, n: 40 },
    { dt: 0.016, speaking: false, listening: true, energy: 0, n: 40 },
    { dt: 0.05, speaking: true, listening: false, energy: 0.15, n: 20 },
    { dt: 0.1, speaking: true, listening: true, energy: 0.9, n: 15 },
    { dt: 0.004, speaking: false, listening: false, energy: 0, n: 90 },
  ]
  let worst = 0
  const trace = []
  for (const s of steps) {
    A.setReset?.()
    const a = A.auraNew()
    const b = B.aura()
    for (const k of Object.keys(a)) b[k] = a[k]
    for (let i = 0; i < s.n; i++) {
      A.updateAura(s.dt, s)
      B.updateAura(s.dt, s)
    }
    const diff = ['voice', 'talk', 'listen'].map((k) => Math.abs(A.aura()[k] - B.aura()[k]))
    worst = Math.max(worst, ...diff)
    trace.push({ ...s, live: { ...A.aura() }, ours: { ...B.aura() } })
  }
  check('respons aura (talk/listen/voice) identik', worst < 1e-12, `selisih maks ${worst.toExponential(2)}`)

  // 2. pemusnahan nilai kecil (< 0,01 → 0)
  A.clearAura?.()
  B.clearAura?.()
  for (let i = 0; i < 60; i++) {
    A.updateAura(0.004, { speaking: true, listening: false, energy: 0.02 })
    B.updateAura(0.004, { speaking: true, listening: false, energy: 0.02 })
  }
  const zA = A.aura()
  const zB = B.aura()
  check('pemusnahan < 0,01 sama', zA.voice === zB.voice && zA.talk === zB.talk && zA.listen === zB.listen,
    `live ${zA.voice.toFixed(6)}/${zA.talk.toFixed(6)} · kita ${zB.voice.toFixed(6)}/${zB.talk.toFixed(6)}`)

  // 3. pin (bw) + pace (Aw) + presence (Rw)
  A.pinAura({ voice: 0.3, talk: 0.7, listen: 0.2 })
  B.pinAura({ voice: 0.3, talk: 0.7, listen: 0.2 })
  A.updateAura(1, { speaking: true, energy: 0.9 })
  B.updateAura(1, { speaking: true, energy: 0.9 })
  const pinSame = A.aura().talk === B.aura().talk && A.aura().voice === B.aura().voice
  A.pinAura(null)
  B.pinAura(null)
  A.setPace(0.1)
  B.setPace(0.1)
  const paceLowSame = A.aura().pace === B.aura().pace
  A.setPace(3)
  B.setPace(3)
  const paceOk = A.aura().pace === 3 && B.aura().pace === 3
  A.setPace(9)
  B.setPace(9)
  const paceHighSame = A.aura().pace === 1 && B.aura().pace === 1
  check('pin URL & pace sama', pinSame && paceLowSame && paceOk && paceHighSame,
    `pin ${pinSame} · pace<0,2 ${paceLowSame} · pace3 ${paceOk} · pace>6 ${paceHighSame}`)

  // termasuk kasus `null` sebelum pernah diisi (live: `qy` false → tidak mengubah apa pun)
  A.clearAura()
  B.clearAura()
  A.setPresence(null)
  B.setPresence(null)
  const nA = { ...A.aura() }
  const nB = { ...B.aura() }
  const nullSame = nA.mira === nB.mira && nA.orb === nB.orb && nA.matter === nB.matter
  A.setPresence({ waves: 0.4, orb: 1.7, matter: -1 })
  B.setPresence({ waves: 0.4, orb: 1.7, matter: -1 })
  const pA = { ...A.aura() }
  const pB = { ...B.aura() }
  A.setPresence(null)
  B.setPresence(null)
  const qA = { ...A.aura() }
  const qB = { ...B.aura() }
  const clearSame = qA.mira === qB.mira && qA.orb === qB.orb && qA.matter === qB.matter
  check('presence: jepit 0..1 & aturan `qy` sama',
    nullSame && clearSame && pA.mira === pB.mira && pA.orb === pB.orb && pA.matter === pB.matter,
    `jepit ${pA.mira}/${pA.orb}/${pA.matter} vs ${pB.mira}/${pB.orb}/${pB.matter} · null-sebelum-isi ${nullSame} · kosong ${clearSame}`)

  // 4. VN() — 4 param *Her states*
  const combos = []
  for (const talkSpeed of [1, 2, 4]) {
    for (const talkBright of [1, 1.35, 2.5]) {
      for (const listenSpeed of [1, 1.5, 4]) {
        for (const listenBright of [1, 1.15, 2.5]) {
          combos.push({ talkSpeed, talkBright, listenSpeed, listenBright })
        }
      }
    }
  }
  const states = [
    { talk: 0, listen: 0, voice: 0 },
    { talk: 1, listen: 0, voice: 1 },
    { talk: 0, listen: 1, voice: 0 },
    { talk: 0.6, listen: 0.8, voice: 0.4 },
    { talk: 1, listen: 1, voice: 0.5 },
    { talk: 0.25, listen: 0.25, voice: 1.4 },
  ]
  let vWorst = 0
  let n = 0
  for (const p of combos) {
    for (const s of states) {
      const a = A.herSpeedBright(s, p)
      const b = B.herSpeedBright(s, p)
      vWorst = Math.max(vWorst, Math.abs(a.speed - b.speed), Math.abs(a.bright - b.bright))
      n++
    }
  }
  check(`VN() identik (${n} kombinasi)`, vWorst < 1e-12, `selisih maks ${vWorst.toExponential(2)}`)

  // 5. touchRate (Kk) & talkLevel (PF)
  let tWorst = 0
  for (const ht of [-1e9, -1, 0, 0.3, 1, 2.9, 3, 5]) {
    tWorst = Math.max(tWorst, Math.abs(A.touchRate(ht) - B.touchRate(ht)))
  }
  let lWorst = 0
  for (let t = 0; t < 6; t += 0.013) lWorst = Math.max(lWorst, Math.abs(A.talkLevel(t) - B.talkLevel(t)))
  check('Kk() sentuhan & PF() level bicara identik', tWorst < 1e-12 && lWorst < 1e-12,
    `sentuh ${tWorst.toExponential(2)} · bicara ${lWorst.toExponential(2)}`)

  writeFileSync(
    '/home/user/Kerja-Arena/verification/mira/gate-step5-trace.json',
    JSON.stringify({ when: new Date().toISOString(), steps: trace, combos: combos.length, states }, null, 2)
  )
}

/* ───────────────────────── B. aplikasi (Chromium) ───────────────────────── */
if (PART.includes('B')) {
  const pw = await import(PW)
  const chromium = pw.chromium || pw.default?.chromium
  const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  const clock = () => page.evaluate(() => window.__MIRA_RAMP?.t ?? null)
  // klik lewat DOM: di SwiftShader panggung ~1 fps sehingga cek actionability Playwright
  // sering habis waktu (bukan tombolnya yang salah)
  const clickId = (id) => page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) throw new Error('tidak ada ' + sel)
    el.click()
  }, `[data-testid="${id}"]`)
  const auraOf = () => page.evaluate(() => window.__MIRA_AUDIO().aura)

  await page.goto(`${BASE}?auto=1`, { waitUntil: 'load' })
  await page.waitForFunction(() => typeof window.__MIRA_RAMP?.t === 'number', { timeout: 30000 })
  await page.waitForTimeout(1500)

  // Catatan lingkungan: di Chromium SwiftShader panggung MIRA berjalan ~1–2 fps, dan live
  // sendiri membatasi dt per frame ke 0,05 s, jadi pelunakan aura (koefisien 2,2–10 detik⁻¹)
  // bergerak sangat lambat di sini. Karena itu: arah perubahan diuji di aplikasi, nilai tepat
  // diuji lewat pin URL (jalur yang sama dengan live `?talk=`/`?listen=`), dan SPEED diuji
  // sebagai RASIO dua jendela (tidak bergantung fps).

  // 1. status IDLE → TALKING menggerakkan aura
  const aIdle = await auraOf()
  await clickId('mira-state-talking')
  await page.waitForTimeout(2500)
  const aTalk = await auraOf()
  check('TALKING menaikkan talk', aTalk.talk > 0.3 && aTalk.talk > aIdle.talk,
    `talk ${aIdle.talk.toFixed(3)} → ${aTalk.talk.toFixed(3)} · voice ${aTalk.voice.toFixed(3)}`)

  // 2. LISTENING menaikkan listen (arah), lalu pin URL untuk nilai tepat
  const before = await auraOf()
  await clickId('mira-state-listening')
  await page.waitForTimeout(2500)
  const aListen = await auraOf()
  check('LISTENING menaikkan listen', aListen.listen > before.listen && aListen.listen > 0.05,
    `listen ${before.listen.toFixed(3)} → ${aListen.listen.toFixed(3)}`)

  // (pakai halaman yang sama: konteks WebGL kedua di SwiftShader terlalu lambat)
  await page.goto(`${BASE}?auto=1&talk=0.8&listen=0.25&voice=0.6`, { waitUntil: 'load' })
  await page.waitForFunction(() => typeof window.__MIRA_AUDIO === 'function', { timeout: 60000 })
  await page.waitForTimeout(1500)
  const pinnedAura = await page.evaluate(() => window.__MIRA_AUDIO().aura)
  check('pin `?talk/&listen/&voice` dipakai apa adanya',
    Math.abs(pinnedAura.talk - 0.8) < 1e-9 && Math.abs(pinnedAura.listen - 0.25) < 1e-9 && Math.abs(pinnedAura.voice - 0.6) < 1e-9,
    `talk ${pinnedAura.talk} · listen ${pinnedAura.listen} · voice ${pinnedAura.voice}`)

  // 3. SPEED: rasio laju jam 0,3× vs 1× (bebas fps)
  await page.goto(`${BASE}?auto=1`, { waitUntil: 'load' })
  await page.waitForFunction(() => typeof window.__MIRA_RAMP?.t === 'number', { timeout: 60000 })
  await page.waitForTimeout(1500)
  await clickId('mira-state-idle')
  await page.waitForTimeout(400)
  const measure = async (ms) => {
    const a = await clock()
    await page.waitForTimeout(ms)
    const b = await clock()
    return b - a
  }
  const d1 = await measure(4000)                     // 1×
  await clickId('mira-speed')      // → 0,3×
  await page.waitForTimeout(300)
  const d03 = await measure(4000)
  await clickId('mira-speed')      // kembali 1×
  const ratio = d1 > 0 ? d03 / d1 : 0
  check('SPEED 0,3× memperlambat jam (rasio ≈ 0,3)', ratio > 0.15 && ratio < 0.55,
    `Δ1× ${d1.toFixed(3)} s · Δ0,3× ${d03.toFixed(3)} s · rasio ${ratio.toFixed(3)}`)

  // 4. REPLAY mengulang jam dari 0
  await page.waitForTimeout(300)
  await clickId('mira-replay')
  await page.waitForTimeout(150)
  const r0 = await clock()
  await page.waitForTimeout(800)
  const r1 = await clock()
  check('REPLAY mengulang jam dari 0', r0 < 1.0 && r1 > r0, `t ${r0.toFixed(2)} → ${r1.toFixed(2)}`)

  check('tanpa error halaman', errors.length === 0, errors.slice(0, 2).join(' | '))
  await browser.close()
}

const pass = rows.filter((r) => r.ok).length
console.log('─'.repeat(76))
console.log(`SKOR: ${pass}/${rows.length}`)
if (OUT) {
  writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), score: `${pass}/${rows.length}`, rows }, null, 2))
  console.log(`→ ${OUT}`)
}
process.exit(pass === rows.length ? 0 : 1)
