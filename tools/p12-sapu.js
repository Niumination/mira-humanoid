#!/usr/bin/env node
/**
 * p12-sapu.js — P12 langkah 2: sapu knob MIRA pada satu/lebih fase, lalu laporkan
 * MAE (luma) + torso + bias pita gelap, dibandingkan acuan live yang sudah ada di DIR.
 *
 * Pakai: node tools/p12-sapu.js --dir /tmp/p12 --t 9.5 --variants "bawaan=;hy=-0.004;bt=0.5"
 * Butuh: tools/shot.js (di direktori yang sama), playwright di $PW, preview MIRA di $BASE.
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const arg = (n, d) => (process.argv.indexOf(n) >= 0 ? process.argv[process.argv.indexOf(n) + 1] : d)
const DIR = arg('--dir', '/tmp/p12')
const T = arg('--t', '9.5')
const BASE = arg('--base', 'http://127.0.0.1:8804/')
const VAR = arg('--variants', 'bawaan=')
const TOOLS = '/home/user/tools'

const py = `
import sys, json
import numpy as np
from PIL import Image
D, t, tag = sys.argv[1], sys.argv[2], sys.argv[3]
def A(p): return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
L = A(f'{D}/live-{t}.png'); O = A(f'{D}/{tag}-{t}.png')
ll, oo = L.mean(2), O.mean(2)
tok = oo[400:780, 520:900]; tl = ll[400:780, 520:900]
d = tok - tl
dark = tl < 20
top = tok[:96]; topl = tl[:96]
band = (tl>=120)&(tl<200)
print(json.dumps({'tag': tag, 'mae': round(float(np.abs(oo-ll).mean()),3),
  'torso': round(float(np.abs(tok-tl).mean()),3), 'bias': round(float(d.mean()),2),
  'pita0_20': round(float(d[dark].mean()),2), 'pita200': round(float(d[tl>=200].mean()),2),
  'atas': round(float(np.abs(top-topl).mean()),3), 'bias_atas': round(float((top-topl).mean()),2),
  'pita120_200': round(float(np.abs(d[band]).mean()),3)}))
`

const rows = []
for (const v of VAR.split(';').filter(Boolean)) {
  const i = v.indexOf('=')
  const tag = i > 0 ? v.slice(0, i) : v
  const q = i > 0 ? v.slice(i + 1) : ''
  const extra = q ? `&${q}` : ''
  const out = `/tmp/p12/${tag}-${T}.png`
  if (!fs.existsSync(out) || process.env.ULANG === '1') {
    execFileSync('node', [path.join(TOOLS, 'shot.js')], {
      env: { ...process.env, BASE, TS: T, PREFIX: tag, OUTDIR: DIR, WAIT: '5000', UIHIDE: '1', EXTRA: extra },
      stdio: 'ignore',
    })
  }
  const r = JSON.parse(execFileSync('python3', ['-c', py, DIR, T, tag]).toString())
  rows.push(r)
  console.log(`${r.tag.padEnd(16)} MAE ${r.mae.toFixed(3)}  torso ${r.torso.toFixed(3)}  atas ${r.atas.toFixed(2)}(${r.bias_atas >= 0 ? '+' : ''}${r.bias_atas})  p120-200 ${r.pita120_200.toFixed(2)}  p0-20 ${r.pita0_20 >= 0 ? '+' : ''}${r.pita0_20}  p200 ${r.pita200 >= 0 ? '+' : ''}${r.pita200}`)
}
fs.writeFileSync(`${DIR}/p12-sapu-${String(T).replace('.', '')}.json`, JSON.stringify({ t: T, rows }, null, 1))
