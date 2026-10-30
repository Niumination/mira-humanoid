/**
 * EntryScreen — port VERBATIM blok entry MIRA (bundle, akhir berkas):
 *
 *   <div fixed inset0 bg #000 grid placeItems center>
 *     <div textAlign center fontFamily var(--font-ui)>
 *       <div color #c4a8ff fontSize 22 letterSpacing .3em marginBottom 8>MIRA HUMANOID</div>
 *       <div color #a99bc8 fontSize 12 letterSpacing .12em marginBottom 28>a figure of light …</div>
 *       <button style ix(false)+{padding:"12px 34px",fontSize:14,letterSpacing:".25em",boxShadow:0 0 24px #c4a8ff22}>ENTER</button>
 *       <div color #5d5175 fontSize 10 letterSpacing .1em marginTop 18>the click opens the audio - her build has a sound</div>
 *     </div>
 *   </div>
 */
import { ACCENT, btnStyle } from '../lib/uiStyle'

export function EntryScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-ui)' }}>
        <div style={{ color: ACCENT, fontSize: 22, letterSpacing: '0.3em', marginBottom: 8 }}>
          MIRA HUMANOID
        </div>
        <div style={{ color: '#a99bc8', fontSize: 12, letterSpacing: '0.12em', marginBottom: 28 }}>
          a figure of light that weaves herself out of her own heart
        </div>
        <button
          onClick={onEnter}
          data-testid="mira-enter"
          style={{
            ...btnStyle(false),
            padding: '12px 34px',
            fontSize: 14,
            letterSpacing: '0.25em',
            boxShadow: `0 0 24px ${ACCENT}22`,
          }}
        >
          ENTER
        </button>
        <div style={{ color: '#5d5175', fontSize: 10, letterSpacing: '0.1em', marginTop: 18 }}>
          the click opens the audio - her build has a sound
        </div>
      </div>
    </div>
  )
}
