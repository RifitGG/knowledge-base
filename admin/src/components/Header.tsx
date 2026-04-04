import { User } from '../types'

interface Props {
  user: User
}

export default function Header({ user }: Props) {
  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">РС</span>
          </div>
          <span className="font-bold text-primary-500 text-lg">Русский Свет</span>
          <span className="text-gray-500 font-medium ml-1">Админ</span>
        </div>
        <a
          href="http://localhost:5173"
          className="text-primary-500 hover:underline text-sm font-medium ml-4"
        >
          В платформу
        </a>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Поиск..."
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-primary-500"
        />
        <div className="text-sm text-gray-500">{user.full_name}</div>
      </div>
    </header>
  )
}
