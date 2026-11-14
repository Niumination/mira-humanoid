#!/usr/bin/env node
/**
 * probe-mira-torso.js — P12 langkah 1: petakan POLA garis tubuh (torso) pada MIRA live.
 *
 * Bukan menyalin citra: yang diambil hanya **titik puncak garis** (ridge) dari tiap baris di
 * wilayah torso, supaya pola itu bisa dihasilkan ulang oleh geometri (pita + lengkung), bukan
 * dari kuad tekstur.
 *
 * Pakai: node tools/probe-mira-torso.js [--t 9.5] [--vp 1440x900] [--out dir]
 * Keluaran: <out>/live-t95.png, <out>/ours-t95.png, <out>/ridge-overlay.png, <out>/pola-torso.json
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright')

const ARG = process.argv.slice(2)
const getArg = (n, d) => (ARG.indexOf(n) >= 0 ? ARG[ARG.indexOf(n) + 1] : d)
const T = getArg('--t', '9.5')
const [W, H] = getArg('--vp', '1440x900').split('x').map(Number)
const LIVE = getArg('--live', 'https://mira-humanoid.vercel.app/')
const OURS = getArg('--ours', 'http://127.0.0.1:8804/')
const OUT = getArg('--out', '/tmp/mira-torso')
fs.mkdirSync(OUT, { recursive: true })

const ARGS = ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage', '--mute-audio']

const ridgePy = `
import sys, json
import numpy as np
from PIL import Image, ImageDraw
src, out_png, out_json = sys.argv[1], sys.argv[2], sys.argv[3]
x0, x1, y0, y1 = map(int, sys.argv[4:8])
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32).mean(2)
sub = a[y0:y1, x0:x1]
# ridge = maksimum lokal sepanjang baris (garis terang di atas latar gelap)
rows = []
for j in range(sub.shape[0]):
    r = sub[j]
    base = np.percentile(r, 40)
    thr = max(base + 6.0, 18.0)
    xs = []
    for i in range(1, len(r) - 1):
        if r[i] >= thr and r[i] >= r[i - 1] and r[i] > r[i + 1]:
            xs.append(i)
    # gabungkan puncak yang berdekatan (<3 px)
    merged = []
    for i in xs:
        if merged and i - merged[-1] <= 3:
            if r[i] > r[merged[-1]]:
                merged[-1] = i
        else:
            merged.append(i)
    if merged:
        rows.append({'y': y0 + j, 'x': [x0 + i for i in merged], 'v': [round(float(r[i]), 1) for i in merged]})
# statistik jarak antar-garis pada baris yang punya >=3 puncak
gaps = []
for row in rows:
    xs = row['x']
    for k in range(1, len(xs)):
        d = xs[k] - xs[k - 1]
        if 2 <= d <= 80:
            gaps.append(d)
gaps = np.array(gaps) if gaps else np.array([0])
ov = im.copy()
d = ImageDraw.Draw(ov)
for row in rows:
    for x in row['x']:
        d.point((x, row['y']), fill=(255, 40, 40))
d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(0, 255, 120))
ov.save(out_png)
json.dump({'t': None, 'region': [x0, y0, x1, y1], 'rows': rows,
           'gap_median': float(np.median(gaps)), 'gap_p10': float(np.percentile(gaps, 10)),
           'gap_p90': float(np.percentile(gaps, 90)), 'n_rows': len(rows),
           'n_points': int(sum(len(r['x']) for r in rows))}, open(out_json, 'w'))
print(json.dumps({'n_rows': len(rows), 'n_points': int(sum(len(r['x']) for r in rows)),
                  'gap_median': float(np.median(gaps))}))
`

;(async () => {
  const b = await chromium.launch({ args: ARGS })
  const shots = {}
  for (const [name, url] of [['live', LIVE], ['ours', OURS]]) {
    const p = await b.newPage({ viewport: { width: W, height: H } })
    await p.goto(`${url}?t=${T}`, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(6000)
    const f = path.join(OUT, `${name}-t${String(T).replace('.', '')}.png`)
    await p.screenshot({ path: f, timeout: 120000 })
    shots[name] = f
    await p.close()
  }
  await b.close()
  // wilayah torso mengikuti ANALISIS-GERBANG-C (§ diagnosis: y 400-740, x 540-860 → diperluas)
  // urutan argumen: x0, x1, y0, y1 (sesuai pembacaan di skrip python)
  const region = [520, 900, 400, 780]
  for (const name of ['live', 'ours']) {
    const json = path.join(OUT, `pola-torso-${name}.json`)
    const png = path.join(OUT, `ridge-${name}.png`)
    const res = execFileSync('python3', ['-c', ridgePy, shots[name], png, json, ...region.map(String)]).toString()
    console.log(name, res.trim())
  }
  console.log('keluaran di', OUT)
})()
