// MDM Dashboard — Users Page

(() => {
    let allUsers = [];

    function loadUsers() {
        fetchUsers();
        setupSearch();
        setupModal();
    }

    async function fetchUsers() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        try {
            const data = await API.get('/auth/users');
            allUsers = Array.isArray(data) ? data : (data.users || data.data || []);
            renderUsers(allUsers);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>Erro ao carregar usuários.</p></td></tr>';
            console.error('Erro ao carregar usuários:', err);
        }
    }

    function renderUsers(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">👤</div><p>Nenhum usuário encontrado.</p></td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => `
      <tr>
        <td>${esc(u.username)}</td>
        <td class="mono">${esc(u.email)}</td>
        <td>${roleBadge(u.role)}</td>
        <td>${esc(u.sector || 'N/A')}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="UserManager.edit('${u._id || u.id}')">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="UserManager.remove('${u._id || u.id}', '${esc(u.username)}')">🗑 Excluir</button>
        </td>
      </tr>
    `).join('');
    }

    function roleBadge(role) {
        if (role === 'admin') return '<span class="status-badge maintenance">Admin</span>';
        return '<span class="status-badge pending">Usuário</span>';
    }

    function setupSearch() {
        const input = document.getElementById('user-search');
        if (!input) return;
        input.addEventListener('input', () => {
            const q = input.value.toLowerCase();
            const filtered = allUsers.filter(u => {
                return !q ||
                    (u.username || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q) ||
                    (u.sector || '').toLowerCase().includes(q);
            });
            renderUsers(filtered);
        });
    }

    function setupModal() {
        const modal = document.getElementById('user-modal');
        const addBtn = document.getElementById('add-user-btn');
        const closeBtn = document.getElementById('user-modal-close');
        const cancelBtn = document.getElementById('user-modal-cancel');
        const saveBtn = document.getElementById('user-modal-save');

        if (addBtn) {
            addBtn.addEventListener('click', () => openModal());
        }

        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) btn.addEventListener('click', () => modal.classList.remove('active'));
        });

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', handleSave);
        }
    }

    function openModal(user = null) {
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('user-modal-title');
        const form = document.getElementById('user-form');
        const passwordInput = document.getElementById('form-password');
        const editId = document.getElementById('edit-user-id');

        if (form) form.reset();

        if (user) {
            title.textContent = 'Editar Usuário';
            editId.value = user._id || user.id;
            document.getElementById('form-username').value = user.username || '';
            document.getElementById('form-email').value = user.email || '';
            document.getElementById('form-role').value = user.role || 'user';
            document.getElementById('form-sector').value = user.sector || '';
            if (passwordInput) passwordInput.required = false;
            if (passwordInput) passwordInput.placeholder = 'Deixe vazio para manter';
        } else {
            title.textContent = 'Novo Usuário';
            editId.value = '';
            if (passwordInput) passwordInput.required = true;
            if (passwordInput) passwordInput.placeholder = 'Mínimo 6 caracteres';
        }

        modal.classList.add('active');
    }

    async function handleSave() {
        const editId = document.getElementById('edit-user-id').value;
        const username = document.getElementById('form-username').value.trim();
        const email = document.getElementById('form-email').value.trim();
        const password = document.getElementById('form-password').value;
        const role = document.getElementById('form-role').value;
        const sector = document.getElementById('form-sector').value.trim();

        if (!username || !email || !role) {
            showToast('Preencha todos os campos obrigatórios.', 'warning');
            return;
        }

        if (!editId && (!password || password.length < 6)) {
            showToast('Senha deve ter no mínimo 6 caracteres.', 'warning');
            return;
        }

        const body = { username, email, role, sector };
        if (password) body.password = password;

        try {
            if (editId) {
                await API.put(`/auth/users/${editId}`, body);
                showToast('Usuário atualizado com sucesso.', 'success');
            } else {
                await API.post('/auth/register', body);
                showToast('Usuário criado com sucesso.', 'success');
            }

            document.getElementById('user-modal').classList.remove('active');
            fetchUsers();
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
        }
    }

    // Expose for inline onclick
    window.UserManager = {
        edit: (id) => {
            const user = allUsers.find(u => (u._id || u.id) === id);
            if (user) openModal(user);
        },
        remove: async (id, username) => {
            if (!confirm(`Tem certeza que deseja excluir o usuário "${username}"?`)) return;
            try {
                await API.delete(`/auth/users/${id}`);
                showToast(`Usuário "${username}" excluído.`, 'success');
                fetchUsers();
            } catch (err) {
                showToast(`Erro: ${err.message}`, 'error');
            }
        },
    };

    App.onPageLoad('users', loadUsers);
})();
