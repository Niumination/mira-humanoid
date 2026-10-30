/**
 * Gaya tombol MIRA — verbatim dari bundle:
 *   const Xu="#c4a8ff",
 *   ix = i => ({padding:"8px 13px", background: i ? `${Xu}33` : "rgba(16, 6, 30, 0.72)",
 *               color: Xu, border:`1px solid ${Xu}${i?"aa":"55"}`, borderRadius:9,
 *               font:"12px 'Share Tech Mono', monospace", letterSpacing:"0.14em",
 *               cursor:"pointer", boxShadow: i?`0 0 18px ${Xu}33`:`0 0 18px ${Xu}14`})
 */
import type { CSSProperties } from 'react'

export const ACCENT = '#c4a8ff'

export const btnStyle = (on: boolean): CSSProperties => ({
  padding: '8px 13px',
  background: on ? `${ACCENT}33` : 'rgba(16, 6, 30, 0.72)',
  color: ACCENT,
  border: `1px solid ${ACCENT}${on ? 'aa' : '55'}`,
  borderRadius: 9,
  font: "12px 'Share Tech Mono', monospace",
  letterSpacing: '0.14em',
  cursor: 'pointer',
  boxShadow: on ? `0 0 18px ${ACCENT}33` : `0 0 18px ${ACCENT}14`,
})

/** nama state + label tombol (bundle: Jw = [["idle","IDLE"],["listening","LISTENING"],["talking","TALKING"]]) */
export const STATE_BUTTONS = [
  ['idle', 'IDLE'],
  ['listening', 'LISTENING'],
  ['talking', 'TALKING'],
] as const

export type MiraState = (typeof STATE_BUTTONS)[number][0]
