# =============================================================================
# INTEGRAÇÃO DO MÓDULO DE IMPRESSORAS — INSTRUÇÕES DE PATCH
# =============================================================================

# ─── 1. INSTALAR DEPENDÊNCIAS ────────────────────────────────────────────────
# Execute no diretório raiz do projeto:

npm install net-snmp

# net-snmp: leitura SNMP de impressoras via IP (toner, status, páginas)
# ping e net já são módulos nativos do Node.js

# ─── 2. server.js — adicionar APÓS os outros requires de rotas ──────────────

# Adicione esta linha junto com os outros requires de rotas:
const printerRoutes = require('./routes/printerRoutes');

# Adicione esta linha junto com os outros app.use de rotas do painel:
app.use('/api/printers', printerRoutes(logger, getApiLimiter, modifyApiLimiter, auth));

# Adicione isto APÓS connectDB() para iniciar o polling automático:
# (coloque depois da linha: const WebSocketServer = require('./services/websocketServer'); )

# No bloco após connectDB():
# const printerMonitor = require('./services/printerMonitorService');
# printerMonitor.startAutoPolling(60000, logger); // poll a cada 60 segundos


# ─── 3. frontend/index.html — adicionar na sidebar ──────────────────────────
# Adicione este item de navegação na sidebar, depois do botão "Módulos":

<button class="nav-item" data-page="printers">
    <span class="nav-icon">🖨️</span>
    <span class="nav-label">Impressoras</span>
</button>

# ─── 4. frontend/index.html — adicionar seção da página ─────────────────────
# Adicione este bloco HTML antes do fechamento de </div> da content-area:

<!-- ===== PRINTERS ===== -->
<div class="page-section" id="page-printers">
    <div class="section-header">
        <h2>Impressoras</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" id="printer-test-snmp-btn">🔬 Testar SNMP</button>
            <button class="btn btn-ghost btn-sm" id="printer-poll-all-btn">🔄 Atualizar Todas</button>
            <button class="btn btn-primary" id="add-printer-btn">+ Nova Impressora</button>
        </div>
    </div>

    <!-- Stats Cards -->
    <div class="metrics-grid" id="printer-stats-grid" style="margin-bottom:24px;"></div>

    <!-- Filters -->
    <div class="table-container">
        <div class="table-header">
            <h3>Lista de Impressoras</h3>
            <div class="table-actions">
                <input type="text" class="search-input" id="printer-search" placeholder="Buscar impressora...">
                <select class="filter-select" id="printer-status-filter">
                    <option value="all">Todos os status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                </select>
            </div>
        </div>
        <div style="overflow-x:auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nome / Modelo</th>
                        <th>IP / Serial</th>
                        <th>Toner</th>
                        <th>Papel</th>
                        <th>Localização</th>
                        <th>Status</th>
                        <th>Última Leitura</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="printers-table-body">
                    <tr><td colspan="8" class="empty-state"><p>Carregando...</p></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>


# ─── 5. MODAIS — adicionar no final do body (antes dos scripts) ──────────────

<!-- ===== PRINTER ADD/EDIT MODAL ===== -->
<div class="modal-overlay" id="printer-add-modal">
    <div class="modal-box">
        <div class="modal-header">
            <h3 id="printer-modal-title">Nova Impressora</h3>
            <button class="modal-close" id="printer-modal-close">×</button>
        </div>
        <div class="modal-body">
            <form id="printer-form">
                <input type="hidden" id="edit-printer-id">
                <div class="form-group">
                    <label>Nome da Impressora *</label>
                    <input type="text" id="form-printer-name" required placeholder="Ex: HP LaserJet RH-01">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Tipo de Conexão</label>
                        <select id="form-printer-conn">
                            <option value="ip">Rede (IP)</option>
                            <option value="usb">USB</option>
                        </select>
                    </div>
                    <div class="form-group" id="printer-ip-group">
                        <label>Endereço IP *</label>
                        <input type="text" id="form-printer-ip" placeholder="192.168.1.100">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Modelo</label>
                        <input type="text" id="form-printer-model" placeholder="Ex: HP LaserJet M402n">
                    </div>
                    <div class="form-group">
                        <label>Community SNMP</label>
                        <input type="text" id="form-printer-community" value="public" placeholder="public">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Unidade</label>
                        <input type="text" id="form-printer-unit" placeholder="Ex: Filial SP">
                    </div>
                    <div class="form-group">
                        <label>Setor</label>
                        <input type="text" id="form-printer-sector" placeholder="Ex: RH">
                    </div>
                </div>
                <div class="form-group">
                    <label>Observações</label>
                    <input type="text" id="form-printer-notes" placeholder="Notas opcionais">
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn btn-ghost" id="printer-modal-cancel">Cancelar</button>
            <button class="btn btn-primary" id="printer-modal-save">💾 Salvar</button>
        </div>
    </div>
</div>

<!-- ===== PRINTER DETAIL MODAL ===== -->
<div class="modal-overlay" id="printer-detail-modal">
    <div class="modal-box" style="max-width:600px;">
        <div class="modal-header">
            <h3 id="printer-detail-modal-title">Detalhes</h3>
            <button class="modal-close" id="printer-detail-modal-close">×</button>
        </div>
        <div class="modal-body" id="printer-detail-content"></div>
    </div>
</div>

<!-- ===== SNMP TEST MODAL ===== -->
<div class="modal-overlay" id="printer-snmp-modal">
    <div class="modal-box" style="max-width:480px;">
        <div class="modal-header">
            <h3>🔬 Teste de Conexão SNMP</h3>
            <button class="modal-close" id="snmp-modal-close">×</button>
        </div>
        <div class="modal-body">
            <div class="form-row">
                <div class="form-group" style="flex:2;">
                    <label>IP da Impressora</label>
                    <input type="text" id="snmp-test-ip" placeholder="192.168.1.100">
                </div>
                <div class="form-group" style="flex:1;">
                    <label>Community</label>
                    <input type="text" id="snmp-test-community" value="public">
                </div>
            </div>
            <button class="btn btn-primary" id="snmp-test-btn" style="width:100%;margin-bottom:16px;">
                ▶ Testar Conexão
            </button>
            <div id="snmp-test-result" style="background:var(--bg-secondary);padding:12px;border-radius:8px;min-height:40px;font-family:var(--font-mono);font-size:12px;">
                <span style="color:var(--text-muted);">Preencha o IP e clique em Testar.</span>
            </div>
        </div>
    </div>
</div>


# ─── 6. frontend/index.html — adicionar script printers.js ──────────────────
# Adicione antes do fechamento </body>:

<script src="js/printers.js?v=1"></script>


# ─── 7. app.js — registrar a página "printers" no pageTitles ────────────────
# No objeto pageTitles do App, adicione:
#   printers: 'Impressoras',


# ─── 8. CRIAR MÓDULO NO PAINEL ──────────────────────────────────────────────
# Após iniciar o servidor, acesse o painel e:
# 1. Vá em "Módulos" → "+ Novo Módulo"
# 2. Nome: "Impressoras" | Tipo: "Impressora"
# 3. Salve — o módulo printer ficará ativo e o printerMonitorService usará ele

# =============================================================================
# TESTE RÁPIDO VIA curl
# =============================================================================

# Teste SNMP sem cadastrar (substitua o IP real da sua impressora):
# curl -H "Authorization: Bearer SEU_TOKEN" \
#      http://localhost:3000/api/printers/test-snmp/192.168.1.100?community=public

# Cadastrar impressora:
# curl -X POST http://localhost:3000/api/printers \
#      -H "Authorization: Bearer SEU_TOKEN" \
#      -H "Content-Type: application/json" \
#      -d '{"asset_name":"HP Recepção","ip_address":"192.168.1.100","snmp_community":"public"}'

# Listar impressoras:
# curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/printers

# Forçar poll de uma impressora (substitua o ID):
# curl -X POST http://localhost:3000/api/printers/ID_AQUI/poll \
#      -H "Authorization: Bearer SEU_TOKEN"

# Detectar impressoras USB:
# curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/printers/usb/detect
