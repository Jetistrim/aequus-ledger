import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { HomePage } from './pages/HomePage'
import { RegrasPage } from './pages/RegrasPage'

// Roteamento simples baseado no pathname (sem biblioteca extra)
const path = window.location.pathname
const App = path.startsWith('/regras') ? RegrasPage : HomePage

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
