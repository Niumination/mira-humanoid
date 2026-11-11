#!/usr/bin/env node
/**
 * gate-mira6-real.js — uji MediaPipe SUNGGUHAN (tanpa tiruan) di aplikasi yang sudah terpasang.
 *
 * Berbeda dari `gate-mira6.js B` (MediaPipe diganti tiruan lewat `page.route`), di sini
 * `@mediapipe/tasks-vision@0.10.14` + model `hand_landmarker.task` diunduh dari CDN asli,
 * seperti yang dilakukan pengunjung sungguhan.
 *
 * R1 kamera palsu + model asli   → status "camera on - show your hand" (model SIAP, dari CDN asli)
 *      Catatan penting (terukur): worker `ZN` SELALU gagal di aplikasi live maupun rebuild, karena
 *      `FilesetResolver.forVisionTasks` memanggil `importScripts` dan module worker menolaknya
 *      (`TypeError: Module scripts don't support importScripts()`). Jadi yang benar-benar berjalan
 *      adalah jalur cadangan thread-utama. R1c menguji paritas kegagalan itu, bukan kesuksesan.
 * R2 `new Worker` dilarang       → jalur cadangan tetap mencapai status yang sama
 * R3 izin kamera ditolak         → "camera blocked - allow it in the browser settings"
 * R4 CDN diblokir                → "camera unavailable" (tidak menggantung)
 *
 * Pakai: node tools/gate-mira6-real.js [URL] [--json]
 *        default URL https://mira-humanoid-niu.vercel.app/
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const ARG = process.argv.slice(2)
const URL_ARG = ARG.find((a) => a.startsWith('http')) || 'https://mira-humanoid-niu.vercel.app/'
const OUT = process.env.OUT || '/home/user/Kerja-Arena/verification/mira/gate-step6-real.json'
const rows = []
const add = (id, name, ok, detail) => {
  rows.push({ id, name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${name}  ${detail ?? ''}`)
}

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

async function scenario({ name, id, blockWorker = false, denyCamera = false, blockCdn = false, timeout = 180000 }) {
  const browser = await chromium.launch({ args: ARGS })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: denyCamera ? [] : ['camera', 'microphone'] })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)))
  await page.addInitScript((block) => {
    const W = window.Worker
    window.__WLOG = { created: 0, ready: 0, fail: 0, lm: 0, threw: 0 }
    window.Worker = class extends W {
      constructor(url, opts) {
        if (block && String(url).startsWith('blob:')) {
          window.__WLOG.threw++
          throw new Error('worker blocked for test')
        }
        super(url, opts)
        window.__WLOG.created++
        super.addEventListener('message', (e) => {
          const t = e.data && e.data.type
          if (t === 'ready') window.__WLOG.ready++
          else if (t === 'fail') window.__WLOG.fail++
          else if (t === 'lm') window.__WLOG.lm++
        })
      }
    }
  }, blockWorker)
  if (denyCamera) {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
    })
  }
  if (blockCdn) {
    await page.route('https://esm.sh/**', (r) => r.abort())
    await page.route('https://cdn.jsdelivr.net/**', (r) => r.abort())
    await page.route('https://storage.googleapis.com/**', (r) => r.abort())
  }
  await page.goto(URL_ARG + '?auto=1&t=8', { waitUntil: 'load', timeout: 120000 })
  // live tidak punya `__MIRA_*`; tunggu tombolnya saja supaya alat yang sama bisa dipakai ke keduanya
  await page.waitForSelector('[data-testid="mira-humanoid-camera"]', { timeout: 120000 })
  await page.waitForTimeout(1500)
  await page.evaluate(() => document.querySelector('[data-testid="mira-humanoid-camera"]')?.click())
  let status = ''
  const t0 = Date.now()
  try {
    await page.waitForFunction(
      () => {
        const t =
          document.querySelector('[data-testid="mira-camera-status"]')?.textContent ||
          document.querySelector('[role="status"]')?.textContent ||
          ''
        // status akhir = salah satu dari lima ini; "starting the camera"/"loading hand tracking" masih proses
        return /^(camera on|hand found|camera unavailable|camera blocked|no camera found)/.test(t)
      },
      undefined,
      { timeout }
    )
    status = (
      await page.locator('[data-testid="mira-camera-status"], [role="status"]').first().textContent()
    ).trim()
  } catch {
    status = (
      (await page.locator('[data-testid="mira-camera-status"], [role="status"]').first().textContent().catch(() => '')) || '(kosong)'
    ).trim()
  }
  const secs = (Date.now() - t0) / 1000
  const hand = await page.evaluate(() => window.__MIRA_HAND || null)
  // diskriminator jalur: impor `esm.sh` di thread utama hanya terjadi pada jalur cadangan
  // (worker memuatnya di konteksnya sendiri, tak muncul di resource timing halaman)
  const mainImport = await page.evaluate(() =>
    performance.getEntriesByType('resource').filter((e) => /esm\.sh|tasks-vision/.test(e.name)).map((e) => e.name.slice(0, 60))
  )
  const wlog = await page.evaluate(() => window.__WLOG)
  await browser.close()
  add(id, name, !!status, `status "${status}" · ${secs.toFixed(1)} s · worker ${JSON.stringify(wlog)}${errs.length ? ' · err ' + errs[0] : ''}`)
  return { status, secs, hand, errs, mainImport, wlog }
}

;(async () => {
  const r1 = await scenario({ id: 'R1', name: 'worker asli + model asli (MediaPipe nyata)' })
  add('R1a', 'status akhir "camera on - show your hand" (model siap)', r1.status === 'camera on - show your hand', `"${r1.status}"`)
  add('R1b', 'tanpa error halaman', r1.errs.length === 0, r1.errs.slice(0, 2).join(' | ') || 'bersih')
  // paritas: di live pun worker selalu `fail` (lihat tools/probe-worker-live.js) — yang diuji di sini
  // adalah "dicoba lalu gagal dengan rapi", bukan "berhasil"
  add(
    'R1c',
    'worker dicoba lalu gagal rapi (sama seperti live)',
    r1.wlog.created === 1 && r1.wlog.fail === 1 && r1.wlog.ready === 0 && r1.wlog.lm === 0,
    `created=${r1.wlog.created} ready=${r1.wlog.ready} fail=${r1.wlog.fail} lm=${r1.wlog.lm}`
  )
  add(
    'R1d',
    'jalur cadangan thread-utama AKTIF setelah worker gagal',
    r1.mainImport.length > 0,
    `impor esm.sh di thread utama: ${r1.mainImport.length}${r1.mainImport[0] ? ' · ' + r1.mainImport[0] : ''}`
  )

  const r2 = await scenario({ id: 'R2', name: 'new Worker dilarang → cadangan thread-utama', blockWorker: true })
  add('R2a', 'status tetap "camera on - show your hand" (fallback GPU→CPU)', r2.status === 'camera on - show your hand', `"${r2.status}" ${r2.secs.toFixed(1)} s`)
  add('R2b', 'jalur cadangan BENAR dipakai (worker dilarang, impor di thread utama)', r2.wlog.threw === 1 && r2.wlog.lm === 0 && r2.mainImport.length > 0, `threw=${r2.wlog.threw} lm=${r2.wlog.lm} impor utama=${r2.mainImport.length}`)

  const r3 = await scenario({ id: 'R3', name: 'izin kamera ditolak', denyCamera: true, timeout: 40000 })
  add('R3a', 'status "camera blocked - allow it in the browser settings"', r3.status === 'camera blocked - allow it in the browser settings', `"${r3.status}"`)

  const r4 = await scenario({ id: 'R4', name: 'CDN MediaPipe diblokir', blockCdn: true, timeout: 90000 })
  add('R4a', 'jatuh ke "camera unavailable" (tidak menggantung)', r4.status === 'camera unavailable', `"${r4.status}" ${r4.secs.toFixed(1)} s`)

  const pass = rows.filter((r) => r.ok).length
  const res = { when: new Date().toISOString(), base: URL_ARG, ok: pass === rows.length, pass, total: rows.length, rows }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(res, null, 2))
  console.log(`\nREAL: ${pass}/${rows.length}  →  ${OUT}`)
  process.exit(res.ok ? 0 : 1)
})().catch((e) => {
  console.error('ERROR', e)
  process.exit(2)
})
