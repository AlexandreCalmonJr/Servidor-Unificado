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

    // ... (Existing code) ...

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
            <td>${device.maintenance_status ? '<span class="status-warning">Manutenção</span>' : '<span class="status-success">Normal</span>'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn reboot-device" data-serial="${device.serial_number}" title="Reiniciar App">
                        <i class="fas fa-power-off"></i>
                    </button>
                    <button class="action-btn install-apk" data-serial="${device.serial_number}" title="Instalar APK">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn view-device" data-serial="${device.serial_number}" title="Ver Detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                     ${device.maintenance_status
                ? `<button class="action-btn set-maintenance-off" data-serial="${device.serial_number}" title="Sair de Manutenção"><i class="fas fa-wrench"></i> OFF</button>`
                : `<button class="action-btn set-maintenance-on" data-serial="${device.serial_number}" title="Entrar em Manutenção"><i class="fas fa-wrench"></i> ON</button>`
            }
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Event Listeners for Actions

    // REBOOT
    document.querySelectorAll('.reboot-device').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const serial = e.currentTarget.getAttribute('data-serial'); // Use currentTarget for button with icon
            if (confirm(`Reiniciar o aplicativo no dispositivo ${serial}?`)) {
                await sendDeviceCommand(serial, 'restart_app'); // command_type 'restart_app' matched in mobile
            }
        });
    });

    // INSTALL APK
    document.querySelectorAll('.install-apk').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const serial = e.currentTarget.getAttribute('data-serial');
            const url = prompt('Digite a URL do APK para instalação:');
            if (url) {
                if (confirm(`Instalar APK em ${serial}?\nURL: ${url}`)) {
                    await sendDeviceCommand(serial, 'install_apk', { apkUrl: url });
                }
            }
        });
    });

    // MAINTENANCE ON
    document.querySelectorAll('.set-maintenance-on').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const serial = e.currentTarget.getAttribute('data-serial');
            const ticket = prompt('Número do ticket (opcional):');
            const reason = prompt('Motivo (opcional):');

            await sendDeviceCommand(serial, 'set_maintenance', {
                maintenance_status: true,
                maintenance_ticket: ticket,
                maintenance_reason: reason,
                maintenance_history_entry: JSON.stringify({ timestamp: new Date(), status: 'on', ticket: ticket || '', reason: reason || '' })
            });
        });
    });

    // MAINTENANCE OFF
    document.querySelectorAll('.set-maintenance-off').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const serial = e.currentTarget.getAttribute('data-serial');

            await sendDeviceCommand(serial, 'set_maintenance', {
                maintenance_status: false,
                maintenance_ticket: '',
                maintenance_reason: '',
                maintenance_history_entry: JSON.stringify({ timestamp: new Date(), status: 'off' })
            });
        });
    });

    // VIEW DETAILS
    document.querySelectorAll('.view-device').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serial = e.currentTarget.getAttribute('data-serial');
            alert('Detalhes do dispositivo: ' + serial);
        });
    });
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
