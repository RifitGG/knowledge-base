import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import User, Space, ContentItem, ContentType, ContentStatus, UserRole
from app.auth import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

if not db.query(User).filter(User.email == "admin@russvet.ru").first():
    admin = User(
        email="admin@russvet.ru",
        password_hash=hash_password("admin123"),
        full_name="Администратор",
        position="Системный администратор",
        role=UserRole.admin,
    )
    moderator = User(
        email="moderator@russvet.ru",
        password_hash=hash_password("mod123"),
        full_name="Модератор Иванов",
        position="Контент-менеджер",
        role=UserRole.moderator,
    )
    employee = User(
        email="employee@russvet.ru",
        password_hash=hash_password("emp123"),
        full_name="Сотрудник Петров",
        position="Инженер",
        role=UserRole.employee,
    )
    db.add_all([admin, moderator, employee])
    db.flush()

    s1 = Space(name="Общие новости", description="Новости компании для всех сотрудников", created_by=admin.id)
    s2 = Space(name="Документация", description="Техническая документация и инструкции", created_by=admin.id)
    s3 = Space(name="Обучение", description="Обучающие материалы и курсы", created_by=admin.id)
    db.add_all([s1, s2, s3])
    db.flush()

    import datetime
    articles = [
        ContentItem(
            content_type=ContentType.news,
            title="Добро пожаловать в базу знаний",
            slug="welcome",
            summary="Первая новость: платформа запущена!",
            body_md="# Добро пожаловать!\n\nМы рады представить вам корпоративную базу знаний компании **Русский Свет**.\n\nЗдесь вы найдёте всю необходимую информацию для работы.",
            status=ContentStatus.published,
            author_id=admin.id,
            space_id=s1.id,
            is_pinned=True,
            published_at=datetime.datetime.utcnow(),
        ),
        ContentItem(
            content_type=ContentType.news,
            title="Обновление регламента работы",
            slug="reglament-update",
            summary="Важные изменения в регламенте",
            body_md="## Обновление регламента\n\nС 1 апреля вступают в силу обновлённые правила...",
            status=ContentStatus.published,
            author_id=moderator.id,
            space_id=s1.id,
            published_at=datetime.datetime.utcnow(),
        ),
        ContentItem(
            content_type=ContentType.article,
            title="Как начать работу с платформой",
            slug="getting-started",
            summary="Руководство по началу работы",
            body_md="# Начало работы\n\n1. Войдите в систему\n2. Перейдите в раздел Пространства\n3. Выберите нужный блок\n4. Начните читать или создавать статьи",
            status=ContentStatus.published,
            author_id=admin.id,
            space_id=s3.id,
            published_at=datetime.datetime.utcnow(),
        ),
        ContentItem(
            content_type=ContentType.doc,
            title="Инструкция по безопасности",
            slug="safety-guide",
            summary="Основные правила безопасности",
            body_md="# Инструкция по безопасности\n\nВсе сотрудники обязаны ознакомиться...",
            status=ContentStatus.published,
            author_id=admin.id,
            space_id=s2.id,
            published_at=datetime.datetime.utcnow(),
        ),
        ContentItem(
            content_type=ContentType.article,
            title="Черновик: Новый проект",
            slug="draft-new-project",
            summary="Описание нового проекта",
            body_md="# Новый проект\n\nЭто черновик...",
            status=ContentStatus.draft,
            author_id=employee.id,
            space_id=s2.id,
        ),
        ContentItem(
            content_type=ContentType.news,
            title="На модерации: корпоратив",
            slug="review-corporate",
            summary="Информация о корпоративе",
            body_md="# Корпоратив\n\nПриглашаем всех на корпоратив...",
            status=ContentStatus.on_review,
            author_id=employee.id,
            space_id=s1.id,
        ),
    ]
    db.add_all(articles)
    db.commit()
    print("Seed data created successfully!")
else:
    print("Data already exists, skipping seed.")

db.close()
