import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAppData } from "../store/AppData";
import type { Article, Project, Section, SectionNode } from "../types";
import { formatDate, humanSize } from "../utils/format";
import { Icon, IconName } from "../components/Icon";
import Breadcrumbs from "../components/Breadcrumbs";

type ToolbarAction = {
  id: string;
  label: string;
  icon: IconName;
  wrap: (t: string) => string;
  placeholder?: string;
};

const TOOLBAR: ToolbarAction[] = [
  { id: "h1", label: "H1", icon: "h1", wrap: (t) => `\n# ${t}\n` },
  { id: "h2", label: "H2", icon: "h2", wrap: (t) => `\n## ${t}\n` },
  { id: "bold", label: "Жирный", icon: "bold", wrap: (t) => `**${t}**` },
  { id: "italic", label: "Курсив", icon: "italic", wrap: (t) => `*${t}*` },
  { id: "list", label: "Список", icon: "list", wrap: (t) => `\n- ${t}\n- \n` },
  { id: "link", label: "Ссылка", icon: "link", wrap: (t) => `[${t}](https://)` },
  { id: "table", label: "Таблица", icon: "table", wrap: () => "\n| Заголовок | Значение |\n| --- | --- |\n| Ячейка | Ячейка |\n" },
  { id: "code", label: "Код", icon: "code", wrap: (t) => `\n\`\`\`\n${t}\n\`\`\`\n` },
];

export default function ArticleEditorPage() {
  const { projectId, articleId } = useParams();
  const pid = Number(projectId);
  const [searchParams] = useSearchParams();
  const preselectSection = Number(searchParams.get("section")) || null;
  const navigate = useNavigate();
  const { bump } = useAppData();
  const isNew = !articleId;

  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<SectionNode[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState("");
  const [sectionId, setSectionId] = useState<number | null>(preselectSection);
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState(defaultContent);
  const [status, setStatus] = useState("draft");
  const [isPinned, setIsPinned] = useState(false);
  const [versionNote, setVersionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const flatSections = useMemo(() => flatten(sections), [sections]);

  const load = useCallback(async () => {
    if (pid) {
      const [p, s] = await Promise.all([
        api.get<Project>(`/api/projects/${pid}`),
        api.get<SectionNode[]>(`/api/projects/${pid}/tree`),
      ]);
      setProject(p);
      setSections(s);
      if (!sectionId && !articleId) {
        const flat = flatten(s);
        if (flat.length) setSectionId(flat[0].id);
      }
    }
    if (articleId) {
      const a = await api.get<Article>(`/api/articles/${articleId}`);
      setArticle(a);
      setTitle(a.title);
      setSummary(a.summary);
      setContent(a.content);
      setStatus(a.status);
      setIsPinned(a.is_pinned);
      setSectionId(a.section_id ?? null);
    } else {
      setTitle("Новая статья");
      setSummary("");
    }
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, pid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setDirty(true);
  }, [title, summary, content, sectionId, isPinned]);

  const sectionLabel = useMemo(() => {
    const s = flatSections.find((x) => x.id === sectionId);
    return s ? s.title : "Документация";
  }, [flatSections, sectionId]);

  const save = useCallback(
    async (event?: FormEvent, newStatus?: string) => {
      event?.preventDefault();
      setSaving(true);
      setError(null);
      try {
        const payload = {
          title,
          summary,
          content,
          status: newStatus ?? status,
          section_id: sectionId,
          project_id: pid,
          is_pinned: isPinned,
          version_note: versionNote || undefined,
        };
        let saved: Article;
        if (isNew) {
          saved = await api.post<Article>("/api/articles", payload);
        } else {
          saved = await api.put<Article>(`/api/articles/${articleId}`, payload);
        }
        setArticle(saved);
        setSavedAt(new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
        setDirty(false);
        setVersionNote("");
        bump();
        if (isNew) {
          navigate(`/projects/${pid}/articles/${saved.id}/edit`, { replace: true });
        }
        if (newStatus) setStatus(newStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить статью");
      } finally {
        setSaving(false);
      }
    },
    [title, summary, content, status, sectionId, isPinned, versionNote, isNew, articleId, pid, navigate, bump]
  );

  function applyFormatting(action: ToolbarAction) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart, selectionEnd, value } = ta;
    const selected = value.slice(selectionStart, selectionEnd) || action.placeholder || "текст";
    const insertion = action.wrap(selected);
    const next = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = selectionStart + insertion.length;
      ta.setSelectionRange(newPos, newPos);
    });
  }

  // Auto-save every 60s if dirty
  useEffect(() => {
    if (isNew) return;
    const id = setInterval(() => {
      if (dirty && !saving) save();
    }, 60_000);
    return () => clearInterval(id);
  }, [dirty, saving, save, isNew]);

  return (
    <div className="pt-6">
      <Breadcrumbs
        items={[
          { label: "Главная", to: "/projects" },
          { label: project?.title || "Проект", to: `/projects/${pid}` },
          { label: sectionLabel },
          { label: isNew ? "Новая статья" : "Редактор" },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn-primary h-[48px]" onClick={(e) => save(e)} disabled={saving}>
          <Icon name="save" size={16} className="mr-2" />
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
        <button
          type="button"
          className="btn-secondary h-[48px]"
          onClick={() => (article ? navigate(`/projects/${pid}/articles/${article.id}`) : navigate(-1))}
        >
          <Icon name="eye" size={16} className="mr-2" /> Предпросмотр
        </button>
        <button
          type="button"
          disabled={isNew}
          className="inline-flex h-[48px] items-center gap-2 rounded-2xl bg-brand-50 px-5 text-base font-semibold text-brand-600 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(e) => save(e, "review")}
        >
          <Icon name="send" size={16} /> На согласование
        </button>
        <div className="ml-auto flex items-center gap-2 text-sm text-ink-500">
          {dirty ? (
            <span className="flex items-center gap-1.5 text-accent-amber">
              <span className="h-2 w-2 rounded-full bg-accent-amber" />
              Есть несохранённые изменения
            </span>
          ) : savedAt ? (
            <span className="flex items-center gap-1.5 text-accent-green">
              <Icon name="check" size={14} /> Сохранено в {savedAt}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_412px]">
        <form className="rounded-[28px] border border-surface-line bg-white p-7 shadow-card" onSubmit={(e) => save(e)}>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-[16px] border border-surface-line bg-surface-muted p-2">
            {TOOLBAR.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => applyFormatting(tool)}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-semibold text-ink-900 shadow-sm hover:bg-brand-50 hover:text-brand-600 border border-surface-line"
                title={tool.label}
              >
                <Icon name={tool.icon} size={14} />
                <span className="hidden lg:inline">{tool.label}</span>
              </button>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-5 w-full text-[32px] font-bold text-ink-900 placeholder:text-ink-400 focus:outline-none"
            placeholder="Заголовок статьи"
          />
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="mt-2 w-full resize-none text-[16px] leading-relaxed text-ink-500 placeholder:text-ink-400 focus:outline-none"
            placeholder="Краткое описание (появится в карточках и списках)"
          />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={24}
            className="mt-5 w-full resize-y rounded-2xl border border-surface-line bg-white p-4 font-mono text-[14px] leading-relaxed text-ink-900 focus:border-brand-500 focus:outline-none"
            placeholder="Содержимое статьи (Markdown). Используйте панель инструментов или сочетания."
          />

          <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-500">
            <Icon name="info" size={13} />
            Markdown: **жирный**, *курсив*, `код`, [ссылка](url), # заголовки, - списки. Автосохранение каждые 60 секунд.
          </p>
          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-accent-redBg px-4 py-3 text-sm text-accent-red">
              <Icon name="warn" size={14} /> {error}
            </div>
          )}
        </form>

        <aside className="flex flex-col gap-4">
          <div className="rounded-[26px] border border-surface-line bg-white p-6 shadow-card">
            <h3 className="flex items-center gap-2 text-[20px] font-bold text-ink-900">
              <Icon name="settings" size={18} className="text-brand-500" /> Параметры публикации
            </h3>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={status} />
              {project && <span className="chip bg-brand-50 text-brand-600">{project.title}</span>}
              {article?.moderation_note && (
                <span className="chip bg-accent-redBg text-accent-red">
                  <Icon name="warn" size={12} className="mr-1" /> комментарий модератора
                </span>
              )}
            </div>

            {article?.moderation_note && (
              <div className="mt-3 rounded-2xl border border-accent-redBg bg-accent-redBg/30 p-3 text-sm text-ink-900/90">
                {article.moderation_note}
              </div>
            )}

            <div className="mt-5">
              <label className="field-label">Раздел</label>
              <select
                value={sectionId ?? ""}
                onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : null)}
                className="input h-[48px]"
              >
                <option value="">— без раздела —</option>
                {flatSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {"— ".repeat(s.depth) + s.title}
                  </option>
                ))}
              </select>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-surface-line bg-surface-muted p-3">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-5 w-5 rounded-md border-surface-line text-brand-500"
              />
              <span className="flex flex-1 items-center gap-2 text-sm font-medium text-ink-900">
                <Icon name="pin" size={14} className="text-accent-amber" />
                Закрепить в проекте
              </span>
            </label>

            <div className="mt-4">
              <label className="field-label">Комментарий к версии</label>
              <input
                className="input"
                value={versionNote}
                onChange={(e) => setVersionNote(e.target.value)}
                placeholder="Например: добавлен раздел API"
              />
            </div>
          </div>

          <div className="rounded-[20px] border border-surface-line bg-white p-5 shadow-card">
            <h4 className="flex items-center gap-2 text-[16px] font-bold text-ink-900">
              <Icon name="paperclip" size={16} className="text-brand-500" /> Вложения
            </h4>
            <ul className="mt-3 space-y-1 text-[14px]">
              {(article?.attachments ?? []).map((att) => (
                <li key={att.id} className="flex items-center justify-between">
                  <span className="flex min-w-0 items-center gap-2 text-brand-600">
                    <Icon name="document" size={14} /> <span className="truncate">{att.filename}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-500">{humanSize(att.size_bytes)}</span>
                </li>
              ))}
              {(!article || article.attachments.length === 0) && (
                <li className="text-sm text-ink-500">Вложения появятся после сохранения статьи.</li>
              )}
            </ul>
          </div>

          <div className="rounded-[20px] border border-surface-line bg-white p-5 shadow-card">
            <h4 className="flex items-center gap-2 text-[16px] font-bold text-ink-900">
              <Icon name="clock" size={16} className="text-brand-500" /> История версий
            </h4>
            <ul className="mt-3 space-y-2 text-[14px]">
              {(article?.versions ?? []).slice(0, 6).map((v) => (
                <li key={v.id} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">v{v.version}</p>
                    <p className="text-xs text-ink-500">{v.note || "без комментария"}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-400">{formatDate(v.created_at)}</span>
                </li>
              ))}
              {(!article || article.versions.length === 0) && (
                <li className="text-sm text-ink-500">Версии появятся после сохранения.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { text: string; cls: string; icon: IconName }> = {
    draft: { text: "Черновик", cls: "bg-accent-amberBg text-accent-amber", icon: "pencil" },
    review: { text: "На согласовании", cls: "bg-accent-violetBg text-accent-violet", icon: "clock" },
    published: { text: "Опубликовано", cls: "bg-accent-greenBg text-accent-green", icon: "check" },
    archived: { text: "В архиве", cls: "bg-surface-muted text-ink-500", icon: "folder" },
  };
  const info = map[status] || { text: status, cls: "bg-surface-muted text-ink-500", icon: "document" };
  return (
    <span className={`chip ${info.cls}`}>
      <Icon name={info.icon} size={12} className="mr-1" /> {info.text}
    </span>
  );
}

function flatten(nodes: SectionNode[], depth = 0, out: (SectionNode & { depth: number })[] = []) {
  for (const n of nodes) {
    out.push({ ...n, depth });
    flatten(n.children, depth + 1, out);
  }
  return out;
}

const defaultContent = `# Заголовок статьи

Краткое введение в материал: зачем он нужен и что описывает.

## 1. Основное

- Пункт один
- Пункт два
- Пункт три

## 2. Детали

Разверните здесь ключевые моменты и примеры.
`;
