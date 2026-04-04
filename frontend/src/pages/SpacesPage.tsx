import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { Space } from '../types'
import { useAuth } from '../context/AuthContext'

export default function SpacesPage() {
  const { user } = useAuth()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    api.get('/spaces/').then((r) => setSpaces(r.data))
  }, [])

  const createSpace = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/spaces/', { name, description })
    setName('')
    setDescription('')
    setShowForm(false)
    api.get('/spaces/').then((r) => setSpaces(r.data))
  }

  const canCreate = user && ['admin', 'moderator', 'senior_employee'].includes(user.role)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Пространства</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600"
          >
            + Новое пространство
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createSpace} className="bg-white border rounded-lg p-4 mb-6 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название"
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary-500"
            rows={2}
          />
          <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm">
            Создать
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {spaces.map((s) => (
          <Link
            key={s.id}
            to={`/spaces/${s.id}`}
            className="bg-white border rounded-lg p-5 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-primary-500 text-lg">{s.name}</h3>
            <p className="text-sm text-gray-500 mt-2">{s.description}</p>
            <div className="text-xs text-gray-400 mt-3">
              {new Date(s.created_at).toLocaleDateString('ru')}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
