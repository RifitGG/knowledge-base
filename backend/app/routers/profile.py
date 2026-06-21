import base64
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session
from ..deps import get_current_user
from ..models import AuditLog, User
from ..schemas import ProfileUpdate, UserOut

router = APIRouter(prefix="/api/profile", tags=["profile"])

UPLOAD_ROOT = settings.upload_path
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
AVATAR_DIR = UPLOAD_ROOT / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

MAX_AVATAR_BYTES = 2 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"}


@router.put("", response_model=UserOut)
async def update_profile(
    data: ProfileUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(user, field, value)
    session.add(AuditLog(user_id=user.id, action="Обновлены данные личного кабинета", category="профиль"))
    await session.commit()
    await session.refresh(user)
    return UserOut.model_validate(user)


@router.post("/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Поддерживаются форматы PNG, JPG, WEBP, GIF, SVG")
    data = await file.read()
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Файл больше 2 МБ")
    ext = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/svg+xml": "svg",
    }[file.content_type]
    name = f"{user.id}-{uuid.uuid4().hex}.{ext}"
    path = AVATAR_DIR / name
    path.write_bytes(data)

    if user.avatar_url and user.avatar_url.startswith("/uploads/avatars/"):
        old = UPLOAD_ROOT / user.avatar_url.removeprefix("/uploads/")
        if old.is_file():
            try:
                old.unlink()
            except OSError:
                pass

    user.avatar_url = f"/uploads/avatars/{name}"
    session.add(AuditLog(user_id=user.id, action="Обновлён аватар профиля", category="профиль"))
    await session.commit()
    await session.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/avatar", response_model=UserOut)
async def remove_avatar(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if user.avatar_url and user.avatar_url.startswith("/uploads/avatars/"):
        old = UPLOAD_ROOT / user.avatar_url.removeprefix("/uploads/")
        if old.is_file():
            try:
                old.unlink()
            except OSError:
                pass
    user.avatar_url = None
    await session.commit()
    await session.refresh(user)
    return UserOut.model_validate(user)
