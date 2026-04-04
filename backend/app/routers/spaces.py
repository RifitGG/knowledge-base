from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Space, User, UserRole
from app.schemas import SpaceCreate, SpaceUpdate, SpaceOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/spaces", tags=["spaces"])


@router.get("/", response_model=list[SpaceOut])
def list_spaces(db: Session = Depends(get_db)):
    return db.query(Space).filter(Space.status == "active").order_by(Space.name).all()


@router.get("/{space_id}", response_model=SpaceOut)
def get_space(space_id: int, db: Session = Depends(get_db)):
    space = db.query(Space).filter(Space.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


@router.post("/", response_model=SpaceOut)
def create_space(
    data: SpaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.admin, UserRole.moderator, UserRole.senior_employee):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    space = Space(
        name=data.name,
        description=data.description,
        visibility=data.visibility,
        created_by=current_user.id,
    )
    db.add(space)
    db.commit()
    db.refresh(space)
    return space


@router.patch("/{space_id}", response_model=SpaceOut)
def update_space(
    space_id: int,
    data: SpaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.admin, UserRole.moderator):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    space = db.query(Space).filter(Space.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(space, k, v)
    db.commit()
    db.refresh(space)
    return space


@router.delete("/{space_id}")
def delete_space(
    space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    space = db.query(Space).filter(Space.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    space.status = "archived"
    db.commit()
    return {"detail": "Archived"}
