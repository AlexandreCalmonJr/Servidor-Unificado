// File: utils/mappings.js
// Utilitário para mapear localização baseado em IP e BSSID

const UnitMapping = require('../models/UnitMapping');
const BssidMapping = require('../models/BssidMapping');

/**
 * Converte um IP string para número inteiro para comparação
 */
function ipToInt(ip) {
  if (!ip || ip === 'N/A' || ip === '0.0.0.0') return 0;
  
  try {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
      console.warn(`⚠️ IP inválido: ${ip}`);
      return 0;
    }
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  } catch (e) {
    console.error(`❌ Erro ao processar IP ${ip}:`, e.message);
    return 0;
  }
}

/**
 * Verifica se um IP está dentro de uma faixa
 */
function isIpInRange(ip, startIp, endIp) {
  try {
    const ipNum = ipToInt(ip);
    const startNum = ipToInt(startIp);
    const endNum = ipToInt(endIp);

    if (ipNum === 0 || startNum === 0 || endNum === 0) return false;
    if (startNum > endNum) {
      console.warn(`⚠️ Faixa inválida: ${startIp} - ${endIp} (start > end)`);
      return false;
    }

    return ipNum >= startNum && ipNum <= endNum;
  } catch (e) {
    console.error(`❌ Erro ao verificar faixa de IP:`, e.message);
    return false;
  }
}

/**
 * Mapeia um IP para uma Unidade (baseado nas faixas de IP cadastradas)
 */
async function mapIpToUnit(ip) {
  if (!ip || ip === 'N/A' || ip === '0.0.0.0') {
    console.log(`ℹ️ IP inválido ou ausente: ${ip}`);
    return 'N/A';
  }

  try {
    const units = await UnitMapping.find({}).lean();
    
    if (!units || units.length === 0) {
      console.warn('⚠️ Nenhuma unidade cadastrada no sistema');
      return 'N/A';
    }

    // Itera sobre cada unidade
    for (const unit of units) {
      if (!unit.ip_ranges || !Array.isArray(unit.ip_ranges)) {
        console.warn(`⚠️ Unidade '${unit.name}' sem faixas de IP definidas`);
        continue;
      }

      // Verifica cada faixa de IP da unidade
      for (const range of unit.ip_ranges) {
        if (isIpInRange(ip, range.start, range.end)) {
          console.log(`✅ IP ${ip} mapeado para unidade: ${unit.name}`);
          return unit.name;
        }
      }
    }

    console.log(`⚠️ IP ${ip} não encontrado em nenhuma faixa cadastrada`);
    return 'N/A';
  } catch (error) {
    console.error(`❌ Erro ao mapear IP para unidade:`, error.message);
    return 'N/A';
  }
}

/**
 * Mapeia um endereço MAC (BSSID) para localização (setor/andar)
 */
async function mapMacAddressRadioToLocation(macAddress) {
  const defaultLocation = {
    sector: 'Desconhecido',
    floor: 'Desconhecido',
  };

  if (!macAddress || macAddress === 'N/A' || macAddress === '00:00:00:00:00:00') {
    console.log(`ℹ️ BSSID inválido ou ausente: ${macAddress}`);
    return defaultLocation;
  }

  // Verifica se é o endereço genérico problemático
  if (macAddress === '02:00:00:00:00:00') {
    console.warn(`⚠️ BSSID genérico detectado (${macAddress}) - Dispositivo pode não estar conectado a uma rede real`);
    return defaultLocation;
  }

  try {
    // Normaliza o formato (remove - e substitui por :)
    const normalizedMac = macAddress.toUpperCase().replace(/-/g, ':').replace(/\./g, ':');
    
    console.log(`🔍 Buscando mapeamento para BSSID: ${normalizedMac}`);

    const mapping = await BssidMapping.findOne({ 
      mac_address_radio: normalizedMac 
    }).lean();

    if (mapping) {
      console.log(`✅ BSSID ${normalizedMac} mapeado: ${mapping.sector} - ${mapping.floor} (Unidade: ${mapping.unitName || 'N/D'})`);
      return {
        sector: mapping.sector || 'Desconhecido',
        floor: mapping.floor || 'Desconhecido',
        unitName: mapping.unitName || null
      };
    }

    console.log(`⚠️ BSSID ${normalizedMac} não encontrado no mapeamento`);
    return defaultLocation;
  } catch (error) {
    console.error(`❌ Erro ao mapear BSSID para localização:`, error.message);
    return defaultLocation;
  }
}

/**
 * Função completa de mapeamento de localização
 * Combina IP (para unidade) e BSSID (para setor/andar)
 */
async function mapDeviceLocation(deviceData) {
  const result = {
    unit: 'N/A',
    sector: 'Desconhecido',
    floor: 'Desconhecido',
  };

  console.log('\n🔎 === INICIANDO MAPEAMENTO DE LOCALIZAÇÃO ===');
  console.log(`📱 Dispositivo: ${deviceData.device_name || 'N/A'}`);
  console.log(`🌐 IP: ${deviceData.ip_address || 'N/A'}`);
  console.log(`📡 BSSID: ${deviceData.mac_address_radio || 'N/A'}`);

  try {
    // 1. Mapear unidade pelo IP
    if (deviceData.ip_address) {
      result.unit = await mapIpToUnit(deviceData.ip_address);
    }

    // 2. Mapear setor e andar pelo BSSID
    if (deviceData.mac_address_radio) {
      const location = await mapMacAddressRadioToLocation(deviceData.mac_address_radio);
      result.sector = location.sector;
      result.floor = location.floor;
      
      // Se o BSSID tiver unitName e não encontramos pelo IP, usa do BSSID
      if (result.unit === 'N/A' && location.unitName) {
        result.unit = location.unitName;
        console.log(`ℹ️ Unidade obtida do BSSID: ${location.unitName}`);
      }
    }

    console.log('📍 RESULTADO DO MAPEAMENTO:');
    console.log(`   Unidade: ${result.unit}`);
    console.log(`   Setor: ${result.sector}`);
    console.log(`   Andar: ${result.floor}`);
    console.log('=== FIM DO MAPEAMENTO ===\n');

    return result;

  } catch (error) {
    console.error('❌ ERRO FATAL no mapeamento de localização:', error.message);
    return result;
  }
}

module.exports = {
  ipToInt,
  isIpInRange,
  mapIpToUnit,
  mapMacAddressRadioToLocation,
  mapDeviceLocation
};