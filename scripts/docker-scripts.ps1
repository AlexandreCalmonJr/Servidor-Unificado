# ===================================================================
# SCRIPTS DE AUTOMACAO DOCKER - MDM SERVIDOR UNIFICADO (PowerShell)
# ===================================================================

param(
    [Parameter(Position=0)]
    [ValidateSet("up", "down", "restart", "build", "logs", "status", "test", "health", "shell", "menu")]
    [string]$Command = "menu",

    [Parameter(Position=1)]
    [string]$Service = "mdm-server"
)

# Cores
function Write-Color($msg, $color = "Cyan") {
    Write-Host $msg -ForegroundColor $color
}

# 1. Garantir que o Docker esteja no PATH da sessao
function Ensure-DockerPath {
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        $pathsToCheck = @(
            "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin",
            "C:\Program Files\Docker\Docker\resources\bin"
        )
        foreach ($p in $pathsToCheck) {
            if (Test-Path "$p\docker.exe") {
                $env:Path = "$p;$env:Path"
                break
            }
        }
    }
}

Ensure-DockerPath

# 2. Validar se o Docker Daemon esta ativo
function Test-DockerDaemon {
    try {
        $info = docker info --format "{{.ServerVersion}}" 2>$null
        if ($LASTEXITCODE -eq 0 -and $info) {
            return $true
        }
    } catch {}
    return $false
}

# 3. Configurar portas para evitar colisao com servicos nativos
function Configure-Ports {
    $mongoBusy = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($mongoBusy) {
        $env:MONGO_PORT = "27018"
        Write-Color "[INFO] MongoDB nativo detectado na porta 27017. O MongoDB do Docker usara a porta 27018." "Yellow"
    } else {
        $env:MONGO_PORT = "27017"
    }

    $serverBusy = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($serverBusy) {
        Write-Color "[AVISO] Atencao: A porta 3000 ja esta em uso por outro processo no host." "Yellow"
    }
}

# 4. Operacoes
function Start-Stack {
    Configure-Ports
    Write-Color "`n[START] Subindo stack completa no Docker (Servidor + MongoDB + Redis)..." "Cyan"
    docker compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Color "[SUCESSO] Containers inicializados com sucesso!" "Green"
        Write-Color "   - Painel Web: http://localhost:3000/panel" "Green"
        Write-Color "   - Health:     http://localhost:3000/health" "Green"
        Write-Color "   - Metricas:   http://localhost:3000/metrics" "Green"
    } else {
        Write-Color "[ERRO] Falha ao iniciar os containers." "Red"
    }
}

function Stop-Stack {
    Write-Color "`n[STOP] Parando containers Docker..." "Yellow"
    docker compose down
    Write-Color "[OK] Containers parados com sucesso." "Green"
}

function Build-Image {
    Write-Color "`n[BUILD] Compilando imagem mdm-server com Node 20..." "Cyan"
    docker compose build mdm-server
    if ($LASTEXITCODE -eq 0) {
        Write-Color "[OK] Imagem compilada com sucesso!" "Green"
    }
}

function Show-Logs {
    Write-Color "`n[LOGS] Exibindo logs do servico $Service (Pressione Ctrl+C para sair)..." "Cyan"
    docker compose logs -f $Service
}

function Show-Status {
    Write-Color "`n[STATUS] Status dos Containers:" "Cyan"
    docker compose ps
}

function Test-Health {
    Write-Color "`n[HEALTH] Verificando probes de saude do servidor Docker..." "Cyan"
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
        Write-Color "  [OK] /health: $($health | ConvertTo-Json -Compress)" "Green"
        $ready = Invoke-RestMethod -Uri "http://localhost:3000/ready" -Method Get
        Write-Color "  [OK] /ready:  $($ready | ConvertTo-Json -Compress)" "Green"
        $live = Invoke-RestMethod -Uri "http://localhost:3000/live" -Method Get
        Write-Color "  [OK] /live:   $($live | ConvertTo-Json -Compress)" "Green"
    } catch {
        Write-Color "  [ERRO] Servidor nao respondeu na porta 3000: $($_.Exception.Message)" "Red"
    }
}

function Run-Tests {
    Write-Color "`n[TEST] Executando bateria de testes contra o container Docker..." "Cyan"
    npm test
}

function Open-Shell {
    Write-Color "`n[SHELL] Abrindo shell no container mdm-server..." "Cyan"
    docker compose exec mdm-server sh
}

# Menu Interativo
function Show-Menu {
    while ($true) {
        Clear-Host
        Write-Color "======================================================================" "Blue"
        Write-Color "     MDM SERVIDOR UNIFICADO - GERENCIADOR POWERSHELL DOCKER" "Cyan"
        Write-Color "======================================================================" "Blue"
        
        if (!(Test-DockerDaemon)) {
            Write-Color "`n[AVISO] Docker Desktop nao esta rodando ou ainda esta iniciando." "Yellow"
            Write-Color "Por favor, inicie o aplicativo Docker Desktop antes de continuar.`n" "Yellow"
        } else {
            Write-Color "`n[DOCKER] Daemon: ATIVO E RESPONDENDO" "Green"
        }

        Write-Host "Escolha uma opcao:"
        Write-Host "  1. Iniciar Stack (docker compose up -d)"
        Write-Host "  2. Parar Stack (docker compose down)"
        Write-Host "  3. Reconstruir Imagem do Servidor (Build)"
        Write-Host "  4. Ver Logs em Tempo Real"
        Write-Host "  5. Status dos Containers"
        Write-Host "  6. Testar Probes de Saude (/health)"
        Write-Host "  7. Executar Bateria de Testes (npm test)"
        Write-Host "  8. Abrir Shell no Container"
        Write-Host "  0. Sair"
        Write-Host ""
        
        $choice = Read-Host "Digite a opcao desejada [0-8]"
        switch ($choice) {
            "1" { Start-Stack; Pause }
            "2" { Stop-Stack; Pause }
            "3" { Build-Image; Pause }
            "4" { Show-Logs }
            "5" { Show-Status; Pause }
            "6" { Test-Health; Pause }
            "7" { Run-Tests; Pause }
            "8" { Open-Shell }
            "0" { return }
            default { Write-Color "Opcao invalida!" "Red"; Start-Sleep -Seconds 1 }
        }
    }
}

# Ponto de Entrada CLI
if (!(Test-DockerDaemon)) {
    Write-Color "[ERRO] O Docker Daemon nao esta respondendo. Inicie o Docker Desktop." "Red"
    exit 1
}

switch ($Command) {
    "up"      { Start-Stack }
    "down"    { Stop-Stack }
    "restart" { Stop-Stack; Start-Stack }
    "build"   { Build-Image }
    "logs"    { Show-Logs }
    "status"  { Show-Status }
    "test"    { Run-Tests }
    "health"  { Test-Health }
    "shell"   { Open-Shell }
    "menu"    { Show-Menu }
}
