import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Falha ao encontrar o elemento root no DOM.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
