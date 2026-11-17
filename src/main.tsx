import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { pasangReducedMotion } from './lib/a11y'

// bundle: v2.createRoot(...).render(<StrictMode><SF/></StrictMode>)
// StrictMode sengaja DIPERTAHANKAN di MIRA (berbeda dari APEX) supaya sama dengan bundle;
// efek ganda hanya memengaruhi inisialisasi, bukan hasil render.
pasangReducedMotion()

// Landmark + judul tingkat-1 untuk pembaca layar. Keduanya tidak mengubah tata letak:
// #root sudah `position: fixed; inset: 0`, dan <main> memakai kotak yang sama.
createRoot(document.getElementById('root')!).render(
  <main style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }}>
    <h1 className="sr-only">MIRA Humanoid</h1>
    <App />
  </main>
)
