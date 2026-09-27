@echo off
setlocal
set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
cd /d "%~dp0.."
call "%APPDATA%\npm\pnpm.cmd" backup:local
exit /b %ERRORLEVEL%
