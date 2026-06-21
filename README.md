# Корпоративная база знаний

Веб-платформа корпоративной базы знаний с централизованным хранилищем информации, ролевой моделью доступа, системой уведомлений, редактором статей и административной панелью.

![Главный экран приложения](https://github.com/RifitGG/knowledge-base/blob/main/Снимок%20экрана%202026-06-20%20112316.png)
---
![Раздел в статье](https://github.com/RifitGG/knowledge-base/blob/main/Снимок%20экрана%202026-06-20%20112640.png)
---
![Админ панель](https://github.com/RifitGG/knowledge-base/blob/main/Снимок%20экрана%202026-06-20%20085829.png)
## Стек

- **Frontend**: React + TypeScript + Vite, TailwindCSS + LessCSS
- **Backend**: Python + FastAPI + SQLAlchemy (async)
- **СУБД**: PostgreSQL (`knowBase`, порт 4000, пароль ``)

## Роли

- `admin` — администратор (панель, аудит, пользователи)
- `moderator` — модератор (панель, правки, статистика)
- `senior` — старший сотрудник (создаёт проекты, согласует)
- `employee` — рядовой сотрудник (работает в назначенных проектах)
- `visitor` — визитор (просмотр доступных статей)

## Запуск

### Backend
```powershell
py -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
py -m pip install -r backend\requirements.txt
py -m uvicorn app.main:app --reload --app-dir backend --port 8000
```

При первом запуске backend создаёт таблицы и наполняет тестовыми данными (логины: `admin@company.ru / admin`, `senior@company.ru / senior`, `employee@company.ru / employee`, `visitor@company.ru / visitor`).

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

По умолчанию frontend запускается на `http://localhost:5173` и проксирует `/api` на `http://localhost:8000`.

## Структура репозитория

- `backend/` — FastAPI приложение, модели, миграции и сиды
- `frontend/` — React-приложение, UI строго по макету Figma
- `figma_previews/` — PNG-рендеры макетов для сверки дизайна

## Иконки и логотип

- Иконки: `lucide-react` (ISC) — все визуальные иконки настоящие векторные, единый API через `components/Icon.tsx`
- Логотип: если вы положите файл `frontend/public/rus-svet-logo.svg` или `.png`, компонент `components/Logo.tsx` автоматически подхватит его.
