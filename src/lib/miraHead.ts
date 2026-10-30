/**
 * lib/miraHead — model kepala bulat + rowTexture (port VERBATIM dari bundle).
 *
 * Sumber bundle: YN() (batas kiri/kanan siluet per baris), ZN() (pusat & setengah lebar
 * tiap baris + bobot putar), QN() (isi tekstur 1×H RGBA32F).
 *
 * Tekstur dibaca shader sebagai satu texel per baris gambar:
 *   r = centre x · g = half width (px) · b = turn weight (0..1) · a = depth share (0..1)
 * Dipakai `headInfo`/`headSoftZ`/`headWeight` di semua shader kepala (garis, rambut, gambar).
 *
 * Nilai konfigurasi dari bundle `es`: head.chin = 0,43 · headBase = 0,52 · neckBand = [0,34H, 0,48H]
 * (dikalikan tinggi gambar penuh, mis. 1374 → chin 590,82 · base 714,48 · band [467,16, 659,52]).
 * Terverifikasi identik dengan tekstur live (recon/verify-mira-head.mjs).
 */

export const HEAD_CFG = { chin: 0.43, base: 0.52, neckBand: [0.34, 0.48] as const, depthK: 0.85, smooth: 24 }

export interface HeadEdges {
  L: Int16Array
  R: Int16Array
}

/** YN — tepi kiri & kanan siluet per baris (3 piksel pertama berturut-turut dianggap isi) */
export function headEdges(test: (x: number, y: number) => boolean, w: number, h: number): HeadEdges {
  const L = new Int16Array(h).fill(-1)
  const R = new Int16Array(h).fill(-1)
  const ok = (x: number, y: number) => test(x, y) && test(x + 1, y) && test(x + 2, y)
  for (let y = 0; y < h - 2; y++) {
    for (let x = 2; x < w - 4; x++) if (ok(x, y)) { L[y] = x; break }
    for (let x = w - 5; x >= 2; x--) if (ok(x, y)) { R[y] = x; break }
  }
  return { L, R }
}

/** `kw` — smoothstep */
export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export interface HeadModel {
  W: number
  H: number
  L: Int16Array
  R: Int16Array
  chin: number
  base: number
  neckY: number
  neckX: number
  neckW: number
  pivot: [number, number, number]
  weight: (y: number) => number
  rowK: (y: number) => number
  row: (y: number) => { cx: number; hw: number; k: number } | null
  z: (x: number, y: number) => number
  zSoft: (x: number, y: number) => number
}

/** softShell dari shader, versi JS (dipakai zSoft) */
const softShellJS = (a: number) => (a <= 0.8 ? Math.sqrt(1 - a * a) : Math.max(0, Math.sqrt(1 - 0.64) - (0.8 / Math.sqrt(1 - 0.64)) * (a - 0.8)))

/** ZN — model per baris: pusat, setengah lebar, bobot putar, pivot */
export function headModel(
  e: HeadEdges,
  W: number,
  H: number,
  { chin, neckBand, base, depthK = 0.85, smooth: c = 24 }: { chin: number; neckBand: readonly [number, number]; base: number; depthK?: number; smooth?: number }
): HeadModel {
  const { L, R } = e
  const cx = new Float32Array(H)
  const hw = new Float32Array(H)
  const has = new Uint8Array(H)
  {
    const k = Math.ceil(c * 2.5)
    const kern = Array.from({ length: 2 * k + 1 }, (_, i) => Math.exp(-0.5 * ((i - k) / Math.max(1, c)) ** 2))
    for (let y = 0; y < H; y++) {
      if (L[y] < 0 || R[y] <= L[y]) continue
      let sum = 0, wid = 0, nrm = 0
      for (let d = -k; d <= k; d++) {
        const j = y + d
        if (j < 0 || j >= H || L[j] < 0 || R[j] <= L[j] || (y < base) !== (j < base)) continue
        const g = kern[d + k]
        sum += g * (L[j] + R[j]) / 2
        wid += g * (R[j] - L[j]) / 2
        nrm += g
      }
      cx[y] = sum / nrm
      hw[y] = wid / nrm
      has[y] = 1
    }
  }
  // leher: baris tersempit di pita leher
  let neckY = Math.round((neckBand[0] + neckBand[1]) / 2)
  let neckW = 1e9
  for (let y = Math.round(neckBand[0]); y < Math.round(neckBand[1]) + 1; y++) {
    if (L[y] >= 0 && R[y] > L[y] && R[y] - L[y] < neckW) { neckW = R[y] - L[y]; neckY = y }
  }
  const neckX = L[neckY] >= 0 ? (L[neckY] + R[neckY]) / 2 : W / 2
  const weight = (y: number) => 1 - smoothstep(chin, base, y)
  const rowK = (y: number) => depthK * (1 - smoothstep(base - (base - chin) * 0.3, base, y))
  const row = (y: number) => {
    const n = Math.max(0, Math.min(H - 1, Math.round(y)))
    return has[n] ? { cx: cx[n], hw: hw[n], k: rowK(n) } : null
  }
  return {
    W, H, L, R, chin, base, neckY, neckX, neckW, pivot: [neckX, neckY, neckW * 0.12],
    weight, rowK, row,
    z: (x: number, y: number) => {
      const r = row(y)
      if (!r) return 0
      const u = (x - r.cx) / Math.max(r.hw, 1)
      return Math.abs(u) <= 1 ? r.k * r.hw * Math.sqrt(1 - u * u) : 0
    },
    zSoft: (x: number, y: number) => {
      const r = row(y)
      return r ? r.k * r.hw * softShellJS(Math.abs((x - r.cx) / Math.max(r.hw, 1))) : 0
    },
  }
}

/** QN — isi rowTexture (RGBA32F, 1 × H): cx, hw, weight, k */
export function rowTexture(m: HeadModel): Float32Array {
  const out = new Float32Array(m.H * 4)
  let last: { cx: number; hw: number; k: number } | null = null
  const put = (y: number, r: { cx: number; hw: number; k: number }) => {
    out[y * 4] = r.cx
    out[y * 4 + 1] = r.hw
    out[y * 4 + 2] = m.weight(y)
    out[y * 4 + 3] = r.k
  }
  let first = -1
  for (let y = 0; y < m.H; y++) {
    const r = m.row(y)
    if (r) {
      if (first < 0) first = y
      put(y, r)
      last = r
    } else if (last) put(y, last)
  }
  if (first > 0) {
    const r = m.row(first)!
    for (let y = 0; y < first; y++) put(y, r)
  }
  return out
}

/** dari RGBA gambar penuh → model + tekstur */
export function buildHead(rgba: Uint8Array | Uint8ClampedArray, w: number, h: number, cfg = HEAD_CFG) {
  const edges = headEdges((x, y) => rgba[(y * w + x) * 4 + 3] > 128, w, h)
  const model = headModel(edges, w, h, {
    chin: cfg.chin * h,
    neckBand: [cfg.neckBand[0] * h, cfg.neckBand[1] * h],
    base: cfg.base * h,
    depthK: cfg.depthK,
    smooth: cfg.smooth,
  })
  return { model, rows: rowTexture(model) }
}
