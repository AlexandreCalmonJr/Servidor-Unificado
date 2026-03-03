// MDM Dashboard — Asset Commands Page

(() => {
    let allModules = [];
    let selectedModule = null;
    let selectedAsset = null;
    let commandHistory = [];

    const COMMAND_TYPES = [
        { value: 'cmd_custom', label: 'CMD Personalizado', icon: '⌨️', desc: 'Executar comando CMD' },
        { value: 'powershell_custom', label: 'PowerShell', icon: '🔷', desc: 'Script PowerShell' },
        { value: 'restart_computer', label: 'Reiniciar PC', icon: '🔄', desc: 'Reiniciar o computador' },
        { value: 'flush_dns', label: 'Flush DNS', icon: '🌐', desc: 'Limpar cache DNS' },
        { value: 'restart_print_spooler', label: 'Spooler Impressão', icon: '🖨️', desc: 'Reiniciar spooler' },
        { value: 'map_lpt2', label: 'Mapear LPT2', icon: '🔌', desc: 'Mapear porta LPT2' },
        { value: 'download_file', label: 'Download Arquivo', icon: '📥', desc: 'Baixar arquivo remoto' },
        { value: 'auto_start_app', label: 'Auto Start App', icon: '🚀', desc: 'Configurar app para iniciar' },
        { value: 'restart_automatos', label: 'Restart Automatos', icon: '🤖', desc: 'Reiniciar Automatos' },
        { value: 'restart_ndd', label: 'Restart NDD', icon: '📋', desc: 'Reiniciar NDD' },
        { value: 'install_update', label: 'Instalar Update', icon: '📦', desc: 'Instalar atualização' },
        { value: 'clear_temp', label: 'Limpar Temp', icon: '🗑️', desc: 'Limpar pasta temporária' },
        { value: 'check_disk', label: 'Check Disk', icon: '💾', desc: 'Verificar disco' },
        { value: 'network_reset', label: 'Reset Rede', icon: '📡', desc: 'Resetar configuração de rede' },
        { value: 'custom_script', label: 'Script Customizado', icon: '📝', desc: 'Script personalizado' },
        { value: 'install_exe', label: 'Instalar EXE (Silencioso)', icon: '📥', desc: 'Baixar e instalar um .exe em Background' },
        // Mobile / Totem Commands
        { value: 'reboot_device', label: 'Reiniciar (Mobile)', icon: '📱', desc: 'Reiniciar dispositivo Android' },
        { value: 'install_apk', label: 'Instalar APK', icon: '📥', desc: 'Instalar aplicativo via URL' },
        { value: 'lock_device', label: 'Bloquear Tela', icon: '🔒', desc: 'Bloquear dispositivo remotamente' },
        { value: 'send_message', label: 'Enviar Mensagem', icon: '💬', desc: 'Enviar notificação push' },
        { value: 'wipe_data', label: 'Wipe (Reset)', icon: '⚠️', desc: 'Apagar todos os dados' },
    ];

    function loadCommands() {
        loadModulesForSelect();
    }

    // Initialize once
    setupCommandModal();
    setupEventListeners();

    // ===== STEP 1: SELECT MODULE =====
    async function loadModulesForSelect() {
        const select = document.getElementById('cmd-module-select');
        if (!select) return;

        select.innerHTML = '<option value="" disabled selected>Selecione um módulo...</option>';

        try {
            const data = await API.get('/modules');
            allModules = data.modules || [];

            allModules.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m._id || m.id;
                opt.textContent = `${m.name} (${m.type})`;
                select.appendChild(opt);
            });
        } catch (err) {
            showToast('Erro ao carregar módulos.', 'error');
        }
    }

    function setupEventListeners() {
        const moduleSelect = document.getElementById('cmd-module-select');
        if (moduleSelect) {
            moduleSelect.addEventListener('change', async (e) => {
                selectedModule = e.target.value;
                selectedAsset = null;
                await loadAssetsForModule(selectedModule);
            });
        }
    }

    // ===== STEP 2: SELECT ASSET =====
    async function loadAssetsForModule(moduleId) {
        const assetArea = document.getElementById('cmd-asset-list');
        const historyArea = document.getElementById('cmd-history-area');
        if (historyArea) historyArea.style.display = 'none';
        if (!assetArea) return;

        assetArea.innerHTML = '<p style="color: var(--text-muted); padding: 12px;">Carregando ativos...</p>';

        try {
            const data = await API.get(`/modules/${moduleId}/assets`);
            const assets = data.assets || [];

            if (assets.length === 0) {
                assetArea.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>Nenhum ativo neste módulo.</p></div>';
                return;
            }

            assetArea.innerHTML = `
        <div class="cmd-asset-grid">
          ${assets.map(a => `
            <button class="cmd-asset-card" data-asset-id="${a._id || a.id}" data-serial="${esc(a.serial_number || '')}" data-name="${esc(a.asset_name || a.name || '')}">
              <div class="cmd-asset-name">${esc(a.asset_name || a.name || 'N/A')}</div>
              <div class="cmd-asset-serial mono">${esc(a.serial_number || 'N/A')}</div>
              <div>${statusBadge(a.status)}</div>
            </button>
          `).join('')}
        </div>
      `;

            // Attach click handlers
            assetArea.querySelectorAll('.cmd-asset-card').forEach(card => {
                card.addEventListener('click', () => {
                    assetArea.querySelectorAll('.cmd-asset-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    selectedAsset = {
                        id: card.dataset.assetId,
                        serial: card.dataset.serial,
                        name: card.dataset.name,
                    };
                    loadCommandHistory();
                    document.getElementById('cmd-send-area').style.display = 'block';
                });
            });
        } catch (err) {
            assetArea.innerHTML = `<p style="color: var(--danger); padding: 12px;">Erro: ${esc(err.message)}</p>`;
        }
    }

    // ===== STEP 3: COMMAND HISTORY =====
    async function loadCommandHistory() {
        const area = document.getElementById('cmd-history-area');
        const tbody = document.getElementById('cmd-history-body');
        if (!area || !tbody || !selectedModule || !selectedAsset) return;

        area.style.display = 'block';

        try {
            const data = await API.get(`/modules/${selectedModule}/assets/${selectedAsset.id}/commands`);
            commandHistory = data.commands || (Array.isArray(data) ? data : []);

            if (commandHistory.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>Nenhum comando enviado para este ativo.</p></td></tr>';
                return;
            }

            tbody.innerHTML = commandHistory.map(cmd => {
                const typeInfo = COMMAND_TYPES.find(t => t.value === cmd.commandType) || { icon: '⚙️', label: cmd.commandType };
                return `
          <tr>
            <td>${typeInfo.icon} ${esc(typeInfo.label)}</td>
            <td class="mono" style="font-size: 11px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${esc(cmd.command || '')}</td>
            <td>${cmdStatusBadge(cmd.status)}</td>
            <td>${formatDate(cmd.createdAt)}</td>
            <td>${cmd.completedAt ? formatDate(cmd.completedAt) : '--'}</td>
            <td>
              ${cmd.result ? `<button class="btn btn-ghost btn-sm" onclick="CommandManager.viewResult('${cmd._id}')">📄 Ver</button>` : '--'}
            </td>
          </tr>
        `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" style="color: var(--danger);">Erro: ${esc(err.message)}</td></tr>`;
        }
    }

    // ===== SEND COMMAND MODAL =====
    function setupCommandModal() {
        const modal = document.getElementById('command-modal');
        const sendBtn = document.getElementById('cmd-send-btn');
        const closeBtn = document.getElementById('command-modal-close');
        const cancelBtn = document.getElementById('command-modal-cancel');
        const saveBtn = document.getElementById('command-modal-save');

        if (sendBtn) sendBtn.addEventListener('click', openCommandModal);
        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.addEventListener('click', () => modal.classList.remove('active'));
        });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
        if (saveBtn) saveBtn.addEventListener('click', handleSendCommand);

        // Populate command type dropdown
        const typeSelect = document.getElementById('form-cmd-type');
        if (typeSelect && typeSelect.options.length <= 1) {
            COMMAND_TYPES.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.value;
                opt.textContent = `${t.icon} ${t.label} — ${t.desc}`;
                typeSelect.appendChild(opt);
            });
        }

        // Show/hide fields based on command type
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                const customGroup = document.getElementById('cmd-custom-group');
                const mobileGroup = document.getElementById('cmd-mobile-group');

                // Logic for Custom Command Group (Command text / Message)
                const isCustom = ['cmd_custom', 'powershell_custom', 'custom_script', 'send_message'].includes(val);
                if (customGroup) {
                    customGroup.style.display = isCustom ? 'block' : 'none';
                    const label = customGroup.querySelector('label');
                    if (label) label.textContent = val === 'send_message' ? 'Mensagem' : 'Comando';
                }

                // Logic for Mobile Params Group (Package, APK URL)
                const isMobileParams = ['install_apk'].includes(val);
                if (mobileGroup) {
                    mobileGroup.style.display = (isMobileParams || val === 'install_exe') ? 'block' : 'none';
                    if (val === 'install_exe') {
                        // Hide package input, keep only URL
                        const packageGroup = document.getElementById('form-cmd-package')?.closest('.form-group');
                        if (packageGroup) packageGroup.style.display = 'none';

                        const urlLabel = document.getElementById('form-cmd-apk-url')?.closest('.form-group')?.querySelector('label');
                        if (urlLabel) urlLabel.textContent = 'URL do Arquivo (.exe)';
                    } else {
                        const packageGroup = document.getElementById('form-cmd-package')?.closest('.form-group');
                        if (packageGroup) packageGroup.style.display = 'block';

                        const urlLabel = document.getElementById('form-cmd-apk-url')?.closest('.form-group')?.querySelector('label');
                        if (urlLabel) urlLabel.textContent = 'URL do APK (Opcional)';
                    }
                }

                // Auto-fill command for predefined types (Desktop)
                const cmdInput = document.getElementById('form-cmd-command');
                if (!isCustom && cmdInput) {
                    const presets = {
                        'restart_computer': 'shutdown /r /t 30 /f',
                        'flush_dns': 'ipconfig /flushdns',
                        'restart_print_spooler': 'net stop spooler && net start spooler',
                        'clear_temp': 'del /q/f/s %TEMP%\\*',
                        'check_disk': 'chkdsk C: /F',
                        'network_reset': 'netsh winsock reset',
                        'restart_automatos': 'taskkill /f /im automatos.exe && start automatos.exe',
                        'restart_ndd': 'taskkill /f /im ndd.exe && start ndd.exe',
                    };
                    cmdInput.value = presets[val] || '';
                } else if (isCustom && cmdInput) {
                    // Clear if switching to custom/message
                    if (val === 'send_message') cmdInput.placeholder = 'Digite a mensagem para o usuário...';
                    else cmdInput.placeholder = 'Ex: ipconfig /flushdns';
                }
            });
        }
    }

    function openCommandModal() {
        if (!selectedAsset) {
            showToast('Selecione um ativo primeiro.', 'warning');
            return;
        }
        const modal = document.getElementById('command-modal');
        const targetEl = document.getElementById('cmd-target-label');
        if (targetEl) targetEl.textContent = `${selectedAsset.name} (${selectedAsset.serial})`;
        modal.classList.add('active');
    }

    async function handleSendCommand() {
        const commandType = document.getElementById('form-cmd-type').value;
        const command = document.getElementById('form-cmd-command').value.trim();
        const requiresElevation = document.getElementById('form-cmd-elevation')?.checked || false;
        const timeout = parseInt(document.getElementById('form-cmd-timeout')?.value) || 60000;

        const packageName = document.getElementById('form-cmd-package')?.value.trim();
        const apkUrl = document.getElementById('form-cmd-apk-url')?.value.trim();

        if (!commandType) {
            showToast('Selecione o tipo de comando.', 'warning');
            return;
        }

        // Validation for complex commands
        if (commandType === 'install_apk' && !packageName && !apkUrl) {
            showToast('Para instalar APK, informe URL ou Nome do Pacote.', 'warning');
            return;
        }

        if (commandType === 'install_exe' && !apkUrl) {
            showToast('Para instalar EXE, a URL do arquivo é obrigatória.', 'warning');
            return;
        }

        // Command text validation (only if visible/required)
        const isCustom = ['cmd_custom', 'powershell_custom', 'custom_script', 'send_message'].includes(commandType);
        if (isCustom && !command) {
            showToast('O campo de comando/mensagem não pode estar vazio.', 'warning');
            return;
        }

        const body = {
            commandType,
            command,
            requiresElevation,
            timeout,
            packageName,
            apkUrl,
            parameters: {}
        };

        if (commandType === 'install_exe') {
            body.parameters.url = apkUrl;
        }

        try {
            await API.post(`/modules/${selectedModule}/assets/${selectedAsset.id}/commands`, body);
            showToast('Comando enviado com sucesso!', 'success');
            document.getElementById('command-modal').classList.remove('active');
            loadCommandHistory();
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    // ===== RESULT VIEWER =====
    function viewResult(cmdId) {
        const cmd = commandHistory.find(c => c._id === cmdId);
        if (!cmd || !cmd.result) return;

        const modal = document.getElementById('result-modal');
        const content = document.getElementById('result-content');
        if (!modal || !content) return;

        content.innerHTML = `
      <div class="result-section">
        <strong>Exit Code:</strong> <span class="mono ${cmd.result.exitCode === 0 ? '' : 'text-danger'}">${cmd.result.exitCode ?? 'N/A'}</span>
      </div>
      ${cmd.result.stdout ? `<div class="result-section"><strong>stdout:</strong><pre class="result-pre">${esc(cmd.result.stdout)}</pre></div>` : ''}
      ${cmd.result.stderr ? `<div class="result-section"><strong>stderr:</strong><pre class="result-pre text-danger">${esc(cmd.result.stderr)}</pre></div>` : ''}
      ${cmd.result.error ? `<div class="result-section"><strong>Erro:</strong><pre class="result-pre text-danger">${esc(cmd.result.error)}</pre></div>` : ''}
      ${cmd.result.executionTime ? `<div class="result-section"><strong>Tempo:</strong> <span class="mono">${cmd.result.executionTime}ms</span></div>` : ''}
    `;

        modal.classList.add('active');

        const closeBtn = document.getElementById('result-modal-close');
        const closeBtn2 = document.getElementById('result-modal-close-btn');
        [closeBtn, closeBtn2].forEach(b => {
            if (b) b.onclick = () => modal.classList.remove('active');
        });
        modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
    }

    // ===== HELPERS =====
    function cmdStatusBadge(status) {
        const map = {
            pending: { cls: 'pending', label: 'Pendente' },
            sent: { cls: 'warning', label: 'Enviado' },
            executing: { cls: 'warning', label: 'Executando' },
            completed: { cls: 'online', label: 'Concluído' },
            failed: { cls: 'offline', label: 'Falhou' },
            timeout: { cls: 'maintenance', label: 'Timeout' },
        };
        const info = map[status] || { cls: '', label: status };
        return `<span class="status-badge ${info.cls}">${info.label}</span>`;
    }

    window.CommandManager = { viewResult };

    App.onPageLoad('commands', loadCommands);
})();
