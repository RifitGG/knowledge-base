import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "../components/Icon";
import { RusSvetLogo } from "../components/Logo";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@company.ru");
  const [password, setPassword] = useState("admin");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/projects" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password, remember);
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка авторизации");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
      <div className="mx-auto grid w-full max-w-[1324px] grid-cols-1 gap-6 lg:grid-cols-[560px_1fr] lg:gap-10">
        <section
          className="relative min-h-[480px] overflow-hidden rounded-[32px] p-6 text-white sm:p-8 lg:min-h-[860px] lg:p-10"
          style={{
            background: "linear-gradient(135deg, #17305E 0%, #1C408C 70%, #2959B8 100%)",
          }}
        >
          <div className="absolute -right-8 -top-16 h-60 w-60 rounded-full bg-white/10" />
          <div className="absolute bottom-40 -left-4 h-40 w-40 rounded-full bg-white/10" />

          <h1 className="relative max-w-[414px] text-[32px] font-bold leading-[1.1] sm:text-[40px]">
            Единая точка входа в корпоративные знания
          </h1>
          <p className="relative mt-8 max-w-[384px] text-[16px] leading-[1.55] text-brand-100 sm:text-[18px]">
            Платформа объединяет документацию, проектные материалы, инструкции, версионность статей и контроль
            доступа по ролям.
          </p>
          <ul className="relative mt-12 space-y-6 text-[16px] font-medium sm:text-[18px]">
            {[
              { text: "Поиск по разделам и документам", icon: "search" as const },
              { text: "Работа в рамках проектов и групп", icon: "kanban" as const },
              { text: "Безопасный доступ и аудит действий", icon: "shield" as const },
              { text: "Подготовка статей и публикаций", icon: "document" as const },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3">
                <span className="grid h-[32px] w-[32px] place-items-center rounded-xl bg-white/15 text-white">
                  <Icon name={item.icon} size={16} />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col">
          <div className="mx-auto flex w-full max-w-[540px] flex-col rounded-[32px] border border-surface-line bg-white p-6 shadow-card sm:p-8 lg:p-10">
            <div className="mb-6 flex items-center justify-between">
              <RusSvetLogo />
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                База знаний
              </span>
            </div>
            <h2 className="text-[30px] font-bold text-ink-900">Авторизация</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-500">
              Войдите в платформу, чтобы открыть назначенные проекты, статьи и рабочие материалы.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
              <div>
                <label className="field-label">Корпоративная почта</label>
                <div className="relative">
                  <Icon name="mail" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    className="input h-[54px] pl-12"
                    placeholder="name@company.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Пароль</label>
                <div className="relative">
                  <Icon name="lock" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="input h-[54px] pl-12 pr-12"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-4 flex items-center text-ink-400 hover:text-ink-900"
                    aria-label="Показать пароль"
                  >
                    <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 font-medium text-ink-500">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-5 w-5 rounded-md border-surface-line text-brand-500 focus:ring-brand-500"
                  />
                  Запомнить сессию
                </label>
                <button type="button" className="font-medium text-brand-500 hover:text-brand-600">
                  Забыли пароль?
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl bg-accent-redBg px-4 py-3 text-sm text-accent-red">
                  <Icon name="warn" size={14} /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex h-[58px] items-center justify-center gap-2 rounded-2xl bg-brand-500 text-white text-base font-semibold shadow-sm hover:bg-brand-600 transition disabled:opacity-60"
              >
                <Icon name="lock" size={18} />
                {submitting ? "Входим…" : "Войти в платформу"}
              </button>
            </form>

            <div className="mt-8 rounded-[20px] bg-brand-50 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-brand-600">
                <Icon name="shield" size={14} /> Безопасность входа
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
                Все действия после входа фиксируются в журнале аудита, а доступ к материалам определяется ролью
                пользователя.
              </p>
            </div>

            <p className="mt-8 text-center text-[13px] text-ink-500">2026 © Русский Свет Технологии</p>
          </div>
        </section>
      </div>
    </div>
  );
}
