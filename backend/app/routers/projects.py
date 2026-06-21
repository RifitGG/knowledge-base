from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db import get_session
from ..deps import get_current_user, require_roles
from ..models import Article, AuditLog, Project, ProjectMember, Section, User, UserRole
from ..schemas import (
    ProjectCreate,
    ProjectMemberOut,
    ProjectOut,
    ProjectUpdate,
    SectionCreate,
    SectionNode,
    SectionOut,
    SectionUpdate,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _can_manage_projects(user: User) -> bool:
    return user.role in {UserRole.ADMIN.value, UserRole.MODERATOR.value, UserRole.SENIOR.value}


async def _can_access_project(session: AsyncSession, user: User, project_id: int) -> bool:
    if user.role in {UserRole.ADMIN.value, UserRole.MODERATOR.value, UserRole.SENIOR.value}:
        return True
    membership = await session.scalar(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == user.id)
    )
    return membership is not None


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    scope: str = "mine", 
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Project).order_by(Project.is_priority.desc(), Project.title)
    projects = (await session.execute(stmt)).scalars().all()

    # Membership filter
    membership_stmt = select(ProjectMember.project_id).where(ProjectMember.user_id == user.id)
    my_ids = {pid for (pid,) in (await session.execute(membership_stmt)).all()}

    if scope == "mine":
        projects = [p for p in projects if p.id in my_ids]
    elif scope == "all":
        if user.role in {UserRole.EMPLOYEE.value, UserRole.VISITOR.value}:
            projects = [p for p in projects if p.id in my_ids]

    articles_count_stmt = select(Article.project_id, func.count()).group_by(Article.project_id)
    members_count_stmt = select(ProjectMember.project_id, func.count()).group_by(ProjectMember.project_id)
    updated_at_stmt = select(Article.project_id, func.max(Article.updated_at)).group_by(Article.project_id)

    articles_count = dict((await session.execute(articles_count_stmt)).all())
    members_count = dict((await session.execute(members_count_stmt)).all())
    updated_at = dict((await session.execute(updated_at_stmt)).all())

    result = []
    for p in projects:
        result.append(
            ProjectOut(
                id=p.id,
                title=p.title,
                subtitle=p.subtitle,
                description=p.description,
                color=p.color,
                is_priority=p.is_priority,
                articles_count=articles_count.get(p.id, 0),
                members_count=members_count.get(p.id, 0),
                updated_at=updated_at.get(p.id),
            )
        )
    return result


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    data: ProjectCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not _can_manage_projects(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Проекты создают старшие сотрудники и выше")
    p = Project(
        title=data.title,
        subtitle=data.subtitle,
        description=data.description,
        color=data.color,
        is_priority=data.is_priority,
        owner_id=user.id,
    )
    session.add(p)
    await session.flush()
    session.add(ProjectMember(project_id=p.id, user_id=user.id, project_role="owner"))
    session.add(AuditLog(user_id=user.id, action=f"Создан проект «{p.title}»", category="проекты", target=p.title))
    await session.commit()
    await session.refresh(p)
    return ProjectOut(
        id=p.id,
        title=p.title,
        subtitle=p.subtitle,
        description=p.description,
        color=p.color,
        is_priority=p.is_priority,
        articles_count=0,
        members_count=1,
        updated_at=None,
    )


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Проект не найден")
    if not await _can_access_project(session, user, project_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Нет доступа к проекту")

    articles_count = await session.scalar(
        select(func.count()).select_from(Article).where(Article.project_id == project_id)
    )
    members_count = await session.scalar(
        select(func.count()).select_from(ProjectMember).where(ProjectMember.project_id == project_id)
    )
    last_updated = await session.scalar(
        select(func.max(Article.updated_at)).where(Article.project_id == project_id)
    )
    return ProjectOut(
        id=project.id,
        title=project.title,
        subtitle=project.subtitle,
        description=project.description,
        color=project.color,
        is_priority=project.is_priority,
        articles_count=articles_count or 0,
        members_count=members_count or 0,
        updated_at=last_updated,
    )


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not _can_manage_projects(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    session.add(AuditLog(user_id=user.id, action=f"Обновлён проект «{project.title}»", category="проекты"))
    await session.commit()
    return await get_project(project_id, session, user)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: int,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MODERATOR)),
    session: AsyncSession = Depends(get_session),
):
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await session.delete(project)
    session.add(AuditLog(user_id=user.id, action=f"Удалён проект «{project.title}»", category="проекты"))
    await session.commit()


@router.get("/{project_id}/sections", response_model=list[SectionOut])
async def list_sections(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not await _can_access_project(session, user, project_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    stmt = select(Section).where(Section.project_id == project_id).order_by(Section.sort_order, Section.title)
    return [SectionOut.model_validate(s) for s in (await session.execute(stmt)).scalars().all()]


@router.get("/{project_id}/tree", response_model=list[SectionNode])
async def section_tree(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not await _can_access_project(session, user, project_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    sections_stmt = (
        select(Section)
        .where(Section.project_id == project_id)
        .order_by(Section.sort_order, Section.title)
    )
    sections = (await session.execute(sections_stmt)).scalars().all()

    count_stmt = (
        select(Article.section_id, func.count())
        .where(Article.project_id == project_id)
        .group_by(Article.section_id)
    )
    counts = {sid: c for sid, c in (await session.execute(count_stmt)).all() if sid is not None}

    nodes: dict[int, SectionNode] = {}
    for s in sections:
        nodes[s.id] = SectionNode(
            id=s.id,
            project_id=s.project_id,
            parent_id=s.parent_id,
            title=s.title,
            color=s.color,
            icon=s.icon,
            sort_order=s.sort_order,
            articles_count=counts.get(s.id, 0),
            children=[],
        )
    roots: list[SectionNode] = []
    for s in sections:
        node = nodes[s.id]
        if s.parent_id and s.parent_id in nodes:
            nodes[s.parent_id].children.append(node)
        else:
            roots.append(node)
    return roots


@router.post("/{project_id}/sections", response_model=SectionOut, status_code=201)
async def create_section(
    project_id: int,
    data: SectionCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not _can_manage_projects(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    if data.parent_id is not None:
        parent = await session.get(Section, data.parent_id)
        if not parent or parent.project_id != project_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Некорректный родительский раздел")
    section = Section(
        project_id=project_id,
        parent_id=data.parent_id,
        title=data.title,
        color=data.color,
        icon=data.icon,
        sort_order=data.sort_order,
    )
    session.add(section)
    session.add(AuditLog(user_id=user.id, action=f"Создан раздел «{section.title}»", target=project.title, category="проекты"))
    await session.commit()
    await session.refresh(section)
    return SectionOut.model_validate(section)


@router.put("/sections/{section_id}", response_model=SectionOut)
async def update_section(
    section_id: int,
    data: SectionUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not _can_manage_projects(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    section = await session.get(Section, section_id)
    if not section:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    payload = data.model_dump(exclude_unset=True)
    if "parent_id" in payload and payload["parent_id"] is not None:
        if payload["parent_id"] == section_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Раздел не может быть родителем самому себе")
        parent = await session.get(Section, payload["parent_id"])
        if not parent or parent.project_id != section.project_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Некорректный родительский раздел")
    for field, value in payload.items():
        setattr(section, field, value)
    session.add(AuditLog(user_id=user.id, action=f"Обновлён раздел «{section.title}»", category="проекты"))
    await session.commit()
    await session.refresh(section)
    return SectionOut.model_validate(section)


@router.delete("/sections/{section_id}", status_code=204)
async def delete_section(
    section_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not _can_manage_projects(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    section = await session.get(Section, section_id)
    if not section:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await session.delete(section)
    session.add(AuditLog(user_id=user.id, action=f"Удалён раздел «{section.title}»", category="проекты"))
    await session.commit()


@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
async def list_members(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not await _can_access_project(session, user, project_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    stmt = (
        select(ProjectMember)
        .where(ProjectMember.project_id == project_id)
        .options(selectinload(ProjectMember.user))
    )
    members = (await session.execute(stmt)).scalars().all()
    return [
        ProjectMemberOut(
            id=m.id,
            user_id=m.user_id,
            full_name=m.user.full_name,
            role=m.user.role,
            project_role=m.project_role,
        )
        for m in members
    ]


class AddMemberBody(BaseModel):
    user_id: int
    project_role: str = "member"


@router.post("/{project_id}/members", response_model=ProjectMemberOut, status_code=201)
async def add_member(
    project_id: int,
    data: "AddMemberBody",
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not _can_manage_projects(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    project = await session.get(Project, project_id)
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    target = await session.get(User, data.user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
    existing = await session.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id, ProjectMember.user_id == data.user_id
        )
    )
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Пользователь уже в проекте")
    member = ProjectMember(project_id=project_id, user_id=data.user_id, project_role=data.project_role)
    session.add(member)
    session.add(
        AuditLog(
            user_id=user.id,
            action=f"Добавлен участник «{target.full_name}» в проект «{project.title}»",
            category="проекты",
        )
    )
    await session.commit()
    await session.refresh(member)
    return ProjectMemberOut(
        id=member.id,
        user_id=member.user_id,
        full_name=target.full_name,
        role=target.role,
        project_role=member.project_role,
    )


@router.delete("/{project_id}/members/{member_id}", status_code=204)
async def remove_member(
    project_id: int,
    member_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not _can_manage_projects(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    member = await session.get(ProjectMember, member_id)
    if not member or member.project_id != project_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    await session.delete(member)
    session.add(AuditLog(user_id=user.id, action="Исключён участник из проекта", category="проекты"))
    await session.commit()
