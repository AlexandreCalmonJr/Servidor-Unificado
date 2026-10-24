@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ======================================================================
echo    CONFIGURAÇÃO DE AMBIENTE VIRTUAL - AGENTE USB PRINTER
echo ======================================================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Python não foi encontrado no PATH do sistema.
    pause
    exit /b 1
)

if not exist ".venv" (
    echo [INFO] Criando ambiente virtual isolado em agents\.venv...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao criar ambiente virtual com venv.
        pause
        exit /b 1
    )
    echo [OK] Ambiente virtual criado com sucesso!
) else (
    echo [INFO] Ambiente virtual .venv já existente.
)

echo.
echo [INFO] Atualizando pip e instalando dependências de requirements.txt...
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\pip.exe" install -r requirements.txt

if %errorlevel% equ 0 (
    echo.
    echo ======================================================================
    echo [SUCESSO] Ambiente virtual configurado e dependências instaladas!
    echo Para iniciar o agente, execute: run_agent.bat
    echo ======================================================================
) else (
    echo.
    echo [ERRO] Falha na instalação de alguns pacotes. Verifique os logs acima.
)
pause
