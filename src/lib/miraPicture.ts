/**
 * lib/miraPicture — awan titik gambar (port VERBATIM dari `ie` di bundle, ≈1157306).
 *
 * Gambar MIRA bukan satu kuad bertekstur di akhir: ia menjadi **awan titik** yang tumbuh
 * dari kepala. Geometri (diverifikasi byte-identik dengan buffer live):
 *   1) grid gambar; langkah `tx = 1,5` px, ambil piksel dengan alpha > 32
 *   2) `aKind = 1` — sebagian titik di bawah dagu (rnd < 0,16) → materi belakang
 *   3) `aKind = 5` — 6000 titik acak di baris kepala (`hw ≥ 6`), `aZ` = ±0,9
 *   4) sisanya `aKind = 0` — permukaan
 * Urutan array: [langka (1)…, kepala acak (5)…, grid (0)…] — bukan urutan grid.
 *
 * PRNG: `Ud(29)` (mulberry32) — urutan pemanggilan harus sama persis.
 */
import type { HeadModel } from './miraHead'
import { mulberry32 } from './miraTimeline'

export const PICTURE_STEP = 1.5

export interface PicturePoints {
  aRest: Float32Array
  aKind: Float32Array
  aZ: Float32Array
  count: number
}

export function buildPicturePoints(
  rgba: Uint8Array | Uint8ClampedArray,
  model: HeadModel,
  W: number,
  H: number,
  tx = PICTURE_STEP
): PicturePoints {
  const Y: number[] = []
  for (let y = 0; y < model.base; y += tx) {
    for (let x = 0; x < W; x += tx) {
      const xi = Math.min(W - 1, Math.round(x))
      const yi = Math.min(H - 1, Math.round(y))
      if (rgba[(yi * W + xi) * 4 + 3] > 32) Y.push(x, y)
    }
  }
  const rnd = mulberry32(29)
  const n = Y.length / 2
  const back: number[] = []
  const head: number[] = []
  const headZ: number[] = []
  for (let i = 0; i < n; i++) if (Y[i * 2 + 1] < model.chin && rnd() < 0.16) back.push(Y[i * 2], Y[i * 2 + 1])
  for (let i = 0, k = 0; i < 6000 && k < 60000; k++) {
    const y = rnd() * model.chin
    const row = model.row(y)
    if (!row || row.hw < 6) continue
    head.push(row.cx + (rnd() * 2 - 1) * row.hw * 0.9, y)
    headZ.push((rnd() * 2 - 1) * 0.9)
    i++
  }
  const rest = new Float32Array([...back, ...head, ...Y])
  const count = rest.length / 2
  const kind = new Float32Array(count)
  const z = new Float32Array(count)
  for (let i = 0; i < count; i++) kind[i] = i < back.length / 2 ? 1 : i < (back.length + head.length) / 2 ? 5 : 0
  headZ.forEach((v, i) => { z[back.length / 2 + i] = v })
  return { aRest: rest, aKind: kind, aZ: z, count }
}

/** kuad gambar (dua segitiga) dengan UV standar — posisi ±w/2, ±h/2 */
export function quadGeometry(w: number, h: number) {
  return {
    position: new Float32Array([-w / 2, h / 2, 0, w / 2, h / 2, 0, -w / 2, -h / 2, 0, w / 2, -h / 2, 0]),
    uv: new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
    index: new Uint16Array([0, 2, 1, 2, 3, 1]),
  }
}

/** kuad sprite: 4 verteks interleaved (position 3 + uv 2, stride 20) + 6 indeks */
export function spriteGeometry() {
  return {
    interleaved: new Float32Array([-0.5, -0.5, 0, 0, 0, 0.5, -0.5, 0, 1, 0, 0.5, 0.5, 0, 1, 1, -0.5, 0.5, 0, 0, 1]),
    index: new Uint16Array([0, 1, 2, 0, 2, 3]),
  }
}
