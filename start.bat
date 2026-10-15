@echo off
title Mestre Gerador Shopee Video v3.0 - Tech Lemonade
color 0E

echo ========================================================
echo    MESTRE GERADOR DE VDEOS: SHOPEE & TIKTOK SHOP
echo             (Tech Lemonade Logic v3.0)
echo ========================================================
echo.

echo [1/2] Iniciando Servidor Backend (FastAPI em http://localhost:8000)...
start "Backend - FastAPI" cmd /k "cd /d "%~dp0backend" && py -3.14 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Iniciando Interface Frontend (React + Vite em http://localhost:5173)...
start "Frontend - Vite React" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul
echo Abrindo o navegador...
start http://localhost:5173

echo.
echo ========================================================
echo    Sistema iniciado com sucesso!
echo    Frontend: http://localhost:5173
echo    Backend API: http://localhost:8000/docs
echo ========================================================
pause
