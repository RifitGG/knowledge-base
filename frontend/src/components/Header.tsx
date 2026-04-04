import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  moderator: 'Модератор',
  senior_employee: 'Ст. сотрудник',
  employee: 'Сотрудник',
  visitor: 'Визитор',
}

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">РС</span>
            </div>
            <span className="font-bold text-primary-500 text-lg">Русский Свет</span>
          </Link>
          {user && (
            <nav className="flex items-center gap-4 text-sm">
              <Link to="/spaces" className="text-gray-600 hover:text-primary-500">Пространства</Link>
              <Link to="/content" className="text-gray-600 hover:text-primary-500">Документы</Link>
              {(user.role === 'admin' || user.role === 'moderator') && (
                <a href="http://localhost:5174" className="text-gray-600 hover:text-primary-500">Админ</a>
              )}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-gray-500">{user.full_name} ({ROLE_LABELS[user.role] || user.role})</span>
              <button
                onClick={() => { logout(); navigate('/login') }}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Выход
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm text-primary-500 hover:underline">Войти</Link>
          )}
        </div>
      </div>
    </header>
  )
}
