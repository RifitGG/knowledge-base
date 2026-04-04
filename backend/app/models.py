import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    moderator = "moderator"
    senior_employee = "senior_employee"
    employee = "employee"
    visitor = "visitor"


class UserStatus(str, enum.Enum):
    active = "active"
    blocked = "blocked"
    deleted = "deleted"


class ContentType(str, enum.Enum):
    article = "article"
    news = "news"
    note = "note"
    doc = "doc"
    changelog = "changelog"


class ContentStatus(str, enum.Enum):
    draft = "draft"
    on_review = "on_review"
    published = "published"
    archived = "archived"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    position = Column(String(255), default="")
    role = Column(SAEnum(UserRole), default=UserRole.visitor, nullable=False)
    status = Column(SAEnum(UserStatus), default=UserStatus.active, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    contents = relationship("ContentItem", back_populates="author", foreign_keys="ContentItem.author_id")


class Space(Base):
    __tablename__ = "spaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    visibility = Column(String(50), default="public")
    status = Column(String(50), default="active")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    contents = relationship("ContentItem", back_populates="space")
    creator = relationship("User", foreign_keys=[created_by])


class ContentItem(Base):
    __tablename__ = "content_items"

    id = Column(Integer, primary_key=True, index=True)
    content_type = Column(SAEnum(ContentType), nullable=False)
    title = Column(String(500), nullable=False, index=True)
    slug = Column(String(500), unique=True, index=True)
    summary = Column(Text, default="")
    body_md = Column(Text, default="")
    status = Column(SAEnum(ContentStatus), default=ContentStatus.draft, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    editor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    space_id = Column(Integer, ForeignKey("spaces.id"), nullable=True)
    is_pinned = Column(Boolean, default=False)
    published_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    views_count = Column(Integer, default=0)

    author = relationship("User", back_populates="contents", foreign_keys=[author_id])
    editor = relationship("User", foreign_keys=[editor_id])
    space = relationship("Space", back_populates="contents")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(100), nullable=False)
    title = Column(String(500), nullable=False)
    message = Column(Text, default="")
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")


class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(SAEnum(TicketStatus), default=TicketStatus.open, nullable=False)
    admin_reply = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User")
