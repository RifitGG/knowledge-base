import type { Role } from "../types";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Администратор",
  moderator: "Модератор",
  senior: "Старший сотрудник",
  employee: "Рядовой сотрудник",
  visitor: "Визитор",
};

export const ROLE_CHIP: Record<Role, string> = {
  admin: "bg-brand-50 text-brand-600",
  moderator: "bg-accent-violetBg text-accent-violet",
  senior: "bg-accent-greenBg text-accent-green",
  employee: "bg-accent-amberBg text-accent-amber",
  visitor: "bg-surface-muted text-ink-500",
};

export function canManageProjects(role?: Role | null): boolean {
  return role === "admin" || role === "moderator" || role === "senior";
}

export function canEditArticles(role?: Role | null): boolean {
  return role !== "visitor" && role !== undefined && role !== null;
}

export function canOpenAdmin(role?: Role | null): boolean {
  return role === "admin" || role === "moderator";
}
