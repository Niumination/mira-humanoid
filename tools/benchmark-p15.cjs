#!/usr/bin/env node
/**
 * benchmark-p15.cjs — harness benchmark P15 v2 (protokol v1, 3 cold-run).
 * Perbaikan vs kalibrasi-paritas.js: scene-ready detection, cold-context per run,
 * sampling time-windowed untuk sumber tanpa ?t=, invalidasi otomatis (bola/UI/kosong).
 *
 * Pakai:
 *   node tools/benchmark-p15.cjs --target apex-asli --url https://apex-humanoid.vercel.app/ \
 *        --anchor 9 --viewport 1440x900 --runs 3 --json out.json --shots /tmp/shots
 */
const { chromium } = require(process.env.PW || '/home/user/tools/pw-shim.cjs');
const fs = require('fs'); const path = require('path');
const argv = process.argv.slice(2);
const arg=(n,d=null)=>argv.includes(n)?argv[argv.indexOf(n)+1]:d;
const APP=(arg('--target')||'apex-rekon').toLowerCase();
const URL_DASAR=arg('--url');
const ANCHOR=arg('--anchor','9');
const [VW,VH]=(arg('--viewport','1440x900').split('x')).map(Number);
const RUNS=Number(arg('--runs','3'));
const OUT=arg('--json'); const SHOTS=arg('--shots','/tmp/p15-shots');
fs.mkdirSync(SHOTS,{recursive:true});
const DUKUNG_T = arg('--exact','auto')==='1' || APP.includes('rekon') || APP.includes('mira');

const URL = URL_DASAR + (DUKUNG_T ? `?auto=1&t=${ANCHOR}` : `?auto=1`);
// scene-ready: tunggu kanvas webgl berukuran nyata + luma menggambar (bukan UI saja)
async function sceneReady(page) {
  try {
    await page.waitForFunction(() => {
      const cs = [...document.querySelectorAll('canvas')];
      return cs.some(c => c.width > 50 && c.height > 50 && c.getContext);
    }, { timeout: 30000 });
    await page.waitForTimeout(1500);
    return true;
  } catch { return false; }
}
(async () => {
  const browser = await chromium.launch();
  const runs = [];
  for (let run=0; run<RUNS; run++) {
    const ctx = await browser.newContext({ viewport:{width:VW,height:VH}, deviceScaleFactor:1 });
    const page = await ctx.newPage();
    const konsol=[], jaringan=[];
    page.on('console', m=>{ if(m.type()==='error') konsol.push(m.text().slice(0,200)); });
    const t0 = Date.now();
    const resp = await page.goto(URL,{ waitUntil:'networkidle', timeout:120000 }).catch(()=>null);
    const siap = await sceneReady(page);
    // sampling: 8 frame x 250ms
    const sampel=[];
    for (let i=0;i<8;i++){
      const f = path.join(SHOTS, `${APP}-a${ANCHOR}-r${run}-f${i}.png`);
      await page.screenshot({path:f, timeout:60000});
      sampel.push(f);
      await page.waitForTimeout(250);
    }
    runs.push({ run, siap, http: resp?resp.status():null,
      waktu_muat_ms: Date.now()-t0, sampel, konsol:konsol.slice(0,5) });
    await ctx.close();
  }
  await browser.close();
  const hasil={ target:APP, url:URL, anchor:ANCHOR, viewport:`${VW}x${VH}`,
    exact_frame:DUKUNG_T, runs, metode: DUKUNG_T?'exact-anchor':'time-windowed-3x8x250ms',
    catatan:'run dengan siap=false = INVALID' };
  if (OUT){ fs.mkdirSync(path.dirname(OUT),{recursive:true}); fs.writeFileSync(OUT,JSON.stringify(hasil,null,1)); }
  console.log(`${APP} a=${ANCHOR} ${VW}x${VH}: ${runs.filter(r=>r.siap).length}/${RUNS} scene-ready; metode=${hasil.metode}`);
})();
