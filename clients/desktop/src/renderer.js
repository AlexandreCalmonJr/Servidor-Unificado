// clients/desktop/src/renderer.js
// Espelho exato de:
//   - onboarding_screen.dart  → wizard 3 etapas
//   - agent_provider.dart     → lógica de estado
//   - status_screen.dart      → painel de status
//   - settings_screen.dart    → tela de configurações

const { ipcRenderer } = require('electron');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTADO (agent_provider.dart)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let agentStatus      = 'unconfigured'; // unconfigured | configuring | configured
let availableModules = [];
let selectedModuleId = null;
let forceLegacyMode  = false;
let searchQuery      = '';
let selectedInterval = 300;

// Opções de intervalo (agent_provider.dart → intervalOptions)
const intervalOptions = [
    { label: '5 Minutos',  value: 300  },
    { label: '15 Minutos', value: 900  },
    { label: '30 Minutos', value: 1800 },
    { label: '1 Hora',     value: 3600 },
    { label: '2 Horas',    value: 7200 },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTROLES DA JANELA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

document.getElementById('min-btn')?.addEventListener('click', () => ipcRenderer.send('minimize-window'));
document.getElementById('max-btn')?.addEventListener('click', () => ipcRenderer.send('maximize-window'));
document.getElementById('close-btn')?.addEventListener('click', () => ipcRenderer.send('close-window'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NAVEGAÇÃO ENTRE VIEWS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const navItems = document.querySelectorAll('.nav-item');
const views    = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Configurações exige senha admin
        if (item.dataset.view === 'settings') {
            checkAdminAuth(() => switchView(item));
        } else {
            switchView(item);
        }
    });
});

function switchView(item) {
    navItems.forEach(n => n.classList.remove('active'));
    views.forEach(v => v.style.display = 'none');
    item.classList.add('active');
    const view = document.getElementById(`view-${item.dataset.view}`);
    if (view) view.style.display = 'block';
    if (item.dataset.view === 'status') refreshStatusView();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ONBOARDING WIZARD  (onboarding_screen.dart)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// As 3 etapas correspondem a _OnboardingStep1, _OnboardingStep2, _OnboardingStep3

let currentStep = 0;

function goToPage(step) {
    currentStep = step;
    document.querySelectorAll('.wizard-step').forEach((el, i) => {
        el.style.display = i === step ? 'block' : 'none';
    });
    document.querySelectorAll('.step-dot').forEach((el, i) => {
        el.classList.toggle('active', i === step);
        el.classList.toggle('done',   i < step);
    });
}

// Navegação: previousOnboardingPage / nextOnboardingPage (agent_provider.dart)
function previousPage() {
    if (currentStep > 0) goToPage(currentStep - 1);
}
function nextPage() {
    if (currentStep < 2) goToPage(currentStep + 1);
}

// ── PÁGINA 1: Conexão (onboarding_screen.dart → _OnboardingStep1) ──

document.getElementById('step1-continue')?.addEventListener('click', async () => {
    const ip    = document.getElementById('input-ip').value.trim();
    const port  = document.getElementById('input-port').value.trim();
    const token = document.getElementById('input-token').value.trim();
    forceLegacyMode = document.getElementById('check-legacy')?.checked || false;

    if (!ip || !port || !token) {
        showStep1Error('Preencha todos os campos obrigatórios.');
        return;
    }

    setStep1Loading(true, 'Testando conexão...');
    clearStep1Error();

    // _testConnection (agent_provider.dart)
    const connResult = await ipcRenderer.invoke('test-connection', { ip, port, token });
    if (!connResult.success) {
        setStep1Loading(false);
        showStep1Error(connResult.error || 'Falha ao conectar.');
        return;
    }

    // Modo legado forçado → pula para página 3 (agent_provider.dart → fetchModules quando forceLegacyMode)
    if (forceLegacyMode) {
        setStep1Loading(false);
        goToPage(2);
        return;
    }

    // Busca módulos (agent_provider.dart → fetchModules)
    setStep1Loading(true, 'Buscando módulos...');
    const modResult = await ipcRenderer.invoke('fetch-modules', { ip, port, token });
    setStep1Loading(false);

    if (!modResult.success) {
        showStep1Error(modResult.error || 'Falha ao buscar módulos.');
        return;
    }

    // 404 → servidor legado (agent_provider.dart → case 404: forceLegacyMode = true)
    if (modResult.legacyOnly || modResult.modules.length === 0) {
        forceLegacyMode = true;
        document.getElementById('check-legacy').checked = true;
        await ipcRenderer.invoke('save-force-legacy', true);
        goToPage(2);
        return;
    }

    availableModules = modResult.modules;
    renderModuleList();
    goToPage(1);
});

function setStep1Loading(loading, text = '') {
    const btn = document.getElementById('step1-continue');
    if (!btn) return;
    btn.disabled    = loading;
    btn.textContent = loading ? text : 'Testar e Continuar';
}

function showStep1Error(msg) {
    const el = document.getElementById('step1-error');
    if (el) { el.textContent = msg; el.style.display = 'flex'; }
}

function clearStep1Error() {
    const el = document.getElementById('step1-error');
    if (el) el.style.display = 'none';
}

// Botão cancelar reconfiguração (agent_provider.dart → cancelReconfiguration)
document.getElementById('cancel-reconfiguration')?.addEventListener('click', () => {
    cancelReconfiguration();
});

// ── PÁGINA 2: Seleção de Módulo (onboarding_screen.dart → _OnboardingStep2) ──

// Busca (agent_provider.dart → updateSearchQuery / filteredModules)
document.getElementById('module-search')?.addEventListener('input', function () {
    searchQuery = this.value;
    renderModuleList();
});

document.getElementById('module-search-clear')?.addEventListener('click', () => {
    searchQuery = '';
    const el = document.getElementById('module-search');
    if (el) el.value = '';
    renderModuleList();
});

function getFilteredModules() {
    if (!searchQuery) return availableModules;
    const q = searchQuery.toLowerCase();
    return availableModules.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.type || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
    );
}

function renderModuleList() {
    const container = document.getElementById('module-list');
    if (!container) return;

    const modules = getFilteredModules();

    // Atualiza o contador (onboarding_screen.dart → módulos disponíveis)
    const countEl = document.getElementById('module-count');
    if (countEl) {
        countEl.textContent = searchQuery
            ? `${modules.length} resultado(s) encontrado(s)`
            : `${modules.length} módulos disponíveis`;
    }

    if (modules.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#a1a1aa;">
                <div style="font-size:48px;margin-bottom:16px;">${searchQuery ? '🔍' : '📭'}</div>
                <p>${searchQuery ? 'Nenhum módulo corresponde à busca.' : 'Nenhum módulo encontrado no servidor.'}</p>
                ${searchQuery ? '<button id="clear-search-empty" class="btn-secondary">Limpar busca</button>' : ''}
            </div>
        `;
        document.getElementById('clear-search-empty')?.addEventListener('click', () => {
            searchQuery = '';
            document.getElementById('module-search').value = '';
            renderModuleList();
        });
        return;
    }

    container.innerHTML = '';
    modules.forEach((module, index) => {
        const isSelected = selectedModuleId === (module._id || module.id);
        const div = document.createElement('div');
        div.className = `module-item ${isSelected ? 'module-item--selected' : ''}`;
        div.style.animationDelay = `${index * 50}ms`;

        const icon = getModuleIcon(module.type);
        const assetCount = module.asset_count || 0;

        // Destaca o texto de busca (ModuleListItem → _buildHighlightedText)
        const highlightedName = highlightText(module.name, searchQuery);
        const highlightedDesc = highlightText(module.description || '', searchQuery);

        div.innerHTML = `
            <div class="module-item__icon ${isSelected ? 'module-item__icon--selected' : ''}">
                ${icon}
            </div>
            <div class="module-item__details">
                <span class="module-item__name">${highlightedName}</span>
                <div class="module-item__meta">
                    <span class="module-item__type-badge">${(module.type || '').toUpperCase()}</span>
                    ${module.description ? `<span class="module-item__desc">${highlightedDesc}</span>` : ''}
                </div>
            </div>
            <div class="module-item__action">
                ${isSelected
                    ? '<svg width="20" height="20" fill="#2563eb" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
                    : `<div class="module-item__count"><svg width="12" height="12" fill="#a1a1aa" viewBox="0 0 24 24"><path d="M20 7H4V5h16v2zm2 5H2v2h20v-2zM4 17h16v2H4v-2z"/></svg><span>${assetCount}</span></div>`
                }
            </div>
        `;

        div.addEventListener('click', () => {
            selectedModuleId = module._id || module.id;
            renderModuleList();
            const confirmBtn = document.getElementById('step2-continue');
            if (confirmBtn) confirmBtn.disabled = false;
        });

        container.appendChild(div);
    });
}

function highlightText(text, query) {
    if (!query || !text.toLowerCase().includes(query.toLowerCase())) {
        return escapeHtml(text);
    }
    const lowerText  = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let result = '', start = 0;
    let idx = lowerText.indexOf(lowerQuery);
    while (idx !== -1) {
        result += escapeHtml(text.substring(start, idx));
        result += `<mark style="background:rgba(254,240,138,0.2);color:#fef08a;font-weight:bold;">${escapeHtml(text.substring(idx, idx + query.length))}</mark>`;
        start = idx + query.length;
        idx = lowerText.indexOf(lowerQuery, start);
    }
    result += escapeHtml(text.substring(start));
    return result;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getModuleIcon(type) {
    // module_info.dart → IconData get icon
    const icons = {
        desktop:  '🖥️', notebook: '💻', panel:   '📺',
        printer:  '🖨️', mobile:   '📱', totem:   '🏧',
    };
    return icons[(type || '').toLowerCase()] || '🔌';
}

// Voltar na página 2 (agent_provider.dart → previousOnboardingPage com clearSearch)
document.getElementById('step2-back')?.addEventListener('click', () => {
    searchQuery = '';
    const el = document.getElementById('module-search');
    if (el) el.value = '';
    goToPage(0);
});

// Continuar da página 2 (agent_provider.dart → nextOnboardingPage)
document.getElementById('step2-continue')?.addEventListener('click', () => {
    if (!selectedModuleId) return;
    goToPage(2);
});

// ── PÁGINA 3: Configuração Final (onboarding_screen.dart → _OnboardingStep3) ──

// Preenche o intervalo dropdown
function buildIntervalDropdown() {
    const sel = document.getElementById('input-interval');
    if (!sel) return;
    sel.innerHTML = '';
    intervalOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === selectedInterval) option.selected = true;
        sel.appendChild(option);
    });
}

// Voltar na página 3
document.getElementById('step3-back')?.addEventListener('click', () => {
    // forceLegacyMode → volta para página 0 (agent_provider.dart → step3 Voltar)
    if (forceLegacyMode) {
        goToPage(0);
    } else {
        goToPage(1);
    }
});

// Salvar e ativar (agent_provider.dart → saveSettingsAndRestartService)
document.getElementById('step3-save')?.addEventListener('click', async () => {
    if (!forceLegacyMode && !selectedModuleId) {
        showToast('Por favor, selecione um módulo para se conectar.', 'error');
        return;
    }

    const ip        = document.getElementById('input-ip')?.value.trim()        || '';
    const port      = document.getElementById('input-port')?.value.trim()      || '3000';
    const token     = document.getElementById('input-token')?.value.trim()     || '';
    const assetName = document.getElementById('input-asset-name')?.value.trim()|| '';
    const sector    = document.getElementById('input-sector')?.value.trim()    || '';
    const floor     = document.getElementById('input-floor')?.value.trim()     || '';
    const interval  = parseInt(document.getElementById('input-interval')?.value || '300', 10);

    // Se assetName vazio, usa COMPUTERNAME (agent_provider.dart → saveSettingsAndRestartService)
    const finalAssetName = assetName || process.env.COMPUTERNAME || os.hostname?.() || '';

    const settings = {
        ip, port, token,
        moduleId:       selectedModuleId || '',
        sector, floor,
        assetName:      finalAssetName,
        interval,
        forceLegacyMode,
    };

    const result = await ipcRenderer.invoke('save-settings', settings);
    if (result.success) {
        agentStatus = 'configured';
        showConfiguredView(settings);
        showToast('✅ Configuração salva! Agente iniciado.', 'success');
    } else {
        showToast('Erro ao salvar configurações.', 'error');
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATUS VIEW  (status_screen.dart)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let statusRefreshTimer = null;

async function refreshStatusView() {
    const status = await ipcRenderer.invoke('get-service-status');
    const settings = store ? store.get('settings', {}) : await ipcRenderer.invoke('get-settings');

    // Status do serviço (status_screen.dart → _buildServiceStatus)
    const statusDot  = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const statusBadge = document.getElementById('status-badge');

    if (statusDot && statusText) {
        const isRunning = status.isRunning;
        statusDot.className  = `status-dot ${isRunning ? 'status-dot--online' : 'status-dot--offline'}`;
        statusText.textContent = isRunning ? 'ATIVO' : 'PARADO';
        if (statusBadge) statusBadge.className = `status-badge ${isRunning ? 'status-badge--online' : 'status-badge--offline'}`;
    }

    _setText('status-last-sync',    _formatDateTime(status.lastRunTime));
    _setText('status-current',      status.lastRunStatus || 'N/A');
    _setText('status-next-run',     _formatNextRun(status.nextRunTime));
    _setText('status-interval',     `${Math.floor((settings.interval || 300) / 60)} minutos`);

    // Configuração de conexão (status_screen.dart → _buildConnectionConfig)
    const serverUrl = `http://${settings.ip || ''}:${settings.port || ''}`;
    _setText('config-server',   serverUrl);
    _setText('config-module',   settings.forceLegacyMode ? 'Modo Legado' : (settings.moduleId || 'N/A'));
    _setText('config-asset',    settings.assetName || 'Automático');
    const sector = settings.sector || 'N/A';
    const floor  = settings.floor  || 'N/A';
    _setText('config-location', `${sector} - ${floor}`);

    // Stats cards (status_screen.dart → _buildSyncStats)
    _setText('stat-last-ping', status.lastRunTime
        ? new Date(status.lastRunTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : 'N/A'
    );
    _setText('stat-status',     status.isRunning ? 'Online' : 'Offline');
    _setText('stat-errors',     String(status.errorCount || 0));

    const statusColor = document.getElementById('stat-status-color');
    if (statusColor) statusColor.style.color = status.isRunning ? '#10b981' : '#ef4444';
}

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || 'N/D';
}

function _formatDateTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        return new Date(isoString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch (_) { return 'N/A'; }
}

function _formatNextRun(isoString) {
    if (!isoString) return 'N/A';
    try {
        const diff = new Date(isoString).getTime() - Date.now();
        if (diff <= 0) return 'Agora...';
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    } catch (_) { return 'N/A'; }
}

// Sincronizar Agora (status_screen.dart → footer btn "Sincronizar")
document.getElementById('btn-force-sync')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-force-sync');
    if (btn) { btn.textContent = 'Sincronizando...'; btn.disabled = true; }

    const result = await ipcRenderer.invoke('force-sync');

    if (btn) {
        btn.textContent = result.success ? '✅ Sincronizado' : '❌ Falhou';
        btn.disabled = false;
        setTimeout(() => { btn.textContent = 'Sincronizar'; }, 3000);
    }

    await refreshStatusView();
});

// Pausar / Iniciar serviço (status_screen.dart → footer btn Pausar/Iniciar)
document.getElementById('btn-toggle-service')?.addEventListener('click', async () => {
    const status = await ipcRenderer.invoke('get-service-status');
    if (status.isRunning) {
        await ipcRenderer.invoke('stop-service');
    } else {
        await ipcRenderer.invoke('start-service');
    }
    await refreshStatusView();
    const btn = document.getElementById('btn-toggle-service');
    if (btn) {
        const newStatus = await ipcRenderer.invoke('get-service-status');
        btn.textContent = newStatus.isRunning ? '⏸ Pausar' : '▶ Iniciar';
    }
});

// Info do Sistema (status_screen.dart → _showSystemInfo)
document.getElementById('btn-system-info')?.addEventListener('click', async () => {
    const info = await ipcRenderer.invoke('get-system-info');
    const lines = Object.entries(info).map(([k, v]) =>
        `<tr><td style="color:#a1a1aa;padding:6px 12px 6px 0;width:180px;">${k}</td><td style="color:#fafafa;">${v}</td></tr>`
    ).join('');
    showDialog('Informações do Sistema', `<table style="width:100%;border-collapse:collapse;">${lines}</table>`);
});

// Reconfigurar (status_screen.dart → iconButton configurações → enterReconfiguration)
document.getElementById('btn-reconfigure')?.addEventListener('click', () => {
    checkAdminAuth(() => enterReconfiguration());
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETTINGS VIEW  (settings_screen.dart)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function loadSettingsView() {
    const s = await ipcRenderer.invoke('get-settings');

    _setInputValue('setting-ip',        s.ip        || '');
    _setInputValue('setting-port',      s.port      || '3000');
    _setInputValue('setting-token',     s.token     || '');
    _setInputValue('setting-asset',     s.assetName || '');
    _setInputValue('setting-sector',    s.sector    || '');
    _setInputValue('setting-floor',     s.floor     || '');
    _setInputValue('setting-module-id', s.moduleId  || '');

    const legacySwitch = document.getElementById('setting-legacy');
    if (legacySwitch) legacySwitch.checked = s.forceLegacyMode || false;

    const intervalSel = document.getElementById('setting-interval');
    if (intervalSel) {
        intervalSel.innerHTML = '';
        intervalOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === (s.interval || 300)) option.selected = true;
            intervalSel.appendChild(option);
        });
    }

    // Alerta de modo legado (settings_screen.dart → _buildForceModeCard)
    updateLegacyWarning(s.forceLegacyMode || false);
}

function _setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

// Toggle modo legado na tela de configurações (settings_screen.dart → SwitchListTile)
document.getElementById('setting-legacy')?.addEventListener('change', async function () {
    await ipcRenderer.invoke('save-force-legacy', this.checked);
    updateLegacyWarning(this.checked);
});

function updateLegacyWarning(isLegacy) {
    const warningEl = document.getElementById('legacy-warning');
    const moduleRow = document.getElementById('setting-module-row');
    if (warningEl) warningEl.style.display = isLegacy ? 'flex' : 'none';
    if (moduleRow) moduleRow.style.display = isLegacy ? 'none' : 'flex';
}

// Salvar configurações (settings_screen.dart → salvar individualmente)
document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
    const settings = {
        ip:             document.getElementById('setting-ip')?.value.trim()        || '',
        port:           document.getElementById('setting-port')?.value.trim()      || '3000',
        token:          document.getElementById('setting-token')?.value.trim()     || '',
        assetName:      document.getElementById('setting-asset')?.value.trim()     || '',
        sector:         document.getElementById('setting-sector')?.value.trim()    || '',
        floor:          document.getElementById('setting-floor')?.value.trim()     || '',
        moduleId:       document.getElementById('setting-module-id')?.value.trim() || '',
        interval:       parseInt(document.getElementById('setting-interval')?.value || '300', 10),
        forceLegacyMode: document.getElementById('setting-legacy')?.checked || false,
    };

    await ipcRenderer.invoke('save-settings', settings);
    showToast('Configurações salvas!', 'success');
});

// Detectar sistema (settings_screen.dart → _detectSystem)
document.getElementById('detect-system-btn')?.addEventListener('click', async () => {
    const ip    = document.getElementById('setting-ip')?.value.trim();
    const port  = document.getElementById('setting-port')?.value.trim();
    const token = document.getElementById('setting-token')?.value.trim();
    const detectionEl = document.getElementById('detection-result');

    if (!ip || !token) {
        showToast('IP e Token são obrigatórios.', 'error');
        return;
    }

    if (detectionEl) { detectionEl.textContent = '🔍 Detectando...'; detectionEl.style.display = 'block'; }

    // Testa módulos primeiro
    const modResult = await ipcRenderer.invoke('fetch-modules', { ip, port, token });

    if (modResult.success && !modResult.legacyOnly && modResult.modules.length > 0) {
        if (detectionEl) { detectionEl.textContent = `✅ Sistema Novo detectado. ${modResult.modules.length} módulo(s) disponível(is).`; detectionEl.style.color = '#10b981'; }
    } else if (modResult.legacyOnly || (modResult.success && modResult.modules.length === 0)) {
        if (detectionEl) { detectionEl.textContent = '🏛️ Sistema Legado detectado (Totem/Desktop).'; detectionEl.style.color = '#f59e0b'; }
    } else {
        if (detectionEl) { detectionEl.textContent = `❌ Falha: ${modResult.error}`; detectionEl.style.color = '#ef4444'; }
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT STATUS MANAGEMENT  (home_screen_router.dart + agent_provider.dart)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const overlayOnboarding = document.getElementById('overlay-onboarding');
const viewConfigured    = document.getElementById('view-configured');

function showOnboarding() {
    agentStatus = 'unconfigured';
    if (overlayOnboarding)  overlayOnboarding.style.display = 'flex';
    if (viewConfigured)     viewConfigured.style.display    = 'none';
}

function showConfiguredView(settings) {
    agentStatus = 'configured';
    if (overlayOnboarding) overlayOnboarding.style.display = 'none';
    if (viewConfigured)    viewConfigured.style.display    = 'block';

    // Atualiza display de configurações
    const serverUrl = `http://${settings.ip}:${settings.port}`;
    _setText('dash-server',  serverUrl);
    _setText('dash-module',  settings.forceLegacyMode ? 'Modo Legado' : (settings.moduleId || 'N/A'));
    _setText('dash-mode',    settings.forceLegacyMode ? '⚡ Legado' : '🔷 Módulos');

    // Inicia atualização automática do status
    clearInterval(statusRefreshTimer);
    statusRefreshTimer = setInterval(refreshStatusView, 3000);
    refreshStatusView();
}

// enterReconfiguration (agent_provider.dart → enterReconfiguration)
function enterReconfiguration() {
    agentStatus = 'configuring';
    if (overlayOnboarding) overlayOnboarding.style.display = 'flex';
    goToPage(0);
    // Mostra botão de cancelar reconfiguração
    const cancelBtn = document.getElementById('cancel-reconfiguration');
    if (cancelBtn) cancelBtn.style.display = 'block';
}

// cancelReconfiguration (agent_provider.dart → cancelReconfiguration)
function cancelReconfiguration() {
    agentStatus = 'configured';
    if (overlayOnboarding) overlayOnboarding.style.display = 'none';
    const cancelBtn = document.getElementById('cancel-reconfiguration');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN AUTH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let adminAuthenticated = false;

function checkAdminAuth(callback) {
    if (adminAuthenticated) { callback(); return; }

    const overlay = document.getElementById('admin-overlay');
    if (!overlay) { callback(); return; }

    overlay.style.display = 'flex';

    const confirmBtn = document.getElementById('admin-login-btn');
    const cancelBtn  = document.getElementById('admin-cancel-btn');
    const infoMsg    = document.getElementById('admin-info');

    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newConfirm.addEventListener('click', async () => {
        const pass    = document.getElementById('admin-password').value;
        const isValid = await ipcRenderer.invoke('verify-admin', pass);
        if (isValid) {
            adminAuthenticated = true;
            overlay.style.display = 'none';
            document.getElementById('admin-password').value = '';
            if (infoMsg) infoMsg.textContent = '';
            callback();
        } else {
            if (infoMsg) infoMsg.textContent = 'Senha incorreta.';
        }
    });

    newCancel.addEventListener('click', () => {
        overlay.style.display = 'none';
        document.getElementById('admin-password').value = '';
        if (infoMsg) infoMsg.textContent = '';
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITÁRIOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bg = {
        success: 'rgba(16,185,129,0.9)',
        error:   'rgba(239,68,68,0.9)',
        info:    'rgba(37,99,235,0.9)',
    }[type] || 'rgba(37,99,235,0.9)';

    toast.style.cssText = `
        position:fixed;bottom:24px;right:24px;z-index:99999;
        background:${bg};color:#fff;padding:12px 20px;border-radius:8px;
        font-size:14px;font-weight:500;backdrop-filter:blur(8px);
        box-shadow:0 4px 20px rgba(0,0,0,.3);transition:opacity .3s;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showDialog(title, bodyHtml) {
    const existing = document.getElementById('generic-dialog');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'generic-dialog';
    overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;
        display:flex;align-items:center;justify-content:center;
    `;
    overlay.innerHTML = `
        <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:32px;min-width:500px;max-width:700px;max-height:80vh;overflow-y:auto;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
                <svg width="24" height="24" fill="#2563eb" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"/></svg>
                <h2 style="margin:0;font-size:18px;color:#fafafa;">${title}</h2>
            </div>
            <div style="color:#fafafa;">${bodyHtml}</div>
            <div style="margin-top:24px;text-align:right;">
                <button id="dialog-close" style="padding:8px 20px;background:#27272a;color:#fafafa;border:none;border-radius:6px;cursor:pointer;">Fechar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('dialog-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARREGAMENTO INICIAL  (main.dart → _loadSettings)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function init() {
    const settings = await ipcRenderer.invoke('get-settings');

    // Restaura o estado dos controllers do wizard
    if (settings.ip)       _setInputValue('input-ip',        settings.ip);
    if (settings.port)     _setInputValue('input-port',      settings.port);
    if (settings.token)    _setInputValue('input-token',     settings.token);
    if (settings.assetName) _setInputValue('input-asset-name', settings.assetName);
    if (settings.sector)   _setInputValue('input-sector',    settings.sector);
    if (settings.floor)    _setInputValue('input-floor',     settings.floor);

    forceLegacyMode  = settings.forceLegacyMode || false;
    selectedModuleId = settings.moduleId || null;
    selectedInterval = settings.interval || 300;

    const legacyCheck = document.getElementById('check-legacy');
    if (legacyCheck) legacyCheck.checked = forceLegacyMode;

    buildIntervalDropdown();

    // Preenche o dropdown de intervalo da etapa 3
    const intervalSel = document.getElementById('input-interval');
    if (intervalSel) {
        intervalSel.innerHTML = '';
        intervalOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === selectedInterval) option.selected = true;
            intervalSel.appendChild(option);
        });
    }

    // Esconde botão de cancelar reconfiguração inicialmente
    const cancelBtn = document.getElementById('cancel-reconfiguration');
    if (cancelBtn) cancelBtn.style.display = 'none';

    // Verifica se já está configurado (agent_provider.dart → _loadSettings)
    const isConfigured = settings.ip && settings.port && settings.token &&
        (settings.moduleId || settings.forceLegacyMode);

    if (isConfigured) {
        showConfiguredView(settings);
        // Navega para a view de status por padrão
        const statusNav = document.querySelector('.nav-item[data-view="status"]');
        if (statusNav) switchView(statusNav);
    } else {
        showOnboarding();
        goToPage(0);
    }
}

init();