import { useState, useEffect } from 'react'
import api from '../api'
import { ContentItem } from '../types'

export default function ModerationPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/admin/moderation').then((r) => {
      setItems(r.data)
      setLoading(false)
    })
  }

  useEffect(load, [])

  const approve = async (id: number) => {
    await api.post(`/admin/moderation/${id}/approve`)
    setItems((prev) => prev.filter((c) => c.id !== id))
  }

  const reject = async (id: number) => {
    await api.post(`/admin/moderation/${id}/reject`)
    setItems((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) return <div className="text-gray-400 p-4">Загрузка...</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-5">Модерация</h2>

      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-400">
          Нет материалов на модерации
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{c.title}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    {c.author?.full_name || 'Автор неизвестен'} · {c.content_type}
                    {c.space && <span> · {c.space.name}</span>}
                  </div>
                  {c.summary && <p className="text-sm text-gray-600 mt-2">{c.summary}</p>}
                  <div className="text-xs text-gray-400 mt-2">
                    Создан: {new Date(c.created_at).toLocaleString('ru')}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => approve(c.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600"
                  >
                    Одобрить
                  </button>
                  <button
                    onClick={() => reject(c.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
