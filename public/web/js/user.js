// Elementos do Modal de Usuário
const userModal = document.getElementById('user-modal');
const closeUserModalBtn = document.querySelector('#user-modal .close-btn');
const addUserBtn = document.getElementById('add-user-btn');
const userForm = document.getElementById('user-form');
const modalTitle = document.getElementById('modal-title');
const userIdInput = document.getElementById('user-id');
const usernameInput = document.getElementById('user-username');
const emailInput = document.getElementById('user-email');
const passwordInput = document.getElementById('user-password');
const roleInput = document.getElementById('user-role');
const sectorInput = document.getElementById('user-sector'); // NOVO: Input do setor

// Funções de Gerenciamento de Usuários

/**
 * Carrega a lista de usuários e renderiza na tabela.
 */
async function loadUsersTable() {
    try {
        const users = await request('/auth/users');
        renderUsersTable(users);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        alert('Erro ao carregar usuários. Verifique o console ou suas permissões.');
    }
}

/**
 * Renderiza a tabela de usuários com os dados fornecidos.
 * @param {Array<object>} users - Lista de objetos de usuários.
 */
function renderUsersTable(users) {
    const tableBody = document.querySelector('#users-table tbody');
    tableBody.innerHTML = ''; // Limpa a tabela

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">Nenhum usuário encontrado.</td></tr>'; // Colspan ajustado
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${user.sector || 'N/A'}</td> <!-- NOVO: Exibe o setor -->
            <td>
                <button class="action-btn edit-user" data-id="${user._id}">Editar</button>
                <button class="action-btn delete-user" data-id="${user._id}">Excluir</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Adiciona event listeners aos botões de editar e excluir
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.target.getAttribute('data-id');
            const user = users.find(u => u._id === userId);
            openUserModal('edit', user);
        });
    });

    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.target.getAttribute('data-id');
            if (confirm('Tem certeza que deseja excluir este usuário?')) {
                deleteUser(userId);
            }
        });
    });
}

/**
 * Abre o modal para adicionar ou editar um usuário.
 * @param {'add'|'edit'} mode - Modo do modal ('add' para adicionar, 'edit' para editar).
 * @param {object} [user=null] - Objeto de usuário para pré-preencher o formulário no modo 'edit'.
 */
function openUserModal(mode, user = null) {
    if (mode === 'add') {
        modalTitle.textContent = 'Adicionar Usuário';
        userIdInput.value = '';
        usernameInput.value = '';
        emailInput.value = '';
        passwordInput.value = ''; // Limpa a senha para adicionar
        passwordInput.required = true; // Senha é obrigatória ao adicionar
        roleInput.value = 'user';
        sectorInput.value = ''; // NOVO: Limpa o setor
        sectorInput.required = true; // NOVO: Define como obrigatório para 'user'
    } else if (mode === 'edit' && user) {
        modalTitle.textContent = 'Editar Usuário';
        userIdInput.value = user._id;
        usernameInput.value = user.username;
        emailInput.value = user.email;
        passwordInput.value = ''; // Não preenche a senha por segurança
        passwordInput.required = false; // Senha não é obrigatória ao editar
        roleInput.value = user.role;
        sectorInput.value = user.sector || ''; // NOVO: Preenche o setor
        sectorInput.required = (user.role === 'user'); // NOVO: Define como obrigatório se for 'user'
    }

    // NOVO: Adiciona um listener para o campo de role mudar a obrigatoriedade do setor
    roleInput.onchange = () => {
        sectorInput.required = (roleInput.value === 'user');
    };

    userModal.style.display = 'block';
}

/**
 * Lida com o envio do formulário de usuário (adicionar ou editar).
 * @param {Event} e - O evento de submit do formulário.
 */
async function handleUserFormSubmit(e) {
    e.preventDefault();
    const userId = userIdInput.value;
    const username = usernameInput.value;
    const email = emailInput.value;
    const role = roleInput.value;
    const password = passwordInput.value;
    const sector = sectorInput.value; // NOVO: Pega o valor do setor
    
    const userPayload = { username, email, role };
    if (password) { // Adiciona a senha apenas se preenchida (para adição ou alteração)
        userPayload.password = password;
    }
    // NOVO: Adiciona o setor ao payload se for um usuário
    if (role === 'user') {
        userPayload.sector = sector;
    } else {
        userPayload.sector = 'Global'; // Para admins, pode ser um setor "Global" ou vazio
    }

    try {
        if (userId) { // Editar usuário existente
            await request(`/auth/users/${userId}`, 'PUT', userPayload);
            alert('Usuário atualizado com sucesso!');
        } else { // Adicionar novo usuário
            await request('/auth/register', 'POST', userPayload);
            alert('Usuário adicionado com sucesso!');
        }
        userModal.style.display = 'none'; // Fecha o modal
        loadUsersTable(); // Recarrega a tabela para exibir as mudanças
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        alert(error.message); // Exibe a mensagem de erro da API
    }
}

/**
 * Exclui um usuário do sistema.
 * @param {string} userId - O ID do usuário a ser excluído.
 */
async function deleteUser(userId) {
    try {
        await request(`/auth/users/${userId}`, 'DELETE');
        alert('Usuário excluído com sucesso!');
        loadUsersTable(); // Recarrega a tabela
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert(error.message);
    }
}

// Adiciona event listeners para o modal e o botão de adicionar
if (addUserBtn) {
    addUserBtn.addEventListener('click', () => openUserModal('add'));
}
if (closeUserModalBtn) {
    closeUserModalBtn.addEventListener('click', () => userModal.style.display = 'none');
}
if (userForm) {
    userForm.addEventListener('submit', handleUserFormSubmit);
}
