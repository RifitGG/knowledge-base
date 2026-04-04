import { useState, useEffect } from 'react'
import api from '../api'
import { SupportTicket } from '../types'

const STATUS_LABELS: Record<string, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  resolved: 'Решён',
  closed: 'Закрыт',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [replyingId, setReplyingId] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyStatus, setReplyStatus] = useState('resolved')

  const load = () => {
    setLoading(true)
    const params = filter ? { status: filter } : {}
    api.get('/admin/tickets', { params }).then((r) => {
      setTickets(r.data)
      setLoading(false)
    })
  }

  useEffect(load, [filter])

  const submitReply = async (id: number) => {
    await api.post(`/admin/tickets/${id}/reply`, {
      admin_reply: replyText,
      status: replyStatus,
    })
    setReplyingId(null)
    setReplyText('')
    load()
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-5">Обращения</h2>

      <div className="flex gap-2 mb-4">
        {[
          { key: '', label: 'Все' },
          { key: 'open', label: 'Открытые' },
          { key: 'in_progress', label: 'В работе' },
          { key: 'resolved', label: 'Решённые' },
          { key: 'closed', label: 'Закрытые' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              filter === f.key ? 'bg-primary-500 text-white' : 'bg-white border text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 p-4">Загрузка...</div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-400">
          Нет обращений
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800">{t.subject}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {t.user?.full_name || 'Пользователь'} · {t.user?.email}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{t.message}</p>
                  {t.admin_reply && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-xs text-green-600 font-medium mb-1">Ответ администратора:</div>
                      <p className="text-sm text-green-800">{t.admin_reply}</p>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(t.created_at).toLocaleString('ru')}
                  </div>
                </div>
                {(t.status === 'open' || t.status === 'in_progress') && (
                  <button
                    onClick={() => { setReplyingId(replyingId === t.id ? null : t.id); setReplyText(''); setReplyStatus('resolved') }}
                    className="text-sm text-primary-500 hover:underline shrink-0"
                  >
                    Ответить
                  </button>
                )}
              </div>
              {replyingId === t.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Текст ответа..."
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:border-primary-500"
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <select
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                    >
                      <option value="resolved">Решено</option>
                      <option value="in_progress">В работе</option>
                      <option value="closed">Закрыть</option>
                    </select>
                    <button
                      onClick={() => submitReply(t.id)}
                      disabled={!replyText.trim()}
                      className="bg-primary-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
                    >
                      Отправить
                    </button>
                    <button
                      onClick={() => setReplyingId(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
