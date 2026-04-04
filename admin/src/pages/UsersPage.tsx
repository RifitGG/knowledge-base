import { useState, useEffect } from 'react'
import api from '../api'
import { User } from '../types'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  moderator: 'Модератор',
  senior_employee: 'Ст. сотрудник',
  employee: 'Сотрудник',
  visitor: 'Визитор',
}

const ROLES = ['admin', 'moderator', 'senior_employee', 'employee', 'visitor']

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [form, setForm] = useState({ email: '', password: '', full_name: '', position: '', role: 'employee' })
  const [filterRole, setFilterRole] = useState('')

  const load = () => {
    setLoading(true)
    const params = filterRole ? { role: filterRole } : {}
    api.get('/users/', { params }).then((r) => {
      setUsers(r.data)
      setLoading(false)
    })
  }

  useEffect(load, [filterRole])

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/users/', form)
    setForm({ email: '', password: '', full_name: '', position: '', role: 'employee' })
    setShowForm(false)
    load()
  }

  const startEdit = (u: User) => {
    setEditingId(u.id)
    setEditRole(u.role)
    setEditStatus(u.status)
  }

  const saveEdit = async (id: number) => {
    await api.patch(`/users/${id}`, { role: editRole, status: editStatus })
    setEditingId(null)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">Пользователи</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600"
        >
          + Создать пользователя
        </button>
      </div>

      {showForm && (
        <form onSubmit={createUser} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              type="email"
              required
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            />
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Пароль"
              type="password"
              required
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            />
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="ФИО"
              required
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            />
            <input
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="Должность"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 flex-1">
                Создать
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300">
                Отмена
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterRole('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!filterRole ? 'bg-primary-500 text-white' : 'bg-white border text-gray-600'}`}
        >
          Все
        </button>
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setFilterRole(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterRole === r ? 'bg-primary-500 text-white' : 'bg-white border text-gray-600'}`}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 p-4">Загрузка...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">ФИО</th>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Должность</th>
                <th className="text-left px-4 py-2.5">Роль</th>
                <th className="text-left px-4 py-2.5">Статус</th>
                <th className="text-left px-4 py-2.5">Дата</th>
                <th className="text-left px-4 py-2.5">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{u.full_name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{u.email}</td>
                  <td className="px-4 py-2.5 text-gray-500">{u.position || '—'}</td>
                  <td className="px-4 py-2.5">
                    {editingId === u.id ? (
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="border rounded px-1 py-0.5 text-xs">
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editingId === u.id ? (
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="border rounded px-1 py-0.5 text-xs">
                        <option value="active">Активен</option>
                        <option value="blocked">Заблокирован</option>
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.status === 'active' ? 'Активен' : u.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{new Date(u.created_at).toLocaleDateString('ru')}</td>
                  <td className="px-4 py-2.5">
                    {editingId === u.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(u.id)} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
                          Сохранить
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300">
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(u)} className="text-xs text-primary-500 hover:underline">
                        Редактировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
