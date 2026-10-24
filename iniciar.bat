@echo off
chcp 65001 >nul
title MDM Servidor Unificado - Console de Operação
cls
echo ======================================================================
echo    MDM SERVIDOR UNIFICADO - INICIALIZAÇÃO DE SERVIÇOS
echo ======================================================================
echo.

:: 1. Verifica Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não foi encontrado no PATH do sistema.
    echo Instale o Node.js v18+ e tente novamente.
    pause
    exit /b 1
)

:: 2. Verifica se o .env existe
if not exist ".env" (
    echo [AVISO] Arquivo .env não encontrado. Copiando de .env.example...
    copy .env.example .env >nul
    echo [INFO] .env gerado. Verifique as configurações se necessário.
)

:: 3. Verifica serviço do MongoDB
sc query MongoDB | findstr /i "RUNNING" >nul
if %errorlevel% equ 0 (
    echo [OK] Serviço do MongoDB está em execução (Porta 27017).
) else (
    echo [AVISO] Serviço do MongoDB não parece estar em execução.
    echo Tentando iniciar o serviço MongoDB...
    net start MongoDB >nul 2>nul
    if %errorlevel% equ 0 (
        echo [OK] Serviço do MongoDB iniciado com sucesso!
    ) else (
        echo [ALERTA] Não foi possível iniciar o serviço automaticamente.
        echo Certifique-se de que o mongod está ativo antes de continuar.
    )
)

echo.
echo [INFO] Iniciando o servidor MDM na porta padrão...
echo Pressione Ctrl+C para encerrar o processo com segurança.
echo ======================================================================
echo.

node server.js

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] O servidor encerrou com código de falha: %errorlevel%
    pause
)
