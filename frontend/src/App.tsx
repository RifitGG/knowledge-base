import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Header from './components/Header'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import SpacesPage from './pages/SpacesPage'
import SpaceDetailPage from './pages/SpaceDetailPage'
import ContentListPage from './pages/ContentListPage'
import ContentDetailPage from './pages/ContentDetailPage'
import ContentEditorPage from './pages/ContentEditorPage'
import { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-center text-gray-400">Загрузка...</div>
  if (!user) return <Navigate to="/login" />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <>
      {user && <Header />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/spaces" element={<ProtectedRoute><SpacesPage /></ProtectedRoute>} />
        <Route path="/spaces/:id" element={<ProtectedRoute><SpaceDetailPage /></ProtectedRoute>} />
        <Route path="/content" element={<ProtectedRoute><ContentListPage /></ProtectedRoute>} />
        <Route path="/content/new" element={<ProtectedRoute><ContentEditorPage /></ProtectedRoute>} />
        <Route path="/content/:id" element={<ProtectedRoute><ContentDetailPage /></ProtectedRoute>} />
        <Route path="/content/:id/edit" element={<ProtectedRoute><ContentEditorPage /></ProtectedRoute>} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
