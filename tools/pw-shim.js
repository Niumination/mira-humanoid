#!/usr/bin/env node
/**
 * pw-shim.js — pembungkus tipis Playwright untuk sandbox tanpa GPU (Chromium headless-shell + SwiftShader).
 *
 * Kenapa ada: di sandbox kerja P13, `page.screenshot()` pada halaman panel (82 slider + kanvas) melewati
 * batas 30 detik bawaan Playwright karena kompositing berjalan di perangkat lunak. Alat gerbang TIDAK
 * diubah; sebagai gantinya modul ini:
 *   - menaikkan batas waktu `screenshot()` (bawaan 120 s, bisa diatur lewat PW_TIMEOUT),
 *   - menambahkan argumen peluncuran yang dibutuhkan sandbox (`--no-sandbox`, `--disable-dev-shm-usage`,
 *     `--enable-unsafe-swiftshader`).
 *
 * Pakai:  PW=/home/user/tools/pw-shim.js node tools/gate-mira-b.js http://127.0.0.1:8804
 *         (butuh PW_ASLI=/path/ke/playwright bila lokasi bawaan tidak ada)
 */
const ASLI = process.env.PW_ASLI || '/home/user/pwtmp/node_modules/playwright/index.js'
const T = Number(process.env.PW_TIMEOUT || 120000)
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']

const real = require(ASLI)

function bungkusKonteks(c) {
  const np = c.newPage.bind(c)
  c.newPage = async (opt) => bungkusHalaman(await np(opt))
  try { c.setDefaultTimeout(T) } catch {}
  try { c.setDefaultNavigationTimeout(T) } catch {}
  return c
}

function bungkusHalaman(p) {
  const shot = p.screenshot.bind(p)
  p.screenshot = (o = {}) => shot({ timeout: T, ...o })
  // kerjakan aksi (klik/isi) juga diberi batas lebih longgar: renderer perangkat lunak lambat
  try { p.setDefaultTimeout(T) } catch {}
  try { p.setDefaultNavigationTimeout(T) } catch {}
  return p
}

const chromium = new Proxy(real.chromium, {
  get(t, k) {
    if (k === 'launch') {
      return async (o = {}) => {
        const b = await t.launch({ ...o, args: [...ARGS, ...(o.args || [])] })
        const np = b.newPage.bind(b)
        b.newPage = async (opt) => bungkusHalaman(await np(opt))
        // gerbang APEX membuat konteks sendiri (browser.newContext) → ikut dibungkus
        const nc = b.newContext.bind(b)
        b.newContext = async (opt) => bungkusKonteks(await nc(opt))
        return b
      }
    }
    const v = t[k]
    return typeof v === 'function' ? v.bind(t) : v
  },
})

module.exports = new Proxy(real, {
  get(t, k) {
    if (k === 'chromium') return chromium
    const v = t[k]
    return typeof v === 'function' ? v.bind(t) : v
  },
})
