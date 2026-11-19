#!/usr/bin/env python3
"""
ukur-viewport.py — ukur SATU URL aplikasi pada 3 viewport (1440×900 · 414×896 · 390×844).

Berbeda dari `gate-paritas.js` (yang membandingkan dua aplikasi sekaligus dan memutuskan lulus/gagal),
alat ini hanya **mengukur** dan menulis JSON — dipakai `tools/ukur-build.py` untuk mengisi riwayat build.

Pakai:
  PW=/home/user/tools/pw-shim.js python3 tools/ukur-viewport.py http://127.0.0.1:8805/ APEX \
      --json verification/riwayat/apex/<sampel>/ukur.json

Kalau `PW`/Chromium tidak tersedia, alat menulis `{"tersedia": false}` dan keluar 0 — riwayat build tetap
tercatat (ukuran, gzip, provenance), hanya metrik render yang dilewati.
"""
import json
import os
import subprocess
import sys
import tempfile

JS = r'''
const { chromium } = require(process.env.PW || '/home/user/tools/pw-shim.js')
const { execFileSync } = require('child_process')
const fs = require('fs')
const BASE = process.argv[2]
const NAMA = process.argv[3]
const OUT = process.argv[4]
const SHOTS = fs.mkdtempSync('/tmp/ukur-')
const ARGS = ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
              '--disable-dev-shm-usage','--mute-audio']
const VPS = [['1440x900',1440,900],['414x896',414,896],['390x844',390,844]]
const PY = `
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
print(json.dumps({'cakupan': float(m.mean()), 'cx': float(xs.mean()/W), 'cy': float(ys.mean()/H),
  'w': int(xs.max()-xs.min()+1), 'h': int(ys.max()-ys.min()+1),
  'aspek': float((xs.max()-xs.min()+1)/(ys.max()-ys.min()+1)), 'profil': [p/base for p in prof]}))
`
const ukur = (f) => JSON.parse(execFileSync('python3', ['-c', PY, f]).toString())
;(async () => {
  const b = await chromium.launch({ args: ARGS })
  const hasil = { url: BASE, aplikasi: NAMA }
  for (const [tag, w, h] of VPS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', e => errs.push(String(e).slice(0, 120)))
    await p.goto(BASE + '?auto=1', { waitUntil: 'networkidle', timeout: 120000 })
    // tunggu STABIL (sama dengan gate-paritas v3b): lewat 8 s DAN cakupan 3 pembacaan berurutan
    // selisih ≤ 0,5 % (minimal 4 tangkapan). Dua tangkapan saja bisa "stabil" palsu saat renderer membeku.
    const mulai = Date.now()
    const riwayat = []
    for (let i = 1; i <= 8; i++) {
      const lewat = Date.now() - mulai
      const jeda = i === 1 ? Math.max(5000, 8000 - lewat) : 1500
      if (jeda > 0) await p.waitForTimeout(jeda)
      const fs0 = `${SHOTS}/stab-${tag}-${i}.png`
      await p.screenshot({ path: fs0, timeout: 300000 })
      riwayat.push(+ukur(fs0).cakupan.toFixed(4))
      fs.unlinkSync(fs0)
      const n = riwayat.length
      if (n >= 3 && Date.now() - mulai >= 8000 &&
          Math.abs(riwayat[n-1]-riwayat[n-2]) <= 0.005 &&
          Math.abs(riwayat[n-2]-riwayat[n-3]) <= 0.005) break
    }
    const f1 = `${SHOTS}/${tag}-a.png`, f2 = `${SHOTS}/${tag}-b.png`
    await p.screenshot({ path: f1, timeout: 120000 })
    await p.waitForTimeout(700)
    await p.screenshot({ path: f2, timeout: 120000 })
    const m = ukur(f1)
    // MAE diri
    try {
      const py = `
import sys, json
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
b = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
print(json.dumps({'mae': float(np.abs(a-b).mean())}))`
      m.mae_diri = JSON.parse(execFileSync('python3', ['-c', py, f1, f2]).toString()).mae
    } catch (e) { m.mae_diri = null }
    m.error_halaman = errs.length
    m.vp = tag
    hasil[tag] = m
    await p.close(); await ctx.close()
  }
  await b.close()
  fs.writeFileSync(OUT, JSON.stringify(hasil, null, 1))
  console.log('ukur selesai → ' + OUT)
})().catch(e => { console.error('ERROR', e.message); process.exit(3) })
'''


def main():
    if len(sys.argv) < 3:
        print('pakai: ukur-viewport.py URL NAMA [--json keluar.json]'); sys.exit(2)
    url, nama = sys.argv[1], sys.argv[2]
    out = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else 'ukur.json'
    env = dict(os.environ)
    env.setdefault('PW', '/home/user/tools/pw-shim.js')
    if not os.path.exists(env['PW']):
        json.dump({'tersedia': False, 'alasan': 'PW/shim tidak ada'}, open(out, 'w'))
        print('Chromium tidak tersedia → metrik render dilewati'); sys.exit(0)
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f:
        f.write(JS)
        skrip = f.name
    r = subprocess.run(['node', skrip, url, nama, out], env=env, capture_output=True, text=True)
    if r.returncode != 0:
        alasan = (r.stderr or r.stdout or '')[-300:]
        json.dump({'tersedia': False, 'alasan': alasan}, open(out, 'w'))
        print(f'ukur gagal ({r.returncode}) → dicatat sebagai tidak tersedia: {alasan[-160:]}')
        sys.exit(0)
    print(r.stdout.strip())


if __name__ == '__main__':
    main()
