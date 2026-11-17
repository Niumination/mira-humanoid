/**
 * gate-mira-a.js — Gerbang A MIRA: entry screen (copy + gaya) dan mode humanoid.
 * Membandingkan rebuild (localhost) dengan live https://mira-humanoid.vercel.app/
 */
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
const fs = require('fs')
const LIVE = 'https://mira-humanoid.vercel.app/'
const BASE = (process.env.BASE || process.argv[2] || 'http://127.0.0.1:8804').replace(/\/$/, '')
const OUT = '/home/user/Kerja-Arena/verification/mira'

const probe = () => ({
  // Hanya teks yang TERLIHAT. Sejak P14 build punya <h1 class="sr-only"> (landmark aksesibilitas)
  // yang tidak dirender — live tidak punya itu, jadi tanpa penyaringan perbandingan copy jadi gagal palsu.
  texts: [...document.querySelectorAll('div,h1,h2,span,p,button')]
    .filter((e) => {
      if (e.classList.contains('sr-only') || e.closest('.sr-only')) return false
      const r = e.getBoundingClientRect()
      return r.width > 1 && r.height > 1
    })
    .map((e) => e.childElementCount === 0 ? (e.textContent || '').trim() : '')
    .filter(Boolean),
  // innerText membuang elemen tersembunyi; .sr-only tetap terhitung "terlihat" oleh innerText,
  // jadi judul tersembunyi dibuang manual supaya yang dibandingkan hanya copy visual.
  body: ((() => {
    const sr = [...document.querySelectorAll('.sr-only')]
    const simpan = sr.map((e) => e.style.display)
    sr.forEach((e) => { e.style.display = 'none' })
    const t = (document.body.innerText || '').replace(/\s+/g, ' ').trim()
    sr.forEach((e, i) => { e.style.display = simpan[i] })
    return t
  })()),
  buttons: [...document.querySelectorAll('button')].map((b) => ({
    t: (b.textContent || '').trim(),
    aria: b.getAttribute('aria-label'),
    pressed: b.getAttribute('aria-pressed'),
    style: (() => { const s = getComputedStyle(b); return { color: s.color, bg: s.backgroundColor, border: s.border, radius: s.borderRadius, font: s.fontFamily, size: s.fontSize, ls: s.letterSpacing, pad: s.padding } })(),
  })),
  title: document.title,
  canvas: [...document.querySelectorAll('canvas')].map((c) => ({ w: c.width, h: c.height, pos: getComputedStyle(c).position })),
})

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  const out = {}
  for (const [tag, url] of [['live', LIVE], ['build', BASE + '/']]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(1500)
    const entry = await p.evaluate(probe)
    await p.screenshot({ path: `${OUT}/${tag}-entry.png` })
    // mode humanoid
    await p.goto(url + '?auto=1', { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(2500)
    const mode = await p.evaluate(probe)
    await p.screenshot({ path: `${OUT}/${tag}-mode.png` })
    out[tag] = { entry, mode }
    await p.close()
  }
  await b.close()

  const checks = []
  const add = (n, a, bb, pass) => { checks.push({ n, a, b: bb, pass }); console.log(`${pass ? '✅' : '⛔'} ${n}${pass ? '' : `\n   live : ${JSON.stringify(a).slice(0, 400)}\n   build: ${JSON.stringify(bb).slice(0, 400)}`}`) }

  add('title', out.live.entry.title, out.build.entry.title, out.live.entry.title === out.build.entry.title)
  add('entry: teks (semua node daun)', out.live.entry.texts, out.build.entry.texts,
      JSON.stringify(out.live.entry.texts) === JSON.stringify(out.build.entry.texts))
  add('entry: body innerText', out.live.entry.body, out.build.entry.body, out.live.entry.body === out.build.entry.body)
  add('entry: tombol + gaya', out.live.entry.buttons, out.build.entry.buttons,
      JSON.stringify(out.live.entry.buttons) === JSON.stringify(out.build.entry.buttons))
  const lb = out.live.mode.buttons.map((x) => x.t).sort()
  const bb = out.build.mode.buttons.map((x) => x.t).filter((t) => t !== 'DIAL').sort()
  add('mode: label tombol', lb, bb, JSON.stringify(lb) === JSON.stringify(bb))
  const lStyle = out.live.mode.buttons.find((x) => x.t === 'REPLAY')?.style
  const bStyle = out.build.mode.buttons.find((x) => x.t === 'REPLAY')?.style
  add('mode: gaya tombol REPLAY', lStyle, bStyle, JSON.stringify(lStyle) === JSON.stringify(bStyle))
  const lState = out.live.mode.buttons.filter((x) => ['IDLE','LISTENING','TALKING'].includes(x.t)).map((x) => [x.t, x.pressed])
  const bState = out.build.mode.buttons.filter((x) => ['IDLE','LISTENING','TALKING'].includes(x.t)).map((x) => [x.t, x.pressed])
  add('mode: aria-pressed status', lState, bState, JSON.stringify(lState) === JSON.stringify(bState))
  add('mode: aria-label kamera', out.live.mode.buttons.find((x) => x.t === 'ENABLE CAMERA')?.aria,
      out.build.mode.buttons.find((x) => x.t === 'ENABLE CAMERA')?.aria,
      out.live.mode.buttons.find((x) => x.t === 'ENABLE CAMERA')?.aria === out.build.mode.buttons.find((x) => x.t === 'ENABLE CAMERA')?.aria)

  const passed = checks.filter((c) => c.pass).length
  fs.writeFileSync(`${OUT}/gate-a.json`, JSON.stringify({ checks, summary: { passed, total: checks.length } }, null, 1))
  console.log(`\n${passed}/${checks.length} lolos → verification/mira/gate-a.json`)
  await b.close().catch(()=>{})
  process.exit(passed === checks.length ? 0 : 1)
})()
