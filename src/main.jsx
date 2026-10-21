import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CommitmentProvider } from './context/CommitmentContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CommitmentProvider>
      <App />
    </CommitmentProvider>
  </StrictMode>,
)
