@echo off
title ZapTalk - Setup Evolution API

echo.
echo ============================================
echo   ZapTalk Setup - Evolution API (sem Docker)
echo ============================================
echo.

:: Verifica Git
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git nao encontrado.
    echo.
    echo Instale o Git para Windows:
    echo https://git-scm.com/download/win
    echo.
    echo Apos instalar, feche e reabra este terminal.
    pause
    exit /b 1
)
echo [OK] Git encontrado

:: Verifica Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado.
    echo Baixe em: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js encontrado

:: Verifica Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado.
    echo Baixe em: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo [OK] Python encontrado

echo.

:: Clona Evolution API
if exist "evolution-api\package.json" (
    echo [OK] Evolution API ja existe, pulando clone.
) else (
    echo [1/4] Clonando Evolution API v2...
    git clone -b v2.2.3 https://github.com/EvolutionAPI/evolution-api.git evolution-api
    if errorlevel 1 (
        echo [ERRO] Falha ao clonar repositorio.
        echo Verifique sua conexao com a internet.
        pause
        exit /b 1
    )
    echo [OK] Repositorio clonado
)

:: Instala dependencias
echo [2/4] Instalando dependencias npm...
cd evolution-api
npm install --legacy-peer-deps
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias.
    cd ..
    pause
    exit /b 1
)

:: Cria .env
echo [3/4] Configurando .env da Evolution API...
(
echo SERVER_URL=http://localhost:8080
echo SERVER_PORT=8080
echo SERVER_TYPE=http
echo AUTHENTICATION_TYPE=apikey
echo AUTHENTICATION_API_KEY=zaptalk_secret_key_change_me
echo AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
echo DATABASE_PROVIDER=sqlite
echo DATABASE_URL=file:./dev.db
echo DATABASE_SAVE_DATA_INSTANCE=true
echo DATABASE_SAVE_DATA_NEW_MESSAGE=true
echo DATABASE_SAVE_MESSAGE_UPDATE=true
echo DATABASE_SAVE_DATA_CONTACTS=true
echo DATABASE_SAVE_DATA_CHATS=true
echo DATABASE_SAVE_DATA_LABELS=true
echo DATABASE_SAVE_DATA_HISTORIC=true
echo REDIS_ENABLED=false
echo LOG_LEVEL=ERROR
echo LOG_COLOR=true
echo DEL_INSTANCE=false
echo WEBHOOK_GLOBAL_ENABLED=true
echo WEBHOOK_GLOBAL_URL=http://localhost:8000/api/v1/webhook/evolution
echo WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false
echo CONFIG_SESSION_PHONE_CLIENT=ZapTalk
echo CONFIG_SESSION_PHONE_NAME=Chrome
echo QRCODE_LIMIT=30
echo LANGUAGE=pt-BR
) > .env
echo [OK] .env criado

:: Gera banco e faz build
echo [4/4] Gerando banco e fazendo build...
call npm run db:generate
call npm run db:deploy
call npm run build

cd ..

echo.
echo ============================================
echo   Setup concluido!
echo.
echo   Agora abra 3 terminais e rode:
echo   Terminal 1: start_evolution.bat
echo   Terminal 2: start_backend.bat
echo   Terminal 3: start_frontend.bat
echo ============================================
echo.
pause
