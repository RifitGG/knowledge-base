from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db import get_session
from ..deps import get_current_user, require_roles
from ..models import Notification, User, UserRole
from ..schemas import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _serialize(n: Notification) -> NotificationOut:
    actor_name = n.actor.full_name if n.actor else None
    return NotificationOut.model_validate(
        {
            "id": n.id,
            "title": n.title,
            "body": n.body,
            "category": n.category,
            "link": n.link,
            "actor_id": n.actor_id,
            "actor_name": actor_name,
            "level": n.level or "info",
            "is_read": n.is_read,
            "is_archived": n.is_archived,
            "created_at": n.created_at,
        }
    )


@router.get("", response_model=list[NotificationOut])
async def my_notifications(
    category: str | None = Query(default=None),
    unread: bool = Query(default=False),
    include_archived: bool = Query(default=True),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(Notification)
        .options(selectinload(Notification.actor))
        .where(Notification.user_id == user.id)
    )
    if category:
        stmt = stmt.where(Notification.category == category)
    if unread:
        stmt = stmt.where(Notification.is_read == False)  # noqa: E712
    if not include_archived:
        stmt = stmt.where(Notification.is_archived == False)  # noqa: E712
    stmt = stmt.order_by(Notification.created_at.desc())
    items = (await session.execute(stmt)).scalars().all()
    return [_serialize(n) for n in items]


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    n = await session.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    n.is_read = True
    await session.commit()
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await session.execute(
        update(Notification)
        .where(Notification.user_id == user.id)
        .values(is_read=True)
    )
    await session.commit()
    return {"ok": True}


@router.post("/{notification_id}/archive")
async def archive_notification(
    notification_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    n = await session.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    n.is_archived = True
    n.is_read = True
    await session.commit()
    return {"ok": True}


@router.post("/test", response_model=NotificationOut, status_code=201)
async def send_test_notification(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MODERATOR)),
):
    n = Notification(
        user_id=user.id,
        title="Тестовое уведомление",
        body="Это системное уведомление для проверки доставки.",
        category="система",
        level="info",
        link="/",
        actor_id=user.id,
    )
    session.add(n)
    await session.commit()
    await session.refresh(n)
    stmt = select(Notification).options(selectinload(Notification.actor)).where(Notification.id == n.id)
    refreshed = (await session.execute(stmt)).scalar_one()
    return _serialize(refreshed)