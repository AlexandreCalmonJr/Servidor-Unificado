@echo off
chcp 65001 >nul
title MDM Servidor Unificado - Docker Manager
cls

echo ======================================================================
echo    MDM SERVIDOR UNIFICADO - GERENCIADOR DE CONTAINERS DOCKER
echo ======================================================================
echo.

:: 1. Garantir que o Docker esteja no PATH
where docker >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin;%PATH%"
    ) else if exist "C:\Program Files\Docker\Docker\resources\bin\docker.exe" (
        set "PATH=C:\Program Files\Docker\Docker\resources\bin;%PATH%"
    ) else (
        echo [ERRO] O executavel do Docker nao foi encontrado no sistema.
        echo Verifique se o Docker Desktop esta instalado.
        pause
        exit /b 1
    )
)

:: 2. Testar se o Daemon do Docker est?? respondendo
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo [ALERTA] O Docker Desktop parece estar fechado ou inicializando.
    echo Inicie o Docker Desktop e aguarde o icone ficar verde antes de prosseguir.
    echo.
    echo Pressione qualquer tecla para tentar novamente...
    pause >nul
    docker info >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERRO] Nao foi possivel comunicar com o Docker Daemon.
        pause
        exit /b 1
    )
)
echo [OK] Docker Daemon ativo e respondendo!

:: 3. Preven????o de conflito de portas
netstat -ano | findstr /r ":3000 " | findstr /i "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [AVISO] A porta 3000 ja esta em uso na maquina local.
    echo Se houver um processo Node.js nativo rodando, encerre-o para liberar a porta para o container.
)

:: Se o MongoDB local estiver na 27017, mapeia o container para 27018
netstat -ano | findstr /r ":27017 " | findstr /i "LISTENING" >nul
if %errorlevel% equ 0 (
    set "MONGO_PORT=27018"
    echo [INFO] MongoDB local detectado na 27017. O MongoDB do Docker usara a porta 27018.
) else (
    set "MONGO_PORT=27017"
)

:: Suporte a argumentos CLI diretos (ex: iniciar_docker.bat up)
if /i "%1"=="up" goto START_CONTAINERS
if /i "%1"=="start" goto START_CONTAINERS
if /i "%1"=="down" goto STOP_CONTAINERS
if /i "%1"=="stop" goto STOP_CONTAINERS
if /i "%1"=="logs" goto VIEW_LOGS
if /i "%1"=="test" goto RUN_TESTS
if /i "%1"=="build" goto BUILD_IMAGE
if /i "%1"=="status" goto STATUS_CONTAINERS
if /i "%1"=="ps" goto STATUS_CONTAINERS

:MENU
echo.
echo ======================================================================
echo Escolha uma operacao:
echo   [1] Iniciar Containers (Servidor + MongoDB + Redis) em segundo plano
echo   [2] Ver Logs do Servidor em Tempo Real
echo   [3] Executar Bateria de Testes (npm test)
echo   [4] Parar todos os Containers
echo   [5] Reconstruir Imagem do Servidor (Build)
echo   [6] Status dos Containers (docker ps)
echo   [0] Sair
echo ======================================================================
set /p OPCAO="Digite a opcao desejada [1-6]: "

if "%OPCAO%"=="1" goto START_CONTAINERS
if "%OPCAO%"=="2" goto VIEW_LOGS
if "%OPCAO%"=="3" goto RUN_TESTS
if "%OPCAO%"=="4" goto STOP_CONTAINERS
if "%OPCAO%"=="5" goto BUILD_IMAGE
if "%OPCAO%"=="6" goto STATUS_CONTAINERS
if "%OPCAO%"=="0" exit /b 0

echo Opcao invalida. Tente novamente.
goto MENU

:START_CONTAINERS
echo.
echo [INFO] Subindo containers via Docker Compose...
docker compose up -d
if %errorlevel% equ 0 (
    echo.
    echo ======================================================================
    echo [SUCESSO] Servidor MDM em execucao no Docker!
    echo   Painel Web: http://localhost:3000/panel
    echo   Health:     http://localhost:3000/health
    echo ======================================================================
)
if not "%~1"=="" goto :EOF
goto MENU

:VIEW_LOGS
echo.
echo [INFO] Exibindo logs do servidor (Pressione Ctrl+C para voltar)...
docker compose logs -f mdm-server
if not "%~1"=="" goto :EOF
goto MENU

:RUN_TESTS
echo.
echo [INFO] Executando bateria de testes integrados...
npm test
if not "%~1"=="" goto :EOF
goto MENU

:STOP_CONTAINERS
echo.
echo [INFO] Parando todos os containers...
docker compose down
echo [OK] Containers parados com sucesso.
if not "%~1"=="" goto :EOF
goto MENU

:BUILD_IMAGE
echo.
echo [INFO] Reconstruindo a imagem do servidor...
docker compose build mdm-server
goto MENU

:STATUS_CONTAINERS
echo.
docker compose ps
if not "%~1"=="" goto :EOF
goto MENU
