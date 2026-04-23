@echo off
setlocal
title ParkSense AI - Integrated Starter

:: Get current directory
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo.
echo  =========================================
echo    PARKSENSE AI - STARTING SERVICES
echo  =========================================
echo.

:: Start Backend in a new window
echo [1/2] Starting Backend (FastAPI)...
start "ParkSense Backend" cmd /c "cd /d "%ROOT_DIR%backend" && venv\Scripts\activate && uvicorn app:app --host 0.0.0.0 --port 8001"

:: Start Frontend in a new window
echo [2/2] Starting Frontend (Vite)...
start "ParkSense Frontend" cmd /c "cd /d "%ROOT_DIR%frontend" && npm run dev -- --host"

echo.
echo  -----------------------------------------
echo   SERVICES ARE STARTING!
echo  -----------------------------------------
echo.
echo   Backend URL:  http://localhost:8001
echo   Frontend URL: http://localhost:5173
echo.
echo   To access from your phone, use your PC's IP address:
echo   Example: http://192.168.1.XX:5173
echo.
echo  =========================================
echo.
pause
