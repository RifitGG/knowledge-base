import { useState, useEffect } from 'react'
import api from './api'
import { User } from './types'
import LoginForm from './components/LoginForm'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import DashboardPage from './pages/DashboardPage'
import ModerationPage from './pages/ModerationPage'
import UsersPage from './pages/UsersPage'
import StatisticsPage from './pages/StatisticsPage'
import TicketsPage from './pages/TicketsPage'

export type Tab = 'dashboard' | 'moderation' | 'users' | 'statistics' | 'tickets'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('dashboard')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/me')
        .then((r) => setUser(r.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = async (email: string, password: string) => {
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)
    const res = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    localStorage.setItem('token', res.data.access_token)
    const me = await api.get('/auth/me')
    if (me.data.role !== 'admin' && me.data.role !== 'moderator') {
      localStorage.removeItem('token')
      throw new Error('Доступ запрещён. Только для администраторов.')
    }
    setUser(me.data)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Загрузка...</div>
  if (!user) return <LoginForm onLogin={handleLogin} />

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar tab={tab} setTab={setTab} user={user} onLogout={handleLogout} />
        <main className="flex-1 p-6 overflow-auto">
          {tab === 'dashboard' && <DashboardPage />}
          {tab === 'moderation' && <ModerationPage />}
          {tab === 'users' && <UsersPage />}
          {tab === 'statistics' && <StatisticsPage />}
          {tab === 'tickets' && <TicketsPage />}
        </main>
      </div>
    </div>
  )
}
