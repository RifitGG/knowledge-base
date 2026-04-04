import { useState, useEffect } from 'react'
import api from '../api'
import { Stats } from '../types'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  on_review: 'На модерации',
  published: 'Опубликован',
  archived: 'Архив',
}

const TYPE_LABELS: Record<string, string> = {
  article: 'Статья',
  news: 'Новость',
  note: 'Заметка',
  doc: 'Документ',
  changelog: 'Изменение',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get('/admin/stats').then((r) => setStats(r.data))
  }, [])

  if (!stats) return <div className="text-gray-400 p-4">Загрузка...</div>

  const cards = [
    { label: 'Пользователей', value: stats.total_users, color: 'text-primary-500' },
    { label: 'Всего контента', value: stats.total_content, color: 'text-primary-500' },
    { label: 'Опубликовано', value: stats.total_published, color: 'text-green-600' },
    { label: 'Пространств', value: stats.total_spaces, color: 'text-primary-500' },
    { label: 'На модерации', value: stats.pending_moderation, color: 'text-orange-500' },
    { label: 'Открытых обращений', value: stats.open_tickets, color: 'text-red-500' },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-5">Дашборд</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <h3 className="font-semibold text-gray-700 mb-3">Последние материалы</h3>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2.5">Название</th>
              <th className="text-left px-4 py-2.5">Тип</th>
              <th className="text-left px-4 py-2.5">Статус</th>
              <th className="text-left px-4 py-2.5">Автор</th>
              <th className="text-left px-4 py-2.5">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.recent_content.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">{c.title}</td>
                <td className="px-4 py-2.5 text-gray-500">{TYPE_LABELS[c.content_type] || c.content_type}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === 'published' ? 'bg-green-100 text-green-700' :
                    c.status === 'on_review' ? 'bg-orange-100 text-orange-700' :
                    c.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{c.author?.full_name || '—'}</td>
                <td className="px-4 py-2.5 text-gray-400">{new Date(c.created_at).toLocaleDateString('ru')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
