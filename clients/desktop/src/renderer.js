const { ipcRenderer } = require('electron');

// ──────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────
let isLocked = true;
let logInterval = null;
let statusInterval = null;

// Dados temporários durante o onboarding
let _obSettings = {}; // acumulados durante o wizard

// ──────────────────────────────────────────────────
// DOM REFS
// ──────────────────────────────────────────────────
const views = document.querySelectorAll('.view-section');
const navItems = document.querySelectorAll('.nav-item');
const sidebar = document.getElementById('app-sidebar');
const lockScreen = document.getElementById('lock-screen');
const loginPass = document.getElementById('login-password');
const loginBtn = document.getElementById('btn-login');
const loginError = document.getElementById('login-error');

// ──────────────────────────────────────────────────
// INITIALIZATION
// ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Window Controls
    document.getElementById('min-btn').addEventListener('click', () => ipcRenderer.send('minimize-window'));
    document.getElementById('max-btn').addEventListener('click', () => ipcRenderer.send('maximize-window'));
    document.getElementById('close-btn').addEventListener('click', () => ipcRenderer.send('close-window'));

    // Lock / Login
    loginBtn.addEventListener('click', attemptUnlock);
    loginPass.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptUnlock(); });

    // Dashboard & Settings
    document.getElementById('btn-force-sync').addEventListener('click', forceSync);
    document.getElementById('btn-clear-logs').addEventListener('click', async () => {
        await ipcRenderer.invoke('clear-logs');
        refreshLogs();
    });

    // Settings view (post-login)
    document.getElementById('btn-test-connection').addEventListener('click', testConfigConnection);
    document.getElementById('btn-next-step-1').addEventListener('click', () => switchSettingsStep(2));
    document.getElementById('btn-prev-step-2').addEventListener('click', () => switchSettingsStep(1));
    document.getElementById('btn-next-step-2').addEventListener('click', () => switchSettingsStep(3));
    document.getElementById('btn-prev-step-3').addEventListener('click', () => switchSettingsStep(2));
    document.getElementById('btn-detect-module')?.addEventListener('click', loadModulesForSettings);
    document.getElementById('btn-save-settings').addEventListener('click', saveClientSettings);

    // ── Onboarding Wizard ──────────────────────────────────────
    document.getElementById('btn-ob-verify').addEventListener('click', handleObVerify);

    // Step 2a — provisioning confirm
    document.getElementById('btn-ob-enroll').addEventListener('click', handleObEnroll);
    document.getElementById('btn-ob-back-2a').addEventListener('click', () => showOnboardStep(1));

    // Step 2b — admin module select
    document.getElementById('btn-ob-load-modules').addEventListener('click', loadObModules);
    document.getElementById('btn-ob-save-admin').addEventListener('click', handleObSaveAdmin);
    document.getElementById('btn-ob-back-2b').addEventListener('click', () => showOnboardStep(1));

    // Zero-touch retry
    document.getElementById('zt-retry-btn').addEventListener('click', showOnboarding);

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.view));
    });

    await checkInitialState();
});

// ══════════════════════════════════════════════════
// FLOW MANAGEMENT
// ══════════════════════════════════════════════════

async function checkInitialState() {
    const settings = await ipcRenderer.invoke('get-settings');
    const hasConnection = settings.ip && settings.token;
    const isFullyConfigured = hasConnection && settings.moduleId;

    if (settings.zeroTouch && hasConnection) {
        // ── Zero-Touch: provisionar automaticamente ──
        showZeroTouchScreen();
        await performZeroTouchEnrollment(settings);
    } else if (isFullyConfigured) {
        // ── Já configurado: ir para lock screen ──
        updateUIWithSettings(settings);
        startLockScreen();
    } else {
        // ── Primeira vez / configuração incompleta ──
        showOnboarding();
    }
}

// ─── Zero-Touch ──────────────────────────────────

function showZeroTouchScreen() {
    sidebar.style.display = 'none';
    views.forEach(v => v.style.display = 'none');
    const ztView = document.getElementById('view-zero-touch');
    ztView.style.display = 'flex';
    setZtStatus('Coletando informações do dispositivo...', 15);
}

function setZtStatus(text, progress) {
    const el = document.getElementById('zt-status-text');
    const bar = document.getElementById('zt-progress-bar');
    if (el) el.textContent = text;
    if (bar) bar.style.width = `${progress}%`;
}

async function performZeroTouchEnrollment(settings) {
    try {
        setZtStatus('Conectando ao servidor MDM...', 30);
        const testResult = await ipcRenderer.invoke('test-connection', {
            ip: settings.ip, port: settings.port, token: settings.token,
        });
        if (!testResult.success) throw new Error(testResult.error || 'Servidor inacessível');

        setZtStatus('Verificando token de provisionamento...', 50);
        const tokenCheck = await ipcRenderer.invoke('check-provisioning-token', {
            ip: settings.ip, port: settings.port, token: settings.token,
        });

        let moduleId = settings.moduleId;

        if (tokenCheck.isProvisioningToken) {
            setZtStatus('Registrando dispositivo no servidor...', 70);
            const enrollResult = await ipcRenderer.invoke('enroll-device', {
                ip: settings.ip, port: settings.port, token: settings.token,
            });
            if (!enrollResult.success) throw new Error(enrollResult.error || 'Falha no provisionamento');
            moduleId = enrollResult.module_id;
            // Troca o provisioning token pelo AUTH_TOKEN permanente do servidor
            if (enrollResult.device_token) settings = { ...settings, token: enrollResult.device_token };
            setZtStatus(`Configurado! Perfil: ${enrollResult.config_profile}`, 90);
        } else {
            // Token já é JWT admin (legado) mas tem zero-touch flag
            setZtStatus('Conexão configurada!', 90);
        }

        const updatedSettings = { ...settings, zeroTouch: false, moduleId: moduleId || settings.moduleId };
        await ipcRenderer.invoke('save-settings', updatedSettings);

        setZtStatus('Pronto! Iniciando...', 100);
        setTimeout(() => {
            updateUIWithSettings(updatedSettings);
            startLockScreen();
        }, 1200);

    } catch (error) {
        const errEl = document.getElementById('zt-error');
        const retryBtn = document.getElementById('zt-retry-btn');
        setZtStatus('Falha no provisionamento automático', 0);
        if (errEl) { errEl.style.display = 'block'; errEl.textContent = error.message; }
        if (retryBtn) retryBtn.style.display = 'block';

        // Desativa zero-touch para não travar em loop
        const settings = await ipcRenderer.invoke('get-settings');
        await ipcRenderer.invoke('save-settings', { ...settings, zeroTouch: false });
    }
}

// ─── Onboarding Wizard ───────────────────────────

function showOnboarding(errorMsg = '') {
    sidebar.style.display = 'none';
    views.forEach(v => v.style.display = 'none');
    const obView = document.getElementById('view-onboarding');
    obView.style.display = 'flex';
    showOnboardStep(1);
    if (errorMsg) {
        const el = document.getElementById('ob-error-1');
        if (el) el.textContent = errorMsg;
    }
}

function showOnboardStep(step) {
    ['ob-step-1', 'ob-step-2a', 'ob-step-2b'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    ['ob-ind-1', 'ob-ind-2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    if (step === 1) {
        document.getElementById('ob-step-1').style.display = 'block';
        document.getElementById('ob-ind-1').classList.add('active');
    } else if (step === '2a') {
        document.getElementById('ob-step-2a').style.display = 'block';
        document.getElementById('ob-ind-2').classList.add('active');
    } else if (step === '2b') {
        document.getElementById('ob-step-2b').style.display = 'block';
        document.getElementById('ob-ind-2').classList.add('active');
        loadObModules();
    }
}

async function handleObVerify() {
    const btn = document.getElementById('btn-ob-verify');
    const errEl = document.getElementById('ob-error-1');
    const ip = document.getElementById('ob-ip').value.trim();
    const port = document.getElementById('ob-port').value.trim() || '3000';
    const token = document.getElementById('ob-token').value.trim();

    errEl.textContent = '';

    if (!ip || !token) {
        errEl.textContent = 'IP do servidor e Token são obrigatórios.';
        return;
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
    btn.disabled = true;

    try {
        // PASSO 1: Verificar se é token de provisionamento (endpoint público — sem JWT)
        // É OBRIGATÓRIO fazer isto ANTES de test-connection, pois test-connection
        // usa o token como JWT no header Authorization, e um prov-token não é JWT.
        const tokenCheck = await ipcRenderer.invoke('check-provisioning-token', { ip, port, token });

        if (tokenCheck.networkError) {
            // Servidor completamente inacessível
            errEl.textContent = `Servidor inacessível (${ip}:${port}): ${tokenCheck.networkError}`;
            btn.innerHTML = '<i class="fa-solid fa-plug"></i> Verificar e Continuar';
            btn.disabled = false;
            return;
        }

        _obSettings = { ip, port, token };

        if (tokenCheck.isProvisioningToken) {
            if (tokenCheck.valid) {
                // ✅ Token de provisionamento VÁLIDO → exibir card de confirmação
                document.getElementById('prov-org').textContent = tokenCheck.organization || '—';
                document.getElementById('prov-profile').textContent = tokenCheck.config_profile || '—';
                document.getElementById('prov-uses').textContent = tokenCheck.uses_remaining ?? '—';
                document.getElementById('prov-expires').textContent =
                    tokenCheck.minutes_remaining != null ? `${tokenCheck.minutes_remaining} min` : '—';
                showOnboardStep('2a');
            } else {
                // ❌ Token de provisionamento EXPIRADO ou ESGOTADO
                errEl.textContent = `⚠️ ${tokenCheck.message || 'Token expirado ou sem usos restantes'}. Gere um novo token no painel MDM.`;
            }
        } else {
            // Não é token de provisionamento → testar como JWT admin
            const connResult = await ipcRenderer.invoke('test-connection', { ip, port, token });
            if (!connResult.success) {
                errEl.textContent = connResult.error || 'Token de admin inválido ou servidor inacessível.';
                btn.innerHTML = '<i class="fa-solid fa-plug"></i> Verificar e Continuar';
                btn.disabled = false;
                return;
            }
            // ✅ Token admin válido → seleção de módulo
            showOnboardStep('2b');
        }

    } catch (e) {
        errEl.textContent = 'Erro inesperado: ' + e.message;
    }

    btn.innerHTML = '<i class="fa-solid fa-plug"></i> Verificar e Continuar';
    btn.disabled = false;
}

async function handleObEnroll() {
    const btn = document.getElementById('btn-ob-enroll');
    const errEl = document.getElementById('ob-error-2a');
    errEl.textContent = '';
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Provisionando...';
    btn.disabled = true;

    try {
        const result = await ipcRenderer.invoke('enroll-device', _obSettings);
        if (!result.success) {
            errEl.textContent = result.error || 'Falha no provisionamento.';
            btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Confirmar e Provisionar';
            btn.disabled = false;
            return;
        }

        // Salva config completa: usa device_token (AUTH_TOKEN do servidor) para chamadas futuras
        // O provisioning token é de uso único; o device_token é o token de autenticação permanente
        await ipcRenderer.invoke('save-settings', {
            ..._obSettings,
            token: result.device_token || _obSettings.token, // troca prov token pelo AUTH_TOKEN
            moduleId: result.module_id || '',
            zeroTouch: false,
        });

        showToast(`✅ Provisionado! Organização: ${result.organization}`, 'success');
        setTimeout(() => startLockScreen(), 1500);

    } catch (e) {
        errEl.textContent = 'Erro: ' + e.message;
        btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Confirmar e Provisionar';
        btn.disabled = false;
    }
}

async function loadObModules() {
    const btn = document.getElementById('btn-ob-load-modules');
    const select = document.getElementById('ob-module');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const result = await ipcRenderer.invoke('fetch-modules', _obSettings);
    if (result.success && result.modules.length > 0) {
        select.innerHTML = '<option value="">Selecione um módulo...</option>';
        result.modules.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m._id || m.id;
            opt.textContent = `${m.name} (${m.type || 'N/A'})`;
            select.appendChild(opt);
        });
        showToast(`${result.modules.length} módulos carregados`, 'success');
    } else {
        select.innerHTML = '<option value="">Nenhum módulo encontrado</option>';
    }
    if (btn) btn.innerHTML = '<i class="fa-solid fa-rotate"></i>';
}

async function handleObSaveAdmin() {
    const btn = document.getElementById('btn-ob-save-admin');
    const errEl = document.getElementById('ob-error-2b');
    const moduleId = document.getElementById('ob-module').value;

    errEl.textContent = '';
    if (!moduleId) {
        errEl.textContent = 'Selecione um módulo antes de continuar.';
        return;
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    btn.disabled = true;

    await ipcRenderer.invoke('save-settings', { ..._obSettings, moduleId, zeroTouch: false });
    showToast('Configuração salva!', 'success');
    setTimeout(() => startLockScreen(), 1000);

    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar e Continuar';
    btn.disabled = false;
}

// ──────────────────────────────────────────────────
// LOCK SYSTEM
// ──────────────────────────────────────────────────
ipcRenderer.on('lock-app', () => startLockScreen());

function startLockScreen() {
    sidebar.style.display = 'none';
    views.forEach(v => v.style.display = 'none');
    lockScreen.style.display = 'flex';
    loginPass.value = '';
    loginPass.focus();
}

async function attemptUnlock() {
    const password = loginPass.value;
    const isValid = await ipcRenderer.invoke('verify-admin', password);

    if (isValid) {
        unlockApp();
    } else {
        const card = document.querySelector('.login-card');
        card.classList.add('shake');
        loginError.textContent = 'Senha incorreta';
        setTimeout(() => card.classList.remove('shake'), 500);
    }
}

async function unlockApp() {
    isLocked = false;
    lockScreen.style.display = 'none';
    sidebar.style.display = 'flex';
    switchView('dashboard');
    startStatusLoop();
    startLogLoop();

    const settings = await ipcRenderer.invoke('get-settings');
    updateUIWithSettings(settings);
    refreshStatus();
}

// ──────────────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────────────
function switchView(viewName) {
    views.forEach(v => {
        v.style.display = 'none';
        v.classList.remove('active');
        if (v.id === `view-${viewName}`) {
            v.style.display = 'block';
            v.classList.add('active');
        }
    });
    navItems.forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-view="${viewName}"]`)?.classList.add('active');
}

// ──────────────────────────────────────────────────
// SETTINGS VIEW (POST-LOGIN)
// ──────────────────────────────────────────────────
function updateUIWithSettings(settings) {
    document.getElementById('input-ip').value = settings.ip || '';
    document.getElementById('input-port').value = settings.port || '';

    const select = document.getElementById('select-module');
    if (settings.moduleId && !Array.from(select.options).some(o => o.value === settings.moduleId)) {
        const opt = document.createElement('option');
        opt.value = settings.moduleId;
        opt.textContent = 'Módulo Salvo (' + settings.moduleId.substring(0, 8) + ')';
        select.appendChild(opt);
    }
    select.value = settings.moduleId || '';

    const tokenInput = document.getElementById('input-token');
    tokenInput.placeholder = settings.token ? '•••••••••••••••• (Salvo)' : 'Insira o token';
    tokenInput.value = '';

    document.getElementById('input-sector').value = settings.sector || '';
    document.getElementById('input-floor').value = settings.floor || '';
    document.getElementById('check-legacy').checked = settings.forceLegacyMode || false;
    document.getElementById('check-lock').checked = settings.lockOnMinimize || false;

    document.getElementById('info-ip').value = settings.ip || '---';
}

function switchSettingsStep(stepIndex) {
    [1, 2, 3].forEach(i => {
        document.getElementById(`settings-step-${i}`).style.display = 'none';
        document.getElementById(`step-${i}-ind`).classList.remove('active');
    });
    document.getElementById(`settings-step-${stepIndex}`).style.display = 'block';
    document.getElementById(`step-${stepIndex}-ind`).classList.add('active');
    if (stepIndex === 2) {
        const select = document.getElementById('select-module');
        if (select.options.length <= 1) loadModulesForSettings();
    }
}

async function testConfigConnection() {
    const btn = document.getElementById('btn-test-connection');
    const errEl = document.getElementById('step-1-error');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testando...';
    btn.disabled = true;
    errEl.textContent = '';
    errEl.style.color = 'var(--status-error)';

    const ip = document.getElementById('input-ip').value.trim();
    const port = document.getElementById('input-port').value.trim() || '3000';
    let token = document.getElementById('input-token').value.trim();
    if (!token) {
        const s = await ipcRenderer.invoke('get-settings');
        token = s.token || '';
    }
    if (!ip) { errEl.textContent = 'IP obrigatório.'; btn.innerHTML = '<i class="fa-solid fa-plug"></i> Testar'; btn.disabled = false; return; }

    const res = await ipcRenderer.invoke('test-connection', { ip, port, token });
    if (res.success) {
        errEl.style.color = 'var(--status-success)';
        errEl.textContent = 'Conexão OK!';
    } else {
        errEl.textContent = res.error || 'Falha.';
    }
    btn.innerHTML = '<i class="fa-solid fa-plug"></i> Testar';
    btn.disabled = false;
}

async function loadModulesForSettings() {
    const btn = document.getElementById('btn-detect-module');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const ip = document.getElementById('input-ip').value.trim();
    const port = document.getElementById('input-port').value.trim() || '3000';
    let token = document.getElementById('input-token').value.trim();
    if (!token) {
        const s = await ipcRenderer.invoke('get-settings');
        token = s.token || '';
    }
    if (!ip || !token) { showToast('IP ou Token ausente.', 'warning'); if (btn) btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Carregar'; return; }

    const result = await ipcRenderer.invoke('fetch-modules', { ip, port, token });
    const select = document.getElementById('select-module');
    if (result.success && result.modules.length > 0) {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Selecione ou deixe auto-detectar</option>';
        result.modules.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m._id || m.id;
            opt.textContent = `${m.name} (${m.type || 'N/A'})`;
            select.appendChild(opt);
        });
        if (Array.from(select.options).some(o => o.value === currentVal)) select.value = currentVal;
        showToast(result.modules.length + ' módulos carregados.', 'success');
    } else {
        showToast('Nenhum módulo encontrado.', 'error');
    }
    if (btn) btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Carregar';
}

async function saveClientSettings() {
    const btn = document.getElementById('btn-save-settings');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    btn.disabled = true;

    const current = await ipcRenderer.invoke('get-settings');
    const tokenInputValue = document.getElementById('input-token').value.trim();

    const newSettings = {
        ...current,
        ip: document.getElementById('input-ip').value.trim(),
        port: document.getElementById('input-port').value.trim() || '3000',
        moduleId: document.getElementById('select-module').value,
        sector: document.getElementById('input-sector').value,
        floor: document.getElementById('input-floor').value,
        forceLegacyMode: document.getElementById('check-legacy').checked,
        lockOnMinimize: document.getElementById('check-lock').checked,
    };
    if (tokenInputValue) newSettings.token = tokenInputValue;

    const result = await ipcRenderer.invoke('save-settings', newSettings);
    if (result.success) {
        showToast('Configurações salvas!', 'success');
        if (tokenInputValue) {
            document.getElementById('input-token').value = '';
            document.getElementById('input-token').placeholder = '•••••••••••••••• (Salvo)';
        }
        switchSettingsStep(1);
        switchView('dashboard');
        forceSync();
        refreshStatus();
    } else {
        showToast('Erro ao salvar.', 'error');
    }

    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Finalizar Configuração';
    btn.disabled = false;
}

// ──────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────
async function refreshStatus() {
    const status = await ipcRenderer.invoke('get-service-status');
    const settings = await ipcRenderer.invoke('get-settings');

    const badgeText = document.getElementById('global-status-text');
    const badgeDot = document.getElementById('global-status-dot');

    if (status.isRunning) {
        badgeText.textContent = 'Online';
        badgeDot.className = 'status-indicator online';
    } else {
        badgeText.textContent = 'Offline';
        badgeDot.className = 'status-indicator error';
    }

    setText('stat-last-sync', formatTime(status.lastRunTime));
    setText('stat-status-text', status.lastRunStatus || 'N/A');
    setText('stat-module', settings.moduleId || (settings.forceLegacyMode ? 'Legado' : 'Não Configurado'));

    const sysInfo = await ipcRenderer.invoke('get-system-info');
    document.getElementById('info-hostname').value = sysInfo['Nome do Computador'];
    document.getElementById('info-ip').value = settings.ip || '---';
}

async function forceSync() {
    const btn = document.getElementById('btn-force-sync');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';

    const result = await ipcRenderer.invoke('force-sync');
    if (result.success) showToast('Sincronização OK', 'success');
    else showToast('Falha: ' + result.error, 'error');

    btn.disabled = false;
    btn.innerHTML = original;
    refreshStatus();
}

// ──────────────────────────────────────────────────
// LOGS
// ──────────────────────────────────────────────────
async function refreshLogs() {
    const logsView = document.getElementById('view-logs');
    if (!logsView || logsView.style.display === 'none') return;
    const logs = await ipcRenderer.invoke('get-logs');
    const container = document.getElementById('log-container');
    container.innerHTML = logs.map(log => `
        <div class="log-entry">
            <span class="log-ts">${formatTime(log.timestamp)}</span>
            <span class="log-level ${log.level}">${log.level}</span>
            <span class="log-msg">${escapeHtml(log.message)}</span>
            ${log.data ? `<span style="color:#555">${JSON.stringify(log.data)}</span>` : ''}
        </div>
    `).join('');
}

function startStatusLoop() {
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(refreshStatus, 5000);
}

function startLogLoop() {
    if (logInterval) clearInterval(logInterval);
    logInterval = setInterval(refreshLogs, 3000);
}

// ──────────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────────
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function formatTime(iso) {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString();
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function showToast(msg, type = 'info') {
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#06b6d4' };
    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed; bottom:20px; right:20px;
        background:${colors[type] || colors.info};
        color:white; padding:12px 24px; border-radius:8px;
        z-index:10000; box-shadow:0 4px 12px rgba(0,0,0,0.3);
        animation:fadeInSlide 0.3s forwards;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}