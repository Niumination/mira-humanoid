/**
 * Panel — 82 slider dalam 20 seksi, urutan & label persis SPEC-MIRA §tabel.
 *
 * ⚠ DEVIASI YANG DISENGAJA (keputusan interview, U-10): situs live TIDAK merender panel
 * ini (terukur: `panel-mira.json` → count 0). Panel dibangun penuh karena SPEC + daftar
 * 82 parameter memang mendokumentasikannya sebagai permukaan kendali aslinya.
 * Panel default TERTUTUP dan tidak menyentuh DOM saat tertutup, sehingga Gerbang C
 * (piksel) dan Gerbang A (copy) tetap bisa dibandingkan dengan live.
 */
import { SECTIONS } from '../lib/params'
import { useDialVersion, type Dial } from '../lib/miraDial'
import { ACCENT, btnStyle } from '../lib/uiStyle'

export function Panel({
  dial,
  open,
  onToggle,
  onClose,
}: {
  dial: Dial
  open: boolean
  onToggle: () => void
  onClose: () => void
}) {
  useDialVersion(dial)
  return (
    <>
      <button
        className="mira-btn"
        style={{ ...btnStyle(open), padding: '8px 13px' }}
        onClick={onToggle}
        aria-pressed={open}
        aria-label="Show the parameter panel"
        data-testid="mira-panel-toggle"
      >
        DIAL
      </button>
      {open && (
        <div
          data-testid="mira-panel"
          style={{
            position: 'fixed',
            right: 18,
            top: 18,
            bottom: 74,
            width: 322,
            zIndex: 300,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: '12px 14px 18px',
            background: 'rgba(16, 6, 30, 0.72)',
            border: `1px solid ${ACCENT}55`,
            borderRadius: 12,
            boxShadow: `0 0 24px ${ACCENT}22`,
            color: ACCENT,
            font: "11px 'Share Tech Mono', monospace",
            letterSpacing: '0.08em',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, letterSpacing: '0.18em' }}>MIRA DIAL · 82</span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button
                className="mira-btn"
                style={{ ...btnStyle(false), padding: '4px 8px', fontSize: 10 }}
                onClick={() => dial.reset()}
                data-testid="mira-panel-reset"
              >
                RESET
              </button>
              <button
                className="mira-btn"
                style={{ ...btnStyle(false), padding: '4px 8px', fontSize: 10 }}
                onClick={onClose}
                aria-label="Hide the parameter panel"
                data-testid="mira-panel-close"
              >
                ✕
              </button>
            </span>
          </div>

          {SECTIONS.map((sec, si) => (
            <section key={`${sec.group}-${si}`} data-section={si + 1} data-group={sec.group} style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.16em',
                  color: '#e6cdff',
                  borderBottom: `1px solid ${ACCENT}33`,
                  paddingBottom: 4,
                  marginBottom: 6,
                }}
              >
                {si + 1}. {sec.group}
              </div>
              {sec.params.map((p) => (
                <label
                  key={p.key}
                  data-dial-row={p.key}
                  data-stands={p.stands ?? ''}
                  title={p.key}
                  style={{ display: 'block', marginBottom: 7, opacity: 0.95 }}
                >
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: '#cbb8ea', lineHeight: 1.3 }}>{p.label}</span>
                    <span data-dial-value style={{ color: ACCENT, whiteSpace: 'nowrap' }}>
                      {dial.get(p.key)}
                    </span>
                  </span>
                  <input
                    className="mira-dial"
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={dial.get(p.key)}
                    data-key={p.key}
                    data-min={p.min}
                    data-max={p.max}
                    data-step={p.step}
                    data-default={p.default}
                    onChange={(e) => dial.set(p.key, Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: ACCENT,
                      height: 14,
                      margin: '2px 0 0',
                      cursor: 'pointer',
                    }}
                  />
                </label>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  )
}
