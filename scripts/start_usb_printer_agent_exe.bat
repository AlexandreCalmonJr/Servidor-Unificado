@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "AGENT_EXE=%ROOT_DIR%\dist_usb_agent\USBPrinterAgentTray.exe"
set "CONFIG_CMD=%SCRIPT_DIR%usb_agent_config.cmd"

if not exist "%AGENT_EXE%" (
  echo [ERRO] EXE nao encontrado: %AGENT_EXE%
  echo Rode antes: scripts\build_usb_printer_agent_exe.bat
  pause
  exit /b 1
)

if exist "%CONFIG_CMD%" (
  call "%CONFIG_CMD%"
) else (
  echo [ERRO] Configuracao nao encontrada: %CONFIG_CMD%
  echo Rode primeiro: scripts\start_usb_printer_agent.bat
  pause
  exit /b 1
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

if "%AGENT_DEVICE_ID%"=="" set "AGENT_DEVICE_ID=%COMPUTERNAME%"
if "%AGENT_INTERVAL%"=="" set "AGENT_INTERVAL=60"

echo [INFO] Iniciando EXE em tray...
start "" "%AGENT_EXE%" --server "%AGENT_SERVER_URL%" --token "%AGENT_TOKEN%" --device-id "%AGENT_DEVICE_ID%" --interval "%AGENT_INTERVAL%" --tray
echo [OK] Agente iniciado pelo EXE.
exit /b 0

