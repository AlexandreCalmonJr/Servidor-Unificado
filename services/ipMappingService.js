// Ficheiro: services/ipMappingService.js

const ipaddr = require('ip-address');
const IpMapping = require('../models/IpMapping');

function ipToBigInt(ip) {
  if (!ip) {
    return BigInt(0);
  }
  const cleanedIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
  try {
    const address = new ipaddr.Address4(cleanedIp);
    return BigInt(address.bigInteger());
  } catch (e) {
    try {
      const address = new ipaddr.Address6(cleanedIp);
      return BigInt(address.bigInteger());
    } catch (err) {
      return BigInt(0);
    }
  }
}

async function getLocationFromIp(clientIp) {
  if (!clientIp) return 'Localização Desconhecida';

  try {
    const mappings = await IpMapping.find({});
    if (mappings.length === 0) return 'Localização Desconhecida';

    const clientIpNum = ipToBigInt(clientIp);

    for (const mapping of mappings) {
      const startIpNum = ipToBigInt(mapping.ipStart);
      const endIpNum = ipToBigInt(mapping.ipEnd);

      if (clientIpNum >= startIpNum && clientIpNum <= endIpNum) {
        return mapping.location;
      }
    }

    return 'Localização Desconhecida';
  } catch (error) {
    return 'Erro ao Mapear IP';
  }
}

const getAll = async () => {
    return IpMapping.find({}).sort({ location: 1 });
};

const create = async (location, ipStart, ipEnd) => {
    const newMapping = new IpMapping({ location, ipStart, ipEnd });
    return newMapping.save();
};

const deleteById = async (id) => {
    return IpMapping.findByIdAndDelete(id);
};

module.exports = { 
    getLocationFromIp,
    getAll,
    create,
    deleteById
};