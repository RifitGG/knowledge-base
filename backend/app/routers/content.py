import datetime
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional

from app.database import get_db
from app.models import ContentItem, ContentStatus, ContentType, User, UserRole
from app.schemas import ContentCreate, ContentUpdate, ContentOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/content", tags=["content"])


def make_slug(title: str, id_suffix: int = 0) -> str:
    slug = re.sub(r"[^\w\s-]", "", title.lower())
    slug = re.sub(r"[\s_]+", "-", slug).strip("-")
    if id_suffix:
        slug = f"{slug}-{id_suffix}"
    return slug or "untitled"


@router.get("/", response_model=list[ContentOut])
def list_content(
    content_type: Optional[str] = None,
    status: Optional[str] = None,
    space_id: Optional[int] = None,
    search: Optional[str] = None,
    pinned: Optional[bool] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(ContentItem).options(joinedload(ContentItem.author), joinedload(ContentItem.space))
    if content_type:
        q = q.filter(ContentItem.content_type == content_type)
    if status:
        q = q.filter(ContentItem.status == status)
    else:
        q = q.filter(ContentItem.status == ContentStatus.published)
    if space_id:
        q = q.filter(ContentItem.space_id == space_id)
    if search:
        q = q.filter(ContentItem.title.ilike(f"%{search}%"))
    if pinned is not None:
        q = q.filter(ContentItem.is_pinned == pinned)
    return q.order_by(ContentItem.is_pinned.desc(), ContentItem.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/my", response_model=list[ContentOut])
def my_content(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ContentItem).options(
        joinedload(ContentItem.author), joinedload(ContentItem.space)
    ).filter(ContentItem.author_id == current_user.id)
    if status:
        q = q.filter(ContentItem.status == status)
    return q.order_by(ContentItem.created_at.desc()).all()


@router.get("/{content_id}", response_model=ContentOut)
def get_content(content_id: int, db: Session = Depends(get_db)):
    item = db.query(ContentItem).options(
        joinedload(ContentItem.author), joinedload(ContentItem.space)
    ).filter(ContentItem.id == content_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
    item.views_count += 1
    db.commit()
    db.refresh(item)
    return item


@router.post("/", response_model=ContentOut)
def create_content(
    data: ContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.visitor:
        raise HTTPException(status_code=403, detail="Visitors cannot create content")
    item = ContentItem(
        content_type=data.content_type,
        title=data.title,
        slug=make_slug(data.title),
        summary=data.summary,
        body_md=data.body_md,
        status=data.status,
        author_id=current_user.id,
        space_id=data.space_id,
    )
    if data.status == ContentStatus.published:
        item.published_at = datetime.datetime.utcnow()
    db.add(item)
    db.flush()
    existing = db.query(ContentItem).filter(ContentItem.slug == item.slug, ContentItem.id != item.id).first()
    if existing:
        item.slug = make_slug(data.title, item.id)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{content_id}", response_model=ContentOut)
def update_content(
    content_id: int,
    data: ContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
    if item.author_id != current_user.id and current_user.role not in (UserRole.admin, UserRole.moderator):
        raise HTTPException(status_code=403, detail="Not authorized")
    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == ContentStatus.published and not item.published_at:
            item.published_at = datetime.datetime.utcnow()
        elif new_status == ContentStatus.archived:
            item.archived_at = datetime.datetime.utcnow()
    item.editor_id = current_user.id
    for k, v in update_data.items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{content_id}")
def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ContentItem).filter(ContentItem.id == content_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
    if item.author_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(item)
    db.commit()
    return {"detail": "Deleted"}
