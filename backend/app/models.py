from datetime import datetime
from enum import Enum

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship

from .db import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    SENIOR = "senior"
    EMPLOYEE = "employee"
    VISITOR = "visitor"


class ArticleStatus(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default=UserRole.EMPLOYEE.value)
    department: Mapped[str | None] = mapped_column(String(128), nullable=True)
    position: Mapped[str | None] = mapped_column(String(128), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    about: Mapped[str] = mapped_column(Text, default="")
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    memberships: Mapped[list["ProjectMember"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    subtitle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(16), default="#2959B8")
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_priority: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sections: Mapped[list["Section"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    members: Mapped[list["ProjectMember"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    articles: Mapped[list["Article"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    project_role: Mapped[str] = mapped_column(String(32), default="member")

    project: Mapped[Project] = relationship(back_populates="members")
    user: Mapped[User] = relationship(back_populates="memberships")


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("sections.id", ondelete="CASCADE"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    color: Mapped[str] = mapped_column(String(16), default="#2959B8")
    icon: Mapped[str] = mapped_column(String(32), default="folder")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    project: Mapped[Project] = relationship(back_populates="sections")
    articles: Mapped[list["Article"]] = relationship(back_populates="section", cascade="all, delete-orphan")
    children: Mapped[list["Section"]] = relationship(
        "Section",
        cascade="all, delete-orphan",
        backref=backref("parent", remote_side="Section.id"),
    )


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    section_id: Mapped[int | None] = mapped_column(ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text, default="")
    content: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default=ArticleStatus.DRAFT.value)
    version: Mapped[str] = mapped_column(String(16), default="1.0")
    views: Mapped[int] = mapped_column(Integer, default=0)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    moderation_note: Mapped[str] = mapped_column(Text, default="")
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    project: Mapped[Project] = relationship(back_populates="articles")
    section: Mapped[Section | None] = relationship(back_populates="articles")
    author: Mapped[User | None] = relationship()
    versions: Mapped[list["ArticleVersion"]] = relationship(
        back_populates="article", cascade="all, delete-orphan", order_by="ArticleVersion.created_at.desc()"
    )
    attachments: Mapped[list["Attachment"]] = relationship(back_populates="article", cascade="all, delete-orphan")


class ArticleVersion(Base):
    __tablename__ = "article_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"))
    version: Mapped[str] = mapped_column(String(16))
    note: Mapped[str] = mapped_column(String(255), default="")
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    article: Mapped[Article] = relationship(back_populates="versions")


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(255))
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    article: Mapped[Article] = relationship(back_populates="attachments")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(128))
    target: Mapped[str] = mapped_column(String(255), default="")
    category: Mapped[str] = mapped_column(String(64), default="general")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User | None] = relationship()


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    link: Mapped[str | None] = mapped_column(String(512), nullable=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    level: Mapped[str | None] = mapped_column(String(16), nullable=True, default="info")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
