# Proposta de Arquitetura para Módulo de Impressoras

## 1. Introdução

Este documento detalha a proposta de arquitetura para a implementação de um servidor de impressão local no projeto `Servidor-Unificado`. O objetivo é gerenciar impressoras HP e Samsung, conectadas via IP e USB, com funcionalidades de controle de nível de toner e monitoramento de status (online/offline).

## 2. Análise do Contexto Atual

O projeto `Servidor-Unificado` utiliza Node.js com Express.js para o backend e Mongoose para interação com MongoDB. O modelo `ManagedAsset` já possui um tipo `printer` e campos como `printer_status` e `connection_type`, indicando uma base existente para o gerenciamento de impressoras. O `agentController.js` processa dados enviados por agentes, incluindo o `printerStatus`.

## 3. Componentes Principais

A arquitetura proposta incluirá os seguintes componentes:

### 3.1. `printerService.js` (Novo Serviço)

Este será o coração do novo módulo, responsável por toda a lógica de interação com as impressoras. Suas responsabilidades incluirão:

*   **Descoberta de Impressoras:** Identificar impressoras na rede (IP) e conectadas localmente (USB).
*   **Comunicação com Impressoras:** Implementar protocolos específicos para HP e Samsung (e.g., SNMP para IP, ou comandos de sistema para USB).
*   **Coleta de Status:** Obter informações como status (online/offline), nível de toner, contagem de páginas, etc.
*   **Normalização de Dados:** Padronizar os dados coletados de diferentes modelos e marcas de impressoras.

### 3.2. Extensão do Modelo `ManagedAsset`

O modelo `ManagedAsset` será estendido para armazenar informações mais detalhadas sobre as impressoras:

*   **`toner_levels` (Objeto/Array):** Armazenará os níveis de toner para cada cor (e.g., `{'black': 75, 'cyan': 50}`).
*   **`last_check_time` (Date):** Timestamp da última verificação de status.
*   **`printer_model` (String):** Modelo específico da impressora.
*   **`manufacturer` (String):** Fabricante da impressora (HP, Samsung).
*   **`connection_details` (Objeto):** Detalhes da conexão (e.g., `{'type': 'ip', 'address': '192.168.1.100'}` ou `{'type': 'usb', 'port': '/dev/usb/lp0'}`).

### 3.3. `printerRoutes.js` (Novas Rotas API)

Um novo arquivo de rotas será criado para expor as funcionalidades do servidor de impressão via API RESTful:

*   `POST /api/printers/discover`: Inicia o processo de descoberta de impressoras.
*   `GET /api/printers/:id/status`: Retorna o status detalhado de uma impressora específica.
*   `GET /api/printers`: Lista todas as impressoras gerenciadas com seus status resumidos.

### 3.4. Integração com `agentController.js` (Opcional/Ajustes)

Se a monitorização de impressoras USB exigir um agente local, o `agentController.js` precisará ser adaptado para receber e processar esses dados, encaminhando-os para o `printerService` ou atualizando diretamente o `ManagedAsset`.

## 4. Fluxo de Operação

1.  **Descoberta:** O `printerService` escaneia a rede (para IP) ou dispositivos USB (para USB) em busca de impressoras. Novas impressoras são registradas como `ManagedAsset` do tipo `printer`.
2.  **Monitoramento:** O `printerService` executa periodicamente (via cron job ou similar) verificações de status para cada impressora registrada.
3.  **Atualização de Dados:** Os dados coletados (status, toner, etc.) são atualizados no `ManagedAsset` correspondente no MongoDB.
4.  **Acesso via API:** As rotas em `printerRoutes.js` permitem que o frontend ou outros serviços consultem o status das impressoras.

## 5. Considerações Técnicas

*   **Comunicação IP (SNMP/IPP):** Para impressoras de rede, será necessário utilizar bibliotecas Node.js que suportem SNMP (Simple Network Management Protocol) ou IPP (Internet Printing Protocol) para obter informações detalhadas. Exemplos incluem `snmp-native` ou `node-ipp`.
*   **Comunicação USB:** A interação com impressoras USB em Node.js pode ser complexa. Pode ser necessário:
    *   Utilizar bibliotecas como `node-usb` (requer `libusb` nativo).
    *   Executar comandos de sistema (e.g., `lpstat`, `usb-devices`) e parsear a saída.
    *   Desenvolver um pequeno agente em outra linguagem (e.g., Python) que se comunique com o Node.js via API ou WebSocket.
*   **Controle de Toner:** A obtenção do nível de toner geralmente é feita via SNMP para impressoras de rede. Para USB, pode ser mais desafiador e dependerá da capacidade da impressora de expor essa informação via comandos de sistema.
*   **Status Offline:** Pode ser detectado por falha na comunicação (timeout) ou por um status explícito retornado pela impressora.
*   **Segurança:** Garantir que as rotas da API sejam devidamente autenticadas e autorizadas.

## 6. Próximos Passos

1.  Pesquisar e selecionar bibliotecas Node.js para SNMP/IPP e USB.
2.  Implementar o `printerService.js`.
3.  Atualizar o `ManagedAsset` e `assetFactory.js`.
4.  Criar as rotas em `printerRoutes.js`.
5.  Desenvolver testes para as novas funcionalidades.

---

**Autor:** Manus AI
**Data:** 05 de Março de 2026
