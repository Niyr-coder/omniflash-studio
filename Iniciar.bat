@echo off
title OmniFlash Studio
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Necesitas Node.js para usar OmniFlash Studio.
  echo  Descargalo gratis en https://nodejs.org  ^(version LTS^) y vuelve a abrir este archivo.
  echo.
  start https://nodejs.org
  pause
  exit /b
)
set OPEN_BROWSER=1
node server.js
pause
