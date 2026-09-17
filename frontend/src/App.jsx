import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Dashboard from './pages/Dashboard'
import EscanearPage from './pages/EscanearPage'
import BuscarProductoPage from './pages/BuscarProductoPage'
import ResultadosPage from './pages/ResultadosPage'
import ProductoDetallePage from './pages/ProductoDetallePage'
import ProductoNuevoPage from './pages/ProductoNuevoPage'
import ImportarCsvPage from './pages/ImportarCsvPage'
import EmpleadosPage from './pages/EmpleadosPage'
import EmpleadoNuevoPage from './pages/EmpleadoNuevoPage'
import CatalogoPage from './pages/CatalogoPage'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />

        <Route
          path="/escanear"
          element={
            <ProtectedRoute>
              <EscanearPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <ProtectedRoute>
              <BuscarProductoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos/resultados"
          element={
            <ProtectedRoute>
              <ResultadosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/catalogo"
          element={
            <ProtectedRoute rolesPermitidos={['admin']}>
              <CatalogoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos/nuevo"
          element={
            <ProtectedRoute rolesPermitidos={['admin']}>
              <ProductoNuevoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos/importar"
          element={
            <ProtectedRoute rolesPermitidos={['admin']}>
              <ImportarCsvPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/empleados"
          element={
            <ProtectedRoute rolesPermitidos={['admin']}>
              <EmpleadosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/empleados/nuevo"
          element={
            <ProtectedRoute rolesPermitidos={['admin']}>
              <EmpleadoNuevoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos/:id"
          element={
            <ProtectedRoute>
              <ProductoDetallePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
