import { SVGProps } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Bold,
  BookOpen,
  Box,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  Globe,
  Grid3x3,
  Heading1,
  Heading2,
  Home,
  Info,
  Italic,
  KanbanSquare,
  Key,
  LayoutDashboard,
  Lightbulb,
  Link as LinkIcon,
  List,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Monitor,
  MoreHorizontal,
  Palette,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  Save,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Table as TableIcon,
  Trash2,
  Upload,
  User as UserIcon,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "search"
  | "bell"
  | "logout"
  | "plus"
  | "chevron-down"
  | "chevron-right"
  | "chevron-left"
  | "arrow-right"
  | "arrow-left"
  | "eye"
  | "eye-off"
  | "edit"
  | "trash"
  | "check"
  | "x"
  | "more"
  | "document"
  | "folder"
  | "folder-open"
  | "book"
  | "cube"
  | "palette"
  | "code"
  | "chat"
  | "sparkles"
  | "settings"
  | "info"
  | "lightbulb"
  | "monitor"
  | "server"
  | "link"
  | "users"
  | "user"
  | "shield"
  | "chart"
  | "download"
  | "upload"
  | "paperclip"
  | "clock"
  | "bold"
  | "italic"
  | "list"
  | "h1"
  | "h2"
  | "table"
  | "pin"
  | "lock"
  | "globe"
  | "mail"
  | "key"
  | "star"
  | "bolt"
  | "sort"
  | "grid"
  | "pencil"
  | "save"
  | "send"
  | "filter"
  | "home"
  | "dashboard"
  | "kanban"
  | "warn"
  | "calendar";

const MAP: Record<IconName, LucideIcon> = {
  search: Search,
  bell: Bell,
  logout: LogOut,
  plus: Plus,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft,
  eye: Eye,
  "eye-off": EyeOff,
  edit: Pencil,
  trash: Trash2,
  check: Check,
  x: X,
  more: MoreHorizontal,
  document: FileText,
  folder: Folder,
  "folder-open": FolderOpen,
  book: BookOpen,
  cube: Box,
  palette: Palette,
  code: Code2,
  chat: MessageCircle,
  sparkles: Sparkles,
  settings: Settings,
  info: Info,
  lightbulb: Lightbulb,
  monitor: Monitor,
  server: Server,
  link: LinkIcon,
  users: Users,
  user: UserIcon,
  shield: Shield,
  chart: BarChart3,
  download: Download,
  upload: Upload,
  paperclip: Paperclip,
  clock: Clock,
  bold: Bold,
  italic: Italic,
  list: List,
  h1: Heading1,
  h2: Heading2,
  table: TableIcon,
  pin: Pin,
  lock: Lock,
  globe: Globe,
  mail: Mail,
  key: Key,
  star: Star,
  bolt: Zap,
  sort: SlidersHorizontal,
  grid: Grid3x3,
  pencil: Pencil,
  save: Save,
  send: Send,
  filter: Filter,
  home: Home,
  dashboard: LayoutDashboard,
  kanban: KanbanSquare,
  warn: AlertTriangle,
  calendar: Calendar,
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, strokeWidth = 1.75, className, ...rest }: IconProps) {
  const Cmp = MAP[name];
  if (!Cmp) return null;
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} {...(rest as any)} />;
}
