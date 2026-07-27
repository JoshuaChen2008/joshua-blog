@echo off
setlocal

cd /d "%~dp0"

where bun >nul 2>&1
if errorlevel 1 (
  echo [Blog Studio] Bun was not found. Install Bun and add it to PATH first.
  pause
  exit /b 1
)

echo [Blog Studio] Starting the local server.
echo [Blog Studio] Press Ctrl+C to stop.
echo.

call bun run blog:studio -- %*
set "blogStudioExitCode=%errorlevel%"

if not "%blogStudioExitCode%"=="0" (
  echo.
  echo [Blog Studio] The server stopped with exit code %blogStudioExitCode%.
  pause
)

exit /b %blogStudioExitCode%
