from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import get_current_user
from ..models import AuditLog, User
from ..schemas import LoginRequest, PasswordUpdate, TokenResponse, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_session)):
    stmt = select(User).where(User.email == data.email.lower())
    user = (await session.execute(stmt)).scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверная почта или пароль")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Аккаунт отключён")
    token = create_access_token(user.id, {"role": user.role})
    session.add(AuditLog(user_id=user.id, action="Вход в систему", category="безопасность"))
    await session.commit()
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.post("/password")
async def change_password(
    data: PasswordUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if data.current_password is None or not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Текущий пароль неверный")
    user.password_hash = hash_password(data.new_password)
    session.add(AuditLog(user_id=user.id, action="Смена пароля", category="безопасность"))
    await session.commit()
    return {"ok": True}
