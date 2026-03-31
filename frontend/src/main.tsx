import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthGate } from './components/AuthGate'
import { HomePage } from './pages/HomePage'
import { ConciliacaoPage } from './pages/ConciliacaoPage'
import { RegrasPage } from './pages/RegrasPage'

/**
 * Roteador SPA baseado em React Router.
 * Todas as páginas ficam envolvidas por AuthGate para validação de sessão.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/conciliacao" element={<ConciliacaoPage />} />
      <Route path="/regras" element={<RegrasPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>
        <App />
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>,
)
