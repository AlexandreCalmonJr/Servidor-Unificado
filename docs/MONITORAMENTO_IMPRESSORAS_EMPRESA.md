# Guia de Monitoramento de Impressoras na Empresa

Este documento detalha como testar e monitorar as impressoras (HP e Samsung, via IP e USB) utilizando o novo módulo implementado no `Servidor-Unificado`.

## 1. Painel de Monitoramento (Dashboard)

Um novo painel de monitoramento foi adicionado à interface web do `Servidor-Unificado` para visualizar o status e os níveis de toner das impressoras.

### 1.1. Acesso ao Dashboard

1.  Acesse a interface web do `Servidor-Unificado` (ex: `http://seu_servidor_ip:3000/panel`).
2.  Faça login com suas credenciais de administrador.
3.  No menu lateral (sidebar), você encontrará um novo item chamado **"Impressoras"** (com o ícone 🖨️).
4.  Clique neste item para acessar o dashboard de monitoramento de impressoras.

### 1.2. Funcionalidades do Dashboard

O dashboard oferece as seguintes seções:

*   **Cards de Resumo:** Exibe o total de impressoras, quantas estão online, offline e em manutenção.
*   **Filtros:** Permite filtrar a lista de impressoras por status, fabricante, tipo de conexão (Rede/USB) e uma busca geral.
*   **Tabela de Impressoras:** Lista todas as impressoras gerenciadas com detalhes como nome, fabricante, modelo, tipo de conexão, IP/USB, status, nível de toner e última verificação.
    *   **Ações:** Para cada impressora, você pode:
        *   **👁️ (Visualizar):** Abre um modal com detalhes completos da impressora, incluindo níveis de toner por cor.
        *   **🔄 (Atualizar Status):** Força uma verificação imediata do status e níveis de toner daquela impressora.
        *   **🗑️ (Deletar):** Remove a impressora do gerenciamento (soft delete).
*   **Gráficos:** Visualizações gráficas da distribuição de impressoras por status, fabricante, tipo de conexão e níveis médios de toner.

### 1.3. Gerenciamento de Impressoras via Dashboard

*   **`🔄 Atualizar Status` (Botão Global):** No cabeçalho do dashboard, este botão força a atualização do status de *todas* as impressoras gerenciadas.
*   **`🔍 Descobrir Impressoras`:** Inicia um processo de varredura para encontrar novas impressoras na rede e dispositivos USB conectados ao servidor. As impressoras encontradas serão automaticamente adicionadas ao gerenciamento.
*   **`➕ Registrar Impressora`:** Permite registrar manualmente uma impressora, informando seus dados (nome, serial, fabricante, modelo, tipo de conexão e, se for de rede, o endereço IP).

## 2. Monitoramento de Impressoras USB

O monitoramento de impressoras USB requer a execução de um agente local na máquina onde a impressora está fisicamente conectada. Este agente se comunica com o `Servidor-Unificado` para enviar os dados de status.

### 2.1. Agente de Monitoramento USB (Python)

O arquivo `agents/usb_printer_agent.py` é o agente Python responsável por:

*   Detectar impressoras USB conectadas.
*   Verificar o status online/offline da impressora.
*   Enviar esses dados para o `Servidor-Unificado`.

### 2.2. Pré-requisitos para o Agente USB

Na máquina onde o agente será executado (e onde a impressora USB está conectada):

1.  **Python 3:** Certifique-se de que o Python 3 esteja instalado.
2.  **`requests`:** Instale a biblioteca `requests` para Python:
    ```bash
    pip install requests
    ```
3.  **`usbutils`:** Para que o agente possa listar dispositivos USB, o comando `lsusb` deve estar disponível. Em sistemas baseados em Debian/Ubuntu:
    ```bash
    sudo apt-get install usbutils
    ```
4.  **Token de Autenticação:** Você precisará de um token de autenticação de dispositivo válido, gerado no `Servidor-Unificado`, para que o agente possa se comunicar com a API.

### 2.3. Executando o Agente USB

Para executar o agente:

```bash
# Navegue até o diretório do agente
cd /home/ubuntu/Servidor-Unificado/agents

# Exemplo de execução contínua (substitua com seus dados reais)
python3 usb_printer_agent.py \
  --server http://seu_servidor_ip:3000 \
  --token SEU_TOKEN_DE_AUTENTICACAO_DO_DISPOSITIVO \
  --device-id NOME_UNICO_DESTE_COMPUTADOR

# Exemplo de execução única (para teste)
python3 usb_printer_agent.py \
  --server http://seu_servidor_ip:3000 \
  --token SEU_TOKEN_DE_AUTENTICACAO_DO_DISPOSITIVO \
  --device-id NOME_UNICO_DESTE_COMPUTADOR \
  --once
```

*   **`--server`**: O endereço IP ou hostname do seu `Servidor-Unificado` e a porta (ex: `http://192.168.1.100:3000`).
*   **`--token`**: O token de autenticação do dispositivo. **Importante:** Este token deve ser gerado no painel do `Servidor-Unificado` para um dispositivo que represente a máquina onde o agente está rodando.
*   **`--device-id`**: Um identificador único para a máquina onde o agente está rodando (ex: `computador-recepcao`). Isso ajuda a identificar de qual máquina os dados das impressoras USB estão vindo.
*   **`--once`**: Se presente, o agente fará uma única verificação e enviará os dados, depois encerrará. Caso contrário, ele rodará em loop, verificando a cada 60 segundos (padrão).

Recomenda-se configurar este agente para iniciar automaticamente com o sistema operacional da máquina cliente (ex: via `systemd` no Linux ou Tarefas Agendadas no Windows).

## 3. Monitoramento de Impressoras de Rede (IP)

As impressoras conectadas via IP são monitoradas diretamente pelo `Servidor-Unificado`.

### 3.1. Pré-requisitos para o Servidor

Para que o `Servidor-Unificado` possa coletar níveis de toner via SNMP, o pacote `snmp` deve estar instalado no servidor:

```bash
sudo apt-get install snmp
```

### 3.2. Descoberta e Gerenciamento

1.  No dashboard de impressoras, clique em **`🔍 Descobrir Impressoras`**. O servidor fará uma varredura na rede local para encontrar impressoras IP.
2.  Certifique-se de que as impressoras de rede estejam configuradas para responder a requisições SNMP (geralmente com a comunidade `public` para leitura). Consulte o manual da sua impressora para configurar o SNMP.
3.  As impressoras descobertas aparecerão na tabela do dashboard. O `Servidor-Unificado` fará verificações periódicas de status e toner automaticamente.

## 4. Teste Completo na Empresa

Para um teste completo, siga estes passos:

1.  **No Servidor:**
    *   Certifique-se de que o `Servidor-Unificado` esteja rodando com as últimas alterações.
    *   Instale o pacote `snmp` (`sudo apt-get install snmp`).
    *   Acesse o dashboard de impressoras e use a função `Descobrir Impressoras`.
2.  **Nas Máquinas Cliente (com impressoras USB):**
    *   Instale Python 3 e `requests` (`pip install requests`).
    *   Instale `usbutils` (`sudo apt-get install usbutils`).
    *   Gere um token de dispositivo no painel do `Servidor-Unificado` para cada máquina cliente que terá um agente USB.
    *   Execute o `usb_printer_agent.py` em modo contínuo em cada máquina, usando o `--server`, `--token` e `--device-id` apropriados.
3.  **No Dashboard:**
    *   Observe as impressoras (IP e USB) aparecerem na tabela.
    *   Verifique o status (online/offline) e os níveis de toner.
    *   Desconecte uma impressora USB ou de rede para ver o status mudar para 'offline'.
    *   Conecte-a novamente para ver o status retornar a 'online'.
    *   Utilize os botões de `Atualizar Status` para forçar verificações.

Este guia deve fornecer todas as informações necessárias para você testar e monitorar as impressoras da praça de forma eficaz.

---
**Desenvolvido por:** Manus AI
**Data:** 05 de Março de 2026
