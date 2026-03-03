// MDM Dashboard — Config Profiles Page

(() => {
    let allProfiles = [];
    let editingId = null;

    function loadProfiles() {
        fetchProfiles();
        setupProfileModal();
    }

    // ===== FETCH =====
    async function fetchProfiles() {
        const grid = document.getElementById('profile-grid');
        if (!grid) return;

        grid.innerHTML = '<div class="empty-state"><p>Carregando...</p></div>';

        try {
            const data = await API.get('/config-profiles');
            allProfiles = data.profiles || (Array.isArray(data) ? data : []);

            if (allProfiles.length === 0) {
                grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚙️</div><p>Nenhum perfil de configuração.</p></div>';
                return;
            }

            grid.innerHTML = allProfiles.map(p => {
                const s = p.settings || {};
                const restrictions = s.restrictions || {};

                return `
          <div class="profile-card">
            <div style="display:flex;justify-content:space-between;align-items:start;">
              <div>
                <strong style="font-size:1rem;">${esc(p.name)}</strong>
                ${p.description ? `<div style="color:var(--text-secondary);font-size:0.85rem;margin-top:4px;">${esc(p.description)}</div>` : ''}
              </div>
              <div style="display:flex;gap:4px;">
                <button class="btn btn-ghost btn-sm" onclick="ProfileManager.edit('${p._id || p.id}')">✏️</button>
                <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="ProfileManager.remove('${p._id || p.id}')">🗑️</button>
              </div>
            </div>

            <div class="profile-settings">
              <span class="setting-chip ${restrictions.disable_camera ? 'active' : ''}">📷 Câmera ${restrictions.disable_camera ? 'OFF' : 'ON'}</span>
              <span class="setting-chip ${restrictions.disable_bluetooth ? 'active' : ''}">🔵 Bluetooth ${restrictions.disable_bluetooth ? 'OFF' : 'ON'}</span>
              <span class="setting-chip ${restrictions.disable_usb ? 'active' : ''}">🔌 USB ${restrictions.disable_usb ? 'OFF' : 'ON'}</span>
              <span class="setting-chip ${restrictions.disable_developer_options ? 'active' : ''}">🛠️ Dev ${restrictions.disable_developer_options ? 'OFF' : 'ON'}</span>
            </div>

            <div style="margin-top: 10px;">
              ${s.wifi_configs && s.wifi_configs.length > 0 ? `<div class="token-meta"><span>📶 ${s.wifi_configs.length} WiFi configs</span></div>` : ''}
              ${s.mandatory_apps && s.mandatory_apps.length > 0 ? `<div class="token-meta"><span>📱 ${s.mandatory_apps.length} apps obrigatórios</span></div>` : ''}
              ${s.app_whitelist && s.app_whitelist.length > 0 ? `<div class="token-meta"><span>✅ ${s.app_whitelist.length} whitelist</span></div>` : ''}
              ${s.app_blacklist && s.app_blacklist.length > 0 ? `<div class="token-meta"><span>🚫 ${s.app_blacklist.length} blacklist</span></div>` : ''}
            </div>

            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;">
              Criado: ${formatDate(p.created_at)}
            </div>
          </div>
        `;
            }).join('');
        } catch (err) {
            grid.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">Erro: ${esc(err.message)}</p></div>`;
        }
    }

    // ===== MODAL =====
    function setupProfileModal() {
        const modal = document.getElementById('profile-modal');
        const addBtn = document.getElementById('add-profile-btn');
        const closeBtn = document.getElementById('profile-modal-close');
        const cancelBtn = document.getElementById('profile-modal-cancel');
        const saveBtn = document.getElementById('profile-modal-save');

        if (addBtn) addBtn.addEventListener('click', () => openModal());
        [closeBtn, cancelBtn].forEach(b => {
            if (b) b.addEventListener('click', () => modal.classList.remove('active'));
        });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
        if (saveBtn) saveBtn.addEventListener('click', handleSave);
    }

    function openModal(profile = null) {
        editingId = profile ? (profile._id || profile.id) : null;
        const modal = document.getElementById('profile-modal');
        const title = document.getElementById('profile-modal-title');

        if (title) title.textContent = editingId ? 'Editar Perfil' : 'Novo Perfil';

        document.getElementById('form-profile-name').value = profile?.name || '';
        document.getElementById('form-profile-desc').value = profile?.description || '';

        const s = profile?.settings || {};
        const r = s.restrictions || {};
        document.getElementById('form-profile-camera').checked = r.disable_camera || false;
        document.getElementById('form-profile-bluetooth').checked = r.disable_bluetooth || false;
        document.getElementById('form-profile-usb').checked = r.disable_usb || false;
        document.getElementById('form-profile-dev').checked = r.disable_developer_options !== false; // default true

        document.getElementById('form-profile-wifi').value = (s.wifi_configs || []).map(w => `${w.ssid}|${w.password || ''}|${w.security_type || 'WPA2'}`).join('\n');
        document.getElementById('form-profile-whitelist').value = (s.app_whitelist || []).join('\n');
        document.getElementById('form-profile-blacklist').value = (s.app_blacklist || []).join('\n');

        modal.classList.add('active');
    }

    async function handleSave() {
        const name = document.getElementById('form-profile-name')?.value.trim();
        const description = document.getElementById('form-profile-desc')?.value.trim();

        if (!name) { showToast('Nome é obrigatório.', 'warning'); return; }

        const wifiText = document.getElementById('form-profile-wifi')?.value.trim();
        const wifi_configs = wifiText ? wifiText.split('\n').filter(l => l.trim()).map(line => {
            const [ssid, password, security_type] = line.split('|');
            return { ssid: ssid?.trim(), password: password?.trim() || '', security_type: security_type?.trim() || 'WPA2' };
        }) : [];

        const whiteText = document.getElementById('form-profile-whitelist')?.value.trim();
        const app_whitelist = whiteText ? whiteText.split('\n').filter(l => l.trim()).map(l => l.trim()) : [];

        const blackText = document.getElementById('form-profile-blacklist')?.value.trim();
        const app_blacklist = blackText ? blackText.split('\n').filter(l => l.trim()).map(l => l.trim()) : [];

        const body = {
            name,
            description,
            settings: {
                wifi_configs,
                app_whitelist,
                app_blacklist,
                restrictions: {
                    disable_camera: document.getElementById('form-profile-camera')?.checked || false,
                    disable_bluetooth: document.getElementById('form-profile-bluetooth')?.checked || false,
                    disable_usb: document.getElementById('form-profile-usb')?.checked || false,
                    disable_developer_options: document.getElementById('form-profile-dev')?.checked || false,
                },
                mandatory_apps: [],
            },
        };

        try {
            if (editingId) {
                await API.put(`/config-profiles/${editingId}`, body);
            } else {
                await API.post('/config-profiles', body);
            }
            showToast('Perfil salvo!', 'success');
            document.getElementById('profile-modal').classList.remove('active');
            fetchProfiles();
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    // ===== ACTIONS =====
    function edit(id) {
        const profile = allProfiles.find(p => (p._id || p.id) === id);
        if (profile) openModal(profile);
    }

    async function remove(id) {
        if (!await confirmAction('Remover este perfil?', { danger: true, okText: 'Remover' })) return;
        try {
            await API.delete(`/config-profiles/${id}`);
            showToast('Perfil removido.', 'success');
            fetchProfiles();
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    window.ProfileManager = { edit, remove };
    App.onPageLoad('profiles', loadProfiles);
})();
