@echo off
cd /d "%~dp0"
start "Timesheet - Servidor local" powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\servidor-local.ps1"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080/admin-dashboard/index.html"
