import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { HomePage } from './pages/HomePage'
import { ConciliacaoPage } from './pages/ConciliacaoPage'
import { RegrasPage } from './pages/RegrasPage'

// Roteamento simples baseado no pathname (sem biblioteca extra)
const path = window.location.pathname
/**
 * Componente-raiz selecionado de acordo com a rota atual.
 */
const App = path.startsWith('/regras')
  ? RegrasPage
  : path.startsWith('/conciliacao')
    ? ConciliacaoPage
    : HomePage

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
