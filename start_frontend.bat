@echo off
title ZapTalk - Frontend React (Terminal 3)

echo.
echo ============================================
echo   Frontend React - Terminal 3
echo ============================================
echo.

cd frontend

if not exist "node_modules" (
    echo Instalando dependencias npm...
    npm install
)

echo   Painel: http://localhost:5173
echo   Pressione Ctrl+C para encerrar
echo.

npm run dev

cd ..
pause
