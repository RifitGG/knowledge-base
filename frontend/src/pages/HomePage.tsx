import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'
import { ContentItem, Space } from '../types'
import { useAuth } from '../context/AuthContext'

const TYPE_LABELS: Record<string, string> = {
  article: 'Статья',
  news: 'Новость',
  note: 'Заметка',
  doc: 'Документация',
  changelog: 'Чейнджлог',
}

export default function HomePage() {
  const { user } = useAuth()
  const [content, setContent] = useState<ContentItem[]>([])
  const [spaces, setSpaces] = useState<Space[]>([])
  const [search, setSearch] = useState('')
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const q = searchParams.get('search') || ''
    setSearch(q)
    api.get('/content/', { params: { search: q || undefined } }).then((r) => setContent(r.data))
    api.get('/spaces/').then((r) => setSpaces(r.data))
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = `/?search=${encodeURIComponent(search)}`
  }

  const pinned = content.filter((c) => c.is_pinned)
  const news = content.filter((c) => c.content_type === 'news' && !c.is_pinned)
  const articles = content.filter((c) => c.content_type !== 'news' && !c.is_pinned)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <div className="bg-primary-500 rounded-xl p-8 text-white">
        <h1 className="text-2xl font-bold mb-2">Добро пожаловать в базу знаний компании!</h1>
        <p className="text-blue-100 mb-4">Найдите информацию, руководство и ресурсы для работы</p>
        <form onSubmit={handleSearch} className="max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по заголовкам..."
            className="w-full px-4 py-2 rounded-lg text-gray-900 focus:outline-none"
          />
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 text-gray-700">Быстрый доступ</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {spaces.map((s) => (
            <Link
              key={s.id}
              to={`/spaces/${s.id}`}
              className="bg-primary-500 text-white rounded-lg p-4 hover:bg-primary-600 transition"
            >
              <div className="font-semibold">{s.name}</div>
              <div className="text-blue-200 text-sm mt-1">{s.description}</div>
            </Link>
          ))}
          {user && (
            <Link
              to="/content/new"
              className="bg-green-500 text-white rounded-lg p-4 hover:bg-green-600 transition flex items-center justify-center"
            >
              <span className="text-2xl mr-2">+</span> Создать
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="font-semibold text-primary-500 mb-3 border-b pb-2">Популярные статьи</h3>
          <ul className="space-y-2">
            {[...content].sort((a, b) => b.views_count - a.views_count).slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link to={`/content/${c.id}`} className="text-sm text-gray-700 hover:text-primary-500">
                  {c.title}
                  <span className="text-gray-400 ml-2">({c.views_count} просм.)</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <h3 className="font-semibold text-primary-500 mb-3 border-b pb-2">Новости</h3>
          <ul className="space-y-2">
            {news.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link to={`/content/${c.id}`} className="text-sm text-gray-700 hover:text-primary-500">
                  {c.title}
                </Link>
                <div className="text-xs text-gray-400">{new Date(c.published_at || c.created_at).toLocaleDateString('ru')}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <h3 className="font-semibold text-primary-500 mb-3 border-b pb-2">Важные ссылки</h3>
          <ul className="space-y-2">
            {pinned.map((c) => (
              <li key={c.id}>
                <Link to={`/content/${c.id}`} className="text-sm text-gray-700 hover:text-primary-500 font-medium">
                  📌 {c.title}
                </Link>
              </li>
            ))}
            {pinned.length === 0 && <li className="text-sm text-gray-400">Нет закреплённых</li>}
          </ul>
        </div>
      </div>

      {articles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Статьи и документация</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {articles.slice(0, 6).map((c) => (
              <Link key={c.id} to={`/content/${c.id}`} className="bg-white border rounded-lg p-4 hover:shadow-md transition">
                <span className="text-xs text-primary-500 font-medium">{TYPE_LABELS[c.content_type] || c.content_type}</span>
                <h4 className="font-semibold mt-1">{c.title}</h4>
                <p className="text-sm text-gray-500 mt-1">{c.summary}</p>
                <div className="text-xs text-gray-400 mt-2">{c.author?.full_name} · {c.views_count} просм.</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
