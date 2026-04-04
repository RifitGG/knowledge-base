import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { ContentItem } from '../types'
import { useAuth } from '../context/AuthContext'

export default function ContentListPage() {
  const { user } = useAuth()
  const [content, setContent] = useState<ContentItem[]>([])
  const [myContent, setMyContent] = useState<ContentItem[]>([])
  const [tab, setTab] = useState<'all' | 'my'>('all')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    api.get('/content/', { params: { content_type: typeFilter || undefined } }).then((r) => setContent(r.data))
    if (user) {
      api.get('/content/my').then((r) => setMyContent(r.data))
    }
  }, [typeFilter, user])

  const list = tab === 'my' ? myContent : content

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    on_review: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-red-100 text-red-700',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Документы</h1>
        {user && user.role !== 'visitor' && (
          <Link to="/content/new" className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600">
            + Создать
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        {user && (
          <div className="flex gap-2">
            <button onClick={() => setTab('all')} className={`px-3 py-1 rounded text-sm ${tab === 'all' ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}>
              Все публикации
            </button>
            <button onClick={() => setTab('my')} className={`px-3 py-1 rounded text-sm ${tab === 'my' ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}>
              Мои материалы
            </button>
          </div>
        )}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1 border rounded-lg text-sm focus:outline-none"
        >
          <option value="">Все типы</option>
          <option value="article">Статьи</option>
          <option value="news">Новости</option>
          <option value="doc">Документация</option>
          <option value="note">Заметки</option>
          <option value="changelog">Чейнджлоги</option>
        </select>
      </div>

      <div className="space-y-3">
        {list.map((c) => (
          <Link key={c.id} to={`/content/${c.id}`} className="block bg-white border rounded-lg p-4 hover:shadow-md transition">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[c.status]}`}>
                {c.status}
              </span>
              <span className="text-xs text-gray-400">{c.content_type}</span>
              {c.is_pinned && <span className="text-xs">📌</span>}
            </div>
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-gray-500">{c.summary}</p>
            <div className="text-xs text-gray-400 mt-1">
              {c.author?.full_name} · {new Date(c.created_at).toLocaleDateString('ru')} · {c.views_count} просм.
            </div>
          </Link>
        ))}
        {list.length === 0 && <p className="text-gray-400 text-center py-8">Нет материалов</p>}
      </div>
    </div>
  )
}
