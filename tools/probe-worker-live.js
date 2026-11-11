#!/usr/bin/env node
/**
 * probe-worker-live.js — apakah worker MediaPipe BERHASIL di aplikasi tertentu?
 *
 * Instrumen `Worker` (catat pesan ready/fail/lm) lalu klik tombol kamera, tunggu sampai
 * status akhir, dan laporkan juga apakah jalur cadangan (impor di thread utama) dipakai.
 *
 * Pakai: node tools/probe-worker-live.js <URL>
 */
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const URL_ARG = process.argv[2] || 'https://mira-humanoid-niu.vercel.app/'
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

;(async () => {
  const browser = await chromium.launch({ args: ARGS })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] })
  const page = await ctx.newPage()
  const logs = []
  page.on('console', (m) => logs.push(`${m.type()}: ${m.text().slice(0, 140)}`))
  page.on('pageerror', (e) => logs.push('pageerror: ' + String(e).slice(0, 140)))
  await page.addInitScript(() => {
    const W = window.Worker
    window.__WLOG = { created: 0, ready: 0, fail: 0, lm: 0, threw: 0, lastErr: '' }
    window.Worker = class extends W {
      constructor(url, opts) {
        if (String(url).startsWith('blob:')) {
          // intip isi blob worker sekali, untuk memastikan mana yang dipakai
          try {
            fetch(url)
              .then((r) => r.text())
              .then((t) => (window.__WLOG.src = t.slice(0, 120)))
              .catch(() => {})
          } catch { /* abaikan */ }
        }
        super(url, opts)
        window.__WLOG.created++
        super.addEventListener('message', (e) => {
          const t = e.data && e.data.type
          if (t === 'ready') window.__WLOG.ready++
          else if (t === 'fail') window.__WLOG.fail++
          else if (t === 'lm') window.__WLOG.lm++
        })
        super.addEventListener('error', (e) => {
          window.__WLOG.lastErr = String(e.message || 'worker error').slice(0, 120)
        })
      }
    }
  })
  await page.goto(URL_ARG + '?auto=1&t=8', { waitUntil: 'load', timeout: 120000 })
  await page.waitForSelector('[data-testid="mira-humanoid-camera"]', { timeout: 120000 })
  await page.waitForTimeout(1500)
  await page.evaluate(() => document.querySelector('[data-testid="mira-humanoid-camera"]')?.click())

  let status = ''
  const t0 = Date.now()
  for (let i = 0; i < 60; i++) {
    status = ((await page.locator('[role="status"]').first().textContent().catch(() => '')) || '').trim()
    if (/^(camera on|hand found|camera unavailable|camera blocked|no camera found)/.test(status)) break
    await page.waitForTimeout(1000)
  }
  const wlog = await page.evaluate(() => window.__WLOG)
  const res = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((e) => /esm\.sh|tasks-vision/.test(e.name))
      .map((e) => e.name.slice(0, 70))
  )
  console.log(JSON.stringify({ url: URL_ARG, status, detik: (Date.now() - t0) / 1000, worker: wlog, imporThreadUtama: res.length, console: logs.slice(-6) }, null, 2))
  await browser.close()
})()
