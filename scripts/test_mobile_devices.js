// ===================================================================
// Script de Teste: Envio de Dispositivos Mobile Fictícios
// Localização: /scripts/test_mobile_devices.js
// Uso: node scripts/test_mobile_devices.js
// ===================================================================

require('dotenv').config();
const axios = require('axios');

// ===== CONFIGURAÇÕES =====
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.TEST_TOKEN || 'seu_token_aqui';

// ===== DISPOSITIVOS FICTÍCIOS =====
const generateMobileDevice = (index) => {
  const now = new Date();
  const lastSeen = new Date(now - Math.random() * 3600000); // Última vez visto nas últimas 1h
  
  const locations = [
    { sector: 'Enfermaria', floor: '2º Andar', unit: 'Hospital Central' },
    { sector: 'UTI', floor: '3º Andar', unit: 'Hospital Central' },
    { sector: 'Emergência', floor: 'Térreo', unit: 'Hospital Sul' },
    { sector: 'Pediatria', floor: '1º Andar', unit: 'Hospital Norte' },
  ];
  
  const loc = locations[index % locations.length];
  
  return {
    device_id: `TEST-DEVICE-${String(index).padStart(3, '0')}`,
    device_name: `Tablet-${loc.sector}-${index}`,
    device_model: ['Samsung Galaxy Tab A', 'iPad Pro', 'Lenovo Tab M10'][index % 3],
    serial_number: `SN-MOBILE-${Date.now()}-${index}`,
    imei: `35${String(Math.floor(Math.random() * 10000000000000)).padStart(13, '0')}`,
    battery: Math.floor(Math.random() * 100),
    network: 'WiFi',
    host: 'mobile.hospital.local',
    sector: loc.sector,
    floor: loc.floor,
    unit: loc.unit,
    mac_address_radio: `AA:BB:CC:DD:EE:${String(index).padStart(2, '0')}`,
    last_sync: now.toISOString(),
    secure_android_id: `android-${Math.random().toString(36).substr(2, 16)}`,
    ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    wifi_ipv6: 'N/A',
    wifi_gateway_ip: '192.168.1.1',
    wifi_broadcast: '192.168.1.255',
    wifi_submask: '255.255.255.0',
    last_seen: lastSeen.toISOString(),
    status: Math.random() > 0.2 ? 'online' : 'offline', // 80% online
    is_online: Math.random() > 0.2,
  };
};

// ===== FUNÇÕES DE TESTE =====

/**
 * Testa a rota /api/devices/data (Dispositivos)
 */
async function testDeviceRoute() {
  console.log('\n🧪 TESTANDO ROTA: /api/devices/data');
  console.log('='.repeat(60));
  
  const device = generateMobileDevice(1);
  
  try {
    const response = await axios.post(
      `${SERVER_URL}/api/devices/data`,
      device,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    console.log('✅ SUCESSO:', response.status);
    console.log('📦 Resposta:', JSON.stringify(response.data, null, 2));
    console.log('📱 Dispositivo:', device.device_name);
    console.log('🔢 Serial:', device.serial_number);
    
    return true;
  } catch (error) {
    console.error('❌ ERRO:', error.response?.status || error.code);
    console.error('📄 Detalhes:', error.response?.data || error.message);
    console.error('📱 Dispositivo tentado:', device.device_name);
    return false;
  }
}

/**
 * Cria múltiplos dispositivos mobile
 */
async function createMultipleDevices(count = 5) {
  console.log(`\n📱 CRIANDO ${count} DISPOSITIVOS MOBILE FICTÍCIOS...`);
  console.log('='.repeat(60));
  
  const results = {
    success: 0,
    failed: 0,
    devices: [],
  };
  
  for (let i = 1; i <= count; i++) {
    const device = generateMobileDevice(i);
    
    try {
      const response = await axios.post(
        `${SERVER_URL}/api/devices/data`,
        device,
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      
      console.log(`✅ [${i}/${count}] ${device.device_name} - ${response.status}`);
      results.success++;
      results.devices.push({
        name: device.device_name,
        serial: device.serial_number,
        status: 'created',
      });
      
    } catch (error) {
      console.error(`❌ [${i}/${count}] ${device.device_name} - FALHOU`);
      console.error(`   Erro: ${error.response?.data?.message || error.message}`);
      results.failed++;
    }
    
    // Delay para não sobrecarregar o servidor
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO:');
  console.log(`   ✅ Sucesso: ${results.success}`);
  console.log(`   ❌ Falhas: ${results.failed}`);
  console.log('='.repeat(60));
  
  return results;
}

/**
 * Testa a listagem de dispositivos
 */
async function testListDevices() {
  console.log('\n🧪 TESTANDO ROTA: GET /api/devices');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.get(
      `${SERVER_URL}/api/devices`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
        timeout: 10000,
      }
    );
    
    console.log('✅ SUCESSO:', response.status);
    console.log('📊 Total de dispositivos:', response.data.devices?.length || 0);
    
    if (response.data.devices && response.data.devices.length > 0) {
      console.log('\n📱 Primeiros 3 dispositivos:');
      response.data.devices.slice(0, 3).forEach((device, i) => {
        console.log(`   ${i + 1}. ${device.device_name} (${device.status})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERRO:', error.response?.status || error.code);
    console.error('📄 Detalhes:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Simula heartbeats (mantém dispositivos online)
 */
async function sendHeartbeats(serialNumbers) {
  console.log('\n💓 ENVIANDO HEARTBEATS...');
  console.log('='.repeat(60));
  
  for (const serial of serialNumbers) {
    try {
      const response = await axios.post(
        `${SERVER_URL}/api/devices/heartbeat`,
        { serial_number: serial },
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );
      
      console.log(`✅ Heartbeat enviado: ${serial}`);
    } catch (error) {
      console.error(`❌ Falha no heartbeat: ${serial}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

/**
 * Teste de comando (Marcar manutenção)
 */
async function testMaintenanceCommand(serialNumber) {
  console.log('\n🔧 TESTANDO COMANDO: set_maintenance');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.post(
      `${SERVER_URL}/api/devices/executeCommand`,
      {
        serial_number: serialNumber,
        command: 'set_maintenance',
        maintenance_status: true,
        maintenance_reason: 'maintenance',
        maintenance_ticket: 'TESTE-001',
        maintenance_history_entry: JSON.stringify({
          timestamp: new Date().toISOString(),
          status: 'entered_maintenance',
          ticket: 'TESTE-001',
        }),
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    console.log('✅ SUCESSO:', response.status);
    console.log('📦 Resposta:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ ERRO:', error.response?.status || error.code);
    console.error('📄 Detalhes:', error.response?.data || error.message);
    return false;
  }
}

// ===== MENU INTERATIVO =====
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 SCRIPT DE TESTE - DISPOSITIVOS MOBILE');
  console.log('='.repeat(60));
  console.log(`🌐 Servidor: ${SERVER_URL}`);
  console.log(`🔑 Token: ${AUTH_TOKEN.substring(0, 20)}...`);
  console.log('='.repeat(60));
  
  // Verificar se o token está configurado
  if (AUTH_TOKEN === 'seu_token_aqui') {
    console.error('\n❌ ERRO: Configure o AUTH_TOKEN no arquivo .env');
    console.error('💡 Adicione: TEST_TOKEN=seu_token_jwt_aqui');
    process.exit(1);
  }
  
  const args = process.argv.slice(2);
  const command = args[0] || 'menu';
  
  switch (command) {
    case 'test':
      await testDeviceRoute();
      break;
      
    case 'create':
      const count = parseInt(args[1]) || 5;
      const results = await createMultipleDevices(count);
      
      // Envia heartbeats após criar
      if (results.devices.length > 0) {
        const serials = results.devices.map(d => d.serial);
        await sendHeartbeats(serials);
      }
      break;
      
    case 'list':
      await testListDevices();
      break;
      
    case 'maintenance':
      const serial = args[1];
      if (!serial) {
        console.error('❌ Uso: node scripts/test_mobile_devices.js maintenance SN-MOBILE-XXX');
        process.exit(1);
      }
      await testMaintenanceCommand(serial);
      break;
      
    case 'full':
      console.log('\n🚀 EXECUTANDO TESTE COMPLETO...\n');
      await testDeviceRoute();
      const fullResults = await createMultipleDevices(3);
      await testListDevices();
      
      if (fullResults.devices.length > 0) {
        await testMaintenanceCommand(fullResults.devices[0].serial);
      }
      break;
      
    default:
      console.log('\n📋 COMANDOS DISPONÍVEIS:');
      console.log('   node scripts/test_mobile_devices.js test          - Teste único');
      console.log('   node scripts/test_mobile_devices.js create [N]    - Criar N dispositivos (padrão: 5)');
      console.log('   node scripts/test_mobile_devices.js list          - Listar dispositivos');
      console.log('   node scripts/test_mobile_devices.js maintenance SN - Testar comando de manutenção');
      console.log('   node scripts/test_mobile_devices.js full          - Teste completo');
      console.log('\n💡 Exemplo: node scripts/test_mobile_devices.js create 10\n');
  }
  
  console.log('\n✅ Script finalizado!\n');
}

// Executa o script
main().catch(error => {
  console.error('\n❌ ERRO FATAL:', error.message);
  process.exit(1);
});