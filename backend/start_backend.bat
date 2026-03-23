@echo off
title Parking-AI Backend
cd /d "%~dp0"
call venv\Scripts\activate
uvicorn app:app --host 0.0.0.0 --port 8001
pause
