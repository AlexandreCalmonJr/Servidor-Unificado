@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [AVISO] Ambiente virtual não configurado. Executando setup_env.bat primeiro...
    call setup_env.bat
)

echo [INFO] Iniciando USB Printer Monitoring Agent...
".venv\Scripts\python.exe" usb_printer_agent.py %*
