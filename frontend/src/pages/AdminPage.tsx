import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useAppData } from "../store/AppData";
import type {
  AnalyticsData,
  AuditEntry,
  DashboardStats,
  ModerationItem,
  Project,
  Role,
  SecurityEvent,
  User,
} from "../types";
import { ROLE_CHIP, ROLE_LABEL, canOpenAdmin } from "../utils/roles";
import { relativeFromNow } from "../utils/format";
import { useLiveRefresh } from "../utils/liveRefresh";
import { Icon, IconName } from "../components/Icon";
import { ConfirmModal, Modal } from "../components/Modal";
import Breadcrumbs from "../components/Breadcrumbs";
import { UserAvatar } from "../components/UserAvatar";

const NAV: { key: string; label: string; icon: IconName; path: string }[] = [
  { key: "dashboard", label: "Дашборд", icon: "dashboard", path: "/admin" },
  { key: "users", label: "Пользователи", icon: "users", path: "/admin/users" },
  { key: "moderation", label: "Модерация", icon: "clock", path: "/admin/moderation" },
  { key: "projects", label: "Проекты", icon: "kanban", path: "/admin/projects" },
  { key: "analytics", label: "Аналитика", icon: "chart", path: "/admin/analytics" },
  { key: "security", label: "Безопасность", icon: "shield", path: "/admin/security" },
  { key: "audit", label: "Журнал действий", icon: "document", path: "/admin/audit" },
];

export default function AdminPage() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!canOpenAdmin(user?.role)) {
    return (
      <div className="mt-10 rounded-3xl border border-surface-line bg-white p-10 text-center text-ink-500 shadow-card">
        <Icon name="lock" size={40} className="mx-auto mb-3 text-ink-400" />
        Админ панель доступна только администраторам и модераторам.
      </div>
    );
  }

  const current = NAV.find((n) => n.path === pathname);

  return (
    <div className="pt-6">
      <Breadcrumbs
        items={[
          { label: "Главная", to: "/projects" },
          { label: "Администрирование", to: "/admin" },
          { label: current?.label || "Дашборд" },
        ]}
      />
      <div className="mt-4 grid gap-6 xl:grid-cols-[270px_1fr]">
        <aside className="h-fit rounded-[24px] border border-surface-line bg-white p-4 shadow-card">
          <h3 className="px-2 text-[18px] font-bold text-ink-900">Администрирование</h3>
          <p className="mt-0.5 px-2 text-xs text-ink-500">Единый центр управления платформой</p>
          <nav className="mt-3 flex flex-col gap-0.5">
            {NAV.filter((item) => !(item.key === "users" && user?.role !== "admin")).map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                end
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[15px] font-medium transition ${
                    isActive ? "bg-brand-50 text-brand-600" : "text-ink-900 hover:bg-surface-muted"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-2.5 h-7 w-1 rounded bg-brand-500" />}
                    <Icon name={item.icon} size={18} className={isActive ? "text-brand-600" : "text-ink-500"} />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="moderation" element={<ModerationPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Routes>
      </div>
    </div>
  );
}

/* -------------------- DASHBOARD -------------------- */

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { moderation, audit, reloadModeration, reloadAudit } = useAppData();

  const load = useCallback(() => {
    api.get<DashboardStats>("/api/admin/dashboard").then(setStats).catch(() => setStats(null));
    reloadModeration();
    reloadAudit();
  }, [reloadModeration, reloadAudit]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(load);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-bold text-ink-900">Оперативная картина по платформе</h1>
        <p className="mt-2 max-w-[820px] text-[16px] leading-relaxed text-ink-500">
          Контроль пользователей, модерация материалов, аудит действий и системные оповещения.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="users"
          bg="bg-brand-50"
          iconTone="text-brand-600"
          label="Активные пользователи"
          value={stats?.active_users ?? 0}
          delta={`+${stats?.users_delta_week ?? 0} за неделю`}
          deltaTone="text-brand-600"
        />
        <StatCard
          icon="kanban"
          bg="bg-accent-violetBg"
          iconTone="text-accent-violet"
          label="Проекты"
          value={stats?.projects ?? 0}
          delta={`${stats?.new_projects_month ?? 0} новых в этом месяце`}
          deltaTone="text-accent-violet"
        />
        <StatCard
          icon="clock"
          bg="bg-accent-amberBg"
          iconTone="text-accent-amber"
          label="На модерации"
          value={stats?.in_moderation ?? 0}
          delta={`${stats?.pending_approvals ?? 0} ожидают согласования`}
          deltaTone="text-accent-amber"
        />
        <StatCard
          icon="shield"
          bg="bg-accent-redBg"
          iconTone="text-accent-red"
          label="Сигналы безопасности"
          value={stats?.security_alerts ?? 0}
          delta={`${stats?.alerts_today ?? 0} требуют внимания сегодня`}
          deltaTone="text-accent-red"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <ModerationQueuePanel queue={moderation} onRefresh={reloadModeration} />
        <SystemSignals moderationCount={moderation.length} />
      </div>

      <section className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[22px] font-bold text-ink-900">
            <Icon name="document" size={18} className="text-brand-500" /> Журнал последних действий
          </h2>
          <Link to="/admin/audit" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-600">
            Весь журнал <Icon name="arrow-right" size={14} />
          </Link>
        </div>
        <ul className="mt-4 space-y-3 text-[15px] text-ink-900/90">
          {audit.slice(0, 10).map((entry) => (
            <li key={entry.id} className="grid grid-cols-1 gap-1 sm:grid-cols-[70px_160px_1fr_120px] sm:gap-3 items-start">
              <span className="text-ink-500">{entry.time}</span>
              <span className="truncate font-medium text-brand-600">{entry.user_name}</span>
              <span className="truncate">
                {entry.action}
                {entry.target ? ` — ${entry.target}` : ""}
              </span>
              <span className="justify-self-end text-xs text-ink-400">{entry.category}</span>
            </li>
          ))}
          {audit.length === 0 && <li className="text-sm text-ink-500">Пока нет событий.</li>}
        </ul>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  bg,
  iconTone,
  label,
  value,
  delta,
  deltaTone,
}: {
  icon: IconName;
  bg: string;
  iconTone: string;
  label: string;
  value: number;
  delta: string;
  deltaTone: string;
}) {
  return (
    <div className={`rounded-[22px] border border-surface-line ${bg} p-5`}>
      <div className={`grid h-10 w-10 place-items-center rounded-[14px] bg-white ${iconTone}`}>
        <Icon name={icon} size={18} />
      </div>
      <div className="mt-3 text-[13px] font-medium text-ink-500">{label}</div>
      <div className="mt-1 text-[26px] font-bold text-ink-900">{value}</div>
      <div className={`mt-1 text-[13px] font-medium ${deltaTone}`}>{delta}</div>
    </div>
  );
}

function ModerationQueuePanel({ queue, onRefresh }: { queue: ModerationItem[]; onRefresh: () => void }) {
  const { bump } = useAppData();
  const navigate = useNavigate();

  async function decide(articleId: number, decision: string, note?: string) {
    await api.post(`/api/admin/moderation/${articleId}`, { decision, note: note || "" });
    await onRefresh();
    bump();
  }

  return (
    <section className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[22px] font-bold text-ink-900">
          <Icon name="clock" size={18} className="text-accent-amber" /> Очередь модерации
        </h2>
        <Link to="/admin/moderation" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500 hover:text-brand-600">
          Открыть <Icon name="arrow-right" size={14} />
        </Link>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-surface-line">
        <table className="min-w-[720px] w-full text-left">
          <thead className="bg-brand-50 text-[13px] font-semibold text-ink-500">
            <tr>
              <th className="px-4 py-3">Материал</th>
              <th className="px-4 py-3">Автор</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Срок</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-line text-[14px] text-ink-900">
            {queue.slice(0, 6).map((item) => (
              <tr key={item.id} className="hover:bg-surface-muted/60">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-left font-medium text-ink-900 hover:text-brand-600"
                    onClick={() => navigate(`/projects/${item.project_id}/articles/${item.article_id}`)}
                  >
                    {item.title}
                  </button>
                  <p className="text-xs text-ink-500">{item.project_title}</p>
                </td>
                <td className="px-4 py-3 text-ink-500">{item.author_name}</td>
                <td className="px-4 py-3">
                  <StatusChip value={item.status} />
                </td>
                <td className="px-4 py-3 text-ink-500">{item.deadline}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => decide(item.article_id, "approve")}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-accent-greenBg text-accent-green hover:brightness-95"
                      title="Одобрить и опубликовать"
                    >
                      <Icon name="check" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const note = prompt("Комментарий для автора (необязательно):") || "";
                        decide(item.article_id, "request_changes", note);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-accent-amberBg text-accent-amber hover:brightness-95"
                      title="Отправить на доработку"
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Отклонить статью «${item.title}»?`)) decide(item.article_id, "reject");
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-accent-redBg text-accent-red hover:brightness-95"
                      title="Отклонить"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {queue.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-500">
                  Очередь пуста.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SystemSignals({ moderationCount }: { moderationCount: number }) {
  const signals: { title: string; subtitle: string; tone: "brand" | "red" | "amber"; icon: IconName }[] = [
    { title: "Сброс пароля для 2 пользователей", subtitle: "Выполнено · безопасность", tone: "brand", icon: "key" },
    { title: "Рост числа отказов входа", subtitle: "Требуется проверка · 4 события", tone: "red", icon: "warn" },
    {
      title: "Запросы на согласование",
      subtitle: `${moderationCount} ожидают проверки`,
      tone: "amber",
      icon: "clock",
    },
  ];
  const palette = { brand: "bg-brand-50 text-brand-600", red: "bg-accent-redBg text-accent-red", amber: "bg-accent-amberBg text-accent-amber" };
  return (
    <section className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
      <h2 className="flex items-center gap-2 text-[22px] font-bold text-ink-900">
        <Icon name="bolt" size={18} className="text-brand-500" /> Системные сигналы
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        {signals.map((s) => (
          <div key={s.title} className="flex items-start gap-3 rounded-2xl border border-surface-line p-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${palette[s.tone]}`}>
              <Icon name={s.icon} size={16} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-ink-900">{s.title}</p>
              <p className="mt-0.5 text-[13px] text-ink-500">{s.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusChip({ value }: { value: string }) {
  const map: Record<string, string> = {
    "На проверке": "bg-accent-amberBg text-accent-amber",
    "Требует правок": "bg-accent-redBg text-accent-red",
    "Готово к публикации": "bg-accent-greenBg text-accent-green",
    Опубликовано: "bg-accent-greenBg text-accent-green",
    "В архиве": "bg-surface-muted text-ink-500",
  };
  return <span className={`chip ${map[value] || "bg-surface-muted text-ink-500"}`}>{value}</span>;
}


function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "disabled">("all");
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [viewing, setViewing] = useState<User | null>(null);

  const load = useCallback(() => {
    api.get<User[]>("/api/admin/users").then(setUsers);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users.filter((u) => {
      if (filterRole !== "all" && u.role !== filterRole) return false;
      if (filterStatus === "active" && !u.is_active) return false;
      if (filterStatus === "disabled" && u.is_active) return false;
      if (!s) return true;
      return (
        u.full_name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.department || "").toLowerCase().includes(s) ||
        (u.position || "").toLowerCase().includes(s)
      );
    });
  }, [users, q, filterRole, filterStatus]);

  const isAdmin = user?.role === "admin";
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: users.length };
    for (const u of users) c[u.role] = (c[u.role] || 0) + 1;
    return c;
  }, [users]);

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-ink-900">Пользователи</h1>
            <p className="mt-1 text-sm text-ink-500">
              Всего: {users.length} · активных: {users.filter((u) => u.is_active).length} · отключено: {users.filter((u) => !u.is_active).length}
            </p>
          </div>
          {isAdmin && (
            <button onClick={() => setCreating(true)} className="btn-primary">
              <Icon name="plus" size={16} className="mr-2" /> Новый пользователь
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex h-[42px] w-full max-w-[360px] flex-1 items-center gap-2 rounded-2xl border border-surface-line bg-surface-muted px-3 text-sm text-ink-400">
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по имени, почте, отделу или должности"
              className="h-full flex-1 bg-transparent text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as Role | "all")}
            className="input h-[42px] w-full sm:w-[200px]"
          >
            <option value="all">Все роли ({counts.all || 0})</option>
            {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]} ({counts[role] || 0})
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="input h-[42px] w-full sm:w-[160px]"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="disabled">Отключённые</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[26px] border border-surface-line bg-white shadow-card">
        <table className="min-w-[960px] w-full text-left">
          <thead className="bg-brand-50 text-[13px] font-semibold text-ink-500">
            <tr>
              <th className="px-4 py-3">Сотрудник</th>
              <th className="px-4 py-3">Почта</th>
              <th className="px-4 py-3">Роль</th>
              <th className="px-4 py-3">Отдел / должность</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-line text-[14px] text-ink-900">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-surface-muted/60">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setViewing(u)}
                    className="flex items-center gap-3 text-left"
                  >
                    <UserAvatar user={u} size={36} />
                    <div>
                      <p className="font-semibold">{u.full_name}</p>
                      <p className="text-xs text-ink-500">ID · {u.id}</p>
                    </div>
                  </button>
                </td>
                <td className="px-4 py-3 text-ink-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`chip ${ROLE_CHIP[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {u.department || "—"}
                  {u.position && <span className="text-ink-400"> · {u.position}</span>}
                </td>
                <td className="px-4 py-3 text-ink-500">{u.phone || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`chip ${u.is_active ? "bg-accent-greenBg text-accent-green" : "bg-accent-redBg text-accent-red"}`}
                  >
                    <span
                      className={`mr-1.5 h-1.5 w-1.5 rounded-full ${u.is_active ? "bg-accent-green" : "bg-accent-red"}`}
                    />
                    {u.is_active ? "Активен" : "Отключён"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setViewing(u)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-brand-50 hover:text-brand-600"
                      title="Карточка"
                    >
                      <Icon name="eye" size={14} />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(u)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-brand-50 hover:text-brand-600"
                          title="Редактировать"
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetTarget(u)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-accent-amberBg hover:text-accent-amber"
                          title="Сбросить пароль"
                        >
                          <Icon name="key" size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(u)}
                          disabled={u.id === user?.id}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-accent-redBg hover:text-accent-red disabled:cursor-not-allowed disabled:opacity-40"
                          title="Удалить"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-500">
                  Пользователи не найдены.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <UserDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={async () => {
          setCreating(false);
          load();
        }}
      />
      <UserDialog
        open={!!editing}
        user={editing || undefined}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          load();
        }}
      />
      <UserDetailDialog
        user={viewing}
        onClose={() => setViewing(null)}
        onEdit={() => {
          if (viewing) setEditing(viewing);
          setViewing(null);
        }}
      />
      <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />
      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить пользователя?"
        description={`Учётная запись «${deleteTarget?.full_name}» будет удалена без возможности восстановления.`}
        destructive
        confirmLabel="Удалить"
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await api.del(`/api/admin/users/${deleteTarget.id}`);
          load();
        }}
      />
    </section>
  );
}

interface UserProject {
  membership_id: number;
  project_id: number;
  title: string;
  color: string;
  project_role: string;
}

function UserDetailDialog({ user, onClose, onEdit }: { user: User | null; onClose: () => void; onEdit: () => void }) {
  const [memberships, setMemberships] = useState<UserProject[]>([]);

  useEffect(() => {
    if (user) {
      api
        .get<UserProject[]>(`/api/admin/users/${user.id}/projects`)
        .then(setMemberships)
        .catch(() => setMemberships([]));
    } else {
      setMemberships([]);
    }
  }, [user]);

  if (!user) return null;
  return (
    <Modal open={!!user} onClose={onClose} title="Карточка пользователя" size="lg">
      <div className="grid gap-5 md:grid-cols-[160px_1fr]">
        <div className="flex flex-col items-center gap-2">
          <UserAvatar user={user} size={120} className="ring-4 ring-brand-50" />
          <span className={`chip ${ROLE_CHIP[user.role]}`}>{ROLE_LABEL[user.role]}</span>
          <span
            className={`chip ${user.is_active ? "bg-accent-greenBg text-accent-green" : "bg-accent-redBg text-accent-red"}`}
          >
            {user.is_active ? "Активен" : "Отключён"}
          </span>
        </div>
        <div>
          <h3 className="text-[22px] font-bold text-ink-900">{user.full_name}</h3>
          <p className="mt-0.5 text-sm text-ink-500">{user.email}</p>
          <dl className="mt-4 grid gap-2 text-sm">
            <DetailRow icon="mail" label="Почта" value={user.email} />
            <DetailRow icon="users" label="Отдел" value={user.department || "—"} />
            <DetailRow icon="user" label="Должность" value={user.position || "—"} />
            <DetailRow icon="bell" label="Телефон" value={user.phone || "—"} />
          </dl>
          {user.about && (
            <div className="mt-4 rounded-2xl bg-surface-muted p-3 text-sm text-ink-900/90">
              <p className="text-xs font-medium text-ink-500">О сотруднике</p>
              <p className="mt-1 leading-relaxed">{user.about}</p>
            </div>
          )}
          <h4 className="mt-5 flex items-center gap-2 text-[15px] font-bold text-ink-900">
            <Icon name="kanban" size={14} className="text-brand-500" /> Проекты сотрудника
          </h4>
          <ul className="mt-2 space-y-2">
            {memberships.map((m) => (
              <li key={m.membership_id} className="flex items-center gap-3 rounded-xl border border-surface-line p-2">
                <span className="h-8 w-8 rounded-lg" style={{ background: m.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{m.title}</p>
                  <p className="text-xs text-ink-500">{m.project_role}</p>
                </div>
                <Link
                  to={`/projects/${m.project_id}`}
                  className="text-xs font-semibold text-brand-500 hover:text-brand-600"
                  onClick={onClose}
                >
                  открыть →
                </Link>
              </li>
            ))}
            {memberships.length === 0 && (
              <li className="rounded-xl border border-dashed border-surface-line p-3 text-center text-xs text-ink-500">
                Пользователь не состоит ни в одном проекте
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Закрыть
        </button>
        <button type="button" className="btn-primary" onClick={onEdit}>
          <Icon name="edit" size={14} className="mr-2" /> Редактировать
        </button>
      </div>
    </Modal>
  );
}

function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-muted p-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-brand-500">
        <Icon name={icon} size={14} />
      </div>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{label}</dt>
        <dd className="truncate text-[14px] font-semibold text-ink-900">{value}</dd>
      </div>
    </div>
  );
}

function UserDialog({
  open,
  user,
  onClose,
  onSaved,
}: {
  open: boolean;
  user?: User;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [about, setAbout] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (user) {
      setEmail(user.email);
      setFullName(user.full_name);
      setRole(user.role);
      setDepartment(user.department || "");
      setPosition(user.position || "");
      setPhone(user.phone || "");
      setAbout(user.about || "");
      setIsActive(user.is_active);
      setPassword("");
    } else {
      setEmail("");
      setFullName("");
      setRole("employee");
      setDepartment("");
      setPosition("");
      setPhone("");
      setAbout("");
      setIsActive(true);
      setPassword("");
    }
    setError(null);
  }, [open, user]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (user) {
        await api.put(`/api/admin/users/${user.id}`, {
          full_name: fullName,
          role,
          department: department || null,
          position: position || null,
          phone: phone || null,
          about,
          is_active: isActive,
        });
      } else {
        await api.post("/api/admin/users", {
          email,
          full_name: fullName,
          password,
          role,
          department: department || null,
          position: position || null,
          phone: phone || null,
        });
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить пользователя");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={user ? "Редактировать пользователя" : "Новый пользователь"}
      description={
        user ? "Обновите роль, контакты, доступ и описание сотрудника." : "Создайте аккаунт для сотрудника."
      }
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="field-label">ФИО</label>
          <input required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        {!user && (
          <>
            <div>
              <label className="field-label">Почта</label>
              <input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Пароль</label>
              <input required minLength={4} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </>
        )}
        <div>
          <label className="field-label">Роль</label>
          <select className="input h-[48px]" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Телефон</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" />
        </div>
        <div>
          <label className="field-label">Отдел</label>
          <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Должность</label>
          <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="field-label">О сотруднике</label>
          <textarea
            className="input min-h-[100px]"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Чем занимается сотрудник, зона ответственности."
          />
        </div>
        {user && (
          <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-surface-line bg-surface-muted p-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-5 w-5 rounded-md border-surface-line text-brand-500"
            />
            <span className="text-sm font-medium text-ink-900">Учётная запись активна</span>
          </label>
        )}
        {error && (
          <div className="md:col-span-2 flex items-center gap-2 rounded-2xl bg-accent-redBg px-4 py-3 text-sm text-accent-red">
            <Icon name="warn" size={14} /> {error}
          </div>
        )}
        <div className="md:col-span-2 mt-2 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
            <Icon name="save" size={14} className="mr-2" />
            {submitting ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setPassword("");
      setError(null);
    }
  }, [user]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/admin/users/${user.id}/password`, { new_password: password });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сменить пароль");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={!!user}
      title="Сброс пароля"
      description={`Назначение нового пароля для ${user?.full_name || ""}.`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="field-label">Новый пароль</label>
          <input required minLength={4} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-accent-red">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
            {submitting ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------- MODERATION -------------------- */

function ModerationPage() {
  const { moderation, reloadModeration, bump } = useAppData();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<"all" | "review" | "draft">("all");
  const [noteTarget, setNoteTarget] = useState<ModerationItem | null>(null);

  useEffect(() => {
    reloadModeration();
  }, [reloadModeration]);

  const filtered = moderation.filter((m) => {
    if (filterStatus === "review") return m.status === "На проверке";
    if (filterStatus === "draft") return m.status === "Требует правок";
    return true;
  });

  async function decide(articleId: number, decision: string, note?: string) {
    await api.post(`/api/admin/moderation/${articleId}`, { decision, note: note || "" });
    await reloadModeration();
    bump();
  }

  return (
    <section className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-ink-900">Модерация</h1>
          <p className="mt-1 text-sm text-ink-500">Материалы, ожидающие согласования или правок.</p>
        </div>
        <div className="flex gap-2">
          {[
            { id: "all" as const, label: "Все" },
            { id: "review" as const, label: "На проверке" },
            { id: "draft" as const, label: "Требуют правок" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterStatus(f.id)}
              className={`h-9 rounded-full border px-4 text-sm font-medium transition ${
                filterStatus === f.id ? "border-brand-100 bg-brand-50 text-brand-600" : "border-surface-line bg-white text-ink-500 hover:bg-surface-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-2xl border border-surface-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name="document" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${item.project_id}/articles/${item.article_id}`)}
                    className="text-left text-[16px] font-semibold text-ink-900 hover:text-brand-600"
                  >
                    {item.title}
                  </button>
                  <p className="mt-0.5 text-[13px] text-ink-500 line-clamp-1">{item.summary}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-ink-400">
                    <span className="flex items-center gap-1">
                      <Icon name="kanban" size={12} /> {item.project_title}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="user" size={12} /> {item.author_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="clock" size={12} /> {relativeFromNow(item.updated_at)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip value={item.status} />
                <button
                  type="button"
                  onClick={() => decide(item.article_id, "approve")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-greenBg px-3 text-sm font-semibold text-accent-green hover:brightness-95"
                >
                  <Icon name="check" size={14} /> Одобрить
                </button>
                <button
                  type="button"
                  onClick={() => setNoteTarget(item)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-amberBg px-3 text-sm font-semibold text-accent-amber hover:brightness-95"
                >
                  <Icon name="edit" size={14} /> Доработка
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Отклонить «${item.title}»?`)) decide(item.article_id, "reject");
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-redBg px-3 text-sm font-semibold text-accent-red hover:brightness-95"
                >
                  <Icon name="x" size={14} /> Отклонить
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Icon name="check" size={40} className="mx-auto mb-3 text-accent-green" />
            <p className="text-sm text-ink-500">Отлично, все материалы проверены.</p>
          </div>
        )}
      </div>

      <Modal
        open={!!noteTarget}
        title="Отправить на доработку"
        description={noteTarget ? `Комментарий будет добавлен к статье «${noteTarget.title}».` : ""}
        onClose={() => setNoteTarget(null)}
      >
        <NoteForm
          onSubmit={async (note) => {
            if (noteTarget) await decide(noteTarget.article_id, "request_changes", note);
            setNoteTarget(null);
          }}
          onCancel={() => setNoteTarget(null)}
        />
      </Modal>
    </section>
  );
}

function NoteForm({ onSubmit, onCancel }: { onSubmit: (note: string) => void | Promise<void>; onCancel: () => void }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onSubmit(note);
        setSubmitting(false);
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <label className="field-label">Комментарий автору</label>
        <textarea
          className="input min-h-[110px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Например: дополните раздел 2, добавьте пример кода."
          required
        />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Отмена
        </button>
        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
          {submitting ? "Отправляем…" : "Отправить"}
        </button>
      </div>
    </form>
  );
}

/* -------------------- PROJECTS -------------------- */

function ProjectsPage() {
  const { projects, reloadProjects } = useAppData();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  useEffect(() => {
    reloadProjects();
  }, [reloadProjects]);

  const isAdmin = user?.role === "admin" || user?.role === "moderator";

  return (
    <section className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-ink-900">Проекты</h1>
          <p className="mt-1 text-sm text-ink-500">Обзор и управление всеми проектами платформы.</p>
        </div>
        <Link to="/projects" className="btn-secondary">
          <Icon name="arrow-right" size={14} className="mr-2" /> Перейти на платформу
        </Link>
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-surface-line">
        <table className="min-w-[760px] w-full text-left">
          <thead className="bg-brand-50 text-[13px] font-semibold text-ink-500">
            <tr>
              <th className="px-4 py-3">Проект</th>
              <th className="px-4 py-3">Статьи</th>
              <th className="px-4 py-3">Участники</th>
              <th className="px-4 py-3">Приоритет</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-line text-[14px] text-ink-900">
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-surface-muted/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl" style={{ background: p.color }} />
                    <div>
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-xs text-ink-500 line-clamp-1">{p.description || p.subtitle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{p.articles_count}</td>
                <td className="px-4 py-3">{p.members_count}</td>
                <td className="px-4 py-3">
                  {p.is_priority ? (
                    <span className="chip bg-accent-amberBg text-accent-amber">
                      <Icon name="bolt" size={12} className="mr-1" /> высокий
                    </span>
                  ) : (
                    <span className="text-ink-400">обычный</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link
                      to={`/projects/${p.id}`}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-brand-50 hover:text-brand-600"
                      title="Открыть проект"
                    >
                      <Icon name="arrow-right" size={14} />
                    </Link>
                    {isAdmin && user?.role === "admin" && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-accent-redBg hover:text-accent-red"
                        title="Удалить проект"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-500">
                  Проектов пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить проект?"
        description={`Будет удалён проект «${deleteTarget?.title}» и все связанные с ним материалы. Действие необратимо.`}
        destructive
        confirmLabel="Удалить"
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await api.del(`/api/projects/${deleteTarget.id}`);
          reloadProjects();
        }}
      />
    </section>
  );
}

/* -------------------- ANALYTICS -------------------- */

function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    api.get<AnalyticsData>("/api/admin/analytics").then(setData).catch(() => setData(null));
  }, []);

  const maxActivity = useMemo(() => Math.max(1, ...(data?.activity.map((d) => d.events) ?? [1])), [data]);
  const statusLabels: Record<string, { label: string; color: string }> = {
    published: { label: "Опубликовано", color: "#1E9E74" },
    review: { label: "На согласовании", color: "#6C5CE7" },
    draft: { label: "Черновик", color: "#F4B53F" },
    archived: { label: "В архиве", color: "#94A3B8" },
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
        <h1 className="text-[28px] font-bold text-ink-900">Аналитика</h1>
        <p className="mt-1 text-sm text-ink-500">Ключевые показатели использования базы знаний.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Активность по дням" icon="chart">
          <div className="flex h-[220px] items-end gap-2">
            {(data?.activity ?? []).map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-xl bg-gradient-to-t from-brand-500 to-brand-600"
                  style={{ height: `${(d.events / maxActivity) * 180}px`, minHeight: 4 }}
                  title={`${d.events} событий`}
                />
                <span className="text-[11px] text-ink-500">
                  {new Date(d.day).toLocaleDateString("ru-RU", { weekday: "short" })}
                </span>
              </div>
            ))}
            {(!data || data.activity.length === 0) && <p className="text-sm text-ink-500">Пока нет данных за неделю.</p>}
          </div>
        </Panel>

        <Panel title="Пользователи по ролям" icon="users">
          <ul className="space-y-3">
            {Object.entries(data?.roles ?? {}).map(([role, count]) => {
              const total = Object.values(data?.roles ?? {}).reduce((a, b) => a + b, 0) || 1;
              const percent = Math.round((count / total) * 100);
              return (
                <li key={role}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-900">{ROLE_LABEL[role as Role]}</span>
                    <span className="text-ink-500">
                      {count} · {percent}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            })}
            {!data && <li className="text-sm text-ink-500">Загрузка…</li>}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Статьи по статусам" icon="document">
          <ul className="space-y-2">
            {Object.entries(data?.statuses ?? {}).map(([status, count]) => {
              const info = statusLabels[status] || { label: status, color: "#94A3B8" };
              return (
                <li key={status} className="flex items-center justify-between rounded-xl border border-surface-line p-3">
                  <span className="flex items-center gap-2 font-medium text-ink-900">
                    <span className="h-3 w-3 rounded-full" style={{ background: info.color }} />
                    {info.label}
                  </span>
                  <span className="text-[18px] font-bold text-brand-600">{count}</span>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Наполнение проектов" icon="kanban">
          <ul className="space-y-2">
            {(data?.top_projects ?? []).map((p) => {
              const max = Math.max(1, ...(data?.top_projects ?? []).map((pp) => pp.articles));
              const width = Math.max(4, (p.articles / max) * 100);
              return (
                <li key={p.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-900">{p.title}</span>
                    <span className="text-ink-500">{p.articles}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full" style={{ width: `${width}%`, background: p.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </section>
  );
}

function Panel({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-surface-line bg-white p-5 shadow-card">
      <h3 className="flex items-center gap-2 text-[18px] font-bold text-ink-900">
        <Icon name={icon} size={16} className="text-brand-500" /> {title}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* -------------------- SECURITY -------------------- */

function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  useEffect(() => {
    api.get<SecurityEvent[]>("/api/admin/security").then(setEvents);
  }, []);
  return (
    <section className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-redBg text-accent-red">
          <Icon name="shield" size={22} />
        </div>
        <div>
          <h1 className="text-[28px] font-bold text-ink-900">Безопасность</h1>
          <p className="text-sm text-ink-500">События авторизации, смены паролей и административных действий.</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-3 rounded-2xl border border-surface-line bg-white p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-redBg text-accent-red">
              <Icon name="key" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-ink-900">{e.action}</p>
              <p className="mt-0.5 text-xs text-ink-500">
                {e.user} · {new Date(e.time).toLocaleString("ru-RU")}
                {e.target ? ` · ${e.target}` : ""}
              </p>
            </div>
          </li>
        ))}
        {events.length === 0 && (
          <li className="py-10 text-center text-sm text-ink-500">Событий безопасности не зафиксировано.</li>
        )}
      </ul>
    </section>
  );
}

/* -------------------- AUDIT -------------------- */

function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [q, setQ] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "контент" | "безопасность" | "проекты">("all");

  useEffect(() => {
    api.get<AuditEntry[]>("/api/admin/audit?limit=200").then(setEntries);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      if (!s) return true;
      return e.user_name.toLowerCase().includes(s) || e.action.toLowerCase().includes(s) || (e.target || "").toLowerCase().includes(s);
    });
  }, [entries, q, filterCategory]);

  const categoryIcon: Record<string, IconName> = {
    контент: "document",
    безопасность: "shield",
    проекты: "kanban",
    general: "bolt",
  };
  const categoryTone: Record<string, string> = {
    контент: "bg-brand-50 text-brand-600",
    безопасность: "bg-accent-redBg text-accent-red",
    проекты: "bg-accent-violetBg text-accent-violet",
    general: "bg-surface-muted text-ink-500",
  };

  return (
    <section className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-ink-900">Журнал действий</h1>
          <p className="mt-1 text-sm text-ink-500">Полная лента событий платформы.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-[42px] w-full sm:w-[260px] items-center gap-2 rounded-2xl border border-surface-line bg-surface-muted px-3 text-sm text-ink-400">
            <Icon name="search" size={14} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по действию или пользователю"
              className="h-full flex-1 bg-transparent text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}
            className="input h-[42px] w-full sm:w-[200px]"
          >
            <option value="all">Все категории</option>
            <option value="контент">Контент</option>
            <option value="безопасность">Безопасность</option>
            <option value="проекты">Проекты</option>
          </select>
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {filtered.map((e) => (
          <li key={e.id} className="flex items-start gap-3 rounded-2xl border border-surface-line bg-white p-4">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${categoryTone[e.category] || "bg-surface-muted text-ink-500"}`}>
              <Icon name={categoryIcon[e.category] || "document"} size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-ink-900">{e.action}{e.target ? ` — ${e.target}` : ""}</p>
              <p className="mt-0.5 text-xs text-ink-500">
                <span className="font-medium text-brand-600">{e.user_name}</span> · {e.time} · {e.category}
              </p>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-10 text-center text-sm text-ink-500">Записи не найдены.</li>
        )}
      </ul>
    </section>
  );
}
