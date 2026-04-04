import { useState, useEffect } from 'react'
import api from '../api'

interface ChartRow {
  label: string
  value: number
  color: string
}

const COLORS = ['#1a3c8f', '#16a34a', '#ea580c', '#dc2626', '#7c3aed', '#0891b2', '#ca8a04', '#be185d']

const TYPE_LABELS: Record<string, string> = {
  article: 'Статья',
  news: 'Новость',
  note: 'Заметка',
  doc: 'Документ',
  changelog: 'Изменение',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  on_review: 'На модерации',
  published: 'Опубликован',
  archived: 'Архив',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  moderator: 'Модератор',
  senior_employee: 'Ст. сотрудник',
  employee: 'Сотрудник',
  visitor: 'Визитор',
}

function Bar({ rows, title }: { rows: ChartRow[]; title: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">{r.label}</span>
              <span className="font-medium">{r.value}</span>
            </div>
            <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(r.value / max) * 100}%`, backgroundColor: r.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StatisticsPage() {
  const [byType, setByType] = useState<ChartRow[]>([])
  const [byStatus, setByStatus] = useState<ChartRow[]>([])
  const [byRole, setByRole] = useState<ChartRow[]>([])
  const [monthly, setMonthly] = useState<{ year: number; month: number; count: number }[]>([])

  useEffect(() => {
    api.get('/admin/statistics/content-by-type').then((r) =>
      setByType(r.data.map((d: any, i: number) => ({
        label: TYPE_LABELS[d.type] || d.type,
        value: d.count,
        color: COLORS[i % COLORS.length],
      })))
    )
    api.get('/admin/statistics/content-by-status').then((r) =>
      setByStatus(r.data.map((d: any, i: number) => ({
        label: STATUS_LABELS[d.status] || d.status,
        value: d.count,
        color: COLORS[i % COLORS.length],
      })))
    )
    api.get('/admin/statistics/users-by-role').then((r) =>
      setByRole(r.data.map((d: any, i: number) => ({
        label: ROLE_LABELS[d.role] || d.role,
        value: d.count,
        color: COLORS[i % COLORS.length],
      })))
    )
    api.get('/admin/statistics/content-monthly').then((r) => setMonthly(r.data))
  }, [])

  const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  const monthlyMax = Math.max(...monthly.map((m) => m.count), 1)

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-5">Статистика</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Bar rows={byType} title="Контент по типу" />
        <Bar rows={byStatus} title="Контент по статусу" />
        <Bar rows={byRole} title="Пользователи по роли" />

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Создание контента по месяцам</h3>
          {monthly.length === 0 ? (
            <div className="text-gray-400 text-sm">Нет данных</div>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {monthly.map((m) => (
                <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center">
                  <div className="text-xs font-medium text-gray-600 mb-1">{m.count}</div>
                  <div
                    className="w-full bg-primary-500 rounded-t"
                    style={{ height: `${(m.count / monthlyMax) * 120}px`, minHeight: '4px' }}
                  />
                  <div className="text-xs text-gray-400 mt-1">{MONTHS[m.month - 1]}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
