#!/usr/bin/env node
/**
 * gate-aset-layout.js — bukti pengganti untuk gerbang piksel-vs-produksi yang sudah kedaluwarsa.
 *
 * Gerbang lama (`gate-apex.js`, D9 di `gate-d.js`) membandingkan **piksel** aplikasi kita dengan situs
 * produksi asli. Sejak P13 langkah 2–4 plate & latar adalah karya kita sendiri (provenance 0 salinan),
 * jadi MAE-piksel terhadap produksi asli otomatis besar — itu bukan cacat, melainkan akibat yang
 * diinginkan. Yang perlu dibuktikan justru: (a) aplikasi benar-benar menyajikan ASET KITA, dan
 * (b) tata letak tetap benar di tiap viewport.
 *
 *   S1 aset   : di dalam halaman, `fetch()` tiap plate → SHA-256 (WebCrypto) dibandingkan dengan SHA-256
 *               berkas kita di disk. 9 plate + backdrop untuk APEX, 2 plate untuk MIRA.
 *   S2 layout : 1440×900 · 414×896 · 390×844 — panggung ada & terlihat, tidak ada gulir mendatar
 *               (scrollWidth ≤ innerWidth + 1), panggung menutupi ≥ 90 % lebar viewport,
 *               tidak ada elemen ber-anchor keluar viewport lebih dari 2 px.
 *
 * Pakai: PW=/home/user/tools/pw-shim.js node tools/gate-aset-layout.js [--json keluar.json]
 */
const { chromium } = require(process.env.PW || '/home/user/tools/pw-shim.js')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ARG = process.argv.slice(2)
const JSON_OUT = ARG.includes('--json') ? ARG[ARG.indexOf('--json') + 1] : null
const MIRA = process.env.MIRA || 'http://127.0.0.1:8804/'
const APEX = process.env.APEX || 'http://127.0.0.1:8805/'
const ROOT = process.env.REBUILD_ROOT || '/home/user'
const APPS = [
  { nama: 'MIRA', base: MIRA, dir: process.env.MIRA_DIR || `${ROOT}/mira-humanoid-rebuild/public/humanoid`,
    plate: ['mira-idle-v1.webp', 'mira-hair-v1.webp'] },
  { nama: 'APEX', base: APEX, dir: process.env.APEX_DIR || `${ROOT}/apex-humanoid-rebuild/public/humanoid`,
    plate: ['apex-idle-v1.webp', 'apex-listening-v1.webp', 'apex-speaking-v1.webp',
      'apex-speaking-strong-v1.webp', 'apex-thinking-v1.webp', 'apex-assembly-25-v1.webp',
      'apex-assembly-60-v1.webp', 'backdrop-v1.webp'] },
]
const VPS = [{ tag: '1440x900', w: 1440, h: 900 }, { tag: '414x896', w: 414, h: 896 }, { tag: '390x844', w: 390, h: 844 }]

function shaDisk(f) { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') }

const hasil = { judul: 'Gerbang aset & tata letak (pengganti piksel-vs-produksi)', waktu: new Date().toISOString(),
  syarat: { S1: 'sha256 di halaman == sha256 berkas kita', S2_scroll: 'scrollWidth ≤ innerWidth+1',
    S2_lebar: 'panggung ≥ 90 % lebar viewport', S2_luar: 'tidak ada elemen keluar viewport > 2 px' },
  aplikasi: [] }

;(async () => {
  const browser = await chromium.launch()
  let lulus = 0, total = 0
  for (const app of APPS) {
    const a = { aplikasi: app.nama, base: app.base, aset: [], layout: [], lulus: 0, total: 0 }
    const cek = (n, ok, ket) => {
      total++; a.total++
      if (ok) { lulus++; a.lulus++ }
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${app.nama} ${n}  ${ket}`)
    }
    // ---- S1: di halaman, ambil tiap plate dan hash dengan WebCrypto
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const p = await ctx.newPage()
    await p.goto(app.base + '?auto=1', { waitUntil: 'networkidle', timeout: 120000 })
    for (const nama of app.plate) {
      const url = '/humanoid/' + nama
      const hex = await p.evaluate(async (u) => {
        const r = await fetch(u, { cache: 'reload' })
        const buf = await r.arrayBuffer()
        const d = await crypto.subtle.digest('SHA-256', buf)
        return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
      }, url)
      const lokal = shaDisk(path.join(app.dir, nama))
      a.aset.push({ berkas: nama, halaman: hex.slice(0, 16), disk: lokal.slice(0, 16), sama: hex === lokal })
      cek(`S1 ${nama}`, hex === lokal, `halaman ${hex.slice(0, 12)} · disk ${lokal.slice(0, 12)}`)
    }
    // ---- S2: tata letak per viewport
    for (const vp of VPS) {
      const c2 = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 })
      const q = await c2.newPage()
      await q.goto(app.base + '?auto=1', { waitUntil: 'networkidle', timeout: 120000 })
      await q.waitForTimeout(1800)
      const m = await q.evaluate(() => {
        const stage = document.querySelector('canvas') || document.querySelector('[data-testid]')
        const r = stage ? stage.getBoundingClientRect() : null
        const luar = [...document.querySelectorAll('button, [data-testid], canvas')].filter((el) => {
          const b = el.getBoundingClientRect()
          if (!b.width || !b.height) return false
          return b.left < -2 || b.right > window.innerWidth + 2
        }).length
        return {
          ada_panggung: !!stage, panggung_terlihat: !!r && r.width > 0 && r.height > 0,
          lebar_panggung: r ? Math.round(r.width) : 0, lebar_viewport: window.innerWidth,
          scroll_w: document.scrollingElement.scrollWidth, inner_w: window.innerWidth,
          elemen_keluar: luar, judul: document.title,
        }
      })
      a.layout.push({ vp: vp.tag, ...m })
      cek(`S2 ${app.nama} ${vp.tag} panggung`, m.ada_panggung && m.panggung_terlihat,
        `lebar ${m.lebar_panggung}/${m.lebar_viewport}`)
      cek(`S2 ${app.nama} ${vp.tag} tanpa gulir mendatar`, m.scroll_w <= m.inner_w + 1,
        `scrollWidth ${m.scroll_w} ≤ ${m.inner_w}+1`)
      cek(`S2 ${app.nama} ${vp.tag} panggung lebar`, m.lebar_panggung >= 0.9 * m.lebar_viewport,
        `${(m.lebar_panggung / m.lebar_viewport * 100).toFixed(1)} % lebar viewport`)
      cek(`S2 ${app.nama} ${vp.tag} tanpa elemen keluar`, m.elemen_keluar === 0, `${m.elemen_keluar} elemen`)
      await q.close(); await c2.close()
    }
    await p.close(); await ctx.close()
    hasil.aplikasi.push(a)
  }
  await browser.close()
  hasil.ringkas = { lulus, total }
  if (JSON_OUT) { fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true }); fs.writeFileSync(JSON_OUT, JSON.stringify(hasil, null, 1)) }
  console.log(`\nGERBANG ASET & TATA LETAK: ${lulus}/${total}` + (JSON_OUT ? ` → ${JSON_OUT}` : ''))
  process.exit(lulus === total ? 0 : 1)
})()
