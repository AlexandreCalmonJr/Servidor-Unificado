#!/bin/bash

# Script de automação para instalação e configuração do agente de monitoramento USB
# em sistemas Linux (Debian/Ubuntu)

# --- Variáveis de Configuração (EDITAR ANTES DE EXECUTAR) ---
SERVER_URL="http://SEU_IP_DO_SERVIDOR:3000" # Ex: http://192.168.1.100:3000
DEVICE_TOKEN="SEU_TOKEN_DE_AUTENTICACAO_DO_DISPOSITIVO" # Token gerado no painel do Servidor-Unificado
# DEVICE_ID será gerado automaticamente com base no hostname se não for fornecido
# DEVICE_ID="NOME_UNICO_DESTE_COMPUTADOR" 

# --- Caminhos --- 
AGENT_DIR="/opt/usb-printer-agent"
AGENT_SCRIPT="usb_printer_agent.py"
SERVICE_NAME="usb-printer-agent.service"

# --- Funções de Log ---
log_info() { echo "[INFO] $1"; }
log_success() { echo "[SUCCESS] $1"; }
log_warning() { echo "[WARNING] $1"; }
log_error() { echo "[ERROR] $1"; exit 1; }

# --- Verifica se é root ---
if [[ $EUID -ne 0 ]]; then
   log_error "Este script deve ser executado como root. Use 'sudo ./install_usb_agent.sh'"
fi

# --- Verifica dependências ---
command -v python3 >/dev/null 2>&1 || log_error "Python3 não encontrado. Por favor, instale-o primeiro."
command -v pip >/dev/null 2>&1 || log_error "pip não encontrado. Por favor, instale-o primeiro (sudo apt-get install python3-pip)."

# --- Instala dependências do sistema ---
log_info "Atualizando lista de pacotes e instalando dependências do sistema..."
apt-get update -y || log_warning "Falha ao atualizar lista de pacotes."
apt-get install -y usbutils || log_error "Falha ao instalar usbutils. Verifique sua conexão com a internet."
log_success "Dependências do sistema instaladas."

# --- Instala dependências Python ---
log_info "Instalando dependências Python (requests)..."
pip install requests || log_error "Falha ao instalar a biblioteca 'requests'."
log_success "Dependências Python instaladas."

# --- Cria diretório do agente ---
log_info "Criando diretório do agente em $AGENT_DIR..."
mkdir -p "$AGENT_DIR" || log_error "Falha ao criar diretório $AGENT_DIR."
log_success "Diretório do agente criado."

# --- Copia o script do agente ---
log_info "Copiando script do agente para $AGENT_DIR..."
# Assumimos que o script usb_printer_agent.py está no mesmo diretório do instalador
cp "$(dirname "$0")/$AGENT_SCRIPT" "$AGENT_DIR/$AGENT_SCRIPT" || log_error "Falha ao copiar $AGENT_SCRIPT."
chmod +x "$AGENT_DIR/$AGENT_SCRIPT" || log_error "Falha ao dar permissão de execução ao script."
log_success "Script do agente copiado e configurado."

# --- Cria o arquivo de serviço Systemd ---
log_info "Criando arquivo de serviço Systemd para $SERVICE_NAME..."

# Se DEVICE_ID não foi definido, usa o hostname
if [ -z "$DEVICE_ID" ]; then
    DEVICE_ID=$(hostname)
fi

cat <<EOF > /etc/systemd/system/$SERVICE_NAME
[Unit]
Description=USB Printer Monitoring Agent
After=network.target

[Service]
ExecStart=/usr/bin/python3 $AGENT_DIR/$AGENT_SCRIPT --server $SERVER_URL --token $DEVICE_TOKEN --device-id $DEVICE_ID
Restart=always
User=root
Group=root

[Install]
WantedBy=multi-user.target
EOF

log_success "Arquivo de serviço Systemd criado."

# --- Recarrega Systemd, habilita e inicia o serviço ---
log_info "Recarregando Systemd, habilitando e iniciando o serviço..."
systemctl daemon-reload || log_error "Falha ao recarregar Systemd daemon."
systemctl enable "$SERVICE_NAME" || log_error "Falha ao habilitar serviço $SERVICE_NAME."
systemctl start "$SERVICE_NAME" || log_error "Falha ao iniciar serviço $SERVICE_NAME."

log_success "Serviço $SERVICE_NAME habilitado e iniciado com sucesso!"
log_info "Você pode verificar o status do serviço com: systemctl status $SERVICE_NAME"
log_info "Os logs podem ser vistos com: journalctl -u $SERVICE_NAME -f"

log_success "Instalação e configuração do agente de monitoramento USB concluídas!"
