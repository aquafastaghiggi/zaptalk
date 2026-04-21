@echo off
chcp 65001 > nul
title ZapTalk — Servidor Local

echo.
echo  ╔══════════════════════════════════════╗
echo  ║         ZapTalk MVP Launcher         ║
echo  ╚══════════════════════════════════════╝
echo.

:: ── Verifica Python ──────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Instale Python 3.10+ e tente novamente.
    pause
    exit /b 1
)

:: ── Verifica Docker ──────────────────────────────────────────────
docker --version >nul 2>&1
if errorlevel 1 (
    echo [AVISO] Docker nao encontrado. A Evolution API nao sera iniciada.
    echo         Instale Docker Desktop: https://www.docker.com/products/docker-desktop
    goto :skip_docker
)

echo [1/4] Subindo Evolution API + Redis via Docker...
docker compose up -d
if errorlevel 1 (
    echo [AVISO] Falha ao subir Docker. Continuando apenas com o backend Python...
)
echo       Aguardando Evolution API iniciar...
timeout /t 5 /nobreak > nul

:skip_docker

:: ── Ambiente virtual ─────────────────────────────────────────────
echo [2/4] Configurando ambiente Python...
cd backend

if not exist ".venv" (
    echo       Criando ambiente virtual...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo       Instalando dependencias...
pip install -r requirements.txt -q

:: ── Seed (apenas se banco nao existir) ───────────────────────────
if not exist "zaptalk.db" (
    echo [3/4] Criando banco e usuario admin...
    python seed.py
) else (
    echo [3/4] Banco ja existe, pulando seed.
)

:: ── Inicia servidor ──────────────────────────────────────────────
echo [4/4] Iniciando servidor FastAPI...
echo.
echo  ┌─────────────────────────────────────────────┐
echo  │  Backend:    http://localhost:8000           │
echo  │  Docs API:   http://localhost:8000/docs      │
echo  │  Evolution:  http://localhost:8080           │
echo  │                                              │
echo  │  Pressione Ctrl+C para encerrar             │
echo  └─────────────────────────────────────────────┘
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
