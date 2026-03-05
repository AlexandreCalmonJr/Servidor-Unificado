# Guia de Implantação em Massa do Agente de Monitoramento USB

Este documento descreve como automatizar a instalação e configuração do agente de monitoramento de impressoras USB (`usb_printer_agent.py`) em múltiplas máquinas Linux e Windows na sua empresa.

## 1. Visão Geral

Para simplificar a implantação, foram criados dois scripts de automação:

*   `install_usb_agent.sh`: Para sistemas operacionais baseados em Linux (Debian/Ubuntu).
*   `install_usb_agent.ps1`: Para sistemas operacionais Windows.

Ambos os scripts realizam as seguintes tarefas:

1.  Instalam as dependências necessárias (Python, `requests`, `usbutils` no Linux).
2.  Copiam o script `usb_printer_agent.py` para um diretório padrão.
3.  Configuram um serviço do sistema (`systemd` no Linux, Serviço Windows no Windows) para garantir que o agente inicie automaticamente com o sistema e seja executado em segundo plano.

## 2. Pré-requisitos

Antes de iniciar a implantação, certifique-se de que:

*   **Servidor-Unificado:** O `Servidor-Unificado` esteja configurado e acessível pelas máquinas cliente.
*   **Token de Autenticação:** Você tenha um token de autenticação de dispositivo válido para cada máquina cliente. Recomenda-se gerar um token por máquina ou por grupo de máquinas no painel do `Servidor-Unificado`.
*   **Acesso Administrativo:** Você tenha acesso administrativo (root no Linux, Administrador no Windows) às máquinas onde o agente será instalado.
*   **Conectividade:** As máquinas cliente tenham acesso à internet para baixar as dependências e ao `Servidor-Unificado`.

## 3. Implantação em Sistemas Linux (Debian/Ubuntu)

### 3.1. Preparação

1.  **Copie os arquivos:** Certifique-se de que `install_usb_agent.sh` e `usb_printer_agent.py` estejam no mesmo diretório na máquina cliente.
2.  **Edite o script `install_usb_agent.sh`:**
    *   Abra o arquivo `install_usb_agent.sh` em um editor de texto.
    *   **`SERVER_URL`**: Altere para o endereço do seu `Servidor-Unificado` (ex: `http://192.168.1.100:3000`).
    *   **`DEVICE_TOKEN`**: Insira o token de autenticação do dispositivo gerado para esta máquina.
    *   **(Opcional) `DEVICE_ID`**: Se desejar um ID específico em vez do hostname, descomente e defina esta variável.

### 3.2. Execução

Execute o script com privilégios de root:

```bash
sudo ./install_usb_agent.sh
```

O script irá instalar as dependências, copiar o agente, criar e iniciar o serviço `systemd`. Você pode verificar o status do serviço com:

```bash
systemctl status usb-printer-agent.service
journalctl -u usb-printer-agent.service -f
```

## 4. Implantação em Sistemas Windows

### 4.1. Preparação

1.  **Copie os arquivos:** Certifique-se de que `install_usb_agent.ps1` e `usb_printer_agent.py` estejam no mesmo diretório na máquina cliente.
2.  **Edite o script `install_usb_agent.ps1`:**
    *   Abra o arquivo `install_usb_agent.ps1` em um editor de texto.
    *   **`$SERVER_URL`**: Altere para o endereço do seu `Servidor-Unificado` (ex: `http://192.168.1.100:3000`).
    *   **`$DEVICE_TOKEN`**: Insira o token de autenticação do dispositivo gerado para esta máquina.
    *   **(Opcional) `$DEVICE_ID`**: Se desejar um ID específico em vez do nome do computador, descomente e defina esta variável.

### 4.2. Execução

Execute o script PowerShell como Administrador:

1.  Abra o PowerShell como Administrador (clique com o botão direito no ícone do PowerShell e selecione "Executar como administrador").
2.  Navegue até o diretório onde você salvou os scripts.
3.  Execute o script:
    ```powershell
    .\install_usb_agent.ps1
    ```

O script tentará instalar o Python (via `winget` se disponível), instalar as dependências Python, copiar o agente e criar/iniciar o Serviço Windows. Você pode verificar o status do serviço através do Gerenciador de Tarefas (aba "Serviços") ou com o comando:

```powershell
Get-Service -Name USBPrinterAgent
```

## 5. Considerações para Implantação em Massa

*   **Ferramentas de Gerenciamento:** Para implantações em larga escala, considere usar ferramentas de gerenciamento de configuração como Ansible, Puppet, Chef (para Linux) ou Microsoft Endpoint Configuration Manager (SCCM), Group Policy Objects (GPO) (para Windows) para distribuir e executar esses scripts.
*   **Segurança do Token:** O `DEVICE_TOKEN` é sensível. Evite armazená-lo diretamente no script em ambientes de produção. Considere métodos mais seguros de injeção de credenciais, como variáveis de ambiente ou sistemas de gerenciamento de segredos.
*   **Firewall:** Certifique-se de que o firewall nas máquinas cliente permita a comunicação de saída para o `Servidor-Unificado` na porta configurada.
*   **Testes:** Sempre teste o script em um pequeno grupo de máquinas antes de uma implantação em larga escala.

Este guia fornece as ferramentas e instruções para automatizar a implantação do agente de monitoramento USB, facilitando o gerenciamento das suas impressoras na empresa.

---
**Desenvolvido por:** Manus AI
**Data:** 05 de Março de 2026
