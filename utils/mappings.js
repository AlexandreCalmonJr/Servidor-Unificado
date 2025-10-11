const BssidMapping = require('../models/BssidMapping');
const UnitMapping = require('../models/UnitMapping');
const { ipToInt } = require('./helpers');

// Função auxiliar para extrair o prefixo (os primeiros 5 octetos) de um MAC
function getMacPrefix(mac_address) {
  if (!mac_address || mac_address.length < 14) return null; // Apenas para garantia
  // Exemplo: '00:1A:2B:3C:4D:EF' -> '00:1A:2B:3C:4D'
  return mac_address.slice(0, 14);
}

// Função para mapear BSSID para setor e andar
async function mapMacAddressRadioToLocation(mac_address_radio) {
  if (!mac_address_radio || mac_address_radio === 'N/A') {
    return { sector: 'Desconhecido', floor: 'Desconhecido' };
  }

  // Tenta primeiro uma correspondência exata para maior precisão
  const exactMapping = await BssidMapping.findOne({ mac_address_radio: mac_address_radio });
  if (exactMapping) {
    return { sector: exactMapping.sector, floor: exactMapping.floor };
  }
  
  // Se a correspondência exata falhar, tenta usar o prefixo
  const macPrefix = getMacPrefix(mac_address_radio);
  if (macPrefix) {
    // A regex busca por BSSIDs que começam com o mesmo prefixo
    const prefixMapping = await BssidMapping.findOne({ mac_address_radio: { $regex: `^${macPrefix}` } });
    if (prefixMapping) {
      return { sector: prefixMapping.sector, floor: prefixMapping.floor };
    }
  }

  // Se nada for encontrado, retorna desconhecido
  return { sector: 'Desconhecido', floor: 'Desconhecido' };
}

async function mapIpToUnit(ip_address) {
  if (!ip_address || ip_address === 'N/A') {
    return 'Desconhecido';
  }
  const units = await UnitMapping.find();
  for (const unit of units) {
    const startInt = ipToInt(unit.ip_range_start);
    const endInt = ipToInt(unit.ip_range_end);
    const ipInt = ipToInt(ip_address);
    if (ipInt >= startInt && ipInt <= endInt) {
      return unit.name;
    }
  }
  return 'Desconhecido';
}

module.exports = {
  mapMacAddressRadioToLocation,
  mapIpToUnit
};