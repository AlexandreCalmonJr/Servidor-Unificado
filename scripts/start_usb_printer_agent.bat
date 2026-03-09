@echo off
setlocal EnableExtensions

REM ==========================================================
REM USB Printer Agent - Launcher (Windows)
REM Duplo clique para iniciar em modo tray.
REM ==========================================================

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "AGENT_PY=%ROOT_DIR%\agents\usb_printer_agent.py"
set "CONFIG_CMD=%SCRIPT_DIR%usb_agent_config.cmd"

if not exist "%AGENT_PY%" (
  echo [ERRO] Arquivo nao encontrado: %AGENT_PY%
  pause
  exit /b 1
)

if exist "%CONFIG_CMD%" (
  call "%CONFIG_CMD%"
) else (
  echo.
  echo === Primeira configuracao do USB Printer Agent ===
  set /p AGENT_SERVER_URL=Servidor (ex: http://10.71.3.110:3000): 
  set /p AGENT_TOKEN=Token do dispositivo: 
  set /p AGENT_DEVICE_ID=Device ID (ENTER para usar %COMPUTERNAME%): 
  set /p AGENT_INTERVAL=Intervalo em segundos (ENTER para 60): 

  if "%AGENT_DEVICE_ID%"=="" set "AGENT_DEVICE_ID=%COMPUTERNAME%"
  if "%AGENT_INTERVAL%"=="" set "AGENT_INTERVAL=60"

  >"%CONFIG_CMD%" echo @echo off
  >>"%CONFIG_CMD%" echo set "AGENT_SERVER_URL=%AGENT_SERVER_URL%"
  >>"%CONFIG_CMD%" echo set "AGENT_TOKEN=%AGENT_TOKEN%"
  >>"%CONFIG_CMD%" echo set "AGENT_DEVICE_ID=%AGENT_DEVICE_ID%"
  >>"%CONFIG_CMD%" echo set "AGENT_INTERVAL=%AGENT_INTERVAL%"

  echo [OK] Configuracao salva em: %CONFIG_CMD%
)

if "%AGENT_SERVER_URL%"=="" (
  echo [ERRO] AGENT_SERVER_URL vazio. Edite %CONFIG_CMD%
  pause
  exit /b 1
)

if "%AGENT_TOKEN%"=="" (
  echo [ERRO] AGENT_TOKEN vazio. Edite %CONFIG_CMD%
  pause
  exit /b 1
)

where pythonw >nul 2>nul
if %errorlevel%==0 (
  set "PYEXE=pythonw"
) else (
  where python >nul 2>nul
  if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado no PATH.
    echo Instale Python 3.10+ e marque "Add Python to PATH".
    pause
    exit /b 1
  )
  set "PYEXE=python"
)

echo [INFO] Iniciando USB Printer Agent em tray...
start "" "%PYEXE%" "%AGENT_PY%" --server "%AGENT_SERVER_URL%" --token "%AGENT_TOKEN%" --device-id "%AGENT_DEVICE_ID%" --interval "%AGENT_INTERVAL%" --tray
echo [OK] Agente iniciado. Verifique o icone na bandeja do sistema.
exit /b 0

