@echo off
title ZapTalk - Backend Python (Terminal 2)

echo.
echo ============================================
echo   Backend Python - Terminal 2
echo ============================================
echo.

cd backend

if not exist ".venv" (
    echo Criando ambiente virtual Python...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

if not exist "zaptalk.db" (
    echo Instalando dependencias...
    pip install -r requirements.txt -q
    echo Criando banco e admin inicial...
    python seed.py
)

echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Pressione Ctrl+C para encerrar
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

cd ..
pause
