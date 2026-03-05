// frontend/js/printers.js
// Módulo de gerenciamento de impressoras — HP e Samsung via IP (SNMP) e USB
// Auto-refresh a cada 60s, filtros, busca, modal de cadastro/edição

(function () {
  'use strict';

  // ─── Estado ────────────────────────────────────────────────────────────────
  let allPrinters   = [];
  let activeFilter  = 'all';   // all | online | offline | warning
  let searchQuery   = '';
  let autoRefreshTimer = null;
  const REFRESH_INTERVAL = 60_000;

  // ─── Inicialização ─────────────────────────────────────────────────────────
  function init() {
    bindTopButtons();
    loadSummary();
    loadPrinters();
    startAutoRefresh();

    // Pausa refresh quando a aba não está visível
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoRefresh();
      else { loadPrinters(); startAutoRefresh(); }
    });
  }

  // ─── Auto-refresh ──────────────────────────────────────────────────────────
  function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshTimer = setInterval(() => {
      loadSummary();
      loadPrinters(false); // silent (sem spinner)
    }, REFRESH_INTERVAL);
  }

  function stopAutoRefresh() {
    if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
  }

  // ─── Botões do cabeçalho ───────────────────────────────────────────────────
  function bindTopButtons() {
    document.getElementById('add-printer-btn')
      ?.addEventListener('click', () => openModal());

    document.getElementById('printer-poll-all-btn')
      ?.addEventListener('click', pollAll);

    document.getElementById('printer-test-snmp-btn')
      ?.addEventListener('click', openSnmpTestModal);
  }

  // ─── Summary cards ─────────────────────────────────────────────────────────
  async function loadSummary() {
    try {
      const res  = await apiFetch('/api/printers/summary');
      const data = await res.json();
      if (!data.success) return;
      const s = data.summary;
      setEl('printer-summary-total',   s.total   ?? 0);
      setEl('printer-summary-online',  s.online  ?? 0);
      setEl('printer-summary-offline', s.offline ?? 0);
      setEl('printer-summary-alerts',  s.toner_alerts ?? 0);
    } catch { /* silencioso */ }
  }

  function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ─── Lista de impressoras ──────────────────────────────────────────────────
  async function loadPrinters(showSpinner = true) {
    const tbody = document.getElementById('printers-tbody');
    if (!tbody) return;

    if (showSpinner) tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Carregando impressoras…</td></tr>';

    try {
      const res  = await apiFetch('/api/printers');
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Erro ao carregar');
      allPrinters = data.printers || [];
      renderTable();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Erro: ${escHtml(err.message)}</td></tr>`;
    }
  }

  function renderTable() {
    const tbody = document.getElementById('printers-tbody');
    if (!tbody) return;

    const filtered = allPrinters.filter(p => {
      const matchFilter =
        activeFilter === 'all' ||
        (activeFilter === 'online'  && p.status === 'online')  ||
        (activeFilter === 'offline' && p.status === 'offline') ||
        (activeFilter === 'warning' && (p.status === 'warning' || hasTonerAlert(p)));

      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        (p.name        || '').toLowerCase().includes(q) ||
        (p.ip_address  || '').toLowerCase().includes(q) ||
        (p.model       || '').toLowerCase().includes(q) ||
        (p.serial_number || '').toLowerCase().includes(q) ||
        (p.unit_name   || '').toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Nenhuma impressora encontrada.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(p => buildRow(p)).join('');

    // Bind action buttons
    tbody.querySelectorAll('[data-action]').forEach(btn => {
      const action = btn.dataset.action;
      const id     = btn.dataset.id;
      if (action === 'poll')   btn.addEventListener('click', () => pollOne(id));
      if (action === 'edit')   btn.addEventListener('click', () => openModal(id));
      if (action === 'delete') btn.addEventListener('click', () => deletePrinter(id));
    });
  }

  function buildRow(p) {
    const statusBadge = `<span class="status-badge status-${p.status || 'unknown'}">${statusLabel(p.status)}</span>`;
    const tonerHtml   = buildTonerBars(p.toner_levels);
    const connIcon    = p.connection_type === 'usb' ? '🔌' : '🌐';
    const lastPoll    = p.last_snmp_poll ? timeAgo(new Date(p.last_snmp_poll)) : '—';
    const pages       = p.total_pages != null ? p.total_pages.toLocaleString('pt-BR') : '—';

    return `
      <tr>
        <td>
          <div class="printer-name">${escHtml(p.name || '—')}</div>
          <div class="printer-sub">${escHtml(p.unit_name || '')}</div>
        </td>
        <td>${connIcon} ${escHtml(p.ip_address || p.usb_path || '—')}</td>
        <td>${escHtml(p.model || '—')}</td>
        <td>${statusBadge}</td>
        <td>${tonerHtml}</td>
        <td class="text-right">${pages}</td>
        <td class="text-muted text-sm">${lastPoll}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-ghost btn-xs" data-action="poll" data-id="${p._id}" title="Atualizar agora">🔄</button>
            <button class="btn btn-ghost btn-xs" data-action="edit" data-id="${p._id}" title="Editar">✏️</button>
            <button class="btn btn-ghost btn-xs btn-danger" data-action="delete" data-id="${p._id}" title="Remover">🗑️</button>
          </div>
        </td>
      </tr>`;
  }

  function buildTonerBars(levels) {
    if (!levels || !Object.keys(levels).length) return '<span class="text-muted">—</span>';

    return Object.entries(levels).map(([key, t]) => {
      const pct   = Math.max(0, Math.min(100, t.percent ?? 0));
      const color = pct <= 10 ? 'toner-critical' : pct <= 20 ? 'toner-low' : 'toner-ok';
      const label = tonerLabel(key);
      return `
        <div class="toner-bar-wrap" title="${label}: ${pct}%">
          <span class="toner-label">${label}</span>
          <div class="toner-track">
            <div class="toner-fill ${color}" style="width:${pct}%"></div>
          </div>
          <span class="toner-pct">${pct}%</span>
        </div>`;
    }).join('');
  }

  function tonerLabel(key) {
    const map = { black: 'K', cyan: 'C', magenta: 'M', yellow: 'Y' };
    return map[key.toLowerCase()] || key.charAt(0).toUpperCase();
  }

  function hasTonerAlert(p) {
    if (!p.toner_levels) return false;
    return Object.values(p.toner_levels).some(t => (t.percent ?? 100) <= 20);
  }

  // ─── Filtros e busca ───────────────────────────────────────────────────────
  function bindFilters() {
    document.querySelectorAll('[data-printer-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.printerFilter;
        document.querySelectorAll('[data-printer-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTable();
      });
    });

    document.getElementById('printer-search')?.addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      renderTable();
    });
  }

  // ─── Modal cadastro/edição ─────────────────────────────────────────────────
  function openModal(id = null) {
    const printer = id ? allPrinters.find(p => p._id === id) : null;
    const isEdit  = !!printer;

    const modal = createModal(`
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Impressora' : 'Nova Impressora'}</h3>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Nome *</label>
            <input id="p-name" type="text" class="form-input" placeholder="Ex: HP LaserJet Recepção"
              value="${escHtml(printer?.name || '')}">
          </div>
          <div class="form-group">
            <label>Unidade / Setor</label>
            <input id="p-unit" type="text" class="form-input" placeholder="Ex: TI, RH, Financeiro"
              value="${escHtml(printer?.unit_name || '')}">
          </div>
          <div class="form-group">
            <label>Tipo de conexão</label>
            <select id="p-conn" class="form-input">
              <option value="ip"  ${(!printer || printer.connection_type === 'ip')  ? 'selected' : ''}>IP (SNMP)</option>
              <option value="usb" ${printer?.connection_type === 'usb' ? 'selected' : ''}>USB</option>
            </select>
          </div>
          <div class="form-group" id="p-ip-group">
            <label>Endereço IP *</label>
            <div style="display:flex;gap:8px">
              <input id="p-ip" type="text" class="form-input" placeholder="192.168.1.100"
                value="${escHtml(printer?.ip_address || '')}">
              <button class="btn btn-ghost btn-sm" id="p-snmp-test-btn" title="Testar SNMP">🔍 Testar</button>
            </div>
            <div id="p-snmp-result" class="form-hint"></div>
          </div>
          <div class="form-group" id="p-usb-group" style="display:none">
            <label>Caminho USB</label>
            <input id="p-usb" type="text" class="form-input" placeholder="Ex: /dev/usb/lp0"
              value="${escHtml(printer?.usb_path || '')}">
          </div>
          <div class="form-group">
            <label>Community SNMP</label>
            <input id="p-community" type="text" class="form-input" placeholder="public"
              value="${escHtml(printer?.snmp_community || 'public')}">
          </div>
          <div class="form-group">
            <label>Modelo</label>
            <input id="p-model" type="text" class="form-input" placeholder="Detectado via SNMP"
              value="${escHtml(printer?.model || '')}">
          </div>
          <div class="form-group">
            <label>Número de série</label>
            <input id="p-serial" type="text" class="form-input" placeholder="Detectado via SNMP"
              value="${escHtml(printer?.serial_number || '')}">
          </div>
          <div class="form-group">
            <label>Observações</label>
            <input id="p-notes" type="text" class="form-input" placeholder="Notas opcionais"
              value="${escHtml(printer?.notes || '')}">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="modal-cancel-btn">Cancelar</button>
        <button class="btn btn-primary" id="modal-save-btn">${isEdit ? 'Salvar' : 'Cadastrar'}</button>
      </div>
    `);

    // Conexão toggle
    const connSel  = modal.querySelector('#p-conn');
    const ipGroup  = modal.querySelector('#p-ip-group');
    const usbGroup = modal.querySelector('#p-usb-group');

    function toggleConnFields() {
      const isIp = connSel.value === 'ip';
      ipGroup.style.display  = isIp ? '' : 'none';
      usbGroup.style.display = isIp ? 'none' : '';
    }
    connSel.addEventListener('change', toggleConnFields);
    toggleConnFields();

    // Teste SNMP inline
    modal.querySelector('#p-snmp-test-btn')?.addEventListener('click', async () => {
      const ip        = modal.querySelector('#p-ip').value.trim();
      const community = modal.querySelector('#p-community').value.trim() || 'public';
      const resultEl  = modal.querySelector('#p-snmp-result');

      if (!ip) { resultEl.textContent = '⚠️ Informe um IP.'; resultEl.className = 'form-hint text-warning'; return; }

      resultEl.textContent = '⏳ Testando…'; resultEl.className = 'form-hint';

      try {
        const res  = await apiFetch('/api/printers/test-snmp', { method: 'POST', body: { ip, community } });
        const data = await res.json();
        if (data.success) {
          const d = data.data;
          resultEl.innerHTML = `✅ <strong>${escHtml(d.model || 'Modelo desconhecido')}</strong> — S/N: ${escHtml(d.serial || '—')} — Status: ${escHtml(d.printer_status || '—')}`;
          resultEl.className = 'form-hint text-success';
          if (d.model)  modal.querySelector('#p-model').value  = d.model;
          if (d.serial) modal.querySelector('#p-serial').value = d.serial;
        } else {
          resultEl.textContent = `❌ ${data.message || 'Falha no teste SNMP'}`;
          resultEl.className = 'form-hint text-danger';
        }
      } catch (err) {
        resultEl.textContent = `❌ Erro: ${err.message}`;
        resultEl.className = 'form-hint text-danger';
      }
    });

    // Salvar
    modal.querySelector('#modal-save-btn').addEventListener('click', async () => {
      const payload = {
        name:            modal.querySelector('#p-name').value.trim(),
        unit_name:       modal.querySelector('#p-unit').value.trim(),
        connection_type: connSel.value,
        ip_address:      modal.querySelector('#p-ip').value.trim(),
        usb_path:        modal.querySelector('#p-usb').value.trim(),
        snmp_community:  modal.querySelector('#p-community').value.trim() || 'public',
        model:           modal.querySelector('#p-model').value.trim(),
        serial_number:   modal.querySelector('#p-serial').value.trim(),
        notes:           modal.querySelector('#p-notes').value.trim(),
      };

      if (!payload.name) { showToast('Informe um nome para a impressora.', 'error'); return; }
      if (payload.connection_type === 'ip' && !payload.ip_address) {
        showToast('Informe o endereço IP.', 'error'); return;
      }

      const saveBtn = modal.querySelector('#modal-save-btn');
      saveBtn.disabled = true; saveBtn.textContent = 'Salvando…';

      try {
        const url    = isEdit ? `/api/printers/${id}` : '/api/printers';
        const method = isEdit ? 'PUT' : 'POST';
        const res    = await apiFetch(url, { method, body: payload });
        const data   = await res.json();

        if (data.success) {
          showToast(isEdit ? 'Impressora atualizada.' : 'Impressora cadastrada.', 'success');
          closeModal(modal);
          loadSummary();
          loadPrinters();
        } else {
          showToast(data.message || 'Erro ao salvar.', 'error');
          saveBtn.disabled = false; saveBtn.textContent = isEdit ? 'Salvar' : 'Cadastrar';
        }
      } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
        saveBtn.disabled = false; saveBtn.textContent = isEdit ? 'Salvar' : 'Cadastrar';
      }
    });

    modal.querySelector('#modal-close-btn').addEventListener('click',  () => closeModal(modal));
    modal.querySelector('#modal-cancel-btn').addEventListener('click', () => closeModal(modal));
  }

  // ─── Modal teste SNMP standalone ──────────────────────────────────────────
  function openSnmpTestModal() {
    const modal = createModal(`
      <div class="modal-header">
        <h3>🔍 Testar Conexão SNMP</h3>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Endereço IP da impressora</label>
          <input id="snmp-ip" type="text" class="form-input" placeholder="192.168.1.100">
        </div>
        <div class="form-group">
          <label>Community SNMP</label>
          <input id="snmp-community" type="text" class="form-input" value="public">
        </div>
        <button class="btn btn-primary" id="snmp-run-btn" style="width:100%">Testar Agora</button>
        <div id="snmp-result" class="snmp-result-box" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="modal-close-btn2">Fechar</button>
      </div>
    `);

    modal.querySelector('#snmp-run-btn').addEventListener('click', async () => {
      const ip        = modal.querySelector('#snmp-ip').value.trim();
      const community = modal.querySelector('#snmp-community').value.trim() || 'public';
      const resultEl  = modal.querySelector('#snmp-result');

      if (!ip) { showToast('Informe um IP.', 'error'); return; }

      const runBtn = modal.querySelector('#snmp-run-btn');
      runBtn.disabled = true; runBtn.textContent = '⏳ Testando…';
      resultEl.style.display = 'none';

      try {
        const res  = await apiFetch('/api/printers/test-snmp', { method: 'POST', body: { ip, community } });
        const data = await res.json();

        resultEl.style.display = '';
        if (data.success) {
          const d = data.data;
          const tonerLines = d.toner_levels
            ? Object.entries(d.toner_levels).map(([k,v]) => `${tonerLabel(k)}: ${v.percent}%`).join(' | ')
            : '—';
          resultEl.className = 'snmp-result-box snmp-success';
          resultEl.innerHTML = `
            <div><strong>✅ Conexão bem-sucedida</strong></div>
            <div>Modelo: ${escHtml(d.model || '—')}</div>
            <div>S/N: ${escHtml(d.serial || '—')}</div>
            <div>Status: ${escHtml(d.printer_status || '—')}</div>
            <div>Toner: ${tonerLines}</div>
            <div>Páginas totais: ${d.total_pages ?? '—'}</div>`;
        } else {
          resultEl.className = 'snmp-result-box snmp-error';
          resultEl.innerHTML = `<strong>❌ Falha</strong><br>${escHtml(data.message || 'Sem resposta SNMP.')}`;
        }
      } catch (err) {
        resultEl.style.display = '';
        resultEl.className = 'snmp-result-box snmp-error';
        resultEl.innerHTML = `<strong>❌ Erro</strong><br>${escHtml(err.message)}`;
      } finally {
        runBtn.disabled = false; runBtn.textContent = 'Testar Agora';
      }
    });

    modal.querySelector('#modal-close-btn').addEventListener('click',  () => closeModal(modal));
    modal.querySelector('#modal-close-btn2').addEventListener('click', () => closeModal(modal));
  }

  // ─── Ações de tabela ───────────────────────────────────────────────────────
  async function pollOne(id) {
    try {
      showToast('Atualizando impressora…', 'info');
      const res  = await apiFetch(`/api/printers/${id}/poll`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Impressora atualizada.', 'success');
        loadSummary(); loadPrinters(false);
      } else {
        showToast(data.message || 'Erro ao atualizar.', 'error');
      }
    } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
  }

  async function pollAll() {
    try {
      showToast('Atualizando todas as impressoras…', 'info');
      const res  = await apiFetch('/api/printers/poll-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Todas as impressoras atualizadas.', 'success');
        loadSummary(); loadPrinters(false);
      } else {
        showToast(data.message || 'Erro ao atualizar.', 'error');
      }
    } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
  }

  async function deletePrinter(id) {
    const p = allPrinters.find(x => x._id === id);
    if (!confirm(`Remover impressora "${p?.name || id}"?`)) return;

    try {
      const res  = await apiFetch(`/api/printers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Impressora removida.', 'success');
        loadSummary(); loadPrinters(false);
      } else {
        showToast(data.message || 'Erro ao remover.', 'error');
      }
    } catch (err) { showToast(`Erro: ${err.message}`, 'error'); }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function apiFetch(url, opts = {}) {
    const options = {
      method:  opts.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
    };
    if (opts.body) options.body = JSON.stringify(opts.body);
    // Adiciona token de autenticação se disponível no app global
    const token = window.app?.getToken?.() || localStorage.getItem('token');
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, options);
  }

  function createModal(html) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-dialog">${html}</div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay); });
    return overlay;
  }

  function closeModal(modal) {
    modal?.remove();
  }

  function statusLabel(s) {
    const map = { online: 'Online', offline: 'Offline', warning: 'Atenção', error: 'Erro', unknown: '?' };
    return map[s] || s || '?';
  }

  function timeAgo(date) {
    const diff = Math.floor((Date.now() - date) / 1000);
    if (diff < 60)   return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h atrás`;
    return `${Math.floor(diff / 86400)}d atrás`;
  }

  function escHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }

  function showToast(msg, type = 'info') {
    // Usa a função global do app se existir; caso contrário, fallback
    if (window.showToast) { window.showToast(msg, type); return; }
    if (window.app?.showToast) { window.app.showToast(msg, type); return; }
    console.log(`[${type.toUpperCase()}] ${msg}`);
  }

  // ─── Exposição para o roteador de páginas ──────────────────────────────────
  window.printersModule = { init, bindFilters, stopAutoRefresh };

})();
