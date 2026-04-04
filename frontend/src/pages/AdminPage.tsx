import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { Stats, ContentItem, User as UserType } from '../types'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  moderator: 'Модератор',
  senior_employee: 'Ст. сотрудник',
  employee: 'Сотрудник',
  visitor: 'Визитор',
}

export default function AdminPage() {
  const [tab, setTab] = useState<'dashboard' | 'moderation' | 'users'>('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [moderation, setModeration] = useState<ContentItem[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [showUserForm, setShowUserForm] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', position: '', role: 'employee' })

  useEffect(() => {
    if (tab === 'dashboard') api.get('/admin/stats').then((r) => setStats(r.data))
    if (tab === 'moderation') api.get('/admin/moderation').then((r) => setModeration(r.data))
    if (tab === 'users') api.get('/users/').then((r) => setUsers(r.data))
  }, [tab])

  const approve = async (id: number) => {
    await api.post(`/admin/moderation/${id}/approve`)
    setModeration((prev) => prev.filter((c) => c.id !== id))
  }

  const reject = async (id: number) => {
    await api.post(`/admin/moderation/${id}/reject`)
    setModeration((prev) => prev.filter((c) => c.id !== id))
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/users/', newUser)
    setNewUser({ email: '', password: '', full_name: '', position: '', role: 'employee' })
    setShowUserForm(false)
    api.get('/users/').then((r) => setUsers(r.data))
  }

  const tabs = [
    { key: 'dashboard' as const, label: 'Дашборд' },
    { key: 'moderation' as const, label: 'Модерация' },
    { key: 'users' as const, label: 'Пользователи' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Админ-панель</h1>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === t.key ? 'bg-primary-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && stats && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary-500">{stats.total_users}</div>
              <div className="text-sm text-gray-500">Пользователей</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary-500">{stats.total_content}</div>
              <div className="text-sm text-gray-500">Всего контента</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.total_published}</div>
              <div className="text-sm text-gray-500">Опубликовано</div>
            </div>
            <div className="bg-white border rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary-500">{stats.total_spaces}</div>
              <div className="text-sm text-gray-500">Пространств</div>
            </div>
          </div>

          <h2 className="font-semibold text-gray-700 mb-3">Последние материалы</h2>
          <div className="bg-white border rounded-lg divide-y">
            {stats.recent_content.map((c) => (
              <Link key={c.id} to={`/content/${c.id}`} className="block px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{c.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{c.content_type} · {c.status}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('ru')}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === 'moderation' && (
        <div>
          {moderation.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Нет материалов на модерации</p>
          ) : (
            <div className="space-y-3">
              {moderation.map((c) => (
                <div key={c.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link to={`/content/${c.id}`} className="font-semibold hover:text-primary-500">{c.title}</Link>
                      <div className="text-sm text-gray-500">{c.author?.full_name} · {c.content_type}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approve(c.id)} className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                        Одобрить
                      </button>
                      <button onClick={() => reject(c.id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                        Отклонить
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{c.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div>
          <button
            onClick={() => setShowUserForm(!showUserForm)}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm mb-4 hover:bg-primary-600"
          >
            + Создать пользователя
          </button>

          {showUserForm && (
            <form onSubmit={createUser} className="bg-white border rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="Email"
                type="email"
                required
                className="px-3 py-2 border rounded-lg focus:outline-none focus:border-primary-500"
              />
              <input
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Пароль"
                type="password"
                required
                className="px-3 py-2 border rounded-lg focus:outline-none focus:border-primary-500"
              />
              <input
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder="ФИО"
                required
                className="px-3 py-2 border rounded-lg focus:outline-none focus:border-primary-500"
              />
              <input
                value={newUser.position}
                onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                placeholder="Должность"
                className="px-3 py-2 border rounded-lg focus:outline-none focus:border-primary-500"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:border-primary-500"
              >
                <option value="visitor">Визитор</option>
                <option value="employee">Сотрудник</option>
                <option value="senior_employee">Ст. сотрудник</option>
                <option value="moderator">Модератор</option>
                <option value="admin">Администратор</option>
              </select>
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                Создать
              </button>
            </form>
          )}

          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">ФИО</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Роль</th>
                  <th className="text-left px-4 py-2">Статус</th>
                  <th className="text-left px-4 py-2">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{u.full_name}</td>
                    <td className="px-4 py-2 text-gray-500">{u.email}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400">{new Date(u.created_at).toLocaleDateString('ru')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
