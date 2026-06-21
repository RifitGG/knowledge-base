"""Seed the database with demo content matching the Figma mockups."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    Article,
    ArticleStatus,
    ArticleVersion,
    AuditLog,
    Attachment,
    Notification,
    Project,
    ProjectMember,
    Section,
    User,
    UserRole,
)
from .security import hash_password


async def seed(session: AsyncSession) -> None:
    existing = await session.scalar(select(User).limit(1))
    if existing:
        return

    users = [
        User(
            email="admin@company.ru",
            full_name="Администратор системы",
            password_hash=hash_password("admin"),
            role=UserRole.ADMIN.value,
            department="ИТ",
            position="Администратор",
            phone="+7 (495) 123-45-67",
            about="Отвечает за работоспособность платформы, пользователей и права доступа.",
        ),
        User(
            email="moderator@company.ru",
            full_name="Модератор контента",
            password_hash=hash_password("moderator"),
            role=UserRole.MODERATOR.value,
            department="Контент",
            position="Модератор",
            phone="+7 (495) 123-45-68",
            about="Согласует и публикует материалы, проверяет актуальность статей.",
        ),
        User(
            email="senior@company.ru",
            full_name="Старший сотрудник",
            password_hash=hash_password("senior"),
            role=UserRole.SENIOR.value,
            department="Разработка",
            position="Тимлид",
            phone="+7 (495) 123-45-69",
            about="Ведёт проекты, управляет составом команд и согласует материалы.",
        ),
        User(
            email="employee@company.ru",
            full_name="Рядовой сотрудник",
            password_hash=hash_password("employee"),
            role=UserRole.EMPLOYEE.value,
            department="Разработка",
            position="Разработчик",
            phone="+7 (495) 123-45-70",
            about="Работает в назначенных проектах, готовит и обновляет статьи.",
        ),
        User(
            email="visitor@company.ru",
            full_name="Визитор",
            password_hash=hash_password("visitor"),
            role=UserRole.VISITOR.value,
            department="Внешний",
            position="Гость",
            phone=None,
            about="Читает опубликованные материалы в рамках выданного доступа.",
        ),
    ]
    session.add_all(users)
    await session.flush()

    projects = [
        Project(
            title="Desktop-приложение",
            subtitle="Разработка клиентского решения",
            description="Разработка клиентского решения, материалы, архитектура и внутренняя документация.",
            color="#2959B8",
            is_priority=True,
            owner_id=users[2].id,
        ),
        Project(
            title="Web-платформа",
            subtitle="Frontend и backend",
            description="Frontend, backend и интеграционные материалы проекта базы знаний.",
            color="#6C5CE7",
            is_priority=False,
            owner_id=users[2].id,
        ),
        Project(
            title="Документация API",
            subtitle="Контракты и сценарии",
            description="Методы, схемы запросов, контракты и сценарии для интеграций.",
            color="#1E9E74",
            is_priority=False,
            owner_id=users[2].id,
        ),
        Project(
            title="UX и дизайн",
            subtitle="Гайды и прототипы",
            description="Гайды, прототипы, описание интерфейсов и комментарии по улучшениям.",
            color="#F4B53F",
            is_priority=False,
            owner_id=users[2].id,
        ),
    ]
    session.add_all(projects)
    await session.flush()

    employee_projects = {projects[0].id, projects[1].id}
    visitor_projects = {projects[0].id}
    for p in projects:
        for u in users:
            if u.role == UserRole.EMPLOYEE.value and p.id not in employee_projects:
                continue
            if u.role == UserRole.VISITOR.value and p.id not in visitor_projects:
                continue
            session.add(
                ProjectMember(
                    project_id=p.id,
                    user_id=u.id,
                    project_role="owner" if u.id == p.owner_id else "member",
                )
            )

    desktop = projects[0]

    def add_section(project, title, icon="folder", color="#2959B8", parent=None, order=0):
        s = Section(
            project_id=project.id,
            parent_id=parent.id if parent else None,
            title=title,
            icon=icon,
            color=color,
            sort_order=order,
        )
        session.add(s)
        return s

    intro = add_section(desktop, "Введение", icon="sparkles", color="#F4B53F", order=0)
    await session.flush()
    docs = add_section(desktop, "Документация", icon="book", color="#2959B8", order=1)
    await session.flush()
    overview = add_section(desktop, "Общие сведения", icon="info", color="#1E9E74", parent=docs, order=0)
    architecture = add_section(desktop, "Архитектура", icon="cube", color="#6C5CE7", parent=docs, order=1)
    ui_guide = add_section(desktop, "UX/UI гайд", icon="palette", color="#F0445C", parent=docs, order=2)
    await session.flush()
    tips = add_section(desktop, "Советы по разработке", icon="lightbulb", color="#2959B8", order=2)
    env = add_section(desktop, "Настройка среды", icon="settings", color="#2959B8", order=3)
    api_guide = add_section(desktop, "Руководство по API", icon="code", color="#2959B8", order=4)
    faq = add_section(desktop, "FAQ", icon="chat", color="#2959B8", order=5)
    await session.flush()

    web_root = add_section(projects[1], "Frontend", icon="monitor", color="#2959B8", order=0)
    add_section(projects[1], "Backend", icon="server", color="#6C5CE7", order=1)
    add_section(projects[1], "Интеграции", icon="link", color="#1E9E74", order=2)
    add_section(projects[2], "Методы", icon="code", color="#2959B8", order=0)
    add_section(projects[2], "Схемы", icon="cube", color="#6C5CE7", order=1)
    add_section(projects[3], "Гайд", icon="palette", color="#F4B53F", order=0)
    add_section(projects[3], "Прототипы", icon="monitor", color="#F0445C", order=1)
    await session.flush()

    intro_article = Article(
        project_id=desktop.id,
        section_id=overview.id,
        title="Общие сведения о проекте",
        summary=(
            "Раздел описывает назначение проекта, ключевые сценарии использования платформы и структуру "
            "взаимодействия пользователей с материалами."
        ),
        content=(
            "# Общие сведения о проекте\n\n"
            "В этом материале описываются назначение проекта, структура базы знаний и основные "
            "пользовательские сценарии.\n\n"
            "## 1. Назначение раздела\n\n"
            "Материал нужен для быстрого погружения новых участников в проект. В нём собраны основные "
            "сведения о структуре базы знаний, принципах навигации и ролях пользователей.\n\n"
            "## 2. Состав материалов\n\n"
            "В проекте доступны инструкции, архитектурные схемы, UX/UI гайд, рекомендации по настройке "
            "среды и рабочие документы.\n\n"
            "## 3. Практический сценарий\n\n"
            "Пользователь заходит в проект, выбирает раздел в дереве знаний, открывает статью, "
            "при необходимости переходит к редактированию в пределах своих прав."
        ),
        status=ArticleStatus.PUBLISHED.value,
        version="2.3",
        views=126,
        is_pinned=True,
        author_id=users[2].id,
    )
    session.add(intro_article)
    await session.flush()

    for v in [
        ArticleVersion(article_id=intro_article.id, version="2.1", note="обновление навигации", author_id=users[2].id),
        ArticleVersion(article_id=intro_article.id, version="2.2", note="добавлен раздел UX/UI", author_id=users[2].id),
        ArticleVersion(article_id=intro_article.id, version="2.3", note="правки структуры", author_id=users[2].id),
    ]:
        session.add(v)

    for att in [
        Attachment(article_id=intro_article.id, filename="Схема архитектуры.pdf", size_bytes=820_000),
        Attachment(article_id=intro_article.id, filename="Техническое задание.docx", size_bytes=245_000),
        Attachment(article_id=intro_article.id, filename="Презентация интерфейсов.pptx", size_bytes=3_200_000),
    ]:
        session.add(att)

    more_articles = [
        Article(
            project_id=desktop.id,
            section_id=architecture.id,
            title="Архитектура проекта",
            summary="Общее описание модулей, слоёв и взаимодействий в системе.",
            content=(
                "# Архитектура проекта\n\n"
                "## Слои\n\n"
                "- Presentation\n- Application\n- Domain\n- Infrastructure\n\n"
                "## Границы API\n\n"
                "Описание модулей, контрактов и принципов модульности."
            ),
            status=ArticleStatus.PUBLISHED.value,
            version="1.4",
            views=84,
            author_id=users[2].id,
        ),
        Article(
            project_id=desktop.id,
            section_id=ui_guide.id,
            title="UX/UI гайд проекта",
            summary="Правила построения интерфейсов, цветовая палитра и типографика.",
            content=(
                "# UX/UI гайд\n\nПалитра, типографика, компоненты, состояния, примеры и паттерны."
            ),
            status=ArticleStatus.REVIEW.value,
            version="1.1",
            views=31,
            author_id=users[2].id,
        ),
        Article(
            project_id=desktop.id,
            section_id=api_guide.id,
            title="Инструкция по API",
            summary="Список публичных методов, схемы запросов и ответов.",
            content="# API\n\nАвторизация, методы, пагинация, ошибки, лимиты.",
            status=ArticleStatus.DRAFT.value,
            version="1.0",
            views=12,
            moderation_note="Требуется добавить раздел о лимитах",
            author_id=users[1].id,
        ),
        Article(
            project_id=desktop.id,
            section_id=tips.id,
            title="Советы по разработке",
            summary="Рекомендации по настройке окружения и стиля кода.",
            content="# Советы\n\nСтандарты кода, линтеры, pre-commit, отладка.",
            status=ArticleStatus.PUBLISHED.value,
            version="1.2",
            views=52,
            author_id=users[3].id,
        ),
        Article(
            project_id=desktop.id,
            section_id=env.id,
            title="Настройка среды",
            summary="Установка зависимостей и подготовка проекта.",
            content="# Настройка среды\n\nУстановка, настройка IDE, переменные окружения.",
            status=ArticleStatus.PUBLISHED.value,
            version="1.0",
            views=18,
            author_id=users[3].id,
        ),
        Article(
            project_id=desktop.id,
            section_id=faq.id,
            title="FAQ",
            summary="Ответы на часто задаваемые вопросы по проекту.",
            content="# FAQ\n\n## Как получить доступ?\nОбратитесь к старшему сотруднику.",
            status=ArticleStatus.PUBLISHED.value,
            version="1.0",
            views=9,
            author_id=users[2].id,
        ),
        Article(
            project_id=projects[1].id,
            section_id=web_root.id,
            title="Структура Frontend",
            summary="Разбивка каталогов и подходы к компоновке кода.",
            content="# Структура Frontend\n\nPages, components, hooks, utils.",
            status=ArticleStatus.REVIEW.value,
            version="1.0",
            views=7,
            author_id=users[3].id,
        ),
    ]
    session.add_all(more_articles)

    for u in users:
        session.add(Notification(user_id=u.id, title="Добро пожаловать", body="Платформа базы знаний подготовлена к работе."))

    for msg, cat, target in [
        ("Администратор назначил роль модератора", "безопасность", "Модератор контента"),
        ("Старший сотрудник отправил статью на согласование", "контент", "UX/UI гайд проекта"),
        ("Модератор утвердил обновление раздела «Архитектура»", "контент", "Архитектура проекта"),
        ("Пользователь изменил пароль", "безопасность", ""),
        ("Создан новый проект «Интеграции»", "проекты", "Интеграции"),
    ]:
        session.add(AuditLog(user_id=users[0].id, action=msg, target=target, category=cat))

    await session.commit()
