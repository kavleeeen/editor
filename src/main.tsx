import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import './index.css'
import Dashboard from './components/Dashboard/Dashboard'
import Editor from './Editor.tsx'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import { store } from './store/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:id"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Provider>
    </BrowserRouter>
  </StrictMode>,
)
