#!/usr/bin/env node
/**
 * gate-paritas.js — v2 (P14 · pengganti sah D9 `gate-d.js` & `gate-apex.js`).
 *
 * ## Kenapa v1 dibatalkan (bukan disesuaikan diam-diam)
 * v1 mewarisi ambang gerbang lama: MAE piksel dua tangkapan harus 0,0000 dan korelasi profil luma
 * antar viewport ≥ 0,95. Kedua ambang itu **tidak lulus di acuan sendiri**. Diukur dengan
 * `tools/kalibrasi-paritas.js` pada produksi asli (bukti: `verification/kalibrasi/*.json`):
 *
 *   ACUAN APEX (produksi asli): MAE diri 8,80 (1440) · 16,06 (390)
 *                               korelasi 390 vs 1440 = 0,325 · rasio aspek siluet ×0,38
 *   ACUAN MIRA (produksi asli): MAE diri 30,65 (1440) · 33,82 (390)
 *                               korelasi 390 vs 1440 = 0,588 · rasio aspek siluet ×0,29
 *
 * Artinya: adegan 3D yang beranimasi **tidak akan pernah** memberi MAE 0 atau korelasi 0,95 antar
 * viewport — termasuk aplikasi aslinya. Gerbang yang menuntutnya bukan gerbang ketat, melainkan
 * gerbang yang salah. Yang bisa dipertanggungjawabkan:
 *
 *   P1 reproduktibilitas  : dua tangkapan berurutan → MAE diri ≤ 1,5 × MAE diri acuan (per viewport)
 *   P2 presentasi panggung: siluet terdeteksi, cakupan 0,5–70 %, pusat horizontal 0,30–0,70,
 *                           kotak siluet ≥ 35 % tinggi & ≥ 20 % lebar viewport
 *   P3 deviasi vs acuan   : dilaporkan sebagai DIAGNOSTIK (cakupan, cx, aspek dibanding acuan pada
 *                           viewport yang sama) — tidak menggagalkan gerbang, tapi wajib tercatat
 *
 * P3 sengaja diagnostik: setelah P13 aset adalah karya kita sendiri, jadi kesamaan bentuk dengan
 * acuan bukan lagi sasaran; yang wajib adalah panggung hadir & terbaca di semua viewport.
 *
 * ## v3 (2026-11-18) — menunggu adegan stabil, bukan "tunggu 2,6 detik"
 * Diukur: pada 414×896, tangkapan setelah 2,6 s memberi cakupan 0,042 sementara setelah 3,5 s memberi
 * 0,236 — animasi kelahiran belum selesai di sandbox SwiftShader (±2,5 fps). Itu sumber angka goyah
 * (cakupan MIRA 414: 0,041 → 0,264 hanya karena waktu tunggu), **bukan** bug tata letak.
 * Sekarang: tunggu sampai cakupan dua tangkapan berurutan selisihnya ≤ 0,5 % (maks 6 tangkapan, tunggu
 * awal 5 s, jeda 1,6 s — tangkapan 414 px di sandbox ini mahal, ± puluhan detik).
 * Hasil sesudah perbaikan: sebaran cakupan 3 run ≤ 0,0019.
 *
 * ## v4 (2026-11-18) — jangkar deterministik, bukan "tunggu lalu tembak"
 * Diukur di sandbox ini (SwiftShader ±2,5 fps), setelah 9 s:
 *   MIRA `?t=11.5`  → MAE diri 0,00–3,33 · cakupan antar run Δ ≤ 0,0028
 *   APEX `?t=9`     → MAE diri 6,19–6,47 · cakupan Δ 0,0048 (sebelumnya `?auto=1`: Δ 0,0475)
 * Sebelumnya (`?auto=1` untuk MIRA) cakupan berayun 0,042 ↔ 0,507 karena tangkapan jatuh di fase animasi
 * berbeda. `?t=` memaku waktu adegan (parameter yang memang ada di aplikasi), jadi yang diukur adalah
 * keadaan yang sama, bukan detik yang berbeda. Menunggu-stabil dipertahankan hanya sebagai laporan.
 *
 * Pakai: PW=/home/user/tools/pw-shim.js node tools/gate-paritas.js [--json keluar.json]
 */
const { chromium } = require(process.env.PW || '/home/user/tools/pw-shim.js')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ARG = process.argv.slice(2)
const JSON_OUT = ARG.includes('--json') ? ARG[ARG.indexOf('--json') + 1] : null
const MIRA = process.env.MIRA || 'http://127.0.0.1:8804/'
const APEX = process.env.APEX || 'http://127.0.0.1:8805/'
// JANGKAR: kueri yang memaku waktu adegan. MIRA punya `?t=<detik>` (idle penuh ±11,5 s);
// APEX memakai `?auto=1` (deterministik setelah 9 s: Δ cakupan antar run 0,0000).
// P15-B: APEX kini punya `?t=` juga (jangkar waktu), jadi kedua aplikasi dipaku dengan cara yang sama.
const JANGKAR = {
  MIRA: process.env.MIRA_JANGKAR || '?t=11.5',
  APEX: process.env.APEX_JANGKAR || '?t=9',
}
const TUNGGU_MS = Number(process.env.TUNGGU_MS || 9000)
const SHOTS = process.env.SHOTS_DIR || '/tmp/gateparitas'
const KAL = process.env.KAL_DIR || '/home/user/Kerja-Arena/verification/kalibrasi'
const ARGS = ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle',
  '--use-angle=swiftshader', '--disable-dev-shm-usage', '--mute-audio']
const SEMUA_VP = [
  { tag: '1440x900', w: 1440, h: 900 },
  { tag: '414x896', w: 414, h: 896 },
  { tag: '390x844', w: 390, h: 844 },
]
// HANYA=414x896 → ukur satu viewport saja (untuk diagnosis cepat; gerbang penuh memakai ketiganya)
const VPS = process.env.HANYA ? SEMUA_VP.filter((v) => v.tag === process.env.HANYA) : SEMUA_VP

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
  return JSON.parse(execFileSync(process.env.PY || 'python3', args).toString())
}

/**
 * Tunggu sampai adegan STABIL: cakupan piksel terang dua tangkapan berurutan selisih ≤ 0,5 %.
 * Mengembalikan { cakupan, tangkapan, ms } — dipakai sebelum tangkapan resmi.
 */
async function tungguStabil(p, ukurFn, maks = 8, jedaMs = 1500, minimumMs = 8000) {
  // Dua syarat, bukan satu:
  //   1. sudah lewat `minimumMs` sejak mulai (animasi kelahiran ±11,5 s; di SwiftShader lebih lama) —
  //      mencegah "stabil" palsu ketika renderer membeku di satu bingkai karena kelaparan frame;
  //   2. cakupan 3 pembacaan BERURUTAN selisih ≤ 0,5 % (dua delta berturut-turut) → minimal 4 tangkapan.
  //      Versi pertama (2 tangkapan) pernah meloloskan cakupan 0,507 yang sebenarnya tak stabil.
  const mulai = Date.now()
  const riwayat = []
  for (let i = 1; i <= maks; i++) {
    const lewat = Date.now() - mulai
    const jeda = i === 1 ? Math.max(5000, minimumMs - lewat) : jedaMs
    if (jeda > 0) await p.waitForTimeout(jeda)
    const f = path.join(SHOTS, `stabil-${process.pid}-${i}.png`)
    await p.screenshot({ path: f, timeout: 300000 })
    const m = ukurFn(f)
    fs.unlinkSync(f)
    riwayat.push(+m.cakupan.toFixed(4))
    const n = riwayat.length
    if (n >= 4 && Date.now() - mulai >= minimumMs) {
      const d1 = Math.abs(riwayat[n - 1] - riwayat[n - 2])
      const d2 = Math.abs(riwayat[n - 2] - riwayat[n - 3])
      if (d1 <= 0.005 && d2 <= 0.005) return { cakupan: m.cakupan, tangkapan: i, stabil: true, riwayat }
    }
  }
  return { cakupan: riwayat[riwayat.length - 1], tangkapan: maks, stabil: false, riwayat }
}

function bacaAcuan(nama, berkas) {
  const f = path.join(KAL, berkas)
  if (!fs.existsSync(f)) return null
  const j = JSON.parse(fs.readFileSync(f))
  return { nama, viewport: j.viewport }
}

const ACUAN = {
  MIRA: bacaAcuan('acuan MIRA (produksi asli)', 'mira-produksi-2026-11-17.json'),
  APEX: bacaAcuan('acuan APEX (produksi asli)', 'apex-produksi-2026-11-17.json'),
}

const hasil = {
  judul: 'Gerbang paritas v2 — reproduktibilitas + presentasi panggung (+ diagnostik vs acuan)',
  waktu: new Date().toISOString(),
  sql: {
    P1_mae_diri_kali_acuan: 1.5,
    P2_cakupan: [0.005, 0.70], P2_cx: [0.30, 0.70], P2_tinggi: 0.35, P2_lebar: 0.20,
  },
  aplikasi: [],
}

;(async () => {
  fs.mkdirSync(SHOTS, { recursive: true })
  const browser = await chromium.launch({ args: ARGS })
  let lulus = 0, total = 0
  for (const [nama, base] of [['MIRA', MIRA], ['APEX', APEX]]) {
    const app = { aplikasi: nama, base, viewport: [], diagnostik: [], lulus: 0, total: 0 }
    const cek = (n, ok, ket) => {
      total++; app.total++; if (ok) { lulus++; app.lulus++ }
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${nama} ${n}  ${ket}`)
    }
    for (const vp of VPS) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 })
      const p = await ctx.newPage()
      await p.goto(base + JANGKAR[nama], { waitUntil: 'networkidle', timeout: 120000 })
      await p.waitForTimeout(TUNGGU_MS)
      const stab = { cakupan: null, tunggu_ms: TUNGGU_MS, jangkar: JANGKAR[nama] }
      const f1 = path.join(SHOTS, `${nama}-${vp.tag}-a.png`)
      const f2 = path.join(SHOTS, `${nama}-${vp.tag}-b.png`)
      await p.screenshot({ path: f1, timeout: 300000 })
      await p.waitForTimeout(700)
      await p.screenshot({ path: f2, timeout: 300000 })
      const m = ukur(f1, f2)
      m.vp = vp.tag
      m.stabil = stab
      app.viewport.push(m)
      if (m.kosong) { cek(`${vp.tag} siluet hadir`, false, 'tidak ada piksel terang'); await p.close(); await ctx.close(); continue }

      const ac = ACUAN[nama]?.viewport?.[vp.tag]
      const batasMae = ac?.mae_vs ? ac.mae_vs * 1.5 : 40
      cek(`${vp.tag} P1 MAE diri ≤ 1,5 × acuan`, (m.mae_vs ?? 999) <= batasMae,
        `MAE ${(m.mae_vs ?? NaN).toFixed(2)} ≤ ${batasMae.toFixed(2)} (acuan ${ac?.mae_vs?.toFixed(2) ?? '—'})`)
      cek(`${vp.tag} P2 cakupan 0,5–70 %`, m.cakupan >= 0.005 && m.cakupan <= 0.70,
        `${(m.cakupan * 100).toFixed(1)} % (acuan ${ac ? (ac.cakupan * 100).toFixed(1) + ' %' : '—'})`)
      cek(`${vp.tag} P2 pusat horizontal 0,30–0,70`, m.cx >= 0.30 && m.cx <= 0.70,
        `cx ${m.cx.toFixed(3)} (acuan ${ac ? ac.cx.toFixed(3) : '—'})`)
      cek(`${vp.tag} P2 kotak siluet`,
        m.h / m.tinggi_viewport >= 0.35 && m.w / m.lebar_viewport >= 0.20,
        `tinggi ${(m.h / m.tinggi_viewport * 100).toFixed(1)} % · lebar ${(m.w / m.lebar_viewport * 100).toFixed(1)} %`)
      if (ac) {
        app.diagnostik.push({
          vp: vp.tag,
          cakupan_kita: +m.cakupan.toFixed(4), cakupan_acuan: +ac.cakupan.toFixed(4),
          cx_kita: +m.cx.toFixed(3), cx_acuan: +ac.cx.toFixed(3),
          aspek_kita: +m.aspek.toFixed(3), aspek_acuan: +ac.aspek.toFixed(3),
          tinggi_kita: +(m.h / m.tinggi_viewport).toFixed(3), tinggi_acuan: undefined,
        })
      }
      await p.close(); await ctx.close()
    }
    app.diagnostik.push({ catatan: 'P3 diagnostik: bukan kriteria lulus. Setelah P13 aset milik sendiri; ' +
      'angka acuan dipakai untuk menilai kesan bingkai (mis. siluet di ponsel lebih besar dari acuan).' })
    hasil.aplikasi.push(app)
  }
  // korelasi profil antar viewport — dilaporkan, bukan digerbang (acuan sendiri 0,33–0,59)
  for (const app of hasil.aplikasi) {
    const d = app.viewport.find((v) => v.vp === '1440x900')
    if (!d || d.kosong) continue
    for (const m of app.viewport) {
      if (m.vp === '1440x900' || m.kosong) continue
      if (m.profil.length !== d.profil.length) continue
      const n = 32
      const ma = d.profil.reduce((s, v) => s + v, 0) / n
      const mb = m.profil.reduce((s, v) => s + v, 0) / n
      let num = 0, da = 0, db = 0
      for (let i = 0; i < n; i++) { num += (d.profil[i] - ma) * (m.profil[i] - mb); da += (d.profil[i] - ma) ** 2; db += (m.profil[i] - mb) ** 2 }
      app.diagnostik.push({ vp: m.vp + ' vs 1440', korelasi_profil: +(num / Math.sqrt(da * db || 1)).toFixed(3),
        rasio_cakupan: +(m.cakupan / d.cakupan).toFixed(2) })
    }
  }
  await browser.close()
  hasil.ringkas = { lulus, total }
  if (JSON_OUT) { fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true }); fs.writeFileSync(JSON_OUT, JSON.stringify(hasil, null, 1)) }
  console.log(`\nGERBANG PARITAS v2: ${lulus}/${total}` + (JSON_OUT ? ` → ${JSON_OUT}` : ''))
  process.exit(lulus === total ? 0 : 1)
})()
