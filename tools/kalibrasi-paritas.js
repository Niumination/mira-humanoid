#!/usr/bin/env node
/**
 * kalibrasi-paritas.js — KALIBRASI ambang gerbang paritas terhadap APLIKASI ACUAN (produksi asli).
 *
 * Alasan: gerbang lama (D9 `gate-d.js`, `gate-apex.js`) menuntut korelasi profil luma ≥ 0,95 dan MAE
 * kecil ANTARA VIEWPORT, dan `gate-paritas.js` v1 mewarisi ambang itu. Sebelum ambang dipakai untuk
 * menilai karya kita, ambang harus lulus di acuan itu sendiri. Alat ini mengukur acuan apa adanya:
 *
 *   K1 reprodusibilitas diri  : dua tangkapan berurutan pada viewport sama → MAE (animasi ikut terukur)
 *   K2 profil luma 390 vs 1440: korelasi profil 32 pita
 *   K3 cakupan, K4 geser cx, K5 rasio aspek siluet : 390 vs 1440
 *
 * Pakai: PW=/home/user/tools/pw-shim.js node tools/kalibrasi-paritas.js --nama ACUAN-APEX --base https://…/ [--json out.json]
 */
const { chromium } = require(process.env.PW || '/home/user/tools/pw-shim.js')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ARG = process.argv.slice(2)
const ambil = (k, d) => (ARG.includes(k) ? ARG[ARG.indexOf(k) + 1] : d)
const NAMA = ambil('--nama', 'ACUAN')
const BASE = ambil('--base', 'https://apex-humanoid.vercel.app/')
const JSON_OUT = ambil('--json', null)
const SHOTS = `/tmp/kalibrasi-${NAMA.replace(/[^a-z0-9]/gi, '')}`
const ARGS = ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle',
  '--use-angle=swiftshader', '--disable-dev-shm-usage', '--mute-audio']
const VPS = [
  { tag: '1440x900', w: 1440, h: 900 },
  { tag: '414x896', w: 414, h: 896 },
  { tag: '390x844', w: 390, h: 844 },
]
const FREEZE = `(() => { window.__HUM_BG_T = 3.0;
  const r = window.requestAnimationFrame;
  window.requestAnimationFrame = (cb) => r((t) => cb(3000)); })();`

// metrik satu tangkapan + perbandingan dua tangkapan (MAE)
const pyUkur = `
import sys, json
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
L = a.mean(2); H, W = L.shape
m = L > 20
if m.sum() < 100:
    print(json.dumps({'kosong': True})); sys.exit()
ys, xs = np.where(m)
prof = [float(L[int(i*H/32):int((i+1)*H/32)].mean()) for i in range(32)]
base = sum(prof)/len(prof) or 1.0
out = {'cakupan': float(m.mean()), 'cx': float(xs.mean()/W), 'cy': float(ys.mean()/H),
       'w': int(xs.max()-xs.min()+1), 'h': int(ys.max()-ys.min()+1),
       'aspek': float((xs.max()-xs.min()+1)/(ys.max()-ys.min()+1)),
       'lebar_viewport': W, 'tinggi_viewport': H,
       'profil': [p/base for p in prof]}
if len(sys.argv) > 2:
    b = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
    if b.shape == a.shape:
        out['mae_vs'] = float(np.abs(a-b).mean())
print(json.dumps(out))
`

function ukur(f, f2) {
  const args = ['-c', pyUkur, f]
  if (f2) args.push(f2)
  return JSON.parse(execFileSync('python3', args).toString())
}

function kor(a, b) {
  const n = a.length
  const ma = a.reduce((s, v) => s + v, 0) / n
  const mb = b.reduce((s, v) => s + v, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return num / Math.sqrt(da * db || 1)
}


;(async () => {
  fs.mkdirSync(SHOTS, { recursive: true })
  const browser = await chromium.launch({ args: ARGS })
  const hasil = { alat: 'kalibrasi-paritas', nama: NAMA, base: BASE, waktu: new Date().toISOString(), viewport: {} }
  for (const vp of VPS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    await p.goto(BASE, { waitUntil: 'networkidle', timeout: 180000 })
    await p.waitForTimeout(1500)
    // acuan menampilkan layar ENTER lebih dulu; klik supaya yang diukur adalah panggung, bukan layar masuk
    const masuk = await p.evaluate(() => {
      const b = [...document.querySelectorAll('button, [role=button]')]
        .find((e) => /enter|masuk/i.test((e.textContent || '').trim()))
      if (!b) return false
      b.click()
      return true
    })
    if (masuk) { hasil.masuk = true; await p.waitForTimeout(3500) }
    else { hasil.masuk = false; await p.waitForTimeout(3000) }
    const f1 = path.join(SHOTS, `${NAMA}-${vp.tag}-a.png`)
    const f2 = path.join(SHOTS, `${NAMA}-${vp.tag}-b.png`)
    await p.screenshot({ path: f1, timeout: 120000 })
    await p.waitForTimeout(700)
    await p.screenshot({ path: f2, timeout: 120000 })
    const m = ukur(f1, f2)
    hasil.viewport[vp.tag] = m
    console.log(`${NAMA} ${vp.tag}: cakupan ${(m.cakupan * 100).toFixed(1)} % · cx ${m.cx.toFixed(3)} · aspek ${m.aspek.toFixed(2)} · MAE-sendiri ${(m.mae_vs ?? NaN).toFixed(2)}`)
    await p.close(); await ctx.close()
  }
  await browser.close()
  const dasar = hasil.viewport['1440x900']
  if (dasar) {
    for (const tag of ['414x896', '390x844']) {
      const m = hasil.viewport[tag]
      if (!m) continue
      hasil[tag + '_vs_1440'] = {
        korelasi_profil: kor(dasar.profil, m.profil),
        rasio_cakupan: m.cakupan / dasar.cakupan,
        geser_cx: Math.abs(m.cx - dasar.cx),
        rasio_aspek: m.aspek / dasar.aspek,
      }
      const o = hasil[tag + '_vs_1440']
      console.log(`  ${tag} vs 1440 → korelasi ${o.korelasi_profil.toFixed(3)} · cakupan ×${o.rasio_cakupan.toFixed(2)} · Δcx ${(o.geser_cx * 100).toFixed(2)} % · aspek ×${o.rasio_aspek.toFixed(2)}`)
    }
  }
  if (JSON_OUT) { fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true }); fs.writeFileSync(JSON_OUT, JSON.stringify(hasil, null, 1)) }
  console.log('KALIBRASI selesai' + (JSON_OUT ? ` → ${JSON_OUT}` : ''))
})()
