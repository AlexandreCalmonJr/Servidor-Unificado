// MDM Dashboard — Server & APKs Page

(() => {
    function loadServer() {
        loadServerMetrics();
        loadApks();
        setupUpload();
    }

    async function loadServerMetrics() {
        try {
            const data = await API.get('/server/status');

            const cpu = data.cpu_usage ?? 0;
            const mem = data.memory_usage ?? 0;
            const uptime = data.uptime ?? 0;

            setText('srv-cpu', `${cpu.toFixed(1)}%`);
            setText('srv-memory', `${mem.toFixed(1)}%`);
            setText('srv-uptime', formatUptime(uptime));

            setBar('srv-cpu-bar', cpu);
            setBar('srv-memory-bar', mem);
        } catch (err) {
            console.error('Erro ao carregar métricas:', err);
        }
    }

    async function loadApks() {
        const container = document.getElementById('apk-list');
        if (!container) return;

        try {
            const data = await API.get('/server/apks');
            const apks = Array.isArray(data) ? data : (data.apks || []);

            if (apks.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>Nenhum APK disponível.</p></div>';
                return;
            }

            container.innerHTML = apks.map(apk => `
        <div class="file-item">
          <div class="file-info">
            <span class="file-icon">📦</span>
            <div>
              <div class="file-name">${esc(apk.name)}</div>
              <div class="file-size">${apk.size ? formatSize(apk.size) : ''} ${apk.lastModified ? '· ' + formatDate(apk.lastModified) : ''}</div>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <a href="${esc(apk.url)}" target="_blank" class="btn btn-ghost btn-sm" title="Download">⬇ Download</a>
            <button class="btn btn-danger btn-sm" onclick="ApkManager.remove('${esc(apk.name)}')" title="Excluir">🗑</button>
          </div>
        </div>
      `).join('');
        } catch (err) {
            container.innerHTML = '<div class="empty-state"><p>Erro ao carregar APKs.</p></div>';
            console.error('Erro ao carregar APKs:', err);
        }
    }

    function setupUpload() {
        const uploadBtn = document.getElementById('upload-apk-btn');
        const modal = document.getElementById('upload-modal');
        const closeBtn = document.getElementById('upload-modal-close');
        const zone = document.getElementById('upload-zone');
        const fileInput = document.getElementById('apk-file-input');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => modal.classList.add('active'));
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        }

        if (zone) {
            zone.addEventListener('click', () => fileInput.click());

            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('dragover');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('dragover');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) uploadFile(files[0]);
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) uploadFile(fileInput.files[0]);
            });
        }
    }

    async function uploadFile(file) {
        if (!file.name.toLowerCase().endsWith('.apk')) {
            showToast('Apenas arquivos .apk são permitidos.', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('apk', file);

        showToast(`Enviando ${file.name}...`, 'info', 10000);

        try {
            await API.upload('/server/upload-apk', formData);
            showToast(`APK "${file.name}" enviado com sucesso!`, 'success');
            document.getElementById('upload-modal').classList.remove('active');
            loadApks();
        } catch (err) {
            showToast(`Erro ao enviar: ${err.message}`, 'error');
        }
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function setBar(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.style.width = `${Math.min(value, 100)}%`;
            el.className = `progress-bar-fill ${getBarColor(value)}`;
        }
    }

    // Expose for inline onclick
    window.ApkManager = {
        remove: async (filename) => {
            if (!confirm(`Excluir o APK "${filename}"?`)) return;
            try {
                await API.delete(`/server/apks/${encodeURIComponent(filename)}`);
                showToast(`APK "${filename}" excluído.`, 'success');
                loadApks();
            } catch (err) {
                showToast(`Erro: ${err.message}`, 'error');
            }
        },
    };

    App.onPageLoad('server', loadServer);
})();
