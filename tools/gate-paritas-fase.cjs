#!/usr/bin/env node
/**
 * gate-paritas-fase.js — paritas di BANYAK titik waktu, bukan satu bingkai.
 *
 * Kenapa perlu: `gate-paritas.js` memaku satu detik (`?t=9` APEX / `?t=11.5` MIRA) lalu membandingkan dua
 * tangkapan. Itu membuktikan *reproduktibilitas* di titik itu, tetapi tidak membuktikan bahwa **animasi**
 * (kelahiran → idle → transisi state) berjalan sama di sepanjang waktu. Bug yang hanya muncul di detik 3
 * tidak akan tertangkap.
 *
 * Yang diukur, untuk setiap titik waktu:
 *   1. repro   — dua tangkapan berurutan pada waktu yang sama: MAE diri + selisih cakupan
 *   2. stabil  — cakupan siluet (piksel L>20) harus di rentang wajar 0,05–0,70
 *   3. progres  — cakupan tidak boleh "mati" (Δ antar titik = 0 selama seluruh rentang) kecuali memang selesai
 *
 * Keluaran JSON memuat seluruh kurva, supaya perbandingan antar sesi bisa dilakukan tanpa menangkap ulang.
 *
 * 2026-11-20 (koreksi): F1 semula memakai SATU pasangan tangkapan per titik. Diukur ulang di sini,
 * pasangan pertama sering MAE 8,7 sementara pasangan berikutnya 1,0–2,8 pada halaman & waktu yang SAMA
 * (derau jaringan/kompositing perangkat lunak saat muat pertama). Satu pasangan = derau dijadikan putusan.
 * Karena itu tiap titik kini diukur ULANG (bawaan 3 pasangan) dan F1 memakai MEDIAN, dengan derau
 * maksimum dilaporkan terpisah sebagai catatan, bukan kegagalan.
 * Catatan lingkungan: bagian atas berkas ini melaporkan "sekitar 3" padahal median terukur 1,2–3,2;
 * selisih itu bisa berasal dari beban sandbox saat itu — angka di catatan ini BUKAN ambang.
 *
 * Pakai:
 *   node tools/gate-paritas-fase.js --app apex --url http://127.0.0.1:8807/ --titik 1,3,5,7,9
 *   node tools/gate-paritas-fase.js --app mira --url http://127.0.0.1:8804/ --titik 2,4,6,8,11.5
 */
const { chromium } = require(process.env.PW || '/home/user/tools/pw-shim.js');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const arg = (n, d = null) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const APP = (arg('--app') || 'apex').toLowerCase();
const URL_DASAR = arg('--url') || (APP === 'apex' ? 'http://127.0.0.1:8807/' : 'http://127.0.0.1:8804/');
const TITIK = (arg('--titik') || (APP === 'apex' ? '1,3,5,7,9' : '2,4,6,8,11.5')).split(',').map(Number);
const VIEWPORT = (arg('--viewport') || '1440x900').split('x').map(Number);
const JSON_OUT = arg('--json');
const TUNGGU = Number(process.env.TUNGGU_MS || 2500);
// TOTAL = akhir timeline kelahiran. Titik < TOTAL adalah fase kelahiran (siluet besar + cahaya belakang,
// cakupan wajar sampai ~0,95); titik >= TOTAL adalah keadaan mantap. Ambang cakupan 0,05–0,70 HANYA berlaku
// untuk keadaan mantap — pada 2026-11-19 ambang itu diterapkan ke fase kelahiran MIRA (t=8 → 0,90) dan
// menghasilkan "gagal" yang salah; bingkainya diperiksa manual dan memang sah.
const TOTAL = Number(arg('--total') || (APP === 'apex' ? 7.4 : 11.5));
const SHOTS = process.env.SHOTS_DIR || `/tmp/fase-${APP}`;
// ULANG = jumlah pasangan tangkapan per titik. F1 memakai median; satu pasangan saja = derau jadi putusan.
const ULANG = Math.max(1, Number(process.env.ULANG || arg('--ulang') || 3));

const PY = `
import sys, json
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
b = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
m = a.mean(2) > 20
print(json.dumps({'cakupan': float(m.mean()), 'mae': float(np.abs(a - b).mean())}))
`;

function ukur(f1, f2) {
  return JSON.parse(execFileSync(process.env.PY || 'python3', ['-c', PY, f1, f2]).toString());
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const kurva = [];
  for (const t of TITIK) {
    const ctx = await browser.newContext({ viewport: { width: VIEWPORT[0], height: VIEWPORT[1] } });
    const page = await ctx.newPage();
    const url = `${URL_DASAR}?t=${t}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 300000 });
    await page.waitForTimeout(TUNGGU);
    const f1 = path.join(SHOTS, `${APP}-t${t}-a.png`);
    const f2 = path.join(SHOTS, `${APP}-t${t}-b.png`);
    const pasangan = [];
    for (let u = 0; u < ULANG; u++) {
      if (u === 0) {
        // pasangan pertama: ambil kedua bingkai (jeda kecil supaya animasi bergerak antar bingkai)
        await page.screenshot({ path: f1, timeout: 300000 });
        await page.waitForTimeout(700);
        await page.screenshot({ path: f2, timeout: 300000 });
      }
      const r = ukur(f1, f2);
      pasangan.push({ cakupan: +r.cakupan.toFixed(4), mae: +r.mae.toFixed(2) });
      if (u + 1 < ULANG) {
        // pasangan berikutnya: geser f2 → f1 supaya tak menangkap ulang bingkai yang sama
        fs.copyFileSync(f2, f1);
        await page.waitForTimeout(700);
        await page.screenshot({ path: f2, timeout: 300000 });
      }
    }
    const med = (xs) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
    const maeMed = med(pasangan.map((p) => p.mae));
    const cakMed = med(pasangan.map((p) => p.cakupan));
    kurva.push({ t, cakupan: cakMed, mae_diri: maeMed,
                 ulang: pasangan.length,
                 mae_semua: pasangan.map((p) => p.mae),
                 cakupan_semua: pasangan.map((p) => p.cakupan),
                 derau_maks: Math.max(...pasangan.map((p) => p.mae)) });
    console.log(`${APP} ?t=${t} → cakupan ${cakMed.toFixed(4)} · MAE diri median ${maeMed.toFixed(2)}` +
                ` (semua ${pasangan.map((p) => p.mae).join('/')})`);
    await page.close();
    await ctx.close();
  }
  await browser.close();

  // --- penilaian -------------------------------------------------------------------------------
  const butir = [];
  const cek = (id, ok, ket) => { butir.push({ id, lulus: ok, keterangan: ket }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${ket}`); };
  const mae = kurva.map((k) => k.mae_diri);
  const cak = kurva.map((k) => k.cakupan);
  const mantap = kurva.filter((k) => k.t >= TOTAL);
  const cekMantap = mantap.map((k) => k.cakupan);
  const BATAS_MAE = Number(process.env.MAE_F1 || 8);
  const buruk = kurva.reduce((a, b) => (b.mae_diri > a.mae_diri ? b : a));
  cek(`F1 repro tiap titik (MAE diri median ≤ ${BATAS_MAE}, ${ULANG} pasangan/titik)`,
    mae.every((m) => m <= BATAS_MAE), `terburuk ${buruk.mae_diri} pada t=${buruk.t}`);
  // Derau di dalam satu titik (pasangan pertama vs berikutnya) TIDAK dipakai sebagai ambang, tetapi wajib
  // terlihat: kalau derau > ambang sementara median lolos, itu gejala lingkungan, bukan aplikasi.
  const derauMaks = Math.max(...kurva.map((k) => k.derau_maks));
  const titikDerau = kurva.filter((k) => k.derau_maks > BATAS_MAE).map((k) => `t=${k.t}:${k.derau_maks}`);
  cek('F5 derau dalam titik dilaporkan (catatan, bukan ambang)',
    true, `derau maks ${derauMaks}` + (titikDerau.length ? ` · pasangan di atas ambang: ${titikDerau.join(' ')}` : ''));
  cek('F2 cakupan mantap 0,05–0,70',
    cekMantap.length > 0 && cekMantap.every((c) => c >= 0.05 && c <= 0.70),
    cekMantap.length ? `titik mantap ${mantap.map((k) => `t=${k.t}:${k.cakupan}`).join(' · ')}` : 'tidak ada titik mantap');
  const rentang = Math.max(...cak) - Math.min(...cak);
  cek('F3 animasi bergerak (rentang cakupan ≥ 0,01)', rentang >= 0.01, `rentang ${rentang.toFixed(4)} (semua titik)`);
  const lompat = mantap.slice(1).map((k, i) => Math.abs(k.cakupan - mantap[i].cakupan));
  // F4 hanya berlaku bila ada >= 2 titik mantap; dengan 1 titik, 0 pasangan bukan bukti apa pun.
  cek('F4 tanpa lompatan antar titik mantap (>0,25)',
    mantap.length >= 2 ? lompat.every((d) => d <= 0.25) : null,
    mantap.length >= 2 ? `terbesar ${Math.max(...lompat).toFixed(4)} · ${lompat.length} pasangan`
                       : `tidak berlaku: hanya ${mantap.length} titik mantap (dicatat, bukan lulus)`);

  const hasil = {
    judul: 'paritas fase — banyak titik waktu', aplikasi: APP, url: URL_DASAR,
    viewport: VIEWPORT.join('x'), titik: TITIK, tunggu_ms: TUNGGU, total_timeline: TOTAL, ulang_per_titik: ULANG,
    kelas_titik: TITIK.map((t) => ({ t, kelas: t < TOTAL ? 'kelahiran' : 'mantap' })),
    kurva, butir, ringkas: { lulus: butir.filter((b) => b.lulus).length, total: butir.length },
  };
  if (JSON_OUT) {
    fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
    fs.writeFileSync(JSON_OUT, JSON.stringify(hasil, null, 1));
  }
  const lulus = hasil.ringkas.lulus;
  console.log(`\nGERBANG PARITAS FASE (${APP}): ${lulus}/${butir.length}` + (JSON_OUT ? ` → ${JSON_OUT}` : ''));
  process.exit(lulus === butir.length ? 0 : 1);
})();
