from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator



class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember: bool = False


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    department: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    about: str = ""
    avatar_url: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=4)
    role: str = "employee"
    department: Optional[str] = Field(default=None, max_length=128)
    position: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("department")
    @classmethod
    def _strip_department(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = Field(default=None, max_length=128)
    position: Optional[str] = None
    phone: Optional[str] = None
    about: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = Field(default=None, max_length=128)
    position: Optional[str] = None
    phone: Optional[str] = None
    about: Optional[str] = None
    avatar_url: Optional[str] = None

    @field_validator("department")
    @classmethod
    def _strip_department(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None


class PasswordUpdate(BaseModel):
    current_password: Optional[str] = None
    new_password: str = Field(min_length=4)



class ProjectMemberOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    role: str
    project_role: str

    class Config:
        from_attributes = True


class ProjectOut(BaseModel):
    id: int
    title: str
    subtitle: Optional[str] = None
    description: str
    color: str
    is_priority: bool
    articles_count: int = 0
    members_count: int = 0
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    description: str = ""
    color: str = "#2959B8"
    is_priority: bool = False


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_priority: Optional[bool] = None



class SectionOut(BaseModel):
    id: int
    project_id: int
    parent_id: Optional[int] = None
    title: str
    color: str
    icon: str = "folder"
    sort_order: int

    class Config:
        from_attributes = True


class SectionNode(SectionOut):
    articles_count: int = 0
    children: list["SectionNode"] = []


class SectionCreate(BaseModel):
    title: str
    color: str = "#2959B8"
    icon: str = "folder"
    parent_id: Optional[int] = None
    sort_order: int = 0


class SectionUpdate(BaseModel):
    title: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None


SectionNode.model_rebuild()


class ArticleShort(BaseModel):
    id: int
    project_id: int
    section_id: Optional[int] = None
    title: str
    summary: str
    status: str
    version: str
    views: int
    is_pinned: bool = False
    moderation_note: str = ""
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ArticleOut(ArticleShort):
    content: str
    attachments: list["AttachmentOut"] = []
    versions: list["ArticleVersionOut"] = []


class ArticleCreate(BaseModel):
    project_id: int
    section_id: Optional[int] = None
    title: str
    summary: str = ""
    content: str = ""
    status: str = "draft"


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None
    section_id: Optional[int] = None
    is_pinned: Optional[bool] = None
    moderation_note: Optional[str] = None
    version_note: Optional[str] = None


class AttachmentOut(BaseModel):
    id: int
    filename: str
    size_bytes: int

    class Config:
        from_attributes = True


class ArticleVersionOut(BaseModel):
    id: int
    version: str
    note: str
    author_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


ArticleOut.model_rebuild()


class DashboardStats(BaseModel):
    active_users: int
    projects: int
    in_moderation: int
    security_alerts: int
    users_delta_week: int
    new_projects_month: int
    pending_approvals: int
    alerts_today: int


class ModerationItem(BaseModel):
    id: int
    article_id: int
    title: str
    summary: str
    project_id: int
    project_title: str
    author_name: str
    status: str
    updated_at: datetime
    deadline: str


class ModerationDecision(BaseModel):
    decision: str  
    note: Optional[str] = ""


class AuditEntry(BaseModel):
    id: int
    time: str
    user_name: str
    action: str
    target: str
    category: str


class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    category: Optional[str] = None
    link: Optional[str] = None
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    level: Optional[str] = "info"
    is_read: bool
    is_archived: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class DepartmentOut(BaseModel):
    name: str
    count: int
