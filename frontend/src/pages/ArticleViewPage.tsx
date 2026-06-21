import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, getToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useAppData } from "../store/AppData";
import type { Article, ArticleShort, Project, SectionNode } from "../types";
import { formatDate, humanSize, relativeFromNow, statusChip } from "../utils/format";
import { canEditArticles, canOpenAdmin } from "../utils/roles";
import { Icon, IconName } from "../components/Icon";
import Breadcrumbs from "../components/Breadcrumbs";
import KnowledgeTree from "../components/KnowledgeTree";
import { ConfirmModal } from "../components/Modal";

export default function ArticleViewPage() {
  const { projectId, articleId } = useParams();
  const pid = Number(projectId);
  const aid = Number(articleId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bump } = useAppData();
  const [article, setArticle] = useState<Article | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<SectionNode[]>([]);
  const [articles, setArticles] = useState<ArticleShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloadingAttachments, setDownloadingAttachments] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const a = await api.get<Article>(`/api/articles/${aid}`);
      setArticle(a);
      const [p, t, as] = await Promise.all([
        api.get<Project>(`/api/projects/${pid}`),
        api.get<SectionNode[]>(`/api/projects/${pid}/tree`),
        api.get<ArticleShort[]>(`/api/articles?project_id=${pid}`),
      ]);
      setProject(p);
      setTree(t);
      setArticles(as);
    } catch (err) {
      setArticle(null);
      setLoadError(err instanceof Error ? err.message : "Не удалось загрузить статью");
    } finally {
      setLoading(false);
    }
  }, [aid, pid]);

  useEffect(() => {
    load();
  }, [load]);

  const toc = useMemo(() => {
    if (!article) return [] as { id: string; title: string; level: number }[];
    const headings: { id: string; title: string; level: number }[] = [];
    const regex = /^(#{1,3})\s+(.+)$/gm;
    let match: RegExpExecArray | null;
    let idx = 0;
    while ((match = regex.exec(article.content))) {
      headings.push({ id: `h-${idx++}`, title: match[2], level: match[1].length });
    }
    return headings;
  }, [article]);

  const sectionPath = useMemo(() => {
    if (!article || !tree.length) return [] as SectionNode[];
    return findPath(tree, article.section_id ?? null);
  }, [tree, article]);

  async function handleDelete() {
    await api.del(`/api/articles/${aid}`);
    bump();
    navigate(`/projects/${pid}`);
  }

  async function handleSubmitReview() {
    await api.post(`/api/articles/${aid}/submit`);
    await load();
    bump();
  }

  async function handleDownloadAttachments() {
    if (!article || downloadingAttachments) return;
    setDownloadingAttachments(true);
    setAttachmentError(null);
    try {
      const token = getToken();
      const res = await fetch(`/api/articles/${aid}/attachments/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        let detail = `${res.status} ${res.statusText}`;
        try {
          const data = await res.json();
          if (data?.detail) detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
        } catch {
          
        }
        throw new Error(detail);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${article.title.replace(/[\\/:*?"<>|]+/g, "-")}-attachments.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : "Не удалось скачать вложения");
    } finally {
      setDownloadingAttachments(false);
    }
  }

  if (loading) {
    return (
      <div className="pt-10 text-center text-ink-500">
        <div className="mx-auto mb-3 h-3 w-3 animate-ping rounded-full bg-brand-500" />
        Загрузка статьи…
      </div>
    );
  }

  if (loadError || !article || !project) {
    return (
      <div className="mt-10 rounded-3xl border border-surface-line bg-white p-10 text-center shadow-card">
        <Icon name="warn" size={40} className="mx-auto mb-3 text-accent-red" />
        <h2 className="text-[20px] font-bold text-ink-900">Не удалось открыть статью</h2>
        <p className="mt-2 text-sm text-ink-500">
          {loadError || "Возможно, у вас нет доступа к этому материалу или он был удалён."}
        </p>
        <button
          type="button"
          onClick={() => navigate(`/projects/${pid}`)}
          className="btn-secondary mt-5"
        >
          <Icon name="arrow-left" size={14} className="mr-2" /> Вернуться к проекту
        </button>
      </div>
    );
  }

  const chip = statusChip(article.status);
  const canEdit = canEditArticles(user?.role) && (user?.role !== "employee" || article.author_id === user?.id || true);

  return (
    <div className="pt-6">
      <Breadcrumbs
        items={[
          { label: "Главная", to: "/projects" },
          { label: project.title, to: `/projects/${pid}` },
          ...sectionPath.map((s) => ({ label: s.title })),
          { label: article.title },
        ]}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_300px_340px]">
        <article className="order-1 rounded-[28px] border border-surface-line bg-white p-5 shadow-card sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={`chip ${chip.cls}`}>{chip.text}</span>
            <span className="chip bg-brand-50 text-brand-600">{project.title}</span>
            <span className="chip bg-accent-violetBg text-accent-violet">
              <Icon name="clock" size={12} className="mr-1" /> v{article.version}
            </span>
            {article.is_pinned && (
              <span className="chip bg-accent-amberBg text-accent-amber">
                <Icon name="pin" size={12} className="mr-1" /> закреплено
              </span>
            )}
            {article.moderation_note && (
              <span className="chip bg-accent-redBg text-accent-red">
                <Icon name="warn" size={12} className="mr-1" /> комментарий модератора
              </span>
            )}
          </div>

          <h1 className="text-[28px] font-bold leading-tight text-ink-900 sm:text-[34px]">{article.title}</h1>
          {article.summary && (
            <p className="mt-3 max-w-[760px] text-[15px] leading-relaxed text-ink-500 sm:text-[16px]">{article.summary}</p>
          )}

          <p className="mt-4 flex flex-wrap items-center gap-4 text-[13px] text-ink-500">
            <span className="flex items-center gap-1.5">
              <Icon name="user" size={13} /> {article.author_name || "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="calendar" size={13} /> обновлено {formatDate(article.updated_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="eye" size={13} /> {article.views} просмотров
            </span>
          </p>

          {article.moderation_note && (
            <div className="mt-5 rounded-2xl border border-accent-redBg bg-accent-redBg/30 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-accent-red">
                <Icon name="warn" size={14} /> Комментарий модератора
              </p>
              <p className="mt-1 text-sm text-ink-900/90">{article.moderation_note}</p>
            </div>
          )}

          <div className="prose mt-8 max-w-none">
            <RenderMarkdown source={article.content} toc={toc} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-surface-line pt-6">
            {canEdit && (
              <>
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/projects/${pid}/articles/${aid}/edit`)}
                >
                  <Icon name="edit" size={16} className="mr-2" /> Редактировать
                </button>
                {article.status === "draft" && (
                  <button className="btn-secondary" onClick={handleSubmitReview}>
                    <Icon name="send" size={16} className="mr-2" /> На согласование
                  </button>
                )}
              </>
            )}
            <button className="btn-secondary" onClick={() => navigate(`/projects/${pid}`)}>
              <Icon name="arrow-left" size={16} className="mr-2" /> К проекту
            </button>
            {canOpenAdmin(user?.role) && (
              <button
                className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-accent-red hover:bg-accent-redBg"
                onClick={() => setConfirmDelete(true)}
              >
                <Icon name="trash" size={16} /> Удалить
              </button>
            )}
          </div>
        </article>

        <div className="order-3 flex flex-col gap-4 xl:order-2">
          <SideCard icon="list" title="Оглавление">
            <ul className="space-y-1 text-[14px]">
              {toc.map((h, i) => (
                <li key={h.id} style={{ paddingLeft: (h.level - 1) * 10 }}>
                  <a
                    href={`#${h.id}`}
                    className={`block rounded-lg px-2 py-1 transition hover:bg-brand-50 ${
                      i === 0 ? "font-semibold text-brand-600" : "text-ink-900/90"
                    }`}
                  >
                    {h.title}
                  </a>
                </li>
              ))}
              {toc.length === 0 && <li className="text-sm text-ink-500">Оглавление появится по мере наполнения статьи.</li>}
            </ul>
          </SideCard>

          <SideCard icon="paperclip" title="Вложения" tint>
            <ul className="space-y-1 text-[14px]">
              {article.attachments.map((att) => (
                <li key={att.id} className="flex items-center justify-between gap-2 rounded-xl px-1 py-1 hover:bg-white/60">
                  <span className="flex min-w-0 items-center gap-2 text-brand-600">
                    <Icon name="document" size={14} />
                    <span className="truncate">{att.filename}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-500">{humanSize(att.size_bytes)}</span>
                </li>
            ))}
            {article.attachments.length === 0 && <li className="text-sm text-ink-500">Нет прикреплённых файлов.</li>}
          </ul>
          {article.attachments.length > 0 && (
            <>
              <div className="mt-3 flex gap-2">
                <button
                  className="btn-primary h-[40px] flex-1 disabled:opacity-60"
                  onClick={handleDownloadAttachments}
                  disabled={downloadingAttachments}
                >
                  <Icon name="download" size={14} className="mr-1" />{" "}
                  {downloadingAttachments ? "Скачиваем…" : "Скачать всё"}
                </button>
              </div>
              {attachmentError && <p className="mt-2 text-xs text-accent-red">{attachmentError}</p>}
            </>
          )}
          </SideCard>

          <SideCard icon="clock" title="История версий">
            <ul className="space-y-2 text-[14px]">
              {article.versions.slice(0, 6).map((v) => (
                <li key={v.id} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">v{v.version}</p>
                    <p className="text-xs text-ink-500">{v.note || "без комментария"}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-400">{relativeFromNow(v.created_at)}</span>
                </li>
              ))}
              {article.versions.length === 0 && <li className="text-sm text-ink-500">Пока одна версия.</li>}
            </ul>
          </SideCard>
        </div>

        <div className="order-2 xl:order-3">
          <KnowledgeTree
            sections={tree}
            articles={articles}
            activeArticleId={article.id}
            canManage={false}
            canEdit={false}
            onOpenArticle={(id) => navigate(`/projects/${pid}/articles/${id}`)}
            onSelectSection={() => {}}
            onCreateSection={() => {}}
            onCreateArticle={() => {}}
          />
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Удалить статью?"
        description={`Статья «${article.title}» будет удалена без возможности восстановления.`}
        destructive
        confirmLabel="Удалить"
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function SideCard({
  icon,
  title,
  tint,
  children,
}: {
  icon: IconName;
  title: string;
  tint?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[20px] border shadow-card ${
        tint ? "border-transparent bg-brand-50" : "border-surface-line bg-white"
      } p-5`}
    >
      <h3 className="flex items-center gap-2 text-[16px] font-bold text-ink-900">
        <Icon name={icon} size={16} className="text-brand-500" /> {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function findPath(tree: SectionNode[], sectionId: number | null): SectionNode[] {
  if (!sectionId) return [];
  for (const node of tree) {
    if (node.id === sectionId) return [node];
    const child = findPath(node.children, sectionId);
    if (child.length) return [node, ...child];
  }
  return [];
}

function RenderMarkdown({ source, toc }: { source: string; toc: { id: string; title: string; level: number }[] }) {
  const lines = source.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let idx = 0;
  let headingIdx = 0;

  function renderInline(text: string, baseKey: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let i = 0;
    while ((match = regex.exec(text))) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      const token = match[0];
      const key = `${baseKey}-${i++}`;
      if (token.startsWith("**")) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
      else if (token.startsWith("*")) parts.push(<em key={key}>{token.slice(1, -1)}</em>);
      else if (token.startsWith("`")) parts.push(<code key={key} className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[13px] text-brand-600">{token.slice(1, -1)}</code>);
      else {
        const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
        if (m) parts.push(<a key={key} href={m[2]} className="text-brand-500 underline hover:text-brand-600">{m[1]}</a>);
        else parts.push(token);
      }
      last = match.index + token.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  while (idx < lines.length) {
    const line = lines[idx];
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const title = h[2];
      const id = toc[headingIdx]?.id || `h-${headingIdx}`;
      headingIdx++;
      const className =
        level === 1
          ? "mt-8 text-[26px] font-bold text-ink-900 scroll-mt-24"
          : level === 2
          ? "mt-6 text-[20px] font-bold text-ink-900 scroll-mt-24"
          : "mt-4 text-[17px] font-semibold text-ink-900 scroll-mt-24";
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      nodes.push(
        <Tag id={id} key={`h-${idx}`} className={className}>
          {title}
        </Tag>
      );
      idx++;
      continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      while (idx < lines.length && /^\s*-\s+/.test(lines[idx])) {
        items.push(lines[idx].replace(/^\s*-\s+/, ""));
        idx++;
      }
      nodes.push(
        <ul key={`ul-${idx}`} className="mt-3 list-disc space-y-1 pl-6 text-[15px] leading-relaxed text-ink-900/90">
          {items.map((t, i) => (
            <li key={i}>{renderInline(t, `li-${idx}-${i}`)}</li>
          ))}
        </ul>
      );
      continue;
    }
    if (line.trim() === "") {
      idx++;
      continue;
    }
    const para: string[] = [];
    while (idx < lines.length && lines[idx].trim() !== "" && !/^#{1,3}\s+/.test(lines[idx]) && !/^\s*-\s+/.test(lines[idx])) {
      para.push(lines[idx]);
      idx++;
    }
    nodes.push(
      <p key={`p-${idx}`} className="mt-3 text-[15px] leading-relaxed text-ink-900/90">
        {renderInline(para.join(" "), `p-${idx}`)}
      </p>
    );
  }
  return <>{nodes}</>;
}
