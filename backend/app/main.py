from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import Base, SessionLocal, engine
from .routers import admin, articles, auth, notifications, profile, projects
from .seed_data import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as session:
        summary = await seed(session)
        if any(summary.values()):
            print("[seed] Обновлено:", summary)
    yield
    await engine.dispose()


app = FastAPI(title="Корпоративная база знаний", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_root = settings.upload_path
upload_root.mkdir(parents=True, exist_ok=True)
(upload_root / "avatars").mkdir(parents=True, exist_ok=True)
(upload_root / "attachments").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_root)), name="uploads")

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(projects.router)
app.include_router(articles.router)
app.include_router(admin.router)
app.include_router(notifications.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
