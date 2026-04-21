@echo off
title ZapTalk - Evolution API (Terminal 1)

echo.
echo ============================================
echo   Evolution API - Terminal 1
echo ============================================
echo.

if not exist "evolution-api\package.json" (
    echo [ERRO] Evolution API nao instalada.
    echo        Rode primeiro: setup_evolution.bat
    pause
    exit /b 1
)

cd evolution-api

echo   Iniciando Evolution API em http://localhost:8080
echo   Pressione Ctrl+C para encerrar
echo.

npm run start:prod

cd ..
pause
