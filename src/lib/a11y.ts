/**
 * a11y — kepatuhan gerbang aksesibilitas (P14 · E3), dipasang sekali di App.
 *
 * `prefers-reduced-motion: reduce` ditandai di <html data-reduced-motion="1"> supaya
 * (a) gerbang bisa memverifikasinya tanpa menebak, dan (b) modul render bisa membacanya lewat
 * `gerakDikurangi()`. Animasi/transisi CSS sendiri dimatikan oleh blok @media di index.css.
 */
const MQ = '(prefers-reduced-motion: reduce)'

export function gerakDikurangi(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(MQ).matches
}

/** Pasang penanda + pendengar perubahan. Aman dipanggil berulang (idempoten). */
export function pasangReducedMotion(): void {
  if (typeof window === 'undefined' || !window.matchMedia) return
  const mq = window.matchMedia(MQ)
  const tulis = () => {
    if (mq.matches) document.documentElement.setAttribute('data-reduced-motion', '1')
    else document.documentElement.removeAttribute('data-reduced-motion')
  }
  tulis()
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', tulis)
  else if (typeof mq.addListener === 'function') mq.addListener(tulis)
}
