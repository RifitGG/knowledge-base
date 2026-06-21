import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useAppData } from "../store/AppData";
import type { Project } from "../types";
import { canManageProjects } from "../utils/roles";
import { Icon, IconName } from "../components/Icon";
import { Modal } from "../components/Modal";
import Breadcrumbs from "../components/Breadcrumbs";

const PROJECT_COLORS = ["#2959B8", "#6C5CE7", "#1E9E74", "#F4B53F", "#F0445C", "#14B8A6"];

export default function ProjectSelectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projects, reloadProjects, audit, moderation, projectScope, setProjectScope } = useAppData();
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const privileged = canManageProjects(user?.role);

  const visible = useMemo(() => {
    let arr = projects;
    if (priorityOnly) arr = arr.filter((p) => p.is_priority);
    return arr;
  }, [projects, priorityOnly]);

  const totals = useMemo(
    () => ({
      projects: projects.length,
      articles: projects.reduce((acc, p) => acc + p.articles_count, 0),
      moderation: moderation.length,
    }),
    [projects, moderation]
  );

  const updates = useMemo(() => {
    if (audit.length > 0) return audit.slice(0, 5);
    return [
      { id: 1, time: "Сегодня", user_name: "Модератор", action: "Обновлён раздел «Архитектура»", target: "Desktop-приложение", category: "контент" },
      { id: 2, time: "Сегодня", user_name: "Старший сотрудник", action: "Новая статья по UX/UI гайду", target: "UX и дизайн", category: "контент" },
      { id: 3, time: "Вчера", user_name: "Визирование", action: "Запрошено согласование инструкции", target: "Документация API", category: "контент" },
    ];
  }, [audit]);

  return (
    <div className="pt-6">
      <Breadcrumbs items={[{ label: "Главная", to: "/projects" }, { label: "Выбор проекта" }]} />

      <HeroCard
        name={user?.full_name || "Пользователь"}
        stats={{ projects: totals.projects, articles: totals.articles, moderation: totals.moderation }}
      />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {canManageProjects(user?.role) && (
          <button
            className="inline-flex h-[48px] items-center gap-2 rounded-2xl bg-brand-50 px-5 text-base font-semibold text-brand-600 hover:bg-brand-100 transition"
            onClick={() => setShowNew(true)}
          >
            <Icon name="plus" size={18} /> Новый проект
          </button>
        )}
        <FilterChip
          active={projectScope === "mine"}
          tone="brand"
          icon="star"
          onClick={() => setProjectScope("mine")}
        >
          Мои проекты
        </FilterChip>
        {privileged && (
          <FilterChip
            active={projectScope === "all"}
            tone="red"
            icon="grid"
            onClick={() => setProjectScope("all")}
          >
            Все проекты
          </FilterChip>
        )}
        <FilterChip
          active={priorityOnly}
          tone="amber"
          icon="bolt"
          onClick={() => setPriorityOnly((v) => !v)}
        >
          Высокий приоритет
        </FilterChip>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={() => navigate(`/projects/${project.id}`)} />
          ))}
          {visible.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-surface-line bg-white p-10 text-center">
              <Icon name="kanban" size={40} className="mx-auto mb-3 text-ink-400" />
              <p className="text-ink-500">
                {projectScope === "mine"
                  ? "У вас пока нет назначенных проектов. Обратитесь к старшему сотруднику или администратору."
                  : "Подходящих проектов не найдено. Измените фильтр."}
              </p>
            </div>
          )}
        </div>

        <UpdatesPanel entries={updates} />
      </div>

      <NewProjectDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={async () => {
          await reloadProjects();
          setShowNew(false);
        }}
      />
    </div>
  );
}

function HeroCard({ name, stats }: { name: string; stats: { projects: number; articles: number; moderation: number } }) {
  return (
    <section
      className="relative mt-4 overflow-hidden rounded-[30px] p-6 text-white sm:p-8 lg:p-10"
      style={{ background: "linear-gradient(135deg, #17305E 0%, #1C408C 55%, #2959B8 100%)" }}
    >
      <div className="absolute -top-16 right-10 h-[260px] w-[260px] rounded-full bg-white/10" />
      <div className="absolute -bottom-6 right-48 h-[110px] w-[110px] rounded-full bg-white/15" />

      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-[620px]">
          <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">Добро пожаловать, {name}</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-brand-100 sm:text-[17px]">
            Выберите проект, в рамках которого хотите работать. Система показывает актуальные материалы,
            статусы задач и последние обновления.
          </p>
        </div>
        <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-3">
          <HeroStat icon="kanban" label="Активные проекты" value={stats.projects} />
          <HeroStat icon="document" label="Материалы" value={stats.articles} />
          <HeroStat icon="clock" label="На согласовании" value={stats.moderation} />
        </div>
      </div>
    </section>
  );
}

function HeroStat({ icon, label, value }: { icon: "kanban" | "document" | "clock"; label: string; value: number }) {
  return (
    <div className="h-[82px] w-full rounded-[18px] bg-white px-4 py-3 text-ink-900">
      <div className="flex items-center gap-2 text-xs font-medium text-ink-500">
        <Icon name={icon} size={14} /> {label}
      </div>
      <div className="mt-1 text-[24px] font-bold leading-tight text-brand-600">{value}</div>
    </div>
  );
}

function FilterChip({
  children,
  active,
  tone,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  tone: "brand" | "red" | "amber";
  icon?: IconName;
  onClick: () => void;
}) {
  const tones: Record<string, string> = {
    brand: active ? "bg-brand-50 text-brand-600 border-brand-100" : "bg-white text-ink-500 border-surface-line hover:bg-surface-muted",
    red: active ? "bg-accent-redBg text-accent-red border-accent-redBg" : "bg-white text-ink-500 border-surface-line hover:bg-surface-muted",
    amber: active ? "bg-accent-amberBg text-accent-amber border-accent-amberBg" : "bg-white text-ink-500 border-surface-line hover:bg-surface-muted",
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-[36px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${tones[tone]}`}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group flex h-[240px] flex-col rounded-3xl border border-surface-line bg-white p-5 text-left shadow-sm hover:shadow-soft hover:-translate-y-0.5 transition"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-[18px] text-white"
          style={{ background: project.color }}
        >
          <Icon name="kanban" size={26} />
        </div>
        {project.is_priority && (
          <span className="chip bg-accent-amberBg text-accent-amber">
            <Icon name="bolt" size={12} className="mr-1" /> приоритет
          </span>
        )}
      </div>
      <h3 className="mt-5 text-[22px] font-bold leading-tight text-ink-900 group-hover:text-brand-600 transition">
        {project.title}
      </h3>
      <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-ink-500">
        {project.description || project.subtitle}
      </p>
      <div className="mt-auto flex items-center justify-between pt-4 text-[13px] font-medium text-brand-600">
        <span className="flex items-center gap-3 text-ink-500">
          <span className="flex items-center gap-1">
            <Icon name="document" size={13} /> {project.articles_count}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="users" size={13} /> {project.members_count}
          </span>
        </span>
        <span className="flex items-center gap-1 text-brand-600/90">
          Открыть <Icon name="arrow-right" size={14} />
        </span>
      </div>
    </button>
  );
}

function UpdatesPanel({
  entries,
}: {
  entries: { id: number; action: string; user_name: string; time: string; target?: string; category: string }[];
}) {
  const colors: Record<string, string> = {
    контент: "#2959B8",
    проекты: "#6C5CE7",
    безопасность: "#F0445C",
    профиль: "#1E9E74",
    general: "#1E9E74",
  };
  return (
    <aside className="flex flex-col gap-4 rounded-3xl border border-surface-line bg-white p-6 shadow-card">
      <h3 className="flex items-center gap-2 text-[22px] font-bold text-ink-900">
        <Icon name="bolt" size={18} className="text-brand-500" /> Последние обновления
      </h3>
      <div className="flex flex-col gap-3">
        {entries.slice(0, 5).map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-surface-line bg-white p-3">
            <span
              className="mt-1 h-[56px] w-[6px] rounded-full"
              style={{ background: colors[entry.category] || "#2959B8" }}
            />
            <div className="flex-1">
              <p className="text-[15px] font-semibold leading-snug text-ink-900">{entry.action}</p>
              <p className="mt-1 text-[13px] text-ink-500">
                {entry.time} · {entry.user_name}
                {entry.target ? ` · ${entry.target}` : ""}
              </p>
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="py-4 text-sm text-ink-500">Обновлений пока нет.</p>}
      </div>
      <h4 className="mt-2 text-[18px] font-bold text-ink-900">Быстрые действия</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          to="/projects"
          className="inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-brand-500 text-base font-semibold text-white hover:bg-brand-600 transition"
        >
          <Icon name="kanban" size={16} /> К проектам
        </Link>
        <Link
          to="/admin/moderation"
          className="inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl border border-surface-line bg-white text-base font-semibold text-ink-900 hover:bg-surface-muted transition"
        >
          <Icon name="clock" size={16} /> Задачи
        </Link>
      </div>
    </aside>
  );
}

function NewProjectDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#2959B8");
  const [isPriority, setIsPriority] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const project = await api.post<Project>("/api/projects", {
        title,
        subtitle,
        description,
        color,
        is_priority: isPriority,
      });
      onCreated(project);
      setTitle("");
      setSubtitle("");
      setDescription("");
      setColor("#2959B8");
      setIsPriority(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать проект");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Новый проект"
      description="Создайте пространство для работы команды и материалов."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="field-label">Название</label>
          <input required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Подзаголовок</label>
          <input className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Описание</label>
          <textarea className="input min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Цвет проекта</label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`h-10 w-10 rounded-xl border-2 transition ${color === c ? "border-ink-900 scale-110" : "border-transparent"}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-ink-900">
          <input
            type="checkbox"
            className="h-5 w-5 rounded-md border-surface-line text-brand-500"
            checked={isPriority}
            onChange={(e) => setIsPriority(e.target.checked)}
          />
          Отметить как высокий приоритет
        </label>
        {error && <p className="text-sm text-accent-red">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
            {submitting ? "Создаём…" : "Создать"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
