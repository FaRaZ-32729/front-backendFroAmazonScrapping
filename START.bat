@REM @echo off
@REM title Scraper Launcher
@REM color 0A

@REM echo.
@REM echo  ============================================
@REM echo    SCRAPER APP - Starting Services...
@REM echo  ============================================
@REM echo.

@REM :: ─── CONFIG ────────────────────────────────────────────
@REM :: Edit these paths if your folder structure is different.
@REM :: This file should sit in the ROOT folder (parent of backend + frontend).

@REM set ROOT=%~dp0
@REM set BACKEND=%ROOT%backend
@REM set FRONTEND=%ROOT%frontend

@REM :: ─── CHECK FOLDERS EXIST ───────────────────────────────
@REM if not exist "%BACKEND%" (
@REM     echo  [ERROR] Backend folder not found: %BACKEND%
@REM     echo  Make sure START.bat is in the root folder
@REM     pause
@REM     exit /b 1
@REM )

@REM if not exist "%FRONTEND%" (
@REM     echo  [ERROR] Frontend folder not found: %FRONTEND%
@REM     echo  Make sure START.bat is in the root folder
@REM     pause
@REM     exit /b 1
@REM )

@REM :: ─── START BACKEND ─────────────────────────────────────
@REM echo  [1/2] Starting Backend  (npm start)...
@REM start "SCRAPER - Backend" cmd /k "cd /d "%BACKEND%" && echo Starting backend... && npm start"

@REM :: Small delay so backend gets a head start
@REM timeout /t 3 /nobreak >nul

@REM :: ─── START FRONTEND ────────────────────────────────────
@REM echo  [2/2] Starting Frontend (npm run dev)...
@REM start "SCRAPER - Frontend" cmd /k "cd /d "%FRONTEND%" && echo Starting frontend... && npm run dev"

@REM echo.
@REM echo  ============================================
@REM echo    Both services are starting up!
@REM echo    Backend  : http://localhost:5000
@REM echo    Frontend : http://localhost:5173
@REM echo  ============================================
@REM echo.
@REM echo  Close this window or press any key to exit launcher.
@REM echo  (Backend and Frontend windows will keep running)
@REM echo.
@REM pause >nul




@echo off
title Scraper App Controller
color 0A

:: ─── ROOT PATH ─────────────────────────────
set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

:: ─── CHECK FOLDERS ─────────────────────────
if not exist "%BACKEND%" (
    echo [ERROR] Backend folder not found
    pause
    exit /b 1
)

if not exist "%FRONTEND%" (
    echo [ERROR] Frontend folder not found
    pause
    exit /b 1
)

:: ─── START SERVICES IN BACKGROUND ───────────
echo Starting services...

:: Start backend (hidden)
start "" /b cmd /c "cd /d "%BACKEND%" && npm start >nul 2>&1"

:: Start frontend (hidden)
start "" /b cmd /c "cd /d "%FRONTEND%" && npm run dev >nul 2>&1"

:: ─── WAIT A BIT ─────────────────────────────
timeout /t 5 /nobreak >nul

cls

:: ─── DISPLAY STATUS ─────────────────────────
echo ============================================
echo      SCRAPER APP RUNNING
echo ============================================
echo.
echo Backend  : http://localhost:5000
echo Frontend : http://localhost:5173
echo.
echo Status   : RUNNING
echo.
echo ============================================
echo.
echo Press any key OR close this window to stop...
echo.

:: ─── WAIT FOR USER EXIT ──────────────────────
pause >nul

:: ─── STOP EVERYTHING ─────────────────────────
echo.
echo Stopping services...

taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.cmd >nul 2>&1

echo Done.
timeout /t 2 >nul
exit