import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAppData } from "../store/AppData";
import { useAuth } from "../auth/AuthContext";
import type { ArticleShort, Project, ProjectMember, Section, SectionNode, User } from "../types";
import { canEditArticles, canManageProjects } from "../utils/roles";
import { statusChip, relativeFromNow } from "../utils/format";
import { Icon, IconName } from "../components/Icon";
import { Modal, ConfirmModal } from "../components/Modal";
import Breadcrumbs from "../components/Breadcrumbs";
import KnowledgeTree, { sectionIcon } from "../components/KnowledgeTree";

const SECTION_ICONS: IconName[] = ["folder", "book", "cube", "palette", "code", "chat", "sparkles", "settings", "info", "lightbulb", "monitor", "server", "link", "star", "bolt", "document"];
const SECTION_COLORS = ["#2959B8", "#6C5CE7", "#1E9E74", "#F4B53F", "#F0445C", "#14B8A6"];

export default function ProjectInsidePage() {
  const { projectId } = useParams();
  const pid = Number(projectId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reloadProjects } = useAppData();
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<SectionNode[]>([]);
  const [articles, setArticles] = useState<ArticleShort[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [sectionDialog, setSectionDialog] = useState<{ parentId: number | null; editing?: SectionNode } | null>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SectionNode | null>(null);

  const canManage = canManageProjects(user?.role);
  const canEdit = canEditArticles(user?.role);

  const loadProject = useCallback(async () => {
    if (!pid) return;
    const [p, t, a, m] = await Promise.all([
      api.get<Project>(`/api/projects/${pid}`),
      api.get<SectionNode[]>(`/api/projects/${pid}/tree`),
      api.get<ArticleShort[]>(`/api/articles?project_id=${pid}`),
      api.get<ProjectMember[]>(`/api/projects/${pid}/members`),
    ]);
    setProject(p);
    setTree(t);
    setArticles(a);
    setMembers(m);
  }, [pid]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (canManage && membersDialogOpen && allUsers.length === 0) {
      api.get<User[]>("/api/admin/users").then(setAllUsers).catch(() => {});
    }
  }, [canManage, membersDialogOpen, allUsers.length]);

  const flatSections = useMemo(() => flatten(tree), [tree]);

  const activeNode = useMemo(() => flatSections.find((s) => s.id === activeSection) || null, [flatSections, activeSection]);

  const sectionArticles = useMemo(() => {
    if (activeSection === null) return articles;
    return articles.filter((a) => a.section_id === activeSection);
  }, [articles, activeSection]);

  const pinned = useMemo(() => articles.filter((a) => a.is_pinned), [articles]);

  async function handleSaveSection(payload: { title: string; icon: string; color: string; parentId: number | null; sectionId?: number }) {
    if (payload.sectionId) {
      await api.put<Section>(`/api/projects/sections/${payload.sectionId}`, {
        title: payload.title,
        icon: payload.icon,
        color: payload.color,
        parent_id: payload.parentId,
      });
    } else {
      await api.post<Section>(`/api/projects/${pid}/sections`, {
        title: payload.title,
        icon: payload.icon,
        color: payload.color,
        parent_id: payload.parentId,
      });
    }
    await loadProject();
    await reloadProjects();
  }

  async function handleDeleteSection(section: SectionNode) {
    await api.del(`/api/projects/sections/${section.id}`);
    if (activeSection === section.id) setActiveSection(null);
    await loadProject();
    await reloadProjects();
  }

  if (!project) {
    return <div className="py-16 text-center text-ink-500">Загрузка проекта…</div>;
  }

  return (
    <div className="pt-6">
      <Breadcrumbs items={[{ label: "Главная", to: "/projects" }, { label: project.title }]} />

      <div className="mt-6 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-[18px] text-white"
            style={{ background: project.color }}
          >
            <Icon name="kanban" size={26} />
          </div>
          <div>
            <h1 className="text-[32px] font-bold leading-tight text-ink-900">{project.title}</h1>
            {project.subtitle && <p className="text-[14px] text-ink-500">{project.subtitle}</p>}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {canEdit && (
              <button
                onClick={() => navigate(`/projects/${pid}/articles/new${activeSection ? `?section=${activeSection}` : ""}`)}
                className="inline-flex h-[44px] items-center gap-2 rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
              >
                <Icon name="plus" size={16} /> Новая статья
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setMembersDialogOpen(true)}
                className="inline-flex h-[44px] items-center gap-2 rounded-2xl border border-surface-line bg-white px-4 text-sm font-semibold text-ink-900 hover:bg-surface-muted"
              >
                <Icon name="users" size={16} /> Участники · {members.length}
              </button>
            )}
          </div>
        </div>
        <p className="max-w-[820px] text-[15px] leading-relaxed text-ink-500">
          {project.description || "Материалы проекта: регламенты, архитектура, UI-гайды, API и рабочие инструкции для команды."}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <StatPill icon="document" bg="bg-brand-50" value={articles.length} label="Документы" tone="text-brand-600" />
        <StatPill icon="folder" bg="bg-accent-violetBg" value={flatSections.length} label="Разделы" tone="text-accent-violet" />
        <StatPill icon="users" bg="bg-accent-greenBg" value={members.length} label="Участники" tone="text-accent-green" />
        <StatPill
          icon="clock"
          bg="bg-accent-amberBg"
          value={articles.filter((a) => a.status === "review").length}
          label="На согласовании"
          tone="text-accent-amber"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="flex flex-col gap-6">
          {pinned.length > 0 && (
            <div className="rounded-3xl border border-surface-line bg-white p-6 shadow-card">
              <h3 className="flex items-center gap-2 text-[18px] font-bold text-ink-900">
                <Icon name="pin" size={18} className="text-accent-amber" /> Закреплённые статьи
              </h3>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {pinned.map((a) => {
                  const chip = statusChip(a.status);
                  return (
                    <button
                      key={a.id}
                      onClick={() => navigate(`/projects/${pid}/articles/${a.id}`)}
                      className="flex items-center gap-3 rounded-2xl border border-surface-line p-3 text-left hover:bg-surface-muted"
                    >
                      <Icon name="document" size={18} className="text-ink-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">{a.title}</p>
                        <p className="truncate text-xs text-ink-500">{a.summary || "Без краткого описания"}</p>
                      </div>
                      <span className={`chip ${chip.cls}`}>{chip.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-surface-line bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl text-white"
                style={{ background: activeNode?.color || project.color }}
              >
                <Icon name={sectionIcon(activeNode?.icon || "folder")} size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[22px] font-bold text-ink-900">
                  {activeNode ? activeNode.title : "Все материалы проекта"}
                </h2>
                <p className="text-[13px] text-ink-500">
                  {sectionArticles.length} {plural(sectionArticles.length, ["материал", "материала", "материалов"])}
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={() =>
                    navigate(`/projects/${pid}/articles/new${activeSection ? `?section=${activeSection}` : ""}`)
                  }
                  className="inline-flex h-[40px] items-center gap-2 rounded-2xl bg-brand-50 px-4 text-sm font-semibold text-brand-600 hover:bg-brand-100"
                >
                  <Icon name="plus" size={14} /> Добавить статью
                </button>
              )}
            </div>

            <div className="mt-5 divide-y divide-surface-line overflow-hidden rounded-2xl border border-surface-line">
              {sectionArticles.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-12 text-center text-ink-500">
                  <Icon name="folder-open" size={36} className="text-ink-400" />
                  <p>В разделе пока нет статей.</p>
                  {canEdit && (
                    <button
                      onClick={() =>
                        navigate(`/projects/${pid}/articles/new${activeSection ? `?section=${activeSection}` : ""}`)
                      }
                      className="btn-primary"
                    >
                      Создать первую статью
                    </button>
                  )}
                </div>
              )}
              {sectionArticles.map((article) => {
                const chip = statusChip(article.status);
                return (
                  <button
                    key={article.id}
                    onClick={() => navigate(`/projects/${pid}/articles/${article.id}`)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-surface-muted"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon name="document" size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {article.is_pinned && <Icon name="pin" size={13} className="text-accent-amber" />}
                        <p className="truncate text-[15px] font-semibold text-ink-900">{article.title}</p>
                      </div>
                      <p className="truncate text-[13px] text-ink-500">
                        {article.summary || "Без краткого описания"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        {article.author_name || "—"} · обновлено {relativeFromNow(article.updated_at)} · v{article.version}
                      </p>
                    </div>
                    <span className={`chip ${chip.cls}`}>{chip.text}</span>
                    <Icon name="chevron-right" size={16} className="text-ink-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <KnowledgeTree
          sections={tree}
          articles={articles}
          activeSectionId={activeSection}
          canManage={canManage}
          canEdit={canEdit}
          onOpenArticle={(id) => navigate(`/projects/${pid}/articles/${id}`)}
          onSelectSection={setActiveSection}
          onCreateSection={(parentId) => setSectionDialog({ parentId })}
          onCreateArticle={(sectionId) => navigate(`/projects/${pid}/articles/new?section=${sectionId ?? ""}`)}
          onRenameSection={(section) => setSectionDialog({ parentId: section.parent_id ?? null, editing: section })}
          onDeleteSection={(section) => setDeleteTarget(section)}
        />
      </div>

      <SectionDialog
        open={!!sectionDialog}
        onClose={() => setSectionDialog(null)}
        sectionsFlat={flatSections}
        initialParent={sectionDialog?.parentId ?? null}
        editing={sectionDialog?.editing}
        onSubmit={handleSaveSection}
      />

      <MembersDialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        members={members}
        users={allUsers}
        canManage={canManage}
        onAdd={async (userId, role) => {
          await api.post(`/api/projects/${pid}/members`, { user_id: userId, project_role: role });
          await loadProject();
        }}
        onRemove={async (memberId) => {
          await api.del(`/api/projects/${pid}/members/${memberId}`);
          await loadProject();
        }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить раздел?"
        description={`Будет удалён раздел «${deleteTarget?.title}» и все его подразделы со статьями. Это действие необратимо.`}
        destructive
        confirmLabel="Удалить"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) handleDeleteSection(deleteTarget);
        }}
      />
    </div>
  );
}

function StatPill({
  icon,
  bg,
  value,
  label,
  tone,
}: {
  icon: IconName;
  bg: string;
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <div className={`flex h-[72px] min-w-[168px] items-center gap-3 rounded-[18px] ${bg} px-4 py-3`}>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-ink-900">
        <Icon name={icon} size={18} />
      </div>
      <div className="flex flex-col">
        <div className="text-xs font-medium text-ink-500">{label}</div>
        <div className={`text-[22px] font-bold leading-tight ${tone}`}>{value}</div>
      </div>
    </div>
  );
}

function SectionDialog({
  open,
  onClose,
  sectionsFlat,
  initialParent,
  editing,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  sectionsFlat: (SectionNode & { depth: number })[];
  initialParent: number | null;
  editing?: SectionNode;
  onSubmit: (payload: { title: string; icon: string; color: string; parentId: number | null; sectionId?: number }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState<string>("folder");
  const [color, setColor] = useState("#2959B8");
  const [parentId, setParentId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setIcon(editing.icon);
      setColor(editing.color);
      setParentId(editing.parent_id ?? null);
    } else {
      setTitle("");
      setIcon("folder");
      setColor("#2959B8");
      setParentId(initialParent);
    }
    setError(null);
  }, [open, editing, initialParent]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ title, icon, color, parentId, sectionId: editing?.id });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить раздел");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? "Редактирование раздела" : "Новый раздел"}
      description={editing ? "Обновите параметры раздела." : "Создайте новый раздел в структуре знаний."}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="field-label">Название</label>
          <input required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Родительский раздел</label>
          <select
            className="input h-[48px]"
            value={parentId ?? ""}
            onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— корневой раздел —</option>
            {sectionsFlat
              .filter((s) => !editing || s.id !== editing.id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {"— ".repeat(s.depth) + s.title}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="field-label">Иконка</label>
          <div className="grid grid-cols-8 gap-1.5">
            {SECTION_ICONS.map((ic) => (
              <button
                type="button"
                key={ic}
                onClick={() => setIcon(ic)}
                className={`grid h-10 w-10 place-items-center rounded-xl border transition ${
                  icon === ic ? "border-brand-500 bg-brand-50 text-brand-600" : "border-surface-line bg-white text-ink-500 hover:bg-surface-muted"
                }`}
                aria-label={ic}
              >
                <Icon name={ic} size={18} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Цвет</label>
          <div className="flex flex-wrap gap-2">
            {SECTION_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-xl border-2 transition ${color === c ? "border-ink-900 scale-110" : "border-transparent"}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-accent-red">{error}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
            {submitting ? "Сохраняем…" : editing ? "Сохранить" : "Создать"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MembersDialog({
  open,
  onClose,
  members,
  users,
  canManage,
  onAdd,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  members: ProjectMember[];
  users: User[];
  canManage: boolean;
  onAdd: (userId: number, role: string) => Promise<void>;
  onRemove: (memberId: number) => Promise<void>;
}) {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState("member");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberIds = new Set(members.map((m) => m.user_id));
  const candidates = users.filter((u) => !memberIds.has(u.id));

  async function handleAdd() {
    if (!userId) return;
    setAdding(true);
    setError(null);
    try {
      await onAdd(userId, role);
      setUserId(null);
      setRole("member");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить участника");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Modal open={open} title="Участники проекта" description="Назначайте сотрудников и управляйте ролями в проекте." onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        {canManage && candidates.length > 0 && (
          <div className="rounded-2xl border border-surface-line bg-surface-muted p-4">
            <label className="field-label">Добавить участника</label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="input h-[44px] flex-1 min-w-[220px]"
                value={userId ?? ""}
                onChange={(e) => setUserId(Number(e.target.value) || null)}
              >
                <option value="">— выберите пользователя —</option>
                {candidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} · {u.email}
                  </option>
                ))}
              </select>
              <select className="input h-[44px] w-[160px]" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="member">участник</option>
                <option value="owner">владелец</option>
                <option value="reviewer">ревьюер</option>
              </select>
              <button type="button" disabled={!userId || adding} onClick={handleAdd} className="btn-primary disabled:opacity-60">
                <Icon name="plus" size={16} className="mr-1" /> Добавить
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-accent-red">{error}</p>}
          </div>
        )}
        <div className="divide-y divide-surface-line overflow-hidden rounded-2xl border border-surface-line">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white">
                {m.full_name
                  .split(/\s+/)
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900">{m.full_name}</p>
                <p className="text-xs text-ink-500">{m.project_role}</p>
              </div>
              <span className="chip bg-brand-50 text-brand-600">{m.role}</span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onRemove(m.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-accent-redBg hover:text-accent-red"
                  title="Исключить"
                >
                  <Icon name="trash" size={14} />
                </button>
              )}
            </div>
          ))}
          {members.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-500">Участников пока нет.</p>}
        </div>
      </div>
    </Modal>
  );
}

function flatten(nodes: SectionNode[], depth = 0, out: (SectionNode & { depth: number })[] = []) {
  for (const n of nodes) {
    out.push({ ...n, depth });
    flatten(n.children, depth + 1, out);
  }
  return out;
}

function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
