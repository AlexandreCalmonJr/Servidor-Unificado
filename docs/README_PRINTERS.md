# Módulo de Servidor de Impressão Local

Este módulo permite o gerenciamento centralizado de impressoras HP e Samsung conectadas via IP (Rede) e USB no Servidor-Unificado.

## Funcionalidades Implementadas

*   **Descoberta Automática:** Identifica impressoras na rede local e dispositivos conectados via USB.
*   **Monitoramento de Status:** Verifica periodicamente se as impressoras estão online ou offline.
*   **Controle de Toner:** Coleta níveis de toner via SNMP para impressoras de rede.
*   **Suporte Multi-Fabricante:** Otimizado para impressoras HP e Samsung.
*   **Integração com API:** Endpoints REST para consulta e gerenciamento.

## Como Utilizar

### 1. Configuração do Módulo
No painel administrativo, crie um novo módulo com o tipo `printer`. Isso habilitará as funcionalidades de gerenciamento de impressoras.

### 2. Endpoints da API

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/printers` | Lista todas as impressoras e resumo de status. |
| `GET` | `/api/printers/:id` | Detalhes completos de uma impressora. |
| `GET` | `/api/printers/:id/status` | Status em tempo real e níveis de toner. |
| `POST` | `/api/printers/discover` | Inicia busca por novas impressoras (Admin). |
| `POST` | `/api/printers/register` | Registro manual de impressora (Admin). |
| `POST` | `/api/printers/:id/refresh-status` | Força atualização de status (Admin). |

### 3. Requisitos do Sistema
Para o funcionamento pleno da coleta de toner via rede, o servidor deve ter o pacote `snmpget` instalado:
```bash
sudo apt-get install snmp
```

## Como Testar

Para validar a implementação no ambiente do Servidor-Unificado, você pode executar o script de teste automatizado:

```bash
# Navegue até a raiz do projeto
cd /home/ubuntu/Servidor-Unificado

# Execute o script de teste
node scripts/test_printer_module.js
```

Este script irá:
1. Criar o módulo de impressoras no banco de dados (se não existir).
2. Registrar impressoras de teste (HP via IP e Samsung via USB).
3. Simular o processo de descoberta e monitoramento.
4. Exibir o relatório de status das impressoras gerenciadas.

---
**Desenvolvido por:** Manus AI
**Data:** 05 de Março de 2026
