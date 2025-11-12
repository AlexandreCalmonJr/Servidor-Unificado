// Elementos da interface
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.content-section');
const logoutBtn = document.getElementById('logout-btn');

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o usuário está logado ao carregar a página
    if (!localStorage.getItem('mdm_token')) {
        window.location.href = '/'; // Redireciona para a página de login se não houver token
    }

    // Carrega os dados iniciais do dashboard e das tabelas
    loadDashboardMetrics();
    loadDevicesTable(); // Chamada para carregar a tabela completa de dispositivos
    loadUsersTable();   // Chamada para carregar a tabela de usuários

    // Adiciona event listeners para a navegação
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = e.target.getAttribute('data-section');
            showSection(targetSection);
        });
    });

    // Lógica para o botão de logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('mdm_token'); // Remove o token do localStorage
            window.location.href = '/'; // Redireciona para a página de login
        });
    }

    // Event listener para o botão de atualização em massa de apps (lógica no devices.js)
    const updateAllAppsBtn = document.getElementById('update-all-apps-btn');
    if (updateAllAppsBtn) {
        updateAllAppsBtn.addEventListener('click', handleUpdateAllApps);
    }
});

/**
 * Exibe a seção de conteúdo especificada e atualiza a navegação ativa.
 * @param {string} sectionId - O ID da seção a ser exibida (ex: 'home', 'devices', 'users').
 */
function showSection(sectionId) {
    sections.forEach(section => {
        section.classList.remove('active'); // Esconde todas as seções
    });
    navLinks.forEach(link => {
        link.classList.remove('active'); // Desativa todos os links de navegação
    });

    document.getElementById(sectionId).classList.add('active'); // Exibe a seção alvo
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active'); // Ativa o link correspondente
}

/**
 * Carrega e exibe as métricas gerais do servidor no dashboard.
 */
async function loadDashboardMetrics() {
    try {
        const data = await request('/server/status');
        document.getElementById('device-count').textContent = data.device_count;
        document.getElementById('pending-commands').textContent = data.pending_commands;
        document.getElementById('cpu-usage').textContent = `${data.cpu_usage.toFixed(2)}%`;
        document.getElementById('memory-usage').textContent = `${data.memory_usage.toFixed(2)}%`;

        // Carrega os dispositivos recentes para a tabela de visão geral
        const devices = await request('/devices');
        renderRecentDevicesTable(devices);
    } catch (error) {
        console.error('Erro ao carregar métricas do dashboard:', error);
        alert('Erro ao carregar métricas do dashboard. Verifique o console.');
    }
}

/**
 * Renderiza uma tabela com os dispositivos mais recentes para a seção de visão geral.
 * @param {Array<object>} devices - Lista de objetos de dispositivos.
 */
function renderRecentDevicesTable(devices) {
    const tableBody = document.querySelector('#recent-devices-table tbody');
    tableBody.innerHTML = ''; // Limpa a tabela

    // Exibe apenas os 5 dispositivos mais recentes para a visão geral
    const recentDevices = devices.slice(0, 5);

    if (recentDevices.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">Nenhum dispositivo encontrado.</td></tr>';
        return;
    }

    recentDevices.forEach(device => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${device.device_name || 'N/A'}</td>
            <td>${device.serial_number || 'N/A'}</td>
            <td>${new Date(device.last_seen).toLocaleString()}</td>
            <td>${device.sector || 'Desconhecido'}</td>
            <td>${device.provisioning_status || 'N/A'}</td>
        `;
        tableBody.appendChild(row);
    });
}
