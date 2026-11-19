#!/usr/bin/env node
/**
 * gate-a11y.js — GERBANG AKSESIBILITAS (P14 · E3). Mengukur di aplikasi yang benar-benar berjalan:
 *
 *   A1 bahasa dokumen      : <html lang> terisi
 *   A2 judul dokumen       : document.title tidak kosong
 *   A3 nama aksesibel      : setiap <button>/<input type=range> punya nama (teks / aria-label / aria-labelledby)
 *   A4 landmark            : ada <main> atau role="main"
 *   A5 fokus terlihat      : setelah Tab, elemen aktif punya outline atau box-shadow (bukan 'none')
 *   A6 kontras judul entri : teks judul vs latar ≥ 4,5:1
 *   A7 reduced-motion      : dengan `prefers-reduced-motion: reduce`, animasi/transisi dinonaktifkan
 *                            (durasi animasi = 0 pada elemen dekoratif) DAN aplikasi menandai dirinya
 *                            (`data-reduced-motion="1"`)
 *   A8 zoom tak dikunci    : meta viewport tidak memuat `user-scalable=no` / `maximum-scale=1`
 *
 * Pakai: PW=/home/user/tools/pw-shim.js node tools/gate-a11y.js [--json keluar.json]
 */
const { chromium } = require(process.env.PW || '/home/user/tools/pw-shim.js')
const fs = require('fs')
const path = require('path')

const ARG = process.argv.slice(2)
const JSON_OUT = ARG.includes('--json') ? ARG[ARG.indexOf('--json') + 1] : null
const MIRA = process.env.MIRA || 'http://127.0.0.1:8804/'
const APEX = process.env.APEX || 'http://127.0.0.1:8805/'
const APPS = [['MIRA', MIRA], ['APEX', APEX]]

const hasil = { judul: 'Gerbang aksesibilitas (P14 · E3)', waktu: new Date().toISOString(), aplikasi: [] }

;(async () => {
  const browser = await chromium.launch()
  let lulus = 0, total = 0
  for (const [nama, base] of APPS) {
    const a = { aplikasi: nama, base, butir: [], lulus: 0, total: 0 }
    const cek = (n, ok, ket) => { total++; a.total++; if (ok) { lulus++; a.lulus++ }
      a.butir.push({ butir: n, lulus: ok, ket: String(ket) })
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${nama} ${n}  ${ket}`) }

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const p = await ctx.newPage()
    await p.goto(base + '?auto=1', { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForTimeout(1500)

    const d = await p.evaluate(() => {
      const nama = (el) => {
        const aria = el.getAttribute('aria-label')
        if (aria && aria.trim()) return aria.trim()
        const lab = el.getAttribute('aria-labelledby')
        if (lab) {
          const t = lab.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim()
          if (t) return t
        }
        const t = (el.textContent || '').trim()
        if (t) return t
        const ti = el.getAttribute('title')
        return ti && ti.trim() ? ti.trim() : ''
      }
      const kontrol = [...document.querySelectorAll('button, input[type=range], [role=button]')]
        .filter((el) => el.offsetParent !== null || el.getClientRects().length)
      const tanpaNama = kontrol.filter((el) => !nama(el))
        .map((el) => el.tagName + (el.getAttribute('data-testid') ? `[${el.getAttribute('data-testid')}]` : ''))
      const main = !!document.querySelector('main, [role=main]')
      const vp = document.querySelector('meta[name=viewport]')?.getAttribute('content') || ''
      const rm = document.documentElement.getAttribute('data-reduced-motion')
      // A6: kontras teks yang BENAR-BENAR tampil — pakai kontrol & label bertekstur teks,
      // latar efektif dicari dengan menelusuri leluhur sampai ada warna tidak transparan.
      const rgb2 = (str) => {
        const m = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/.exec(str || '')
        return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null
      }
      const latarEfektif = (el) => {
        let n = el
        while (n && n !== document.documentElement) {
          const c = rgb2(getComputedStyle(n).backgroundColor)
          if (c && c.a > 0.5) return c
          n = n.parentElement
        }
        const b = rgb2(getComputedStyle(document.body).backgroundColor)
        return b && b.a > 0.5 ? b : { r: 0, g: 0, b: 0, a: 1 }
      }
      // hanya elemen yang punya TEKS SENDIRI (bukan wadah yang mewarisi teks anak) supaya
      // kontrasnya benar-benar milik elemen itu; wadah penuh layar tidak boleh jadi sampel.
      const berteksSendiri = (el) =>
        [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent || '').trim().length > 1)
      const sampel = [...document.querySelectorAll('button, [data-testid], h1, h2, span, div, label, p')]
        .filter((el) => berteksSendiri(el) && el.getClientRects().length > 0
          && !el.classList.contains('sr-only'))
        .slice(0, 40)
        .map((el) => ({ el, teks: getComputedStyle(el), latar: latarEfektif(el) }))
        .map(({ el, teks, latar }) => ({
          label: (el.textContent || '').trim().slice(0, 18),
          warna: rgb2(teks.color), latar, ukuran: parseFloat(teks.fontSize) || 12,
        }))
        .filter((x) => x.warna && x.warna.a > 0.5 && x.label)
      return {
        lang: document.documentElement.lang || '',
        title: document.title || '',
        kontrol: kontrol.length, tanpaNama, main, vp, rm,
        sampel,
      }
    })

    const rgb = (s) => {
      const m = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/.exec(s || '')
      return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null
    }
    const lum = (c) => {
      const f = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
      return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]
    }
    const kontras = (f, b) => {
      const L1 = lum(f), L2 = lum(b)
      return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
    }
    // A6 — kontras teks: hitung tiap sampel, ambil yang TERBURUK (kontrol yang paling sulit dibaca)
    let terburuk = { rasio: 99, label: '-' }
    for (const sp of d.sampel) {
      const r = kontras([sp.warna.r, sp.warna.g, sp.warna.b], [sp.latar.r, sp.latar.g, sp.latar.b])
      if (r < terburuk.rasio) terburuk = { rasio: r, label: sp.label, ukuran: sp.ukuran }
    }
    const nilaiKontras = d.sampel.length ? terburuk.rasio : 0

    cek('A1 bahasa dokumen', !!d.lang, `lang="${d.lang}"`)
    cek('A2 judul dokumen', !!d.title, `"${d.title}"`)
    cek('A3 nama aksesibel semua kontrol', d.tanpaNama.length === 0,
      `${d.kontrol} kontrol · tanpa nama ${d.tanpaNama.length}${d.tanpaNama.length ? ' → ' + d.tanpaNama.slice(0, 6).join(', ') : ''}`)
    cek('A4 landmark main', d.main, d.main ? 'ada' : 'tidak ada <main>/role=main')
    cek('A6 kontras teks ≥ 4,5:1', nilaiKontras >= 4.5,
      `${d.sampel.length} sampel · terburuk ${nilaiKontras.toFixed(2)}:1 "${terburuk.label}" (${terburuk.ukuran || '?'} px)`)
    cek('A8 zoom tidak dikunci', !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(d.vp), `viewport="${d.vp}"`)

    // A5 fokus terlihat
    await p.keyboard.press('Tab')
    await p.waitForTimeout(200)
    const fokus = await p.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return { ada: false }
      const cs = getComputedStyle(el)
      return { ada: true, tag: el.tagName, outline: cs.outlineStyle + ' ' + cs.outlineWidth,
        shadow: cs.boxShadow, label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24) }
    })
    const terlihat = fokus.ada && ((fokus.outline && !/^none/.test(fokus.outline)) || (fokus.shadow && fokus.shadow !== 'none'))
    cek('A5 fokus terlihat saat Tab', terlihat, fokus.ada ? `${fokus.tag} "${fokus.label}" · outline ${fokus.outline}` : 'tidak ada elemen fokus')

    // A7 reduced-motion
    const c3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const q = await c3.newPage()
    await q.goto(base + '?auto=1', { waitUntil: 'networkidle', timeout: 120000 })
    await q.waitForTimeout(1500)
    const rm = await q.evaluate(() => {
      const el = document.querySelector('[data-testid]') || document.body
      const cs = getComputedStyle(el)
      const semua = [...document.querySelectorAll('*')].slice(0, 400)
      const beranimasi = semua.filter((e) => {
        const s = getComputedStyle(e)
        const dur = parseFloat(s.animationDuration) || 0
        const tr = parseFloat(s.transitionDuration) || 0
        return dur > 0.01 || tr > 0.01
      }).length
      return { tanda: document.documentElement.getAttribute('data-reduced-motion'),
        durasi: cs.animationDuration, beranimasi }
    })
    cek('A7 reduced-motion dihormati', rm.tanda === '1' && rm.beranimasi === 0,
      `data-reduced-motion=${rm.tanda} · elemen beranimasi/transisi ${rm.beranimasi}`)
    await q.close(); await c3.close()

    await p.close(); await ctx.close()
    hasil.aplikasi.push(a)
  }
  await browser.close()
  hasil.ringkas = { lulus, total }
  if (JSON_OUT) { fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true }); fs.writeFileSync(JSON_OUT, JSON.stringify(hasil, null, 1)) }
  console.log(`\nGERBANG A11Y: ${lulus}/${total}` + (JSON_OUT ? ` → ${JSON_OUT}` : ''))
  process.exit(lulus === total ? 0 : 1)
})()
