@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

if not exist "%BACKEND%\.venv\Scripts\python.exe" (
    echo Creating backend virtual environment...
    pushd "%BACKEND%"
    py -m venv .venv
    if errorlevel 1 (
        echo Failed to create the backend virtual environment.
        popd
        pause
        exit /b 1
    )
    popd
)

if not exist "%FRONTEND%\node_modules" (
    echo Installing frontend dependencies...
    pushd "%FRONTEND%"
    npm install
    if errorlevel 1 (
        echo Failed to install frontend dependencies.
        popd
        pause
        exit /b 1
    )
    popd
)

start "Knowledge Base Backend" /D "%BACKEND%" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --port 8000"
start "Knowledge Base Frontend" /D "%FRONTEND%" cmd /k "npm run dev"

endlocal
