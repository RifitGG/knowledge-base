import { useState } from 'react'

interface Props {
  onLogin: (email: string, password: string) => Promise<void>
}

export default function LoginForm({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(email, password)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-center text-primary-500 mb-6">Админ-панель</h1>
        {error && <div className="text-red-500 text-sm mb-4 text-center">{error}</div>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:border-primary-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-primary-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-500 text-white py-2.5 rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50"
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
