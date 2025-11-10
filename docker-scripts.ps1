# ===================================================================
# SCRIPTS AUXILIARES PARA DOCKER (Windows PowerShell)
# ===================================================================

param([string]$Command, [string]$Arg)

# Funções de cor
function Write-ColorOutput($message, $color = "White") {
    Write-Host "$message" -ForegroundColor $color
}

# ===================================================================
# INIT - Inicialização
# ===================================================================
function Initialize-Environment {
    Write-ColorOutput "🚀 Inicializando ambiente Docker..." "Blue"
    
    # Verificar Docker
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-ColorOutput "❌ Docker não encontrado. Instale: https://docs.docker.com/get-docker/" "Red"
        exit 1
    }
    
    # Verificar Docker Compose
    if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-ColorOutput "❌ Docker Compose não encontrado." "Red"
        exit 1
    }
    
    # Criar .env se não existir
    if (!(Test-Path .env)) {
        Write-ColorOutput "⚠️  Arquivo .env não encontrado. Criando..." "Yellow"
        
        # Gerar JWT_SECRET
        $bytes = New-Object byte[] 64
        [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
        $JWT_SECRET = [BitConverter]::ToString($bytes) -replace '-',''
        
        @"
# ===================================================================
# CONFIGURAÇÃO DOCKER - GERADA AUTOMATICAMENTE
# ===================================================================

JWT_SECRET=$JWT_SECRET
AUTH_TOKEN=hap@2025
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
"@ | Out-File -FilePath .env -Encoding UTF8
        
        Write-ColorOutput "✅ Arquivo .env criado com JWT_SECRET aleatório" "Green"
        Write-ColorOutput "⚠️  IMPORTANTE: Altere o AUTH_TOKEN antes de usar em produção!" "Yellow"
    }
    
    # Criar diretórios
    New-Item -ItemType Directory -Force -Path logs, public, backups | Out-Null
    
    Write-ColorOutput "✅ Ambiente preparado!" "Green"
}

# ===================================================================
# START - Iniciar serviços
# ===================================================================
function Start-Services {
    Write-ColorOutput "🚀 Iniciando serviços..." "Blue"
    docker-compose up -d
    
    Write-ColorOutput "`n⏳ Aguardando serviços ficarem prontos..." "Yellow"
    Start-Sleep -Seconds 5
    
    Get-Status
}

# ===================================================================
# STOP - Parar serviços
# ===================================================================
function Stop-Services {
    Write-ColorOutput "🛑 Parando serviços..." "Yellow"
    docker-compose down
    Write-ColorOutput "✅ Serviços parados" "Green"
}

# ===================================================================
# RESTART - Reiniciar serviços
# ===================================================================
function Restart-Services {
    Write-ColorOutput "🔄 Reiniciando serviços..." "Yellow"
    docker-compose restart
    Start-Sleep -Seconds 3
    Get-Status
}

# ===================================================================
# STATUS - Ver status
# ===================================================================
function Get-Status {
    Write-ColorOutput "`n📊 Status dos Serviços`n" "Blue"
    docker-compose ps
    
    Write-ColorOutput "`n🏥 Health Checks`n" "Blue"
    
    # Check MDM Server
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-ColorOutput "✅ MDM Server: Rodando (http://localhost:3000)" "Green"
        }
    } catch {
        Write-ColorOutput "❌ MDM Server: Não acessível" "Red"
    }
    
    # Check MongoDB
    try {
        docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ MongoDB: Conectado" "Green"
        } else {
            Write-ColorOutput "❌ MongoDB: Não conectado" "Red"
        }
    } catch {
        Write-ColorOutput "❌ MongoDB: Não conectado" "Red"
    }
    
    # Check Redis
    try {
        docker-compose exec -T redis redis-cli ping 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Redis: Conectado" "Green"
        } else {
            Write-ColorOutput "❌ Redis: Não conectado" "Red"
        }
    } catch {
        Write-ColorOutput "❌ Redis: Não conectado" "Red"
    }
}

# ===================================================================
# LOGS - Ver logs
# ===================================================================
function Show-Logs {
    param([string]$Service = "mdm-server")
    Write-ColorOutput "📋 Logs de $Service..." "Blue"
    docker-compose logs -f $Service
}

# ===================================================================
# SHELL - Acessar shell
# ===================================================================
function Enter-Shell {
    Write-ColorOutput "🖥️  Acessando shell do servidor..." "Blue"
    docker-compose exec mdm-server sh
}

# ===================================================================
# CREATE-ADMIN - Criar admin
# ===================================================================
function New-AdminUser {
    Write-ColorOutput "👤 Criando usuário administrador..." "Blue"
    docker-compose exec mdm-server node scripts/createAdminUser.js
}

# ===================================================================
# BACKUP - Fazer backup
# ===================================================================
function New-Backup {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Write-ColorOutput "💾 Criando backup em backups/$timestamp..." "Blue"
    
    docker-compose exec -T mongodb mongodump --out="/backups/$timestamp"
    
    Write-ColorOutput "✅ Backup criado com sucesso!" "Green"
}

# ===================================================================
# RESTORE - Restaurar backup
# ===================================================================
function Restore-Backup {
    param([string]$BackupDir)
    
    if ([string]::IsNullOrEmpty($BackupDir)) {
        Write-ColorOutput "❌ Erro: Especifique o diretório do backup" "Red"
        Write-ColorOutput "Uso: .\docker-scripts.ps1 restore <dir>" "Yellow"
        Write-ColorOutput "`nBackups disponíveis:" "Blue"
        Get-ChildItem backups
        return
    }
    
    Write-ColorOutput "📥 Restaurando backup de $BackupDir..." "Yellow"
    Write-ColorOutput "⚠️  ATENÇÃO: Isso substituirá os dados atuais!" "Red"
    
    $confirm = Read-Host "Tem certeza? (s/N)"
    if ($confirm -ne "s") {
        Write-ColorOutput "❌ Restauração cancelada" "Yellow"
        return
    }
    
    docker-compose exec -T mongodb mongorestore "/backups/$BackupDir"
    Write-ColorOutput "✅ Backup restaurado!" "Green"
}

# ===================================================================
# CLEAN - Limpar tudo
# ===================================================================
function Clear-Environment {
    Write-ColorOutput "🧹 Limpando ambiente Docker..." "Yellow"
    Write-ColorOutput "⚠️  ATENÇÃO: Isso irá APAGAR TODOS OS DADOS!" "Red"
    
    $confirm = Read-Host "Tem certeza? Digite 'LIMPAR' para confirmar"
    if ($confirm -ne "LIMPAR") {
        Write-ColorOutput "❌ Limpeza cancelada" "Yellow"
        return
    }
    
    docker-compose down -v
    docker system prune -f
    
    Write-ColorOutput "✅ Ambiente limpo!" "Green"
}

# ===================================================================
# UPDATE - Atualizar
# ===================================================================
function Update-Services {
    Write-ColorOutput "🔄 Atualizando serviços..." "Blue"
    
    docker-compose pull
    docker-compose build --no-cache
    docker-compose up -d
    
    Write-ColorOutput "✅ Atualização concluída!" "Green"
}

# ===================================================================
# STATS - Estatísticas
# ===================================================================
function Get-Stats {
    Write-ColorOutput "📊 Estatísticas de Recursos`n" "Blue"
    docker stats --no-stream
    
    Write-ColorOutput "`n💾 Uso de Disco`n" "Blue"
    docker system df
}

# ===================================================================
# HELP - Ajuda
# ===================================================================
function Show-Help {
    Write-Host @"
╔═══════════════════════════════════════════════════════════════╗
║           🐳 SCRIPTS DOCKER - SERVIDOR MDM                    ║
╚═══════════════════════════════════════════════════════════════╝

Uso: .\docker-scripts.ps1 [comando] [argumentos]

Comandos Disponíveis:

  init            Inicializar ambiente
  start           Iniciar todos os serviços
  stop            Parar todos os serviços
  restart         Reiniciar todos os serviços
  status          Ver status e health checks
  logs [serviço]  Ver logs (padrão: mdm-server)
  shell           Acessar shell do container
  create-admin    Criar usuário administrador
  backup          Fazer backup do MongoDB
  restore <dir>   Restaurar backup
  clean           Limpar tudo (⚠️  APAGA DADOS)
  update          Atualizar e reiniciar
  stats           Ver estatísticas
  help            Mostrar esta ajuda

Exemplos:

  .\docker-scripts.ps1 init
  .\docker-scripts.ps1 start
  .\docker-scripts.ps1 logs mongodb
  .\docker-scripts.ps1 backup

═══════════════════════════════════════════════════════════════
"@ -ForegroundColor Cyan
}

# ===================================================================
# MAIN - Processar comando
# ===================================================================



switch ($Command) {
    "init"         { Initialize-Environment }
    "start"        { Start-Services }
    "stop"         { Stop-Services }
    "restart"      { Restart-Services }
    "status"       { Get-Status }
    "logs"         { Show-Logs -Service $Arg }
    "shell"        { Enter-Shell }
    "create-admin" { New-AdminUser }
    "backup"       { New-Backup }
    "restore"      { Restore-Backup -BackupDir $Arg }
    "clean"        { Clear-Environment }
    "update"       { Update-Services }
    "stats"        { Get-Stats }
    default        { Show-Help }
}