import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CarritoProvider } from './context/CarritoContext.jsx'
import { SuscripcionProvider } from './context/SuscripcionContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SuscripcionProvider>
        <CarritoProvider>
          <App />
        </CarritoProvider>
      </SuscripcionProvider>
    </AuthProvider>
  </StrictMode>,
)
