import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAppData } from "../store/AppData";
import { ROLE_LABEL, canOpenAdmin } from "../utils/roles";
import { Icon } from "./Icon";
import { RusSvetLogo } from "./Logo";
import { relativeFromNow } from "../utils/format";
import { UserAvatar } from "./UserAvatar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-surface-app">
      <TopBar />
      <main className="mx-auto w-full max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <Outlet />
      </main>
    </div>
  );
}

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, notifications, unreadCount, markAllNotificationsRead, markNotificationRead } = useAppData();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [] as typeof projects;
    return projects.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [projects, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!searchRef.current?.contains(e.target as Node)) setShowSearch(false);
      if (!bellRef.current?.contains(e.target as Node)) setShowBell(false);
      if (!profileRef.current?.contains(e.target as Node)) setShowProfile(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-surface-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:h-[90px] lg:flex-nowrap lg:gap-6 lg:px-8 lg:py-0">
        <Link to="/projects" className="flex items-center gap-3">
          <RusSvetLogo />
        </Link>

        <div ref={searchRef} className="relative mx-0 hidden flex-1 md:mx-6 md:flex">
          <div className="flex h-[46px] w-full max-w-[480px] items-center gap-3 rounded-full border border-surface-line bg-surface-muted px-5 text-sm text-ink-400">
            <Icon name="search" size={18} />
            <input
              type="text"
              placeholder="Поиск по проектам, статьям и документам"
              className="h-full flex-1 bg-transparent text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSearch(true);
              }}
              onFocus={() => setShowSearch(true)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-ink-400 hover:text-ink-900"
                aria-label="Очистить"
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
          {showSearch && matches.length > 0 && (
            <div className="absolute left-0 top-[54px] w-[calc(100vw-2rem)] max-w-[480px] rounded-3xl border border-surface-line bg-white p-2 shadow-soft">
              {matches.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setShowSearch(false);
                    setSearch("");
                    navigate(`/projects/${p.id}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-brand-50"
                >
                  <span className="h-8 w-8 rounded-xl" style={{ background: p.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink-900">{p.title}</p>
                    <p className="text-xs text-ink-500 line-clamp-1">{p.description || p.subtitle}</p>
                  </div>
                  <Icon name="arrow-right" size={16} className="text-ink-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="hidden items-center gap-2 lg:flex">
          <HeaderLink to="/projects" active={location.pathname.startsWith("/projects")}>
            <Icon name="kanban" size={18} /> Проекты
          </HeaderLink>
          {canOpenAdmin(user?.role) && (
            <HeaderLink to="/admin" active={location.pathname.startsWith("/admin")}>
              <Icon name="shield" size={18} /> Админ панель
            </HeaderLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setShowBell((v) => !v)}
              className="relative grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 transition"
              aria-label="Уведомления"
            >
              <Icon name="bell" size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-accent-red px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {showBell && (
              <div className="absolute right-0 top-[54px] w-[calc(100vw-2rem)] max-w-[360px] rounded-3xl border border-surface-line bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <h4 className="text-[16px] font-bold text-ink-900">Уведомления</h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsRead()}
                      className="text-xs font-semibold text-brand-500 hover:text-brand-600"
                    >
                      Прочитать всё
                    </button>
                  )}
                </div>
                <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto scroll-thin">
                  {notifications.length === 0 && (
                    <p className="py-6 text-center text-sm text-ink-500">Нет уведомлений.</p>
                  )}
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => !n.is_read && markNotificationRead(n.id)}
                      className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                        n.is_read
                          ? "border-surface-line bg-white"
                          : "border-brand-100 bg-brand-50 hover:bg-white"
                      }`}
                    >
                      <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.body}</p>
                      <p className="mt-1 text-[11px] text-ink-400">{relativeFromNow(n.created_at)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div ref={profileRef} className="relative">
            <button
              onClick={() => setShowProfile((v) => !v)}
              className="flex items-center gap-3 rounded-full border border-surface-line bg-white pl-1 pr-4 py-1 hover:bg-surface-muted"
            >
              <UserAvatar user={user} size={36} />
              <div className="hidden flex-col leading-tight text-left sm:flex">
                <span className="text-sm font-semibold text-ink-900">{user?.full_name}</span>
                <span className="text-xs text-ink-500">{ROLE_LABEL[user?.role || "employee"]}</span>
              </div>
              <Icon name="chevron-down" size={16} className="text-ink-400" />
            </button>
            {showProfile && (
              <div className="absolute right-0 top-[56px] w-[calc(100vw-2rem)] max-w-[240px] rounded-2xl border border-surface-line bg-white p-2 shadow-soft">
                <Link
                  to="/profile"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-900 hover:bg-surface-muted"
                >
                  <Icon name="user" size={16} className="text-ink-500" /> Личный кабинет
                </Link>
                {canOpenAdmin(user?.role) && (
                  <Link
                    to="/admin"
                    onClick={() => setShowProfile(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-900 hover:bg-surface-muted"
                  >
                    <Icon name="shield" size={16} className="text-ink-500" /> Админ панель
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-accent-red hover:bg-accent-redBg"
                >
                  <Icon name="logout" size={16} /> Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ to, active, children }: { to: string; active?: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? "bg-brand-50 text-brand-600" : "text-ink-500 hover:bg-surface-muted"
      }`}
    >
      {children}
    </NavLink>
  );
}
