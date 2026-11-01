@echo off
title GHOVO Local
echo ====================================================
echo           Iniciando GHOVO en tu navegador...
echo ====================================================
cd /d "%~dp0"
start "" "http://localhost:8081"
call npx.cmd expo start --web --port 8081
pause
