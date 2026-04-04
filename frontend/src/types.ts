export interface User {
  id: number
  email: string
  full_name: string
  position: string
  role: string
  status: string
  created_at: string
  last_login_at: string | null
}

export interface Space {
  id: number
  name: string
  description: string
  visibility: string
  status: string
  created_by: number | null
  created_at: string
}

export interface ContentItem {
  id: number
  content_type: string
  title: string
  slug: string
  summary: string
  body_md: string
  status: string
  author_id: number
  editor_id: number | null
  space_id: number | null
  is_pinned: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  views_count: number
  author?: User
  space?: Space
}

export interface Stats {
  total_users: number
  total_content: number
  total_published: number
  total_spaces: number
  recent_content: ContentItem[]
}
