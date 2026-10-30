/**
 * lib/miraDial — penyimpan nilai 82 slider + panel.
 *
 * Tiga sumber nilai, urutan prioritas (spec §11 + keputusan interview):
 *   1. `?dial.<key>=<angka>`  — override per-URL (mis. `?dial.lines.count=14`)
 *   2. `localStorage["mira.dial"]` — nilai yang diklik user, bertahan antar reload
 *   3. default dari lib/params
 *
 * Alias: 7 param `humanoid` punya `stands` ke param `scene`. Menggerakkan slider
 * humanoid WAJIB ikut mengubah pasangan scene-nya (dan sebaliknya tidak, karena
 * scene punya default sendiri — lihat SPEC-MIRA §11 "Jangan disamakan").
 */
import { useSyncExternalStore } from 'react'
import { ALIASES, PARAMS, type Param } from './params'

const STORAGE_KEY = 'mira.dial'
const PARAM_BY_KEY: Record<string, Param> = Object.fromEntries(PARAMS.map((p) => [p.key, p]))
const REVERSE_ALIAS: Record<string, string> = Object.fromEntries(
  Object.entries(ALIASES).map(([h, s]) => [s, h])
)

/** clamp + snap ke step, dibulatkan 6 desimal supaya tidak ada 0.30000000000000004 */
export function snap(p: Param, v: number): number {
  const c = Math.min(p.max, Math.max(p.min, Number(v)))
  const n = p.min + Math.round((c - p.min) / p.step) * p.step
  return Math.round(n * 1e6) / 1e6
}

export function defaults(): Record<string, number> {
  return Object.fromEntries(PARAMS.map((p) => [p.key, p.default]))
}

function readUrl(): Record<string, number> {
  const out: Record<string, number> = {}
  if (typeof window === 'undefined') return out
  const q = new URLSearchParams(window.location.search)
  for (const [k, raw] of q.entries()) {
    if (!k.startsWith('dial.')) continue
    const key = k.slice(5)
    const p = PARAM_BY_KEY[key]
    if (!p || raw === '') continue
    const v = Number(raw)
    if (Number.isFinite(v)) out[key] = snap(p, v)
  }
  return out
}

function readStorage(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(obj)) {
      const p = PARAM_BY_KEY[k]
      if (p && Number.isFinite(Number(v))) out[k] = snap(p, Number(v))
    }
    return out
  } catch {
    return {}
  }
}

export interface Dial {
  values: Record<string, number>
  /** nomor versi — untuk `useDialVersion()` (useSyncExternalStore) */
  getVersion(): number
  /** sumber nilai per key, untuk debug/panel (`default` | `storage` | `url`) */
  sources: Record<string, string>
  get(key: string): number
  set(key: string, value: number, persist?: boolean): void
  reset(keys?: string[]): void
  subscribe(fn: () => void): () => void
}

export function createDial(): Dial {
  const url = readUrl()
  const store = readStorage()
  const values = defaults()
  const sources: Record<string, string> = Object.fromEntries(PARAMS.map((p) => [p.key, 'default']))
  for (const [k, v] of Object.entries(store)) {
    values[k] = v
    sources[k] = 'storage'
  }
  for (const [k, v] of Object.entries(url)) {
    values[k] = v
    sources[k] = 'url'
  }
  const subs = new Set<() => void>()
  let version = 0
  const emit = () => {
    version += 1
    subs.forEach((f) => f())
  }

  const persist = () => {
    if (typeof window === 'undefined') return
    try {
      const onlyChanged = Object.fromEntries(
        Object.entries(values).filter(([k, v]) => v !== PARAM_BY_KEY[k].default)
      )
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(onlyChanged))
    } catch {
      /* localStorage penuh/diblokir — bundle juga mengabaikan */
    }
  }

  const set = (key: string, value: number, shouldPersist = true) => {
    const p = PARAM_BY_KEY[key]
    if (!p) return
    const v = snap(p, value)
    if (values[key] === v && sources[key] !== 'url') return
    values[key] = v
    sources[key] = 'ui'
    // alias dua arah: humanoid → scene selalu; scene → humanoid hanya bila humanoid
    // belum pernah disentuh user (sumbernya masih default).
    const partnerKey = ALIASES[key] ?? REVERSE_ALIAS[key]
    if (partnerKey) {
      const partner = PARAM_BY_KEY[partnerKey]
      const isScene = p.scope === 'scene'
      if (!isScene || sources[partnerKey] === 'default') {
        values[partnerKey] = snap(partner, v)
        sources[partnerKey] = 'alias'
      }
    }
    if (shouldPersist) persist()
    emit()
  }

  const reset = (keys?: string[]) => {
    const list = keys ?? PARAMS.map((p) => p.key)
    for (const k of list) {
      values[k] = PARAM_BY_KEY[k].default
      sources[k] = 'default'
    }
    persist()
    emit()
  }

  return {
    values,
    sources,
    getVersion: () => version,
    get: (k) => values[k],
    set,
    reset,
    subscribe: (fn) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  }
}

/** `?dial.<key>=` juga harus tercermin di URL setelah user menggeser (biar bisa dibagikan). */
export function dialQuery(values: Record<string, number>): string {
  const q = new URLSearchParams()
  for (const p of PARAMS) {
    if (values[p.key] !== p.default) q.set(`dial.${p.key}`, String(values[p.key]))
  }
  return q.toString()
}

/**
 * Re-render komponen saat nilai dial berubah. Panel memakai ini supaya pasangan alias
 * ikut bergerak di layar (loop render 3D tidak perlu — ia membaca `dial.values` langsung).
 */
export function useDialVersion(dial: Dial): number {
  return useSyncExternalStore(dial.subscribe, dial.getVersion, dial.getVersion)
}
