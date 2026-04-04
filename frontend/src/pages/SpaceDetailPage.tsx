import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import { ContentItem, Space } from '../types'

const TYPE_LABELS: Record<string, string> = {
  article: 'Статья',
  news: 'Новость',
  note: 'Заметка',
  doc: 'Документация',
  changelog: 'Чейнджлог',
}

export default function SpaceDetailPage() {
  const { id } = useParams()
  const [space, setSpace] = useState<Space | null>(null)
  const [content, setContent] = useState<ContentItem[]>([])

  useEffect(() => {
    api.get(`/spaces/${id}`).then((r) => setSpace(r.data))
    api.get('/content/', { params: { space_id: id } }).then((r) => setContent(r.data))
  }, [id])

  if (!space) return <div className="p-8 text-center text-gray-400">Загрузка...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link to="/spaces" className="text-sm text-primary-500 hover:underline">← Все пространства</Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">{space.name}</h1>
        <p className="text-gray-500">{space.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {content.map((c) => (
          <Link key={c.id} to={`/content/${c.id}`} className="bg-white border rounded-lg p-4 hover:shadow-md transition">
            <span className="text-xs text-primary-500 font-medium">{TYPE_LABELS[c.content_type]}</span>
            <h4 className="font-semibold mt-1">{c.title}</h4>
            <p className="text-sm text-gray-500 mt-1">{c.summary}</p>
            <div className="text-xs text-gray-400 mt-2">{c.author?.full_name} · {c.views_count} просм.</div>
          </Link>
        ))}
        {content.length === 0 && <p className="text-gray-400 col-span-3">В этом пространстве пока нет публикаций</p>}
      </div>
    </div>
  )
}
