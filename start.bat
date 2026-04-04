@echo off
chcp 65001 >nul
title Knowledge Base - Запуск

echo ========================================
echo   База знаний - Русский Свет
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Запуск Backend (порт 8000)...
start "Backend - FastAPI" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\activate && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/3] Запуск Frontend (порт 5173)...
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npx vite --host 127.0.0.1 --port 5173"

echo [3/3] Запуск Admin (порт 5174)...
start "Admin Panel" cmd /k "cd /d "%~dp0admin" && npx vite --host 127.0.0.1 --port 5174"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Все сервисы запущены:
echo   Frontend:  http://127.0.0.1:5173
echo   Admin:     http://127.0.0.1:5174
echo   API:       http://127.0.0.1:8000/docs
echo ========================================
echo.
echo   Тестовые аккаунты:
echo   admin@russvet.ru / admin123
echo   moderator@russvet.ru / mod123
echo   employee@russvet.ru / emp123
echo ========================================
echo.
pause
