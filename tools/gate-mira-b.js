/**
 * gate-mira-b.js — Gerbang B MIRA: panel 82/82 + urutan 20 seksi + 7 alias.
 * Pembanding: recon/mira-params.json (yang sudah diverifikasi 82/82 terhadap bundle).
 *   node tools/gate-mira-b.js http://127.0.0.1:5190
 */
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')
const fs = require('fs')
const base = (process.argv[2] || 'http://127.0.0.1:5190').replace(/\/$/, '')
const P = JSON.parse(fs.readFileSync('/home/user/Kerja-Arena/recon/mira-params.json', 'utf8'))

;(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.goto(base + '/?auto=1', { waitUntil: 'load' })
  await p.waitForTimeout(1500)
  await p.click('[data-testid="mira-panel-toggle"]')
  await p.waitForTimeout(400)

  const dom = await p.evaluate(() =>
    [...document.querySelectorAll('[data-section]')].map((sec) => ({
      group: sec.getAttribute('data-group'),
      rows: [...sec.querySelectorAll('[data-dial-row]')].map((r) => {
        const inp = r.querySelector('input[type=range]')
        return {
          key: r.getAttribute('data-dial-row'),
          stands: r.getAttribute('data-stands'),
          label: r.querySelector('span span')?.textContent,
          value: Number(inp.value),
          min: Number(inp.dataset.min), max: Number(inp.dataset.max),
          step: Number(inp.dataset.step), def: Number(inp.dataset.default),
        }
      }),
    }))
  )
  await p.screenshot({ path: '/home/user/Kerja-Arena/verification/mira/panel-open.png' })


  // F-139 (alat): panel kadang SUDAH terbuka (mis. saat `?dial.` dipakai atau sesudah reload),
  // sehingga tombol toggle tidak ada dan `click` menggantung 30 s. Buka hanya bila perlu.
  const ensurePanel = async (page) => {
    const has = await page.evaluate(() => !!document.querySelector('input[data-key]'))
    if (has) return
    await page.click('[data-testid="mira-panel-toggle"]')
    await page.waitForTimeout(300)
  }

  const rows = dom.flatMap((s) => s.rows)
  const checks = []
  const add = (n, a, bb, pass) => { checks.push({ n, a, b: bb, pass }); console.log(`${pass ? '✅' : '⛔'} ${n}${pass ? '' : `\n   spec : ${JSON.stringify(a)}\n   build: ${JSON.stringify(bb)}`}`) }

  add('jumlah slider = 82', 82, rows.length, rows.length === 82)
  add('jumlah seksi = 20', 20, dom.length, dom.length === 20)

  const orderOk = dom.every((s, i) => {
    const exp = P.filter((x) => x.group === s.group)
    return s.rows.length > 0
  })
  const specGroups = P.map((x) => x.group)
  const specSections = []
  for (const g of specGroups) {
    if (!specSections.length || specSections[specSections.length - 1].group !== g) specSections.push({ group: g, n: 0 })
    specSections[specSections.length - 1].n++
  }
  add('urutan nama seksi', specSections.map((s) => s.group), dom.map((s) => s.group),
      JSON.stringify(specSections.map((s) => s.group)) === JSON.stringify(dom.map((s) => s.group)))
  add('jumlah baris per seksi', specSections.map((s) => s.n), dom.map((s) => s.rows.length),
      JSON.stringify(specSections.map((s) => s.n)) === JSON.stringify(dom.map((s) => s.rows.length)))

  // per-param: key, label, min/max/step/default, urutan
  const diffs = []
  P.forEach((exp, i) => {
    const got = rows[i]
    if (!got) { diffs.push([i, exp.key, 'MISSING']); return }
    if (got.key !== exp.key) diffs.push([i, exp.key, 'key', got.key])
    if (got.label !== exp.label) diffs.push([i, exp.key, 'label', got.label])
    if (got.min !== exp.min || got.max !== exp.max) diffs.push([i, exp.key, 'range', [got.min, got.max]])
    if (Math.abs(got.step - exp.step) > 1e-9) diffs.push([i, exp.key, 'step', got.step])
    if (Math.abs(got.value - exp.default) > 1e-9) diffs.push([i, exp.key, 'default', got.value])
  })
  add('key/label/min/max/step/default 82/82', `${P.length - diffs.length}/82`, `${82 - diffs.length}/82`, diffs.length === 0)
  if (diffs.length) console.log(diffs.slice(0, 10))

  // alias: geser slider humanoid → pasangan scene ikut berubah
  const aliasRows = P.filter((x) => x.stands)
  add('jumlah alias `stands` = 7', 7, aliasRows.length, aliasRows.length === 7)
  const aliasResults = []
  for (const a of aliasRows) {
    const target = a.default === a.max ? a.min : a.max
    await p.evaluate(({ k, v }) => {
      const inp = document.querySelector(`input[data-key="${k}"]`)
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(inp, String(v))
      inp.dispatchEvent(new Event('input', { bubbles: true }))
    }, { k: a.key, v: target })
    await p.waitForTimeout(120)
    const partner = await p.evaluate((k) => Number(document.querySelector(`input[data-key="${k}"]`).value), a.stands)
    const shownVal = await p.evaluate((k) => Number(document.querySelector(`input[data-key="${k}"]`).value), a.key)
    aliasResults.push({ hum: a.key, scene: a.stands, set: target, got: partner, self: shownVal, pass: Math.abs(partner - target) < 1e-9 && Math.abs(shownVal - target) < 1e-9 })
  }
  aliasResults.forEach((r) => console.log(`   ${r.pass ? '·' : '✗'} ${r.hum} = ${r.set} → ${r.scene} = ${r.got}`))
  add('alias propagate 7/7', '7/7', `${aliasResults.filter((r) => r.pass).length}/7`, aliasResults.every((r) => r.pass))

  // ?dial.<key>= mengalahkan default
  const p2 = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p2.goto(base + '/?auto=1&dial.lines.count=14&dial.hum.glow.threshold=0.25', { waitUntil: 'load' })
  await p2.waitForTimeout(1200)
  await ensurePanel(p2)
  const urlVals = await p2.evaluate(() => ({
    count: Number(document.querySelector('input[data-key="lines.count"]').value),
    thr: Number(document.querySelector('input[data-key="hum.glow.threshold"]').value),
    alias: Number(document.querySelector('input[data-key="bloom.threshold"]').value),
    stored: window.localStorage.getItem('mira.dial'),
  }))
  add('?dial.lines.count=14', 14, urlVals.count, urlVals.count === 14)
  add('?dial.hum.glow.threshold=.25 (tanpa menyentuh bloom.threshold)', 0.25, urlVals.thr, Math.abs(urlVals.thr - 0.25) < 1e-9)
  await p2.close()

  // localStorage: nilai yang digeser user bertahan setelah reload
  await p.click('[data-testid="mira-panel-reset"]')
  await p.waitForTimeout(150)
  await p.evaluate(() => {
    const inp = document.querySelector('input[data-key="lines.width"]')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(inp, '2.3')
    inp.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await p.waitForTimeout(150)
  await p.reload({ waitUntil: 'load' })
  await p.waitForTimeout(1200)
  await ensurePanel(p)
  const after = await p.evaluate(() => Number(document.querySelector('input[data-key="lines.width"]').value))
  add('localStorage bertahan setelah reload', 2.3, after, Math.abs(after - 2.3) < 1e-9)
  await p.evaluate(() => window.localStorage.clear())

  const passed = checks.filter((c) => c.pass).length
  fs.mkdirSync('/home/user/Kerja-Arena/verification/mira', { recursive: true })
  fs.writeFileSync('/home/user/Kerja-Arena/verification/mira/gate-b.json',
    JSON.stringify({ base, checks, aliases: aliasResults, summary: { passed, total: checks.length } }, null, 1))
  console.log(`\n${passed}/${checks.length} lolos → verification/mira/gate-b.json`)
  await b.close()
  process.exit(passed === checks.length ? 0 : 1)
})()
