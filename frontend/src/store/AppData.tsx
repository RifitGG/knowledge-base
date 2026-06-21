import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { triggerLiveRefresh, useLiveRefresh } from "../utils/liveRefresh";
import type { AuditEntry, ModerationItem, Notification, Project } from "../types";

interface AppDataState {
  projects: Project[];
  projectScope: "mine" | "all";
  setProjectScope: (scope: "mine" | "all") => void;
  reloadProjects: () => Promise<void>;
  moderation: ModerationItem[];
  reloadModeration: () => Promise<void>;
  audit: AuditEntry[];
  reloadAudit: () => Promise<void>;
  notifications: Notification[];
  reloadNotifications: () => Promise<void>;
  markNotificationRead: (id: number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  unreadCount: number;
  bump: () => void;
}

const Ctx = createContext<AppDataState | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectScope, setProjectScope] = useState<"mine" | "all">("mine");
  const [moderation, setModeration] = useState<ModerationItem[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const reloadProjects = useCallback(async () => {
    if (!user) return;
    try {
      setProjects(await api.get<Project[]>(`/api/projects?scope=${projectScope}`));
    } catch {
      setProjects([]);
    }
  }, [user, projectScope]);

  const reloadModeration = useCallback(async () => {
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      setModeration([]);
      return;
    }
    try {
      setModeration(await api.get<ModerationItem[]>("/api/admin/moderation"));
    } catch {
      setModeration([]);
    }
  }, [user]);

  const reloadAudit = useCallback(async () => {
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      setAudit([]);
      return;
    }
    try {
      setAudit(await api.get<AuditEntry[]>("/api/admin/audit?limit=15"));
    } catch {
      setAudit([]);
    }
  }, [user]);

  const reloadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setNotifications(await api.get<Notification[]>("/api/notifications"));
    } catch {
      setNotifications([]);
    }
  }, [user]);

  const markNotificationRead = useCallback(async (id: number) => {
    await api.post(`/api/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await api.post("/api/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  const bump = useCallback(() => {
    triggerLiveRefresh();
  }, []);

  const refreshAll = useCallback(() => {
    reloadProjects();
    reloadModeration();
    reloadAudit();
    reloadNotifications();
  }, [reloadProjects, reloadModeration, reloadAudit, reloadNotifications]);

  useLiveRefresh(refreshAll, !!user);

  useEffect(() => {
    if (user) {
      refreshAll();
      const timer = window.setInterval(refreshAll, 10000);
      return () => window.clearInterval(timer);
    } else {
      setProjects([]);
      setModeration([]);
      setAudit([]);
      setNotifications([]);
    }
  }, [user, refreshAll]);

  const value = useMemo<AppDataState>(
    () => ({
      projects,
      projectScope,
      setProjectScope,
      reloadProjects,
      moderation,
      reloadModeration,
      audit,
      reloadAudit,
      notifications,
      reloadNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      unreadCount: notifications.filter((n) => !n.is_read).length,
      bump,
    }),
    [projects, projectScope, reloadProjects, moderation, reloadModeration, audit, reloadAudit, notifications, reloadNotifications, markNotificationRead, markAllNotificationsRead, bump]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
