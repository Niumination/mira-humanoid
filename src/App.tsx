import { useMemo, useState } from 'react'
import { EntryScreen } from './components/EntryScreen'
import { HumanoidMode } from './components/HumanoidMode'
import { createDial } from './lib/miraDial'
import type { MiraState } from './lib/uiStyle'

/**
 * App — kerangka MIRA.
 *   entered: bundle `useState(() => !!i.get("auto") || i.has("t"))`
 *   state  : IDLE / LISTENING / TALKING (bundle Jw)
 *   dial   : 82 slider (lib/miraDial) — dibaca HumanoidMode untuk semua uniform nanti
 */
export function App() {
  // bundle: masuk otomatis bila `?auto` atau `?t=` ada. Dalam keadaan itu tombol EXIT
  // TIDAK dirender (terukur: live `?auto=1` → tanpa EXIT; masuk lewat ENTER → ada EXIT).
  const autoEntered = (() => {
    if (typeof window === 'undefined') return false
    const q = new URLSearchParams(window.location.search)
    return !!q.get('auto') || q.has('t')
  })()
  const [entered, setEntered] = useState(() => autoEntered)
  const [state, setState] = useState<MiraState>(() => {
    const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const s = (q?.get('state') || 'idle').toLowerCase()
    return (s === 'listening' || s === 'talking' ? s : 'idle') as MiraState
  })
  const dial = useMemo(() => createDial(), [])

  return entered ? (
    <HumanoidMode
      state={state}
      onState={setState}
      dial={dial}
      onExit={autoEntered ? undefined : () => setEntered(false)}
    />
  ) : (
    <EntryScreen onEnter={() => setEntered(true)} />
  )
}
