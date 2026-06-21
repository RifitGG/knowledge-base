from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..config import settings
from ..db import get_session
from ..deps import get_current_user
from ..models import Article, ArticleStatus, ArticleVersion, AuditLog, Project, ProjectMember, User, UserRole
from ..schemas import (
    ArticleCreate,
    ArticleOut,
    ArticleShort,
    ArticleUpdate,
    ArticleVersionOut,
    AttachmentOut,
)

router = APIRouter(prefix="/api/articles", tags=["articles"])
ATTACHMENT_ROOT = settings.upload_path / "attachments"
ATTACHMENT_ROOT.mkdir(parents=True, exist_ok=True)


def _bump_version(prev: str) -> str:
    try:
        major, minor = prev.split(".")
        return f"{major}.{int(minor) + 1}"
    except Exception:
        return "1.1"


async def _has_project_access(session: AsyncSession, user: User, project_id: int) -> bool:
    if user.role in {UserRole.ADMIN.value, UserRole.MODERATOR.value, UserRole.SENIOR.value}:
        return True
    membership = await session.scalar(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == user.id)
    )
    return membership is not None


def _article_stmt(article_id: int):
    return (
        select(Article)
        .where(Article.id == article_id)
        .options(
            selectinload(Article.author),
            selectinload(Article.attachments),
            selectinload(Article.versions),
        )
    )


async def _load_article(session: AsyncSession, user: User, article_id: int) -> Article:
    article = (await session.execute(_article_stmt(article_id))).scalar_one_or_none()
    if not article:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Статья не найдена")
    if not await _has_project_access(session, user, article.project_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Нет доступа к статье")
    if user.role == UserRole.VISITOR.value and article.status != ArticleStatus.PUBLISHED.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    return article


def _to_short(a: Article) -> ArticleShort:
    return ArticleShort(
        id=a.id,
        project_id=a.project_id,
        section_id=a.section_id,
        title=a.title,
        summary=a.summary,
        status=a.status,
        version=a.version,
        views=a.views,
        is_pinned=a.is_pinned,
        moderation_note=a.moderation_note or "",
        author_id=a.author_id,
        author_name=a.author.full_name if a.author else None,
        updated_at=a.updated_at,
    )


def _to_full(a: Article) -> ArticleOut:
    return ArticleOut(
        **_to_short(a).model_dump(),
        content=a.content,
        attachments=[AttachmentOut.model_validate(att) for att in a.attachments],
        versions=[
            ArticleVersionOut(
                id=v.id,
                version=v.version,
                note=v.note,
                author_name=None,
                created_at=v.created_at,
            )
            for v in a.versions
        ],
    )


@router.get("", response_model=list[ArticleShort])
async def list_articles(
    project_id: int | None = None,
    section_id: int | None = None,
    search: str | None = None,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    stmt = select(Article).options(selectinload(Article.author))
    if project_id:
        if not await _has_project_access(session, user, project_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Нет доступа к проекту")
        stmt = stmt.where(Article.project_id == project_id)
    else:
        if user.role in {UserRole.EMPLOYEE.value, UserRole.VISITOR.value}:
            membership_stmt = select(ProjectMember.project_id).where(ProjectMember.user_id == user.id)
            my_ids = [pid for (pid,) in (await session.execute(membership_stmt)).all()]
            if not my_ids:
                return []
            stmt = stmt.where(Article.project_id.in_(my_ids))
    if section_id:
        stmt = stmt.where(Article.section_id == section_id)
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(or_(Article.title.ilike(like), Article.summary.ilike(like), Article.content.ilike(like)))
    if user.role == UserRole.VISITOR.value:
        stmt = stmt.where(Article.status == ArticleStatus.PUBLISHED.value)
    stmt = stmt.order_by(Article.updated_at.desc())
    items = (await session.execute(stmt)).scalars().all()
    return [_to_short(a) for a in items]


@router.get("/{article_id}", response_model=ArticleOut)
async def get_article(
    article_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    article = await _load_article(session, user, article_id)
    article.views += 1
    await session.commit()
    article = (await session.execute(_article_stmt(article_id))).scalar_one()
    return _to_full(article)


@router.get("/{article_id}/attachments/download")
async def download_article_attachments(
    article_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    article = await _load_article(session, user, article_id)
    if not article.attachments:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "У статьи нет вложений")

    archive = BytesIO()
    with ZipFile(archive, "w", compression=ZIP_DEFLATED) as zip_file:
        for attachment in article.attachments:
            file_path = ATTACHMENT_ROOT / str(article.id) / attachment.filename
            if file_path.is_file():
                zip_file.write(file_path, arcname=attachment.filename)
            else:
                zip_file.writestr(attachment.filename, f"Файл {attachment.filename} не найден.")

    archive.seek(0)
    filename = f"article-{article.id}-attachments.zip"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(archive, media_type="application/zip", headers=headers)


@router.post("", response_model=ArticleOut, status_code=201)
async def create_article(
    data: ArticleCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.role == UserRole.VISITOR.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    article = Article(
        project_id=data.project_id,
        section_id=data.section_id,
        title=data.title,
        summary=data.summary,
        content=data.content,
        status=data.status,
        author_id=user.id,
        version="1.0",
    )
    session.add(article)
    await session.flush()
    session.add(
        ArticleVersion(article_id=article.id, version="1.0", note="Создана статья", author_id=user.id)
    )
    session.add(AuditLog(user_id=user.id, action=f"Создана статья «{article.title}»", category="контент", target=article.title))
    await session.commit()
    return await get_article(article.id, session, user)


@router.put("/{article_id}", response_model=ArticleOut)
async def update_article(
    article_id: int,
    data: ArticleUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.role == UserRole.VISITOR.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    article = await session.get(Article, article_id)
    if not article:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    payload = data.model_dump(exclude_unset=True, exclude={"version_note"})
    content_changed = "content" in payload and payload["content"] != article.content
    for field, value in payload.items():
        setattr(article, field, value)

    if content_changed:
        new_version = _bump_version(article.version)
        article.version = new_version
        session.add(
            ArticleVersion(
                article_id=article.id,
                version=new_version,
                note=data.version_note or "правки содержимого",
                author_id=user.id,
            )
        )
    session.add(AuditLog(user_id=user.id, action=f"Изменена статья «{article.title}»", category="контент"))
    await session.commit()
    return await get_article(article_id, session, user)


@router.delete("/{article_id}", status_code=204)
async def delete_article(
    article_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.role not in {UserRole.ADMIN.value, UserRole.MODERATOR.value, UserRole.SENIOR.value}:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    article = await session.get(Article, article_id)
    if not article:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await session.delete(article)
    session.add(AuditLog(user_id=user.id, action=f"Удалена статья «{article.title}»", category="контент"))
    await session.commit()


@router.post("/{article_id}/submit", response_model=ArticleOut)
async def submit_for_review(
    article_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.role == UserRole.VISITOR.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    article = await session.get(Article, article_id)
    if not article:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    article.status = ArticleStatus.REVIEW.value
    article.moderation_note = ""
    session.add(AuditLog(user_id=user.id, action=f"Статья «{article.title}» отправлена на согласование", category="контент"))
    await session.commit()
    return await get_article(article_id, session, user)
