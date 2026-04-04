import { Tab } from '../App'
import { User } from '../types'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  moderator: 'Модератор',
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Дашборд' },
  { key: 'moderation', label: 'Модерация' },
  { key: 'users', label: 'Пользователи' },
  { key: 'statistics', label: 'Статистика' },
  { key: 'tickets', label: 'Обращения' },
]

interface Props {
  tab: Tab
  setTab: (t: Tab) => void
  user: User
  onLogout: () => void
}

export default function Sidebar({ tab, setTab, user, onLogout }: Props) {
  return (
    <aside className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-primary-50 text-primary-500 border border-primary-200'
                : 'text-gray-600 hover:bg-gray-50 border border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">{user.full_name}</div>
            <div className="text-xs text-gray-400">{ROLE_LABELS[user.role] || user.role}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-xs text-primary-500 border border-primary-300 rounded-lg px-3 py-1.5 hover:bg-primary-50 w-full"
        >
          ВЫХОД
        </button>
      </div>
    </aside>
  )
}
