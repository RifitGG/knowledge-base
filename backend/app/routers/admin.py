import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from typing import Optional

from app.database import get_db
from app.models import (
    ContentItem, ContentStatus, ContentType, User, UserRole, UserStatus,
    Notification, Space, SupportTicket, TicketStatus,
)
from app.schemas import ContentOut, StatsOut, NotificationOut, TicketOut, TicketReply
from app.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def admin_or_moderator(current_user: User = Depends(get_current_user)):
    if current_user.role not in (UserRole.admin, UserRole.moderator):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return current_user


@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(admin_or_moderator)):
    total_users = db.query(User).count()
    total_content = db.query(ContentItem).count()
    total_published = db.query(ContentItem).filter(ContentItem.status == ContentStatus.published).count()
    total_spaces = db.query(Space).filter(Space.status == "active").count()
    pending_moderation = db.query(ContentItem).filter(ContentItem.status == ContentStatus.on_review).count()
    open_tickets = db.query(SupportTicket).filter(SupportTicket.status.in_([TicketStatus.open, TicketStatus.in_progress])).count()
    recent = (
        db.query(ContentItem)
        .options(joinedload(ContentItem.author), joinedload(ContentItem.space))
        .order_by(ContentItem.created_at.desc())
        .limit(10)
        .all()
    )
    return StatsOut(
        total_users=total_users,
        total_content=total_content,
        total_published=total_published,
        total_spaces=total_spaces,
        pending_moderation=pending_moderation,
        open_tickets=open_tickets,
        recent_content=recent,
    )


@router.get("/statistics/content-by-type")
def content_by_type(db: Session = Depends(get_db), current_user: User = Depends(admin_or_moderator)):
    rows = db.query(ContentItem.content_type, func.count(ContentItem.id)).group_by(ContentItem.content_type).all()
    return [{"type": r[0].value if hasattr(r[0], 'value') else r[0], "count": r[1]} for r in rows]


@router.get("/statistics/content-by-status")
def content_by_status(db: Session = Depends(get_db), current_user: User = Depends(admin_or_moderator)):
    rows = db.query(ContentItem.status, func.count(ContentItem.id)).group_by(ContentItem.status).all()
    return [{"status": r[0].value if hasattr(r[0], 'value') else r[0], "count": r[1]} for r in rows]


@router.get("/statistics/users-by-role")
def users_by_role(db: Session = Depends(get_db), current_user: User = Depends(admin_or_moderator)):
    rows = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    return [{"role": r[0].value if hasattr(r[0], 'value') else r[0], "count": r[1]} for r in rows]


@router.get("/statistics/content-monthly")
def content_monthly(db: Session = Depends(get_db), current_user: User = Depends(admin_or_moderator)):
    rows = (
        db.query(
            extract("year", ContentItem.created_at).label("y"),
            extract("month", ContentItem.created_at).label("m"),
            func.count(ContentItem.id),
        )
        .group_by("y", "m")
        .order_by("y", "m")
        .all()
    )
    return [{"year": int(r[0]), "month": int(r[1]), "count": r[2]} for r in rows]


@router.get("/moderation", response_model=list[ContentOut])
def moderation_queue(db: Session = Depends(get_db), current_user: User = Depends(admin_or_moderator)):
    return (
        db.query(ContentItem)
        .options(joinedload(ContentItem.author), joinedload(ContentItem.space))
        .filter(ContentItem.status == ContentStatus.on_review)
        .order_by(ContentItem.created_at.desc())
        .all()
    )


@router.post("/moderation/{content_id}/approve", response_model=ContentOut)
def approve_content(content_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_or_moderator)):
    item = db.query(ContentItem).options(joinedload(ContentItem.author), joinedload(ContentItem.space)).filter(ContentItem.id == content_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
    item.status = ContentStatus.published
    item.published_at = datetime.datetime.utcnow()
    item.editor_id = current_user.id
    db.commit()
    db.refresh(item)
    return item


@router.post("/moderation/{content_id}/reject", response_model=ContentOut)
def reject_content(content_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_or_moderator)):
    item = db.query(ContentItem).options(joinedload(ContentItem.author), joinedload(ContentItem.space)).filter(ContentItem.id == content_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
    item.status = ContentStatus.draft
    item.editor_id = current_user.id
    db.commit()
    db.refresh(item)
    return item


@router.get("/tickets", response_model=list[TicketOut])
def list_tickets(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_moderator),
):
    q = db.query(SupportTicket).options(joinedload(SupportTicket.user))
    if status:
        q = q.filter(SupportTicket.status == status)
    return q.order_by(SupportTicket.created_at.desc()).all()


@router.post("/tickets/{ticket_id}/reply", response_model=TicketOut)
def reply_ticket(
    ticket_id: int,
    data: TicketReply,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_moderator),
):
    ticket = db.query(SupportTicket).options(joinedload(SupportTicket.user)).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.admin_reply = data.admin_reply
    if data.status:
        ticket.status = TicketStatus(data.status)
    else:
        ticket.status = TicketStatus.resolved
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/notifications", response_model=list[NotificationOut])
def my_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.post("/notifications/{notif_id}/read")
def mark_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Not found")
    n.is_read = True
    db.commit()
    return {"detail": "ok"}
