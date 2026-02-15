// MDM Dashboard — Provisioning Page

(() => {
    let tokens = [];
    let profiles = [];

    function loadProvisioning() {
        loadTokens();
        loadProfilesForSelect();
        setupProvisionModal();
    }

    // ===== LOAD TOKENS =====
    async function loadTokens() {
        const grid = document.getElementById('token-grid');
        if (!grid) return;

        grid.innerHTML = '<div class="empty-state"><p>Carregando...</p></div>';

        try {
            const data = await API.get('/provisioning/tokens');
            tokens = data.tokens || (Array.isArray(data) ? data : []);

            if (tokens.length === 0) {
                grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔑</div><p>Nenhum token de provisionamento.</p></div>';
                return;
            }

            grid.innerHTML = tokens.map(t => {
                const isExpired = new Date(t.expires_at) < new Date();
                const isExhausted = t.used_count >= t.max_uses;
                const status = !t.is_active ? 'Inativo' : isExpired ? 'Expirado' : isExhausted ? 'Esgotado' : 'Ativo';
                const statusCls = status === 'Ativo' ? 'online' : status === 'Expirado' ? 'offline' : 'maintenance';

                return `
          <div class="token-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong>${esc(t.organization)}</strong>
              <span class="status-badge ${statusCls}">${status}</span>
            </div>
            <div class="token-value" title="Clique para copiar" onclick="ProvisionManager.copyToken('${esc(t.token)}')">${esc(t.token)}</div>
            <div class="token-meta">
              <span>⚙️ ${esc(t.config_profile)}</span>
              <span>📊 ${t.used_count}/${t.max_uses}</span>
              <span>⏰ ${formatDate(t.expires_at)}</span>
            </div>
            <div style="margin-top: 12px; display:flex; gap:8px;">
              <button class="btn btn-ghost btn-sm" onclick="ProvisionManager.copyUrl('${esc(t.token)}')">📋 Copiar URL</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="ProvisionManager.deleteToken('${t._id || t.id}')">🗑️</button>
            </div>
          </div>
        `;
            }).join('');
        } catch (err) {
            grid.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">Erro: ${esc(err.message)}</p></div>`;
        }
    }

    // ===== LOAD PROFILES FOR SELECT =====
    async function loadProfilesForSelect() {
        try {
            const data = await API.get('/config-profiles');
            profiles = data.profiles || (Array.isArray(data) ? data : []);
            const select = document.getElementById('form-provision-profile');
            if (!select) return;

            select.innerHTML = '<option value="" disabled selected>Selecione um perfil...</option>';
            profiles.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name;
                opt.textContent = p.name;
                select.appendChild(opt);
            });
        } catch (err) {
            // Config profiles endpoint may not exist yet — fail silently
        }
    }

    // ===== PROVISION MODAL =====
    function setupProvisionModal() {
        const modal = document.getElementById('provision-modal');
        const addBtn = document.getElementById('add-token-btn');
        const closeBtn = document.getElementById('provision-modal-close');
        const cancelBtn = document.getElementById('provision-modal-cancel');
        const saveBtn = document.getElementById('provision-modal-save');

        if (addBtn) addBtn.addEventListener('click', () => modal.classList.add('active'));
        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.addEventListener('click', () => modal.classList.remove('active'));
        });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
        if (saveBtn) saveBtn.addEventListener('click', handleGenerateToken);
    }

    async function handleGenerateToken() {
        const organization = document.getElementById('form-provision-org')?.value.trim();
        const config_profile = document.getElementById('form-provision-profile')?.value;
        const max_uses = parseInt(document.getElementById('form-provision-uses')?.value) || 1;
        const expires_in_hours = parseInt(document.getElementById('form-provision-hours')?.value) || 24;

        if (!organization) { showToast('Organização é obrigatória.', 'warning'); return; }
        if (!config_profile) { showToast('Selecione um perfil.', 'warning'); return; }

        try {
            const result = await API.post('/provisioning/generate-token', {
                organization, config_profile, max_uses, expires_in_hours,
            });
            showToast('Token gerado com sucesso!', 'success');
            document.getElementById('provision-modal').classList.remove('active');
            loadTokens();

            // Show the URL in a toast
            if (result.provisioning_url) {
                showToast(`URL: ${result.provisioning_url}`, 'info');
            }
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    // ===== HELPERS =====
    function copyToken(token) {
        navigator.clipboard.writeText(token).then(() => {
            showToast('Token copiado!', 'success');
        });
    }

    function copyUrl(token) {
        const url = `${window.location.protocol}//${window.location.hostname}:${window.location.port || 3000}/provision/${token}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('URL copiada!', 'success');
        });
    }

    async function deleteToken(id) {
        if (!await confirmAction('Desativar este token?', { danger: true, okText: 'Desativar' })) return;
        try {
            await API.delete(`/provisioning/tokens/${id}`);
            showToast('Token removido.', 'success');
            loadTokens();
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    window.ProvisionManager = { copyToken, copyUrl, deleteToken };
    App.onPageLoad('provisioning', loadProvisioning);
})();
