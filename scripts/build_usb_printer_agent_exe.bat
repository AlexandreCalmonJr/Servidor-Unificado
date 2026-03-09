@echo off
setlocal EnableExtensions

REM ==========================================================
REM Build EXE - USB Printer Agent (PyInstaller)
REM Gera um executavel para uso pratico.
REM ==========================================================

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "AGENT_PY=%ROOT_DIR%\agents\usb_printer_agent.py"
set "DIST_DIR=%ROOT_DIR%\dist_usb_agent"

if not exist "%AGENT_PY%" (
  echo [ERRO] Arquivo nao encontrado: %AGENT_PY%
  pause
  exit /b 1
)

where python >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERRO] Python nao encontrado no PATH.
  pause
  exit /b 1
)

echo [INFO] Instalando dependencias de build...
python -m pip install --upgrade pip
python -m pip install pyinstaller requests pystray pillow
if %errorlevel% neq 0 (
  echo [ERRO] Falha ao instalar dependencias.
  pause
  exit /b 1
)

echo [INFO] Limpando build anterior...
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"

echo [INFO] Gerando EXE...
python -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --onefile ^
  --noconsole ^
  --name USBPrinterAgentTray ^
  --distpath "%DIST_DIR%" ^
  "%AGENT_PY%"

if %errorlevel% neq 0 (
  echo [ERRO] Falha no build do EXE.
  pause
  exit /b 1
)

echo [OK] EXE gerado em:
echo      %DIST_DIR%\USBPrinterAgentTray.exe
echo.
echo [INFO] Execute junto com:
echo      scripts\start_usb_printer_agent_exe.bat
exit /b 0

