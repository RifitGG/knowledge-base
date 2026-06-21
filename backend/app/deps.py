from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_session
from .models import User, UserRole
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Требуется авторизация")
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Невалидный токен")
    user = await session.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Пользователь недоступен")
    return user


def require_roles(*roles: UserRole):
    role_values = {r.value for r in roles}

    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in role_values:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Недостаточно прав")
        return user

    return checker
