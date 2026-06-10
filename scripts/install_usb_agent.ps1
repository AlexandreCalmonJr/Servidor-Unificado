#!/usr/bin/env powershell

# Script de automação para instalação e configuração do agente de monitoramento USB
# em sistemas Windows

# --- Variáveis de Configuração (EDITAR ANTES DE EXECUTAR) ---
$SERVER_URL = "https://SEU_IP_DO_SERVIDOR:3000" # Ex: https://192.168.1.100:3000
$DEVICE_TOKEN = "SEU_TOKEN_DE_AUTENTICACAO_DO_DISPOSITIVO" # Token gerado no painel do Servidor-Unificado
# $DEVICE_ID será gerado automaticamente com base no hostname se não for fornecido
# $DEVICE_ID = "NOME_UNICO_DESTE_COMPUTADOR" 

# --- Caminhos --- 
$AGENT_DIR = "C:\Program Files\USBPinterAgent"
$AGENT_SCRIPT = "usb_printer_agent.py"
$SERVICE_NAME = "USBPinterAgent"
$SERVICE_DISPLAY_NAME = "USB Printer Monitoring Agent"

# --- Funções de Log ---
function Log-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Log-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Log-Warning { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Log-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red; exit 1 }

# --- Verifica se está rodando como Administrador ---
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Log-Error "Este script deve ser executado como Administrador. Por favor, execute o PowerShell como Administrador."
}

# --- Instala Python (se não estiver instalado) ---
Log-Info "Verificando instalação do Python..."
$pythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonPath) {
    Log-Info "Python não encontrado. Tentando instalar via winget..."
    try {
        winget install Python.Python.3.9 -e --accept-package-agreements --accept-source-agreements
        $pythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
        if (-not $pythonPath) { Log-Error "Falha ao instalar Python via winget. Por favor, instale-o manualmente." }
        Log-Success "Python instalado com sucesso."
    } catch {
        Log-Error "Falha ao instalar Python via winget. Por favor, instale-o manualmente ou verifique se o winget está disponível."
    }
} else {
    Log-Success "Python já está instalado em: $pythonPath"
}

# --- Instala pip (se não estiver instalado) ---
Log-Info "Verificando instalação do pip..."
$pipPath = (Get-Command pip -ErrorAction SilentlyContinue).Source
if (-not $pipPath) {
    Log-Info "pip não encontrado. Tentando instalar..."
    try {
        python -m ensurepip --default-pip
        $pipPath = (Get-Command pip -ErrorAction SilentlyContinue).Source
        if (-not $pipPath) { Log-Error "Falha ao instalar pip. Por favor, instale-o manualmente." }
        Log-Success "pip instalado com sucesso."
    } catch {
        Log-Error "Falha ao instalar pip. Por favor, instale-o manualmente."
    }
} else {
    Log-Success "pip já está instalado em: $pipPath"
}

# --- Instala dependências Python ---
Log-Info "Instalando dependências Python (requests)..."
python -m pip install requests || Log-Error "Falha ao instalar a biblioteca 'requests'."
Log-Success "Dependências Python instaladas."

# --- Cria diretório do agente ---
Log-Info "Criando diretório do agente em $AGENT_DIR..."
New-Item -ItemType Directory -Force -Path $AGENT_DIR | Out-Null || Log-Error "Falha ao criar diretório $AGENT_DIR."
Log-Success "Diretório do agente criado."

# --- Copia o script do agente ---
Log-Info "Copiando script do agente para $AGENT_DIR..."
# Assumimos que o script usb_printer_agent.py está no mesmo diretório do instalador
Copy-Item -Path (Join-Path $PSScriptRoot $AGENT_SCRIPT) -Destination (Join-Path $AGENT_DIR $AGENT_SCRIPT) -Force || Log-Error "Falha ao copiar $AGENT_SCRIPT."
Log-Success "Script do agente copiado."

# --- Define DEVICE_ID (se não foi fornecido) ---
if ([string]::IsNullOrEmpty($DEVICE_ID)) {
    $DEVICE_ID = $env:COMPUTERNAME
}

# --- Cria o comando de execução do agente ---
$agentCommand = "`"$pythonPath`" `"$(Join-Path $AGENT_DIR $AGENT_SCRIPT)`" --server $SERVER_URL --token $DEVICE_TOKEN --device-id $DEVICE_ID"

# --- Cria o serviço Windows ---
Log-Info "Criando serviço Windows '$SERVICE_NAME'..."

# Verifica se o serviço já existe e o remove
if (Get-Service -Name $SERVICE_NAME -ErrorAction SilentlyContinue) {
    Log-Warning "Serviço '$SERVICE_NAME' já existe. Removendo para recriar..."
    Stop-Service -Name $SERVICE_NAME -ErrorAction SilentlyContinue
    sc.exe delete $SERVICE_NAME
    Start-Sleep -Seconds 2
}

# Cria o novo serviço
New-Service -Name $SERVICE_NAME -DisplayName $SERVICE_DISPLAY_NAME -BinaryPathName $agentCommand -StartupType Automatic -Description "Monitora impressoras USB e envia dados para o Servidor-Unificado." || Log-Error "Falha ao criar o serviço Windows."

Log-Success "Serviço Windows '$SERVICE_NAME' criado com sucesso."

# --- Inicia o serviço ---
Log-Info "Iniciando o serviço '$SERVICE_NAME'..."
Start-Service -Name $SERVICE_NAME || Log-Error "Falha ao iniciar o serviço Windows."
Log-Success "Serviço '$SERVICE_NAME' iniciado com sucesso!"

Log-Info "Você pode verificar o status do serviço com: Get-Service -Name $SERVICE_NAME"
Log-Info "Os logs do agente serão gravados no log de eventos do Windows ou no console se executado manualmente."

Log-Success "Instalação e configuração do agente de monitoramento USB concluídas!"
