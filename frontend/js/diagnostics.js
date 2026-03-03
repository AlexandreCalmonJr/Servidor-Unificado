// MDM Dashboard — Diagnostics Page

(() => {
    function loadDiagnostics() {
        setupLocationTest();
        loadBssidValidation();
        loadUnmappedDevices();
        loadSuggestions();
        loadCacheStats();
    }

    // ===== LOCATION TEST =====
    function setupLocationTest() {
        const btn = document.getElementById('diag-run-btn');
        if (btn) btn.addEventListener('click', runLocationTest);
    }

    async function runLocationTest() {
        const serial = document.getElementById('diag-serial')?.value.trim();
        const ip = document.getElementById('diag-ip')?.value.trim();
        const bssid = document.getElementById('diag-bssid')?.value.trim();
        const resultEl = document.getElementById('diag-location-result');

        if (!serial && !ip && !bssid) {
            showToast('Preencha ao menos um campo.', 'warning');
            return;
        }

        resultEl.innerHTML = '<span style="color:var(--text-muted);">Executando diagnóstico...</span>';

        const params = new URLSearchParams();
        if (serial) params.set('serial_number', serial);
        if (ip) params.set('ip', ip);
        if (bssid) params.set('bssid', bssid);

        try {
            const data = await API.get(`/diagnostic/location-test?${params.toString()}`);
            const d = data.diagnostic || {};
            const m = data.mapping_result || {};

            resultEl.innerHTML = `
        <div style="margin-bottom:8px;"><strong>Input:</strong></div>
        <div style="padding-left:12px;margin-bottom:12px;">
          IP: <span class="mono">${esc(data.test_data?.ip_address || 'N/A')}</span><br>
          BSSID: <span class="mono">${esc(data.test_data?.mac_address_radio || 'N/A')}</span><br>
          ${d.input ? `Normalizado: <span class="mono">${esc(d.input.bssid_normalized || 'N/A')}</span> | Genérico: ${d.input.bssid_is_generic ? '⚠️ Sim' : '✅ Não'}` : ''}
        </div>
        <div style="margin-bottom:8px;"><strong>Mapeamento IP:</strong> ${d.ip_mapping?.found ? '✅ Encontrado' : '❌ Não encontrado'}</div>
        ${d.ip_mapping?.found ? `<div style="padding-left:12px;margin-bottom:8px;">Local: ${esc(d.ip_mapping.location || '')}</div>` : ''}
        <div style="margin-bottom:8px;"><strong>Mapeamento BSSID:</strong> ${d.bssid_mapping?.found ? '✅ Encontrado' : '❌ Não encontrado'}</div>
        ${d.bssid_mapping?.found ? `<div style="padding-left:12px;margin-bottom:8px;">Setor: ${esc(d.bssid_mapping.sector || '')} | Andar: ${esc(d.bssid_mapping.floor || '')}</div>` : ''}
        <div style="margin-bottom:8px;"><strong>Resultado:</strong> Setor: ${esc(m.sector || 'Desconhecido')} | Andar: ${esc(m.floor || 'Desconhecido')}</div>
        ${d.recommendations && d.recommendations.length > 0 ? `
          <div style="margin-top:8px;"><strong>Recomendações:</strong></div>
          <ul style="padding-left:20px;color:var(--text-secondary);">
            ${d.recommendations.map(r => `<li>${esc(r)}</li>`).join('')}
          </ul>
        ` : ''}
      `;
        } catch (err) {
            resultEl.innerHTML = `<span style="color:var(--danger);">Erro: ${esc(err.message)}</span>`;
        }
    }

    // ===== BSSID VALIDATION =====
    async function loadBssidValidation() {
        const area = document.getElementById('diag-bssid-validation');
        if (!area) return;

        try {
            const data = await API.get('/diagnostic/bssid-validation');
            const r = data.report || {};

            area.innerHTML = `
        <div class="metrics-grid" style="margin-bottom:12px;">
          <div class="metric-card"><div class="metric-value">${r.total || 0}</div><div class="metric-label">Total</div></div>
          <div class="metric-card"><div class="metric-value" style="color:var(--success);">${r.valid || 0}</div><div class="metric-label">Válidos</div></div>
          <div class="metric-card"><div class="metric-value" style="color:var(--danger);">${r.invalid || 0}</div><div class="metric-label">Inválidos</div></div>
          <div class="metric-card"><div class="metric-value" style="color:var(--warning);">${r.generic || 0}</div><div class="metric-label">Genéricos</div></div>
          <div class="metric-card"><div class="metric-value" style="color:var(--warning);">${r.duplicates || 0}</div><div class="metric-label">Duplicados</div></div>
        </div>
        ${r.details && r.details.length > 0 ? `
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead><tr><th>MAC Original</th><th>Setor</th><th>Andar</th><th>Status</th><th>Erro</th></tr></thead>
              <tbody>
                ${r.details.map(d => `
                  <tr>
                    <td class="mono">${esc(d.original)}</td>
                    <td>${esc(d.sector || '')}</td>
                    <td>${esc(d.floor || '')}</td>
                    <td>${statusBadge(d.status === 'invalid' ? 'offline' : d.status === 'generic' ? 'maintenance' : 'warning')}</td>
                    <td style="color:var(--text-secondary);font-size:0.8rem;">${esc(d.error || '')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="color:var(--success);">✅ Todos os BSSIDs são válidos!</p>'}
      `;
        } catch (err) {
            area.innerHTML = `<p style="color:var(--danger);">Erro: ${esc(err.message)}</p>`;
        }
    }

    // ===== UNMAPPED DEVICES =====
    async function loadUnmappedDevices() {
        const tbody = document.getElementById('diag-unmapped-body');
        if (!tbody) return;

        try {
            const data = await API.get('/diagnostic/unmapped-devices');
            const devices = data.devices || [];

            if (devices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>✅ Todos os dispositivos estão mapeados!</p></td></tr>';
                return;
            }

            tbody.innerHTML = devices.map(d => `
        <tr>
          <td>${esc(d.device_name || 'N/A')}</td>
          <td class="mono">${esc(d.serial_number || '')}</td>
          <td class="mono">${esc(d.ip_address || '')}</td>
          <td>${esc(d.current_location?.sector || 'Desconhecido')}</td>
          <td>${esc(d.current_location?.floor || 'Desconhecido')}</td>
          <td style="font-size:0.75rem;color:var(--text-secondary);">
            ${d.diagnostic?.recommendations ? d.diagnostic.recommendations.join('; ') : '--'}
          </td>
        </tr>
      `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" style="color:var(--danger);">Erro: ${esc(err.message)}</td></tr>`;
        }
    }

    // ===== SUGGESTIONS =====
    async function loadSuggestions() {
        const area = document.getElementById('diag-suggestions');
        if (!area) return;

        try {
            const data = await API.get('/diagnostic/mapping-suggestions');
            const suggestions = data.suggestions || [];

            if (suggestions.length === 0) {
                area.innerHTML = '<p style="color:var(--success);">✅ Nenhuma sugestão pendente.</p>';
                return;
            }

            area.innerHTML = suggestions.map(s => `
        <div class="suggestion-card" style="margin-bottom: 8px;">
          <div>
            <strong>${esc(s.device_name)}</strong>
            <div style="font-size:0.8rem;color:var(--text-secondary);">${esc(s.suggestion)}</div>
            <div class="mono" style="font-size:0.75rem;">${esc(s.bssid_to_register)}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('${esc(s.bssid_to_register)}').then(()=>showToast('BSSID copiado!','success'))">📋 Copiar</button>
        </div>
      `).join('');
        } catch (err) {
            area.innerHTML = `<p style="color:var(--danger);">Erro: ${esc(err.message)}</p>`;
        }
    }

    // ===== CACHE STATS =====
    async function loadCacheStats() {
        const area = document.getElementById('diag-cache');
        if (!area) return;

        try {
            const data = await API.get('/diagnostic/cache-stats');
            const c = data.cache || {};

            area.innerHTML = `
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
          <div><strong>Entradas:</strong> <span class="mono">${c.size || 0}</span></div>
          <div><strong>Hits:</strong> <span class="mono" style="color:var(--success);">${c.hits || 0}</span></div>
          <div><strong>Misses:</strong> <span class="mono" style="color:var(--warning);">${c.misses || 0}</span></div>
          <button class="btn btn-ghost btn-sm" onclick="DiagManager.invalidateCache()">🗑️ Invalidar Cache</button>
        </div>
      `;
        } catch (err) {
            area.innerHTML = `<p style="color:var(--text-muted);">Cache: indisponível</p>`;
        }
    }

    async function invalidateCache() {
        try {
            await API.post('/diagnostic/invalidate-cache');
            showToast('Cache invalidado!', 'success');
            loadCacheStats();
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    window.DiagManager = { invalidateCache };
    App.onPageLoad('diagnostics', loadDiagnostics);
})();
