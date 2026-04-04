from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, users, content, spaces, admin

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Knowledge Base API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(content.router)
app.include_router(spaces.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
