export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function relativeFromNow(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < day) return "Сегодня";
  if (diff < 2 * day) return "Вчера";
  return formatDate(iso);
}

export function humanSize(bytes: number): string {
  if (!bytes) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function statusChip(status: string): { text: string; cls: string } {
  switch (status) {
    case "published":
      return { text: "Опубликовано", cls: "bg-accent-greenBg text-accent-green" };
    case "review":
      return { text: "На согласовании", cls: "bg-accent-amberBg text-accent-amber" };
    case "draft":
      return { text: "Черновик", cls: "bg-accent-amberBg text-accent-amber" };
    case "archived":
      return { text: "В архиве", cls: "bg-surface-muted text-ink-500" };
    default:
      return { text: status, cls: "bg-surface-muted text-ink-500" };
  }
}
