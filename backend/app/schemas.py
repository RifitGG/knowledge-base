import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models import UserRole, UserStatus, ContentType, ContentStatus


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    position: str = ""
    role: UserRole = UserRole.visitor


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    position: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    position: str
    role: UserRole
    status: UserStatus
    created_at: datetime.datetime
    last_login_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class SpaceCreate(BaseModel):
    name: str
    description: str = ""
    visibility: str = "public"


class SpaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[str] = None
    status: Optional[str] = None


class SpaceOut(BaseModel):
    id: int
    name: str
    description: str
    visibility: str
    status: str
    created_by: Optional[int] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class ContentCreate(BaseModel):
    content_type: ContentType
    title: str
    summary: str = ""
    body_md: str = ""
    space_id: Optional[int] = None
    status: ContentStatus = ContentStatus.draft


class ContentUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    body_md: Optional[str] = None
    space_id: Optional[int] = None
    status: Optional[ContentStatus] = None
    is_pinned: Optional[bool] = None


class ContentOut(BaseModel):
    id: int
    content_type: ContentType
    title: str
    slug: str
    summary: str
    body_md: str
    status: ContentStatus
    author_id: int
    editor_id: Optional[int] = None
    space_id: Optional[int] = None
    is_pinned: bool
    published_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    views_count: int
    author: Optional[UserOut] = None
    space: Optional[SpaceOut] = None

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class StatsOut(BaseModel):
    total_users: int
    total_content: int
    total_published: int
    total_spaces: int
    pending_moderation: int
    open_tickets: int
    recent_content: list[ContentOut]


class TicketCreate(BaseModel):
    subject: str
    message: str


class TicketReply(BaseModel):
    admin_reply: str
    status: Optional[str] = None


class TicketOut(BaseModel):
    id: int
    user_id: int
    subject: str
    message: str
    status: str
    admin_reply: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True
