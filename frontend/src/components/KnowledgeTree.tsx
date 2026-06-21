import { useMemo, useState } from "react";
import type { ArticleShort, SectionNode } from "../types";
import { Icon, IconName } from "./Icon";
import { statusChip } from "../utils/format";

interface TreeProps {
  sections: SectionNode[];
  articles: ArticleShort[];
  activeArticleId?: number | null;
  activeSectionId?: number | null;
  canManage: boolean;
  canEdit: boolean;
  onOpenArticle: (articleId: number) => void;
  onSelectSection: (sectionId: number | null) => void;
  onCreateSection: (parentId: number | null) => void;
  onCreateArticle: (sectionId: number | null) => void;
  onRenameSection?: (section: SectionNode) => void;
  onDeleteSection?: (section: SectionNode) => void;
  searchPlaceholder?: string;
}

const VALID_ICONS: IconName[] = [
  "folder",
  "folder-open",
  "book",
  "cube",
  "palette",
  "code",
  "chat",
  "sparkles",
  "settings",
  "info",
  "lightbulb",
  "monitor",
  "server",
  "link",
  "star",
  "bolt",
  "document",
];

export function sectionIcon(name: string): IconName {
  return (VALID_ICONS as string[]).includes(name) ? (name as IconName) : "folder";
}

export default function KnowledgeTree({
  sections,
  articles,
  activeArticleId,
  activeSectionId,
  canManage,
  canEdit,
  onOpenArticle,
  onSelectSection,
  onCreateSection,
  onCreateArticle,
  onRenameSection,
  onDeleteSection,
  searchPlaceholder = "Поиск по разделам",
}: TreeProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(() => collectIds(sections));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    const matchArticle = (a: ArticleShort) => a.title.toLowerCase().includes(q);
    const filterNode = (node: SectionNode): SectionNode | null => {
      const hit =
        node.title.toLowerCase().includes(q) ||
        articles.some((a) => a.section_id === node.id && matchArticle(a));
      const children = node.children
        .map((c) => filterNode(c))
        .filter((c): c is SectionNode => !!c);
      if (hit || children.length) {
        return { ...node, children };
      }
      return null;
    };
    return sections.map((s) => filterNode(s)).filter((s): s is SectionNode => !!s);
  }, [sections, articles, query]);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="h-fit rounded-[24px] border border-surface-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-[20px] font-bold text-ink-900">Структура знаний</h3>
        {canManage && (
          <button
            type="button"
            onClick={() => onCreateSection(null)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-brand-50 hover:text-brand-600"
            title="Новый корневой раздел"
          >
            <Icon name="plus" size={18} />
          </button>
        )}
      </div>
      <div className="mt-3 flex h-[38px] items-center gap-2 rounded-2xl border border-surface-line bg-surface-muted px-3 text-sm text-ink-400">
        <Icon name="search" size={16} />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="h-full flex-1 bg-transparent text-[14px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")}>
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      <ul className="mt-3 space-y-0.5">
        {filtered.length === 0 && (
          <li className="px-2 py-4 text-sm text-ink-500">Разделов пока нет.</li>
        )}
        {filtered.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            articles={articles}
            expanded={expanded}
            toggle={toggle}
            activeArticleId={activeArticleId}
            activeSectionId={activeSectionId}
            canManage={canManage}
            canEdit={canEdit}
            onOpenArticle={onOpenArticle}
            onSelectSection={onSelectSection}
            onCreateSection={onCreateSection}
            onCreateArticle={onCreateArticle}
            onRenameSection={onRenameSection}
            onDeleteSection={onDeleteSection}
          />
        ))}
      </ul>
    </aside>
  );
}

interface NodeProps {
  node: SectionNode;
  depth: number;
  articles: ArticleShort[];
  expanded: Set<number>;
  toggle: (id: number) => void;
  activeArticleId?: number | null;
  activeSectionId?: number | null;
  canManage: boolean;
  canEdit: boolean;
  onOpenArticle: (articleId: number) => void;
  onSelectSection: (sectionId: number | null) => void;
  onCreateSection: (parentId: number | null) => void;
  onCreateArticle: (sectionId: number | null) => void;
  onRenameSection?: (section: SectionNode) => void;
  onDeleteSection?: (section: SectionNode) => void;
}

function TreeNode({
  node,
  depth,
  articles,
  expanded,
  toggle,
  activeArticleId,
  activeSectionId,
  canManage,
  canEdit,
  onOpenArticle,
  onSelectSection,
  onCreateSection,
  onCreateArticle,
  onRenameSection,
  onDeleteSection,
}: NodeProps) {
  const open = expanded.has(node.id);
  const isActive = activeSectionId === node.id;
  const nodeArticles = articles.filter((a) => a.section_id === node.id);
  const hasChildren = node.children.length > 0 || nodeArticles.length > 0;
  const [hover, setHover] = useState(false);

  return (
    <li>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`group flex items-center gap-1 rounded-xl px-1.5 py-1.5 transition ${
          isActive ? "bg-brand-50" : "hover:bg-surface-muted"
        }`}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        <button
          type="button"
          onClick={() => (hasChildren ? toggle(node.id) : null)}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
            hasChildren ? "text-ink-500 hover:text-ink-900" : "text-transparent"
          }`}
          aria-label={open ? "Свернуть" : "Развернуть"}
        >
          <Icon name={open ? "chevron-down" : "chevron-right"} size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            onSelectSection(node.id);
            if (hasChildren && !open) toggle(node.id);
          }}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Icon
            name={open && hasChildren ? "folder-open" : sectionIcon(node.icon)}
            size={16}
            style={{ color: node.color }}
          />
          <span
            className={`truncate text-[14px] ${
              isActive ? "font-semibold text-brand-600" : "text-ink-900"
            }`}
          >
            {node.title}
          </span>
          {node.articles_count > 0 && (
            <span className="ml-1 shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-500">
              {node.articles_count}
            </span>
          )}
        </button>
        {(hover || isActive) && (canEdit || canManage) && (
          <div className="flex items-center gap-0.5">
            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateArticle(node.id);
                }}
                className="grid h-6 w-6 place-items-center rounded text-ink-400 hover:bg-white hover:text-brand-600"
                title="Новая статья в разделе"
              >
                <Icon name="document" size={13} />
              </button>
            )}
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateSection(node.id);
                  }}
                  className="grid h-6 w-6 place-items-center rounded text-ink-400 hover:bg-white hover:text-brand-600"
                  title="Подраздел"
                >
                  <Icon name="plus" size={13} />
                </button>
                {onRenameSection && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenameSection(node);
                    }}
                    className="grid h-6 w-6 place-items-center rounded text-ink-400 hover:bg-white hover:text-brand-600"
                    title="Переименовать"
                  >
                    <Icon name="pencil" size={13} />
                  </button>
                )}
                {onDeleteSection && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSection(node);
                    }}
                    className="grid h-6 w-6 place-items-center rounded text-ink-400 hover:bg-white hover:text-accent-red"
                    title="Удалить раздел"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {open && (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              articles={articles}
              expanded={expanded}
              toggle={toggle}
              activeArticleId={activeArticleId}
              activeSectionId={activeSectionId}
              canManage={canManage}
              canEdit={canEdit}
              onOpenArticle={onOpenArticle}
              onSelectSection={onSelectSection}
              onCreateSection={onCreateSection}
              onCreateArticle={onCreateArticle}
              onRenameSection={onRenameSection}
              onDeleteSection={onDeleteSection}
            />
          ))}
          {nodeArticles.map((a) => {
            const chip = statusChip(a.status);
            const active = activeArticleId === a.id;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onOpenArticle(a.id)}
                  className={`group flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 text-left transition ${
                    active ? "bg-brand-50" : "hover:bg-surface-muted"
                  }`}
                  style={{ paddingLeft: 28 + (depth + 1) * 14 }}
                >
                  <Icon name="document" size={14} className="text-ink-400 shrink-0" />
                  <span
                    className={`min-w-0 flex-1 truncate text-[13px] ${
                      active ? "font-semibold text-brand-600" : "text-ink-900/90"
                    }`}
                  >
                    {a.is_pinned && "📌 "}
                    {a.title}
                  </span>
                  <span className={`chip shrink-0 ${chip.cls} !text-[10px] !py-0 !px-1.5`}>
                    {chip.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function collectIds(nodes: SectionNode[], into = new Set<number>()): Set<number> {
  for (const n of nodes) {
    into.add(n.id);
    collectIds(n.children, into);
  }
  return into;
}
