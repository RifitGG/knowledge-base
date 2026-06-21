export type Role = "admin" | "moderator" | "senior" | "employee" | "visitor";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  department?: string | null;
  position?: string | null;
  phone?: string | null;
  about?: string;
  avatar_url?: string | null;
  is_active: boolean;
}

export interface Project {
  id: number;
  title: string;
  subtitle?: string | null;
  description: string;
  color: string;
  is_priority: boolean;
  articles_count: number;
  members_count: number;
  updated_at?: string | null;
}

export interface Section {
  id: number;
  project_id: number;
  parent_id?: number | null;
  title: string;
  color: string;
  icon: string;
  sort_order: number;
}

export interface SectionNode extends Section {
  articles_count: number;
  children: SectionNode[];
}

export interface ProjectMember {
  id: number;
  user_id: number;
  full_name: string;
  role: Role;
  project_role: string;
}

export interface ArticleShort {
  id: number;
  project_id: number;
  section_id?: number | null;
  title: string;
  summary: string;
  status: string;
  version: string;
  views: number;
  is_pinned: boolean;
  moderation_note: string;
  author_id?: number | null;
  author_name?: string | null;
  updated_at?: string | null;
}

export interface Attachment {
  id: number;
  filename: string;
  size_bytes: number;
}

export interface ArticleVersion {
  id: number;
  version: string;
  note: string;
  author_name?: string | null;
  created_at: string;
}

export interface Article extends ArticleShort {
  content: string;
  attachments: Attachment[];
  versions: ArticleVersion[];
}

export interface DashboardStats {
  active_users: number;
  projects: number;
  in_moderation: number;
  security_alerts: number;
  users_delta_week: number;
  new_projects_month: number;
  pending_approvals: number;
  alerts_today: number;
}

export interface ModerationItem {
  id: number;
  article_id: number;
  title: string;
  summary: string;
  project_id: number;
  project_title: string;
  author_name: string;
  status: string;
  updated_at: string;
  deadline: string;
}

export interface AuditEntry {
  id: number;
  time: string;
  user_name: string;
  action: string;
  target: string;
  category: string;
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface AnalyticsData {
  roles: Record<Role, number>;
  statuses: Record<string, number>;
  top_projects: { id: number; title: string; color: string; articles: number }[];
  activity: { day: string; events: number }[];
}

export interface SecurityEvent {
  id: number;
  time: string;
  user: string;
  action: string;
  target: string;
}
