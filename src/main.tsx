import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

// bundle: v2.createRoot(...).render(<StrictMode><SF/></StrictMode>)
// StrictMode sengaja DIPERTAHANKAN di MIRA (berbeda dari APEX) supaya sama dengan bundle;
// efek ganda hanya memengaruhi inisialisasi, bukan hasil render.
createRoot(document.getElementById('root')!).render(<App />)
