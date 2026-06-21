from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db import get_session
from ..deps import require_roles
from ..models import Article, ArticleStatus, AuditLog, Notification, Project, ProjectMember, User, UserRole
from ..schemas import (
    AuditEntry,
    DashboardStats,
    DepartmentOut,
    ModerationDecision,
    ModerationItem,
    PasswordUpdate,
    UserCreate,
    UserOut,
    UserUpdate,
)
from ..security import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_ROLES = (UserRole.ADMIN, UserRole.MODERATOR)


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    active_users = (await session.scalar(select(func.count()).select_from(User).where(User.is_active))) or 0
    projects = (await session.scalar(select(func.count()).select_from(Project))) or 0
    in_moderation = (await session.scalar(
        select(func.count()).select_from(Article).where(Article.status == ArticleStatus.REVIEW.value)
    )) or 0
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    users_delta_week = (await session.scalar(
        select(func.count()).select_from(User).where(User.created_at >= week_ago)
    )) or 0
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    new_projects_month = (await session.scalar(
        select(func.count()).select_from(Project).where(Project.created_at >= month_ago)
    )) or 0
    security_alerts = (await session.scalar(
        select(func.count()).select_from(AuditLog).where(AuditLog.category == "безопасность")
    )) or 0
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    alerts_today = (await session.scalar(
        select(func.count())
        .select_from(AuditLog)
        .where(AuditLog.category == "безопасность", AuditLog.created_at >= today)
    )) or 0

    return DashboardStats(
        active_users=active_users,
        projects=projects,
        in_moderation=in_moderation,
        security_alerts=security_alerts,
        users_delta_week=users_delta_week,
        new_projects_month=new_projects_month,
        pending_approvals=in_moderation,
        alerts_today=alerts_today,
    )


@router.get("/moderation", response_model=list[ModerationItem])
async def moderation_queue(
    statuses: str = "review,draft",
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    status_list = [s.strip() for s in statuses.split(",") if s.strip()]
    stmt = (
        select(Article)
        .options(selectinload(Article.author), selectinload(Article.project))
        .where(Article.status.in_(status_list))
        .order_by(Article.updated_at.desc())
    )
    items = (await session.execute(stmt)).scalars().all()
    status_map = {
        ArticleStatus.REVIEW.value: "На проверке",
        ArticleStatus.DRAFT.value: "Требует правок",
        ArticleStatus.PUBLISHED.value: "Опубликовано",
        ArticleStatus.ARCHIVED.value: "В архиве",
    }
    now = datetime.now(timezone.utc)
    result = []
    for a in items:
        age_hours = (now - a.updated_at).total_seconds() / 3600 if a.updated_at else 0
        if age_hours < 24:
            deadline = "Сегодня"
        elif age_hours < 48:
            deadline = "Завтра"
        else:
            deadline = "Эта неделя"
        result.append(
            ModerationItem(
                id=a.id,
                article_id=a.id,
                title=a.title,
                summary=a.summary,
                project_id=a.project_id,
                project_title=a.project.title if a.project else "—",
                author_name=a.author.full_name if a.author else "—",
                status=status_map.get(a.status, a.status),
                updated_at=a.updated_at,
                deadline=deadline,
            )
        )
    return result


@router.post("/moderation/{article_id}")
async def moderate_article(
    article_id: int,
    data: ModerationDecision,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    article = await session.get(Article, article_id)
    if not article:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    level = "info"
    if data.decision == "approve":
        article.status = ArticleStatus.PUBLISHED.value
        article.moderation_note = ""
        action_text = f"Одобрена статья «{article.title}»"
        level = "success"
    elif data.decision == "request_changes":
        article.status = ArticleStatus.DRAFT.value
        article.moderation_note = data.note or "Требуются правки"
        action_text = f"Статья «{article.title}» отправлена на доработку"
        level = "warning"
    elif data.decision == "reject":
        article.status = ArticleStatus.ARCHIVED.value
        article.moderation_note = data.note or "Отклонено"
        action_text = f"Отклонена статья «{article.title}»"
        level = "error"
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Неизвестное решение модерации")

    if article.author_id:
        link = f"/projects/{article.project_id}/articles/{article.id}"
        body = action_text + ((". Комментарий: " + data.note) if data.note else "")
        session.add(
            Notification(
                user_id=article.author_id,
                title=f"Модерация: {article.title}",
                body=body,
                category="модерация",
                link=link,
                actor_id=user.id,
                level=level,
            )
        )
    session.add(AuditLog(user_id=user.id, action=action_text, category="контент", target=article.title))
    await session.commit()
    return {"ok": True, "status": article.status}


@router.get("/audit", response_model=list[AuditEntry])
async def audit_feed(
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    stmt = (
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    items = (await session.execute(stmt)).scalars().all()
    return [
        AuditEntry(
            id=a.id,
            time=a.created_at.strftime("%H:%M"),
            user_name=a.user.full_name if a.user else "Система",
            action=a.action,
            target=a.target,
            category=a.category,
        )
        for a in items
    ]


@router.get("/users", response_model=list[UserOut])
async def list_users(
    department: str | None = None,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    stmt = select(User)
    if department:
        stmt = stmt.where(User.department == department.strip())
    stmt = stmt.order_by(User.full_name)
    return [UserOut.model_validate(u) for u in (await session.execute(stmt)).scalars().all()]


@router.get("/departments", response_model=list[DepartmentOut])
async def list_departments(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    stmt = (
        select(User.department, func.count())
        .where(User.department.is_not(None))
        .group_by(User.department)
        .order_by(User.department)
    )
    rows = (await session.execute(stmt)).all()
    return [DepartmentOut(name=name, count=count) for name, count in rows if name]


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(
    data: UserCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    exists = await session.scalar(select(User).where(User.email == data.email.lower()))
    if exists:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Пользователь с такой почтой уже существует")
    new_user = User(
        email=data.email.lower(),
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role=data.role,
        department=data.department,
        position=data.position,
        phone=data.phone,
    )
    session.add(new_user)
    session.add(AuditLog(user_id=user.id, action=f"Создан пользователь «{data.full_name}»", category="безопасность"))
    await session.commit()
    await session.refresh(new_user)
    return UserOut.model_validate(new_user)


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    data: UserUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    allowed_fields = {"full_name", "role", "department", "position", "phone", "about", "avatar_url", "is_active"}
    for field, value in data.model_dump(exclude_unset=True).items():
        if field not in allowed_fields:
            continue
        if field == "department" and isinstance(value, str):
            value = value.strip()[:128] or None
        setattr(target, field, value)
    session.add(AuditLog(user_id=user.id, action=f"Обновлён пользователь «{target.full_name}»", category="безопасность"))
    await session.commit()
    await session.refresh(target)
    return UserOut.model_validate(target)


@router.post("/users/{user_id}/password")
async def reset_password(
    user_id: int,
    data: PasswordUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    target.password_hash = hash_password(data.new_password)
    session.add(
        Notification(
            user_id=target.id,
            title="Пароль был сброшен администратором",
            body="Свяжитесь с администратором, чтобы получить новый пароль, и смените его при первом входе.",
            category="безопасность",
            level="warning",
            actor_id=user.id,
            link="/profile",
        )
    )
    session.add(AuditLog(user_id=user.id, action=f"Сброшен пароль пользователя «{target.full_name}»", category="безопасность"))
    await session.commit()
    return {"ok": True}


@router.get("/users/{user_id}/projects")
async def user_projects(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    stmt = (
        select(Project, ProjectMember.project_role, ProjectMember.id)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .where(ProjectMember.user_id == user_id)
        .order_by(Project.title)
    )
    rows = (await session.execute(stmt)).all()
    return [
        {
            "membership_id": membership_id,
            "project_id": project.id,
            "title": project.title,
            "color": project.color,
            "project_role": project_role,
        }
        for project, project_role, membership_id in rows
    ]


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(UserRole.ADMIN)),
):
    target = await session.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    if target.id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Нельзя удалить текущего пользователя")
    await session.delete(target)
    session.add(AuditLog(user_id=user.id, action=f"Удалён пользователь «{target.full_name}»", category="безопасность"))
    await session.commit()


@router.get("/analytics")
async def analytics(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    # By role counts
    role_stmt = select(User.role, func.count()).group_by(User.role)
    roles = {r: c for r, c in (await session.execute(role_stmt)).all()}

    # By status article counts
    status_stmt = select(Article.status, func.count()).group_by(Article.status)
    statuses = {s: c for s, c in (await session.execute(status_stmt)).all()}

    # Top projects by articles
    top_stmt = (
        select(Project.id, Project.title, Project.color, func.count(Article.id))
        .join(Article, Article.project_id == Project.id, isouter=True)
        .group_by(Project.id, Project.title, Project.color)
        .order_by(func.count(Article.id).desc())
        .limit(6)
    )
    top_projects = [
        {"id": pid, "title": title, "color": color, "articles": count}
        for pid, title, color, count in (await session.execute(top_stmt)).all()
    ]

    # Daily activity in last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    activity_stmt = (
        select(func.date_trunc("day", AuditLog.created_at).label("day"), func.count())
        .where(AuditLog.created_at >= week_ago)
        .group_by("day")
        .order_by("day")
    )
    activity = [
        {"day": day.strftime("%Y-%m-%d"), "events": count}
        for day, count in (await session.execute(activity_stmt)).all()
    ]

    return {
        "roles": roles,
        "statuses": statuses,
        "top_projects": top_projects,
        "activity": activity,
    }


@router.get("/security")
async def security_events(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    stmt = (
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .where(AuditLog.category == "безопасность")
        .order_by(AuditLog.created_at.desc())
        .limit(40)
    )
    items = (await session.execute(stmt)).scalars().all()
    return [
        {
            "id": a.id,
            "time": a.created_at.isoformat(),
            "user": a.user.full_name if a.user else "Система",
            "action": a.action,
            "target": a.target,
        }
        for a in items
    ]
