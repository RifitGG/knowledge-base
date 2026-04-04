import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import api from '../api'
import { Space, ContentItem } from '../types'

export default function ContentEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [contentType, setContentType] = useState('article')
  const [spaceId, setSpaceId] = useState<number | ''>('')
  const [status, setStatus] = useState('draft')
  const [spaces, setSpaces] = useState<Space[]>([])
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    api.get('/spaces/').then((r) => setSpaces(r.data))
    if (isEdit) {
      api.get(`/content/${id}`).then((r) => {
        const d: ContentItem = r.data
        setTitle(d.title)
        setSummary(d.summary)
        setBodyMd(d.body_md)
        setContentType(d.content_type)
        setSpaceId(d.space_id || '')
        setStatus(d.status)
      })
    }
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      title,
      summary,
      body_md: bodyMd,
      content_type: contentType,
      space_id: spaceId || null,
      status,
    }
    if (isEdit) {
      await api.patch(`/content/${id}`, payload)
      navigate(`/content/${id}`)
    } else {
      const res = await api.post('/content/', payload)
      navigate(`/content/${res.data.id}`)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Редактирование' : 'Новый материал'}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:border-primary-500"
          >
            <option value="article">Статья</option>
            <option value="news">Новость</option>
            <option value="note">Заметка</option>
            <option value="doc">Документация</option>
            <option value="changelog">Чейнджлог</option>
          </select>

          <select
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:border-primary-500"
          >
            <option value="">Без пространства</option>
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:border-primary-500"
          >
            <option value="draft">Черновик</option>
            <option value="on_review">На модерацию</option>
            <option value="published">Опубликовать</option>
          </select>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок"
          required
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary-500 text-lg font-semibold"
        />

        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Краткое описание"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary-500"
        />

        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={`px-3 py-1 rounded text-sm ${!preview ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}
          >
            Редактор
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={`px-3 py-1 rounded text-sm ${preview ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}
          >
            Предпросмотр
          </button>
        </div>

        {preview ? (
          <div className="prose bg-white border rounded-lg p-4 min-h-[300px]">
            <ReactMarkdown>{bodyMd}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
            placeholder="Содержание (Markdown)"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary-500 font-mono text-sm min-h-[300px]"
          />
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600"
          >
            {isEdit ? 'Сохранить' : 'Создать'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}
