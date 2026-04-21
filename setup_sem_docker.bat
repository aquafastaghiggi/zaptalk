@echo off
chcp 65001 > nul
title ZapTalk — Setup sem Docker

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║     ZapTalk Setup — Sem Docker (Windows)     ║
echo  ╚══════════════════════════════════════════════╝
echo.
echo  Este script vai:
echo  1. Instalar a Evolution API via npm
echo  2. Configurar o ambiente Python
echo  3. Criar banco e usuario admin
echo.
pause

:: ── Verifica Node ──────────────────────────────────────────────────
echo [Verificando Node.js...]
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado.
    echo        Baixe em: https://nodejs.org  (versao LTS^)
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo  OK - Node %%v

:: ── Verifica Python ───────────────────────────────────────────────
echo [Verificando Python...]
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado.
    echo        Baixe em: https://www.python.org/downloads/
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do echo  OK - %%v

echo.

:: ── Instala Evolution API via npm ─────────────────────────────────
echo [1/4] Instalando Evolution API (pode demorar 2-3 minutos)...
if not exist "evolution-api" mkdir evolution-api
cd evolution-api

if not exist "package.json" (
    npm init -y > nul 2>&1
    npm install @evolution-api/evolution-api > nul 2>&1
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar Evolution API via npm.
        echo        Tente rodar manualmente: npm install @evolution-api/evolution-api
        cd ..
        pause & exit /b 1
    )
)
echo  OK - Evolution API instalada

cd ..

:: ── Ambiente Python ───────────────────────────────────────────────
echo [2/4] Configurando ambiente Python...
cd backend

if not exist ".venv" (
    echo  Criando ambiente virtual...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo  Instalando dependencias Python...
pip install -r requirements.txt -q
echo  OK - dependencias instaladas

:: ── Seed ─────────────────────────────────────────────────────────
if not exist "zaptalk.db" (
    echo [3/4] Criando banco e admin inicial...
    python seed.py
) else (
    echo [3/4] Banco ja existe, pulando seed.
)

cd ..

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║           Setup concluido com sucesso!       ║
echo  ║                                              ║
echo  ║  Agora rode em 3 terminais separados:        ║
echo  ║                                              ║
echo  ║  Terminal 1:  start_evolution.bat            ║
echo  ║  Terminal 2:  start_backend.bat              ║
echo  ║  Terminal 3:  start_frontend.bat             ║
echo  ╚══════════════════════════════════════════════╝
echo.
pause
