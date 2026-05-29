@echo off
title RMS - Starting Both Servers...
echo.
echo ============================================
echo   RMS Full-Stack Development Launcher
echo ============================================
echo.

:: Start the backend API (dotnet run) in a new window
echo [1/2] Starting Backend API (dotnet run on port 5275)...
start "RMS Backend - dotnet" cmd /k "cd /d %~dp0RmsApi && dotnet run"

:: Small delay to let backend start first
timeout /t 3 /nobreak > nul

:: Start the frontend dev server (npm run dev) in a new window
echo [2/2] Starting Frontend Dev Server (npm run dev on port 5173)...
start "RMS Frontend - vite" cmd /k "cd /d %~dp0rms-frontend && npm run dev"

echo.
echo ============================================
echo   Both servers are starting!
echo   Backend:  http://localhost:5275
echo   Frontend: http://localhost:5173
echo   Close this window anytime.
echo ============================================
echo.
pause
