const os = require('os');

// Função para detectar o IP local
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function isLoopbackHost(host) {
  const cleanHost = String(host || '').split(':')[0].replace(/^\[|\]$/g, '').toLowerCase();
  return cleanHost === 'localhost' || cleanHost === '::1' || cleanHost.startsWith('127.');
}

function getPublicBaseUrl(req) {
  const configured = process.env.PUBLIC_BASE_URL || process.env.SERVER_URL || process.env.APP_BASE_URL;
  if (configured) return configured.replace(/\/+$/, '');

  const forwardedProto = String(req?.get?.('x-forwarded-proto') || '').split(',')[0].trim();
  const host = req?.get?.('host') || `${getLocalIPAddress()}:${process.env.PORT || 3000}`;
  const protocol = forwardedProto || (req?.secure ? 'https' : (isLoopbackHost(host) ? 'http' : 'https'));
  return `${protocol}://${host}`.replace(/\/+$/, '');
}

function ipToInt(ip) {
  if (!ip) return 0;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return 0;
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

const isValidIPv4 = (ip) => {
  const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
};

module.exports = {
  getLocalIPAddress,
  getPublicBaseUrl,
  ipToInt,
  isValidIPv4
};
