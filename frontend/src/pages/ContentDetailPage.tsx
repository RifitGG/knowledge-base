import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import api from '../api'
import { ContentItem } from '../types'
import { useAuth } from '../context/AuthContext'

const TYPE_LABELS: Record<string, string> = {
  article: 'Статья',
  news: 'Новость',
  note: 'Заметка',
  doc: 'Документация',
  changelog: 'Чейнджлог',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  on_review: 'На модерации',
  published: 'Опубликовано',
  archived: 'Архив',
}

export default function ContentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [item, setItem] = useState<ContentItem | null>(null)

  useEffect(() => {
    api.get(`/content/${id}`).then((r) => setItem(r.data))
  }, [id])

  if (!item) return <div className="p-8 text-center text-gray-400">Загрузка...</div>

  const canEdit = user && (user.id === item.author_id || user.role === 'admin' || user.role === 'moderator')

  const handleDelete = async () => {
    if (!confirm('Удалить?')) return
    await api.delete(`/content/${id}`)
    navigate('/')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to="/" className="text-sm text-primary-500 hover:underline">← На главную</Link>

      <div className="bg-white border rounded-lg p-6 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
            {TYPE_LABELS[item.content_type]}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            item.status === 'published' ? 'bg-green-100 text-green-700' :
            item.status === 'draft' ? 'bg-gray-100 text-gray-600' :
            item.status === 'on_review' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {STATUS_LABELS[item.status]}
          </span>
          {item.is_pinned && <span className="text-xs">📌</span>}
        </div>

        <h1 className="text-2xl font-bold mb-2">{item.title}</h1>

        <div className="text-sm text-gray-500 mb-4 flex items-center gap-4">
          <span>{item.author?.full_name}</span>
          {item.space && <span>· {item.space.name}</span>}
          <span>· {new Date(item.published_at || item.created_at).toLocaleDateString('ru')}</span>
          <span>· {item.views_count} просм.</span>
        </div>

        {item.summary && <p className="text-gray-600 mb-4 italic">{item.summary}</p>}

        <div className="prose max-w-none">
          <ReactMarkdown>{item.body_md}</ReactMarkdown>
        </div>

        {canEdit && (
          <div className="mt-6 pt-4 border-t flex gap-3">
            <Link
              to={`/content/${item.id}/edit`}
              className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600"
            >
              Редактировать
            </Link>
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
            >
              Удалить
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
