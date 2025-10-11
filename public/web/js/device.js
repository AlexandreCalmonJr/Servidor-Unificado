// Variável para armazenar o status de filtro atual
let currentDeviceStatusFilter = 'all'; 

// Elementos do DOM relevantes para dispositivos
const deviceStatusFilterSelect = document.getElementById('device-status-filter');

// Adiciona event listener para o filtro de status
if (deviceStatusFilterSelect) {
    deviceStatusFilterSelect.addEventListener('change', (e) => {
        currentDeviceStatusFilter = e.target.value;
        loadDevicesTable(); // Recarrega a tabela com o novo filtro
    });
}


/**
 * Carrega a lista completa de dispositivos e renderiza na tabela, aplicando filtros.
 */
async function loadDevicesTable() {
    try {
        const allDevices = await request('/devices');
        
        let filteredDevices = allDevices;

        // Aplica o filtro de status
        if (currentDeviceStatusFilter !== 'all') {
            if (currentDeviceStatusFilter === 'active') {
                // Considera ativo se last_seen for recente (ex: nos últimos 15 minutos)
                filteredDevices = allDevices.filter(device => {
                    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
                    return new Date(device.last_seen) > fifteenMinutesAgo;
                });
            } else if (currentDeviceStatusFilter === 'maintenance') {
                filteredDevices = allDevices.filter(device => device.maintenance_status === true);
            } else {
                // Filtra por status de provisionamento para os outros casos
                filteredDevices = allDevices.filter(device => 
                    device.provisioning_status === currentDeviceStatusFilter
                );
            }
        }

        renderFullDevicesTable(filteredDevices);
    } catch (error) {
        console.error('Erro ao carregar dispositivos:', error);
        alert('Erro ao carregar dispositivos. Verifique o console.');
    }
}

/**
 * Renderiza a tabela completa de dispositivos.
 * @param {Array<object>} devices - Lista de objetos de dispositivos.
 */
function renderFullDevicesTable(devices) {
    const tableBody = document.querySelector('#devices-full-table tbody');
    tableBody.innerHTML = ''; // Limpa a tabela

    if (devices.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9">Nenhum dispositivo encontrado com o filtro selecionado.</td></tr>';
        return;
    }

    devices.forEach(device => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${device.device_name || 'N/A'}</td>
            <td>${device.serial_number || 'N/A'}</td>
            <td>${device.device_model || 'N/A'}</td>
            <td>${device.battery !== null ? device.battery + '%' : 'N/A'}</td>
            <td>${device.ip_address || 'N/A'}</td>
            <td>${device.sector || 'Desconhecido'}</td>
            <td>${device.provisioning_status || 'N/A'}</td>
            <td>${device.maintenance_status ? 'Em Manutenção' : 'Normal'}</td>
            <td>
                <button class="action-btn reboot-device" data-serial="${device.serial_number}">Reboot</button>
                <button class="action-btn set-maintenance-on" data-serial="${device.serial_number}" ${device.maintenance_status ? 'style="display:none;"' : ''}>Manutenção ON</button>
                <button class="action-btn set-maintenance-off" data-serial="${device.serial_number}" ${!device.maintenance_status ? 'style="display:none;"' : ''}>Manutenção OFF</button>
                <button class="action-btn view-device" data-serial="${device.serial_number}">Ver</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Adiciona event listeners aos botões de ação na tabela de dispositivos
    document.querySelectorAll('.reboot-device').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serial = e.target.getAttribute('data-serial');
            if (confirm(`Tem certeza que deseja reiniciar o dispositivo ${serial}?`)) {
                sendDeviceCommand(serial, 'reboot');
            }
        });
    });

    document.querySelectorAll('.set-maintenance-on').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serial = e.target.getAttribute('data-serial');
            const ticket = prompt('Digite o número do ticket de manutenção (opcional):');
            if (confirm(`Definir ${serial} como "Em Manutenção"?`)) {
                sendDeviceCommand(serial, 'set_maintenance', { maintenance_status: true, maintenance_ticket: ticket, maintenance_history_entry: JSON.stringify({ timestamp: new Date(), status: 'on', ticket: ticket || '' }) });
            }
        });
    });

    document.querySelectorAll('.set-maintenance-off').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serial = e.target.getAttribute('data-serial');
            const ticket = prompt('Digite o número do ticket para finalizar a manutenção (opcional):');
            if (confirm(`Definir ${serial} como "Normal" (sair de Manutenção)?`)) {
                sendDeviceCommand(serial, 'set_maintenance', { maintenance_status: false, maintenance_ticket: '', maintenance_history_entry: JSON.stringify({ timestamp: new Date(), status: 'off', ticket: ticket || '' }) });
            }
        });
    });

    document.querySelectorAll('.view-device').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serial = e.target.getAttribute('data-serial');
            // Futuramente, gerar um link único para visualização ou modal de detalhes
            alert(`Funcionalidade "Ver Dispositivo" para ${serial} será implementada aqui. Isso poderá gerar um link exclusivo.`);
        });
    });
}

/**
 * Envia um comando específico para um dispositivo.
 * @param {string} serial_number - O número de série do dispositivo alvo.
 * @param {string} command - O comando a ser enviado (ex: 'reboot', 'install_app', 'set_maintenance').
 * @param {object} [parameters={}] - Parâmetros adicionais para o comando.
 */
async function sendDeviceCommand(serial_number, command, parameters = {}) {
    try {
        await request('/devices/executeCommand', 'POST', {
            serial_number,
            command,
            ...parameters // Inclui parâmetros específicos do comando
        });
        alert(`Comando '${command}' enviado para o dispositivo ${serial_number} com sucesso!`);
        loadDevicesTable(); // Recarrega a tabela após o comando
    } catch (error) {
        console.error(`Erro ao enviar comando '${command}' para ${serial_number}:`, error);
        alert(`Erro ao enviar comando: ${error.message}`);
    }
}

/**
 * Lida com a atualização em massa de aplicativos em todos os dispositivos.
 */
async function handleUpdateAllApps() {
    if (confirm('Tem certeza que deseja enviar o comando de atualização de apps para TODOS os dispositivos?')) {
        try {
            const devices = await request('/devices');
            // Filtrar apenas dispositivos ativos para atualização, se desejar
            const activeDevices = devices.filter(device => {
                const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
                return new Date(device.last_seen) > fifteenMinutesAgo;
            });

            if (activeDevices.length === 0) {
                alert('Nenhum dispositivo ativo encontrado para atualização.');
                return;
            }

            for (const device of activeDevices) {
                // EXERCÍCIO: Defina qual app e URL APK devem ser usados para a atualização
                // Pode ser uma lista de apps, ou um app específico.
                // Aqui é um exemplo hipotético.
                await sendDeviceCommand(device.serial_number, 'install_app', {
                    packageName: 'com.example.your_app_package', // Substitua pelo package name real
                    apkUrl: `http://localhost:3000/public/your_app_name.apk` // Substitua pela URL real do APK
                });
            }
            alert(`Comandos de atualização de app enviados com sucesso para ${activeDevices.length} dispositivos.`);
        } catch (error) {
            console.error('Erro ao enviar comandos de atualização em massa:', error);
            alert('Erro ao enviar comandos. Verifique o console.');
        }
    }
}
